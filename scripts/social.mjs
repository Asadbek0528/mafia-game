import { existsSync, readFileSync, writeFileSync } from "node:fs";

const FILE = process.env.SOCIAL_FILE ?? new URL("./.social.json", import.meta.url);
const STATUSES = ["online", "room", "game"];

let data = { names: {}, friends: [], requests: [] };
try {
  if (existsSync(FILE)) data = { ...data, ...JSON.parse(readFileSync(FILE, "utf8")) };
} catch {
  data = { names: {}, friends: [], requests: [] };
}

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      writeFileSync(FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.log(`  Не удалось сохранить друзей: ${error.message}`);
    }
  }, 200);
}

const sockets = new Map();
const statuses = new Map();

const pairKey = (a, b) => (a < b ? `${a}:${b}` : `${b}:${a}`);
const areFriends = (a, b) => data.friends.includes(pairKey(a, b));
const isOnline = (id) => (sockets.get(id)?.size ?? 0) > 0;
const nameOf = (id) => data.names[id] ?? `Игрок ${id}`;

function friendsOf(id) {
  return data.friends
    .map((key) => key.split(":").map(Number))
    .filter(([a, b]) => a === id || b === id)
    .map(([a, b]) => (a === id ? b : a));
}

function send(id, message) {
  const text = JSON.stringify(message);
  for (const socket of sockets.get(id) ?? []) {
    if (socket.readyState === socket.OPEN) socket.send(text);
  }
}

function presence(id) {
  const online = isOnline(id);
  const info = statuses.get(id);
  return {
    id,
    username: nameOf(id),
    online,
    status: online ? (info?.status ?? "online") : "offline",
    roomId: online ? (info?.roomId ?? null) : null,
  };
}

function pushState(id) {
  if (!isOnline(id)) return;
  send(id, {
    type: "social-state",
    friends: friendsOf(id).map(presence),
    incoming: data.requests.filter((item) => item.to === id).map((item) => ({ id: item.from, username: nameOf(item.from) })),
    outgoing: data.requests.filter((item) => item.from === id).map((item) => ({ id: item.to, username: nameOf(item.to) })),
  });
}

function pushFriends(id) {
  for (const friendId of friendsOf(id)) pushState(friendId);
}

function acceptFriendship(from, to) {
  data.requests = data.requests.filter(
    (item) => !((item.from === from && item.to === to) || (item.from === to && item.to === from)),
  );
  const key = pairKey(from, to);
  if (!data.friends.includes(key)) data.friends.push(key);
  save();
  send(from, { type: "friend-accepted", by: { id: to, username: nameOf(to) } });
  pushState(from);
  pushState(to);
}

export function onUserConnect(id, socket) {
  if (!sockets.has(id)) sockets.set(id, new Set());
  sockets.get(id).add(socket);
  pushState(id);
  pushFriends(id);
}

export function onUserClose(id, socket) {
  sockets.get(id)?.delete(socket);
  if (!isOnline(id)) {
    sockets.delete(id);
    statuses.delete(id);
  }
  pushFriends(id);
}

export function onUserMessage(id, message) {
  const other = Number(message.to);

  switch (message.type) {
    case "identify": {
      if (typeof message.username === "string" && message.username.trim()) {
        data.names[id] = message.username.trim().slice(0, 40);
        save();
      }
      pushState(id);
      pushFriends(id);
      break;
    }

    case "status": {
      const status = STATUSES.includes(message.status) ? message.status : "online";
      statuses.set(id, { status, roomId: message.roomId ? String(message.roomId) : null });
      pushFriends(id);
      break;
    }

    case "friend-request": {
      if (!other || other === id || areFriends(id, other)) break;
      if (typeof message.toName === "string" && !data.names[other]) data.names[other] = message.toName.slice(0, 40);

      if (data.requests.some((item) => item.from === other && item.to === id)) {
        acceptFriendship(other, id);
        break;
      }
      if (!data.requests.some((item) => item.from === id && item.to === other)) {
        data.requests.push({ from: id, to: other });
        save();
        send(other, { type: "friend-request", from: { id, username: nameOf(id) } });
      }
      pushState(id);
      pushState(other);
      break;
    }

    case "friend-accept": {
      if (data.requests.some((item) => item.from === other && item.to === id)) acceptFriendship(other, id);
      break;
    }

    case "friend-decline":
    case "friend-cancel": {
      const [from, to] = message.type === "friend-decline" ? [other, id] : [id, other];
      data.requests = data.requests.filter((item) => !(item.from === from && item.to === to));
      save();
      pushState(id);
      pushState(other);
      break;
    }

    case "friend-remove": {
      data.friends = data.friends.filter((key) => key !== pairKey(id, other));
      save();
      pushState(id);
      pushState(other);
      break;
    }

    case "invite": {
      if (!other || !areFriends(id, other) || !message.roomId) break;
      const online = isOnline(other);
      if (online) {
        send(other, {
          type: "invite",
          from: { id, username: nameOf(id) },
          roomId: String(message.roomId),
          roomName: String(message.roomName ?? "").slice(0, 60),
        });
      }
      send(id, { type: "invite-sent", to: other, online });
      break;
    }

    default:
      break;
  }
}

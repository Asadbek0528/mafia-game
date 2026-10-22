import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const STATUSES = ["online", "room", "game"];
const MAX_WATCH = 500;
const MAX_REQUESTS = 100;
const REQUESTS_FILE = join(tmpdir(), "mafia-friend-requests.json");

const sockets = new Map();
const statuses = new Map();
const names = new Map();
const watching = new Map();

// Заявки в друзья: кому → (от кого → { id, username, at }). Хранятся, пока получатель не ответит.
const requests = new Map();
// Принятые заявки для тех, кто был не в сети: кому → [{ id, username }]
const accepted = new Map();

function loadRequests() {
  try {
    const saved = JSON.parse(readFileSync(REQUESTS_FILE, "utf8"));
    for (const [to, list] of saved.requests ?? []) requests.set(Number(to), new Map(list.map((item) => [item.id, item])));
    for (const [to, list] of saved.accepted ?? []) accepted.set(Number(to), list);
  } catch {
    // файла ещё нет — начинаем с пустого списка
  }
}

let saveTimer = null;
function saveRequests() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const data = {
      requests: [...requests].map(([to, list]) => [to, [...list.values()]]),
      accepted: [...accepted],
    };
    try {
      writeFileSync(REQUESTS_FILE, JSON.stringify(data));
    } catch {
      // не страшно: заявки останутся в памяти
    }
  }, 500);
}

loadRequests();

function incomingOf(id) {
  return [...(requests.get(id)?.values() ?? [])].sort((a, b) => b.at - a.at);
}

function outgoingOf(id) {
  const list = [];
  for (const [to, from] of requests) {
    const item = from.get(id);
    if (item) list.push({ id: to, username: nameOf(to), at: item.at });
  }
  return list;
}

function pushRequests(id) {
  send(id, { type: "requests", incoming: incomingOf(id), outgoing: outgoingOf(id) });
}

function removeRequest(to, from) {
  const list = requests.get(to);
  if (!list?.delete(from)) return false;
  if (list.size === 0) requests.delete(to);
  saveRequests();
  return true;
}

const isOnline = (id) => (sockets.get(id)?.size ?? 0) > 0;
const nameOf = (id) => names.get(id) ?? `Игрок ${id}`;

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
    online,
    status: online ? (info?.status ?? "online") : "offline",
    roomId: online ? (info?.roomId ?? null) : null,
  };
}

function pushPresence(id) {
  if (!isOnline(id)) return;
  send(id, { type: "presence", friends: [...(watching.get(id) ?? [])].map(presence) });
}

function pushToWatchers(id) {
  for (const [watcher, ids] of watching) {
    if (ids.has(id)) pushPresence(watcher);
  }
}

export function onUserConnect(id, socket) {
  if (!sockets.has(id)) sockets.set(id, new Set());
  sockets.get(id).add(socket);
  pushPresence(id);
  pushToWatchers(id);
  pushRequests(id);

  const waiting = accepted.get(id);
  if (waiting?.length) {
    for (const from of waiting) send(id, { type: "friend-accepted", from });
    accepted.delete(id);
    saveRequests();
  }
}

export function onUserClose(id, socket) {
  sockets.get(id)?.delete(socket);
  if (!isOnline(id)) {
    sockets.delete(id);
    statuses.delete(id);
    watching.delete(id);
  }
  pushToWatchers(id);
}

export function onUserMessage(id, message) {
  const other = Number(message.to);

  switch (message.type) {
    case "identify": {
      if (typeof message.username === "string" && message.username.trim()) {
        names.set(id, message.username.trim().slice(0, 40));
      }
      break;
    }

    case "watch": {
      const ids = Array.isArray(message.ids) ? message.ids.map(Number).filter((item) => Number.isInteger(item) && item !== id) : [];
      watching.set(id, new Set(ids.slice(0, MAX_WATCH)));
      pushPresence(id);
      break;
    }

    case "status": {
      const status = STATUSES.includes(message.status) ? message.status : "online";
      statuses.set(id, { status, roomId: message.roomId ? String(message.roomId) : null });
      pushToWatchers(id);
      break;
    }

    case "friend-request": {
      if (!other || other === id) break;
      if (typeof message.username === "string" && message.username.trim()) {
        names.set(other, message.username.trim().slice(0, 40));
      }
      // Встречная заявка уже есть — значит оба хотят дружить
      if (requests.get(id)?.has(other)) {
        removeRequest(id, other);
        send(id, { type: "friend-mutual", from: { id: other, username: nameOf(other) } });
        pushRequests(id);
        pushRequests(other);
        break;
      }
      if (!requests.has(other)) requests.set(other, new Map());
      const list = requests.get(other);
      if (!list.has(id) && list.size >= MAX_REQUESTS) break;
      list.set(id, { id, username: nameOf(id), at: Date.now() });
      saveRequests();
      send(other, { type: "friend-request", from: { id, username: nameOf(id) } });
      pushRequests(other);
      pushRequests(id);
      break;
    }

    case "friend-accept": {
      if (!other || !removeRequest(id, other)) {
        pushRequests(id);
        break;
      }
      const from = { id, username: nameOf(id) };
      if (isOnline(other)) {
        send(other, { type: "friend-accepted", from });
      } else {
        accepted.set(other, [...(accepted.get(other) ?? []).filter((item) => item.id !== id), from]);
        saveRequests();
      }
      pushRequests(id);
      pushRequests(other);
      break;
    }

    case "friend-decline": {
      if (!other) break;
      removeRequest(id, other);
      pushRequests(id);
      pushRequests(other);
      break;
    }

    case "friend-cancel": {
      if (!other) break;
      removeRequest(other, id);
      pushRequests(id);
      pushRequests(other);
      break;
    }

    case "friend-added":
    case "friend-removed": {
      if (!other || other === id) break;
      send(other, { type: message.type, from: { id, username: nameOf(id) } });
      break;
    }

    case "invite": {
      if (!other || !watching.get(id)?.has(other) || !message.roomId) break;
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

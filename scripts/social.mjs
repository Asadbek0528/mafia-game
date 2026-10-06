const STATUSES = ["online", "room", "game"];
const MAX_WATCH = 500;

const sockets = new Map();
const statuses = new Map();
const names = new Map();
const watching = new Map();

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

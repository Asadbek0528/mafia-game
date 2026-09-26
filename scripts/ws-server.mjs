import { WebSocketServer } from "ws";

import { BACKEND_URL, setting } from "./env.mjs";

const PORT = Number(setting("WS_PORT", 3001));
const OWNER_AWAY_MS = Number(setting("ROOM_OWNER_AWAY_SECONDS", 180)) * 1000;

const channels = new Map();
const watchedRooms = new Map();
const chatHistory = new Map();
const suspectHistory = new Map();
const CHAT_LIMIT = 150;
const CHAT_KEEP_MS = 3 * 60 * 60 * 1000;

const server = new WebSocketServer({ port: PORT, host: "0.0.0.0" });

server.on("listening", () => {
  console.log(`  WebSocket:     ws://localhost:${PORT}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.log(`  WebSocket: порт ${PORT} уже занят — работает другой сервер, используем его`);
    return;
  }
  console.error("WebSocket error:", error);
});

function broadcast(channel, message, except) {
  const members = channels.get(channel);
  if (!members) return;
  const text = typeof message === "string" ? message : JSON.stringify(message);
  for (const socket of members) {
    if (socket !== except && socket.readyState === socket.OPEN) socket.send(text);
  }
}

function roomIdFromChannel(channel) {
  return channel.match(/\/room\/(\d+)$/)?.[1] ?? null;
}

async function backend(path, token, method = "GET", body) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";
  const response = await fetch(BACKEND_URL + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`${method} ${path} → HTTP ${response.status}`);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function closeAbandonedRoom(roomId, token) {
  const room = await backend(`/room/detail?room_id=${roomId}`, token);
  if (room.status !== "WAITING") return false;

  const players = await backend(`/room-player/list?room_id=${roomId}`, token).catch(() => []);
  await Promise.all(
    players.map((player) => backend(`/room-player/delete/${player.id}`, token, "DELETE").catch(() => null)),
  );

  try {
    await backend(`/room/delete/${roomId}`, token, "DELETE");
  } catch {
    await backend(`/room/update/${roomId}`, token, "PUT", { status: "FINISHED" });
  }
  return true;
}

function rememberChat(channel, message) {
  if (!message || typeof message !== "object" || typeof message.text !== "string") return;
  const history = chatHistory.get(channel) ?? { messages: [], touchedAt: 0 };
  history.messages.push(message);
  if (history.messages.length > CHAT_LIMIT) history.messages.shift();
  history.touchedAt = Date.now();
  chatHistory.set(channel, history);
}

function rememberSuspect(channel, data) {
  if (typeof data.round !== "number" || typeof data.from !== "number") return;
  const history = suspectHistory.get(channel) ?? { items: new Map(), touchedAt: 0 };
  history.items.set(`${data.round}:${data.from}`, { type: "suspect", round: data.round, from: data.from, target: data.target ?? null });
  history.touchedAt = Date.now();
  suspectHistory.set(channel, history);
}

function handleControlMessage(channel, data) {
  const roomId = roomIdFromChannel(channel);
  if (!roomId) return false;

  if (data.type === "owner-alive") {
    watchedRooms.set(channel, { roomId, token: data.token ?? null, lastSeen: Date.now() });
    return true;
  }
  if (data.type === "game-started" || data.type === "room-closed") {
    watchedRooms.delete(channel);
  }
  return false;
}

server.on("connection", (socket, request) => {
  const channel = new URL(request.url ?? "/", "http://localhost").pathname;

  if (!channels.has(channel)) channels.set(channel, new Set());
  const members = channels.get(channel);
  members.add(socket);

  const history = chatHistory.get(channel);
  if (history?.messages.length) {
    socket.send(JSON.stringify({ type: "chat-history", messages: history.messages }));
  }
  const suspects = suspectHistory.get(channel);
  if (suspects?.items.size) {
    socket.send(JSON.stringify({ type: "suspect-history", items: [...suspects.items.values()] }));
  }

  socket.isAlive = true;
  socket.on("pong", () => {
    socket.isAlive = true;
  });

  socket.on("message", (raw) => {
    const text = raw.toString();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (data && typeof data === "object" && handleControlMessage(channel, data)) return;
    if (data?.type === "chat") rememberChat(channel, data.message);
    if (data?.type === "suspect") rememberSuspect(channel, data);
    broadcast(channel, text, socket);
  });

  socket.on("close", () => {
    members.delete(socket);
    if (members.size === 0) channels.delete(channel);
  });
});

setInterval(() => {
  for (const socket of server.clients) {
    if (!socket.isAlive) {
      socket.terminate();
      continue;
    }
    socket.isAlive = false;
    socket.ping();
  }
}, 30_000).unref();

setInterval(() => {
  const now = Date.now();
  for (const [channel, history] of chatHistory) {
    if (now - history.touchedAt > CHAT_KEEP_MS) chatHistory.delete(channel);
  }
  for (const [channel, history] of suspectHistory) {
    if (now - history.touchedAt > CHAT_KEEP_MS) suspectHistory.delete(channel);
  }
}, 10 * 60 * 1000).unref();

setInterval(async () => {
  const now = Date.now();
  for (const [channel, watch] of watchedRooms) {
    if (now - watch.lastSeen < OWNER_AWAY_MS) continue;
    watchedRooms.delete(channel);

    try {
      const isClosed = await closeAbandonedRoom(watch.roomId, watch.token);
      if (isClosed) {
        console.log(`  Комната ${watch.roomId} закрыта: создатель не отвечает`);
        broadcast(channel, { type: "room-closed", reason: "owner-away" });
      }
    } catch (error) {
      console.log(`  Не удалось закрыть комнату ${watch.roomId}: ${error.message}`);
    }
  }
}, 10_000).unref();

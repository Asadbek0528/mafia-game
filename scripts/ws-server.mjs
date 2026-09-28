import { WebSocketServer } from "ws";

import { BACKEND_URL, setting } from "./env.mjs";
import { onUserClose, onUserConnect, onUserMessage } from "./social.mjs";

const PORT = Number(process.env.WS_PORT ?? process.env.PORT ?? setting("WS_PORT", 3001));
const OWNER_LEFT_MS = Number(setting("ROOM_OWNER_LEFT_SECONDS", 60)) * 1000;
const OWNER_SILENT_MS = Number(setting("ROOM_OWNER_SILENT_SECONDS", 180)) * 1000;
const GAME_ABANDONED_MS = Number(setting("GAME_ABANDONED_MINUTES", 5)) * 60 * 1000;
const GAME_CHECK_MS = Number(setting("GAME_CHECK_SECONDS", 60)) * 1000;
const startedAt = Date.now();

const channels = new Map();
const watchedRooms = new Map();
const gameSeenAt = new Map();
const channelTokens = new Map();
const chatHistory = new Map();
const suspectHistory = new Map();
const gameRoles = new Map();
const TEAM_ROLES = ["mafia", "doctor", "commissar"];
const SERVER_ONLY_TYPES = ["team", "check-result"];
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
  await removeRoom(roomId, token);
  return true;
}

function parseServerDate(value) {
  if (!value) return 0;
  const hasZone = /Z$|[+-]\d{2}:?\d{2}$/.test(value);
  const ms = Date.parse(hasZone ? value : `${value}Z`);
  return Number.isFinite(ms) ? ms : 0;
}

function gameIdFromChannel(channel) {
  return channel.match(/\/game\/(\d+)$/)?.[1] ?? null;
}

function touchGame(channel) {
  const gameId = gameIdFromChannel(channel);
  if (gameId) gameSeenAt.set(gameId, Date.now());
}

async function lastGameActivity(gameId, token) {
  const rounds = await backend(`/game-round/list?game_id=${gameId}`, token);
  const latest = [...rounds].sort((a, b) => b.round_number - a.round_number).slice(0, 3);
  let last = 0;
  for (const round of latest) {
    const [actions, votes] = await Promise.all([
      backend(`/night-action/list?round_id=${round.id}`, token).catch(() => []),
      backend(`/vote/list?round_id=${round.id}`, token).catch(() => []),
    ]);
    for (const item of [...actions, ...votes]) last = Math.max(last, parseServerDate(item.created_at));
  }
  return last;
}

async function cleanAbandonedGames() {
  const games = await backend("/game/list");
  const now = Date.now();

  for (const game of games) {
    if (game.winner !== null) {
      gameRoles.delete(String(game.id));
      continue;
    }
    const id = String(game.id);
    const channel = `/ws/game/${id}`;

    if (channels.get(channel)?.size) {
      gameSeenAt.set(id, now);
      continue;
    }
    if (!gameSeenAt.has(id)) {
      gameSeenAt.set(id, now);
      continue;
    }
    if (now - gameSeenAt.get(id) < GAME_ABANDONED_MS) continue;

    const token = channelTokens.get(channel) ?? null;
    const lastActivity = await lastGameActivity(id, token).catch(() => now);
    if (now - lastActivity < GAME_ABANDONED_MS) continue;

    try {
      const isDeleted = await backend(`/game/delete/${id}`, token, "DELETE").then(() => true).catch(() => false);
      if (!isDeleted) await backend(`/game/update/${id}`, token, "PUT", { winner: "CITIZENS" });
      await removeRoom(String(game.room_id), token);
      gameSeenAt.delete(id);
      gameRoles.delete(id);
      console.log(`  Игра ${id} (комната ${game.room_id}) удалена: игроков нет больше ${GAME_ABANDONED_MS / 60000} мин`);
      broadcast(channel, { type: "room-closed", reason: "abandoned" });
      broadcast(`/ws/room/${game.room_id}`, { type: "room-closed", reason: "abandoned" });
    } catch (error) {
      console.log(`  Не удалось удалить брошенную игру ${id}: ${error.message}`);
    }
  }
}

async function removeRoom(roomId, token) {
  const players = await backend(`/room-player/list?room_id=${roomId}`, token).catch(() => []);
  await Promise.all(
    players.map((player) => backend(`/room-player/delete/${player.id}`, token, "DELETE").catch(() => null)),
  );

  try {
    await backend(`/room/delete/${roomId}`, token, "DELETE");
  } catch {
    await backend(`/room/update/${roomId}`, token, "PUT", { status: "FINISHED" });
  }
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

function handleControlMessage(channel, data, socket) {
  const roomId = roomIdFromChannel(channel);
  if (!roomId) return false;

  if (data.type === "owner-alive") {
    watchedRooms.set(channel, { roomId, token: data.token ?? null, lastSeen: Date.now(), socket, leftAt: null });
    return true;
  }
  if (data.type === "game-started" || data.type === "room-closed") {
    watchedRooms.delete(channel);
  }
  return false;
}

async function learnRole(gameId, token) {
  const userId = userIdFromToken(token);
  if (!token || userId === null) return null;
  const players = await backend(`/game-player/list?game_id=${gameId}`, token);
  const me = players.find((player) => player.user_id === userId);
  if (!me?.role) return null;
  const roles = gameRoles.get(gameId) ?? new Map();
  roles.set(me.id, me.role);
  gameRoles.set(gameId, roles);
  return { playerId: me.id, role: me.role };
}

function sendTeams(gameId) {
  const roles = gameRoles.get(gameId);
  const members = channels.get(`/ws/game/${gameId}`);
  if (!roles || !members) return;
  for (const socket of members) {
    const role = socket.gameRole?.role;
    if (!TEAM_ROLES.includes(role) || socket.readyState !== socket.OPEN) continue;
    const ids = [...roles].filter(([, item]) => item === role).map(([id]) => id);
    socket.send(JSON.stringify({ type: "team", role, ids }));
  }
}

async function answerCheck(socket, gameId, token, targetId) {
  const me = await socket.rolePromise;
  if (!me || me.role !== "commissar" || typeof targetId !== "number") return;
  const reply = (isMafia) => {
    if (socket.readyState === socket.OPEN) socket.send(JSON.stringify({ type: "check-result", target: targetId, isMafia }));
  };

  const rounds = await backend(`/game-round/list?game_id=${gameId}`, token);
  const killers = new Set();
  let checked = false;
  for (const round of rounds) {
    const actions = await backend(`/night-action/list?round_id=${round.id}`, token).catch(() => []);
    for (const action of actions) {
      if (action.action_type === "KILL") killers.add(action.actor_id);
      if (action.action_type !== "CHECK" || action.actor_id !== me.playerId || action.target_id !== targetId) continue;
      if (typeof action.is_mafia === "boolean") return reply(action.is_mafia);
      checked = true;
    }
  }
  if (!checked) return;

  const roles = gameRoles.get(gameId) ?? new Map();
  if (roles.has(targetId)) return reply(roles.get(targetId) === "mafia");
  if (killers.has(targetId)) return reply(true);

  const game = await backend(`/game/detail?game_id=${gameId}`, token);
  const room = await backend(`/room/detail?room_id=${game.room_id}`, token);
  const knownMafia = new Set(killers);
  for (const [id, role] of roles) if (role === "mafia") knownMafia.add(id);
  reply(knownMafia.size >= room.mafia_count ? false : null);
}

const verifiedTokens = new Map();

function userIdFromToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    const id = Number(payload.user_id ?? payload.id ?? payload.sub);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

async function verifyUser(token, claimedId) {
  if (!token) return false;
  if (!verifiedTokens.has(token)) {
    const response = await fetch(`${BACKEND_URL}/game-player/list?game_id=0`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    }).catch(() => null);
    const isValid = response !== null && response.status !== 401 && response.status !== 403;
    verifiedTokens.set(token, isValid ? (userIdFromToken(token) ?? claimedId) : null);
  }
  return verifiedTokens.get(token) === claimedId;
}

function handleUserSocket(socket, userId, token) {
  const queue = [];
  let isReady = false;

  socket.on("message", (raw) => {
    let data = null;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (!data || typeof data !== "object") return;
    if (isReady) onUserMessage(userId, data);
    else queue.push(data);
  });

  socket.on("close", () => {
    if (isReady) onUserClose(userId, socket);
  });

  verifyUser(token, userId).then((isValid) => {
    if (!isValid) {
      socket.close(4001, "auth");
      return;
    }
    if (socket.readyState !== socket.OPEN) return;
    isReady = true;
    onUserConnect(userId, socket);
    for (const data of queue.splice(0)) onUserMessage(userId, data);
  });
}

server.on("connection", (socket, request) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const channel = url.pathname;
  const token = url.searchParams.get("token");

  const userMatch = channel.match(/^\/ws\/user\/(\d+)$/);
  if (userMatch) {
    handleUserSocket(socket, Number(userMatch[1]), token);
    return;
  }
  if (token) channelTokens.set(channel, token);
  touchGame(channel);

  const gameId = gameIdFromChannel(channel);
  if (gameId && token) {
    socket.rolePromise = learnRole(gameId, token)
      .then((info) => {
        socket.gameRole = info;
        if (info) sendTeams(gameId);
        return info;
      })
      .catch(() => null);
  }

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

    if (data && typeof data === "object" && handleControlMessage(channel, data, socket)) return;
    if (SERVER_ONLY_TYPES.includes(data?.type)) return;
    if (data?.type === "check") {
      if (gameId && token) answerCheck(socket, gameId, token, data.target).catch(() => {});
      return;
    }
    if (data?.type === "chat") rememberChat(channel, data.message);
    if (data?.type === "suspect") rememberSuspect(channel, data);
    broadcast(channel, text, socket);
  });

  socket.on("close", () => {
    touchGame(channel);
    const watch = watchedRooms.get(channel);
    if (watch && watch.socket === socket) {
      watch.leftAt = Date.now();
      console.log(`  Создатель ушёл из комнаты ${watch.roomId} — закроем через ${OWNER_LEFT_MS / 1000} сек, если не вернётся`);
    }
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
    const hasLeft = watch.leftAt !== null && now - watch.leftAt >= OWNER_LEFT_MS;
    const isSilent = now - watch.lastSeen >= OWNER_SILENT_MS;
    if (!hasLeft && !isSilent) continue;
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
}, 5_000).unref();

setInterval(() => {
  cleanAbandonedGames().catch((error) => console.log(`  Проверка брошенных игр: ${error.message}`));
}, GAME_CHECK_MS).unref();

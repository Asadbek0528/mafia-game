import { networkInterfaces } from "node:os";

import { BACKEND_URL as BACKEND, setting } from "./env.mjs";

const WS_URL = `ws://localhost:${setting("NEXT_PUBLIC_WS_PORT", "3001")}`;
const SITE_PORT = setting("PORT", "3000");
const PASSWORD = setting("BOT_PASSWORD", "botpass123");
const PREFIX = setting("BOT_PREFIX", "bot");
const EMAIL_DOMAIN = setting("BOT_EMAIL_DOMAIN", "example.com");
const TICK_MS = 2000;
const PHASE_SECONDS = { NIGHT: 90, DAY: 60, VOTING: 30 };
const NIGHT_TURN = { mafia: 0, doctor: 1, commissar: 2 };
const NIGHT_TURN_MS = 30_000;
const PREVIOUS_ACTION = { mafia: null, doctor: "KILL", commissar: "HEAL" };

const [roomArg, countArg, humansArg] = process.argv.slice(2);
const isNewRoom = roomArg === "new";
const count = Number(countArg ?? 3);
const humans = Number(humansArg ?? 1);
let roomId = isNewRoom ? null : roomArg;

if (!roomArg || (!isNewRoom && !/^\d+$/.test(roomArg)) || !Number.isInteger(count) || count < 1) {
  console.log("Новая комната с ботами:   npm run bots -- new 3");
  console.log("Боты в вашу комнату:      npm run bots -- 12 3");
  process.exit(1);
}

const NIGHT_ACTION = { mafia: "KILL", doctor: "HEAL", commissar: "CHECK" };
const ROLE_NAME = { mafia: "мафия", doctor: "доктор", commissar: "комиссар", civilian: "житель" };
const PHASE_NAME = { NIGHT: "ночь", DAY: "день", VOTING: "голосование" };
const PHASE_ENDPOINT = { NIGHT: "end-night", DAY: "start-voting", VOTING: "end-voting" };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomItem = (items) => items[Math.floor(Math.random() * items.length)];

function lanHost() {
  const addresses = Object.values(networkInterfaces())
    .flat()
    .filter((item) => item && item.family === "IPv4" && !item.internal)
    .map((item) => item.address)
    .sort((a, b) => (a.startsWith("192.168.") ? 0 : 1) - (b.startsWith("192.168.") ? 0 : 1));
  return addresses[0] ?? "localhost";
}

function parseServerDate(value) {
  if (!value) return null;
  const hasZone = /Z$|[+-]\d{2}:?\d{2}$/.test(value);
  const ms = Date.parse(hasZone ? value : `${value}Z`);
  return Number.isFinite(ms) ? ms : null;
}

async function request(path, { method = "GET", body, token } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(BACKEND + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const detail = data?.detail;
    const message = typeof detail === "string" ? detail : Array.isArray(detail) ? detail.map((item) => item.msg).join("; ") : `HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
}

function userIdFromToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    const id = Number(payload.user_id ?? payload.id ?? payload.sub);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

async function login(username) {
  const data = await request("/auth/login", { method: "POST", body: { username, password: PASSWORD } });
  const token = data?.access_token ?? data?.access ?? data?.token;
  if (!token) throw new Error("backend не вернул токен при входе");

  let userId = data?.user_id ?? data?.id ?? data?.user?.id ?? userIdFromToken(token);
  if (!userId) {
    const users = await request("/user/list", { token });
    userId = users.find((user) => user.username === username)?.id ?? null;
  }
  if (!userId) throw new Error("не удалось узнать id бота");
  return { username, token, userId };
}

async function signIn(username) {
  try {
    return await login(username);
  } catch (error) {
    if (![400, 401, 404].includes(error.status)) throw error;
  }

  await request("/auth/register", {
    method: "POST",
    body: {
      username,
      email: `${username}@${EMAIL_DOMAIN}`,
      age: 18,
      password: PASSWORD,
      profile_image: null,
      role: "player",
    },
  });
  console.log(`[${username}] зарегистрирован`);
  return login(username);
}

const DAY_PHRASES = [
  "Я мирный, честно!",
  "Кто-то слишком тихо сидит…",
  "Ночью слышал шаги у соседа",
  "Давайте голосовать с умом",
  "Мафия среди нас, это точно",
  "Доктор, не забудь про меня",
  "Мне кажется, я знаю, кто это",
];

function notify(path, type = "update", extra = {}) {
  try {
    const socket = new WebSocket(WS_URL + path);
    socket.onopen = () => {
      socket.send(JSON.stringify({ ...extra, type }));
      setTimeout(() => socket.close(), 200);
    };
    socket.onerror = () => {};
  } catch {
    return;
  }
}

function countRoles(players) {
  return {
    mafia: Math.max(1, Math.floor(players / 3.5)),
    doctor: players >= 4 ? 1 : 0,
    commissar: players >= 5 ? 1 : 0,
  };
}

async function createRoom(host) {
  const maxPlayers = Math.max(4, count + humans);
  const roles = countRoles(maxPlayers);
  const room = await request("/room/create", {
    method: "POST",
    token: host.token,
    body: {
      room_name: "Игра с ботами",
      max_players: maxPlayers,
      age: 0,
      owner_id: host.userId,
      mafia_count: roles.mafia,
      doctor_count: roles.doctor,
      commissar_count: roles.commissar,
      day_time: PHASE_SECONDS.DAY,
      night_time: PHASE_SECONDS.NIGHT,
    },
  });
  roomId = String(room.id);
  console.log(`[${host.username}] создал комнату ${roomId} на ${maxPlayers} игроков`);
}

async function joinRoom(bot) {
  const players = await request(`/room-player/list?room_id=${roomId}`, { token: bot.token });
  if (players.some((player) => player.user_id === bot.userId)) return;
  await request("/room-player/create", {
    method: "POST",
    token: bot.token,
    body: { room_id: Number(roomId), user_id: bot.userId },
  });
  console.log(`[${bot.username}] зашёл в комнату ${roomId}`);
  notify(`/ws/room/${roomId}`);
}

async function findGameId(token) {
  const games = await request("/game/list", { token });
  const active = games
    .filter((game) => game.room_id === Number(roomId) && game.winner === null)
    .sort((a, b) => b.id - a.id)[0];
  return active?.id ?? null;
}

function sayInChat(bot, gameId, text, scope) {
  const message = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: bot.username,
    text,
    time: Date.now(),
    scope,
  };
  notify(`/ws/game/${gameId}`, "chat", { message });
}

function suspect(gameId, round, me, others) {
  const target = randomItem(others);
  if (!target) return;
  notify(`/ws/game/${gameId}`, "suspect", { round, from: me.id, target: target.id });
}

async function maybeChat(bot, gameId, state, key, phase, me, others, round) {
  if (state.chatted.has(key) || !me?.is_alive) return;
  state.chatted.add(key);
  if (phase === "DAY" && Math.random() < 0.8) {
    setTimeout(() => suspect(gameId, round, me, others), 4000 + Math.random() * 20000);
  }
  if (phase === "DAY" && Math.random() < 0.6) {
    await sleep(3000 + Math.random() * 12000);
    sayInChat(bot, gameId, randomItem(DAY_PHRASES), "all");
  }
}

async function actIfNeeded(bot, gameId, state) {
  const game = await request(`/game/detail?game_id=${gameId}`, { token: bot.token });
  if (game.winner) return game.winner;

  const phase = game.current_phase ?? "NIGHT";
  const key = `${game.current_round}-${phase}`;
  if (state.done.has(key) && state.chatted.has(key)) return null;

  const [players, rounds] = await Promise.all([
    request(`/game-player/list?game_id=${gameId}`, { token: bot.token }),
    request(`/game-round/list?game_id=${gameId}`, { token: bot.token }),
  ]);

  const me = players.find((player) => player.user_id === bot.userId);
  const alive = players.filter((player) => player.is_alive && player.id !== me?.id);
  maybeChat(bot, gameId, state, key, phase, me, alive, game.current_round);
  if (state.done.has(key) || phase === "DAY") {
    state.done.add(key);
    return null;
  }
  const round = rounds.find((item) => item.round_number === game.current_round);
  if (!me || !round) return null;

  if (!state.role && me.role) {
    state.role = me.role;
    console.log(`[${bot.username}] моя роль: ${ROLE_NAME[me.role] ?? me.role}`);
  }

  if (!me.is_alive) {
    if (!state.dead) console.log(`[${bot.username}] погиб`);
    state.dead = true;
    state.done.add(key);
    return null;
  }

  const others = players.filter((player) => player.is_alive && player.id !== me.id);
  const nameOf = (player) => `игрок #${player.id}`;

  try {
    if (phase === "NIGHT") {
      const action = NIGHT_ACTION[me.role];
      if (!action) {
        state.done.add(key);
        return null;
      }
      if (!state.seenAt.has(key)) state.seenAt.set(key, Date.now());
      const actions = await request(`/night-action/list?round_id=${round.id}`, { token: bot.token }).catch(() => []);
      if (me.role === "mafia" && actions.some((item) => item.action_type === "KILL")) {
        state.done.add(key);
        return null;
      }
      const previous = PREVIOUS_ACTION[me.role];
      const isPreviousDone = !previous || actions.some((item) => item.action_type === previous);
      const turnStart = state.seenAt.get(key) + NIGHT_TURN[me.role] * NIGHT_TURN_MS;
      if (!isPreviousDone && Date.now() < turnStart) return null;
      const pool = me.role === "doctor" ? [...others, me] : me.role === "mafia" ? others.filter((player) => player.role !== "mafia") : others;
      const target = randomItem(pool.length ? pool : others);
      if (!target) return null;

      await sleep(500 + Math.random() * 3500);
      const result = await request("/night-action/create", {
        method: "POST",
        token: bot.token,
        body: { round_id: round.id, actor_id: me.id, target_id: target.id, action_type: action },
      });
      const isMafia = result?.is_mafia ?? (target.role ? target.role === "mafia" : null);
      const extra = action === "CHECK" && isMafia !== null ? ` → ${isMafia ? "мафия!" : "не мафия"}` : "";
      console.log(`[${bot.username}] ночь ${game.current_round}: ${action} ${nameOf(target)}${extra}`);
    }

    if (phase === "VOTING") {
      const target = randomItem(others);
      if (!target) return null;

      await sleep(1000 + Math.random() * 3000);
      await request("/vote/create", {
        method: "POST",
        token: bot.token,
        body: { round_id: round.id, voter_id: me.id, target_id: target.id },
      });
      console.log(`[${bot.username}] голосование ${game.current_round}: против ${nameOf(target)}`);
    }

    state.done.add(key);
    state.errors = 0;
    notify(`/ws/game/${gameId}`);
  } catch (error) {
    state.errors = (state.errors ?? 0) + 1;
    console.log(`[${bot.username}] ошибка (${phase}): ${error.message}`);
    if (state.errors >= 3) state.done.add(key);
  }
  return null;
}

async function runBot(bot) {
  const state = { done: new Set(), chatted: new Set(), seenAt: new Map(), role: null, dead: false, errors: 0 };
  let gameId = null;
  let isWaitingShown = false;

  while (true) {
    try {
      if (!gameId) {
        gameId = await findGameId(bot.token);
        if (!gameId) {
          if (!isWaitingShown) console.log(`[${bot.username}] ждёт начала игры…`);
          isWaitingShown = true;
          await sleep(TICK_MS);
          continue;
        }
        console.log(`[${bot.username}] игра #${gameId} началась`);
      }

      const winner = await actIfNeeded(bot, gameId, state);
      if (winner) return winner;
    } catch (error) {
      console.log(`[${bot.username}] нет связи: ${error.message}`);
    }
    await sleep(TICK_MS);
  }
}

async function waitForPlayersAndStart(host) {
  const needed = Math.max(4, count + humans);
  let lastCount = -1;

  while (true) {
    const players = await request(`/room-player/list?room_id=${roomId}`, { token: host.token }).catch(() => []);
    if (players.length !== lastCount) {
      lastCount = players.length;
      console.log(`[хозяин] в комнате ${players.length} из ${needed}`);
    }
    if (players.length >= needed) break;
    await sleep(TICK_MS);
  }

  console.log("[хозяин] все на месте — игра начнётся через 5 секунд");
  await sleep(5000);
  const game = await request("/game/create", { method: "POST", token: host.token, body: { room_id: Number(roomId) } });
  notify(`/ws/room/${roomId}`, "game-started");
  console.log(`[хозяин] игра #${game.id} началась`);
  return game.id;
}

async function hostPhases(host, gameId) {
  let key = "";
  let phaseSeenAt = Date.now();

  while (true) {
    try {
      const game = await request(`/game/detail?game_id=${gameId}`, { token: host.token });
      if (game.winner) return;

      const phase = game.current_phase ?? "NIGHT";
      const currentKey = `${game.current_round}-${phase}`;
      if (currentKey !== key) {
        key = currentKey;
        phaseSeenAt = Date.now();
        console.log(`[хозяин] ${PHASE_NAME[phase]} ${game.current_round}`);
      }

      const endsAt = parseServerDate(game.phase_ends_at) ?? phaseSeenAt + PHASE_SECONDS[phase] * 1000;
      if (Date.now() > endsAt + 3000) {
        await request(`/game/${PHASE_ENDPOINT[phase]}/${gameId}`, { method: "POST", token: host.token });
        notify(`/ws/game/${gameId}`, "phase");
      }
    } catch (error) {
      console.log(`[хозяин] не смог сменить фазу: ${error.message}`);
      await sleep(3000);
    }
    await sleep(1000);
  }
}

console.log(`Backend: ${BACKEND}\n`);

const bots = [];
for (let i = 1; i <= count; i++) {
  const username = `${PREFIX}${i}`;
  try {
    const bot = await signIn(username);
    if (isNewRoom && !roomId) await createRoom(bot);
    await joinRoom(bot);
    bots.push(bot);
  } catch (error) {
    console.log(`[${username}] не смог войти: ${error.message}`);
  }
}

if (bots.length === 0 || !roomId) {
  console.log("\nНи один бот не зашёл. Проверьте BACKEND_URL и номер комнаты.");
  process.exit(1);
}

const phoneLink = `http://${lanHost()}:${SITE_PORT}/room/${roomId}`;
console.log("\n==============================================");
console.log(` Ссылка для телефона: ${phoneLink}`);
console.log("==============================================\n");

const playing = bots.map(runBot);

if (isNewRoom) {
  const host = bots[0];
  console.log(`Ждём вас в комнате. Нужно ещё ${humans} человек(а).`);
  const gameId = await waitForPlayersAndStart(host);
  hostPhases(host, gameId);
} else {
  console.log("Нажмите «Начать игру» в браузере — дальше боты играют сами.\n");
}

const winners = await Promise.all(playing);
const winner = winners.find(Boolean);
console.log(`\nИгра окончена. Победа: ${winner === "MAFIA" ? "мафии" : "жителей"}`);
process.exit(0);

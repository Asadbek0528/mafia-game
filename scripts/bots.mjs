import { BACKEND_URL as BACKEND, setting } from "./env.mjs";

const WS_URL = `ws://localhost:${setting("NEXT_PUBLIC_WS_PORT", "3001")}`;
const PASSWORD = setting("BOT_PASSWORD", "botpass123");
const PREFIX = setting("BOT_PREFIX", "bot");
const EMAIL_DOMAIN = setting("BOT_EMAIL_DOMAIN", "example.com");
const TICK_MS = 2000;

const [roomId, countArg] = process.argv.slice(2);
const count = Number(countArg ?? 3);

if (!roomId || !Number.isInteger(count) || count < 1) {
  console.log("Как запустить:  npm run bots -- <номер комнаты> [сколько ботов]");
  console.log("Пример:         npm run bots -- 12 3");
  process.exit(1);
}

const NIGHT_ACTION = { mafia: "KILL", doctor: "HEAL", commissar: "CHECK" };
const ROLE_NAME = { mafia: "мафия", doctor: "доктор", commissar: "комиссар", civilian: "житель" };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomItem = (items) => items[Math.floor(Math.random() * items.length)];

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

function notify(path) {
  try {
    const socket = new WebSocket(WS_URL + path);
    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "update" }));
      setTimeout(() => socket.close(), 200);
    };
    socket.onerror = () => {};
  } catch {
    return;
  }
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

async function actIfNeeded(bot, gameId, state) {
  const game = await request(`/game/detail?game_id=${gameId}`, { token: bot.token });
  if (game.winner) return game.winner;

  const phase = game.current_phase ?? "NIGHT";
  const key = `${game.current_round}-${phase}`;
  if (state.done.has(key) || phase === "DAY") return null;

  const [players, rounds] = await Promise.all([
    request(`/game-player/list?game_id=${gameId}`, { token: bot.token }),
    request(`/game-round/list?game_id=${gameId}`, { token: bot.token }),
  ]);

  const me = players.find((player) => player.user_id === bot.userId);
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
      const targets = me.role === "mafia" ? others.filter((player) => player.role !== "mafia") : others;
      const target = randomItem(targets.length ? targets : others);
      if (!target) return null;

      await sleep(1000 + Math.random() * 3000);
      const result = await request("/night-action/create", {
        method: "POST",
        token: bot.token,
        body: { round_id: round.id, actor_id: me.id, target_id: target.id, action_type: action },
      });
      const extra = action === "CHECK" && result?.is_mafia != null ? ` → ${result.is_mafia ? "мафия!" : "не мафия"}` : "";
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
  const state = { done: new Set(), role: null, dead: false, errors: 0 };
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

console.log(`Backend: ${BACKEND}`);
console.log(`Комната: ${roomId}, ботов: ${count}\n`);

const bots = [];
for (let i = 1; i <= count; i++) {
  const username = `${PREFIX}${i}`;
  try {
    const bot = await signIn(username);
    await joinRoom(bot);
    bots.push(bot);
  } catch (error) {
    console.log(`[${username}] не смог войти: ${error.message}`);
  }
}

if (bots.length === 0) {
  console.log("\nНи один бот не зашёл. Проверьте BACKEND_URL и номер комнаты.");
  process.exit(1);
}

console.log(`\nВ комнате ${bots.length} бот(а). Нажмите «Начать игру» в браузере — дальше боты играют сами.\n`);

const winners = await Promise.all(bots.map(runBot));
const winner = winners.find(Boolean);
console.log(`\nИгра окончена. Победа: ${winner === "MAFIA" ? "мафии" : "жителей"}`);
process.exit(0);

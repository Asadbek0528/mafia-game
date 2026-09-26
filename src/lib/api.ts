/*
  =============================================================
  api.ts — все запросы к backend в одном файле.

  Как это работает:
  1. Фронт ходит на "/backend/...", а Next.js пересылает запрос
     на http://13.211.79.228/... (смотри next.config.ts).
  2. Backend отдаёт данные в своём виде (room_name, owner_id ...).
     Здесь мы переводим их в удобный для страниц вид
     (name, owner ...). Страницы ничего не знают о формате backend.
  3. Все адреса лежат в ENDPOINTS. Поменялся путь — меняем только тут.
  4. Типы BACKEND ниже сделаны по openapi.json от backend-команды.
  =============================================================
*/
import { getRefreshToken, getToken, getUser, saveTokens } from "./auth";
import { countRoles, DEFAULT_TIMES } from "./roles";

const API_URL = "/backend";
const REQUEST_TIMEOUT_MS = 15000;
const SERVER_DOWN_TEXT =
  "Backend не отвечает или упал. Проверьте, что сервер запущен (адрес — BACKEND_URL в .env.local).";

const ENDPOINTS = {
  // авторизация
  register: "/auth/register",
  login: "/auth/login",
  logout: "/auth/logout",
  refresh: "/auth/access_generate",
  googleLogin: "/auth/google/login",
  googleCallback: (code: string) =>
    `/auth/google/callback?code=${encodeURIComponent(code)}`,

  // пользователь
  userList: "/user/list",
  userDetail: (userId: number) => `/user/detail?user_id=${userId}`,
  statistic: (userId: number) => `/statistic/${userId}`,

  // комнаты
  roomList: "/room/list",
  roomCreate: "/room/create",
  roomDetail: (roomId: string) => `/room/detail?room_id=${roomId}`,
  roomUpdate: (roomId: string) => `/room/update/${roomId}`,

  // игроки в комнате
  roomPlayerList: (roomId?: string) =>
    roomId ? `/room-player/list?room_id=${roomId}` : "/room-player/list",
  roomPlayerCreate: "/room-player/create",
  roomPlayerDelete: (roomPlayerId: number) =>
    `/room-player/delete/${roomPlayerId}`,

  // игра
  gameCreate: "/game/create",
  gameList: "/game/list",
  gameDetail: (gameId: string) => `/game/detail?game_id=${gameId}`,
  gamePlayers: (gameId: string) => `/game-player/list?game_id=${gameId}`,
  gameRounds: (gameId: string) => `/game-round/list?game_id=${gameId}`,
  gameRoundDetail: (roundId: number) =>
    `/game-round/detail?round_id=${roundId}`,
  endNight: (gameId: string) => `/game/end-night/${gameId}`,
  startVoting: (gameId: string) => `/game/start-voting/${gameId}`,
  endVoting: (gameId: string) => `/game/end-voting/${gameId}`,
  nightAction: "/night-action/create",
  vote: "/vote/create",
};

/* =============================================================
   ТИПЫ ДЛЯ СТРАНИЦ (так данные выглядят во фронте)
   ============================================================= */

export type User = {
  id?: number; // id из базы. У гостя нет
  username: string;
  email?: string;
  age?: number;
  games_played?: number;
  wins?: number;
  guest?: boolean;
};

export type RoleKey = "mafia" | "doctor" | "commissar" | "civilian";

// сколько особых ролей в игре (жители = все остальные)
export type RoleCounts = {
  mafia: number;
  doctor: number;
  commissar: number;
};

export type RoomShort = {
  id: string;
  name: string;
  players: number;
  max_players: number;
  age: number; // минимальный возраст
  status: "waiting" | "playing";
};

export type RoomPlayer = {
  username: string;
  ready?: boolean; // undefined = backend пока не поддерживает «Готов»
};

export type RoomFull = {
  id: string;
  name: string;
  owner: string;
  ownerId: number | null; // null — демо-комната
  age: number;
  max_players: number;
  day_time: number;
  night_time: number;
  roles: RoleCounts;
  status: "waiting" | "playing" | "finished";
  players: RoomPlayer[];
  readySupported: boolean; // есть ли кнопка «Я готов»
};

export type GamePhase = "NIGHT" | "DAY" | "VOTING";
export type GameWinner = "MAFIA" | "CITIZENS";

export type GamePlayer = {
  id: number; // id игрока В ЭТОЙ ИГРЕ (game_player.id)
  userId: number;
  username: string;
  role: RoleKey | null; // null — backend скрыл чужую роль
  isAlive: boolean;
};

export type RoundResult = {
  roundNumber: number;
  killedPlayerId: number | null; // кого убила мафия ночью
  savedByDoctor: boolean; // доктор спас?
  eliminatedPlayerId: number | null; // кого выгнали голосованием
};

export type GameState = {
  id: string;
  roomId: string;
  ownerUserId: number;
  round: number;
  roundId: number | null; // id текущего раунда (нужен для действий)
  phase: GamePhase;
  phaseEndsAt: number | null; // когда кончится фаза по часам сервера (мс)
  winner: GameWinner | null;
  players: GamePlayer[];
  lastRound: RoundResult | null;
  dayTime: number;
  nightTime: number;
};

export type GameResult = {
  room: string;
  result: "win" | "lose";
  role: RoleKey;
  ago: string;
};

export type OnlineUser = {
  username: string;
  status: "playing" | "lobby";
};

/* =============================================================
   ТИПЫ BACKEND (так данные приходят с сервера, см. openapi.json)
   ============================================================= */

type BackendRoom = {
  id: number;
  room_name: string;
  max_players: number;
  age: number;
  status: "WAITING" | "STARTING" | "IN_PROGRESS" | "FINISHED";
  owner_id: number;
  mafia_count: number;
  doctor_count: number;
  commissar_count: number;
  day_time: number;
  night_time: number;
};

type BackendRoomPlayer = { id: number; user_id: number; room_id: number };
type BackendUser = { id: number; username: string; email: string; age: number };
type BackendUserShort = { id: number; username: string };
type BackendGame = {
  id: number;
  room_id: number;
  current_round: number;
  current_phase: GamePhase | null;
  winner: GameWinner | null;
  phase_ends_at?: string | null;
};
type BackendGamePlayer = {
  id: number;
  user_id: number;
  role: RoleKey | null;
  is_alive: boolean;
};
type BackendRoundShort = {
  id: number;
  round_number: number;
  eliminated_player_id: number | null;
};
type BackendRoundDetail = BackendRoundShort & {
  killed_player_id: number | null;
  saved_by_doctor: boolean;
};
type BackendNightAction = { id: number; is_mafia?: boolean | null };

/* =============================================================
   ОШИБКА И БАЗОВЫЙ ЗАПРОС
   ============================================================= */

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// сервер лежит или не отвечает (а не «вы что-то сделали не так»)
export function isServerDown(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 0 || error.status >= 500);
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: object;
};

async function request<T>(
  path: string,
  options: RequestOptions = {},
  isRetry = false,
): Promise<T> {
  const headers: Record<string, string> = {};

  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (options.body) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(API_URL + path, {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), // не ждём вечно
    });
  } catch {
    throw new ApiError(SERVER_DOWN_TEXT, 0);
  }

  // токен устарел → получаем новый и повторяем запрос один раз
  if (response.status === 401 && !isRetry && getRefreshToken()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return request<T>(path, options, true);
  }

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    // 500 не в формате FastAPI (просто текст) — прокси Next.js не достучался до backend
    if (response.status === 500 && typeof data === "string") {
      throw new ApiError(SERVER_DOWN_TEXT, 0);
    }
    throw new ApiError(getErrorText(data, response.status), response.status);
  }

  return data as T;
}

// FastAPI: { "detail": "текст" } или { "detail": [ { "msg": "..." } ] }
function getErrorText(data: unknown, status: number): string {
  const detail = (data as { detail?: unknown } | null)?.detail;

  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((item: { msg?: string }) => item.msg).join("\n");
  if (status === 401) return "Неверный логин или пароль.";
  if (status === 404) return "Не найдено.";
  if (status >= 500) return "Ошибка на сервере. Сообщите backend-команде.";
  return `Ошибка ${status}`;
}

/*
  Дата с сервера → миллисекунды.
  FastAPI часто отдаёт время без часового пояса ("2026-09-26T10:00:00") —
  считаем, что это UTC.
*/
function parseServerDate(value: string | null | undefined): number | null {
  if (!value) return null;
  const hasZone = /Z$|[+-]\d{2}:?\d{2}$/.test(value);
  const ms = Date.parse(hasZone ? value : `${value}Z`);
  return Number.isFinite(ms) ? ms : null;
}

/* =============================================================
   ТОКЕНЫ
   ============================================================= */

export type LoginResult = {
  accessToken: string | null;
  refreshToken: string | null;
  userId: number | null;
  username: string | null;
};

// backend может назвать поля по-разному — пробуем все варианты
function readLoginResponse(data: Record<string, unknown> | null): LoginResult {
  const obj = data ?? {};
  const user = obj.user as { id?: number; username?: string } | undefined;

  const accessToken = (obj.access_token ?? obj.access ?? obj.token ?? null) as
    | string
    | null;
  const refreshToken = (obj.refresh_token ?? obj.refresh ?? null) as
    | string
    | null;
  const userId = (obj.user_id ??
    obj.id ??
    user?.id ??
    getUserIdFromToken(accessToken)) as number | null;
  const username = (obj.username ?? user?.username ?? null) as string | null;

  return { accessToken, refreshToken, userId, username };
}

/*
  Токен (JWT) состоит из 3 частей через точку. Вторая часть — это JSON,
  там обычно лежит id пользователя в поле "sub" или "user_id".
*/
function getUserIdFromToken(token: string | null): number | null {
  if (!token) return null;

  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(payload)) as {
      sub?: string | number;
      user_id?: number;
      id?: number;
    };
    const id = Number(json.user_id ?? json.id ?? json.sub);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

async function refreshAccessToken(): Promise<boolean> {
  try {
    const response = await fetch(API_URL + ENDPOINTS.refresh, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: getRefreshToken() }),
    });
    if (!response.ok) return false;

    const result = readLoginResponse(await response.json());
    if (!result.accessToken) return false;

    saveTokens(result.accessToken, result.refreshToken ?? getRefreshToken());
    return true;
  } catch {
    return false;
  }
}

/* =============================================================
   ИМЕНА ИГРОКОВ
   Backend в комнатах и играх отдаёт только user_id.
   Сначала один раз грузим весь /user/list, потом (для новых игроков)
   спрашиваем /user/detail. Всё запоминаем (кэш).
   ============================================================= */

const usernameCache = new Map<number, string>();
let userListLoading: Promise<void> | null = null;

function loadAllUsernames(): Promise<void> {
  if (!userListLoading) {
    userListLoading = request<BackendUserShort[]>(ENDPOINTS.userList)
      .then((users) => {
        users.forEach((user) => usernameCache.set(user.id, user.username));
      })
      .catch(() => {
        userListLoading = null; // попробуем в другой раз
      });
  }
  return userListLoading;
}

async function getUsername(userId: number): Promise<string> {
  const me = getUser();
  if (me?.id === userId) return me.username;

  if (!usernameCache.has(userId)) await loadAllUsernames();
  const cached = usernameCache.get(userId);
  if (cached) return cached;

  try {
    const user = await request<BackendUser>(ENDPOINTS.userDetail(userId));
    usernameCache.set(userId, user.username);
    return user.username;
  } catch {
    return `Игрок ${userId}`;
  }
}

// id текущего игрока. Гостю нельзя в комнаты — у него нет id в базе
function getMyId(): number {
  const me = getUser();
  if (!me?.id) {
    throw new ApiError(
      "Чтобы играть, создайте аккаунт. Гости пока могут только смотреть.",
      401,
    );
  }
  return me.id;
}

/* =============================================================
   ПЕРЕВОД ИЗ ФОРМАТА BACKEND В ФОРМАТ СТРАНИЦ
   ============================================================= */

function toRoomStatus(status: BackendRoom["status"]): RoomFull["status"] {
  if (status === "WAITING") return "waiting";
  if (status === "FINISHED") return "finished";
  return "playing"; // STARTING и IN_PROGRESS
}

function toRoundResult(round: BackendRoundDetail): RoundResult {
  return {
    roundNumber: round.round_number,
    killedPlayerId: round.killed_player_id,
    savedByDoctor: round.saved_by_doctor,
    eliminatedPlayerId: round.eliminated_player_id,
  };
}

/* =============================================================
   МЕТОДЫ API
   ============================================================= */

export const api = {
  /* ---------- авторизация ---------- */

  async register(
    username: string,
    email: string,
    password: string,
  ): Promise<LoginResult> {
    const data = await request<Record<string, unknown>>(ENDPOINTS.register, {
      method: "POST",
      // age: backend требует это поле. Поля в форме нет — отправляем 0 («не указан»).
      body: {
        username,
        email,
        age: 0,
        password,
        profile_image: null,
        role: "player",
      },
    });
    return readLoginResponse(data);
  },

  async login(username: string, password: string): Promise<LoginResult> {
    const data = await request<Record<string, unknown>>(ENDPOINTS.login, {
      method: "POST",
      body: { username, password },
    });
    return readLoginResponse(data);
  },

  async logout() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return;
    await request(ENDPOINTS.logout, {
      method: "POST",
      body: { refresh_token: refreshToken },
    }).catch(() => {});
  },

  /*
    Вход через Google, шаг 1: уходим на страницу Google.
    Backend либо сразу делает redirect, либо отдаёт JSON с адресом —
    поддерживаем оба варианта.
  */
  async startGoogleLogin() {
    const url = API_URL + ENDPOINTS.googleLogin;
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.type === "opaqueredirect") {
        window.location.href = url;
        return;
      }
      const data = (await response.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      const target =
        data?.url ?? data?.auth_url ?? data?.authorization_url ?? data?.redirect_url;
      window.location.href = typeof target === "string" ? target : url;
    } catch {
      window.location.href = url;
    }
  },

  /*
    Вход через Google, шаг 2: Google вернул нас на /auth/google/callback?code=...
    Отдаём code backend-у, получаем токены.
  */
  async finishGoogleLogin(code: string): Promise<LoginResult> {
    const data = await request<Record<string, unknown>>(
      ENDPOINTS.googleCallback(code),
    );
    const result = readLoginResponse(data);

    // имени в ответе нет — спрашиваем у сервера (уже с новым токеном)
    if (!result.username && result.userId !== null && result.accessToken) {
      saveTokens(result.accessToken, result.refreshToken);
      try {
        const user = await request<BackendUser>(
          ENDPOINTS.userDetail(result.userId),
        );
        result.username = user.username;
      } catch {
        // оставим имя пустым — страница подставит «Игрок»
      }
    }
    return result;
  },

  /* ---------- профиль ---------- */

  async getMe(): Promise<User> {
    const myId = getMyId();
    const user = await request<BackendUser>(ENDPOINTS.userDetail(myId));

    // статистика: формат ответа backend не описал — пробуем разные имена полей
    let gamesPlayed = 0;
    let wins = 0;
    try {
      const stats = await request<Record<string, number>>(
        ENDPOINTS.statistic(myId),
      );
      gamesPlayed = stats.games_played ?? stats.total_games ?? stats.games ?? 0;
      wins = stats.wins ?? stats.win_count ?? stats.total_wins ?? 0;
    } catch {
      // статистики нет — оставляем 0
    }

    return {
      id: myId,
      username: user.username,
      email: user.email,
      age: user.age,
      games_played: gamesPlayed,
      wins,
    };
  },

  // TODO backend: нет endpoint «кто онлайн»
  async getOnlineUsers(): Promise<OnlineUser[]> {
    return [];
  },

  // TODO backend: нет endpoint «история игр пользователя»
  async getHistory(): Promise<GameResult[]> {
    return [];
  },

  /* ---------- комнаты ---------- */

  async getRooms(): Promise<RoomShort[]> {
    const [rooms, roomPlayers] = await Promise.all([
      request<BackendRoom[]>(ENDPOINTS.roomList),
      request<BackendRoomPlayer[]>(ENDPOINTS.roomPlayerList()),
    ]);

    return rooms
      .filter((room) => room.status !== "FINISHED")
      .map((room) => ({
        id: String(room.id),
        name: room.room_name,
        players: roomPlayers.filter((player) => player.room_id === room.id)
          .length,
        max_players: room.max_players,
        age: room.age,
        status: room.status === "WAITING" ? "waiting" : "playing",
      }));
  },

  async createRoom(
    name: string,
    maxPlayers: number,
    age: number,
  ): Promise<{ id: string }> {
    const myId = getMyId();
    const roles = countRoles(maxPlayers);

    const room = await request<BackendRoom>(ENDPOINTS.roomCreate, {
      method: "POST",
      body: {
        room_name: name,
        max_players: maxPlayers,
        age,
        owner_id: myId,
        mafia_count: roles.mafia,
        doctor_count: roles.doctor,
        commissar_count: roles.commissar,
        day_time: DEFAULT_TIMES.day,
        night_time: DEFAULT_TIMES.night,
      },
    });

    // создатель сразу заходит в свою комнату
    await request(ENDPOINTS.roomPlayerCreate, {
      method: "POST",
      body: { room_id: room.id, user_id: myId },
    });

    return { id: String(room.id) };
  },

  async getRoom(roomId: string): Promise<RoomFull> {
    const [room, roomPlayers] = await Promise.all([
      request<BackendRoom>(ENDPOINTS.roomDetail(roomId)),
      request<BackendRoomPlayer[]>(ENDPOINTS.roomPlayerList(roomId)),
    ]);

    const owner = await getUsername(room.owner_id);
    const names = await Promise.all(
      roomPlayers.map((player) => getUsername(player.user_id)),
    );

    return {
      id: String(room.id),
      name: room.room_name,
      owner,
      ownerId: room.owner_id,
      age: room.age,
      max_players: room.max_players,
      day_time: room.day_time ?? DEFAULT_TIMES.day,
      night_time: room.night_time ?? DEFAULT_TIMES.night,
      roles: {
        mafia: room.mafia_count,
        doctor: room.doctor_count,
        commissar: room.commissar_count,
      },
      status: toRoomStatus(room.status),
      players: names.map((username) => ({ username })),
      readySupported: false, // TODO backend: нет статуса «Готов»
    };
  },

  async joinRoom(roomId: string) {
    const myId = getMyId();
    const players = await request<BackendRoomPlayer[]>(
      ENDPOINTS.roomPlayerList(roomId),
    );

    // уже в комнате — ничего не делаем
    if (players.some((player) => player.user_id === myId)) return;

    await request(ENDPOINTS.roomPlayerCreate, {
      method: "POST",
      body: { room_id: Number(roomId), user_id: myId },
    });
  },

  async leaveRoom(roomId: string) {
    const myId = getMyId();
    const players = await request<BackendRoomPlayer[]>(
      ENDPOINTS.roomPlayerList(roomId),
    );
    const me = players.find((player) => player.user_id === myId);

    if (me) {
      await request(ENDPOINTS.roomPlayerDelete(me.id), { method: "DELETE" });
    }
  },

  // сохранить настройки (только создатель)
  async saveRoomSettings(room: RoomFull) {
    await request(ENDPOINTS.roomUpdate(room.id), {
      method: "PUT",
      body: {
        age: room.age,
        max_players: room.max_players,
        mafia_count: room.roles.mafia,
        doctor_count: room.roles.doctor,
        commissar_count: room.roles.commissar,
        day_time: room.day_time,
        night_time: room.night_time,
      },
    });
  },

  /* ---------- игра ---------- */

  async startGame(roomId: string): Promise<{ gameId: string }> {
    const game = await request<BackendGame>(ENDPOINTS.gameCreate, {
      method: "POST",
      body: { room_id: Number(roomId) },
    });
    return { gameId: String(game.id) };
  },

  // найти идущую игру в комнате (для тех, кто ждёт в лобби)
  async findGameForRoom(roomId: string): Promise<string | null> {
    const games = await request<BackendGame[]>(ENDPOINTS.gameList);
    const active = games
      .filter((game) => game.room_id === Number(roomId) && game.winner === null)
      .sort((a, b) => b.id - a.id)[0];

    return active ? String(active.id) : null;
  },

  async getGame(gameId: string): Promise<GameState> {
    const game = await request<BackendGame>(ENDPOINTS.gameDetail(gameId));

    const [players, rounds, room] = await Promise.all([
      request<BackendGamePlayer[]>(ENDPOINTS.gamePlayers(gameId)),
      request<BackendRoundShort[]>(ENDPOINTS.gameRounds(gameId)),
      request<BackendRoom>(ENDPOINTS.roomDetail(String(game.room_id))),
    ]);

    const names = await Promise.all(
      players.map((player) => getUsername(player.user_id)),
    );

    // текущий раунд — нужен его id, чтобы отправлять действия
    const currentRound =
      rounds.find((round) => round.round_number === game.current_round) ?? null;

    // последний раунд — чтобы показать «кого убили»
    const latest = [...rounds].sort(
      (a, b) => b.round_number - a.round_number,
    )[0];
    let lastRound: RoundResult | null = null;
    if (latest) {
      lastRound = toRoundResult(
        await request<BackendRoundDetail>(ENDPOINTS.gameRoundDetail(latest.id)),
      );
    }

    return {
      id: String(game.id),
      roomId: String(game.room_id),
      ownerUserId: room.owner_id,
      round: game.current_round,
      roundId: currentRound?.id ?? null,
      phase: game.current_phase ?? "NIGHT",
      phaseEndsAt: parseServerDate(game.phase_ends_at),
      winner: game.winner,
      players: players.map((player, index) => ({
        id: player.id,
        userId: player.user_id,
        username: names[index],
        role: player.role,
        isAlive: player.is_alive,
      })),
      lastRound,
      dayTime: room.day_time ?? DEFAULT_TIMES.day,
      nightTime: room.night_time ?? DEFAULT_TIMES.night,
    };
  },

  /*
    Ночное действие: мафия убивает (KILL), доктор лечит (HEAL), комиссар проверяет (CHECK).
    actor_id и target_id — id игрока в игре (game_player.id).
    Для CHECK backend возвращает is_mafia — результат проверки.
  */
  async nightAction(
    roundId: number,
    actorId: number,
    targetId: number,
    type: "KILL" | "HEAL" | "CHECK",
  ): Promise<{ isMafia: boolean | null }> {
    const action = await request<BackendNightAction>(ENDPOINTS.nightAction, {
      method: "POST",
      body: {
        round_id: roundId,
        actor_id: actorId,
        target_id: targetId,
        action_type: type,
      },
    });
    return { isMafia: action?.is_mafia ?? null };
  },

  vote(roundId: number, voterId: number, targetId: number) {
    return request(ENDPOINTS.vote, {
      method: "POST",
      body: { round_id: roundId, voter_id: voterId, target_id: targetId },
    });
  },

  /*
    Смена фаз. Фазы переключает браузер СОЗДАТЕЛЯ комнаты,
    когда кончается время (phase_ends_at).
  */
  nextPhase(gameId: string, phase: GamePhase) {
    const path =
      phase === "NIGHT"
        ? ENDPOINTS.endNight(gameId)
        : phase === "DAY"
          ? ENDPOINTS.startVoting(gameId)
          : ENDPOINTS.endVoting(gameId);
    return request(path, { method: "POST" });
  },
};

/*
  Пробуем получить данные с сервера.
  Если сервер не ответил — возвращаем демо-данные.
*/
export async function loadOrDemo<T>(
  load: () => Promise<T>,
  demo: T,
): Promise<T> {
  try {
    return await load();
  } catch (error) {
    console.warn("[API не ответил → показываю демо]", error);
    return demo;
  }
}

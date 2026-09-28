import { getRefreshToken, getToken, getUser, saveTokens } from "./auth";
import { countRoles, DEFAULT_TIMES } from "./roles";

const API_URL = "/backend";
const REQUEST_TIMEOUT_MS = 15000;
const SERVER_DOWN_TEXT =
  "Backend не отвечает или упал. Проверьте, что сервер запущен (адрес — BACKEND_URL в .env.local).";

const ENDPOINTS = {
  register: "/auth/register",
  login: "/auth/login",
  logout: "/auth/logout",
  refresh: "/auth/access_generate",
  googleLogin: "/auth/google/login",
  googleCallback: (code: string) =>
    `/auth/google/callback?code=${encodeURIComponent(code)}`,

  userList: "/user/list",
  userDetail: (userId: number) => `/user/detail?user_id=${userId}`,
  userUpdate: (userId: number) => `/user/update?user_id=${userId}`,
  statistic: (userId: number) => `/statistic/${userId}`,

  roomList: "/room/list",
  roomCreate: "/room/create",
  roomDetail: (roomId: string) => `/room/detail?room_id=${roomId}`,
  roomUpdate: (roomId: string) => `/room/update/${roomId}`,
  roomDelete: (roomId: string) => `/room/delete/${roomId}`,

  roomPlayerList: (roomId?: string) =>
    roomId ? `/room-player/list?room_id=${roomId}` : "/room-player/list",
  roomPlayerCreate: "/room-player/create",
  roomPlayerDelete: (roomPlayerId: number) =>
    `/room-player/delete/${roomPlayerId}`,

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
  gameDelete: (gameId: string) => `/game/delete/${gameId}`,
  gameUpdate: (gameId: string) => `/game/update/${gameId}`,
  voteList: (roundId: number) => `/vote/list?round_id=${roundId}`,
  nightAction: "/night-action/create",
  vote: "/vote/create",
  nightActionList: (roundId: number) => `/night-action/list?round_id=${roundId}`,
};

export type User = {
  id?: number;
  username: string;
  email?: string;
  age?: number;
  profile_image?: string | null;
  games_played?: number;
  wins?: number;
  guest?: boolean;
};

export type RoleKey = "mafia" | "doctor" | "commissar" | "civilian";

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
  age: number;
  status: "waiting" | "playing";
};

export type RoomPlayer = {
  username: string;
  ready?: boolean;
};

export type RoomFull = {
  id: string;
  name: string;
  owner: string;
  ownerId: number | null;
  age: number;
  max_players: number;
  day_time: number;
  night_time: number;
  roles: RoleCounts;
  status: "waiting" | "playing" | "finished";
  players: RoomPlayer[];
  readySupported: boolean;
};

export type GamePhase = "NIGHT" | "DAY" | "VOTING";
export type GameWinner = "MAFIA" | "CITIZENS";

export type GamePlayer = {
  id: number;
  userId: number;
  username: string;
  role: RoleKey | null;
  isAlive: boolean;
};

export type RoundResult = {
  roundNumber: number;
  killedPlayerId: number | null;
  savedByDoctor: boolean;
  savedPlayerId: number | null;
  eliminatedPlayerId: number | null;
};

export type NightActionInfo = {
  type: "KILL" | "HEAL" | "CHECK";
  actorId: number;
  targetId: number;
  at: number;
};

export type VoteInfo = { voterId: number; targetId: number };

export type GameState = {
  id: string;
  roomId: string;
  ownerUserId: number;
  round: number;
  roundId: number | null;
  phase: GamePhase;
  phaseEndsAt: number | null;
  winner: GameWinner | null;
  players: GamePlayer[];
  lastRound: RoundResult | null;
  nightActions: NightActionInfo[];
  previousNightActions: NightActionInfo[];
  votes: VoteInfo[];
  mafiaCount: number;
  dayTime: number;
  nightTime: number;
};

export type GameResult = {
  room: string;
  result: "win" | "lose";
  role: RoleKey;
  ago: string;
};

export type MyGame = {
  gameId: number;
  room: string;
  role: RoleKey;
  won: boolean;
  survived: boolean;
  finishedAt: number;
  durationSec: number;
};

export type RoleStats = { played: number; wins: number };

export type PublicUser = { id: number; username: string; profileImage: string | null };

export type MyStats = {
  games: number;
  wins: number;
  losses: number;
  winrate: number;
  survived: number;
  avgMinutes: number;
  favoriteRole: RoleKey | null;
  byRole: Record<RoleKey, RoleStats>;
};

export type OnlineUser = {
  username: string;
  status: "playing" | "lobby";
};

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
type BackendUser = {
  id: number;
  username: string;
  email: string;
  age: number;
  profile_image: string | null;
};
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

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function isServerDown(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 0 || error.status >= 500);
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: object;
};

const AUTH_PATHS = [ENDPOINTS.login, ENDPOINTS.register, ENDPOINTS.refresh, ENDPOINTS.logout];
export const SESSION_EXPIRED_EVENT = "mafia-session-expired";
const SESSION_EXPIRED_TEXT = "Сессия истекла. Войдите в аккаунт снова.";

let refreshing: Promise<boolean> | null = null;

function refreshOnce(): Promise<boolean> {
  if (!refreshing) {
    refreshing = refreshAccessToken().finally(() => {
      setTimeout(() => {
        refreshing = null;
      }, 0);
    });
  }
  return refreshing;
}

function tokenExpiresSoon(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
    return typeof payload.exp === "number" && payload.exp * 1000 - Date.now() < 30_000;
  } catch {
    return false;
  }
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
  isRetry = false,
): Promise<T> {
  const headers: Record<string, string> = {};
  const isAuthPath = AUTH_PATHS.some((authPath) => path.startsWith(authPath));

  const oldToken = getToken();
  if (oldToken && !isAuthPath && !isRetry && getRefreshToken() && tokenExpiresSoon(oldToken)) {
    await refreshOnce();
  }

  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (options.body) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(API_URL + path, {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new ApiError(SERVER_DOWN_TEXT, 0);
  }

  if (response.status === 401 && !isRetry && !isAuthPath && getRefreshToken()) {
    const refreshed = await refreshOnce();
    if (refreshed) return request<T>(path, options, true);
  }

  if (response.status === 401 && token && !isAuthPath) {
    if (typeof window !== "undefined") window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    throw new ApiError(SESSION_EXPIRED_TEXT, 401);
  }

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    if (response.status === 500 && typeof data === "string") {
      throw new ApiError(SERVER_DOWN_TEXT, 0);
    }
    throw new ApiError(getErrorText(data, response.status), response.status);
  }

  return data as T;
}

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

function parseServerDate(value: string | null | undefined): number | null {
  if (!value) return null;
  const hasZone = /Z$|[+-]\d{2}:?\d{2}$/.test(value);
  const ms = Date.parse(hasZone ? value : `${value}Z`);
  return Number.isFinite(ms) ? ms : null;
}

export type LoginResult = {
  accessToken: string | null;
  refreshToken: string | null;
  userId: number | null;
  username: string | null;
};

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

const usernameCache = new Map<number, string>();
const myGamesCache = new Map<string, MyGame | null>();

async function hadAnyMoves(gameId: number): Promise<boolean> {
  const rounds = await request<BackendRoundShort[]>(ENDPOINTS.gameRounds(String(gameId)));
  for (const round of rounds.slice(0, 5)) {
    const [actions, votes] = await Promise.all([
      request<unknown[]>(ENDPOINTS.nightActionList(round.id)).catch(() => []),
      request<unknown[]>(`/vote/list?round_id=${round.id}`).catch(() => []),
    ]);
    if (actions.length > 0 || votes.length > 0) return true;
  }
  return false;
}

function formatAgo(time: number): string {
  if (!time) return "";
  const minutes = Math.max(0, Math.round((Date.now() - time) / 60000));
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  return `${Math.round(hours / 24)} дн назад`;
}
let userListLoading: Promise<void> | null = null;

async function findUserIdByUsername(username: string): Promise<number | null> {
  try {
    const users = await request<BackendUserShort[]>(ENDPOINTS.userList);
    users.forEach((user) => usernameCache.set(user.id, user.username));
    const found = users.find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
    return found?.id ?? null;
  } catch {
    return null;
  }
}

function loadAllUsernames(): Promise<void> {
  if (!userListLoading) {
    userListLoading = request<BackendUserShort[]>(ENDPOINTS.userList)
      .then((users) => {
        users.forEach((user) => usernameCache.set(user.id, user.username));
      })
      .catch(() => {
        userListLoading = null;
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

function toRoomStatus(status: BackendRoom["status"]): RoomFull["status"] {
  if (status === "WAITING") return "waiting";
  if (status === "FINISHED") return "finished";
  return "playing";
}

function toRoundResult(round: BackendRoundDetail): RoundResult {
  return {
    roundNumber: round.round_number,
    killedPlayerId: round.killed_player_id,
    savedByDoctor: round.saved_by_doctor,
    savedPlayerId: null,
    eliminatedPlayerId: round.eliminated_player_id,
  };
}

export const api = {

  async register(
    username: string,
    email: string,
    age: number,
    password: string,
  ): Promise<LoginResult> {
    const data = await request<Record<string, unknown>>(ENDPOINTS.register, {
      method: "POST",
      body: {
        username,
        email,
        age,
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
    const result = readLoginResponse(data);

    if (result.userId === null && result.accessToken) {
      saveTokens(result.accessToken, result.refreshToken);
      result.userId = await findUserIdByUsername(username);
    }

    return result;
  },

  async logout() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return;
    await request(ENDPOINTS.logout, {
      method: "POST",
      body: { refresh_token: refreshToken },
    }).catch(() => {});
  },

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

  async finishGoogleLogin(code: string): Promise<LoginResult> {
    const data = await request<Record<string, unknown>>(
      ENDPOINTS.googleCallback(code),
    );
    const result = readLoginResponse(data);

    if (!result.username && result.userId !== null && result.accessToken) {
      saveTokens(result.accessToken, result.refreshToken);
      try {
        const user = await request<BackendUser>(
          ENDPOINTS.userDetail(result.userId),
        );
        result.username = user.username;
      } catch {
      }
    }
    return result;
  },

  async getMyGames(): Promise<MyGame[]> {
    return api.getUserGames(getMyId());
  },

  async getUserGames(userId: number): Promise<MyGame[]> {
    const myId = userId;
    const games = await request<BackendGame[]>(ENDPOINTS.gameList);
    const finished = games
      .filter((game) => game.winner !== null)
      .sort((a, b) => b.id - a.id)
      .slice(0, 40);

    const results = await Promise.all(
      finished.map(async (game): Promise<MyGame | null> => {
        const cacheKey = `${myId}:${game.id}`;
        if (myGamesCache.has(cacheKey)) return myGamesCache.get(cacheKey) ?? null;

        try {
          const players = await request<BackendGamePlayer[]>(ENDPOINTS.gamePlayers(String(game.id)));
          const me = players.find((player) => player.user_id === myId);
          if (!me || !me.role || !(await hadAnyMoves(game.id))) {
            myGamesCache.set(cacheKey, null);
            return null;
          }

          const [detail, roomName] = await Promise.all([
            request<BackendGame & { started_at?: string; finished_at?: string | null }>(
              ENDPOINTS.gameDetail(String(game.id)),
            ),
            request<BackendRoom>(ENDPOINTS.roomDetail(String(game.room_id)))
              .then((room) => room.room_name)
              .catch(() => `Комната #${game.room_id}`),
          ]);

          const startedAt = parseServerDate(detail.started_at) ?? 0;
          const finishedAt = parseServerDate(detail.finished_at) ?? startedAt;
          const isMafia = me.role === "mafia";
          const result: MyGame = {
            gameId: game.id,
            room: roomName,
            role: me.role,
            won: (game.winner === "MAFIA") === isMafia,
            survived: me.is_alive,
            finishedAt,
            durationSec: startedAt && finishedAt ? Math.max(0, Math.round((finishedAt - startedAt) / 1000)) : 0,
          };
          myGamesCache.set(cacheKey, result);
          return result;
        } catch {
          return null;
        }
      }),
    );

    return results.filter((game): game is MyGame => game !== null);
  },

  async getMyStats(): Promise<MyStats> {
    return api.getUserStats(getMyId());
  },

  async getUserStats(userId: number): Promise<MyStats> {
    const games = await api.getUserGames(userId);
    const byRole: Record<RoleKey, RoleStats> = {
      mafia: { played: 0, wins: 0 },
      doctor: { played: 0, wins: 0 },
      commissar: { played: 0, wins: 0 },
      civilian: { played: 0, wins: 0 },
    };

    for (const game of games) {
      byRole[game.role].played += 1;
      if (game.won) byRole[game.role].wins += 1;
    }

    const wins = games.filter((game) => game.won).length;
    const timed = games.filter((game) => game.durationSec > 0);
    const favorite = (Object.entries(byRole) as [RoleKey, RoleStats][])
      .filter(([, stats]) => stats.played > 0)
      .sort((a, b) => b[1].played - a[1].played)[0];

    return {
      games: games.length,
      wins,
      losses: games.length - wins,
      winrate: games.length ? Math.round((wins / games.length) * 100) : 0,
      survived: games.filter((game) => game.survived).length,
      avgMinutes: timed.length
        ? Math.round(timed.reduce((sum, game) => sum + game.durationSec, 0) / timed.length / 60)
        : 0,
      favoriteRole: favorite?.[0] ?? null,
      byRole,
    };
  },

  async getMe(): Promise<User> {
    const myId = getMyId();
    const user = await request<BackendUser>(ENDPOINTS.userDetail(myId));

    let gamesPlayed = 0;
    let wins = 0;
    try {
      const stats = await request<Record<string, number>>(
        ENDPOINTS.statistic(myId),
      );
      gamesPlayed = stats.games_played ?? stats.total_games ?? stats.games ?? 0;
      wins = stats.wins ?? stats.win_count ?? stats.total_wins ?? 0;
    } catch {
      gamesPlayed = 0;
    }

    try {
      const mine = await api.getMyStats();
      if (mine.games > gamesPlayed) {
        gamesPlayed = mine.games;
        wins = mine.wins;
      }
    } catch {
      gamesPlayed = Math.max(gamesPlayed, 0);
    }

    return {
      id: myId,
      username: user.username,
      email: user.email,
      age: user.age,
      profile_image: user.profile_image,
      games_played: gamesPlayed,
      wins,
    };
  },

  async updateProfile(changes: {
    username: string;
    email: string;
    password: string;
    profileImage: string | null;
  }) {
    const myId = getMyId();
    const me = getUser();

    await request(ENDPOINTS.userUpdate(myId), {
      method: "PUT",
      body: {
        username: changes.username,
        email: changes.email,
        password: changes.password,
        profile_image: changes.profileImage,
        age: me?.age ?? 0,
        role: "player",
      },
    });

    usernameCache.delete(myId);
  },

  async getPublicUser(userId: number): Promise<PublicUser> {
    const user = await request<BackendUser>(ENDPOINTS.userDetail(userId));
    usernameCache.set(userId, user.username);
    return { id: userId, username: user.username, profileImage: user.profile_image ?? null };
  },

  async searchUsers(query: string): Promise<PublicUser[]> {
    const text = query.trim().toLowerCase();
    if (!text) return [];
    const users = await request<(BackendUserShort & { profile_image?: string | null })[]>(ENDPOINTS.userList);
    return users
      .filter((user) => user.username.toLowerCase().includes(text))
      .slice(0, 10)
      .map((user) => ({ id: user.id, username: user.username, profileImage: user.profile_image ?? null }));
  },

  async getOnlineUsers(): Promise<OnlineUser[]> {
    return [];
  },

  async getHistory(userId?: number): Promise<GameResult[]> {
    const games = userId === undefined ? await api.getMyGames() : await api.getUserGames(userId);
    return games.map((game) => ({
      room: game.room,
      result: game.won ? "win" : "lose",
      role: game.role,
      ago: formatAgo(game.finishedAt),
    }));
  },

  async getRooms(): Promise<RoomShort[]> {
    const [rooms, roomPlayers] = await Promise.all([
      request<BackendRoom[]>(ENDPOINTS.roomList),
      request<BackendRoomPlayer[]>(ENDPOINTS.roomPlayerList()),
    ]);

    return rooms
      .map((room) => ({
        room,
        players: roomPlayers.filter((player) => player.room_id === room.id).length,
      }))
      .filter(({ room, players }) => room.status !== "FINISHED" && players > 0)
      .map(({ room, players }) => ({
        id: String(room.id),
        name: room.room_name,
        players,
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
      readySupported: false,
    };
  },

  async joinRoom(roomId: string) {
    const myId = getMyId();
    const players = await request<BackendRoomPlayer[]>(
      ENDPOINTS.roomPlayerList(roomId),
    );

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

  async endGame(gameId: string, roomId: string) {
    await request(ENDPOINTS.gameDelete(gameId), { method: "DELETE" }).catch(() => null);
    await api.closeRoom(roomId);
  },

  async closeRoom(roomId: string) {
    const players = await request<BackendRoomPlayer[]>(ENDPOINTS.roomPlayerList(roomId)).catch(
      () => [] as BackendRoomPlayer[],
    );
    await Promise.all(
      players.map((player) =>
        request(ENDPOINTS.roomPlayerDelete(player.id), { method: "DELETE" }).catch(() => null),
      ),
    );

    try {
      await request(ENDPOINTS.roomDelete(roomId), { method: "DELETE" });
    } catch {
      await request(ENDPOINTS.roomUpdate(roomId), { method: "PUT", body: { status: "FINISHED" } });
    }
  },

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

  async startGame(roomId: string): Promise<{ gameId: string }> {
    const game = await request<BackendGame>(ENDPOINTS.gameCreate, {
      method: "POST",
      body: { room_id: Number(roomId) },
    });
    return { gameId: String(game.id) };
  },

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

    type BackendNightActionFull = { actor_id: number; target_id: number; action_type: NightActionInfo["type"]; created_at: string };
    const loadNightActions = async (roundNumber: number): Promise<NightActionInfo[]> => {
      const round = rounds.find((item) => item.round_number === roundNumber);
      if (!round) return [];
      const actions = await request<BackendNightActionFull[]>(ENDPOINTS.nightActionList(round.id)).catch(() => []);
      return actions.map((action) => ({
        type: action.action_type,
        actorId: action.actor_id,
        targetId: action.target_id,
        at: parseServerDate(action.created_at) ?? Date.now(),
      }));
    };

    const isNight = game.current_phase === "NIGHT";
    const votingRound = game.current_phase === "VOTING" ? rounds.find((round) => round.round_number === game.current_round) : undefined;
    const [nightActions, previousNightActions, votes] = await Promise.all([
      isNight ? loadNightActions(game.current_round) : Promise.resolve([]),
      isNight ? loadNightActions(game.current_round - 1) : Promise.resolve([]),
      votingRound
        ? request<{ voter_id: number; target_id: number }[]>(ENDPOINTS.voteList(votingRound.id))
            .then((list) => list.map((vote) => ({ voterId: vote.voter_id, targetId: vote.target_id })))
            .catch(() => [])
        : Promise.resolve([]),
    ]);

    const currentRound =
      rounds.find((round) => round.round_number === game.current_round) ?? null;

    const resultRoundNumber = game.current_phase === "NIGHT" ? game.current_round - 1 : game.current_round;
    const latest =
      rounds.find((round) => round.round_number === resultRoundNumber) ??
      [...rounds].sort((a, b) => b.round_number - a.round_number)[0];
    let lastRound: RoundResult | null = null;
    if (latest) {
      lastRound = toRoundResult(
        await request<BackendRoundDetail>(ENDPOINTS.gameRoundDetail(latest.id)),
      );

      const nightIsOver = game.current_round > latest.round_number || game.current_phase !== "NIGHT";
      if (lastRound.killedPlayerId === null && nightIsOver) {
        const actions = await request<{ target_id: number; action_type: string }[]>(
          ENDPOINTS.nightActionList(latest.id),
        ).catch(() => []);
        const kills = actions.filter((action) => action.action_type === "KILL").map((action) => action.target_id);
        const saved = actions.find((action) => action.action_type === "HEAL" && kills.includes(action.target_id));
        if (saved) {
          lastRound.savedByDoctor = true;
          lastRound.savedPlayerId = saved.target_id;
        }
      }
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
      nightActions,
      previousNightActions,
      votes,
      mafiaCount: room.mafia_count,
      dayTime: room.day_time ?? DEFAULT_TIMES.day,
      nightTime: room.night_time ?? DEFAULT_TIMES.night,
    };
  },

  async nightAction(
    roundId: number,
    actorId: number,
    targetId: number,
    type: "KILL" | "HEAL" | "CHECK",
  ): Promise<{ isMafia: boolean | null }> {
    try {
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
    } catch (error) {
      if (!isServerDown(error)) throw error;
      const actions = await request<(BackendNightAction & { actor_id: number; action_type: string })[]>(
        ENDPOINTS.nightActionList(roundId),
      ).catch(() => []);
      const saved = actions.find((action) => action.actor_id === actorId && action.action_type === type);
      if (!saved) throw error;
      return { isMafia: saved.is_mafia ?? null };
    }
  },

  vote(roundId: number, voterId: number, targetId: number) {
    return request(ENDPOINTS.vote, {
      method: "POST",
      body: { round_id: roundId, voter_id: voterId, target_id: targetId },
    });
  },

  async finishIfMafiaWon(gameId: string, knownMafiaIds: number[] = []): Promise<boolean> {
    const game = await request<BackendGame>(ENDPOINTS.gameDetail(gameId));
    if (game.winner !== null) return false;
    const [players, rounds] = await Promise.all([
      request<BackendGamePlayer[]>(ENDPOINTS.gamePlayers(gameId)),
      request<BackendRoundShort[]>(ENDPOINTS.gameRounds(gameId)),
    ]);
    const mafia = new Set(knownMafiaIds);
    for (const player of players) if (player.role === "mafia") mafia.add(player.id);
    const actionLists = await Promise.all(
      rounds.map((round) =>
        request<{ actor_id: number; action_type: string }[]>(ENDPOINTS.nightActionList(round.id)).catch(() => []),
      ),
    );
    for (const action of actionLists.flat()) if (action.action_type === "KILL") mafia.add(action.actor_id);

    const alive = players.filter((player) => player.is_alive);
    const aliveMafia = alive.filter((player) => mafia.has(player.id)).length;
    if (aliveMafia === 0 || aliveMafia * 2 < alive.length) return false;

    await request(ENDPOINTS.gameUpdate(gameId), { method: "PUT", body: { winner: "MAFIA" } });
    return true;
  },

  async nextPhase(gameId: string, phase: GamePhase) {
    const path =
      phase === "NIGHT"
        ? ENDPOINTS.endNight(gameId)
        : phase === "DAY"
          ? ENDPOINTS.startVoting(gameId)
          : ENDPOINTS.endVoting(gameId);
    try {
      await request(path, { method: "POST" });
    } catch (error) {
      if (!isServerDown(error)) throw error;
      const game = await request<BackendGame>(ENDPOINTS.gameDetail(gameId)).catch(() => null);
      if (!game || (game.current_phase === phase && game.winner === null)) throw error;
    }
  },
};

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

import type { GameResult, OnlineUser, RoomFull, RoomShort } from "./api";
import { countRoles, DEFAULT_TIMES } from "./roles";

export const DEMO_ROOMS: RoomShort[] = [
  { id: "83491", name: "Ночная история", players: 6, max_players: 10, age: 16, status: "waiting" },
  { id: "51207", name: "Тёмный город", players: 8, max_players: 10, age: 18, status: "playing" },
  { id: "66012", name: "Банды", players: 5, max_players: 10, age: 12, status: "waiting" },
  { id: "90455", name: "Без правил", players: 9, max_players: 10, age: 18, status: "playing" },
];

export const DEMO_ONLINE: OnlineUser[] = [
  { username: "zxc_maks", status: "playing" },
  { username: "darkness", status: "lobby" },
  { username: "kyrgyz_boy", status: "lobby" },
  { username: "fox", status: "playing" },
  { username: "anime_lover", status: "lobby" },
];

export const DEMO_HISTORY: GameResult[] = [
  { room: "Ночная история", result: "win", role: "mafia", ago: "2 ч назад" },
  { room: "Тёмный город", result: "lose", role: "civilian", ago: "5 ч назад" },
  { room: "Банды", result: "win", role: "civilian", ago: "8 ч назад" },
  { room: "Без правил", result: "lose", role: "doctor", ago: "12 ч назад" },
];

export const DEMO_NAMES = ["asat", "darkness", "anime", "fox", "xx", "yy", "zz", "max"];

export function getDemoRoom(id: string, me: string): RoomFull {
  const short = DEMO_ROOMS.find((room) => room.id === id);
  const maxPlayers = short?.max_players ?? 10;

  const players = [
    { username: "asat", ready: true },
    { username: "darkness", ready: true },
    { username: "anime", ready: false },
    { username: "fox", ready: true },
    { username: "xx", ready: true },
  ];

  if (!players.some((player) => player.username === me)) {
    players.push({ username: me, ready: false });
  }

  return {
    id,
    name: short?.name ?? "Моя комната",
    owner: short ? "asat" : me,
    ownerId: null,
    age: short?.age ?? 16,
    max_players: maxPlayers,
    day_time: DEFAULT_TIMES.day,
    night_time: DEFAULT_TIMES.night,
    roles: countRoles(maxPlayers),
    status: "waiting",
    players,
    readySupported: true,
  };
}

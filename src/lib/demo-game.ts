import type { GamePlayer, GameState, GameWinner, RoleCounts, RoleKey } from "./api";
import { countRoles, DEFAULT_TIMES } from "./roles";
import { DEMO_NAMES } from "./demo";

export type DemoSetup = {
  roomId: string;
  players: string[];
  roles: RoleCounts;
  dayTime: number;
  nightTime: number;
};

export function saveDemoSetup(setup: DemoSetup) {
  sessionStorage.setItem("mafia_demo_game", JSON.stringify(setup));
}

function readDemoSetup(myName: string): DemoSetup {
  try {
    const saved = JSON.parse(sessionStorage.getItem("mafia_demo_game") ?? "null") as DemoSetup | null;
    if (saved) return saved;
  } catch {
  }

  const players = [myName, ...DEMO_NAMES.filter((name) => name !== myName)].slice(0, 8);
  return { roomId: "", players, roles: countRoles(8), dayTime: DEFAULT_TIMES.day, nightTime: DEFAULT_TIMES.night };
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function randomItem<T>(items: T[]): T | undefined {
  return items[Math.floor(Math.random() * items.length)];
}

export function createDemoGame(gameId: string, myName: string): GameState {
  const setup = readDemoSetup(myName);

  const roleList: RoleKey[] = [];
  for (let i = 0; i < setup.roles.mafia; i++) roleList.push("mafia");
  for (let i = 0; i < setup.roles.doctor; i++) roleList.push("doctor");
  for (let i = 0; i < setup.roles.commissar; i++) roleList.push("commissar");
  while (roleList.length < setup.players.length) roleList.push("civilian");

  const roles = shuffle(roleList);

  const players: GamePlayer[] = setup.players.map((username, index) => ({
    id: index + 1,
    userId: -(index + 1),
    username,
    role: roles[index],
    isAlive: true,
  }));

  return {
    id: gameId,
    roomId: setup.roomId,
    ownerUserId: 0,
    round: 1,
    roundId: 1,
    phase: "NIGHT",
    phaseEndsAt: null,
    winner: null,
    players,
    lastRound: null,
    nightActions: [],
    dayTime: setup.dayTime,
    nightTime: setup.nightTime,
  };
}

function findWinner(players: GamePlayer[]): GameWinner | null {
  const alive = players.filter((player) => player.isAlive);
  const mafia = alive.filter((player) => player.role === "mafia").length;
  const others = alive.length - mafia;

  if (mafia === 0) return "CITIZENS";
  if (mafia >= others) return "MAFIA";
  return null;
}

function kill(players: GamePlayer[], playerId: number | null): GamePlayer[] {
  return players.map((player) => (player.id === playerId ? { ...player, isAlive: false } : player));
}

export function advanceDemoGame(game: GameState, me: GamePlayer | undefined, myTarget: number | null): GameState {
  const alive = game.players.filter((player) => player.isAlive);
  const iCanAct = me?.isAlive && myTarget !== null;

  if (game.phase === "NIGHT") {
    const victims = alive.filter((player) => player.role !== "mafia");
    const mafiaTarget = iCanAct && me?.role === "mafia" ? myTarget : randomItem(victims)?.id ?? null;

    const doctorAlive = alive.some((player) => player.role === "doctor");
    const healTarget = !doctorAlive ? null : iCanAct && me?.role === "doctor" ? myTarget : randomItem(alive)?.id ?? null;

    const isSaved = mafiaTarget !== null && mafiaTarget === healTarget;
    const players = isSaved ? game.players : kill(game.players, mafiaTarget);

    return {
      ...game,
      players,
      phase: "DAY",
      winner: findWinner(players),
      nightActions: [],
      lastRound: { roundNumber: game.round, killedPlayerId: isSaved ? null : mafiaTarget, savedByDoctor: isSaved, savedPlayerId: isSaved ? mafiaTarget : null, eliminatedPlayerId: null },
    };
  }

  if (game.phase === "DAY") {
    return { ...game, phase: "VOTING" };
  }

  const target = iCanAct ? myTarget : randomItem(alive)?.id ?? null;
  const players = kill(game.players, target);

  return {
    ...game,
    players,
    phase: "NIGHT",
    phaseEndsAt: null,
    round: game.round + 1,
    roundId: game.round + 1,
    winner: findWinner(players),
    nightActions: [],
    lastRound: {
      roundNumber: game.round,
      killedPlayerId: game.lastRound?.killedPlayerId ?? null,
      savedByDoctor: game.lastRound?.savedByDoctor ?? false,
      savedPlayerId: game.lastRound?.savedPlayerId ?? null,
      eliminatedPlayerId: target,
    },
  };
}

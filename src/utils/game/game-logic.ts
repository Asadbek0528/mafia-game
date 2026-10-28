import type { GamePhase, GamePlayer, GameState, GameWinner, RoleKey } from "@/utils/api";
import { DEFAULT_TIMES, NIGHT_TURN_SECONDS, NIGHT_TURNS } from "@/utils/roles";
import type { SoundName } from "@/utils/sound";

import type { GameConnection, GameEffect, NightRoles, NightTurnItem, NightTurnState, RevealedRoles, Team, TurnInfo } from "./types";

export const PHASE_TRANSITION_MS = 3200;
export const VOTING_RESULT_MS = 4000;
export const EFFECT_DURATION_MS = 4200;
export const CHAT_MAX_LENGTH = 200;

export const PHASE_SOUND: Record<GamePhase, SoundName> = { NIGHT: "night", DAY: "morning", VOTING: "gavel" };
export const EFFECT_SOUND: Partial<Record<GameEffect["kind"], SoundName>> = { blood: "kill", heal: "heal", shield: "shield", mafia: "kill", clean: "heal" };

export const NIGHT_ACTION: Partial<Record<RoleKey, "KILL" | "HEAL" | "CHECK">> = {
  mafia: "KILL",
  doctor: "HEAL",
  commissar: "CHECK",
};

export const TEAM_ROLES: RoleKey[] = ["mafia", "doctor", "commissar"];
export const ROLE_KEYS: RoleKey[] = ["mafia", "doctor", "commissar", "civilian"];

export const PHASE_TITLE: Record<GamePhase, string> = { NIGHT: "Ночь", DAY: "День", VOTING: "Голосование" };
export const PHASE_UNTIL: Record<GamePhase, string> = { NIGHT: "До утра", DAY: "До голосования", VOTING: "До ночи" };
export const PHASE_STEP_INDEX: Record<GamePhase, number> = { NIGHT: 0, DAY: 1, VOTING: 2 };

export const PHASE_TRANSITION_TEXT: Record<GamePhase, { title: string; subtitle: string }> = {
  NIGHT: { title: "Ночь", subtitle: "Город засыпает. Просыпается мафия…" },
  DAY: { title: "День", subtitle: "Город просыпается" },
  VOTING: { title: "Голосование", subtitle: "Решите, кого выгнать из города" },
};

export const CONNECTION_TEXT: Record<GameConnection, string> = {
  live: "Онлайн",
  slow: "Слабая связь",
  offline: "Нет связи",
  demo: "Демо",
};

export const CONNECTION_TITLE: Record<GameConnection, string> = {
  live: "Связь с сервером есть",
  slow: "Нет связи с сервером чата: игра обновляется раз в пару секунд, чат недоступен",
  offline: "Сервер не отвечает. Переподключаемся…",
  demo: "Игра с ботами без сервера",
};

const NIGHT_ROLE_HINT: Record<RoleKey, string> = {
  mafia: "Вы мафия — выберите жертву.",
  doctor: "Вы доктор — выберите, кого лечить.",
  commissar: "Вы комиссар — выберите, кого проверить.",
  civilian: "Вы житель — ждите утра.",
};

export type PhaseIconName = "night" | "day" | "voting";

export function phaseIcon(phase: GamePhase): PhaseIconName {
  if (phase === "NIGHT") return "night";
  if (phase === "DAY") return "day";
  return "voting";
}

export function getPhaseSteps(round: number): { icon: PhaseIconName; label: string }[] {
  return [
    { icon: "night", label: `Ночь ${round}` },
    { icon: "day", label: `День ${round}` },
    { icon: "voting", label: "Голосование" },
    { icon: "night", label: `Ночь ${round + 1}` },
  ];
}

export function stepClassName(index: number, activeStep: number): string {
  if (index === activeStep) return "game-header-step game-header-step-active";
  if (index < activeStep) return "game-header-step game-header-step-done";
  return "game-header-step";
}

export function phaseProgress(secondsLeft: number, duration: number): number {
  return duration > 0 ? Math.min(1, Math.max(0, 1 - secondsLeft / duration)) : 0;
}

export function getPhaseDuration(game: GameState): number {
  if (game.phase === "NIGHT") return game.nightTime;
  if (game.phase === "DAY") return game.dayTime;
  return DEFAULT_TIMES.voting;
}

export function getPhaseEnd(game: GameState): number {
  const duration = getPhaseDuration(game) * 1000;
  const serverEnd = game.phaseEndsAt;
  if (serverEnd !== null && serverEnd - Date.now() <= duration + 5000 && serverEnd - Date.now() > -60_000) {
    return serverEnd;
  }
  return Date.now() + duration;
}

const firstSeenAction = new Map<string, number>();

export function getNightTurn(game: GameState, phaseEnd: number, now: number, myRole: RoleKey | null, nightRoles: NightRoles | null): NightTurnState {
  const nightMs = game.nightTime * 1000;
  const nightStart = phaseEnd - nightMs;
  const hasHiddenRoles = game.players.some((player) => player.isAlive && player.role === null);

  const presence = NIGHT_TURNS.map((turn) => {
    const knownAlive = game.players.some((player) => player.isAlive && player.role === turn.role);
    return knownAlive || (nightRoles?.[turn.role] ?? hasHiddenRoles);
  });
  const presentCount = Math.max(1, presence.filter(Boolean).length);
  const turnMs = Math.min(NIGHT_TURN_SECONDS * 1000, Math.floor(nightMs / presentCount));

  let cursor = nightStart;
  const turns: TurnInfo[] = NIGHT_TURNS.map((turn, index) => {
    const present = presence[index];
    const type = NIGHT_ACTION[turn.role];
    let first: GameState["nightActions"][number] | undefined;
    for (const action of game.nightActions) {
      if (action.type === type && (!first || action.at < first.at)) first = action;
    }
    let turnEnd = present ? cursor + turnMs : cursor;
    if (present && first) {
      const key = `${game.id}-${game.round}-${type}`;
      if (!firstSeenAction.has(key)) firstSeenAction.set(key, now);
      const doneAt = Math.min(firstSeenAction.get(key) ?? now, Math.max(first.at, cursor));
      turnEnd = Math.min(turnEnd, Math.max(cursor, doneAt));
    }
    const info = { role: turn.role, start: cursor, end: turnEnd, done: Boolean(first), present };
    cursor = turnEnd;
    return info;
  });

  const index = game.phase === "NIGHT" ? turns.findIndex((turn) => now >= turn.start && now < turn.end) : -1;
  const activeIndex = index >= 0 ? index : null;
  const secondsInTurn = activeIndex === null ? 0 : Math.max(0, Math.ceil((turns[activeIndex].end - now) / 1000));
  const found = myRole ? NIGHT_TURNS.findIndex((turn) => turn.role === myRole) : -1;
  return { turns, activeIndex, secondsInTurn, myIndex: found >= 0 ? found : null, allDone: now >= cursor, turnsEnd: cursor };
}

export function getNightTurnItems(night: NightTurnState): NightTurnItem[] {
  return NIGHT_TURNS.map((turn, index) => {
    const info = night.turns[index];
    const isActive = night.activeIndex === index;
    let className = "game-page-turn";
    if (isActive) className += " game-page-turn-active";
    else if (info && (info.done || !info.present || night.activeIndex === null || index < night.activeIndex)) className += " game-page-turn-done";
    return { role: turn.role, title: turn.title, className, isActive, isDone: Boolean(info?.done) };
  });
}

export function phaseStartEffect(game: GameState, me: GamePlayer | undefined): GameEffect | null {
  const last = game.lastRound;
  const nameOf = (id: number | null) => game.players.find((player) => player.id === id)?.username ?? "";
  const key = `${game.round}-${game.phase}`;

  if (game.phase !== "DAY" || !last) return null;

  if (last.savedPlayerId !== null && last.savedPlayerId === me?.id) {
    return { key, kind: "heal", title: "Доктор спас вас!", text: "Этой ночью мафия пришла за вами, но доктор успел." };
  }
  if (last.savedPlayerId !== null && me?.role === "doctor") {
    return { key, kind: "heal", title: "Вы спасли жизнь!", text: `${nameOf(last.savedPlayerId)} выжил благодаря вам.` };
  }
  if (last.savedByDoctor) {
    return { key, kind: "heal", title: "Доктор спас жертву", text: "Этой ночью никто не погиб." };
  }
  const shieldedId = last.shieldedPlayerId ?? null;
  if (shieldedId !== null && shieldedId === me?.id) {
    return { key, kind: "shield", title: "Щит сработал!", text: "Ночью мафия пришла за вами — щит отразил удар. Вы живы." };
  }
  if (shieldedId !== null && me?.role === "mafia") {
    return { key, kind: "shield", title: "Удар отражён", text: `${nameOf(shieldedId)} был под защитой щита.` };
  }
  if (shieldedId !== null) {
    return { key, kind: "shield", title: "Этой ночью никто не погиб", text: "Чей-то щит отразил удар мафии." };
  }
  if (last.killedPlayerId !== null && last.killedPlayerId === me?.id) {
    return { key, kind: "blood", title: "Вас убили этой ночью", text: "Теперь вы наблюдатель: видите все роли и пишете в чат погибших." };
  }
  if (last.killedPlayerId !== null) {
    return { key, kind: "blood", title: `Ночью убит ${nameOf(last.killedPlayerId)}`, text: "Мафия нанесла удар. Найдите убийцу." };
  }
  return null;
}

export function narrate(game: GameState, me: GamePlayer | undefined): string {
  const nameOf = (id: number | null) => game.players.find((player) => player.id === id)?.username ?? "игрок";
  const last = game.lastRound;

  if (game.phase === "NIGHT") {
    const role = me && !me.isAlive ? "Вы наблюдаете." : me?.role ? NIGHT_ROLE_HINT[me.role] : "";
    return `🌙 Ночь ${game.round}. ${role}`.trim();
  }
  if (game.phase === "DAY") {
    let night = "Никто не погиб.";
    if (last?.savedByDoctor) night = "Доктор спас жертву.";
    else if (last?.killedPlayerId) night = `Убит ${nameOf(last.killedPlayerId)}.`;
    return `☀️ День ${game.round}. ${night}`;
  }
  return "Голосование: кого выгнать?";
}

export function readMemory<T>(gameId: string, key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(`mafia_${key}_${gameId}`);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeMemory(gameId: string, key: string, value: unknown) {
  try {
    localStorage.setItem(`mafia_${key}_${gameId}`, JSON.stringify(value));
  } catch {}
}

export function withTeam(game: GameState | null, team: Team | null, revealed: RevealedRoles): GameState | null {
  if (!game) return game;
  return {
    ...game,
    players: game.players.map((player) => {
      if (player.role !== null) return player;
      if (team?.ids.includes(player.id)) return { ...player, role: team.role };
      return revealed[player.id] ? { ...player, role: revealed[player.id] } : player;
    }),
  };
}

export function getDeathLabel(game: GameState, player: GamePlayer): string {
  let reason = player.eliminatedReason ?? null;
  let round = player.eliminatedRound ?? null;
  const last = game.lastRound;
  if (reason === null && last?.killedPlayerId === player.id) {
    reason = "NIGHT_KILL";
    round = last.roundNumber;
  }
  if (reason === null && last?.eliminatedPlayerId === player.id) {
    reason = "VOTE";
    round = last.roundNumber;
  }
  if (reason === "NIGHT_KILL") return round ? `Убит (Ночь ${round})` : "Убит ночью";
  if (reason === "VOTE") return round ? `Изгнан (День ${round})` : "Изгнан";
  return "Выбыл";
}

export function findMe(game: GameState, userId: number | undefined, username: string | undefined): GamePlayer | undefined {
  return game.players.find((player) => (userId !== undefined && player.userId === userId) || player.username === username);
}

export function knownMafiaIds(game: GameState | null): number[] {
  return (game?.players ?? []).filter((player) => player.role === "mafia").map((player) => player.id);
}

export function confirmTextFor(role: RoleKey): string {
  if (role === "mafia") return "Убить";
  if (role === "doctor") return "Вылечить";
  return "Проверить";
}

export function getGameOverReason(winner: GameWinner, players: GamePlayer[], mafiaCount: number): string {
  if (winner !== "MAFIA") return "Вся мафия выбыла из игры — город очищен.";

  const alive = players.filter((player) => player.isAlive);
  const knownMafia = alive.filter((player) => player.role === "mafia").length;
  const mafia = knownMafia > 0 ? knownMafia : Math.min(mafiaCount, alive.length);
  const town = alive.length - mafia;
  if (mafia > 0 && town >= 0 && mafia >= town) {
    return `В живых осталось: мафия — ${mafia}, мирные — ${town}. Когда мафии столько же, сколько мирных, город уже не может выгнать её голосованием, поэтому по правилам побеждает мафия.`;
  }
  return "Мафия добилась своего: мирных жителей осталось слишком мало.";
}

export function getMyGameResult(winner: GameWinner, myRole: RoleKey | null): string {
  if (!myRole) return "";
  return (winner === "MAFIA") === (myRole === "mafia") ? "Вы победили!" : "Вы проиграли.";
}

export function seatPosition(index: number, total: number) {
  const angle = -Math.PI / 2 + (index / Math.max(1, total)) * Math.PI * 2;
  return { x: 50 + Math.cos(angle) * 41, y: 50 + Math.sin(angle) * 38 };
}

type Point = { x: number; y: number };

function shorten(a: Point, b: Point, by: number): Point {
  const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: a.x + ((b.x - a.x) / length) * by, y: a.y + ((b.y - a.y) / length) * by };
}

export function arrowPath(from: Point, to: Point) {
  const start = shorten(from, to, 7);
  const end = shorten(to, from, 8);
  const control = { x: (start.x + end.x) / 2 + (50 - (start.x + end.x) / 2) * 0.35, y: (start.y + end.y) / 2 + (50 - (start.y + end.y) / 2) * 0.35 };
  return `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
}

export function sameGame(a: GameState | null, b: GameState): boolean {
  return a !== null && JSON.stringify(a) === JSON.stringify(b);
}

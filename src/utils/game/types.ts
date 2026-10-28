import type { GamePhase, GamePlayer, RoleKey } from "@/utils/api";

export type ChatMessage = {
  id: string;
  name: string;
  text: string;
  time: number;
  scope: "all" | "mafia" | "dead";
  lastWord?: boolean;
};

export type GameEffect = {
  key: string;
  kind: "blood" | "heal" | "mafia" | "clean" | "info" | "shield";
  title: string;
  text?: string;
};

export type CheckRevealInfo = {
  key: string;
  name: string;
  isMafia: boolean;
};

export type PhaseTransitionInfo = {
  key: string;
  phase: GamePhase;
  round: number;
};

export type VotingEndInfo =
  | { kind: "countdown"; seconds: number }
  | { kind: "counting" }
  | { kind: "result"; key: string; name: string; votes: number | null; isMe: boolean }
  | { kind: "tie"; key: string };

export type GameConnection = "live" | "slow" | "offline" | "demo";

export type PlayerMark = { text: string; tone: "mafia" | "town" };

export type TargetPickerData = {
  title?: string;
  subtitle?: string;
  players: GamePlayer[];
  selectableIds: number[];
  selectedId: number | null;
  meId: number | null;
  isSent: boolean;
  isUrgent?: boolean;
  confirmText?: string;
  showRole: (player: GamePlayer) => boolean;
  deathLabel: (player: GamePlayer) => string;
  onSelect: (playerId: number) => void;
  onConfirm?: () => void;
  voteCounts?: Record<number, number>;
  votedIds?: number[];
  skippedIds?: number[];
  voteLines?: { voter: string; target: string | null }[];
  marks?: Record<number, PlayerMark>;
  sentText?: string;
  onSkip?: () => void;
  voteArrows?: { from: number; to: number }[];
};

export type TurnInfo = {
  role: RoleKey;
  start: number;
  end: number;
  done: boolean;
  present: boolean;
};

export type NightTurnState = {
  turns: TurnInfo[];
  activeIndex: number | null;
  secondsInTurn: number;
  myIndex: number | null;
  allDone: boolean;
  turnsEnd: number;
};

export type NightTurnItem = {
  role: RoleKey;
  title: string;
  className: string;
  isActive: boolean;
  isDone: boolean;
};

export type NightRoles = Partial<Record<RoleKey, boolean>>;

export type Team = { role: RoleKey; ids: number[] };

export type RevealedRoles = Record<number, RoleKey>;

export type SkipInfo = { voterId: number; round: number };

"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { showToast } from "@/components/pages/widgets/toast/Toast";
import { api, type GamePlayer, type GameState, type NightActionInfo, type RoleKey, type VoteInfo } from "@/lib/api";
import { rememberPageAfterLogin, useCurrentUser } from "@/lib/auth";
import { advanceDemoGame, createDemoGame } from "@/lib/demo-game";
import { DEFAULT_TIMES, getRole, NIGHT_TURN_SECONDS, NIGHT_TURNS } from "@/lib/roles";
import { useLiveUpdates, WS_PATHS } from "@/lib/socket";

import DeadBanner from "./dead-banner/DeadBanner";
import EffectOverlay, { type GameEffect } from "./effect-overlay/EffectOverlay";
import GameHeader from "./game-header/GameHeader";
import GameChat, { type ChatMessage } from "./game-chat/GameChat";
import GameOver from "./game-over/GameOver";
import GameTopBar, { type GameConnection } from "./game-topbar/GameTopBar";
import PhaseTransition, { PHASE_TRANSITION_MS, type PhaseTransitionInfo } from "./phase-transition/PhaseTransition";
import RoleReveal from "./role-reveal/RoleReveal";
import TargetPicker from "./target-picker/TargetPicker";
import VotingEnd, { VOTING_RESULT_MS, type VotingEndInfo } from "./voting-end/VotingEnd";
import "./game-page.scss";

const REFRESH_EVERY_MS = 2000;
const REFRESH_LIVE_MS = 10000;
const RETRY_PHASE_MS = 3000;
const OWNER_GRACE_S = 5;
const BACKUP_DELAY_S = 9;
const BACKUP_STEP_S = 3;
const NIGHT_END_GRACE_MS = 2000;
const LAST_WORD_S = 30;

const NIGHT_ACTION: Partial<Record<RoleKey, "KILL" | "HEAL" | "CHECK">> = {
  mafia: "KILL",
  doctor: "HEAL",
  commissar: "CHECK",
};

function getPhaseDuration(game: GameState): number {
  if (game.phase === "NIGHT") return game.nightTime;
  if (game.phase === "DAY") return game.dayTime;
  return DEFAULT_TIMES.voting;
}

function getPhaseEnd(game: GameState): number {
  const duration = getPhaseDuration(game) * 1000;
  const serverEnd = game.phaseEndsAt;
  if (serverEnd !== null && serverEnd - Date.now() <= duration + 5000 && serverEnd - Date.now() > -60_000) {
    return serverEnd;
  }
  return Date.now() + duration;
}

function isGameOver_(game: GameState): boolean {
  return game.winner !== null;
}

type TurnInfo = {
  role: RoleKey;
  start: number;
  end: number;
  done: boolean;
  present: boolean;
};

type NightTurnState = {
  turns: TurnInfo[];
  activeIndex: number | null;
  secondsInTurn: number;
  myIndex: number | null;
  allDone: boolean;
  turnsEnd: number;
};

type NightRoles = Partial<Record<RoleKey, boolean>>;

const TEAM_ROLES: RoleKey[] = ["mafia", "doctor", "commissar"];

function getNightTurn(game: GameState, phaseEnd: number, now: number, myRole: RoleKey | null, nightRoles: NightRoles | null): NightTurnState {
  const turnMs = NIGHT_TURN_SECONDS * 1000;
  const nightStart = phaseEnd - game.nightTime * 1000;
  const hasHiddenRoles = game.players.some((player) => player.isAlive && player.role === null);

  let cursor = nightStart;
  const turns: TurnInfo[] = NIGHT_TURNS.map((turn) => {
    const knownAlive = game.players.some((player) => player.isAlive && player.role === turn.role);
    const present = knownAlive || (nightRoles?.[turn.role] ?? hasHiddenRoles);
    const type = NIGHT_ACTION[turn.role];
    const first = game.nightActions.filter((action) => action.type === type).sort((a, b) => a.at - b.at)[0];
    let turnEnd = present ? cursor + turnMs : cursor;
    if (present && first) turnEnd = Math.min(turnEnd, Math.max(cursor, first.at));
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

function phaseStartEffect(game: GameState, me: GamePlayer | undefined): GameEffect | null {
  const last = game.lastRound;
  const nameOf = (id: number | null) => game.players.find((player) => player.id === id)?.username ?? "";
  const key = `${game.round}-${game.phase}`;

  if (game.phase === "DAY" && last) {
    if (last.savedPlayerId !== null && last.savedPlayerId === me?.id) {
      return { key, kind: "heal", title: "Доктор спас вас!", text: "Этой ночью мафия пришла за вами, но доктор успел." };
    }
    if (last.savedPlayerId !== null && me?.role === "doctor") {
      return { key, kind: "heal", title: "Вы спасли жизнь!", text: `${nameOf(last.savedPlayerId)} выжил благодаря вам.` };
    }
    if (last.savedByDoctor) {
      return { key, kind: "heal", title: "Доктор спас жертву", text: "Этой ночью никто не погиб." };
    }
    if (last.killedPlayerId !== null && last.killedPlayerId === me?.id) {
      return { key, kind: "blood", title: "Вас убили этой ночью", text: "Теперь вы наблюдатель: видите все роли и пишете в чат погибших." };
    }
    if (last.killedPlayerId !== null) {
      return { key, kind: "blood", title: `Ночью убит ${nameOf(last.killedPlayerId)}`, text: "Мафия нанесла удар. Найдите убийцу." };
    }
  }

  return null;
}

function NightTurns({ night }: { night: NightTurnState }) {
  return (
    <ol className="game-page-turns" aria-label="Очередь ночных ходов">
      {NIGHT_TURNS.map((turn, index) => {
        const info = night.turns[index];
        const isActive = night.activeIndex === index;
        let className = "game-page-turn";
        if (isActive) className += " game-page-turn-active";
        else if (info && (info.done || !info.present || night.activeIndex === null || index < night.activeIndex)) className += " game-page-turn-done";
        return (
          <li key={turn.role} className={className}>
            {turn.title}
            {isActive && <b>{night.secondsInTurn}</b>}
            {!isActive && info?.done && <i>✓</i>}
          </li>
        );
      })}
      <li className={night.allDone ? "game-page-turn game-page-turn-active" : "game-page-turn"}>Сон</li>
    </ol>
  );
}

const NIGHT_ROLE_HINT: Record<RoleKey, string> = {
  mafia: "Вы мафия — выберите жертву.",
  doctor: "Вы доктор — выберите, кого лечить.",
  commissar: "Вы комиссар — выберите, кого проверить.",
  civilian: "Вы житель — ждите утра.",
};

function formatSeconds(total: number): string {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes === 0) return `${seconds} сек`;
  if (seconds === 0) return `${minutes} мин`;
  return `${minutes} мин ${seconds} сек`;
}

function narrate(game: GameState, me: GamePlayer | undefined): string {
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

type Team = { role: RoleKey; ids: number[] };

type RevealedRoles = Record<number, RoleKey>;

const ROLE_KEYS: RoleKey[] = ["mafia", "doctor", "commissar", "civilian"];

function withTeam(game: GameState | null, team: Team | null, revealed: RevealedRoles): GameState | null {
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

function getDeathLabel(game: GameState, player: GamePlayer): string {
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

function findMe(game: GameState, userId: number | undefined, username: string | undefined): GamePlayer | undefined {
  return game.players.find((player) => (userId !== undefined && player.userId === userId) || player.username === username);
}


export default function GamePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const gameId = params.id;
  const isDemo = gameId.startsWith("demo");

  const { user, isLoaded } = useCurrentUser();

  const [rawGame, setGame] = useState<GameState | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [revealed, setRevealed] = useState<RevealedRoles>({});
  const game = useMemo(() => withTeam(rawGame, team, revealed), [rawGame, team, revealed]);
  const [loadError, setLoadError] = useState("");
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isSent, setIsSent] = useState(false);
  const [checkResult, setCheckResult] = useState("");
  const [transition, setTransition] = useState<PhaseTransitionInfo | null>(null);
  const clearTransition = useCallback(() => setTransition(null), []);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [effect, setEffect] = useState<GameEffect | null>(null);
  const [hostLine, setHostLine] = useState("");
  const [votingResult, setVotingResult] = useState<VotingEndInfo | null>(null);
  const lastVotes = useRef<{ round: number; votes: VoteInfo[] }>({ round: 0, votes: [] });
  const handleConfirmRef = useRef<(() => void) | null>(null);
  const clearEffect = useCallback(() => setEffect(null), []);
  const [isEnding, setIsEnding] = useState(false);
  const [areRolesShown, setAreRolesShown] = useState(true);
  const [nightRoles, setNightRoles] = useState<NightRoles | null>(null);
  const nightRolesRef = useRef<NightRoles | null>(null);
  const earlyEndFailed = useRef("");
  const [secondsLeft, setSecondsLeft] = useState(0);

  const gameRef = useRef<GameState | null>(null);
  const userRef = useRef(user);
  const phaseEndsAt = useRef(0);
  const finishedPhase = useRef("");
  const sentTarget = useRef<number | null>(null);
  const describedPhase = useRef("");
  const retryPhaseAt = useRef(0);
  const phaseErrorShown = useRef("");

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (isLoaded && !user) {
      rememberPageAfterLogin(`/game/${gameId}`);
      router.replace("/register");
    }
  }, [isLoaded, user, router, gameId]);

  const [lastOkAt, setLastOkAt] = useState(0);
  const [failCount, setFailCount] = useState(0);

  const loadGame = useCallback(async () => {
    try {
      const fresh = await api.getGame(gameId);
      setGame(fresh);
      setLastOkAt(Date.now());
      setFailCount(0);
      setLoadError("");
    } catch (error) {
      setFailCount((old) => old + 1);
      throw error;
    }
  }, [gameId]);

  useEffect(() => {
    if (!user) return;

    if (isDemo) {
      setGame(createDemoGame(gameId, user.username));
      return;
    }

    loadGame().catch((error: Error) => setLoadError(error.message));
  }, [user, isDemo, gameId, loadGame]);

  useEffect(() => {
    if (isDemo || game || !user) return;
    const timer = setInterval(() => {
      loadGame().catch((error: Error) => setLoadError(error.message));
    }, 2000);
    return () => clearInterval(timer);
  }, [isDemo, game, user, loadGame]);

  const isRunning = game !== null && game.winner === null;

  const hasGame = game !== null;

  const autoSendKey = useRef("");
  useEffect(() => {
    const current = gameRef.current;
    if (!current || current.phase !== "NIGHT" || isSent || selectedId === null) return;
    const currentUser = userRef.current;
    const mine = findMe(current, currentUser?.id, currentUser?.username);
    const turn = getNightTurn(current, phaseEndsAt.current, Date.now(), mine?.role ?? null, nightRolesRef.current);
    if (turn.myIndex === null || turn.activeIndex === turn.myIndex) return;
    if (Date.now() < turn.turns[turn.myIndex].end) return;
    const key = `${current.round}-${selectedId}`;
    if (autoSendKey.current === key) return;
    autoSendKey.current = key;
    handleConfirmRef.current?.();
  }, [secondsLeft, isSent, selectedId]);

  const addChatMessages = useCallback((incoming: ChatMessage[]) => {
    setChat((old) => {
      const known = new Set(old.map((message) => message.id));
      const fresh = incoming.filter((message) => message && message.id && !known.has(message.id));
      if (fresh.length === 0) return old;
      return [...old, ...fresh].sort((a, b) => a.time - b.time).slice(-150);
    });
  }, []);

  const { isLive, notify } = useLiveUpdates(!isDemo && hasGame ? WS_PATHS.game(gameId) : null, (data) => {
    const payload = data as { type?: string; message?: ChatMessage; messages?: ChatMessage[] } | null;
    if (payload?.type === "room-closed") {
      showToast("Игра закрыта: в ней никого не было.");
      router.push("/");
      return;
    }
    if (payload?.type === "chat" && payload.message) {
      addChatMessages([payload.message]);
      return;
    }
    const secret = data as { type?: string; role?: RoleKey; ids?: unknown; target?: unknown; isMafia?: unknown } | null;
    if (secret?.type === "team" && secret.role && Array.isArray(secret.ids)) {
      setTeam({ role: secret.role, ids: secret.ids.filter((id): id is number => typeof id === "number") });
      return;
    }
    const alive = data as { type?: string; present?: Record<string, unknown> } | null;
    if (alive?.type === "night-roles" && alive.present && typeof alive.present === "object") {
      const next: NightRoles = {};
      for (const role of ROLE_KEYS) if (typeof alive.present[role] === "boolean") next[role] = alive.present[role] as boolean;
      nightRolesRef.current = next;
      setNightRoles(next);
      return;
    }
    const reveal = data as { type?: string; roles?: Record<string, unknown> } | null;
    if (reveal?.type === "roles" && reveal.roles && typeof reveal.roles === "object") {
      const next: RevealedRoles = {};
      for (const [id, role] of Object.entries(reveal.roles)) {
        if (ROLE_KEYS.includes(role as RoleKey)) next[Number(id)] = role as RoleKey;
      }
      setRevealed(next);
      return;
    }
    if (secret?.type === "check-result" && typeof secret.target === "number") {
      showCheckResult(secret.target, typeof secret.isMafia === "boolean" ? secret.isMafia : null);
      return;
    }
    if (payload?.type === "chat-history" && Array.isArray(payload.messages)) {
      addChatMessages(payload.messages);
      return;
    }
    loadGame().catch(() => {});
  });

  useEffect(() => {
    if (isDemo || !isRunning) return;

    const timer = setInterval(
      () => {
        if (!document.hidden) loadGame().catch(() => {});
      },
      isLive ? REFRESH_LIVE_MS : REFRESH_EVERY_MS,
    );

    function handleVisible() {
      if (!document.hidden) loadGame().catch(() => {});
    }
    document.addEventListener("visibilitychange", handleVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, [isDemo, isRunning, isLive, loadGame]);

  const phaseKey = game ? `${game.round}-${game.phase}` : "";

  useEffect(() => {
    const current = gameRef.current;
    if (!current || describedPhase.current === phaseKey) return;
    const isLiveChange = describedPhase.current !== "";
    const wasVoting = describedPhase.current.endsWith("-VOTING");
    describedPhase.current = phaseKey;

    setSelectedId(null);
    setIsSent(false);
    setCheckResult("");
    sentTarget.current = null;

    phaseEndsAt.current = getPhaseEnd(current);
    setSecondsLeft(Math.max(0, Math.ceil((phaseEndsAt.current - Date.now()) / 1000)));

    if (!current.winner) {
      const narratorUser = userRef.current;
      setHostLine(narrate(current, findMe(current, narratorUser?.id, narratorUser?.username)));
    }

    const currentUser = userRef.current;
    const mine = findMe(current, currentUser?.id, currentUser?.username);

    let delay = 0;
    if (isLiveChange && wasVoting) {
      const eliminatedId = current.lastRound?.eliminatedPlayerId ?? null;
      const eliminated = current.players.find((player) => player.id === eliminatedId);
      const voted = lastVotes.current.votes.filter((vote) => vote.targetId === eliminatedId).length;
      setVotingResult(
        eliminated
          ? { kind: "result", key: phaseKey, name: eliminated.username, votes: voted > 0 ? voted : null, isMe: eliminated.id === mine?.id }
          : { kind: "tie", key: phaseKey },
      );
      delay = VOTING_RESULT_MS;
      setTimeout(() => setVotingResult(null), VOTING_RESULT_MS);
    }

    if (isLiveChange && !current.winner) {
      setTimeout(() => {
        setTransition({ key: phaseKey, phase: current.phase, round: current.round });
        const next = phaseStartEffect(current, mine);
        if (next) setTimeout(() => setEffect(next), PHASE_TRANSITION_MS);
      }, delay);
    }

    if (isLiveChange && !isDemo && current.phase === "DAY" && !current.winner) {
      const knownMafia = current.players.filter((player) => player.role === "mafia").map((player) => player.id);
      api
        .finishIfMafiaWon(current.id, knownMafia)
        .then((isOver) => {
          if (!isOver) return;
          notify("phase");
          loadGame().catch(() => {});
        })
        .catch(() => {});
    }
  }, [phaseKey, isDemo, notify, loadGame]);

  useEffect(() => {
    if (game?.phase === "VOTING") lastVotes.current = { round: game.round, votes: game.votes };
  }, [game]);

  const serverPhaseEnd = game?.phaseEndsAt ?? null;
  useEffect(() => {
    const current = gameRef.current;
    if (current && serverPhaseEnd !== null) phaseEndsAt.current = getPhaseEnd(current);
  }, [serverPhaseEnd]);

  const me = game && user ? findMe(game, user.id, user.username) : undefined;
  const meId = me?.id;

  useEffect(() => {
    if (meId === undefined) return;
    const key = `mafia_role_seen_${gameId}`;
    if (!sessionStorage.getItem(key)) setIsRoleOpen(true);
  }, [meId, gameId]);

  function closeRole() {
    sessionStorage.setItem(`mafia_role_seen_${gameId}`, "1");
    setIsRoleOpen(false);
  }

  useEffect(() => {
    const timer = setInterval(() => {
      const current = gameRef.current;
      if (!current || current.winner) return;

      const key = `${current.round}-${current.phase}`;
      const currentUser = userRef.current;
      const myPlayer = findMe(current, currentUser?.id, currentUser?.username);

      let phaseEnd = phaseEndsAt.current;
      let isEarly = false;
      if (current.phase === "NIGHT" && earlyEndFailed.current !== key) {
        const turns = getNightTurn(current, phaseEndsAt.current, Date.now(), myPlayer?.role ?? null, nightRolesRef.current);
        const earlyEnd = turns.turnsEnd + NIGHT_END_GRACE_MS;
        if (earlyEnd < phaseEnd) {
          phaseEnd = earlyEnd;
          isEarly = true;
        }
      }

      const left = Math.max(0, Math.ceil((phaseEnd - Date.now()) / 1000));
      setSecondsLeft(left);

      if (left > 0 || finishedPhase.current === key || Date.now() < retryPhaseAt.current) return;

      if (isDemo) {
        finishedPhase.current = key;
        setGame(advanceDemoGame(current, myPlayer, sentTarget.current));
        return;
      }

      const isOwner = currentUser?.id !== undefined && currentUser.id === current.ownerUserId;
      const overdue = (Date.now() - phaseEnd) / 1000;
      if (isOwner) {
        if (overdue < OWNER_GRACE_S) return;
      } else {
        if (!myPlayer) return;
        const helpers = current.players
          .filter((player) => player.userId !== current.ownerUserId)
          .sort((a, b) => a.id - b.id);
        const rank = helpers.findIndex((player) => player.id === myPlayer.id);
        if (rank < 0 || overdue < BACKUP_DELAY_S + rank * BACKUP_STEP_S) return;
      }

      finishedPhase.current = key;
      switchPhase(current, isEarly).catch((error: Error) => {
        if (isEarly) {
          earlyEndFailed.current = key;
          finishedPhase.current = "";
          return;
        }
        if (isOwner && phaseErrorShown.current !== key) showToast(error.message, "error");
        phaseErrorShown.current = key;
        retryPhaseAt.current = Date.now() + RETRY_PHASE_MS;
        finishedPhase.current = "";
      });
    }, 1000);

    async function switchPhase(current: GameState, isEarly: boolean) {
      const fresh = await api.getGame(current.id);
      if (!isEarly && fresh.phaseEndsAt !== null && fresh.phaseEndsAt > Date.now()) {
        phaseEndsAt.current = fresh.phaseEndsAt;
        finishedPhase.current = "";
        setGame(fresh);
        return;
      }
      if (fresh.round === current.round && fresh.phase === current.phase && !fresh.winner) {
        await api.nextPhase(current.id, current.phase);
        const knownMafia = (gameRef.current?.players ?? []).filter((player) => player.role === "mafia").map((player) => player.id);
        await api.finishIfMafiaWon(current.id, knownMafia).catch(() => false);
        notify("phase");
        await loadGame();
      } else {
        setGame(fresh);
      }
    }

    return () => clearInterval(timer);
  }, [isDemo, loadGame, notify]);

  function showCheckResult(targetId: number, isMafia: boolean | null) {
    const target = gameRef.current?.players.find((player) => player.id === targetId);
    if (!target) return;
    if (isMafia === null) {
      setCheckResult(`Проверка ${target.username} отправлена, но ведущий пока не знает его роль.`);
      return;
    }
    setCheckResult(isMafia ? `${target.username} — мафия! ❌` : `${target.username} — мирный ✅`);
    setEffect({
      key: `check-${targetId}-${Date.now()}`,
      kind: isMafia ? "mafia" : "clean",
      title: isMafia ? `${target.username} — мафия!` : `${target.username} — мирный`,
      text: isMafia ? "Убедите город выгнать его днём." : "Этому игроку можно доверять.",
    });
  }

  const gameWinner = game?.winner ?? null;
  useEffect(() => {
    if (!gameWinner) return;
    setHostLine(gameWinner === "MAFIA" ? "🏁 Победила мафия." : "🏁 Победили жители.");
  }, [gameWinner]);

  const amDead = me?.isAlive === false;
  const isFinished = game?.winner != null;
  useEffect(() => {
    if ((amDead || isFinished) && isLive) notify("roles");
  }, [amDead, isFinished, isLive, phaseKey, notify]);

  const isNightNow = game?.phase === "NIGHT";
  useEffect(() => {
    if (isNightNow && isLive && !isDemo) notify("night-roles");
  }, [isNightNow, isLive, isDemo, phaseKey, notify]);

  const myVote = game && me && game.phase === "VOTING" ? game.votes.find((vote) => vote.voterId === me.id) : undefined;
  useEffect(() => {
    if (!myVote || isSent) return;
    sentTarget.current = myVote.targetId;
    setSelectedId(myVote.targetId);
    setIsSent(true);
  }, [myVote, isSent]);

  const myNightAction = game && me ? game.nightActions.find((action) => action.actorId === me.id) : undefined;
  const askedCheckFor = useRef("");
  useEffect(() => {
    if (!game || !myNightAction || game.phase !== "NIGHT") return;
    if (!isSent) {
      sentTarget.current = myNightAction.targetId;
      setIsSent(true);
    }
    const key = `${game.round}-${myNightAction.targetId}`;
    if (myNightAction.type !== "CHECK" || !isLive || askedCheckFor.current === key) return;
    askedCheckFor.current = key;
    notify("check", { target: myNightAction.targetId });
  }, [game, myNightAction, isSent, isLive, notify]);

  handleConfirmRef.current = handleConfirm;

  async function handleConfirm() {
    if (!game || !me || selectedId === null) return;
    const target = game.players.find((player) => player.id === selectedId);

    try {
      let isMafia: boolean | null = null;

      if (!isDemo) {
        if (game.roundId === null) throw new Error("Раунд не найден. Обновите страницу.");

        if (game.phase === "VOTING") {
          await api.vote(game.roundId, me.id, selectedId);
        } else {
          const action = me.role ? NIGHT_ACTION[me.role] : undefined;
          if (action) {
            const result = await api.nightAction(game.roundId, me.id, selectedId, action);
            isMafia = result.isMafia;
          }
        }
      }

      sentTarget.current = selectedId;
      setIsSent(true);
      const nightType = game.phase === "NIGHT" && me.role ? NIGHT_ACTION[me.role] : undefined;
      if (nightType) {
        const action: NightActionInfo = { type: nightType, actorId: me.id, targetId: selectedId, at: Date.now() };
        setGame((old) => (old ? { ...old, nightActions: [...old.nightActions, action] } : old));
      }
      if (!isDemo) notify("action");

      if (isMafia === null && target?.role) isMafia = target.role === "mafia";

      if (game.phase === "NIGHT" && me.role === "commissar" && target) {
        if (isMafia !== null || isDemo) {
          showCheckResult(target.id, isMafia);
        } else if (isLive) {
          askedCheckFor.current = `${game.round}-${target.id}`;
          setCheckResult(`Ведущий проверяет ${target.username}…`);
          notify("check", { target: target.id });
        } else {
          setCheckResult("Проверка сохранена, но нет связи с ведущим. Результат придёт после переподключения.");
        }
      }

      if (game.phase === "NIGHT" && me.role === "mafia" && target) showToast(`Жертва выбрана: ${target.username}`, "success");
      if (game.phase === "NIGHT" && me.role === "doctor" && target) showToast(`Этой ночью вы лечите: ${target.username}`, "success");
    } catch (error) {
      showToast((error as Error).message, "error");
    }
  }

  if (!game) {
    return (
      <div className="game-page game-page-night">
        <div className="game-page-connecting" role="status">
          <span className="game-page-spinner" />
          <p className="game-page-connecting-title">Подключаемся к игре…</p>
          {loadError && <p className="game-page-connecting-error">Нет связи: {loadError}. Пробуем снова…</p>}
          <button type="button" className="btn btn-dark btn-small" onClick={() => router.push("/")}>
            В меню
          </button>
        </div>
      </div>
    );
  }

  const isOffline = !isDemo && !isGameOver_(game) && failCount >= 2;

  const alivePlayers = game.players.filter((player) => player.isAlive);
  const isGameOver = game.winner !== null;
  const isGameOwner = user?.id !== undefined && user.id === game.ownerUserId;
  const night = getNightTurn(game, phaseEndsAt.current, Date.now(), me?.role ?? null, nightRoles);

  async function handleEndGame() {
    if (!game || isEnding) return;
    if (!window.confirm("Завершить игру для всех? Комната тоже закроется.")) return;
    setIsEnding(true);
    try {
      await api.endGame(game.id, game.roomId);
      notify("room-closed");
      showToast("Игра завершена.", "success");
      router.push("/");
    } catch (error) {
      setIsEnding(false);
      showToast((error as Error).message, "error");
    }
  }
  const iCanAct = me?.isAlive === true && !isGameOver;

  function canSeeRole(player: GamePlayer): boolean {
    if (!player.role) return false;
    if (isGameOver || player.id === me?.id) return true;
    if (me?.isAlive === false) return areRolesShown;
    return me?.role !== undefined && me.role !== null && TEAM_ROLES.includes(me.role) && player.role === me.role;
  }

  function renderPhase() {
    if (!game) return null;

    const isWatcher = me?.isAlive === false;
    const headerButton = isWatcher ? (
      <button type="button" className="target-picker-button" aria-pressed={areRolesShown} onClick={() => setAreRolesShown((old) => !old)}>
        <EyeIcon />
        {areRolesShown ? "Скрыть роли" : "Смотреть роли"}
      </button>
    ) : me?.role ? (
      <button type="button" className="target-picker-button" onClick={() => setIsRoleOpen(true)}>
        <EyeIcon />
        Моя роль
      </button>
    ) : undefined;

    const common = {
      players: game.players,
      headerButton,
      deathLabel: (player: GamePlayer) => getDeathLabel(game, player),
      isUrgent: todo.isAction,
      selectedId,
      meId: me?.id ?? null,
      isSent,
      showRole: canSeeRole,
      onSelect: setSelectedId,
      onConfirm: handleConfirm,
    };

    if (game.phase === "NIGHT") {
      const role = me?.role;
      const turnStrip = <NightTurns night={night} />;
      const activeName = night.activeIndex !== null ? NIGHT_TURNS[night.activeIndex].title : null;
      const sleepText = activeName
        ? `Сейчас ходит: ${activeName} (${night.secondsInTurn} сек)`
        : `Все сделали ход. Утро через ${formatSeconds(secondsLeft)}.`;

      if (!iCanAct || role === "civilian" || !role) {
        return (
          <>
            {turnStrip}
            <TargetPicker {...common} title="Город спит" subtitle={sleepText} selectableIds={[]} />
          </>
        );
      }

      let selectable = alivePlayers.filter((player) => player.id !== me?.id);
      if (role === "mafia") selectable = selectable.filter((player) => player.role !== "mafia");
      const lastHealId = game.previousNightActions.find((action) => action.type === "HEAL" && action.actorId === me?.id)?.targetId;
      const lastHealName = game.players.find((player) => player.id === lastHealId)?.username;
      if (role === "doctor") selectable = alivePlayers.filter((player) => player.id !== lastHealId);

      const myTurn = night.myIndex;
      const myInfo = myTurn !== null ? night.turns[myTurn] : null;
      const now = Date.now();
      const isMyTurn = myTurn !== null && night.activeIndex === myTurn;
      const isBefore = myInfo !== null && now < myInfo.start;
      const teamAction = game.nightActions.find((action) => action.type === NIGHT_ACTION[role] && action.actorId !== me?.id);
      const teamTarget = teamAction ? game.players.find((player) => player.id === teamAction.targetId)?.username : null;

      const confirmText = role === "mafia" ? "Убить" : role === "doctor" ? "Вылечить" : "Проверить";
      let subtitle = `Нажмите на игрока, потом «${confirmText}». Осталось ${night.secondsInTurn} сек.`;
      if (role === "doctor" && lastHealName) subtitle += ` ${lastHealName} вы лечили прошлой ночью — его сегодня нельзя.`;
      if (isBefore) subtitle = `Ваш ход скоро. ${sleepText}`;
      if (!isMyTurn && !isBefore && !isSent) subtitle = teamTarget ? `Напарник выбрал: ${teamTarget}. ${sleepText}` : `Ваше время вышло. ${sleepText}`;
      if (isSent) subtitle = `Выбор сделан. ${sleepText}`;

      return (
        <>
          {turnStrip}
          <TargetPicker
            {...common}
            title={isMyTurn && !isSent ? `Ваш ход — ${getRole(role).name}` : `Вы — ${getRole(role).name}`}
            subtitle={subtitle}
            selectableIds={isMyTurn && !teamAction ? selectable.map((player) => player.id) : []}
            confirmText={isMyTurn || isSent ? confirmText : undefined}
          />
          {checkResult && <p className="game-page-check">{checkResult}</p>}
        </>
      );
    }

    if (game.phase === "DAY") {
      return <TargetPicker {...common} selectableIds={[]} />;
    }

    const voteCounts: Record<number, number> = {};
    for (const vote of game.votes) voteCounts[vote.targetId] = (voteCounts[vote.targetId] ?? 0) + 1;
    const votedCount = new Set(game.votes.map((vote) => vote.voterId)).size;
    const progress = `Проголосовали ${votedCount} из ${alivePlayers.length}. Больше всех голосов — выбывает, при равенстве никто не выбывает.`;

    return (
      <TargetPicker
        {...common}
        voteCounts={voteCounts}
        votedIds={[...new Set(game.votes.map((vote) => vote.voterId))]}
        voteLines={game.votes.map((vote) => ({
          voter: game.players.find((player) => player.id === vote.voterId)?.username ?? "Игрок",
          target: game.players.find((player) => player.id === vote.targetId)?.username ?? "Игрок",
        }))}
        title="Голосование"
        subtitle={`${iCanAct ? (isSent ? "Ваш голос учтён." : "Кого выгнать из города?") : "Живые игроки голосуют."} ${progress}`}
        selectableIds={iCanAct ? alivePlayers.filter((player) => player.id !== me?.id).map((player) => player.id) : []}
        confirmText={iCanAct ? "Проголосовать" : undefined}
      />
    );
  }

  function getTodo(): { text: string; isAction: boolean } {
    if (!game) return { text: "", isAction: false };
    if (!me) return { text: "👀 Вы зритель: смотрите за игрой.", isAction: false };
    if (!me.isAlive) return { text: "", isAction: false };

    if (game.phase === "NIGHT") {
      const role = me.role;
      if (!role || role === "civilian") return { text: "😴 Ночь: жителю делать ничего не нужно — ждите утра.", isAction: false };
      if (isSent) return { text: "✓ Выбор сделан. Ждите утра.", isAction: false };
      const activeName = night.activeIndex !== null ? NIGHT_TURNS[night.activeIndex].title : null;
      if (night.myIndex !== null && night.activeIndex === night.myIndex) {
        const button = role === "mafia" ? "Убить" : role === "doctor" ? "Вылечить" : "Проверить";
        return { text: `👉 Ваш ход! Нажмите на игрока, потом «${button}». Осталось ${night.secondsInTurn} сек.`, isAction: true };
      }
      if (night.myIndex !== null && night.activeIndex !== null && night.activeIndex < night.myIndex) {
        return { text: `⏳ Скоро ваш ход. Сейчас ходит: ${activeName}.`, isAction: false };
      }
      return { text: "Ваш ход прошёл. Ждите утра.", isAction: false };
    }

    if (game.phase === "DAY") return { text: "", isAction: false };

    if (isSent) return { text: "✓ Голос учтён. Ждём остальных.", isAction: false };
    return { text: `👉 Нажмите на игрока, которого хотите выгнать, потом «Проголосовать». Осталось ${formatSeconds(secondsLeft)}.`, isAction: true };
  }

  const todo = getTodo();

  const backLink = game.roomId ? `/room/${game.roomId}` : "/";

  let skyHint = "Обсуждайте, кто мафия";
  if (game.phase === "NIGHT") {
    skyHint = night.activeIndex !== null ? `Ходит: ${NIGHT_TURNS[night.activeIndex].title}` : "Город спит";
  }
  if (game.phase === "VOTING") skyHint = "Выберите, кого выгнать";

  const myName = me?.username ?? user?.username ?? "";
  const phaseDuration = getPhaseDuration(game);
  const lastWordLeft = Math.max(0, LAST_WORD_S - (phaseDuration - secondsLeft));
  let lastWordId: number | null = null;
  if (!isGameOver && lastWordLeft > 0 && game.lastRound) {
    if (game.phase === "DAY" && game.lastRound.roundNumber === game.round) lastWordId = game.lastRound.killedPlayerId;
    if (game.phase === "NIGHT" && game.lastRound.roundNumber === game.round - 1) lastWordId = game.lastRound.eliminatedPlayerId;
  }
  const lastWordPlayer = game.players.find((player) => player.id === lastWordId && !player.isAlive) ?? null;
  const isMyLastWord = lastWordPlayer !== null && lastWordPlayer.id === me?.id;

  let chatScope: ChatMessage["scope"] = "all";
  let canWrite = true;
  let chatHint = "";

  if (!isGameOver) {
    if (!me) {
      canWrite = false;
      chatHint = "Вы зритель — только читаете";
    } else if (isMyLastWord) {
      chatScope = "all";
    } else if (!me.isAlive) {
      chatScope = "dead";
    } else if (game.phase === "NIGHT") {
      canWrite = false;
      chatHint = lastWordPlayer ? "Сейчас говорит только выбывший" : "Ночью город спит";
    }
  }

  if (canWrite && !isDemo && !isLive) {
    canWrite = false;
    chatHint = "Чат недоступен: нет связи с сервером чата. Переподключаемся…";
  }

  const isDeadWatcher = me?.isAlive === false;
  const visibleChat = chat.filter(
    (message) => message.scope === "all" || isGameOver || (message.scope === "dead" && isDeadWatcher),
  );

  function sendChat(text: string) {
    if (!myName) return;
    const message: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: myName,
      text,
      time: Date.now(),
      scope: chatScope,
      lastWord: isMyLastWord || undefined,
    };
    addChatMessages([message]);
    notify("chat", { message });
  }

  const chatPanel = (
    <GameChat
      messages={visibleChat}
      myName={myName}
      canWrite={canWrite}
      scope={chatScope}
      hint={chatHint}
      forceOpen={isMyLastWord}
      onSend={sendChat}
    />
  );

  let connection: GameConnection = isLive ? "live" : "slow";
  if (isOffline) connection = "offline";
  if (isDemo) connection = "demo";

  return (
    <div className={`game-page game-page-${game.phase.toLowerCase()}`}>
      <div className="game-page-content">
        <GameTopBar
          aliveCount={alivePlayers.length}
          totalCount={game.players.length}
          connection={connection}
          canShowRole={Boolean(me?.role)}
          canEndGame={isGameOwner && !isDemo && !isGameOver}
          isEnding={isEnding}
          onShowRole={() => setIsRoleOpen(true)}
          onExit={() => router.push("/")}
          onEndGame={handleEndGame}
        />

        {isGameOver && game.winner ? (
          <>
            <GameOver winner={game.winner} players={game.players} rounds={game.round} myRole={me?.role ?? null} mafiaCount={game.mafiaCount} backLink={backLink} />
            {chatPanel}
          </>
        ) : (
          <>
            <GameHeader phase={game.phase} round={game.round} secondsLeft={secondsLeft} duration={getPhaseDuration(game)} hint={skyHint} />

            {me && !me.isAlive && <DeadBanner />}

            {lastWordPlayer && (
              <p className={isMyLastWord ? "game-page-last-word game-page-last-word-mine" : "game-page-last-word"} role="status">
                <b>🕯 Последнее слово · {lastWordLeft} сек</b>
                {isMyLastWord
                  ? "Вы выбыли, но можете сказать последнее слово — напишите в чат, его увидят все."
                  : `${lastWordPlayer.username} говорит последнее слово. Смотрите чат.`}
              </p>
            )}

            <div className={game.phase === "NIGHT" && !lastWordPlayer ? "game-page-grid game-page-grid-solo" : "game-page-grid"}>
              <main className="game-page-main">
                {hostLine && (
                  <p className="game-page-host" role="status">
                    <b>🎙 Ведущий</b>
                    {hostLine}
                  </p>
                )}
                {!me && todo.text && (
                  <p className={todo.isAction ? "game-page-todo game-page-todo-action" : "game-page-todo"} role="status">
                    {todo.text}
                  </p>
                )}
                {renderPhase()}
              </main>
              {(game.phase !== "NIGHT" || lastWordPlayer) && <aside className="game-page-side">{chatPanel}</aside>}
            </div>
          </>
        )}
      </div>

      {isRoleOpen && me?.role && <RoleReveal role={me.role} onClose={closeRole} />}
      <VotingEnd
        info={
          votingResult ??
          (game.phase === "VOTING" && !isGameOver && secondsLeft <= 3
            ? secondsLeft > 0
              ? { kind: "countdown", seconds: secondsLeft }
              : { kind: "counting" }
            : null)
        }
      />
      <PhaseTransition info={transition} onDone={clearTransition} />
      <EffectOverlay effect={effect} onDone={clearEffect} />
    </div>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.8" fill="currentColor" />
    </svg>
  );
}

"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { showToast } from "@/components/pages/widgets/toast/Toast";
import { api, type GamePlayer, type GameState, type NightActionInfo, type RoleKey } from "@/lib/api";
import { rememberPageAfterLogin, useCurrentUser } from "@/lib/auth";
import { advanceDemoGame, createDemoGame } from "@/lib/demo-game";
import { DEFAULT_TIMES, getRole, NIGHT_TURN_SECONDS, NIGHT_TURNS } from "@/lib/roles";
import { useLiveUpdates, WS_PATHS } from "@/lib/socket";

import DeadBanner from "./dead-banner/DeadBanner";
import EffectOverlay, { type GameEffect } from "./effect-overlay/EffectOverlay";
import GameHeader from "./game-header/GameHeader";
import GameChat, { type ChatMessage } from "./game-chat/GameChat";
import GameOver from "./game-over/GameOver";
import PhaseTransition, { PHASE_TRANSITION_MS, type PhaseTransitionInfo } from "./phase-transition/PhaseTransition";
import RoleReveal from "./role-reveal/RoleReveal";
import SkyClock from "./sky-clock/SkyClock";
import TargetPicker, { type Suspicion } from "./target-picker/TargetPicker";
import "./game-page.scss";

const REFRESH_EVERY_MS = 2000;
const REFRESH_LIVE_MS = 10000;
const RETRY_PHASE_MS = 3000;
const OWNER_GRACE_S = 3;
const BACKUP_DELAY_S = 10;
const BACKUP_STEP_S = 4;

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
};

const TEAM_ROLES: RoleKey[] = ["mafia", "doctor", "commissar"];

function getNightTurn(game: GameState, phaseEnd: number, now: number, myRole: RoleKey | null): NightTurnState {
  const turnMs = NIGHT_TURN_SECONDS * 1000;
  const nightStart = phaseEnd - game.nightTime * 1000;
  const hasHiddenRoles = game.players.some((player) => player.isAlive && player.role === null);

  let cursor = nightStart;
  const turns: TurnInfo[] = NIGHT_TURNS.map((turn) => {
    const present = hasHiddenRoles || game.players.some((player) => player.isAlive && player.role === turn.role);
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
  return { turns, activeIndex, secondsInTurn, myIndex: found >= 0 ? found : null, allDone: now >= cursor };
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

  if (game.phase === "NIGHT" && game.round > 1 && last?.eliminatedPlayerId) {
    if (last.eliminatedPlayerId === me?.id) {
      return { key, kind: "blood", title: "Город выгнал вас", text: "Теперь вы наблюдатель." };
    }
    return { key, kind: "info", title: `Город выгнал ${nameOf(last.eliminatedPlayerId)}`, text: "Наступает ночь." };
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

type SuspectEvent = { type?: string; round: number; from: number; target: number | null };

function findMe(game: GameState, userId: number | undefined, username: string | undefined): GamePlayer | undefined {
  return game.players.find((player) => (userId !== undefined && player.userId === userId) || player.username === username);
}


export default function GamePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const gameId = params.id;
  const isDemo = gameId.startsWith("demo");

  const { user, isLoaded } = useCurrentUser();

  const [game, setGame] = useState<GameState | null>(null);
  const [loadError, setLoadError] = useState("");
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isSent, setIsSent] = useState(false);
  const [checkResult, setCheckResult] = useState("");
  const [transition, setTransition] = useState<PhaseTransitionInfo | null>(null);
  const clearTransition = useCallback(() => setTransition(null), []);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [effect, setEffect] = useState<GameEffect | null>(null);
  const handleConfirmRef = useRef<(() => void) | null>(null);
  const clearEffect = useCallback(() => setEffect(null), []);
  const [isEnding, setIsEnding] = useState(false);
  const [suspects, setSuspects] = useState<Record<string, Record<number, number | null>>>({});
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
    const turn = getNightTurn(current, phaseEndsAt.current, Date.now(), mine?.role ?? null);
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

  const addSuspects = useCallback((items: SuspectEvent[]) => {
    setSuspects((old) => {
      const next = { ...old };
      for (const item of items) {
        if (typeof item?.round !== "number" || typeof item.from !== "number") continue;
        next[item.round] = { ...next[item.round], [item.from]: item.target ?? null };
      }
      return next;
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
    const suspect = data as { type?: string; round?: number; from?: number; target?: number | null; items?: unknown[] } | null;
    if (suspect?.type === "suspect") {
      addSuspects([suspect as SuspectEvent]);
      return;
    }
    if (suspect?.type === "suspect-history" && Array.isArray(suspect.items)) {
      addSuspects(suspect.items as SuspectEvent[]);
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
    describedPhase.current = phaseKey;

    setSelectedId(null);
    setIsSent(false);
    setCheckResult("");
    sentTarget.current = null;

    phaseEndsAt.current = getPhaseEnd(current);
    setSecondsLeft(Math.max(0, Math.ceil((phaseEndsAt.current - Date.now()) / 1000)));

    if (isLiveChange && !current.winner) {
      setTransition({ key: phaseKey, phase: current.phase, round: current.round });
      const currentUser = userRef.current;
      const mine = findMe(current, currentUser?.id, currentUser?.username);
      const next = phaseStartEffect(current, mine);
      if (next) setTimeout(() => setEffect(next), PHASE_TRANSITION_MS);
    }
  }, [phaseKey]);

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

      const left = Math.max(0, Math.ceil((phaseEndsAt.current - Date.now()) / 1000));
      setSecondsLeft(left);

      const key = `${current.round}-${current.phase}`;
      if (left > 0 || finishedPhase.current === key || Date.now() < retryPhaseAt.current) return;

      const currentUser = userRef.current;
      const myPlayer = findMe(current, currentUser?.id, currentUser?.username);

      if (isDemo) {
        finishedPhase.current = key;
        setGame(advanceDemoGame(current, myPlayer, sentTarget.current));
        return;
      }

      const isOwner = currentUser?.id !== undefined && currentUser.id === current.ownerUserId;
      const overdue = (Date.now() - phaseEndsAt.current) / 1000;
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
      switchPhase(current).catch((error: Error) => {
        if (isOwner && phaseErrorShown.current !== key) showToast(error.message, "error");
        phaseErrorShown.current = key;
        retryPhaseAt.current = Date.now() + RETRY_PHASE_MS;
        finishedPhase.current = "";
      });
    }, 1000);

    async function switchPhase(current: GameState) {
      const fresh = await api.getGame(current.id);
      if (fresh.phaseEndsAt !== null && fresh.phaseEndsAt > Date.now()) {
        phaseEndsAt.current = fresh.phaseEndsAt;
        finishedPhase.current = "";
        setGame(fresh);
        return;
      }
      if (fresh.round === current.round && fresh.phase === current.phase && !fresh.winner) {
        await api.nextPhase(current.id, current.phase);
        notify("phase");
        await loadGame();
      } else {
        setGame(fresh);
      }
    }

    return () => clearInterval(timer);
  }, [isDemo, loadGame, notify]);

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
        if (isMafia === null) {
          setCheckResult(`Проверка ${target.username} отправлена, но сервер не вернул результат.`);
        } else {
          setCheckResult(isMafia ? `${target.username} — мафия!` : `${target.username} — не мафия.`);
          setEffect({
            key: `check-${Date.now()}`,
            kind: isMafia ? "mafia" : "clean",
            title: isMafia ? `${target.username} — мафия!` : `${target.username} — мирный`,
            text: isMafia ? "Убедите город выгнать его днём." : "Этому игроку можно доверять.",
          });
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
  const night = getNightTurn(game, phaseEndsAt.current, Date.now(), me?.role ?? null);

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
    if (isGameOver || player.id === me?.id || me?.isAlive === false) return true;
    return me?.role !== undefined && me.role !== null && TEAM_ROLES.includes(me.role) && player.role === me.role;
  }

  function renderPhase() {
    if (!game) return null;

    const roundSuspects = suspects[game.round] ?? {};
    const counts: Record<number, number> = {};
    for (const [from, target] of Object.entries(roundSuspects)) {
      const voter = game.players.find((player) => player.id === Number(from));
      if (target === null || !voter?.isAlive) continue;
      counts[target] = (counts[target] ?? 0) + 1;
    }
    const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const topId = ranked.length > 0 && (ranked.length === 1 || ranked[0][1] > ranked[1][1]) ? Number(ranked[0][0]) : null;

    const suspicion: Suspicion | undefined =
      game.phase === "NIGHT"
        ? undefined
        : {
            counts,
            mine: me ? (roundSuspects[me.id] ?? null) : null,
            canSuspect: iCanAct,
            topId,
            onSuspect: toggleSuspect,
          };

    const common = {
      players: game.players,
      selectedId,
      meId: me?.id ?? null,
      isSent,
      showRole: canSeeRole,
      onSelect: setSelectedId,
      onConfirm: handleConfirm,
      suspicion,
    };

    if (game.phase === "NIGHT") {
      const role = me?.role;
      const turnStrip = <NightTurns night={night} />;
      const activeName = night.activeIndex !== null ? NIGHT_TURNS[night.activeIndex].title : null;
      const sleepText = activeName
        ? `Сейчас ходит: ${activeName} (${night.secondsInTurn} сек)`
        : `Все сделали ход. Утро через ${secondsLeft} сек.`;

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
      if (role === "doctor") selectable = alivePlayers;

      const myTurn = night.myIndex;
      const myInfo = myTurn !== null ? night.turns[myTurn] : null;
      const now = Date.now();
      const isMyTurn = myTurn !== null && night.activeIndex === myTurn;
      const isBefore = myInfo !== null && now < myInfo.start;
      const teamAction = game.nightActions.find((action) => action.type === NIGHT_ACTION[role] && action.actorId !== me?.id);
      const teamTarget = teamAction ? game.players.find((player) => player.id === teamAction.targetId)?.username : null;

      const confirmText = role === "mafia" ? "Убить" : role === "doctor" ? "Вылечить" : "Проверить";
      let subtitle = `${getRole(role).nightTask} Осталось ${night.secondsInTurn} сек.`;
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
      return (
        <TargetPicker
          {...common}
          title={`День ${game.round}`}
          subtitle="Обсудите, кто может быть мафией. Скоро голосование."
          selectableIds={[]}
        />
      );
    }

    return (
      <TargetPicker
        {...common}
        title="Голосование"
        subtitle={iCanAct ? "Кого выгнать из города?" : "Живые игроки голосуют."}
        selectableIds={iCanAct ? alivePlayers.filter((player) => player.id !== me?.id).map((player) => player.id) : []}
        confirmText={iCanAct ? "Проголосовать" : undefined}
      />
    );
  }

  const backLink = game.roomId ? `/room/${game.roomId}` : "/";

  let skyHint = "Обсуждайте, кто мафия";
  if (game.phase === "NIGHT") {
    skyHint = night.activeIndex !== null ? `Ходит: ${NIGHT_TURNS[night.activeIndex].title}` : "Город спит";
  }
  if (game.phase === "VOTING") skyHint = "Выберите, кого выгнать";

  const myName = me?.username ?? user?.username ?? "";
  let chatScope: ChatMessage["scope"] = "all";
  let canWrite = true;
  let chatHint = "";

  if (!isGameOver) {
    if (!me) {
      canWrite = false;
      chatHint = "Вы зритель — только читаете";
    } else if (!me.isAlive) {
      chatScope = "dead";
    } else if (game.phase === "NIGHT") {
      canWrite = false;
      chatHint = "Ночью город спит";
    }
  }

  const isDeadWatcher = me?.isAlive === false;
  const visibleChat = chat.filter(
    (message) => message.scope === "all" || isGameOver || (message.scope === "dead" && isDeadWatcher),
  );

  function toggleSuspect(targetId: number) {
    if (!game || !me || !iCanAct) return;
    const current = suspects[game.round]?.[me.id] ?? null;
    const item: SuspectEvent = { type: "suspect", round: game.round, from: me.id, target: current === targetId ? null : targetId };
    addSuspects([item]);
    notify("suspect", { ...item });
  }

  function sendChat(text: string) {
    if (!myName) return;
    const message: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: myName,
      text,
      time: Date.now(),
      scope: chatScope,
    };
    addChatMessages([message]);
    notify("chat", { message });
  }

  const chatPanel = (
    <GameChat messages={visibleChat} myName={myName} canWrite={canWrite} scope={chatScope} hint={chatHint} onSend={sendChat} />
  );

  return (
    <div className={`game-page game-page-${game.phase.toLowerCase()}`}>
      {!isDemo && (
        <p className={isOffline ? "game-page-connection game-page-connection-bad" : "game-page-connection"} role="status">
          <span />
          {isOffline ? "Переподключаемся…" : isLive ? "Онлайн" : "Онлайн (без WebSocket)"}
        </p>
      )}
      <div className="game-page-content">
        <GameHeader
          phase={game.phase}
          round={game.round}
          secondsLeft={isGameOver ? 0 : secondsLeft}
          myRole={me?.role ?? null}
          aliveCount={alivePlayers.length}
          totalCount={game.players.length}
          onShowRole={() => setIsRoleOpen(true)}
        />

        {me && !me.isAlive && !isGameOver && <DeadBanner />}

        {isGameOver && game.winner ? (
          <>
            <GameOver winner={game.winner} players={game.players} rounds={game.round} myRole={me?.role ?? null} backLink={backLink} />
            {chatPanel}
          </>
        ) : (
          <div className="game-page-grid">
            <main className="game-page-main">
              <SkyClock
                phase={game.phase}
                round={game.round}
                secondsLeft={secondsLeft}
                duration={getPhaseDuration(game)}
                hint={skyHint}
              />
              {renderPhase()}
              <div className="game-page-exit">
                <button type="button" className="btn btn-dark btn-small" onClick={() => router.push("/")}>
                  В меню
                </button>
                {isGameOwner && !isDemo && (
                  <button type="button" className="btn btn-dark btn-small game-page-end" onClick={handleEndGame} disabled={isEnding}>
                    {isEnding ? "Завершаем…" : "Завершить игру"}
                  </button>
                )}
              </div>
            </main>
            <aside className="game-page-side">{chatPanel}</aside>
          </div>
        )}
      </div>

      {isRoleOpen && me?.role && <RoleReveal role={me.role} onClose={closeRole} />}
      <PhaseTransition info={transition} onDone={clearTransition} />
      <EffectOverlay effect={effect} onDone={clearEffect} />
    </div>
  );
}

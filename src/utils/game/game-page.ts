import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { showToast } from "@/utils/toast";
import { api, ApiError, TeamActedError, type GamePlayer, type GameState, type NightActionInfo, type RoleKey, type VoteInfo } from "@/utils/api";
import { rememberPageAfterLogin, useCurrentUser } from "@/utils/auth";
import { advanceDemoGame, createDemoGame } from "@/utils/demo-game";
import { formatSeconds } from "@/utils/format";
import { getRole, NIGHT_TURNS } from "@/utils/roles";
import { useShop } from "@/utils/shop";
import { type Ambience, play, resetTick, setAmbience, unlockSoundOnGesture } from "@/utils/sound";
import { announceSkin, rememberSkin } from "@/utils/skins";
import { useLiveUpdates, WS_PATHS } from "@/utils/socket";

import {
  confirmTextFor,
  EFFECT_SOUND,
  findMe,
  getDeathLabel,
  getNightTurn,
  getNightTurnItems,
  getPhaseDuration,
  getPhaseEnd,
  knownMafiaIds,
  narrate,
  NIGHT_ACTION,
  PHASE_SOUND,
  PHASE_TRANSITION_MS,
  phaseStartEffect,
  readMemory,
  ROLE_KEYS,
  sameGame,
  TEAM_ROLES,
  VOTING_RESULT_MS,
  withTeam,
  writeMemory,
} from "./game-logic";
import type {
  ChatMessage,
  CheckRevealInfo,
  GameConnection,
  GameEffect,
  NightRoles,
  NightTurnItem,
  PhaseTransitionInfo,
  PlayerMark,
  RevealedRoles,
  SkipInfo,
  TargetPickerData,
  Team,
  VotingEndInfo,
} from "./types";

const REFRESH_EVERY_MS = 2000;
const REFRESH_LIVE_MS = 10000;
const RETRY_PHASE_MS = 3000;
const OWNER_GRACE_S = 5;
const BACKUP_DELAY_S = 9;
const BACKUP_STEP_S = 3;
const NIGHT_END_GRACE_MS = 2000;
const LAST_WORD_S = 30;
const MAFIA_CHECK_BACKUP_MS = 5000;

export type HeaderButton = { kind: "roles"; isShown: boolean } | { kind: "role" } | null;

export type PhaseView = {
  picker: TargetPickerData;
  headerButton: HeaderButton;
  nightTurns: { items: NightTurnItem[]; seconds: number; allDone: boolean } | null;
  checkResult: { text: string; tone: "mafia" | "town" | "wait" } | null;
};

export function useGamePage() {
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
  const [isNotFound, setIsNotFound] = useState(false);
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isSent, setIsSent] = useState(false);
  const [checkResult, setCheckResult] = useState("");
  const [checkTone, setCheckTone] = useState<"mafia" | "town" | "wait">("wait");
  const [checks, setChecks] = useState<Record<number, boolean>>({});
  const [checkReveal, setCheckReveal] = useState<CheckRevealInfo | null>(null);
  const closeCheckReveal = useCallback(() => setCheckReveal(null), []);
  const [skips, setSkips] = useState<SkipInfo[]>([]);
  const [transition, setTransition] = useState<PhaseTransitionInfo | null>(null);
  const clearTransition = useCallback(() => setTransition(null), []);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [effect, setEffect] = useState<GameEffect | null>(null);
  const clearEffect = useCallback(() => setEffect(null), []);
  const [hostLine, setHostLine] = useState("");
  const [votingResult, setVotingResult] = useState<VotingEndInfo | null>(null);
  const [isEnding, setIsEnding] = useState(false);
  const [areRolesShown, setAreRolesShown] = useState(true);
  const [nightRoles, setNightRoles] = useState<NightRoles | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [failCount, setFailCount] = useState(0);

  const lastVotes = useRef<{ round: number; votes: VoteInfo[] }>({ round: 0, votes: [] });
  const handleConfirmRef = useRef<(() => void) | null>(null);
  const nightRolesRef = useRef<NightRoles | null>(null);
  const earlyEndFailed = useRef("");
  const gameRef = useRef<GameState | null>(null);
  const userRef = useRef(user);
  const phaseEndsAt = useRef(0);
  const finishedPhase = useRef("");
  const sentTarget = useRef<number | null>(null);
  const describedPhase = useRef("");
  const retryPhaseAt = useRef(0);
  const phaseErrorShown = useRef("");
  const autoSendKey = useRef("");
  const armTried = useRef(false);
  const askedDayCheck = useRef("");
  const askedCheckFor = useRef("");

  useEffect(() => {
    setChecks(readMemory(gameId, "checks", {}));
  }, [gameId]);

  const addSkips = useCallback((list: SkipInfo[]) => {
    const valid = list.filter((item) => Number.isInteger(item?.voterId) && Number.isInteger(item?.round));
    if (valid.length === 0) return;
    setSkips((old) => {
      const fresh = valid.filter((item) => !old.some((known) => known.voterId === item.voterId && known.round === item.round));
      return fresh.length ? [...old, ...fresh] : old;
    });
  }, []);

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

  const loadGame = useCallback(async () => {
    try {
      const fresh = await api.getGame(gameId);
      setGame((old) => (sameGame(old, fresh) ? old : fresh));
      setFailCount(0);
      setLoadError("");
    } catch (error) {
      setFailCount((old) => old + 1);
      if (error instanceof ApiError && error.status === 404) setIsNotFound(true);
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

  const hasGame = game !== null;

  useEffect(() => {
    if (isDemo || hasGame || !user || isNotFound) return;
    const timer = setInterval(() => {
      loadGame().catch((error: Error) => setLoadError(error.message));
    }, REFRESH_EVERY_MS);
    return () => clearInterval(timer);
  }, [isDemo, hasGame, user, isNotFound, loadGame]);

  const isRunning = game !== null && game.winner === null;

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
    const message = data as {
      type?: string;
      message?: ChatMessage;
      messages?: ChatMessage[];
      voterId?: unknown;
      round?: unknown;
      skips?: unknown;
      role?: RoleKey;
      ids?: unknown;
      target?: unknown;
      isMafia?: unknown;
      present?: Record<string, unknown>;
      roles?: Record<string, unknown>;
    } | null;

    switch (message?.type) {
      case "skin":
        rememberSkin(data);
        return;
      case "hello":
        announceSkin(notify);
        return;
      case "room-closed":
        showToast("Игра закрыта: в ней никого не было.");
        router.push("/");
        return;
      case "chat":
        if (message.message) addChatMessages([message.message]);
        return;
      case "chat-history":
        if (Array.isArray(message.messages)) addChatMessages(message.messages);
        return;
      case "skip":
        addSkips([{ voterId: Number(message.voterId), round: Number(message.round) }]);
        return;
      case "skips":
        if (Array.isArray(message.skips)) addSkips(message.skips as SkipInfo[]);
        return;
      case "team":
        if (message.role && Array.isArray(message.ids)) {
          setTeam({ role: message.role, ids: message.ids.filter((id): id is number => typeof id === "number") });
        }
        return;
      case "night-roles": {
        if (!message.present || typeof message.present !== "object") return;
        const next: NightRoles = {};
        for (const role of ROLE_KEYS) if (typeof message.present[role] === "boolean") next[role] = message.present[role] as boolean;
        nightRolesRef.current = next;
        setNightRoles(next);
        return;
      }
      case "roles": {
        if (!message.roles || typeof message.roles !== "object") return;
        const next: RevealedRoles = {};
        for (const [id, role] of Object.entries(message.roles)) {
          if (ROLE_KEYS.includes(role as RoleKey)) next[Number(id)] = role as RoleKey;
        }
        setRevealed(next);
        return;
      }
      case "check-result":
        if (typeof message.target === "number") showCheckResult(message.target, typeof message.isMafia === "boolean" ? message.isMafia : null);
        return;
      default:
        loadGame().catch(() => {});
    }
  });

  useEffect(() => {
    if (!isLive) return;
    announceSkin(notify);
    const onChange = () => announceSkin(notify);
    window.addEventListener("mafia-shop-change", onChange);
    return () => window.removeEventListener("mafia-shop-change", onChange);
  }, [isLive, notify]);

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

    const currentUser = userRef.current;
    const mine = findMe(current, currentUser?.id, currentUser?.username);

    if (!current.winner) setHostLine(narrate(current, mine));

    const timers: ReturnType<typeof setTimeout>[] = [];
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
        play(PHASE_SOUND[current.phase]);
        const next = phaseStartEffect(current, mine);
        if (next) setTimeout(() => setEffect(next), PHASE_TRANSITION_MS);
      }, delay);
    }

    if (isLiveChange && !isDemo && current.phase === "DAY" && !current.winner) {
      const isOwner = currentUser?.id !== undefined && currentUser.id === current.ownerUserId;
      const backup = current.players.filter((player) => player.userId !== current.ownerUserId).sort((a, b) => a.id - b.id)[0];
      const isBackup = mine !== undefined && backup?.id === mine.id;
      if (isOwner || isBackup) {
        const check = () => {
          const latest = gameRef.current;
          if (!latest || latest.winner || `${latest.round}-${latest.phase}` !== phaseKey) return;
          api
            .finishIfMafiaWon(latest.id, knownMafiaIds(latest))
            .then((isOver) => {
              if (!isOver) return;
              notify("phase");
              loadGame().catch(() => {});
            })
            .catch(() => {});
        };
        if (isOwner) check();
        else timers.push(setTimeout(check, MAFIA_CHECK_BACKUP_MS));
      }
    }

    return () => timers.forEach(clearTimeout);
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

  const shop = useShop();
  const hasShield = shop.state.shields > 0;
  const hasShieldRef = useRef(hasShield);
  hasShieldRef.current = hasShield;
  const myRole = me?.role ?? null;
  const isMeAlive = me?.isAlive ?? false;
  const isShieldArmed = shop.state.armedGames.includes(gameId);
  const { markArmed, spendShield } = shop;

  useEffect(() => {
    if (isDemo || !hasShield || isShieldArmed || armTried.current) return;
    if (myRole !== "civilian" || !isMeAlive) return;
    armTried.current = true;
    api
      .exchangeProtection()
      .then(() => markArmed(gameId))
      .catch((error: Error) => console.warn("[shield] не удалось включить щит:", error.message));
  }, [isDemo, hasShield, isShieldArmed, myRole, isMeAlive, gameId, markArmed]);

  const lastRound = game?.lastRound ?? null;
  const shieldedRound = game?.phase === "DAY" && lastRound && meId !== undefined && lastRound.shieldedPlayerId === meId ? lastRound.roundNumber : null;
  useEffect(() => {
    if (shieldedRound !== null) spendShield(`${gameId}-${shieldedRound}`);
  }, [shieldedRound, gameId, spendShield]);

  useEffect(() => {
    if (meId === undefined) return;
    if (!sessionStorage.getItem(`mafia_role_seen_${gameId}`)) setIsRoleOpen(true);
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
        setGame(advanceDemoGame(current, myPlayer, sentTarget.current, hasShieldRef.current));
        return;
      }

      const isOwner = currentUser?.id !== undefined && currentUser.id === current.ownerUserId;
      const overdue = (Date.now() - phaseEnd) / 1000;
      if (isOwner) {
        if (overdue < OWNER_GRACE_S) return;
      } else {
        if (!myPlayer) return;
        const helpers = current.players.filter((player) => player.userId !== current.ownerUserId).sort((a, b) => a.id - b.id);
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
      setCheckTone("wait");
      setCheckResult(`Проверка ${target.username} отправлена, но ведущий пока не знает его роль.`);
      return;
    }
    setCheckTone(isMafia ? "mafia" : "town");
    setCheckResult(isMafia ? `${target.username} — мафия` : `${target.username} — мирный житель`);
    setChecks((old) => {
      if (old[targetId] === isMafia) return old;
      const next = { ...old, [targetId]: isMafia };
      writeMemory(gameId, "checks", next);
      return next;
    });
    setCheckReveal({ key: `check-${targetId}-${Date.now()}`, name: target.username, isMafia });
  }

  const gameWinner = game?.winner ?? null;
  useEffect(() => {
    if (!gameWinner) return;
    setHostLine(gameWinner === "MAFIA" ? "🏁 Победила мафия." : "🏁 Победили жители.");
  }, [gameWinner]);

  const ambience: Ambience = !game || game.winner !== null ? null : game.phase === "NIGHT" ? "night" : "day";
  useEffect(() => {
    setAmbience(ambience);
    resetTick();
  }, [ambience, phaseKey]);
  useEffect(() => () => setAmbience(null), []);

  const ambienceRef = useRef(ambience);
  ambienceRef.current = ambience;
  useEffect(() => unlockSoundOnGesture(() => setAmbience(ambienceRef.current)), []);

  useEffect(() => {
    if (!gameWinner) return;
    const iWon = myRole ? (gameWinner === "MAFIA") === (myRole === "mafia") : gameWinner === "CITIZENS";
    play(iWon ? "win" : "lose");
  }, [gameWinner, myRole]);

  const effectKind = effect?.kind ?? null;
  const effectKey = effect?.key ?? null;
  useEffect(() => {
    if (!effectKind) return;
    const sound = EFFECT_SOUND[effectKind];
    if (sound) play(sound);
  }, [effectKind, effectKey]);

  const isTicking = game !== null && game.winner === null && secondsLeft > 0 && secondsLeft <= 5;
  useEffect(() => {
    if (isTicking) play("tick");
  }, [isTicking, secondsLeft]);

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

  const mySkip = game !== null && me !== undefined && game.phase === "VOTING" && skips.some((item) => item.voterId === me.id && item.round === game.round);
  useEffect(() => {
    if (!mySkip || isSent) return;
    sentTarget.current = null;
    setIsSent(true);
  }, [mySkip, isSent]);

  function handleSkip() {
    if (!game || !me || isSent || game.phase !== "VOTING") return;
    const info = { voterId: me.id, round: game.round };
    addSkips([info]);
    setSelectedId(null);
    sentTarget.current = null;
    setIsSent(true);
    if (!isDemo) notify("skip", info);
    showToast("Вы пропустили голосование.", "success");
  }

  const isCommissarDay = game?.phase === "DAY" && me?.role === "commissar" && me.isAlive;
  const dayRound = game?.round ?? 0;
  useEffect(() => {
    if (!isCommissarDay || !isLive || isDemo) return;
    const last = readMemory<{ round: number; targetId: number } | null>(gameId, "lastCheck", null);
    if (!last || last.round !== dayRound || checks[last.targetId] !== undefined) return;
    const key = `${dayRound}-${last.targetId}`;
    if (askedDayCheck.current === key) return;
    askedDayCheck.current = key;
    notify("check", { target: last.targetId });
  }, [isCommissarDay, isLive, isDemo, gameId, dayRound, checks, notify]);

  const myNightAction = game && me ? game.nightActions.find((action) => action.actorId === me.id) : undefined;
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
    const targetId = selectedId;
    const target = game.players.find((player) => player.id === targetId);
    const nightType = game.phase === "NIGHT" && me.role ? NIGHT_ACTION[me.role] : undefined;
    const optimistic: NightActionInfo | null = nightType ? { type: nightType, actorId: me.id, targetId, at: Date.now() } : null;

    sentTarget.current = targetId;
    setIsSent(true);
    play("confirm");
    if (optimistic) setGame((old) => (old ? { ...old, nightActions: [...old.nightActions, optimistic] } : old));

    const undo = () => {
      sentTarget.current = null;
      setIsSent(false);
      if (optimistic) setGame((old) => (old ? { ...old, nightActions: old.nightActions.filter((action) => action !== optimistic) } : old));
    };

    try {
      let isMafia: boolean | null = null;

      if (!isDemo) {
        if (game.roundId === null) throw new Error("Раунд не найден. Обновите страницу.");

        if (game.phase === "VOTING") {
          await api.vote(game.roundId, me.id, targetId);
        } else if (nightType) {
          const result = await api.nightAction(game.roundId, me.id, targetId, nightType);
          isMafia = result.isMafia;
        }
        notify("action");
      }

      if (isMafia === null && target?.role) isMafia = target.role === "mafia";

      if (game.phase === "NIGHT" && me.role === "commissar" && target) {
        writeMemory(gameId, "lastCheck", { round: game.round, targetId: target.id });
        if (isMafia !== null || isDemo) {
          showCheckResult(target.id, isMafia);
        } else if (isLive) {
          askedCheckFor.current = `${game.round}-${target.id}`;
          setCheckTone("wait");
          setCheckResult(`Ведущий проверяет ${target.username}…`);
          notify("check", { target: target.id });
        } else {
          setCheckTone("wait");
          setCheckResult("Проверка сохранена, но нет связи с ведущим. Результат придёт после переподключения.");
        }
      }

      if (game.phase === "NIGHT" && me.role === "mafia" && target) showToast(`Жертва выбрана: ${target.username}`, "success");
      if (game.phase === "NIGHT" && me.role === "doctor" && target) showToast(`Этой ночью вы лечите: ${target.username}`, "success");
    } catch (error) {
      undo();
      if (error instanceof TeamActedError) {
        if (nightType) {
          const teamAction: NightActionInfo = { type: nightType, actorId: -1, targetId: error.targetId, at: Date.now() };
          setGame((old) => (old ? { ...old, nightActions: [...old.nightActions, teamAction] } : old));
        }
        setSelectedId(null);
        const name = game.players.find((player) => player.id === error.targetId)?.username ?? "игрока";
        showToast(`Напарник уже выбрал: ${name}. У команды один ход за ночь.`);
        if (!isDemo) loadGame().catch(() => {});
        return;
      }
      showToast((error as Error).message, "error");
    }
  }

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

  const visibleChat = useMemo(
    () => chat.filter((message) => message.scope === "all" || isFinished || (message.scope === "dead" && amDead)),
    [chat, isFinished, amDead],
  );

  const goHome = () => router.push("/");
  const openRole = () => setIsRoleOpen(true);
  const toggleRoles = () => setAreRolesShown((old) => !old);

  if (!game) {
    return { game: null, isNotFound, loadError, goHome, view: null } as const;
  }

  const isGameOver = game.winner !== null;
  const alivePlayers = game.players.filter((player) => player.isAlive);
  const isGameOwner = user?.id !== undefined && user.id === game.ownerUserId;
  const night = getNightTurn(game, phaseEndsAt.current, Date.now(), me?.role ?? null, nightRoles);
  const iCanAct = me?.isAlive === true && !isGameOver;
  const activeTurnName = night.activeIndex !== null ? NIGHT_TURNS[night.activeIndex].title : null;

  function getTodo(): { text: string; isAction: boolean } {
    if (!game) return { text: "", isAction: false };
    if (!me) return { text: "👀 Вы зритель: смотрите за игрой.", isAction: false };
    if (!me.isAlive) return { text: "", isAction: false };

    if (game.phase === "NIGHT") {
      const role = me.role;
      if (!role || role === "civilian") return { text: "😴 Ночь: жителю делать ничего не нужно — ждите утра.", isAction: false };
      if (isSent) return { text: "✓ Выбор сделан. Ждите утра.", isAction: false };
      if (night.myIndex !== null && night.activeIndex === night.myIndex) {
        return { text: `👉 Ваш ход! Нажмите на игрока, потом «${confirmTextFor(role)}». Осталось ${night.secondsInTurn} сек.`, isAction: true };
      }
      if (night.myIndex !== null && night.activeIndex !== null && night.activeIndex < night.myIndex) {
        return { text: `⏳ Скоро ваш ход. Сейчас ходит: ${activeTurnName}.`, isAction: false };
      }
      return { text: "Ваш ход прошёл. Ждите утра.", isAction: false };
    }

    if (game.phase === "DAY") return { text: "", isAction: false };

    if (isSent) return { text: mySkip ? "✓ Вы пропустили голосование. Ждём остальных." : "✓ Голос учтён. Ждём остальных.", isAction: false };
    return { text: `👉 Нажмите на игрока, которого хотите выгнать, потом «Проголосовать». Осталось ${formatSeconds(secondsLeft)}.`, isAction: true };
  }

  const todo = getTodo();

  function canSeeRole(player: GamePlayer): boolean {
    if (!player.role) return false;
    if (isGameOver || player.id === me?.id) return true;
    if (me?.isAlive === false) return areRolesShown;
    return me?.role !== undefined && me.role !== null && TEAM_ROLES.includes(me.role) && player.role === me.role;
  }

  function getPhaseView(current: GameState): PhaseView {
    const headerButton: HeaderButton = me?.isAlive === false ? { kind: "roles", isShown: areRolesShown } : me?.role ? { kind: "role" } : null;

    const marks: Record<number, PlayerMark> = {};
    if (me?.role === "commissar") {
      for (const [id, isMafia] of Object.entries(checks)) {
        marks[Number(id)] = isMafia ? { text: "Мафия", tone: "mafia" } : { text: "Мирный", tone: "town" };
      }
    }

    const common: TargetPickerData = {
      players: current.players,
      marks,
      deathLabel: (player: GamePlayer) => getDeathLabel(current, player),
      isUrgent: todo.isAction,
      selectedId,
      meId: me?.id ?? null,
      isSent,
      showRole: canSeeRole,
      selectableIds: [],
      onSelect: (playerId: number) => {
        play("select");
        setSelectedId(playerId);
      },
      onConfirm: handleConfirm,
    };

    if (current.phase === "NIGHT") {
      const role = me?.role;
      const nightTurns = { items: getNightTurnItems(night), seconds: night.secondsInTurn, allDone: night.allDone };
      const sleepText = activeTurnName
        ? `Сейчас ходит: ${activeTurnName} (${night.secondsInTurn} сек)`
        : `Все сделали ход. Утро через ${formatSeconds(secondsLeft)}.`;

      if (!iCanAct || role === "civilian" || !role) {
        const shieldNote = role === "civilian" && me?.isAlive && hasShield ? "🛡 У вас щит: если мафия придёт за вами, он сработает сам. " : "";
        return {
          headerButton,
          nightTurns,
          checkResult: null,
          picker: { ...common, title: "Город спит", subtitle: `${shieldNote}${sleepText}` },
        };
      }

      let selectable = alivePlayers.filter((player) => player.id !== me?.id);
      if (role === "mafia") selectable = selectable.filter((player) => player.role !== "mafia");
      if (role === "doctor") selectable = alivePlayers;

      const myTurn = night.myIndex;
      const myInfo = myTurn !== null ? night.turns[myTurn] : null;
      const isMyTurn = myTurn !== null && night.activeIndex === myTurn;
      const isBefore = myInfo !== null && Date.now() < myInfo.start;
      const teamAction = current.nightActions.find((action) => action.type === NIGHT_ACTION[role] && action.actorId !== me?.id);
      const teamTarget = teamAction ? current.players.find((player) => player.id === teamAction.targetId)?.username : null;

      const confirmText = confirmTextFor(role);
      const teamSize = current.players.filter((player) => player.isAlive && player.role === role).length;
      const teamRule = teamSize > 1 ? `Вас ${teamSize}, но ход у команды один: кто первым нажмёт «${confirmText}», тот и решает. ` : "";
      let subtitle = `${teamRule}Нажмите на игрока, потом «${confirmText}». Осталось ${night.secondsInTurn} сек.`;
      if (isBefore) subtitle = `Ваш ход скоро. ${sleepText}`;
      if (!isMyTurn && !isBefore && !isSent) subtitle = teamTarget ? `Напарник выбрал: ${teamTarget}. ${sleepText}` : `Ваше время вышло. ${sleepText}`;
      if (isSent) subtitle = `Выбор сделан. ${sleepText}`;

      return {
        headerButton,
        nightTurns,
        checkResult: checkResult ? { text: checkResult, tone: checkTone } : null,
        picker: {
          ...common,
          title: isMyTurn && !isSent ? `Ваш ход — ${getRole(role).name}` : `Вы — ${getRole(role).name}`,
          subtitle,
          selectableIds: isMyTurn && !teamAction ? selectable.map((player) => player.id) : [],
          confirmText: isMyTurn || isSent ? confirmText : undefined,
        },
      };
    }

    if (current.phase === "DAY") {
      return { headerButton, nightTurns: null, checkResult: null, picker: common };
    }

    const voteCounts: Record<number, number> = {};
    for (const vote of current.votes) voteCounts[vote.targetId] = (voteCounts[vote.targetId] ?? 0) + 1;
    const voterIds = new Set(current.votes.map((vote) => vote.voterId));
    const skipperIds = skips.filter((item) => item.round === current.round && !voterIds.has(item.voterId)).map((item) => item.voterId);
    const nameOf = (id: number) => current.players.find((player) => player.id === id)?.username ?? "Игрок";
    const votedCount = voterIds.size + skipperIds.length;
    const progress = `Проголосовали ${votedCount} из ${alivePlayers.length}. Больше всех голосов — выбывает, при равенстве никто не выбывает.`;
    const status = iCanAct ? (isSent ? (mySkip ? "Вы пропустили голосование." : "Ваш голос учтён.") : "Кого выгнать из города?") : "Живые игроки голосуют.";

    return {
      headerButton,
      nightTurns: null,
      checkResult: null,
      picker: {
        ...common,
        voteCounts,
        voteArrows: current.votes.map((vote) => ({ from: vote.voterId, to: vote.targetId })),
        votedIds: [...voterIds, ...skipperIds],
        skippedIds: skipperIds,
        voteLines: [
          ...current.votes.map((vote) => ({ voter: nameOf(vote.voterId), target: nameOf(vote.targetId) })),
          ...skipperIds.map((id) => ({ voter: nameOf(id), target: null })),
        ],
        title: "Голосование",
        subtitle: `${status} ${progress}`,
        selectableIds: iCanAct ? alivePlayers.filter((player) => player.id !== me?.id).map((player) => player.id) : [],
        confirmText: iCanAct ? "Проголосовать" : undefined,
        sentText: mySkip ? "Вы пропустили ✓" : undefined,
        onSkip: iCanAct && !isSent ? handleSkip : undefined,
      },
    };
  }

  let skyHint = "Обсуждайте, кто мафия";
  if (game.phase === "NIGHT") skyHint = activeTurnName ? `Ходит: ${activeTurnName}` : "Город спит";
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

  let connection: GameConnection = isLive ? "live" : "slow";
  if (!isDemo && !isGameOver && failCount >= 2) connection = "offline";
  if (isDemo) connection = "demo";

  let votingEnd: VotingEndInfo | null = votingResult;
  if (!votingEnd && game.phase === "VOTING" && !isGameOver && secondsLeft <= 3) {
    votingEnd = secondsLeft > 0 ? { kind: "countdown", seconds: secondsLeft } : { kind: "counting" };
  }

  return {
    game,
    isNotFound,
    loadError,
    goHome,
    view: {
      me,
      isDemo,
      isGameOver,
      secondsLeft,
      phaseDuration,
      skyHint,
      hostLine,
      todo,
      backLink: game.roomId ? `/room/${game.roomId}` : "/",
      topBar: {
        aliveCount: alivePlayers.length,
        totalCount: game.players.length,
        connection,
        canShowRole: Boolean(me?.role),
        canEndGame: isGameOwner && !isDemo && !isGameOver,
        isEnding,
        onShowRole: openRole,
        onExit: goHome,
        onEndGame: handleEndGame,
      },
      lastWord: lastWordPlayer ? { name: lastWordPlayer.username, isMine: isMyLastWord, secondsLeft: lastWordLeft } : null,
      isSoloGrid: game.phase === "NIGHT" && !lastWordPlayer,
      showChatSide: game.phase !== "NIGHT" || lastWordPlayer !== null,
      phase: getPhaseView(game),
      chat: {
        messages: visibleChat,
        myName,
        canWrite,
        scope: chatScope,
        hint: chatHint,
        forceOpen: isMyLastWord,
        onSend: sendChat,
      },
      openRole,
      toggleRoles,
      roleReveal: isRoleOpen && me?.role ? me.role : null,
      closeRole,
      votingEnd,
      transition,
      clearTransition,
      effect,
      clearEffect,
      checkReveal,
      closeCheckReveal,
    },
  } as const;
}

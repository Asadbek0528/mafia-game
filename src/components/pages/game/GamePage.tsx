"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { showToast } from "@/components/pages/widgets/toast/Toast";
import { api, type GamePlayer, type GameState, type RoleKey } from "@/lib/api";
import { useCurrentUser } from "@/lib/auth";
import { advanceDemoGame, createDemoGame } from "@/lib/demo-game";
import { DEFAULT_TIMES, getRole } from "@/lib/roles";
import { useLiveUpdates, WS_PATHS } from "@/lib/socket";

import DeadBanner from "./dead-banner/DeadBanner";
import GameHeader from "./game-header/GameHeader";
import GameLog from "./game-log/GameLog";
import GameOver from "./game-over/GameOver";
import RoleReveal from "./role-reveal/RoleReveal";
import TargetPicker from "./target-picker/TargetPicker";
import "./game-page.scss";

const REFRESH_EVERY_MS = 2000;
const REFRESH_LIVE_MS = 10000;
const RETRY_PHASE_MS = 3000;

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

function roleText(role: RoleKey | null): string {
  return role ? ` Роль: ${getRole(role).name}.` : "";
}

function getPhaseEnd(game: GameState): number {
  const duration = getPhaseDuration(game) * 1000;
  const serverEnd = game.phaseEndsAt;
  if (serverEnd !== null && serverEnd - Date.now() <= duration + 5000 && serverEnd - Date.now() > -60_000) {
    return serverEnd;
  }
  return Date.now() + duration;
}

function findMe(game: GameState, userId: number | undefined, username: string | undefined): GamePlayer | undefined {
  return game.players.find((player) => (userId !== undefined && player.userId === userId) || player.username === username);
}

function describePhaseStart(game: GameState): string[] {
  const nameOf = (id: number | null) => game.players.find((player) => player.id === id);
  const last = game.lastRound;

  if (game.phase === "NIGHT") {
    if (game.round === 1) return ["Город засыпает. Просыпается мафия."];

    const expelled = nameOf(last?.eliminatedPlayerId ?? null);
    const result = expelled
      ? `Город выгнал ${expelled.username}.${roleText(expelled.role)}`
      : "Город никого не выгнал.";
    return [result, `Наступает ночь ${game.round}.`];
  }

  if (game.phase === "DAY") {
    const killed = nameOf(last?.killedPlayerId ?? null);
    let night = "Ночь прошла тихо.";
    if (killed) night = `Ночью убит ${killed.username}.${roleText(killed.role)}`;
    else if (last?.savedByDoctor) night = "Мафия промахнулась: доктор спас жертву.";

    return [night, "Город просыпается. Обсуждайте, кто мафия."];
  }

  return ["Голосование: выберите, кого выгнать из города."];
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
  const [events, setEvents] = useState<string[]>([]);
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
    if (isLoaded && !user) router.replace("/register");
  }, [isLoaded, user, router]);

  const loadGame = useCallback(async () => {
    const fresh = await api.getGame(gameId);
    setGame(fresh);
  }, [gameId]);

  useEffect(() => {
    if (!user) return;

    if (isDemo) {
      setGame(createDemoGame(gameId, user.username));
      return;
    }

    loadGame().catch((error: Error) => setLoadError(error.message));
  }, [user, isDemo, gameId, loadGame]);

  const isRunning = game !== null && game.winner === null;

  const { isLive, notify } = useLiveUpdates(!isDemo && isRunning ? WS_PATHS.game(gameId) : null, () => {
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

    return () => clearInterval(timer);
  }, [isDemo, isRunning, isLive, loadGame]);

  const phaseKey = game ? `${game.round}-${game.phase}` : "";

  useEffect(() => {
    const current = gameRef.current;
    if (!current || describedPhase.current === phaseKey) return;
    describedPhase.current = phaseKey;

    setSelectedId(null);
    setIsSent(false);
    setCheckResult("");
    sentTarget.current = null;

    phaseEndsAt.current = getPhaseEnd(current);
    setSecondsLeft(Math.max(0, Math.ceil((phaseEndsAt.current - Date.now()) / 1000)));

    const texts = describePhaseStart(current);
    setEvents((old) => [...old, ...texts]);
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
      finishedPhase.current = key;

      const currentUser = userRef.current;

      if (isDemo) {
        const myPlayer = findMe(current, currentUser?.id, currentUser?.username);
        setGame(advanceDemoGame(current, myPlayer, sentTarget.current));
        return;
      }

      const isOwner = currentUser?.id !== undefined && currentUser.id === current.ownerUserId;
      if (isOwner) {
        switchPhase(current).catch((error: Error) => {
          if (phaseErrorShown.current !== key) showToast(error.message, "error");
          phaseErrorShown.current = key;
          retryPhaseAt.current = Date.now() + RETRY_PHASE_MS;
          finishedPhase.current = "";
        });
      }
    }, 1000);

    async function switchPhase(current: GameState) {
      const fresh = await api.getGame(current.id);
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

  async function handleConfirm() {
    if (!game || !me || selectedId === null) return;
    const target = game.players.find((player) => player.id === selectedId);

    try {
      let isMafia: boolean | null = isDemo && target ? target.role === "mafia" : null;

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
      if (!isDemo) notify("action");

      if (game.phase === "NIGHT" && me.role === "commissar" && target) {
        if (isMafia === null) setCheckResult(`Проверка ${target.username} отправлена.`);
        else setCheckResult(isMafia ? `${target.username} — мафия!` : `${target.username} — не мафия.`);
      }
    } catch (error) {
      showToast((error as Error).message, "error");
    }
  }

  if (!game) {
    return (
      <div className="game-page game-page-night">
        <p className="game-page-message">{loadError || "Загружаем игру…"}</p>
      </div>
    );
  }

  const alivePlayers = game.players.filter((player) => player.isAlive);
  const isGameOver = game.winner !== null;
  const iCanAct = me?.isAlive === true && !isGameOver;

  function canSeeRole(player: GamePlayer): boolean {
    if (!player.role) return false;
    if (isGameOver || !player.isAlive) return true;
    if (player.id === me?.id) return true;
    return me?.role === "mafia" && player.role === "mafia";
  }

  function renderPhase() {
    if (!game) return null;

    const common = {
      players: game.players,
      selectedId,
      meId: me?.id ?? null,
      isSent,
      showRole: canSeeRole,
      onSelect: setSelectedId,
      onConfirm: handleConfirm,
    };

    if (game.phase === "NIGHT") {
      const role = me?.role;

      if (!iCanAct || role === "civilian" || !role) {
        return (
          <TargetPicker {...common} title="Город спит" subtitle="Мафия выбирает жертву. Дождитесь утра." selectableIds={[]} />
        );
      }

      let selectable = alivePlayers;
      if (role === "mafia") selectable = alivePlayers.filter((player) => player.role !== "mafia");
      if (role === "commissar") selectable = alivePlayers.filter((player) => player.id !== me?.id);

      const confirmText = role === "mafia" ? "Подтвердить выбор" : role === "doctor" ? "Вылечить" : "Проверить";

      return (
        <>
          <TargetPicker
            {...common}
            title={`Вы — ${getRole(role).name}`}
            subtitle={getRole(role).nightTask}
            selectableIds={selectable.map((player) => player.id)}
            confirmText={confirmText}
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

  return (
    <div className={`game-page game-page-${game.phase.toLowerCase()}`}>
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
          <GameOver winner={game.winner} players={game.players} rounds={game.round} myRole={me?.role ?? null} backLink={backLink} />
        ) : (
          <div className="game-page-grid">
            <main className="game-page-main">{renderPhase()}</main>
            <GameLog events={events} />
          </div>
        )}
      </div>

      {isRoleOpen && me?.role && <RoleReveal role={me.role} onClose={closeRole} />}
    </div>
  );
}

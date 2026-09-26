"use client";

/*
  =============================================================
  GamePage — сама игра, адрес "/game/12".
  Если адрес начинается с "demo" (например /game/demo-83491) —
  игра идёт без сервера, с ботами (для проверки дизайна).

  Как идёт игра:
    НОЧЬ → ДЕНЬ → ГОЛОСОВАНИЕ → НОЧЬ → ... пока кто-то не победит.

  Что делает эта страница:
  1. Загружает игру с сервера. Обновления приходят через WebSocket,
     запасной вариант — опрос каждые 2 секунды.
  2. Показывает анимацию «Ваша роль» (один раз за игру).
  3. Считает таймер фазы по phase_ends_at с сервера (у всех одинаково).
     Когда время вышло — браузер СОЗДАТЕЛЯ комнаты говорит серверу
     «следующая фаза».
  4. Отправляет мои действия: ночью (убить / вылечить / проверить)
     и на голосовании.
  =============================================================
*/
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

const REFRESH_EVERY_MS = 2000; // без WebSocket
const REFRESH_LIVE_MS = 10000; // с WebSocket — только на всякий случай
const RETRY_PHASE_MS = 3000; // сервер не переключил фазу — пробуем снова через 3 сек

// какое ночное действие у какой роли
const NIGHT_ACTION: Partial<Record<RoleKey, "KILL" | "HEAL" | "CHECK">> = {
  mafia: "KILL",
  doctor: "HEAL",
  commissar: "CHECK",
};

/* ---------- маленькие помощники ---------- */

// сколько секунд длится фаза
function getPhaseDuration(game: GameState): number {
  if (game.phase === "NIGHT") return game.nightTime;
  if (game.phase === "DAY") return game.dayTime;
  return DEFAULT_TIMES.voting;
}

// «Роль: Мафия.» — или пусто, если backend роль скрыл
function roleText(role: RoleKey | null): string {
  return role ? ` Роль: ${getRole(role).name}.` : "";
}

/*
  Когда кончится фаза (мс). Берём время сервера (phase_ends_at),
  если оно похоже на правду, иначе считаем сами от текущего момента.
*/
function getPhaseEnd(game: GameState): number {
  const duration = getPhaseDuration(game) * 1000;
  const serverEnd = game.phaseEndsAt;
  if (serverEnd !== null && serverEnd - Date.now() <= duration + 5000 && serverEnd - Date.now() > -60_000) {
    return serverEnd;
  }
  return Date.now() + duration;
}

// найти «меня» среди игроков
function findMe(game: GameState, userId: number | undefined, username: string | undefined): GamePlayer | undefined {
  return game.players.find((player) => (userId !== undefined && player.userId === userId) || player.username === username);
}

// текст событий в начале новой фазы
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

/* =============================================================
   КОМПОНЕНТ
   ============================================================= */

export default function GamePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const gameId = params.id;
  const isDemo = gameId.startsWith("demo");

  const { user, isLoaded } = useCurrentUser();

  const [game, setGame] = useState<GameState | null>(null);
  const [loadError, setLoadError] = useState("");
  const [isRoleOpen, setIsRoleOpen] = useState(false); // анимация «Ваша роль»
  const [selectedId, setSelectedId] = useState<number | null>(null); // кого я выбрал
  const [isSent, setIsSent] = useState(false); // выбор отправлен
  const [checkResult, setCheckResult] = useState(""); // результат проверки комиссара
  const [events, setEvents] = useState<string[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(0);

  /*
    useRef — «коробка» для значения, которое не перерисовывает страницу.
    Нужны для таймера: setInterval видит только старые значения useState,
    а в ref всегда лежит свежее.
  */
  const gameRef = useRef<GameState | null>(null);
  const userRef = useRef(user);
  const phaseEndsAt = useRef(0); // когда закончится фаза (время в мс)
  const finishedPhase = useRef(""); // какую фазу мы уже закрыли
  const sentTarget = useRef<number | null>(null); // кого я выбрал и отправил
  const describedPhase = useRef(""); // для какой фазы уже написали события
  const retryPhaseAt = useRef(0); // раньше этого времени не пробуем снова переключить фазу
  const phaseErrorShown = useRef(""); // для какой фазы уже показали ошибку

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  /* ---------- 1. без входа — на регистрацию ---------- */
  useEffect(() => {
    if (isLoaded && !user) router.replace("/register");
  }, [isLoaded, user, router]);

  /* ---------- 2. загрузка игры ---------- */
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

  // пока игра идёт — слушаем WebSocket и на всякий случай опрашиваем сервер
  const isRunning = game !== null && game.winner === null;

  const isLive = useLiveUpdates(!isDemo && isRunning ? WS_PATHS.game(gameId) : null, () => {
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

  /* ---------- 3. новая фаза: сброс выбора, запуск таймера, события ---------- */
  const phaseKey = game ? `${game.round}-${game.phase}` : "";

  useEffect(() => {
    const current = gameRef.current;
    if (!current || describedPhase.current === phaseKey) return;
    describedPhase.current = phaseKey; // защита от двойного запуска

    setSelectedId(null);
    setIsSent(false);
    setCheckResult("");
    sentTarget.current = null;

    phaseEndsAt.current = getPhaseEnd(current);
    setSecondsLeft(Math.max(0, Math.ceil((phaseEndsAt.current - Date.now()) / 1000)));

    const texts = describePhaseStart(current);
    setEvents((old) => [...old, ...texts]);
  }, [phaseKey]);

  // сервер сдвинул конец фазы — подстраиваем таймер
  const serverPhaseEnd = game?.phaseEndsAt ?? null;
  useEffect(() => {
    const current = gameRef.current;
    if (current && serverPhaseEnd !== null) phaseEndsAt.current = getPhaseEnd(current);
  }, [serverPhaseEnd]);

  /* ---------- 4. показать роль один раз за игру ---------- */
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

  /* ---------- 5. таймер: каждую секунду ---------- */
  useEffect(() => {
    const timer = setInterval(() => {
      const current = gameRef.current;
      if (!current || current.winner) return;

      const left = Math.max(0, Math.ceil((phaseEndsAt.current - Date.now()) / 1000));
      setSecondsLeft(left);

      // время не вышло, фазу уже закрываем или недавно была ошибка — ждём
      const key = `${current.round}-${current.phase}`;
      if (left > 0 || finishedPhase.current === key || Date.now() < retryPhaseAt.current) return;
      finishedPhase.current = key;

      const currentUser = userRef.current;

      // демо: сами двигаем игру
      if (isDemo) {
        const myPlayer = findMe(current, currentUser?.id, currentUser?.username);
        setGame(advanceDemoGame(current, myPlayer, sentTarget.current));
        return;
      }

      // настоящая игра: фазу переключает только создатель комнаты
      const isOwner = currentUser?.id !== undefined && currentUser.id === current.ownerUserId;
      if (isOwner) {
        switchPhase(current).catch((error: Error) => {
          // показываем ошибку один раз за фазу, пробуем снова через 3 секунды
          if (phaseErrorShown.current !== key) showToast(error.message, "error");
          phaseErrorShown.current = key;
          retryPhaseAt.current = Date.now() + RETRY_PHASE_MS;
          finishedPhase.current = "";
        });
      }
    }, 1000);

    /*
      Перед переключением ещё раз спрашиваем сервер: вдруг фаза уже сменилась
      (сервер сам переключил или пришло по WebSocket). Иначе можно проскочить фазу.
    */
    async function switchPhase(current: GameState) {
      const fresh = await api.getGame(current.id);
      if (fresh.round === current.round && fresh.phase === current.phase && !fresh.winner) {
        await api.nextPhase(current.id, current.phase);
        await loadGame();
      } else {
        setGame(fresh);
      }
    }

    return () => clearInterval(timer);
  }, [isDemo, loadGame]);

  /* ---------- 6. отправить мой выбор ---------- */
  async function handleConfirm() {
    if (!game || !me || selectedId === null) return;
    const target = game.players.find((player) => player.id === selectedId);

    try {
      // результат проверки комиссара: с сервера (is_mafia), в демо — считаем сами
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

      // комиссар сразу узнаёт результат
      if (game.phase === "NIGHT" && me.role === "commissar" && target) {
        if (isMafia === null) setCheckResult(`Проверка ${target.username} отправлена.`);
        else setCheckResult(isMafia ? `${target.username} — мафия!` : `${target.username} — не мафия.`);
      }
    } catch (error) {
      showToast((error as Error).message, "error");
    }
  }

  /* =============================================================
     ОТРИСОВКА
     ============================================================= */

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

  // чью роль видно
  function canSeeRole(player: GamePlayer): boolean {
    if (!player.role) return false; // backend скрыл роль
    if (isGameOver || !player.isAlive) return true;
    if (player.id === me?.id) return true;
    return me?.role === "mafia" && player.role === "mafia"; // мафия видит своих
  }

  // что показать в центре — зависит от фазы и моей роли
  function renderPhase() {
    if (!game) return null;

    // общие настройки для сетки игроков
    const common = {
      players: game.players,
      selectedId,
      meId: me?.id ?? null,
      isSent,
      showRole: canSeeRole,
      onSelect: setSelectedId,
      onConfirm: handleConfirm,
    };

    /* ---- ночь ---- */
    if (game.phase === "NIGHT") {
      const role = me?.role;

      if (!iCanAct || role === "civilian" || !role) {
        return (
          <TargetPicker {...common} title="Город спит" subtitle="Мафия выбирает жертву. Дождитесь утра." selectableIds={[]} />
        );
      }

      // кого можно выбрать
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

    /* ---- день ---- */
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

    /* ---- голосование ---- */
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

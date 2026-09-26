"use client";

/*
  RoomPage — комната (лобби), адрес "/room/83491".
  Эту страницу видят ВСЕ игроки, которые зашли в комнату.

  Кто что может:
  - создатель комнаты: меняет настройки (игроки, роли, время) и начинает игру
  - остальные: смотрят и ждут

  Обновления: WebSocket присылает «что-то изменилось» → загружаем комнату.
  Запасной вариант — опрос сервера каждые 3 секунды (если WebSocket не работает).
  Если игра началась — все автоматически переходят на страницу игры.
*/
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { showToast } from "@/components/pages/widgets/toast/Toast";
import { api, isServerDown, type RoomFull } from "@/lib/api";
import { useCurrentUser } from "@/lib/auth";
import { getDemoRoom } from "@/lib/demo";
import { saveDemoSetup } from "@/lib/demo-game";
import { countRoles, DEFAULT_TIMES } from "@/lib/roles";
import { useLiveUpdates, WS_PATHS } from "@/lib/socket";

import InviteBox from "./invite-box/InviteBox";
import PlayersList from "./players-list/PlayersList";
import RoomHeader from "./room-header/RoomHeader";
import RoomSettings from "./room-settings/RoomSettings";
import "./room-page.scss";

const REFRESH_EVERY_MS = 3000; // без WebSocket
const REFRESH_LIVE_MS = 15000; // с WebSocket — только на всякий случай

export default function RoomPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const roomId = params.id;

  const { user, isLoaded } = useCurrentUser();
  const me = user?.username ?? "";

  const [room, setRoom] = useState<RoomFull | null>(null);
  const [isDemo, setIsDemo] = useState(false); // true = сервер не ответил, показываем демо

  // нет аккаунта и не гость → на регистрацию
  useEffect(() => {
    if (isLoaded && !user) router.replace("/register");
  }, [isLoaded, user, router]);

  // загрузить комнату; если игра уже идёт — перейти в игру
  const loadRoom = useCallback(async () => {
    const freshRoom = await api.getRoom(roomId);
    setRoom(freshRoom);

    if (freshRoom.status === "playing") {
      const gameId = await api.findGameForRoom(roomId);
      if (gameId) router.push(`/game/${gameId}`);
    }
  }, [roomId, router]);

  // первый заход: входим в комнату и загружаем её
  useEffect(() => {
    if (!me) return;

    async function enterRoom() {
      try {
        // у гостя нет id в базе — он может только смотреть
        const isGuest = !user?.id;
        if (!isGuest) await api.joinRoom(roomId);

        await loadRoom();

        if (isGuest) showToast("Гости только смотрят. Чтобы играть, создайте аккаунт.");
      } catch (error) {
        // сервер лежит — делаем демо-комнату
        if (isServerDown(error)) {
          setIsDemo(true);
          setRoom(makeDemoRoom(roomId, me));
          return;
        }
        // сервер ответил ошибкой (комнаты нет, она полная...) — говорим и уходим
        showToast((error as Error).message, "error");
        router.push("/");
      }
    }

    enterRoom();
  }, [roomId, me, user, loadRoom, router]);

  // живые обновления через WebSocket (в демо не подключаемся)
  const hasRoom = room !== null;
  const isLive = useLiveUpdates(!isDemo && hasRoom ? WS_PATHS.room(roomId) : null, () => {
    loadRoom().catch(() => {});
  });

  // запасной опрос сервера (редко, если WebSocket работает)
  useEffect(() => {
    if (isDemo || !hasRoom) return;

    const timer = setInterval(
      () => {
        if (!document.hidden) loadRoom().catch(() => {});
      },
      isLive ? REFRESH_LIVE_MS : REFRESH_EVERY_MS,
    );

    return () => clearInterval(timer);
  }, [isDemo, hasRoom, isLive, loadRoom]);

  if (!room) {
    return <p className="room-page-loading">Заходим в комнату…</p>;
  }

  // создатель: по id (настоящая комната) или по имени (демо)
  const isOwner = room.ownerId !== null ? room.ownerId === user?.id : room.owner === me;
  const myPlayer = room.players.find((player) => player.username === me);

  /* ---------- действия ---------- */

  // изменить настройки (только создатель): игроки, роли, время
  async function handleSettingsChange(changes: Partial<RoomFull>) {
    if (!room) return;
    const oldRoom = room;
    const updatedRoom: RoomFull = { ...room, ...changes };

    setRoom(updatedRoom); // сразу показываем новое значение
    if (isDemo) return;

    try {
      await api.saveRoomSettings(updatedRoom);
    } catch (error) {
      setRoom(oldRoom); // сервер отказал — возвращаем старое
      showToast((error as Error).message, "error");
    }
  }

  // «Я готов» — пока работает только в демо (в API нет такого поля)
  function handleReadyToggle() {
    if (!room || !myPlayer) return;
    const players = room.players.map((player) => (player.username === me ? { ...player, ready: !player.ready } : player));
    setRoom({ ...room, players });
  }

  // «Начать игру» (только создатель)
  async function handleStart() {
    if (!room) return;

    if (isDemo) {
      saveDemoSetup({
        roomId: room.id,
        players: room.players.map((player) => player.username),
        roles: room.roles,
        dayTime: room.day_time,
        nightTime: room.night_time,
      });
      router.push(`/game/demo-${room.id}`);
      return;
    }

    try {
      const { gameId } = await api.startGame(room.id);
      router.push(`/game/${gameId}`);
    } catch (error) {
      showToast((error as Error).message, "error");
    }
  }

  // выйти из комнаты
  function handleLeave() {
    if (!isDemo) api.leaveRoom(roomId).catch(() => {});
    router.push("/");
  }

  return (
    <div className="room-page">
      <RoomHeader room={room} onLeave={handleLeave} />

      <div className="room-page-grid">
        <PlayersList players={room.players} owner={room.owner} me={me} maxPlayers={room.max_players} />

        <RoomSettings
          room={room}
          isOwner={isOwner}
          isMeReady={myPlayer?.ready ?? false}
          onChange={handleSettingsChange}
          onReadyToggle={handleReadyToggle}
          onStart={handleStart}
        />

        <InviteBox roomId={room.id} roomName={room.name} />
      </div>
    </div>
  );
}

/*
  Демо-комната: если комнату создали в демо-режиме,
  её название и размер лежат в sessionStorage.
*/
function makeDemoRoom(roomId: string, me: string): RoomFull {
  const saved = sessionStorage.getItem(`demo_room_${roomId}`);

  if (saved) {
    const { name, maxPlayers } = JSON.parse(saved) as { name: string; maxPlayers: number };
    return {
      id: roomId,
      name,
      owner: me,
      ownerId: null,
      age: 16,
      max_players: maxPlayers,
      day_time: DEFAULT_TIMES.day,
      night_time: DEFAULT_TIMES.night,
      roles: countRoles(maxPlayers),
      status: "waiting",
      players: [{ username: me, ready: true }],
      readySupported: true,
    };
  }

  return getDemoRoom(roomId, me);
}

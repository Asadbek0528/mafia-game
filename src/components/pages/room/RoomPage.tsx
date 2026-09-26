"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { showToast } from "@/components/pages/widgets/toast/Toast";
import { api, ApiError, isServerDown, type RoomFull } from "@/lib/api";
import { getToken, rememberPageAfterLogin, useCurrentUser } from "@/lib/auth";
import { getDemoRoom } from "@/lib/demo";
import { saveDemoSetup } from "@/lib/demo-game";
import { countRoles, DEFAULT_TIMES } from "@/lib/roles";
import { useLiveUpdates, WS_PATHS } from "@/lib/socket";

import CloseRoomDialog from "./close-room-dialog/CloseRoomDialog";
import InviteBox from "./invite-box/InviteBox";
import PlayersList from "./players-list/PlayersList";
import RoomHeader from "./room-header/RoomHeader";
import RoomSettings from "./room-settings/RoomSettings";
import "./room-page.scss";

const REFRESH_EVERY_MS = 3000;
const REFRESH_LIVE_MS = 15000;
const OWNER_ALIVE_EVERY_MS = 20000;

export default function RoomPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const roomId = params.id;

  const { user, isLoaded } = useCurrentUser();
  const me = user?.username ?? "";

  const [room, setRoom] = useState<RoomFull | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [isCloseOpen, setIsCloseOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const isGone = useRef(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const joinTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isLoaded && !user) {
      rememberPageAfterLogin(`/room/${roomId}`);
      router.replace("/register");
    }
  }, [isLoaded, user, router, roomId]);

  const leaveClosedRoom = useCallback(
    (text: string) => {
      if (isGone.current) return;
      isGone.current = true;
      showToast(text);
      router.push("/");
    },
    [router],
  );

  const goToGame = useCallback(
    (knownGameId?: string | null) => {
      if (isGone.current) return;
      isGone.current = true;
      setIsJoining(true);

      if (knownGameId) {
        router.push(`/game/${knownGameId}`);
        return;
      }

      let tries = 0;
      const search = async () => {
        tries += 1;
        const gameId = await api.findGameForRoom(roomId).catch(() => null);
        if (gameId) {
          if (joinTimer.current) clearInterval(joinTimer.current);
          router.push(`/game/${gameId}`);
          return;
        }
        if (tries >= 40) {
          if (joinTimer.current) clearInterval(joinTimer.current);
          isGone.current = false;
          setIsJoining(false);
          showToast("Не нашли начатую игру. Попробуйте ещё раз.", "error");
        }
      };
      search();
      joinTimer.current = setInterval(search, 1000);
    },
    [roomId, router],
  );

  useEffect(() => {
    return () => {
      if (joinTimer.current) clearInterval(joinTimer.current);
    };
  }, []);

  const loadRoom = useCallback(async () => {
    if (isGone.current) return;

    let freshRoom: RoomFull;
    try {
      freshRoom = await api.getRoom(roomId);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        leaveClosedRoom("Комната закрыта.");
        return;
      }
      throw error;
    }

    if (freshRoom.status === "finished") {
      leaveClosedRoom("Комната закрыта.");
      return;
    }
    setRoom(freshRoom);

    if (freshRoom.status === "playing") {
      const gameId = await api.findGameForRoom(roomId);
      if (gameId) goToGame(gameId);
    }
  }, [roomId, leaveClosedRoom, goToGame]);

  useEffect(() => {
    if (!me) return;

    async function enterRoom() {
      try {
        const isGuest = !user?.id;
        if (!isGuest) await api.joinRoom(roomId);

        await loadRoom();

        if (isGuest) showToast("Гости только смотрят. Чтобы играть, создайте аккаунт.");
      } catch (error) {
        if (isServerDown(error)) {
          setIsDemo(true);
          setRoom(makeDemoRoom(roomId, me));
          return;
        }
        showToast((error as Error).message, "error");
        router.push("/");
      }
    }

    enterRoom();
  }, [roomId, me, user, loadRoom, router]);

  const hasRoom = room !== null;
  const { isLive, notify } = useLiveUpdates(!isDemo && hasRoom ? WS_PATHS.room(roomId) : null, (data) => {
    const type = (data as { type?: string } | null)?.type;
    if (type === "room-closed") {
      leaveClosedRoom("Создатель закрыл комнату.");
      return;
    }
    if (type === "game-started") {
      const gameId = (data as { gameId?: string | number } | null)?.gameId;
      goToGame(gameId !== undefined && gameId !== null ? String(gameId) : null);
      return;
    }
    loadRoom().catch(() => {});
  });

  useEffect(() => {
    if (isDemo || !hasRoom) return;

    const timer = setInterval(
      () => {
        if (!document.hidden) loadRoom().catch(() => {});
      },
      isLive ? REFRESH_LIVE_MS : REFRESH_EVERY_MS,
    );

    function handleVisible() {
      if (!document.hidden) loadRoom().catch(() => {});
    }
    document.addEventListener("visibilitychange", handleVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, [isDemo, hasRoom, isLive, loadRoom]);

  const isOwner = room ? (room.ownerId !== null ? room.ownerId === user?.id : room.owner === me) : false;
  const isWaiting = room?.status === "waiting";

  useEffect(() => {
    if (!isLive || !isOwner || !isWaiting || isDemo) return;

    const sendAlive = () => notify("owner-alive", { token: getToken() });
    sendAlive();
    const timer = setInterval(sendAlive, OWNER_ALIVE_EVERY_MS);
    return () => clearInterval(timer);
  }, [isLive, isOwner, isWaiting, isDemo, notify]);

  if (isJoining) {
    return (
      <div className="room-page-joining" role="status">
        <span className="room-page-spinner" />
        <p className="room-page-joining-title">Игра начинается</p>
        <p className="room-page-joining-text">Подключаемся к игре…</p>
      </div>
    );
  }

  if (!room) {
    return <p className="room-page-loading">Заходим в комнату…</p>;
  }

  const myPlayer = room.players.find((player) => player.username === me);

  async function handleSettingsChange(changes: Partial<RoomFull>) {
    if (!room) return;
    const oldRoom = room;
    const updatedRoom: RoomFull = { ...room, ...changes };

    setRoom(updatedRoom);
    if (isDemo) return;

    try {
      await api.saveRoomSettings(updatedRoom);
      notify();
    } catch (error) {
      setRoom(oldRoom);
      showToast((error as Error).message, "error");
    }
  }

  function handleReadyToggle() {
    if (!room || !myPlayer) return;
    const players = room.players.map((player) => (player.username === me ? { ...player, ready: !player.ready } : player));
    setRoom({ ...room, players });
  }

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

    if (isStarting) return;
    setIsStarting(true);
    try {
      const { gameId } = await api.startGame(room.id);
      notify("game-started", { gameId });
      goToGame(gameId);
    } catch (error) {
      setIsStarting(false);
      showToast(`Не удалось начать игру: ${(error as Error).message}`, "error");
    }
  }

  async function handleLeave() {
    if (isOwner && !isDemo && isWaiting) {
      setIsCloseOpen(true);
      return;
    }

    isGone.current = true;
    if (!isDemo) {
      await api.leaveRoom(roomId).catch(() => {});
      notify();
    }
    router.push("/");
  }

  async function handleCloseRoom() {
    if (isClosing) return;
    setIsClosing(true);
    isGone.current = true;

    try {
      await api.closeRoom(roomId);
      notify("room-closed");
      showToast("Комната удалена.", "success");
      router.push("/");
    } catch (error) {
      isGone.current = false;
      setIsClosing(false);
      setIsCloseOpen(false);
      showToast((error as Error).message, "error");
    }
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

      <CloseRoomDialog
        isOpen={isCloseOpen}
        playersCount={room.players.length}
        isClosing={isClosing}
        onClose={handleCloseRoom}
        onStay={() => setIsCloseOpen(false)}
      />
    </div>
  );
}

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

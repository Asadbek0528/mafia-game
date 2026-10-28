import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { api, type RoomShort } from "@/utils/api";
import { useCurrentUser } from "@/utils/auth";
import { DEMO_ROOMS } from "@/utils/demo";
import { useLiveUpdates, WS_PATHS } from "@/utils/socket";

const ROOMS_POLL_MS = 5000;
const ROOMS_STORAGE_KEY = "mafia_rooms_v1";

function readSavedRooms(): RoomShort[] | null {
  try {
    const saved = sessionStorage.getItem(ROOMS_STORAGE_KEY);
    return saved ? (JSON.parse(saved) as RoomShort[]) : null;
  } catch {
    return null;
  }
}

function isOpenRoom(room: RoomShort): boolean {
  return room.status === "waiting" && room.players < room.max_players;
}

export function useHomePage() {
  const router = useRouter();
  const { user, isLoaded } = useCurrentUser();

  const [rooms, setRooms] = useState<RoomShort[] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [myGame, setMyGame] = useState<{ gameId: string; roomName: string } | null>(null);

  useEffect(() => {
    if (isLoaded && !user) {
      router.replace("/register");
    }
  }, [isLoaded, user, router]);

  const roomsLoad = useRef<{ isLoading: boolean; again: boolean }>({ isLoading: false, again: false });
  const loadRooms = useCallback(async () => {
    const state = roomsLoad.current;
    if (state.isLoading) {
      state.again = true;
      return;
    }
    state.isLoading = true;
    do {
      state.again = false;
      const fresh = await api.getRooms().catch(() => null);
      setRooms((old) => fresh ?? old ?? DEMO_ROOMS);
      if (fresh) {
        try {
          sessionStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(fresh));
        } catch {
        }
      }
    } while (state.again);
    state.isLoading = false;
  }, []);

  const [hasLobby, setHasLobby] = useState(false);
  const { isLive } = useLiveUpdates(WS_PATHS.lobby, (data) => {
    const type = (data as { type?: string } | null)?.type;
    if (type === "lobby") setHasLobby(true);
    if (type === "rooms") loadRooms();
  });
  const isLobbyLive = isLive && hasLobby;

  useEffect(() => {
    if (!isLive) setHasLobby(false);
  }, [isLive]);

  useEffect(() => {
    const saved = readSavedRooms();
    if (saved) setRooms((old) => old ?? saved);
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms, isLobbyLive]);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (!document.hidden) loadRooms();
    };
    const timer = isLobbyLive ? null : setInterval(refreshIfVisible, ROOMS_POLL_MS);
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [isLobbyLive, loadRooms]);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let isStopped = false;
    const check = () =>
      api
        .findMyActiveGame()
        .then((game) => {
          if (!isStopped) setMyGame(game);
        })
        .catch(() => {});
    check();
    const timer = setInterval(check, 15000);
    return () => {
      isStopped = true;
      clearInterval(timer);
    };
  }, [userId]);

  function handleQuickPlay() {
    const freeRoom = rooms?.find(isOpenRoom);

    if (freeRoom) {
      router.push(`/room/${freeRoom.id}`);
    } else {
      setIsModalOpen(true);
    }
  }

  return {
    isReady: isLoaded && Boolean(user),
    rooms,
    myGame,
    openRooms: rooms ? rooms.filter(isOpenRoom).length : null,
    isModalOpen,
    openModal: () => setIsModalOpen(true),
    closeModal: () => setIsModalOpen(false),
    handleQuickPlay,
  };
}

"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { showToast } from "@/components/pages/widgets/toast/Toast";

import { api as backendApi, ApiError, type PublicUser, SESSION_EXPIRED_EVENT, type User } from "./api";
import { getUser, logout, rememberPageAfterLogin } from "./auth";
import { useLiveUpdates } from "./socket";

export type FriendStatus = "online" | "room" | "game" | "offline";

export type FriendInfo = {
  id: number;
  username: string;
  online: boolean;
  status: FriendStatus;
  roomId: string | null;
};

export type FriendRequest = { id: number; username: string };

type Presence = { id: number; online: boolean; status: FriendStatus; roomId: string | null };

export type RoomInvite = {
  key: string;
  from: FriendRequest;
  roomId: string;
  roomName: string;
};

type SocialNotice =
  | { key: string; kind: "invite"; invite: RoomInvite }
  | { key: string; kind: "request"; from: FriendRequest }
  | { key: string; kind: "text"; text: string };

type SocialApi = {
  isReady: boolean;
  myId: number | null;
  friends: FriendInfo[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  notices: SocialNotice[];
  dismiss: (key: string) => void;
  sendRequest: (id: number, username: string) => void;
  accept: (id: number) => void;
  decline: (id: number) => void;
  cancel: (id: number) => void;
  remove: (id: number) => void;
  invite: (id: number, roomId: string, roomName: string) => void;
};

const EMPTY: SocialApi = {
  isReady: false,
  myId: null,
  friends: [],
  incoming: [],
  outgoing: [],
  notices: [],
  dismiss: () => {},
  sendRequest: () => {},
  accept: () => {},
  decline: () => {},
  cancel: () => {},
  remove: () => {},
  invite: () => {},
};

const SocialContext = createContext<SocialApi>(EMPTY);

export function useSocial(): SocialApi {
  return useContext(SocialContext);
}

const STATUS_ORDER: Record<FriendStatus, number> = { room: 0, game: 1, online: 2, offline: 3 };

export function statusText(friend: FriendInfo): string {
  if (friend.status === "room") return "В комнате";
  if (friend.status === "game") return "В игре";
  if (friend.status === "online") return "В сети";
  return "Не в сети";
}

let noticeCounter = 0;
const nextKey = () => `${Date.now()}-${(noticeCounter += 1)}`;

export function SocialProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const isExpiring = useRef(false);

  useEffect(() => {
    function handleExpired() {
      if (isExpiring.current || window.location.pathname.startsWith("/register")) return;
      isExpiring.current = true;
      rememberPageAfterLogin(window.location.pathname);
      logout();
      showToast("Сессия истекла — войдите снова, и вы вернётесь туда, где были.", "error");
      router.replace("/register");
      setTimeout(() => {
        isExpiring.current = false;
      }, 3000);
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
  }, [router]);

  const [list, setList] = useState<PublicUser[]>([]);
  const [isListLoaded, setIsListLoaded] = useState(false);
  const [presence, setPresence] = useState<Record<number, Presence>>({});
  const [notices, setNotices] = useState<SocialNotice[]>([]);
  const listRef = useRef(list);

  useEffect(() => {
    listRef.current = list;
  }, [list]);

  useEffect(() => {
    const user = getUser();
    setMe((old) => (old?.id === user?.id && old?.username === user?.username ? old : user));
  }, [pathname]);

  const myId = me && !me.guest && me.id ? me.id : null;

  const checkedUser = useRef<number | null>(null);
  useEffect(() => {
    if (!myId || checkedUser.current === myId) return;
    checkedUser.current = myId;
    const signOut = (text: string) => {
      if (window.location.pathname.startsWith("/register")) return;
      rememberPageAfterLogin(window.location.pathname);
      logout();
      showToast(text, "error");
      router.replace("/register");
    };
    backendApi
      .getPublicUser(myId)
      .then((account) => {
        const savedName = getUser()?.username;
        if (savedName && account.username !== savedName) {
          signOut(`Вход устарел: на сервере этот аккаунт теперь «${account.username}». Войдите снова.`);
        }
      })
      .catch((error: unknown) => {
        if (!(error instanceof ApiError) || error.status !== 404) return;
        signOut("Сервер обновился, и вашего аккаунта на нём нет. Зарегистрируйтесь заново.");
      });
  }, [myId, router]);

  const loadFriends = useCallback(async () => {
    if (!myId) return;
    try {
      setList(await backendApi.getFriends());
    } catch {
      // оставляем старый список, попробуем в следующий раз
    } finally {
      setIsListLoaded(true);
    }
  }, [myId]);

  useEffect(() => {
    if (!myId) {
      setList([]);
      setIsListLoaded(false);
      setPresence({});
      return;
    }
    loadFriends();
  }, [myId, loadFriends]);

  const addNotice = useCallback((notice: SocialNotice) => {
    setNotices((old) => [...old.filter((item) => item.key !== notice.key), notice].slice(-4));
  }, []);

  const { isLive, notify } = useLiveUpdates(myId ? `/ws/user/${myId}` : null, (data) => {
    const message = data as Record<string, unknown> | null;
    if (!message || typeof message.type !== "string") return;

    if (message.type === "presence" && Array.isArray(message.friends)) {
      const next: Record<number, Presence> = {};
      for (const item of message.friends as Presence[]) if (typeof item?.id === "number") next[item.id] = item;
      setPresence(next);
      return;
    }

    if (message.type === "friend-added") {
      const from = message.from as FriendRequest;
      loadFriends();
      if (!listRef.current.some((friend) => friend.id === from.id)) {
        addNotice({ key: `request-${from.id}`, kind: "request", from });
      }
      return;
    }

    if (message.type === "friend-removed") {
      loadFriends();
      return;
    }

    if (message.type === "invite") {
      const invite: RoomInvite = {
        key: `invite-${(message.from as FriendRequest).id}-${String(message.roomId)}`,
        from: message.from as FriendRequest,
        roomId: String(message.roomId),
        roomName: String(message.roomName ?? ""),
      };
      addNotice({ key: invite.key, kind: "invite", invite });
      if ("vibrate" in navigator && navigator.userActivation?.hasBeenActive) navigator.vibrate?.(200);
      return;
    }

    if (message.type === "invite-sent" && message.online === false) {
      addNotice({ key: nextKey(), kind: "text", text: "Друг сейчас не в сети — приглашение не дошло" });
    }
  });

  const friendIds = useMemo(() => list.map((friend) => friend.id).join(","), [list]);

  useEffect(() => {
    if (isLive && me?.username) notify("identify", { username: me.username });
  }, [isLive, me?.username, notify]);

  useEffect(() => {
    if (!isLive) return;
    notify("watch", { ids: friendIds ? friendIds.split(",").map(Number) : [] });
  }, [isLive, friendIds, notify]);

  useEffect(() => {
    if (!isLive) return;
    const room = pathname.match(/^\/room\/(\d+)/);
    const status = pathname.startsWith("/game/") ? "game" : room ? "room" : "online";
    notify("status", { status, roomId: room?.[1] ?? null });
  }, [isLive, pathname, notify]);

  const friends = useMemo<FriendInfo[]>(
    () =>
      list
        .map((friend) => {
          const info = presence[friend.id];
          const online = info?.online === true;
          return {
            id: friend.id,
            username: friend.username,
            online,
            status: online ? (info?.status ?? "online") : ("offline" as FriendStatus),
            roomId: online ? (info?.roomId ?? null) : null,
          };
        })
        .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.username.localeCompare(b.username)),
    [list, presence],
  );

  const dismiss = useCallback((key: string) => {
    setNotices((old) => old.filter((item) => item.key !== key));
  }, []);

  const addFriend = useCallback(
    async (id: number) => {
      dismiss(`request-${id}`);
      if (listRef.current.some((friend) => friend.id === id)) return;
      try {
        await backendApi.addFriend(id);
        await loadFriends();
        notify("friend-added", { to: id });
        showToast("Друг добавлен.", "success");
      } catch (error) {
        showToast((error as Error).message, "error");
      }
    },
    [dismiss, loadFriends, notify],
  );

  const removeFriend = useCallback(
    async (id: number) => {
      try {
        await backendApi.removeFriend(id);
        await loadFriends();
        notify("friend-removed", { to: id });
      } catch (error) {
        showToast((error as Error).message, "error");
      }
    },
    [loadFriends, notify],
  );

  const api = useMemo<SocialApi>(
    () => ({
      isReady: myId !== null && isListLoaded,
      myId,
      friends,
      incoming: [],
      outgoing: [],
      notices,
      dismiss,
      sendRequest: (id) => {
        addFriend(id);
      },
      accept: (id) => {
        addFriend(id);
      },
      decline: (id) => dismiss(`request-${id}`),
      cancel: (id) => {
        removeFriend(id);
      },
      remove: (id) => {
        removeFriend(id);
      },
      invite: (id, roomId, roomName) => notify("invite", { to: id, roomId, roomName }),
    }),
    [myId, isListLoaded, friends, notices, dismiss, addFriend, removeFriend, notify],
  );

  return <SocialContext.Provider value={api}>{children}</SocialContext.Provider>;
}

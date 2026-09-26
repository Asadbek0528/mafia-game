"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { User } from "./api";
import { getUser } from "./auth";
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
  outgoing: number[];
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
  const [me, setMe] = useState<User | null>(null);
  const [friends, setFriends] = useState<FriendInfo[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<number[]>([]);
  const [notices, setNotices] = useState<SocialNotice[]>([]);

  useEffect(() => {
    const user = getUser();
    setMe((old) => (old?.id === user?.id && old?.username === user?.username ? old : user));
  }, [pathname]);

  const myId = me && !me.guest && me.id ? me.id : null;

  const addNotice = useCallback((notice: SocialNotice) => {
    setNotices((old) => [...old.filter((item) => item.key !== notice.key), notice].slice(-4));
  }, []);

  const { isLive, notify } = useLiveUpdates(myId ? `/ws/user/${myId}` : null, (data) => {
    const message = data as Record<string, unknown> | null;
    if (!message || typeof message.type !== "string") return;

    if (message.type === "social-state") {
      const list = (message.friends as FriendInfo[]) ?? [];
      setFriends([...list].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.username.localeCompare(b.username)));
      setIncoming((message.incoming as FriendRequest[]) ?? []);
      setOutgoing((message.outgoing as number[]) ?? []);
      return;
    }

    if (message.type === "friend-request") {
      const from = message.from as FriendRequest;
      addNotice({ key: `request-${from.id}`, kind: "request", from });
      return;
    }

    if (message.type === "friend-accepted") {
      const by = message.by as FriendRequest;
      addNotice({ key: nextKey(), kind: "text", text: `${by.username} принял(а) вашу заявку в друзья` });
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
      if ("vibrate" in navigator) navigator.vibrate?.(200);
      return;
    }

    if (message.type === "invite-sent" && message.online === false) {
      addNotice({ key: nextKey(), kind: "text", text: "Друг сейчас не в сети — приглашение не дошло" });
    }
  });

  useEffect(() => {
    if (isLive && me?.username) notify("identify", { username: me.username });
  }, [isLive, me?.username, notify]);

  useEffect(() => {
    if (!isLive) return;
    const room = pathname.match(/^\/room\/(\d+)/);
    const status = pathname.startsWith("/game/") ? "game" : room ? "room" : "online";
    notify("status", { status, roomId: room?.[1] ?? null });
  }, [isLive, pathname, notify]);

  useEffect(() => {
    if (!myId) {
      setFriends([]);
      setIncoming([]);
      setOutgoing([]);
    }
  }, [myId]);

  const dismiss = useCallback((key: string) => {
    setNotices((old) => old.filter((item) => item.key !== key));
  }, []);

  const api = useMemo<SocialApi>(
    () => ({
      isReady: isLive,
      myId,
      friends,
      incoming,
      outgoing,
      notices,
      dismiss,
      sendRequest: (id, username) => notify("friend-request", { to: id, toName: username }),
      accept: (id) => {
        notify("friend-accept", { to: id });
        dismiss(`request-${id}`);
      },
      decline: (id) => {
        notify("friend-decline", { to: id });
        dismiss(`request-${id}`);
      },
      cancel: (id) => notify("friend-cancel", { to: id }),
      remove: (id) => notify("friend-remove", { to: id }),
      invite: (id, roomId, roomName) => notify("invite", { to: id, roomId, roomName }),
    }),
    [isLive, myId, friends, incoming, outgoing, notices, dismiss, notify],
  );

  return <SocialContext.Provider value={api}>{children}</SocialContext.Provider>;
}

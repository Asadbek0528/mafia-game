import { useCallback, useEffect, useState } from "react";

import { getUser } from "./auth";

export type Friend = { id: number; username: string };

const EVENT_NAME = "mafia-friends";

function storageKey(): string | null {
  const me = getUser();
  return me?.id ? `mafia_friends_${me.id}` : null;
}

export function getFriends(): Friend[] {
  const key = storageKey();
  if (!key) return [];
  try {
    const list = JSON.parse(localStorage.getItem(key) ?? "[]") as Friend[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveFriends(friends: Friend[]) {
  const key = storageKey();
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(friends));
  } catch {
    return;
  }
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function addFriend(friend: Friend) {
  const friends = getFriends().filter((item) => item.id !== friend.id);
  saveFriends([...friends, friend]);
}

export function removeFriend(id: number) {
  saveFriends(getFriends().filter((item) => item.id !== id));
}

export function useFriends() {
  const [friends, setFriends] = useState<Friend[]>([]);

  const refresh = useCallback(() => setFriends(getFriends()), []);

  useEffect(() => {
    refresh();
    window.addEventListener(EVENT_NAME, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT_NAME, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  return friends;
}

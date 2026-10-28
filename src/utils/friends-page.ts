import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useCallback, useEffect, useState } from "react";

import { showToast } from "@/utils/toast";
import { api, type PublicUser } from "@/utils/api";
import { useRequiredUser } from "@/utils/auth";
import { fromPlayerId, toPlayerId } from "@/utils/player-id";
import { copyText } from "@/utils/share";
import { type FriendInfo, useSocial } from "@/utils/social";

export type FriendsTab = "friends" | "requests" | "search";

export const SHUFFLE_MS = 1200;
export const SUGGESTED_COUNT = 10;

export function useFriendsPage() {
  const { user } = useRequiredUser();
  const social = useSocial();
  const [tab, setTab] = useState<FriendsTab>("friends");

  return {
    user,
    tab,
    setTab,
    findFriends: () => setTab("search"),
    isReady: social.isReady,
    total: social.friends.length,
    online: social.friends.filter((friend) => friend.online).length,
    requests: social.incoming.length,
  };
}

export async function copyMyId(id: number) {
  const playerId = toPlayerId(id);
  if (await copyText(playerId)) showToast(`ID ${playerId} скопирован — отправьте его другу.`, "success");
  else showToast(`Ваш ID: ${playerId}`);
}

export function useFriendsList() {
  const social = useSocial();
  const router = useRouter();

  function removeFriend(friend: FriendInfo) {
    if (!window.confirm(`Удалить ${friend.username} из друзей?`)) return;
    social.remove(friend.id);
    showToast(`${friend.username} удалён из друзей.`);
  }

  return {
    friends: social.friends,
    removeFriend,
    goToRoom: (roomId: string) => router.push(`/room/${roomId}`),
  };
}

export type PlayerRelation = "me" | "friend" | "incoming" | "outgoing" | "none";

export function usePlayerAction(player: PublicUser, myId: number | null) {
  const social = useSocial();

  let relation: PlayerRelation = "none";
  if (player.id === myId) relation = "me";
  else if (social.friends.some((friend) => friend.id === player.id)) relation = "friend";
  else if (social.incoming.some((item) => item.id === player.id)) relation = "incoming";
  else if (social.outgoing.some((item) => item.id === player.id)) relation = "outgoing";

  return {
    relation,
    isReady: social.isReady,
    accept: () => social.accept(player.id),
    cancel: () => social.cancel(player.id),
    send: () => social.sendRequest(player.id, player.username),
  };
}

export function useSearchPlayers(myId: number | null) {
  const social = useSocial();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicUser[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [suggested, setSuggested] = useState<PublicUser[] | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);

  const friendIds = social.friends.map((friend) => friend.id).join(",");
  const loadSuggested = useCallback(
    async (minMs = 0) => {
      setIsShuffling(true);
      const pause = new Promise((resolve) => setTimeout(resolve, minMs));
      try {
        const exclude = friendIds ? friendIds.split(",").map(Number) : [];
        if (myId) exclude.push(myId);
        const players = await api.getSuggestedPlayers(exclude, SUGGESTED_COUNT);
        await pause;
        setSuggested(players);
      } catch {
        await pause;
        setSuggested([]);
      } finally {
        setIsShuffling(false);
      }
    },
    [myId],
  );

  useEffect(() => {
    loadSuggested();
  }, [loadSuggested]);

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    const text = query.trim();
    if (!text) return;

    setIsSearching(true);
    try {
      const digits = text.replace(/\s/g, "");
      if (/^\d{7,8}$/.test(digits)) {
        const userId = fromPlayerId(digits);
        const player = userId ? await api.getPublicUser(userId).catch(() => null) : null;
        setResults(player ? [player] : []);
      } else {
        setResults(await api.searchUsers(text));
      }
    } catch (error) {
      showToast((error as Error).message, "error");
    } finally {
      setIsSearching(false);
    }
  }

  function handleQueryChange(event: ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
    if (!event.target.value.trim()) setResults(null);
  }

  return {
    query,
    results,
    isSearching,
    suggested,
    isShuffling,
    handleSearch,
    handleQueryChange,
    shuffle: () => loadSuggested(SHUFFLE_MS),
  };
}

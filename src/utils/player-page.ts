import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { showToast } from "@/utils/toast";
import { api, type PublicUser } from "@/utils/api";
import { useRequiredUser } from "@/utils/auth";
import { formatPlayerId, fromPlayerId } from "@/utils/player-id";
import { copyText } from "@/utils/share";
import { statusText, useSocial } from "@/utils/social";

export function usePlayerPage() {
  const params = useParams<{ id: string }>();
  const playerId = params.id;
  const userId = fromPlayerId(playerId);

  const { user } = useRequiredUser(`/player/${playerId}`);
  const social = useSocial();
  const [player, setPlayer] = useState<PublicUser | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    if (!userId) {
      setError("Такого ID нет. Проверьте цифры.");
      return;
    }
    api
      .getPublicUser(userId)
      .then(setPlayer)
      .catch(() => setError("Игрок с таким ID не найден."));
  }, [user, userId]);

  const friend = player ? social.friends.find((item) => item.id === player.id) : undefined;

  async function copyId() {
    if (await copyText(playerId)) showToast("ID скопирован.", "success");
    else showToast(`ID игрока: ${playerId}`);
  }

  function handleFriendButton() {
    if (!player) return;
    if (friend) {
      if (!window.confirm(`Удалить ${player.username} из друзей?`)) return;
      social.remove(player.id);
      showToast(`${player.username} удалён из друзей.`);
    } else {
      social.sendRequest(player.id, player.username);
    }
  }

  return {
    user,
    error,
    player: player && userId ? player : null,
    shownId: formatPlayerId(playerId),
    isMe: Boolean(user && player && user.id === player.id),
    canAddFriend: Boolean(user && !user.guest),
    friend,
    friendStatus: friend ? statusText(friend) : "",
    isSocialReady: social.isReady,
    friendLabel: !social.isReady ? "Подключаемся…" : friend ? "В друзьях ✓" : "Добавить в друзья",
    copyId,
    handleFriendButton,
  };
}

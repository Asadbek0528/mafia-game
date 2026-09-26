"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import ProfileStats from "@/components/pages/profile/profile-stats/ProfileStats";
import Avatar from "@/components/pages/widgets/avatar/Avatar";
import GameHistory from "@/components/pages/widgets/game-history/GameHistory";
import { showToast } from "@/components/pages/widgets/toast/Toast";
import { api, type PublicUser } from "@/lib/api";
import { rememberPageAfterLogin, useCurrentUser } from "@/lib/auth";
import { addFriend, removeFriend, useFriends } from "@/lib/friends";
import { formatPlayerId, fromPlayerId } from "@/lib/player-id";
import { copyText } from "@/lib/share";
import "./player-page.scss";

export default function PlayerPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const playerId = params.id;
  const userId = fromPlayerId(playerId);

  const { user, isLoaded } = useCurrentUser();
  const friends = useFriends();
  const [player, setPlayer] = useState<PublicUser | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoaded && !user) {
      rememberPageAfterLogin(`/player/${playerId}`);
      router.replace("/register");
    }
  }, [isLoaded, user, router, playerId]);

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

  if (!user) return null;

  if (error) {
    return (
      <main className="player-page">
        <section className="panel player-page-error">
          <p>{error}</p>
          <Link href="/profile" className="btn btn-dark btn-small">
            Назад в профиль
          </Link>
        </section>
      </main>
    );
  }

  if (!player || !userId) {
    return (
      <main className="player-page">
        <p className="player-page-loading">Загружаем игрока…</p>
      </main>
    );
  }

  const isMe = user.id === player.id;
  const isFriend = friends.some((friend) => friend.id === player.id);

  async function copyId() {
    if (await copyText(playerId)) showToast("ID скопирован.", "success");
    else showToast(`ID игрока: ${playerId}`);
  }

  function toggleFriend() {
    if (!player) return;
    if (isFriend) {
      removeFriend(player.id);
      showToast(`${player.username} удалён из друзей.`);
    } else {
      addFriend({ id: player.id, username: player.username });
      showToast(`${player.username} добавлен в друзья.`, "success");
    }
  }

  return (
    <main className="player-page">
      <Link href="/profile" className="player-page-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" />
        </svg>
        Мой профиль
      </Link>

      <section className="panel player-page-card">
        <Avatar name={player.username} image={player.profileImage} size={80} />

        <div className="player-page-info">
          <h1 className="player-page-name">{player.username}</h1>
          <button type="button" className="player-page-id" onClick={copyId} title="Скопировать ID">
            ID <b>{formatPlayerId(playerId)}</b>
          </button>
        </div>

        {isMe ? (
          <Link href="/profile" className="btn btn-dark btn-small">
            Это вы
          </Link>
        ) : (
          !user.guest && (
            <button type="button" className={isFriend ? "btn btn-dark btn-small" : "btn btn-red btn-small"} onClick={toggleFriend}>
              {isFriend ? "В друзьях ✓" : "Добавить в друзья"}
            </button>
          )
        )}
      </section>

      <div className="player-page-grid">
        <ProfileStats userId={player.id} />
        <GameHistory userId={player.id} limit={20} />
      </div>
    </main>
  );
}

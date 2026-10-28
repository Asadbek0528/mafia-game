"use client";

import Link from "next/link";

import ProfileStats from "@/components/pages/profile/profile-stats/ProfileStats";
import Avatar from "@/components/pages/widgets/avatar/Avatar";
import AchievementsPanel from "@/components/pages/widgets/achievements/AchievementsPanel";
import GameHistory from "@/components/pages/widgets/game-history/GameHistory";
import { usePlayerPage } from "@/utils/player-page";
import "./player-page.scss";

export default function PlayerPage() {
  const { user, error, player, shownId, isMe, canAddFriend, friend, friendStatus, isSocialReady, friendLabel, copyId, handleFriendButton } = usePlayerPage();

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

  if (!player) {
    return (
      <main className="player-page">
        <p className="player-page-loading">Загружаем игрока…</p>
      </main>
    );
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
            ID <b>{shownId}</b>
          </button>
          {friend && (
            <p className={friend.online ? "player-page-status player-page-status-online" : "player-page-status"}>
              <span />
              {friendStatus}
            </p>
          )}
        </div>

        {isMe ? (
          <Link href="/profile" className="btn btn-dark btn-small">
            Это вы
          </Link>
        ) : (
          canAddFriend && (
            <button
              type="button"
              className={friend ? "btn btn-dark btn-small" : "btn btn-red btn-small"}
              onClick={handleFriendButton}
              disabled={!isSocialReady}
              title={isSocialReady ? undefined : "Нет связи с сервером"}
            >
              {friendLabel}
            </button>
          )
        )}
      </section>

      <div className="player-page-grid">
        <ProfileStats userId={player.id} />
        <AchievementsPanel userId={player.id} />
        <GameHistory userId={player.id} limit={20} />
      </div>
    </main>
  );
}

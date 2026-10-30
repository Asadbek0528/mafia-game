"use client";

import Link from "next/link";

import Avatar from "@/components/pages/widgets/avatar/Avatar";
import AvatarPicker from "@/components/pages/widgets/avatar-picker/AvatarPicker";
import CoinIcon from "@/components/pages/widgets/coin-icon/CoinIcon";
import PlayerBackground from "@/components/pages/widgets/player-background/PlayerBackground";
import { useProfileCard } from "@/utils/widgets/profile-card";
import "./profile-card.scss";

export default function ProfileCard({ showStats = true }: { showStats?: boolean }) {
  const { user, shownId, canPickPhoto, equipped, background, coinsText, coinsWord, shields, editHref, games, wins, winRate, copyId, savePhoto, handleLogout } = useProfileCard();

  if (!user) {
    return <section className="panel profile-card" aria-busy="true" />;
  }

  return (
    <section className={equipped ? "panel profile-card profile-card-skin" : "panel profile-card"}>
      <PlayerBackground id={background} />

      <div className="profile-card-top">
        {!canPickPhoto ? (
          <Avatar name={user.username} image={user.profile_image} size={64} />
        ) : (
          <AvatarPicker name={user.username} image={user.profile_image} size={64} onPick={savePhoto} />
        )}

        <div className="profile-card-info">
          <p className="profile-card-name">{user.username}</p>
          {shownId ? (
            <button type="button" className="profile-card-id" onClick={copyId} title="Скопировать ID">
              ID <b>{shownId}</b>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <rect x="9" y="9" width="11" height="11" rx="2" />
                <path d="M5 15V5a1 1 0 0 1 1-1h9" />
              </svg>
            </button>
          ) : (
            <p className="profile-card-status">
              <span className="status-dot" />
              Гость
            </p>
          )}
        </div>

        {!user.guest && (
          <Link href={editHref} className="profile-card-action" title="Редактировать профиль" aria-label="Редактировать профиль">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
              <path d="m13.5 6.5 4 4" />
            </svg>
          </Link>
        )}

        <button className="profile-card-action" onClick={handleLogout} title="Выйти" aria-label="Выйти">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M16 16l4-4-4-4M20 12H9" />
          </svg>
        </button>
      </div>

      {!user.guest && (
        <div className="profile-card-wallet">
          <Link href="/shop" className="profile-card-coins" title="Магазин">
            <CoinIcon />
            <b>{coinsText}</b>
            <span>{coinsWord}</span>
            {shields > 0 && (
              <i title="Щитов в запасе">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 2.5 4 5.5v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10v-6l-8-3Z" />
                </svg>
                {shields}
              </i>
            )}
            <em>Магазин →</em>
          </Link>
          <Link href="/profile/edit#appearance" className="profile-card-skin-button" title="Сменить фон профиля" aria-label="Сменить фон профиля">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.7-.8 1.7-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.7-1.7H16a5 5 0 0 0 5-5c0-4-4-7.2-9-7.2Z" />
              <circle cx="7.5" cy="11" r="1.2" />
              <circle cx="10.5" cy="7" r="1.2" />
              <circle cx="15" cy="7.5" r="1.2" />
            </svg>
          </Link>
        </div>
      )}

      {showStats && (
        <dl className="profile-card-stats">
          <div>
            <dt>Игр</dt>
            <dd>{games}</dd>
          </div>
          <div>
            <dt>Побед</dt>
            <dd>{wins}</dd>
          </div>
          <div>
            <dt>% побед</dt>
            <dd>{winRate}%</dd>
          </div>
        </dl>
      )}

      {user.guest && (
        <Link href="/register" className="btn btn-red btn-small btn-full profile-card-register">
          Создать аккаунт
        </Link>
      )}
    </section>
  );
}

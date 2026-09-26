"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Avatar from "@/components/pages/widgets/avatar/Avatar";
import { api, type User } from "@/lib/api";
import { getRefreshToken, getToken, logout, saveLogin, useCurrentUser } from "@/lib/auth";
import { formatPlayerId, toPlayerId } from "@/lib/player-id";
import { copyText } from "@/lib/share";
import { showToast } from "@/components/pages/widgets/toast/Toast";
import "./profile-card.scss";

export default function ProfileCard() {
  const router = useRouter();
  const { user: savedUser } = useCurrentUser();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!savedUser) return;
    setUser(savedUser);

    const token = getToken();
    if (!token || !savedUser.id) return;

    api
      .getMe()
      .then((freshUser) => {
        setUser(freshUser);
        saveLogin(freshUser, token, getRefreshToken());
      })
      .catch(() => {
      });
  }, [savedUser]);

  async function copyId() {
    if (!user?.id) return;
    const playerId = toPlayerId(user.id);
    if (await copyText(playerId)) showToast(`ID ${playerId} скопирован — отправьте его другу.`, "success");
    else showToast(`Ваш ID: ${playerId}`);
  }

  async function handleLogout() {
    await api.logout();
    logout();
    router.push("/register");
  }

  if (!user) {
    return <section className="panel profile-card" aria-busy="true" />;
  }

  const games = user.games_played ?? 0;
  const wins = user.wins ?? 0;
  const winRate = games > 0 ? Math.round((wins / games) * 100) : 0;

  return (
    <section className="panel profile-card">
      <div className="profile-card-top">
        <Avatar name={user.username} image={user.profile_image} size={64} />

        <div className="profile-card-info">
          <p className="profile-card-name">{user.username}</p>
          <p className="profile-card-status">
            <span className="status-dot" />
            {user.guest ? "Гость" : "В сети"}
          </p>
        </div>

        {!user.guest && (
          <Link href="/profile/edit" className="profile-card-logout" title="Редактировать профиль" aria-label="Редактировать профиль">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
              <path d="m13.5 6.5 4 4" />
            </svg>
          </Link>
        )}

        <button className="profile-card-logout" onClick={handleLogout} title="Выйти" aria-label="Выйти">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />
          </svg>
        </button>
      </div>

      {user.id && (
        <button type="button" className="profile-card-id" onClick={copyId} title="Скопировать ID">
          <span>ID</span>
          <b>{formatPlayerId(toPlayerId(user.id))}</b>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V5a1 1 0 0 1 1-1h9" />
          </svg>
        </button>
      )}

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
          <dt>Процент</dt>
          <dd>{winRate}%</dd>
        </div>
      </dl>

      {user.guest && (
        <Link href="/register" className="btn btn-red btn-small btn-full profile-card-register">
          Создать аккаунт
        </Link>
      )}
    </section>
  );
}

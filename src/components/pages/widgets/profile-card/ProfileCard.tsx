"use client";

/*
  ProfileCard — карточка игрока: аватар, имя, статистика.
  Если игрок вошёл по аккаунту — берём свежие данные с сервера (/users/me).
  Если это гость — показываем кнопку «Создать аккаунт».
*/
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Avatar from "@/components/pages/widgets/avatar/Avatar";
import { api, type User } from "@/lib/api";
import { getRefreshToken, getToken, logout, saveLogin, useCurrentUser } from "@/lib/auth";
import "./profile-card.scss";

export default function ProfileCard() {
  const router = useRouter();
  const { user: savedUser } = useCurrentUser();
  const [user, setUser] = useState<User | null>(null);

  // 1) сначала показываем то, что сохранено в браузере
  // 2) потом, если есть токен, обновляем с сервера
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
        // сервер не ответил — оставляем сохранённые данные
      });
  }, [savedUser]);

  async function handleLogout() {
    await api.logout(); // сообщаем серверу
    logout(); // чистим браузер
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

        <button className="profile-card-logout" onClick={handleLogout} title="Выйти" aria-label="Выйти">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />
          </svg>
        </button>
      </div>

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

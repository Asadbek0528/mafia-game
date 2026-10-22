"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Avatar from "@/components/pages/widgets/avatar/Avatar";
import AvatarPicker from "@/components/pages/widgets/avatar-picker/AvatarPicker";
import CoinIcon from "@/components/pages/widgets/coin-icon/CoinIcon";
import PlayerBackground from "@/components/pages/widgets/player-background/PlayerBackground";
import { api, type User } from "@/lib/api";
import { getRefreshToken, getToken, logout, saveLogin, useCurrentUser } from "@/lib/auth";
import { formatPlayerId, toPlayerId } from "@/lib/player-id";
import { copyText } from "@/lib/share";
import { coinsWord, useShop } from "@/lib/shop";
import { showToast } from "@/components/pages/widgets/toast/Toast";
import "./profile-card.scss";

// showStats=false — на странице профиля, где рядом уже есть подробная статистика
export default function ProfileCard({ showStats = true }: { showStats?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user: savedUser } = useCurrentUser();
  const shop = useShop();
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

  async function savePhoto(image: string) {
    await api.updatePhoto(image);
    setUser((old) => {
      if (!old) return old;
      const next = { ...old, profile_image: image };
      saveLogin(next, getToken(), getRefreshToken());
      return next;
    });
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
    <section className={shop.state.equipped ? "panel profile-card profile-card-skin" : "panel profile-card"}>
      <PlayerBackground id={user.guest ? null : shop.state.equipped} />

      <div className="profile-card-top">
        {user.guest || !user.id ? (
          <Avatar name={user.username} image={user.profile_image} size={64} />
        ) : (
          <AvatarPicker name={user.username} image={user.profile_image} size={64} onPick={savePhoto} />
        )}

        <div className="profile-card-info">
          <p className="profile-card-name">{user.username}</p>
          {user.id ? (
            <button type="button" className="profile-card-id" onClick={copyId} title="Скопировать ID">
              ID <b>{formatPlayerId(toPlayerId(user.id))}</b>
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
          <Link href={pathname === "/" ? "/profile/edit?from=home" : "/profile/edit"} className="profile-card-action" title="Редактировать профиль" aria-label="Редактировать профиль">
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
            <b>{shop.isReady ? shop.coins : "…"}</b>
            <span>{coinsWord(shop.coins)}</span>
            {shop.state.shields > 0 && (
              <i title="Щитов в запасе">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 2.5 4 5.5v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10v-6l-8-3Z" />
                </svg>
                {shop.state.shields}
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

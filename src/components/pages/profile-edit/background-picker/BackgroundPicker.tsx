"use client";

import Link from "next/link";

import Avatar from "@/components/pages/widgets/avatar/Avatar";
import PlayerBackground from "@/components/pages/widgets/player-background/PlayerBackground";
import { showToast } from "@/components/pages/widgets/toast/Toast";
import type { User } from "@/lib/api";
import { BACKGROUNDS, type BackgroundId, useShop } from "@/lib/shop";
import "./background-picker.scss";

// «Оформление»: надеть купленный фон, сменить его или вернуть обычный вид
export default function BackgroundPicker({ user }: { user: User }) {
  const shop = useShop();
  const owned = BACKGROUNDS.filter((item) => shop.state.owned.includes(item.id));
  const notOwned = BACKGROUNDS.length - owned.length;
  const equipped = BACKGROUNDS.find((item) => item.id === shop.state.equipped) ?? null;

  function choose(id: BackgroundId | null) {
    if (id === shop.state.equipped) return;
    shop.equip(id);
    const name = BACKGROUNDS.find((item) => item.id === id)?.name;
    showToast(name ? `Фон «${name}» надет.` : "Фон снят — карточка в обычном виде.", "success");
  }

  return (
    <section className="panel background-picker" id="appearance">
      <div className="panel-top">
        <h2 className="panel-title">Оформление</h2>
        <Link href="/shop" className="btn btn-dark btn-small">
          Магазин
        </Link>
      </div>

      {/* Живое превью: так сейчас выглядит ваша карточка */}
      <div className="background-picker-preview">
        <PlayerBackground id={shop.state.equipped} />
        <span className="background-picker-preview-player">
          <Avatar name={user.username} image={user.profile_image} size={56} />
          <span>
            <b>{user.username}</b>
            <small>{equipped ? `Фон: ${equipped.name}` : "Без фона"}</small>
          </span>
        </span>
      </div>

      {owned.length === 0 ? (
        <div className="background-picker-empty">
          <p className="background-picker-empty-title">Купленных фонов пока нет</p>
          <p>Фоны продаются в магазине за монеты — их дают за каждую игру и победу.</p>
          <Link href="/shop" className="btn btn-red btn-small">
            Выбрать фон в магазине
          </Link>
        </div>
      ) : (
        <ul className="background-picker-grid" role="radiogroup" aria-label="Фон профиля">
          <li>
            <button
              type="button"
              role="radio"
              aria-checked={shop.state.equipped === null}
              className={shop.state.equipped === null ? "background-picker-tile background-picker-tile-active" : "background-picker-tile"}
              onClick={() => choose(null)}
            >
              <span className="background-picker-swatch background-picker-swatch-none">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="8" />
                  <path d="m6.5 17.5 11-11" />
                </svg>
              </span>
              <span className="background-picker-name">Без фона</span>
            </button>
          </li>

          {owned.map((item) => {
            const isActive = shop.state.equipped === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  className={isActive ? "background-picker-tile background-picker-tile-active" : "background-picker-tile"}
                  onClick={() => choose(item.id)}
                >
                  <span className="background-picker-swatch">
                    <PlayerBackground id={item.id} />
                  </span>
                  <span className="background-picker-name">{item.name}</span>
                </button>
              </li>
            );
          })}

          {notOwned > 0 && (
            <li>
              <Link href="/shop" className="background-picker-tile background-picker-tile-more">
                <span className="background-picker-swatch background-picker-swatch-more">+{notOwned}</span>
                <span className="background-picker-name">Ещё фоны</span>
              </Link>
            </li>
          )}
        </ul>
      )}

      <p className="background-picker-note">Фон видите вы: в профиле, в комнате, в игре и в «Друзьях».</p>
    </section>
  );
}

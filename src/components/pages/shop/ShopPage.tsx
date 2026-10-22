"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import Avatar from "@/components/pages/widgets/avatar/Avatar";
import CoinIcon from "@/components/pages/widgets/coin-icon/CoinIcon";
import PlayerBackground from "@/components/pages/widgets/player-background/PlayerBackground";
import ShieldOrb from "@/components/pages/widgets/shield-orb/ShieldOrb";
import { showToast } from "@/components/pages/widgets/toast/Toast";
import { useCurrentUser } from "@/lib/auth";
import { BACKGROUNDS, COINS, coinsWord, SHIELD_PRICE, type ShopBackground, useShop } from "@/lib/shop";
import "./shop-page.scss";

export default function ShopPage() {
  const router = useRouter();
  const { user, isLoaded } = useCurrentUser();
  const shop = useShop();

  useEffect(() => {
    if (isLoaded && !user) router.replace("/register");
  }, [isLoaded, user, router]);

  if (!user) return null;

  if (user.guest) {
    return (
      <main className="shop-page">
        <h1 className="shop-page-title">Магазин</h1>
        <section className="panel shop-page-guest">
          <ShieldOrb size={110} />
          <p className="shop-page-guest-title">Магазин доступен с аккаунтом</p>
          <p className="text-muted">Монеты начисляются за сыгранные игры и победы — гостю их негде хранить.</p>
          <Link href="/register" className="btn btn-red btn-small">
            Создать аккаунт
          </Link>
        </section>
      </main>
    );
  }

  function handleBuyShield() {
    if (shop.buyShield()) showToast("Щит куплен. Он включится сам, если мафия придёт за вами.", "success");
    else showToast(`Не хватает монет: нужно ${SHIELD_PRICE}.`, "error");
  }

  function handleBuyBackground(item: ShopBackground) {
    if (shop.buyBackground(item.id)) showToast(`Фон «${item.name}» куплен и надет.`, "success");
    else showToast(`Не хватает монет: нужно ${item.price}.`, "error");
  }

  return (
    <main className="shop-page">
      <header className="shop-page-top">
        <div>
          <h1 className="shop-page-title">Магазин</h1>
          <p className="text-muted">
            +{COINS.perGame} за каждую игру, +{COINS.perWin} за победу.
          </p>
        </div>
        <p className="shop-page-balance" aria-live="polite">
          <CoinIcon />
          <b>{shop.isReady ? shop.coins : "…"}</b>
          <span>{coinsWord(shop.coins)}</span>
        </p>
      </header>

      <section className="panel shop-page-shield">
        <div className="shop-page-shield-art">
          <ShieldOrb size={150} />
        </div>
        <div className="shop-page-shield-info">
          <p className="shop-page-tag">Защита в игре</p>
          <h2 className="shop-page-shield-title">Щит жителя</h2>
          <p className="shop-page-shield-text">
            Вы не знаете, кого мафия выберет этой ночью. Если выберут вас — щит включится сам и отразит удар, а утром город узнает,
            что никто не погиб. Работает, когда ваша роль — житель. Один щит — одна спасённая ночь.
          </p>
          <div className="shop-page-shield-buy">
            <button type="button" className="btn btn-red" onClick={handleBuyShield} disabled={!shop.isReady || shop.coins < SHIELD_PRICE}>
              Купить за {SHIELD_PRICE}
              <CoinIcon />
            </button>
            <span className="shop-page-owned">
              У вас: <b>{shop.state.shields}</b>
            </span>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-top">
          <h2 className="panel-title">Фоны профиля</h2>
          {shop.state.equipped && (
            <button type="button" className="btn btn-dark btn-small" onClick={() => shop.equip(null)}>
              Снять фон
            </button>
          )}
        </div>

        <ul className="shop-page-grid">
          {BACKGROUNDS.map((item) => {
            const isOwned = shop.state.owned.includes(item.id);
            const isEquipped = shop.state.equipped === item.id;

            return (
              <li key={item.id} className={isEquipped ? "shop-page-item shop-page-item-equipped" : "shop-page-item"}>
                <div className="shop-page-preview">
                  <PlayerBackground id={item.id} />
                  <span className="shop-page-preview-player">
                    <Avatar name={user.username} image={user.profile_image} size={46} />
                    <b>{user.username}</b>
                  </span>
                  {isEquipped && <span className="shop-page-badge">Надето</span>}
                </div>

                <div className="shop-page-item-info">
                  <p className="shop-page-item-name">{item.name}</p>
                  <p className="shop-page-item-about">{item.about}</p>
                </div>

                {!isOwned && (
                  <button
                    type="button"
                    className="btn btn-red btn-small btn-full"
                    onClick={() => handleBuyBackground(item)}
                    disabled={!shop.isReady || shop.coins < item.price}
                  >
                    {item.price}
                    <CoinIcon />
                  </button>
                )}
                {isOwned && !isEquipped && (
                  <button type="button" className="btn btn-dark btn-small btn-full" onClick={() => shop.equip(item.id)}>
                    Надеть
                  </button>
                )}
                {isEquipped && (
                  <button type="button" className="btn btn-green btn-small btn-full" disabled>
                    Надето ✓
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}

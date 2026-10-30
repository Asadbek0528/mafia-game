"use client";

import Link from "next/link";

import Avatar from "@/components/pages/widgets/avatar/Avatar";
import CoinIcon from "@/components/pages/widgets/coin-icon/CoinIcon";
import PlayerBackground from "@/components/pages/widgets/player-background/PlayerBackground";
import ShieldOrb from "@/components/pages/widgets/shield-orb/ShieldOrb";
import { useShopPage } from "@/utils/shop-page";
import { COINS, SHIELD_PRICE } from "@/utils/shop";
import "./shop-page.scss";

export default function ShopPage() {
  const { user, coinsText, coinsWord, shields, canBuyShield, hasEquipped, items, handleBuyShield, handleBuyBackground, equip, unequip } = useShopPage();

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
          <b>{coinsText}</b>
          <span>{coinsWord}</span>
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
            <button type="button" className="btn btn-red" onClick={handleBuyShield} disabled={!canBuyShield}>
              Купить за {SHIELD_PRICE}
              <CoinIcon />
            </button>
            <span className="shop-page-owned">
              У вас: <b>{shields}</b>
            </span>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-top">
          <h2 className="panel-title">Фоны профиля</h2>
          {hasEquipped && (
            <button type="button" className="btn btn-dark btn-small" onClick={unequip}>
              Снять фон
            </button>
          )}
        </div>

        <ul className="shop-page-grid">
          {items.map((item) => (
              <li key={item.id} className={item.isEquipped ? "shop-page-item shop-page-item-equipped" : "shop-page-item"}>
                <div className="shop-page-preview">
                  <PlayerBackground id={item.id} />
                  <span className="shop-page-preview-player">
                    <Avatar name={user.username} image={user.profile_image} size={46} />
                    <b>{user.username}</b>
                  </span>
                  {item.isEquipped && <span className="shop-page-badge">Надето</span>}
                </div>

                <div className="shop-page-item-info">
                  <p className="shop-page-item-name">{item.name}</p>
                  <p className="shop-page-item-about">{item.about}</p>
                </div>

                {!item.isOwned && (
                  <button
                    type="button"
                    className="btn btn-red btn-small btn-full"
                    onClick={() => handleBuyBackground(item)}
                    disabled={!item.canBuy}
                  >
                    {item.price}
                    <CoinIcon />
                  </button>
                )}
                {item.isOwned && !item.isEquipped && (
                  <button type="button" className="btn btn-dark btn-small btn-full" onClick={() => equip(item.id)}>
                    Надеть
                  </button>
                )}
                {item.isEquipped && (
                  <button type="button" className="btn btn-green btn-small btn-full" disabled>
                    Надето ✓
                  </button>
                )}
              </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

import { useCallback, useEffect, useState } from "react";

import { getUser } from "./auth";

// Монеты: в backend их пока нет, поэтому считаем от настоящей статистики игрока
// (сыгранные игры и победы приходят с /statistic), а покупки храним в браузере.
// Когда backend добавит баланс и покупки — заменить readState/saveState на запросы к API.
export const COINS = {
  start: 200,
  perGame: 10,
  perWin: 30,
};

export const SHIELD_PRICE = 120;

export type BackgroundId = "blood-moon" | "neon-noir" | "night-city" | "fog" | "don-gold" | "ice-night";

export type ShopBackground = {
  id: BackgroundId;
  name: string;
  about: string;
  price: number;
};

export const BACKGROUNDS: ShopBackground[] = [
  { id: "blood-moon", name: "Кровавая луна", about: "Красная луна над спящим городом.", price: 150 },
  { id: "fog", name: "Туман", about: "Медленный туман, в котором кто-то прячется.", price: 200 },
  { id: "ice-night", name: "Ледяная ночь", about: "Синий холод и мерцающие звёзды.", price: 250 },
  { id: "neon-noir", name: "Неоновый нуар", about: "Вывески ночного клуба, где решают судьбы.", price: 300 },
  { id: "night-city", name: "Ночной город", about: "Силуэт дона на фоне красных небоскрёбов.", price: 400 },
  { id: "don-gold", name: "Золото дона", about: "Чёрное с золотом — для тех, кто правит городом.", price: 500 },
];

type ShopState = {
  spent: number;
  owned: BackgroundId[];
  equipped: BackgroundId | null;
  shields: number;
  // Игры, в которых щит уже включён на сервере, и ночи, где он уже сработал
  armedGames: string[];
  usedNights: string[];
};

const EMPTY: ShopState = { spent: 0, owned: [], equipped: null, shields: 0, armedGames: [], usedNights: [] };
const CHANGE_EVENT = "mafia-shop-change";

function storageKey(): string | null {
  const user = getUser();
  if (!user) return null;
  return `mafia_shop_${user.id ?? user.username}`;
}

function readState(): ShopState {
  const key = storageKey();
  if (!key) return EMPTY;
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "null") as Partial<ShopState> | null;
    return { ...EMPTY, ...saved };
  } catch {
    return EMPTY;
  }
}

function saveState(state: ShopState) {
  const key = storageKey();
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    return;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function earnedCoins(): number {
  const user = getUser();
  if (!user) return 0;
  return COINS.start + (user.games_played ?? 0) * COINS.perGame + (user.wins ?? 0) * COINS.perWin;
}

export function useShop() {
  const [state, setState] = useState<ShopState>(EMPTY);
  const [earned, setEarned] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setState(readState());
      setEarned(earnedCoins());
      setIsReady(true);
    };
    refresh();
    // Другие вкладки и другие блоки на странице (карточка профиля, магазин) видят покупку сразу
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const coins = Math.max(0, earned - state.spent);

  const update = useCallback((change: (old: ShopState) => ShopState) => {
    saveState(change(readState()));
  }, []);

  function buyBackground(id: BackgroundId): boolean {
    const item = BACKGROUNDS.find((background) => background.id === id);
    if (!item || state.owned.includes(id) || coins < item.price) return false;
    update((old) => ({ ...old, spent: old.spent + item.price, owned: [...old.owned, id], equipped: id }));
    return true;
  }

  function equip(id: BackgroundId | null) {
    update((old) => ({ ...old, equipped: id && old.owned.includes(id) ? id : null }));
  }

  function buyShield(): boolean {
    if (coins < SHIELD_PRICE) return false;
    update((old) => ({ ...old, spent: old.spent + SHIELD_PRICE, shields: old.shields + 1 }));
    return true;
  }

  // Щит сработал этой ночью: списываем одну защиту (один раз на ночь)
  const spendShield = useCallback(
    (nightKey: string) => {
      update((old) =>
        old.usedNights.includes(nightKey) || old.shields <= 0
          ? old
          : { ...old, shields: old.shields - 1, usedNights: [...old.usedNights, nightKey].slice(-50) },
      );
    },
    [update],
  );

  const markArmed = useCallback(
    (gameId: string) => {
      update((old) => (old.armedGames.includes(gameId) ? old : { ...old, armedGames: [...old.armedGames, gameId].slice(-50) }));
    },
    [update],
  );

  return { isReady, coins, state, buyBackground, equip, buyShield, spendShield, markArmed };
}

export function coinsWord(count: number): string {
  const last = count % 10;
  const lastTwo = count % 100;
  if (last === 1 && lastTwo !== 11) return "монета";
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return "монеты";
  return "монет";
}

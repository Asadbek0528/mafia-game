import { useEffect, useState } from "react";

import { getUser } from "./auth";
import { BACKGROUNDS, type BackgroundId, useShop } from "./shop";

// Фоны других игроков в комнате и в игре. В backend фона пока нет, поэтому каждый игрок
// сам рассказывает о своём фоне через WebSocket: при подключении и в ответ на «hello» новичка.
// Ключ — имя игрока: оно есть и в комнате, и в игре.

const CHANGE_EVENT = "mafia-skins-change";
const skins = new Map<string, BackgroundId>();

const KNOWN = new Set<string>(BACKGROUNDS.map((item) => item.id));

export function rememberSkin(data: unknown) {
  const message = data as { type?: string; username?: unknown; background?: unknown } | null;
  if (message?.type !== "skin" || typeof message.username !== "string") return;
  const background = typeof message.background === "string" && KNOWN.has(message.background) ? (message.background as BackgroundId) : null;
  if ((skins.get(message.username) ?? null) === background) return;
  if (background) skins.set(message.username, background);
  else skins.delete(message.username);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

// Свой надетый фон — из магазина в этом браузере
function myBackground(): BackgroundId | null {
  const user = getUser();
  if (!user) return null;
  try {
    const saved = JSON.parse(localStorage.getItem(`mafia_shop_${user.id ?? user.username}`) ?? "null") as { equipped?: BackgroundId | null } | null;
    return saved?.equipped ?? null;
  } catch {
    return null;
  }
}

// Сообщить остальным свой фон (null — без фона)
export function announceSkin(notify: (type?: string, extra?: Record<string, unknown>) => void) {
  const user = getUser();
  if (!user) return;
  notify("skin", { username: user.username, background: myBackground() });
}

// Фоны других игроков по имени
export function useSkins(): Map<string, BackgroundId> {
  const [snapshot, setSnapshot] = useState(() => new Map(skins));
  useEffect(() => {
    const refresh = () => setSnapshot(new Map(skins));
    refresh();
    window.addEventListener(CHANGE_EVENT, refresh);
    return () => window.removeEventListener(CHANGE_EVENT, refresh);
  }, []);
  return snapshot;
}

export function useBackgroundOf(myName: string): (username: string) => BackgroundId | null {
  const myEquipped = useShop().state.equipped;
  const others = useSkins();
  return (username) => (username === myName ? myEquipped : (others.get(username) ?? null));
}

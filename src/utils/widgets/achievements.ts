import { type CSSProperties, useEffect, useState } from "react";

import type { Achievement } from "@/utils/api";
import { fetchNewAchievements, useAchievements } from "@/utils/achievements";
import { play } from "@/utils/sound";

const CHECK_DELAYS_MS = [2500, 8000];
const SHOW_MS = 6000;

export const SPARKS: CSSProperties[] = Array.from({ length: 10 }, (_, index) => ({ "--spark": index }) as CSSProperties);

export function useAchievementUnlocked() {
  const [queue, setQueue] = useState<Achievement[]>([]);
  const current = queue[0] ?? null;

  useEffect(() => {
    const timers = CHECK_DELAYS_MS.map((delay) =>
      setTimeout(() => {
        fetchNewAchievements()
          .then((fresh) => {
            if (fresh.length) setQueue((old) => [...old, ...fresh.filter((item) => !old.some((known) => known.id === item.id))]);
          })
          .catch(() => {});
      }, delay),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (!current) return;
    play("win");
    const timer = setTimeout(() => setQueue((old) => old.slice(1)), SHOW_MS);
    return () => clearTimeout(timer);
  }, [current]);

  return { current, close: () => setQueue((old) => old.slice(1)) };
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

export function useAchievementsPanel(userId: number) {
  const { list, isError, reload } = useAchievements(userId);
  const unlocked = list?.filter((item) => item.unlockedAt).length ?? 0;
  const total = list?.length ?? 0;

  return {
    list: list?.map((item) => ({ ...item, isUnlocked: Boolean(item.unlockedAt), dateText: item.unlockedAt ? `Получено ${formatDate(item.unlockedAt)}` : "" })) ?? null,
    isError,
    reload,
    unlocked,
    total,
    progress: total > 0 ? (unlocked / total) * 100 : 0,
  };
}

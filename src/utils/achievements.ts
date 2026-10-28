import { useCallback, useEffect, useState } from "react";

import { api, type Achievement, type AchievementCode } from "./api";
import { getUser } from "./auth";

// Оформление медальонов: тексты (название и условие) приходят из backend, здесь только цвет металла
export const ACHIEVEMENT_TONE: Record<AchievementCode, "gold" | "blood" | "silver"> = {
  FIRST_WIN: "gold",
  MAFIA_MASTERMIND: "blood",
  GUARDIAN_ANGEL: "silver",
  SHERLOCK: "silver",
  SURVIVOR: "gold",
  PERFECT_TOWN: "gold",
};

// Какие достижения игрок уже видел — чтобы поздравлять только с новыми
function seenKey(userId: number) {
  return `mafia_achievements_seen_${userId}`;
}

function readSeen(userId: number): number[] | null {
  try {
    const saved = localStorage.getItem(seenKey(userId));
    return saved ? (JSON.parse(saved) as number[]) : null;
  } catch {
    return null;
  }
}

export function markAchievementsSeen(userId: number, ids: number[]) {
  try {
    const old = readSeen(userId) ?? [];
    localStorage.setItem(seenKey(userId), JSON.stringify([...new Set([...old, ...ids])]));
  } catch {
    // без хранилища поздравим ещё раз — не страшно
  }
}

// Новые достижения после игры. В первый раз ничего не показываем, а запоминаем всё, что уже есть,
// — иначе давний игрок получил бы пачку «новых» поздравлений
export async function fetchNewAchievements(): Promise<Achievement[]> {
  const user = getUser();
  if (!user?.id || user.guest) return [];
  const list = await api.getAchievements(user.id);
  const unlocked = list.filter((item) => item.unlockedAt);
  const seen = readSeen(user.id);
  if (seen === null) {
    markAchievementsSeen(user.id, unlocked.map((item) => item.id));
    return [];
  }
  const fresh = unlocked.filter((item) => !seen.includes(item.id));
  if (fresh.length) markAchievementsSeen(user.id, fresh.map((item) => item.id));
  return fresh;
}

export function useAchievements(userId: number | undefined) {
  const [list, setList] = useState<Achievement[] | null>(null);
  const [isError, setIsError] = useState(false);

  const load = useCallback(() => {
    if (!userId) return;
    setIsError(false);
    api
      .getAchievements(userId)
      .then((items) => {
        setList(items);
        // Достижения, которые человек увидел в профиле, после игры повторно не поздравляем
        const user = getUser();
        if (user?.id === userId) markAchievementsSeen(userId, items.filter((item) => item.unlockedAt).map((item) => item.id));
      })
      .catch(() => setIsError(true));
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { list, isError, reload: load };
}

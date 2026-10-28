import { useCallback, useEffect, useState } from "react";

import { api, type Achievement, type AchievementCode } from "./api";
import { getUser } from "./auth";

export const ACHIEVEMENT_TONE: Record<AchievementCode, "gold" | "blood" | "silver"> = {
  FIRST_WIN: "gold",
  MAFIA_MASTERMIND: "blood",
  GUARDIAN_ANGEL: "silver",
  SHERLOCK: "silver",
  SURVIVOR: "gold",
  PERFECT_TOWN: "gold",
};

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
  }
}

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

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { api, type MyStats, type RoleKey } from "@/utils/api";
import { useCurrentUser } from "@/utils/auth";
import { ROLES } from "@/utils/roles";
import { BACKGROUNDS, type BackgroundId, useShop } from "@/utils/shop";
import { useSocial } from "@/utils/social";
import { showToast } from "@/utils/toast";

export function useProfilePage() {
  const router = useRouter();
  const { user, isLoaded } = useCurrentUser();

  useEffect(() => {
    if (isLoaded && !user) router.replace("/register");
  }, [isLoaded, user, router]);

  return {
    user,
    isMember: Boolean(user && !user.guest),
    achievementsUserId: user && !user.guest && user.id ? user.id : null,
  };
}

export function useFriendsPanel() {
  const social = useSocial();
  const online = social.friends.filter((friend) => friend.online);
  const hasFriends = social.friends.length > 0;
  return {
    hasFriends,
    shown: (online.length > 0 ? online : social.friends).slice(0, 5),
    countText: social.isReady ? `в сети ${online.length} из ${social.friends.length}` : "подключаемся…",
    linkText: hasFriends ? "Все друзья и заявки →" : "Найти друзей →",
  };
}

export type RoleStatsRow = {
  key: RoleKey;
  name: string;
  image: string;
  isEmpty: boolean;
  rate: number;
  line: string;
  rateText: string;
};

export function useProfileStats(userId?: number) {
  const { user } = useCurrentUser();
  const [stats, setStats] = useState<MyStats | null>(null);
  const [isFailed, setIsFailed] = useState(false);

  const targetId = userId ?? user?.id;
  const isMine = userId === undefined || userId === user?.id;
  const isGuest = user?.guest === true;

  useEffect(() => {
    if (!targetId || isGuest) return;
    setStats(null);
    setIsFailed(false);
    api
      .getUserStats(targetId)
      .then(setStats)
      .catch(() => setIsFailed(true));
  }, [targetId, isGuest]);

  const roleRows: RoleStatsRow[] = stats
    ? ROLES.map((role) => {
        const item = stats.byRole[role.key];
        const rate = item.played ? Math.round((item.wins / item.played) * 100) : 0;
        return {
          key: role.key,
          name: role.name,
          image: role.image,
          isEmpty: !item.played,
          rate,
          line: `${item.played} ${item.played === 1 ? "игра" : "игр"} · ${item.wins} ${item.wins === 1 ? "победа" : "побед"}`,
          rateText: item.played ? `${rate}%` : "—",
        };
      })
    : [];

  return {
    hasTarget: Boolean(targetId),
    isGuest,
    isMine,
    stats,
    isFailed,
    roleRows,
    favoriteRole: stats?.favoriteRole ? (ROLES.find((role) => role.key === stats.favoriteRole)?.name ?? null) : null,
    avgText: stats && stats.avgMinutes > 0 ? `${stats.avgMinutes} мин` : "—",
  };
}

export function useBackgroundPicker() {
  const shop = useShop();
  const owned = BACKGROUNDS.filter((item) => shop.state.owned.includes(item.id));
  const equippedId = shop.state.equipped;
  const equipped = BACKGROUNDS.find((item) => item.id === equippedId) ?? null;

  function choose(id: BackgroundId | null) {
    if (id === equippedId) return;
    shop.equip(id);
    const name = BACKGROUNDS.find((item) => item.id === id)?.name;
    showToast(name ? `Фон «${name}» надет.` : "Фон снят — карточка в обычном виде.", "success");
  }

  return {
    owned,
    notOwned: BACKGROUNDS.length - owned.length,
    equippedId,
    equippedText: equipped ? `Фон: ${equipped.name}` : "Без фона",
    choose,
  };
}

const BACK_TARGETS = {
  home: { href: "/", text: "На главную" },
  profile: { href: "/profile", text: "Назад в профиль" },
};

export function useProfileEditPage() {
  const router = useRouter();
  const { user, isLoaded } = useCurrentUser();
  const [back, setBack] = useState(BACK_TARGETS.profile);

  useEffect(() => {
    const from = new URLSearchParams(window.location.search).get("from");
    if (from === "home") setBack(BACK_TARGETS.home);
  }, []);

  useEffect(() => {
    if (isLoaded && (!user || user.guest)) router.replace(user ? "/profile" : "/register");
  }, [isLoaded, user, router]);

  const isReady = Boolean(user && !user.guest);
  useEffect(() => {
    if (!isReady || window.location.hash !== "#appearance") return;
    requestAnimationFrame(() => document.getElementById("appearance")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [isReady]);

  return {
    user: isReady ? user : null,
    back,
    onSaved: () => router.push(back.href),
  };
}

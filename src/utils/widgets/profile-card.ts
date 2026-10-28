import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { api, type User } from "@/utils/api";
import { getRefreshToken, getToken, logout, saveLogin, useCurrentUser } from "@/utils/auth";
import { formatPlayerId, toPlayerId } from "@/utils/player-id";
import { copyText } from "@/utils/share";
import { coinsWord, useShop } from "@/utils/shop";
import { showToast } from "@/utils/toast";

export function useProfileCard() {
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
      .catch(() => {});
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

  const games = user?.games_played ?? 0;
  const wins = user?.wins ?? 0;

  return {
    user,
    shownId: user?.id ? formatPlayerId(toPlayerId(user.id)) : null,
    canPickPhoto: Boolean(user && !user.guest && user.id),
    equipped: shop.state.equipped,
    background: user?.guest ? null : shop.state.equipped,
    coinsText: shop.isReady ? String(shop.coins) : "…",
    coinsWord: coinsWord(shop.coins),
    shields: shop.state.shields,
    editHref: pathname === "/" ? "/profile/edit?from=home" : "/profile/edit",
    games,
    wins,
    winRate: games > 0 ? Math.round((wins / games) * 100) : 0,
    copyId,
    savePhoto,
    handleLogout,
  };
}

import { useEffect, useState } from "react";

import { api, type GameResult } from "@/utils/api";
import { useCurrentUser } from "@/utils/auth";
import { getRole } from "@/utils/roles";

export function useGameHistory(limit: number, userId?: number) {
  const { user } = useCurrentUser();
  const [games, setGames] = useState<GameResult[]>([]);
  const isOther = userId !== undefined && userId !== user?.id;

  useEffect(() => {
    if (!user || user.guest) return;
    api
      .getHistory(isOther ? userId : undefined)
      .then(setGames)
      .catch(() => setGames([]));
  }, [user, userId, isOther]);

  return {
    isGuest: user?.guest === true,
    isOther,
    rows: games.slice(0, limit).map((game) => {
      const role = getRole(game.role);
      const isWin = game.result === "win";
      return { room: game.room, ago: game.ago, image: role.image, isWin, resultText: isWin ? `Победа (${role.plural})` : "Поражение" };
    }),
  };
}

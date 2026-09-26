"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { api, type GameResult } from "@/lib/api";
import { useCurrentUser } from "@/lib/auth";
import { getRole } from "@/lib/roles";
import "./game-history.scss";

type GameHistoryProps = {
  limit?: number;
  userId?: number;
};

export default function GameHistory({ limit = 5, userId }: GameHistoryProps) {
  const { user } = useCurrentUser();
  const [games, setGames] = useState<GameResult[]>([]);

  const isOther = userId !== undefined && userId !== user?.id;

  useEffect(() => {
    if (!user) return;
    if (user.guest) return;
    api
      .getHistory(isOther ? userId : undefined)
      .then(setGames)
      .catch(() => setGames([]));
  }, [user, userId, isOther]);

  return (
    <section className="panel">
      <div className="panel-top">
        <h2 className="panel-title">Последние игры</h2>
      </div>

      {user?.guest && (
        <p className="game-history-empty">{isOther ? "История игр видна после входа в аккаунт." : "История сохраняется после регистрации."}</p>
      )}

      {!user?.guest && games.length === 0 && (
        <p className="game-history-empty">{isOther ? "Законченных игр пока нет." : "Сыграйте первую партию — она появится здесь."}</p>
      )}

      <ul className="game-history">
        {games.slice(0, limit).map((game, index) => {
          const role = getRole(game.role);
          const isWin = game.result === "win";

          return (
            <li key={index} className="game-history-item">
              <Image className="game-history-image" src={role.image} alt="" width={44} height={44} />

              <div className="game-history-info">
                <p className="game-history-room">{game.room}</p>
                <p className={isWin ? "game-history-win" : "game-history-lose"}>
                  {isWin ? `Победа (${role.plural})` : "Поражение"}
                </p>
              </div>

              <time className="game-history-time">{game.ago}</time>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

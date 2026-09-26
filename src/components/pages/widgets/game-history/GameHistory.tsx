"use client";

/*
  GameHistory — последние игры игрока.
  У гостя истории нет — показываем подсказку.
*/
import Image from "next/image";
import { useEffect, useState } from "react";

import { api, loadOrDemo, type GameResult } from "@/lib/api";
import { useCurrentUser } from "@/lib/auth";
import { DEMO_HISTORY } from "@/lib/demo";
import { getRole } from "@/lib/roles";
import "./game-history.scss";

type GameHistoryProps = {
  limit?: number; // сколько игр показать, по умолчанию 5
};

export default function GameHistory({ limit = 5 }: GameHistoryProps) {
  const { user } = useCurrentUser();
  const [games, setGames] = useState<GameResult[]>([]);

  useEffect(() => {
    if (!user || user.guest) return;
    loadOrDemo(api.getHistory, DEMO_HISTORY).then(setGames);
  }, [user]);

  return (
    <section className="panel">
      <div className="panel-top">
        <h2 className="panel-title">Последние игры</h2>
      </div>

      {user?.guest && <p className="game-history-empty">История сохраняется после регистрации.</p>}

      {!user?.guest && games.length === 0 && (
        <p className="game-history-empty">Сыграйте первую партию — она появится здесь.</p>
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

"use client";

import Image from "next/image";

import { useGameHistory } from "@/utils/widgets/game-history";
import "./game-history.scss";

type GameHistoryProps = {
  limit?: number;
  userId?: number;
};

export default function GameHistory({ limit = 5, userId }: GameHistoryProps) {
  const { isGuest, isOther, rows } = useGameHistory(limit, userId);

  return (
    <section className="panel">
      <div className="panel-top">
        <h2 className="panel-title">Последние игры</h2>
      </div>

      {isGuest && (
        <p className="game-history-empty">{isOther ? "История игр видна после входа в аккаунт." : "История сохраняется после регистрации."}</p>
      )}

      {!isGuest && rows.length === 0 && (
        <p className="game-history-empty">{isOther ? "Законченных игр пока нет." : "Сыграйте первую партию — она появится здесь."}</p>
      )}

      {rows.length > 0 && (
        <ul className="game-history">
          {rows.map((game, index) => (
            <li key={index} className="game-history-item">
              <Image className="game-history-image" src={game.image} alt="" width={44} height={44} />

              <div className="game-history-info">
                <p className="game-history-room">{game.room}</p>
                <p className={game.isWin ? "game-history-win" : "game-history-lose"}>{game.resultText}</p>
              </div>

              <time className="game-history-time">{game.ago}</time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

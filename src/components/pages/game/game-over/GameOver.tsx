/*
  GameOver — конец игры: кто победил и у кого какая была роль.
*/
import Image from "next/image";
import Link from "next/link";

import Avatar from "@/components/pages/widgets/avatar/Avatar";
import type { GamePlayer, GameWinner } from "@/lib/api";
import { getRole } from "@/lib/roles";
import "./game-over.scss";

type GameOverProps = {
  winner: GameWinner;
  players: GamePlayer[];
  rounds: number;
  myRole: GamePlayer["role"] | null;
  backLink: string; // куда ведёт «Вернуться в лобби»
};

export default function GameOver({ winner, players, rounds, myRole, backLink }: GameOverProps) {
  const mafiaWon = winner === "MAFIA";

  // я победил? (мафия выиграла и я мафия, или жители выиграли и я не мафия)
  let myResult = "";
  if (myRole) {
    const iAmMafia = myRole === "mafia";
    myResult = mafiaWon === iAmMafia ? "Вы победили!" : "Вы проиграли.";
  }

  return (
    <section className={mafiaWon ? "game-over game-over-mafia" : "game-over game-over-town"}>
      <div className="game-over-top">
        <Image
          className="game-over-image"
          src={mafiaWon ? "/img/role-mafia.webp" : "/img/role-citizen.webp"}
          alt=""
          width={600}
          height={900}
        />

        <div className="game-over-text">
          <h1 className="game-over-title">{mafiaWon ? "Победа мафии" : "Победа жителей"}</h1>
          <p className="game-over-subtitle">
            {mafiaWon ? "Мафия захватила город." : "Вся мафия раскрыта. Город спасён."}
          </p>
          {myResult && <p className="game-over-my-result">{myResult}</p>}
          <p className="game-over-rounds">Раундов сыграно: {rounds}</p>

          <div className="game-over-buttons">
            <Link href={backLink} className="btn btn-red">
              Вернуться в лобби
            </Link>
            <Link href="/" className="btn btn-dark">
              На главную
            </Link>
          </div>
        </div>
      </div>

      {/* кто кем был */}
      <h2 className="game-over-list-title">Кто кем был</h2>
      <ul className="game-over-list">
        {players.map((player) => (
          <li key={player.id} className={player.isAlive ? "game-over-player" : "game-over-player game-over-player-dead"}>
            <Avatar name={player.username} size={40} />
            <div>
              <p className="game-over-player-name">{player.username}</p>
              <p className="game-over-player-role">
                {player.role ? getRole(player.role).name : "Роль скрыта"} · {player.isAlive ? "выжил" : "погиб"}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

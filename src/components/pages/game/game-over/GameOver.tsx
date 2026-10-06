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
  mafiaCount: number;
  backLink: string;
};

export default function GameOver({ winner, players, rounds, myRole, mafiaCount, backLink }: GameOverProps) {
  const mafiaWon = winner === "MAFIA";
  const reason = getReason(mafiaWon, players, mafiaCount);

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
          src={mafiaWon ? "/img/roles-v3/mafia.webp" : "/img/roles-v3/citizen.webp"}
          alt=""
          width={600}
          height={900}
        />

        <div className="game-over-text">
          <h1 className="game-over-title">{mafiaWon ? "Победа мафии" : "Победа жителей"}</h1>
          <p className="game-over-subtitle">
            {mafiaWon ? "Мафия захватила город." : "Вся мафия раскрыта. Город спасён."}
          </p>
          <p className="game-over-reason">{reason}</p>
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
            {player.role && (
              <Image
                className="game-over-player-card"
                src={getRole(player.role).image}
                alt={getRole(player.role).name}
                title={getRole(player.role).name}
                width={120}
                height={180}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function getReason(mafiaWon: boolean, players: GamePlayer[], mafiaCount: number): string {
  const alive = players.filter((player) => player.isAlive);
  if (!mafiaWon) return "Вся мафия выбыла из игры — город очищен.";

  const knownMafia = alive.filter((player) => player.role === "mafia").length;
  const mafia = knownMafia > 0 ? knownMafia : Math.min(mafiaCount, alive.length);
  const town = alive.length - mafia;
  if (mafia > 0 && town >= 0 && mafia >= town) {
    return `В живых осталось: мафия — ${mafia}, мирные — ${town}. Когда мафии столько же, сколько мирных, город уже не может выгнать её голосованием, поэтому по правилам побеждает мафия.`;
  }
  return "Мафия добилась своего: мирных жителей осталось слишком мало.";
}

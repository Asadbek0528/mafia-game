import Avatar from "@/components/pages/widgets/avatar/Avatar";
import PlayerBackground from "@/components/pages/widgets/player-background/PlayerBackground";
import type { RoomPlayer } from "@/utils/api";
import { useBackgroundOf } from "@/utils/skins";
import "./players-list.scss";

type PlayersListProps = {
  players: RoomPlayer[];
  owner: string;
  me: string;
  maxPlayers: number;
};

export default function PlayersList({ players, owner, me, maxPlayers }: PlayersListProps) {
  const emptySlots = Math.max(0, maxPlayers - players.length);
  const backgroundOf = useBackgroundOf(me);

  return (
    <section className="panel players-list">
      <h2 className="panel-title players-list-title">
        Игроки
        <span className="players-list-count">
          {players.length}/{maxPlayers}
        </span>
      </h2>

      <ul className="players-list-items">
        {players.map((player) => (
          <li
            key={player.username}
            className={player.username === me ? "players-list-item players-list-item-me" : "players-list-item"}
          >
            <PlayerBackground id={backgroundOf(player.username)} />
            <Avatar name={player.username} size={42} />

            <div className="players-list-info">
              <p className="players-list-name">
                <span className="players-list-name-text">{player.username}</span>
                {player.username === owner && (
                  <svg className="players-list-crown" viewBox="0 0 24 24" fill="currentColor" role="img" aria-label="Создатель">
                    <path d="M3 7l4 4 5-7 5 7 4-4-2 12H5z" />
                  </svg>
                )}
                {player.username === me && <span className="players-list-me">Вы</span>}
              </p>

              {player.ready === undefined && <p className="players-list-in-room">В комнате</p>}

              {player.ready === true && (
                <p className="players-list-ready">
                  <span className="status-dot" /> Готов
                </p>
              )}

              {player.ready === false && (
                <p className="players-list-not-ready">
                  <span className="status-dot players-list-dot-off" /> Не готов
                </p>
              )}
            </div>
          </li>
        ))}

        {Array.from({ length: emptySlots }).map((_, index) => (
          <li key={`empty-${index}`} className="players-list-item players-list-item-empty">
            <Avatar name="" size={42} empty />
            <span>Свободное место</span>
          </li>
        ))}
      </ul>

      {emptySlots > 0 && <p className="players-list-free">Свободных мест: {emptySlots}</p>}
    </section>
  );
}

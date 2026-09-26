import Avatar from "@/components/pages/widgets/avatar/Avatar";
import type { RoomPlayer } from "@/lib/api";
import "./players-list.scss";

type PlayersListProps = {
  players: RoomPlayer[];
  owner: string;
  me: string;
  maxPlayers: number;
};

export default function PlayersList({ players, owner, me, maxPlayers }: PlayersListProps) {
  const emptySlots = Math.max(0, maxPlayers - players.length);

  return (
    <section className="panel players-list">
      <h2 className="panel-title players-list-title">Игроки</h2>

      <ul className="players-list-items">
        {players.map((player) => (
          <li
            key={player.username}
            className={player.username === me ? "players-list-item players-list-item-me" : "players-list-item"}
          >
            <Avatar name={player.username} size={42} />

            <div className="players-list-info">
              <p className="players-list-name">
                {player.username}
                {player.username === owner && (
                  <svg className="players-list-crown" viewBox="0 0 24 24" fill="currentColor" aria-label="Создатель">
                    <path d="M3 7l4 4 5-7 5 7 4-4-2 12H5z" />
                  </svg>
                )}
              </p>

              {player.ready === undefined && <p className="players-list-in-room">В комнате</p>}

              {player.ready === true && (
                <p className="players-list-ready">
                  <span className="status-dot" /> Готов
                </p>
              )}

              {player.ready === false && (
                <p className="players-list-not-ready">
                  <span className="status-dot status-dot-red" /> Не готов
                </p>
              )}
            </div>
          </li>
        ))}

        {Array.from({ length: emptySlots }).map((_, index) => (
          <li key={`empty-${index}`} className="players-list-item players-list-item-empty">
            <Avatar name="" size={42} empty />
            Свободное место
          </li>
        ))}
      </ul>
    </section>
  );
}

import Link from "next/link";

import type { RoomShort } from "@/lib/api";
import "./rooms-table.scss";

type RoomsTableProps = {
  rooms: RoomShort[] | null;
  onCreateRoom: () => void;
};

export default function RoomsTable({ rooms, onCreateRoom }: RoomsTableProps) {
  return (
    <section className="panel" id="rooms">
      <div className="panel-top">
        <h2 className="panel-title">Доступные комнаты</h2>
        <button className="btn-link" onClick={onCreateRoom}>
          + Создать
        </button>
      </div>

      {rooms === null && <p className="rooms-message">Загружаем комнаты…</p>}

      {rooms?.length === 0 && (
        <p className="rooms-message">Свободных комнат нет. Создайте свою — друзья зайдут по ссылке.</p>
      )}

      {rooms && rooms.length > 0 && (
        <table className="rooms-table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Игроки</th>
              <th>Возраст</th>
              <th>Статус</th>
              <th>
                <span className="sr-only">Действие</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {rooms.map((room) => (
              <RoomRow key={room.id} room={room} />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function RoomRow({ room }: { room: RoomShort }) {
  const isPlaying = room.status === "playing";
  const isFull = room.players >= room.max_players;
  const canJoin = !isPlaying && !isFull;

  let buttonText = "Войти";
  if (isPlaying) buttonText = "Идёт";
  else if (isFull) buttonText = "Заполнена";

  return (
    <tr>
      <td>
        <span className="rooms-name">
          <span className="rooms-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2c-3 0-5 1.6-5 4.5 0 .7.1 1.3.3 1.9C5.3 9 4 10.6 4 12.5 4 16 7.6 22 12 22s8-6 8-9.5c0-1.9-1.3-3.5-3.3-4.1.2-.6.3-1.2.3-1.9C17 3.6 15 2 12 2Z" />
            </svg>
          </span>
          {room.name}
        </span>
      </td>

      <td className={isFull ? "rooms-full" : ""}>
        {room.players}/{room.max_players}
      </td>

      <td>{room.age > 0 ? `${room.age}+` : "Для всех"}</td>

      <td>
        <span className="rooms-status">
          <span className={isPlaying ? "status-dot" : "status-dot status-dot-yellow"} />
          {isPlaying ? "Идёт игра" : "Ожидание"}
        </span>
      </td>

      <td>
        {canJoin ? (
          <Link href={`/room/${room.id}`} className="btn btn-red btn-small">
            {buttonText}
          </Link>
        ) : (
          <button className="btn btn-red btn-small" disabled>
            {buttonText}
          </button>
        )}
      </td>
    </tr>
  );
}

import Link from "next/link";

import type { RoomShort } from "@/utils/api";
import { roomCardView } from "@/utils/home/rooms";
import "./rooms-table.scss";

type RoomsTableProps = {
  rooms: RoomShort[] | null;
  onCreateRoom: () => void;
};

export default function RoomsTable({ rooms, onCreateRoom }: RoomsTableProps) {
  return (
    <section className="panel rooms" id="rooms">
      <div className="panel-top">
        <h2 className="panel-title">
          Комнаты
          {rooms && rooms.length > 0 && <span className="rooms-count">{rooms.length}</span>}
        </h2>
        {rooms && rooms.length > 0 && (
          <button className="btn btn-dark btn-small" onClick={onCreateRoom}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Создать
          </button>
        )}
      </div>

      {rooms === null && (
        <ul className="rooms-grid" aria-busy="true">
          {[0, 1, 2].map((item) => (
            <li key={item} className="rooms-card rooms-card-skeleton" />
          ))}
        </ul>
      )}

      {rooms?.length === 0 && (
        <div className="rooms-empty">
          <span className="rooms-empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18M5 21V8l7-5 7 5v13M10 21v-6h4v6" />
            </svg>
          </span>
          <p className="rooms-empty-title">Комнат пока нет</p>
          <p>Создайте свою и позовите друзей — игра начнётся, когда все будут готовы.</p>
          <button className="btn btn-red btn-small" onClick={onCreateRoom}>
            Создать комнату
          </button>
        </div>
      )}

      {rooms && rooms.length > 0 && (
        <ul className="rooms-grid">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </ul>
      )}
    </section>
  );
}

function RoomCard({ room }: { room: RoomShort }) {
  const { canJoin, fill, buttonText, badgeClass, badgeText, ageText } = roomCardView(room);

  return (
    <li className={canJoin ? "rooms-card" : "rooms-card rooms-card-closed"}>
      <div className="rooms-card-top">
        <p className="rooms-card-name">{room.name}</p>
        <span className={badgeClass}>{badgeText}</span>
      </div>

      <div className="rooms-card-meta">
        <span className="rooms-card-players">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="9" cy="8" r="3.5" />
            <path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6z" />
            <circle cx="17" cy="9" r="2.8" />
            <path d="M16.6 13.3c3 .3 5.4 2.4 5.4 5.2V20h-4.4c0-2.5-.4-4.8-1-6.7z" />
          </svg>
          <span>
            <b>{room.players}</b>/{room.max_players}
          </span>
        </span>
        <span className="rooms-card-age">{ageText}</span>
      </div>

      <span className="rooms-card-bar" aria-hidden="true">
        <span style={{ width: `${fill}%` }} />
      </span>

      {canJoin ? (
        <Link href={`/room/${room.id}`} className="btn btn-red btn-small btn-full">
          {buttonText}
        </Link>
      ) : (
        <button className="btn btn-dark btn-small btn-full" disabled>
          {buttonText}
        </button>
      )}
    </li>
  );
}

import Image from "next/image";

import type { RoomFull } from "@/utils/api";
import { copyRoomCode } from "@/utils/room/room-header";
import "./room-header.scss";

type RoomHeaderProps = {
  room: RoomFull;
  onLeave: () => void;
};

export default function RoomHeader({ room, onLeave }: RoomHeaderProps) {
  return (
    <header className="room-header">
      <span className="room-header-art" aria-hidden="true" />

      <button className="room-header-back" onClick={onLeave} aria-label="Выйти из комнаты">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </button>

      <Image className="room-header-logo" src="/img/logo.webp" alt="Mafia" width={56} height={56} />

      <div className="room-header-info">
        <h1 className="room-header-title">{room.name}</h1>
        <p className="room-header-meta">#{room.id}</p>
      </div>

      <p className="room-header-count" title="Игроков в комнате">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6z" />
          <circle cx="17" cy="9" r="2.8" />
        </svg>
        {room.players.length}/{room.max_players}
      </p>

      <button className="btn btn-dark btn-small room-header-copy" onClick={() => copyRoomCode(room.id)}>
        Копировать код
      </button>
    </header>
  );
}

"use client";

import { AGE_OPTIONS, DEFAULT_ROOM_NAME, rolesPreview, useCreateRoom } from "@/utils/home/create-room";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/utils/roles";
import "./create-room-modal.scss";

type CreateRoomModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function CreateRoomModal({
  isOpen,
  onClose,
}: CreateRoomModalProps) {
  const { dialogRef, name, setName, maxPlayers, setMaxPlayers, age, setAge, isLoading, handleSubmit, rangeStyle, handleBackdrop } = useCreateRoom(isOpen, onClose);

  return (
    <dialog
      ref={dialogRef}
      className="create-room"
      onClose={onClose}
      onMouseDown={handleBackdrop}
      aria-labelledby="create-room-title"
    >
      <form className="create-room-form" onSubmit={handleSubmit}>
        <h2 id="create-room-title" className="create-room-title">
          Новая комната
        </h2>

        <label className="create-room-field">
          <span className="create-room-label">Название</span>
          <input
            className="input"
            maxLength={30}
            placeholder={DEFAULT_ROOM_NAME}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label className="create-room-field">
          <span className="create-room-label">
            Игроков: <b>{maxPlayers}</b>
          </span>
          <input
            className="create-room-range"
            type="range"
            min={MIN_PLAYERS}
            max={MAX_PLAYERS}
            value={maxPlayers}
            style={rangeStyle}
            onChange={(event) => setMaxPlayers(Number(event.target.value))}
          />
          <span className="create-room-range-limits" aria-hidden="true">
            <span>{MIN_PLAYERS}</span>
            <span>{MAX_PLAYERS}</span>
          </span>
        </label>

        <RolesPreview players={maxPlayers} />

        <div className="create-room-field">
          <span className="create-room-label">Возраст игроков</span>
          <div className="create-room-ages" role="group" aria-label="Возраст игроков">
            {AGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={
                  age === option.value
                    ? "create-room-age create-room-age-active"
                    : "create-room-age"
                }
                aria-pressed={age === option.value}
                onClick={() => setAge(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="create-room-buttons">
          <button type="button" className="btn btn-dark" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="btn btn-red" disabled={isLoading}>
            {isLoading ? "Создаём…" : "Создать"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

function RolesPreview({ players }: { players: number }) {
  return (
    <div className="create-room-roles-box">
      <p className="create-room-roles-label">Роли по умолчанию — в комнате их можно поменять</p>
      <ul className="create-room-roles" aria-label="Роли по умолчанию">
        {rolesPreview(players).map((item) => (
          <li key={item.label} className={item.className}>
            <b>{item.count}</b> {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

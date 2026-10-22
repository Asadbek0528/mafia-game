"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { showToast } from "@/components/pages/widgets/toast/Toast";
import { api, ApiError } from "@/lib/api";
import { countRoles, MAX_PLAYERS, MIN_PLAYERS } from "@/lib/roles";
import "./create-room-modal.scss";

type CreateRoomModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const DEFAULT_NAME = "Моя комната";

const AGE_OPTIONS = [
  { value: 0, label: "Для всех" },
  { value: 12, label: "12+" },
  { value: 16, label: "16+" },
  { value: 18, label: "18+" },
];

export default function CreateRoomModal({
  isOpen,
  onClose,
}: CreateRoomModalProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [name, setName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [age, setAge] = useState(16);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const roomName = name.trim() || DEFAULT_NAME;

    setIsLoading(true);
    try {
      const room = await api.createRoom(roomName, maxPlayers, age);
      router.push(`/room/${room.id}`);
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 0;

      if (status === 0 || status >= 500) {
        const demoId = String(Math.floor(10000 + Math.random() * 89999));
        sessionStorage.setItem(
          `demo_room_${demoId}`,
          JSON.stringify({ name: roomName, maxPlayers }),
        );
        showToast("Сервер сейчас недоступен — пока можно сыграть тренировочную партию с ботами.");
        router.push(`/room/${demoId}`);
      } else {
        showToast((error as Error).message, "error");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="create-room"
      onClose={onClose}
      // Клик по затемнённому фону вокруг окна закрывает его
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
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
            placeholder={DEFAULT_NAME}
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
            style={{ "--fill": `${((maxPlayers - MIN_PLAYERS) / (MAX_PLAYERS - MIN_PLAYERS)) * 100}%` } as React.CSSProperties}
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

// Сразу видно, какие роли получатся при таком числе игроков
function RolesPreview({ players }: { players: number }) {
  const roles = countRoles(players);
  const civilians = players - roles.mafia - roles.doctor - roles.commissar;
  const items = [
    { label: "Мафия", count: roles.mafia, tone: "mafia" },
    { label: "Доктор", count: roles.doctor, tone: "town" },
    { label: "Комиссар", count: roles.commissar, tone: "town" },
    { label: "Жители", count: civilians, tone: "town" },
  ].filter((item) => item.count > 0);

  return (
    <div className="create-room-roles-box">
      <p className="create-room-roles-label">Роли по умолчанию — в комнате их можно поменять</p>
      <ul className="create-room-roles" aria-label="Роли по умолчанию">
        {items.map((item) => (
          <li key={item.label} className={item.tone === "mafia" ? "create-room-role create-room-role-mafia" : "create-room-role"}>
            <b>{item.count}</b> {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

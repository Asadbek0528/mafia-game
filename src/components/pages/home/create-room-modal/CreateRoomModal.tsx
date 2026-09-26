"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { showToast } from "@/components/pages/widgets/toast/Toast";
import { api, ApiError } from "@/lib/api";
import "./create-room-modal.scss";

type CreateRoomModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

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
    const roomName = name.trim() || "Моя комната";

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
        showToast("API комнат пока не отвечает — открываю демо.");
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
            placeholder="Ночная история"
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
            min={4}
            max={16}
            value={maxPlayers}
            onChange={(event) => setMaxPlayers(Number(event.target.value))}
          />
        </label>

        <div className="create-room-field">
          <span className="create-room-label">Возраст игроков</span>
          <div className="create-room-ages">
            {AGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={
                  age === option.value
                    ? "create-room-age create-room-age-active"
                    : "create-room-age"
                }
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

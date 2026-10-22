"use client";

import { useEffect, useRef, useState } from "react";

import "./close-room-dialog.scss";

const AUTO_CLOSE_SECONDS = 20;

type CloseRoomDialogProps = {
  isOpen: boolean;
  roomName: string;
  playersCount: number;
  isClosing: boolean;
  onClose: () => void;
  onStay: () => void;
};

function playersWord(count: number): string {
  const last = count % 10;
  const lastTwo = count % 100;
  if (last === 1 && lastTwo !== 11) return "игрок";
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return "игрока";
  return "игроков";
}

export default function CloseRoomDialog({ isOpen, roomName, playersCount, isClosing, onClose, onStay }: CloseRoomDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stayRef = useRef<HTMLButtonElement>(null);
  const [secondsLeft, setSecondsLeft] = useState(AUTO_CLOSE_SECONDS);
  // Новый ключ на каждое открытие — кольцо отсчёта начинается заново
  const [openKey, setOpenKey] = useState(0);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
      setOpenKey((key) => key + 1);
      // Безопасный выбор по умолчанию: Enter не удалит комнату случайно
      stayRef.current?.focus();
    }
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || isClosing) return;
    setSecondsLeft(AUTO_CLOSE_SECONDS);

    const endsAt = Date.now() + AUTO_CLOSE_SECONDS * 1000;
    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) {
        clearInterval(timer);
        onCloseRef.current();
      }
    }, 250);

    return () => clearInterval(timer);
  }, [isOpen, isClosing]);

  const others = Math.max(0, playersCount - 1);
  const isHurry = secondsLeft <= 5;

  return (
    <dialog
      ref={dialogRef}
      className="close-room"
      onCancel={(event) => {
        event.preventDefault();
        onStay();
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isClosing) onStay();
      }}
      aria-labelledby="close-room-title"
      aria-describedby="close-room-text"
    >
      <div className="close-room-body">
        <div className={isHurry ? "close-room-countdown close-room-countdown-hurry" : "close-room-countdown"} aria-hidden="true">
          <svg key={openKey} viewBox="0 0 100 100">
            <circle className="close-room-countdown-track" cx="50" cy="50" r="44" />
            <circle
              className="close-room-countdown-ring"
              cx="50"
              cy="50"
              r="44"
              style={{ animationDuration: `${AUTO_CLOSE_SECONDS}s`, animationPlayState: isClosing ? "paused" : "running" }}
            />
          </svg>
          {isClosing ? (
            <span className="close-room-spinner" />
          ) : (
            <span className="close-room-seconds">
              <b>{secondsLeft}</b>
              сек
            </span>
          )}
        </div>

        <h2 id="close-room-title" className="close-room-title">
          Закрыть комнату?
        </h2>

        <p id="close-room-text" className="close-room-text">
          Вы создатель комнаты «{roomName}». Если уйти, она удалится для всех
          {others > 0 ? (
            <>
              {" "}— <b>{others} {playersWord(others)}</b> вернутся в меню.
            </>
          ) : (
            "."
          )}
        </p>

        <p className="close-room-hint" role="status">
          {isClosing ? "Удаляем комнату…" : "Если ничего не выбрать, комната удалится сама, когда кончится отсчёт."}
        </p>

        <div className="close-room-buttons">
          <button ref={stayRef} type="button" className="btn btn-dark" onClick={onStay} disabled={isClosing}>
            Остаться
          </button>
          <button type="button" className="btn btn-red close-room-delete" onClick={onClose} disabled={isClosing}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
            </svg>
            Удалить комнату
          </button>
        </div>
      </div>
    </dialog>
  );
}

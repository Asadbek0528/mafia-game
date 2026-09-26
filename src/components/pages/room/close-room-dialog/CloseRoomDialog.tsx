"use client";

import { useEffect, useRef, useState } from "react";

import "./close-room-dialog.scss";

const AUTO_CLOSE_SECONDS = 20;

type CloseRoomDialogProps = {
  isOpen: boolean;
  playersCount: number;
  isClosing: boolean;
  onClose: () => void;
  onStay: () => void;
};

export default function CloseRoomDialog({ isOpen, playersCount, isClosing, onClose, onStay }: CloseRoomDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [secondsLeft, setSecondsLeft] = useState(AUTO_CLOSE_SECONDS);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
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

  return (
    <dialog
      ref={dialogRef}
      className="close-room"
      onCancel={(event) => {
        event.preventDefault();
        onStay();
      }}
      aria-labelledby="close-room-title"
    >
      <div className="close-room-body">
        <h2 id="close-room-title" className="close-room-title">
          Закрыть комнату?
        </h2>

        <p className="close-room-text">
          Вы создатель комнаты. Если уйти, комната удалится
          {others > 0 ? `, а ${others} ${others === 1 ? "игрок вернётся" : "игроков вернутся"} в меню.` : "."}
        </p>

        <p className="close-room-timer">
          {isClosing ? "Удаляем комнату…" : `Удалится автоматически через ${secondsLeft} сек`}
        </p>

        <div className="close-room-buttons">
          <button type="button" className="btn btn-dark" onClick={onStay} disabled={isClosing}>
            Остаться
          </button>
          <button type="button" className="btn btn-red" onClick={onClose} disabled={isClosing}>
            Удалить комнату
          </button>
        </div>
      </div>
    </dialog>
  );
}

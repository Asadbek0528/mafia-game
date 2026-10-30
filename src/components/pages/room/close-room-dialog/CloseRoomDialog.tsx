"use client";

import { playersWord } from "@/utils/format";
import { AUTO_CLOSE_SECONDS, useCloseRoomDialog } from "@/utils/room/close-room-dialog";

import "./close-room-dialog.scss";

type CloseRoomDialogProps = {
  isOpen: boolean;
  roomName: string;
  playersCount: number;
  isClosing: boolean;
  onClose: () => void;
  onStay: () => void;
};

export default function CloseRoomDialog({ isOpen, roomName, playersCount, isClosing, onClose, onStay }: CloseRoomDialogProps) {
  const { dialogRef, stayRef, secondsLeft, openKey, others, isHurry, handleCancel, handleMouseDown } = useCloseRoomDialog({ isOpen, isClosing, playersCount, onClose, onStay });

  return (
    <dialog
      ref={dialogRef}
      className="close-room"
      onCancel={handleCancel}
      onMouseDown={handleMouseDown}
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

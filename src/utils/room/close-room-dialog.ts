import { type MouseEvent, type SyntheticEvent, useEffect, useRef, useState } from "react";

import { useModalDialog } from "@/utils/use-modal-dialog";

export const AUTO_CLOSE_SECONDS = 20;

type CloseRoomOptions = {
  isOpen: boolean;
  isClosing: boolean;
  playersCount: number;
  onClose: () => void;
  onStay: () => void;
};

export function useCloseRoomDialog({ isOpen, isClosing, playersCount, onClose, onStay }: CloseRoomOptions) {
  const stayRef = useRef<HTMLButtonElement>(null);
  const [secondsLeft, setSecondsLeft] = useState(AUTO_CLOSE_SECONDS);
  const [openKey, setOpenKey] = useState(0);
  const dialogRef = useModalDialog(isOpen, () => {
    setOpenKey((key) => key + 1);
    stayRef.current?.focus();
  });

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

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

  return {
    dialogRef,
    stayRef,
    secondsLeft,
    openKey,
    others: Math.max(0, playersCount - 1),
    isHurry: secondsLeft <= 5,
    handleCancel: (event: SyntheticEvent<HTMLDialogElement>) => {
      event.preventDefault();
      onStay();
    },
    handleMouseDown: (event: MouseEvent<HTMLDialogElement>) => {
      if (event.target === event.currentTarget && !isClosing) onStay();
    },
  };
}

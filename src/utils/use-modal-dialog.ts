import { useEffect, useRef } from "react";

export function useModalDialog(isOpen: boolean, onOpen?: () => void) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
      onOpenRef.current?.();
    }
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return dialogRef;
}

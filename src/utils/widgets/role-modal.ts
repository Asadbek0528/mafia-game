import { type MouseEvent, useState } from "react";

import type { Role } from "@/utils/roles";
import { useModalDialog } from "@/utils/use-modal-dialog";

export function useRoleCards() {
  const [openRole, setOpenRole] = useState<Role | null>(null);
  return { openRole, setOpenRole, close: () => setOpenRole(null) };
}

export function useRoleModal(role: Role | null, onClose: () => void) {
  const dialogRef = useModalDialog(role !== null);
  return {
    dialogRef,
    handleClick: (event: MouseEvent<HTMLDialogElement>) => {
      if (event.target === event.currentTarget) onClose();
    },
  };
}

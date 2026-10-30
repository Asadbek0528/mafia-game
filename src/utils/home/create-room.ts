import { useRouter } from "next/navigation";
import { type CSSProperties, type FormEvent, type MouseEvent, useState } from "react";

import { showToast } from "@/utils/toast";
import { api, ApiError } from "@/utils/api";
import { countRoles, MAX_PLAYERS, MIN_PLAYERS } from "@/utils/roles";
import { useModalDialog } from "@/utils/use-modal-dialog";

export const DEFAULT_ROOM_NAME = "Моя комната";

export const AGE_OPTIONS = [
  { value: 0, label: "Для всех" },
  { value: 12, label: "12+" },
  { value: 16, label: "16+" },
  { value: 18, label: "18+" },
];

export function rolesPreview(players: number) {
  const roles = countRoles(players);
  const civilians = players - roles.mafia - roles.doctor - roles.commissar;
  return [
    { label: "Мафия", count: roles.mafia, className: "create-room-role create-room-role-mafia" },
    { label: "Доктор", count: roles.doctor, className: "create-room-role" },
    { label: "Комиссар", count: roles.commissar, className: "create-room-role" },
    { label: "Жители", count: civilians, className: "create-room-role" },
  ].filter((item) => item.count > 0);
}

export function useCreateRoom(isOpen: boolean, onClose: () => void) {
  const router = useRouter();
  const dialogRef = useModalDialog(isOpen);

  const [name, setName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [age, setAge] = useState(16);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const roomName = name.trim() || DEFAULT_ROOM_NAME;

    setIsLoading(true);
    try {
      const room = await api.createRoom(roomName, maxPlayers, age);
      router.push(`/room/${room.id}`);
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 0;

      if (status === 0 || status >= 500) {
        const demoId = String(Math.floor(10000 + Math.random() * 89999));
        sessionStorage.setItem(`demo_room_${demoId}`, JSON.stringify({ name: roomName, maxPlayers }));
        showToast("Сервер сейчас недоступен — пока можно сыграть тренировочную партию с ботами.");
        router.push(`/room/${demoId}`);
      } else {
        showToast((error as Error).message, "error");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return {
    dialogRef,
    name,
    setName,
    maxPlayers,
    setMaxPlayers,
    age,
    setAge,
    isLoading,
    handleSubmit,
    rangeStyle: { "--fill": `${((maxPlayers - MIN_PLAYERS) / (MAX_PLAYERS - MIN_PLAYERS)) * 100}%` } as CSSProperties,
    handleBackdrop: (event: MouseEvent<HTMLDialogElement>) => {
      if (event.target === event.currentTarget) onClose();
    },
  };
}

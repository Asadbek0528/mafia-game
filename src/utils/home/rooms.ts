import type { RoomShort } from "@/utils/api";

export function heroEyebrow(openRooms: number | null): string {
  if (openRooms === null) return "Город засыпает…";
  return openRooms > 0 ? `Открыто комнат: ${openRooms}` : "Город ждёт игроков";
}

export function roomCardView(room: RoomShort) {
  const isPlaying = room.status === "playing";
  const isFull = room.players >= room.max_players;

  let buttonText = "Войти";
  if (isPlaying) buttonText = "Игра уже идёт";
  else if (isFull) buttonText = "Мест нет";

  let badgeClass = "rooms-badge";
  let badgeText = "Набор";
  if (isPlaying) {
    badgeClass = "rooms-badge rooms-badge-live";
    badgeText = "В игре";
  } else if (isFull) {
    badgeClass = "rooms-badge rooms-badge-full";
    badgeText = "Заполнена";
  }

  return {
    canJoin: !isPlaying && !isFull,
    fill: Math.min(100, Math.round((room.players / Math.max(1, room.max_players)) * 100)),
    buttonText,
    badgeClass,
    badgeText,
    ageText: room.age > 0 ? `${room.age}+` : "0+",
  };
}

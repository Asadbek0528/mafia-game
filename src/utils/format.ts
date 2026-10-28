export function voteWord(count: number): string {
  const last = count % 10;
  const lastTwo = count % 100;
  if (last === 1 && lastTwo !== 11) return "голос";
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return "голоса";
  return "голосов";
}

export function formatSeconds(total: number): string {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes === 0) return `${seconds} сек`;
  if (seconds === 0) return `${minutes} мин`;
  return `${minutes} мин ${seconds} сек`;
}

export function formatClock(seconds: number): string {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export function formatTimeOfDay(time: number): string {
  return new Date(time).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export function playersWord(count: number): string {
  const last = count % 10;
  const lastTwo = count % 100;
  if (last === 1 && lastTwo !== 11) return "игрок";
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return "игрока";
  return "игроков";
}

export function mafiaWord(count: number): string {
  if (count === 1) return "мафия";
  if (count >= 2 && count <= 4) return "мафии";
  return "мафий";
}

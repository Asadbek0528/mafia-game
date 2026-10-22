// Настоящая кровь (бесплатные ролики Mixkit, у обоих чёрный фон — накладываем через mix-blend-mode: screen):
// drops — «Blood drops on black background»: кровь льётся сверху и стекает (главная, регистрация, комната);
// pool  — «Murder blood on black background»: удар брызгами и растекающаяся лужа (убийство в игре, профиль).
const FILES = {
  drops: { big: "/video/blood.mp4", small: "/video/blood-small.mp4" },
  pool: { big: "/video/blood-pool.mp4", small: "/video/blood-pool-small.mp4" },
};

export type BloodVideoKind = keyof typeof FILES;

// Видео не грузим, если человек просит меньше движения или экономит трафик
export function canPlayBloodVideo(): boolean {
  if (typeof window === "undefined") return false;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  return !reduceMotion && !saveData;
}

// На телефоне — лёгкая версия 360p
export function bloodVideoSrc(kind: BloodVideoKind): string {
  const isSmall = typeof window !== "undefined" && window.matchMedia("(max-width: 860px)").matches;
  return isSmall ? FILES[kind].small : FILES[kind].big;
}

// Заранее скачиваем ролик в кэш браузера, чтобы в нужный момент он начался сразу
const warmed = new Set<string>();
export function warmBloodVideo(kind: BloodVideoKind) {
  if (!canPlayBloodVideo()) return;
  const src = bloodVideoSrc(kind);
  if (warmed.has(src)) return;
  warmed.add(src);
  fetch(src, { cache: "force-cache" }).catch(() => warmed.delete(src));
}

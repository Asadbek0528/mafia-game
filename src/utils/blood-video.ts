import { type SyntheticEvent, useEffect, useState } from "react";

const FILES = {
  drops: { big: "/video/blood.mp4", small: "/video/blood-small.mp4" },
  pool: { big: "/video/blood-pool.mp4", small: "/video/blood-pool-small.mp4" },
};

export type BloodVideoKind = keyof typeof FILES;

export function canPlayBloodVideo(): boolean {
  if (typeof window === "undefined") return false;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  return !reduceMotion && !saveData;
}

export function bloodVideoSrc(kind: BloodVideoKind): string {
  const isSmall = typeof window !== "undefined" && window.matchMedia("(max-width: 860px)").matches;
  return isSmall ? FILES[kind].small : FILES[kind].big;
}

const WARM_DELAY_MS = 3000;
const warmed = new Set<string>();
export function warmBloodVideo(kind: BloodVideoKind) {
  if (!canPlayBloodVideo()) return;
  const src = bloodVideoSrc(kind);
  if (warmed.has(src)) return;
  warmed.add(src);
  setTimeout(() => {
    fetch(src, { cache: "force-cache" }).catch(() => warmed.delete(src));
  }, WARM_DELAY_MS);
}

export type BloodSide = "left" | "right";
export const BLOOD_SIDES: BloodSide[] = ["left", "right"];

type SideBloodOptions = {
  minWidth: number;
  playbackRate: number;
  delays: Record<BloodSide, number>;
};

export function useSideBloodVideo({ minWidth, playbackRate, delays }: SideBloodOptions) {
  const [src, setSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState<Record<BloodSide, boolean>>({ left: false, right: false });

  useEffect(() => {
    if (canPlayBloodVideo() && window.matchMedia(`(min-width: ${minWidth}px)`).matches) setSrc(bloodVideoSrc("drops"));
  }, [minWidth]);

  return {
    src,
    playing,
    isOn: playing.left || playing.right,
    onLoadedMetadata: (side: BloodSide) => (event: SyntheticEvent<HTMLVideoElement>) => {
      const video = event.currentTarget;
      video.playbackRate = playbackRate;
      setTimeout(() => video.play().catch(() => {}), delays[side]);
    },
    onPlaying: (side: BloodSide) => () => setPlaying((old) => ({ ...old, [side]: true })),
    onError: () => setSrc(null),
  };
}

export const HOME_BLOOD = { minWidth: 1600, playbackRate: 1.15, delays: { left: 300, right: 1600 } };
export const ROOM_BLOOD = { minWidth: 1360, playbackRate: 1.1, delays: { left: 800, right: 0 } };

export function useBloodVideo(kind: BloodVideoKind = "drops") {
  const [src, setSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (canPlayBloodVideo()) setSrc(bloodVideoSrc(kind));
  }, [kind]);

  return {
    src,
    isPlaying,
    onPlaying: () => setIsPlaying(true),
    onError: () => setSrc(null),
  };
}

export function slowBloodPlayback(event: SyntheticEvent<HTMLVideoElement>) {
  event.currentTarget.playbackRate = 0.7;
}

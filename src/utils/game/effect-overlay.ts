import { type CSSProperties, type SyntheticEvent, useEffect, useState } from "react";

import { bloodVideoSrc, canPlayBloodVideo, warmBloodVideo } from "@/utils/blood-video";

import { EFFECT_DURATION_MS } from "./game-logic";
import type { GameEffect } from "./types";

export const BLOOD_DRIPS: CSSProperties[] = Array.from({ length: 14 }, (_, index) => ({
  left: `${(index * 7.3 + 3) % 100}%`,
  animationDelay: `${(index % 5) * 0.12}s`,
  height: `${18 + ((index * 13) % 30)}vh`,
}));

export function useEffectOverlay(effect: GameEffect | null, onDone: () => void) {
  useEffect(() => {
    warmBloodVideo("pool");
  }, []);

  useEffect(() => {
    if (!effect) return;
    if ("vibrate" in navigator && navigator.userActivation?.hasBeenActive) navigator.vibrate?.(effect.kind === "blood" ? [120, 60, 220] : 120);
    const timer = setTimeout(onDone, EFFECT_DURATION_MS);
    return () => clearTimeout(timer);
  }, [effect, onDone]);
}

export function useBloodSplash() {
  const [src, setSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (canPlayBloodVideo()) setSrc(bloodVideoSrc("pool"));
  }, []);

  return {
    src,
    isPlaying,
    onLoadedMetadata: (event: SyntheticEvent<HTMLVideoElement>) => {
      event.currentTarget.currentTime = 0.15;
      event.currentTarget.playbackRate = 1.3;
    },
    onPlaying: () => setIsPlaying(true),
    onError: () => setSrc(null),
  };
}

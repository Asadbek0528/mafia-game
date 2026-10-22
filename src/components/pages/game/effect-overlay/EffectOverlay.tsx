"use client";

import { useEffect, useState } from "react";

import ShieldOrb from "@/components/pages/widgets/shield-orb/ShieldOrb";
import { bloodVideoSrc, canPlayBloodVideo, warmBloodVideo } from "@/lib/blood-video";

import "./effect-overlay.scss";

export type GameEffect = {
  key: string;
  kind: "blood" | "heal" | "mafia" | "clean" | "info" | "shield";
  title: string;
  text?: string;
};

type EffectOverlayProps = {
  effect: GameEffect | null;
  onDone: () => void;
};

const DURATION_MS = 4200;

export default function EffectOverlay({ effect, onDone }: EffectOverlayProps) {
  // Ролик с брызгами качаем заранее, пока идёт игра, — в момент убийства он начнётся без задержки
  useEffect(() => {
    warmBloodVideo("pool");
  }, []);

  useEffect(() => {
    if (!effect) return;
    if ("vibrate" in navigator && navigator.userActivation?.hasBeenActive) navigator.vibrate?.(effect.kind === "blood" ? [120, 60, 220] : 120);
    const timer = setTimeout(onDone, DURATION_MS);
    return () => clearTimeout(timer);
  }, [effect, onDone]);

  if (!effect) return null;

  return (
    <div key={effect.key} className={`effect-overlay effect-overlay-${effect.kind}`} role="alert" onClick={onDone}>
      {effect.kind === "blood" && <BloodSplash />}

      {effect.kind === "blood" && (
        <div className="effect-overlay-drips" aria-hidden="true">
          {Array.from({ length: 14 }, (_, index) => (
            <span key={index} style={{ left: `${(index * 7.3 + 3) % 100}%`, animationDelay: `${(index % 5) * 0.12}s`, height: `${18 + ((index * 13) % 30)}vh` }} />
          ))}
        </div>
      )}

      {effect.kind === "heal" && (
        <div className="effect-overlay-cross" aria-hidden="true">
          <span />
          <span />
        </div>
      )}

      {effect.kind === "shield" && (
        <div className="effect-overlay-orb" aria-hidden="true">
          <ShieldOrb size={240} burst />
        </div>
      )}

      {(effect.kind === "mafia" || effect.kind === "clean") && (
        <div className="effect-overlay-stamp" aria-hidden="true">
          {effect.kind === "mafia" ? "МАФИЯ" : "ЧИСТ"}
        </div>
      )}

      <div className="effect-overlay-text">
        <p className="effect-overlay-title">{effect.title}</p>
        {effect.text && <p className="effect-overlay-subtitle">{effect.text}</p>}
      </div>
    </div>
  );
}

// Настоящие брызги крови на весь экран; пока видео не началось (или выключено) — видны нарисованные подтёки
function BloodSplash() {
  const [src, setSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (canPlayBloodVideo()) setSrc(bloodVideoSrc("pool"));
  }, []);

  if (!src) return null;

  return (
    <video
      className={isPlaying ? "effect-overlay-splash effect-overlay-splash-playing" : "effect-overlay-splash"}
      src={src}
      autoPlay
      muted
      playsInline
      aria-hidden="true"
      onLoadedMetadata={(event) => {
        // Удар брызгами — первые секунды ролика, чуть быстрее обычного
        event.currentTarget.currentTime = 0.15;
        event.currentTarget.playbackRate = 1.3;
      }}
      onPlaying={() => setIsPlaying(true)}
      onError={() => setSrc(null)}
    />
  );
}

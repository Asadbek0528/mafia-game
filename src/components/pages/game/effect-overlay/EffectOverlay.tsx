"use client";

import { useEffect } from "react";

import "./effect-overlay.scss";

export type GameEffect = {
  key: string;
  kind: "blood" | "heal" | "mafia" | "clean" | "info";
  title: string;
  text?: string;
};

type EffectOverlayProps = {
  effect: GameEffect | null;
  onDone: () => void;
};

const DURATION_MS = 4200;

export default function EffectOverlay({ effect, onDone }: EffectOverlayProps) {
  useEffect(() => {
    if (!effect) return;
    if ("vibrate" in navigator) navigator.vibrate?.(effect.kind === "blood" ? [120, 60, 220] : 120);
    const timer = setTimeout(onDone, DURATION_MS);
    return () => clearTimeout(timer);
  }, [effect, onDone]);

  if (!effect) return null;

  return (
    <div key={effect.key} className={`effect-overlay effect-overlay-${effect.kind}`} role="alert" onClick={onDone}>
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

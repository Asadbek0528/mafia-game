"use client";

import ShieldOrb from "@/components/pages/widgets/shield-orb/ShieldOrb";
import { BLOOD_DRIPS, useBloodSplash, useEffectOverlay } from "@/utils/game/effect-overlay";
import type { GameEffect } from "@/utils/game/types";

import "./effect-overlay.scss";

type EffectOverlayProps = {
  effect: GameEffect | null;
  onDone: () => void;
};

export default function EffectOverlay({ effect, onDone }: EffectOverlayProps) {
  useEffectOverlay(effect, onDone);

  if (!effect) return null;

  return (
    <div key={effect.key} className={`effect-overlay effect-overlay-${effect.kind}`} role="alert" onClick={onDone}>
      {effect.kind === "blood" && <BloodSplash />}

      {effect.kind === "blood" && (
        <div className="effect-overlay-drips" aria-hidden="true">
          {BLOOD_DRIPS.map((style, index) => (
            <span key={index} style={style} />
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

function BloodSplash() {
  const { src, isPlaying, onLoadedMetadata, onPlaying, onError } = useBloodSplash();

  if (!src) return null;

  return (
    <video
      className={isPlaying ? "effect-overlay-splash effect-overlay-splash-playing" : "effect-overlay-splash"}
      src={src}
      autoPlay
      muted
      playsInline
      aria-hidden="true"
      onLoadedMetadata={onLoadedMetadata}
      onPlaying={onPlaying}
      onError={onError}
    />
  );
}

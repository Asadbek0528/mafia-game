"use client";

import { useEffect } from "react";

import type { GamePhase } from "@/lib/api";
import "./phase-transition.scss";

export type PhaseTransitionInfo = {
  key: string;
  phase: GamePhase;
  round: number;
};

type PhaseTransitionProps = {
  info: PhaseTransitionInfo | null;
  onDone: () => void;
};

export const PHASE_TRANSITION_MS = 3200;

const TEXT: Record<GamePhase, { title: string; subtitle: string }> = {
  NIGHT: { title: "Ночь", subtitle: "Город засыпает. Просыпается мафия…" },
  DAY: { title: "День", subtitle: "Город просыпается" },
  VOTING: { title: "Голосование", subtitle: "Решите, кого выгнать из города" },
};

export default function PhaseTransition({ info, onDone }: PhaseTransitionProps) {
  useEffect(() => {
    if (!info) return;
    const timer = setTimeout(onDone, PHASE_TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [info, onDone]);

  if (!info) return null;

  const text = TEXT[info.phase];
  const title = info.phase === "VOTING" ? text.title : `${text.title} ${info.round}`;

  return (
    <div key={info.key} className={`phase-transition phase-transition-${info.phase.toLowerCase()}`} onClick={onDone} role="status">
      <div className="phase-transition-sky" aria-hidden="true">
        <span className="phase-transition-stars" />
        <span className="phase-transition-sun" />
        <span className="phase-transition-moon" />
        <span className="phase-transition-city" />
      </div>

      <div className="phase-transition-text">
        <p className="phase-transition-title">{title}</p>
        <p className="phase-transition-subtitle">{text.subtitle}</p>
      </div>
    </div>
  );
}

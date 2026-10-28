"use client";

import { PHASE_TRANSITION_MS, PHASE_TRANSITION_TEXT } from "@/utils/game/game-logic";
import type { PhaseTransitionInfo } from "@/utils/game/types";
import { useTimeout } from "@/utils/use-timeout";
import "./phase-transition.scss";

type PhaseTransitionProps = {
  info: PhaseTransitionInfo | null;
  onDone: () => void;
};

export default function PhaseTransition({ info, onDone }: PhaseTransitionProps) {
  useTimeout(info, onDone, PHASE_TRANSITION_MS);

  if (!info) return null;

  const text = PHASE_TRANSITION_TEXT[info.phase];

  return (
    <div key={info.key} className={`phase-transition phase-transition-${info.phase.toLowerCase()}`} onClick={onDone} role="status">
      <div className="phase-transition-sky" aria-hidden="true">
        <span className="phase-transition-stars" />
        <span className="phase-transition-sun" />
        <span className="phase-transition-moon" />
        <span className="phase-transition-city" />
      </div>

      <div className="phase-transition-text">
        <p className="phase-transition-title">{info.phase === "VOTING" ? text.title : `${text.title} ${info.round}`}</p>
        <p className="phase-transition-subtitle">{text.subtitle}</p>
      </div>
    </div>
  );
}

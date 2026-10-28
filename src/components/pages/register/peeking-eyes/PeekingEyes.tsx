"use client";

import { usePeekingEyes } from "@/utils/register/peeking-eyes";

import "./peeking-eyes.scss";

export default function PeekingEyes({ isAngry }: { isAngry: boolean }) {
  const { rootRef, mood } = usePeekingEyes();

  return (
    <div ref={rootRef} className={`peeking-eyes peeking-eyes-${mood}${isAngry ? " peeking-eyes-angry" : ""}`} aria-hidden="true">
      <svg className="peeking-eyes-figure" viewBox="0 0 96 64">
        <defs>
          <radialGradient id="peeking-eye-glow" cx="0.5" cy="0.45" r="0.6">
            <stop offset="0" stopColor="#fff1c7" />
            <stop offset="0.35" stopColor="#ffb02e" />
            <stop offset="1" stopColor="#e0202b" />
          </radialGradient>
        </defs>

        {/* Голова в тени и шляпа */}
        <ellipse className="peeking-eyes-head" cx="48" cy="50" rx="21" ry="22" />
        <path className="peeking-eyes-hat" d="M28 25c0-11 4.5-19 20-19s20 8 20 19Z" />
        <path className="peeking-eyes-band" d="M28.6 20.5h38.8V25H28.6Z" />
        <ellipse className="peeking-eyes-brim" cx="48" cy="26" rx="34" ry="5" />

        {/* Глаза: светятся в темноте, зрачки следят */}
        <g className="peeking-eyes-eye">
          <ellipse cx="40" cy="38" rx="5" ry="3.1" fill="url(#peeking-eye-glow)" />
          <circle className="peeking-eyes-pupil" cx="40" cy="38" r="1.5" />
          <rect className="peeking-eyes-lid" x="34" y="34" width="12" height="8" />
        </g>
        <g className="peeking-eyes-eye">
          <ellipse cx="56" cy="38" rx="5" ry="3.1" fill="url(#peeking-eye-glow)" />
          <circle className="peeking-eyes-pupil" cx="56" cy="38" r="1.5" />
          <rect className="peeking-eyes-lid" x="50" y="34" width="12" height="8" />
        </g>

        {/* Брови — только когда злится */}
        <path className="peeking-eyes-brow" d="M34.5 32.5 45 35M61.5 32.5 51 35" />
      </svg>
    </div>
  );
}

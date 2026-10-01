import type { GamePhase } from "@/lib/api";
import "./game-header.scss";

type GameHeaderProps = {
  phase: GamePhase;
  round: number;
  secondsLeft: number;
  duration: number;
  hint: string;
};

type StepIcon = "night" | "day" | "voting";

const TITLE: Record<GamePhase, string> = { NIGHT: "Ночь", DAY: "День", VOTING: "Голосование" };
const UNTIL: Record<GamePhase, string> = { NIGHT: "До утра", DAY: "До голосования", VOTING: "До ночи" };
const STEP_INDEX: Record<GamePhase, number> = { NIGHT: 0, DAY: 1, VOTING: 2 };

function formatTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function PhaseIcon({ icon }: { icon: StepIcon }) {
  if (icon === "night") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
      </svg>
    );
  }
  if (icon === "day") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="12" cy="12" r="4.5" />
        <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5h16v11H9l-5 4z" />
      <path d="M8.5 9h7M8.5 12h4" />
    </svg>
  );
}

export default function GameHeader({ phase, round, secondsLeft, duration, hint }: GameHeaderProps) {
  const progress = duration > 0 ? Math.min(1, Math.max(0, 1 - secondsLeft / duration)) : 0;
  const activeStep = STEP_INDEX[phase];
  const steps: { icon: StepIcon; label: string }[] = [
    { icon: "night", label: `Ночь ${round}` },
    { icon: "day", label: `День ${round}` },
    { icon: "voting", label: "Голосование" },
    { icon: "night", label: `Ночь ${round + 1}` },
  ];

  return (
    <section className={`game-header game-header-${phase.toLowerCase()}`} aria-label={`${TITLE[phase]}, осталось ${secondsLeft} секунд`}>
      <div className="game-header-top">
        <span className="game-header-icon">
          <PhaseIcon icon={phase === "NIGHT" ? "night" : phase === "DAY" ? "day" : "voting"} />
        </span>

        <div className="game-header-info">
          <h1 className="game-header-title">
            {TITLE[phase]}
            {phase !== "VOTING" && ` ${round}`}
          </h1>
          <p className="game-header-hint">{hint}</p>
        </div>

        <div className={secondsLeft <= 10 ? "game-header-timer game-header-timer-hurry" : "game-header-timer"}>
          <span>{UNTIL[phase]}</span>
          <b>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="13" r="7.5" />
              <path d="M12 9v4l2.5 2M4.5 4.5 7 6.5M19.5 4.5 17 6.5" />
            </svg>
            {formatTime(secondsLeft)}
          </b>
        </div>
      </div>

      <ol className="game-header-steps" aria-label="Порядок фаз">
        {steps.map((step, index) => {
          let className = "game-header-step";
          if (index === activeStep) className += " game-header-step-active";
          else if (index < activeStep) className += " game-header-step-done";
          return (
            <li key={step.label} className={className} aria-current={index === activeStep ? "step" : undefined}>
              <span className="game-header-step-dot">
                <PhaseIcon icon={step.icon} />
              </span>
              <span className="game-header-step-label">{step.label}</span>
            </li>
          );
        })}
      </ol>

      <div className="game-header-progress" aria-hidden="true">
        <span style={{ width: `${progress * 100}%` }} />
      </div>
    </section>
  );
}

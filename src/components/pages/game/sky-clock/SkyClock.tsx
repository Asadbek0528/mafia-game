import type { GamePhase } from "@/lib/api";
import "./sky-clock.scss";

type SkyClockProps = {
  phase: GamePhase;
  round: number;
  secondsLeft: number;
  duration: number;
  hint: string;
};

const TITLE: Record<GamePhase, string> = { NIGHT: "Ночь", DAY: "День", VOTING: "Голосование" };
const UNTIL: Record<GamePhase, string> = { NIGHT: "До утра", DAY: "До голосования", VOTING: "До ночи" };

function formatTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export default function SkyClock({ phase, round, secondsLeft, duration, hint }: SkyClockProps) {
  const progress = duration > 0 ? Math.min(1, Math.max(0, 1 - secondsLeft / duration)) : 0;
  const left = 6 + progress * 88;
  const top = 78 - Math.sin(Math.PI * progress) * 58;
  const isNight = phase === "NIGHT";
  const isHurry = secondsLeft <= 10;

  return (
    <section className={`sky-clock sky-clock-${phase.toLowerCase()}`} aria-label={`${TITLE[phase]}, осталось ${secondsLeft} секунд`}>
      <div className="sky-clock-sky" aria-hidden="true">
        <svg className="sky-clock-arc" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M6 78 Q50 -38 94 78" fill="none" />
        </svg>
        <span className={isNight ? "sky-clock-body sky-clock-moon" : "sky-clock-body sky-clock-sun"} style={{ left: `${left}%`, top: `${top}%` }} />
      </div>

      <div className="sky-clock-info">
        <p className="sky-clock-title">
          {TITLE[phase]}
          {phase !== "VOTING" && <span> {round}</span>}
        </p>
        <p className="sky-clock-hint">{hint}</p>
      </div>

      <div className={isHurry ? "sky-clock-timer sky-clock-timer-hurry" : "sky-clock-timer"}>
        <span>{UNTIL[phase]}</span>
        <b>{formatTime(secondsLeft)}</b>
      </div>

      <div className="sky-clock-progress" aria-hidden="true">
        <span style={{ width: `${progress * 100}%` }} />
      </div>
    </section>
  );
}

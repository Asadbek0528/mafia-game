import Image from "next/image";

import type { GamePhase, RoleKey } from "@/lib/api";
import { getRole } from "@/lib/roles";
import "./game-header.scss";

type GameHeaderProps = {
  phase: GamePhase;
  round: number;
  secondsLeft: number;
  myRole: RoleKey | null;
  aliveCount: number;
  totalCount: number;
  onShowRole: () => void;
};

const PHASE_TITLE: Record<GamePhase, string> = {
  NIGHT: "Ночь",
  DAY: "День",
  VOTING: "Голосование",
};

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export default function GameHeader(props: GameHeaderProps) {
  const { phase, round, secondsLeft, myRole, aliveCount, totalCount, onShowRole } = props;
  const isNight = phase === "NIGHT";

  return (
    <header className="game-header">
      <span className={isNight ? "game-header-icon game-header-icon-night" : "game-header-icon game-header-icon-day"} aria-hidden="true">
        {isNight ? (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </span>

      <div className="game-header-info">
        <h1 className="game-header-title">
          {PHASE_TITLE[phase]} {round}
        </h1>
        <p className="game-header-alive">
          Живых: {aliveCount} из {totalCount}
        </p>
      </div>

      <p className={secondsLeft <= 10 ? "game-header-timer game-header-timer-hurry" : "game-header-timer"}>
        <span className="game-header-timer-label">До конца</span>
        {formatTime(secondsLeft)}
      </p>

      {myRole && (
        <button className="game-header-role" onClick={onShowRole} title="Показать мою роль">
          <Image src={getRole(myRole).image} alt="" width={40} height={60} />
          <span>{getRole(myRole).name}</span>
        </button>
      )}
    </header>
  );
}

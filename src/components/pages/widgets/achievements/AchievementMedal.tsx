import type { AchievementCode } from "@/utils/api";
import { ACHIEVEMENT_TONE } from "@/utils/achievements";

import "./achievement-medal.scss";

const ICONS: Record<AchievementCode, React.ReactNode> = {
  FIRST_WIN: <path d="M4 17 3 7l5 4 4-6 4 6 5-4-1 10Z M5 20h14" />,
  MAFIA_MASTERMIND: (
    <>
      <path d="M6 14c0-5 2-9 6-9s6 4 6 9" />
      <path d="M2.5 15.5c3 1.6 16 1.6 19 0" />
      <path d="M6.5 11.5h11" />
    </>
  ),
  GUARDIAN_ANGEL: (
    <>
      <ellipse cx="12" cy="4.5" rx="5" ry="1.6" />
      <path d="M12 9v11M7.5 13.5h9" />
    </>
  ),
  SHERLOCK: (
    <>
      <circle cx="10.5" cy="10.5" r="5.5" />
      <path d="m15 15 5.5 5.5" />
    </>
  ),
  SURVIVOR: (
    <>
      <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z" />
      <path d="M6 12h3l1.5-2.5 2 5 1.5-2.5H18" />
    </>
  ),
  PERFECT_TOWN: (
    <>
      <path d="M4 11 12 4l8 7v9H4Z" />
      <path d="m12 11 1.1 2.2 2.4.3-1.8 1.7.5 2.4-2.2-1.2-2.2 1.2.5-2.4-1.8-1.7 2.4-.3Z" />
    </>
  ),
};

type AchievementMedalProps = {
  code: AchievementCode;
  isUnlocked: boolean;
  size?: number;
};

export default function AchievementMedal({ code, isUnlocked, size = 72 }: AchievementMedalProps) {
  const tone = ACHIEVEMENT_TONE[code] ?? "gold";
  return (
    <span
      className={isUnlocked ? `achievement-medal achievement-medal-${tone}` : "achievement-medal achievement-medal-locked"}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {ICONS[code]}
      </svg>
      {!isUnlocked && (
        <span className="achievement-medal-lock">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 10V8a5 5 0 0 1 10 0v2h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Zm2 0h6V8a3 3 0 0 0-6 0Z" />
          </svg>
        </span>
      )}
    </span>
  );
}

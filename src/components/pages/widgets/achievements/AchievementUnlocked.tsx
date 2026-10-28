"use client";

import Link from "next/link";

import { SPARKS, useAchievementUnlocked } from "@/utils/widgets/achievements";

import AchievementMedal from "./AchievementMedal";
import "./achievement-unlocked.scss";

export default function AchievementUnlocked() {
  const { current, close } = useAchievementUnlocked();

  if (!current) return null;

  return (
    <div key={current.id} className="achievement-unlocked" role="status">
      <span className="achievement-unlocked-sparks" aria-hidden="true">
        {SPARKS.map((style, index) => (
          <i key={index} style={style} />
        ))}
      </span>
      <span className="achievement-unlocked-medal">
        <AchievementMedal code={current.code} isUnlocked size={68} />
      </span>
      <div className="achievement-unlocked-text">
        <p className="achievement-unlocked-label">Новое достижение</p>
        <p className="achievement-unlocked-title">{current.title}</p>
        <p className="achievement-unlocked-about">{current.description}</p>
      </div>
      <Link href="/profile" className="achievement-unlocked-link">
        Все достижения
      </Link>
      <button type="button" className="achievement-unlocked-close" aria-label="Закрыть" onClick={close}>
        ×
      </button>
    </div>
  );
}

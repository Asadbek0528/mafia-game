"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { Achievement } from "@/lib/api";
import { fetchNewAchievements } from "@/lib/achievements";
import { play } from "@/lib/sound";

import AchievementMedal from "./AchievementMedal";
import "./achievement-unlocked.scss";

// После игры backend выдаёт достижения не мгновенно — спрашиваем пару раз
const CHECK_DELAYS_MS = [2500, 8000];
const SHOW_MS = 6000;

// Поздравление «Получено достижение»: медальон вылетает и вращается, вокруг — искры
export default function AchievementUnlocked() {
  const [queue, setQueue] = useState<Achievement[]>([]);
  const current = queue[0] ?? null;

  useEffect(() => {
    const timers = CHECK_DELAYS_MS.map((delay) =>
      setTimeout(() => {
        fetchNewAchievements()
          .then((fresh) => {
            if (fresh.length) setQueue((old) => [...old, ...fresh.filter((item) => !old.some((known) => known.id === item.id))]);
          })
          .catch(() => {});
      }, delay),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (!current) return;
    play("win");
    const timer = setTimeout(() => setQueue((old) => old.slice(1)), SHOW_MS);
    return () => clearTimeout(timer);
  }, [current]);

  if (!current) return null;

  return (
    <div key={current.id} className="achievement-unlocked" role="status">
      <span className="achievement-unlocked-sparks" aria-hidden="true">
        {Array.from({ length: 10 }, (_, index) => (
          <i key={index} style={{ "--spark": index } as React.CSSProperties} />
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
      <button type="button" className="achievement-unlocked-close" aria-label="Закрыть" onClick={() => setQueue((old) => old.slice(1))}>
        ×
      </button>
    </div>
  );
}

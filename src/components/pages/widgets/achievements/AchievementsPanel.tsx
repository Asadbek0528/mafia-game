"use client";

import { useAchievements } from "@/lib/achievements";

import AchievementMedal from "./AchievementMedal";
import "./achievements-panel.scss";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

// Достижения в профиле: полученные — медальоны с датой, остальные — железо с замком и условием
export default function AchievementsPanel({ userId }: { userId: number }) {
  const { list, isError, reload } = useAchievements(userId);
  const unlocked = list?.filter((item) => item.unlockedAt).length ?? 0;
  const total = list?.length ?? 0;

  return (
    <section className="panel achievements-panel">
      <div className="panel-top">
        <h2 className="panel-title">Достижения</h2>
        {list && (
          <span className="achievements-panel-count">
            <b>{unlocked}</b> из {total}
          </span>
        )}
      </div>

      {list && total > 0 && (
        <div className="achievements-panel-progress" aria-hidden="true">
          <span style={{ width: `${(unlocked / total) * 100}%` }} />
        </div>
      )}

      {isError && (
        <p className="achievements-panel-empty">
          Не удалось загрузить достижения.{" "}
          <button type="button" className="btn-link" onClick={reload}>
            Повторить
          </button>
        </p>
      )}

      {!list && !isError && (
        <ul className="achievements-panel-grid" aria-busy="true">
          {Array.from({ length: 6 }, (_, index) => (
            <li key={index} className="achievements-panel-item achievements-panel-skeleton" />
          ))}
        </ul>
      )}

      {list && (
        <ul className="achievements-panel-grid">
          {list.map((item) => {
            const isUnlocked = Boolean(item.unlockedAt);
            return (
              <li key={item.id} className={isUnlocked ? "achievements-panel-item achievements-panel-item-unlocked" : "achievements-panel-item"}>
                <AchievementMedal code={item.code} isUnlocked={isUnlocked} size={64} />
                <div className="achievements-panel-text">
                  <p className="achievements-panel-name">{item.title}</p>
                  <p className="achievements-panel-about">{item.description}</p>
                  {item.unlockedAt && <p className="achievements-panel-date">Получено {formatDate(item.unlockedAt)}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

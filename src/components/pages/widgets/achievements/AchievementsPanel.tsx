"use client";

import { useAchievementsPanel } from "@/utils/widgets/achievements";

import AchievementMedal from "./AchievementMedal";
import "./achievements-panel.scss";

export default function AchievementsPanel({ userId }: { userId: number }) {
  const { list, isError, reload, unlocked, total, progress } = useAchievementsPanel(userId);

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
          <span style={{ width: `${progress}%` }} />
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
          {list.map((item) => (
            <li key={item.id} className={item.isUnlocked ? "achievements-panel-item achievements-panel-item-unlocked" : "achievements-panel-item"}>
              <AchievementMedal code={item.code} isUnlocked={item.isUnlocked} size={64} />
              <div className="achievements-panel-text">
                <p className="achievements-panel-name">{item.title}</p>
                <p className="achievements-panel-about">{item.description}</p>
                {item.dateText && <p className="achievements-panel-date">{item.dateText}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

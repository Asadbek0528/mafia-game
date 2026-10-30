"use client";

import Image from "next/image";

import { useProfileStats } from "@/utils/profile/profile";
import "./profile-stats.scss";

type ProfileStatsProps = {
  userId?: number;
};

export default function ProfileStats({ userId }: ProfileStatsProps) {
  const { hasTarget, isGuest, isMine, stats, isFailed, roleRows, favoriteRole, avgText } = useProfileStats(userId);

  if (!hasTarget) return null;

  if (isGuest) {
    return (
      <section className="panel profile-stats">
        <div className="panel-top">
          <h2 className="panel-title">Статистика</h2>
        </div>
        <p className="profile-stats-note">Статистика игроков видна после входа в аккаунт.</p>
      </section>
    );
  }

  return (
    <section className="panel profile-stats">
      <div className="panel-top">
        <h2 className="panel-title">Статистика</h2>
      </div>

      {!stats && !isFailed && <p className="profile-stats-note">Считаем ваши игры…</p>}
      {isFailed && <p className="profile-stats-note">Не удалось загрузить статистику.</p>}

      {stats && stats.games === 0 && <p className="profile-stats-note">{isMine ? "Сыграйте первую партию — здесь появятся ваши победы." : "У игрока пока нет законченных игр."}</p>}

      {stats && stats.games > 0 && (
        <>
          <dl className="profile-stats-numbers">
            <div>
              <dt>Игр</dt>
              <dd>{stats.games}</dd>
            </div>
            <div>
              <dt>Побед</dt>
              <dd className="profile-stats-win">{stats.wins}</dd>
            </div>
            <div>
              <dt>Поражений</dt>
              <dd className="profile-stats-lose">{stats.losses}</dd>
            </div>
            <div>
              <dt>Процент побед</dt>
              <dd>{stats.winrate}%</dd>
            </div>
            <div>
              <dt>Выжил</dt>
              <dd>{stats.survived}</dd>
            </div>
            <div>
              <dt>Средняя игра</dt>
              <dd>{avgText}</dd>
            </div>
          </dl>

          {favoriteRole && (
            <p className="profile-stats-favorite">
              {isMine ? "Чаще всего играете за" : "Чаще всего играет за"}: <b>{favoriteRole}</b>
            </p>
          )}

          <ul className="profile-stats-roles">
            {roleRows.map((role) => (
              <li key={role.key} className={role.isEmpty ? "profile-stats-role profile-stats-role-empty" : "profile-stats-role"}>
                <Image className="profile-stats-card" src={role.image} alt={role.name} width={120} height={180} />
                <div className="profile-stats-role-info">
                  <p className="profile-stats-role-name">{role.name}</p>
                  <p className="profile-stats-role-line">{role.line}</p>
                  <div className="profile-stats-bar" aria-label={`Процент побед ${role.rate}%`}>
                    <span style={{ width: `${role.rate}%` }} />
                  </div>
                </div>
                <span className="profile-stats-rate">{role.rateText}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

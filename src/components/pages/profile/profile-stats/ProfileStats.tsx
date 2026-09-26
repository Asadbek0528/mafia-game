"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { api, type MyStats } from "@/lib/api";
import { useCurrentUser } from "@/lib/auth";
import { getRole, ROLES } from "@/lib/roles";
import "./profile-stats.scss";

type ProfileStatsProps = {
  userId?: number;
};

export default function ProfileStats({ userId }: ProfileStatsProps) {
  const { user } = useCurrentUser();
  const [stats, setStats] = useState<MyStats | null>(null);
  const [isFailed, setIsFailed] = useState(false);

  const targetId = userId ?? user?.id;
  const isMine = userId === undefined || userId === user?.id;

  const isGuest = user?.guest === true;

  useEffect(() => {
    if (!targetId || isGuest) return;
    setStats(null);
    setIsFailed(false);
    api
      .getUserStats(targetId)
      .then(setStats)
      .catch(() => setIsFailed(true));
  }, [targetId, isGuest]);

  if (!targetId) return null;

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
              <dd>{stats.avgMinutes > 0 ? `${stats.avgMinutes} мин` : "—"}</dd>
            </div>
          </dl>

          {stats.favoriteRole && (
            <p className="profile-stats-favorite">
              {isMine ? "Чаще всего играете за" : "Чаще всего играет за"}: <b>{getRole(stats.favoriteRole).name}</b>
            </p>
          )}

          <ul className="profile-stats-roles">
            {ROLES.map((role) => {
              const item = stats.byRole[role.key];
              const rate = item.played ? Math.round((item.wins / item.played) * 100) : 0;

              return (
                <li key={role.key} className={item.played ? "profile-stats-role" : "profile-stats-role profile-stats-role-empty"}>
                  <Image className="profile-stats-card" src={role.image} alt={role.name} width={120} height={180} />
                  <div className="profile-stats-role-info">
                    <p className="profile-stats-role-name">{role.name}</p>
                    <p className="profile-stats-role-line">
                      {item.played} {item.played === 1 ? "игра" : "игр"} · {item.wins} {item.wins === 1 ? "победа" : "побед"}
                    </p>
                    <div className="profile-stats-bar" aria-label={`Процент побед ${rate}%`}>
                      <span style={{ width: `${rate}%` }} />
                    </div>
                  </div>
                  <span className="profile-stats-rate">{item.played ? `${rate}%` : "—"}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

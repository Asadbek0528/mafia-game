"use client";

import Link from "next/link";

import Avatar from "@/components/pages/widgets/avatar/Avatar";
import { useOnlinePlayers } from "@/utils/home/online-players";
import { toPlayerId } from "@/utils/player-id";
import { statusText } from "@/utils/social";
import "./online-players.scss";

export default function OnlinePlayers() {
  const { isGuest, online, shown, hiddenCount, countText, hasNoFriends, nobodyOnline } = useOnlinePlayers();

  return (
    <section className="panel">
      <div className="panel-top">
        <h2 className="panel-title">Друзья в сети</h2>
        {!isGuest && (
          <span className="online-count">
            <span className={online.length > 0 ? "status-dot" : "status-dot online-dot-off"} />
            {countText}
          </span>
        )}
      </div>

      {isGuest === true && (
        <p className="online-empty">
          <Link href="/register" className="online-link">Войдите в аккаунт</Link>, чтобы добавлять друзей и видеть, кто в сети.
        </p>
      )}

      {hasNoFriends && (
        <p className="online-empty">
          Друзей пока нет. <Link href="/friends" className="online-link">Найти по ID или нику →</Link>
        </p>
      )}

      {nobodyOnline && (
        <p className="online-empty">Сейчас никого из друзей нет в сети.</p>
      )}

      {online.length > 0 && (
        <ul className="online-list">
          {shown.map((friend) => (
            <li key={friend.id} className="online-player">
              <Link href={`/player/${toPlayerId(friend.id)}`} className="online-player-link">
                <Avatar name={friend.username} />
                <div>
                  <p className="online-name">{friend.username}</p>
                  <p className="online-status">
                    <span className={friend.status === "online" ? "status-dot" : "status-dot status-dot-yellow"} />
                    {statusText(friend)}
                  </p>
                </div>
              </Link>
              {friend.status === "room" && friend.roomId && (
                <Link href={`/room/${friend.roomId}`} className="btn btn-red btn-small">
                  Зайти
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}

      {hiddenCount > 0 && (
        <Link href="/friends" className="online-more">
          Ещё {hiddenCount} →
        </Link>
      )}
    </section>
  );
}

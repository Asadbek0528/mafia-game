"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import Avatar from "@/components/pages/widgets/avatar/Avatar";
import { getUser } from "@/lib/auth";
import { toPlayerId } from "@/lib/player-id";
import { statusText, useSocial } from "@/lib/social";
import "./online-players.scss";

const MAX_SHOWN = 6;

export default function OnlinePlayers() {
  const social = useSocial();
  const [isGuest, setIsGuest] = useState<boolean | null>(null);

  useEffect(() => {
    const user = getUser();
    setIsGuest(!user || Boolean(user.guest) || !user.id);
  }, []);

  const online = social.friends.filter((friend) => friend.online);

  return (
    <section className="panel">
      <div className="panel-top">
        <h2 className="panel-title">Друзья в сети</h2>
        {!isGuest && (
          <span className="online-count">
            <span className={online.length > 0 ? "status-dot" : "status-dot online-dot-off"} />
            {social.isReady ? `${online.length} из ${social.friends.length}` : "…"}
          </span>
        )}
      </div>

      {isGuest === true && (
        <p className="online-empty">
          <Link href="/register" className="online-link">Войдите в аккаунт</Link>, чтобы добавлять друзей и видеть, кто в сети.
        </p>
      )}

      {isGuest === false && social.isReady && social.friends.length === 0 && (
        <p className="online-empty">
          Друзей пока нет. <Link href="/friends" className="online-link">Найти по ID или нику →</Link>
        </p>
      )}

      {isGuest === false && social.isReady && social.friends.length > 0 && online.length === 0 && (
        <p className="online-empty">Сейчас никого из друзей нет в сети.</p>
      )}

      {online.length > 0 && (
        <ul className="online-list">
          {online.slice(0, MAX_SHOWN).map((friend) => (
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

      {online.length > MAX_SHOWN && (
        <Link href="/friends" className="online-more">
          Ещё {online.length - MAX_SHOWN} →
        </Link>
      )}
    </section>
  );
}

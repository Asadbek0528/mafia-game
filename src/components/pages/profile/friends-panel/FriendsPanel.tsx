"use client";

import Link from "next/link";

import Avatar from "@/components/pages/widgets/avatar/Avatar";
import { toPlayerId } from "@/lib/player-id";
import { statusText, useSocial } from "@/lib/social";
import "./friends-panel.scss";

export default function FriendsPanel() {
  const social = useSocial();
  const online = social.friends.filter((friend) => friend.online);
  const shown = (online.length > 0 ? online : social.friends).slice(0, 5);

  return (
    <section className="panel friends-panel">
      <div className="panel-top">
        <h2 className="panel-title">Друзья</h2>
        <span className="friends-panel-count">
          {social.isReady ? `в сети ${online.length} из ${social.friends.length}` : "подключаемся…"}
        </span>
      </div>

      {social.incoming.length > 0 && (
        <Link href="/friends" className="friends-panel-request friends-panel-request-link">
          Новые заявки в друзья: <b>{social.incoming.length}</b>
        </Link>
      )}

      <ul className="friends-panel-list">
        {social.friends.length === 0 && <li className="friends-panel-empty">Друзей пока нет — найдите их по ID.</li>}
        {shown.map((friend) => (
          <li key={friend.id}>
            <Link href={`/player/${toPlayerId(friend.id)}`} className="friends-panel-item">
              <span className="friends-panel-avatar">
                <Avatar name={friend.username} size={36} />
                <span className={friend.online ? "friends-panel-dot friends-panel-dot-online" : "friends-panel-dot"} />
              </span>
              <span className="friends-panel-name">
                {friend.username}
                <small className={friend.online ? "friends-panel-status-online" : undefined}>{statusText(friend)}</small>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <Link href="/friends" className="btn btn-dark btn-small btn-full">
        {social.friends.length > 0 ? "Все друзья и заявки →" : "Найти друзей →"}
      </Link>
    </section>
  );
}

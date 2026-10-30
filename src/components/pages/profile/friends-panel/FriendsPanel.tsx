"use client";

import Link from "next/link";

import Avatar from "@/components/pages/widgets/avatar/Avatar";
import { toPlayerId } from "@/utils/player-id";
import { useFriendsPanel } from "@/utils/profile/profile";
import { statusText } from "@/utils/social";
import "./friends-panel.scss";

export default function FriendsPanel() {
  const { hasFriends, shown, countText, linkText } = useFriendsPanel();

  return (
    <section className="panel friends-panel">
      <div className="panel-top">
        <h2 className="panel-title">Друзья</h2>
        <span className="friends-panel-count">
          {countText}
        </span>
      </div>

      <ul className="friends-panel-list">
        {!hasFriends && <li className="friends-panel-empty">Друзей пока нет — найдите их по ID.</li>}
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
        {linkText}
      </Link>
    </section>
  );
}

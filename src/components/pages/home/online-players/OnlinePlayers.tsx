"use client";

/*
  OnlinePlayers — кто сейчас на сайте.
*/
import { useEffect, useState } from "react";

import Avatar from "@/components/pages/widgets/avatar/Avatar";
import { api, loadOrDemo, type OnlineUser } from "@/lib/api";
import { DEMO_ONLINE } from "@/lib/demo";
import "./online-players.scss";

export default function OnlinePlayers() {
  const [players, setPlayers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    loadOrDemo(api.getOnlineUsers, DEMO_ONLINE).then(setPlayers);
  }, []);

  return (
    <section className="panel">
      <div className="panel-top">
        <h2 className="panel-title">Онлайн</h2>
        <span className="online-count">
          <span className="status-dot" />
          {players.length}
        </span>
      </div>

      {players.length === 0 && <p className="online-empty">Пока никого. Позовите друзей.</p>}

      <ul className="online-list">
        {players.slice(0, 8).map((player) => {
          const isPlaying = player.status === "playing";

          return (
            <li key={player.username} className="online-player">
              <Avatar name={player.username} />
              <div>
                <p className="online-name">{player.username}</p>
                <p className="online-status">
                  <span className={isPlaying ? "status-dot" : "status-dot status-dot-yellow"} />
                  {isPlaying ? "В игре" : "В лобби"}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

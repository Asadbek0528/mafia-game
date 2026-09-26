"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import Avatar from "@/components/pages/widgets/avatar/Avatar";
import { showToast } from "@/components/pages/widgets/toast/Toast";
import { api, type PublicUser } from "@/lib/api";
import { formatPlayerId, fromPlayerId, toPlayerId } from "@/lib/player-id";
import { statusText, useSocial } from "@/lib/social";
import "./friends-panel.scss";

export default function FriendsPanel() {
  const router = useRouter();
  const social = useSocial();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicUser[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const onlineCount = social.friends.filter((friend) => friend.online).length;

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    const text = query.trim();
    if (!text) return;

    const digits = text.replace(/\s/g, "");
    if (/^\d{7,8}$/.test(digits)) {
      const userId = fromPlayerId(digits);
      if (!userId) {
        showToast("Такого ID нет. Проверьте цифры.", "error");
        return;
      }
      router.push(`/player/${toPlayerId(userId)}`);
      return;
    }

    setIsSearching(true);
    try {
      setResults(await api.searchUsers(text));
    } catch (error) {
      showToast((error as Error).message, "error");
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <section className="panel friends-panel">
      <div className="panel-top">
        <h2 className="panel-title">Друзья</h2>
        <span className="friends-panel-count">
          {social.isReady ? `в сети ${onlineCount} из ${social.friends.length}` : "подключаемся…"}
        </span>
      </div>

      <form className="friends-panel-search" onSubmit={handleSearch}>
        <input
          className="input"
          placeholder="ID игрока (8 цифр) или ник"
          value={query}
          inputMode="search"
          onChange={(event) => {
            setQuery(event.target.value);
            setResults(null);
          }}
        />
        <button type="submit" className="btn btn-red" disabled={isSearching || !query.trim()}>
          {isSearching ? "…" : "Найти"}
        </button>
      </form>

      {results && (
        <ul className="friends-panel-list">
          {results.length === 0 && <li className="friends-panel-empty">Никого не нашли.</li>}
          {results.map((player) => (
            <li key={player.id}>
              <Link href={`/player/${toPlayerId(player.id)}`} className="friends-panel-item">
                <Avatar name={player.username} image={player.profileImage} size={36} />
                <span className="friends-panel-name">{player.username}</span>
                <span className="friends-panel-id">{formatPlayerId(toPlayerId(player.id))}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!results && social.incoming.length > 0 && (
        <div className="friends-panel-requests">
          <p className="friends-panel-subtitle">Заявки в друзья</p>
          {social.incoming.map((request) => (
            <div key={request.id} className="friends-panel-request">
              <Avatar name={request.username} size={32} />
              <span className="friends-panel-name">{request.username}</span>
              <button type="button" className="btn btn-red btn-small" onClick={() => social.accept(request.id)}>
                Принять
              </button>
              <button type="button" className="friends-panel-remove" onClick={() => social.decline(request.id)} aria-label="Отклонить" title="Отклонить">
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {!results && (
        <ul className="friends-panel-list">
          {social.friends.length === 0 && (
            <li className="friends-panel-empty">Найдите друга по ID и нажмите «Добавить в друзья» у него в профиле.</li>
          )}
          {social.friends.map((friend) => (
            <li key={friend.id} className="friends-panel-row">
              <Link href={`/player/${toPlayerId(friend.id)}`} className="friends-panel-item">
                <span className="friends-panel-avatar">
                  <Avatar name={friend.username} size={36} />
                  <span className={friend.online ? "friends-panel-dot friends-panel-dot-online" : "friends-panel-dot"} />
                </span>
                <span className="friends-panel-name">
                  {friend.username}
                  <small className={friend.online ? "friends-panel-status-online" : undefined}>{statusText(friend)}</small>
                </span>
                <span className="friends-panel-id">{formatPlayerId(toPlayerId(friend.id))}</span>
              </Link>
              <button
                type="button"
                className="friends-panel-remove"
                onClick={() => {
                  if (window.confirm(`Удалить ${friend.username} из друзей?`)) social.remove(friend.id);
                }}
                aria-label={`Удалить ${friend.username} из друзей`}
                title="Удалить из друзей"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

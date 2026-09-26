"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import Avatar from "@/components/pages/widgets/avatar/Avatar";
import { showToast } from "@/components/pages/widgets/toast/Toast";
import { api, type PublicUser } from "@/lib/api";
import { removeFriend, useFriends } from "@/lib/friends";
import { formatPlayerId, fromPlayerId, toPlayerId } from "@/lib/player-id";
import "./friends-panel.scss";

export default function FriendsPanel() {
  const router = useRouter();
  const friends = useFriends();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicUser[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

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
        <span className="friends-panel-count">{friends.length}</span>
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

      {!results && (
        <ul className="friends-panel-list">
          {friends.length === 0 && (
            <li className="friends-panel-empty">Найдите друга по ID и нажмите «Добавить в друзья» у него в профиле.</li>
          )}
          {friends.map((friend) => (
            <li key={friend.id} className="friends-panel-row">
              <Link href={`/player/${toPlayerId(friend.id)}`} className="friends-panel-item">
                <Avatar name={friend.username} size={36} />
                <span className="friends-panel-name">{friend.username}</span>
                <span className="friends-panel-id">{formatPlayerId(toPlayerId(friend.id))}</span>
              </Link>
              <button
                type="button"
                className="friends-panel-remove"
                onClick={() => removeFriend(friend.id)}
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

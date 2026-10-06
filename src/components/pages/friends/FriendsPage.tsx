"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Avatar from "@/components/pages/widgets/avatar/Avatar";
import { showToast } from "@/components/pages/widgets/toast/Toast";
import { api, type PublicUser } from "@/lib/api";
import { useCurrentUser } from "@/lib/auth";
import { formatPlayerId, fromPlayerId, toPlayerId } from "@/lib/player-id";
import { type FriendInfo, statusText, useSocial } from "@/lib/social";
import "./friends-page.scss";

type Tab = "friends" | "search";

export default function FriendsPage() {
  const router = useRouter();
  const { user, isLoaded } = useCurrentUser();
  const social = useSocial();
  const [tab, setTab] = useState<Tab>("friends");

  useEffect(() => {
    if (isLoaded && (!user || user.guest)) router.replace(user ? "/profile" : "/register");
  }, [isLoaded, user, router]);

  if (!user || user.guest) return null;

  const online = social.friends.filter((friend) => friend.online).length;

  return (
    <main className="friends-page">
      <div className="friends-page-top">
        <h1 className="friends-page-title">Друзья</h1>
        <p className="friends-page-summary">
          {social.isReady ? `${social.friends.length} друзей · в сети ${online}` : "Подключаемся к серверу…"}
        </p>
      </div>

      <div className="friends-page-tabs" role="tablist">
        <TabButton active={tab === "friends"} onClick={() => setTab("friends")}>
          Мои друзья
        </TabButton>
        <TabButton active={tab === "search"} onClick={() => setTab("search")}>
          Найти
        </TabButton>
      </div>

      {tab === "friends" && <FriendsList onFind={() => setTab("search")} />}
      {tab === "search" && <SearchPlayers myId={user.id ?? null} />}
    </main>
  );
}

function TabButton({ active, onClick, badge, children }: { active: boolean; onClick: () => void; badge?: number; children: React.ReactNode }) {
  return (
    <button type="button" role="tab" aria-selected={active} className={active ? "friends-page-tab friends-page-tab-active" : "friends-page-tab"} onClick={onClick}>
      {children}
      {badge ? <span className="friends-page-badge">{badge}</span> : null}
    </button>
  );
}

function FriendAvatar({ friend }: { friend: FriendInfo }) {
  return (
    <span className="friends-page-avatar">
      <Avatar name={friend.username} size={44} />
      <span className={friend.online ? "friends-page-dot friends-page-dot-online" : "friends-page-dot"} />
    </span>
  );
}

function FriendsList({ onFind }: { onFind: () => void }) {
  const social = useSocial();
  const router = useRouter();

  if (social.friends.length === 0) {
    return (
      <section className="panel friends-page-empty">
        <p>У вас пока нет друзей.</p>
        <button type="button" className="btn btn-red btn-small" onClick={onFind}>
          Найти по ID
        </button>
      </section>
    );
  }

  function removeFriend(friend: FriendInfo) {
    if (!window.confirm(`Удалить ${friend.username} из друзей?`)) return;
    social.remove(friend.id);
    showToast(`${friend.username} удалён из друзей.`);
  }

  return (
    <ul className="friends-page-list">
      {social.friends.map((friend) => (
        <li key={friend.id} className="panel friends-page-card">
          <FriendAvatar friend={friend} />
          <div className="friends-page-info">
            <p className="friends-page-name">{friend.username}</p>
            <p className={friend.online ? "friends-page-status friends-page-status-online" : "friends-page-status"}>
              {statusText(friend)} · ID {formatPlayerId(toPlayerId(friend.id))}
            </p>
          </div>
          <div className="friends-page-actions">
            {friend.status === "room" && friend.roomId && (
              <button type="button" className="btn btn-red btn-small" onClick={() => router.push(`/room/${friend.roomId}`)}>
                В его комнату
              </button>
            )}
            <Link href={`/player/${toPlayerId(friend.id)}`} className="btn btn-dark btn-small">
              Профиль
            </Link>
            <button type="button" className="btn btn-dark btn-small friends-page-remove" onClick={() => removeFriend(friend)}>
              Удалить
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function SearchPlayers({ myId }: { myId: number | null }) {
  const social = useSocial();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicUser[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    const text = query.trim();
    if (!text) return;

    setIsSearching(true);
    try {
      const digits = text.replace(/\s/g, "");
      if (/^\d{7,8}$/.test(digits)) {
        const userId = fromPlayerId(digits);
        if (!userId) {
          setResults([]);
          return;
        }
        const player = await api.getPublicUser(userId).catch(() => null);
        setResults(player ? [player] : []);
      } else {
        setResults(await api.searchUsers(text));
      }
    } catch (error) {
      showToast((error as Error).message, "error");
    } finally {
      setIsSearching(false);
    }
  }

  function actionFor(player: PublicUser) {
    if (player.id === myId) return <span className="friends-page-waiting">Это вы</span>;
    if (social.friends.some((friend) => friend.id === player.id)) return <span className="friends-page-waiting">В друзьях ✓</span>;
    return (
      <button
        type="button"
        className="btn btn-red btn-small"
        disabled={!social.isReady}
        onClick={() => social.sendRequest(player.id, player.username)}
      >
        Добавить
      </button>
    );
  }

  return (
    <section className="panel friends-page-search">
      <form className="friends-page-search-form" onSubmit={handleSearch}>
        <input
          className="input"
          placeholder="ID игрока (8 цифр) или ник"
          value={query}
          inputMode="search"
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="submit" className="btn btn-red" disabled={isSearching || !query.trim()}>
          {isSearching ? "…" : "Найти"}
        </button>
      </form>

      {results && results.length === 0 && <p className="friends-page-waiting">Никого не нашли.</p>}

      {results && results.length > 0 && (
        <ul className="friends-page-list">
          {results.map((player) => (
            <li key={player.id} className="friends-page-row">
              <Avatar name={player.username} image={player.profileImage} size={40} />
              <Link href={`/player/${toPlayerId(player.id)}`} className="friends-page-name friends-page-link">
                {player.username}
                <small>ID {formatPlayerId(toPlayerId(player.id))}</small>
              </Link>
              <div className="friends-page-actions">{actionFor(player)}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

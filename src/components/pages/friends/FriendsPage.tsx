"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import Avatar from "@/components/pages/widgets/avatar/Avatar";
import PlayerBackground from "@/components/pages/widgets/player-background/PlayerBackground";
import { showToast } from "@/components/pages/widgets/toast/Toast";
import { api, type PublicUser } from "@/lib/api";
import { useCurrentUser } from "@/lib/auth";
import { formatPlayerId, fromPlayerId, toPlayerId } from "@/lib/player-id";
import { copyText } from "@/lib/share";
import { useShop } from "@/lib/shop";
import { type FriendInfo, type FriendRequest, statusText, useSocial } from "@/lib/social";
import "./friends-page.scss";

type Tab = "friends" | "requests" | "search";

export default function FriendsPage() {
  const router = useRouter();
  const { user, isLoaded } = useCurrentUser();
  const social = useSocial();
  const [tab, setTab] = useState<Tab>("friends");

  useEffect(() => {
    if (isLoaded && !user) router.replace("/register");
  }, [isLoaded, user, router]);

  if (!user) return null;

  // Гостю не перекидываем молча на профиль, а объясняем, зачем нужен аккаунт
  if (user.guest) {
    return (
      <main className="friends-page">
        <header className="friends-page-top">
          <h1 className="friends-page-title">Друзья</h1>
        </header>
        <EmptyState
          title="Друзья доступны с аккаунтом"
          text="Создайте аккаунт, чтобы добавлять игроков по ID, видеть, кто в сети, и звать друзей в комнату."
          action={
            <Link href="/register" className="btn btn-red btn-small">
              Создать аккаунт
            </Link>
          }
        />
      </main>
    );
  }

  const online = social.friends.filter((friend) => friend.online).length;
  const requests = social.incoming.length;

  return (
    <main className="friends-page">
      <header className="friends-page-top">
        <div>
          <h1 className="friends-page-title">Друзья</h1>
          <p className="friends-page-summary">
            {social.isReady ? (
              <>
                <b>{social.friends.length}</b> в списке · <span className="friends-page-online">{online} в сети</span>
              </>
            ) : (
              "Подключаемся…"
            )}
          </p>
        </div>
        {user.id && <MyId id={user.id} />}
      </header>

      <div className="friends-page-tabs" role="tablist">
        <TabButton active={tab === "friends"} onClick={() => setTab("friends")}>
          Мои друзья
        </TabButton>
        <TabButton active={tab === "requests"} onClick={() => setTab("requests")} badge={requests}>
          Заявки
        </TabButton>
        <TabButton active={tab === "search"} onClick={() => setTab("search")}>
          Найти
        </TabButton>
      </div>

      {tab === "friends" && <FriendsList onFind={() => setTab("search")} />}
      {tab === "requests" && <Requests onFind={() => setTab("search")} />}
      {tab === "search" && <SearchPlayers myId={user.id ?? null} />}
    </main>
  );
}

function MyId({ id }: { id: number }) {
  const playerId = toPlayerId(id);
  const myBackground = useShop().state.equipped;

  async function copy() {
    if (await copyText(playerId)) showToast(`ID ${playerId} скопирован — отправьте его другу.`, "success");
    else showToast(`Ваш ID: ${playerId}`);
  }

  return (
    <button type="button" className="friends-page-myid" onClick={copy} title="Скопировать ваш ID">
      <PlayerBackground id={myBackground} />
      <span>Ваш ID</span>
      <b>{formatPlayerId(playerId)}</b>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15V5a1 1 0 0 1 1-1h9" />
      </svg>
    </button>
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

function EmptyState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <section className="panel friends-page-empty">
      <span className="friends-page-empty-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M19 8v6M16 11h6" />
        </svg>
      </span>
      <p className="friends-page-empty-title">{title}</p>
      <p className="friends-page-empty-text">{text}</p>
      {action}
    </section>
  );
}

function FriendsList({ onFind }: { onFind: () => void }) {
  const social = useSocial();
  const router = useRouter();

  if (social.friends.length === 0) {
    return (
      <EmptyState
        title="Пока никого"
        text="Найдите игрока по ID или нику и отправьте заявку."
        action={
          <button type="button" className="btn btn-red btn-small" onClick={onFind}>
            Найти друзей
          </button>
        }
      />
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
        <li key={friend.id} className="friends-page-card">
          <span className="friends-page-avatar">
            <Avatar name={friend.username} image={friend.profileImage} size={48} />
            <span className={friend.online ? "friends-page-dot friends-page-dot-online" : "friends-page-dot"} />
          </span>
          <Link href={`/player/${toPlayerId(friend.id)}`} className="friends-page-info">
            <span className="friends-page-name">{friend.username}</span>
            <span className={friend.online ? "friends-page-status friends-page-status-online" : "friends-page-status"}>{statusText(friend)}</span>
          </Link>
          <div className="friends-page-actions">
            {friend.status === "room" && friend.roomId && (
              <button type="button" className="btn btn-red btn-small" onClick={() => router.push(`/room/${friend.roomId}`)}>
                В комнату
              </button>
            )}
            <button type="button" className="friends-page-icon-button" onClick={() => removeFriend(friend)} title="Удалить из друзей" aria-label={`Удалить ${friend.username} из друзей`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <circle cx="9" cy="8" r="3.5" />
                <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M16 11h6" />
              </svg>
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function RequestRow({ request, children }: { request: FriendRequest; children: React.ReactNode }) {
  return (
    <li className="friends-page-card">
      <Avatar name={request.username} size={48} />
      <Link href={`/player/${toPlayerId(request.id)}`} className="friends-page-info">
        <span className="friends-page-name">{request.username}</span>
        <span className="friends-page-status">ID {formatPlayerId(toPlayerId(request.id))}</span>
      </Link>
      <div className="friends-page-actions">{children}</div>
    </li>
  );
}

function Requests({ onFind }: { onFind: () => void }) {
  const social = useSocial();

  if (social.incoming.length === 0 && social.outgoing.length === 0) {
    return (
      <EmptyState
        title="Заявок нет"
        text="Когда вам отправят заявку, она появится здесь."
        action={
          <button type="button" className="btn btn-dark btn-small" onClick={onFind}>
            Найти друзей
          </button>
        }
      />
    );
  }

  return (
    <div className="friends-page-requests">
      {social.incoming.length > 0 && (
        <section>
          <h2 className="friends-page-subtitle">Входящие · {social.incoming.length}</h2>
          <ul className="friends-page-list">
            {social.incoming.map((request) => (
              <RequestRow key={request.id} request={request}>
                <button type="button" className="btn btn-red btn-small" onClick={() => social.accept(request.id)}>
                  Принять
                </button>
                <button type="button" className="btn btn-dark btn-small" onClick={() => social.decline(request.id)}>
                  Отклонить
                </button>
              </RequestRow>
            ))}
          </ul>
        </section>
      )}

      {social.outgoing.length > 0 && (
        <section>
          <h2 className="friends-page-subtitle">Отправленные · {social.outgoing.length}</h2>
          <ul className="friends-page-list">
            {social.outgoing.map((request) => (
              <RequestRow key={request.id} request={request}>
                <span className="friends-page-pending">Ждёт ответа</span>
                <button type="button" className="btn btn-dark btn-small" onClick={() => social.cancel(request.id)}>
                  Отменить
                </button>
              </RequestRow>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function PlayerAction({ player, myId }: { player: PublicUser; myId: number | null }) {
  const social = useSocial();

  if (player.id === myId) return <span className="friends-page-pending">Это вы</span>;
  if (social.friends.some((friend) => friend.id === player.id)) return <span className="friends-page-done">В друзьях ✓</span>;
  if (social.incoming.some((item) => item.id === player.id)) {
    return (
      <button type="button" className="btn btn-red btn-small" onClick={() => social.accept(player.id)}>
        Принять заявку
      </button>
    );
  }
  if (social.outgoing.some((item) => item.id === player.id)) {
    return (
      <button type="button" className="btn btn-dark btn-small" onClick={() => social.cancel(player.id)}>
        Заявка отправлена ✓
      </button>
    );
  }
  return (
    <button type="button" className="btn btn-red btn-small" disabled={!social.isReady} onClick={() => social.sendRequest(player.id, player.username)}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
      Добавить
    </button>
  );
}

const SHUFFLE_MS = 1200;
const SUGGESTED_COUNT = 10;

function SearchPlayers({ myId }: { myId: number | null }) {
  const social = useSocial();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicUser[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [suggested, setSuggested] = useState<PublicUser[] | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);

  const friendIds = social.friends.map((friend) => friend.id).join(",");
  // minMs — сколько минимум показывать загрузку: по «Другие» список приходит мгновенно,
  // и без паузы не видно, что он вообще обновился
  const loadSuggested = useCallback(async (minMs = 0) => {
    setIsShuffling(true);
    const pause = new Promise((resolve) => setTimeout(resolve, minMs));
    try {
      const exclude = friendIds ? friendIds.split(",").map(Number) : [];
      if (myId) exclude.push(myId);
      const players = await api.getSuggestedPlayers(exclude, SUGGESTED_COUNT);
      await pause;
      setSuggested(players);
    } catch {
      await pause;
      setSuggested([]);
    } finally {
      setIsShuffling(false);
    }
    // friendIds нарочно не в зависимостях: после добавления друга список не должен перемешиваться
  }, [myId]);

  useEffect(() => {
    loadSuggested();
  }, [loadSuggested]);

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    const text = query.trim();
    if (!text) return;

    setIsSearching(true);
    try {
      const digits = text.replace(/\s/g, "");
      if (/^\d{7,8}$/.test(digits)) {
        const userId = fromPlayerId(digits);
        const player = userId ? await api.getPublicUser(userId).catch(() => null) : null;
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

  return (
    <div className="friends-page-search">
      <section className="panel">
        <form className="friends-page-search-form" onSubmit={handleSearch}>
          <span className="friends-page-search-field">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              className="input"
              placeholder="ID (8 цифр) или ник"
              value={query}
              inputMode="search"
              aria-label="ID или ник игрока"
              onChange={(event) => {
                setQuery(event.target.value);
                if (!event.target.value.trim()) setResults(null);
              }}
            />
          </span>
          <button type="submit" className="btn btn-red" disabled={isSearching || !query.trim()}>
            {isSearching ? "…" : "Найти"}
          </button>
        </form>

        {results && results.length === 0 && <p className="friends-page-nothing">Никого не нашли</p>}

        {results && results.length > 0 && (
          <ul className="friends-page-list friends-page-results">
            {results.map((player) => (
              <PlayerRow key={player.id} player={player}>
                <PlayerAction player={player} myId={myId} />
              </PlayerRow>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <div className="panel-top">
          <h2 className="panel-title">Игроки</h2>
          <button type="button" className="btn btn-dark btn-small" onClick={() => loadSuggested(SHUFFLE_MS)} disabled={isShuffling} aria-label="Показать других игроков">
            <svg className={isShuffling ? "friends-page-spin" : undefined} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />
            </svg>
            {isShuffling && suggested !== null ? "Ищем…" : "Другие"}
          </button>
        </div>

        {(suggested === null || isShuffling) && (
          <ul className="friends-page-grid" aria-busy="true">
            {Array.from({ length: SUGGESTED_COUNT }, (_, index) => (
              <li key={index} className="friends-page-player friends-page-player-skeleton">
                <span className="friends-page-skeleton-avatar" />
                <span className="friends-page-skeleton-line" />
                <span className="friends-page-skeleton-line friends-page-skeleton-line-short" />
                <span className="friends-page-skeleton-button" />
              </li>
            ))}
          </ul>
        )}

        {!isShuffling && suggested?.length === 0 && <p className="friends-page-nothing">Пока некого предложить</p>}

        {!isShuffling && suggested && suggested.length > 0 && (
          <ul className="friends-page-grid">
            {suggested.map((player, index) => (
              <li key={player.id} className="friends-page-player friends-page-player-in" style={{ animationDelay: `${index * 70}ms` }}>
                <Link href={`/player/${toPlayerId(player.id)}`} className="friends-page-player-link">
                  <Avatar name={player.username} image={player.profileImage} size={64} />
                  <span className="friends-page-name">{player.username}</span>
                  <span className="friends-page-status">ID {formatPlayerId(toPlayerId(player.id))}</span>
                </Link>
                <PlayerAction player={player} myId={myId} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function PlayerRow({ player, children }: { player: PublicUser; children: React.ReactNode }) {
  return (
    <li className="friends-page-card">
      <Avatar name={player.username} image={player.profileImage} size={48} />
      <Link href={`/player/${toPlayerId(player.id)}`} className="friends-page-info">
        <span className="friends-page-name">{player.username}</span>
        <span className="friends-page-status">ID {formatPlayerId(toPlayerId(player.id))}</span>
      </Link>
      <div className="friends-page-actions">{children}</div>
    </li>
  );
}

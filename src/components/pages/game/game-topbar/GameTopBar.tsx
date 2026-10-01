"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import "./game-topbar.scss";

export type GameConnection = "live" | "slow" | "offline" | "demo";

type GameTopBarProps = {
  aliveCount: number;
  totalCount: number;
  connection: GameConnection;
  canShowRole: boolean;
  canEndGame: boolean;
  isEnding: boolean;
  onShowRole: () => void;
  onExit: () => void;
  onEndGame: () => void;
};

const CONNECTION_TEXT: Record<GameConnection, string> = {
  live: "Онлайн",
  slow: "Слабая связь",
  offline: "Нет связи",
  demo: "Демо",
};

const CONNECTION_TITLE: Record<GameConnection, string> = {
  live: "Связь с сервером есть",
  slow: "Нет связи с сервером чата: игра обновляется раз в пару секунд, чат недоступен",
  offline: "Сервер не отвечает. Переподключаемся…",
  demo: "Игра с ботами без сервера",
};

export default function GameTopBar(props: GameTopBarProps) {
  const { aliveCount, totalCount, connection, canShowRole, canEndGame, isEnding, onShowRole, onExit, onEndGame } = props;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;

    function handleClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setIsMenuOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setIsMenuOpen(false);
    }

    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isMenuOpen]);

  function choose(action: () => void) {
    setIsMenuOpen(false);
    action();
  }

  return (
    <header className="game-topbar">
      <div className="game-topbar-menu" ref={menuRef}>
        <button
          type="button"
          className="game-topbar-button"
          aria-label="Меню игры"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((old) => !old)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

        {isMenuOpen && (
          <div className="game-topbar-list" role="menu">
            {canShowRole && (
              <button type="button" role="menuitem" onClick={() => choose(onShowRole)}>
                Моя роль
              </button>
            )}
            <button type="button" role="menuitem" onClick={() => choose(onExit)}>
              В главное меню
            </button>
            {canEndGame && (
              <button type="button" role="menuitem" className="game-topbar-danger" disabled={isEnding} onClick={() => choose(onEndGame)}>
                {isEnding ? "Завершаем…" : "Завершить игру"}
              </button>
            )}
          </div>
        )}
      </div>

      <p className="game-topbar-logo">
        <Image src="/img/logo.webp" alt="" width={72} height={72} priority />
        <span>Mafia</span>
      </p>

      <p className="game-topbar-pill" title="Живых игроков">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="9" cy="8" r="3.6" />
          <path d="M2 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5z" />
          <circle cx="17.5" cy="9" r="2.8" />
          <path d="M17.6 13.6c2.7.2 4.4 2.3 4.4 5.4h-4.3c-.1-2-.8-3.8-2.2-5 .7-.3 1.4-.4 2.1-.4z" />
        </svg>
        <span className="sr-only">Живых: </span>
        {aliveCount}/{totalCount}
      </p>

      <p className={`game-topbar-pill game-topbar-connection game-topbar-connection-${connection}`} role="status" title={CONNECTION_TITLE[connection]}>
        <span aria-hidden="true" />
        {CONNECTION_TEXT[connection]}
      </p>
    </header>
  );
}

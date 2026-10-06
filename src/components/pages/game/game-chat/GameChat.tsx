"use client";

import { useEffect, useRef, useState } from "react";

import Avatar from "@/components/pages/widgets/avatar/Avatar";

import "./game-chat.scss";

export type ChatMessage = {
  id: string;
  name: string;
  text: string;
  time: number;
  scope: "all" | "mafia" | "dead";
  lastWord?: boolean;
};

type GameChatProps = {
  messages: ChatMessage[];
  myName: string;
  canWrite: boolean;
  scope: ChatMessage["scope"];
  hint: string;
  forceOpen?: boolean;
  onSend: (text: string) => void;
};

const MAX_LENGTH = 200;

function formatTime(time: number): string {
  return new Date(time).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export default function GameChat({ messages, myName, canWrite, scope, hint, forceOpen = false, onSend }: GameChatProps) {
  const [text, setText] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [seenCount, setSeenCount] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (window.matchMedia("(max-width: 960px)").matches) setIsOpen(false);
  }, []);

  useEffect(() => {
    if (forceOpen) setIsOpen(true);
  }, [forceOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setSeenCount(messages.length);
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length, isOpen]);

  const unread = isOpen ? 0 : Math.max(0, messages.length - seenCount);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const clean = text.trim().slice(0, MAX_LENGTH);
    if (!clean || !canWrite) return;
    onSend(clean);
    setText("");
  }

  return (
    <section className="game-chat">
      <h2 className="game-chat-title">
        <button
          type="button"
          className={isOpen ? "game-chat-tab game-chat-tab-open" : "game-chat-tab"}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((old) => !old)}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm4 5.2a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6zm4 0a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6zm4 0a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6z" />
          </svg>
          Чат
          {unread > 0 && <b className="game-chat-unread">{unread}</b>}
          <svg className="game-chat-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {!isOpen && <span className="game-chat-closed">{unread > 0 ? "Новые сообщения" : "Нажмите, чтобы открыть"}</span>}
        {isOpen && scope === "dead" && canWrite && <span className="game-chat-badge">вас видят только погибшие</span>}
      </h2>

      {isOpen && (
        <>
      <ul ref={listRef} className="game-chat-list">
        {messages.length === 0 && <li className="game-chat-empty">Сообщений пока нет.</li>}
        {messages.map((message) => {
          let className = "game-chat-message";
          if (message.name === myName) className += " game-chat-message-mine";
          if (message.scope !== "all") className += " game-chat-message-private";
          if (message.lastWord) className += " game-chat-message-last";

          return (
            <li key={message.id} className={className}>
              <Avatar name={message.name} size={38} />
              <div className="game-chat-bubble">
                <p className="game-chat-meta">
                  <b>{message.name}</b>
                  {message.scope === "dead" && <i>погибший</i>}
                  {message.lastWord && <i>последнее слово</i>}
                  <time>{formatTime(message.time)}</time>
                </p>
                <p className="game-chat-text">{message.text}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <form className="game-chat-form" onSubmit={handleSubmit}>
        <input
          className="input game-chat-input"
          placeholder={canWrite ? "Написать…" : hint}
          value={text}
          maxLength={MAX_LENGTH}
          disabled={!canWrite}
          onChange={(event) => setText(event.target.value)}
          enterKeyHint="send"
        />
        <button className="btn btn-red game-chat-send" type="submit" disabled={!canWrite || !text.trim()} aria-label="Отправить">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 20.5 21 12 3 3.5 3 10l12 2-12 2z" />
          </svg>
        </button>
      </form>
        </>
      )}
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

import "./game-chat.scss";

export type ChatMessage = {
  id: string;
  name: string;
  text: string;
  time: number;
  scope: "all" | "mafia" | "dead";
  system?: boolean;
};

type GameChatProps = {
  messages: ChatMessage[];
  myName: string;
  canWrite: boolean;
  scope: ChatMessage["scope"];
  hint: string;
  onSend: (text: string) => void;
};

const MAX_LENGTH = 200;

function formatTime(time: number): string {
  return new Date(time).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export default function GameChat({ messages, myName, canWrite, scope, hint, onSend }: GameChatProps) {
  const [text, setText] = useState("");
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length]);

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
        Чат
        {scope === "dead" && canWrite && <span className="game-chat-badge">чат погибших</span>}
      </h2>

      <ul ref={listRef} className="game-chat-list">
        {messages.length === 0 && <li className="game-chat-empty">Сообщений пока нет.</li>}
        {messages.map((message) => {
          let className = "game-chat-message";
          if (message.system) className += " game-chat-message-system";
          else if (message.name === myName) className += " game-chat-message-mine";
          if (message.scope !== "all") className += " game-chat-message-private";

          return (
            <li key={message.id} className={className}>
              <p className="game-chat-meta">
                <b>{message.system ? "🎙 Ведущий" : message.name}</b>
                {message.scope === "dead" && " · погибший"}
                <time>{formatTime(message.time)}</time>
              </p>
              <p className="game-chat-text">{message.text}</p>
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
    </section>
  );
}

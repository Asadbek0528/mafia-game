"use client";

import { memo } from "react";

import Avatar from "@/components/pages/widgets/avatar/Avatar";
import { formatTimeOfDay } from "@/utils/format";
import { chatMessageClassName, useGameChat } from "@/utils/game/game-chat";
import { CHAT_MAX_LENGTH } from "@/utils/game/game-logic";
import type { ChatMessage } from "@/utils/game/types";

import "./game-chat.scss";

type GameChatProps = {
  messages: ChatMessage[];
  myName: string;
  canWrite: boolean;
  scope: ChatMessage["scope"];
  hint: string;
  forceOpen?: boolean;
  onSend: (text: string) => void;
};

export default function GameChat({ messages, myName, canWrite, scope, hint, forceOpen = false, onSend }: GameChatProps) {
  const { text, setText, isOpen, toggle, unread, listRef, handleSubmit } = useGameChat({ messageCount: messages.length, canWrite, forceOpen, onSend });

  return (
    <section className={isOpen ? "game-chat game-chat-open" : "game-chat"}>
      <h2 className="game-chat-title">
        <button type="button" className={isOpen ? "game-chat-tab game-chat-tab-open" : "game-chat-tab"} aria-expanded={isOpen} onClick={toggle}>
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
            {messages.length === 0 && <li className="game-chat-empty">Сообщений пока нет — начните обсуждение первым.</li>}
            <ChatMessages messages={messages} myName={myName} />
          </ul>

          <form className="game-chat-form" onSubmit={handleSubmit}>
            <input
              className="input game-chat-input"
              placeholder={canWrite ? "Написать…" : hint}
              value={text}
              maxLength={CHAT_MAX_LENGTH}
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

const ChatMessages = memo(function ChatMessages({ messages, myName }: { messages: ChatMessage[]; myName: string }) {
  return messages.map((message) => (
    <li key={message.id} className={chatMessageClassName(message, myName)}>
      <Avatar name={message.name} size={38} />
      <div className="game-chat-bubble">
        <p className="game-chat-meta">
          <b>{message.name}</b>
          {message.scope === "dead" && <i>погибший</i>}
          {message.lastWord && <i>последнее слово</i>}
          <time>{formatTimeOfDay(message.time)}</time>
        </p>
        <p className="game-chat-text">{message.text}</p>
      </div>
    </li>
  ));
});

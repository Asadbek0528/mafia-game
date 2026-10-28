import { type FormEvent, useEffect, useRef, useState } from "react";

import { CHAT_MAX_LENGTH } from "./game-logic";
import type { ChatMessage } from "./types";

export function chatMessageClassName(message: ChatMessage, myName: string): string {
  let className = "game-chat-message";
  if (message.name === myName) className += " game-chat-message-mine";
  if (message.scope !== "all") className += " game-chat-message-private";
  if (message.lastWord) className += " game-chat-message-last";
  return className;
}

type GameChatOptions = {
  messageCount: number;
  canWrite: boolean;
  forceOpen: boolean;
  onSend: (text: string) => void;
};

export function useGameChat({ messageCount, canWrite, forceOpen, onSend }: GameChatOptions) {
  const [text, setText] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [seenCount, setSeenCount] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const isFirstScroll = useRef(true);

  useEffect(() => {
    if (window.matchMedia("(max-width: 960px)").matches) setIsOpen(false);
  }, []);

  useEffect(() => {
    if (forceOpen) setIsOpen(true);
  }, [forceOpen]);

  useEffect(() => {
    if (!isOpen) {
      isFirstScroll.current = true;
      return;
    }
    setSeenCount(messageCount);
    const list = listRef.current;
    if (!list) return;
    const behavior = isFirstScroll.current ? "auto" : "smooth";
    isFirstScroll.current = false;
    requestAnimationFrame(() => list.scrollTo({ top: list.scrollHeight, behavior }));
  }, [messageCount, isOpen]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const clean = text.trim().slice(0, CHAT_MAX_LENGTH);
    if (!clean || !canWrite) return;
    onSend(clean);
    setText("");
  }

  return {
    text,
    setText,
    isOpen,
    toggle: () => setIsOpen((old) => !old),
    unread: isOpen ? 0 : Math.max(0, messageCount - seenCount),
    listRef,
    handleSubmit,
  };
}

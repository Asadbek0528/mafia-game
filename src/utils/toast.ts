import { useEffect, useState } from "react";

export type ToastType = "info" | "success" | "error";

type ToastMessage = {
  id: number;
  text: string;
  type: ToastType;
};

const EVENT_NAME = "mafia-toast";
const TOAST_MS = 3500;

export function showToast(text: string, type: ToastType = "info") {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { text, type } }));
}

export function useToasts() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  useEffect(() => {
    function handleToast(event: Event) {
      const { text, type } = (event as CustomEvent<{ text: string; type: ToastType }>).detail;
      const id = Date.now() + Math.random();
      setMessages((old) => [...old, { id, text, type }]);
      setTimeout(() => setMessages((old) => old.filter((message) => message.id !== id)), TOAST_MS);
    }

    window.addEventListener(EVENT_NAME, handleToast);
    return () => window.removeEventListener(EVENT_NAME, handleToast);
  }, []);

  return messages;
}

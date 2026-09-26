"use client";

/*
  Toast — всплывающее сообщение внизу экрана.

  Как пользоваться из любого компонента:
    import { showToast } from "@/components/pages/widgets/toast/Toast";
    showToast("Ссылка скопирована", "success");

  Сам <Toast /> уже добавлен в app/layout.tsx.
*/
import { useEffect, useState } from "react";

import "./toast.scss";

type ToastType = "info" | "success" | "error";

type ToastMessage = {
  id: number;
  text: string;
  type: ToastType;
};

const EVENT_NAME = "mafia-toast";

// эту функцию вызываем, чтобы показать сообщение
export function showToast(text: string, type: ToastType = "info") {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { text, type } }));
}

export default function Toast() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  useEffect(() => {
    function handleToast(event: Event) {
      const { text, type } = (event as CustomEvent<{ text: string; type: ToastType }>).detail;
      const id = Date.now() + Math.random();

      // добавляем сообщение
      setMessages((old) => [...old, { id, text, type }]);

      // через 3.5 секунды убираем
      setTimeout(() => {
        setMessages((old) => old.filter((message) => message.id !== id));
      }, 3500);
    }

    window.addEventListener(EVENT_NAME, handleToast);
    return () => window.removeEventListener(EVENT_NAME, handleToast);
  }, []);

  return (
    <div className="toast-list" role="status" aria-live="polite">
      {messages.map((message) => (
        <div key={message.id} className={`toast toast-${message.type}`}>
          {message.text}
        </div>
      ))}
    </div>
  );
}

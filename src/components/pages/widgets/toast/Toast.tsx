"use client";

import { useToasts } from "@/utils/toast";

import "./toast.scss";

export default function Toast() {
  const messages = useToasts();

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

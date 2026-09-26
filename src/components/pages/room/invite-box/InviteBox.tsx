"use client";

import { useEffect, useState } from "react";

import { showToast } from "@/components/pages/widgets/toast/Toast";
import "./invite-box.scss";

type InviteBoxProps = {
  roomId: string;
  roomName: string;
};

export default function InviteBox({ roomId, roomName }: InviteBoxProps) {
  const [link, setLink] = useState("");

  useEffect(() => {
    setLink(`${window.location.origin}/room/${roomId}`);
  }, [roomId]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      showToast("Ссылка скопирована.", "success");
    } catch {
      showToast(link);
    }
  }

  async function shareLink() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Mafia", text: `Заходи в комнату «${roomName}»`, url: link });
      } catch {
      }
    } else {
      copyLink();
    }
  }

  return (
    <section className="panel invite-box">
      <h2 className="panel-title">Пригласить друзей</h2>

      <p className="invite-box-link">{link}</p>

      <button className="btn btn-dark btn-full" onClick={copyLink}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V5a1 1 0 0 1 1-1h9" />
        </svg>
        Копировать ссылку
      </button>

      <button className="btn btn-dark btn-full" onClick={shareLink}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="18" cy="5" r="2.5" />
          <circle cx="6" cy="12" r="2.5" />
          <circle cx="18" cy="19" r="2.5" />
          <path d="m8.2 10.9 7.6-4.3M8.2 13.1l7.6 4.3" />
        </svg>
        Поделиться
      </button>

      <div className="invite-box-image" aria-hidden="true" />
    </section>
  );
}

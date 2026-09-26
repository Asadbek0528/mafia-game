"use client";

import { useEffect, useState } from "react";

import { showToast } from "@/components/pages/widgets/toast/Toast";
import { copyText, getRoomLink, shareLink, telegramShareUrl, whatsappShareUrl } from "@/lib/share";
import { useSocial } from "@/lib/social";

import InviteFriendsDialog from "../invite-friends/InviteFriendsDialog";
import "./invite-box.scss";

type InviteBoxProps = {
  roomId: string;
  roomName: string;
};

export default function InviteBox({ roomId, roomName }: InviteBoxProps) {
  const [link, setLink] = useState("");
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const social = useSocial();
  const onlineFriends = social.friends.filter((friend) => friend.online).length;
  const inviteText = `Заходи в комнату «${roomName}» в Mafia`;

  useEffect(() => {
    setLink(getRoomLink(roomId));
  }, [roomId]);

  async function handleCopy() {
    if (await copyText(link)) showToast("Ссылка скопирована.", "success");
    else showToast(`Скопируйте вручную: ${link}`);
  }

  async function handleShare() {
    const result = await shareLink("Mafia", inviteText, link);
    if (result === "copied") showToast("Ссылка скопирована — отправьте её друзьям.", "success");
    if (result === "failed") showToast(`Скопируйте вручную: ${link}`);
  }

  return (
    <section className="panel invite-box">
      <h2 className="panel-title">Пригласить друзей</h2>

      {social.myId && (
        <button type="button" className="btn btn-red btn-full invite-box-friends" onClick={() => setIsFriendsOpen(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="8" r="3.5" />
            <path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6M19 8v6M16 11h6" />
          </svg>
          Пригласить друга
          {onlineFriends > 0 && <span className="invite-box-badge">{onlineFriends} в сети</span>}
        </button>
      )}

      <p className="invite-box-link" onClick={handleCopy} title="Нажмите, чтобы скопировать">
        {link}
      </p>

      <button className="btn btn-dark btn-full" onClick={handleCopy}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V5a1 1 0 0 1 1-1h9" />
        </svg>
        Копировать ссылку
      </button>

      <button className="btn btn-dark btn-full" onClick={handleShare}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="18" cy="5" r="2.5" />
          <circle cx="6" cy="12" r="2.5" />
          <circle cx="18" cy="19" r="2.5" />
          <path d="m8.2 10.9 7.6-4.3M8.2 13.1l7.6 4.3" />
        </svg>
        Поделиться
      </button>

      <div className="invite-box-apps">
        <a className="btn btn-dark btn-small" href={telegramShareUrl(inviteText, link)} target="_blank" rel="noreferrer">
          Telegram
        </a>
        <a className="btn btn-dark btn-small" href={whatsappShareUrl(inviteText, link)} target="_blank" rel="noreferrer">
          WhatsApp
        </a>
      </div>

      <div className="invite-box-image" aria-hidden="true" />

      <InviteFriendsDialog isOpen={isFriendsOpen} roomId={roomId} roomName={roomName} onClose={() => setIsFriendsOpen(false)} />
    </section>
  );
}

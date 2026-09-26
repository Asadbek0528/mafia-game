"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import Avatar from "@/components/pages/widgets/avatar/Avatar";
import { statusText, useSocial } from "@/lib/social";
import "./invite-friends-dialog.scss";

type InviteFriendsDialogProps = {
  isOpen: boolean;
  roomId: string;
  roomName: string;
  onClose: () => void;
};

export default function InviteFriendsDialog({ isOpen, roomId, roomName, onClose }: InviteFriendsDialogProps) {
  const social = useSocial();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [invited, setInvited] = useState<number[]>([]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  function inviteFriend(id: number) {
    social.invite(id, roomId, roomName);
    setInvited((old) => [...old, id]);
  }

  return (
    <dialog ref={dialogRef} className="invite-friends" onClose={onClose} aria-labelledby="invite-friends-title">
      <div className="invite-friends-body">
        <div className="invite-friends-top">
          <h2 id="invite-friends-title" className="invite-friends-title">
            Позвать друзей
          </h2>
          <button type="button" className="invite-friends-close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        {!social.isReady && <p className="invite-friends-note">Подключаемся к серверу…</p>}

        {social.isReady && social.friends.length === 0 && (
          <p className="invite-friends-note">
            У вас пока нет друзей. Добавьте их по ID в <Link href="/profile">профиле</Link>.
          </p>
        )}

        <ul className="invite-friends-list">
          {social.friends.map((friend) => {
            const isHere = friend.status === "room" && friend.roomId === roomId;
            const isInvited = invited.includes(friend.id);

            return (
              <li key={friend.id} className="invite-friends-item">
                <span className="invite-friends-avatar">
                  <Avatar name={friend.username} size={36} />
                  <span className={friend.online ? "invite-friends-dot invite-friends-dot-online" : "invite-friends-dot"} />
                </span>
                <span className="invite-friends-name">
                  {friend.username}
                  <small>{isHere ? "Уже в этой комнате" : statusText(friend)}</small>
                </span>
                <button
                  type="button"
                  className={isInvited ? "btn btn-dark btn-small" : "btn btn-red btn-small"}
                  disabled={!friend.online || isHere || isInvited}
                  onClick={() => inviteFriend(friend.id)}
                >
                  {isHere ? "Здесь" : isInvited ? "Позвали ✓" : friend.online ? "Позвать" : "Не в сети"}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </dialog>
  );
}

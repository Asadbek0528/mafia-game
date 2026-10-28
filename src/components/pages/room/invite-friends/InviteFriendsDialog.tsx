"use client";

import Link from "next/link";

import Avatar from "@/components/pages/widgets/avatar/Avatar";
import { useInviteFriends } from "@/utils/room/invite";
import { useModalDialog } from "@/utils/use-modal-dialog";
import "./invite-friends-dialog.scss";

type InviteFriendsDialogProps = {
  isOpen: boolean;
  roomId: string;
  roomName: string;
  onClose: () => void;
};

export default function InviteFriendsDialog({ isOpen, roomId, roomName, onClose }: InviteFriendsDialogProps) {
  const dialogRef = useModalDialog(isOpen);
  const { isReady, hasNoFriends, rows, inviteFriend } = useInviteFriends(roomId, roomName);

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

        {!isReady && <p className="invite-friends-note">Подключаемся к серверу…</p>}

        {hasNoFriends && (
          <p className="invite-friends-note">
            У вас пока нет друзей. Добавьте их по ID в <Link href="/profile">профиле</Link>.
          </p>
        )}

        <ul className="invite-friends-list">
          {rows.map(({ friend, status, isDisabled, buttonText, buttonClass }) => (
            <li key={friend.id} className="invite-friends-item">
              <span className="invite-friends-avatar">
                <Avatar name={friend.username} size={36} />
                <span className={friend.online ? "invite-friends-dot invite-friends-dot-online" : "invite-friends-dot"} />
              </span>
              <span className="invite-friends-name">
                {friend.username}
                <small>{status}</small>
              </span>
              <button type="button" className={buttonClass} disabled={isDisabled} onClick={() => inviteFriend(friend.id)}>
                {buttonText}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </dialog>
  );
}

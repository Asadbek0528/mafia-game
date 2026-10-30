import { useEffect, useState } from "react";

import { showToast } from "@/utils/toast";
import { copyText, getRoomLink, shareLink, telegramShareUrl, whatsappShareUrl } from "@/utils/share";
import { type FriendInfo, statusText, useSocial } from "@/utils/social";

export function useInviteBox(roomId: string, roomName: string) {
  const [link, setLink] = useState("");
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const social = useSocial();
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

  return {
    canInviteFriends: Boolean(social.myId),
    onlineFriends: social.friends.filter((friend) => friend.online).length,
    telegramUrl: telegramShareUrl(inviteText, link),
    whatsappUrl: whatsappShareUrl(inviteText, link),
    isFriendsOpen,
    openFriends: () => setIsFriendsOpen(true),
    closeFriends: () => setIsFriendsOpen(false),
    handleCopy,
    handleShare,
  };
}

export type InviteFriendRow = {
  friend: FriendInfo;
  status: string;
  isDisabled: boolean;
  buttonText: string;
  buttonClass: string;
};

export function useInviteFriends(roomId: string, roomName: string) {
  const social = useSocial();
  const [invited, setInvited] = useState<number[]>([]);

  function inviteFriend(id: number) {
    social.invite(id, roomId, roomName);
    setInvited((old) => [...old, id]);
  }

  const rows: InviteFriendRow[] = social.friends.map((friend) => {
    const isHere = friend.status === "room" && friend.roomId === roomId;
    const isInvited = invited.includes(friend.id);
    return {
      friend,
      status: isHere ? "Уже в этой комнате" : statusText(friend),
      isDisabled: !friend.online || isHere || isInvited,
      buttonText: isHere ? "Здесь" : isInvited ? "Позвали ✓" : friend.online ? "Позвать" : "Не в сети",
      buttonClass: isInvited ? "btn btn-dark btn-small" : "btn btn-red btn-small",
    };
  });

  return {
    isReady: social.isReady,
    hasNoFriends: social.isReady && social.friends.length === 0,
    rows,
    inviteFriend,
  };
}

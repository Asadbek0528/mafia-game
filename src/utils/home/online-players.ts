import { useEffect, useState } from "react";

import { getUser } from "@/utils/auth";
import { useSocial } from "@/utils/social";

export const MAX_ONLINE_SHOWN = 6;

export function useOnlinePlayers() {
  const social = useSocial();
  const [isGuest, setIsGuest] = useState<boolean | null>(null);

  useEffect(() => {
    const user = getUser();
    setIsGuest(!user || Boolean(user.guest) || !user.id);
  }, []);

  const online = social.friends.filter((friend) => friend.online);
  const total = social.friends.length;

  return {
    isGuest,
    online,
    shown: online.slice(0, MAX_ONLINE_SHOWN),
    hiddenCount: Math.max(0, online.length - MAX_ONLINE_SHOWN),
    countText: social.isReady ? `${online.length} из ${total}` : "…",
    hasNoFriends: isGuest === false && social.isReady && total === 0,
    nobodyOnline: isGuest === false && social.isReady && total > 0 && online.length === 0,
  };
}

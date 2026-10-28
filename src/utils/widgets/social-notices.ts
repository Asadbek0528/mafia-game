import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useSocial } from "@/utils/social";

const AUTO_HIDE_MS = { invite: 60_000, request: 60_000, text: 6_000 };

export function useSocialNotices() {
  const router = useRouter();
  const social = useSocial();
  const { notices, dismiss } = social;

  useEffect(() => {
    const timers = notices.map((notice) => setTimeout(() => dismiss(notice.key), AUTO_HIDE_MS[notice.kind]));
    return () => timers.forEach(clearTimeout);
  }, [notices, dismiss]);

  return {
    notices,
    dismiss,
    accept: social.accept,
    decline: social.decline,
    joinRoom: (key: string, roomId: string) => {
      dismiss(key);
      router.push(`/room/${roomId}`);
    },
  };
}

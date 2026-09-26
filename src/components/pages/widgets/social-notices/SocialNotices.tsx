"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import Avatar from "@/components/pages/widgets/avatar/Avatar";
import { useSocial } from "@/lib/social";
import "./social-notices.scss";

const AUTO_HIDE_MS = { invite: 60_000, request: 60_000, text: 6_000 };

export default function SocialNotices() {
  const router = useRouter();
  const social = useSocial();
  const { notices, dismiss } = social;

  useEffect(() => {
    const timers = notices.map((notice) => setTimeout(() => dismiss(notice.key), AUTO_HIDE_MS[notice.kind]));
    return () => timers.forEach(clearTimeout);
  }, [notices, dismiss]);

  if (notices.length === 0) return null;

  return (
    <div className="social-notices" role="status" aria-live="polite">
      {notices.map((notice) => {
        if (notice.kind === "invite") {
          const { invite } = notice;
          return (
            <div key={notice.key} className="social-notice social-notice-invite">
              <Avatar name={invite.from.username} size={40} />
              <div className="social-notice-body">
                <p className="social-notice-title">{invite.from.username} зовёт вас играть</p>
                <p className="social-notice-text">Комната «{invite.roomName || invite.roomId}»</p>
                <div className="social-notice-buttons">
                  <button
                    type="button"
                    className="btn btn-red btn-small"
                    onClick={() => {
                      dismiss(notice.key);
                      router.push(`/room/${invite.roomId}`);
                    }}
                  >
                    Зайти
                  </button>
                  <button type="button" className="btn btn-dark btn-small" onClick={() => dismiss(notice.key)}>
                    Позже
                  </button>
                </div>
              </div>
            </div>
          );
        }

        if (notice.kind === "request") {
          return (
            <div key={notice.key} className="social-notice">
              <Avatar name={notice.from.username} size={40} />
              <div className="social-notice-body">
                <p className="social-notice-title">{notice.from.username} хочет добавить вас в друзья</p>
                <div className="social-notice-buttons">
                  <button type="button" className="btn btn-red btn-small" onClick={() => social.accept(notice.from.id)}>
                    Принять
                  </button>
                  <button type="button" className="btn btn-dark btn-small" onClick={() => social.decline(notice.from.id)}>
                    Отклонить
                  </button>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div key={notice.key} className="social-notice social-notice-small" onClick={() => dismiss(notice.key)}>
            <p className="social-notice-text">{notice.text}</p>
          </div>
        );
      })}
    </div>
  );
}

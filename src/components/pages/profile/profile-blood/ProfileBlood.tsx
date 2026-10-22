"use client";

import { useEffect, useState } from "react";

import { bloodVideoSrc, canPlayBloodVideo } from "@/lib/blood-video";

import "./profile-blood.scss";

// Профиль — «место преступления»: снизу из-под края медленно растекается лужа крови.
// Ролик «pool» играет один раз (~8 сек) и остаётся на последнем кадре.
export default function ProfileBlood() {
  const [src, setSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (canPlayBloodVideo()) setSrc(bloodVideoSrc("pool"));
  }, []);

  if (!src) return null;

  return (
    <div className="profile-blood" aria-hidden="true">
      <video
        className={isPlaying ? "profile-blood-video profile-blood-playing" : "profile-blood-video"}
        src={src}
        autoPlay
        muted
        playsInline
        preload="auto"
        onLoadedMetadata={(event) => {
          // Медленнее обычного: кровь не брызгает, а растекается
          event.currentTarget.playbackRate = 0.7;
        }}
        onPlaying={() => setIsPlaying(true)}
        onError={() => setSrc(null)}
      />
    </div>
  );
}

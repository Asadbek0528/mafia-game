"use client";

import { useEffect, useState } from "react";

import { bloodVideoSrc, canPlayBloodVideo } from "@/lib/blood-video";

// Настоящая кровь льётся по краям экрана, где нет панелей комнаты.
// Пока видео не началось (или экран узкий) — видны нарисованные подтёки из RoomBackdrop.
export default function RoomBloodVideo() {
  const [src, setSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState({ left: false, right: false });

  useEffect(() => {
    if (canPlayBloodVideo() && window.matchMedia("(min-width: 1360px)").matches) setSrc(bloodVideoSrc("drops"));
  }, []);

  if (!src) return null;

  const isOn = playing.left || playing.right;

  return (
    <div className={isOn ? "room-backdrop-video room-backdrop-video-on" : "room-backdrop-video"}>
      {(["left", "right"] as const).map((side) => (
        <video
          key={side}
          className={playing[side] ? `room-backdrop-stream room-backdrop-stream-${side} room-backdrop-stream-playing` : `room-backdrop-stream room-backdrop-stream-${side}`}
          src={src}
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            video.playbackRate = 1.1;
            // Стороны начинают не одновременно, правая — зеркальная
            setTimeout(() => video.play().catch(() => {}), side === "left" ? 800 : 0);
          }}
          onPlaying={() => setPlaying((old) => ({ ...old, [side]: true }))}
          onError={() => setSrc(null)}
        />
      ))}
    </div>
  );
}

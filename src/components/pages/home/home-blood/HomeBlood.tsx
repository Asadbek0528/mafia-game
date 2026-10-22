"use client";

import { useEffect, useState } from "react";

import { bloodVideoSrc, canPlayBloodVideo } from "@/lib/blood-video";

import "./home-blood.scss";

// Настоящая кровь на фоне главной (ролик «drops», см. lib/blood-video.ts).
// Центр закрыт контентом, поэтому кровь льётся в тёмных полях слева и справа.
// Ролик играет один раз (~15 сек) и остаётся на последнем кадре.
const PLAYBACK_RATE = 1.15;

export default function HomeBlood() {
  const [src, setSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState({ left: false, right: false });

  useEffect(() => {
    // Поля по бокам есть только на широком экране — на узком видео не грузим
    if (canPlayBloodVideo() && window.matchMedia("(min-width: 1600px)").matches) setSrc(bloodVideoSrc("drops"));
  }, []);

  if (!src) return null;

  return (
    <div className="home-blood" aria-hidden="true">
      {(["left", "right"] as const).map((side) => (
        <video
          key={side}
          className={playing[side] ? `home-blood-video home-blood-${side} home-blood-playing` : `home-blood-video home-blood-${side}`}
          src={src}
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            video.playbackRate = PLAYBACK_RATE;
            // Правая сторона начинает чуть позже — кровь не льётся одновременно, как в зеркале
            setTimeout(() => video.play().catch(() => {}), side === "left" ? 300 : 1600);
          }}
          onPlaying={() => setPlaying((old) => ({ ...old, [side]: true }))}
          onError={() => setSrc(null)}
        />
      ))}
    </div>
  );
}

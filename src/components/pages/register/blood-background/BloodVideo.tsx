"use client";

import { useEffect, useState } from "react";

import { bloodVideoSrc, canPlayBloodVideo } from "@/lib/blood-video";

// Настоящее видео крови («drops», см. lib/blood-video.ts): играет один раз и замирает на последнем кадре.
export default function BloodVideo() {
  const [src, setSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (canPlayBloodVideo()) setSrc(bloodVideoSrc("drops"));
  }, []);

  if (!src) return null;

  return (
    <video
      className={isPlaying ? "blood-video blood-video-playing" : "blood-video"}
      src={src}
      autoPlay
      muted
      playsInline
      preload="auto"
      aria-hidden="true"
      onPlaying={() => setIsPlaying(true)}
      onError={() => setSrc(null)}
    />
  );
}

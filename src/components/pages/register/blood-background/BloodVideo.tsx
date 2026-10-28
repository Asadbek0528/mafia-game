"use client";

import { useBloodVideo } from "@/utils/blood-video";

export default function BloodVideo() {
  const { src, isPlaying, onPlaying, onError } = useBloodVideo();

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
      onPlaying={onPlaying}
      onError={onError}
    />
  );
}

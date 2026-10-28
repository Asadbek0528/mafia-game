"use client";

import { slowBloodPlayback, useBloodVideo } from "@/utils/blood-video";

import "./profile-blood.scss";

export default function ProfileBlood() {
  const { src, isPlaying, onPlaying, onError } = useBloodVideo("pool");

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
        onLoadedMetadata={slowBloodPlayback}
        onPlaying={onPlaying}
        onError={onError}
      />
    </div>
  );
}

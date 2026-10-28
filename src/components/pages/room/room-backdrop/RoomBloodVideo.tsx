"use client";

import { BLOOD_SIDES, ROOM_BLOOD, useSideBloodVideo } from "@/utils/blood-video";


export default function RoomBloodVideo() {
  const { src, playing, isOn, onLoadedMetadata, onPlaying, onError } = useSideBloodVideo(ROOM_BLOOD);

  if (!src) return null;

  return (
    <div className={isOn ? "room-backdrop-video room-backdrop-video-on" : "room-backdrop-video"}>
      {BLOOD_SIDES.map((side) => (
        <video
          key={side}
          className={`room-backdrop-stream room-backdrop-stream-${side}${playing[side] ? " room-backdrop-stream-playing" : ""}`}
          src={src}
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={onLoadedMetadata(side)}
          onPlaying={onPlaying(side)}
          onError={onError}
        />
      ))}
    </div>
  );
}

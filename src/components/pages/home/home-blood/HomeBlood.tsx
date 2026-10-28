"use client";

import { BLOOD_SIDES, HOME_BLOOD, useSideBloodVideo } from "@/utils/blood-video";

import "./home-blood.scss";


export default function HomeBlood() {
  const { src, playing, onLoadedMetadata, onPlaying, onError } = useSideBloodVideo(HOME_BLOOD);

  if (!src) return null;

  return (
    <div className="home-blood" aria-hidden="true">
      {BLOOD_SIDES.map((side) => (
        <video
          key={side}
          className={`home-blood-video home-blood-${side}${playing[side] ? " home-blood-playing" : ""}`}
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

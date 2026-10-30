import { BACKDROP_DRIPS, BACKDROP_FALLING, BACKDROP_HEIGHT, BACKDROP_WIDTH } from "@/utils/room/backdrop";

import RoomBloodVideo from "./RoomBloodVideo";
import "./room-backdrop.scss";

export default function RoomBackdrop() {
  return (
    <div className="room-backdrop" aria-hidden="true">
      <div className="room-backdrop-art room-backdrop-art-left" />
      <div className="room-backdrop-art room-backdrop-art-right" />

      <div className="room-backdrop-fog room-backdrop-fog-back" />
      <div className="room-backdrop-fog room-backdrop-fog-front" />

      <p className="room-backdrop-whisper room-backdrop-whisper-1">кто-то из вас лжёт</p>
      <p className="room-backdrop-whisper room-backdrop-whisper-2">мафия уже здесь</p>
      <p className="room-backdrop-whisper room-backdrop-whisper-3">не спи этой ночью</p>

      <RoomBloodVideo />

      <svg className="room-backdrop-blood" viewBox={`0 0 ${BACKDROP_WIDTH} ${BACKDROP_HEIGHT}`} preserveAspectRatio="xMidYMin slice">
        <defs>
          <filter id="room-blood-liquid" x="-5%" y="-10%" width="110%" height="140%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feColorMatrix in="blur" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" result="liquid" />
            <feGaussianBlur in="liquid" stdDeviation="2" result="bump" />
            <feSpecularLighting in="bump" surfaceScale="6" specularConstant="0.95" specularExponent="42" lightingColor="#ffffff" result="shine">
              <feDistantLight azimuth="225" elevation="48" />
            </feSpecularLighting>
            <feComposite in="shine" in2="liquid" operator="in" result="shineOnBlood" />
            <feComposite in="liquid" in2="shineOnBlood" operator="arithmetic" k1="0" k2="1" k3="0.55" k4="0" result="lit" />
            <feDropShadow in="lit" dx="0" dy="3" stdDeviation="3" floodColor="#1a0002" floodOpacity="0.8" />
          </filter>

          <linearGradient id="room-blood-fill" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="220">
            <stop offset="0" stopColor="#3a0006" />
            <stop offset="0.18" stopColor="#7a000c" />
            <stop offset="0.55" stopColor="#a80013" />
            <stop offset="1" stopColor="#d0061d" />
          </linearGradient>

          <radialGradient id="room-blood-drop" cx="0.35" cy="0.3" r="0.75">
            <stop offset="0" stopColor="#ff4a5a" />
            <stop offset="0.3" stopColor="#c0061c" />
            <stop offset="1" stopColor="#4a0008" />
          </radialGradient>
        </defs>

        <g filter="url(#room-blood-liquid)" fill="url(#room-blood-fill)">
          <rect x="-20" y="-30" width={BACKDROP_WIDTH + 40} height="38" />
          {BACKDROP_DRIPS.map((drip, index) => (
            <g key={index}>
              <rect x={drip.left} y="4" width={drip.width} height={drip.length} rx={drip.radius}>
                <animate attributeName="height" from="0" to={drip.length} dur={drip.growDur} begin={drip.begin} fill="freeze" calcMode="spline" keySplines="0.3 0 0.2 1" keyTimes="0;1" />
              </rect>
              <circle cx={drip.x} cy={drip.tipY} r={drip.dropRadius}>
                <animate attributeName="cy" from="10" to={drip.tipY} dur={drip.growDur} begin={drip.begin} fill="freeze" calcMode="spline" keySplines="0.3 0 0.2 1" keyTimes="0;1" />
              </circle>
            </g>
          ))}
        </g>

        {BACKDROP_FALLING.map((drop, index) => (
          <ellipse key={index} cx={drop.x} cy={drop.from} rx={drop.rx} ry={drop.ry} fill="url(#room-blood-drop)" opacity="0">
            <animate attributeName="cy" values={drop.path} keyTimes="0;0.6;1" calcMode="spline" keySplines="0 0 1 1;0.55 0 1 0.6" dur={drop.dur} begin={drop.begin} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.55;0.95;1" dur={drop.dur} begin={drop.begin} repeatCount="indefinite" />
          </ellipse>
        ))}
      </svg>

      <div className="room-backdrop-flash" />
      <div className="room-backdrop-grain" />
      <div className="room-backdrop-vignette" />
    </div>
  );
}

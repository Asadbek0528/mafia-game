"use client";

import { play, useSoundSettings } from "@/utils/sound";
import { useDropdown } from "@/utils/use-dropdown";

import "./sound-control.scss";

export default function SoundControl() {
  const [settings, setSettings] = useSoundSettings();
  const { isOpen, rootRef, toggle } = useDropdown();

  const isSilent = !settings.on || settings.volume === 0;
  const volumePercent = Math.round(settings.volume * 100);
  const ambiencePercent = Math.round(settings.ambience * 100);

  return (
    <div className="sound-control" ref={rootRef}>
      <button
        type="button"
        className={isSilent ? "sound-control-button sound-control-button-off" : "sound-control-button"}
        aria-label="Звук"
        aria-expanded={isOpen}
        title="Звук"
        onClick={toggle}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
          {isSilent ? (
            <path d="m16 9.5 5 5M21 9.5l-5 5" />
          ) : (
            <>
              <path d="M15.5 9a4.5 4.5 0 0 1 0 6" />
              {settings.volume > 0.5 && <path d="M18.2 6.5a8 8 0 0 1 0 11" />}
            </>
          )}
        </svg>
      </button>

      {isOpen && (
        <div className="sound-control-panel" role="dialog" aria-label="Настройки звука">
          <label className="sound-control-switch">
            <span>Звук</span>
            <input type="checkbox" role="switch" checked={settings.on} onChange={(event) => setSettings({ on: event.target.checked })} />
            <i aria-hidden="true" />
          </label>

          <label className="sound-control-slider">
            <span>
              Громкость <b>{volumePercent}%</b>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={volumePercent}
              disabled={!settings.on}
              style={{ "--fill": `${volumePercent}%` } as React.CSSProperties}
              onChange={(event) => setSettings({ volume: Number(event.target.value) / 100 })}
            />
          </label>

          <label className="sound-control-slider">
            <span>
              Атмосфера <b>{ambiencePercent === 0 ? "выкл" : `${ambiencePercent}%`}</b>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={ambiencePercent}
              disabled={!settings.on}
              style={{ "--fill": `${ambiencePercent}%` } as React.CSSProperties}
              onChange={(event) => setSettings({ ambience: Number(event.target.value) / 100 })}
            />
            <small>Гул ночи, ветер и далёкий колокол фоном</small>
          </label>

          <button type="button" className="btn btn-dark btn-small btn-full" disabled={!settings.on} onClick={() => play("kill")}>
            Проверить звук
          </button>
        </div>
      )}
    </div>
  );
}

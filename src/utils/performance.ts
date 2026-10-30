import { useEffect } from "react";

const LITE_KEY = "mafia_lite";
const SAMPLE_MS = 2000;
const MIN_FPS = 40;

type DeviceNavigator = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };

function isWeakDevice(): boolean {
  const device = navigator as DeviceNavigator;
  if (device.connection?.saveData) return true;
  if (device.hardwareConcurrency && device.hardwareConcurrency <= 4) return true;
  return device.deviceMemory !== undefined && device.deviceMemory <= 2;
}

function readSaved(): boolean | null {
  try {
    const saved = localStorage.getItem(LITE_KEY);
    return saved === null ? null : saved === "1";
  } catch {
    return null;
  }
}

function save(isLite: boolean) {
  try {
    localStorage.setItem(LITE_KEY, isLite ? "1" : "0");
  } catch {}
}

function setLite(isLite: boolean) {
  document.documentElement.classList.toggle("lite", isLite);
}

function measureFps(onDone: (fps: number) => void) {
  let frames = 0;
  let start = 0;
  let id = 0;
  const tick = (time: number) => {
    if (!start) start = time;
    frames += 1;
    if (time - start < SAMPLE_MS) {
      id = requestAnimationFrame(tick);
      return;
    }
    onDone((frames * 1000) / (time - start));
  };
  id = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(id);
}

export function useLiteMode() {
  useEffect(() => {
    const saved = readSaved();
    if (saved !== null) {
      setLite(saved);
      return;
    }
    if (isWeakDevice()) {
      setLite(true);
      save(true);
      return;
    }
    return measureFps((fps) => {
      if (document.hidden) return;
      const isLite = fps < MIN_FPS;
      setLite(isLite);
      save(isLite);
    });
  }, []);
}

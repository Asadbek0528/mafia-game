import type { CSSProperties } from "react";

function hueFromName(name: string): number {
  let hue = 0;
  for (const letter of name) hue = (hue * 31 + letter.charCodeAt(0)) % 360;
  return hue;
}

export function isPhoto(image: string | null | undefined): image is string {
  return Boolean(image && /^(data:image\/|https?:\/\/|\/)/.test(image));
}

export function avatarLetter(name: string): string {
  return name.replace("Гость_", "Г").charAt(0).toUpperCase();
}

export function avatarStyle(name: string, size: number): CSSProperties {
  const hue = hueFromName(name);
  return {
    width: size,
    height: size,
    fontSize: size * 0.42,
    background: `radial-gradient(circle at 30% 25%, hsl(${hue} 45% 32%), hsl(${hue} 55% 10%))`,
  };
}

const HALF = 10_000;
const KEYS = [7919, 104_729, 1_299_709, 15_485_863];

function mix(value: number, key: number): number {
  const x = (value * 2_654_435_761 + key) % 4_294_967_296;
  return Math.floor(x / 7) % HALF;
}

function encode(value: number): number {
  let left = Math.floor(value / HALF);
  let right = value % HALF;
  for (const key of KEYS) {
    [left, right] = [right, (left + mix(right, key)) % HALF];
  }
  return left * HALF + right;
}

function decode(value: number): number {
  let left = Math.floor(value / HALF);
  let right = value % HALF;
  for (const key of [...KEYS].reverse()) {
    [left, right] = [(right - mix(left, key) + HALF * HALF) % HALF, left];
  }
  return left * HALF + right;
}

export function toPlayerId(userId: number): string {
  return String(encode(userId)).padStart(8, "0");
}

export function fromPlayerId(playerId: string): number | null {
  const clean = playerId.replace(/\D/g, "");
  if (!/^\d{7,8}$/.test(clean)) return null;
  const userId = decode(Number(clean));
  return userId > 0 ? userId : null;
}

export function formatPlayerId(playerId: string): string {
  return `${playerId.slice(0, 4)} ${playerId.slice(4)}`;
}

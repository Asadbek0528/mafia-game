export const BACKDROP_WIDTH = 1440;
export const BACKDROP_HEIGHT = 260;

function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = seeded(666);
const round = (value: number) => Math.round(value * 10) / 10;

const RAW_DRIPS = Array.from({ length: 22 }, (_, index) => {
  const width = 4 + random() * 9;
  return {
    x: round(((index + 0.5) / 22) * BACKDROP_WIDTH + (random() - 0.5) * 40),
    width: round(width),
    length: round(20 + Math.pow(random(), 1.8) * 190),
    grow: round(4 + random() * 5),
    delay: round(random() * 2),
  };
});

export const BACKDROP_DRIPS = RAW_DRIPS.map((drip) => ({
  ...drip,
  left: round(drip.x - drip.width / 2),
  radius: round(drip.width / 2),
  dropRadius: round(drip.width * 0.75),
  tipY: 4 + drip.length,
  growDur: `${drip.grow}s`,
  begin: `${drip.delay}s`,
}));

export const BACKDROP_FALLING = RAW_DRIPS.filter((_, index) => index % 3 === 1).map((drip) => {
  const every = round(6 + random() * 8);
  const start = round(4 + random() * 6);
  const from = 4 + drip.length + drip.width;
  return {
    x: drip.x,
    from,
    rx: round(drip.width * 0.4),
    ry: round(drip.width * 0.55),
    path: `${from};${from};${BACKDROP_HEIGHT * 4}`,
    dur: `${every}s`,
    begin: `${start}s`,
  };
});

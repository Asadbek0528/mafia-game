import { useEffect, useState } from "react";

export type SoundName = "tick" | "select" | "confirm" | "night" | "morning" | "gavel" | "kill" | "heal" | "shield" | "win" | "lose";
export type Ambience = "night" | "day" | null;

export type SoundSettings = {
  on: boolean;
  volume: number;
  ambience: number;
};

const STORAGE_KEY = "mafia_sound_v2";
const CHANGE_EVENT = "mafia-sound-change";
const DEFAULTS: SoundSettings = { on: true, volume: 0.7, ambience: 0.5 };

export function getSoundSettings(): SoundSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<SoundSettings> | null;
    return { ...DEFAULTS, ...saved };
  } catch {
    return DEFAULTS;
  }
}

export function setSoundSettings(change: Partial<SoundSettings>) {
  const next = { ...getSoundSettings(), ...change };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
  }
  applySettings(next);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useSoundSettings(): [SoundSettings, (change: Partial<SoundSettings>) => void] {
  const [settings, setSettings] = useState<SoundSettings>(DEFAULTS);
  useEffect(() => {
    const refresh = () => setSettings(getSoundSettings());
    refresh();
    window.addEventListener(CHANGE_EVENT, refresh);
    return () => window.removeEventListener(CHANGE_EVENT, refresh);
  }, []);
  return [settings, setSoundSettings];
}

type Graph = {
  ctx: AudioContext;
  master: GainNode;
  fx: GainNode;
  reverbSend: GainNode;
  ambienceBus: GainNode;
};

let graph: Graph | null = null;

function makeImpulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
  }
  return impulse;
}

function getGraph(): Graph | null {
  if (typeof window === "undefined") return null;
  if (!graph) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    const ctx = new Ctor();

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -18;
    limiter.knee.value = 20;
    limiter.ratio.value = 4;
    limiter.attack.value = 0.01;
    limiter.release.value = 0.4;
    limiter.connect(ctx.destination);

    const master = ctx.createGain();
    master.connect(limiter);

    const reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(ctx, 4.2, 3.2);
    const reverbOut = ctx.createGain();
    reverbOut.gain.value = 0.55;
    reverb.connect(reverbOut).connect(master);

    const reverbSend = ctx.createGain();
    reverbSend.connect(reverb);

    const fx = ctx.createGain();
    const warm = ctx.createBiquadFilter();
    warm.type = "lowpass";
    warm.frequency.value = 7000;
    fx.connect(warm).connect(master);
    fx.connect(reverbSend);

    const ambienceBus = ctx.createGain();
    ambienceBus.connect(master);
    ambienceBus.connect(reverbSend);

    graph = { ctx, master, fx, reverbSend, ambienceBus };
    applySettings(getSoundSettings());
  }
  if (graph.ctx.state === "suspended") graph.ctx.resume().catch(() => {});
  return graph;
}

function applySettings(settings: SoundSettings) {
  if (!graph) return;
  const now = graph.ctx.currentTime;
  graph.master.gain.setTargetAtTime(settings.on ? settings.volume * settings.volume * 0.9 : 0, now, 0.08);
  graph.ambienceBus.gain.setTargetAtTime(settings.ambience * settings.ambience * 0.6, now, 0.3);
}

type ToneOptions = {
  type?: OscillatorType;
  volume?: number;
  attack?: number;
  slideTo?: number;
  detune?: number;
  wet?: number;
  lowpass?: number;
  vibrato?: number;
  output?: AudioNode;
};

function tone(freq: number, start: number, duration: number, options: ToneOptions = {}) {
  const g = getGraph();
  if (!g) return;
  const { ctx } = g;
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  osc.type = options.type ?? "sine";
  osc.frequency.setValueAtTime(freq, t);
  if (options.detune) osc.detune.value = options.detune;
  if (options.slideTo) osc.frequency.exponentialRampToValueAtTime(options.slideTo, t + duration);

  if (options.vibrato) {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 5.2;
    depth.gain.value = options.vibrato;
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(t);
    lfo.stop(t + duration + 0.1);
  }

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = options.lowpass ?? 6000;

  const gain = ctx.createGain();
  const volume = options.volume ?? 0.2;
  const attack = options.attack ?? 0.008;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

  osc.connect(filter).connect(gain);
  connectOut(gain, options);
  osc.start(t);
  osc.stop(t + duration + 0.1);
}

type NoiseOptions = {
  filter?: BiquadFilterType;
  freq?: number;
  freqTo?: number;
  q?: number;
  volume?: number;
  attack?: number;
  wet?: number;
  output?: AudioNode;
};

function noise(start: number, duration: number, options: NoiseOptions = {}) {
  const g = getGraph();
  if (!g) return;
  const { ctx } = g;
  const t = ctx.currentTime + start;
  const length = Math.ceil(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = options.filter ?? "lowpass";
  filter.Q.value = options.q ?? 0.8;
  filter.frequency.setValueAtTime(options.freq ?? 800, t);
  if (options.freqTo) filter.frequency.exponentialRampToValueAtTime(options.freqTo, t + duration);

  const gain = ctx.createGain();
  const volume = options.volume ?? 0.3;
  const attack = options.attack ?? 0.005;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

  source.connect(filter).connect(gain);
  connectOut(gain, options);
  source.start(t);
}

function connectOut(node: AudioNode, options: { wet?: number; output?: AudioNode }) {
  const g = getGraph();
  if (!g) return;
  if (options.output) {
    node.connect(options.output);
    return;
  }
  node.connect(g.fx);
  if (options.wet) {
    const send = g.ctx.createGain();
    send.gain.value = options.wet;
    node.connect(send).connect(g.reverbSend);
  }
}

function bell(freq: number, start: number, volume: number, wet = 0.8) {
  [
    [0.5, 1, 6],
    [1, 0.8, 4.5],
    [1.19, 0.45, 3.2],
    [1.5, 0.35, 2.6],
    [2, 0.3, 2.2],
    [2.52, 0.18, 1.6],
    [3.01, 0.1, 1.2],
  ].forEach(([ratio, level, length]) => tone(freq * ratio, start, length, { volume: volume * level, attack: 0.004, wet }));
}

function heartbeat(start: number, volume = 0.5) {
  [
    [0, 1],
    [0.22, 0.7],
  ].forEach(([offset, level]) => {
    tone(62, start + offset, 0.28, { volume: volume * level, slideTo: 38, attack: 0.01, lowpass: 400, wet: 0.25 });
    noise(start + offset, 0.09, { filter: "lowpass", freq: 180, volume: volume * level * 0.4 });
  });
}

let tickBeat = 0;

const SOUNDS: Record<SoundName, () => void> = {
  tick: () => {
    tickBeat += 1;
    heartbeat(0, 0.55 + Math.min(tickBeat, 5) * 0.04);
  },
  select: () => {
    tone(740, 0, 0.18, { type: "triangle", volume: 0.09, lowpass: 2400, wet: 0.2 });
    noise(0, 0.03, { filter: "bandpass", freq: 2200, q: 3, volume: 0.06 });
  },
  confirm: () => {
    tone(220, 0, 0.7, { type: "triangle", volume: 0.16, lowpass: 1800, wet: 0.4 });
    tone(330, 0.12, 0.9, { type: "triangle", volume: 0.12, lowpass: 1800, wet: 0.5 });
    noise(0, 0.06, { filter: "lowpass", freq: 900, volume: 0.15 });
  },
  night: () => {
    [110, 110 * 1.2, 110 * 1.5].forEach((freq, index) =>
      [-9, 9].forEach((detune) =>
        tone(freq, index * 0.15, 3.6, { type: "sawtooth", volume: 0.035, attack: 0.9, slideTo: freq * 0.84, detune, lowpass: 700, wet: 0.9 }),
      ),
    );
    noise(0, 3.8, { filter: "bandpass", freq: 1200, freqTo: 260, q: 1.2, volume: 0.12, attack: 1.2, wet: 0.6 });
    bell(196, 1.4, 0.06, 1);
    bell(196 * Math.SQRT2, 2.3, 0.035, 1);
  },
  morning: () => {
    bell(262, 0, 0.12);
    bell(392, 0.9, 0.07);
    noise(0, 2.4, { filter: "highpass", freq: 4000, volume: 0.03, attack: 0.8, wet: 0.5 });
  },
  gavel: () => {
    [0, 0.32].forEach((start, index) => {
      noise(start, 0.16, { filter: "bandpass", freq: 620, q: 2.2, volume: 0.55 - index * 0.1, wet: 0.7 });
      tone(150, start, 0.22, { volume: 0.35 - index * 0.05, slideTo: 85, lowpass: 900, wet: 0.6 });
    });
  },
  kill: () => {
    noise(0, 0.45, { filter: "bandpass", freq: 300, freqTo: 3200, q: 1.5, volume: 0.22, attack: 0.4, wet: 0.4 });
    tone(70, 0.42, 1.4, { volume: 0.7, slideTo: 28, attack: 0.005, lowpass: 300, wet: 0.5 });
    noise(0.42, 0.5, { filter: "lowpass", freq: 900, freqTo: 70, volume: 0.6, wet: 0.5 });
    [1318, 1397, 1975].forEach((freq, index) =>
      tone(freq, 0.5 + index * 0.05, 3.2, { type: "sawtooth", volume: 0.018, attack: 0.25, vibrato: 7, lowpass: 3500, wet: 1 }),
    );
  },
  heal: () => [523, 659, 784, 1046].forEach((freq, index) => tone(freq, index * 0.13, 1.6, { volume: 0.08, wet: 0.9 })),
  shield: () => {
    [784, 988, 1175, 1568, 1976, 2349].forEach((freq, index) => tone(freq, index * 0.06, 1.8, { volume: 0.05, vibrato: 3, wet: 1 }));
    noise(0, 1.2, { filter: "highpass", freq: 6000, volume: 0.05, attack: 0.3, wet: 0.8 });
  },
  win: () => {
    [262, 330, 392, 523].forEach((freq, index) =>
      tone(freq, index * 0.12, 3.2, { type: "triangle", volume: 0.07, attack: 0.4, lowpass: 2500, wet: 0.8 }),
    );
    bell(523, 0.5, 0.05);
  },
  lose: () => {
    [392, 311, 262, 196].forEach((freq, index) => tone(freq, index * 0.3, 1.8, { type: "triangle", volume: 0.07, lowpass: 1600, wet: 0.8 }));
    tone(55, 0.6, 3.5, { volume: 0.2, attack: 0.8, wet: 0.5 });
  },
};

export function play(name: SoundName) {
  if (!getSoundSettings().on) return;
  try {
    SOUNDS[name]();
  } catch {
  }
}

export function resetTick() {
  tickBeat = 0;
}

type AmbienceVoice = { stop: () => void };
let currentAmbience: { kind: Ambience; voice: AmbienceVoice } | null = null;

function startNight(): AmbienceVoice | null {
  const g = getGraph();
  if (!g) return null;
  const { ctx } = g;
  const out = ctx.createGain();
  out.gain.value = 0.0001;
  out.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 3);
  out.connect(g.ambienceBus);

  const drones = [55, 55.35, 82.4].map((freq) => {
    const osc = ctx.createOscillator();
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.value = freq > 60 ? 0.05 : 0.12;
    osc.connect(gain).connect(out);
    osc.start();
    return osc;
  });

  const length = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  const wind = ctx.createBufferSource();
  wind.buffer = buffer;
  wind.loop = true;
  const windFilter = ctx.createBiquadFilter();
  windFilter.type = "bandpass";
  windFilter.Q.value = 1.6;
  windFilter.frequency.value = 500;
  const gust = ctx.createOscillator();
  gust.frequency.value = 0.07;
  const gustDepth = ctx.createGain();
  gustDepth.gain.value = 320;
  gust.connect(gustDepth).connect(windFilter.frequency);
  const windGain = ctx.createGain();
  windGain.gain.value = 0.05;
  wind.connect(windFilter).connect(windGain).connect(out);
  wind.start();
  gust.start();

  let bellTimer: ReturnType<typeof setTimeout>;
  const ringLater = () => {
    bellTimer = setTimeout(() => {
      if (getSoundSettings().on) bell(147, 0, 0.025 * getSoundSettings().ambience, 1);
      ringLater();
    }, 18000 + Math.random() * 12000);
  };
  ringLater();

  return {
    stop: () => {
      clearTimeout(bellTimer);
      out.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.8);
      setTimeout(() => {
        drones.forEach((osc) => osc.stop());
        wind.stop();
        gust.stop();
        out.disconnect();
      }, 4000);
    },
  };
}

function startDay(): AmbienceVoice | null {
  const g = getGraph();
  if (!g) return null;
  const { ctx } = g;
  const out = ctx.createGain();
  out.gain.value = 0.0001;
  out.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 3);
  out.connect(g.ambienceBus);

  const breath = ctx.createOscillator();
  breath.frequency.value = 0.12;
  const breathDepth = ctx.createGain();
  breathDepth.gain.value = 0.02;
  const pad = ctx.createGain();
  pad.gain.value = 0.035;
  breath.connect(breathDepth).connect(pad.gain);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 900;
  pad.connect(filter).connect(out);

  const voices = [110, 130.8, 164.8, 220].flatMap((freq) =>
    [-6, 6].map((detune) => {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      osc.detune.value = detune;
      osc.connect(pad);
      osc.start();
      return osc;
    }),
  );
  breath.start();

  return {
    stop: () => {
      out.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.8);
      setTimeout(() => {
        voices.forEach((osc) => osc.stop());
        breath.stop();
        out.disconnect();
      }, 4000);
    },
  };
}

export function setAmbience(kind: Ambience) {
  if (currentAmbience?.kind === kind) return;
  currentAmbience?.voice.stop();
  currentAmbience = null;
  if (!kind || !getSoundSettings().on) return;
  const voice = kind === "night" ? startNight() : startDay();
  if (voice) currentAmbience = { kind, voice };
}

export function unlockSoundOnGesture(onUnlock?: () => void) {
  if (typeof window === "undefined") return () => {};
  const unlock = () => {
    getGraph();
    onUnlock?.();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
  return () => {
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
}

/** 合成音效：不載入音檔；預設關閉，避免整班平板同時發聲 */
const KEY = "jpwn.ch6islands.sound";

let ctx = null;
let enabled = false;
try {
  enabled = localStorage.getItem(KEY) === "on";
} catch {
  enabled = false;
}

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(a, freq, start, dur, type = "sine", gain = 0.07) {
  const osc = a.createOscillator();
  const amp = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(amp).connect(a.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

const PATTERNS = {
  tap: (a, t) => tone(a, 880, t, 0.05, "sine", 0.04),
  select: (a, t) => {
    tone(a, 660, t, 0.09, "triangle");
    tone(a, 990, t + 0.06, 0.12, "triangle");
  },
  open: (a, t) => {
    tone(a, 523, t, 0.1);
    tone(a, 784, t + 0.07, 0.14);
  },
  close: (a, t) => {
    tone(a, 784, t, 0.08);
    tone(a, 523, t + 0.06, 0.1);
  },
  complete: (a, t) => {
    [523, 659, 784, 1047].forEach((f, i) => tone(a, f, t + i * 0.09, 0.26, "triangle", 0.07));
  },
};

export const sfx = {
  isOn: () => enabled,
  setOn(value) {
    enabled = !!value;
    try {
      localStorage.setItem(KEY, enabled ? "on" : "off");
    } catch {
      /* ignore */
    }
  },
  play(name) {
    if (!enabled) return;
    const a = audio();
    const fn = PATTERNS[name];
    if (a && fn) fn(a, a.currentTime);
  },
};

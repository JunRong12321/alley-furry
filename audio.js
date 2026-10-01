let ac;
export function unlockAudio() {
  try { if (!ac) ac = new AudioContext(); if (ac.state === 'suspended') ac.resume(); } catch { /* audio is optional */ }
}
export function sfx(freq, dur, type = 'square', vol = 0.06) {
  if (!ac) return;
  try {
    const o = ac.createOscillator(), a = ac.createGain(), t = ac.currentTime;
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, freq / 3), t + dur);
    a.gain.setValueAtTime(vol, t);
    a.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(a).connect(ac.destination);
    o.start(); o.stop(t + dur);
  } catch { /* ignore */ }
}

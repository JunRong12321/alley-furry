import { KEYMAP, W, H } from './config.js';

const keys = {};
const edges = {};          // presses since the last read: a tap shorter than one frame can never be missed
const padHeld = [{}, {}], padEdges = [{}, {}], padRepeats = [{}, {}];
const DIRECTIONS = ['l', 'r', 'u', 'd'];
export const clearEdges = () => {
  for (const k in edges) edges[k] = 0;
  padEdges.forEach(state => { for (const k in state) state[k] = 0; });
};
export function readPlayer(n) {
  const map = KEYMAP[n], out = { e: {} };
  for (const a in map) {
    out[a] = !!keys[map[a]] || !!padHeld[n][a];
    out.e[a] = !!edges[map[a]] || !!padEdges[n][a];
    edges[map[a]] = 0; padEdges[n][a] = 0;
  }
  return out;
}
const releaseAll = () => { for (const k in keys) keys[k] = 0; };

function button(pad, index) { return !!pad?.buttons?.[index]?.pressed; }
function gamepadState(pad) {
  const x = pad?.axes?.[0] || 0, y = pad?.axes?.[1] || 0, dead = .38;
  return {
    l: button(pad, 14) || x < -dead, r: button(pad, 15) || x > dead,
    u: button(pad, 12) || y < -dead, d: button(pad, 13) || y > dead,
    p: button(pad, 0), k: button(pad, 1), s: button(pad, 2), x: button(pad, 3),
    shoulderL: button(pad, 4), shoulderR: button(pad, 5), start: button(pad, 9), back: button(pad, 8),
  };
}
function menuConfirm(mode) { return ['menu', 'dojoSelect', 'tutorial', 'pause', 'settings', 'match'].includes(mode); }
export function pollGamepads({ onKey, getMode, unlock = () => {} }) {
  if (!navigator.getGamepads) return;
  const pads = Array.from(navigator.getGamepads()).filter(Boolean).slice(0, 2);
  for (let n = 0; n < 2; n++) {
    const next = gamepadState(pads[n]), was = { ...padHeld[n] };
    for (const action of ['l', 'r', 'u', 'd', 'p', 'k', 's', 'x']) {
      if (next[action] && !was[action]) padEdges[n][action] = 1;
      padHeld[n][action] = next[action];
    }
    padHeld[n].shoulderL = next.shoulderL; padHeld[n].shoulderR = next.shoulderR;
    const map = KEYMAP[n], codes = { l: map.l, r: map.r, u: map.u, d: map.d };
    for (const action of DIRECTIONS) {
      if (!next[action]) { padRepeats[n][action] = 0; continue; }
      const count = (padRepeats[n][action] || 0) + 1; padRepeats[n][action] = count;
      if (!was[action]) unlock();
      if (!was[action] || count % 9 === 0) onKey(codes[action]);
    }
    if (next.p && !was.p) {
      unlock(); onKey(getMode() === 'select' ? map.p : menuConfirm(getMode()) ? 'Enter' : map.p);
    }
    if (next.k && !was.k) { unlock(); onKey(map.k); }
    if (next.s && !was.s) { unlock(); onKey(map.s); }
    if (next.x && !was.x) { unlock(); onKey(map.x); }
    if (next.shoulderL && !was.shoulderL) { unlock(); onKey(getMode() === 'dojo' ? 'BracketLeft' : 'KeyQ'); }
    if (next.shoulderR && !was.shoulderR) { unlock(); onKey(getMode() === 'dojo' ? 'BracketRight' : 'KeyE'); }
    if ((next.start && !was.start) || (next.back && !was.back)) {
      unlock();
      const mode = getMode();
      if (['intro', 'fight', 'end', 'dojo'].includes(mode)) onKey('Escape');
      else if (mode === 'select' && next.start) { if (!next.p) onKey(map.p); }
      else onKey(next.start ? 'Enter' : 'Escape');
    }
  }
}

export function initInput({ canvas, onKey, onPoint, unlock }) {
  addEventListener('keydown', e => {
    if (e.code.startsWith('Arrow') || e.code === 'Space' || e.code === 'Tab') e.preventDefault();
    if (e.repeat) return;
    keys[e.code] = edges[e.code] = 1; unlock(); onKey(e.code);
  });
  addEventListener('keyup', e => { keys[e.code] = 0; });
  // Prevents "stuck" keys when the window loses focus mid-fight.
  addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });

  document.querySelectorAll('[data-k]').forEach(b => {     // on-screen touch buttons
    const k = b.dataset.k, up = () => { keys[k] = 0; };
    b.addEventListener('pointerdown', e => {
      e.preventDefault();
      try { b.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      keys[k] = edges[k] = 1; unlock(); onKey(k);
    });
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
  });
  canvas.addEventListener('pointerdown', e => {
    unlock(); window.focus();
    const r = canvas.getBoundingClientRect();
    onPoint((e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height);
  });
}

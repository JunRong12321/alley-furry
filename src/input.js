import { KEYMAP, W, H } from './config.js';

const keys = {};
const edges = {};          // presses since the last read: a tap shorter than one frame can never be missed
export const clearEdges = () => { for (const k in edges) edges[k] = 0; };
export function readPlayer(n) {
  const map = KEYMAP[n], out = { e: {} };
  for (const a in map) { out[a] = !!keys[map[a]]; out.e[a] = !!edges[map[a]]; edges[map[a]] = 0; }
  return out;
}
const releaseAll = () => { for (const k in keys) keys[k] = 0; };

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

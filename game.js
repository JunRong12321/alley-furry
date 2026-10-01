// Pure game logic. No DOM, no canvas: it can run (and be tested) in Node.
import { W, ROUND_TIME, ROUNDS_TO_WIN, CHARS, PORT, selButtons, ROLL_FRAMES, PAUSE_ITEMS, pauseRect } from './config.js';
import { createFighter, resetFighter, updateFighter } from './fighter.js';
import { hurtbox, applyHit, canHit } from './combat.js';
import { cpuInput } from './ai.js';

export function createWorld(sfx = () => {}) {
  return { mode: 'menu', fighters: [], fireballs: [], t: 0, tick: 0, time: ROUND_TIME, round: 0,
           winner: -1, shake: 0, hitstop: 0, fx: [], banner: null, twoP: false, picks: [0, 1], sel: null, back: 'fight', pm: 0, sfx };
}
// ----- character select: both players choose at the same time -----
const rnd = n => Math.random() * n | 0;
export function openSelect(w, twoP) {
  Object.assign(w, { mode: 'select', twoP, fighters: [], fireballs: [] });
  // cur = highlighted fighter, lock = ready, roll = random-roll state. In 1-player mode the CPU side is always ready.
  w.sel = { cur: [0, twoP ? 1 : rnd(CHARS.length)], lock: [false, !twoP], roll: [null, null], slot: 0, go: 0 };
}
const free = (w, n) => !w.sel.roll[n] && (!w.sel.lock[n] || (!w.twoP && n === 1));
export function selPick(w, n, i) { if (free(w, n) && i >= 0 && i < CHARS.length) w.sel.cur[n] = i; }
export function selMove(w, n, d) { if (free(w, n)) w.sel.cur[n] = (w.sel.cur[n] + d + CHARS.length) % CHARS.length; }
export function selLock(w, n) {
  const s = w.sel; if (s.roll[n] || (!w.twoP && n === 1)) return;
  s.lock[n] = !s.lock[n]; w.sfx(s.lock[n] ? 660 : 330, .1);
}
// Random: the highlight cycles through the roster, slowing down for 3 seconds, then lands on a fighter and locks in.
export function selRandom(w, n) {
  const s = w.sel, N = CHARS.length, target = rnd(N), H = 22, seq = [], times = []; let t = 0;
  if (s.roll[n]) return;
  for (let k = 0; k < H; k++) { seq.push(((target - (H - 1 - k)) % N + N) % N); times.push(t); t += Math.round(3 + k * .5); }
  s.roll[n] = { f: 0, seq, times }; s.lock[n] = false; s.go = 0;
}
function tickSelect(w) {
  const s = w.sel;
  [0, 1].forEach(n => {
    const r = s.roll[n]; if (!r) return;
    r.f++;
    let k = 0; while (k + 1 < r.times.length && r.times[k + 1] <= r.f) k++;
    if (s.cur[n] !== r.seq[k]) { s.cur[n] = r.seq[k]; w.sfx(400 + k * 25, .04, 'square', .05); }
    if (r.f >= ROLL_FRAMES) { s.roll[n] = null; s.lock[n] = true; w.sfx(880, .25, 'triangle', .09); }
  });
  if (s.lock[0] && s.lock[1] && !s.roll[0] && !s.roll[1]) { if (++s.go >= 70) startMatch(w, w.twoP, [...s.cur]); }   // both ready -> short countdown
  else s.go = 0;
}
const inBox = (x, y, b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;
export function selectClick(w, x, y) {
  const s = w.sel;
  for (let i = 0; i < CHARS.length; i++) if (inBox(x, y, { x: PORT.x0 + i * (PORT.w + PORT.gap), y: PORT.y, w: PORT.w, h: PORT.h })) return selPick(w, s.slot, i);
  for (const n of [0, 1]) {
    const b = selButtons(n);
    if (inBox(x, y, b.lock)) { s.slot = n; return selLock(w, n); }
    if (inBox(x, y, b.rand)) { s.slot = n; return selRandom(w, n); }
  }
  if (y >= 160) s.slot = x < W / 2 ? 0 : 1;                      // click a side to choose which fighter the mouse controls
}

// ----- pause menu (Resume / Rematch / Exit Match) -----
export function pause(w) { if (['intro', 'fight', 'end'].includes(w.mode)) { w.back = w.mode; w.mode = 'pause'; w.pm = 0; } }
export function resume(w) { if (w.mode === 'pause') w.mode = w.back; }
export function pauseChoose(w, i) {
  if (i === 0) resume(w); else if (i === 1) startMatch(w, w.twoP, w.picks); else toMenu(w);
}
export function pauseClick(w, x, y) { PAUSE_ITEMS.forEach((_, i) => { if (inBox(x, y, pauseRect(i))) pauseChoose(w, i); }); }

export function startMatch(w, twoP, picks = w.picks) {
  w.twoP = twoP; w.picks = picks;
  const [i, j] = picks;
  w.fighters = [createFighter(CHARS[i], false, false), createFighter(CHARS[j], !twoP, i === j)];
  w.round = 0; newRound(w);
}
export function newRound(w) {
  w.fighters.forEach((f, i) => resetFighter(f, i ? 660 : 300, i ? -1 : 1));
  Object.assign(w, { fireballs: [], fx: [], banner: null, mode: 'intro', t: 0, tick: 0, time: ROUND_TIME, hitstop: 0 });
  w.round++;
}
export function toMenu(w) { Object.assign(w, { mode: 'menu', fighters: [], fireballs: [], fx: [], banner: null, shake: 0, hitstop: 0 }); }

function physics(w, readInput, live) {
  w.fighters.forEach((f, n) => {
    const o = w.fighters[1 - n];
    updateFighter(w, f, o, live ? (f.ai ? cpuInput(w, f, o) : readInput(n)) : {});
  });
  const [a, b] = w.fighters, d = b.x - a.x;
  if (Math.abs(d) < 55 && Math.abs(a.y - b.y) < 60) {          // keep fighters from overlapping
    const push = (55 - Math.abs(d)) / 2, s = d >= 0 ? 1 : -1;
    a.x -= s * push; b.x += s * push;
    w.fighters.forEach(f => { f.x = Math.max(40, Math.min(W - 40, f.x)); });
  }
  w.fireballs = w.fireballs.filter(fb => {
    fb.x += fb.v;
    const target = fb.owner === a ? b : a, h = hurtbox(target), m = 14 * (fb.size || 1);
    if (canHit(target) && fb.x > h.x1 - m && fb.x < h.x2 + m && fb.y > h.y1 && fb.y < h.y2) {
      applyHit(w, fb, target, { key: 's', dmg: fb.dmg, st: fb.st, kb: fb.kb, kd: fb.kd, chip: fb.chip, g: 'mid', x: fb.x, y: fb.y }); return false;
    }
    return fb.x > -50 && fb.x < W + 50;
  });
}
function checkRoundEnd(w) {
  const [a, b] = w.fighters;
  if (a.hp > 0 && b.hp > 0 && w.time > 0) return;
  w.winner = a.hp === b.hp ? -1 : a.hp > b.hp ? 0 : 1;
  if (w.winner >= 0) w.fighters[w.winner].wins++;
  w.mode = 'end'; w.t = 0;
}
// Advance the game by exactly one frame. readInput(n) -> {l,r,u,d,p,k,s} for human player n.
export function step(w, readInput) {
  if (w.mode === 'pause') return;                                  // game is frozen while paused
  if (w.mode === 'select') tickSelect(w);
  else if (w.mode === 'intro') { if (++w.t > 120) { w.mode = 'fight'; w.t = 0; } }
  else if (w.mode === 'fight') {
    if (w.hitstop > 0) w.hitstop--;
    else { physics(w, readInput, true); if (++w.tick % 60 === 0) w.time--; checkRoundEnd(w); }
  } else if (w.mode === 'end') {
    w.t++;
    if (w.hitstop > 0) w.hitstop--; else physics(w, readInput, false);
    if (w.t > 180) {
      if (w.fighters.some(f => f.wins >= ROUNDS_TO_WIN)) w.mode = 'match'; else newRound(w);
    }
  }
  w.shake *= 0.85;
  w.fx.forEach(e => e.t++); w.fx = w.fx.filter(e => e.t < 14);
  if (w.banner && --w.banner.t <= 0) w.banner = null;
  w.fighters.forEach(f => { if (f.flash > 0) f.flash--; if (f.show > f.hp) f.show = Math.max(f.hp, f.show - 0.35); });
}

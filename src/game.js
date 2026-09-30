// Pure game logic. No DOM, no canvas: it can run (and be tested) in Node.
import { W, ROUND_TIME, ROUNDS_TO_WIN, SKINS } from './config.js';
import { createFighter, resetFighter, updateFighter } from './fighter.js';
import { hurtbox, applyHit } from './combat.js';
import { cpuInput } from './ai.js';

export function createWorld(sfx = () => {}) {
  return { mode: 'menu', fighters: [], fireballs: [], t: 0, tick: 0, time: ROUND_TIME, round: 0,
           winner: -1, shake: 0, hitstop: 0, twoP: false, sfx };
}
export function startMatch(w, twoP) {
  w.twoP = twoP;
  w.fighters = [createFighter('KAI', SKINS[0], false), createFighter('ROX', SKINS[1], !twoP)];
  w.round = 0; newRound(w);
}
export function newRound(w) {
  w.fighters.forEach((f, i) => resetFighter(f, i ? 660 : 300, i ? -1 : 1));
  Object.assign(w, { fireballs: [], mode: 'intro', t: 0, tick: 0, time: ROUND_TIME, hitstop: 0 });
  w.round++;
}
export function toMenu(w) { Object.assign(w, { mode: 'menu', fighters: [], fireballs: [], shake: 0, hitstop: 0 }); }

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
    const target = fb.owner === a ? b : a, h = hurtbox(target);
    if (target.hp > 0 && fb.x > h.x1 - 14 && fb.x < h.x2 + 14 && fb.y > h.y1 && fb.y < h.y2) {
      applyHit(w, fb, target, 12, 22, 8); return false;
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
  if (w.mode === 'intro') { if (++w.t > 120) { w.mode = 'fight'; w.t = 0; } }
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
  w.fighters.forEach(f => { if (f.flash > 0) f.flash--; if (f.show > f.hp) f.show = Math.max(f.hp, f.show - 0.35); });
}

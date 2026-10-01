import { W, GY, movesOf } from './config.js';
import { strike } from './combat.js';

export function createFighter(ch, isCpu, mirror) {
  const c = mirror ? { ...ch.c, gi: ch.c.band, band: ch.c.gi } : ch.c;   // alt colours if both pick the same fighter
  return { name: ch.name, c, mv: movesOf(ch), spd: ch.spd, jump: ch.jump, maxHp: ch.hp,
           ai: isCpu ? { t: 0, m: 'wait' } : null, wins: 0, ...blank(0, 1, ch.hp) };
}
function blank(x, face, hp) {
  return { x, y: GY, vx: 0, vy: 0, face, hp, show: hp, atk: null, t: 0, hit: 0, stun: 0, cd: 0,
           crouch: 0, block: 0, prev: {}, walk: 0, flash: 0 };
}
export const resetFighter = (f, x, face) => Object.assign(f, blank(x, face, f.maxHp));

// Each character's special is one of three types: 'proj' (projectile), 'dash' (charge forward), 'rise' (uppercut).
function special(w, f, o, A) {
  if (A.type === 'proj') {
    if (f.t === A.s) { w.fireballs.push({ x: f.x + f.face * 55, y: GY - 85, v: f.face * A.speed, dmg: A.dmg, size: A.size || 1, owner: f, face: f.face }); w.sfx(300, 0.3, 'sawtooth'); }
    return;
  }
  if (f.t === A.s) { if (A.type === 'rise') f.vy = A.vy; w.sfx(260, 0.25, 'sawtooth'); }
  if (f.t >= A.s && f.t < A.s + A.a) { if (A.type === 'dash') f.vx = f.face * A.speed; if (!f.hit) strike(w, f, o, A); }
}

export function updateFighter(w, f, o, i) {
  const gr = f.y >= GY, ko = f.hp <= 0;
  if (f.cd) f.cd--;
  if (!ko && f.stun <= 0 && !f.atk) f.face = o.x >= f.x ? 1 : -1;

  if (ko || f.stun > 0) { f.stun--; f.vx *= 0.88; f.block = 0; f.crouch = 0; }
  else if (f.atk) {
    f.t++; const A = f.mv[f.atk];
    if (f.atk === 's') special(w, f, o, A);
    else if (f.t >= A.s && f.t < A.s + A.a && !f.hit) strike(w, f, o, A);
    if (f.t >= A.s + A.a + A.r) f.atk = null;
    const dashing = f.atk === 's' && A.type === 'dash' && f.t >= A.s && f.t < A.s + A.a;
    if (gr && !dashing) f.vx = 0;
  } else {
    f.crouch = gr && i.d ? 1 : 0;
    const dir = (i.r ? 1 : 0) - (i.l ? 1 : 0), back = dir !== 0 && dir === -f.face;
    f.block = gr && back ? 1 : 0;
    if (gr) { f.vx = f.crouch ? 0 : dir * (back ? 3 : 4.5) * f.spd; if (i.u && !f.crouch) { f.vy = -f.jump; f.vx = dir * 4.5 * f.spd; } }
    const pressed = k => i[k] && !f.prev[k];
    if (pressed('s') && gr && !f.cd) { f.atk = 's'; f.t = 0; f.cd = f.mv.s.cd || 70; f.vx = 0; f.hit = 0; }
    else if (pressed('p')) { f.atk = 'p'; f.t = 0; f.hit = 0; w.sfx(420, 0.06); }
    else if (pressed('k')) { f.atk = 'k'; f.t = 0; f.hit = 0; w.sfx(320, 0.08); }
  }

  f.prev = i; f.walk += Math.abs(f.vx) * 0.09; f.x += f.vx;
  if (f.y < GY || f.vy < 0) {
    f.vy += 1; f.y += f.vy;
    if (f.y >= GY) { f.y = GY; f.vy = 0; if (!f.atk) f.vx = 0; }
  }
  f.x = Math.max(40, Math.min(W - 40, f.x));
  // Safety net: a bad number must never spread and freeze the game.
  if (![f.x, f.y, f.vx, f.vy, f.hp].every(Number.isFinite)) Object.assign(f, blank(W / 2, f.face, f.maxHp));
}

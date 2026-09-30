import { W, GY, ATK } from './config.js';
import { strike } from './combat.js';

export function createFighter(name, skin, isCpu) {
  return { name, c: skin, ai: isCpu ? { t: 0, m: 'wait' } : null, wins: 0, ...blank(0, 1) };
}
function blank(x, face) {
  return { x, y: GY, vx: 0, vy: 0, face, hp: 100, show: 100, atk: null, t: 0, hit: 0, stun: 0, cd: 0,
           crouch: 0, block: 0, prev: {}, walk: 0, flash: 0 };
}
export const resetFighter = (f, x, face) => Object.assign(f, blank(x, face));

export function updateFighter(w, f, o, i) {
  const gr = f.y >= GY, ko = f.hp <= 0;
  if (f.cd) f.cd--;
  if (!ko && f.stun <= 0 && !f.atk) f.face = o.x >= f.x ? 1 : -1;

  if (ko || f.stun > 0) { f.stun--; f.vx *= 0.88; f.block = 0; f.crouch = 0; }
  else if (f.atk) {
    f.t++; const A = ATK[f.atk];
    if (f.atk === 's') {
      if (f.t === A.s) { w.fireballs.push({ x: f.x + f.face * 55, y: GY - 85, v: f.face * 10, owner: f, face: f.face }); w.sfx(300, 0.3, 'sawtooth'); }
    } else if (f.t >= A.s && f.t < A.s + A.a && !f.hit) strike(w, f, o, A);
    if (f.t >= A.s + A.a + A.r) f.atk = null;
    if (gr) f.vx = 0;
  } else {
    f.crouch = gr && i.d ? 1 : 0;
    const dir = (i.r ? 1 : 0) - (i.l ? 1 : 0), back = dir !== 0 && dir === -f.face;
    f.block = gr && back ? 1 : 0;
    if (gr) { f.vx = f.crouch ? 0 : dir * (back ? 3 : 4.5); if (i.u && !f.crouch) { f.vy = -19; f.vx = dir * 4.5; } }
    const pressed = k => i[k] && !f.prev[k];
    if (pressed('s') && gr && !f.cd) { f.atk = 's'; f.t = 0; f.cd = 70; f.vx = 0; f.hit = 0; }
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
  if (![f.x, f.y, f.vx, f.vy, f.hp].every(Number.isFinite)) Object.assign(f, blank(W / 2, f.face));
}

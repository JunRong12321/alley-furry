import { GY } from './config.js';

export const hurtbox = o => ({ x1: o.x - 28, x2: o.x + 28, y1: o.y - (o.crouch ? 85 : 135), y2: o.y });

// `from` only needs a `.face`, so fireballs can be attackers too.
export function applyHit(w, from, to, dmg, stun, kb) {
  const blocked = to.block && !to.atk && to.stun <= 0 && to.y >= GY;
  if (blocked) { dmg = Math.ceil(dmg / 6); stun = 9; kb *= 0.8; to.flash = 0; w.sfx(140, 0.08, 'triangle', 0.08); }
  else { w.hitstop = 5; w.shake = 7; to.flash = 6; w.sfx(200, 0.15, 'sawtooth', 0.09); }
  to.hp = Math.max(0, to.hp - dmg);
  to.stun = stun; to.vx = from.face * kb; to.atk = null; to.hit = 0;
  if (to.hp <= 0) { to.stun = 999; to.vx = from.face * 6; to.vy = -10; w.hitstop = 12; w.shake = 14; w.sfx(90, 0.5, 'sawtooth', 0.12); }
}

export function strike(w, f, o, A) {
  const x1 = f.x + f.face * 15, x2 = f.x + f.face * (15 + A.reach);
  const hx = Math.min(x1, x2), hw = Math.abs(x2 - x1), y1 = f.y + A.y, y2 = y1 + A.h, b = hurtbox(o);
  if (o.hp > 0 && hx < b.x2 && hx + hw > b.x1 && y1 < b.y2 && y2 > b.y1) {
    f.hit = 1; applyHit(w, f, o, A.dmg, A.st, A.kb);
  }
}

import { W, GY, movesOf, BUFFER, METER_MAX } from './config.js';
import { strike } from './combat.js';

export function createFighter(ch, isCpu, mirror) {
  const c = mirror ? { ...ch.c, gi: ch.c.band, band: ch.c.gi } : ch.c;   // alt colours if both pick the same fighter
  return { name: ch.name, c, mv: movesOf(ch), spd: ch.spd, jump: ch.jump, maxHp: ch.hp,
           ai: isCpu ? { t: 0, m: 'wait' } : null, wins: 0, ...blank(0, 1, ch.hp) };
}
function blank(x, face, hp) {
  return { x, y: GY, vx: 0, vy: 0, face, hp, show: hp, atk: null, t: 0, hit: 0, stun: 0, cd: 0,
           crouch: 0, block: 0, prev: {}, walk: 0, flash: 0,
           buf: {}, kd: 0, cmb: 0, cmbDmg: 0, cmbT: 0, meter: 0, sup: 0 };
}
export const resetFighter = (f, x, face) => Object.assign(f, blank(x, face, f.maxHp));

// Each character's special is one of three types: 'proj' (projectile), 'dash' (charge forward), 'rise' (uppercut).
function special(w, f, o, A) {
  const S = f.sup ? { ...A, dmg: A.dmg * 2, kd: 1, chip: .35 } : { ...A, chip: .25 };      // sup = super art (full meter)
  if (A.type === 'proj') {
    if (f.t === A.s) {
      w.fireballs.push({ x: f.x + f.face * 55, y: GY - 85, v: f.face * A.speed, dmg: S.dmg, size: (A.size || 1) * (f.sup ? 1.5 : 1),
        st: A.st || 22, kb: A.kb || 8, kd: S.kd, chip: S.chip, owner: f, face: f.face });
      w.sfx(300, 0.3, 'sawtooth');
    }
    return;
  }
  if (f.t === A.s) { if (A.type === 'rise') f.vy = A.vy; w.sfx(260, 0.25, 'sawtooth'); }
  if (f.t >= A.s && f.t < A.s + A.a) { if (A.type === 'dash') f.vx = f.face * A.speed; if (!f.hit) strike(w, f, o, S); }
}

function startMove(w, f, key, sup) {
  Object.assign(f, { atk: key, t: 0, hit: 0, sup: sup ? 1 : 0, buf: {} });
  if (key === 's') f.vx = 0;
  w.sfx(key === 's' ? 220 : /p/.test(key) ? 420 : 320, 0.07);
}
// Starts a move from the (buffered) button presses. cancel=true: only specials allowed (special-cancel after a normal connects).
function tryAttack(w, f, gr, cancel) {
  const b = f.buf;
  if (gr && b.x && f.meter >= METER_MAX) { f.meter = 0; f.cd = 0; w.banner = { text: 'SUPER ART!', t: 60 }; w.shake = 6; startMove(w, f, 's', 1); return true; }
  if (gr && b.s && !f.cd) { f.cd = f.mv.s.cd || 70; startMove(w, f, 's', 0); return true; }
  if (cancel || !(b.k || b.p)) return false;
  const btn = (b.k || 0) >= (b.p || 0) ? 'k' : 'p';                       // most recent press wins
  startMove(w, f, !gr ? (btn === 'p' ? 'jp' : 'j') : f.crouch ? (btn === 'p' ? 'cp' : 'c') : btn, 0);
  return true;
}

export function updateFighter(w, f, o, i) {
  const gr = f.y >= GY, ko = f.hp <= 0;
  if (f.cd) f.cd--;
  // Input buffer: a press is remembered for BUFFER frames, so pressing slightly early still works.
  // i.e = presses captured at event time (never lost between frames); falls back to held-state edges (AI, tests).
  for (const a in f.buf) if (--f.buf[a] <= 0) delete f.buf[a];
  for (const a of ['p', 'k', 's', 'x', 'u']) if (i.e ? i.e[a] : i[a] && !f.prev[a]) f.buf[a] = BUFFER;
  if (!ko && f.stun <= 0 && !f.atk) f.face = o.x >= f.x ? 1 : -1;
  if (f.kd > 0) f.kd--;
  if (f.cmbT > 0 && f.stun <= 0 && !ko && --f.cmbT === 0) f.cmb = f.cmbDmg = 0;

  if (ko || f.stun > 0) { f.stun--; f.vx *= 0.88; f.block = 0; f.crouch = 0; }
  else if (f.atk) {
    f.t++; const A = f.mv[f.atk];
    if (f.atk === 's') special(w, f, o, A);
    else if (f.t >= A.s && f.t < A.s + A.a && !f.hit) strike(w, f, o, A);
    if (f.hit && f.atk !== 's' && f.atk !== 'c' && gr) tryAttack(w, f, gr, true);       // special-cancel (also on block)
    if (f.atk && f.t >= A.s + A.a + A.r) f.atk = null;
    const dashing = f.atk === 's' && A.type === 'dash' && f.t >= A.s && f.t < A.s + A.a;
    if (gr && !dashing) f.vx = 0;
  } else {
    f.crouch = gr && i.d ? 1 : 0;
    const dir = (i.r ? 1 : 0) - (i.l ? 1 : 0), back = dir !== 0 && dir === -f.face;
    f.block = gr && back ? 1 : 0;
    if (gr) {
      f.vx = f.crouch ? 0 : dir * (back ? 3 : 4.5) * f.spd;
      if ((i.u || f.buf.u) && !f.crouch) { f.vy = -f.jump; f.vx = dir * 4.5 * f.spd; delete f.buf.u; }
    }
    tryAttack(w, f, gr, false);
  }

  f.prev = i; f.walk += Math.abs(f.vx) * 0.09; f.x += f.vx;
  if (f.y < GY || f.vy < 0) {
    f.vy += 1; f.y += f.vy;
    if (f.y >= GY) {
      f.y = GY; f.vy = 0;
      if (f.atk === 'j' || f.atk === 'jp') f.t = Math.max(f.t, f.mv[f.atk].s + f.mv[f.atk].a);   // landing: skip to recovery
      if (!f.atk) f.vx = 0;
    }
  }
  f.x = Math.max(40, Math.min(W - 40, f.x));
  // Safety net: a bad number must never spread and freeze the game.
  if (![f.x, f.y, f.vx, f.vy, f.hp].every(Number.isFinite)) Object.assign(f, blank(W / 2, f.face, f.maxHp));
}

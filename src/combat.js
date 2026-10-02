import { GY, METER_MAX, COMBOS } from './config.js';

export const hurtbox = o => ({ x1: o.x - 28, x2: o.x + 28, y1: o.y - (o.crouch ? 85 : 135), y2: o.y });
export const canHit = o => o.hp > 0 && !(o.kd > 0);          // a knocked-down fighter can't be hit again
const gain = (f, v) => { f.meter = Math.min(METER_MAX, (f.meter || 0) + v); };

// Every kind of damage is decided here.
// h = { dmg, st (hit-stun), kb, g (guard height), kd (knockdown), chip, x, y }. `from` needs .face (fireballs also have .owner).
//  - blocked: chip damage only (cannot KO), and only if the guard height matches (overheads beat crouch-block, sweeps beat stand-block)
//  - counter hit: hitting someone who is mid-attack = +25% damage and extra hit-stun
//  - combo: hits while the victim is still in hit-stun; each extra hit does 10% less damage (minimum 40%)
//  - knockdown: victim is launched, lies down and is invulnerable while getting up
export function applyHit(w, from, to, h) {
  const at = from.owner || from;
  const guardOk = h.g === 'high' ? !to.crouch : h.g === 'low' ? !!to.crouch : true;
  const blocked = to.block && !to.atk && to.stun <= 0 && to.y >= GY && guardOk;
  const fx = { x: h.x ?? to.x, y: h.y ?? to.y - 90, t: 0, k: 'hit' };
  if (blocked) {
    to.hp = Math.max(1, to.hp - Math.max(1, Math.ceil(h.dmg * (h.chip || .12))));
    to.stun = 10; to.vx = from.face * h.kb * .8; to.flash = 0; fx.k = 'block';
    gain(at, 4); w.sfx('block');
  } else {
    const cont = to.stun > 0 && to.cmb > 0, n = cont ? to.cmb : 0, counter = !!to.atk;
    const seq = (cont ? [...(to.seq || []), h.key] : [h.key]).slice(-6);          // moves that hit during this combo
    const found = COMBOS.filter(c => c.seq.length <= seq.length && c.seq.every((k, i) => k === seq[seq.length - c.seq.length + i]))
                        .sort((a, b) => b.seq.length - a.seq.length)[0];
    const combo = found && found.seq.length > (cont ? to.cbLen || 0 : 0) ? found : null;   // each skill pays once per combo
    to.cbLen = combo ? combo.seq.length : (cont ? to.cbLen || 0 : 0); to.seq = seq;
    const dmg = Math.max(1, Math.round(h.dmg * Math.max(.5, 1 - .08 * n) * (counter ? 1.25 : 1) + (combo ? combo.bonus : 0)));
    const trainingDummy = w.mode === 'dojo' && w.fighters?.[1] === to;
    to.hp = trainingDummy ? Math.max(1, to.hp - dmg) : Math.max(0, to.hp - dmg);
    to.cmb = n + 1; to.cmbDmg = (cont ? to.cmbDmg : 0) + dmg; to.cmbT = 70;
    to.stun = h.st + (counter ? 4 : 0); to.vx = from.face * h.kb; to.atk = null; to.hit = 0; to.flash = 6;
    gain(at, dmg * 1.5 + (combo ? 10 : 0)); gain(to, dmg * .8);
    w.hitstop = counter ? 8 : 5; if (!w.reducedMotion) w.shake = 7; fx.k = counter ? 'counter' : 'hit';
    if (counter) w.banner = { text: 'COUNTER!', t: 45 };
    if (h.kd || (combo && combo.kd)) { to.kd = to.stun = 44; to.vy = -9; to.vx = from.face * (h.kb + 2); w.hitstop = 8; w.banner = { text: 'KNOCKDOWN!', t: 45 }; }
    if (combo) { w.banner = { text: combo.name + '  +' + combo.bonus, t: 70 }; w.sfx('combo'); }
    w.sfx('hit');
    if (to.hp <= 0) { to.stun = 999; to.kd = 0; to.vx = from.face * 6; to.vy = -10; w.hitstop = 12; if (!w.reducedMotion) w.shake = 14; w.sfx('ko'); }
  }
  w.fx.push(fx);
}

export function strike(w, f, o, A) {
  const x1 = f.x + f.face * 15, x2 = f.x + f.face * (15 + A.reach);
  const hx = Math.min(x1, x2), hw = Math.abs(x2 - x1), y1 = f.y + A.y, y2 = y1 + A.h, b = hurtbox(o);
  if (canHit(o) && hx < b.x2 && hx + hw > b.x1 && y1 < b.y2 && y2 > b.y1) {
    f.hit = 1;
    applyHit(w, f, o, { key: f.atk, dmg: A.dmg, st: A.st, kb: A.kb, g: A.g, kd: A.kd, chip: A.chip,
      x: (Math.max(hx, b.x1) + Math.min(hx + hw, b.x2)) / 2, y: (Math.max(y1, b.y1) + Math.min(y2, b.y2)) / 2 });
  }
}

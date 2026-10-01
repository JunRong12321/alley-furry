// All canvas drawing. Reads the world; never changes game state.
import { W, H, GY, ROUND_TIME, CHARS, PORT, BTN, movesOf } from './config.js';

const FONT = '"Press Start 2P",monospace';
let bg;
function makeBackground() {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  let s = 7; const rnd = () => (s = s * 16807 % 2147483647) / 2147483647;
  const sky = c.createLinearGradient(0, 0, 0, GY);
  sky.addColorStop(0, '#1b0f3a'); sky.addColorStop(.55, '#8a2b5c'); sky.addColorStop(1, '#ff9a4d');
  c.fillStyle = sky; c.fillRect(0, 0, W, H);
  c.fillStyle = '#ffd58a'; c.beginPath(); c.arc(690, 340, 95, 0, 7); c.fill();
  [{ col: '#4a1d5c', min: 120, max: 260, win: 0 }, { col: '#241040', min: 60, max: 200, win: 1 }].forEach(L => {
    for (let x = -10; x < W;) {
      const w = 50 + rnd() * 70, h = L.min + rnd() * (L.max - L.min);
      c.fillStyle = L.col; c.fillRect(x, GY - h, w, h);
      if (L.win) for (let y = GY - h + 12; y < GY - 14; y += 20) for (let wx = x + 8; wx < x + w - 10; wx += 16)
        if (rnd() < .35) { c.fillStyle = '#ffd58a'; c.fillRect(wx, y, 6, 9); }
      x += w + 4;
    }
  });
  c.fillStyle = '#1d0e2a'; c.fillRect(0, GY, W, H - GY);
  c.strokeStyle = 'rgba(255,255,255,.07)';
  for (let i = -12; i <= 12; i++) { c.beginPath(); c.moveTo(W / 2 + i * 20, GY); c.lineTo(W / 2 + i * 140, H); c.stroke(); }
  c.fillStyle = '#5a2f6b'; c.fillRect(0, GY, W, 4);
  c.save(); c.shadowColor = '#ff3d6e'; c.shadowBlur = 18; c.fillStyle = '#ff3d6e';
  c.font = 'bold 28px monospace'; c.fillText('RAMEN', 70, 330); c.restore();
  return cv;
}

export function text(g, s, x, y, size = 20, col = '#fff', align = 'center') {
  g.font = `${size}px ${FONT}`; g.textAlign = align;
  g.fillStyle = '#000'; g.fillText(s, x + 3, y + 3);
  g.fillStyle = col; g.fillText(s, x, y);
}

function drawFighter(g, f) {
  const ko = f.hp <= 0, ch = f.crouch ? .68 : (f.y < GY ? .85 : 1), A = f.atk && f.mv[f.atk], c = f.c;
  const w = Math.sin(f.walk) * 8, ext = A && f.t >= A.s - 2 && f.t < A.s + A.a + 3;
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath();
  g.ellipse(f.x, GY + 4, Math.max(12, 38 - (GY - f.y) / 10), 8, 0, 0, 7); g.fill();
  g.save(); g.translate(f.x, f.y); g.scale(f.face, 1);
  if (ko || f.kd > 0) { g.translate(0, f.y >= GY ? -24 : 0); g.rotate(f.y >= GY ? -1.5 : -.8); } else if (f.stun > 0) g.rotate(-.15);
  const lh = 52 * ch, top = -100 * ch;
  g.fillStyle = c.gi; g.fillRect(-32, top + 8, 12, 38 * ch);                 // back arm
  g.fillStyle = c.pants; g.fillRect(-22 - w, -lh, 18, lh);                   // back leg
  g.fillStyle = c.gi; g.fillRect(-26, top, 52, -top - lh + 6);               // torso
  g.fillStyle = c.band; g.fillRect(-26, -lh - 8, 52, 8);                     // belt
  g.fillStyle = c.pants;
  if (['k', 'c', 'j'].includes(f.atk) && ext) {
    if (f.atk === 'j') { g.save(); g.translate(10, -lh + 4); g.rotate(.55); g.fillRect(0, -8, A.reach - 6, 16); g.fillStyle = c.skin; g.fillRect(A.reach - 18, -10, 16, 20); g.restore(); }   // fly kick: leg angled down
    else { const ly = f.atk === 'c' ? -24 : -lh - 6; g.fillRect(4, ly, A.reach - 14, 16); g.fillStyle = c.skin; g.fillRect(A.reach - 26, ly - 4, 18, 24); }
  }
  else g.fillRect(4 + w, -lh, 18, lh);
  g.fillStyle = c.skin; g.fillRect(-14, top - 30, 28, 28);                   // head
  g.fillStyle = c.hair; g.fillRect(-15, top - 34, 30, 10);
  g.fillStyle = c.band; g.fillRect(-15, top - 22, 30, 6); g.fillRect(-26, top - 20, 12, 4);
  g.fillStyle = '#111'; g.fillRect(5, top - 14, 6, 4);
  if (['p', 'cp', 'jp'].includes(f.atk) && ext) { g.fillStyle = c.gi; g.fillRect(10, top + 10, A.reach - 16, 14); g.fillStyle = c.skin; g.fillRect(A.reach - 22, top + 6, 20, 22); }
  else if (f.atk === 's' && f.mv.s.type === 'rise') { g.fillStyle = c.gi; g.fillRect(10, top - 50, 14, 70); g.fillStyle = c.skin; g.fillRect(10, top - 64, 14, 16); }
  else if (f.atk === 's') {
    g.fillStyle = c.gi; g.fillRect(10, top + 14, 44, 14); g.fillStyle = c.skin; g.fillRect(46, top + 11, 16, 20);
    if (f.t >= f.mv.s.s - 3) { g.fillStyle = 'rgba(255,180,60,.6)'; g.beginPath(); g.arc(66, top + 21, 16, 0, 7); g.fill(); }
  } else if (f.block) { g.fillStyle = c.gi; g.fillRect(12, top - 8, 14, 46); g.fillStyle = c.skin; g.fillRect(12, top - 14, 14, 12); }
  else { g.fillStyle = c.gi; g.fillRect(12, top + 10, 14, 36 * ch); g.fillStyle = c.skin; g.fillRect(12, top + 10 + 36 * ch, 14, 12); }
  if (f.sup && f.atk === 's') { g.fillStyle = 'rgba(255,220,80,.35)'; g.fillRect(-40, top - 40, 80, -top + 40); }   // super aura
  if (f.flash > 0) { g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(-34, top - 36, 68, -top + 36); }
  g.restore();
}

function drawFireball(g, b) {
  const z = b.size || 1;
  for (let k = 3; k >= 0; k--) {
    g.fillStyle = `rgba(255,150,40,${.15 + .1 * (3 - k)})`; g.beginPath(); g.arc(b.x - b.face * k * 14, b.y, (22 - k * 3) * z, 0, 7); g.fill();
  }
  const r = g.createRadialGradient(b.x, b.y, 2, b.x, b.y, 22 * z);
  r.addColorStop(0, '#fff'); r.addColorStop(.5, '#ffd23f'); r.addColorStop(1, 'rgba(255,90,40,0)');
  g.fillStyle = r; g.beginPath(); g.arc(b.x, b.y, 24 * z, 0, 7); g.fill();
}

function drawFx(g, w) {                                  // hit sparks: yellow = counter, blue = blocked
  w.fx.forEach(e => {
    const a = 1 - e.t / 14, r = 10 + e.t * 3.5, col = e.k === 'block' ? '125,214,255' : e.k === 'counter' ? '255,210,63' : '255,243,176';
    g.strokeStyle = `rgba(${col},${a})`; g.lineWidth = 3; g.beginPath();
    for (let k = 0; k < 8; k++) { const an = k * Math.PI / 4; g.moveTo(e.x + Math.cos(an) * r * .5, e.y + Math.sin(an) * r * .5); g.lineTo(e.x + Math.cos(an) * r, e.y + Math.sin(an) * r); }
    g.stroke();
  });
}
function drawCombo(g, w) {
  w.fighters.forEach((f, n) => {
    if (f.cmb >= 2 && f.cmbT > 0) {                      // shown on the side of the attacker
      const x = n ? 150 : W - 150;
      text(g, f.cmb + ' HITS!', x, 190, 22, '#ffd23f'); text(g, f.cmbDmg + ' DAMAGE', x, 216, 10, '#fff');
    }
  });
  if (w.banner) text(g, w.banner.text, W / 2, 170, 22, '#ff9a4d');
}
function drawHud(g, w) {
  w.fighters.forEach((f, n) => {
    const bw = 380, x = n ? W - 40 - bw : 40;
    g.fillStyle = '#000'; g.fillRect(x - 4, 24, bw + 8, 30);
    const bar = (v, col) => { const ww = bw * v / f.maxHp; g.fillStyle = col; g.fillRect(n ? x : x + bw - ww, 28, ww, 22); };
    bar(f.show, '#ffd23f'); bar(f.hp, f.hp > .3 * f.maxHp ? '#3ddc84' : '#ff4d4d');
    const mw = 190, fw = mw * f.meter / 100, full = f.meter >= 100;                       // super meter
    g.fillStyle = '#000'; g.fillRect(n ? x : x + bw - mw, 58, mw, 10);
    g.fillStyle = full ? '#ffd23f' : '#4cc9f0'; g.fillRect(n ? x : x + bw - fw, 58, fw, 10);
    if (full) text(g, 'SUPER!', n ? x + mw + 10 : x + bw - mw - 10, 68, 8, '#ffd23f', n ? 'left' : 'right');
    text(g, f.name, n ? x + bw : x, 82, 14, '#fff', n ? 'right' : 'left');
    for (let i = 0; i < 2; i++) {
      g.fillStyle = i < f.wins ? '#ffd23f' : '#000'; g.strokeStyle = '#fff'; g.lineWidth = 2;
      g.beginPath(); g.arc(n ? x + 8 + i * 22 : x + bw - 8 - i * 22, 98, 7, 0, 7); g.fill(); g.stroke();
    }
  });
  text(g, String(Math.max(0, Math.min(ROUND_TIME, w.time))).padStart(2, '0'), W / 2, 60, 28, '#ffd58a');
}

function drawMenu(g) {
  g.fillStyle = 'rgba(10,4,20,.55)'; g.fillRect(0, 0, W, H);
  text(g, 'ALLEY FURY', W / 2, 160, 52, '#ffd23f');
  [[232, '1 PLAYER VS CPU', 262], [292, '2 PLAYERS', 322]].forEach(([y, s, b]) => {
    g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(W / 2 - 230, y, 460, 46);
    g.strokeStyle = '#ffd23f'; g.lineWidth = 2; g.strokeRect(W / 2 - 230, y, 460, 46);
    text(g, s, W / 2, b, 18);
  });
  text(g, 'Click / tap an option, or press 1 or 2', W / 2, 364, 10, '#ffd58a');
  text(g, 'P1  WASD  F punch  G kick  H special  J super', W / 2, 395, 10, '#ddd');
  text(g, "P2  ARROWS  K punch  L kick  ; special  ' super", W / 2, 417, 10, '#ddd');
  text(g, 'Hold back = block (stand: overheads, crouch: sweeps)', W / 2, 445, 9, '#c9b8e0');
  text(g, 'Down+Kick = sweep   Jump+Kick = fly kick   Esc = menu', W / 2, 465, 9, '#c9b8e0');
}

// ---------- character select ----------
const SLOT_COL = ['#e63946', '#4dabf7'];
function wrap(s, n) {
  const out = []; let line = '';
  for (const word of s.split(' ')) { if ((line + ' ' + word).trim().length > n) { out.push(line); line = word; } else line = (line + ' ' + word).trim(); }
  return out.concat(line);
}
function drawIcon(g, c, x, y) {
  g.fillStyle = c.gi; g.fillRect(x + 16, y + 46, 52, 30);
  g.fillStyle = c.skin; g.fillRect(x + 28, y + 16, 28, 28);
  g.fillStyle = c.hair; g.fillRect(x + 27, y + 12, 30, 10);
  g.fillStyle = c.band; g.fillRect(x + 27, y + 24, 30, 6);
  g.fillStyle = '#111'; g.fillRect(x + 45, y + 30, 6, 4);
}
function drawPreview(g, ch, c, slot, x) {          // big idle fighter that shadow-boxes through its moves
  const t = (Date.now() / 16 | 0) % 150;
  const f = { c, mv: movesOf(ch), x: 0, y: GY, face: slot ? -1 : 1, hp: 1, crouch: 0, stun: 0, atk: null, t: 0, block: 0, walk: 0, flash: 0 };
  if (t < 20) { f.atk = 'p'; f.t = t; } else if (t >= 60 && t < 80) { f.atk = 'k'; f.t = t - 60; } else if (t >= 110 && t < 135) { f.atk = 's'; f.t = t - 110; }
  g.save(); g.translate(x, 338); g.scale(1.4, 1.4); g.translate(0, -GY); drawFighter(g, f); g.restore();
}
function drawPanel(g, ch, x, y, active, col, label) {
  const pw = 450, ph = 176;
  g.fillStyle = 'rgba(10,4,20,.85)'; g.fillRect(x, y, pw, ph);
  g.strokeStyle = active ? col : '#6b4f8a'; g.lineWidth = active ? 4 : 2; g.strokeRect(x, y, pw, ph);
  if (!ch) { text(g, label + ' - PICK A FIGHTER', x + pw / 2, y + ph / 2, 12, '#ddd'); return; }
  const m = movesOf(ch);
  text(g, ch.name, x + 14, y + 30, 16, '#ffd23f', 'left');
  text(g, ch.title, x + 14, y + 50, 9, '#ff9a4d', 'left');
  [['HEALTH', ch.hp / 130], ['SPEED', ch.spd / 1.3], ['POWER', (m.p.dmg + m.k.dmg) / 2 / 12]].forEach(([l, v], i) => {
    const by = y + 66 + i * 22;
    text(g, l, x + 14, by + 10, 8, '#ddd', 'left');
    g.fillStyle = '#000'; g.fillRect(x + 84, by, 110, 12); g.fillStyle = '#3ddc84'; g.fillRect(x + 84, by, 110 * Math.min(1, v), 12);
  });
  [['PUNCH', m.p.dmg], ['KICK', m.k.dmg], [ch.sp.name, m.s.dmg]].forEach(([l, d], i) => {
    text(g, l, x + 226, y + 76 + i * 22, 9, i === 2 ? '#ff9a4d' : '#ddd', 'left');
    text(g, d + ' DMG', x + 436, y + 76 + i * 22, 9, '#ffd23f', 'right');
  });
  wrap(ch.desc, 52).forEach((ln, i) => text(g, ln, x + 14, y + 146 + i * 14, 8, '#c9b8e0', 'left'));
}
function drawSelect(g, w) {
  const s = w.sel;
  g.fillStyle = 'rgba(10,4,20,.6)'; g.fillRect(0, 0, W, H);
  text(g, 'SELECT YOUR FIGHTER', W / 2, 46, 20, '#ffd23f');
  CHARS.forEach((ch, i) => {
    const bx = PORT.x0 + i * (PORT.w + PORT.gap), by = PORT.y;
    g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(bx, by, PORT.w, PORT.h);
    drawIcon(g, ch.c, bx, by);
    [0, 1].forEach(n => { if (s.pick[n] === i) { g.strokeStyle = SLOT_COL[n]; g.lineWidth = 4; g.strokeRect(bx + n * 5 + 2, by + n * 5 + 2, PORT.w - n * 10 - 4, PORT.h - n * 10 - 4); } });
    text(g, ch.name, bx + PORT.w / 2, by + PORT.h + 16, 9);
  });
  [0, 1].forEach(n => {
    const ch = CHARS[s.pick[n]], x = n ? 850 : 110, mirror = n === 1 && s.pick[0] === s.pick[1];
    text(g, n === 0 ? 'P1' : (w.twoP ? 'P2' : 'CPU'), x, 140, 14, SLOT_COL[n]);
    if (ch) drawPreview(g, ch, mirror ? { ...ch.c, gi: ch.c.band, band: ch.c.gi } : ch.c, n, x);
    else text(g, '?', x, 300, 60, SLOT_COL[n]);
    drawPanel(g, ch, n ? 490 : 20, 352, s.slot === n, SLOT_COL[n], n === 0 ? 'P1' : (w.twoP ? 'P2' : 'CPU'));
  });
  if (s.pick.every(p => p !== null)) {
    g.fillStyle = '#e63946'; g.fillRect(BTN.x, BTN.y, BTN.w, BTN.h); g.strokeStyle = '#ffd23f'; g.lineWidth = 3; g.strokeRect(BTN.x, BTN.y, BTN.w, BTN.h);
    text(g, 'FIGHT!', W / 2, BTN.y + 33, 20);
    text(g, 'or press ENTER', W / 2, BTN.y + 72, 8, '#ddd');
  } else text(g, 'PICK BOTH SIDES', W / 2, BTN.y + 30, 10, '#ffd58a');
  text(g, 'Click a fighter for the highlighted side', W / 2, 200, 9, '#ddd');
  text(g, 'Click a side to switch  -  Esc: back', W / 2, 218, 9, '#ddd');
}

export function render(g, w) {
  bg ||= makeBackground();
  g.save();
  if (w.shake > .5) g.translate((Math.random() - .5) * w.shake, (Math.random() - .5) * w.shake);
  g.drawImage(bg, 0, 0);
  if (w.mode === 'menu') drawMenu(g);
  else if (w.mode === 'select') drawSelect(g, w);
  else {
    w.fighters.forEach(f => drawFighter(g, f)); w.fireballs.forEach(b => drawFireball(g, b)); drawFx(g, w); drawHud(g, w); drawCombo(g, w);
    if (w.mode === 'intro') text(g, w.t < 70 ? 'ROUND ' + w.round : 'FIGHT!', W / 2, 250, w.t < 70 ? 40 : 52, w.t < 70 ? '#fff' : '#ff5a3c');
    if (w.mode === 'end') {
      text(g, w.time <= 0 && w.fighters.every(f => f.hp > 0) ? 'TIME UP' : 'K.O.', W / 2, 230, 56, '#ff5a3c');
      if (w.t > 50) text(g, w.winner < 0 ? 'DRAW' : w.fighters[w.winner].name + ' WINS', W / 2, 300, 24);
    }
    if (w.mode === 'match') {
      g.fillStyle = 'rgba(10,4,20,.6)'; g.fillRect(0, 0, W, H);
      const champ = w.fighters.find(f => f.wins >= 2);
      text(g, (champ ? champ.name : '?') + ' WINS THE MATCH', W / 2, 240, 28, '#ffd23f');
      text(g, 'ENTER / TAP - rematch    ESC - menu', W / 2, 300, 14);
    }
  }
  g.restore();
}

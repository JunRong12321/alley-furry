// All canvas drawing. Reads the world; never changes game state.
import { W, H, GY, ATK, ROUND_TIME } from './config.js';

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
  const ko = f.hp <= 0, ch = f.crouch ? .68 : (f.y < GY ? .85 : 1), A = f.atk && ATK[f.atk], c = f.c;
  const w = Math.sin(f.walk) * 8, ext = A && f.t >= A.s - 2 && f.t < A.s + A.a + 3;
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath();
  g.ellipse(f.x, GY + 4, Math.max(12, 38 - (GY - f.y) / 10), 8, 0, 0, 7); g.fill();
  g.save(); g.translate(f.x, f.y); g.scale(f.face, 1);
  if (ko) { g.translate(0, f.y >= GY ? -24 : 0); g.rotate(f.y >= GY ? -1.5 : -.8); } else if (f.stun > 0) g.rotate(-.15);
  const lh = 52 * ch, top = -100 * ch;
  g.fillStyle = c.gi; g.fillRect(-32, top + 8, 12, 38 * ch);                 // back arm
  g.fillStyle = c.pants; g.fillRect(-22 - w, -lh, 18, lh);                   // back leg
  g.fillStyle = c.gi; g.fillRect(-26, top, 52, -top - lh + 6);               // torso
  g.fillStyle = c.band; g.fillRect(-26, -lh - 8, 52, 8);                     // belt
  g.fillStyle = c.pants;
  if (f.atk === 'k' && ext) { g.fillRect(4, -lh - 6, A.reach - 14, 16); g.fillStyle = c.skin; g.fillRect(A.reach - 26, -lh - 10, 18, 24); }
  else g.fillRect(4 + w, -lh, 18, lh);
  g.fillStyle = c.skin; g.fillRect(-14, top - 30, 28, 28);                   // head
  g.fillStyle = c.hair; g.fillRect(-15, top - 34, 30, 10);
  g.fillStyle = c.band; g.fillRect(-15, top - 22, 30, 6); g.fillRect(-26, top - 20, 12, 4);
  g.fillStyle = '#111'; g.fillRect(5, top - 14, 6, 4);
  if (f.atk === 'p' && ext) { g.fillStyle = c.gi; g.fillRect(10, top + 10, A.reach - 16, 14); g.fillStyle = c.skin; g.fillRect(A.reach - 22, top + 6, 20, 22); }
  else if (f.atk === 's') {
    g.fillStyle = c.gi; g.fillRect(10, top + 14, 44, 14); g.fillStyle = c.skin; g.fillRect(46, top + 11, 16, 20);
    if (f.t >= ATK.s.s - 3) { g.fillStyle = 'rgba(255,180,60,.6)'; g.beginPath(); g.arc(66, top + 21, 16, 0, 7); g.fill(); }
  } else if (f.block) { g.fillStyle = c.gi; g.fillRect(12, top - 8, 14, 46); g.fillStyle = c.skin; g.fillRect(12, top - 14, 14, 12); }
  else { g.fillStyle = c.gi; g.fillRect(12, top + 10, 14, 36 * ch); g.fillStyle = c.skin; g.fillRect(12, top + 10 + 36 * ch, 14, 12); }
  if (f.flash > 0) { g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(-34, top - 36, 68, -top + 36); }
  g.restore();
}

function drawFireball(g, b) {
  for (let k = 3; k >= 0; k--) {
    g.fillStyle = `rgba(255,150,40,${.15 + .1 * (3 - k)})`; g.beginPath(); g.arc(b.x - b.face * k * 14, b.y, 22 - k * 3, 0, 7); g.fill();
  }
  const r = g.createRadialGradient(b.x, b.y, 2, b.x, b.y, 22);
  r.addColorStop(0, '#fff'); r.addColorStop(.5, '#ffd23f'); r.addColorStop(1, 'rgba(255,90,40,0)');
  g.fillStyle = r; g.beginPath(); g.arc(b.x, b.y, 24, 0, 7); g.fill();
}

function drawHud(g, w) {
  w.fighters.forEach((f, n) => {
    const bw = 380, x = n ? W - 40 - bw : 40;
    g.fillStyle = '#000'; g.fillRect(x - 4, 24, bw + 8, 30);
    const bar = (v, col) => { const ww = bw * v / 100; g.fillStyle = col; g.fillRect(n ? x : x + bw - ww, 28, ww, 22); };
    bar(f.show, '#ffd23f'); bar(f.hp, f.hp > 30 ? '#3ddc84' : '#ff4d4d');
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
  text(g, 'P1  WASD  F punch  G kick  H fireball', W / 2, 400, 11, '#ddd');
  text(g, 'P2  ARROWS  K punch  L kick  ; fireball', W / 2, 425, 11, '#ddd');
  text(g, 'Hold back to block  -  Esc for menu', W / 2, 455, 11, '#ddd');
}

export function render(g, w) {
  bg ||= makeBackground();
  g.save();
  if (w.shake > .5) g.translate((Math.random() - .5) * w.shake, (Math.random() - .5) * w.shake);
  g.drawImage(bg, 0, 0);
  if (w.mode === 'menu') drawMenu(g);
  else {
    w.fighters.forEach(f => drawFighter(g, f)); w.fireballs.forEach(b => drawFireball(g, b)); drawHud(g, w);
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

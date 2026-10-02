// Canvas renderer. It only reads game state and draws pixels.
import { pauseItems, DOJO_NEXT_DELAY } from './game.js';
import { W, H, GY, ROUND_TIME, CHARS, PORT, randomBoxRect, movesOf, selButtons, PAUSE_ITEMS, pauseRect, COMBOS, THEMES, themeCardRect, MOVE_NAMES, MENU_BUTTONS, DOJO_START, DOJO_FIGHTER_PREV, DOJO_FIGHTER_NEXT, dojoComboRect, DIFFICULTIES, DIFFICULTY_INFO, diffCardRect, SETTINGS_ITEMS, settingsRect, settingSliderRect, exitChoiceRect, INTRO_READY_AT, INTRO_FIGHT_AT } from './config.js';

const FONT = '"Press Start 2P", monospace';
let renderFrame = 0;
export function text(g, value, x, y, size = 12, col = '#fff', align = 'center') {
  g.font = `${size}px ${FONT}`; g.textAlign = align; g.textBaseline = 'alphabetic';
  g.fillStyle = '#000'; g.fillText(value, x + 2, y + 2); g.fillStyle = col; g.fillText(value, x, y);
}
const bgCache = new Map();
function seeded(seed) { let v = seed >>> 0; return () => (v = (v * 1664525 + 1013904223) >>> 0) / 4294967296; }
function skyGradient(c, stops) {
  const sky = c.createLinearGradient(0, 0, 0, GY);
  stops.forEach((col, i) => sky.addColorStop(i / (stops.length - 1), col));
  c.fillStyle = sky; c.fillRect(0, 0, W, H);
}
function ridge(c, col, base, amp, freq, phase) {
  c.fillStyle = col; c.beginPath(); c.moveTo(0, GY);
  for (let x = 0; x <= W; x += 8) c.lineTo(x, base - amp * (Math.sin(x * freq + phase) * .6 + Math.sin(x * freq * 2.7 + phase * 2) * .4));
  c.lineTo(W, GY); c.closePath(); c.fill();
}
function planks(c, top, bottom, line, lip) {
  c.fillStyle = top; c.fillRect(0, GY, W, H - GY);
  c.strokeStyle = line; c.lineWidth = 2;
  for (let y = GY + 14; y < H; y += 16) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  for (let row = 0; row < 5; row++) for (let x = (row % 2) * 60; x < W; x += 120) { c.beginPath(); c.moveTo(x, GY + row * 16); c.lineTo(x, GY + row * 16 + 14); c.stroke(); }
  c.fillStyle = bottom; c.fillRect(0, H - 8, W, 8); c.fillStyle = lip; c.fillRect(0, GY, W, 4);
}
function paintCity(c) {
  skyGradient(c, ['#1b0f3a', '#8a2b5c', '#ff9a4d']);
  c.fillStyle = '#ffd58a'; c.beginPath(); c.arc(700, 330, 92, 0, 7); c.fill();
  for (const [col, min, max, lit] of [['#4a1d5c', 115, 250, false], ['#241040', 55, 190, true]]) {
    for (let x = -10; x < W;) {
      const z = Math.sin(x * .091 + min) * .5 + .5, width = 54 + z * 48, height = min + z * (max - min);
      c.fillStyle = col; c.fillRect(x, GY - height, width, height);
      if (lit) for (let y = GY - height + 16; y < GY - 14; y += 22) for (let wx = x + 8; wx < x + width - 10; wx += 18) {
        if ((Math.floor(wx + y) % 4) === 0) { c.fillStyle = '#ffd58a'; c.fillRect(wx, y, 6, 9); }
      }
      x += width + 4;
    }
  }
  c.fillStyle = '#1d0e2a'; c.fillRect(0, GY, W, H - GY); c.strokeStyle = 'rgba(255,255,255,.08)';
  for (let i = -12; i <= 12; i++) { c.beginPath(); c.moveTo(W / 2 + i * 20, GY); c.lineTo(W / 2 + i * 140, H); c.stroke(); }
  c.fillStyle = '#5a2f6b'; c.fillRect(0, GY, W, 4);
  c.save(); c.shadowColor = '#ff3d6e'; c.shadowBlur = 18; c.fillStyle = '#ff3d6e'; c.font = 'bold 28px monospace'; c.fillText('RAMEN', 70, 330); c.restore();
}
function paintDojo(c) {
  const rnd = seeded(7);
  skyGradient(c, ['#2d1b4e', '#a9487a', '#ffb89a', '#ffe1c4']);
  c.fillStyle = 'rgba(255,244,214,.9)'; c.beginPath(); c.arc(250, 180, 58, 0, 7); c.fill();
  ridge(c, '#8f5a8c', 300, 70, .006, 1); ridge(c, '#5e3366', 350, 55, .009, 3);
  c.fillStyle = '#2a1430';                                                  // pagoda
  for (let k = 0; k < 4; k++) {
    const y = GY - 60 - k * 62, half = 120 - k * 22;
    c.fillRect(700 - half * .62, y - 34, half * 1.24, 40);
    c.beginPath(); c.moveTo(700 - half - 18, y - 30); c.lineTo(700 + half + 18, y - 30); c.lineTo(700 + half * .55, y - 58); c.lineTo(700 - half * .55, y - 58); c.closePath(); c.fill();
    c.fillStyle = '#ffcf7a'; for (let wx = -2; wx <= 2; wx++) c.fillRect(700 + wx * half * .22 - 4, y - 24, 8, 14); c.fillStyle = '#2a1430';
  }
  c.fillRect(696, GY - 330, 8, 60);
  c.fillStyle = '#b8323f'; c.fillRect(70, GY - 170, 14, 170); c.fillRect(250, GY - 170, 14, 170);   // torii gate
  c.fillRect(48, GY - 182, 238, 16); c.fillRect(64, GY - 146, 206, 10);
  c.fillStyle = '#2a1430'; c.fillRect(40, GY - 192, 254, 10);
  for (const tx of [430, 900]) {                                            // cherry trees
    c.fillStyle = '#3b1f2b'; c.fillRect(tx - 8, GY - 150, 16, 150);
    for (let i = 0; i < 60; i++) {
      const a = rnd() * Math.PI * 2, r = rnd() * 80;
      c.fillStyle = ['#ff9ec7', '#ffc2dc', '#f27bb0'][i % 3]; c.beginPath(); c.arc(tx + Math.cos(a) * r, GY - 175 + Math.sin(a) * r * .55, 10 + rnd() * 10, 0, 7); c.fill();
    }
  }
  planks(c, '#7a4a2e', '#4e2c1d', '#5a341f', '#b9784a');
}
function paintVolcano(c) {
  const rnd = seeded(11);
  skyGradient(c, ['#120303', '#4a0d07', '#a3300c', '#ff7b1c']);
  for (let i = 0; i < 14; i++) { c.fillStyle = `rgba(30,10,10,${.3 + rnd() * .3})`; c.beginPath(); c.arc(rnd() * W, 40 + rnd() * 140, 40 + rnd() * 60, 0, 7); c.fill(); }
  c.fillStyle = '#2b0f0b'; c.beginPath(); c.moveTo(300, GY); c.lineTo(560, 190); c.lineTo(660, 190); c.lineTo(940, GY); c.closePath(); c.fill();
  const glow = c.createRadialGradient(610, 190, 4, 610, 190, 110); glow.addColorStop(0, 'rgba(255,200,80,.95)'); glow.addColorStop(1, 'rgba(255,90,20,0)');
  c.fillStyle = glow; c.fillRect(480, 80, 260, 220);
  c.strokeStyle = '#ff6a00'; c.lineWidth = 6; c.lineCap = 'round';
  for (const [x0, x1] of [[590, 520], [620, 680], [640, 760]]) { c.beginPath(); c.moveTo(x0, 196); c.quadraticCurveTo((x0 + x1) / 2 + 20, 300, x1, GY - 20); c.stroke(); }
  ridge(c, '#1a0806', 400, 40, .011, 2);
  c.fillStyle = '#1c0d0a'; c.fillRect(0, GY, W, H - GY);
  c.strokeStyle = '#ff5a1f'; c.lineWidth = 2;
  for (let i = 0; i < 18; i++) { let x = rnd() * W, y = GY + 6 + rnd() * 50; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 4; k++) { x += 10 + rnd() * 18; y += (rnd() - .5) * 10; c.lineTo(x, Math.min(H - 4, Math.max(GY + 4, y))); } c.stroke(); }
  c.fillStyle = '#ff7b1c'; c.fillRect(0, GY, W, 3);
}
function paintHarbor(c) {
  const rnd = seeded(23);
  skyGradient(c, ['#050b1f', '#0f1f42', '#24406f']);
  for (let i = 0; i < 90; i++) { c.fillStyle = `rgba(255,255,255,${.3 + rnd() * .6})`; c.fillRect(rnd() * W, rnd() * 260, 2, 2); }
  c.fillStyle = '#f4f1d0'; c.beginPath(); c.arc(760, 120, 46, 0, 7); c.fill();
  c.fillStyle = '#0b1630';
  for (let x = 0; x < W; x += 36) { const h = 40 + Math.abs(Math.sin(x * .13)) * 70; c.fillRect(x, GY - 70 - h, 32, h); }
  c.fillStyle = '#ffd58a'; for (let i = 0; i < 40; i++) c.fillRect(rnd() * W, GY - 80 - rnd() * 90, 3, 4);
  c.strokeStyle = '#081226'; c.lineWidth = 8;                                // cranes
  for (const x of [130, 330]) { c.beginPath(); c.moveTo(x, GY - 70); c.lineTo(x, GY - 280); c.lineTo(x + 150, GY - 280); c.moveTo(x - 40, GY - 280); c.lineTo(x, GY - 240); c.stroke(); }
  c.fillStyle = '#0d2547'; c.fillRect(0, GY - 70, W, 70);
  c.fillStyle = 'rgba(244,241,208,.5)'; for (let k = 0; k < 9; k++) c.fillRect(760 - 40 + Math.sin(k) * 14, GY - 64 + k * 7, 80 - k * 6, 2);
  c.fillStyle = '#081226'; c.beginPath(); c.moveTo(520, GY - 60); c.lineTo(700, GY - 60); c.lineTo(680, GY - 40); c.lineTo(540, GY - 40); c.closePath(); c.fill(); c.fillRect(590, GY - 90, 40, 30);
  planks(c, '#3d2f2a', '#241b18', '#2a201c', '#6b5446');
  c.fillStyle = '#1a1412'; for (const x of [40, 480, 920]) { c.fillRect(x - 10, GY - 22, 20, 24); c.fillRect(x - 13, GY - 26, 26, 6); }
}
function paintRooftop(c) {
  const rnd = seeded(5);
  skyGradient(c, ['#110d22', '#2e2550', '#55487a']);
  for (let i = 0; i < 16; i++) { c.fillStyle = `rgba(20,16,38,${.35 + rnd() * .3})`; c.beginPath(); c.ellipse(rnd() * W, 30 + rnd() * 130, 80 + rnd() * 70, 26 + rnd() * 18, 0, 0, 7); c.fill(); }
  for (const [col, min, max, lights] of [['#241d3d', 160, 300, '#5d78a8'], ['#151025', 90, 230, '#9fd3ff']]) {
    for (let x = -20; x < W;) {
      const width = 50 + rnd() * 60, height = min + rnd() * (max - min);
      c.fillStyle = col; c.fillRect(x, GY - 40 - height, width, height);
      c.fillStyle = lights; for (let y = GY - 30 - height; y < GY - 50; y += 18) for (let wx = x + 6; wx < x + width - 8; wx += 14) if (rnd() < .22) c.fillRect(wx, y, 6, 8);
      x += width + 6;
    }
  }
  c.fillStyle = '#0e0a1a'; c.fillRect(90, GY - 150, 70, 80); c.beginPath(); c.moveTo(84, GY - 150); c.lineTo(125, GY - 182); c.lineTo(166, GY - 150); c.fill();
  c.fillRect(100, GY - 70, 6, 30); c.fillRect(144, GY - 70, 6, 30);
  c.fillRect(820, GY - 230, 6, 190); c.fillStyle = '#ff3d6e'; c.fillRect(818, GY - 236, 10, 8);
  c.fillStyle = '#2c2838'; c.fillRect(0, GY - 40, W, 40);
  c.strokeStyle = '#4c4560'; c.lineWidth = 3; c.beginPath(); for (let x = 0; x <= W; x += 40) { c.moveTo(x, GY - 40); c.lineTo(x, GY - 8); } c.moveTo(0, GY - 40); c.lineTo(W, GY - 40); c.stroke();
  c.fillStyle = '#3a3549'; c.fillRect(0, GY, W, H - GY);
  c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 2; for (let x = 0; x < W; x += 80) { c.beginPath(); c.moveTo(x, GY); c.lineTo(x - 30, H); c.stroke(); }
  c.fillStyle = '#5b5470'; c.fillRect(0, GY, W, 4);
}
const STAGE_PAINTERS = { city: paintCity, dojo: paintDojo, volcano: paintVolcano, harbor: paintHarbor, rooftop: paintRooftop };
function stageBackground(index) {
  const theme = THEMES[index] || THEMES[0];
  if (!bgCache.has(theme.id)) {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    STAGE_PAINTERS[theme.id](cv.getContext('2d'));
    bgCache.set(theme.id, cv);
  }
  return bgCache.get(theme.id);
}
function drawAmbient(g, index, frame, reducedMotion) {
  if (reducedMotion) return;
  const id = (THEMES[index] || THEMES[0]).id;
  if (id === 'dojo') {                                                      // falling blossom petals
    g.fillStyle = '#ffc2dc';
    for (let i = 0; i < 26; i++) {
      const x = ((i * 137 + frame * (.5 + (i % 3) * .2) + Math.sin(frame * .02 + i) * 30) % (W + 40)) - 20, y = (i * 53 + frame * (.7 + (i % 4) * .15)) % (GY + 20);
      g.save(); g.translate(x, y); g.rotate(frame * .03 + i); g.beginPath(); g.ellipse(0, 0, 4, 2.4, 0, 0, 7); g.fill(); g.restore();
    }
  } else if (id === 'volcano') {                                            // rising embers
    for (let i = 0; i < 30; i++) {
      const x = (i * 97 + Math.sin(frame * .03 + i) * 18 + W) % W, y = GY - ((i * 61 + frame * (.8 + (i % 4) * .35)) % GY);
      g.fillStyle = i % 3 ? '#ff9a3c' : '#ffd23f'; g.fillRect(x, y, 3, 3);
    }
  } else if (id === 'harbor') {                                             // shimmering water
    g.fillStyle = 'rgba(160,200,255,.25)';
    for (let i = 0; i < 16; i++) g.fillRect((i * 83 + frame * .6) % (W + 60) - 60, GY - 62 + (i % 6) * 10, 36, 2);
  } else if (id === 'rooftop') {                                            // rain and the odd lightning flash
    g.strokeStyle = 'rgba(190,200,255,.35)'; g.lineWidth = 1; g.beginPath();
    for (let i = 0; i < 70; i++) { const x = (i * 71 + frame * 3) % (W + 80) - 40, y = (i * 113 + frame * 14) % H; g.moveTo(x, y); g.lineTo(x - 6, y + 16); }
    g.stroke();
    if (frame % 420 < 5) { g.fillStyle = 'rgba(230,230,255,.18)'; g.fillRect(0, 0, W, H); }
  }
}
function drawThemeSelect(g, w) {
  g.fillStyle = 'rgba(10,4,20,.55)'; g.fillRect(0, 0, W, H);
  text(g, '< BACK', 18, 32, 8, '#c9b8e0', 'left');
  text(g, 'CHOOSE YOUR STAGE', W / 2, 54, 20, '#ffd23f');
  const [a, b] = w.picks.map(i => CHARS[i]);
  text(g, `${a.name}  VS  ${b.name}`, W / 2, 86, 10, '#fff');
  text(g, 'EVERY STAGE HAS ITS OWN BATTLE MUSIC', W / 2, 110, 7, '#c9b8e0');
  THEMES.forEach((theme, i) => {
    const r = themeCardRect(i), on = w.theme === i;
    g.fillStyle = on ? 'rgba(255,255,255,.16)' : 'rgba(20,10,34,.82)'; g.fillRect(r.x, r.y, r.w, r.h);
    g.drawImage(stageBackground(i), 0, 0, W, H, r.x + 8, r.y + 8, r.w - 16, (r.w - 16) * H / W);
    g.strokeStyle = on ? theme.col : 'rgba(255,255,255,.25)'; g.lineWidth = on ? 4 : 2; g.strokeRect(r.x, r.y, r.w, r.h);
    text(g, String(i + 1), r.x + 16, r.y + 26, 9, '#fff', 'left');
    text(g, theme.name, r.x + r.w / 2, r.y + 120, 8, on ? theme.col : '#fff');
    text(g, theme.tag, r.x + r.w / 2, r.y + 142, 5, '#c9b8e0');
    text(g, on ? 'NOW PLAYING' : 'BGM PREVIEW', r.x + r.w / 2, r.y + 180, 6, on ? '#ffd23f' : 'rgba(255,255,255,.45)');
    if (on) {
      for (let k = 0; k < 5; k++) {                                         // little equaliser to show the track is live
        const h = 6 + Math.abs(Math.sin(renderFrame * .12 + k * 1.3)) * (w.reducedMotion ? 0 : 14);
        g.fillStyle = theme.col; g.fillRect(r.x + r.w / 2 - 28 + k * 12, r.y + 216 - h, 8, h);
      }
    }
  });
  drawFighter(g, { ...a, x: 120, y: 520, groundY: 520, face: 1, walk: 0, hp: 1 }, .62, true, w.reducedMotion, true, renderFrame);
  drawFighter(g, { ...b, alt: w.picks[0] === w.picks[1], x: 840, y: 520, groundY: 520, face: -1, walk: 0, hp: 1 }, .62, true, w.reducedMotion, true, renderFrame + 60);
  text(g, 'LEFT / RIGHT CHOOSE  ·  1-5 QUICK PICK  ·  R RANDOM', W / 2, 410, 7, '#fff');
  text(g, 'ENTER, PUNCH OR CLICK AGAIN TO FIGHT', W / 2, 436, 8, '#ffd23f');
}
const OUTLINE = '#21162d';
const fighterArtCache = new Map();
const fighterActionArtCache = new Map();
function fighterArt(name) {
  if (typeof Image === 'undefined') return null;
  if (!fighterArtCache.has(name)) {
    const image = new Image();
    image.src = new URL(`../assets/fighters/${String(name).toLowerCase()}.png`, import.meta.url).href;
    fighterArtCache.set(name, image);
  }
  return fighterArtCache.get(name);
}
function fighterActionArt(name) {
  if (typeof Image === 'undefined') return null;
  if (!fighterActionArtCache.has(name)) {
    const image = new Image();
    image.src = new URL(`../assets/fighters/actions/${String(name).toLowerCase()}.png`, import.meta.url).href;
    fighterActionArtCache.set(name, image);
  }
  return fighterActionArtCache.get(name);
}
function drawFighterPortrait(g, f, image, scale = 1, withShadow = false) {
  const floor = f.groundY ?? GY, height = 154, width = height * image.naturalWidth / image.naturalHeight;
  if (withShadow) {
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(f.x, floor + 4, width * scale * .34, 7 * scale, 0, 0, Math.PI * 2); g.fill();
  }
  g.save(); g.translate(f.x, f.y);
  g.scale((f.face || 1) * scale, scale);
  g.drawImage(image, -width / 2, -height, width, height);
  g.restore();
}
// Action sheets are 4x2 grids rebuilt by tools/clean_sprites.py: every cell shares one floor line and body anchor,
// and every fighter stands the same height, so all poses and fighters draw at a consistent size.
const SHEET_FLOOR = 352 / 360, SHEET_STAND = 300 / 360, STAND_H = 142;
const POSE = { idle: 0, punch: 1, kick: 2, guard: 3, crouch: 4, step: 5, air: 6, special: 7 };
const ATTACK_POSE = { p: POSE.punch, jp: POSE.punch, cp: POSE.punch, k: POSE.kick, c: POSE.air, j: POSE.air, s: POSE.special };
function sheetMotion(f, frame, reducedMotion, grounded) {
  const m = { pose: POSE.idle, dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, trail: 0 };
  const calm = reducedMotion ? 0 : 1, down = f.hp <= 0 || f.kd > 0;
  if (down) {
    Object.assign(m, { pose: POSE.crouch, rot: grounded ? -1.32 : -.7, dx: grounded ? -18 : -6, dy: grounded ? -6 : 0 });
    return m;
  }
  if (f.stun > 0) {
    const jolt = calm * (f.stun > 6 ? (frame % 4 < 2 ? -2.5 : 2.5) : 0);
    Object.assign(m, { pose: f.block ? POSE.guard : POSE.idle, dx: -5 + jolt, rot: f.block ? -.03 : -.13 * calm, sx: 1.03, sy: .97 });
    if (f.crouch) m.pose = POSE.crouch;
    return m;
  }
  if (f.atk && f.mv) {
    const move = f.mv[f.atk] || {}, s = Math.max(1, move.s || 1), a = Math.max(1, move.a || 1), r = Math.max(1, move.r || 1);
    const air = f.atk === 'j' || f.atk === 'jp';
    if (f.t < s) {                                                          // wind-up: lean back, load the strike
      const p = f.t / s;
      m.pose = f.atk === 's' ? POSE.guard : f.atk === 'cp' || f.atk === 'c' ? POSE.crouch : air ? POSE.crouch : POSE.idle;
      m.dx = -5 * p * calm; m.rot = -.06 * p * calm; m.sx = 1 - .03 * p * calm; m.sy = 1 + .02 * p * calm;
    } else if (f.t < s + a) {                                               // active: snap forward into the hit pose
      const p = Math.min(1, (f.t - s + 1) / 3);
      m.pose = ATTACK_POSE[f.atk] ?? POSE.punch;
      m.dx = (f.atk === 's' && move.type === 'dash' ? 12 : 7) * p * calm; m.rot = .025 * calm; m.sx = 1 + .04 * p * calm; m.sy = 1 - .02 * p * calm;
      m.trail = calm && (f.atk === 's' || f.sup) ? 1 : 0;
      if (f.atk === 'cp') { m.sy *= .78; m.sx *= 1.06; }
      if (f.atk === 's' && move.type === 'rise') m.dy = -6 * calm;
    } else {                                                                // recovery: hold the pose briefly, then settle
      const p = (f.t - s - a) / r;
      m.pose = p < .45 ? ATTACK_POSE[f.atk] ?? POSE.punch : f.atk === 'cp' || f.atk === 'c' ? POSE.crouch : grounded ? POSE.idle : POSE.crouch;
      m.dx = 6 * (1 - p) * calm;
      if (f.atk === 'cp' && p < .45) { m.sy *= .78; m.sx *= 1.06; }
    }
    return m;
  }
  if (!grounded) {                                                          // jump: stretch on take-off and landing, tuck at the apex
    const apex = Math.abs(f.vy || 0) < 7;
    m.pose = apex ? POSE.crouch : POSE.idle;
    m.sy = apex ? 1 : 1 + .05 * calm; m.sx = apex ? 1 : 1 - .04 * calm;
    m.rot = apex ? .18 * calm * Math.sign(f.vx * (f.face || 1) || 1) : 0;
    return m;
  }
  if (f.block) {
    Object.assign(m, { pose: f.crouch ? POSE.crouch : POSE.guard, dx: -2 * calm, rot: -.03 * calm });
    return m;
  }
  if (f.crouch) { m.pose = POSE.crouch; m.sy = 1 + Math.sin(frame * .08) * .01 * calm; return m; }
  if (Math.abs(f.vx || 0) > .1) {                                           // walk cycle: alternate stance and stride
    const forward = Math.sign(f.vx) === (f.face || 1), step = Math.floor((f.walk || 0) * 1.6) % 2;
    m.pose = step ? POSE.step : POSE.idle;
    m.dy = -Math.abs(Math.sin((f.walk || 0) * 1.6 * Math.PI)) * 4 * calm;
    m.rot = (forward ? .045 : -.04) * calm;
    return m;
  }
  const breath = Math.sin(frame * .07) * calm;                              // idle: breathe and bounce on the balls of the feet
  m.sy = 1 + breath * .014; m.sx = 1 - breath * .008; m.dy = -Math.max(0, breath) * 1.2;
  return m;
}
function showcaseMotion(f, frame, reducedMotion) {
  const m = { pose: POSE.idle, dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, trail: 0 };
  if (reducedMotion) return m;
  const breath = Math.sin(frame * .07);
  m.sy = 1 + breath * .014; m.sx = 1 - breath * .008; m.dy = -Math.max(0, breath) * 1.2;
  if (!f.showcase) return m;
  const t = (frame + (f.showcaseOffset || 0)) % 300;                        // select-screen demo: punch, kick, special
  const beat = (start, len, pose, dx) => { if (t >= start && t < start + len) { m.pose = pose; m.dx = dx; m.sx = 1.03; m.sy = .99; } };
  beat(120, 22, POSE.punch, 6); beat(160, 26, POSE.kick, 6); beat(220, 12, POSE.guard, -3); beat(232, 34, POSE.special, 8);
  if (t >= 232 && t < 266) m.trail = 1;
  return m;
}
function drawSheetFighter(g, f, sheet, scale = 1, withShadow = false, reducedMotion = false, frame = 0) {
  const floor = f.groundY ?? GY, grounded = f.y >= floor - 2, face = f.face || 1;
  const cellW = sheet.naturalWidth / 4, cellH = sheet.naturalHeight / 2, k = STAND_H / (cellH * SHEET_STAND);
  const dw = cellW * k, dh = cellH * k;
  const m = f.mv ? sheetMotion(f, frame, reducedMotion, grounded) : showcaseMotion(f, frame, reducedMotion);
  if (withShadow) {
    const lift = Math.min(1, Math.max(0, (floor - f.y) / 160));
    g.fillStyle = `rgba(0,0,0,${.3 - lift * .14})`; g.beginPath();
    g.ellipse(f.x, floor + 4, 46 * scale * (1 - lift * .35), 8 * scale, 0, 0, Math.PI * 2); g.fill();
  }
  const sx = (m.pose % 4) * cellW, sy = Math.floor(m.pose / 4) * cellH;
  const blit = () => g.drawImage(sheet, sx, sy, cellW, cellH, -dw / 2, -dh * SHEET_FLOOR, dw, dh);
  g.save();
  g.translate(f.x + face * m.dx * scale, f.y + m.dy * scale);
  g.scale(face * scale * m.sx, scale * m.sy);
  g.rotate(m.rot);
  if (m.trail) {                                                            // after-image streak on specials and supers
    g.save(); g.globalAlpha = .22; g.translate(-14, 0); blit(); g.globalAlpha = .12; g.translate(-14, 0); blit(); g.restore();
  }
  g.filter = [f.alt ? 'hue-rotate(150deg) saturate(1.2)' : '', f.flash > 0 && !reducedMotion ? 'brightness(1.8)' : ''].join(' ').trim() || 'none';
  blit();
  g.filter = 'none';
  if (f.sup && f.atk && !reducedMotion) {
    g.globalAlpha = .65; g.strokeStyle = '#ffd23f'; g.lineWidth = 3; g.beginPath(); g.ellipse(0, -STAND_H * .5, 62, STAND_H * .58, 0, -.7, 2.7); g.stroke();
  }
  g.restore();
}
function drawAnimatedFighterPortrait(g, f, image, scale, withShadow, reducedMotion, frame) {
  const floor = f.groundY ?? GY, height = 154, width = height * image.naturalWidth / image.naturalHeight;
  const move = f.atk && f.mv ? f.mv[f.atk] : null;
  const grounded = f.y >= floor - 2;
  const down = f.hp <= 0 || f.kd > 0;
  const walking = Math.abs(f.vx || 0) > .1 || !grounded;
  let bob = 0, tilt = 0, lunge = 0, stretch = 1;
  if (!reducedMotion) {
    bob = walking ? Math.sin(frame * .43) * 2.2 : Math.sin(frame * .085) * 1.2;
    if (walking) tilt += Math.sin(frame * .43) * .025;
    if (move) {
      const startup = Math.max(1, move.s || 1), active = Math.max(1, move.a || 1), recovery = Math.max(1, move.r || 1);
      const phase = f.t < startup ? .3 + .35 * f.t / startup
        : f.t < startup + active ? 1
          : Math.max(0, 1 - (f.t - startup - active) / recovery);
      const rising = f.atk === 's' && move.type === 'rise';
      const dash = f.atk === 's' && move.type === 'dash';
      tilt += rising ? -.07 * phase : dash ? .2 * phase : f.atk === 'c' ? .23 * phase : ['j', 'jp'].includes(f.atk) ? .16 * phase : f.atk === 's' ? .045 * phase : .085 * phase;
      lunge = (dash ? 9 : ['j', 'jp'].includes(f.atk) ? 6 : 3) * phase;
      stretch += .025 * phase;
      if (rising) bob -= 3 * phase;
    }
    if (f.block) tilt -= .035;
    if (f.stun > 0 && !down) tilt -= .16;
    if (down) { tilt = -1.18; bob = 0; }
  }
  if (f.sup && f.atk && !reducedMotion) stretch += Math.sin(frame * .4) * .018;
  if (withShadow) {
    g.fillStyle = `rgba(0,0,0,${grounded ? .28 : .18})`; g.beginPath();
    g.ellipse(f.x, floor + 4, width * scale * .34, 7 * scale, 0, 0, Math.PI * 2); g.fill();
  }
  g.save();
  g.translate(f.x + (f.face || 1) * lunge, f.y + bob);
  g.scale((f.face || 1) * scale * stretch, scale / stretch);
  g.rotate(tilt);
  if (f.atk === 's' && move?.type === 'proj' && !reducedMotion) {
    g.save(); g.globalAlpha = f.sup ? .48 : .25; g.strokeStyle = f.sup ? '#ffd23f' : '#4dd0e1'; g.lineWidth = f.sup ? 4 : 2;
    g.beginPath(); g.ellipse(0, -height * .48, width * .48, height * .37, 0, -1.1, 1.1); g.stroke(); g.restore();
  }
  g.filter = f.flash > 0 && !reducedMotion ? 'brightness(1.7)' : 'none';
  g.drawImage(image, -width / 2, -height, width, height);
  g.filter = 'none';
  if (f.sup && f.atk && !reducedMotion) {
    g.globalAlpha = .65; g.strokeStyle = '#ffd23f'; g.lineWidth = 3; g.beginPath(); g.ellipse(0, -height * .48, width * .48, height * .42, 0, -.7, 2.7); g.stroke();
  }
  g.restore();
}
function limb(g, x1, y1, x2, y2, width, color) {
  const dx=x2-x1,dy=y2-y1,len=Math.max(1,Math.hypot(dx,dy)),nx=-dy/len,ny=dx/len;
  const shape=w=>[[x1+nx*w/2,y1+ny*w/2],[x2+nx*w*.42,y2+ny*w*.42],[x2-nx*w*.42,y2-ny*w*.42],[x1-nx*w/2,y1-ny*w/2]];
  polygon(g,shape(width+4),OUTLINE,null); polygon(g,shape(width),color,null);
  g.strokeStyle='rgba(255,255,255,.22)'; g.lineWidth=Math.max(1,width*.1); g.beginPath();
  g.moveTo(x1+nx*width*.25-ny*2,y1+ny*width*.25+nx*2); g.lineTo(x2+nx*width*.2-ny*2,y2+ny*width*.2+nx*2); g.stroke();
}
function hand(g, x, y, skin) {
  rounded(g, x - 7, y - 8, 17, 15, 7, OUTLINE);
  rounded(g, x - 5, y - 6, 13, 11, 5, skin, null);
  g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(x - 2, y - 4, 5, 2);
  g.strokeStyle = 'rgba(33,22,45,.55)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 1, y); g.lineTo(x + 6, y); g.stroke();
}
function boot(g, x, y) {
  rounded(g, x - 8, y - 9, 25, 15, 6, OUTLINE);
  rounded(g, x - 6, y - 7, 21, 11, 5, '#33273f');
  g.fillStyle = '#8e8297'; g.fillRect(x - 1, y - 5, 7, 2);
  rounded(g, x - 7, y + 3, 25, 4, 2, '#e8e2d0', null);
}
function rounded(g, x, y, w, h, r, fill, stroke = null, lineWidth = 2) {
  g.beginPath(); g.roundRect(x, y, w, h, r); g.fillStyle = fill; g.fill();
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lineWidth; g.stroke(); }
}
function polygon(g, points, fill, stroke = OUTLINE, lineWidth = 2) {
  g.beginPath(); g.moveTo(points[0][0], points[0][1]); points.slice(1).forEach(([x,y]) => g.lineTo(x,y)); g.closePath();
  g.fillStyle = fill; g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = lineWidth; g.stroke(); }
}
function drawFighter(g, f, scale = 1, withShadow = true, reducedMotion = false, useGeneratedArt = false, frame = 0) {
  const portrait = useGeneratedArt ? fighterArt(f.name) : null;
  const actionSheet = useGeneratedArt ? fighterActionArt(f.name) : null;
  if (actionSheet?.complete && actionSheet.naturalWidth && actionSheet.naturalHeight) {
    drawSheetFighter(g, f, actionSheet, scale, withShadow, reducedMotion, frame);
    return;
  }
  if (portrait?.complete && portrait.naturalWidth) {
    if (f.mv) drawAnimatedFighterPortrait(g, f, portrait, scale, withShadow, reducedMotion, frame);
    else drawFighterPortrait(g, f, portrait, scale, withShadow);
    return;
  }
  const c = f.c, floor = f.groundY ?? GY, airborne = f.y < floor - 2, crouch = !!f.crouch || f.atk === 'c';
  const heavy = f.name === 'BRUNO', slim = f.name === 'MIRA';
  const bulk = heavy ? 1.28 : slim ? .94 : f.name === 'ROX' ? .98 : f.name === 'SORA' ? .96 : 1, shift = crouch ? 11 : 0;
  const bodyTop = (crouch ? -91 : -101) + shift, hipY = -47 + shift;
  const walk = reducedMotion ? 0 : Math.sin(f.walk || 0) * (Math.abs(f.vx || 0) > .1 && !f.atk ? 7 : 0);
  const move = f.atk && f.mv ? f.mv[f.atk] : null;
  const active = !!(move && f.t >= move.s && f.t < move.s + move.a);
  const flyKick = f.atk === 'j' && (active || airborne), sweep = f.atk === 'c' && active;
  const rising = f.atk === 's' && f.mv?.s?.type === 'rise' && f.t >= (move?.s || 0);
  const dash = f.atk === 's' && f.mv?.s?.type === 'dash' && active;
  const punch = active && ['p','cp','jp'].includes(f.atk) || dash;
  const kick = active && f.atk === 'k';
  const bob = reducedMotion || f.atk || f.block || f.stun > 0 ? 0 : Math.sin(f.walk || 0) * 2;
  g.save(); g.translate(f.x, f.y + bob); g.scale((f.face || 1) * scale, scale);
  if (f.hp <= 0 || f.kd > 0) { g.rotate(-1.15); g.translate(0, f.y >= floor - 2 ? -13 : 0); }
  else if (f.stun > 0) g.rotate(-.12);

  // Back leg remains visible behind the gi; the foot is drawn as a separate shoe.
  if (sweep) {
    limb(g, -9, hipY, -25, -30 + shift, 15 * bulk, c.pants); limb(g, -25, -30 + shift, -32, -9 + shift, 13 * bulk, c.pants); boot(g, -31, -7 + shift);
  } else if (airborne) {
    limb(g, -9, hipY, -24, -35, 15 * bulk, c.pants); limb(g, -24, -35, -29, -22, 13 * bulk, c.pants); boot(g, -31, -19);
  } else {
    limb(g, -9, hipY, -13 - walk * .4, -25, 15 * bulk, c.pants); limb(g, -13 - walk * .4, -25, -13 - walk, 0, 13 * bulk, c.pants); boot(g, -15 - walk, 0);
  }
  // Rear guard arm, including a visible forearm and hand.
  const rearElbow = f.block ? [-20, bodyTop + 36] : [-24, bodyTop + 34];
  const rearWrist = f.block ? [-3, bodyTop + 25] : [-7, bodyTop + 14];
  limb(g, -16 * bulk, bodyTop + 30, rearElbow[0], rearElbow[1], 15, c.gi);
  limb(g, rearElbow[0], rearElbow[1], rearWrist[0], rearWrist[1], 9, c.skin); hand(g, rearWrist[0], rearWrist[1], c.skin);

  // Gi jacket, folded lapels, belt, and pants waist.
  polygon(g, [[-24*bulk,bodyTop+22],[-17*bulk,bodyTop+13],[17*bulk,bodyTop+13],[24*bulk,bodyTop+22],[19*bulk,bodyTop+58],[14*bulk,bodyTop+73],[-14*bulk,bodyTop+73],[-19*bulk,bodyTop+58]], OUTLINE, null);
  polygon(g, [[-21*bulk,bodyTop+23],[-15*bulk,bodyTop+17],[15*bulk,bodyTop+17],[21*bulk,bodyTop+23],[17*bulk,bodyTop+56],[12*bulk,bodyTop+69],[-12*bulk,bodyTop+69],[-17*bulk,bodyTop+56]], c.gi, null);
  rounded(g, -17 * bulk, bodyTop + 23, 6, 36, 3, 'rgba(255,255,255,.18)', null);
  rounded(g, 12 * bulk, bodyTop + 25, 5, 31, 2, 'rgba(0,0,0,.13)', null);
  polygon(g, [[-5,bodyTop+20],[4,bodyTop+20],[1,bodyTop+47],[-4,bodyTop+39]], c.band, OUTLINE, 1);
  polygon(g, [[5,bodyTop+20],[13,bodyTop+20],[4,bodyTop+43],[1,bodyTop+47]], c.gi, OUTLINE, 1);
  g.strokeStyle = 'rgba(33,22,45,.36)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-13, bodyTop + 48); g.lineTo(-8, bodyTop + 63); g.stroke();
  // A readable signature on each jacket keeps the six silhouettes from feeling like palette swaps.
  if (f.name === 'KAI') {
    polygon(g, [[-16,bodyTop+27],[-10,bodyTop+32],[-14,bodyTop+53],[-18,bodyTop+48]], '#e63946', OUTLINE, 1);
    g.fillStyle = '#c8c1b4'; g.fillRect(8, bodyTop + 51, 8, 2);
  } else if (f.name === 'ROX') {
    polygon(g, [[-18,bodyTop+29],[-11,bodyTop+35],[-17,bodyTop+42],[-22,bodyTop+37]], c.band, OUTLINE, 1);
    polygon(g, [[13,bodyTop+31],[20,bodyTop+35],[14,bodyTop+41],[10,bodyTop+37]], c.band, OUTLINE, 1);
    g.fillStyle = '#eaf4e5'; g.fillRect(-9, bodyTop + 55, 18, 3);
  } else if (f.name === 'MIRA') {
    polygon(g, [[-20,bodyTop+49],[-10,bodyTop+53],[6,bodyTop+47],[14,bodyTop+52],[1,bodyTop+58],[-16,bodyTop+57]], c.band, OUTLINE, 1);
    g.fillStyle = 'rgba(255,255,255,.58)'; g.fillRect(-18, bodyTop + 27, 4, 18);
  } else if (f.name === 'SORA') {
    polygon(g, [[-17,bodyTop+26],[-10,bodyTop+30],[10,bodyTop+48],[6,bodyTop+52],[-14,bodyTop+34]], c.band, OUTLINE, 1);
    rounded(g, 7, bodyTop + 51, 9, 8, 2, '#ff9f1c', OUTLINE, 1);
  } else if (f.name === 'TORA') {
    for (let stripe = 0; stripe < 3; stripe++) {
      polygon(g, [[-18+stripe*3,bodyTop+31+stripe*8],[-12+stripe*3,bodyTop+31+stripe*8],[-18,bodyTop+38+stripe*8],[-23,bodyTop+38+stripe*8]], '#263e43', null);
    }
    rounded(g, -4, bodyTop + 54, 9, 6, 2, '#f3be85', OUTLINE, 1);
  } else if (f.name === 'BRUNO') {
    rounded(g, -5, bodyTop + 47, 13, 12, 5, '#f2c94c', OUTLINE, 1);
    g.fillStyle = '#fff0a0'; g.fillRect(-1, bodyTop + 49, 3, 7);
  }
  if (f.name === 'BRUNO') {
    rounded(g, -27 * bulk, bodyTop + 23, 11, 20, 5, c.band, OUTLINE, 1);
    rounded(g, 16 * bulk, bodyTop + 23, 11, 20, 5, c.band, OUTLINE, 1);
  } else if (f.name === 'ROX') {
    polygon(g, [[-22, bodyTop + 25],[-36, bodyTop + 34],[-23, bodyTop + 39]], c.band, OUTLINE, 1);
  } else if (f.name === 'TORA') {
    for (let stripe = 0; stripe < 3; stripe++) {
      g.strokeStyle = 'rgba(33,22,45,.62)'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(16 + stripe * 2, bodyTop + 30 + stripe * 8); g.lineTo(22, bodyTop + 34 + stripe * 8); g.stroke();
    }
  }
  g.fillStyle = c.band; g.fillRect(-22 * bulk, hipY - 5, 44 * bulk, 10); g.fillStyle = OUTLINE; g.fillRect(-22 * bulk, hipY + 3, 44 * bulk, 3);
  g.fillStyle = '#f5d76e'; g.fillRect(-3, hipY - 3, 7, 6); g.fillStyle = '#8a673d'; g.fillRect(-1, hipY - 1, 3, 2);
  g.fillStyle = c.pants; g.fillRect(-18 * bulk, hipY + 5, 36 * bulk, 8);
  g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(-15 * bulk, hipY + 6, 5, 4);

  // Neck, ears, face and hair give each fighter a readable head instead of a flat block.
  rounded(g, -8, bodyTop + 1, 16, 15, 5, OUTLINE);
  rounded(g, -6, bodyTop + 3, 12, 11, 4, c.skin, null);
  const headY = bodyTop - 27, headW = heavy ? 28 : slim ? 24 : f.name === 'SORA' ? 25 : 26;
  rounded(g, -headW/2 - 3, headY, headW + 6, 25, 8, OUTLINE);
  rounded(g, -headW/2, headY + 2, headW, 21, 6, c.skin, null);
  g.fillStyle = c.skin; g.beginPath(); g.ellipse(headW/2 + 1, headY + 15, 3.5, 4, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.ellipse(-headW/2 + 6, headY + 10, 3, 7, -.2, 0, Math.PI * 2); g.fill();
  if (f.name === 'MIRA') {
    rounded(g, -headW/2 - 9, headY + 5, 11, 48, 5, c.hair, OUTLINE, 1);
    g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(-headW/2 - 6, headY + 12, 2, 27);
    g.fillStyle = c.band; g.beginPath(); g.ellipse(-headW/2 - 4, headY + 51, 7, 8, -.2, 0, Math.PI * 2); g.fill();
  }
  if (f.name === 'SORA') {
    polygon(g, [[-4,headY+3],[-8,headY-8],[-1,headY-4],[4,headY-14],[7,headY-4],[13,headY-10],[11,headY+5]], c.hair, OUTLINE, 1);
  } else if (f.name === 'ROX' || f.name === 'TORA') {
    polygon(g, [[-headW/2-1,headY+7],[-headW/2-4,headY-8],[-7,headY-2],[-2,headY-13],[4,headY-4],[12,headY-9],[headW/2+2,headY+3],[headW/2,headY+10]], c.hair, OUTLINE, 1);
  } else {
    rounded(g, -headW/2 - 2, headY - 3, headW + 4, 11, 6, c.hair, OUTLINE, 1);
    polygon(g, [[-headW/2,headY+5],[-headW/2+6,headY-5],[-headW/2+12,headY+5],[-1,headY-3],[5,headY+5],[headW/2,headY-1],[headW/2+1,headY+10]], c.hair, OUTLINE, 1);
  }
  if (f.name === 'KAI') {
    rounded(g, -headW/2, headY + 7, headW, 5, 2, c.band, OUTLINE, 1);
    polygon(g, [[-headW/2+2,headY+10],[-headW/2-13,headY+19],[-headW/2+1,headY+17]], c.band, OUTLINE, 1);
    g.fillStyle = 'rgba(255,255,255,.42)'; g.fillRect(-headW/2 + 3, headY + 8, 8, 2);
  } else if (f.name === 'SORA') {
    rounded(g, 2, headY + 8, 15, 5, 2, '#263b5c', OUTLINE, 1);
    g.fillStyle = c.band; g.fillRect(5, headY + 9, 8, 2);
  } else if (f.name === 'TORA') {
    g.strokeStyle = c.band; g.lineWidth = 3;
    for (let stripe = 0; stripe < 3; stripe++) { g.beginPath(); g.moveTo(5 + stripe * 2, headY + 8 + stripe * 4); g.lineTo(15, headY + 5 + stripe * 4); g.stroke(); }
  } else if (f.name === 'ROX') {
    rounded(g, -headW/2 + 2, headY + 9, 5, 4, 2, c.band, null);
  } else if (f.name === 'MIRA') {
    polygon(g, [[-headW/2+2,headY+9],[-headW/2-9,headY+17],[-headW/2+1,headY+16]], c.band, OUTLINE, 1);
  }
  g.fillStyle = 'rgba(33,22,45,.8)'; g.fillRect(4, headY + 10, 10, 2);
  polygon(g, [[5,headY+9],[15,headY+9],[12,headY+11],[7,headY+11]], c.hair, null);
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(9, headY + 14, 2.8, 2.2, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#171321'; g.beginPath(); g.arc(10, headY + 14, 1.6, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(9, headY + 13, 1, 1);
  g.strokeStyle = '#31202a'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(5, headY + 9); g.lineTo(15, headY + 8); g.stroke();
  g.strokeStyle = 'rgba(81,43,45,.75)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(14, headY + 16); g.lineTo(17, headY + 18); g.lineTo(14, headY + 19); g.stroke();
  g.strokeStyle = '#6f3831'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(7, headY + 20); g.quadraticCurveTo(11, headY + 23, 15, headY + 19); g.stroke();

  // Forward leg switches to distinct kick, sweep, and airborne poses.
  if (sweep) {
    limb(g, 9, hipY, 25, -26 + shift, 16 * bulk, c.pants); limb(g, 25, -26 + shift, 51, -13 + shift, 14 * bulk, c.pants); boot(g, 49, -11 + shift);
  } else if (flyKick) {
    limb(g, 9, hipY, 27, -66, 16 * bulk, c.pants); limb(g, 27, -66, 58, -74, 14 * bulk, c.pants); boot(g, 57, -72);
  } else if (rising) {
    limb(g, 9, hipY, 20, -70, 16 * bulk, c.pants); limb(g, 20, -70, 27, -105, 14 * bulk, c.pants); boot(g, 25, -103);
  } else if (kick) {
    limb(g, 9, hipY, 29, -50 + shift, 16 * bulk, c.pants); limb(g, 29, -50 + shift, 53, -48 + shift, 14 * bulk, c.pants); boot(g, 51, -46 + shift);
  } else if (airborne) {
    limb(g, 9, hipY, 28, -42, 16 * bulk, c.pants); limb(g, 28, -42, 23, -21, 14 * bulk, c.pants); boot(g, 22, -18);
  } else if (crouch) {
    limb(g, 9, hipY, 27, -27 + shift, 16 * bulk, c.pants); limb(g, 27, -27 + shift, 34, -9 + shift, 14 * bulk, c.pants); boot(g, 33, -7 + shift);
  } else {
    limb(g, 9, hipY, 12 + walk * .4, -25, 16 * bulk, c.pants); limb(g, 12 + walk * .4, -25, 13 + walk, 0, 14 * bulk, c.pants); boot(g, 12 + walk, 0);
  }

  // Arm poses expose forearms and distinct hands; blocked stance crosses both arms up front.
  // Fighters idle in a compact guard, ready to attack instead of standing with arms hanging.
  let frontElbow = [24, bodyTop + 31], frontWrist = [8, bodyTop + 8];
  if (f.block) { frontElbow = [17, bodyTop + 32]; frontWrist = [3, bodyTop + 22]; }
  else if (punch) { frontElbow = [35, bodyTop + 27]; frontWrist = [55, bodyTop + 27]; }
  else if (f.atk === 's' && !rising) { frontElbow = [34, bodyTop + 35]; frontWrist = [54, bodyTop + 31]; }
  else if (rising) { frontElbow = [25, bodyTop + 44]; frontWrist = [34, bodyTop + 57]; }
  limb(g, 17 * bulk, bodyTop + 29, frontElbow[0], frontElbow[1], 16, c.gi);
  limb(g, frontElbow[0], frontElbow[1], frontWrist[0], frontWrist[1], 10, c.skin); hand(g, frontWrist[0], frontWrist[1], c.skin);
  if (f.block) {
    limb(g, 17, bodyTop + 31, 29, bodyTop + 12, 14, c.gi); limb(g, 29, bodyTop + 12, 17, bodyTop + 6, 9, c.skin); hand(g, 17, bodyTop + 6, c.skin);
  }
  if (punch || kick || flyKick || sweep || rising || f.atk === 's') {
    const ex = (punch || f.atk === 's') ? frontWrist[0] + 11 : flyKick ? 80 : sweep ? 73 : rising ? 34 : 72;
    const ey = (punch || f.atk === 's') ? frontWrist[1] : flyKick ? -75 : sweep ? -13 + shift : rising ? -112 : -48 + shift;
    g.save(); g.globalAlpha = active || rising ? .42 : .22; g.strokeStyle = f.sup ? '#ffd23f' : '#fff1b8'; g.lineWidth = 3;
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(ex - 14 + i * 3, ey - 9 - i * 7); g.lineTo(ex - 3 + i * 3, ey - 9 - i * 7); g.stroke(); } g.restore();
  }
  if (f.atk === 's' && !rising && !dash) {
    const energy = g.createRadialGradient(frontWrist[0] + 10, frontWrist[1], 2, frontWrist[0] + 10, frontWrist[1], 22);
    energy.addColorStop(0, '#fff'); energy.addColorStop(.35, '#ffd23f'); energy.addColorStop(1, 'rgba(255,90,40,0)');
    g.fillStyle = energy; g.beginPath(); g.arc(frontWrist[0] + 10, frontWrist[1], 22, 0, Math.PI * 2); g.fill();
  }
  if (f.sup && f.atk) {
    g.globalAlpha = .72; g.strokeStyle = '#ffd23f'; g.lineWidth = 3; g.beginPath(); g.ellipse(0, -56, 34, 58, 0, -.7, 2.7); g.stroke(); g.globalAlpha = 1;
  }
  if (f.flash > 0 && !reducedMotion) { g.fillStyle = `rgba(255,255,255,${Math.min(.72, f.flash * .09)})`; g.fillRect(-30, bodyTop - 34, 94, 142); }
  g.restore();
  if (withShadow) { g.fillStyle = `rgba(0,0,0,${airborne ? .2 : .34})`; g.beginPath(); g.ellipse(f.x, floor + 4, airborne ? 22 : 34, 7, 0, 0, Math.PI * 2); g.fill(); }
}
function drawFireball(g, b, reducedMotion = false) {
  if (reducedMotion) {
    g.fillStyle = '#ff7b36'; g.beginPath(); g.arc(b.x, b.y, 15 * (b.size || 1), 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#fff1a3'; g.lineWidth = 3; g.beginPath(); g.arc(b.x, b.y, 9 * (b.size || 1), 0, Math.PI * 2); g.stroke(); return;
  }
  const z = b.size || 1, trail = 34 * z;
  const flame = g.createLinearGradient(b.x - b.face * trail, b.y, b.x + b.face * 15, b.y);
  flame.addColorStop(0, 'rgba(255,52,28,0)'); flame.addColorStop(.55, 'rgba(255,94,38,.48)'); flame.addColorStop(1, 'rgba(255,210,63,.86)');
  g.fillStyle = flame; g.beginPath(); g.ellipse(b.x - b.face * 14 * z, b.y, trail, 9 * z, 0, 0, Math.PI * 2); g.fill();
  for (let k = 3; k >= 0; k--) { g.fillStyle = `rgba(255,${104 + k * 28},48,${.17 + .08 * (3-k)})`; g.beginPath(); g.arc(b.x - b.face * k * 12 * z, b.y, (19-k*3)*z, 0, Math.PI * 2); g.fill(); }
  const r = g.createRadialGradient(b.x - b.face * 4, b.y - 3, 1, b.x, b.y, 23*z); r.addColorStop(0,'#fff'); r.addColorStop(.34,'#fff1a3'); r.addColorStop(.66,'#ffd23f'); r.addColorStop(1,'rgba(255,73,32,0)');
  g.fillStyle=r; g.beginPath(); g.arc(b.x,b.y,24*z,0,Math.PI*2); g.fill();
  g.fillStyle = '#fff8cf'; g.fillRect(b.x - 3, b.y - 3, 6, 6);
}
function drawFx(g, w) {
  w.fx.forEach(e => {
    const a=1-e.t/14, r=7+e.t*3.2, col=e.k==='block'?'93,210,255':e.k==='counter'?'255,199,56':'255,244,190';
    g.save(); g.globalAlpha = a; g.strokeStyle=`rgba(${col},${a})`; g.lineWidth=e.k==='counter'?4:3; g.beginPath();
    for(let k=0;k<10;k++){const an=k*Math.PI/5, inner=r*(k%2?.49:.35);g.moveTo(e.x+Math.cos(an)*inner,e.y+Math.sin(an)*inner);g.lineTo(e.x+Math.cos(an)*r,e.y+Math.sin(an)*r);}
    g.stroke(); g.fillStyle = e.k==='block'?'#8be1ff':e.k==='counter'?'#fff0a6':'#fff9df';
    g.beginPath(); g.arc(e.x,e.y,Math.max(1,5-e.t*.28),0,Math.PI*2); g.fill();
    g.fillStyle = `rgba(${col},${a})`; for(let k=0;k<4;k++){const an=k*Math.PI/2+e.t*.19, rr=r+7;g.fillRect(e.x+Math.cos(an)*rr-2,e.y+Math.sin(an)*rr-2,4,4);} g.restore();
  });
}
function drawHud(g, w) {
  w.fighters.forEach((f, n) => {
    const bw = 380, x = n ? W - 40 - bw : 40;
    g.fillStyle = '#000'; g.fillRect(x - 4, 22, bw + 8, 34);
    const shown = bw * f.show / f.maxHp, actual = bw * f.hp / f.maxHp;
    g.fillStyle = '#ffd23f'; g.fillRect(n ? x : x + bw - shown, 27, shown, 23);
    g.fillStyle = f.hp > .3 * f.maxHp ? '#3ddc84' : '#ff4d4d'; g.fillRect(n ? x : x + bw - actual, 27, actual, 23);
    g.fillStyle = '#000'; g.fillRect(n ? x : x + bw - 190, 57, 190, 9);
    g.fillStyle = f.meter >= 100 ? '#ffd23f' : '#4cc9f0'; g.fillRect(n ? x : x + bw - 190, 57, 190 * f.meter / 100, 9);
    if (f.meter >= 100) text(g, 'SUPER!', n ? x + 196 : x + bw - 196, 68, 7, '#ffd23f', n ? 'left' : 'right');
    text(g, f.name, n ? x + bw : x, 83, 13, '#fff', n ? 'right' : 'left');
    for (let i = 0; i < 2; i++) { g.fillStyle = i < f.wins ? '#ffd23f' : '#000'; g.beginPath(); g.arc(n ? x + 10 + i * 20 : x + bw - 10 - i * 20, 97, 6, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.stroke(); }
  });
  if (!w.twoP && w.mode !== 'dojo') { const d = DIFFICULTY_INFO[w.difficulty]; text(g, 'CPU  ' + d.name, W / 2, 80, 7, d.col); }
  if (w.mode === 'dojo') text(g, 'DOJO', W / 2, 58, 12, '#ffd58a');
  else text(g, String(Math.max(0, Math.min(ROUND_TIME, w.time))).padStart(2, '0'), W / 2, 58, 24, '#ffd58a');
}
function drawCombo(g, w) {
  w.fighters.forEach((f, n) => { if (f.cmb >= 2 && f.cmbT > 0) text(g, `${f.cmb} HITS!  ${f.cmbDmg} DMG`, n ? 145 : W - 145, 165, 12, '#ffd23f'); });
  if (w.banner) text(g, w.banner.text, W / 2, 170, 18, '#ff9a4d');
}
function button(g, b, label, col, on, dim) {
  g.fillStyle = dim ? 'rgba(255,255,255,.05)' : on ? '#2e9e5b' : 'rgba(255,255,255,.12)'; g.fillRect(b.x, b.y, b.w, b.h);
  g.strokeStyle = dim ? '#555' : col; g.lineWidth = 2; g.strokeRect(b.x, b.y, b.w, b.h);
  text(g, label, b.x + b.w / 2, b.y + b.h / 2 + 4, 8, dim ? '#888' : '#fff');
}
function drawMenu(g, w) {
  g.fillStyle = 'rgba(10,4,20,.34)'; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(14,7,25,.78)'; g.beginPath(); g.roundRect(174, 18, 612, 350, 18); g.fill();
  g.strokeStyle = 'rgba(255,213,138,.26)'; g.lineWidth = 1; g.stroke();
  text(g, 'PIXEL BRAWL', W / 2, 78, 34, '#ffd23f');
  text(g, 'ARCADE FIGHTS · TRAINING · LOCAL PLAY', W / 2, 102, 7, '#c9b8e0');
  button(g, MENU_BUTTONS.one, '1 PLAYER VS CPU  ·  1', '#ff5a3c', w.menuIndex === 0, false);
  button(g, MENU_BUTTONS.two, '2 PLAYERS  ·  2', '#4dabf7', w.menuIndex === 1, false);
  button(g, MENU_BUTTONS.dojo, 'COMBO DOJO', '#4dd0e1', w.menuIndex === 2, false);
  button(g, MENU_BUTTONS.tutorial, 'TUTORIAL', '#4dd0e1', w.menuIndex === 3, false); button(g, MENU_BUTTONS.settings, 'SETTINGS', '#b89aff', w.menuIndex === 4, false);
  g.fillStyle = 'rgba(10,4,20,.82)'; g.beginPath(); g.roundRect(58, 382, 844, 138, 12); g.fill();
  g.strokeStyle = 'rgba(110,78,136,.75)'; g.lineWidth = 1; g.stroke();
  text(g, 'CONTROLS', 80, 403, 7, '#ffd58a', 'left');
  text(g, 'P1  WASD MOVE  ·  F PUNCH  ·  G KICK  ·  H SPECIAL  ·  J SUPER  ·  V BLOCK', 80, 424, 6, '#fff', 'left');
  text(g, "P2  ARROWS MOVE  ·  K PUNCH  ·  L KICK  ·  ; SPECIAL  ·  ' SUPER  ·  / BLOCK", 80, 442, 6, '#fff', 'left');
  text(g, 'CONTROLLER: D-PAD / STICK TO MOVE  ·  A CONFIRMS  ·  FACE BUTTONS ATTACK  ·  LT / RT BLOCK', 80, 460, 6, '#c9b8e0', 'left');
  text(g, 'CPU LEVEL IS CHOSEN WHEN YOU START 1P  ·  O: COMBO DOJO  ·  T: TUTORIAL  ·  DOWN + KICK SWEEP', 80, 480, 6, '#c9b8e0', 'left');
}
const MOVE_SHORT = { p: 'PUNCH', k: 'KICK', cp: 'DOWN PUNCH', c: 'DOWN KICK', jp: 'AIR PUNCH', j: 'FLY KICK', s: 'SPECIAL' };
function drawDojoSelect(g, w) {
  g.fillStyle = 'rgba(10,4,20,.94)'; g.fillRect(0, 0, W, H);
  text(g, 'COMBO DOJO', W / 2, 55, 24, '#ffd23f'); text(g, 'PICK A FIGHTER AND A COMBO TO PRACTICE', W / 2, 79, 7, '#c9b8e0');
  text(g, 'ESC / BACK', 72, 32, 7, '#c9b8e0');
  const panel = { x: 42, y: 112, w: 300, h: 294 }, ch = CHARS[w.dojo.fighter];
  g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(panel.x, panel.y, panel.w, panel.h); g.strokeStyle = '#4dd0e1'; g.lineWidth = 2; g.strokeRect(panel.x, panel.y, panel.w, panel.h);
  text(g, 'FIGHTER', 192, 139, 8, '#4dd0e1');
  drawFighter(g, { ...ch, showcase: true, x: 192, y: 350, groundY: 350, face: 1, walk: 0, hp: ch.hp, maxHp: ch.hp }, 1.3, true, w.reducedMotion, true, renderFrame);
  text(g, ch.name, 192, 376, 14, '#ffd23f'); text(g, ch.title, 192, 393, 6, '#ff9a4d');
  [DOJO_FIGHTER_PREV, DOJO_FIGHTER_NEXT].forEach((b, i) => { g.fillStyle = 'rgba(255,255,255,.11)'; g.fillRect(b.x, b.y, b.w, b.h); g.strokeStyle = '#4dd0e1'; g.lineWidth = 2; g.strokeRect(b.x, b.y, b.w, b.h); text(g, i ? '›' : '‹', b.x + b.w/2, b.y + 37, 24, '#fff'); });
  text(g, 'A / D OR LEFT / RIGHT', 192, 425, 6, '#c9b8e0');
  text(g, 'CHOOSE A COMBO', 642, 108, 8, '#4dd0e1');
  COMBOS.forEach((combo, i) => {
    const b = dojoComboRect(i), selected = w.dojo.combo === i;
    g.fillStyle = selected ? 'rgba(230,57,70,.65)' : 'rgba(255,255,255,.06)'; g.fillRect(b.x, b.y, b.w, b.h);
    g.strokeStyle = selected ? '#ffd23f' : 'rgba(255,255,255,.22)'; g.lineWidth = selected ? 2 : 1; g.strokeRect(b.x, b.y, b.w, b.h);
    text(g, `${i + 1}. ${combo.name}`, b.x + 11, b.y + 22, 7, selected ? '#fff' : '#ffd58a', 'left');
    text(g, combo.seq.map(key => MOVE_SHORT[key]).join('  ›  '), b.x + 11, b.y + 43, 5.5, '#ddd', 'left');
  });
  button(g, DOJO_START, 'START PRACTICE', '#3ddc84', false, false);
  text(g, 'W / S OR D-PAD CHANGES COMBO  ·  A / ENTER STARTS  ·  ESC BACK', W / 2, 510, 6, '#c9b8e0');
}
function drawDojoOverlay(g, w) {
  const combo = COMBOS[w.dojo.combo], panel = { x: 300, y: 108, w: 360, h: 96 };
  g.fillStyle = 'rgba(10,4,20,.82)'; g.fillRect(panel.x, panel.y, panel.w, panel.h); g.strokeStyle = '#4dd0e1'; g.lineWidth = 2; g.strokeRect(panel.x, panel.y, panel.w, panel.h);
  text(g, `CHALLENGE ${w.dojo.combo + 1}/${COMBOS.length}  ·  ${combo.name}`, W / 2, 130, 8, '#ffd23f');
  const totalW = combo.seq.length * 88 + (combo.seq.length - 1) * 7, left = W / 2 - totalW / 2;
  combo.seq.forEach((key, i) => {
    const x = left + i * 95, y = 145, hit = i < w.dojo.progress;
    g.fillStyle = hit ? 'rgba(61,220,132,.7)' : 'rgba(255,255,255,.09)'; g.fillRect(x, y, 88, 26);
    g.strokeStyle = hit ? '#3ddc84' : 'rgba(255,255,255,.25)'; g.strokeRect(x, y, 88, 26);
    text(g, MOVE_SHORT[key], x + 44, y + 17, 5.5, hit ? '#fff' : '#c9b8e0');
  });
  const cleared = (w.dojo.cleared || []).filter(Boolean).length;
  text(g, `CLEARED ${cleared}/${COMBOS.length}`, panel.x + panel.w - 8, panel.y + panel.h + 16, 6, cleared === COMBOS.length ? '#3ddc84' : '#c9b8e0', 'right');
  if (w.dojo.completed) {
    const next = COMBOS[(w.dojo.combo + 1) % COMBOS.length];
    text(g, cleared === COMBOS.length ? 'ALL CHALLENGES CLEARED!' : 'COMBO CLEARED!', W / 2, 190, 9, '#3ddc84');
    text(g, 'NEXT: ' + next.name, W / 2, 228, 8, '#ffd23f');
    const left = Math.max(0, w.dojo.successT) / DOJO_NEXT_DELAY;
    g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(W / 2 - 80, 236, 160, 6); g.fillStyle = '#ffd23f'; g.fillRect(W / 2 - 80, 236, 160 * (1 - left), 6);
  }
  else text(g, `${w.dojo.progress} / ${combo.seq.length} HITS  ·  APPROACH THE DUMMY AND LINK THE MOVES`, W / 2, 194, 5.5, '#ddd');
  text(g, 'LB / RB OR Q / E: CHANGE CHALLENGE   ·   R: RESET   ·   ESC: PAUSE', W / 2, 518, 6, '#ffd58a');
}
const SLOT_COL = ['#e63946', '#4dabf7'];
function drawIcon(g, ch, x, y, reducedMotion) {
  drawFighter(g, { ...ch, x: x + PORT.w / 2, y: y + PORT.h - 4, groundY: y + PORT.h - 4, face: 1, walk: 0, hp: 1 }, .52, false, reducedMotion, true, renderFrame + x);
}
function drawPanel(g, ch, x, y, active, col, label) {
  const pw = 450, ph = 176; g.fillStyle = 'rgba(10,4,20,.85)'; g.fillRect(x, y, pw, ph);
  g.strokeStyle = active ? col : '#6b4f8a'; g.lineWidth = active ? 4 : 2; g.strokeRect(x, y, pw, ph);
  if (!ch) { text(g, label + ' · WAITING FOR PLAYER 1', x + pw / 2, y + ph / 2, 8, '#ddd'); return; }
  const m = movesOf(ch); text(g, ch.name, x + 15, y + 29, 15, '#ffd23f', 'left'); text(g, ch.title, x + 15, y + 48, 8, '#ff9a4d', 'left');
  [['HEALTH', ch.hp / 130], ['SPEED', ch.spd / 1.3], ['POWER', (m.p.dmg + m.k.dmg) / 2 / 12]].forEach(([l, v], i) => {
    const yy = y + 63 + i * 22; text(g, l, x + 15, yy + 10, 7, '#ddd', 'left'); g.fillStyle = '#000'; g.fillRect(x + 86, yy, 106, 11); g.fillStyle = '#3ddc84'; g.fillRect(x + 86, yy, 106 * Math.min(1, v), 11);
  });
  [['PUNCH', m.p.dmg], ['KICK', m.k.dmg], [ch.sp.name, m.s.dmg]].forEach(([l, d], i) => { text(g, l, x + 222, y + 72 + i * 22, 8, '#ddd', 'left'); text(g, d + ' DMG', x + 434, y + 72 + i * 22, 8, '#ffd23f', 'right'); });
  const words=ch.desc.split(' '), lines=[]; let line='';
  for (const word of words) { if ((line+' '+word).trim().length>58) { lines.push(line); line=word; } else line=(line+' '+word).trim(); }
  if (line) lines.push(line); lines.slice(0,2).forEach((v,i)=>text(g,v,x+15,y+145+i*15,6,'#c9b8e0','left'));
}
function drawDifficulty(g, w) {
  g.fillStyle = 'rgba(10,4,20,.74)'; g.fillRect(0, 0, W, H);
  text(g, 'ESC / BACK', 74, 32, 7, '#c9b8e0');
  text(g, 'CHOOSE YOUR CHALLENGE', W / 2, 72, 22, '#ffd23f');
  text(g, 'HOW STRONG SHOULD THE CPU BE?  YOU CAN CHANGE IT LATER FROM THE PAUSE MENU.', W / 2, 104, 6, '#c9b8e0');
  DIFFICULTY_INFO.forEach((d, i) => {
    const b = diffCardRect(i), on = w.difficulty === i, cx = b.x + b.w / 2;
    g.fillStyle = on ? 'rgba(255,255,255,.17)' : 'rgba(255,255,255,.06)'; g.fillRect(b.x, b.y, b.w, b.h);
    g.strokeStyle = on ? d.col : 'rgba(255,255,255,.25)'; g.lineWidth = on ? 4 : 1; g.strokeRect(b.x, b.y, b.w, b.h);
    text(g, d.name, cx, b.y + 46, 18, d.col); text(g, d.tag, cx, b.y + 72, 6, '#ffd58a');
    d.lines.forEach((l, k) => text(g, l, cx, b.y + 108 + k * 24, 6.2, '#fff'));
    for (let k = 0; k < 3; k++) { g.fillStyle = k <= i ? d.col : '#2a1a3a'; g.fillRect(cx - 40 + k * 28, b.y + b.h - 28, 24, 12); }
  });
  text(g, '‹ ›  CHOOSE   ·   1 2 3 QUICK PICK   ·   ENTER OR CLICK TO CONTINUE', W / 2, 392, 7, '#fff');
  text(g, 'YOUR LAST LEVEL IS REMEMBERED', W / 2, 416, 6, '#c9b8e0');
}
function drawSelect(g, w) {
  const s = w.sel; g.fillStyle = 'rgba(10,4,20,.62)'; g.fillRect(0, 0, W, H);
  text(g, 'SELECT YOUR FIGHTER', W / 2, 40, 19, '#ffd23f'); text(g, 'TIME LEFT  ' + Math.ceil(s.timeLeft / 60) + ' SEC', W / 2, 60, 8, s.timeLeft < 600 ? '#ff5a3c' : '#ffd58a');
  text(g, 'ESC / BACK', 74, 32, 7, '#c9b8e0');
  if (!w.twoP) text(g, 'CPU: ' + DIFFICULTIES[w.difficulty], W - 74, 32, 7, DIFFICULTY_INFO[w.difficulty].col, 'right');
  CHARS.forEach((ch, i) => {
    const bx = PORT.x0 + i * (PORT.w + PORT.gap), by = PORT.y; g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(bx, by, PORT.w, PORT.h); drawIcon(g, ch, bx, by, w.reducedMotion);
    [0, 1].forEach(n => { if (s.cur[n] === i) { g.strokeStyle = SLOT_COL[n]; g.lineWidth = s.roll[n] ? 6 : 4; g.strokeRect(bx + n * 5 + 2, by + n * 5 + 2, PORT.w - n * 10 - 4, PORT.h - n * 10 - 4); } });
    text(g, ch.name, bx + PORT.w / 2, by + PORT.h + 16, 8);
  });
  const rb = randomBoxRect;
  g.fillStyle = 'rgba(255,210,63,.12)'; g.fillRect(rb.x, rb.y, rb.w, rb.h);
  g.fillStyle = '#261538'; g.fillRect(rb.x + 3, rb.y + 3, rb.w - 6, rb.h - 6);
  g.strokeStyle = '#ffd23f'; g.lineWidth = 2; g.strokeRect(rb.x, rb.y, rb.w, rb.h);
  g.save(); g.font = `30px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#000'; g.fillText('?', rb.x + rb.w / 2 + 2, rb.y + rb.h / 2 + 2);
  g.shadowColor = '#ffd23f'; g.shadowBlur = 12; g.fillStyle = '#ffd23f'; g.fillText('?', rb.x + rb.w / 2, rb.y + rb.h / 2);
  g.restore();
  [0,1].forEach(n => { if (s.roll[n]) { g.strokeStyle = SLOT_COL[n]; g.lineWidth = 4; g.strokeRect(rb.x + n * 4 + 2, rb.y + n * 4 + 2, rb.w - n * 8 - 4, rb.h - n * 8 - 4); } });
  text(g, 'RANDOM', rb.x + rb.w / 2, rb.y + rb.h + 16, 8, '#ffd23f');
  [0, 1].forEach(n => {
    const ch = Number.isInteger(s.cur[n]) ? CHARS[s.cur[n]] : null, x = n ? 850 : 110, cpu = !w.twoP && n === 1;
    const label = n === 0 ? 'P1' : w.twoP ? 'P2' : 'CPU', mirror = ch && n === 1 && s.cur[0] === s.cur[1], b = selButtons(n), ready = s.lock[n] && !s.roll[n];
    text(g, label, x, 140, 14, SLOT_COL[n]); if (ch) {
      const c = mirror ? { ...ch.c, gi: ch.c.band, band: ch.c.gi } : ch.c;
    drawFighter(g, { ...ch, c, alt: mirror, showcase: true, showcaseOffset: n * 150, x, y: 306, groundY: 306, face: n ? -1 : 1, walk: 0, hp: 1, crouch: 0 }, .85, true, w.reducedMotion, true, renderFrame);
    }
    button(g, b.lock, cpu ? (ready ? 'CPU READY' : 'CPU AUTO PICK') : s.roll[n] ? 'ROLLING...' : ready ? 'LOCKED - UNLOCK' : 'LOCK IN', SLOT_COL[n], ready && !cpu, cpu);
    const hint = cpu ? (ch ? 'AUTO PICK READY' : 'PICKS AFTER P1 LOCKS') : (n ? 'ARROWS MOVE · K LOCK' : 'A/D MOVE · F LOCK');
    const hintX = n ? 720 : 240;
    text(g, hint, hintX, 357, 5.5, '#c9b8e0');
    drawPanel(g, ch, n ? 490 : 20, 364, s.slot === n, SLOT_COL[n], cpu ? 'CPU' : label);
    if (ready && !cpu) text(g, 'READY', (n ? 490 : 20) + 436, 394, 9, '#3ddc84', 'right');
  });
  if (s.go) text(g, 'GET READY!', W / 2, 270, 20, '#ff5a3c');
  else { text(g, 'Choose a fighter. The ? tile spins through the roster.', W / 2, 218, 7, '#ddd'); text(g, 'Random rolls do not lock you in. Lock in when you are ready.', W / 2, 238, 6, '#c9b8e0'); }
}
function drawPause(g, w) {
  g.fillStyle = 'rgba(10,4,20,.8)'; g.fillRect(0, 0, W, H); text(g, 'PAUSED', W / 2, 112, 30, '#ffd23f');
  if (w.exitConfirm) {
    text(g, 'EXIT TO THE MAIN MENU?', W / 2, 242, 13, '#fff');
    [0,1].forEach(i => { const b = exitChoiceRect(i), on = w.exitChoice === i; g.fillStyle = on ? (i ? '#2e9e5b' : '#e63946') : 'rgba(255,255,255,.1)'; g.fillRect(b.x,b.y,b.w,b.h); g.strokeStyle = '#ffd23f'; g.lineWidth = on ? 3 : 1; g.strokeRect(b.x,b.y,b.w,b.h); text(g, i ? 'NO' : 'YES', b.x+b.w/2,b.y+27,10); });
    text(g, 'LEFT / RIGHT + ENTER   ·   ESC TO CANCEL', W / 2, 360, 7, '#c9b8e0'); return;
  }
  pauseItems(w).forEach((label,i) => { if (i === 4) label = '‹  CPU LEVEL: ' + DIFFICULTIES[w.difficulty] + '  ›'; const b = pauseRect(i), on = w.pm === i; g.fillStyle = on ? '#e63946' : 'rgba(255,255,255,.1)'; g.fillRect(b.x,b.y,b.w,b.h); g.strokeStyle = '#ffd23f'; g.lineWidth = on ? 4 : 2; g.strokeRect(b.x,b.y,b.w,b.h); text(g,label,W/2,b.y+26,i===4?8:10); });
  text(g, 'W/S OR UP/DOWN + ENTER · LEFT/RIGHT CHANGES LEVEL · ESC RESUMES', W / 2, 408, 6, '#c9b8e0'); text(g, 'COMBO SKILLS (BONUS DAMAGE)', W / 2, 430, 8, '#ffd58a');
  COMBOS.forEach((c,i) => text(g,c.name+': '+c.seq.map(k=>MOVE_NAMES[k]).join(', ')+' +'+c.bonus,i<4?38:500,450+(i%4)*15,6,'#ddd','left'));
}
function drawSettings(g, w) {
  g.fillStyle = 'rgba(10,4,20,.97)'; g.fillRect(0,0,W,H);
  g.fillStyle = 'rgba(52,26,70,.45)'; g.fillRect(205,32,550,468);
  g.strokeStyle = '#6e4e88'; g.lineWidth = 2; g.strokeRect(205,32,550,468);
  text(g,'SETTINGS',W/2,68,22,'#ffd23f');
  SETTINGS_ITEMS.forEach((label,i) => {
    const b=settingsRect(i), selected=w.settingsIndex===i;
    g.fillStyle=selected?'rgba(230,57,70,.64)':'rgba(255,255,255,.07)'; g.fillRect(b.x,b.y,b.w,b.h);
    g.strokeStyle=selected?'#ffd23f':'rgba(255,255,255,.22)'; g.lineWidth=selected?2:1; g.strokeRect(b.x,b.y,b.w,b.h);
    text(g,label,b.x+18,b.y+29,8,'#fff','left');
    if (i < 4) {
      const key=['music','ui','effects','voice'][i], value=w.audio[key], rail=settingSliderRect(i), filled=rail.w*value/100;
      g.fillStyle='#160d23'; g.fillRect(rail.x,rail.y,rail.w,rail.h);
      g.fillStyle=['#4dabf7','#4dd0e1','#ff5a3c','#ff9f1c'][i]; g.fillRect(rail.x,rail.y,filled,rail.h);
      g.save(); g.shadowColor='#ffd23f'; g.shadowBlur=selected?9:0; g.fillStyle='#fff'; g.beginPath(); g.arc(rail.x+filled,rail.y+rail.h/2,selected?7:5,0,Math.PI*2); g.fill(); g.restore();
      text(g,`${value}%`,b.x+b.w-17,b.y+30,8,'#ffd58a','right');
    } else if (i === 4) {
      text(g,`‹  ${DIFFICULTIES[w.difficulty]}  ›`,b.x+b.w-18,b.y+27,8,'#ffd58a','right');
    } else {
      const value=i===5?(w.audio.muted?'ON':'OFF'):i===6?(w.reducedMotion?'ON':'OFF'):'RETURN';
      const active=(i===5&&w.audio.muted)||(i===6&&w.reducedMotion);
      text(g,value,b.x+b.w-18,b.y+27,8,active?'#3ddc84':'#ffd58a','right');
    }
  });
  text(g,'LEFT / RIGHT CHANGES THE SELECTED SETTING  ·  CLICK TO ADJUST  ·  ESC BACK',W/2,514,5.7,'#c9b8e0');
}
function drawTutorial(g,w) {
  g.fillStyle='rgba(10,4,20,.96)'; g.fillRect(0,0,W,H); text(g,w.tutorialPage?'COMBOS & CANCELS':'HOW TO PLAY',W/2,62,22,'#ffd23f'); text(g,w.tutorialPage?'PAGE 2 OF 2':'PAGE 1 OF 2',W/2,86,7,'#ffd58a');
  if (!w.tutorialPage) {
    text(g,'MOVE & DEFEND',92,142,10,'#4dd0e1','left');
    ['Move: A/D or Left/Right','Jump: W or Up','Crouch: S or Down','Block: hold V (P1) or / (P2), or hold away','Stand block stops overhead attacks','Crouch block stops sweeps'].forEach((v,i)=>text(g,v,92,174+i*30,8,'#fff','left'));
    text(g,'ATTACK',530,142,10,'#ff9a4d','left');
    ['P1: F punch · G kick · H special · J super','P2: K punch · L kick · ; special · ‘ super','Down + Punch = quick crouching jab','Down + Kick = sweep (low attack)','Jump + Kick = fly kick (overhead)','Super needs a full meter'].forEach((v,i)=>text(g,v,530,174+i*30,7,'#fff','left'));
    text(g,'Win two rounds. Controller: D-pad / stick to move, face buttons to attack.',W/2,390,6.5,'#c9b8e0');
  } else {
    text(g,'Link attacks while your opponent is in hit-stun. Punches and kicks can start a combo.',W/2,116,7,'#c9b8e0'); text(g,'A connected punch or kick can cancel into a special. Each chain adds bonus damage.',W/2,136,7,'#c9b8e0');
    COMBOS.forEach((c,i)=>{const col=i<4?0:1,row=i%4,x=col?502:62,y=194+row*48;g.fillStyle='rgba(255,255,255,.07)';g.fillRect(x,y-18,396,38);text(g,c.name+' +'+c.bonus,x+8,y-2,7,'#ffd23f','left');text(g,c.seq.map(k=>MOVE_NAMES[k]).join(' > '),x+8,y+13,6,'#fff','left');});
  }
  button(g,{x:290,y:446,w:164,h:38},w.tutorialPage?'BACK: BASICS':'NEXT: COMBOS','#4dd0e1',false,false); button(g,{x:506,y:446,w:164,h:38},'MAIN MENU','#ff9a4d',false,false); text(g,'LEFT / RIGHT OR ENTER TO CHANGE PAGE',W/2,512,6,'#c9b8e0');
}
export function render(g,w) {
  const base=w.mode==='settings'?w.settingsBack:w.mode, paused=base==='pause'||w.mode==='pause', m=paused?w.back:base;
  const menuScreen=['menu','select','difficulty','tutorial','dojoSelect'].includes(m);
  if(!paused)renderFrame++;                                                   // pausing freezes every animation, not just the simulation
  g.save(); if(!paused&&!w.reducedMotion&&w.shake>.5)g.translate((Math.random()-.5)*w.shake,(Math.random()-.5)*w.shake);
  g.drawImage(stageBackground(menuScreen?0:w.theme),0,0); if(!menuScreen)drawAmbient(g,w.theme,renderFrame,w.reducedMotion);
  if(m==='menu')drawMenu(g,w); else if(m==='select')drawSelect(g,w); else if(m==='difficulty')drawDifficulty(g,w); else if(m==='tutorial')drawTutorial(g,w); else if(m==='dojoSelect')drawDojoSelect(g,w); else if(m==='theme')drawThemeSelect(g,w);
  else {
    w.fighters.forEach(f=>drawFighter(g,f,1,true,w.reducedMotion,true,renderFrame)); w.fireballs.forEach(b=>drawFireball(g,b,w.reducedMotion)); if(!w.reducedMotion)drawFx(g,w); drawHud(g,w); drawCombo(g,w);
    if(m==='dojo')drawDojoOverlay(g,w);
    if(m==='intro') {
      const label = w.t < INTRO_READY_AT ? 'ROUND ' + w.round : w.t < INTRO_FIGHT_AT ? 'READY!' : 'FIGHT!';
      const color = w.t < INTRO_READY_AT ? '#fff' : w.t < INTRO_FIGHT_AT ? '#ffd23f' : '#ff5a3c';
      text(g,label,W/2,250,w.t<INTRO_FIGHT_AT?40:52,color);
    }
    if(m==='end'){text(g,w.time<=0&&w.fighters.every(f=>f.hp>0)?'TIME UP':'K.O.',W/2,230,56,'#ff5a3c');if(w.t>50)text(g,w.winner<0?'DRAW':w.fighters[w.winner].name+' WINS',W/2,300,24);}
    if(m==='match'){g.fillStyle='rgba(10,4,20,.65)';g.fillRect(0,0,W,H);const champ=w.fighters.find(f=>f.wins>=2);text(g,(champ?champ.name:'?')+' WINS THE MATCH',W/2,240,24,'#ffd23f');text(g,'ENTER / TAP - rematch    C - change fighters',W/2,300,10);text(g,'ESC - main menu',W/2,330,9,'#c9b8e0'); if(!w.twoP)text(g,'CPU LEVEL: '+DIFFICULTIES[w.difficulty]+'  -  D / TAP TO CHANGE',W/2,360,9,DIFFICULTY_INFO[w.difficulty].col);}
  }
  if(paused)drawPause(g,w); if(w.mode==='settings')drawSettings(g,w); g.restore();
}

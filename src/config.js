// All tunable constants live here.
export const W = 960, H = 540, GY = 470;      // canvas size, ground line
export const STEP = 1000 / 60;                // fixed timestep (ms)
export const ROUND_TIME = 60, ROUNDS_TO_WIN = 2;
export const SELECT_FRAMES = 30 * 60;
// Let each arcade call finish clearly before the next one begins.
export const INTRO_ROUND_AT = 1, INTRO_READY_AT = 78, INTRO_FIGHT_AT = 150, INTRO_END_AT = 201;

// s = startup, a = active, r = recovery (frames)
export const BUFFER = 8, METER_MAX = 100;      // input buffer (frames), super meter size
// Move data. s/a/r = startup/active/recovery frames, st = hit-stun, kb = knockback,
// g = guard height: 'mid' (block high or low), 'high' (must stand-block), 'low' (must crouch-block). kd = knockdown.
export const ATK = {
  p:  { s: 4, a: 4, r: 9,  dmg: 6,  reach: 75,  y: -100, h: 32, st: 20, kb: 4, g: 'mid' },
  k:  { s: 7, a: 5, r: 13, dmg: 10, reach: 95,  y: -70,  h: 40, st: 26, kb: 7, g: 'mid' },
  cp: { s: 3, a: 3, r: 7,  dmg: 4,  reach: 65,  y: -60,  h: 28, st: 18, kb: 3, g: 'mid' },               // crouching jab
  c:  { s: 8, a: 4, r: 17, dmg: 8,  reach: 105, y: -28,  h: 28, st: 40, kb: 6, g: 'low', kd: 1 },        // low sweep
  jp: { s: 3, a: 8, r: 6,  dmg: 7,  reach: 60,  y: -105, h: 45, st: 22, kb: 4, g: 'high' },              // jump punch
  j:  { s: 4, a: 40, r: 6, dmg: 11, reach: 70,  y: -80,  h: 85, st: 34, kb: 6, g: 'high' },              // fly kick
  s:  { s: 11, a: 0, r: 26 },
};
export const CHARS = [
  { name: 'KAI', title: 'THE ALL-ROUNDER', hp: 100, spd: 1, jump: 19,
    c: { gi: '#e8e2d0', band: '#e63946', skin: '#c68642', hair: '#1a1a1a', pants: '#2b2d42' },
    desc: 'Balanced in every way. His FIREBALL flies across the whole stage to control space.',
    p: { dmg: 6 }, k: { dmg: 10 },
    sp: { type: 'proj', name: 'FIREBALL', dmg: 12, speed: 10, cd: 70 } },
  { name: 'ROX', title: 'THE RUSHDOWN', hp: 90, spd: 1.25, jump: 20,
    c: { gi: '#2a9d8f', band: '#f4d35e', skin: '#f1c27d', hair: '#7b2d26', pants: '#264653' },
    desc: 'Fast and fragile. Quick punches and a DASH STRIKE that closes the gap in a blink.',
    p: { dmg: 5, s: 3 }, k: { dmg: 9, s: 6 },
    sp: { type: 'dash', name: 'DASH STRIKE', dmg: 14, speed: 11, s: 6, a: 12, r: 16, reach: 70, y: -110, h: 80, st: 22, kb: 9, cd: 80 } },
  { name: 'BRUNO', title: 'THE HEAVYWEIGHT', hp: 130, spd: 0.8, jump: 17,
    c: { gi: '#8d2b2b', band: '#ffd23f', skin: '#a86f4a', hair: '#222222', pants: '#3a2a2a' },
    desc: 'Slow but massive. Huge health and hard hits, plus a slow QUAKE WAVE that hurts.',
    p: { dmg: 9, reach: 80 }, k: { dmg: 14, reach: 100, s: 9 },
    sp: { type: 'proj', name: 'QUAKE WAVE', kd: 1, dmg: 18, speed: 6, size: 1.6, s: 16, r: 34, cd: 110 } },
  { name: 'MIRA', title: 'THE ACROBAT', hp: 95, spd: 1.1, jump: 23,
    c: { gi: '#7b4fb3', band: '#4dd0e1', skin: '#e0ac8c', hair: '#0f0f2b', pants: '#2d2450' },
    desc: 'Leaps higher than anyone. Her RISING KICK launches upward to punish jumpers.',
    p: { dmg: 5 }, k: { dmg: 9, reach: 105 },
    sp: { type: 'rise', name: 'RISING KICK', kd: 1, dmg: 15, vy: -21, s: 3, a: 14, r: 20, reach: 55, y: -170, h: 150, st: 24, kb: 6, cd: 90 } },
  { name: 'SORA', title: 'THE SHARPSHOOTER', hp: 90, spd: 1, jump: 21,
    c: { gi: '#3a6ea5', band: '#ff9f1c', skin: '#f1c27d', hair: '#dddddd', pants: '#1d3557' },
    desc: 'Keeps her distance. RAPID SHOT is a fast, cheap projectile you can fire again and again.',
    p: { dmg: 4 }, k: { dmg: 8 },
    sp: { type: 'proj', name: 'RAPID SHOT', dmg: 8, speed: 15, s: 8, r: 14, cd: 32 } },
  { name: 'TORA', title: 'THE BRAWLER', hp: 115, spd: 0.95, jump: 18,
    c: { gi: '#e76f51', band: '#264653', skin: '#8d5524', hair: '#2b1b0e', pants: '#4a2c1a' },
    desc: 'Hits like a truck. TIGER RUSH charges forward for heavy damage if it connects.',
    p: { dmg: 8 }, k: { dmg: 12 },
    sp: { type: 'dash', name: 'TIGER RUSH', kd: 1, dmg: 17, speed: 9, s: 9, a: 16, r: 22, reach: 75, y: -110, h: 90, st: 26, kb: 11, cd: 100 } },
];
// Base attack table merged with a character's own overrides.
export const movesOf = ch => {
  const p = { ...ATK.p, ...ch.p }, k = { ...ATK.k, ...ch.k }, pm = p.dmg / ATK.p.dmg, km = k.dmg / ATK.k.dmg;
  const sc = (m, x) => ({ ...m, dmg: Math.max(1, Math.round(m.dmg * x)) });      // new moves scale with the fighter's strength
  return { p, k, cp: sc(ATK.cp, pm), c: sc(ATK.c, km), jp: sc(ATK.jp, pm), j: sc(ATK.j, km), s: { ...ATK.s, ...ch.sp } };
};
// Character-select screen layout (canvas coordinates)
// Combo skills: when the last hits of a combo match `seq`, the finisher deals `bonus` extra damage (not reduced by combo scaling).
// A longer skill inside the same combo pays again, so chains can be upgraded (e.g. TRIPLE STRIKE -> MEGA COMBO).
export const COMBOS = [
  { seq: ['p', 'p', 'p'],      name: 'TRIPLE JAB',    bonus: 6 },
  { seq: ['p', 'p', 'k'],      name: 'TRIPLE STRIKE', bonus: 10 },
  { seq: ['cp', 'cp', 'c'],    name: 'LOW RUSH',      bonus: 8 },
  { seq: ['cp', 'p', 'k'],     name: 'CHAIN KICK',    bonus: 9 },
  { seq: ['j', 'p'],           name: 'AIR RAID',      bonus: 7 },
  { seq: ['p', 's'],           name: 'PUNCH CANCEL',  bonus: 8 },
  { seq: ['k', 's'],           name: 'KICK CANCEL',   bonus: 10 },
  { seq: ['p', 'p', 'k', 's'], name: 'MEGA COMBO',    bonus: 20, kd: 1 },
];
export const MOVE_NAMES = { p: 'Punch', k: 'Kick', cp: 'Down+Punch', c: 'Down+Kick', jp: 'Jump Punch', j: 'Fly Kick', s: 'Special' };

// Character select: lock-in buttons and a separate random tile in the roster.
export const selButtons = n => ({ lock: { x: n ? 620 : 140, y: 310, w: 200, h: 38 } });
export const ROLL_FRAMES = 180;                                   // random roll lasts 3 seconds
export const MENU_BUTTONS = {
  one: { x: 250, y: 120, w: 460, h: 46 }, two: { x: 250, y: 174, w: 460, h: 46 },
  dojo: { x: 250, y: 228, w: 460, h: 42 },
  tutorial: { x: 252, y: 282, w: 218, h: 40 }, settings: { x: 490, y: 282, w: 218, h: 40 },
};
export const DOJO_START = { x: 345, y: 440, w: 270, h: 40 };
export const DOJO_FIGHTER_PREV = { x: 76, y: 254, w: 44, h: 54 };
export const DOJO_FIGHTER_NEXT = { x: 258, y: 254, w: 44, h: 54 };
export const dojoComboRect = i => ({ x: 382 + (i % 2) * 270, y: 126 + Math.floor(i / 2) * 67, w: 250, h: 58 });
export const DIFFICULTIES = ['EASY', 'NORMAL', 'HARD'];
// "Choose your challenge" screen. The text matches what src/ai.js really does at each level.
export const DIFFICULTY_INFO = [
  { name: 'EASY',   col: '#3ddc84', tag: 'LEARN THE MOVES',  lines: ['SLOW, HESITANT CPU', 'RARELY BLOCKS OR COMBOS', 'BEST FOR PRACTISING'] },
  { name: 'NORMAL', col: '#ffd23f', tag: 'A FAIR FIGHT',     lines: ['BALANCED REACTIONS', 'MIXES IN COMBOS', 'THE RECOMMENDED LEVEL'] },
  { name: 'HARD',   col: '#ff5a3c', tag: 'FOR A REAL TEST',  lines: ['FAST REACTIONS AND BLOCKS', 'CHAINS COMBOS, USES SUPERS', 'EXPECT NO MERCY'] },
];
export const diffCardRect = i => ({ x: 96 + i * 270, y: 140, w: 250, h: 200 });
export const MATCH_DIFF = { x: 300, y: 340, w: 360, h: 30 };      // tap target on the match-over screen (1 player only)
export const SETTINGS_ITEMS = ['MUSIC VOLUME', 'UI SOUND VOLUME', 'FIGHT SFX VOLUME', 'ANNOUNCER VOICE', 'CPU DIFFICULTY', 'MASTER MUTE', 'REDUCED MOTION', 'BACK'];
export const settingsRect = i => ({ x: 236, y: 94 + i * 48, w: 488, h: 40 });
export const settingSliderRect = i => ({ x: 458, y: settingsRect(i).y + 14, w: 170, h: 12 });
export const exitChoiceRect = i => ({ x: 352 + i * 142, y: 286, w: 112, h: 42 });
// Pause menu
export const PAUSE_ITEMS = ['RESUME', 'REMATCH', 'EXIT MATCH', 'SETTINGS'];
export const pauseRect = i => ({ x: 330, y: 150 + i * 48, w: 300, h: 40 });   // index 4 (DIFFICULTY) only exists in 1-player matches
export const PORT = { x0: 156, y: 66, w: 84, h: 84, gap: 10 };
export const randomBoxRect = { x: PORT.x0 + CHARS.length * (PORT.w + PORT.gap), y: PORT.y, w: PORT.w, h: PORT.h };
export const KEYMAP = [
  { l: 'KeyA', r: 'KeyD', u: 'KeyW', d: 'KeyS', p: 'KeyF', k: 'KeyG', s: 'KeyH', x: 'KeyJ' },
  { l: 'ArrowLeft', r: 'ArrowRight', u: 'ArrowUp', d: 'ArrowDown', p: 'KeyK', k: 'KeyL', s: 'Semicolon', x: 'Quote' },
];

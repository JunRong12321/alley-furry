// All tunable constants live here.
export const W = 960, H = 540, GY = 470;      // canvas size, ground line
export const STEP = 1000 / 60;                // fixed timestep (ms)
export const ROUND_TIME = 60, ROUNDS_TO_WIN = 2;

// s = startup, a = active, r = recovery (frames)
export const ATK = {
  p: { s: 4, a: 4, r: 9, dmg: 6, reach: 75, y: -100, h: 32, st: 14, kb: 4 },
  k: { s: 7, a: 5, r: 13, dmg: 10, reach: 95, y: -70, h: 40, st: 19, kb: 7 },
  s: { s: 11, a: 0, r: 26 },
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
    sp: { type: 'proj', name: 'QUAKE WAVE', dmg: 18, speed: 6, size: 1.6, s: 16, r: 34, cd: 110 } },
  { name: 'MIRA', title: 'THE ACROBAT', hp: 95, spd: 1.1, jump: 23,
    c: { gi: '#7b4fb3', band: '#4dd0e1', skin: '#e0ac8c', hair: '#0f0f2b', pants: '#2d2450' },
    desc: 'Leaps higher than anyone. Her RISING KICK launches upward to punish jumpers.',
    p: { dmg: 5 }, k: { dmg: 9, reach: 105 },
    sp: { type: 'rise', name: 'RISING KICK', dmg: 15, vy: -21, s: 3, a: 14, r: 20, reach: 55, y: -170, h: 150, st: 24, kb: 6, cd: 90 } },
  { name: 'SORA', title: 'THE SHARPSHOOTER', hp: 90, spd: 1, jump: 21,
    c: { gi: '#3a6ea5', band: '#ff9f1c', skin: '#f1c27d', hair: '#dddddd', pants: '#1d3557' },
    desc: 'Keeps her distance. RAPID SHOT is a fast, cheap projectile you can fire again and again.',
    p: { dmg: 4 }, k: { dmg: 8 },
    sp: { type: 'proj', name: 'RAPID SHOT', dmg: 8, speed: 15, s: 8, r: 14, cd: 32 } },
  { name: 'TORA', title: 'THE BRAWLER', hp: 115, spd: 0.95, jump: 18,
    c: { gi: '#e76f51', band: '#264653', skin: '#8d5524', hair: '#2b1b0e', pants: '#4a2c1a' },
    desc: 'Hits like a truck. TIGER RUSH charges forward for heavy damage if it connects.',
    p: { dmg: 8 }, k: { dmg: 12 },
    sp: { type: 'dash', name: 'TIGER RUSH', dmg: 17, speed: 9, s: 9, a: 16, r: 22, reach: 75, y: -110, h: 90, st: 26, kb: 11, cd: 100 } },
];
// Base attack table merged with a character's own overrides.
export const movesOf = ch => ({ p: { ...ATK.p, ...ch.p }, k: { ...ATK.k, ...ch.k }, s: { ...ATK.s, ...ch.sp } });
// Character-select screen layout (canvas coordinates)
export const PORT = { x0: 203, y: 66, w: 84, h: 84, gap: 10 };
export const BTN = { x: 380, y: 255, w: 200, h: 50 };
export const KEYMAP = [
  { l: 'KeyA', r: 'KeyD', u: 'KeyW', d: 'KeyS', p: 'KeyF', k: 'KeyG', s: 'KeyH' },
  { l: 'ArrowLeft', r: 'ArrowRight', u: 'ArrowUp', d: 'ArrowDown', p: 'KeyK', k: 'KeyL', s: 'Semicolon' },
];

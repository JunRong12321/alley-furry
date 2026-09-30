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
export const SKINS = [
  { gi: '#e8e2d0', band: '#e63946', skin: '#c68642', hair: '#1a1a1a', pants: '#2b2d42' },
  { gi: '#2a9d8f', band: '#f4d35e', skin: '#f1c27d', hair: '#7b2d26', pants: '#264653' },
];
export const KEYMAP = [
  { l: 'KeyA', r: 'KeyD', u: 'KeyW', d: 'KeyS', p: 'KeyF', k: 'KeyG', s: 'KeyH' },
  { l: 'ArrowLeft', r: 'ArrowRight', u: 'ArrowUp', d: 'ArrowDown', p: 'KeyK', k: 'KeyL', s: 'Semicolon' },
];

import { W, H, STEP, PAUSE_ITEMS } from './config.js';
import { createWorld, startMatch, toMenu, step, openSelect, selMove, selLock, selRandom, selectClick, pause, resume, pauseChoose, pauseClick } from './game.js';
import { readPlayer, initInput, clearEdges } from './input.js';
import { sfx, unlockAudio } from './audio.js';
import { render, text } from './render.js';

const canvas = document.getElementById('game');
const g = canvas.getContext('2d', { alpha: false, desynchronized: true });
const world = createWorld(sfx);

const FIGHTING = ['intro', 'fight', 'end'];
function selectKey(code) {
  const s = world.sel, solo = !world.twoP, who = n => (solo ? s.slot : n);      // 1 player: every key controls the highlighted side
  [{ l: 'KeyA', r: 'KeyD', lock: 'KeyF', rnd: 'KeyG' }, { l: 'ArrowLeft', r: 'ArrowRight', lock: 'KeyK', rnd: 'KeyL' }].forEach((k, n) => {
    if (code === k.l) selMove(world, who(n), -1);
    else if (code === k.r) selMove(world, who(n), 1);
    else if (code === k.lock) selLock(world, who(n));
    else if (code === k.rnd) selRandom(world, who(n));
  });
  if (code === 'Enter' || code === 'Space') selLock(world, s.slot);
  else if (code === 'KeyR') selRandom(world, s.slot);
  else if (code === 'Tab') s.slot ^= 1;
}
function onKey(code) {
  const m = world.mode;
  if (code === 'Escape') {                      // in a match Esc opens the pause menu instead of quitting
    if (FIGHTING.includes(m)) pause(world); else if (m === 'pause') resume(world); else toMenu(world);
    return;
  }
  if (m === 'menu') {
    if (code === 'Digit1' || code === 'Numpad1') openSelect(world, false);
    if (code === 'Digit2' || code === 'Numpad2') openSelect(world, true);
  } else if (m === 'select') selectKey(code);
  else if (m === 'pause') {
    const n = PAUSE_ITEMS.length;
    if (code === 'ArrowUp' || code === 'KeyW') world.pm = (world.pm + n - 1) % n;
    else if (code === 'ArrowDown' || code === 'KeyS') world.pm = (world.pm + 1) % n;
    else if (code === 'Enter' || code === 'Space') pauseChoose(world, world.pm);
  } else if (m === 'match') {
    if (code === 'Enter') startMatch(world, world.twoP);
    else if (code === 'KeyC') openSelect(world, world.twoP);               // change fighters
  }
}
function onPoint(x, y) {
  const m = world.mode;
  if (m === 'menu') { if (y >= 220 && y < 284) openSelect(world, false); else if (y >= 284 && y < 350) openSelect(world, true); }
  else if (m === 'select') selectClick(world, x, y);
  else if (m === 'pause') pauseClick(world, x, y);
  else if (m === 'match') startMatch(world, world.twoP);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(world); });   // auto-pause when you switch tabs
initInput({ canvas, onKey, onPoint, unlock: unlockAudio });

let last = 0, acc = 0, errors = 0;
function frame(t) {
  try {
    if (world.mode !== 'fight' && world.mode !== 'end') clearEdges();      // don't carry menu clicks into the fight
    document.body.dataset.mode = world.mode;
    acc += Math.min(100, t - last); last = t;         // fixed 60 updates/sec on any screen refresh rate
    while (acc >= STEP) { step(world, readPlayer); acc -= STEP; }
    render(g, world);
  } catch (err) {
    console.error('Game error, returning to menu:', err);
    acc = 0; toMenu(world);
    if (++errors > 5) {                                // give up cleanly instead of looping forever
      g.fillStyle = '#120a1c'; g.fillRect(0, 0, W, H);
      text(g, 'Something went wrong.', W / 2, H / 2 - 10, 20);
      text(g, 'Please reload the page.', W / 2, H / 2 + 25, 14, '#ffd58a');
      return;
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

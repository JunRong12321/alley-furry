import { W, H, STEP } from './config.js';
import { createWorld, startMatch, toMenu, step, openSelect, cycle, confirm, selectClick } from './game.js';
import { readPlayer, initInput, clearEdges } from './input.js';
import { sfx, unlockAudio } from './audio.js';
import { render, text } from './render.js';

const canvas = document.getElementById('game');
const g = canvas.getContext('2d', { alpha: false, desynchronized: true });
const world = createWorld(sfx);

function onKey(code) {
  if (code === 'Escape') return toMenu(world);
  if (world.mode === 'menu') {
    if (code === 'Digit1' || code === 'Numpad1') openSelect(world, false);
    if (code === 'Digit2' || code === 'Numpad2') openSelect(world, true);
  } else if (world.mode === 'select') {
    if (code === 'ArrowLeft' || code === 'KeyA') cycle(world, -1);
    else if (code === 'ArrowRight' || code === 'KeyD') cycle(world, 1);
    else if (['Tab', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'].includes(code)) world.sel.slot ^= 1;
    else if (code === 'Enter') confirm(world);
  } else if (world.mode === 'match' && code === 'Enter') startMatch(world, world.twoP);
}
function onPoint(x, y) {
  if (world.mode === 'menu') { if (y >= 220 && y < 284) openSelect(world, false); else if (y >= 284 && y < 350) openSelect(world, true); }
  else if (world.mode === 'select') selectClick(world, x, y);
  else if (world.mode === 'match') startMatch(world, world.twoP);
}
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

import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, startMatch, step, openSelect, choose, cycle, confirm, selectClick } from '../src/game.js';
import { W, GY, CHARS, PORT } from '../src/config.js';

const idle = () => ({});
const mash = () => { const r = () => Math.random() < 0.3; return { l: r(), r: r(), u: r(), d: r(), p: r(), k: r(), s: r() }; };
function checkInvariants(w) {
  for (const f of w.fighters) {
    assert.ok([f.x, f.y, f.vx, f.vy, f.hp].every(Number.isFinite), 'numbers stay finite');
    assert.ok(f.hp >= 0 && f.hp <= f.maxHp, 'hp in range');
    assert.ok(f.x >= 40 && f.x <= W - 40 && f.y <= GY, 'fighter stays in the arena');
  }
}

test('intro switches to fight after two seconds', () => {
  const w = createWorld(); startMatch(w, false);
  for (let i = 0; i < 125; i++) step(w, idle);
  assert.equal(w.mode, 'fight');
});

test('every character can land punch, kick and special', () => {
  CHARS.forEach((ch, i) => {
    for (const key of ['p', 'k', 's']) {
      const w = createWorld(); startMatch(w, true, [i, 0]);
      w.mode = 'fight'; w.fighters[0].x = 400; w.fighters[1].x = 460;
      const target = w.fighters[1];
      for (let f = 0; f < 90; f++) step(w, n => (n === 0 && f === 0 ? { [key]: true } : {}));
      assert.ok(target.hp < target.maxHp, `${ch.name} ${key} should hit`);
    }
  });
});

test('character select: click picks, sides switch, fight starts', () => {
  const w = createWorld(); openSelect(w, true);
  selectClick(w, PORT.x0 + 5, PORT.y + 5);                       // first portrait -> P1
  assert.equal(w.sel.pick[0], 0); assert.equal(w.sel.slot, 1);
  cycle(w, 1);                                                    // first press shows fighter 0 for P2
  cycle(w, 1);                                                    // second press moves along the roster
  assert.equal(w.sel.pick[1], 1);
  confirm(w);
  assert.equal(w.mode, 'intro');
  assert.deepEqual(w.picks, [0, 1]);
});

test('random button mashing never corrupts the game (all fighter pairs, CPU and 2P)', () => {
  for (let i = 0; i < CHARS.length; i++) for (let j = 0; j < CHARS.length; j++) {
    const w = createWorld(); startMatch(w, j % 2 === 0, [i, j]);
    for (let n = 0; n < 2500; n++) {
      step(w, mash);
      if (w.mode === 'match') startMatch(w, w.twoP);
      checkInvariants(w);
    }
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, startMatch, step } from '../src/game.js';
import { W, GY } from '../src/config.js';

const idle = () => ({});

test('a landed punch reduces the opponent health', () => {
  const w = createWorld(); startMatch(w, true);
  w.mode = 'fight'; w.fighters[0].x = 480; w.fighters[1].x = 540;
  let frame = 0;
  for (; frame < 40; frame++) step(w, n => (n === 0 && frame === 0 ? { p: true } : {}));
  assert.ok(w.fighters[1].hp < 100);
});

test('intro switches to fight after two seconds', () => {
  const w = createWorld(); startMatch(w, false);
  for (let i = 0; i < 125; i++) step(w, idle);
  assert.equal(w.mode, 'fight');
});

test('random button mashing never corrupts the game state', () => {
  const rnd = () => Math.random() < 0.3;
  const mash = () => ({ l: rnd(), r: rnd(), u: rnd(), d: rnd(), p: rnd(), k: rnd(), s: rnd() });
  for (const twoP of [false, true]) {
    const w = createWorld(); startMatch(w, twoP);
    let rounds = 0, seen = new Set();
    for (let i = 0; i < 40000; i++) {
      step(w, mash); seen.add(w.mode);
      if (w.mode === 'match') { rounds++; startMatch(w, twoP); }
      for (const f of w.fighters) {
        assert.ok([f.x, f.y, f.vx, f.vy, f.hp].every(Number.isFinite), 'numbers stay finite');
        assert.ok(f.hp >= 0 && f.hp <= 100, 'hp in range');
        assert.ok(f.x >= 40 && f.x <= W - 40 && f.y <= GY, 'fighter stays in the arena');
      }
      assert.ok(w.time >= -1 && w.time <= 60, 'timer in range');
    }
    assert.ok(rounds > 0 && seen.has('end'), 'full matches were completed');
  }
});

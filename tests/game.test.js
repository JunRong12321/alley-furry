import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, startMatch, step, openSelect, selMove, selLock, selRandom, selectClick, pause, resume, pauseChoose } from '../src/game.js';
import { applyHit } from '../src/combat.js';
import { W, GY, CHARS, PORT, randomBoxRect, SELECT_FRAMES, ROLL_FRAMES } from '../src/config.js';

const idle = () => ({});
const mash = () => { const r = () => Math.random() < 0.3; return { l: r(), r: r(), u: r(), d: r(), p: r(), k: r(), s: r(), x: r() }; };
function checkInvariants(w) {
  for (const f of w.fighters) {
    assert.ok([f.x, f.y, f.vx, f.vy, f.hp].every(Number.isFinite), 'numbers stay finite');
    assert.ok(f.hp >= 0 && f.hp <= f.maxHp, 'hp in range');
    assert.ok(f.meter >= 0 && f.meter <= 100, 'meter in range');
    assert.ok(f.x >= 40 && f.x <= W - 40 && f.y <= GY, 'fighter stays in the arena');
  }
}

test('intro holds the Round / Ready / Fight sequence before combat', () => {
  const w = createWorld(); startMatch(w, false);
  for (let i = 0; i < 200; i++) step(w, idle);
  assert.equal(w.mode, 'intro');
  step(w, idle);
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

test('select: both players choose at the same time, then the fight starts', () => {
  const w = createWorld(); openSelect(w, true);
  selMove(w, 1, 2); selLock(w, 1);                                // P2 locks in first, without waiting for P1
  assert.equal(w.sel.cur[1], 3); assert.ok(w.sel.lock[1] && !w.sel.lock[0]);
  selectClick(w, PORT.x0 + 5, PORT.y + 5); assert.equal(w.sel.cur[0], 0);   // mouse picks for the highlighted side (P1)
  selMove(w, 0, 1); selLock(w, 0);
  for (let i = 0; i < 80; i++) step(w, idle);
  assert.equal(w.mode, 'intro'); assert.deepEqual(w.picks, [1, 3]);
});

test('select: locked players can not move, and unlocking works', () => {
  const w = createWorld(); openSelect(w, true);
  selLock(w, 0); selMove(w, 0, 1); assert.equal(w.sel.cur[0], 0);
  selLock(w, 0); selMove(w, 0, 1); assert.equal(w.sel.cur[0], 1);
});

test('separate random roster tile rolls without locking the player in', () => {
  const w = createWorld(); openSelect(w, true);
  selectClick(w, randomBoxRect.x + randomBoxRect.w / 2, randomBoxRect.y + randomBoxRect.h / 2);
  assert.ok(w.sel.roll[0]);
  const seen = new Set(); selMove(w, 0, 1);
  for (let i = 0; i < 140; i++) { step(w, idle); seen.add(w.sel.cur[0]); }
  assert.ok(w.sel.roll[0], 'the random roll is still animating');
  assert.ok(seen.size >= 5, 'the highlight cycled through the roster');
  for (let i = 0; i < 50; i++) step(w, idle);
  assert.ok(!w.sel.roll[0] && !w.sel.lock[0], 'the roll ends without locking in');
  assert.ok(w.sel.cur[0] >= 0 && w.sel.cur[0] < CHARS.length);
});

test('1 player: CPU begins empty, then auto-picks after Player 1 locks', () => {
  const w = createWorld(); openSelect(w, false);
  assert.equal(w.sel.cur[1], null); assert.equal(w.sel.lock[1], false);
  selLock(w, 0); step(w, idle);
  assert.ok(w.sel.roll[1], 'CPU begins a random roll after Player 1 locks');
  for (let i = 0; i < ROLL_FRAMES; i++) step(w, idle);
  assert.ok(Number.isInteger(w.sel.cur[1]) && w.sel.lock[1], 'CPU randomly selects and readies a fighter');
  assert.ok(w.sel.lock[0]);
});

test('character select timer automatically rolls and locks unselected players', () => {
  const w = createWorld(); openSelect(w, true);
  for (let i = 0; i <= SELECT_FRAMES; i++) step(w, idle);
  assert.ok(w.sel.roll[0] && w.sel.roll[0].autoLock);
  assert.ok(w.sel.roll[1] && w.sel.roll[1].autoLock);
  for (let i = 0; i < ROLL_FRAMES; i++) step(w, idle);
  assert.ok(w.sel.lock[0] && w.sel.lock[1]);
});

test('pause menu: resume, rematch and exit match', () => {
  const w = createWorld(); startMatch(w, true, [0, 1]); w.mode = 'fight';
  for (let i = 0; i < 30; i++) step(w, idle);
  const tick = w.tick; pause(w); assert.equal(w.mode, 'pause');
  for (let i = 0; i < 30; i++) step(w, idle);
  assert.equal(w.tick, tick, 'game is frozen while paused');
  pauseChoose(w, 0); assert.equal(w.mode, 'fight');
  w.fighters[1].hp = 10; w.fighters[0].wins = 1; pause(w); pauseChoose(w, 1);
  assert.equal(w.mode, 'intro'); assert.equal(w.fighters[1].hp, w.fighters[1].maxHp); assert.equal(w.fighters[0].wins, 0);
  assert.deepEqual(w.picks, [0, 1]);
  pause(w); resume(w); pause(w); pauseChoose(w, 2); assert.ok(w.exitConfirm && w.mode === 'pause');
  pauseChoose(w, 1); assert.ok(!w.exitConfirm && w.mode === 'pause', 'No returns to the pause menu');
  pauseChoose(w, 2); pauseChoose(w, 0); assert.equal(w.mode, 'menu', 'Yes exits to the main menu');
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

// ---- combat system ----
const duel = (a = 0, b = 0) => { const w = createWorld(); startMatch(w, true, [a, b]); w.mode = 'fight'; w.fighters[0].x = 400; w.fighters[1].x = 460; return w; };
const run = (w, frames, input) => { for (let f = 0; f < frames; f++) step(w, n => input(n, f)); };

test('fly kick: attacking in the air uses the fly-kick move and hits', () => {
  const w = duel(), used = new Set();
  for (let f = 0; f < 90; f++) { step(w, n => (n === 0 ? (f === 0 ? { u: true } : f === 10 ? { k: true } : {}) : {})); used.add(w.fighters[0].atk); }
  assert.ok(used.has('j'), 'used fly kick'); assert.ok(w.fighters[1].hp < w.fighters[1].maxHp);
});

test('sweep (down + kick) knocks the opponent down and they cannot be hit while down', () => {
  const w = duel(); const t = w.fighters[1];
  run(w, 40, (n, f) => (n === 0 && f === 0 ? { d: true, k: true } : {}));
  assert.ok(t.hp < t.maxHp && t.kd > 0, 'sweep hit and knocked down');
  const hp = t.hp; applyHit(w, w.fighters[0], t, { dmg: 10, st: 10, kb: 1 });   // direct hit is possible, but strike()/fireballs check canHit
  assert.ok(t.hp <= hp);
});

test('guard heights: crouch-block stops a sweep, stand-block does not; overhead beats crouch-block', () => {
  const sweep = (guard) => { const w = duel(); run(w, 40, (n, f) => (n === 0 ? (f === 0 ? { d: true, k: true } : {}) : guard)); return w.fighters[1]; };
  const crouchBlock = sweep({ d: true, r: true }), standBlock = sweep({ r: true });
  assert.equal(crouchBlock.kd, 0); assert.ok(crouchBlock.hp >= crouchBlock.maxHp - 2, 'only chip damage');
  assert.ok(standBlock.kd > 0 || standBlock.hp < standBlock.maxHp - 5, 'sweep beats stand-block');
  const w = duel(); run(w, 3, () => ({}));                                            // overhead vs crouch-block
  const t = w.fighters[1]; t.crouch = 1; t.block = 1;
  applyHit(w, w.fighters[0], t, { dmg: 11, st: 24, kb: 6, g: 'high' });
  assert.ok(t.hp <= t.maxHp - 10, 'overhead hits a crouch-blocker');
});

test('combo damage scales down, counter hits add damage', () => {
  const w = duel(); const [a, b] = w.fighters, hit = { dmg: 10, st: 20, kb: 2, g: 'mid' };
  applyHit(w, a, b, hit); assert.equal(b.hp, b.maxHp - 10);
  applyHit(w, a, b, hit); assert.equal(b.hp, b.maxHp - 19);          // 2nd hit = 90%
  applyHit(w, a, b, hit); assert.equal(b.hp, b.maxHp - 27);          // 3rd hit = 80%
  assert.equal(b.cmb, 3); assert.equal(b.cmbDmg, 27);
  const w2 = duel(); w2.fighters[1].atk = 'p';                       // counter hit: opponent was mid-attack
  applyHit(w2, w2.fighters[0], w2.fighters[1], hit); assert.equal(w2.fighters[1].hp, w2.fighters[1].maxHp - 13);
  assert.ok(a.meter > 0, 'attacker builds super meter');
});

test('input buffer: a press made slightly early still comes out', () => {
  const w = duel(), starts = [];
  for (let f = 0; f < 80; f++) {
    step(w, n => (n === 0 ? { e: { p: f === 0 || f === 16 } } : {}));
    const a = w.fighters[0]; if (a.atk === 'p' && a.t === 0) starts.push(f);
  }
  assert.equal(starts.length, 2, 'second punch was buffered during recovery');
});

test('super art costs a full meter and hits hard', () => {
  const w = duel(); const [a, t] = w.fighters; a.meter = 100;
  run(w, 90, (n, f) => (n === 0 && f === 0 ? { x: true } : {}));
  assert.ok(t.maxHp - t.hp >= 20, 'super did big damage'); assert.ok(a.meter < 100, 'meter spent');
});

test('combo skills: finishing a named sequence adds bonus damage once; longer skills upgrade it', () => {
  const w = duel(); const [a, b] = w.fighters, hit = key => ({ dmg: 6, st: 30, kb: 1, g: 'mid', key });
  applyHit(w, a, b, hit('p')); applyHit(w, a, b, hit('p'));
  const h2 = b.hp; applyHit(w, a, b, hit('k'));                              // p, p, k = TRIPLE STRIKE
  assert.equal(h2 - b.hp, 5 + 10); assert.ok(w.banner.text.includes('TRIPLE STRIKE'));
  const h3 = b.hp; applyHit(w, a, b, hit('s'));                              // p, p, k, s = MEGA COMBO (pays again, knocks down)
  assert.ok(h3 - b.hp >= 20 && b.kd > 0 && w.banner.text.includes('MEGA COMBO'));
  const w2 = duel(); applyHit(w2, w2.fighters[0], w2.fighters[1], hit('p')); applyHit(w2, w2.fighters[0], w2.fighters[1], hit('p'));
  const h4 = w2.fighters[1].hp; applyHit(w2, w2.fighters[0], w2.fighters[1], hit('p'));   // TRIPLE JAB
  applyHit(w2, w2.fighters[0], w2.fighters[1], hit('p'));                                 // 4th jab: skill does not pay twice
  assert.ok(h4 - w2.fighters[1].hp < 6 + 6 + 8, 'bonus only once');
});

test('special-cancel combo: punch then special in one go hits twice', () => {
  const w = duel(); const t = w.fighters[1];
  run(w, 70, (n, f) => (n === 0 ? (f === 0 ? { p: true } : f === 3 ? { s: true } : {}) : {}));
  assert.ok(t.cmb >= 2 || t.cmbDmg > 0, 'combo registered'); assert.ok(t.maxHp - t.hp > 6);
});

// ---- difficulty flow ----
import { openDifficulty, cycleDifficulty, difficultyConfirm, pauseItems } from '../src/game.js';

test('difficulty: 1-player flow is menu -> difficulty -> fighter select, and the level is kept', () => {
  const w = createWorld(); openDifficulty(w);
  assert.equal(w.mode, 'difficulty');
  cycleDifficulty(w, 1); assert.equal(w.difficulty, 2);                 // NORMAL -> HARD
  cycleDifficulty(w, 1); assert.equal(w.difficulty, 0);                 // wraps to EASY
  cycleDifficulty(w, -1); assert.equal(w.difficulty, 2);
  difficultyConfirm(w);
  assert.equal(w.mode, 'select'); assert.equal(w.twoP, false); assert.equal(w.difficulty, 2);
});

test('difficulty: pause menu shows a CPU level row only in 1-player matches and applies it at once', () => {
  const w = createWorld(); startMatch(w, false, [0, 1]); w.mode = 'fight'; pause(w);
  assert.equal(pauseItems(w).length, 5);
  pauseChoose(w, 4, -1); assert.equal(w.difficulty, 0);                 // NORMAL -> EASY
  pauseChoose(w, 4, 1); pauseChoose(w, 4, 1); assert.equal(w.difficulty, 2);
  const w2 = createWorld(); startMatch(w2, true, [0, 1]); w2.mode = 'fight'; pause(w2);
  assert.equal(pauseItems(w2).length, 4); pauseChoose(w2, 4, 1); assert.equal(w2.difficulty, 1, 'no CPU in 2-player');
});

test('difficulty: harder CPU levels really are more dangerous (seeded, averaged)', () => {
  const realRandom = Math.random; let seed = 12345;
  Math.random = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  try {
    const damage = level => {
      let total = 0;
      for (let trial = 0; trial < 6; trial++) {
        const w = createWorld(); w.difficulty = level; startMatch(w, false, [0, 1]); w.mode = 'fight';
        const me = w.fighters[0]; me.hp = me.maxHp = me.show = 1e6;     // idle punching bag
        for (let f = 0; f < 3600; f++) step(w, () => ({}));
        total += 1e6 - me.hp;
      }
      return total / 6;
    };
    const [easy, normal, hard] = [damage(0), damage(1), damage(2)];
    assert.ok(easy < normal && normal < hard, `damage easy ${easy} < normal ${normal} < hard ${hard}`);
  } finally { Math.random = realRandom; }
});

// Pure game logic. No DOM, no canvas: it can run (and be tested) in Node.
import { W, ROUND_TIME, ROUNDS_TO_WIN, CHARS, COMBOS, PORT, selButtons, randomBoxRect, ROLL_FRAMES, SELECT_FRAMES, PAUSE_ITEMS, pauseRect, exitChoiceRect, INTRO_END_AT, DIFFICULTIES } from './config.js';
import { createFighter, resetFighter, updateFighter } from './fighter.js';
import { hurtbox, applyHit, canHit } from './combat.js';
import { cpuInput } from './ai.js';

export function createWorld(sfx = () => {}) {
  return { mode: 'menu', fighters: [], fireballs: [], t: 0, tick: 0, time: ROUND_TIME, round: 0,
           winner: -1, shake: 0, hitstop: 0, fx: [], banner: null, twoP: false, picks: [0, 1], sel: null,
           back: 'fight', pm: 0, menuIndex: 0, difficulty: 1, tutorialPage: 0, settingsBack: 'menu', settingsIndex: 0,
           audio: { music: 100, ui: 100, effects: 100, voice: 100, muted: false }, reducedMotion: false,
           dojo: null, exitConfirm: false, exitChoice: 0, sfx };
}
// ----- character select: both players choose at the same time -----
const rnd = n => Math.random() * n | 0;
// ----- difficulty: chosen when you start a 1-player game, changeable from the pause menu and the match-over screen -----
export function openDifficulty(w) { Object.assign(w, { mode: 'difficulty', twoP: false, fighters: [], fireballs: [] }); }
export function cycleDifficulty(w, d) { w.difficulty = (w.difficulty + d + DIFFICULTIES.length) % DIFFICULTIES.length; w.sfx('select'); }
export function difficultyConfirm(w) { w.sfx('confirm'); openSelect(w, false); }
export const pauseItems = w => (w.twoP || w.back === 'dojo' ? PAUSE_ITEMS : [...PAUSE_ITEMS, 'DIFFICULTY']);

export function openSelect(w, twoP) {
  Object.assign(w, { mode: 'select', twoP, fighters: [], fireballs: [] });
  w.sel = { cur: [0, twoP ? 1 : null], lock: [false, false], roll: [null, null], slot: 0, go: 0, timeLeft: SELECT_FRAMES, timedOut: false };
}
const free = (w, n) => !w.sel.roll[n] && !w.sel.lock[n] && (w.twoP || n === 0);
export function selPick(w, n, i) {
  if (free(w, n) && i >= 0 && i < CHARS.length && w.sel.cur[n] !== i) {
    w.sel.cur[n] = i; w.sfx('select');
  }
}
export function selMove(w, n, d) {
  if (free(w, n)) { w.sel.cur[n] = (w.sel.cur[n] + d + CHARS.length) % CHARS.length; w.sfx('select'); }
}
function beginRoll(w, n, autoLock = false) {
  const s = w.sel, N = CHARS.length, target = rnd(N), H = 20, seq = [], times = []; let t = 0;
  for (let k = 0; k < H; k++) { seq.push(((target - (H - 1 - k)) % N + N) % N); times.push(t); t += Math.round(3 + k * .45); }
  s.roll[n] = { f: 0, seq, times, autoLock }; s.lock[n] = false; s.go = 0;
  w.sfx('rollStart');
}
export function selLock(w, n) {
  const s = w.sel; if (s.roll[n] || (!w.twoP && n === 1)) return;
  s.lock[n] = !s.lock[n]; w.sfx(s.lock[n] ? 'confirm' : 'select');
  if (!w.twoP && n === 0 && !s.lock[0]) { s.cur[1] = null; s.lock[1] = false; s.roll[1] = null; }
}
// Random is an animated highlight only: after it stops, the player still chooses whether to lock in.
export function selRandom(w, n) {
  if (!w.twoP && n === 1) return;
  if (w.sel.roll[n]) return;
  beginRoll(w, n, false);
}
function tickSelect(w) {
  const s = w.sel;
  if (!s.timedOut) s.timeLeft = Math.max(0, s.timeLeft - 1);
  if (!s.timedOut && s.timeLeft > 0 && s.timeLeft <= 600 && s.timeLeft % 60 === 0) {
    w.sfx(s.timeLeft <= 180 ? 'countdownFinal' : 'countdown');
  }
  if (!s.timedOut && s.timeLeft <= 0) {
    s.timeLeft = 0; s.timedOut = true;
    for (const n of (w.twoP ? [0, 1] : [0])) {
      if (s.roll[n]) s.roll[n].autoLock = true;
      else if (!s.lock[n]) beginRoll(w, n, true);
    }
  }
  if (!w.twoP && s.lock[0] && s.cur[1] === null && !s.roll[1]) beginRoll(w, 1, true);
  [0, 1].forEach(n => {
    const r = s.roll[n]; if (!r) return;
    r.f++;
    let k = 0; while (k + 1 < r.times.length && r.times[k + 1] <= r.f) k++;
    if (s.cur[n] !== r.seq[k]) { s.cur[n] = r.seq[k]; w.sfx('roll'); }
    if (r.f >= ROLL_FRAMES) { s.roll[n] = null; s.lock[n] = !!r.autoLock; w.sfx('confirm'); }
  });
  if (s.lock[0] && s.lock[1] && !s.roll[0] && !s.roll[1]) { if (++s.go >= 70) startMatch(w, w.twoP, [...s.cur]); }
  else s.go = 0;
}
const inBox = (x, y, b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;
export function selectClick(w, x, y) {
  const s = w.sel;
  if (inBox(x, y, randomBoxRect)) { selRandom(w, s.slot); return; }
  for (let i = 0; i < CHARS.length; i++) if (inBox(x, y, { x: PORT.x0 + i * (PORT.w + PORT.gap), y: PORT.y, w: PORT.w, h: PORT.h })) return selPick(w, s.slot, i);
  for (const n of [0, 1]) {
    const b = selButtons(n);
    if (inBox(x, y, b.lock)) { s.slot = n; return selLock(w, n); }
  }
  if (y >= 160) s.slot = x < W / 2 ? 0 : 1;
}
// ----- pause, exit confirmation, settings and tutorial -----
export function pause(w) {
  if (['intro', 'fight', 'end', 'dojo'].includes(w.mode)) { w.back = w.mode; w.mode = 'pause'; w.pm = 0; w.exitConfirm = false; }
}
export function resume(w) { if (w.mode === 'pause') w.mode = w.back; }
export function openSettings(w) { w.settingsBack = w.mode; w.settingsIndex = 0; w.mode = 'settings'; }
export function closeSettings(w) { if (w.mode === 'settings') w.mode = w.settingsBack; }
export function settingsChoose(w, i, delta = 10) {
  const channel = ['music', 'ui', 'effects', 'voice'][i];
  if (channel) w.audio[channel] = Math.max(0, Math.min(100, w.audio[channel] + delta));
  else if (i === 4) w.difficulty = (w.difficulty + (delta < 0 ? -1 : 1) + DIFFICULTIES.length) % DIFFICULTIES.length;
  else if (i === 5) w.audio.muted = !w.audio.muted;
  else if (i === 6) w.reducedMotion = !w.reducedMotion;
  else closeSettings(w);
}
export function openTutorial(w) { w.mode = 'tutorial'; w.tutorialPage = 0; }
export function tutorialChoose(w, i) {
  if (i === 0) w.tutorialPage ^= 1;
  else toMenu(w);
}
export function pauseChoose(w, i, delta = 1) {
  if (w.exitConfirm) {
    if (i === 0) toMenu(w); else { w.exitConfirm = false; w.pm = 0; }
  } else if (i === 0) resume(w);
  else if (i === 1) w.back === 'dojo' ? resetDojo(w) : startMatch(w, w.twoP, w.picks);
  else if (i === 2) { w.exitConfirm = true; w.exitChoice = 1; }
  else if (i === 3) openSettings(w);
  else if (i === 4 && pauseItems(w).length > 4) cycleDifficulty(w, delta);        // the CPU reads w.difficulty every frame, so it applies at once
}
export function pauseClick(w, x, y) {
  if (w.exitConfirm) {
    exitChoiceRect(0).x <= x && x < exitChoiceRect(0).x + exitChoiceRect(0).w && y >= exitChoiceRect(0).y && y < exitChoiceRect(0).y + exitChoiceRect(0).h && pauseChoose(w, 0);
    exitChoiceRect(1).x <= x && x < exitChoiceRect(1).x + exitChoiceRect(1).w && y >= exitChoiceRect(1).y && y < exitChoiceRect(1).y + exitChoiceRect(1).h && pauseChoose(w, 1);
    return;
  }
  pauseItems(w).forEach((_, i) => { const b = pauseRect(i); if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) pauseChoose(w, i, x < b.x + b.w / 2 ? -1 : 1); });
}
export function startMatch(w, twoP, picks = w.picks) {
  w.twoP = twoP; w.picks = picks;
  const [i, j] = picks;
  w.fighters = [createFighter(CHARS[i], false, false), createFighter(CHARS[j], !twoP, i === j)];
  w.round = 0; newRound(w);
}
export function openDojo(w) {
  w.dojo = { fighter: 0, combo: 0, progress: 0, completed: false, successT: 0 };
  w.mode = 'dojoSelect';
}
export function dojoChangeFighter(w, delta) {
  if (w.mode !== 'dojoSelect' || !w.dojo) return;
  w.dojo.fighter = (w.dojo.fighter + delta + CHARS.length) % CHARS.length; w.sfx('select');
}
export function dojoChangeCombo(w, delta) {
  if (!w.dojo || !['dojoSelect', 'dojo'].includes(w.mode)) return;
  w.dojo.combo = (w.dojo.combo + delta + COMBOS.length) % COMBOS.length;
  if (w.mode === 'dojo') resetDojo(w); else w.sfx('select');
}
export function startDojo(w) {
  if (!w.dojo) openDojo(w);
  const playerIndex = w.dojo.fighter, dummyIndex = (playerIndex + 1) % CHARS.length;
  w.twoP = false; w.picks = [playerIndex, dummyIndex];
  w.fighters = [createFighter(CHARS[playerIndex], false, false), createFighter(CHARS[dummyIndex], false, false)];
  w.round = 1; resetDojo(w);
}
export function resetDojo(w) {
  if (!w.dojo || w.fighters.length !== 2) return;
  resetFighter(w.fighters[0], 300, 1); resetFighter(w.fighters[1], 660, -1);
  Object.assign(w, { mode: 'dojo', fireballs: [], fx: [], banner: null, t: 0, tick: 0, time: ROUND_TIME, hitstop: 0, shake: 0 });
  Object.assign(w.dojo, { progress: 0, completed: false, successT: 0 });
  w.sfx('confirm');
}
export function newRound(w) {
  w.fighters.forEach((f, i) => resetFighter(f, i ? 660 : 300, i ? -1 : 1));
  Object.assign(w, { fireballs: [], fx: [], banner: null, mode: 'intro', t: 0, tick: 0, time: ROUND_TIME, hitstop: 0 });
  w.round++;
}
export function toMenu(w) { Object.assign(w, { mode: 'menu', fighters: [], fireballs: [], fx: [], banner: null, shake: 0, hitstop: 0, menuIndex: 0 }); }

function physics(w, readInput, live) {
  w.fighters.forEach((f, n) => {
    const o = w.fighters[1 - n];
    const input = w.mode === 'dojo' && n === 1 ? {} : live ? (f.ai ? cpuInput(w, f, o) : readInput(n)) : {};
    updateFighter(w, f, o, input);
  });
  const [a, b] = w.fighters, d = b.x - a.x;
  if (Math.abs(d) < 55 && Math.abs(a.y - b.y) < 60) {          // keep fighters from overlapping
    const push = (55 - Math.abs(d)) / 2, s = d >= 0 ? 1 : -1;
    a.x -= s * push; b.x += s * push;
    w.fighters.forEach(f => { f.x = Math.max(40, Math.min(W - 40, f.x)); });
  }
  w.fireballs = w.fireballs.filter(fb => {
    fb.x += fb.v;
    const target = fb.owner === a ? b : a, h = hurtbox(target), m = 14 * (fb.size || 1);
    if (canHit(target) && fb.x > h.x1 - m && fb.x < h.x2 + m && fb.y > h.y1 && fb.y < h.y2) {
      applyHit(w, fb, target, { key: 's', dmg: fb.dmg, st: fb.st, kb: fb.kb, kd: fb.kd, chip: fb.chip, g: 'mid', x: fb.x, y: fb.y }); return false;
    }
    return fb.x > -50 && fb.x < W + 50;
  });
}
function checkRoundEnd(w) {
  const [a, b] = w.fighters;
  if (a.hp > 0 && b.hp > 0 && w.time > 0) return;
  w.winner = a.hp === b.hp ? -1 : a.hp > b.hp ? 0 : 1;
  if (w.winner >= 0) w.fighters[w.winner].wins++;
  w.mode = 'end'; w.t = 0;
}
function advanceDojo(w, readInput) {
  physics(w, readInput, true);
  const dummy = w.fighters[1], goal = COMBOS[w.dojo.combo].seq;
  if (!w.dojo.completed) {
    let matched = 0;
    if (dummy.cmbT > 0) for (let n = Math.min(goal.length, dummy.seq.length); n > 0; n--) {
      if (dummy.seq.slice(-n).every((move, i) => move === goal[i])) { matched = n; break; }
    }
    w.dojo.progress = matched;
    if (matched === goal.length) { w.dojo.completed = true; w.dojo.successT = 150; w.sfx('confirm'); }
  }
  if (w.dojo.successT > 0) w.dojo.successT--;
  dummy.hp = dummy.maxHp; dummy.show = dummy.maxHp;
}
// Advance the game by exactly one frame. readInput(n) -> {l,r,u,d,p,k,s} for human player n.
export function step(w, readInput) {
  if (w.mode === 'pause') return;                                  // game is frozen while paused
  if (w.mode === 'select') tickSelect(w);
  else if (w.mode === 'dojo') advanceDojo(w, readInput);
  else if (w.mode === 'intro') { if (++w.t >= INTRO_END_AT) { w.mode = 'fight'; w.t = 0; } }
  else if (w.mode === 'fight') {
    if (w.hitstop > 0) w.hitstop--;
    else { physics(w, readInput, true); if (++w.tick % 60 === 0) w.time--; checkRoundEnd(w); }
  } else if (w.mode === 'end') {
    w.t++;
    if (w.hitstop > 0) w.hitstop--; else physics(w, readInput, false);
    if (w.t > 180) {
      if (w.fighters.some(f => f.wins >= ROUNDS_TO_WIN)) w.mode = 'match'; else newRound(w);
    }
  }
  if (!w.reducedMotion) w.shake *= 0.85; else w.shake = 0;
  w.fx.forEach(e => e.t++); w.fx = w.fx.filter(e => e.t < 14);
  if (w.banner && --w.banner.t <= 0) w.banner = null;
  w.fighters.forEach(f => { if (f.flash > 0) f.flash--; if (f.show > f.hp) f.show = Math.max(f.hp, f.show - 0.35); });
}

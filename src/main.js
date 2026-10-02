import { W, H, STEP, THEMES, MENU_BUTTONS, diffCardRect, MATCH_DIFF, DOJO_START, DOJO_FIGHTER_PREV, DOJO_FIGHTER_NEXT, dojoComboRect, SETTINGS_ITEMS, settingsRect, settingSliderRect, INTRO_ROUND_AT, INTRO_READY_AT, INTRO_FIGHT_AT } from './config.js';
import { themeMove, themePick, themeRandom, themeConfirm, themeClick, openDifficulty, cycleDifficulty, difficultyConfirm, pauseItems, createWorld, startMatch, toMenu, step, openSelect, selMove, selLock, selRandom, selectClick, pause, resume, pauseChoose, pauseClick, openSettings, closeSettings, settingsChoose, openTutorial, tutorialChoose, openDojo, dojoChangeFighter, dojoChangeCombo, startDojo, resetDojo } from './game.js';
import { readPlayer, initInput, clearEdges, pollGamepads } from './input.js';
import { sfx, announcer, announceWinner, getAudioPreferences, unlockAudio, setAudioPreferences, setAudioMode } from './audio.js';
import { render } from './render.js';

const canvas = document.getElementById('game');
const g = canvas.getContext('2d', { alpha: false, desynchronized: true });
const world = createWorld(sfx);
world.audio = getAudioPreferences();
try { world.reducedMotion = localStorage.getItem('pixel-brawl-reduced-motion') === 'true'; } catch {}
let savedDifficulty = world.difficulty;                         // the last used CPU level is remembered between visits
try { const v = Number(localStorage.getItem('pixel-brawl-difficulty')); if (Number.isInteger(v) && v >= 0 && v <= 2) world.difficulty = savedDifficulty = v; } catch {}
let savedTheme = world.theme;
try { const v = Number(localStorage.getItem('pixel-brawl-theme')); if (Number.isInteger(v) && v >= 0 && v < THEMES.length) world.theme = savedTheme = v; } catch {}

const FIGHTING = ['intro', 'fight', 'end', 'dojo'];
const inBox = (x, y, b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;
const syncAudio = () => setAudioPreferences(world.audio);
let lastMusicScene = '';
function updateMusicScene() {
  let scene = world.mode;
  if (scene === 'pause') scene = world.back;
  else if (scene === 'settings') scene = world.settingsBack === 'pause' ? world.back : world.settingsBack;
  const next = FIGHTING.includes(scene) || scene === 'theme' ? 'fight' : 'menu', key = next + world.theme;
  if (key !== lastMusicScene) { lastMusicScene = key; setAudioMode(next, world.theme); }
}
const unlock = () => { unlockAudio(); syncAudio(); updateMusicScene(); };
function selectKey(code) {
  const s = world.sel, slot = n => world.twoP ? n : 0;
  [{ l: 'KeyA', r: 'KeyD', lock: 'KeyF' }, { l: 'ArrowLeft', r: 'ArrowRight', lock: 'KeyK' }].forEach((k, n) => {
    if (code === k.l) selMove(world, slot(n), -1);
    else if (code === k.r) selMove(world, slot(n), 1);
    else if (code === k.lock) selLock(world, slot(n));
  });
  if (code === 'Enter' || code === 'Space') selLock(world, s.slot);
  else if (code === 'KeyR') selRandom(world, s.slot);
  else if (code === 'KeyJ' || code === 'Quote') selRandom(world, s.slot);
  else if (code === 'Tab' && world.twoP) s.slot ^= 1;
}
function activateMenu(index) {
  if (index === 0) openDifficulty(world);                       // 1 player: choose the CPU level first
  else if (index === 1) openSelect(world, true);
  else if (index === 2) openDojo(world);
  else if (index === 3) openTutorial(world);
  else if (index === 4) openSettings(world);
}
function onKey(code) {
  const m = world.mode;
  if (code === 'Escape') {
    if (FIGHTING.includes(m)) pause(world);
    else if (m === 'pause') { if (world.exitConfirm) world.exitConfirm = false; else resume(world); }
    else if (m === 'settings') closeSettings(world);
    else if (m === 'select' && !world.twoP) openDifficulty(world);  // back one step
    else if (m === 'theme') openSelect(world, world.twoP);
    else toMenu(world);
    return;
  }
  if (m === 'menu') {
    if (code === 'Digit1' || code === 'Numpad1') openDifficulty(world);
    else if (code === 'Digit2' || code === 'Numpad2') openSelect(world, true);
    else if (code === 'KeyO') openDojo(world);
    else if (code === 'KeyT') openTutorial(world);
    else if (code === 'ArrowUp' || code === 'KeyW') world.menuIndex = (world.menuIndex + 5 - 1) % 5;
    else if (code === 'ArrowDown' || code === 'KeyS') world.menuIndex = (world.menuIndex + 1) % 5;
    else if (code === 'ArrowLeft' || code === 'KeyA' || code === 'ArrowRight' || code === 'KeyD') {
      const delta = code === 'ArrowLeft' || code === 'KeyA' ? -1 : 1;
      world.menuIndex = (world.menuIndex + 5 + delta) % 5;
    } else if (code === 'Enter' || code === 'Space' || code === 'KeyF') activateMenu(world.menuIndex);
  } else if (m === 'difficulty') {
    if (code === 'ArrowLeft' || code === 'KeyA' || code === 'ArrowUp' || code === 'KeyW') cycleDifficulty(world, -1);
    else if (code === 'ArrowRight' || code === 'KeyD' || code === 'ArrowDown' || code === 'KeyS') cycleDifficulty(world, 1);
    else if (/^(Digit|Numpad)[1-3]$/.test(code)) { world.difficulty = Number(code.slice(-1)) - 1; difficultyConfirm(world); }
    else if (code === 'Enter' || code === 'Space' || code === 'KeyF' || code === 'KeyK') difficultyConfirm(world);
  } else if (m === 'select') selectKey(code);
  else if (m === 'theme') {
    if (code === 'ArrowLeft' || code === 'KeyA' || code === 'ArrowUp' || code === 'KeyW') themeMove(world, -1);
    else if (code === 'ArrowRight' || code === 'KeyD' || code === 'ArrowDown' || code === 'KeyS') themeMove(world, 1);
    else if (/^(Digit|Numpad)[1-5]$/.test(code)) themePick(world, Number(code.slice(-1)) - 1);
    else if (code === 'KeyR' || code === 'KeyJ' || code === 'Quote') themeRandom(world);
    else if (code === 'Enter' || code === 'Space' || code === 'KeyF' || code === 'KeyK') themeConfirm(world);
  }
  else if (m === 'dojoSelect') {
    if (code === 'ArrowLeft' || code === 'KeyA') dojoChangeFighter(world, -1);
    else if (code === 'ArrowRight' || code === 'KeyD') dojoChangeFighter(world, 1);
    else if (code === 'ArrowUp' || code === 'KeyW') dojoChangeCombo(world, -1);
    else if (code === 'ArrowDown' || code === 'KeyS') dojoChangeCombo(world, 1);
    else if (code === 'Enter' || code === 'Space' || code === 'KeyF' || code === 'KeyK') startDojo(world);
  } else if (m === 'dojo') {
    if (code === 'KeyR') resetDojo(world);
    else if (code === 'BracketLeft' || code === 'KeyQ') dojoChangeCombo(world, -1);
    else if (code === 'BracketRight' || code === 'KeyE' || code === 'KeyN') dojoChangeCombo(world, 1);
  }
  else if (m === 'pause') {
    if (world.exitConfirm) {
      if (code === 'ArrowLeft' || code === 'ArrowRight' || code === 'KeyA' || code === 'KeyD') world.exitChoice ^= 1;
      else if (code === 'Enter' || code === 'Space') pauseChoose(world, world.exitChoice);
    } else {
      const n = pauseItems(world).length;
      if (code === 'ArrowUp' || code === 'KeyW') world.pm = (world.pm + n - 1) % n;
      else if (code === 'ArrowDown' || code === 'KeyS') world.pm = (world.pm + 1) % n;
      else if (world.pm === 4 && (code === 'ArrowLeft' || code === 'KeyA')) pauseChoose(world, 4, -1);
      else if (world.pm === 4 && (code === 'ArrowRight' || code === 'KeyD')) pauseChoose(world, 4, 1);
      else if (code === 'Enter' || code === 'Space') pauseChoose(world, world.pm);
    }
  } else if (m === 'settings') {
    const n = SETTINGS_ITEMS.length;
    if (code === 'ArrowUp' || code === 'KeyW') world.settingsIndex = (world.settingsIndex + n - 1) % n;
    else if (code === 'ArrowDown' || code === 'KeyS') world.settingsIndex = (world.settingsIndex + 1) % n;
    else if (code === 'ArrowLeft' || code === 'ArrowRight' || code === 'Enter' || code === 'Space') {
      const direction = code === 'ArrowLeft' ? -10 : 10;
      if (world.settingsIndex < 4) { settingsChoose(world, world.settingsIndex, direction); sfx('tick'); syncAudio(); }
      else if (world.settingsIndex === 4) { settingsChoose(world, 4, direction); sfx('tick'); }
      else if (world.settingsIndex === 5) { settingsChoose(world, 5); syncAudio(); }
      else if (world.settingsIndex === 6) { settingsChoose(world, 6); try { localStorage.setItem('pixel-brawl-reduced-motion', String(world.reducedMotion)); } catch {} }
      else closeSettings(world);
    }
  } else if (m === 'tutorial') {
    if (code === 'ArrowLeft' || code === 'ArrowRight' || code === 'Enter' || code === 'Space') tutorialChoose(world, 0);
  } else if (m === 'match') {
    if (code === 'Enter') startMatch(world, world.twoP);
    else if (code === 'KeyC') openSelect(world, world.twoP);
    else if (code === 'KeyD' && !world.twoP) cycleDifficulty(world, 1);        // change the CPU level before the rematch
  }
}
function onPoint(x, y) {
  const m = world.mode;
  if (m === 'menu') {
    if (inBox(x, y, MENU_BUTTONS.one)) { world.menuIndex = 0; openDifficulty(world); }
    else if (inBox(x, y, MENU_BUTTONS.two)) { world.menuIndex = 1; openSelect(world, true); }
    else if (inBox(x, y, MENU_BUTTONS.dojo)) { world.menuIndex = 2; openDojo(world); }
    else if (inBox(x, y, MENU_BUTTONS.tutorial)) { world.menuIndex = 3; openTutorial(world); }
    else if (inBox(x, y, MENU_BUTTONS.settings)) { world.menuIndex = 4; openSettings(world); }
  } else if (m === 'select') {
    if (x < 110 && y < 50) { if (world.twoP) toMenu(world); else openDifficulty(world); } else selectClick(world, x, y);
  } else if (m === 'theme') {
    if (x < 110 && y < 50) openSelect(world, world.twoP); else themeClick(world, x, y);
  } else if (m === 'difficulty') {
    if (x < 110 && y < 50) toMenu(world);
    else for (let i = 0; i < 3; i++) if (inBox(x, y, diffCardRect(i))) { world.difficulty = i; difficultyConfirm(world); return; }
  } else if (m === 'pause') pauseClick(world, x, y);
  else if (m === 'dojoSelect') {
    if (x < 110 && y < 50) toMenu(world);
    else if (inBox(x, y, DOJO_FIGHTER_PREV)) dojoChangeFighter(world, -1);
    else if (inBox(x, y, DOJO_FIGHTER_NEXT)) dojoChangeFighter(world, 1);
    else if (inBox(x, y, DOJO_START)) startDojo(world);
    else for (let i = 0; i < 8; i++) if (inBox(x, y, dojoComboRect(i))) { world.dojo.combo = i; sfx('select'); return; }
  } else if (m === 'dojo') {
    if (x < 110 && y < 50) pause(world);
    else if (y < 210 && x < 320) dojoChangeCombo(world, -1);
    else if (y < 210 && x > 640) dojoChangeCombo(world, 1);
    else if (y > 470 && x < W / 2) resetDojo(world);
    else if (y > 470) dojoChangeCombo(world, 1);
  }
  else if (m === 'settings') {
    for (let i = 0; i < SETTINGS_ITEMS.length; i++) if (inBox(x, y, settingsRect(i))) {
      world.settingsIndex = i;
      if (i < 4) {
        const slider = settingSliderRect(i), channel = ['music', 'ui', 'effects', 'voice'][i];
        if (x >= slider.x && x <= slider.x + slider.w) world.audio[channel] = Math.round(100 * (x - slider.x) / slider.w);
        else settingsChoose(world, i, x < slider.x ? -10 : 10);
        syncAudio();
      } else if (i === 4) { settingsChoose(world, 4, x < settingsRect(i).x + settingsRect(i).w / 2 ? -1 : 1); sfx('tick'); }   // fixed: `b` was undefined here and crashed this click
      else if (i === 5) { settingsChoose(world, 5); syncAudio(); }
      else if (i === 6) { settingsChoose(world, 6); try { localStorage.setItem('pixel-brawl-reduced-motion', String(world.reducedMotion)); } catch {} }
      else closeSettings(world);
      return;
    }
  } else if (m === 'tutorial') {
    if (y >= 438 && x >= 490) tutorialChoose(world, 1);
    else if (x < 480 && y >= 438) tutorialChoose(world, 0);
  } else if (m === 'match') { if (!world.twoP && inBox(x, y, MATCH_DIFF)) cycleDifficulty(world, 1); else startMatch(world, world.twoP); }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(world); });
initInput({ canvas, onKey, onPoint, unlock });

let last = 0, acc = 0, errors = 0;
function frame(t) {
  try {
    pollGamepads({ onKey, getMode: () => world.mode, unlock });
    if (world.mode !== 'fight' && world.mode !== 'end' && world.mode !== 'dojo') clearEdges();
    document.body.dataset.mode = world.mode;
    acc += Math.min(100, t - last); last = t;
    while (acc >= STEP) {
      const previousMode = world.mode;
      step(world, readPlayer);
      if (world.mode === 'intro') {
        if (world.t === INTRO_ROUND_AT) announcer(`round${Math.min(3, world.round)}`);
        else if (world.t === INTRO_READY_AT) announcer('ready');
        else if (world.t === INTRO_FIGHT_AT) announcer('fight');
      } else if (world.mode === 'end' && previousMode !== 'end') {
        if (world.winner < 0) announcer('tie');
        else announceWinner(world.fighters[world.winner].name);
      }
      acc -= STEP;
    }
    if (world.difficulty !== savedDifficulty) { savedDifficulty = world.difficulty; try { localStorage.setItem('pixel-brawl-difficulty', String(savedDifficulty)); } catch {} }
    if (world.theme !== savedTheme) { savedTheme = world.theme; try { localStorage.setItem('pixel-brawl-theme', String(savedTheme)); } catch {} }
    updateMusicScene();
    render(g, world);
  } catch (err) {
    console.error('Game error, returning to menu:', err);
    acc = 0; toMenu(world);
    if (++errors > 5) {
      g.fillStyle = '#120a1c'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '20px monospace'; g.fillText('Something went wrong. Please reload.', W / 2, H / 2);
      return;
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

import { THEMES } from './config.js';

// Locally bundled CC0 music and effects keep the game audible without remote hosting.
const audioAsset = file => new URL(`../assets/audio/${file}`, import.meta.url).href;
const menuTrack = document.getElementById('menu-bgm');
menuTrack.volume = .18;
menuTrack.loop = true;
// One battle track per stage theme; only the chosen theme is streamed.
const themeTracks = THEMES.map(theme => {
  const track = new Audio(audioAsset(theme.music));
  track.preload = 'none'; track.loop = !theme.loopAt;
  if (theme.loopAt) track.addEventListener('ended', () => {
    if (!unlocked || !prefs.music || prefs.muted || activeTrack() !== track) return;
    track.currentTime = theme.loopAt; // authored loop point
    track.play().catch(() => {});
  });
  return track;
});
const allTracks = [menuTrack, ...themeTracks];

const clips = {
  select: ['select_001.ogg', .34],
  confirm: ['confirmation_001.ogg', .44],
  tick: ['tick_001.ogg', .22],
  rollStart: ['select_001.ogg', .38],
  roll: ['tick_001.ogg', .32],
  countdown: ['tick_001.ogg', .28],
  countdownFinal: ['confirmation_001.ogg', .48],
  attack: ['impactPunch_medium_000.ogg', .35],
  kick: ['impactPunch_medium_001.ogg', .4],
  hit: ['impactPunch_heavy_000.ogg', .48],
  special: ['impactPunch_heavy_001.ogg', .42],
  combo: ['impactPunch_heavy_002.ogg', .52],
  ko: ['impactPunch_heavy_003.ogg', .6],
  block: ['impactSoft_medium_000.ogg', .4],
};
const players = Object.fromEntries(Object.entries(clips).map(([name, [file, volume]]) => {
  const player = new Audio(audioAsset(file)); player.preload = 'auto'; player.volume = volume;
  return [name, player];
}));

const voices = {
  round1: ['announcer_round_1.ogg', .78],
  round2: ['announcer_round_2.ogg', .78],
  round3: ['announcer_round_3.ogg', .78],
  ready: ['announcer_ready.ogg', .72],
  fight: ['announcer_fight.ogg', .82],
  win: ['announcer_you_win.ogg', .78],
  tie: ['announcer_tie.ogg', .72],
};
const voicePlayers = Object.fromEntries(Object.entries(voices).map(([name, [file, volume]]) => {
  const player = new Audio(audioAsset(file)); player.preload = 'auto'; player.volume = volume;
  return [name, player];
}));

let unlocked = false;
let mode = 'menu', theme = 0;
const activeTrack = () => (mode === 'menu' ? menuTrack : themeTracks[theme] || themeTracks[0]);
const defaultPrefs = { music: 100, ui: 100, effects: 100, voice: 100, muted: false };
const volumeKeys = ['music', 'ui', 'effects', 'voice'];
function loadPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem('pixel-brawl-audio') || '{}');
    return { ...defaultPrefs, ...Object.fromEntries(volumeKeys.map(key => [key, Number.isFinite(Number(saved[key])) ? Math.max(0, Math.min(100, Number(saved[key]))) : defaultPrefs[key]])), muted: saved.muted === true };
  } catch { return { ...defaultPrefs }; }
}
let prefs = loadPreferences();
const uiSounds = new Set(['select', 'confirm', 'tick', 'rollStart', 'roll', 'countdown', 'countdownFinal']);

function syncMusic() {
  const active = activeTrack();
  allTracks.forEach(track => {
    const shouldPlay = unlocked && prefs.music > 0 && !prefs.muted && track === active;
    track.volume = (track === menuTrack ? .18 : .10) * prefs.music / 100;
    if (shouldPlay) {
      if (track.paused) track.play().catch(() => {});
    } else if (!track.paused) track.pause();
  });
}

export function unlockAudio() {
  unlocked = true;
  syncMusic();
}

export function getAudioPreferences() {
  return { ...prefs };
}

export function setAudioPreferences(next) {
  prefs = { ...prefs, ...next };
  volumeKeys.forEach(key => { prefs[key] = Math.max(0, Math.min(100, Number(prefs[key]) || 0)); });
  prefs.muted = !!prefs.muted;
  try { localStorage.setItem('pixel-brawl-audio', JSON.stringify(prefs)); } catch {}
  syncMusic();
}

export function setAudioMode(next, nextTheme = theme) {
  if (next !== 'menu' && next !== 'fight') return;
  if (mode === next && theme === nextTheme) return;
  const previous = activeTrack();
  mode = next; theme = nextTheme;
  if (activeTrack() !== previous) activeTrack().currentTime = 0;
  syncMusic();
}

function playOneShot(source, channel = 'effects') {
  const level = prefs[channel] / 100;
  if (!unlocked || prefs.muted || level <= 0 || !source) return;
  const sound = source.cloneNode();
  sound.volume = source.volume * level;
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

export function sfx(name) {
  playOneShot(players[name], uiSounds.has(name) ? 'ui' : 'effects');
}

export function announcer(name) {
  playOneShot(voicePlayers[name], 'voice');
}

export function announceWinner(name) {
  if (!unlocked || prefs.muted || prefs.voice <= 0 || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;
  window.speechSynthesis.cancel();
  const call = new SpeechSynthesisUtterance(`${name} wins!`);
  call.lang = 'en-US'; call.rate = .88; call.pitch = .82; call.volume = prefs.voice / 100;
  window.speechSynthesis.speak(call);
}

# Pixel Brawl

A pixel-art fighting game (1P vs CPU or 2P local) written as plain ES modules. No build step, no dependencies.

## Project layout

```
index.html          page shell + touch buttons
css/style.css       layout
src/config.js       constants, fighter roster (CHARS), key bindings
src/game.js         game rules (rounds, timer, physics) - no DOM
src/fighter.js      movement, attacks, blocking
src/combat.js       hitboxes and damage
src/ai.js           CPU opponent
src/input.js        keyboard, mouse and touch input
src/audio.js        music, sound effects and mute settings
src/render.js       all canvas drawing
src/main.js         wires everything together, runs the game loop
assets/audio/       local CC0 music and sound effects
tests/              automated tests (Node)
```

Game logic (`game.js`, `fighter.js`, `combat.js`, `ai.js`) never touches the browser, so it is unit-tested, including a stress test that mashes random buttons for 80,000 frames and checks the state never breaks.

## Fighters

| Fighter | Style | Special |
|---|---|---|
| KAI | Balanced all-rounder | Fireball (long range) |
| ROX | Fast, low health | Dash Strike (rush forward) |
| BRUNO | Slow tank, huge health | Quake Wave (slow, heavy projectile) |
| MIRA | Highest jump | Rising Kick (anti-air) |
| SORA | Zoner | Rapid Shot (fast, cheap projectile) |
| TORA | Heavy brawler | Tiger Rush (charging strike) |

On the select screen, click a fighter to see their stats (health, speed, power), punch / kick / special damage and description at the bottom. Player 1's pick shows on the left, Player 2's on the right. To add a fighter, append an entry to `CHARS` in `src/config.js`.

## Run

Modules need a web server (double-clicking `index.html` will not work):

```
python3 -m http.server 8000     # then open http://localhost:8000
```

## Test

```
npm test        # needs Node 18+
```

## Controls

| Action | Player 1 | Player 2 |
|---|---|---|
| Move / jump / crouch | W A S D | Arrow keys |
| Punch / Kick / Special | F / G / H | K / L / ; |
| Super Art (full meter) | J | ' (quote) |
| Block | Hold back (away from opponent) | same |

Click or tap a menu option (or press 1 / 2). On phones, on-screen buttons control Player 1. `Esc` pauses a match; use it to return from character select or the tutorial.

## Deploy (GitHub Pages)

Settings > Pages > Deploy from a branch > `main` / root. The game is served at `https://<user>.github.io/<repo>/`.

## Combat system

| Move / rule | How it works |
|---|---|
| Punch / Kick | Standard attacks. Special-cancel: after a normal connects (or is blocked) press Special to cancel into it. |
| Crouch jab (Down + Punch) | Very fast, good for starting combos. |
| Sweep (Down + Kick) | Low attack: must be blocked crouching. Knocks the opponent down. |
| Jump punch / Fly kick (Jump, then Punch / Kick) | Overhead: must be blocked standing. Lands into recovery. |
| Block | Hold away from the opponent. Stand-block stops mid + overhead, crouch-block stops mid + low. Blocked hits do small chip damage (never a KO). |
| Counter hit | Hitting someone who is mid-attack: +25% damage and longer hit-stun. |
| Combo | Hits while the opponent is still in hit-stun. Each extra hit does 10% less damage (down to 40%). |
| Knockdown | Opponent is launched, lies down and cannot be hit while getting up. |
| Super meter | Fills when you hit or get hit. At full, Super Art = your special with double damage and a knockdown. |
| Input buffer | A button press is remembered for 8 frames, so slightly-early presses still come out. |

All move numbers (startup, active, recovery, damage, hit-stun, guard height) are in `ATK` in `src/config.js`; damage rules are in `src/combat.js`.

## Character select, options and tutorial

- Character select gives players 30 seconds. An unselected player is assigned a random fighter when time expires.
- In CPU mode, the CPU panel starts empty and the CPU randomly chooses after Player 1 locks in.
- The seventh roster tile, marked `? RANDOM`, starts a 3-second random roll. The roll does not lock the fighter; select **LOCK IN** when ready. Press `R` to roll for the active player.
- CPU difficulty is selectable on the home screen: Easy, Normal or Hard.
- **Settings** on the home screen or pause menu gives separate 0–100 sliders for music, menu/select sounds, fight effects and announcer voice, plus master mute. Choices are saved on this device. Menu music switches to a quieter fight track when a match starts. Local announcer calls cover each round, Ready and Fight; the browser speaks the winning fighter's name. Selection countdown and random rolls have their own sound cues. Sources and licenses are listed in `assets/audio/ASSETS.md`.
- **Combo Dojo** is a practice mode for all eight combo skills. Choose a fighter and combo, then chain the displayed attacks on a passive dummy. The dummy recovers and cannot be knocked out. Press `R` to reset, `Q/E` or `[/]` to switch challenges, and `Esc` to pause.
- **Controller support** uses the browser Gamepad API. The first two connected controllers map to Players 1 and 2. The D-pad or left stick moves, the four face buttons attack, and Start pauses or confirms.
- **Reduced Motion** in Settings disables camera shake, hit sparks, white hit flashes, idle bob and projectile trails. The setting is saved on this device.
- **Tutorial** on the home screen explains movement, blocking, attacks, combo chains and special cancels.
- Pause menu: Resume, Rematch, Exit Match and Settings. Exit Match asks for Yes / No confirmation.

Combo skills (extra damage on top of normal combo damage; each skill pays once per combo, longer skills upgrade it):

| Skill | Sequence | Bonus |
|---|---|---|
| TRIPLE JAB | Punch, Punch, Punch | +6 |
| TRIPLE STRIKE | Punch, Punch, Kick | +10 |
| LOW RUSH | Down+Punch, Down+Punch, Down+Kick | +8 |
| CHAIN KICK | Down+Punch, Punch, Kick | +9 |
| AIR RAID | Fly Kick, Punch | +7 |
| PUNCH CANCEL | Punch, Special | +8 |
| KICK CANCEL | Kick, Special | +10 |
| MEGA COMBO | Punch, Punch, Kick, Special | +20 and knockdown |

Normal attacks leave enough hit-stun for follow-ups, with combo damage scaling of 8% per hit down to 50%. Edit skills in `COMBOS` in `src/config.js`.

## Game flow and difficulty

```
Main menu
 |- 1 PLAYER VS CPU -> Choose your challenge (Easy / Normal / Hard) -> Fighter select -> Match
 |- 2 PLAYERS -------------------------------------------------------> Fighter select -> Match
 |- COMBO DOJO / TUTORIAL / SETTINGS
```

- **Choose your challenge** appears when you start a 1-player game. Each level says what the CPU will do, so you can pick without guessing. `1 / 2 / 3` quick-picks, Enter or click continues, Esc goes back.
- **Change it any time:** the pause menu has a `CPU LEVEL` row (Left/Right, 1-player matches only) that applies immediately; the match-over screen has `D` / tap to change it before the rematch; Settings keeps the same `CPU DIFFICULTY` row.
- The last level you used is remembered in the browser (`localStorage`).
- The level is shown in the match HUD (`CPU HARD`), on the fighter-select screen and on the main-menu button.

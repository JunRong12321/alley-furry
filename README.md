[README.md](https://github.com/user-attachments/files/32882208/README.md)
# Alley Fury

A 2D fighting game (1P vs CPU or 2P local) written as plain ES modules. No build step, no dependencies.

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
src/audio.js        sound effects
src/render.js       all canvas drawing
src/main.js         wires everything together, runs the game loop
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

Click or tap a menu option (or press 1 / 2). On phones, on-screen buttons control Player 1. `Esc` = menu.

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

# Pixel Brawl fighter portraits

The six transparent PNGs are original fighter portraits generated for Pixel Brawl with Google Gemini's Nano Banana 2. The supplied JPEGs in `source/` are the downloaded originals before background removal.

The visible Media watermark setting was turned off before generation. Google may still attach invisible provenance information to generated media; it does not appear in the game artwork.

These portraits are the fallback art if an action sheet fails to load.

## Action sheets

`actions/<name>.png` are 4x2 pose sheets (idle, punch, kick, guard, crouch, step, air, special) used everywhere a fighter is drawn: character select, stage select, the dojo and live matches. The renderer adds the in-between motion (wind-up, lunge, walk bob, hit recoil, knockdown) on top of these poses.

The raw Nano Banana sheets are kept in `actions/source/`. They had a baked-in checkerboard, grid lines and captions, and `tora` was a JPEG. Rebuild the game sheets with:

```
pip install pillow numpy scipy
python tools/clean_sprites.py
```

The script removes the background, then re-packs every pose so all fighters share the same standing height, floor line and body anchor (no fighter looks shrunk next to another).

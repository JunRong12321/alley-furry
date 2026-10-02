"""Rebuild the fighter action sheets used by the renderer.

Reads the raw Nano Banana sheets in assets/fighters/actions/source/, strips the
baked-in checkerboard, grid lines and caption text, then re-packs every pose
into a uniform 4x2 grid where each fighter has the same standing height and
every pose shares one floor line and one body anchor.

    python tools/clean_sprites.py
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets' / 'fighters' / 'actions' / 'source'
OUT = ROOT / 'assets' / 'fighters' / 'actions'
NAMES = ['kai', 'rox', 'bruno', 'mira', 'sora', 'tora']
COLS, ROWS = 4, 2
CELL_W, CELL_H = 640, 360
FLOOR_Y, ANCHOR_X = 352, 320
STAND_H = 300
INSET = 6


def background_mask(rgb, alpha):
    mx, mn = rgb.max(2), rgb.min(2)
    neutral = (mx - mn <= 16) & (mn >= 88)
    cand = (alpha < 16) | neutral
    lab, n = ndimage.label(cand)
    if n == 0:
        return np.zeros_like(cand)
    seeds = np.zeros(n + 1, bool)
    seeds[np.unique(lab[alpha < 16])] = True
    border = np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])
    seeds[np.unique(border)] = True
    seeds[0] = False
    bg = seeds[lab]
    # peel the light antialias halo the checkerboard leaves around outlines
    for _ in range(2):
        edge = ndimage.binary_dilation(bg) & ~bg & neutral
        bg |= edge
    return bg


def extract(cell):
    rgb = cell[:, :, :3].astype(int)
    alpha = cell[:, :, 3].astype(int)
    fg = ~background_mask(rgb, alpha)
    lab, n = ndimage.label(fg, structure=np.ones((3, 3)))
    if n == 0:
        raise ValueError('empty cell')
    sizes = ndimage.sum(fg, lab, range(1, n + 1))
    main = int(np.argmax(sizes)) + 1
    ys, xs = np.nonzero(lab == main)
    top, bottom = ys.min(), ys.max()
    keep = np.zeros(n + 1, bool)
    for k, sl in enumerate(ndimage.find_objects(lab), start=1):
        y0, y1 = sl[0].start, sl[0].stop - 1
        overlaps = y1 >= top + (bottom - top) * .05 and y0 <= bottom - 4
        if k == main or (overlaps and sizes[k - 1] >= max(120, sizes[main - 1] * .012)):
            keep[k] = True
    mask = keep[lab]
    band = (ys > top + (bottom - top) * .25) & (ys < top + (bottom - top) * .7)
    anchor = xs[band].mean() if band.any() else xs.mean()
    out = cell.copy()
    out[:, :, 3] = np.where(mask, 255, 0)
    out[~mask, :3] = 0
    rows = np.nonzero(mask.any(1))[0]
    return out, anchor, bottom, bottom - top + 1, rows.min()


def build(name):
    path = next(SRC.glob(name + '.*'))
    sheet = np.array(Image.open(path).convert('RGBA'))
    h, w = sheet.shape[:2]
    cw, ch = w / COLS, h / ROWS
    poses = []
    for i in range(COLS * ROWS):
        c, r = i % COLS, i // COLS
        x0, y0 = int(round(c * cw)) + INSET, int(round(r * ch)) + INSET
        x1, y1 = int(round((c + 1) * cw)) - INSET, int(round((r + 1) * ch)) - INSET
        poses.append(extract(sheet[y0:y1, x0:x1]))
    scale = STAND_H / poses[0][3]
    canvas = Image.new('RGBA', (CELL_W * COLS, CELL_H * ROWS), (0, 0, 0, 0))
    for i, (img, anchor, bottom, _, _) in enumerate(poses):
        im = Image.fromarray(img)
        im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
        dx = round(ANCHOR_X - anchor * scale)
        dy = round(FLOOR_Y - bottom * scale)
        cell = Image.new('RGBA', (CELL_W, CELL_H), (0, 0, 0, 0))
        cell.alpha_composite(im, (max(dx, 0), max(dy, 0)),
                             (max(-dx, 0), max(-dy, 0)))
        a = np.array(cell)
        a[:, :, 3] = np.where(a[:, :, 3] >= 128, 255, 0)
        canvas.alpha_composite(Image.fromarray(a), ((i % COLS) * CELL_W, (i // COLS) * CELL_H))
    canvas.save(OUT / f'{name}.png', optimize=True)
    print(f'{name}: scale {scale:.3f}')


if __name__ == '__main__':
    for n in NAMES:
        build(n)

#!/usr/bin/env python3
"""Horizon seam check for G3 vista stills: is there a hard line where the sky meets the hazed far ground?

For each image, averages luma (and RGB) across the middle columns (clear of the HUD panels), then over rows in the
top 15-65% of the frame reports the biggest one-row luma jump and the biggest 6-row RGB jump (a seam is a sudden
step; a smooth gradient has small row-to-row changes). Usage: horizonstep.py <dir> [glob]
"""
import sys, glob, os
from PIL import Image

d = sys.argv[1]; pat = sys.argv[2] if len(sys.argv) > 2 else "*.jpg"
for f in sorted(glob.glob(os.path.join(d, pat))):
    im = Image.open(f).convert("RGB"); W, H = im.size
    x0, x1 = int(W * 0.25), int(W * 0.75)
    px = im.load(); rows = []
    for y in range(H):
        r = g = b = 0
        for x in range(x0, x1, 2):
            p = px[x, y]; r += p[0]; g += p[1]; b += p[2]
        n = len(range(x0, x1, 2)); rows.append((r / n, g / n, b / n))
    lum = [0.2126 * r + 0.7152 * g + 0.0722 * b for r, g, b in rows]
    y0, y1 = int(H * 0.15), int(H * 0.65)
    j1 = max(range(y0, y1), key=lambda y: abs(lum[y + 1] - lum[y]))
    def d6(y): return max(abs(rows[y + 6][k] - rows[y][k]) for k in range(3))
    j6 = max(range(y0, y1), key=d6)
    print(f"{os.path.basename(f):28s} step1 {abs(lum[j1+1]-lum[j1]):5.2f} @{j1:4d}  step6rgb {d6(j6):5.2f} @{j6:4d}")

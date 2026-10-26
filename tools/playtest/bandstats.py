#!/usr/bin/env python3
"""Local contrast (mean abs difference to a 9px box blur) per horizontal strip of each still, top to bottom,
so a change to one distance band (e.g. the 45-150 m ground just below the horizon) shows on its own.
Usage: bandstats.py <dir> [glob] [strips]"""
import sys, glob, os
from PIL import Image, ImageFilter, ImageChops, ImageStat

d = sys.argv[1]; pat = sys.argv[2] if len(sys.argv) > 2 else "*.jpg"; n = int(sys.argv[3]) if len(sys.argv) > 3 else 8
for f in sorted(glob.glob(os.path.join(d, pat))):
    L = Image.open(f).convert("L"); w, h = L.size
    diff = ImageChops.difference(L, L.filter(ImageFilter.BoxBlur(4)))
    vals = []
    for i in range(n):
        box = (0, int(h * i / n), w, int(h * (i + 1) / n))
        vals.append(ImageStat.Stat(diff.crop(box)).mean[0])
    print(f"{os.path.basename(f):28s} " + " ".join(f"{v:4.2f}" for v in vals))

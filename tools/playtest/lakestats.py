#!/usr/bin/env python3
"""Lake-ice numbers for scenarios/g3_lake.mjs stills: crops the part of each frame the frozen lake fills (by the shot's
suffix) and prints luma mean/std, local contrast (mean abs diff to a 4px box blur) and blue-minus-red. A flat disc has
low std and local; wind streaks / scoured ice raise both. Usage: lakestats.py <dir>"""
import sys, glob, os
from PIL import Image, ImageFilter, ImageStat, ImageChops

CROP = {"shore": (0.15, 0.38, 0.85, 0.60), "vista": (0.40, 0.40, 0.60, 0.54), "low": (0.0, 0.46, 1.0, 0.62)}
for f in sorted(glob.glob(os.path.join(sys.argv[1], "*.jpg"))):
    kind = next((k for k in CROP if f.endswith(k + ".jpg")), None)
    if not kind: continue
    im = Image.open(f).convert("RGB"); w, h = im.size; c = CROP[kind]
    im = im.crop((int(w * c[0]), int(h * c[1]), int(w * c[2]), int(h * c[3])))
    L = im.convert("L"); st = ImageStat.Stat(L)
    loc = ImageStat.Stat(ImageChops.difference(L, L.filter(ImageFilter.BoxBlur(4)))).mean[0]
    r, g, b = ImageStat.Stat(im).mean
    print(f"{os.path.basename(f):22s} mean {st.mean[0]:6.1f}  std {st.stddev[0]:5.2f}  local {loc:4.2f}  b-r {b - r:5.1f}")

#!/usr/bin/env python3
"""Per-still luminance numbers for judging lighting passes: mean, std (global contrast), p5/p95 spread,
mean saturation, and local contrast (mean abs difference to a 9px box blur). Usage: imgstats.py <dir> [glob]"""
import sys, glob, os
from PIL import Image, ImageFilter, ImageStat

d = sys.argv[1]; pat = sys.argv[2] if len(sys.argv) > 2 else "*.jpg"
for f in sorted(glob.glob(os.path.join(d, pat))):
    im = Image.open(f).convert("RGB")
    w, h = im.size
    im = im.crop((0, int(h * 0.08), w, int(h * 0.9)))       # skip the HUD strips top and bottom
    L = im.convert("L")
    hist = L.histogram(); n = sum(hist); acc = 0; p5 = p95 = None
    for i, c in enumerate(hist):
        acc += c
        if p5 is None and acc >= n * 0.05: p5 = i
        if p95 is None and acc >= n * 0.95: p95 = i
    st = ImageStat.Stat(L)
    sat = ImageStat.Stat(im.convert("HSV").split()[1]).mean[0]
    blur = L.filter(ImageFilter.BoxBlur(4))
    from PIL import ImageChops
    loc = ImageStat.Stat(ImageChops.difference(L, blur)).mean[0]
    print(f"{os.path.basename(f):28s} mean {st.mean[0]:6.1f}  std {st.stddev[0]:5.1f}  p5-p95 {p5:3d}-{p95:3d}  sat {sat:5.1f}  local {loc:4.2f}")

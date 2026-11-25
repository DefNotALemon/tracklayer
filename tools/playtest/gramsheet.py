#!/usr/bin/env python3
"""Contact sheets of the Gram scroll test's stills: gramsheet.py <dir> <prefix> [cols] [per_sheet]  -> <dir>/sheet_<prefix>_N.jpg"""
import os, sys
from PIL import Image, ImageDraw
d, prefix = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 6
per = int(sys.argv[4]) if len(sys.argv) > 4 else 18
files = sorted(f for f in os.listdir(d) if f.startswith(prefix + "_") and f.lower().endswith((".jpg", ".png")))
if not files:
    sys.exit("no stills")
W = 330
for n in range(0, len(files), per):
    tiles = []
    for f in files[n:n + per]:
        im = Image.open(os.path.join(d, f)).convert("RGB")
        im = im.resize((W, int(im.height * W / im.width)))
        ImageDraw.Draw(im).rectangle([0, 0, W, 14], fill=(0, 0, 0))
        ImageDraw.Draw(im).text((4, 2), f, fill=(255, 255, 0))
        tiles.append(im)
    H = max(t.height for t in tiles)
    rows = (len(tiles) + cols - 1) // cols
    sh = Image.new("RGB", (cols * W, rows * H), (20, 20, 20))
    for i, t in enumerate(tiles):
        sh.paste(t, ((i % cols) * W, (i // cols) * H))
    out = os.path.join(d, "sheet_%s_%d.jpg" % (prefix, n // per))
    sh.save(out, quality=84)
    print(out)

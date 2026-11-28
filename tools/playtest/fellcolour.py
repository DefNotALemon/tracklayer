#!/usr/bin/env python3
"""Mean colour of the same fell patch per distance, from g3_fellcolour.mjs output.
Usage: fellcolour.py <outdir>  -> table of D, mean RGB, luma, saturation per tag (3x3 px around each projected point)."""
import json, sys, os
from PIL import Image

d = sys.argv[1]
log = json.load(open(os.path.join(d, "fellcolour.json")))
rows = {}
for e in log:
    im = Image.open(os.path.join(d, e["name"] + ".jpg")).convert("RGB")
    W, H = im.size; px = im.load(); acc = [0, 0, 0]; n = 0
    for x, y in e["pts"]:
        for u in (-1, 0, 1):
            for v in (-1, 0, 1):
                xx, yy = int(x) + u, int(y) + v
                if 0 <= xx < W and 0 <= yy < H:
                    c = px[xx, yy]; acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2]; n += 1
    if not n: continue
    r, g, b = (a / n for a in acc)
    luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
    sat = (max(r, g, b) - min(r, g, b)) / max(max(r, g, b), 1)
    tag = e["name"].rsplit("_", 1)[0]
    rows.setdefault(tag, []).append((e["D"], r, g, b, luma, sat, e.get("up")))
for tag, rs in rows.items():
    print(tag)
    for D, r, g, b, l, s, up in rs:
        print(f"  {D:5d} m  rgb {r:5.1f} {g:5.1f} {b:5.1f}  luma {l:5.1f}  sat {s:.3f}  cam+{up}m")

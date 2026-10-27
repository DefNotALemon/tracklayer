#!/usr/bin/env python3
"""Snow LOD line check: local contrast (mean abs diff to a 2px box blur = fine detail) and mean luma per screen-row
band of a chase-camera still, plus a side-by-side crop of the 6-45 m band from two dirs.
Rows come from g3_snowlod.mjs (`rows_chase`: ground 6/9/12/15/25/45 m ahead). Usage:
  snowband.py <dir> [glob]            per-band numbers
  snowband.py <dirA> <dirB> <name> <out.jpg>   stacked crops (A above B) of rows 250-520, x 250-1030, zoomed x2"""
import sys, glob, os
from PIL import Image, ImageFilter, ImageStat, ImageChops

BANDS = [(600, 680, "<6m"), (496, 560, "4-6m"), (413, 496, "6-9m"), (369, 413, "9-12m"), (344, 369, "12-15m"), (294, 344, "15-25m"), (261, 294, "25-45m")]
X0, X1 = 260, 1020

def bands(f):
    L = Image.open(f).convert("L")
    out = []
    for a, b, tag in BANDS:
        locs, ms = [], []
        for x0, x1 in ((X0, 560), (720, X1)):   # skip the sled + rider in the middle
            c = L.crop((x0, a, x1, b)); bl = c.filter(ImageFilter.BoxBlur(2))
            locs.append(ImageStat.Stat(ImageChops.difference(c, bl)).mean[0]); ms.append(ImageStat.Stat(c).mean[0])
        out.append(f"{tag} {sum(locs)/2:4.2f}/{sum(ms)/2:5.1f}")
    return out

if len(sys.argv) >= 5:
    a, b, name, out = sys.argv[1:5]
    ims = [Image.open(os.path.join(d, name)).crop((250, 250, 1030, 520)) for d in (a, b)]
    w, h = ims[0].size
    sheet = Image.new("RGB", (w, h * 2 + 6), "red")
    sheet.paste(ims[0], (0, 0)); sheet.paste(ims[1], (0, h + 6))
    sheet.resize((w * 2 // 1, (h * 2 + 6) * 2 // 1)).save(out, quality=90)
    print(out)
else:
    d = sys.argv[1]; pat = sys.argv[2] if len(sys.argv) > 2 else "*.jpg"
    for f in sorted(glob.glob(os.path.join(d, pat))):
        print(f"{os.path.basename(f):28s} " + "  ".join(bands(f)))

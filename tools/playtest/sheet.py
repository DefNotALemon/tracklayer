#!/usr/bin/env python3
"""Contact sheet of playtest stills, for judging with vision.

Usage: sheet.py <shots dir> [out.jpg] [cols]   (labels each tile with its file name)
"""
import os, sys
from PIL import Image, ImageDraw

d = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(d, "sheet.jpg")
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 3
files = sorted(f for f in os.listdir(d) if f.lower().endswith((".jpg", ".png")) and not f.startswith("sheet"))
if not files:
    sys.exit("no stills in " + d)
W = 640
tiles = []
for f in files:
    im = Image.open(os.path.join(d, f)).convert("RGB")
    im = im.resize((W, int(im.height * W / im.width)))
    ImageDraw.Draw(im).rectangle([0, 0, W, 22], fill=(0, 0, 0))
    ImageDraw.Draw(im).text((6, 5), f, fill=(255, 255, 0))
    tiles.append(im)
H = max(t.height for t in tiles)
rows = (len(tiles) + cols - 1) // cols
sheet = Image.new("RGB", (cols * W, rows * H), (20, 20, 20))
for i, t in enumerate(tiles):
    sheet.paste(t, ((i % cols) * W, (i // cols) * H))
sheet.save(out, quality=82)
print(out)

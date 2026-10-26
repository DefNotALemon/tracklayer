#!/usr/bin/env python3
"""Sign brightness vs its frame for g3_signs.mjs: for each still with a rect in rects.json, the mean luma inside the sign
rect, the mean luma of the whole frame, and their ratio. Usage: signstat.py <dir>"""
import sys, os, json
from PIL import Image, ImageStat

d = sys.argv[1]
R = json.load(open(os.path.join(d, "rects.json")))
for name, (x0, y0, x1, y1, W, H) in R.items():
    f = os.path.join(d, name + ".jpg")
    if not os.path.exists(f): continue
    im = Image.open(f).convert("L"); sx, sy = im.size[0] / W, im.size[1] / H
    box = (max(0, int(x0 * sx)), max(0, int(y0 * sy)), min(im.size[0], int(x1 * sx)), min(im.size[1], int(y1 * sy)))
    if box[2] - box[0] < 4 or box[3] - box[1] < 4: print(f"{name:16s} off-screen"); continue
    s = ImageStat.Stat(im.crop(box)).mean[0]; fr = ImageStat.Stat(im).mean[0]
    print(f"{name:16s} sign {s:6.1f}  frame {fr:6.1f}  ratio {s / max(fr, 1):5.2f}")

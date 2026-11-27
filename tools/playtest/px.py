#!/usr/bin/env python3
# px.py <image> <groups.json>: for each group (a list of [x, y, half] windows in image pixels) print mean RGB (0..1), mean and max luminance.
import json, sys
from PIL import Image
im = Image.open(sys.argv[1]).convert("RGB"); W, H = im.size
groups = json.load(open(sys.argv[2]))
out = []
for g in groups:
    n = 0; sr = sg = sb = 0.0; mx = 0.0
    for x, y, h in g:
        x0, x1, y0, y1 = int(max(0, x - h)), int(min(W - 1, x + h)), int(max(0, y - h)), int(min(H - 1, y + h))
        for yy in range(y0, y1 + 1):
            for xx in range(x0, x1 + 1):
                r, gg, b = im.getpixel((xx, yy)); sr += r; sg += gg; sb += b; n += 1
                l = (0.2126 * r + 0.7152 * gg + 0.0722 * b) / 255.0
                if l > mx: mx = l
    if n == 0: out.append(None); continue
    mr, mg, mb = sr / n / 255, sg / n / 255, sb / n / 255
    out.append({"rgb": [mr, mg, mb], "lum": 0.2126 * mr + 0.7152 * mg + 0.0722 * mb, "max": mx, "n": n})
print(json.dumps(out))

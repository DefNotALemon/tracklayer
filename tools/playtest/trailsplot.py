# Plot the ski trails from above over a slope map (PIL): trailsplot.py <dump.json> <out.png> [x0 z0 x1 z1 [px]]
# The dump is written by scenarios/h1_trails.mjs (trails, sites, roads, and the ground sampled every 50 m). Reddish = steep.
import json, sys, math
from PIL import Image, ImageDraw, ImageFont
D = json.load(open(sys.argv[1])); T = D['terrain']; tr = D['trails']; wd = D['world']
out = sys.argv[2]; box = [float(v) for v in sys.argv[3:7]] if len(sys.argv) > 6 else [-4096, -4096, 4096, 4096]
size = int(sys.argv[7]) if len(sys.argv) > 7 else 1600
n, st = T['n'], T['st']
x0, z0, x1, z1 = box; sc = size / (x1 - x0); H = int((z1 - z0) * sc)
img = Image.new('RGB', (size, H), (30, 40, 50)); px = img.load()
hmax = max(T['h'])
for j in range(H):
    for i in range(size):
        x = x0 + i / sc; z = z0 + j / sc
        gi = min(n - 1, max(0, int((x + 4096) / st))); gj = min(n - 1, max(0, int((z + 4096) / st)))
        k = gj * n + gi; s = T['s'][k]; h = T['h'][k]
        # slope shade
        gi2 = min(n - 1, gi + 1); gj2 = min(n - 1, gj + 1)
        dh = (T['h'][gj * n + gi2] - h) + (T['h'][gj2 * n + gi] - h)
        sh = max(0.0, min(1.0, 0.55 - dh * 0.02))
        if s == 2: c = (40, 70, 110)
        elif s == 1: c = (90, 130, 170)
        else:
            g = int(90 + 120 * sh * (0.5 + 0.5 * min(1, h / 250)))
            # steepness tint
            sl = (abs(T['h'][gj * n + gi2] - h) + abs(T['h'][gj2 * n + gi] - h)) / st
            c = (g, g, g) if sl < 0.14 else (g, int(g * .6), int(g * .6))
        px[i, j] = c
d = ImageDraw.Draw(img)
def P(x, z): return ((x - x0) * sc, (z - z0) * sc)
for r in wd['roads']:
    d.line([P(*p) for p in r['pts']], fill=(196, 105, 46), width=2)
for s in wd['sites']:
    x, z = P(s[1], s[2]); d.ellipse([x - 4, z - 4, x + 4, z + 4], outline=(255, 255, 255)); d.text((x + 6, z - 5), s[0], fill=(255, 255, 255))
cols = [(255, 176, 32), (42, 157, 244), (63, 191, 95), (229, 71, 47), (217, 130, 43), (182, 79, 224), (24, 194, 178)]
for k, t in enumerate(tr):
    pts = [P(*p) for p in t['pts']]
    d.line(pts, fill=cols[k % 7], width=3)
    d.text((pts[0][0] + 5, pts[0][1] + 5), t['id'], fill=(255, 255, 0))
img.save(out); print('saved', out, img.size)

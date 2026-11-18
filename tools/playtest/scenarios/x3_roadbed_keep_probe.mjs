// beta probe: which houses/boulders near a road had their ground moved by the road bed (x3_roadbed "keep" FAIL, max 0.742 m)
import { boot, ev, sleep, done } from "../lib.mjs";
await boot();
await ev(`tutSkip(); true`); await sleep(500);
const r = JSON.parse(await ev(`JSON.stringify((() => {
  const g0 = (x, z) => { const fx = (x + HALF) / GRES, fz = (z + HALF) / GRES, i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j, h = (a, b) => baseH(a * GRES - HALF, b * GRES - HALF);
    const a = h(i, j), b = h(i + 1, j), c = h(i, j + 1), d = h(i + 1, j + 1); return a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz; };
  const nearLake = (x, z) => LAKES.some(L => L.ok && Math.hypot(x - L.x, z - L.z) < L.r * 1.8);
  const out = [], seen = new Set();
  for (const r of TLXR.routes) for (let i = 0; i < r.pts.length; i += 3) { const [x, z] = r.pts[i];
    for (const o of obstaclesNear(x, z, 26)) { if (seen.has(o) || o.log || Math.hypot(o.x - x, o.z - z) > 26 || nearLake(o.x, o.z)) continue; if (o.tree === undefined && !(o.top > 0.3)) continue; seen.add(o);
      if (o.tree !== undefined) continue; const dd = Math.abs(groundAt(o.x, o.z) - g0(o.x, o.z)); if (dd > 0.3) out.push({ route: r.id, x: +o.x.toFixed(0), z: +o.z.toFixed(0), r: o.r, top: o.top, dd: +dd.toFixed(2), kind: Object.keys(o).join(",") }); } }
  return out; })())`));
console.log("offenders", r.length); r.forEach(o => console.log(JSON.stringify(o)));
await done();

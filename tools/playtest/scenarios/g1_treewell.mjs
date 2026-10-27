// G1/G3 tree wells: snow depth round pine trunks vs open ground, and how a stand looks at its foot.
// Picks the 3 densest flat pine stands, samples snow depth (depthAt after the chunks load) on rings 0.6/1.2/2/3/5 m
// round every pine in the stand (8 directions), and open-ground depth 25–35 m out. Then stills of each stand from
// 7 m out, 1.9 m up (rider eye), Nov noon and 21:00, weather pinned.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_treewell.mjs [outdir]
import { boot, ev, shot, sleep, done, sideCam } from "../lib.mjs";
await boot(); await sideCam(); await ev("window.camOv = null; true");
await ev("WX.at = () => 0; GS.storm = 0; GS.hour = 12; true");

const stands = JSON.parse(await ev(`(() => {
  const pines = []; for (const a of obGrid.values()) for (const o of a) if (o.pine && !o.down) pines.push(o);
  const cand = [];
  for (let k = 0; k < pines.length; k += 3) {
    const o = pines[k]; let n = 0;
    for (const p of pines.length < 0 ? [] : (obNearAll(o.x, o.z, 10))) if (p.pine) n++;
    if (n >= 5 && slopeAt(o.x, o.z, 10) < 0.15) cand.push({ x: o.x, z: o.z, n });
  }
  function obNearAll(x, z, R) { const r = []; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const a = obGrid.get((Math.floor((z + HALF) / OBC) + j) * OBW + Math.floor((x + HALF) / OBC) + i); if (a) for (const p of a) if (Math.hypot(p.x - x, p.z - z) < R) r.push(p); } return r; }
  cand.sort((a, b) => b.n - a.n);
  const out = [];
  for (const c of cand) { if (out.length >= 3) break; if (out.some(s => Math.hypot(s.x - c.x, s.z - c.z) < 400)) continue; if (isSea(c.x, c.z) || isWater(c.x, c.z)) continue; out.push(c); }
  return JSON.stringify(out);
})()`));
console.log("stands", JSON.stringify(stands));

const R = [0.6, 1.2, 2.0, 3.0, 5.0];
const all = R.map(() => []), open = [];
for (const [si, s] of stands.entries()) {
  const r = JSON.parse(await ev(`(() => {
    P.x = ${s.x} + 30; P.z = ${s.z}; P.y = surf(P.x, P.z) + 0.5; P.vx = P.vy = P.vz = 0; recenter(P.x, P.z, true);
    const d = (x, z) => { const ix = Math.floor((x + HALF) / CELL), iz = Math.floor((z + HALF) / CELL); getChunk(ix >> 5, iz >> 5); return depthAt(ix, iz); };
    const pines = []; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const a = obGrid.get((Math.floor((${s.z} + HALF) / OBC) + j) * OBW + Math.floor((${s.x} + HALF) / OBC) + i); if (a) for (const p of a) if (p.pine && Math.hypot(p.x - ${s.x}, p.z - ${s.z}) < 10) pines.push(p); }
    const rings = ${JSON.stringify(R)}.map(rr => { let t = 0, n = 0; for (const p of pines) for (let k = 0; k < 8; k++) { t += d(p.x + Math.cos(k * 0.785) * rr, p.z + Math.sin(k * 0.785) * rr); n++; } return t / n; });
    let ot = 0, on = 0; for (let k = 0; k < 16; k++) { const rr = 25 + (k % 3) * 5, x = ${s.x} + Math.cos(k * 0.39) * rr, z = ${s.z} + Math.sin(k * 0.39) * rr; if (obNear(x, z, 4) || isSea(x, z) || isWater(x, z)) continue; ot += d(x, z); on++; }
    return JSON.stringify({ n: pines.length, rings, open: on ? ot / on : null });
  })()`));
  console.log(`stand ${si} ${s.x.toFixed(0)},${s.z.toFixed(0)} pines ${r.n} rings ${r.rings.map(v => v.toFixed(2)).join("/")} open ${r.open && r.open.toFixed(2)}`);
  r.rings.forEach((v, i) => all[i].push(v)); if (r.open) open.push(r.open);
  // low: 10 m out, 1.0 m up, under the skirts; high: 5 m up, 4 m out, looking down at the trunk foot
  for (const [tag, hr, D, H] of [["low_noon", 12, 10, 1.0], ["high_noon", 12, 4, 5], ["low_night", 21, 10, 1.0]]) {
    await ev(`GS.hour = Math.floor(GS.hour / 24) * 24 + ${hr}; GS.storm = 0;
      FOOT.on = false; if (FOOT.g) FOOT.g.visible = false; P.x = ${s.x} - 3; P.z = ${s.z} - 14; P.y = surf(P.x, P.z) + 0.5; P.vx = P.vy = P.vz = 0; recenter(P.x, P.z, true);
      window.camOv = c => { c.position.set(${s.x} + ${D}, surf(${s.x} + ${D}, ${s.z} + 1) + ${H}, ${s.z} + 1); c.lookAt(${s.x}, surf(${s.x}, ${s.z}) + 0.2, ${s.z}); };
      true`);
    await sleep(1500);
    await shot(`stand${si}_${tag}`);
  }
  await ev("window.camOv = null; true");
}
const m = a => (a.reduce((t, v) => t + v, 0) / Math.max(1, a.length)).toFixed(2);
console.log(`SUMMARY depth r0.6 ${m(all[0])} r1.2 ${m(all[1])} r2 ${m(all[2])} r3 ${m(all[3])} r5 ${m(all[4])} open ${m(open)}`);
await done();

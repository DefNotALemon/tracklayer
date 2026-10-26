// G1: do Kjøllefjord's plowed lanes (buildTown, addLane) run into buildings, sheds, woodpiles or lamps?
// Samples every lane leg (YARDS entries with f === LANE_FALL) each 1 m and lists the points where obNear(x, z, 0.4)
// is true, per lane, with the obstacle's size. Then walks depot yard -> lot9 (the yellow house west of the depot whose
// lane ran under the pier freight shed) along the lane's own points by gameClock.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_lanesob.mjs
import { boot, ev, done, sleep, down, up, shot } from "../lib.mjs";
await boot();
await ev("GS.hour = 12; WX.at = () => 0; GS.storm = 0; true");
const res = JSON.parse(await ev(`(() => {
  const lanes = [], out = [];
  let cur = null;
  for (const Y of YARDS) {
    if (Y.f !== LANE_FALL) { cur = null; continue; }
    if (cur && Math.abs(cur[cur.length - 1][0] - Y.x) < 1e-6 && Math.abs(cur[cur.length - 1][1] - Y.z) < 1e-6) cur.push([Y.x2, Y.z2]);
    else { cur = [[Y.x, Y.z], [Y.x2, Y.z2]]; lanes.push(cur); }
  }
  const hit = (x, z) => { for (let j = Math.floor((z - 2 + HALF) / OBC); j <= Math.floor((z + 2 + HALF) / OBC); j++) for (let i = Math.floor((x - 2 + HALF) / OBC); i <= Math.floor((x + 2 + HALF) / OBC); i++) { const a = obGrid.get(j * OBW + i); if (!a) continue; for (const o of a) if (Math.hypot(o.x - x, o.z - z) < 0.4 + (o.r || 0)) return o; } return null; };
  for (const L of lanes) {
    let n = 0, hits = 0, first = null, len = 0, rs = new Set();
    for (let k = 1; k < L.length; k++) {
      const [ax, az] = L[k - 1], [bx, bz] = L[k], l = Math.hypot(bx - ax, bz - az), m = Math.max(1, Math.round(l));
      len += l;
      for (let s = 0; s <= m; s++) { const x = ax + (bx - ax) * s / m, z = az + (bz - az) * s / m, o = hit(x, z); n++; if (o) { hits++; rs.add(o.r.toFixed(1)); if (!first) first = [+(x - depot.x).toFixed(1), +(z - depot.z).toFixed(1)]; } }
    }
    const e = L[L.length - 1];
    out.push({ end: [+(e[0] - depot.x).toFixed(1), +(e[1] - depot.z).toFixed(1)], legs: L.length - 1, len: +len.toFixed(1), hits, n, first, rs: [...rs].join(",") });
  }
  return JSON.stringify(out);
})()`));
for (const r of res) console.log(`lane -> (${r.end}) ${r.legs} legs ${r.len} m: ${r.hits}/${r.n} samples blocked${r.hits ? ` first at depot+(${r.first}) ob r ${r.rs}` : ""}`);
console.log(`lanes ${res.length}, blocked lanes ${res.filter(r => r.hits).length}, blocked samples ${res.reduce((a, r) => a + r.hits, 0)}`);

// walk lot9's lane (depot -66,+4) from the depot yard edge, steering point to point along it
const L9 = JSON.parse(await ev(`(() => { const out = []; let on = false;
  const ex = depot.x - 66 + Math.sin(-0.3) * 8, ez = depot.z + 4 + Math.cos(-0.3) * 8;
  const ls = YARDS.filter(Y => Y.f === LANE_FALL);
  let k = ls.findIndex(Y => Math.hypot(Y.x2 - ex, Y.z2 - ez) < 0.5);
  if (k < 0) return "null";
  const pts = [[ls[k].x2, ls[k].z2]];
  while (k >= 0 && !(Math.hypot(ls[k].x - (depot.x - 5), ls[k].z - depot.z) < 0.01)) { pts.unshift([ls[k].x, ls[k].z]); k--; }
  return JSON.stringify(pts); })()`));
if (L9) {
  const sx = depot => 0;
  const st = JSON.parse(await ev(`(() => { const p = ${JSON.stringify(L9)}, ux = p[0][0] - (depot.x - 5), uz = p[0][1] - depot.z, ul = Math.hypot(ux, uz) || 1;
    const x = depot.x - 5 + ux / ul * Math.min(18, ul), z = depot.z + uz / ul * Math.min(18, ul);
    FOOT.on = true; FOOT.ski = false; FOOT.dig = false; FOOT.x = x; FOOT.z = z; FOOT.yaw = Math.atan2(p[0][0] - x, p[0][1] - z);
    P.x = depot.x + 6; P.z = depot.z + 8; P.y = surf(P.x, P.z) + 0.3; recenter(FOOT.x, FOOT.z, true);
    FOOT.y = surf(FOOT.x, FOOT.z) + 0.1; FOOT.sp = 0; FOOT.fwd = 0; FOOT.turn = 0; FOOT.tired = 0; FOOT.strain = 0.6; FOOT.step = 0; FOOT.half = 0;
    if (FOOT.g) FOOT.g.visible = true; camState.init = false; return JSON.stringify({x, z, t: gameClock}); })()`));
  await sleep(400);
  const pts = L9.slice(1);
  let wi = 0, m = 0, px = st.x, pz = st.z, s = st, stuck = 0, packs = [];
  const s0 = JSON.parse(await ev("JSON.stringify({t: gameClock})"));
  await down("KeyW");
  try { for (;;) { await sleep(120); const [tx, tz] = pts[wi];
    s = JSON.parse(await ev(`(() => { FOOT.yaw = Math.atan2(${tx} - FOOT.x, ${tz} - FOOT.z); return JSON.stringify({x: FOOT.x, z: FOOT.z, t: gameClock, y: yardAt(FOOT.x, FOOT.z)}); })()`));
    const dm = Math.hypot(s.x - px, s.z - pz); m += dm; px = s.x; pz = s.z; packs.push(s.y);
    stuck = dm < 0.02 ? stuck + 1 : 0;
    if (Math.hypot(tx - s.x, tz - s.z) < 2) { if (++wi >= pts.length) break; }
    if (stuck > 25 || s.t - s0.t > 70) break; } }
  finally { await up("KeyW"); }
  const dt = s.t - s0.t;
  console.log(`walk depot yard edge -> lot9 door along its lane: ${wi >= pts.length ? "reached" : stuck > 25 ? "STUCK" : "NOT reached"}, ${m.toFixed(1)} m in ${dt.toFixed(1)} s, avg ${(m / dt).toFixed(2)} m/s, mean yard ${(packs.reduce((a, b) => a + b, 0) / packs.length).toFixed(2)}, ended at depot+(${(s.x - st.x).toFixed(0)}) lane pts ${L9.length}`);
} else console.log("lot9 lane not found");
// still from above lot9's lane
await ev(`(() => { const ex = depot.x - 40, ez = depot.z - 20, tx = depot.x - 40, tz = depot.z + 6;
  window.camOv = () => { camera.position.set(ex, surf(ex, ez) + 30, ez); camera.lookAt(tx, surf(tx, tz), tz); };
  if (!window.__wr) { window.__wr = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(); window.__wr(s, c); }; } true; })()`);
await sleep(1500); await shot("01_lot9_lane");
await done();

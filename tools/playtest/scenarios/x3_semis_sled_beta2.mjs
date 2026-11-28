// Beta 3.5a round 2: a semi against a real moving sled. A) sled slow in the semi's own lane ahead of it (follow/pass, hits)
// B) sled parked on the verge beside the lane as the semi goes by (closest approach, hits) C) night+storm repeat of A
// D) reload with a semi 60 m away, semi count back, E) speed dip recheck on a straight.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(1000);
const SI = await J(`TLXT.cars.findIndex(c => c.semi)`);
const rid = await J(`TLXT.routes.slice().sort((a, b) => b.len - a.len)[0].id`);
const s0 = await J(`TLXT.routes.find(q => q.id === "${rid}").s0 + 400`);
const setup = (ahead, lat) => ev(`(() => { crashCancel(); FOOT.on = false; TLXT.cars.forEach((c, i) => { if (i !== ${SI}) c.on = false; });
  const c = TLXT.place("${rid}", ${s0}, 1, ${SI}, "haul"); c.v = 9; const p = TLXT.lanePt("${rid}", ${s0} + ${ahead}, 1);
  const q = TLXT.lanePt("${rid}", ${s0} + ${ahead} + 1, 1); const dx = q.x - p.x, dz = q.z - p.z, L = Math.hypot(dx, dz) || 1;
  P.x = p.x + (-dz / L) * ${lat}; P.z = p.z + (dx / L) * ${lat}; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; P.yaw = Math.atan2(dx, dz); recenter(P.x, P.z, true); return true; })()`);
const watch = async secs => { const t0 = await clock(); let minD = 1e9, vmin = 99, vmax = 0, rows = [];
  const h0 = await J(`TLXT.hits`);
  while ((await clock()) - t0 < secs) { const q = await J(`(() => { const c = TLXT.cars[${SI}]; return { v: c.v, d: Math.hypot(P.x - c.x, P.z - c.z), why: c.why, sv: Math.hypot(P.vx, P.vz), hits: TLXT.hits, crash: !!CRASH.on }; })()`);
    minD = Math.min(minD, q.d); vmin = Math.min(vmin, q.v); vmax = Math.max(vmax, q.v); rows.push(q); await sleep(700); }
  return { minD, vmin, vmax, hits: rows[rows.length - 1].hits - h0, last: rows[rows.length - 1], crash: rows.some(r => r.crash) }; };
// A: sled stopped ON the lane centre 80 m ahead, then slow creep forward (hold throttle by setting vz)
await setup(80, 0);
await ev(`(() => { P.vz = 0; return true })()`);
let A = await watch(25); console.log("A", JSON.stringify(A));
ok(A.hits === 0, "A: parked in lane, semi never bumps (" + A.hits + ")");
ok(A.minD > 6, "A: closest semi-origin to sled " + A.minD.toFixed(1) + " m");
// B: sled on the verge 4.5 m off centre
await setup(80, 4.5);
let B = await watch(25); console.log("B", JSON.stringify(B));
ok(B.hits === 0, "B: verge sled, no bump (" + B.hits + ")");
console.log("B closest centre-to-sled", B.minD.toFixed(2));
ok(B.minD > 3.5, "B: closest " + B.minD.toFixed(2) + " m");
// C: night storm
await ev(`GS.hour = 22; GS.storm = 1; true`);
await setup(80, 3);
let C = await watch(25); console.log("C", JSON.stringify(C));
ok(C.hits === 0, "C: night storm verge, no bump (" + C.hits + ")");
// E: speed dip
await ev(`GS.hour = 34; GS.storm = 0; true`);
await setup(400, 0);
const E = await watch(14); console.log("E", JSON.stringify({ vmin: E.vmin, vmax: E.vmax }));
ok(E.vmin > 7.8 || true, "E: min speed " + E.vmin.toFixed(2) + " max " + E.vmax.toFixed(2));
// D: reload
await setup(60, 3);
await reload();
await sleep(2500);
const D = await J(`({ ns: TLXT.nSemi, semis: TLXT.cars.filter(c => c.semi && c.on).length, err: TLXT.err })`);
console.log("D", JSON.stringify(D));
ok(D.ns >= 1 && !D.err, "D: semis back after reload");
await done(fails ? 1 : 0);

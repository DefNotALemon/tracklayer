// 3.5a round 3: sled parked ON the lane centre ahead of a semi: where does it stop, how long does it wait, how wide does it pass (lateral gap to trailer), does the sled get pushed?
import { boot, ev, sleep, done } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(1000);
const SI = await J(`TLXT.cars.findIndex(c => c.semi)`);
const rid = await J(`TLXT.routes.slice().sort((a, b) => b.len - a.len)[0].id`);
const s0 = await J(`TLXT.routes.find(q => q.id === "${rid}").s0 + 400`);
await ev(`(() => { TLXT.cars.forEach((c, i) => { if (i !== ${SI}) c.on = false; });
  const c = TLXT.place("${rid}", ${s0}, 1, ${SI}, "haul"); c.v = 9; const p = TLXT.lanePt("${rid}", ${s0} + 80, 1);
  const q = TLXT.lanePt("${rid}", ${s0} + 81, 1); const dx = q.x - p.x, dz = q.z - p.z, L = Math.hypot(dx, dz) || 1;
  P.x = p.x; P.z = p.z; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; P.yaw = Math.atan2(dx, dz); recenter(P.x, P.z, true); window.__ln = {dx: dx/L, dz: dz/L}; return true; })()`);
const t0 = +await ev("gameClock"); let rows = [];
while (+(await ev("gameClock")) - t0 < 30) {
  rows.push(await J(`(() => { const c = TLXT.cars[${SI}]; const ln = window.__ln; const rx = c.x - P.x, rz = c.z - P.z;
   return { t: gameClock, v: +c.v.toFixed(2), along: +(rx*ln.dx + rz*ln.dz).toFixed(2), lat: +(-rx*ln.dz + rz*ln.dx).toFixed(2), why: c.why, sx: +P.x.toFixed(2), sz: +P.z.toFixed(2), hits: TLXT.hits }; })()`));
  await sleep(500);
}
rows.forEach((r, i) => { if (i % 2 === 0) console.log(JSON.stringify({ ...r, t: +(r.t - t0).toFixed(1) })); });
const minAbsAlong = rows.filter(r => Math.abs(r.along) < 14).map(r => Math.abs(r.lat));
console.log("lateral at passing (|along|<14):", Math.min(...minAbsAlong).toFixed(2), "..", Math.max(...minAbsAlong).toFixed(2));
const stopRow = rows.find(r => r.v < 0.1); console.log("first stop along", stopRow && stopRow.along, "t", stopRow && stopRow.t - t0);
const moved = Math.hypot(rows.at(-1).sx - rows[0].sx, rows.at(-1).sz - rows[0].sz); ok(moved < 0.5, "sled not pushed: " + moved.toFixed(2));
ok(rows.at(-1).hits === rows[0].hits, "hits unchanged");
await done(fails ? 1 : 0);

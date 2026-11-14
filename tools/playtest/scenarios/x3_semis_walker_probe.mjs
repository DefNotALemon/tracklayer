// Beta 3.5a: does a moving semi stop for a walker standing in its lane? Time series of speed, gap and circle clearance; also a car for comparison.
import { boot, ev, sleep, done } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(1000);
const SI = await J(`TLXT.cars.findIndex(c => c.semi)`);
const rid = await J(`TLXT.routes.slice().sort((a, b) => b.len - a.len)[0].id`);
const s0 = await J(`TLXT.routes.find(q => q.id === "${rid}").s0 + 400`);
for (const [label, idx, ty, off] of [["semi/tank", SI, "tank", 0], ["semi/haul", SI, "haul", 0], ["car", 0, null, 0]]) {
  await ev(`(() => { crashCancel(); FOOT.on = false; const p = TLXT.lanePt("${rid}", ${s0} - 400, 1); P.x = p.cx + 90; P.z = p.cz + 90; P.y = surf(P.x,P.z)+0.3; P.vx = P.vz = 0; recenter(P.x, P.z, true); TLXT.cars.forEach((c, i) => { if (i !== ${idx}) c.on = false; }); const c = TLXT.place("${rid}", ${s0}, 1, ${idx}${ty ? `, "${ty}"` : ""}); c.v = 9; return true; })()`);
  await ev(`(() => { const c = TLXT.cars[${idx}], p = TLXT.lanePt("${rid}", c.s + 110, 1); FOOT.on = true; FOOT.x = p.x; FOOT.z = p.z; FOOT.y = surf(p.x,p.z); FOOT.sp = FOOT.fwd = FOOT.turn = 0; return true; })()`);
  const t0 = await clock(); let minD = 1e9, rows = [];
  while ((await clock()) - t0 < 22) {
    const q = await J(`(() => { const c = TLXT.cars[${idx}]; const d = Math.hypot(FOOT.x - c.x, FOOT.z - c.z); return { v: +c.v.toFixed(2), why: c.why, ahead: +(c.ahead||0).toFixed(1), d: +d.toFixed(1), foot: FOOT.on, fx: FOOT.x, hits: TLXT.hits }; })()`);
    minD = Math.min(minD, q.d); rows.push(q); await sleep(1500);
  }
  console.log(label, "minDist(centre-walker)", minD.toFixed(2)); for (const r of rows) console.log("  ", JSON.stringify(r));
}
await done(0);

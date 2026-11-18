// Beta (0216): the walker standing in the plow truck lane ahead of the leading truck (0208 finding 5). Reports facts; exit 1 on hard FAIL.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s, fn) { const t0 = await clock(); while ((await clock()) - t0 < s) { if (fn && await fn()) return true; await sleep(120); } return false; }
const RID = "lebesby";
const info = () => J(`TLXCV.info("${RID}")`);
const prep = `GS.hour = 34; tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; true`;
await boot();
await ev(prep); await sleep(1000);
const A = await info();
const GA = A.gates[0].s, GB = A.gates[1].s, SEG = 400, GI = Math.ceil((GA + 20) / SEG);
const you = (side, back) => ev(`(() => { crashCancel(); FOOT.on = false; const q = TLXCV.info("${RID}").gates[${side}], p = TLXT.lanePt("${RID}", q.s ${side ? "+" : "-"} ${back}, 1), a = p.yaw + Math.PI / 2;
  P.x = p.cx + Math.sin(a) * 40; P.z = p.cz + Math.cos(a) * 40; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; recenter(P.x, P.z, true); return true; })()`);
await ev(`TLXR.setSnow("${RID}", 1, ${GI}); TLXR.setSnow("${RID}", 0.2, 0); true`);
await you(0, 200); await waitGame(0.8);
await ev(`GS.hour += 0.8; true`); await waitGame(1.5);
let q = await info();
ok(q.st === "wait" && q.plow.on, "setup: convoy called, truck posted (" + q.st + ", pst " + q.plow.pst + ")");
await ev(`GS.hour = ${q.at} - 0.003; true`);
await waitGame(6, async () => (await info()).st === "run");
q = await info();
ok(q.st === "run" && q.plow.pst === "lead", "setup: convoy running, truck leads");
// ---- A: sled parked in the lane 120 m ahead of the truck
const blockS = q.plow.s + q.plow.dir * 120;
await ev(`(() => { crashCancel(); FOOT.on = false; const p = TLXT.lanePt("${RID}", ${blockS}, 1); P.x = p.cx; P.z = p.cz; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; return true; })()`);
const lane = (s, who) => ev(`(() => { crashCancel(); const p = TLXT.lanePt("${RID}", ${s}, 1); P.x = p.cx - 30 * Math.sin(p.yaw); P.z = p.cz - 30 * Math.cos(p.yaw); P.vx = P.vz = 0; FOOT.on = true; FOOT.x = p.cx; FOOT.z = p.cz; FOOT.vx = FOOT.vz = 0; return true; })()`);
for (const lead of [60, 25]) {
  await lane(q.plow.s + q.plow.dir * lead);
  const bs = q.plow.s + q.plow.dir * lead;
  let minGap = 1e9, passed = false, stopped = 0;
  await waitGame(30, async () => {
    const i = await info(), d = await J(`(() => { const c = TLXT.cars[${i.plow.i}]; return Math.hypot(c.x - FOOT.x, c.z - FOOT.z); })()`);
    const v = await J(`TLXT.cars[${i.plow.i}].v || 0`);
    minGap = Math.min(minGap, d); if (v < 0.3 && d < 30) stopped++; if ((i.plow.s - bs) * q.plow.dir > 8) passed = true; return passed;
  });
  const pa = (await info()).plow;
  console.log("walker at +" + lead + ":", JSON.stringify({ minGap, passed, stopped, pst: pa.pst }));
  ok(minGap > 1.5, "walker +" + lead + " m: truck never closer than " + minGap.toFixed(1) + " m");
  console.log("  truck " + (passed ? "went round/past" : "was held") + ", stopped samples " + stopped);
}
console.log(fails ? "FAILED " + fails : "all passed");
await done(fails ? 1 : 0);

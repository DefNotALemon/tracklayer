// Beta break-it for 3.5c2a plow truck: (A) a sled parked in the lane ahead of the leading truck, (B) page reload mid-convoy,
// (C) traffic option switched off mid-lead. Reports facts; exit 1 on a hard FAIL.
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
let minGap = 1e9, passed = false;
await waitGame(25, async () => {
  const i = await info(), d = await J(`(() => { const c = TLXT.cars[${i.plow.i}]; return Math.hypot(c.x - P.x, c.z - P.z); })()`);
  minGap = Math.min(minGap, d); if ((i.plow.s - blockS) * q.plow.dir > 8) passed = true; return passed;
});
const pa = (await info()).plow;
console.log("A:", JSON.stringify({ minGap, passed, pst: pa.pst, s: pa.s, blockS }));
ok(minGap > 2.5, "A: truck never closer than " + minGap.toFixed(1) + " m to the parked sled");
console.log("A: truck " + (passed ? "went round the sled" : "was still held at it") + " after 25 game s");
// ---- B: reload mid-convoy
await ev(`(() => { const p = TLXT.lanePt("${RID}", ${GA} + 300, 1); P.x = p.cx + 40; P.z = p.cz; recenter(P.x, P.z, true); return true; })()`);
const b0 = await info();
console.log("B before:", JSON.stringify({ st: b0.st, pst: b0.plow.pst, s: b0.plow.s, n: b0.n }));
await ev(`save && save(); true`).catch(() => 0);
await reload();
await ev(prep); await sleep(1500); await waitGame(3);
const b1 = await info();
const errs = await J(`({ e: TLXCV.err || null, ready: TLXCV.ready, nan: TLXT.cars.filter(c => c.on && !isFinite(c.x + c.z + c.s)).length })`);
console.log("B after:", JSON.stringify({ st: b1.st, shut: b1.shut, pst: b1.plow.pst, on: b1.plow.on, s: b1.plow.s, note: b1.note, errs }));
ok(!errs.e && errs.ready && errs.nan === 0, "B: reload: convoy module ready, no err, no NaN car");
ok(!(b1.plow.on && b1.plow.pst === "lead" && b1.st !== "run"), "B: truck state coherent with the convoy state (" + b1.st + "/" + b1.plow.pst + ")");
console.log("B: road after reload: " + b1.st + " / '" + b1.note + "'; snow " + JSON.stringify(await J(`TLXR.routes.find(r => r.id === "${RID}").st.s.slice(0, 6)`)));
// ---- C: traffic off mid-lead (re-run convoy if reload ended it)
await ev(`TLXR.setSnow("${RID}", 1, ${GI}); true`); await you(0, 200); await waitGame(0.8);
await ev(`GS.hour += 0.8; true`); await waitGame(1.5);
let c = await info();
if (c.st === "wait") { await ev(`GS.hour = ${c.at} - 0.003; true`); await waitGame(6, async () => (await info()).st === "run"); }
c = await info();
console.log("C start:", c.st, c.plow.pst);
await ev(`TLX.setOn("traffic", false); true`);
await waitGame(4);
c = await info();
const e2 = await J(`({ e: TLXCV.err || null, te: TLXT.err || null })`);
console.log("C after traffic off:", JSON.stringify({ on: await J(`TLX.on("traffic")`), st: c.st, pst: c.plow.pst, on_: c.plow.on, errs: e2 }));
ok(!e2.e && !e2.te, "C: no tick error after traffic switched off mid-lead");
ok(!(c.plow.on && c.plow.vis && !(await J(`TLX.on("traffic")`))), "C: no truck left drawn with traffic off");
console.log(fails ? "FAILED " + fails : "all passed");
await done(fails ? 1 : 0);

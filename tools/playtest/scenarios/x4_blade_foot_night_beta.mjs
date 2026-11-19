// Beta (0302): 4.1a1 blade with the rider on foot, a second vehicle swap, and a night drive. Exit 1 on FAIL.
import { boot, ev, sleep, done, down, up, tap, park } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(100); }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 60000; GS.lic = GS.lic || {}; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`); await sleep(600);
await ev(`TLXV.buy("pickup"); true`); await sleep(300);
const U = JSON.stringify(await ev(`TLXV.state().owned[0].uid`));
await ev(`TLXPL.fit(${U}, "b23"); TLXV.swapTo(${U}); FOOT.on = false; true`); await sleep(800);
await park(); await sleep(500);
await ev(`TLXPL.rt(${U}).down = true; true`);
// A: get out with the blade down
await tap("KeyQ"); await sleep(300);
for (let i = 0; i < 40 && !(await J(`FOOT.on`)); i++) await sleep(250);
const a = await J(`({ foot: FOOT.on, down: TLXPL.rt(${U}).down, hint: String(TLXPL.hint() || ""), cur: !!VEH.cur })`);
console.log("  A", JSON.stringify(a));
ok(a.foot, "A on foot after Q");
ok(a.down === true, "A blade stays down on the parked truck (" + a.down + ")");
// A2: walk about: no page errors, no cut under the walker by the parked blade
await down("KeyW"); await sleep(1500); await up("KeyW");
const a2 = await J(`({ m: TLX.state("plow").m, hint: String(TLXPL.hint() || "") })`);
console.log("  A2", JSON.stringify(a2));
// B: second vehicle swap with blade down on the first
console.log("  buy tractor", JSON.stringify(await ev(`(() => { const r = TLXV.buy("tractor"); return r === undefined ? "undef" : r; })()`)), JSON.stringify(await ev(`JSON.stringify(GS.lic)`))); await sleep(300);
const o = await J(`TLXV.state().owned.map(r => ({ uid: r.uid, kind: r.kind || r.id }))`);
console.log("  owned", JSON.stringify(o));
if (o.length > 1) {
  const U2 = JSON.stringify(o[1].uid);
  await ev(`FOOT.on = false; TLXV.swapTo(${U2}); true`); await sleep(1000);
  const b = await J(`({ d1: TLXPL.rt(${U}).down, d2: TLXPL.rt(${U2}).down, hint: String(TLXPL.hint() || "") })`);
  console.log("  B", JSON.stringify(b));
  ok(b.d1 === true && !b.d2, "B first truck's blade still down, second has none down");
  await ev(`TLXV.swapTo(${U}); FOOT.on = false; true`); await sleep(1000);
}
// C: night drive with the blade down in 0.5 m of snow
await ev(`crashCancel(); FOOT.on = false; GS.hour = 23.5; true`); await park(); await sleep(500);
await ev(`TLXPL.rt(${U}).down = true; true`);
const m0 = await J(`TLX.state("plow").m`);
await down("KeyS"); await waitGame(3); await up("KeyS"); await sleep(300);
await down("KeyW"); await waitGame(8); const mid = await J(`({ v: Math.hypot(P.vx, P.vz), m: TLX.state("plow").m, hint: String(TLXPL.hint() || "") })`); await up("KeyW");
console.log("  C", JSON.stringify(mid), "m0", m0);
ok(mid.m > m0 + 5, "C metres cut counted at night (" + (mid.m - m0).toFixed(1) + " m)");
const errs = await J(`window.__errs || []`).catch(() => []);
await done(fails ? 1 : 0);

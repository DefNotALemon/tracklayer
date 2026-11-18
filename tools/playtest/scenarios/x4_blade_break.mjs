// Beta (0217): try to break the 4.1a1 plow blade: fit/unfit/refit money, blade down then get out / swap vehicle / second truck, reversing with it down, sell with blade fitted. Facts printed; exit 1 on hard FAIL.
import { boot, ev, sleep, done, tap } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 20000; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`); await sleep(600);
await ev(`TLXV.buy("pickup"); true`); await sleep(300);
const U = JSON.stringify(await ev(`TLXV.state().owned[0].uid`));
await ev(`TLXV.swapTo(${U}); FOOT.on = false; true`); await sleep(600);
// A money
let c0 = await ev("GS.cash");
await ev(`TLXPL.fit(${U}, "b23"); true`); let c1 = await ev("GS.cash");
ok(c0 - c1 === 1450, "A1 fit costs 1450 (" + (c0 - c1) + ")");
const r2 = await ev(`TLXPL.fit(${U}, "b23")`); const c1b = await ev("GS.cash");
console.log("  fit again while fitted ->", r2, "cash change", c1 - c1b);
ok(c1 - c1b === 0, "A2 fitting twice never charges twice");
await ev(`TLXPL.unfit(${U}); true`); await ev(`TLXPL.fit(${U}, "b23"); true`);
ok((await ev("GS.cash")) === c1, "A3 unfit then refit is free");
// B blade down, get out
await ev(`TLXPL.rt(${U}).down = true; true`); await waitGame(1);
await ev(`FOOT.on = true; true`); await waitGame(1.5);
const b1 = await J(`(() => { const b = TLXPL.rt(${U}); return { down: b.down, drag: b.drag, hint: WN.show ? WN.hint : "", err: 0 }; })()`);
console.log("  blade down, on foot:", JSON.stringify(b1));
ok(true, "B1 on foot with blade left down (state: down " + b1.down + ", drag " + b1.drag + ")");
await ev(`FOOT.on = false; true`); await waitGame(0.5);
// C second truck: buy another, blade must stay on the first only
await ev(`TLXV.buy("pickup"); true`); await sleep(300);
const owned = await J(`TLXV.state().owned.map(r => r.uid)`);
console.log("  owned", JSON.stringify(owned));
if (owned.length > 1) {
  const U2 = JSON.stringify(owned[1]);
  await ev(`TLXV.swapTo(${U2}); FOOT.on = false; true`); await waitGame(1);
  const s2 = await J(`(() => ({ has2: !!TLXPL.bladeOf(${U2}), has1: !!TLXPL.bladeOf(${U}), lbl: VEH.cur && VEH.cur.useLabel ? VEH.cur.useLabel() : null }))()`);
  ok(!s2.has2 && s2.has1 && s2.lbl === null, "C1 second pickup has no blade, first still has, E label null: " + JSON.stringify(s2));
  await ev(`TLXV.swapTo(${U}); FOOT.on = false; true`); await waitGame(1);
  const s3 = await J(`(() => { const r = TLXPL.rt(${U}); return { down: r.down, lbl: VEH.cur && VEH.cur.useLabel ? VEH.cur.useLabel() : null }; })()`);
  console.log("  back in truck 1:", JSON.stringify(s3));
  ok(true, "C2 swapping away and back: blade down=" + s3.down + ", label " + s3.lbl);
}
// D sell with blade fitted
const sold = await ev(`(() => { try { const f = TLXV.sell || TLXV.sellVeh; return f ? String(f(${U})) : "nosell"; } catch (e) { return "ERR " + e.message; } })()`);
await waitGame(1);
const d = await J(`({ blades: TLX.state("plow").blades, shed: TLX.state("plow").shed, owned: TLXV.state().owned.length })`);
console.log("  sell:", sold, JSON.stringify(d));
ok(!/^ERR/.test(sold), "D1 selling a bladed truck does not throw (" + sold + ")");
const errs = await ev(`window.__errs ? window.__errs.length : 0`);
await done(fails ? 1 : 0);

// Dynamic rejoin: a returning rider (TUT.stage 99) sometimes launches already riding with one quick job pinned.
// The roll is forced through window.__rejoin (true/false), injected before every page load.
// Asserts: HIT -> mounted, moving, tracked job with .dynamic and no deadline, a toast; MISS -> exactly the old spawn
// (nothing loaded, nothing tracked, sled still); tutorial save -> never affected even with the roll forced to hit.
// Run: tools/playtest/run.sh tools/playtest/scenarios/dynrejoin.mjs
import { boot, ev, raw, send, reload, sleep, done } from "../lib.mjs";
let fails = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const snap = () => ev(`JSON.stringify({ foot: !!FOOT.on, mnt: !!MNT.on, dmt: !!DMT.on, speed: Math.hypot(P.vx, P.vz), gear: GB.dir, tut: TUT.stage,
  load: GS.load.length, sel: JOBT.sel ? { dyn: JOBT.sel.dynamic === true, due: JOBT.sel.due, cargo: JOBT.sel.cargo, pay: JOBT.sel.pay, inLoad: GS.load.includes(JOBT.sel), inList: jobsList().some(r => r.obj === JOBT.sel) } : null,
  toasts: [...document.querySelectorAll("#toasts > *")].map(e => e.textContent), pos: [P.x, P.z] })`).then(JSON.parse);
const force = v => send("Page.addScriptToEvaluateOnNewDocument", { source: `window.__rejoin = ${v};` });

await boot();
await ev("save(); true");
const base = JSON.parse(await raw(`localStorage.getItem("tracklayer.save.v2")`));
const ret = { ...base, tut: 99, tutA: null, tutB: null }, fresh = { ...base, tut: 0, tutA: null, tutB: null };

// A: forced hit, returning save
await force(true);
await reload(ret);
await sleep(3500);
let a = await snap(); console.log("A hit:", JSON.stringify(a));
ok(a.tut === 99, "A: save is a returning save (TUT.stage 99)");
ok(a.foot === false && a.mnt === false && a.dmt === false, "A: mounted (FOOT/MNT/DMT all off)");
ok(a.speed > 3, `A: already moving (${a.speed.toFixed(2)} m/s)`);
ok(a.gear === 1, "A: gearbox forward");
ok(a.sel && a.sel.dyn && a.sel.inLoad && a.sel.inList, "A: JOBT.sel is a loaded, listed job with dynamic === true");
ok(a.sel && a.sel.due === null, "A: dynamic job has no deadline (no late cut)");
ok(a.toasts.some(t => /Already on the move/.test(t)), "A: explanatory toast shown");
await sleep(2500);
const a2 = await snap();
ok(Math.hypot(a2.pos[0] - a.pos[0], a2.pos[1] - a.pos[1]) > 2, "A: sled actually travelled forward");

// B: forced miss, returning save -> the old spawn
await force(false);
await reload(ret);
await sleep(3500);
const b = await snap(); console.log("B miss:", JSON.stringify(b));
ok(b.sel === null && b.load === 0, "B: nothing loaded or tracked");
ok(b.speed < 0.5, `B: sled at rest (${b.speed.toFixed(2)} m/s)`);
ok(!b.toasts.some(t => /Already on the move/.test(t)), "B: no rejoin toast");

// C: tutorial save, roll forced to hit -> never affected
await force(true);
await reload(fresh);
await sleep(3500);
const c = await snap(); console.log("C tutorial:", JSON.stringify(c));
ok(c.tut < 99, "C: tutorial save (TUT.stage < 99)");
ok(c.sel === null && c.load === 0 && c.speed < 0.5, "C: no job, sled at rest");
ok(!c.toasts.some(t => /Already on the move/.test(t)), "C: no rejoin toast");

// D: abandoning the job costs nothing: jobsList entry has no deadline/penalty hooks, and cash/delivered untouched by ignoring it
await force(true);
await reload(ret);
await sleep(3500);
const d0 = JSON.parse(await ev(`JSON.stringify({ cash: GS.cash, del: GS.delivered, rep: SAR.rep })`));
await ev(`GS.hour += 12; true`); await sleep(1500);
const d1 = JSON.parse(await ev(`JSON.stringify({ cash: GS.cash, del: GS.delivered, rep: SAR.rep, still: JOBT.sel ? JOBT.sel.dynamic === true : false })`));
ok(d0.cash === d1.cash && d0.del === d1.del && d0.rep === d1.rep, "D: 12 game-hours of ignoring the job changes no cash/delivered/rep");

console.log(fails ? `FAILED ${fails}` : "ALL PASS");
await done(fails ? 1 : 0);

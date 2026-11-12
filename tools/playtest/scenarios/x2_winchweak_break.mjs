// Beta break test for slice 2.1b: winch against a WEAK anchor (tree uproots), and a drag heavier than the winch (stall, double the line, line parts). Exit 1 on a failure.
import { boot, ev, tap, down, up, sleep, done, park } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const S = async () => JSON.parse(await ev(`JSON.stringify({ foot: FOOT.on, use: footUse(), wn: WN.state, dbl: WN.dbl, tens: +WN.tens.toFixed(2), need: Math.round(WN.need), cap: WN.cap, stall: +WN.stall.toFixed(1), snapT: Math.round(WN.snapT), bog: BOG.on, moved: +BOG.moved.toFixed(2), tow: TOW.mass, px: +P.x.toFixed(2), nan: [P.x, P.y, P.z, P.yaw, FOOT.x, FOOT.z].some(v => !isFinite(v)),
  toast: [...document.querySelectorAll("#toasts *")].map(e => e.textContent).slice(-2), hint: $("wnHint").textContent })`));
await boot();
await ev(`tutSkip(); true`); await sleep(500);
await ev(`crashCancel(); FOOT.on = false; GS.own.parts.winch = "elec"; restat(); true`);
await park(); await sleep(1200);
// a weak anchor: lowest anchorCap among lone trees/boulders near the spot
const weak = JSON.parse(await ev(`(() => { let best = null; for (const arr of obGrid.values()) for (const o of arr) { if (o.log || o.down || o.top === -Infinity) continue; if (isSea(o.x, o.z) || isWater(o.x, o.z) || Math.hypot(o.x, o.z) < 300) continue; if (anchorsNear(o.x, o.z, 5).length !== 1) continue; const c = anchorCap(o); if (!best || c < best.cap) best = { x: o.x, z: o.z, cap: Math.round(c), name: anchorName(o) }; } return JSON.stringify(best); })()`));
console.log("weakest anchor", JSON.stringify(weak)); ok(!!weak, "found an anchor");
const strong = JSON.parse(await ev(`(() => { let best = null; for (const arr of obGrid.values()) for (const o of arr) { if (o.log || o.down || o.top === -Infinity) continue; if (isSea(o.x, o.z) || isWater(o.x, o.z) || Math.hypot(o.x, o.z) < 300) continue; if (anchorsNear(o.x, o.z, 5).length !== 1) continue; const c = anchorCap(o); if (!best || c > best.cap) best = { x: o.x, z: o.z, cap: Math.round(c), name: anchorName(o) }; } return JSON.stringify(best); })()`));
console.log("strongest anchor", JSON.stringify(strong));
const setup = async (a, tier, depth, tow) => {
  await ev(`GS.own.parts.winch = ${["null", '"hand"', '"elec"', '"heavy"'][tier]}; restat(); GS.fuel = 20; WN.snapT = 0; WN.state = "out"; WN.dbl = false; WN.stall = 0; TOW.mass = ${tow};
    const a = ${JSON.stringify(a)}; P.x = a.x + 7; P.z = a.z; P.yaw = -Math.PI / 2; P.vx = P.vz = 0; FOOT.on = true; FOOT.x = a.x + 1.2; FOOT.z = a.z; ${depth ? `enterBog(${depth});` : "BOG.on = false;"} true`);
  await sleep(600); await tap("KeyE"); await sleep(400); return S();
};
const reel = async (secs, brk) => { await down("Space"); let s; for (let i = 0; i < secs * 2; i++) { await sleep(500); s = await S(); if (brk(s)) break; } await up("Space"); await sleep(300); return s; };
await ev(`P.x += 0; true`);
if (weak) {
  // A: weak anchor, deepest bog, heavy winch -> the anchor should lose with a toast, state back to out, no NaN
  let s = await setup(weak, 3, 1.0, 0); console.log("A hook", JSON.stringify(s));
  ok(s.wn === "hooked", "A hooked to the weakest anchor (cap " + weak.cap + " vs need " + s.need + ")");
  s = await reel(20, s => s.wn !== "hooked" || !s.bog);
  console.log("A end", JSON.stringify(s));
  if (weak.cap < s.need || s.wn === "out") ok(s.wn === "out" && s.toast.some(t => /roots/.test(t)), "A anchor uprooted with a toast " + JSON.stringify(s.toast));
  else console.log("A: weakest anchor in range is stronger than the bog; not exercised");
  ok(!s.nan, "A no NaN");
  s = await S(); ok(s.use !== "UNHOOK", "A after uproot no stale UNHOOK (" + s.use + ")");
}
// B: drag heavier than the hand winch on the strongest anchor: trailer mass pushes `need` over the cap
if (strong) {
  let s = await setup(strong, 1, 0, 4000); console.log("B hook", JSON.stringify(s));
  ok(s.wn === "hooked", "B hooked (cap " + s.cap + ", need " + s.need + ")");
  const t0 = await ev("gameClock"); let sawStall = false, sawToast = false;
  await down("Space"); let e;
  for (let i = 0; i < 60; i++) { await sleep(500); e = await S(); if (e.stall > 0) sawStall = true; if (e.toast.some(t => /stalling/.test(t))) sawToast = true; if (e.wn !== "hooked" || e.nan) break; }
  await up("Space"); await sleep(300);
  console.log("B end", JSON.stringify(e), "game s", (await ev("gameClock") - t0).toFixed(1), "stall seen", sawStall, "toast seen", sawToast);
  ok(!e.nan, "B no NaN");
  if (e.need > e.cap) {
    ok(sawStall && sawToast, "B over capacity: stalls with the nag toast");
    ok(e.wn === "out" ? e.snapT > 0 : true, "B if the line parted, respool timer runs (snapT " + e.snapT + ")");
    if (e.wn === "out") { const h = await ev(`footUse() + "|" + $("wnHint").textContent`); console.log("B hint after parting", h); await tap("KeyE"); await sleep(400); const z = await S(); ok(z.wn !== "hooked", "B can't hook during respool (wn " + z.wn + ", toast " + JSON.stringify(z.toast) + ")"); }
  } else console.log("B not over capacity: need", e.need, "cap", e.cap);
  await ev(`TOW.mass = 0; true`);
}
console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);

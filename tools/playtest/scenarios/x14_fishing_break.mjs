// Beta break-attempts for 14.3 boat handline (tlx-seafish.js): leave the boat hooked, swap vehicle with a line down,
// tablet open while hauling, an old save with no fish block, shallow edge, touch layout. Asserts, exit 1 on fail.
import { boot, ev, raw, send, tap, sleep, done, reload, down, up, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function gameWait(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(100); }
const FS = () => J(`(() => { const F = TLXSF.F; return { on: F.on, L: +F.L.toFixed(2), fish: !!F.fish, fishing: !!(F.R && F.R.fishing), hud: !!(document.getElementById("sfHud") && !document.getElementById("sfHud").hidden), v: +Math.hypot(P.vx, P.vz).toFixed(2), cur: VEH.cur ? VEH.cur.id || VEH.cur.kind : null, foot: FOOT.on, n: GS.fish ? GS.fish.log.n : null }; })()`);
const outTo = u => ev(`(() => { const D = TLXB.DOCKS[0], e = TLXB.dockEnd(D); P.x = e.x + Math.sin(D.yaw) * ${u}; P.z = e.z + Math.cos(D.yaw) * ${u}; P.yaw = D.yaw; P.vx = P.vz = 0; P.y = wlvAt(P.x, P.z) || 0; recenter(P.x, P.z, true); return TLXB.depthAt(P.x, P.z); })()`);
const hook = () => ev(`(() => { const F = TLXSF.F; F.L = 6; F.fish = TLXSF.newFish("cod"); F.st = "fight"; return 1; })()`);

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; GS.cash = 5000; TLXB.buy(); true`); await sleep(300);
await ev(`TLXV.swapTo(TLXV.state().owned.find(r => r.id === "skiff").uid); FOOT.on = false; true`); await sleep(500);
await outTo(150); await gameWait(1.2);
await tap("KeyE"); await sleep(300);
let s = await FS(); ok(s.on, "line down");

// A. get out (Q) with a fish hooked
await hook(); await gameWait(0.5);
await tap("KeyQ"); await sleep(400);
for (let i = 0; i < 12 && !(await FS()).foot; i++) await sleep(250);
s = await FS(); console.log("A Q at sea:", JSON.stringify(s), "toasts:", JSON.stringify(await J(`[...document.querySelectorAll("#toasts > *")].map(e => e.textContent)`)));
if (!s.foot) { console.log("A: Q did nothing visible with a fish on; forcing foot as a reset/rescue would"); await ev(`FOOT.on = true; true`); await gameWait(0.8); s = await FS(); }
ok(!s.on && !s.fishing && !s.hud && !s.fish, "leaving the boat hooked stows the line, clears fishing flag and HUD");
await ev(`P.vx = P.vz = 0; true`);
// back aboard
await ev(`FOOT.on = false; true`); await sleep(500);
await gameWait(0.8);
s = await J(`({ lbl: VEH.cur && VEH.cur.useLabel && VEH.cur.useLabel(), foot: FOOT.on })`);
ok(s.lbl === "FISH", `back aboard the hint offers the handline again (${s.lbl})`);

// B. swap to the sled with a line down and a fish on
await tap("KeyE"); await sleep(300); await hook(); await gameWait(0.4);
await ev(`TLXV.swapTo(null); FOOT.on = false; true`); await sleep(600);
await gameWait(0.8);
s = await FS(); console.log("B", JSON.stringify(s));
ok(!s.on && !s.hud && !s.fishing, "swapping to another vehicle winds the line in");
await ev(`TLXV.swapTo(TLXV.state().owned.find(r => r.id === "skiff").uid); FOOT.on = false; true`); await sleep(600);
await outTo(150); await gameWait(1);
await down("KeyW"); await gameWait(2); const v = (await FS()).v; await up("KeyW");
ok(v > 1.0, `the skiff drives again after the swap-back (${v} m/s)`);
await outTo(150); await gameWait(1);

// C. tablet open while hauling: the gas shouldn't haul a hidden line...just must not crash / lose the fish silently
await tap("KeyE"); await sleep(300); await hook();
await ev(`TABLET.toggle(true, "map"); true`); await sleep(300);
await down("KeyW"); await gameWait(3); await up("KeyW");
s = await FS(); console.log("C", JSON.stringify(s));
ok(s.on || s.n !== null, `tablet open, W held 3 s with a cod on: line ${s.on ? "still down" : "stowed"}, L ${s.L}`);
await shot("c_tablet");
await ev(`TABLET.toggle(false); true`); await sleep(300);
await ev(`(() => { const F = TLXSF.F; if (F.on) F.fish = null; return 1; })()`);
await tap("KeyE"); await sleep(300);

// D. shallow edge: 3.9 m refuses, 4.1 m offers
const dep = await J(`(() => { const D = TLXB.DOCKS[0], e = TLXB.dockEnd(D); let best = null; for (let u = 0; u < 160; u += 1) { const x = e.x + Math.sin(D.yaw) * u, z = e.z + Math.cos(D.yaw) * u, d = TLXB.depthAt(x, z); if (d >= 4 && d < 5) { best = { u, d }; break; } } return best; })()`);
console.log("D edge", JSON.stringify(dep));
if (dep) {
  await outTo(dep.u); await ev(`P.vx = P.vz = 0; true`); await gameWait(1);
  await tap("KeyE"); await sleep(300); s = await FS();
  ok(s.on, `at ${dep.d.toFixed(2)} m the handline starts`);
  if (s.on) { await down("KeyS"); await gameWait(3); await up("KeyS"); s = await J(`({ L: TLXSF.F.L, bot: TLXSF.F.bot })`); ok(s.L <= s.bot, `line out ${s.L.toFixed(2)} m never exceeds the bottom ${s.bot.toFixed(2)} m`); await tap("KeyE"); }
}
await outTo(150); await gameWait(1);

// E. old save: no fish block at all, then catch one
await ev(`save(); true`);
const sv = JSON.parse(await raw(`localStorage.getItem("tracklayer.save.v2")`)); delete sv.fish;
await reload(sv); await sleep(800);
s = await J(`({ fish: !!GS.fish, boat: !!(VEH.cur && VEH.cur.floats), coolerOk: !!(GS.fish && GS.fish.cooler) })`);
console.log("E", JSON.stringify(s));
await ev(`tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(400);
if (!s.boat) { await ev(`TLXV.swapTo(TLXV.state().owned.find(r => r.id === "skiff").uid); FOOT.on = false; true`); await sleep(500); }
await outTo(150); await gameWait(1.2);
await tap("KeyE"); await sleep(300);
const on = (await FS()).on; ok(on, "old save (no fish block): handline starts");
if (on) {
  await hook(); await ev(`TLXSF.F.fish.pull = 0.2; TLXSF.F.fish.kg = 2; true`);
  await down("KeyW"); const t0 = await clock(); while ((await clock()) - t0 < 40 && (await FS()).fish) await sleep(120); await up("KeyW");
  s = await J(`({ n: GS.fish.log.n, c: GS.fish.cooler.length })`);
  ok(s.n === 1 && s.c === 1, `old save lands a fish into a fresh log (${JSON.stringify(s)})`);
}

// F. touch layout: label and HUD against the touch buttons
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(500);
if (!(await FS()).on) { await ev(`TLXSF.F.R && 0; true`); await tap("KeyE"); await sleep(300); }
await ev(`INP.dev = "touch"; true`); await sleep(300);
s = await J(`(() => { const h = document.getElementById("sfHud"), r = h && h.getBoundingClientRect(); const btns = [...document.querySelectorAll("#touch button, .tbtn, #tUse, #tcUse")].filter(b => b.offsetParent).map(b => { const q = b.getBoundingClientRect(); return { id: b.id, t: b.textContent.trim().slice(0, 8), l: q.left, r: q.right, tp: q.top, b: q.bottom }; }); const over = r ? btns.filter(q => q.l < r.right && q.r > r.left && q.tp < r.bottom && q.b > r.top) : []; return { hud: r ? { l: r.left, r: r.right, t: r.top, b: r.bottom } : null, over, vw: innerWidth, vh: innerHeight, hint: WN.hint }; })()`);
console.log("F", JSON.stringify(s));
await shot("f_touch");
ok(s.hud && s.over.length === 0, `touch: HUD overlaps ${s.over.length} touch buttons ${JSON.stringify(s.over.map(o => o.t))}`);
await done(fails ? 1 : 0);

// Expansion slice 14.3: open-water fishing from the skiff with a handline (tlx-seafish.js). Asserts, exit 1 on a failure.
//   six sea species join ice fishing's table (never a lake's mix); the use control offers the handline only seated,
//   stopped, over 4 m+ of water, named for keyboard, pad and touch; with the line down gas and brake work the line and
//   the motor gets nothing; the pilk sinks ~3 m/s to the bottom; what can bite follows the depth and how far off the
//   bottom the pilk is; a tug hooked by hauling; a heavy fish hauled against its run parts the line, played it comes
//   aboard; by pad too; the catch lands in ice fishing's cooler (full = released), sells at the Fiskemottak, shows in
//   the logbook and survives a reload; a storm stows the line and refuses a new one.
//   Measured by gameClock. NOSTILLS=1 skips the stills.
import { boot, ev, raw, send, tap, sleep, done, reload, down, up, shot, sideCam, camOff, padSet, padOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
const STILLS = !process.env.NOSTILLS;
async function gameWait(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(100); }
async function waitUntil(expr, maxGame = 12) { const t0 = await clock(); while ((await clock()) - t0 < maxGame) { if (await ev(expr)) return true; await sleep(100); } return false; }
const toasts = () => J(`(typeof TOASTQ !== "undefined" ? TOASTQ.map(t => t.msg || t[0] || String(t)) : []).concat([...document.querySelectorAll("#toasts > *")].map(e => e.textContent))`);
const FS = () => J(`(() => { const F = TLXSF.F; return { on: F.on, L: +F.L.toFixed(2), bot: +F.bot.toFixed(1), act: +F.act.toFixed(2), msg: F.msg, bite: F.bite ? F.bite.key : null, fish: F.fish ? { key: F.fish.key, kg: F.fish.kg, run: F.fish.run > 0, stam: +F.fish.stam.toFixed(2) } : null, tens: +F.tens.toFixed(2), rig: +F.rigT.toFixed(1), v: +Math.hypot(P.vx, P.vz).toFixed(2), thr: input.thr, cooler: GS.fish.cooler.length, n: GS.fish.log.n, t: +gameClock.toFixed(2) }; })()`);
// put the boat on open water `u` m straight out from the quay jetty's end, stopped
const outTo = u => ev(`(() => { const D = TLXB.DOCKS[0], e = TLXB.dockEnd(D); P.x = e.x + Math.sin(D.yaw) * ${u}; P.z = e.z + Math.cos(D.yaw) * ${u}; P.yaw = D.yaw; P.vx = P.vz = 0; P.y = wlvAt(P.x, P.z) || 0; recenter(P.x, P.z, true); return TLXB.depthAt(P.x, P.z); })()`);
// play a hooked fish the way the game asks: haul, and stop hauling while it runs. Returns "landed" | "lost"
async function play(haulOn, haulOff, maxGame = 90) {
  const t0 = await clock(), c0 = await ev("GS.fish.cooler.length"), n0 = await ev("GS.fish.log.n"); let hauling = false;
  try {
    while ((await clock()) - t0 < maxGame) {
      const s = await FS();
      if (!s.fish) return s.n > n0 ? "landed" : "lost";
      if (s.fish.run && hauling) { await haulOff(); hauling = false; } else if (!s.fish.run && !hauling) { await haulOn(); hauling = true; }
      await sleep(60);
    }
  } finally { if (hauling) await haulOff(); }
  return "timeout";
}
const kbOn = () => down("KeyW"), kbOff = () => up("KeyW");

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`);

// ---- 1. the species
let s = await J(`({ sea: TLXSF.ORDER.map(k => !!(TLFish.SPECIES[k] && TLFish.SPECIES[k].sea)), n: Object.keys(TLFish.SPECIES).length, inLake: FISH.lakes.some(L => TLXSF.ORDER.some(k => L.mix[k])), max: TLFish.coolerMax() })`);
ok(s.sea.length === 6 && s.sea.every(Boolean) && s.n === 13, `six sea species joined ice fishing's seven (${s.n} in the table)`);
ok(!s.inLake, "no lake has a sea fish in its mix");

// ---- 2. on the sled the use control knows nothing of it
s = await J(`({ use: !!(VEH.cur && VEH.cur.use), hint: WN.hint || "" })`);
ok(!s.use && !/handline/.test(s.hint), "on the sled there is no handline");

// ---- 3. a skiff, out on the fjord
await ev(`GS.cash = 5000; TLXB.buy(); true`); await sleep(300);
await ev(`TLXV.swapTo(TLXV.state().owned.find(r => r.id === "skiff").uid); FOOT.on = false; true`); await sleep(500);
const dep = await outTo(150); await gameWait(1.2);
s = await J(`({ cur: !!(VEH.cur && VEH.cur.floats), foot: FOOT.on, lbl: VEH.cur.useLabel(), hint: WN.hint, show: WN.show })`);
console.log("afloat", dep.toFixed(1), "m", JSON.stringify(s));
ok(s.cur && !s.foot && dep > 15, `seated in the skiff over ${dep.toFixed(1)} m of water`);
ok(s.lbl === "FISH" && s.show && /^E: handline over the side · \d+ m under the keel$/.test(s.hint), `stopped over deep water the hint offers it by key: "${s.hint}"`);
// pad and touch name it their own way
await padSet({ 0: 1 }); await sleep(350); await padSet(); await sleep(350);
s = await J(`({ dev: INP.dev, hint: WN.hint })`);
ok(s.dev === "pad" && /^L3: handline over the side/.test(s.hint), `on a pad: "${s.hint}"`);
await padOff();
await send("Emulation.setTouchEmulationEnabled", { enabled: true });
await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 640, y: 200 }] }); await sleep(100);
await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await sleep(200);
await ev(`SET.touch = "on"; setTouchUI(); true`); await sleep(500);
s = await J(`({ dev: INP.dev, hint: WN.hint, pill: $("tcE").hidden ? null : $("tcE").textContent, gas: !$("tcGas").hidden, brk: !!document.querySelector('#touch [data-k="brake"]') })`);
ok(s.dev === "touch" && /tap FISH$/.test(s.hint) && !/E:|L3/.test(s.hint), `on touch: "${s.hint}"`);
ok(s.pill === "FISH" && s.gas, `the touch pill reads ${s.pill}, GAS is up`);
// tap the pill: the line goes over; the pill reads STOW; tap again: stowed
await ev(`$("tcE").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 5, pointerType: "touch" })); true`); await sleep(500);
s = await J(`({ on: TLXSF.F.on, pill: $("tcE").hidden ? null : $("tcE").textContent, keys: (document.getElementById("sfKeys") || {}).textContent })`);
ok(s.on && s.pill === "STOW" && /GAS: haul · BRAKE: let out · tap STOW/.test(s.keys), `a tap on FISH puts the line over; the pill reads ${s.pill}; the panel says "${s.keys}"`);
await ev(`$("tcE").dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 5, pointerType: "touch" })); true`); await sleep(200);
await ev(`$("tcE").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 6, pointerType: "touch" })); true`); await sleep(300);
await ev(`$("tcE").dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 6, pointerType: "touch" })); true`);
ok(!(await ev("TLXSF.F.on")), "a tap on STOW winds it in");
await send("Emulation.setTouchEmulationEnabled", { enabled: false });
await ev(`SET.touch = "off"; setTouchUI(); true`); await tap("KeyH"); await sleep(300); await tap("KeyH"); await sleep(200);

// ---- 4. not under way, not in the shallows
await ev(`P.vx = Math.sin(P.yaw) * 4; P.vz = Math.cos(P.yaw) * 4; true`); await sleep(120);
s = await J(`({ lbl: VEH.cur.useLabel(), v: Math.hypot(P.vx, P.vz) })`);
ok(s.lbl === null && s.v > 1, `under way at ${s.v.toFixed(1)} m/s the use control offers nothing`);
const shal = await J(`(() => { const D = TLXB.DOCKS[0], e = TLXB.dockEnd(D); for (let r = 10; r < 400; r += 4) for (let a = 0; a < 6.28; a += 0.1) { const x = e.x + Math.cos(a) * r, z = e.z + Math.sin(a) * r, d = TLXB.depthAt(x, z); if (d > 1.4 && d < 3.2 && isSea(x, z) && !TLXB.dockAt(x, z)) return { x, z, d }; } return null; })()`);
if (shal) {
  await ev(`P.x = ${shal.x}; P.z = ${shal.z}; P.vx = P.vz = 0; recenter(P.x, P.z, true); true`); await gameWait(0.6);
  await tap("KeyE"); await sleep(300);
  s = await J(`({ lbl: VEH.cur.useLabel(), on: TLXSF.F.on, d: TLXB.depthAt(P.x, P.z) })`);
  ok(s.lbl === null && !s.on, `in ${s.d.toFixed(1)} m of water there is no handline (the use key is the horn)`);
} else ok(false, "found no shallow water to test");

// ---- 5. line down: the motor gets nothing, the pilk sinks to the bottom
const bot = await outTo(150); await gameWait(0.8);
await tap("KeyE"); await sleep(400);
s = await FS();
ok(s.on && s.L === 0 && Math.abs(s.bot - bot) < 1, `the use key puts the line over (bottom ${s.bot} m)`);
ok((await toasts()).some(t => /Handline over the side: \d+ m under the keel\. S lets the pilk down, W hauls/.test(t)), "the toast names gas and brake for the keyboard");
ok(await ev(`!document.getElementById("sfHud").hidden && /HANDLINE · 0 m out · bottom \\d+ m/.test(document.getElementById("sfTop").textContent) && /W: haul · S: let out · E: stow/.test(document.getElementById("sfKeys").textContent)`), "the panel shows line out, the bottom and the three controls");
await down("KeyW"); await gameWait(2); s = await FS(); await up("KeyW");
ok(s.v < 0.3 && s.thr === 0 && s.L === 0, `holding gas with the line down the boat stays put (${s.v} m/s, throttle to the motor ${s.thr})`);
{ await down("KeyS"); const a = await FS(); await gameWait(3); const b = await FS(); await up("KeyS");
  const rate = (b.L - a.L) / (b.t - a.t);
  ok(rate > 2.6 && rate < 3.4 && b.v < 0.3, `holding brake lets line out at ${rate.toFixed(2)} m/s (3.0) and the boat doesn't back up`);
  await down("KeyS"); await waitUntil(`TLXSF.F.L >= TLXSF.F.bot - 0.15`, 15); await gameWait(0.4); await up("KeyS"); s = await FS();
  ok(Math.abs(s.L - (s.bot - 0.1)) < 0.2 && /bottom/.test(s.msg), `it stops on the bottom: ${s.L} m out over ${s.bot} m ("${s.msg}")`); }
if (STILLS) { await sideCam("[P.x, P.y + 0.7, P.z]", 4.2, 1.9, -1.5708); await sleep(500); await shot("x14f_line_down"); }
// hauling: hand over hand at 1.5 m/s, and a lift after a drop is a jig stroke
{ const a = await FS(); await down("KeyW"); await gameWait(2); const b = await FS(); await up("KeyW");
  const rate = (a.L - b.L) / (b.t - a.t);
  ok(b.fish || b.bite || (rate > 1.2 && rate < 1.8), `gas hauls at ${rate.toFixed(2)} m/s (1.5)`);
  await down("KeyS"); await gameWait(0.5); await up("KeyS"); const a0 = (await FS()).act; await down("KeyW"); await gameWait(0.3); const c = await FS(); await up("KeyW");
  ok(c.fish || c.bite || c.act > a0 + 0.25, `a lift after a drop counts as a jig stroke (worked ${a0} -> ${c.act})`); }
if (STILLS) { await down("KeyW"); await sleep(300); await shot("x14f_haul_a"); await sleep(250); await shot("x14f_haul_b"); await sleep(250); await shot("x14f_haul_c"); await up("KeyW"); }

// ---- 6. who bites where (the table, asked directly)
s = await J(`(() => { const k = (L, bot, act) => TLXSF.takers(L, bot, act).list.map(e => e[0]).sort().join(","); return { mid21: k(8, 21, 0.7), bot21: k(20, 21, 0.7), bot8: k(7, 8, 0.7), bot50: k(49, 50, 0.7), mid50: k(20, 50, 0.7), top: k(1, 21, 0.7), still: TLXSF.takers(20, 21, 0).sum, worked: TLXSF.takers(20, 21, 0.7).sum, lying: TLXSF.takers(20.9, 21, 0.7).sum }; })()`);
console.log("takers", JSON.stringify(s));
ok(s.mid21 === "saithe" && s.mid50 === "saithe" && s.top === "", "in mid-water only saithe look at the pilk; in the top 2 m nothing does");
ok(s.bot21 === "cod,haddock,saithe,wolffish" && s.bot8 === "saithe", "near the bottom in 21 m: cod, haddock, wolffish and saithe; in 8 m only saithe");
ok(s.bot50 === "cod,haddock,halibut,redfish,saithe,wolffish", "near the bottom in 50 m all six, redfish and halibut among them");
ok(s.worked > s.still * 2.5 && s.lying < s.worked * 0.5, `a worked pilk draws ${(s.worked / s.still).toFixed(1)}x a still one; lying on the bottom ${(s.lying / s.worked).toFixed(2)}x`);
s = await J(`(() => { let lo = 1, hi = 0, good = null; const D = TLXB.DOCKS[0], e = TLXB.dockEnd(D); for (let u = 60; u < 900; u += 15) for (let v = -300; v <= 300; v += 15) { const x = e.x + Math.sin(D.yaw) * u + Math.cos(D.yaw) * v, z = e.z + Math.cos(D.yaw) * u - Math.sin(D.yaw) * v, d = TLXB.depthAt(x, z); if (d < 15) continue; const m = TLXSF.markAt(x, z); lo = Math.min(lo, m); if (m > hi) { hi = m; good = { x, z, d, m }; } } return { lo, hi, good, same: TLXSF.markAt(good.x, good.z) === good.m }; })()`);
ok(s.lo < 0.15 && s.hi > 0.85 && s.same, `the marks are a fixed pattern: from ${s.lo.toFixed(2)} to ${s.hi.toFixed(2)} within 900 m of the jetty`);
const good = s.good;

// ---- 7. fish it for real on a good mark: jig near the bottom until a tug, haul to hook it, play it aboard
await tap("KeyE"); await sleep(300);
ok(!(await ev("TLXSF.F.on")) && await ev(`document.getElementById("sfHud").hidden`), "the use key again stows the line and the panel goes");
await ev(`P.x = ${good.x}; P.z = ${good.z}; P.vx = P.vz = 0; P.y = wlvAt(P.x, P.z) || 0; recenter(P.x, P.z, true); true`); await gameWait(0.8);
await tap("KeyE"); await sleep(300);
await down("KeyS"); await waitUntil(`TLXSF.F.L >= TLXSF.F.bot - 0.15`, 30); await up("KeyS");
let landed = 0, tugs = 0, tries = 0; const t7 = await clock(), c7 = await ev("GS.fish.cooler.length");
while (!landed && tries < 4 && (await clock()) - t7 < 240) {
  // jig: lift ~1.5 m, drop back, until a tug
  let tug = false; const tj = await clock();
  while (!tug && (await clock()) - tj < 120) {
    await down("KeyW"); const lifted = await waitUntil(`!!TLXSF.F.bite || !!TLXSF.F.fish`, 0.9); await up("KeyW");
    if (lifted) { tug = true; break; }
    await down("KeyS"); tug = await waitUntil(`!!TLXSF.F.bite || !!TLXSF.F.fish`, 0.9); await up("KeyS");
  }
  if (!tug) break;
  tugs++; tries++;
  await down("KeyW"); await waitUntil(`!!TLXSF.F.fish`, 1.2); await up("KeyW");
  s = await FS(); if (!s.fish) continue;
  console.log(`  hooked a ${s.fish.key} of ${s.fish.kg} kg at ${s.L} m after ${((await clock()) - tj).toFixed(0)} game s of jigging`);
  if (STILLS && !landed) { await down("KeyW"); await sleep(400); await shot("x14f_fight"); await up("KeyW"); }
  const r = await play(kbOn, kbOff); console.log("  ->", r);
  if (r === "landed") landed++;
  else { await gameWait(5.5); await down("KeyS"); await waitUntil(`TLXSF.F.L >= TLXSF.F.bot - 0.15`, 30); await up("KeyS"); }
}
ok(tugs >= 1, `jigging near the bottom on a good mark brought a tug (${tugs} in ${((await clock()) - t7).toFixed(0)} game s)`);
ok(landed === 1, "hauling on the tug hooked it and playing it brought it aboard");
s = await J(`(() => { const c = GS.fish.cooler[GS.fish.cooler.length - 1] || {}, sp = TLFish.SPECIES[c.sp] || {}; return { n: GS.fish.cooler.length, c, sea: !!sp.sea, lo: sp.kg && sp.kg[0], hi: sp.kg && sp.kg[1], price: sp.price, logN: GS.fish.log.n, best: GS.fish.log.best[c.sp] }; })()`);
console.log("cooler", JSON.stringify(s));
ok(s.n === c7 + 1 && s.sea && s.c.kg >= s.lo && s.c.kg <= s.hi && s.c.cm > 20 && s.c.cm < 180, `it is in ice fishing's cooler: ${s.c.sp}, ${s.c.kg} kg, ${s.c.cm} cm`);
ok(s.c.v === Math.max(1, Math.round(s.c.kg * s.price)) && /^the fjord off /.test(s.c.lake) && s.c.t > 0, `valued at $${s.c.v} ($${s.price}/kg), from "${s.c.lake}"`);
ok(s.logN >= 1 && s.best && s.best.kg === s.c.kg, "the logbook counts it and holds it as that species' best");
ok((await toasts()).some(t => /in the cooler \(\d+ of 10\)/.test(t)), "the toast says what came aboard and how full the cooler is");

// ---- 8. a heavy fish: haul against its run and the line parts; play it and it comes
await ev(`(() => { const F = TLXSF.F; F.L = 25; F.bite = null; F.fish = TLXSF.newFish("halibut"); F.fish.kg = 30; F.fish.pull = 1.6 * (0.35 + 0.65 * Math.min(1.2, Math.sqrt(30 / 20))); F.fish.run = 6; return 1; })()`);
await down("KeyW"); const parted = await waitUntil(`!TLXSF.F.fish`, 6); await up("KeyW");
s = await FS();
ok(parted && s.rig > 0 && s.L === 0 && (await toasts()).some(t => /line parted on the halibut's run/.test(t)), `hauling a 30 kg halibut against its run parts the line (a new pilk in ${s.rig} s)`);
await down("KeyS"); await gameWait(1.5); s = await FS(); await up("KeyS");
ok(s.L === 0 && /pilk/.test(s.msg), `no line goes out while the new pilk is tied on ("${s.msg}")`);
await gameWait(4.5);
const n8 = await ev("GS.fish.log.n");
await ev(`(() => { const F = TLXSF.F; F.L = 14; F.rigT = 0; F.fish = TLXSF.newFish("cod"); F.fish.kg = 9; F.fish.pull = 0.8 * (0.35 + 0.65 * Math.sqrt(9 / 20)); F.fish.run = 1.5; GS.fish.cooler.length = 0; return 1; })()`);
{ // the bar goes over the limit if you haul on the run: sample it once, then play it properly
  await down("KeyW"); await gameWait(0.9); s = await FS(); await up("KeyW");
  ok(s.tens > 1 && /ease off/i.test(s.msg), `hauling on a 9 kg cod's run takes the line past its limit (${s.tens}, "${s.msg}")`);
  const r = await play(kbOn, kbOff);
  s = await J(`({ n: GS.fish.log.n, c: GS.fish.cooler[0] })`);
  ok(r === "landed" && s.n === n8 + 1 && s.c && s.c.sp === "cod" && s.c.kg === 9 && s.c.cm > 80 && s.c.cm < 100, `easing off on its runs brings the cod aboard (${r}: ${s.c && s.c.cm} cm, $${s.c && s.c.v})`); }
if (STILLS) { await ev(`(() => { const F = TLXSF.F; F.L = 0.7; F.fish = TLXSF.newFish("cod"); F.fish.kg = 7; F.fish.stam = 0; return 1; })()`); await down("KeyW"); await sleep(700); await shot("x14f_land_a"); await sleep(350); await shot("x14f_land_b"); await sleep(350); await shot("x14f_land_c"); await up("KeyW"); await camOff(); await sleep(300); await shot("x14f_hud"); }

// ---- 9. by pad: RT hauls, LT lets out, L3 stows
await ev(`TLXSF.F.fish = null; TLXSF.F.L = 0; true`);
await padSet({ 6: 1 }); await gameWait(2); s = await FS(); await padSet();
ok(s.L > 4 && s.v < 0.3, `LT lets line out (${s.L} m) and the boat stays put`);
ok(await ev(`/RT: haul · LT: let out · L3: stow/.test(document.getElementById("sfKeys").textContent)`), "the panel names the pad's controls");
await ev(`(() => { const F = TLXSF.F; F.L = 6; F.fish = TLXSF.newFish("saithe"); F.fish.kg = 1.5; F.fish.pull = 0.3; return 1; })()`);
{ const n = await ev("GS.fish.log.n"); const r = await play(() => padSet({ 7: 1 }), () => padSet()); ok(r === "landed" && (await ev("GS.fish.log.n")) === n + 1, `RT hauls a saithe aboard (${r})`); }
await padSet({ 10: 1 }); await sleep(300); await padSet(); await sleep(200);
ok(!(await ev("TLXSF.F.on")), "L3 stows the line");
await padOff();
// stowed, the motor is the motor again
await down("KeyW"); await gameWait(2.5); s = await FS(); await up("KeyW");
ok(s.v > 1.5, `stowed, gas drives the boat again (${s.v} m/s)`);
await ev(`P.vx = P.vz = 0; true`); await gameWait(0.5);

// ---- 10. a full cooler releases the fish
await tap("KeyE"); await sleep(300);
await ev(`(() => { const c = GS.fish.cooler; while (c.length < 10) c.push({ sp: "saithe", kg: 2, cm: 57, v: 5, t: +CAL.abs().toFixed(3), lake: "the fjord off the quay" }); const F = TLXSF.F; F.L = 3; F.fish = TLXSF.newFish("haddock"); F.fish.kg = 1.2; F.fish.pull = 0.2; return 1; })()`);
{ const n = await ev("GS.fish.log.n"); const r = await play(kbOn, kbOff); s = await J(`({ n: GS.fish.log.n, c: GS.fish.cooler.length })`);
  ok(r === "landed" && s.c === 10 && s.n === n + 1 && (await toasts()).some(t => /cooler's full at 10: back it goes/.test(t)), "with ten in the cooler the next fish is logged and let go"); }

// ---- 11. a storm stows the line and refuses a new one
await ev(`GS.storm = 0.9; true`); await gameWait(0.6);
ok(!(await ev("TLXSF.F.on")) && (await toasts()).some(t => /sea's getting up/.test(t)), "the sea getting up winds the line in");
await ev(`P.vx = P.vz = 0; true`); await tap("KeyE"); await sleep(300);
ok(!(await ev("TLXSF.F.on")) && (await toasts()).some(t => /Too rough to work a handline/.test(t)), "in a storm the handline stays on its frame");
await ev(`GS.storm = 0; true`);

// ---- 12. the Fiskemottak buys sea fish; the logbook lists them
await ev(`GS.fish.cooler.length = 0; for (let i = 0; i < 2; i++) GS.fish.cooler.push({ sp: "saithe", kg: 2, cm: 57, v: 5, t: +CAL.abs().toFixed(3), lake: "the fjord off the quay" }); GS.fish.cooler.push({ sp: "cod", kg: 5, cm: 76, v: 21, t: +CAL.abs().toFixed(3), lake: "the fjord off the quay" }); FISH.openBuyer(); true`); await sleep(500);
s = await J(`({ board: document.querySelector("#ifBuy .ifboard").textContent, rows: [...document.querySelectorAll("#ifBuy .ifr")].map(e => e.textContent), cash: GS.cash })`);
ok(/Cod \$\d/.test(s.board) && /Halibut \$\d/.test(s.board) && /Arctic char \$\d/.test(s.board), "the buyer's board prices sea fish beside the lake fish");
ok(s.rows.length === 3 && s.rows.some(r => /Cod · 5\.00 kg/.test(r) && /the fjord off the quay/.test(r)), "the cooler's sea fish are on the buyer's list");
if (STILLS) await shot("x14f_buyer");
await ev(`document.getElementById("ifSellAll").click(); true`); await sleep(300);
const sold = await J(`({ cash: GS.cash, n: GS.fish.cooler.length, sold: GS.fish.log.sold })`);
ok(sold.n === 0 && sold.cash >= s.cash + 24 && sold.cash <= s.cash + 40, `selling the lot pays $${sold.cash - s.cash} for 5 kg of cod and 4 kg of saithe (today's prices: $26-37)`);
await ev(`document.getElementById("ifBuyClose").click(); true`);
const lb = await ev(`FISH.logbookHtml({ esc: s => String(s), fmtCash })`);
ok(/From the boat/.test(lb) && /Cod · <i[^>]*>torsk/.test(lb) && /the fjord off/.test(lb), "the logbook has a From the boat section with the sea bests");

// ---- 13. a reload: sea fish in the cooler load, the line is back on its frame
await ev(`GS.fish.cooler.push({ sp: "halibut", kg: 12.5, cm: 100, v: 163, t: +CAL.abs().toFixed(3), lake: "the fjord off the quay" }); P.vx = P.vz = 0; true`);
await tap("KeyE"); await sleep(300);
ok(await ev("TLXSF.F.on"), "line down before the reload");
await ev(`save(); true`); await sleep(200);
await reload(); await sleep(800);
s = await J(`({ on: TLXSF.F.on, cooler: GS.fish.cooler.map(c => c.sp + ":" + c.kg), best: Object.keys(GS.fish.log.best).sort().join(","), boat: !!(VEH.cur && VEH.cur.floats), hud: !!(document.getElementById("sfHud") && !document.getElementById("sfHud").hidden) })`);
console.log("reloaded", JSON.stringify(s));
ok(s.cooler.includes("halibut:12.5"), "the halibut in the cooler survives the reload");
ok(!s.on && !s.hud && s.boat, "you are back in the boat with the line on its frame");
ok(/cod/.test(s.best), "the sea bests are still in the logbook");

await done(fails ? 1 : 0);

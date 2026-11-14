// Slice 10.2 (G4): the winter store, Sport & Vinter (tlx-gear.js), a walk-in shop in Kjøllefjord. Asserts, exit 1 on a failure.
//  A. the store stands at a lit town door (inside the town limit, clear of Fisk & Friluft and the sea) with a sign.
//  B. walking into its ring (held W) takes you inside its own room; the outdoor hint names the door.
//  C. the room: spawn, exit ring and the counter's standing spot are clear, and so is the walk between them.
//  D. at the counter the use control reads SHOP; keyboard E opens the panel: "Winter clothing", tabs riding kit /
//     base / mid / spares and no tackle. The riding kit buys and wears (cash, ST.warm); spares stop at the cap; layers sell.
//  E. the same counter by Xbox pad L3 and a touch tap on SHOP; pad B / the ✕ close.
//  F. walking back into the doorway puts you outside the door; Fisk & Friluft still sells tackle + layers, not kit/spares.
//  G. out on the trail, damp with a pair carried: the use control offers DRY PAIR; E changes (wet -0.3, one pair used);
//     dry, or with no pairs, it doesn't.
//  H. saved: spares and the kit survive a reload; an old save without spares starts with none.
import { boot, ev, tap, hold, down, up, sleep, done, shot, park, reload, padSet, padOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(80); }
async function until(expr, secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) { if (await ev(expr)) return true; await sleep(100); } return !!(await ev(expr)); }
const toasts = () => J(`(TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))`);
const panel = () => J(`({ open: !$("ifShop").hidden, h2: ($("ifShop").querySelector("h2") || {}).textContent, tabs: [...($("ifShopTabs") || { children: [] }).children].map(t => t.dataset.t) })`);
const tab = t => ev(`$("ifShopTabs").querySelector('[data-t="${t}"]').click(); true`);
const press = sel => ev(`(() => { const b = $("ifShop").querySelector('${sel}'); if (!b) return "none"; if (b.disabled) return "disabled"; b.click(); return "clicked"; })()`);
const S = () => J(`({ use: footUse(), hint: $("wnHint").textContent, tE: $("tcUse").hidden ? null : $("tcUse").textContent, on: INT.on, cab: INT.on ? INT.cab.id : null, cash: GS.cash, spares: TLXG.state().spares, wet: TLXG.state().wet })`);

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 36; P.x += 60; P.z += 60; P.y = surf(P.x, P.z) + 0.3; true`); await sleep(500);   // the sled out of the way of the door
// A
const A = await J(`(() => { const b = TLXG.shop.b; if (!b) return null; return { x: b.x, z: b.z, ry: b.ry, dDepot: Math.hypot(b.x - depot.x, b.z - depot.z), dFisk: Math.hypot(b.x - FISHSITES.shop.x, b.z - FISHSITES.shop.z), sea: isSea(b.x, b.z) || isWater(b.x, b.z), sign: !!TLXG.shop.sign, inBeacons: INT.beacons.includes(b), townR: TOWN_R }; })()`);
console.log("A", JSON.stringify(A));
ok(A && A.inBeacons && A.dDepot < A.townR && A.dFisk >= 14 && !A.sea && A.sign, "A: Sport & Vinter at a town door " + (A ? A.dDepot.toFixed(0) + " m from the depot, " + A.dFisk.toFixed(0) + " m from Fisk & Friluft" : ""));

// B: walk in from 3.5 m out
await ev(`(() => { const b = TLXG.shop.b, nx = Math.sin(b.ry), nz = Math.cos(b.ry); FOOT.on = true; FOOT.x = b.x + nx * 3.5; FOOT.z = b.z + nz * 3.5; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.yaw = b.ry + Math.PI; FOOT.sp = FOOT.fwd = 0; camState.init = false; return true; })()`);
await sleep(900);
let s = await S(); console.log("B outside:", s.hint);
ok(/Sport & Vinter's door is \d+ m off/.test(s.hint), "B: the hint names the store door: " + s.hint);
await shot("x10s_front");
await down("KeyW"); await until("INT.on || !!INT.ph", 10); await up("KeyW");
const inside = await until("INT.on", 6);
s = await S(); let tl = await toasts();
ok(inside && s.cab === "winter", "B: walked into the ring and inside the store (" + s.cab + ")");
ok(tl.some(t => /Sport & Vinter: warm/.test(t)), "B: the store's own toast");
await sleep(500); await shot("x10s_room");

// C: the room's floor plan
const C = await J(`(() => { const R = INT.room, lim = 0.34, C0 = TLXG.COUNTER;
  const hit = (x, z) => R.cols.some(c => x > c.x0 - lim && x < c.x1 + lim && z > c.z0 - lim && z < c.z1 + lim) || Math.abs(x) > R.hx - lim || Math.abs(z) > R.hz - lim;
  const path = [[R.exit.x, R.exit.z], [R.exit.x, R.exit.z + 0.95], [R.exit.x, -1.2], [C0.x, -1.2], [C0.x, C0.z - 0.85]];
  let bad = []; for (let i = 0; i < path.length - 1; i++) { const [a, b] = [path[i], path[i + 1]]; for (let k = 0; k <= 20; k++) { const x = a[0] + (b[0] - a[0]) * k / 20, z = a[1] + (b[1] - a[1]) * k / 20; if (hit(x, z)) bad.push([+x.toFixed(2), +z.toFixed(2)]); } }
  return { bad, spawn: [INT.px, INT.pz], cols: R.cols.length }; })()`);
console.log("C", JSON.stringify(C));
ok(C.bad.length === 0, "C: door -> counter walk is clear of " + C.cols + " colliders (blocked at " + JSON.stringify(C.bad.slice(0, 3)) + ")");
// walk it for real: face +x along z = -1.2, then +z to the counter
await ev(`INT.px = INT.room.exit.x; INT.pz = -1.2; FOOT.yaw = Math.PI / 2; true`);
await down("KeyW"); await until(`INT.px > TLXG.COUNTER.x - 0.1`, 6); await up("KeyW"); await sleep(300); await ev(`INT.px = TLXG.COUNTER.x; FOOT.yaw = 0; true`);
await down("KeyW"); await until(`INT.pz > TLXG.COUNTER.z - 0.75`, 6); await up("KeyW"); await sleep(400);
s = await S(); const pos = await J(`[INT.px, INT.pz]`); console.log("C at counter", JSON.stringify(pos), s.use, s.hint);
ok(s.on && s.use === "SHOP" && /E: browse the shop/.test(s.hint), "C/D: walked to the counter; use reads SHOP, hint: " + s.hint);
await shot("x10s_counter");

// D: keyboard
await ev(`GS.cash = 0; true`); await tap("KeyE"); await sleep(400);
let p = await panel(); console.log("D", JSON.stringify(p));
ok(p.open && p.h2 === "Winter clothing" && p.tabs.join() === "w_kit,lay_base,lay_mid,w_spare", "D: E opens Winter clothing with tabs " + p.tabs.join(", "));
ok(!(await ev(`FISH.panelOpen() && footUse() === "SHOP"`)), "D: the use control steps aside while the panel is open");
await tab("w_kit"); await sleep(150);
ok((await ev(`$("ifShop").querySelector('button[data-kit="jacket:insul"]').textContent`)).includes("not enough cash"), "D: broke: the insulated jacket says not enough cash");
await ev(`GS.cash = 1000; true`); await tab("w_kit"); await sleep(100);
const w0 = await ev("ST.warm");
ok((await press('button[data-kit="jacket:insul"]')) === "clicked", "D: buy the insulated trail jacket");
await sleep(200); let d = await J(`({ cash: GS.cash, j: GS.own.gear.jacket, warm: ST.warm, own: !!GS.own.gearOwned["jacket:insul"] })`);
ok(d.j === "insul" && d.own && d.cash === 820 && Math.abs(d.warm - w0 - 1.5) < 1e-6, `D: wearing it ($1000 -> $${d.cash}, warmth ${w0} -> ${d.warm})`);
await press('button[data-kit="jacket:shell"]'); await sleep(150); d = await J(`({ cash: GS.cash, j: GS.own.gear.jacket })`);
ok(d.j === "shell" && d.cash === 820, "D: back into the free shell, no charge");
await press('button[data-kit="jacket:insul"]'); await sleep(150); d = await J(`({ cash: GS.cash, j: GS.own.gear.jacket })`);
ok(d.j === "insul" && d.cash === 820, "D: the owned jacket goes back on free");
await shot("x10s_kit");
await tab("w_spare"); await sleep(100);
for (let i = 0; i < 5; i++) { await press('button[data-spare]'); await sleep(120); }
s = await S(); const spDis = await ev(`$("ifShop").querySelector('button[data-spare]').disabled`);
ok(s.spares === 4 && s.cash === 820 - 4 * 24 && spDis, `D: spares stop at 4 ($${s.cash}, button disabled ${spDis})`);
await shot("x10s_spares");
await tab("lay_base"); await sleep(100); await press('button[data-layer="base:merino"]'); await sleep(150);
d = await J(`({ cash: GS.cash, base: TLXG.state().base })`);
ok(d.base === "merino" && d.cash === 724 - 85, "D: the layers sell here too (merino, $" + d.cash + ")");
await tap("Escape"); await sleep(300);
ok(!(await panel()).open, "D: Esc closes");

// E: pad and touch
await sleep(300);
await padSet({ 10: 1 }); await sleep(350); await padSet({}); await sleep(450);
p = await panel(); s = await S();
ok(p.open && p.h2 === "Winter clothing", "E: Xbox L3 at the counter opens the store");
await padSet({ 1: 1 }); await sleep(300); await padSet({}); await sleep(400);
ok(!(await panel()).open, "E: pad B closes it");
await padOff(); await sleep(300);
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(600);
s = await S(); console.log("E touch", JSON.stringify(s));
ok(s.tE === "SHOP" && /tap SHOP/.test(s.hint), "E: touch: the button reads SHOP, hint " + s.hint);
await ev(`(() => { const b = $("tcUse"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return true; })()`);
await sleep(500); p = await panel();
ok(p.open && p.h2 === "Winter clothing", "E: tapping SHOP opens the store");
await shot("x10s_touch");
await ev(`$("ifShopX").click(); true`); await sleep(300);
ok(!(await panel()).open, "E: the ✕ closes it");
await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; true`); await sleep(300);

// F: out the door
await ev(`INT.px = INT.room.exit.x; INT.pz = INT.room.exit.z + 0.2; FOOT.yaw = Math.PI; true`);
const out = await until("!INT.on && !INT.ph", 5);
const F = await J(`(() => { const b = TLXG.shop.b; return { d: Math.hypot(FOOT.x - b.x, FOOT.z - b.z), on: INT.on }; })()`);
ok(out && F.d < 2.2, "F: back out of the doorway, " + F.d.toFixed(2) + " m from the ring");
await ev(`(() => { FOOT.x = FISHSITES.shop.x; FOOT.z = FISHSITES.shop.z; FOOT.y = surf(FOOT.x, FOOT.z); return true; })()`); await sleep(500);
await ev(`FISH.ctx(); true`); await sleep(300); p = await panel(); console.log("F fisk", JSON.stringify(p));
ok(p.open && p.h2 === "Tackle & outdoor" && p.tabs.includes("rods") && p.tabs.includes("lay_base") && !p.tabs.includes("w_kit") && !p.tabs.includes("w_spare"), "F: Fisk & Friluft still tackle + layers, no kit/spares");
await tap("Escape"); await sleep(300);

// G: a dry pair on the trail
await ev(`crashCancel(); FOOT.on = false; true`); await park(); await sleep(300);
await ev(`(() => { FOOT.on = true; FOOT.x = P.x + 3; FOOT.z = P.z; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = FOOT.fwd = 0; const s = TLXG.state(); s.wet = 0.1; s.warned = true; return true; })()`); await sleep(400);
s = await S(); ok(s.use !== "DRY PAIR", "G: barely damp: no DRY PAIR (" + s.use + ")");
await ev(`TLXG.state().wet = 0.6; true`); await sleep(400);
s = await S(); console.log("G", JSON.stringify(s));
ok(s.use === "DRY PAIR" && /E: change into dry gloves and socks · 4 pairs/.test(s.hint), "G: damp with pairs: DRY PAIR, hint " + s.hint);
await tap("KeyE"); await sleep(300);
s = await S(); tl = await toasts();
ok(s.spares === 3 && s.wet < 0.31 && s.wet > 0.25, `G: E changes into a dry pair (wet 0.6 -> ${s.wet.toFixed(2)}, ${s.spares} left)`);
ok(tl.some(t => /Dry gloves and socks on/.test(t)), "G: the change toast");
await ev(`(() => { const s = TLXG.state(); s.spares = 0; s.wet = 0.6; return true; })()`); await sleep(300);
s = await S(); ok(s.use !== "DRY PAIR", "G: no pairs left: nothing offered");

// H: saved
await ev(`(() => { TLXG.state().spares = 2; save(); return true; })()`);
await reload(); await sleep(500);
d = await J(`({ sp: TLXG.state().spares, j: GS.own.gear.jacket, b: !!TLXG.shop.b })`);
ok(d.sp === 2 && d.j === "insul" && d.b, "H: spares and the jacket survive a reload, the store is back");
const old = await J(`(() => { const s = JSON.parse(localStorage.getItem("tracklayer.save.v2")); const g = s.x.sys.gear; if (g.s.spares !== 2) throw new Error("saved spares " + g.s.spares); delete g.s.spares; return s; })()`);
await reload(old); await sleep(500);
ok((await ev(`TLXG.state().spares`)) === 0, "H: a save from before 10.2 starts with no spares");
await done(fails ? 1 : 0);

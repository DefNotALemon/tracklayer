// Slice 11.4a (G4): a second frame, the lever-action carbine (tlx-guns.js FRAMES / `fr` on parts / stat cyc; the wheel's
// Lever slot in tlx-gunwheel.js). Asserts, exit 1 on a failure.
//  A. the counter's Rifles tab sells two frames; own both, the new one is carried, "Carry this one" swaps them.
//  B. the model: the carbine's own slots (a Lever where the bolt rifle has a Grip) and its own parts; the bolt rifle's
//     parts don't fit it (not sold, not fitted, no cash taken); sights fit both; the Parts tab lists the carried rifle's.
//  C. in the field: the lever's action is worked in about half the bolt's time (measured by gameClock), the short-throw
//     lever is quicker still; it drops a reindeer at 60 m and falls short at 130 m where the bolt rifle reaches; the view
//     model is the carbine and its lever swings on the stroke.
//  D. the wheel: Barrel, Stock, Lever, Magazine, Sight, Ammo; the Lever strip lists the levers owned with an Action row.
//  E. saved: both rifles, which is carried and the lever parts survive a reload; a carbine saved with bolt parts, and two
//     rifles of one frame, load clean; an 11.3 save (one bolt rifle) loads as it was.
import { boot, ev, tap, down, up, sleep, done, shot, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function ready() { for (let i = 0; i < 100; i++) { await sleep(150); try { if (await ev(`typeof TLXGUN !== "undefined" && !!TLXGUN.state() && started`)) { await sleep(300); return true; } } catch (e) {} } return false; }
async function until(expr, secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) { if (await ev(expr)) return true; await sleep(80); } return !!(await ev(expr)); }
async function frames(n = 3) { const p0 = await ev("TLXGUN.AIM.ph"); let last = p0, c = 0; for (let i = 0; i < 200 && c < n; i++) { await sleep(40); const p = await ev("TLXGUN.AIM.ph"); if (p !== last) { c++; last = p; } } }
const toasts = () => J(`(TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))`);
const G = () => J(`(() => { const g = TLXGUN.gun(), s = TLXGUN.state(); return { frame: g && g.frame, parts: g && g.parts, rounds: g && g.rounds, cur: s.cur, owned: s.owned.map(o => o.frame), own: s.parts, tot: TLXGUN.pkTotal(), st: g && TLXGUN.stats(g), cash: GS.cash, last: TLXGUN.AIM.last,
  amm: $("gunHud") ? $("gunHud").children[2].textContent : "", hint: $("wnHint").textContent }; })()`);
const W = () => J(`({ open: TLXWHEEL.W.open, stage: TLXWHEEL.W.stage, slot: TLXWHEEL.W.slot, text: $("gnWheel") ? $("gnWheel").textContent : "", parts: $("gnWheel") ? [...$("gnWheel").querySelectorAll("button[data-part]")].map(b => b.dataset.part) : [], strip: $("gnWheel") ? [...$("gnWheel").querySelectorAll("button[data-part]")].map(b => b.textContent) : [], slots: $("gnWheel") ? [...$("gnWheel").querySelectorAll("button[data-slot]")].map(b => b.textContent) : [] })`);
async function holdR() { await down("KeyR"); await until("TLXWHEEL.W.open", 6); await up("KeyR"); await sleep(150); }
const press = sel => ev(`(() => { const b = $("ifShop").querySelector('${sel}'); if (!b) return "none"; if (b.disabled) return "disabled:" + b.textContent; b.click(); return "clicked"; })()`);
const mk = (kind, d, off = 0) => ev(`window.__mk(${JSON.stringify(kind)}, ${d}, ${off})`);
const aimAt = n => ev(`(() => { const q = window.__an[${n}].m[0], sc = q.g.scale.x, cy = surf(q.x, q.z) + q.sp.hipY * sc * 0.92, ey = Math.max(FOOT.y, surf(FOOT.x, FOOT.z) - 0.4) + 1.6, d = Math.hypot(q.x - FOOT.x, q.z - FOOT.z);
  FOOT.yaw = Math.atan2(q.x - FOOT.x, q.z - FOOT.z); TLXGUN.AIM.pitch = Math.atan2(cy - ey, d); return d; })()`);
const boltDone = () => until("TLXGUN.AIM.bolt <= 0", 4);
const wild = () => ev(`(() => { WILD.max = 0; for (const G of WILD.groups) for (const q of G.m) wildFree(q); WILD.groups.length = 0; window.__an = [];
  window.__mk = (kind, d, off) => { const yw = window.__yaw + off, x = FOOT.x + Math.sin(yw) * d, z = FOOT.z + Math.cos(yw) * d, q = wildRig(kind);
    const G = { kind, sp: QSP[kind], x, z, yaw: yw + 1.57, state: "graze", t: 999, v: 0, m: [q] };
    Object.assign(q, { x, z, yaw: G.yaw, v: 0, ox: 0, oz: 0, graze: 0.3, wT: 999 }); q.ant.visible = true; WILD.groups.push(G); window.__an.push(G); return window.__an.length - 1; };
  return true; })()`);
// fire into the sky and time the action by the game's clock: seconds until the next shot is possible
async function cycle() {
  await ev(`TLXGUN.AIM.pitch = 0.5; true`); await frames(2);
  const r0 = await ev("TLXGUN.gun().rounds"), t0 = await clock();
  await tap("KeyE"); await until(`TLXGUN.gun().rounds < ${r0}`, 2);
  const set = await ev("TLXGUN.AIM.bolt"); await sleep(120);
  const mid = await J(`({ lv: TLXGUN.AIM.vm && TLXGUN.AIM.vm.userData.lever ? TLXGUN.AIM.vm.userData.lever.rotation.x : null, bolt: TLXGUN.AIM.bolt })`);
  await boltDone(); return { set, t: (await clock()) - t0, mid, fired: (await ev("TLXGUN.gun().rounds")) < r0 };
}

await boot();
await ev(`tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; GS.hour = 36; TLX.setOn("wounds", false); GS.cash = 9000; true`); await sleep(400);
await wild();
await ev(`FOOT.on = true; FOOT.x = depot.x + 20; FOOT.z = depot.z + 14; FOOT.y = surf(FOOT.x, FOOT.z); P.x = FOOT.x + 5; P.z = FOOT.z; true`); await sleep(300);

// ---- A: the counter
await ev(`FISH.openShop("g_rifle", "guns"); true`); await sleep(400);
let cards = await J(`[...$("ifShop").querySelectorAll("button[data-grifle]")].map(b => { const c = b.closest(".ifit"); return { id: b.dataset.grifle, btn: b.textContent, dis: b.disabled, text: c.textContent, on: c.classList.contains("on"), carry: !!c.querySelector("button[data-gcarry]") }; })`);
console.log("A cards", JSON.stringify(cards.map(c => [c.id, c.btn])));
ok(cards.map(c => c.id).join() === "bolt308,lever308", "A: the Rifles tab lists two frames: " + cards.map(c => c.id).join());
ok(cards.every(c => c.dis && /Licence first/.test(c.btn)), "A: neither is sold before the licence course");
ok(/Action 0\.95 s/.test(cards[0].text) && /Action 0\.50 s/.test(cards[1].text) && /Clean-kill range 115 m/.test(cards[1].text) && /Magazine 4 rds/.test(cards[1].text) && /Handling 6\.5/.test(cards[1].text), "A: each card shows its own numbers (the carbine: action 0.50 s, 115 m, 4 rounds, handling 6.5)");
await shot("x11f_rifles");
ok(await ev(`TLXGUN.takeCourse()`), "A: licence taken");
await ev(`FISH.openShop("g_rifle", "guns"); true`); await sleep(300);
const cash0 = (await G()).cash;
ok((await press('button[data-grifle="bolt308"]')) === "clicked", "A: buy the bolt rifle"); await sleep(200);
ok(/^disabled:Owned$/.test(await press('button[data-grifle="bolt308"]')) && !(await ev(`!!$("ifShop").querySelector("button[data-gcarry]")`)), "A: with one rifle there is nothing to swap");
ok((await press('button[data-grifle="lever308"]')) === "clicked", "A: buy the lever carbine"); await sleep(250);
let g = await G(), tl = await toasts();
ok(g.owned.join() === "bolt308,lever308" && g.frame === "lever308" && g.cash === cash0 - 1450 - 1150, `A: both owned, the carbine is the one carried, $${cash0 - g.cash} spent`);
ok(tl.some(t => /Lever-action carbine, \.308: yours, and it's the one you carry now/.test(t)), "A: the toast says which you carry and where the other is");
cards = await J(`[...$("ifShop").querySelectorAll("button[data-grifle]")].map(b => { const c = b.closest(".ifit"); return { id: b.dataset.grifle, btn: b.textContent, text: c.textContent, on: c.classList.contains("on"), carry: !!c.querySelector("button[data-gcarry]") }; })`);
ok(cards[1].on && !cards[1].carry && /The one you carry/.test(cards[1].text) && !cards[0].on && cards[0].carry && /In the rack here/.test(cards[0].text) && /Owned · in the rack here/.test(cards[0].btn), "A: the carbine's card is marked carried; the bolt rifle's offers Carry this one");
await shot("x11f_rifles_both");
ok((await press('button[data-gcarry="bolt308"]')) === "clicked", "A: Carry this one"); await sleep(250);
g = await G(); tl = await toasts();
ok(g.frame === "bolt308" && g.cur === 0 && tl.some(t => /The bolt-action comes down off the rack/.test(t)), "A: now the bolt rifle is carried");
ok(await ev(`[...$("ifShop").querySelectorAll(".ifit.on")].length === 1 && !!$("ifShop").querySelector('button[data-gcarry="lever308"]')`), "A: and the cards swap over");

// ---- B: the model
const M = await J(`(() => { const o = {}; for (const f of TLXGUN.FRAMES) { const g = TLXGUN.newGun(f.id); o[f.id] = { slots: f.slots, parts: g.parts, st: TLXGUN.stats(g), lists: Object.fromEntries(f.slots.map(s => [s, TLXGUN.partList(s, f.id).map(p => p.id)])) }; } return o; })()`);
console.log("B", JSON.stringify(M.lever308));
ok(M.lever308.slots.join() === "barrel,stock,lever,magazine,sight" && M.bolt308.slots.join() === "barrel,stock,grip,magazine,sight", "B: the carbine has a Lever slot where the bolt rifle has a Grip");
ok(JSON.stringify(M.lever308.parts) === JSON.stringify({ barrel: "lv20", stock: "lvstr", lever: "lvstd", magazine: "lvm4", sight: "iron" }), "B: a new carbine wears its own stock parts");
ok(JSON.stringify(M.bolt308.parts) === JSON.stringify({ barrel: "std22", stock: "walnut", grip: "plain", magazine: "int3", sight: "iron" }) && M.bolt308.st.range === 140 && M.bolt308.st.cap === 3 && M.bolt308.st.spread === 2.2 && M.bolt308.st.cyc === 0.95, "B: the bolt rifle is what it was (140 m, 3 rounds, 2.2 MOA, action 0.95 s)");
ok(M.lever308.st.cyc === 0.5 && M.lever308.st.range === 115 && M.lever308.st.cap === 4 && M.lever308.st.handling === 6.5 && M.lever308.st.spread > M.bolt308.st.spread, `B: the carbine trades reach and groups for speed: ${M.lever308.st.range} m, ${M.lever308.st.spread} MOA, handling ${M.lever308.st.handling}, action ${M.lever308.st.cyc} s`);
ok(Object.values(M.lever308.lists).every(l => l.length >= 3) && M.lever308.lists.sight.join() === "iron,peep,red1,scope39" && M.bolt308.lists.sight.join() === "iron,red1,scope39" && !M.lever308.lists.barrel.some(id => M.bolt308.lists.barrel.includes(id)),
  "B: three or more parts in each of the carbine's slots, none of them the bolt rifle's; the sights are shared (the peep is the carbine's)");
// the Parts tab lists the carried rifle's parts
await ev(`FISH.openShop("g_parts", "guns"); true`); await sleep(300);
let pc = await J(`[...$("ifShop").querySelectorAll("button[data-gpart]")].map(b => b.dataset.gpart)`);
ok(pc.length === 15 && !pc.some(k => /lv|peep/.test(k)), `B: carrying the bolt rifle, the Parts tab is its 15 parts as before`);
await ev(`TLXGUN.carry("lever308"); FISH.openShop("g_parts", "guns"); true`); await sleep(300);
pc = await J(`[...$("ifShop").querySelectorAll("button[data-gpart]")].map(b => b.dataset.gpart)`);
const heads = await J(`[...$("ifShop").querySelectorAll(".ifloc")].map(e => e.textContent)`);
console.log("B parts tab", pc.join(" "), "|", heads.join(","));
ok(pc.length === 16 && pc.includes("lever:lvshort") && pc.includes("sight:scope39") && !pc.some(k => /grip:|std22|carb18|heavy24|walnut|det5|int3/.test(k)) && heads.some(h => /lever/i.test(h)) && !heads.some(h => /grip/i.test(h)), "B: carrying the carbine, it is the carbine's 16 parts under Barrel / Stock / Lever / Magazine / Sight");
await shot("x11f_parts_lever");
let c0 = (await G()).cash;
ok((await ev(`TLXGUN.buyPart("grip", "bipod")`)) === false && (await ev(`TLXGUN.buyPart("barrel", "heavy24")`)) === false && (await G()).cash === c0 && !(await G()).own["barrel:heavy24"], "B: the bolt rifle's bipod and heavy barrel are refused for the carbine, no cash taken");
tl = await toasts(); ok(tl.some(t => /doesn't fit the lever-action you're carrying/.test(t)), "B: and the toast says why");
const chip = await J(`(() => { const b = $("ifShop").querySelector('button[data-gpart="lever:lvshort"]'); return b.closest(".ifit").textContent; })()`);
ok(/Action −0\.12/.test(chip) && /Handling −0/.test(chip), "B: the short-throw lever's card says what it changes: " + chip.replace(/\s+/g, " ").slice(-60));
ok((await press('button[data-gpart="lever:lvshort"]')) === "clicked" && (await press('button[data-gpart="sight:scope39"]')) === "clicked" && (await press('button[data-gpart="magazine:lvm7"]')) === "clicked", "B: buy the short-throw lever, the scope and the 7-round box"); await sleep(200);
g = await G();
ok(g.parts.lever === "lvshort" && g.st.cyc === 0.38 && g.st.cap === 7 && g.st.zoom === 6 && g.cash === c0 - 270 - 480 - 190, `B: fitted: action ${g.st.cyc} s, ${g.st.cap} rounds, ${g.st.zoom}x`);
await ev(`TLXGUN.carry("bolt308"); true`);
ok((await J(`TLXGUN.ownedParts("sight").map(p => p.id)`)).join() === "iron,scope39" && (await ev(`TLXGUN.fit("sight", "scope39", true)`)) === true && (await ev(`TLXGUN.fit("sight", "peep", true)`)) === false && (await ev(`TLXGUN.fit("magazine", "lvm7", true)`)) === false && (await G()).parts.magazine === "int3",
  "B: the scope bought for the carbine goes on the bolt rifle too; the carbine's magazine and peep don't");
await ev(`TLXGUN.fit("sight", "iron", true); TLXGUN.carry("lever308"); TLXGUN.fit("sight", "iron", true); TLXGUN.fit("lever", "lvstd", true); TLXGUN.fit("magazine", "lvm4", true); TLXGUN.buyAmmo(); TLXGUN.buyAmmo(); $("ifShopX").click(); true`); await sleep(200);

// ---- out on the fell
const spot = await J(`(() => { const W = { x: depot.x, z: depot.z };
  for (let r = 500; r < 2600; r += 60) for (let an = 0; an < 6.28; an += 0.35) {
    const x = W.x + Math.cos(an) * r, z = W.z + Math.sin(an) * r;
    if (Math.abs(x) > HALF - 400 || Math.abs(z) > HALF - 400 || isSea(x, z) || isWater(x, z) || obNear(x, z, 12)) continue;
    FOOT.x = x; FOOT.z = z; if (TLXGUN.slungWhy() && TLXGUN.slungWhy() !== "busy") continue;
    for (let yw = 0; yw < 6.28; yw += 0.4) {
      const dx = Math.sin(yw), dz = Math.cos(yw); let good = true, g0 = surf(x, z);
      for (let t = 10; t <= 200 && good; t += 10) { const px = x + dx * t, pz = z + dz * t; if (isSea(px, pz) || isWater(px, pz) || Math.abs(surf(px, pz) - g0) > 1.6 || solidNear(px, pz, 3)) good = false; }
      if (!good || TLXGUN.unsafe(x, z, dx, dz)) continue;
      FOOT.y = surf(x, z); FOOT.yaw = yw; FOOT.sp = 0; window.__yaw = yw; P.x = x - dx * 6; P.z = z - dz * 6; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; recenter(x, z, true); camState.init = false;
      return { x: Math.round(x), z: Math.round(z), yaw: +yw.toFixed(2), r };
    } }
  return null; })()`);
console.log("spot", JSON.stringify(spot));
ok(!!spot, "C: found open fell with a clear 200 m line");
if (!spot) await done(1);
await sleep(900);

// ---- C: the lever in the field
await ev(`TLXGUN.TUNE.sway = 0; true`);
await tap("KeyL");
ok(await until("TLXGUN.AIM.on && TLXGUN.AIM.t >= 1", 5) && await until("TLXGUN.gun().rounds === 4", 6), "C: carbine up, the magazine fills with four");
await sleep(200); g = await G(); console.log("C hud", g.amm, "|", g.hint);
ok(/4 \/ 4 · 36 in the pack/.test(g.amm) && /clean to 115 m/.test(g.hint), `C: its line reads "${g.amm}", clean to 115 m`);
const vm = await J(`(() => { const v = TLXGUN.AIM.vm; let n = 0; v.traverse(o => { if (o.isMesh) n++; }); return { lever: !!v.userData.lever, meshes: n, key: TLXGUN.AIM.vmKey, vis: v.visible }; })()`);
ok(vm.lever && vm.vis && /^lever308:lv20,lvstr,lvstd,lvm4,iron$/.test(vm.key), "C: the rifle in your hands is the carbine, built from its parts: " + vm.key);
await ev(`FOOT.yaw = window.__yaw; TLXGUN.AIM.pitch = 0; true`); await frames(); await shot("x11f_lever_up");
const lv1 = await cycle();
await ev(`TLXGUN.fit("lever", "lvshort", true); true`); await frames(2);
const lv2 = await cycle();
ok((await ev("TLXGUN.AIM.vmKey")).includes("lvshort"), "C: a new lever rebuilds the rifle you look down");
await tap("KeyL"); await sleep(300);
await ev(`TLXGUN.carry("bolt308"); true`);
await tap("KeyL"); await until("TLXGUN.AIM.on && TLXGUN.AIM.t >= 1", 5); await until("TLXGUN.gun().rounds === 3", 6);
const vb = await J(`({ lever: !!TLXGUN.AIM.vm.userData.lever, key: TLXGUN.AIM.vmKey })`);
const bo = await cycle();
console.log("C cycle", JSON.stringify({ lever: lv1, short: lv2, bolt: bo }));
const xl = 0.5 * (0.75 + 0.35 * 1.1), xb = 0.95 * (0.75 + 0.35 * 1.0);          // read a frame or two after the shot, so a little under
ok(lv1.fired && bo.fired && lv1.set <= xl && lv1.set > xl - 0.11 && bo.set <= xb && bo.set > xb - 0.11, `C: the action's time is the frame's: lever ${lv1.set.toFixed(2)} s of ${xl.toFixed(2)}, bolt ${bo.set.toFixed(2)} s of ${xb.toFixed(2)}`);
ok(lv1.t < bo.t * 0.7 && lv2.t < lv1.t, `C: measured to the next shot: bolt ${bo.t.toFixed(2)} s, lever ${lv1.t.toFixed(2)} s, short-throw ${lv2.t.toFixed(2)} s`);
ok(lv1.mid.lv > 0.05 && lv2.mid.lv > 0.02 && !vb.lever && /^bolt308:/.test(vb.key), `C: the lever loop swings on the stroke (${lv1.mid.lv.toFixed(2)} rad mid-stroke); the bolt rifle has none`);
await tap("KeyL"); await sleep(300);
// the reach: 130 m is inside the bolt rifle's 140 and outside the carbine's 115
await ev(`TLXGUN.carry("lever308"); TLXGUN.fit("lever", "lvstd", true); true`);
await tap("KeyL"); await until("TLXGUN.AIM.on && TLXGUN.AIM.t >= 1", 5); await until("TLXGUN.gun().rounds >= 3", 6);
await ev(`FOOT.yaw = window.__yaw; TLXGUN.AIM.pitch = 0; true`);
const r60 = await mk("reindeer", 60), r130 = await mk("reindeer", 130, 0.5);
await aimAt(r60); await frames(); await shot("x11f_lever_aim");
await tap("KeyE"); await sleep(250); g = await G();
ok(g.last.res === "kill" && (await ev(`window.__an[${r60}].m[0].dead`)) === 1, "C: the carbine drops the reindeer at 60 m");
await sleep(150); await shot("x11f_lever_stroke");
await boltDone();
await ev(`window.__an[${r130}].state = "graze"; window.__an[${r130}].t = 999; window.__an[${r130}].v = 0; window.__an[${r130}].m[0].v = 0; true`);
await aimAt(r130); await frames();
await tap("KeyE"); await sleep(250); g = await G(); tl = await toasts();
console.log("C 130", JSON.stringify(g.last));
ok(g.last.res === "short" && tl.some(t => /past this rifle's clean reach \(115 m\)/.test(t)), "C: 130 m is past the carbine's 115 m, and it says so");
await boltDone();

// ---- D: the wheel
await holdR(); let w = await W();
console.log("D slots", JSON.stringify(w.slots));
ok(w.open && w.slots.length === 6 && /^1Barrel/.test(w.slots[0]) && /^3Lever/.test(w.slots[2]) && /Standard lever loop/.test(w.slots[2]) && /^6Ammo/.test(w.slots[5]) && !w.slots.some(s => /Grip/.test(s)) && /Lever-action carbine/.test(w.text), "D: the wheel shows the carbine's slots: " + w.slots.map(s => s.slice(1, 8)).join(" "));
await shot("x11f_wheel");
await tap("Digit3"); await sleep(250); w = await W();
console.log("D strip", JSON.stringify(w.strip));
ok(w.stage === "part" && w.parts.join() === "lvstd,lvshort" && /FITTED/.test(w.strip[0]) && /Action/.test(w.strip[1]) && /−0\.12/.test(w.strip[1]), "D: 3 lists the levers you own; the short-throw shows an Action bar");
await shot("x11f_wheel_lever");
await tap("Digit2"); await sleep(300); g = await G(); w = await W(); tl = await toasts();
ok(!w.open && g.parts.lever === "lvshort" && g.st.cyc === 0.38 && tl.some(t => /Short-throw lever fitted/.test(t)), "D: picked: the short-throw lever is on, the wheel shuts");
await holdR(); await tap("Digit5"); await sleep(250); w = await W();
ok(w.parts.join() === "iron,scope39", "D: the Sight strip offers the scope bought earlier (shared), not the peep you don't own: " + w.parts.join());
await tap("Escape"); await sleep(200);
await tap("KeyL"); await sleep(300);

// ---- E: saved
const before = await G();
await reload(); await ready();
g = await G();
ok(g.owned.join() === "bolt308,lever308" && g.frame === "lever308" && g.parts.lever === "lvshort" && g.rounds === before.rounds && g.tot === before.tot && g.own["lever:lvshort"] === 1 && g.own["magazine:lvm7"] === 1, "E: both rifles, the one carried, its lever and the parts bought survive a reload");
const sv = await J(`JSON.parse(localStorage.getItem("tracklayer.save.v2"))`);
const bad = JSON.parse(JSON.stringify(sv));
bad.x.sys.guns.s.owned = [{ frame: "lever308", parts: { barrel: "heavy24", stock: "walnut", grip: "bipod", lever: "lvbig", magazine: "det10", sight: "peep" }, rounds: 99, ammo: "sp308" }, { frame: "lever308", parts: {}, rounds: 1 }, { frame: "bolt308", parts: { barrel: "lv16", grip: "plain", magazine: "lvm7", sight: "scope39" }, rounds: 2 }, { frame: "pump12" }];
bad.x.sys.guns.s.cur = 7; bad.x.sys.guns.s.parts = { "magazine:lvm7": 1, "sight:scope39": 1, "lever:nope": 1, "grip:lvbig": 1 };
await reload(bad); await ready();
const b = await J(`(() => { const s = TLXGUN.state(); return { owned: s.owned, cur: s.cur, parts: s.parts, st: s.owned.map(g => TLXGUN.stats(g)) }; })()`);
console.log("E bad", JSON.stringify(b.owned), b.cur, JSON.stringify(b.parts));
ok(b.owned.length === 2 && b.owned[0].frame === "lever308" && b.owned[1].frame === "bolt308" && b.cur === 1, "E: one rifle per frame, an unknown frame dropped, cur back in range");
ok(JSON.stringify(b.owned[0].parts) === JSON.stringify({ barrel: "lv20", stock: "lvstr", lever: "lvstd", magazine: "lvm4", sight: "iron" }) && b.owned[0].rounds === 4 && !("grip" in b.owned[0].parts),
  "E: a carbine saved with bolt parts (and parts never bought) comes back on its own stock parts, 4 in the magazine");
ok(JSON.stringify(b.owned[1].parts) === JSON.stringify({ barrel: "std22", stock: "walnut", grip: "plain", magazine: "int3", sight: "scope39" }) && JSON.stringify(Object.keys(b.parts).sort()) === JSON.stringify(["magazine:lvm7", "sight:scope39"]) && b.st.every(s => Number.isFinite(s.cyc) && Number.isFinite(s.range)),
  "E: a bolt rifle saved with the carbine's barrel and magazine likewise; the scope it owns stays on");
const old = JSON.parse(JSON.stringify(sv));
old.x.sys.guns = { v: 3, s: { owned: [{ frame: "bolt308", parts: { barrel: "carb18", stock: "walnut", grip: "plain", magazine: "det5", sight: "red1" }, rounds: 5, ammo: "match308" }], cur: 0, parts: { "barrel:carb18": 1, "magazine:det5": 1, "sight:red1": 1 }, ammo: 30, alt: { match308: 12 }, licence: true, game: [], taken: {} } };
await reload(old); await ready();
g = await G();
ok(g.owned.join() === "bolt308" && g.parts.barrel === "carb18" && g.parts.magazine === "det5" && g.parts.sight === "red1" && g.rounds === 5 && g.tot === 42 && g.st.cyc === 0.95 && g.st.cap === 5, "E: an 11.3 save with one built bolt rifle loads exactly as it was");
await ev(`GS.cash = 5000; FISH.openShop("g_rifle", "guns"); true`); await sleep(300);
ok(/^disabled:Owned$/.test(await press('button[data-grifle="bolt308"]')) && /Buy · /.test(await ev(`$("ifShop").querySelector('button[data-grifle="lever308"]').textContent`)), "E: and that player is offered the carbine");
await done(fails ? 1 : 0);

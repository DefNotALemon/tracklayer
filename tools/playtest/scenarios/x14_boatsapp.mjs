// Expansion slice 14.4a: the Boats app and the tow home (tlx-boats.js). Asserts, exit 1 on a failure.
//   no app without a boat; with one the tablet has Boats: a card with hull, fuel, cargo and where she lies; at the quay
//   jetty there is nothing to tow; aboard at Dyfjord the fee follows the distance by sea, TOW HOME fades, puts her on a
//   free quay berth with you aboard, charges the fee and moves the clock on; out of fuel at sea the warning names the tow
//   and the help control (keyboard, pad, touch) calls it, even broke; from the sled the boat is fetched without you and
//   MARK ON MAP sets the Map's marker; a second boat keeps its berth; a blow costs half as much again; a dented hull
//   shows; a reload keeps her where the tow left her. NOSTILLS=1 skips the stills.
import { boot, ev, raw, send, tap, sleep, done, reload, shot, padSet } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
const STILLS = !process.env.NOSTILLS;
async function waitUntil(expr, maxGame = 12) { const t0 = await clock(); while ((await clock()) - t0 < maxGame) { if (await ev(expr)) return true; await sleep(150); } return false; }
const moveTo = (i, side = 1) => ev(`(() => { const b = TLXB.berthPose(TLXB.DOCKS[${i}], ${side}); P.x = b.x; P.z = b.z; P.yaw = b.yaw; P.vx = P.vz = 0; P.y = wlvAt(P.x, P.z) || 0; recenter(P.x, P.z, true); return 1; })()`);
const toasts = () => J(`(typeof TOASTQ !== "undefined" ? TOASTQ.map(t => t.msg || t[0] || String(t)) : []).concat([...document.querySelectorAll("#toasts > *")].map(e => e.textContent))`);
const clearToasts = () => ev(`(() => { if (typeof TOASTQ !== "undefined") TOASTQ.length = 0; document.getElementById("toasts").textContent = ""; return 1; })()`);
const app = async () => { await ev(`TABLET.toggle(false); true`); await sleep(250); await ev(`TABLET.toggle(true, "boats"); true`); await sleep(900); return ev(`document.getElementById("tabV").innerText`); };
const boatsS = `TLX.state("vehicles").owned.filter(r => r.id === "skiff")`;
const quayD = `(() => { const s = TLX.state("vehicles"); return ${boatsS}.map(r => { const p = s.cur === r.uid ? P : r; return Math.min(...[-1, 1].map(sd => { const b = TLXB.berthPose(TLXB.DOCKS[0], sd); return Math.hypot(p.x - b.x, p.z - b.z); })); }); })()`;
const buy = async () => { await ev(`garageTab = "boats"; openGarage(); true`); await sleep(400); await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(300); await ev(`closeGarage(); true`); };
const clickAct = pre => ev(`(() => { const b = document.querySelector("#tabV [data-act^='${pre}:']"); if (b) b.click(); return !!b; })()`);

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`);

// ---- 1. no boat, no app
ok(await ev(`!!TABLET.byId.boats && TABLET.byId.boats.hidden() === true`), "without a boat the Boats app is off the home screen");

// ---- 2. buy one: the app, the card at the quay jetty
await ev(`GS.cash = 9000; true`); await buy();
ok(await ev(`TABLET.byId.boats.hidden() === false`), "owning a skiff, the Boats app is on the home screen");
let t = await app();
console.log("card:", t.replace(/\s+/g, " ").slice(0, 600));
ok(/Fjordsnekka 460/.test(t) && /MOORED/.test(t) && /At the quay jetty/i.test(t), "the card names her, MOORED, at the quay jetty");
ok(/Fuel 25 of 25 L/.test(t) && /Hull sound/.test(t) && /Nothing aboard/.test(t), "it shows a full tank, a sound hull, nothing aboard");
{ const km = +(t.match(/about (\d+) km flat out/) || [])[1]; ok(km >= 20 && km <= 70, `a full tank's range reads plausibly (${km} km flat out)`); }
ok(!/TOW HOME/.test(t), "at the quay jetty there is no TOW HOME button");
ok(/MARK ON MAP/.test(t), "not aboard, the card has MARK ON MAP");
ok(/Quay jetty/.test(t) && /Dyfjord jetty/.test(t) && /she's here/.test(t), "the jetties are listed, the quay's marked as where she is");
ok(await ev(`[...document.querySelectorAll("#tabV [data-act]")].every(b => b.closest("[data-tf]") || b.dataset.tf)`), "every button in the app is reachable by pad / arrows (data-tf)");
if (STILLS) await shot("x14a_1_quay");

// ---- 3. aboard at Dyfjord: the fee, the tow
await ev(`TLXV.swapTo(${boatsS}[0].uid); FOOT.on = false; true`); await sleep(500);
await moveTo(1); await sleep(800);
const seaK = await J(`({ dock: TLXB.seaKm(TLXB.DOCKS[0], TLXB.DOCKS[1]), at: TLXB.towKm(${boatsS}[0]), fee: TLXB.towFee(${boatsS}[0]), name: TLXB.DOCKS[1].name })`);
console.log("sea km", JSON.stringify(seaK));
ok(Math.abs(seaK.dock - seaK.at) < 0.25, `the tow distance from her berth at ${seaK.name} (${seaK.at.toFixed(2)} km) matches jetty to jetty (${seaK.dock.toFixed(2)} km)`);
ok(seaK.fee === Math.round((40 + 30 * seaK.at) / 5) * 5, `the fee is $40 + $30 a km by sea: $${seaK.fee}`);
t = await app();
ok(/ABOARD/.test(t) && new RegExp("At the " + seaK.name, "i").test(t) && /TOW HOME/.test(t) && t.includes("$" + seaK.fee), `aboard at ${seaK.name}: ABOARD, the place, TOW HOME and $${seaK.fee}`);
ok(!/MARK ON MAP/.test(t), "aboard there is no MARK ON MAP");
if (STILLS) await shot("x14a_2_dyfjord");
// broke: refused, with the price
await ev(`GS.cash = 20; true`); await clearToasts(); await clickAct("btw"); await sleep(300);
ok((await toasts()).some(x => x.includes("The tow is $" + seaK.fee)) && (await J(quayD))[0] > 500 && await ev(`GS.cash === 20`), "without the cash the tow is refused and says what it costs");
await ev(`GS.cash = 5000; GS.load.push({ dest: TLXB.DOCKS[3].site, cargo: "Crab pots (test)", fragile: false, pay: 100, hits: 0, sea: true }); true`);
const h0 = await ev(`GS.hour`); await clearToasts();
t = await app(); await clickAct("btw");
await sleep(250);
ok(await ev(`!TABLET.open`), "TOW HOME aboard puts the tablet away");
if (STILLS) { await sleep(450); await shot("x14a_3_fade"); }
const home = await waitUntil(`(${quayD})[0] < 1.5 && document.getElementById("tlxbFade").style.opacity === "0"`, 8);
await sleep(900);
let s = await J(`({ d: (${quayD})[0], cash: GS.cash, hour: GS.hour, foot: FOOT.on, boat: !!(VEH.cur && VEH.cur.pin === "boat"), v: Math.hypot(P.vx, P.vz), load: GS.load.length, y: P.y, help: HELP.on })`);
console.log("towed", JSON.stringify(s));
ok(home && s.d < 1.5, `she is on a berth at the quay jetty (${s.d.toFixed(2)} m off it)`);
ok(s.boat && !s.foot && s.v < 0.3 && Math.abs(s.y) < 0.6, "you are still aboard, stopped, afloat");
ok(s.cash === 5000 - seaK.fee, `the fee came off: $${5000 - s.cash}`);
ok(Math.abs((s.hour - h0) - seaK.at / 11) < 0.08, `the clock moved on by the tow (${((s.hour - h0) * 60).toFixed(0)} game min for ${seaK.at.toFixed(1)} km at 11 km/h)`);
ok(s.load === 1, "the parcel aboard stayed aboard");
ok((await toasts()).some(x => /towed you in/.test(x) && x.includes("$" + seaK.fee)), "the toast says what it cost");
if (STILLS) await shot("x14a_4_home");
await ev(`GS.load.length = 0; true`);
// she drives off under her own power afterwards
{ const p0 = await J(`[P.x, P.z]`); await send("Input.dispatchKeyEvent", { type: "keyDown", code: "KeyW", key: "w", windowsVirtualKeyCode: 87 }); await waitUntil(`Math.hypot(P.vx, P.vz) > 2`, 6); await send("Input.dispatchKeyEvent", { type: "keyUp", code: "KeyW", key: "w", windowsVirtualKeyCode: 87 });
  const p1 = await J(`[P.x, P.z]`); ok(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) > 0.5, "after the tow the throttle drives her again"); }

// ---- 4. out of fuel at sea: the warning, the help control on keyboard / pad / touch
const mid = await J(`(() => { const a = TLXB.dockEnd(TLXB.DOCKS[0]), b = TLXB.dockEnd(TLXB.DOCKS[1]); for (let k = 0.5; k < 0.9; k += 0.05) { const x = a.x + (b.x - a.x) * k, z = a.z + (b.z - a.z) * k; if (TLXB.depthAt(x, z) > 3 && !TLXB.dockAt(x, z)) return [x, z]; } return null; })()`);
ok(!!mid, "found open water between the quay and Dyfjord");
// (moved off the quay jetty first, then emptied: tied up there the quay's hose still fills her for a frame after a teleport)
const strand = async (cash) => { await ev(`(() => { P.x = ${mid[0]}; P.z = ${mid[1]}; P.vx = P.vz = 0; recenter(P.x, P.z, true); return 1; })()`); await sleep(500);
  await clearToasts(); await ev(`GS.fuel = 0; GS.outWarned = false; GS.cash = ${cash}; true`); await sleep(700); };
const towedIn = () => waitUntil(`(${quayD})[0] < 1.5 && document.getElementById("tlxbFade").style.opacity === "0"`, 8);
await strand(3000);
{ const fee = await ev(`TLXB.towFee(${boatsS}[0])`), ts = await toasts();
  console.log("dry toast:", ts.find(x => /Out of fuel/.test(x)));
  ok(ts.some(x => /Out of fuel/.test(x) && /tow to the quay jetty/.test(x) && x.includes("$" + fee) && !/fuel delivery/.test(x)), `the empty-tank warning names the tow and its price ($${fee}), not a fuel sled`);
  t = await app(); ok(/NO FUEL/.test(t) && /tank is dry/.test(t) && /Afloat, .* off the/i.test(t), "the card says NO FUEL, dry, and how far off which jetty she lies");
  ok(await ev(`TABLET.byId.boats.badge() === "!"`), "the app icon carries a ! badge");
  await ev(`TABLET.toggle(false); true`); await sleep(300);
  await tap("KeyP"); ok(await towedIn(), "keyboard: the help key calls the tow and she is brought in");
  s = await J(`({ cash: GS.cash, help: HELP.on, rs: !!(HELP.rs && HELP.rs.visible), fuel: GS.fuel })`);
  ok(s.cash === 3000 - fee && !s.help && !s.rs, `it cost the tow ($${3000 - s.cash}), and no rescue sled set out over the water`);
  const filled = await waitUntil(`GS.fuel > 1`, 6); ok(filled, "tied up at the quay jetty the tank fills again"); }
await strand(15);
await padSet({ 13: 1 }); await sleep(350); await padSet();
ok(await towedIn(), "pad: D-pad down calls the tow");
ok(await ev(`GS.cash === 0`) && (await toasts()).some(x => /all you had on you/.test(x)), "broke and dry at sea you are still towed in: it takes what you have ($15)");
await strand(3000);
await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 640, y: 200 }] }); await sleep(100);
await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await sleep(200);
await ev(`SET.touch = "on"; setTouchUI(); true`); await sleep(600);
{ const vis = await ev(`(() => { const b = document.getElementById("tcF"); return !!b && !b.hidden && getComputedStyle(b).display !== "none"; })()`);
  ok(vis, "touch: the CALL HELP button is up with an empty tank in the boat");
  await ev(`document.getElementById("tcF").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 5, pointerType: "touch" })); true`); await sleep(120);
  await ev(`document.getElementById("tcF").dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 5, pointerType: "touch" })); true`);
  ok(await towedIn(), "touch: CALL HELP calls the tow"); }
await ev(`SET.touch = "off"; setTouchUI(); true`); await tap("KeyH"); await sleep(200);

// ---- 5. from the sled: she is fetched without you; MARK ON MAP
await moveTo(2); await sleep(500);
await ev(`GS.fuel = 12; TLXV.swapTo(null); FOOT.on = false; GS.cash = 3000; true`); await sleep(600);
ok(await ev(`!VEH.cur`), "back on the sled, the skiff left at the third jetty");
const far = await J(`({ fee: TLXB.towFee(${boatsS}[0]), km: TLXB.towKm(${boatsS}[0]), name: TLXB.DOCKS[2].name, x: ${boatsS}[0].x, z: ${boatsS}[0].z, sled: [P.x, P.z] })`);
t = await app();
ok(/MOORED/.test(t) && new RegExp("At the " + far.name, "i").test(t) && t.includes("$" + far.fee) && /Fuel 12 of 25/.test(t), `the card: MOORED at the ${far.name}, 12 L, tow $${far.fee} for ${far.km.toFixed(1)} km`);
ok(/brings her home without you/.test(t), "it says the tow brings her home without you");
if (STILLS) await shot("x14a_5_fromsled");
await clickAct("btm"); await sleep(200);
{ const wp = await J(`({ x: WP.x, z: WP.z })`); ok(wp.x !== null && Math.hypot(wp.x - far.x, wp.z - far.z) < 1, "MARK ON MAP puts the Map's marker on her"); }
const h1 = await ev(`GS.hour`), c1 = await ev(`GS.cash`); await clearToasts();
await clickAct("btw"); await sleep(400);
s = await J(`({ d: (${quayD})[0], cash: GS.cash, hour: GS.hour, sled: [P.x, P.z], open: TABLET.open, fade: (document.getElementById("tlxbFade") || { style: {} }).style.opacity })`);
console.log("fetched", JSON.stringify(s));
ok(s.d < 0.1 && s.cash === c1 - far.fee, `she is on a quay berth at once and $${far.fee} came off`);
ok(Math.hypot(s.sled[0] - far.sled[0], s.sled[1] - far.sled[1]) < 2 && s.hour - h1 < 0.05 && s.open, "you and the sled stayed put, no time skipped, the tablet stays up");
ok((await toasts()).some(x => /fetched her/.test(x) && /your own way/.test(x)), "the toast says she was fetched and you make your own way");
t = await ev(`document.getElementById("tabV").innerText`);
ok(/At the quay jetty/i.test(t) && !/TOW HOME/.test(t), "the card refreshed: at the quay jetty, no tow offered");

// ---- 6. a second boat keeps its berth; the heavy-weather rate; a dented hull
await ev(`GS.cash = 9000; true`); await buy();
ok((await J(boatsS)).length === 2, "bought a second skiff");
await ev(`(() => { const r = ${boatsS}[0], b = TLXB.berthPose(TLXB.DOCKS[1], 1); r.x = b.x; r.z = b.z; r.yaw = b.yaw; r.cond = 60; return 1; })()`); await sleep(400);
const calm = await ev(`TLXB.towFee(${boatsS}[0])`); await ev(`GS.storm = 0.9; true`);
const rough = await ev(`TLXB.towFee(${boatsS}[0])`);
ok(rough === Math.round((40 + 30 * seaK.at) * 1.5 / 5) * 5 && rough > calm, `in a blow the tow costs half as much again ($${calm} -> $${rough})`);
t = await app();
ok(/HEAVY WEATHER RATE/.test(t) && /HULL 60%/.test(t) && /Hull 60%: the dents cost her 10% of her power/.test(t) && /no\. 1/.test(t) && /no\. 2/.test(t), "the app shows the heavy-weather rate, the dented hull and what it costs her, and numbers two boats");
if (STILLS) await shot("x14a_6_two");
await ev(`GS.storm = 0; true`);
await clickAct("btw"); await sleep(400);
{ const d = await J(quayD), sep = await J(`(() => { const b = ${boatsS}; return Math.hypot(b[0].x - b[1].x, b[0].z - b[1].z); })()`);
  ok(d[0] < 0.1 && d[1] < 0.1 && sep > 3, `both skiffs lie on quay berths, ${sep.toFixed(1)} m apart`); }

// ---- 7. reload: she stays where the tow left her
const before = await J(`${boatsS}.map(r => [r.x, r.z, r.cond])`);
await ev(`save(); true`); await reload(); await sleep(800);
const after = await J(`${boatsS}.map(r => [r.x, r.z, r.cond])`);
ok(after.length === 2 && after.every((p, i) => Math.hypot(p[0] - before[i][0], p[1] - before[i][1]) < 0.01) && Math.abs(after[0][2] - before[0][2]) < 1e-6 && Math.round(after[0][2]) === 60, "after a reload both boats are on their berths and the dent is still there (a few seconds of the blow above wore her a hair: 14.4b3)");
ok(await ev(`TABLET.byId.boats.hidden() === false`), "and the Boats app is still on the home screen");

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
await done(fails ? 1 : 0);

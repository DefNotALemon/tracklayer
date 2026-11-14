// Slice 11.1a (G4): the rifle model and the gun shop, Jakt & Våpen (tlx-guns.js). Asserts, exit 1 on a failure.
//  A. the shop stands at a lit town door inside the town limit, clear of Sport & Vinter, Fisk & Friluft and the sea, with a sign.
//  B. walking into its ring (held W) takes you into its own room; the outdoor hint names the door.
//  C. the room: the door -> counter walk is clear; walked for real, the use control reads SHOP at the counter.
//  D. keyboard E opens "Guns & ammunition" (tabs licence/rifles/parts/ammo/game, nothing else). With the licence option on, the
//     rifle is locked until the course; the course charges $180; the rifle $1450 and comes with its stock parts; a part
//     buys and fits (stats move the right way), an owned part refits free; a smaller magazine hands rounds back; ammo
//     stops at the pack limit.
//  E. the same counter by Xbox pad L3 and a touch tap on SHOP; pad B / ✕ close. With the licence option off, no course needed.
//  F. saved: the rifle, its parts, ammo and licence survive a reload; a corrupt entry and a save from before 11.1 load clean.
import { boot, ev, tap, down, up, sleep, done, shot, reload, padSet, padOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
// after a reload: wait until the page is really back (beta 0184 #1: a fixed 500 ms was too short on a loaded machine)
async function ready() { for (let i = 0; i < 100; i++) { await sleep(150); try { if (await ev(`typeof TLXGUN !== "undefined" && !!TLXGUN.state() && started`)) { await sleep(300); return true; } } catch (e) {} } return false; }
async function until(expr, secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) { if (await ev(expr)) return true; await sleep(100); } return !!(await ev(expr)); }
const toasts = () => J(`(TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))`);
const panel = () => J(`({ open: !$("ifShop").hidden, h2: ($("ifShop").querySelector("h2") || {}).textContent, tabs: [...($("ifShopTabs") || { children: [] }).children].map(t => t.dataset.t) })`);
const tab = t => ev(`$("ifShopTabs").querySelector('[data-t="${t}"]').click(); true`);
const press = sel => ev(`(() => { const b = $("ifShop").querySelector('${sel}'); if (!b) return "none"; if (b.disabled) return "disabled:" + b.textContent; b.click(); return "clicked"; })()`);
const btnTxt = sel => ev(`(() => { const b = $("ifShop").querySelector('${sel}'); return b ? b.textContent : "none"; })()`);
const S = () => J(`({ use: footUse(), hint: $("wnHint").textContent, tE: $("tcUse").hidden ? null : $("tcUse").textContent, on: INT.on, cab: INT.on ? INT.cab.id : null, cash: GS.cash })`);
const G = () => J(`(() => { const s = TLXGUN.state(), g = TLXGUN.gun(); return { n: s.owned.length, cur: s.cur, lic: s.licence, ammo: s.ammo, parts: g ? g.parts : null, rounds: g ? g.rounds : null, st: g ? TLXGUN.stats(g) : null, cash: GS.cash }; })()`);

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 36; P.x += 60; P.z += 60; P.y = surf(P.x, P.z) + 0.3; true`); await sleep(500);
// A
const A = await J(`(() => { const b = TLXGUN.shop.b, w = TLXG.shop.b; if (!b) return null; return { dDepot: Math.hypot(b.x - depot.x, b.z - depot.z), dWinter: w ? Math.hypot(b.x - w.x, b.z - w.z) : 99, dFisk: Math.hypot(b.x - FISHSITES.shop.x, b.z - FISHSITES.shop.z), sea: isSea(b.x, b.z) || isWater(b.x, b.z), sign: !!TLXGUN.shop.sign, inBeacons: INT.beacons.includes(b), townR: TOWN_R, minRing: Math.min(...INT.beacons.filter(o => o !== b).map(o => Math.hypot(o.x - b.x, o.z - b.z))) }; })()`);
console.log("A", JSON.stringify(A));
ok(A && A.inBeacons && A.dDepot < A.townR && A.dFisk >= 14 && A.dWinter >= 14 && A.minRing >= 14 && !A.sea && A.sign,
  "A: Jakt & Våpen at a town door " + (A ? `${A.dDepot.toFixed(0)} m from the depot, ${A.dWinter.toFixed(0)} m from Sport & Vinter, ${A.dFisk.toFixed(0)} m from Fisk & Friluft, nearest ring ${A.minRing.toFixed(0)} m` : ""));

// B: walk in from 3.5 m out
await ev(`(() => { const b = TLXGUN.shop.b, nx = Math.sin(b.ry), nz = Math.cos(b.ry); FOOT.on = true; FOOT.x = b.x + nx * 3.5; FOOT.z = b.z + nz * 3.5; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.yaw = b.ry + Math.PI; FOOT.sp = FOOT.fwd = 0; camState.init = false; return true; })()`);
await sleep(900);
let s = await S(); console.log("B outside:", s.hint);
ok(/Jakt & Våpen's door is \d+ m off/.test(s.hint), "B: the hint names the gun shop's door: " + s.hint);
await shot("x11g_front");
await down("KeyW"); await until("INT.on || !!INT.ph", 10); await up("KeyW");
const inside = await until("INT.on", 6);
s = await S(); let tl = await toasts();
ok(inside && s.cab === "guns", "B: walked into the ring and inside the gun shop (" + s.cab + ")");
ok(tl.some(t => /Nordkinn Jakt & Våpen: gun oil/.test(t)), "B: the shop's own toast");
await sleep(500); await shot("x11g_room");

// C: the floor plan, then the walk for real
const C = await J(`(() => { const R = INT.room, lim = 0.34, C0 = TLXGUN.COUNTER;
  const hit = (x, z) => R.cols.some(c => x > c.x0 - lim && x < c.x1 + lim && z > c.z0 - lim && z < c.z1 + lim) || Math.abs(x) > R.hx - lim || Math.abs(z) > R.hz - lim;
  const path = [[R.exit.x, R.exit.z], [R.exit.x, R.exit.z + 0.95], [R.exit.x, -1.2], [C0.x, -1.2], [C0.x, C0.z - 0.85]];
  let bad = []; for (let i = 0; i < path.length - 1; i++) { const [a, b] = [path[i], path[i + 1]]; for (let k = 0; k <= 20; k++) { const x = a[0] + (b[0] - a[0]) * k / 20, z = a[1] + (b[1] - a[1]) * k / 20; if (hit(x, z)) bad.push([+x.toFixed(2), +z.toFixed(2)]); } }
  return { bad, cols: R.cols.length }; })()`);
console.log("C", JSON.stringify(C));
ok(C.bad.length === 0, "C: door -> counter walk is clear of " + C.cols + " colliders (blocked at " + JSON.stringify(C.bad.slice(0, 3)) + ")");
await ev(`INT.px = INT.room.exit.x; INT.pz = -1.2; FOOT.yaw = Math.PI / 2; true`);
await down("KeyW"); await until(`INT.px > TLXGUN.COUNTER.x - 0.1`, 6); await up("KeyW"); await sleep(300); await ev(`INT.px = TLXGUN.COUNTER.x; FOOT.yaw = 0; true`);
await down("KeyW"); await until(`INT.pz > TLXGUN.COUNTER.z - 0.75`, 6); await up("KeyW"); await sleep(400);
s = await S(); console.log("C at counter", s.use, s.hint);
ok(s.on && s.use === "SHOP" && /E: talk to the gunsmith/.test(s.hint), "C: walked to the counter; use reads SHOP, hint: " + s.hint);
await shot("x11g_counter");

// D: keyboard
await ev(`GS.cash = 3000; true`); await tap("KeyE"); await sleep(400);
let p = await panel(); console.log("D", JSON.stringify(p));
ok(p.open && p.h2 === "Guns & ammunition" && p.tabs.join() === "g_lic,g_rifle,g_parts,g_ammo,g_game", "D: E opens Guns & ammunition, tabs " + p.tabs.join(", "));
await tab("g_rifle"); await sleep(150);
let r = await press('button[data-grifle="bolt308"]');
ok(/^disabled:Licence first/.test(r), "D: no licence: the rifle is locked (" + r + ")");
ok((await TLXbuy()) === false, "D: and TLXGUN.buyRifle refuses too");
async function TLXbuy() { return ev(`TLXGUN.buyRifle("bolt308")`); }
await tab("g_ammo"); await sleep(100);
ok(/Buy a rifle first/.test(await btnTxt('button[data-gammo]')), "D: no rifle: ammo says buy a rifle first");
await tab("g_lic"); await sleep(100);
ok((await press('button[data-glic]')) === "clicked", "D: take the licence course");
let g = await G(); ok(g.lic && g.cash === 2820, `D: licence held, $3000 -> $${g.cash}`);
await shot("x11g_licence");
await tab("g_rifle"); await sleep(100);
ok((await press('button[data-grifle="bolt308"]')) === "clicked", "D: buy the rifle");
g = await G(); console.log("D rifle", JSON.stringify(g));
ok(g.n === 1 && g.cur === 0 && g.cash === 1370 && g.parts.barrel === "std22" && g.parts.sight === "iron" && g.parts.magazine === "int3" && g.st.cap === 3, "D: rifle $1450 with its stock parts fitted, 3-round box");
ok(/^disabled:Owned/.test(await press('button[data-grifle="bolt308"]')), "D: can't buy the same rifle twice");
await shot("x11g_rifle");
const st0 = g.st;
await tab("g_parts"); await sleep(100);
const chips = await ev(`[...$("ifShop").querySelectorAll(".ifchip")].map(c => c.textContent).join(" | ")`);
ok(/Clean-kill range \+110/.test(chips) && /Handling −1/.test(chips), "D: the scope card shows its trade-off chips");
ok((await press('button[data-gpart="sight:scope39"]')) === "clicked", "D: buy & fit the 3-9x scope");
g = await G();
ok(g.parts.sight === "scope39" && g.cash === 890 && g.st.range === st0.range + 110 && g.st.zoom === 6 && g.st.handling < st0.handling && g.st.kg > st0.kg && g.st.spread < st0.spread,
  `D: scope fitted ($${g.cash}): range ${st0.range} -> ${g.st.range} m, zoom ${g.st.zoom}x, handling ${st0.handling} -> ${g.st.handling}, spread ${st0.spread} -> ${g.st.spread}`);
await press('button[data-gpart="sight:iron"]'); await sleep(120); g = await G();
ok(g.parts.sight === "iron" && g.cash === 890 && g.st.range === st0.range, "D: back to iron sights, free");
await press('button[data-gpart="sight:scope39"]'); await sleep(120); g = await G();
ok(g.parts.sight === "scope39" && g.cash === 890, "D: the owned scope refits free");
await press('button[data-gpart="magazine:det5"]'); await sleep(120); g = await G();
ok(g.parts.magazine === "det5" && g.st.cap === 5 && g.cash === 750, "D: 5-round magazine ($" + g.cash + ", cap " + g.st.cap + ")");
await shot("x11g_parts");
await tab("g_ammo"); await sleep(100);
for (let i = 0; i < 8; i++) { await press('button[data-gammo]'); await sleep(100); }
g = await G(); const amDis = await btnTxt('button[data-gammo]');
ok(g.ammo === 120 && g.cash === 750 - 6 * 38 && /that's all the pack takes/.test(amDis), `D: ammo stops at 120 ($${g.cash}): ${amDis}`);
// a smaller magazine hands the extra rounds back to the box
await ev(`(() => { const s = TLXGUN.state(), g = TLXGUN.gun(); g.rounds = 5; s.ammo = 100; return true; })()`);
ok(await ev(`TLXGUN.fit("magazine", "int3", true)`), "D: TLXGUN.fit swaps an owned part");
g = await G(); ok(g.rounds === 3 && g.ammo === 102, `D: back to the 3-round box: 3 in it, 2 back in the pack (${g.rounds}/${g.ammo})`);
ok(!(await ev(`TLXGUN.fit("barrel", "heavy24", true)`)) && !(await ev(`TLXGUN.fit("hat", "x")`)) && !(await ev(`TLXGUN.buyPart("__proto__", "x")`)), "D: unowned parts and junk slots refused, no throw");
await tap("Escape"); await sleep(300);
ok(!(await panel()).open, "D: Esc closes");

// E: pad and touch, and the licence option off
await sleep(300);
await padSet({ 10: 1 }); await sleep(350); await padSet({}); await sleep(450);
p = await panel(); ok(p.open && p.h2 === "Guns & ammunition", "E: Xbox L3 at the counter opens the shop");
await padSet({ 1: 1 }); await sleep(300); await padSet({}); await sleep(400);
ok(!(await panel()).open, "E: pad B closes it");
await padOff(); await sleep(300);
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(600);
s = await S(); console.log("E touch", JSON.stringify(s));
ok(s.tE === "SHOP" && /tap SHOP/.test(s.hint), "E: touch: the button reads SHOP, hint " + s.hint);
await ev(`(() => { const b = $("tcUse"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return true; })()`);
await sleep(500); p = await panel();
ok(p.open && p.h2 === "Guns & ammunition", "E: tapping SHOP opens the shop");
await shot("x11g_touch");
await ev(`$("ifShopX").click(); true`); await sleep(300);
ok(!(await panel()).open, "E: the ✕ closes it");
await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; true`); await sleep(200);
const off = await J(`(() => { const s = TLXGUN.state(), keep = JSON.stringify(s); s.owned = []; s.cur = -1; s.licence = false; GS.cash = 5000; TLX.setOn("huntlic", false); const r = TLXGUN.buyRifle("bolt308"); const out = { r, n: s.owned.length }; TLX.setOn("huntlic", true); Object.assign(s, JSON.parse(keep)); GS.cash = 750 - 6 * 38; return out; })()`);
ok(off.r === true && off.n === 1, "E: licence option off: the rifle sells without the course");

// F: saved
await ev(`save(); true`);
await reload(); await ready();
g = await G(); console.log("F", JSON.stringify(g));
ok(g.n === 1 && g.lic && g.parts.sight === "scope39" && g.parts.magazine === "int3" && g.ammo === 102 && g.rounds === 3 && !!(await ev("!!TLXGUN.shop.b")), "F: rifle, parts, ammo and licence survive a reload; the shop is back");
const bad = await J(`(() => { const s = JSON.parse(localStorage.getItem("tracklayer.save.v2")); s.x.sys.guns.s = { owned: [{ frame: "bolt308", parts: { sight: "laser", barrel: 7 }, rounds: 99 }, { frame: "nope" }, null], cur: 9, parts: { "sight:laser": 1, "__proto__": 1, "barrel:std22": 1 }, ammo: "lots", licence: "yes" }; return s; })()`);
await reload(bad); await ready();
g = await G(); console.log("F corrupt", JSON.stringify(g));
ok(g.n === 1 && g.cur === 0 && g.parts.sight === "iron" && g.parts.barrel === "std22" && g.rounds === 3 && g.ammo === 0 && g.lic === false, "F: a corrupt entry loads clean (one rifle, stock parts, no ammo, no licence)");
const old = await J(`(() => { const s = JSON.parse(localStorage.getItem("tracklayer.save.v2")); delete s.x.sys.guns; return s; })()`);
await reload(old); await ready();
g = await G(); ok(g.n === 0 && g.cur === -1 && g.ammo === 0 && !g.lic && !!(await ev("!!TLXGUN.shop.b")), "F: a save from before 11.1 starts with no rifle and the shop in town");
await done(fails ? 1 : 0);

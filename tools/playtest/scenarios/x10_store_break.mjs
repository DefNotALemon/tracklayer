// Beta break test for 10.2 Sport & Vinter (tlx-gear.js): try to break the store. Prints ok/FAIL/NOTE; exit 1 on FAIL.
//  A. corrupt saved spares (NaN, 99, -3, "x", 2.7) load clamped to 0..4 integers.
//  B. reload while standing inside the store: where do you come out, is the panel/INT state sane.
//  C. reload with the panel open.
//  D. double-fire of the buy button with cash for one pair: exactly one pair, cash never negative.
//  E. DRY PAIR while riding the sled / in a truck / during a dig / while another interior is open.
//  F. a wet reading just over/under PAIR_MIN, and changing at wet 0.3 never goes negative.
//  G. a night visit (GS.hour 2) and a storm: the door and counter still work.
import { boot, ev, tap, hold, down, up, sleep, done, shot, park, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const note = m => console.log("NOTE " + m);
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function until(expr, secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) { if (await ev(expr)) return true; await sleep(100); } return !!(await ev(expr)); }
const S = () => J(`({ use: footUse(), on: INT.on, cab: INT.on ? INT.cab.id : null, foot: FOOT.on, cash: GS.cash, st: TLXG.state(), shopOpen: !$("ifShop").hidden })`);
async function toDoor() {
  await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; P.x += 60; P.z += 60; P.y = surf(P.x, P.z) + 0.3; true`); await sleep(400);
  await ev(`(() => { const b = TLXG.shop.b, nx = Math.sin(b.ry), nz = Math.cos(b.ry); FOOT.on = true; FOOT.x = b.x + nx * 3.5; FOOT.z = b.z + nz * 3.5; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.yaw = b.ry + Math.PI; FOOT.sp = FOOT.fwd = 0; camState.init = false; return true; })()`);
  await sleep(600);
}
async function enterAndCounter() {
  await down("KeyW"); await until("INT.on", 10); await up("KeyW");
  await ev(`INT.px = INT.room.exit.x; INT.pz = -1.2; FOOT.yaw = Math.PI / 2; true`);
  await down("KeyW"); await until(`INT.px > TLXG.COUNTER.x - 0.1`, 6); await up("KeyW"); await sleep(200);
  await ev(`INT.px = TLXG.COUNTER.x; FOOT.yaw = 0; true`);
  await down("KeyW"); await until(`INT.pz > TLXG.COUNTER.z - 0.75`, 6); await up("KeyW"); await sleep(300);
}
await boot();
await toDoor();
const base = await J(`GS`);

// A: corrupt spares
for (const v of ["NaN", "99", "-3", "\"x\"", "2.7", "null"]) {
  const sv = JSON.parse(JSON.stringify(base)); sv.x = sv.x || { sys: {} }; sv.x.sys = sv.x.sys || {};
  sv.x.sys.gear = { v: 1, s: { base: "cotton", mid: "none", own: {}, wet: 0, spares: v === "NaN" ? "abc" : JSON.parse(v) } };
  await reload(sv); await sleep(500);
  const s = await J(`TLXG.state()`);
  ok(Number.isInteger(s.spares) && s.spares >= 0 && s.spares <= 4, `A: spares ${v} -> ${s.spares}`);
}
await reload(); await sleep(400);

// B: reload inside the store
await toDoor(); await enterAndCounter();
let s = await S(); ok(s.on && s.cab === "winter", "B: inside the store at the counter");
await ev(`GS.cash = 500; true`);
await ev(`window.dispatchEvent(new Event("pagehide")); true`);
await reload();  // the game saved on pagehide
await sleep(800);
s = await S(); console.log("B after reload", JSON.stringify(s));
ok(!s.on || s.cab === "winter", "B: after reload INT state sane (on=" + s.on + ")");
const pos = await J(`(() => { const X = FOOT.on ? FOOT : P; return {foot: FOOT.on, x: X.x, z: X.z, y: X.y, door: Math.hypot(X.x - TLXG.shop.b.x, X.z - TLXG.shop.b.z), nan: [X.x,X.z,X.y].some(v=>!isFinite(v)), under: X.y < surf(X.x, X.z) - 1}; })()`);
console.log("B pos", JSON.stringify(pos));
ok(!pos.nan && !pos.under, "B: walker position finite and above ground after reload");
if (pos.door > 150) note("B: reload while inside the store puts you " + pos.door.toFixed(0) + " m from the door (outdoor coords are saved, not the room)");
await shot("xsb_reload_inside");

// C: reload with panel open
await toDoor(); await enterAndCounter();
await ev(`GS.cash = 800; true`); await tap("KeyE"); await sleep(400);
s = await S(); ok(s.shopOpen, "C: panel open at the counter");
await ev(`window.dispatchEvent(new Event("pagehide")); true`);
await reload(); await sleep(800);
s = await S(); ok(!s.shopOpen, "C: panel closed after reload"); console.log("C", JSON.stringify(s));
await ev(`FOOT.on || (FOOT.on = true); true`);

// D: double-fire of the buy button
await toDoor(); await enterAndCounter();
await ev(`GS.cash = 150; TLXG.state().spares = 0; true`);
await tap("KeyE"); await sleep(400);
await ev(`$("ifShopTabs").querySelector('[data-t="w_spare"]').click(); true`); await sleep(200);
const dd = await J(`(() => { const b = $("ifShop").querySelector("button[data-spare]"); const before = GS.cash; b.click(); b.click(); b.click(); return { before, after: GS.cash, n: TLXG.state().spares, price: TLXG.SPARE }; })()`);
console.log("D", JSON.stringify(dd));
ok(dd.after >= 0 && dd.n === Math.min(3, Math.floor(dd.before / dd.price)), `D: triple click with $${dd.before}: ${dd.n} pair(s), cash $${dd.after}`);
// buy with exactly price
await ev(`GS.cash = TLXG.SPARE; TLXG.state().spares = 0; true`);
const d2 = await J(`(() => { $("ifShopTabs").querySelector('[data-t="w_spare"]').click(); const b = $("ifShop").querySelector("button[data-spare]"); b.click(); return { cash: GS.cash, n: TLXG.state().spares }; })()`);
ok(d2.cash === 0 && d2.n === 1, "D: exact cash buys one: " + JSON.stringify(d2));
await ev(`$("ifShop").querySelector(".ifclose, button.close, [data-close]") && $("ifShop").querySelector(".ifclose, button.close, [data-close]").click(); true`);
await tap("Escape"); await sleep(300);

// E: DRY PAIR in odd situations
await ev(`TLXG.state().spares = 2; TLXG.state().wet = 0.7; true`);
await ev(`INT.px = INT.room.exit.x; INT.pz = INT.room.exit.z + 1.2; FOOT.yaw = Math.PI; true`);
await down("KeyW"); await until("!INT.on", 8); await up("KeyW"); await sleep(1500);
await ev(`FOOT.x += Math.sin(TLXG.shop.b.ry) * 6; FOOT.z += Math.cos(TLXG.shop.b.ry) * 6; FOOT.y = surf(FOOT.x, FOOT.z); true`); await sleep(500);
s = await S(); ok(!s.on && s.use === "DRY PAIR", "E: outside, damp, pairs: " + s.use);
// riding the sled
await ev(`P.x = FOOT.x + 2; P.z = FOOT.z; P.y = surf(P.x, P.z) + 0.3; FOOT.on = false; true`); await sleep(500);
s = await S(); note("E: riding the sled, damp with pairs: footUse() = " + s.use);
// hint check
const hs = await J(`({hint: $("wnHint").textContent, tc: $("tcUse").hidden ? null : $("tcUse").textContent})`); note("E riding: " + JSON.stringify(hs));
await ev(`FOOT.on = true; FOOT.x = P.x - 3; FOOT.z = P.z; true`); await sleep(300);
// DIG
await ev(`FOOT.dig = {t: 1}; true`); await sleep(300);
s = await S(); ok(s.use !== "DRY PAIR", "E: while digging no DRY PAIR (" + s.use + ")");
await ev(`FOOT.dig = null; true`);

// F: threshold and floor
await ev(`TLXG.state().spares = 3; TLXG.state().wet = TLXG.PAIR_MIN + 0.01; true`); await sleep(300);
s = await S(); ok(s.use === "DRY PAIR", "F: just over PAIR_MIN offers " + s.use);
await ev(`TLXG.state().wet = TLXG.PAIR_MIN - 0.02; true`); await sleep(300);
s = await S(); ok(s.use !== "DRY PAIR", "F: just under PAIR_MIN: " + s.use);
await ev(`TLXG.state().wet = TLXG.PAIR_MIN + 0.01; true`); await sleep(200);
await tap("KeyE"); await tap("KeyE"); await tap("KeyE"); await sleep(400);
s = await S(); ok(s.st.wet >= 0 && s.st.spares >= 0 && isFinite(s.st.wet), `F: spam E: wet ${s.st.wet.toFixed(2)}, spares ${s.st.spares}`);
note("F: pairs used by 3 taps at wet just over min: " + (3 - s.st.spares));

// G: night + storm
await ev(`GS.hour = 26; GS.storm = 1; true`); await toDoor();
await down("KeyW"); const inN = await until("INT.on", 10); await up("KeyW");
ok(inN, "G: door works at night in a storm");
await sleep(400); await shot("xsb_night_inside");
await ev(`GS.storm = 0; true`);
done(fails);

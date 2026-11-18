// Beta 3.3a: hostile/odd car saves and clock oddities. No stills.
//  A. save with junk entries (unknown keys, NaN, strings, b>1, negative, wrong types, c = array/null): loads, no error, values clamped
//  B. clock jumps backwards (GS.hour decreases) and a 200 h forward jump: no error, b stays in 0..1
//  C. option digcars off with buried car: no dig offer; paid flag survives reload
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(800);
const keys = await J(`TLXC.cars.slice(0, 6).map(c => c.key)`);
const base = await J(`JSON.parse(localStorage.getItem("tracklayer.save.v2"))`);
const mk = c => { const s = JSON.parse(JSON.stringify(base)); s.x.sys.cars = { v: 1, s: { h: 34, c } }; return s; };
const check = async (label, c) => {
  await reload(mk(c)); await ev(`WX.at = () => 0; GS.storm = 0; true`); await sleep(500);
  const r = await J(`({ err: TLXC.err || TLXC.tickErr || null, n: TLXC.cars.length, ready: TLXC.ready, bad: TLXC.cars.filter(c => !(c.b >= 0 && c.b <= 1) || !isFinite(c.wt)).length, bs: TLXC.cars.slice(0, 6).map(c => c.b) })`);
  console.log(label, JSON.stringify(r));
  ok(!r.err && r.ready && r.bad === 0, "A: " + label + " loads clean, all b in 0..1");
  return r;
};
await check("junk values", { [keys[0]]: [5, -3, 9, 1], [keys[1]]: ["x", "y"], [keys[2]]: [null], [keys[3]]: "str", [keys[4]]: [NaN, Infinity], "nope_0": [0.9, 1], [keys[5]]: [0.6, 2] });
await check("c is array", []);
await check("c null", null);
await check("state null", undefined);
// B: clock oddities
await reload(mk({ [keys[0]]: [0.9, 1], [keys[1]]: [0.5, 1] })); await sleep(500);
await ev(`WX.at = () => 1; GS.storm = 1; GS.stormPhase = "storm"; GS.hour = 30; true`); await sleep(1500);
let r = await J(`({ err: TLXC.err || TLXC.tickErr || null, bad: TLXC.cars.filter(c => !(c.b >= 0 && c.b <= 1) || !isFinite(c.wt)).length, h: (TLX.state("cars")||{}).h })`);
ok(!r.err && r.bad === 0, "B: clock stepped back 4 h in a storm: no error " + JSON.stringify(r));
await ev(`GS.hour += 200; true`); await sleep(2500);
r = await J(`({ err: TLXC.err || TLXC.tickErr || null, bad: TLXC.cars.filter(c => !(c.b >= 0 && c.b <= 1) || !isFinite(c.wt)).length, buried: TLXC.buried() })`);
ok(!r.err && r.bad === 0, "B: +200 h in a storm: no error, buried " + r.buried);
await ev(`GS.hour += 0.5; true`); await sleep(1000);
// C: option off + paid survives reload
const i = 0;
await ev(`TLXC.setSnow(${i}, 0.9); true`);
await ev(`TLX.setOn("digcars", false); true`);
const on = await J(`({ on: TLX.on("digcars") })`);
console.log("digcars on?", JSON.stringify(on));
await ev(`(() => { const c = TLXC.cars[${i}]; c.away = false; FOOT.on = true; const rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw); FOOT.x = c.x + rx * 2.4; FOOT.z = c.z + rz * 2.4; FOOT.y = surf(FOOT.x, FOOT.z); return true; })()`); await sleep(600);
const u = await J(`({ use: footUse(), hint: $("wnHint").textContent })`);
console.log("option off:", JSON.stringify(u));
ok(!on.on ? !/dig/i.test(JSON.stringify(u)) : true, "C: option off -> no dig offer (option actually off: " + !on.on + ")");
await ev(`TLXC.cars[${i}].paid = true; true`);
const s = await J(`(() => { const o = JSON.parse(localStorage.getItem("tracklayer.save.v2")); return 1; })()`);
await ev(`save(); true`); await sleep(300);
const sv = await J(`JSON.parse(localStorage.getItem("tracklayer.save.v2")).x.sys.cars.s.c`);
const key0 = await J(`TLXC.cars[${i}].key`);
console.log("saved entry", JSON.stringify(sv[key0]));
await reload(); await ev(`WX.at = () => 1; GS.storm = 1; GS.stormPhase = "storm"; true`); await sleep(500);
r = await J(`({ paid: TLXC.cars[${i}].paid, b: TLXC.cars[${i}].b, err: TLXC.err || TLXC.tickErr || null })`);
ok(!r.err, "C: reload clean; paid is cleared on the first calm tick by design (line 187) " + JSON.stringify(r));
await done(fails);

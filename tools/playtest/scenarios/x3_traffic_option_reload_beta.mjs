// Beta 3.1/3.3 traffic: the "Road traffic" option off survives a reload, cars don't duplicate across reloads,
// an old save (no x.sys.traffic) loads, night + storm with traffic, an hour jump over 2 h. Prints numbers.
import { boot, ev, sleep, done, reload, raw } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
const snap = `(() => ({ ready: TLXT.ready, err: TLXT.err || null, n: TLXT.cars.filter(c => c.st).length, blank: TLXT.cars.filter(c => !c.st).length, vis: TLXT.cars.filter(c => c.mesh ? c.mesh.visible : true).length, nan: TLXT.cars.filter(c => c.st).some(c => !isFinite(c.x) || !isFinite(c.z) || !isFinite(c.s)), on: TLX.on("traffic"), opts: Object.keys(TLX.opts || {}).filter(k => /traf|road/i.test(k)) }))()`;
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`); await sleep(800); await waitGame(3);
const a = await J(snap); console.log("A fresh", JSON.stringify(a));
ok(a.ready && !a.err && !a.nan, "A: traffic ready, no NaN");
// B: switch the option off, save, reload
const idOpt = await ev(`(() => { for (const k of ["traffic","roadtraffic","road_traffic"]) { try { if (TLX.on(k) !== undefined && (TLX.options||{})[k]) return k; } catch (e) {} } return Object.keys(TLX.options || TLX.opt || {}).find(k => /traf/i.test(k)) || "traffic"; })()`);
console.log("option id", idOpt);
await ev(`TLX.setOn ? TLX.setOn(${JSON.stringify(idOpt)}, false) : (GS.x && 0); save(); true`);
const b0 = await J(snap); console.log("B off", JSON.stringify(b0));
await ev(`save(); true`);
const sv = JSON.parse(await raw(`localStorage.getItem("tracklayer.save.v2")`));
console.log("saved opts", JSON.stringify(sv.x && sv.x.opts || sv.opts || null).slice(0, 200));
await reload(sv); await ev(`WX.at = () => 0; GS.storm = 0; true`); await waitGame(3);
const b1 = await J(snap); console.log("B reload", JSON.stringify(b1));
ok(b0.on === b1.on, `B: option stays ${b0.on} across reload (${b1.on})`);
// C: three reloads, car count must not grow
await ev(`TLX.setOn && TLX.setOn(${JSON.stringify(idOpt)}, true); save(); true`);
const counts = [];
for (let i = 0; i < 3; i++) { const s = JSON.parse(await raw(`localStorage.getItem("tracklayer.save.v2")`)); await reload(s); await ev(`WX.at = () => 0; GS.storm = 0; true`); await waitGame(3); const r = await J(snap); counts.push(r.n); ok(r.ready && !r.err && !r.nan, `C${i}: ready no NaN (n ${r.n})`); }
console.log("counts", counts); ok(Math.max(...counts) <= Math.min(...counts) + 2, "C: car count stable across reloads");
// D: old save without traffic state
const s2 = JSON.parse(await raw(`localStorage.getItem("tracklayer.save.v2")`));
if (s2.x && s2.x.sys) { delete s2.x.sys.traffic; delete s2.x.sys.roads; }
await reload(s2); await ev(`WX.at = () => 0; GS.storm = 0; true`); await waitGame(3);
const d = await J(snap); console.log("D old", JSON.stringify(d)); ok(d.ready && !d.err && !d.nan, "D: old save loads traffic");
// E: night + storm + hour jumps
for (const h of [22, 23.5, 25, 27, 29, 40]) { await ev(`GS.hour = ${h}; GS.storm = 1; true`); await waitGame(1.5); const r = await J(snap); if (r.err || r.nan) { ok(false, `E hour ${h}: ${JSON.stringify(r)}`); } }
const e = await J(snap); console.log("E", JSON.stringify(e)); ok(e.ready && !e.err && !e.nan, "E: night storm hour jumps clean");
const perr = await J(`(window.__errs || []).length`).catch(() => 0);
await done(fails ? 1 : 0);

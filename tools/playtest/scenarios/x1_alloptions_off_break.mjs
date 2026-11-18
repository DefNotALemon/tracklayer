// Beta: every TLX option switched OFF at once, then play (ride, drive the pickup, storm, Monday, night), save, reload, flip all back ON.
import { boot, reload, ev, raw, tap, hold, sleep, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 90000; true`); await sleep(800);
const ids = await J(`TLX.options.map(o => o.id)`).catch(async () => J(`TLX.dump().opt`));
const all = await J(`(() => { const L = []; for (const o of (TLX.options || TLX.opts || [])) L.push(o.id); return L; })()`);
console.log("options api", JSON.stringify(all).slice(0, 600));
if (all.length < 5) { const k = await J(`Object.keys(TLX)`); console.log("TLX keys", k.join(",")); }
await ev(`(() => { for (const id of ${JSON.stringify(all)}) TLX.setOn(id, false); optBuild(); return true; })()`);
const off = await J(`${JSON.stringify(all)}.filter(id => TLX.on(id))`);
ok(all.length > 0 && off.length === 0, `all ${all.length} options off (still on: ${off})`);
// ride, storm, weeks pass
await ev(`GS.hour = 34; true`);
await hold(["KeyW"], 4000);
await ev(`(() => { WX.at = () => 0.9; GS.storm = 1; return true; })()`);
for (let d = 0; d < 9; d++) { await ev(`GS.hour += 20; true`); await sleep(500); }
await ev(`GS.hour = 40; true`); await sleep(1500);
// pickup
const veh = await J(`(() => { try { const r = TLXV.rows || []; return typeof TLXV !== "undefined" ? Object.keys(TLXV).slice(0,20) : []; } catch (e) { return String(e); } })()`);
console.log("TLXV keys", JSON.stringify(veh));
await ev(`save(); true`);
const dump = await J(`TLX.dump().opt`);
console.log("opt saved", JSON.stringify(dump).slice(0, 400));
const saved = JSON.parse(await raw(`localStorage.getItem("tracklayer.save.v2")`));
await reload(saved);
await sleep(1500);
const off2 = await J(`${JSON.stringify(all)}.filter(id => TLX.on(id))`);
ok(off2.length === 0, `options still off after reload (on: ${off2})`);
await hold(["KeyW"], 3000);
await ev(`GS.hour += 30; true`); await sleep(1500);
await ev(`(() => { for (const id of ${JSON.stringify(all)}) TLX.setOn(id, true); optBuild(); return true; })()`);
await hold(["KeyW"], 3000); await sleep(1500);
const on = await J(`${JSON.stringify(all)}.filter(id => !TLX.on(id))`);
ok(on.length === 0, "all back on");
const sys = await J(`TLX.dump().sys && Object.keys(TLX.dump().sys).length`);
ok(sys > 5, "systems still saved: " + sys);
await done(fails ? 1 : 0);

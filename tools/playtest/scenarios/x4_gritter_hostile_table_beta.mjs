// Beta 4.1c2 gritter: hostile saved grit table / hopper values through reload (shapes, huge arrays, infinite/over-capacity hopper).
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; GS.cash = 200000; GS.lic = GS.lic || {}; GS.lic.freight = true; TLXV.buy("plowtruck"); true`);
await sleep(800);
const U = JSON.stringify(await ev(`TLXV.state().owned.find(o => o.id === "plowtruck").uid`));
await ev(`TLXV.swapTo(${U}); FOOT.on = false; TLXPL.fill(${U}); true`); await sleep(800);
const rid = await J(`(TLXR.routes.find(r => !r.closed && r.st && r.len > 300) || {}).id || null`);
ok(!!rid, "route found " + rid);
await ev(`save(); true`);
const base = JSON.parse(await ev(`localStorage.getItem("tracklayer.save.v2")`));
const hr = base.GS ? base.GS.hour : null;
const mk = (mut) => { const b = JSON.parse(JSON.stringify(base)); const s = b.x.sys.plow.s; mut(s, Object.keys(s.blades)[0], b); return b; };
const H = 12;
const cases = {
  "proto key": s => { s.grit = JSON.parse('{"__proto__":{"h":[12],"s0":0},"constructor":{"h":[12],"s0":0}}'); },
  "string hours": s => { s.grit = { "a:1": { h: ["12", "13", null, {}, true], s0: 0 } }; },
  "negative hours": s => { s.grit = { "a:1": { h: [-5, -1e9, 12], s0: 0 } }; },
  "huge array": s => { s.grit = { "a:1": { h: new Array(200000).fill(12), s0: 0 } }; },
  "NaN s0": s => { s.grit = { "a:1": { h: [12], s0: null }, "a:2": { h: [12], s0: "x" } }; },
  "grit array": s => { s.grit = [1, 2, 3]; },
  "hop Infinity": (s, u) => { s.blades[u].hop = 1e999; },
  "hop 1e9": (s, u) => { s.blades[u].hop = 1e9; },
  "hop negative": (s, u) => { s.blades[u].hop = -500; },
  "gritKg string": s => { s.gritKg = "9"; }
};
for (const [name, mut] of Object.entries(cases)) {
  const bad = mk(mut);
  try { await reload(bad); } catch (e) { ok(false, name + " reload threw " + e.message); continue; }
  await sleep(1200); await ev(`tutSkip(); WX.at = () => 0; GS.storm = 0; true`); await sleep(500);
  const r = await J(`(() => { const u = TLXV.state().owned.find(o => o.id === "plowtruck"); if (!u) return { noTruck: true }; const p = TLX.state("plow"); const hop = TLXPL.hopOf(u.uid); let at = null; try { at = TLXPL.gritAt(P.x, P.z); } catch (e) { at = "ERR " + e.message; } let hint = null; try { hint = typeof TLXPL.hint(); } catch (e) { hint = "ERR " + e.message; } return { hop, cap: 3000, gk: p.gritKg, gtype: Array.isArray(p.grit) ? "array" : typeof p.grit, keys: Object.keys(p.grit).length, at, hint, proto: ({}).h === undefined }; })()`);
  console.log("  " + name, JSON.stringify(r));
  const errs = await J(`window.__errs || []`).catch(() => []);
  ok(!r.noTruck && Number.isFinite(r.hop) && r.hop >= 0 && r.hop <= 3000, name + ": hopper is a sane number (" + r.hop + ")");
  ok(Number.isFinite(r.gk) && r.gk >= 0, name + ": gritKg finite (" + r.gk + ")");
  ok(r.gtype === "object" && typeof r.at === "number" && !String(r.hint).startsWith("ERR") && r.proto, name + ": grit table usable, no throw, Object.prototype clean");
}
console.log(fails ? "FAILS " + fails : "ALL PASSED");
await done(fails ? 1 : 0);

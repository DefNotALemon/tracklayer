// Beta 4.1c2 gritter: corrupt grit entries planted under a REAL routeId:stretch key, then read/hint/toggle/spread on that stretch.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; GS.cash = 200000; GS.lic = GS.lic || {}; GS.lic.freight = true; TLXV.buy("plowtruck"); true`);
await sleep(800);
const U = JSON.stringify(await ev(`TLXV.state().owned.find(o => o.id === "plowtruck").uid`));
await ev(`TLXV.swapTo(${U}); FOOT.on = false; TLXPL.fill(${U}); true`); await sleep(800);
// a spot on a real open road, found by walking the route
const spot = await J(`(() => { const rs = TLXR.routes.filter(r => !r.closed && r.st && r.pts && r.pts.length > 12); for (const r of rs) for (let i = 4; i < r.pts.length - 4; i++) { const a = r.pts[i], c = r.pts[i + 3]; const q = TLXPL.gritSpot(a[0], a[1]); if (q && q.n >= 5) return { x: a[0], z: a[1], key: q.key, n: q.n, b: q.b, sn: q.sn, yaw: Math.atan2(c[0] - a[0], c[1] - a[1]) }; } return null; })()`);
console.log("spot", JSON.stringify(spot));
if (!spot) { ok(false, "no road spot (TLXR.at missing?)"); console.log(await ev(`Object.keys(TLXR).join(",")`)); await done(1); }
ok(true, "real stretch " + spot.key + " n=" + spot.n);
await ev(`save(); true`);
const base = JSON.parse(await ev(`localStorage.getItem("tracklayer.save.v2")`));
const mk = (g) => { const b = JSON.parse(JSON.stringify(base)); b.x.sys.plow.s.grit = { [spot.key]: g }; return b; };
const N = spot.n, B = spot.b;
const arr = (v) => new Array(N).fill(v);
const cases = {
  "wrong length (short)": { h: [12], s0: 0 },
  "wrong length (long)": { h: new Array(N + 40).fill(12), s0: 0 },
  "string hours": { h: arr("12"), s0: 0 },
  "mixed junk": { h: arr(null).map((_, i) => i % 3 ? "x" : { a: 1 }).concat([12]).slice(-N), s0: 0 },
  "future hours": { h: arr(99999), s0: 0 },
  "huge array": { h: new Array(200000).fill(12), s0: 0 },
  "Infinity hour": { h: arr(1e999), s0: 0 },
  "s0 huge": { h: arr(12), s0: 1e9 },
  "s0 negative": { h: arr(12), s0: -50 },
  "valid fresh": { h: arr(12), s0: 0 }
};
for (const [name, g] of Object.entries(cases)) {
  try { await reload(mk(g)); } catch (e) { ok(false, name + " reload threw"); continue; }
  await sleep(1200); await ev(`tutSkip(); WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`); await sleep(400);
  const r = await J(`(() => { const u = TLXV.state().owned.find(o => o.id === "plowtruck"); if (!u) return { noTruck: true };
    TLXV.swapTo(u.uid); FOOT.on = false; P.x = ${spot.x}; P.z = ${spot.z}; P.y = surf(P.x, P.z); P.yaw = ${spot.yaw}; P.vx = P.vz = 0; GS.storm = 0; const o = {};
    try { o.keys = Object.keys(TLX.state("plow").grit).length; o.at = TLXPL.gritAt(P.x, P.z); o.grip = TLXPL.grip(P.x, P.z); o.cover = (TLXPL.gritSpot(P.x, P.z) || {}).k; o.hint = TLXPL.hint(); o.tog = TLXPL.gritToggle(u.uid); } catch (e) { o.err = e.message; } return o; })()`);
  // spread a second while rolling
  await ev(`(() => { P.vx = Math.sin(P.yaw) * 6; P.vz = Math.cos(P.yaw) * 6; true })()`); await sleep(900);
  const r2 = await J(`(() => { const o = {}; try { const g = TLX.state("plow").grit; o.len = Object.values(g).map(x => x.h.length); o.fin = Object.values(g).every(x => x.h.every(h => typeof h === "number" && Number.isFinite(h))); o.kg = TLX.state("plow").gritKg; } catch (e) { o.err = e.message; } return o; })()`);
  console.log("  " + name, JSON.stringify(r), JSON.stringify(r2));
  ok(!r.noTruck && !r.err && !r2.err, name + ": no throw");
  ok(typeof r.at === "number" && Number.isFinite(r.at) && r.at >= 0 && r.at <= 1, name + ": gritAt in 0..1 (" + r.at + ")");
  ok(Number.isFinite(r.grip) && r.grip >= 1 && r.grip < 3, name + ": grip sane (" + r.grip + ")");
  ok(Number.isFinite(r2.kg), name + ": gritKg finite");
  ok(r2.fin !== false, name + ": table stays numeric after spreading");
}
const pe = await J(`window.__errs || []`).catch(() => []);
console.log("pageerrs", JSON.stringify(pe).slice(0, 300));
console.log(fails ? "FAILS " + fails : "ALL PASSED");
await done(fails ? 1 : 0);

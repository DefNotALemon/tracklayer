// Beta 0147: try to break the 0141 #1 drizzle fix (tlx-roads v6). Numbers only, exit 1 on a failed assert.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
async function hours(h, step = 0.25) { for (let t = 0; t < h; t += step) { await ev(`GS.hour += ${step}; true`); await waitGame(0.35); } }
const sum = `TLXR.routes.filter(r => !r.closed).map(r => ({ id: r.id, st: TLXR.status(r.id), mx: +Math.max(...r.st.s).toFixed(3), p: Math.round(r.st.p) }))`;
const line = R => R.map(r => `${r.id} ${r.st} ${r.mx} p${r.p}`).join(" | ");
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(800);

// A: borderline weather 0.58 (inside plowWx 0.6, above fillA): 36 h. Does snow creep, does the plow cycle, toasts?
await ev(`window.__T = []; TLXR.setSnow(null, 0); WX.at = () => 0.58; true`);
let starts = 0, prevP = -1, shutSeen = 0;
for (let t = 0; t < 36; t += 0.5) { await hours(0.5, 0.5); const r = await J(sum); const p = r.some(x => x.p >= 0); if (p && !prevP) starts++; prevP = p; if (r.some(x => x.st !== "open")) shutSeen++; }
const A = await J(sum); console.log("A 0.58 x 36 h:", line(A), "plow starts", starts, "shut ticks", shutSeen);
ok(shutSeen === 0, "A: borderline weather never shuts a road");
ok(starts <= 6, "A: plow doesn't thrash (" + starts + " sorties in 36 h)");

// B: just over the plow limit (0.62) for 10 h: fills slowly, plow waits; roads should not be shut by it
await ev(`TLXR.setSnow(null, 0); WX.at = () => 0.62; true`);
await hours(10, 0.5);
const B = await J(sum); console.log("B 0.62 x 10 h:", line(B));
ok(B.every(r => r.st === "open"), "B: 10 h at 0.62 leaves roads open (" + B.filter(r => r.st !== "open").map(r => r.id).join(",") + " shut)");

// C: plow mid-route, storm returns (1.0): plow keeps going? snow refills behind?
await ev(`TLXR.setSnow(null, 0.6); WX.at = () => 0.3; true`);
let mid = false; for (let t = 0; t < 6 && !mid; t += 0.25) { await hours(0.25, 0.25); mid = (await J(sum)).some(x => x.p > 0); }
await ev(`WX.at = () => 1; GS.storm = 1; true`); await hours(2, 0.25);
const C = await J(sum); console.log("C plow mid-route then storm 2 h (mid " + mid + "):", line(C));
ok(mid, "C: plow was mid-route when the storm hit");
ok(C.every(r => isFinite(r.mx) && isFinite(r.p)), "C: no NaN");

// D: real save/reload mid-drizzle with a planted plow state, old-shape (no w)
await ev(`WX.at = () => 0; GS.storm = 0; true`); await hours(4, 0.5);
const sv = JSON.parse(await ev(`JSON.stringify(JSON.parse(JSON.stringify(GS)) && { ...window.__sv })`).catch(() => "{}")) || {};
const raw = await ev(`(save(), localStorage.getItem("tracklayer.save.v2"))`);
let cur = null; try { cur = JSON.parse(raw); } catch (e) {}
if (cur && cur.x && cur.x.sys && cur.x.sys.roads) {
  const rs = cur.x.sys.roads.s || cur.x.sys.roads; 
  for (const k in (rs.r || {})) { delete rs.r[k].w; rs.r[k].s = rs.r[k].s.map(() => 0.3); rs.r[k].p = -1; }
  await reload(cur);
  await ev(`WX.at = () => 0.55; GS.storm = 0; true`);
  await hours(3, 0.25);
  const D = await J(sum); console.log("D old-shape save (snow .3, no w) + light snow 3 h:", line(D));
  ok(D.every(r => isFinite(r.mx) && isFinite(r.p)), "D: loads, no NaN");
  ok(D.every(r => r.st === "open"), "D: light snow, plow opens planted 0.3 drifts");
} else console.log("D skipped, no roads in save", raw && raw.slice(0, 80));

// E: sleep skip: 8 h jump in drizzle
await ev(`TLXR.setSnow(null, 0.5); WX.at = () => 0.5; true`); await ev(`GS.hour += 8; true`); await waitGame(3);
const E = await J(sum); console.log("E +8 h jump, drizzle:", line(E));
ok(E.every(r => r.st === "open"), "E: an 8 h jump leaves roads open");
const errs = await J(`TLXR.err || TLXR.tickErr || null`); ok(!errs, "no road error " + errs);
console.log(fails ? `${fails} FAILED` : "all asserts passed");
await done(fails ? 1 : 0);

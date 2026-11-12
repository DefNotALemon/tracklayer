// 3.2b2 scraped road, beta break attempt: every sled's drag (weakest sled still moves?), on foot / bogged / reverse
// leaving a stale P.scr or "Scraped road" line, a light dusting of snow, a plow timestamp from the future, night.
import { boot, ev, sleep, done, shot, sideCam, camOff, down, up } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
const JAN = 24 * 65 + 11;
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = ${JAN}; true`); await sleep(1500);
const L = await J(`(() => { for (const r of TLXR.routes) { if (!r.st) continue; const p = r.pts;
  for (let i = 0; i < p.length - 1; i++) { let j = i + 1, len = 0; while (j < p.length && (len = Math.hypot(p[j][0] - p[i][0], p[j][1] - p[i][1])) < 170) j++; if (j >= p.length) break;
    const ux = (p[j][0] - p[i][0]) / len, uz = (p[j][1] - p[i][1]) / len; let dev = 0; for (let k = i + 1; k < j; k++) dev = Math.max(dev, Math.abs((p[k][0] - p[i][0]) * uz - (p[k][1] - p[i][1]) * ux));
    const g = Math.abs(groundAt(p[j][0], p[j][1]) - groundAt(p[i][0], p[i][1])) / len; if (dev > 0.35 || g > 0.03) continue;
    if (YARDS.some(o => !o.k && (Math.hypot(o.x - p[i][0], o.z - p[i][1]) < 60 || Math.hypot(o.x - p[j][0], o.z - p[j][1]) < 60))) continue;
    if (isWater(p[i][0], p[i][1]) || obNear(p[i][0], p[i][1], 8)) continue;
    return { id: r.id, x: p[i][0], z: p[i][1], ux, uz, len }; } } return null; })()`);
ok(!!L, "leg found"); if (!L) await done(1);
const px = L.uz, pz = -L.ux, yaw = Math.atan2(L.ux, L.uz);
const at = (d, s = 6) => [L.x + L.ux * s + px * d, L.z + L.uz * s + pz * d];
const plow = async ago => ev(`TLXR.setPlowed("${L.id}", ${ago}); true`);
const place = async d => { const [x, z] = at(d); await ev(`crashCancel(); FOOT.on = false; P.x = ${x}; P.z = ${z}; P.y = surf(${x}, ${z}) + 0.2; P.vx = P.vz = P.vy = 0; P.yaw = ${yaw}; P.yr = 0; GS.fuel = GS.cap; recenter(${x}, ${z}, true); true`); await sleep(900); };
await plow(1);
// A: every sled, wheel track vs shoulder, 5 game s from rest
const sleds = await J(`SLEDS.map(s => s.id)`); console.log("sleds", sleds.join(","));
async function run(d, secs = 5) {
  await place(d); const t0 = await ev("gameClock"); let v = 0, scr = 0, n = 0;
  await down("KeyW");
  try { for (;;) { await sleep(250); const s = await J(`({ t: gameClock, v: Math.hypot(P.vx, P.vz), scr: P.scr || 0 })`); v = s.v; scr += s.scr; n++; if (s.t - t0 >= secs) break; } } finally { await up("KeyW"); }
  return { mph: +(v * 2.237).toFixed(1), scr: +(scr / n).toFixed(2) };
}
const rows = [];
for (const id of sleds) {
  await ev(`GS.own.sled = "${id}"; restat(); true`);
  const w = await run(0.8), s = await run(1.6);
  rows.push({ id, w, s, ratio: s.mph > 0.5 ? +(w.mph / s.mph).toFixed(2) : null });
  console.log(id, "track", w.mph, "mph scr", w.scr, "| between", s.mph, "mph scr", s.scr, "| ratio", rows[rows.length - 1].ratio);
}
for (const r of rows) ok(r.w.mph >= 5, `${r.id}: still moves on a scraped track (${r.w.mph} mph)`);
for (const r of rows) ok(r.ratio === null || (r.ratio > 0.5 && r.ratio < 1.0), `${r.id}: drag ratio sane (${r.ratio})`);
await ev(`GS.own.sled = "${sleds[0]}"; restat(); true`);
// B: reverse in the wheel track
await ev(`GB.gear = 0; true`); const rev = await run(0.8, 3); await ev(`GB.gear = 1; true`);
console.log("reverse", JSON.stringify(rev)); ok(rev.mph >= 0, "reverse run completed");
// C: on foot with a stale P.scr
await place(0.8); await ev(`P.scr = 0.9; true`);
await ev(`FOOT.on = true; true`); await sleep(1500);
const C = await J(`({ scr: P.scr, b: document.getElementById("bonus").textContent, foot: FOOT.on })`);
console.log("on foot", JSON.stringify(C)); ok(C.b !== "Scraped road", "no stale 'Scraped road' on foot (" + JSON.stringify(C.b) + ", P.scr " + C.scr + ")");
await ev(`FOOT.on = false; true`);
// D: a light dusting
await plow(1);
const [ax, az] = at(0.8);
const dust = [];
for (const sn of [0, 0.02, 0.05, 0.08, 0.12]) { await ev(`TLXR.setSnow("${L.id}", ${sn}); true`); dust.push(sn + ":" + (await ev(`TLXR.scraped(${ax}, ${az}, ${px}, ${pz})`)).toFixed(2)); }
console.log("dust (snow: scraped)", dust.join("  "));
await plow(1);
// E: plow stamped in the future (sleep skip / hour set back)
await ev(`TLXR.setPlowed("${L.id}", -5); true`);
const fut = await ev(`TLXR.scrapeF(${ax}, ${az})`); console.log("future stamp", fut); ok(fut === 0, "a plow time in the future scrapes nothing (" + fut + ")");
// F: hour set back 40 h with a fresh stamp, then the hour moves forward again
await plow(1); await ev(`GS.hour = ${JAN - 40}; true`); await sleep(500);
const back = await ev(`TLXR.scrapeF(${ax}, ${az})`); console.log("after rewinding the clock 40 h", back);
// G: a village street / road end: scrapeF at the first route point and 300 m past the end
const ends = await J(`(() => { const r = TLXR.routes.find(r => r.id === "${L.id}"); const a = r.pts[0], b = r.pts[r.pts.length - 1]; return { start: TLXR.scrapeF(a[0], a[1]), end: TLXR.scrapeF(b[0], b[1]), off: TLXR.scrapeF(b[0] + 300, b[1] + 300) }; })()`);
console.log("route ends", JSON.stringify(ends)); ok(ends.off === 0, "300 m off the road: nothing scraped");
// H: night still
await ev(`GS.hour = ${JAN + 11}; true`); await sleep(600); await plow(1);
await place(0.8); await down("KeyW"); await sleep(2500);
await sideCam(undefined, 3.6, 0.7, 1.9); await sleep(350);
const H = await J(`({ scr: +(P.scr || 0).toFixed(2), b: document.getElementById("bonus").textContent, mph: Math.round(Math.hypot(P.vx, P.vz) * 2.237) })`);
await shot("x3sb_night"); await camOff(); await up("KeyW"); console.log("night", JSON.stringify(H));
ok(!(await ev(`TLXR.tickErr || TLXR.err || null`)), "no road error");
console.log(fails ? `${fails} FAILED` : "all asserts passed");
await done(fails ? 1 : 0);

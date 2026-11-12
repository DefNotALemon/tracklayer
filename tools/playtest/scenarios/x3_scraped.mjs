// 3.2b2 scraped road surface (tlx-roads.js TLXR.scraped / scrapeF, tracklayer.js P.scr): a sled on a freshly plowed road
// in a cold snap rides scraped bare in the wheel tracks (more drag, "Scraped road" on the HUD, sparks off the skis) while
// the crown-free shoulders stay hard pack.
//  A. the stretch factor: fresh plow + clear January = scraped; old plow / new snow / a mild November day = not
//  B. across the road: wheel track high, shoulder ~0
//  C. driving a straight flat stretch from rest for the same game time: wheel track vs shoulder (speed, P.scr, HUD, sparks)
//  D. saved: the plow time survives a reload; an old save without it loads with nothing scraped
//  E. on a truck nothing reads P.scr (no stale line)
import { boot, ev, sleep, done, shot, sideCam, camOff, reload, down, up } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const NOSTILLS = !!process.env.NOSTILLS;
await boot();
const JAN = 24 * 65 + 11;   // 5 Jan, 11:00 (calendar from 1 Nov)
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = ${JAN}; true`); await sleep(1500);
ok(await ev(`TLXR.ready && !TLXR.err`), "roads ready");
const temp = await ev(`TLXR.scrTemp()`); console.log("January clear temp", temp);
ok(temp <= -9, "a clear January day reads " + temp + " degrees");
// a straight, flat road leg >= 170 m, away from villages: start point, direction
const L = await J(`(() => { for (const r of TLXR.routes) { if (!r.st) continue; const p = r.pts;
  for (let i = 0; i < p.length - 1; i++) { let j = i + 1, len = 0; while (j < p.length && (len = Math.hypot(p[j][0] - p[i][0], p[j][1] - p[i][1])) < 170) j++; if (j >= p.length) break;
    const ux = (p[j][0] - p[i][0]) / len, uz = (p[j][1] - p[i][1]) / len; let dev = 0; for (let k = i + 1; k < j; k++) dev = Math.max(dev, Math.abs((p[k][0] - p[i][0]) * uz - (p[k][1] - p[i][1]) * ux));
    const g = Math.abs(groundAt(p[j][0], p[j][1]) - groundAt(p[i][0], p[i][1])) / len; if (dev > 0.35 || g > 0.03) continue;
    if (YARDS.some(o => !o.k && (Math.hypot(o.x - p[i][0], o.z - p[i][1]) < 60 || Math.hypot(o.x - p[j][0], o.z - p[j][1]) < 60))) continue;
    if (isWater(p[i][0], p[i][1]) || obNear(p[i][0], p[i][1], 8)) continue;
    return { id: r.id, x: p[i][0], z: p[i][1], ux, uz, len, dev: +dev.toFixed(2), g: +g.toFixed(3) }; } } return null; })()`);
console.log("leg", JSON.stringify(L));
ok(!!L, "found a straight flat road leg");
if (!L) { await done(1); }
const px = L.uz, pz = -L.ux;   // the sled's left when heading along (ux, uz): local +x = (cos yaw, -sin yaw) = (fz, -fx)
const at = (d, s = 20) => [L.x + L.ux * s + px * d, L.z + L.uz * s + pz * d];
// A: the stretch factor
await ev(`TLXR.setPlowed("${L.id}", 1); true`);
const [ax, az] = at(0);
const fA = await ev(`TLXR.scrapeF(${ax}, ${az})`);
await ev(`TLXR.setPlowed("${L.id}", 30); true`); const fOld = await ev(`TLXR.scrapeF(${ax}, ${az})`);
await ev(`TLXR.setPlowed("${L.id}", 12); true`); const fMid = await ev(`TLXR.scrapeF(${ax}, ${az})`);
await ev(`TLXR.setPlowed("${L.id}", 1); TLXR.setSnow("${L.id}", 0.3); true`); const fSnow = await ev(`TLXR.scrapeF(${ax}, ${az})`);
await ev(`TLXR.setPlowed("${L.id}", 1); true`);
const fFell = await J(`(() => { const r = TLXR.routes.find(r => r.closed); const p = r.pts[Math.floor(r.pts.length / 2)]; return TLXR.scrapeF(p[0], p[1]); })()`);
console.log("stretch factor: fresh", fA.toFixed(2), "12 h", fMid.toFixed(2), "30 h", fOld.toFixed(2), "snow .3", fSnow.toFixed(2), "fell road", fFell);
ok(fA > 0.95, "fresh plow on a clear January day: scraped (" + fA.toFixed(2) + ")");
ok(fMid > 0.2 && fMid < fA, "12 h after the plow it is fading (" + fMid.toFixed(2) + ")");
ok(fOld === 0, "30 h after the plow: hard pack again");
ok(fSnow === 0, "new snow (0.3) over it: not scraped");
ok(fFell === 0, "the shut fell road is never scraped");
// November, clear: barely
await ev(`GS.hour = 24 * 4 + 11; true`); await sleep(1500);
await ev(`TLXR.setPlowed("${L.id}", 1); true`);
const nov = await J(`({ t: TLXR.scrTemp(), f: TLXR.scrapeF(${ax}, ${az}) })`);
console.log("November clear:", JSON.stringify(nov));
ok(nov.f < 0.25, "a clear November day (" + nov.t + " degrees) barely scrapes (" + nov.f.toFixed(2) + ")");
await ev(`GS.hour = ${JAN}; true`); await sleep(1500); await ev(`TLXR.setPlowed("${L.id}", 1); true`);
// B: across the road
const across = [];
for (const d of [0, 0.8, 1.6, 2.4, 3.0, 3.6]) { const [x, z] = at(d); across.push({ d, s: +(await ev(`TLXR.scraped(${x}, ${z}, ${px}, ${pz})`)).toFixed(2) }); }
console.log("across (offset: scraped):", across.map(a => a.d + ":" + a.s).join("  "));
ok(across[1].s >= 0.45, "centred on a wheel track: scraped " + across[1].s);
ok(across[2].s < 0.08 && across[5].s === 0, "between the ruts and on the shoulder: hard pack (" + across[2].s + ", " + across[5].s + ")");
// C: drive the same leg from rest, wheel track vs shoulder
await ev(`window.__sk = 0; { const o = spark; spark = function (a, b, c, d, e, f) { window.__sk++; return o(a, b, c, d, e, f); }; } true`);
async function run(d, label) {
  const [x, z] = at(d, 6), yaw = Math.atan2(L.ux, L.uz);
  await ev(`crashCancel(); FOOT.on = false; P.x = ${x}; P.z = ${z}; P.y = surf(${x}, ${z}) + 0.2; P.vx = P.vz = P.vy = 0; P.yaw = ${yaw}; P.yr = 0; GS.fuel = GS.cap; recenter(${x}, ${z}, true); window.__sk = 0; true`);
  await sleep(1200);
  const t0 = await ev("gameClock"); let maxV = 0, scr = 0, n = 0, bonus = {}, lat = 0, v5 = null, nScr = 0;
  await down("KeyW");
  try { for (;;) { await sleep(250); const s = await J(`({ t: gameClock, v: Math.hypot(P.vx, P.vz), scr: P.scr || 0, b: document.getElementById("bonus").textContent, a: (P.x - ${L.x}) * ${L.ux} + (P.z - ${L.z}) * ${L.uz}, l: (P.x - ${L.x}) * ${px} + (P.z - ${L.z}) * ${pz} })`);
    maxV = Math.max(maxV, s.v); scr += s.scr; n++; if (s.b === "Scraped road") nScr++; if (v5 === null && s.t - t0 >= 5) v5 = s.v; bonus[s.b] = (bonus[s.b] || 0) + 1; lat = s.l;
    if (s.t - t0 >= 7 || s.a > L.len - 15) break; } } finally { await up("KeyW"); }
  const r = { label, d, mph: +((v5 ?? maxV) * 2.237).toFixed(1), scrHud: +(nScr / n).toFixed(2), scr: +(scr / n).toFixed(2), sparks: await ev("window.__sk"), lat: +lat.toFixed(2), secs: +((await ev("gameClock")) - t0).toFixed(1), bonus: Object.keys(bonus).filter(k => k).join("/") };
  console.log(label, JSON.stringify(r)); return r;
}
const wt = await run(0.8, "wheel track");
async function still(name, hour) {
  if (hour !== undefined) { await ev(`GS.hour = ${hour}; true`); await sleep(600); await ev(`TLXR.setPlowed("${L.id}", 1); true`); }
  const [x, z] = at(0.8, 6), yaw = Math.atan2(L.ux, L.uz);
  await ev(`crashCancel(); FOOT.on = false; P.x = ${x}; P.z = ${z}; P.y = surf(${x}, ${z}) + 0.2; P.vx = P.vz = P.vy = 0; P.yaw = ${yaw}; P.yr = 0; recenter(${x}, ${z}, true); true`);
  await sleep(1000); await down("KeyW"); await sleep(1800);
  await sideCam(undefined, 3.6, 0.7, 1.9); await sleep(350);   // side, a little behind, low: the skis and the sparks trailing them
  const s = await J(`({ scr: +(P.scr || 0).toFixed(2), mph: Math.round(Math.hypot(P.vx, P.vz) * 2.237), sk: window.__sk, b: document.getElementById("bonus").textContent })`);
  await shot(name); await camOff(); await up("KeyW"); console.log("still", name, JSON.stringify(s));
}
if (!NOSTILLS) { await still("x3s_scraped_day"); await still("x3s_scraped_night", JAN + 11); await ev(`GS.hour = ${JAN}; true`); await sleep(600); await ev(`TLXR.setPlowed("${L.id}", 1); true`); }
const sh = await run(1.6, "between the ruts");
ok(wt.scr >= 0.35, "wheel track run: mean P.scr " + wt.scr);
ok(sh.scr < 0.15, "between-the-ruts run: mean P.scr " + sh.scr + " (the sled weaves a little)");
ok(wt.scrHud > 0.8 && sh.scrHud < 0.25, "HUD says Scraped road in the wheel track (" + wt.scrHud + " of samples), hardly between the ruts (" + sh.scrHud + ")");
ok(wt.sparks >= 15 && sh.sparks < wt.sparks / 4, "sparks off the skis: wheel track " + wt.sparks + ", shoulder " + sh.sparks);
ok(wt.mph < sh.mph * 0.92 && wt.mph > sh.mph * 0.55, "more drag in the wheel track: " + wt.mph + " vs " + sh.mph + " mph 5 s from rest");
// same lane, road plowed 30 h ago: back to hard pack speed
await ev(`TLXR.setPlowed("${L.id}", 30); true`);
const old = await run(0.8, "wheel track, old plow");
ok(old.scr === 0 && old.mph >= sh.mph - 2 && old.mph > wt.mph * 1.12, "an old plow is plain hard pack: " + old.mph + " mph, scr " + old.scr);
// D: saved
await ev(`TLXR.setPlowed("${L.id}", 2); save(); true`);
const t1 = await J(`TLX.state("roads").r["${L.id}"].t.slice(0, 3)`);
await reload();
await ev(`crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; true`); await sleep(1200);
const D1 = await J(`({ t: TLX.state("roads").r["${L.id}"].t.slice(0, 3), f: TLXR.scrapeF(${ax}, ${az}), h: GS.hour })`);
console.log("before reload t", JSON.stringify(t1), "after", JSON.stringify(D1));
ok(D1.t.every((v, i) => Math.abs(v - t1[i]) < 0.02) && D1.f > 0.9, "after a reload the fresh plow is still scraped (" + D1.f.toFixed(2) + ")");
const oldSave = await J(`(() => { const s = JSON.parse(localStorage.getItem("tracklayer.save.v2")); const r = s.x && s.x.sys && s.x.sys.roads && s.x.sys.roads.s; if (r && r.r) for (const k in r.r) delete r.r[k].t; if (s.x && s.x.sys && s.x.sys.roads) s.x.sys.roads.v = 2; return s; })()`);
await reload(oldSave);
await ev(`crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; true`); await sleep(1200);
const D2 = await J(`({ f: TLXR.scrapeF(${ax}, ${az}), t0: TLX.state("roads").r["${L.id}"].t[0], err: TLXR.err || TLXR.tickErr || null })`);
console.log("old save:", JSON.stringify(D2));
ok(D2.f === 0 && D2.t0 < -1e5 && !D2.err, "an old save (no plow times) loads with nothing scraped");
// E: in the truck P.scr is reset
const E = await J(`(() => { P.scr = 0.9; if (VEH && VEH.cur === null && typeof physStep === "function") { const c = VEH.cur; VEH.cur = { core() { }, nearMount() { return false; } }; try { physStep(0.016); } finally { VEH.cur = c; } } return P.scr; })()`);
ok(E === 0, "a cab step clears P.scr (" + E + ")");
ok(!(await ev(`TLXR.tickErr || TLXR.err || null`)), "no road error");
console.log(fails ? `${fails} FAILED` : "all asserts passed");
await done(fails ? 1 : 0);

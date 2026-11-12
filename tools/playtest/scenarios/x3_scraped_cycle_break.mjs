// 3.2b2 scraped road, second beta pass: the natural cycle (sleep-skip after snow, live plow), month sweep, heading sweep,
// storm warmth, towed rig on a scraped track, a DAY still of the sparks (0152 only had night).
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
const px = L.uz, pz = -L.ux, yaw0 = Math.atan2(L.ux, L.uz);
const at = (d, s = 20) => [L.x + L.ux * s + px * d, L.z + L.uz * s + pz * d];
const [ax, az] = at(0.8);
const plow = ago => ev(`TLXR.setPlowed("${L.id}", ${ago}); true`);
const F = () => ev(`TLXR.scrapeF(${ax}, ${az})`);

// A: month sweep, clear noon, fresh plow
const months = [["Nov", 14], ["Dec", 44], ["Jan", 75], ["Feb", 106], ["Mar", 134], ["Apr", 165], ["May", 195]];
const rowA = [];
for (const [m, day] of months) {
  await ev(`GS.hour = ${day * 24 + 12}; true`); await sleep(500); await plow(1);
  rowA.push({ m, t: +(await ev(`TLXR.scrTemp()`)).toFixed(1), f: +(await F()).toFixed(2) });
}
console.log("months", rowA.map(r => `${r.m} ${r.t}C ${r.f}`).join(" | "));
ok(rowA.every(r => Number.isFinite(r.t) && r.f >= 0 && r.f <= 1), "month sweep finite and in 0..1");
const jan = rowA.find(r => r.m === "Jan"), apr = rowA.find(r => r.m === "Apr"), may = rowA.find(r => r.m === "May");
ok(jan.f > 0.9, "January fully scraped (" + jan.f + ")");
ok(apr.f < 0.3 && may.f === 0, "April barely/not, May never (" + apr.f + ", " + may.f + ")");
await ev(`GS.hour = ${JAN}; true`); await sleep(800);

// B: storm warmth: a real weather front over the road
await plow(1);
const stormRows = [];
for (const w of [0, 0.5, 1]) { await ev(`WX.at = () => ${w}; true`); await sleep(1300); stormRows.push(w + ":" + (await F()).toFixed(2) + "@" + (await ev(`TLXR.scrTemp()`)).toFixed(1)); }
console.log("weather (WX.at: scrapeF@temp)", stormRows.join("  "));
await ev(`WX.at = () => 0; true`); await sleep(1300);

// C: heading sweep over the same wheel track
const hs = [];
for (const deg of [0, 15, 30, 60, 90, 180, 270]) {
  const y = yaw0 + deg * Math.PI / 180, lx = Math.cos(y), lz = -Math.sin(y);
  hs.push(deg + ":" + (await ev(`TLXR.scraped(${ax}, ${az}, ${lx}, ${lz})`)).toFixed(2));
}
console.log("heading (deg off road: scraped)", hs.join("  "));
const hv = hs.map(s => +s.split(":")[1]); ok(hv.every(v => Number.isFinite(v) && v >= 0 && v <= 1), "heading sweep finite 0..1");
ok(Math.abs(hv[0] - hv[5]) < 0.02, "driving the other way down the same track reads the same (" + hv[0] + " vs " + hv[5] + ")");

// D: the sleep skip. Snow the stretch, then jump the clock 6 h (a night's sleep): the plow-went-out rule stamps it fresh.
await plow(40); const d0 = await F();
await ev(`TLXR.setSnow("${L.id}", 0.6); true`);
await ev(`GS.hour += 6; true`); await sleep(2500);
const d1 = await J(`({ f: TLXR.scrapeF(${ax}, ${az}), s: TLXR.snowAt(${ax}, ${az}), age: GS.hour - TLX.state("roads").r["${L.id}"].t[Math.floor(TLXR.near(${ax}, ${az}).s / ROADS.seg)] })`).catch(async () => ({ f: await F() }));
console.log("old plow", d0, "-> snowed 0.6, slept 6 h ->", JSON.stringify(d1));
// D2: skip with NO snow on the road: stamp must not be refreshed
await plow(40); await ev(`TLXR.setSnow("${L.id}", 0); GS.hour += 6; true`); await sleep(2500);
const d2 = await F(); console.log("clear road, slept 6 h:", d2); ok(d2 === 0, "a skip over an already-clear old road does not scrape it (" + d2 + ")");
// D3: live plow: heavy snow, light weather, run clock on
await plow(40); await ev(`TLXR.setSnow("${L.id}", 0.5); true`);
await sleep(500);
let live = [];
for (let i = 0; i < 6; i++) { await ev(`GS.hour += 0.5; true`); await sleep(1300); live.push((await F()).toFixed(2) + "/" + (await ev(`TLXR.snowAt(${ax}, ${az})`)).toFixed(2)); }
console.log("live plow, +0.5 h steps (scrapeF/snow):", live.join("  "));

// E: sled on the track at day, sparks still, and a towed rig if one can be hooked
await ev(`GS.hour = ${JAN}; true`); await sleep(800); await plow(1);
await ev(`window.__sk = 0; { const o = spark; spark = function (a, b, c, d, e, f) { window.__sk++; return o(a, b, c, d, e, f); }; } true`);
const [x, z] = at(0.8, 6);
await ev(`crashCancel(); FOOT.on = false; P.x = ${x}; P.z = ${z}; P.y = surf(${x}, ${z}) + 0.2; P.vx = P.vz = P.vy = 0; P.yaw = ${yaw0}; P.yr = 0; GS.fuel = GS.cap; recenter(${x}, ${z}, true); true`);
await sleep(1000); await down("KeyW"); await sleep(2200);
for (const [nm, side, back, up_] of [["x3sc_day_side", 3.2, 0.5, 1.6], ["x3sc_day_rear", 0.3, 4.5, 1.4]]) {
  await sideCam(undefined, side, back, up_); await sleep(300); await shot(nm);
}
await camOff();
const E = await J(`({ scr: +(P.scr || 0).toFixed(2), mph: Math.round(Math.hypot(P.vx, P.vz) * 2.237), sk: window.__sk, b: document.getElementById("bonus").textContent })`);
await up("KeyW"); console.log("day run", JSON.stringify(E));
ok(E.scr > 0.35 && E.sk > 10, "day run scraped with sparks (" + E.scr + ", " + E.sk + " sparks)");
ok(!(await ev(`TLXR.tickErr || TLXR.err || null`)), "no road error");
console.log(fails ? `${fails} FAILED` : "all asserts passed");
await done(fails ? 1 : 0);

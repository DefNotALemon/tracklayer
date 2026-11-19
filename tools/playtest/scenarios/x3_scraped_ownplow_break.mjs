// 3.2b2 scraped road x the player's own blade (TLXR.plowSeg quiet, as tlx-plow calls it): beta break attempt.
//  A. a snowed stretch (0.5) cut by plowSeg: that stretch scrapes in a cold January, its neighbours (still snowed) do not
//  B. a stretch with only a dusting (<0.02) the blade passes: stays unscraped (no fresh time) - noted, not asserted as bug
//  C. reload with a half-plowed road: the cut stretch is still scraped, the snowed one not
//  D. a mild day (November): the same cut scrapes barely
//  E. Plow-truck blade width: sled position on the cut stretch's seam (two segments) is finite and 0..1
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
const JAN = 24 * 65 + 11;
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = ${JAN}; true`); await sleep(1500);
const L = await J(`(() => { for (const r of TLXR.routes) { if (!r.st || r.closed || r.seg.length < 8) continue; const i0 = 3;
  const a = r.seg[i0], b = r.seg[i0 + 1], c = r.seg[i0 + 2]; if (!a.legs.length || !b.legs.length || !c.legs.length) continue;
  return { id: r.id, n: r.seg.length, a: [a.mx, a.mz], b: [b.mx, b.mz], c: [c.mx, c.mz], sa: (i0 + 0.5) * 400 }; } return null; })()`);
console.log("leg", JSON.stringify(L)); ok(!!L, "found three adjacent road segments");
if (!L) await done(1);
const f = async p => ev(`TLXR.scrapeF(${p[0]}, ${p[1]})`);
await ev(`TLXR.setPlowed("${L.id}", 40); TLXR.setSnow("${L.id}", 0.5); true`);
const before = [await f(L.a), await f(L.b), await f(L.c)];
const was = await ev(`TLXR.plowSeg("${L.id}", ${L.sa}, true)`);
const after = [await f(L.a), await f(L.b), await f(L.c)];
console.log("was", was, "before", before, "after", after.map(v => +v.toFixed(2)));
ok(before.every(v => v === 0), "snowed road: nothing scraped");
ok(was > 0.4, "plowSeg reports the snow it found (" + was + ")");
ok(after[0] > 0.9, "the stretch the blade cut scrapes (" + after[0].toFixed(2) + ")");
ok(after[1] === 0 && after[2] === 0, "its snowed neighbours do not");
// B dusting
await ev(`TLXR.setPlowed("${L.id}", 40); TLXR.setSnow("${L.id}", 0.01); true`);
const wasB = await ev(`TLXR.plowSeg("${L.id}", ${L.sa}, true)`); const fb = await f(L.a);
console.log("dusting: found", wasB, "scrape", fb, "(a blade pass over a dusted road leaves its plow time old)");
// C reload
await ev(`TLXR.setPlowed("${L.id}", 40); TLXR.setSnow("${L.id}", 0.5); TLXR.plowSeg("${L.id}", ${L.sa}, true); save(); true`);
await reload();
await ev(`crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; true`); await sleep(1500);
const rc = [await f(L.a), await f(L.b)];
console.log("after reload", rc.map(v => +v.toFixed(2)), "hour", await ev("GS.hour"));
ok(rc[0] > 0.8 && rc[1] === 0, "reload keeps the cut stretch scraped and the snowed one not (" + rc.map(v => v.toFixed(2)) + ")");
// D mild day
await ev(`GS.hour = ${24 * 4 + 11}; true`); await sleep(1500);
await ev(`TLXR.setPlowed("${L.id}", 40); TLXR.setSnow("${L.id}", 0.5); TLXR.plowSeg("${L.id}", ${L.sa}, true); true`);
const fd = await f(L.a); console.log("November cut", fd);
ok(fd < 0.25, "a mild November day barely scrapes a fresh cut (" + fd.toFixed(2) + ")");
// E seam
await ev(`GS.hour = ${JAN}; true`); await sleep(1200);
await ev(`TLXR.setPlowed("${L.id}", 40); TLXR.setSnow("${L.id}", 0.5); TLXR.plowSeg("${L.id}", ${L.sa}, true); true`);
const seam = [];
for (let k = 0; k <= 10; k++) { const t = k / 10; const x = L.a[0] + (L.b[0] - L.a[0]) * t, z = L.a[1] + (L.b[1] - L.a[1]) * t; seam.push(await ev(`TLXR.scraped(${x}, ${z}, 1, 0)`)); }
console.log("scraped along a->b", seam.map(v => +v.toFixed(2)).join(" "));
ok(seam.every(v => Number.isFinite(v) && v >= 0 && v <= 1), "values stay in 0..1 over the seam");
ok(!(await ev(`TLXR.tickErr || TLXR.err || null`)), "no road error");
console.log(fails ? `${fails} FAILED` : "all asserts passed");
await done(fails ? 1 : 0);

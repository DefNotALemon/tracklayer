// Beta fix 0144 #1 (3.2a road snow): the depth a road settles to must follow the stretch's snow value, monotone, from the
// plowed level at 0 up to the untouched snowpack at 1. Before the fix a fully drifted stretch (k = 0) read as "k unset"
// (`Y.k || 1`) and came out plowed harder than an open road (0.14 m vs 0.22 m) while 0.5 sat at 0.59 m.
// Reads restCell (what refill fills to and what a freshly loaded chunk starts at) and yardAt at the middle of a few road
// stretches away from any village, then checks a real chunk loaded at snow 1 starts at the snowpack.
import { boot, ev, sleep, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(800);
ok(await ev(`TLXR.ready && !TLXR.err`), "roads ready");
// spots: the centre of a stretch's middle leg, no house yard within 40 m (yards are k 1 whatever the road does)
const spots = await J(`(() => { const out = []; for (const r of TLXR.routes) { if (!r.st) continue; for (let i = 1; i < r.seg.length - 1 && out.filter(o => o.id === r.id).length < 2; i += 3) {
  const g = r.seg[i]; if (!g.legs.length) continue; const Y = g.legs[Math.floor(g.legs.length / 2)], x = (Y.x + Y.x2) / 2, z = (Y.z + Y.z2) / 2;
  if (YARDS.some(o => !o.k && Math.hypot(o.x - x, o.z - z) < 40)) continue; if (isWater(x, z) || isSea(x, z)) continue;
  const ix = Math.round((x + HALF) / CELL), iz = Math.round((z + HALF) / CELL); if (freshCell(ix, iz) < 0.3) continue; out.push({ id: r.id, i, x, z, ix, iz }); } } return out; })()`);
console.log("spots", spots.length, spots.map(s => s.id + "#" + s.i).join(" "));
ok(spots.length >= 4, "at least 4 road spots away from villages");
const Q = [0, 0.25, 0.5, 0.75, 0.9, 1];
let mono = true, endsOk = true;
for (const s of spots) {
  const row = [];
  for (const q of Q) row.push(await J(`(() => { TLXR.setSnow("${s.id}", ${q}, ${s.i}); return { d: +restCell(${s.ix}, ${s.iz}).toFixed(3), y: +yardAt(${s.x}, ${s.z}).toFixed(3), f: +freshCell(${s.ix}, ${s.iz}).toFixed(3) }; })()`));
  await ev(`TLXR.setSnow("${s.id}", 0, ${s.i}); true`);
  console.log(s.id + "#" + s.i, "fresh", row[0].f, "rest d @", Q.join("/"), "=", row.map(r => r.d).join(" / "), " yard", row.map(r => r.y).join(" / "));
  for (let k = 1; k < row.length; k++) if (row[k].d < row[k - 1].d - 0.005) mono = false;
  if (!(row[0].d < 0.4 * row[0].f && row[row.length - 1].d > 0.97 * row[0].f)) endsOk = false;
}
ok(mono, "depth rises with the stretch's snow at every spot (monotone)");
ok(endsOk, "plowed road sits well under the snowpack; a fully drifted one is back to the snowpack");
// a chunk loaded fresh at snow 1 starts at the snowpack (not plowed)
const s = spots[0];
const live = await J(`(() => { TLXR.setSnow("${s.id}", 1, ${s.i}); const cx = ${s.ix} >> 5, cz = ${s.iz} >> 5, key = cz * CPR + cx; const c = chunks[key];
  if (c) { chunks[key] = undefined; const j = activeChunks.indexOf(c); if (j >= 0) activeChunks.splice(j, 1); }
  getChunk(cx, cz); return { d: +depthAt(${s.ix}, ${s.iz}).toFixed(3), f: +freshCell(${s.ix}, ${s.iz}).toFixed(3) }; })()`);
console.log("live chunk at snow 1:", JSON.stringify(live));
ok(live.d > 0.95 * live.f, "a road chunk loaded at snow 1 is full depth (" + live.d + " of " + live.f + ")");
await ev(`TLXR.setSnow(null, 0); true`);
ok(!(await ev(`TLXR.tickErr || TLXR.err || null`)), "no road error");
console.log(fails ? `${fails} FAILED` : "all asserts passed");
await done(fails ? 1 : 0);

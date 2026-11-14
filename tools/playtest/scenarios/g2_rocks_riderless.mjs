// Rocks beta: try to break them. Reverse hit, glancing hit, wedged-in-rock, walker, floating rocks, truck, perf.
import { boot, ev, sleep, done } from "../lib.mjs";
await boot();
await ev("tutSkip(); FOOT.on = false; VEH.cur = null; true");
let fails = 0; const chk = (ok, msg) => { console.log((ok ? "PASS " : "FAIL ") + msg); if (!ok) fails++; };

// A) field geometry: floating rocks, rocks overlapping, rocks on steep slope, rock near sites
const A = JSON.parse(await ev(`(() => {
  const rocks = []; for (const a of obGrid.values()) for (const o of a) if (o.rock) rocks.push(o);
  let float = 0, maxGap = 0, steep = 0, nsite = 0, nan = 0, tall = 0, maxR = 0;
  for (let i = 0; i < rocks.length; i += 3) { const o = rocks[i];
    if (!isFinite(o.x) || !isFinite(o.z) || !isFinite(o.top) || !isFinite(o.r)) { nan++; continue; }
    const g = groundAt(o.x, o.z), s = surf(o.x, o.z); const gap = (o.top - o.r * 0.5) - s;
    if (gap > 2.5) float++; if (gap > maxGap) maxGap = gap;
    if (slopeAt(o.x, o.z, 6) > 0.7) steep++;
    if (nearSite(o.x, o.z, 20)) nsite++;
    if (o.top - s > 6) tall++; if (o.r > maxR) maxR = o.r; }
  return JSON.stringify({ n: rocks.length, nan, float, maxGap: +maxGap.toFixed(2), steep, nsite, tall, maxR }); })()`));
console.log(JSON.stringify(A));
chk(A.nan === 0, "no NaN rocks"); chk(A.float === 0, "no floating rocks (" + A.float + ", max gap " + A.maxGap + ")");
chk(A.nsite === 0, "no rocks within 20 m of a site (" + A.nsite + ")");

// B) strike helper: flat spot, planted stone, heading offset and direction
async function strike(v, label, o = {}) {
  await ev("crashCancel(); FOOT.on = false; true");
  const pk = await ev(`(() => {
    for (let r = 0; r < 3000; r += 25) for (let a = 0; a < 6.28; a += 0.4) {
      const x = 900 + Math.cos(a) * r, z = -600 + Math.sin(a) * r;
      if (isSea(x, z) || isWater(x, z) || obNear(x, z, 40) || nearSite(x, z, 60) || slopeAt(x, z, 8) > 0.03 || slopeAt(x, z + 10, 8) > 0.03) continue;
      if (Math.abs(groundAt(x, z + 20) - groundAt(x, z - 6)) > 0.8) continue;
      const off = ${o.off || 0};
      P.x = x - off; P.z = z - 14; P.y = surf(P.x, P.z) + 0.3; P.yaw = ${o.yaw || 0}; P.vx = 0; P.vz = ${v}; P.vy = 0; P.yr = 0; recenter(x, z, true);
      ${o.rev ? "P.yaw = Math.PI; P.z = z + 14; P.vz = -" + v + ";" : ""}
      const ob = { x: x + 0.3, z, r: 1.3, top: surf(x, z) + 1.6, rock: true }; addOb(ob); window.__o = ob;
      window.__rec = []; window.__hits0 = ROCK.hits;
      const tick = () => { window.__rec.push({ t: gameClock, vx: P.vx, vz: P.vz, hits: ROCK.hits, crash: CRASH.on, x: P.x, z: P.z, yaw: P.yaw, n: (P.vx !== P.vx) || (P.yaw !== P.yaw) }); if (window.__rec.length < 500) requestAnimationFrame(tick); }; tick();
      return JSON.stringify({ x, z }); }
    return "null"; })()`);
  if (pk === "null") { chk(false, label + ": no flat spot"); return null; }
  await sleep(10000);
  const rec = JSON.parse(await ev("JSON.stringify(window.__rec)"));
  const ob = JSON.parse(await ev("JSON.stringify({x:window.__o.x,z:window.__o.z,r:window.__o.r})"));
  await ev("(() => { const o = window.__o, a = obGrid.get(Math.floor((o.z + HALF) / OBC) * OBW + Math.floor((o.x + HALF) / OBC)); a.splice(a.indexOf(o), 1); return true; })()");
  const h0 = +(await ev("window.__hits0")), hi = rec.findIndex(r => r.hits > h0);
  const hits = rec.length ? rec[rec.length - 1].hits - h0 : 0;
  const last = rec[rec.length - 1];
  const d = Math.hypot(last.x - ob.x, last.z - ob.z);
  return { hi, hits, nan: rec.some(r => r.n), crash: rec.some(r => r.crash), endSp: Math.hypot(last.vx, last.vz), dEnd: d, pre: hi > 0 ? Math.hypot(rec[hi - 1].vx, rec[hi - 1].vz) : 0 };
}
const R = await strike(10, "reverse", { rev: true }); console.log("reverse", JSON.stringify(R));
if (R) { chk(R.hi > 0, "reverse into a rock registers a hit"); chk(!R.nan, "reverse: no NaN"); chk(R.hits <= 3, "reverse: hit counted <= 3 times, not a per-frame grind (" + R.hits + ")"); chk(R.dEnd > 1.3, "reverse: sled not left inside the stone (" + R.dEnd.toFixed(2) + ")"); }
const G = await strike(10, "glance", { off: 1.6 }); console.log("glance", JSON.stringify(G));
if (G) { chk(!G.nan, "glance: no NaN"); chk(G.hits <= 3, "glance: hit count sane (" + G.hits + ")"); chk(G.dEnd > 1.3, "glance: not inside stone (" + G.dEnd.toFixed(2) + ")"); }
const B = await strike(13.5, "just below 14", {}); console.log("13.5", JSON.stringify(B));
if (B) { chk(!B.crash, "13.5 m/s: bucks, no eject"); chk(B.dEnd > 1.3, "13.5: not inside stone"); }
const C = await strike(14.8, "just above 14", {}); console.log("14.8", JSON.stringify(C));
if (C) chk(C.crash, "14.8 m/s: ejects (threshold is on speed INTO stone; entry may be ~14.x)");
const S = await strike(3, "crawl", {}); console.log("crawl", JSON.stringify(S));
if (S) { chk(S.hi > 0, "3 m/s crawl: stone stops/registers"); chk(S.dEnd > 1.3, "3 m/s: not clipped into stone (" + S.dEnd.toFixed(2) + ")"); }

// C) on foot into a rock; truck-style vehicle reach
const W = JSON.parse(await ev(`(() => {
  crashCancel(); let best = null;
  for (const a of obGrid.values()) for (const o of a) if (o.rock && !best && groundAt(o.x, o.z) > 25 && !obNear(o.x - 8, o.z, 3)) best = o;
  if (!best) return "null";
  FOOT.on = true; FOOT.x = best.x - best.r - 3; FOOT.z = best.z; recenter(FOOT.x, FOOT.z, true);
  window.__rk = best; return JSON.stringify({ x: best.x, z: best.z, r: best.r }); })()`));
if (W) {
  await ev("(() => { window.__w = setInterval(() => { try { keys['KeyW'] = true; keys['KeyD'] = false; } catch (e) {} }, 30); return true; })()");
  await ev("(() => { window.__tl_hold = 1; return true })()");
  await sleep(500);
  console.log("foot-start", JSON.stringify(await ev("JSON.stringify({x:FOOT.x,z:FOOT.z})")));
}
// D) perf: frame time in the middle of a rock cell
const F = JSON.parse(await ev(`new Promise(res => { FOOT.on = false; let n = 0, t0 = performance.now(); const f = () => { if (++n < 90) requestAnimationFrame(f); else res(JSON.stringify({ ms: (performance.now() - t0) / n })); }; requestAnimationFrame(f); })`));
console.log("frame ms", JSON.stringify(F));
chk(F.ms < 120, "headless frame avg < 120 ms (" + F.ms.toFixed(0) + ")");
console.log(fails ? "FAILS: " + fails : "ALL PASS");
await done(fails ? 1 : 0);

// Rocks: stand clear of the snow, buck the sled at moderate speed, throw the rider at high speed.
import { boot, ev, shot, sleep, done, sideCam, camOff } from "../lib.mjs";
import fs from "node:fs";
await boot();
await ev("tutSkip(); FOOT.on = false; VEH.cur = null; true");
let fails = 0; const chk = (ok, msg) => { console.log((ok ? "PASS " : "FAIL ") + msg); if (!ok) fails++; };

// A) the field: count, spacing from town / roads, visibility above the snow
const A = JSON.parse(await ev(`(() => {
  const rocks = []; for (const a of obGrid.values()) for (const o of a) if (o.rock) rocks.push(o);
  const bad = []; let nearTown = 0, onRoad = 0, buried = 0, minVis = 9;
  for (const o of rocks) {
    if (Math.hypot(o.x - depot.x, o.z - depot.z) < TOWN_R) nearTown++;
    if (window.TLXR && TLXR.near(o.x, o.z).d < 3.2) { onRoad++; bad.push([Math.round(o.x), Math.round(o.z), o.r, window.TLXR.near(o.x, o.z).d, !!o.nw]); }
    const vis = o.top - surf(o.x, o.z); if (vis < minVis) minVis = vis; if (vis < 0.45) buried++;
  }
  return JSON.stringify({ n: rocks.length, field: ROCK_FIELD.n, cells: ROCK_FIELD.cells, nearTown, onRoad, buried, minVis: +minVis.toFixed(2), bad });
})()`));
console.log(JSON.stringify(A));
chk(A.n >= 20000, "at least 20000 rocks (" + A.n + ")");
chk(A.nearTown === 0, "no rock inside TOWN_R of the depot (" + A.nearTown + ")");
chk(A.onRoad === 0, "no rock centre on a road bed (3.2 m half-width) (" + A.onRoad + ")");
chk(A.buried === 0, "every rock top stands >= 0.45 m above the snow surface (min " + A.minVis + " m)");

// B) strike test on flat ground with a planted stone
async function strike(v, label) {
  await ev("crashCancel(); FOOT.on = false; true");
  const pk = JSON.parse(await ev(`(() => {
    for (let r = 0; r < 3000; r += 25) for (let a = 0; a < 6.28; a += 0.4) {
      const x = 900 + Math.cos(a) * r, z = -600 + Math.sin(a) * r;
      if (isSea(x, z) || isWater(x, z) || obNear(x, z, 40) || nearSite(x, z, 60) || slopeAt(x, z, 8) > 0.03 || slopeAt(x, z + 10, 8) > 0.03) continue;
      if (Math.abs(groundAt(x, z + 20) - groundAt(x, z - 6)) > 0.8) continue;
      P.x = x; P.z = z - 14; P.y = surf(x, z - 14) + 0.3; P.yaw = 0; P.vx = 0; P.vz = ${v}; P.vy = 0; P.yr = 0; recenter(x, z, true);
      const o = { x: x + 0.3, z, r: 1.3, top: surf(x, z) + 1.6, rock: true }; addOb(o); window.__o = o;
      window.__rec = []; window.__hits0 = ROCK.hits;
      const tick = () => { window.__rec.push({ t: gameClock, vx: P.vx, vz: P.vz, hits: ROCK.hits, crash: CRASH.on, z: P.z, gnd: P.gnd }); if (window.__rec.length < 400) requestAnimationFrame(tick); }; tick();
      return JSON.stringify({ x, z });
    }
    return "null"; })()`));
  if (!pk) { chk(false, label + ": no flat spot"); return null; }
  await sleep(9000);
  const rec = JSON.parse(await ev("JSON.stringify(window.__rec)"));
  await ev("(() => { const o = window.__o, a = obGrid.get(Math.floor((o.z + HALF) / OBC) * OBW + Math.floor((o.x + HALF) / OBC)); a.splice(a.indexOf(o), 1); return true; })()");
  const h0 = await ev('window.__hits0'), hi = rec.findIndex(r => r.hits > h0); if (hi < 1) { chk(false, label + ": never hit the stone"); return null; }
  const sp = r => Math.hypot(r.vx, r.vz), pre = sp(rec[hi - 1]);
  const after = rec.filter(r => r.t >= rec[hi].t && r.t - rec[hi].t < 1.2), at1 = rec.find(r => r.t - rec[hi].t >= 1.0);
  return { pre, post: sp(rec[hi]), maxLat: Math.max(...after.map(r => Math.abs(r.vx))), v1: at1 ? sp(at1) : 0, crash: rec.slice(hi).some(r => r.crash), pk };
}
const mod = await strike(10, "moderate");
console.log("moderate", JSON.stringify(mod));
if (mod) {
  chk(!mod.crash, "10 m/s strike: rider stays on");
  chk(mod.maxLat >= 3, "10 m/s strike: sideways buck >= 3 m/s (" + mod.maxLat.toFixed(1) + ")");
  chk(mod.post <= mod.pre * 0.6, "10 m/s strike: speed after hit <= 60% of entry (" + mod.post.toFixed(1) + " of " + mod.pre.toFixed(1) + ")");
  chk(mod.post > 1.5, "10 m/s strike: not a dead stop (" + mod.post.toFixed(1) + ")");
  chk(mod.v1 <= mod.pre * 0.5, "10 m/s strike: still scrubbed at +1 s (" + mod.v1.toFixed(1) + ")");
}
const fast = await strike(24, "fast");
console.log("fast", JSON.stringify(fast));
if (fast) {
  chk(fast.crash, "24 m/s strike: rider thrown (crashEject)");
  chk(fast.v1 <= 4, "24 m/s strike: riderless sled near a stop at +1 s (" + fast.v1.toFixed(1) + ")");
}

// C) stills: sled beside real rocks, different spots
if (!process.env.NOSTILLS) {
  await ev("crashCancel(); FOOT.on = false; true");
  const spots = JSON.parse(await ev(`(() => {
    const out = [], seen = new Set();
    for (const a of obGrid.values()) for (const o of a) if (o.rock && o.r > 1.3 && o.r < 2.2 && !obNear(o.x + 6, o.z, 3.5) && groundAt(o.x, o.z) > 25) { const k = Math.floor(o.x / 900) * 50 + Math.floor(o.z / 900); if (seen.has(k)) continue; seen.add(k); out.push([o.x, o.z]); if (out.length >= 6) return JSON.stringify(out); }
    return JSON.stringify(out); })()`));
  console.log("still spots", spots.length);
  for (let i = 0; i < spots.length; i++) {
    const [x, z] = spots[i];
    await ev(`(() => { P.x = ${x} - 5; P.z = ${z} - 3; P.y = surf(P.x, P.z) + 0.3; P.yaw = 1.0; P.vx = P.vz = P.vy = 0; recenter(P.x, P.z, true); return true; })()`);
    await sleep(2500);
    await shot("rock_" + i);
  }
  await camOff();
}
console.log(fails ? "FAILS: " + fails : "ALL PASS");
await done(fails ? 1 : 0);

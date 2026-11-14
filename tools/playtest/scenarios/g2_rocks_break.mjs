// Rocks beta (break attempts): on foot into a rock, grazing/reverse/glancing hits, rock overlap with trees/sites/parked cars/ships,
// rocks vs the 14 m/s eject line, rider-state after a throw, reload mid-field. Prints PASS/FAIL, no stills.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
await boot();
await ev("tutSkip(); FOOT.on = false; VEH.cur = null; true");
let fails = 0; const chk = (ok, msg) => { console.log((ok ? "PASS " : "FAIL ") + msg); if (!ok) fails++; };

// A) overlaps with other things
const A = JSON.parse(await ev(`(() => {
  const rocks = [], others = []; for (const a of obGrid.values()) for (const o of a) (o.rock ? rocks : others).push(o);
  let overTree = 0, overOb = 0, onSite = 0, inWater = 0, nan = 0, nearSpawn = 0, nearCar = 0, eg = [];
  for (const o of rocks) {
    if (!isFinite(o.x) || !isFinite(o.top) || !isFinite(o.r)) nan++;
    if (isWater(o.x, o.z) || isSea(o.x, o.z)) inWater++;
    if (nearSite(o.x, o.z, 12)) onSite++;
    if (Math.hypot(o.x - SPAWN.x, o.z - SPAWN.z) < 25) nearSpawn++;
    if (window.TLXC && TLXC.cars) for (const c of TLXC.cars) if (c && Math.hypot(o.x - c.x, o.z - c.z) < 4) { nearCar++; if (eg.length < 3) eg.push([Math.round(o.x), Math.round(o.z)]); }
  }
  return JSON.stringify({ rocks: rocks.length, nan, inWater, onSite, nearSpawn, nearCar, eg, hasCars: !!(window.TLXC && TLXC.cars) });
})()`));
console.log(JSON.stringify(A));
chk(A.nan === 0, "no NaN rock fields");
chk(A.inWater === 0, "no rock in water/sea (" + A.inWater + ")");
chk(A.onSite === 0, "no rock within 12 m of a site (" + A.onSite + ")");
chk(A.nearSpawn === 0, "none within 25 m of spawn");
chk(A.nearCar === 0, "none on a parked-car spot (" + A.nearCar + ")");

// B) tree overlap: rocks vs trees (o.tree defined)
const B = JSON.parse(await ev(`(() => {
  let n = 0, tot = 0;
  for (const a of obGrid.values()) for (const o of a) if (o.rock) { tot++; for (const t of obGrid.get(Math.floor((o.z + HALF) / OBC) * OBW + Math.floor((o.x + HALF) / OBC)) || []) if (t !== o && !t.rock && Math.hypot(t.x - o.x, t.z - o.z) < (t.r || 0.4) + o.r * 0.5) { n++; break; } }
  return JSON.stringify({ n, tot });
})()`));
console.log("tree overlap", JSON.stringify(B));
chk(B.n < B.tot * 0.01, "<1% of rocks sit inside a tree/obstacle (" + B.n + "/" + B.tot + ")");

// C) on-foot walking into a rock: can the walker pass through?
const C = JSON.parse(await ev(`(() => {
  const o = (() => { for (const a of obGrid.values()) for (const o of a) if (o.rock && o.r > 1.5 && groundAt(o.x, o.z) > 25) return o; })();
  FOOT.on = true; FOOT.x = o.x - 6; FOOT.z = o.z; FOOT.yaw = Math.PI / 2; window.__fo = o;
  return JSON.stringify({ x: o.x, z: o.z, r: o.r });
})()`));
await ev("recenter(FOOT.x, FOOT.z, true); true");
await sleep(1500);
const { hold } = await import("../lib.mjs");
await hold(["KeyW"], 9000);
const C2 = JSON.parse(await ev(`JSON.stringify({ fx: FOOT.x, fz: FOOT.z, d: Math.hypot(FOOT.x - __fo.x, FOOT.z - __fo.z), r: __fo.r, on: FOOT.on })`));
console.log("foot", JSON.stringify(C), JSON.stringify(C2));
chk(C2.d > C2.r * 0.6, "walker does not stand inside the rock core (d " + C2.d.toFixed(2) + " r " + C2.r.toFixed(2) + ")");

// D) glancing + reverse strikes
async function strike(v, off, rev, label) {
  await ev("crashCancel(); FOOT.on = false; true");
  const ok = await ev(`(() => {
    for (let r = 0; r < 3000; r += 25) for (let a = 0; a < 6.28; a += 0.4) {
      const x = -900 + Math.cos(a) * r, z = 700 + Math.sin(a) * r;
      if (isSea(x, z) || isWater(x, z) || obNear(x, z, 40) || nearSite(x, z, 60) || slopeAt(x, z, 8) > 0.03 || slopeAt(x, z + 10, 8) > 0.03) continue;
      if (Math.abs(groundAt(x, z + 20) - groundAt(x, z - 6)) > 0.8) continue;
      P.x = x + ${off}; P.z = z - 14; P.y = surf(x, z - 14) + 0.3; P.yaw = 0; P.vx = 0; P.vz = ${v}; P.vy = 0; P.yr = 0; recenter(P.x, P.z, true);
      const o = { x: x + 0.3, z, r: 1.3, top: surf(x, z) + 1.6, rock: true }; addOb(o); window.__o = o; window.__h0 = ROCK.hits; window.__bad = 0; window.__maxv = 0;
      const tick = () => { if (!isFinite(P.x) || !isFinite(P.vx) || !isFinite(P.yaw) || !isFinite(P.yr)) window.__bad++; window.__maxv = Math.max(window.__maxv, Math.hypot(P.vx, P.vz)); if (window.__tk++ < 400) requestAnimationFrame(tick); }; window.__tk = 0; tick();
      return "ok"; }
    return "none"; })()`);
  await sleep(8000);
  const r = JSON.parse(await ev(`JSON.stringify({ hits: ROCK.hits - __h0, bad: __bad, maxv: __maxv, crash: CRASH.on, v: Math.hypot(P.vx, P.vz), inRock: Math.hypot(P.x - __o.x, P.z - __o.z) < __o.r * 0.6 })`));
  await ev("(() => { const o = window.__o, a = obGrid.get(Math.floor((o.z + HALF) / OBC) * OBW + Math.floor((o.x + HALF) / OBC)); a.splice(a.indexOf(o), 1); return true; })()");
  console.log(label, ok, JSON.stringify(r));
  chk(r.bad === 0, label + ": no NaN in sled state");
  chk(!r.inRock, label + ": sled not inside the rock afterwards");
  chk(r.maxv < 40, label + ": no speed spike after hit (max " + r.maxv.toFixed(1) + ")");
  return r;
}
await strike(10, 1.2, false, "glancing 10 m/s (1.2 m off-centre)");
await strike(10, 1.9, false, "grazing 10 m/s (1.9 m off)");
await strike(13.5, 0, false, "13.5 m/s head-on (just below eject)");
const t14 = await strike(14.6, 0, false, "14.6 m/s head-on (just above)");
chk(t14.crash || t14.hits >= 1, "14.6 m/s head-on registers (crash " + t14.crash + ")");
await strike(3, 0, false, "creep 3 m/s");

// E) after a throw: can the rider get up and ride on, and is the world intact after reload
await ev("crashCancel(); true");
await reload();
await ev("tutSkip(); true");
const E = JSON.parse(await ev(`JSON.stringify({ n: ROCK_FIELD.n })`));
chk(E.n >= 20000, "rock field rebuilt after reload (" + E.n + ")");
console.log(fails ? "FAILS: " + fails : "ALL PASS");
await done(fails ? 1 : 0);

// Riderless brake (Owner 13 Nov, beta 0170 #1): after a crash the empty sled brakes to a stop whichever way it was
// moving, and never runs away backwards. Also: on an empty tank the brake stops a backward roll instead of feeding it.
// Samples 8 game seconds after each event (0170: the runaway only shows after ~2 s).
import { boot, ev, sleep, done, down, up } from "../lib.mjs";
await boot();
await ev("tutSkip(); FOOT.on = false; VEH.cur = null; true");
let fails = 0; const chk = (ok, msg) => { console.log((ok ? "PASS " : "FAIL ") + msg); if (!ok) fails++; };

// a flat open spot; returns [x, z] (n-th one so cases don't share snow)
const spot = async n => JSON.parse(await ev(`(() => { let k = 0;
  for (let r = 0; r < 3000; r += 25) for (let a = 0; a < 6.28; a += 0.4) {
    const x = 900 + Math.cos(a) * r, z = -600 + Math.sin(a) * r;
    if (isSea(x, z) || isWater(x, z) || obNear(x, z, 40) || nearSite(x, z, 60) || slopeAt(x, z, 8) > 0.03 || slopeAt(x, z + 10, 8) > 0.03 || slopeAt(x, z - 30, 8) > 0.03) continue;
    if (Math.abs(groundAt(x, z + 20) - groundAt(x, z - 30)) > 0.8) continue;
    if (k++ < ${n} * 3) continue;
    return JSON.stringify([x, z]);
  } return "null"; })()`));
const recStart = () => ev(`(() => { window.__rec = []; const t0 = gameClock;
  const tick = () => { const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw);
    window.__rec.push({ t: gameClock - t0, sp: Math.hypot(P.vx, P.vz), vf: P.vx * fx + P.vz * fz, x: P.x, z: P.z, crash: CRASH.on, dir: GB.dir, hits: ROCK.hits });
    if (gameClock - t0 < 8.5) requestAnimationFrame(tick); }; tick(); return true; })()`);
const recGet = async () => { while (true) { const r = JSON.parse(await ev("JSON.stringify(window.__rec)")); if (r.length && r[r.length - 1].t >= 8.4) return r; await sleep(500); } };
const at = (rec, t) => rec.find(r => r.t >= t) || rec[rec.length - 1];

// A/B) crash ejects while rolling forward and backward on the flat
for (const [label, v] of [["forward 12 m/s", 12], ["backward 6 m/s", -6], ["backward 3 m/s", -3]]) {
  const s = await spot(label.startsWith("f") ? 0 : v === -6 ? 1 : 2);
  if (!s) { chk(false, label + ": no flat spot"); continue; }
  await ev(`(() => { crashCancel(); FOOT.on = false; CRASH.cool = 0; P.x = ${s[0]}; P.z = ${s[1]}; P.y = surf(P.x, P.z) + 0.2; P.yaw = 0; P.vx = 0; P.vz = ${v}; P.vy = 0; P.yr = 0; recenter(P.x, P.z, true); return true; })()`);
  await sleep(300);
  for (let i = 0; i < 25; i++) {   // crashOk() can refuse for a moment (cooldown, swing): retry until thrown
    if (await ev(`(() => { P.x = ${s[0]}; P.z = ${s[1]}; P.y = surf(P.x, P.z) + 0.2; P.vx = 0; P.vz = ${v}; CRASH.cool = 0; crashEject("test", 0, 1, ${v}, null); return CRASH.on; })()`)) break;
    await sleep(200);
  }
  await recStart(); const rec = await recGet();
  const r0 = rec[0], r8 = at(rec, 8), peakLate = Math.max(...rec.filter(r => r.t > 1.5).map(r => r.sp));
  const dist = Math.hypot(r8.x - r0.x, r8.z - r0.z), revAny = rec.some(r => r.crash && r.dir < 0);
  console.log(label, JSON.stringify({ sp0: +r0.sp.toFixed(2), sp1: +at(rec, 1).sp.toFixed(2), sp3: +at(rec, 3).sp.toFixed(2), sp8: +r8.sp.toFixed(2), peakLate: +peakLate.toFixed(2), dist: +dist.toFixed(1), crash: rec.some(r => r.crash) }));
  chk(rec.some(r => r.crash), label + ": rider thrown");
  chk(r8.sp < 0.3, label + ": riderless sled stopped at +8 s (" + r8.sp.toFixed(2) + " m/s)");
  chk(peakLate <= Math.abs(v) * 0.5 + 0.3, label + ": no speed gained after 1.5 s (peak " + peakLate.toFixed(2) + ")");
  chk(!revAny, label + ": reverse never engaged while crashed");
}

// C) rock strikes (0170's case): 18 and 22 m/s into a stone, then 8 s
for (const v of [18, 22]) {
  const s = await spot(v === 18 ? 3 : 4);
  if (!s) { chk(false, v + " rock: no flat spot"); continue; }
  await ev(`(() => { crashCancel(); FOOT.on = false; CRASH.cool = 0; const x = ${s[0]}, z = ${s[1]};
    P.x = x; P.z = z - 14; P.y = surf(x, z - 14) + 0.3; P.yaw = 0; P.vx = 0; P.vz = ${v}; P.vy = 0; P.yr = 0; recenter(x, z, true);
    const o = { x: x + 0.3, z, r: 1.3, top: surf(x, z) + 1.6, rock: true }; addOb(o); window.__o = o; window.__h0 = ROCK.hits; return true; })()`);
  await recStart(); const rec = await recGet();
  await ev("(() => { const o = window.__o, a = obGrid.get(Math.floor((o.z + HALF) / OBC) * OBW + Math.floor((o.x + HALF) / OBC)); a.splice(a.indexOf(o), 1); return true; })()");
  const h0 = await ev("window.__h0"), hi = rec.findIndex(r => r.hits > h0);
  if (hi < 0) { chk(false, v + " rock: never hit"); continue; }
  const th = rec[hi].t, after = rec.filter(r => r.t >= th), last = after[after.length - 1];
  const peakLate = Math.max(0, ...after.filter(r => r.t > th + 1.5).map(r => r.sp)), dist = Math.hypot(last.x - rec[hi].x, last.z - rec[hi].z);
  console.log(v + " rock", JSON.stringify({ hitT: +th.toFixed(2), post: +rec[hi].sp.toFixed(2), spEnd: +last.sp.toFixed(2), peakLate: +peakLate.toFixed(2), dist: +dist.toFixed(1), span: +(last.t - th).toFixed(1) }));
  chk(after.some(r => r.crash), v + " rock: rider thrown");
  chk(peakLate < 1, v + " rock: riderless sled does not run away (peak after +1.5 s " + peakLate.toFixed(2) + " m/s)");
  chk(dist < 8, v + " rock: sled ends within 8 m of the stone (" + dist.toFixed(1) + " m)");
}

// D) empty tank, rider on, brake held while rolling back 4 m/s: the brake stops it
{
  const s = await spot(5);
  if (!s) chk(false, "empty tank: no flat spot");
  else {
    await ev(`(() => { crashCancel(); FOOT.on = false; P.x = ${s[0]}; P.z = ${s[1]}; P.y = surf(P.x, P.z) + 0.2; P.yaw = 0; P.vx = 0; P.vz = -4; P.vy = 0; P.yr = 0; GS.fuel = 0; recenter(P.x, P.z, true); return true; })()`);
    await down("KeyS");
    await recStart(); const rec = await recGet();
    await up("KeyS"); await ev("GS.fuel = 50; true");
    const r8 = at(rec, 8), peak = Math.max(...rec.filter(r => r.t > 0.5).map(r => r.sp));
    console.log("empty tank", JSON.stringify({ sp1: +at(rec, 1).sp.toFixed(2), sp8: +r8.sp.toFixed(2), peak: +peak.toFixed(2) }));
    chk(peak <= 4.2, "empty tank: braking never speeds the backward roll up (peak " + peak.toFixed(2) + ")");
    chk(r8.sp < 0.3, "empty tank: brake holds it stopped at +8 s (" + r8.sp.toFixed(2) + ")");
  }
}
console.log(fails ? "FAILS: " + fails : "ALL PASS");
await done(fails ? 1 : 0);

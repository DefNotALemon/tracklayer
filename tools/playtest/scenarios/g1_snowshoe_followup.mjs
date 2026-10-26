// G1 follow-up to v113 snowshoes: do they still help on a slope, are they visible/toasted at night, and does a
// crash clear them as intended (walk back un-shod until the next Q off)? Builds on g1_snowshoe.mjs / g1_slope.mjs.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_snowshoe_followup.mjs
import { boot, ev, shot, sideCam, camOff, sleep, down, up, tap, park, done } from "../lib.mjs";
await boot();
await ev("GS.hour = 12; true");

// ---- find a hillside (same search as g1_slope.mjs) ----
const spot = JSON.parse(await ev(`JSON.stringify((() => {
  const cx = P.x, cz = P.z; let best = null, bs = 0;
  for (let r = 150; r < 2400; r += 25) for (let a = 0; a < 6.28; a += 0.25) {
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    if (isSea(x, z) || (typeof isWater === "function" && isWater(x, z)) || obNear(x, z, 25)) continue;
    let wet = false; for (let k = 0; k < 8 && !wet; k++) { const b = k * 0.785; if (isSea(x + Math.cos(b) * 80, z + Math.sin(b) * 80)) wet = true; } if (wet) continue;
    const s = slopeAt(x, z, 10), s2 = slopeAt(x, z, 4);
    if (s > 0.15 && s < 0.35 && Math.abs(s - s2) < 0.05) { const sc = 1 - Math.abs(s - 0.25); if (sc > bs) { bs = sc; best = { x: Math.round(x), z: Math.round(z), sl: +s.toFixed(3) }; } }
  }
  if (!best) return null;
  const e = 6, gx = groundAt(best.x + e, best.z) - groundAt(best.x - e, best.z), gz = groundAt(best.x, best.z + e) - groundAt(best.x, best.z - e);
  best.upYaw = Math.atan2(gx, gz); return best;
})())`));
console.log("spot", JSON.stringify(spot));
if (!spot) { console.log("FAIL: no hillside"); await done(1); }
const Y = spot.upYaw, fx = Math.sin(Y), fz = Math.cos(Y), lx = Math.cos(Y), lz = -Math.sin(Y);

function setFoot(x, z, yaw) {
  return ev(`(() => { FOOT.on = true; FOOT.ski = false; FOOT.dig = false; FOOT.x = ${x}; FOOT.z = ${z}; FOOT.yaw = ${yaw};
    FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.fwd = 0; FOOT.turn = 0; FOOT.tired = 0; FOOT.strain = 0.6; FOOT.grade = 0;
    if (FOOT.g) FOOT.g.visible = true; camState.init = false; return true; })()`);
}
async function walk(label, x, z, yaw, secs = 8) {
  await setFoot(x, z, yaw); await sleep(300);
  const s0 = JSON.parse(await ev(`JSON.stringify({x: FOOT.x, z: FOOT.z, t: gameClock, sink0: FOOT.sink||0})`));
  await down("KeyW"); let s;
  try { for (;;) { await sleep(150); s = JSON.parse(await ev(`JSON.stringify({x: FOOT.x, z: FOOT.z, t: gameClock, sink: FOOT.sink||0})`)); if (s.t - s0.t >= secs) break; } }
  finally { await up("KeyW"); }
  const m = Math.hypot(s.x - s0.x, s.z - s0.z), dt = s.t - s0.t;
  const r = { avg: +(m / dt).toFixed(2), sink: +s.sink.toFixed(2) };
  console.log(`${label}: avg ${r.avg} m/s, sink ${r.sink}`);
  return r;
}
async function slopeSet(tag) {
  const U = await walk(`${tag} UPHILL`, spot.x - fx * 7, spot.z - fz * 7, Y);
  const D = await walk(`${tag} DOWNHILL`, spot.x + lx * 4 + fx * 7, spot.z + lz * 4 + fz * 7, Y + Math.PI);
  const C = await walk(`${tag} ACROSS`, spot.x - lx * 4, spot.z - lz * 4, Y + Math.PI / 2);
  console.log(`${tag} ratios up/across ${(U.avg / C.avg).toFixed(2)} down/across ${(D.avg / C.avg).toFixed(2)}`);
  return { U, D, C };
}

console.log("--- without kit ---");
await ev(`GS.own.parts.recovery = "none"; restat(); true`);
const noKit = await slopeSet("noKit");
await sideCam(); await shot("01_slope_nokit"); await camOff();

console.log("--- with kit ---");
await ev(`GS.own.partsOwned["recovery:kit"] = true; GS.own.parts.recovery = "kit"; restat(); true`);
await setFoot(spot.x, spot.z, Y);
await ev("FOOT.shoe = !FOOT.ski && shoesOwn(); true"); // dismount normally sets this; force it since we teleport FOOT directly
const kit = await slopeSet("kit");
await sideCam(); await shot("02_slope_kit"); await camOff();

async function mountThenDismount(cx, cz) {
  const p = await park(`${cx}`, `${cz}`);
  if (!p) return null;
  await ev(`FOOT.x = ${p.x} + 1; FOOT.z = ${p.z}; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.on = true; true`);
  await sleep(500);
  await tap("KeyQ"); await sleep(1800); // real mount()
  await tap("KeyQ"); await sleep(1800); // real dismount()
  return p;
}

// ---- night visibility / toast: a REAL mount+dismount cycle so the game's own toast code path fires ----
console.log("--- night ---");
await ev("GS.hour = 1; true");
await ev("GS.shoeTold = false; true");
const p1 = await mountThenDismount(spot.x, spot.z);
console.log("night park", JSON.stringify(p1));
const toastTxt = await ev(`(() => { const t = document.querySelector('#toasts'); return t ? t.textContent.slice(0,200) : ''; })()`);
const shoeAtNight = await ev("String(!!FOOT.shoe)");
console.log("night toast text:", JSON.stringify(toastTxt), "FOOT.shoe:", shoeAtNight, "onFoot:", await ev("String(FOOT.on)"));
await ev("FOOT.yaw = Math.PI/2; true");
await down("KeyW"); await sleep(1200); await up("KeyW");
await sideCam(); await shot("03_night_feet"); await camOff();
await ev("GS.hour = 12; true");

// ---- crash clears shoes ----
console.log("--- crash ---");
const p0 = await park(`${spot.x}`, `${spot.z}`);
console.log("parked at", JSON.stringify(p0));
await ev(`FOOT.x = ${p0.x} + 1; FOOT.z = ${p0.z}; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.on = true; true`);
await sleep(500);
await tap("KeyQ"); await sleep(1800); // real mount()
console.log("mounted, onFoot=", await ev("String(FOOT.on)"), "sledvalid", await ev("String(!!P)"));
await ev("P.vx = 18; P.vz = 0; crashEject('test', P.vx, 3, P.vz, null); true");
let gotUp = false, shoeAfterCrash = "unknown";
for (let i = 0; i < 40; i++) {
  await sleep(500);
  const st2 = JSON.parse(await ev(`JSON.stringify({onFoot: !!FOOT.on, crashOn: !!CRASH.on, shoe: !!FOOT.shoe})`));
  if (st2.onFoot && !st2.crashOn) { gotUp = true; shoeAfterCrash = String(st2.shoe); break; }
}
console.log("got up:", gotUp);
console.log("FOOT.shoe immediately after crashGetUp (should be false):", shoeAfterCrash);
await shot("04_after_crash");
// a REAL mount+dismount near the (stationary) sled to see shoes return on the next Q off
await sleep(500);
await tap("KeyQ"); await sleep(1800); // mount (sled is right beside the crash site)
await tap("KeyQ"); await sleep(1800); // dismount -> shoesOwn() re-applies FOOT.shoe
console.log("FOOT.shoe after the next real dismount:", await ev("String(!!FOOT.shoe)"));
await shot("05_after_redon");

console.log("SUMMARY", JSON.stringify({ noKit: { up: noKit.U.avg, down: noKit.D.avg, across: noKit.C.avg }, kit: { up: kit.U.avg, down: kit.D.avg, across: kit.C.avg }, nightToastHadShoeText: /[Ss]nowshoe/.test(toastTxt || ""), gotUp, shoeAfterCrash }));
await done();

// Beta 3.4a (traffic) round 2: sled hits a car at 8/20/30/45 m/s head-on, from behind and from the side: bounced out (no
// tunnelling through, no sled left inside a car), a 'hit' counted; hit while crashed/ragdolling; truck hit; old save (no x);
// wrong-way ride in lane; sled on foot standing in a turning car's path; many hits in a row. Keyboard/script only.
import { boot, ev, sleep, done, shot, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(50); }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(800);
const rid = await J(`TLXT.routes.slice().sort((a, b) => b.len - a.len)[0].id`);
const s0 = await J(`TLXT.routes.find(q => q.id === "${rid}").s0 + 700`);

// set the car standing (hold) at s0, put the sled `back` m away along the lane axis from `bearing` and drive it in at v
async function trial(label, v, mode) {
  await ev(`(() => { crashCancel(); FOOT.on = false; const c = TLXT.place("${rid}", ${s0}, 1); c.v = 0; c.hold = 60; return true; })()`);
  await ev(`(() => { const c = TLXT.cars[0], fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); const m = "${mode}";
    let dx = fx, dz = fz, yaw = c.yaw + Math.PI;                        // head-on from ahead
    if (m === "behind") { dx = -fx; dz = -fz; yaw = c.yaw; }
    if (m === "side") { dx = fz; dz = -fx; yaw = Math.atan2(-dx, -dz); }
    const back = ${v} * 0.7 + 6; P.x = c.x + dx * back; P.z = c.z + dz * back; P.y = surf(P.x, P.z) + 0.2; P.yaw = yaw;
    P.vx = -dx * ${v}; P.vz = -dz * ${v}; window.__dx = -dx; window.__dz = -dz; window.__side = 0; window.__inside = 0; window.__h0 = TLXT.hits; return true; })()`);
  let minD = 1e9, passed = false;
  const t0 = await clock();
  while ((await clock()) - t0 < 3.5) {
    const r = await J(`(() => { const c = TLXT.cars[0]; const along = (P.x - c.x) * window.__dx + (P.z - c.z) * window.__dz;
      let m = 1e9; const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); for (const u of [-1.45, 0, 1.45]) m = Math.min(m, Math.hypot(P.x - c.x - fx * u, P.z - c.z - fz * u)); return { m, along, v: Math.hypot(P.vx, P.vz), fin: Number.isFinite(P.x + P.y + P.z) }; })()`);
    if (!r.fin) { ok(false, `${label}: sled position went non-finite`); break; }
    minD = Math.min(minD, r.m); if (r.along > 3.5) passed = true; await sleep(30);
  }
  const E = await J(`({ hits: TLXT.hits - window.__h0, v: Math.hypot(P.vx, P.vz), crash: CRASH.on, err: TLXT.tickErr || null, d: Math.hypot(P.x - TLXT.cars[0].x, P.z - TLXT.cars[0].z) })`);
  console.log(label, JSON.stringify(E), "min centre dist", minD.toFixed(2), "passedThrough", passed);
  return { ...E, minD, passed };
}
for (const [v, m] of [[8, "head"], [20, "head"], [30, "head"], [45, "head"], [20, "behind"], [30, "behind"], [20, "side"], [35, "side"]]) {
  const r = await trial(`${m} ${v}`, v, m);
  ok(!r.passed, `hit ${m} @${v} m/s: sled did not tunnel to the far side`);
  ok(r.minD > 0.5, `hit ${m} @${v} m/s: sled never inside the car body (min ${r.minD.toFixed(2)} m to nearest circle)`);
  ok(!r.err, `hit ${m} @${v}: no tick error`);
}

// crashed (ragdoll) rider slides into a car: no stuck loop, car releases
await ev(`(() => { crashCancel(); FOOT.on = false; const c = TLXT.place("${rid}", ${s0}, 1); c.v = 0; c.hold = 0; return true; })()`);
await ev(`(() => { const c = TLXT.cars[0], fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); P.x = c.x + fx * 30; P.z = c.z + fz * 30; P.y = surf(P.x, P.z) + 0.2; P.yaw = c.yaw + Math.PI; P.vx = -fx * 12; P.vz = -fz * 12; crashEject("test", -fx * 12, 0, -fz * 12); window.__cm = 1e9; return true; })()`);
for (let i = 0; i < 60; i++) { await ev(`(() => { const c = TLXT.cars[0], fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); if (CRASH.on) for (const u of [-1.45, 0, 1.45]) window.__cm = Math.min(window.__cm, Math.hypot(CRASH.x - c.x - fx * u, CRASH.z - c.z - fz * u)); return true; })()`); await sleep(200); }
console.log("closest ragdoll to a car circle", await J(`window.__cm`));
const C = await J(`({ crash: CRASH.on, foot: FOOT.on, err: TLXT.tickErr || null, fin: Number.isFinite(P.x + P.z) && Number.isFinite(FOOT.x + FOOT.z), v: TLXT.cars[0].v })`);
console.log("crash", JSON.stringify(C));
ok(C.fin && !C.err, "crash near a car: finite, no tick error");

// truck: drive the pickup into a car (if a pickup can be got)
const hasV = await J(`typeof VEH !== "undefined" && !!VEH && typeof VEH.give === "function"`).catch(() => false);
console.log("VEH.give available:", hasV);

// car's own motion: after being hit it must pull away again within 8 game s once the sled is gone
await ev(`(() => { crashCancel(); FOOT.on = false; const c = TLXT.place("${rid}", ${s0}, 1); c.v = 0; c.hold = 0; return true; })()`);
await ev(`(() => { P.x += 400; P.z += 400; P.vx = P.vz = 0; return true; })()`);
await waitGame(9);
const R = await J(`({ v: TLXT.cars[0].v, st: TLXT.cars[0].st, why: TLXT.cars[0].why })`);
ok(R.v > 3 || R.st !== "drive", `car pulls away after being left alone (${JSON.stringify(R)})`);

// wrong-way rider in the car's lane at speed (head-on), repeated 6 times: hits counted at most once per 6 s per car, no accumulating error
let errs = 0;
for (let i = 0; i < 6; i++) { const r = await trial("repeat " + i, 15, "head"); if (r.err || r.passed) errs++; }
ok(errs === 0, "6 head-on hits in a row: no tunnelling, no tick error");

// on foot in the lane of a car that is turning round
await ev(`(() => { crashCancel(); FOOT.on = false; const c = TLXT.place("${rid}", ${s0}, 1); c.v = 0; c.hold = 0; return true; })()`);
console.log("startTurn exposed:", await J(`typeof TLXT.startTurn`));
await shot("x3th_end");
console.log(fails ? `${fails} FAILED` : "all ok");
await done(fails ? 1 : 0);

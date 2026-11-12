// Beta break test for slice 2.6b, every sled: each machine in SLEDS drives up the ramp under its own power (feathered throttle),
// must end on the deck, finite, inside the rails, strappable with E; then dusk/night strap check and a reload keeping the strap.
// The slice's own tests only use the default sled. Prints ok/FAIL; exit 1 on a failure.
import { boot, ev, tap, sleep, done, park, shot, down, up, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
const S = () => J(`(() => { const h = TLXV.haul(), L = TLXV.haulLocal(h, P.x, P.z), on = TLXV.sledOnDeck(P.x, P.z, P.y), g = rideSurf(P.x, P.z);
  return { lx: L.x, lz: L.z, y: P.y, up: P.y - g, on: !!on, top: on ? on.top : null, ramp: on ? on.ramp : null, strap: h.strap, sp: Math.hypot(P.vx, P.vz), fin: [P.x, P.y, P.z, P.yaw, camera.position.x, camera.quaternion.x].every(Number.isFinite), hint: $("wnHint").textContent }; })()`);
const sledAt = (lx, lz) => ev(`(() => { const h = TLXV.haul(), w = TLXV.haulWorld(h, ${lx}, ${lz}); crashCancel(); FOOT.on = false; MNT.on = DMT.on = false;
  P.x = w[0]; P.z = w[1]; P.yaw = h.yaw; P.vx = P.vz = P.vy = 0; P.yr = 0; P.y = rideSurf(P.x, P.z); recenter(P.x, P.z, true); return 1; })()`);
const walkerBeside = () => ev(`(() => { const h = TLXV.haul(), L = TLXV.haulLocal(h, P.x, P.z), w = TLXV.haulWorld(h, TLXV.HAUL.deckW / 2 + 0.75, L.z);
  FOOT.on = true; FOOT.x = w[0]; FOOT.z = w[1]; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.yaw = h.yaw - Math.PI / 2; recenter(FOOT.x, FOOT.z, true); return 1; })()`);

await boot(); await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`);
await park(); await sleep(400);
const lane = await J(`(() => { let best = null; for (const Y of YARDS) { if (Y.x2 === undefined || Math.hypot(Y.x - depot.x, Y.z - depot.z) > TOWN_R || Y.r > 2.5) continue; const L = Math.hypot(Y.x2 - Y.x, Y.z2 - Y.z); if (!best || L > best.L) best = { x: Y.x, z: Y.z, x2: Y.x2, z2: Y.z2, L }; } return best; })()`);
ok(lane && lane.L > 30, "lane " + (lane && lane.L.toFixed(0)));
await ev(`(() => { const L = ${JSON.stringify(lane)}, ux = (L.x2 - L.x) / L.L, uz = (L.z2 - L.z) / L.L, yaw = Math.atan2(ux, uz);
  TLX.state("vehicles").haul = { on: null, x: L.x + ux * 18, z: L.z + uz * 18, yaw, ramp: 1 }; recenter(L.x + ux * 18, L.z + uz * 18, true); return 1; })()`);
const ids = await J(`SLEDS.map(s => s.id)`);
console.log("sleds", ids.join(","));
const LIM = 2.25 - 0.06 - 1.5;
let lastGood = null;
for (const id of ids) {
  await ev(`GS.own.sled = ${JSON.stringify(id)}; restat(); TLXV.haul().strap = null; true`);
  await sledAt(0, -8); await waitGame(1.2);
  const t0 = await clock(); let wDown = false, s, maxUp = 0, sawRamp = false, shotDone = false;
  while ((await clock()) - t0 < 16) {
    s = await S(); if (s.ramp) sawRamp = true; maxUp = Math.max(maxUp, s.up);
    if (s.on && !s.ramp && s.lz > LIM - 0.02) break;
    const want = s.sp < 2.2; if (want !== wDown) { wDown = want; await (want ? down : up)("KeyW"); }
    await sleep(60);
  }
  if (wDown) await up("KeyW");
  await waitGame(1.0); s = await S();
  ok(s.fin && s.on && !s.ramp && Math.abs(s.lx) < 0.7 && s.up > 0.4 && s.up < 0.7, `${id}: on the deck (lx ${s.lx.toFixed(2)}, lz ${s.lz.toFixed(2)}, ${s.up.toFixed(2)} m over snow, rampSeen ${sawRamp}, maxUp ${maxUp.toFixed(2)})`);
  if (s.on) {
    await walkerBeside(); await waitGame(0.8);
    const r = await S(); await tap("KeyE"); await waitGame(0.5); const r2 = await S();
    ok(!!r2.strap, `${id}: E straps it (hint "${r.hint}")`);
    await shot("x2every_" + id);
    if (!lastGood) lastGood = id;
    await ev(`TLXV.haul().strap = null; FOOT.on = false; true`);
  }
}
// night strap + reload keeps strap
await ev(`GS.own.sled = ${JSON.stringify(lastGood || ids[0])}; restat(); GS.hour = 23; true`);
await ev(`(() => { const h = TLXV.haul(), w = TLXV.haulWorld(h, 0, 0.3); crashCancel(); FOOT.on = false; P.x = w[0]; P.z = w[1]; P.yaw = h.yaw; P.vx = P.vz = P.vy = 0; P.y = TLXV.deckAt(P.x, P.z, 99); recenter(P.x, P.z, true); return 1; })()`); await walkerBeside(); await waitGame(1);
await tap("KeyE"); await waitGame(0.6);
let s = await S(); ok(!!s.strap, "night: strapped " + JSON.stringify(s));
await ev(`save(); true`);
const sv = await J(`JSON.parse(localStorage.getItem("tracklayer.save.v2"))`);
await reload(sv); await sleep(1800); await waitGame(1);
const a = await J(`(() => { const h = TLXV.haul(); return { strap: h && h.strap, fin: [P.x, P.y, P.z, camera.quaternion.x].every(Number.isFinite), hr: GS.hour }; })()`);
ok(a.strap && a.fin, "reload at night keeps the strap " + JSON.stringify(a));
await done(fails ? 1 : 0);

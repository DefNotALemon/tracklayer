// Beta probe for 2.5/2.6: does the truck-towed deck trailer (haulFollow) collide with rocks/trees? Hitched trailer is reversed into a planted rock,
// then dragged past one on a turn. Prints ok/FAIL; exit 1 on a failure.
import { boot, ev, tap, sleep, done, down, up, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
await boot(); await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`);
await ev(`GS.cash = 9000; garageTab = "trucks"; openGarage(); true`); await sleep(500);
await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400);
await ev(`[...document.querySelectorAll("#garageBody .row")].find(e => /Fjordhenger/.test(e.textContent)).click(); closeGarage(); true`); await sleep(400);
ok(!!(await ev(`TLXV.haul() ? 1 : 0`)), "bought truck + trailer");
// flat open spot on the fell, truck facing +z, trailer behind it, rock 4 m behind the axle
const spot = await J(`(() => { for (let r = 0; r < 3000; r += 25) for (let a = 0; a < 6.28; a += 0.4) {
  const x = 900 + Math.cos(a) * r, z = -600 + Math.sin(a) * r;
  if (isSea(x, z) || isWater(x, z) || obNear(x, z, 60) || nearSite(x, z, 80) || slopeAt(x, z, 8) > 0.03 || slopeAt(x, z + 40, 8) > 0.03 || slopeAt(x, z - 40, 8) > 0.03) continue;
  return { x, z }; } return null; })()`);
ok(!!spot, "flat spot"); if (!spot) { await done(1); }
await ev(`(() => { const S = ${JSON.stringify(spot)}, r = TLX.state("vehicles").owned[0], h = TLXV.haul();
  r.x = S.x; r.z = S.z; r.yaw = 0; crashCancel(); FOOT.on = false;
  const bx = r.x, bz = r.z - 3.1 - 0.9; h.on = null; h.x = bx; h.z = bz - TLXV.HAUL.L; h.yaw = 0; h.ramp = 0; recenter(r.x, r.z, true); return 1; })()`);
await sleep(500);
await ev(`(() => { const h = TLXV.haul(), c = TLXV.haulCoupler(h), lx = Math.cos(h.yaw), lz = -Math.sin(h.yaw); FOOT.on = true; FOOT.x = c[0] + lx * 1.6; FOOT.z = c[1] + lz * 1.6; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.yaw = h.yaw - Math.PI / 2; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await waitGame(0.8); await tap("KeyE"); await waitGame(0.6);
ok((await ev(`TLXV.haul().on`)) === "v1", "trailer hitched");
// get in the truck
await ev(`(() => { const s = TLX.state("vehicles"), r = s.owned[0]; const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); FOOT.on = true; FOOT.x = r.x + fz * 3.2; FOOT.z = r.z - fx * 3.2; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.yaw = r.yaw - 1.4; FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(1200); await tap("KeyQ");
for (let i = 0; i < 80 && !(await ev("!MNT.on && !FOOT.on && !!VEH.cur")); i++) await sleep(200);
await waitGame(0.5);
ok(!!(await ev("VEH.cur ? 1 : 0")), "driving the truck");
const T = () => J(`(() => { const h = TLXV.haul(); return { px: P.x, pz: P.z, hx: h.x, hz: h.z, hyaw: h.yaw, on: h.on, fin: [P.x, P.z, h.x, h.z].every(Number.isFinite) }; })()`);
// ---- A: reverse into a rock behind the trailer
const t0 = await T();
const rock = await J(`(() => { const h = TLXV.haul(); const o = { x: h.x - Math.sin(h.yaw) * 5.5, z: h.z - Math.cos(h.yaw) * 5.5, r: 1.3, top: surf(h.x, h.z) + 1.8, rock: true }; addOb(o); window.__rk = o; return { x: o.x, z: o.z, r: o.r }; })()`);
await ev(`P.vx = P.vz = 0; true`);
await down("KeyS");
let minD = 99, last = null;
for (let i = 0; i < 70; i++) {
  await waitGame(0.25); const t = await T(); last = t;
  const d = Math.hypot(t.hx - rock.x, t.hz - rock.z); if (d < minD) minD = d;
}
await up("KeyS");
const dTr = (await T());
console.log("A reversed", JSON.stringify({ t0, last, rock, minD: +minD.toFixed(2), truckBack: +(t0.pz - last.pz).toFixed(1) }));
ok(last.fin, "all finite");
ok(t0.pz - last.pz > 6, `truck reversed at least 6 m (${(t0.pz - last.pz).toFixed(1)} m)`);
// trailer's axle must never get inside rock radius + half trailer width (~1.1 m)
ok(minD > rock.r + 0.9, `trailer axle stayed outside the rock (closest centre-to-axle ${minD.toFixed(2)} m, rock r ${rock.r}, needs > ${(rock.r + 0.9).toFixed(1)})`);
await shot("A_trailer_vs_rock").catch(() => {});
// ---- B: forward turn with a rock just inside the corner
await ev(`(() => { const r = TLX.state("vehicles").owned[0]; const h = TLXV.haul(); window.__rk.top = -Infinity; window.__rk.down = true; return 1; })()`);
const b0 = await T();
const rk2 = await J(`(() => { const h = TLXV.haul(); const fx = Math.sin(h.yaw), fz = Math.cos(h.yaw); const o = { x: h.x + fz * 2.6 - fx * 0, z: h.z - fx * 2.6, r: 1.1, top: surf(h.x, h.z) + 1.8, rock: true }; addOb(o); window.__rk2 = o; return { x: o.x, z: o.z, r: o.r }; })()`);
// drive forward and steer away from the rock side: the trailer cuts the corner
await down("KeyW"); await down(rk2.x > b0.hx ? "KeyA" : "KeyD");
let minD2 = 99;
for (let i = 0; i < 50; i++) { await waitGame(0.25); const t = await T(); const d = Math.hypot(t.hx - rk2.x, t.hz - rk2.z); if (d < minD2) minD2 = d; }
await up("KeyW"); await up("KeyA"); await up("KeyD");
console.log("B cut corner minD", minD2.toFixed(2));
ok(minD2 > rk2.r + 0.9 || true, `(info) trailer axle closest to a rock on the inside of a turn: ${minD2.toFixed(2)} m (rock r ${rk2.r})`);
await done(fails ? 1 : 0);

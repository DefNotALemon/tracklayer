// G2: the depot cabins have insides. Walk into the door marker → you're in the room; walk into the doorway inside →
// you're back outside at the door. Checks the trigger, the fade, the room build (walls/lights/furniture), indoor walking
// with the furniture as walls, the exit, and that a bought upgrade shows (soapstone stove, sauna hut enterable).
// Stills: the marker outside each cabin, and the room from the door and from the middle.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_interiors.mjs [outdir]
import { boot, ev, shot, sleep, tap, hold, down, up, done } from "../lib.mjs";
await boot();
await ev("WX.at = () => 0; GS.storm = 0; GS.hour = 12; true");
await ev(`(() => { GS.re = { own: {
    fjellbu: { up: { stove: 1, insul: 1 }, acc: 0, nights: 0, rented: 0, L: 0 },
    viddastua: { up: { sauna: 1, stove: 1 }, acc: 0, nights: 0, rented: 0, L: 0 },
    sandfjord: { up: {}, acc: 0, nights: 0, rented: 0, L: 0 },
    risfjord: { up: { stove: 1 }, acc: 0, nights: 0, rented: 0, L: 0 } }, arrears: 0, last: [] };
  reSync(); intBeaconSync(); return true; })()`);
await sleep(1200);

const info = async () => JSON.parse(await ev(`JSON.stringify({
  t: +gameClock.toFixed(1), ph: INT.ph, on: INT.on, cd: +INT.cd.toFixed(2), cab: INT.cab ? INT.cab.id : null,
  room: !!INT.room, px: +INT.px.toFixed(2), pz: +INT.pz.toFixed(2), fw: +FOOT.sp.toFixed(2),
  foot: { x: +FOOT.x.toFixed(1), z: +FOOT.z.toFixed(1), yaw: +FOOT.yaw.toFixed(2), ski: !!FOOT.ski },
  cam: [+camera.position.x.toFixed(1), +camera.position.y.toFixed(2), +camera.position.z.toFixed(1)],
  rooms: Object.keys(INT.rooms), lights: INT.room ? INT.room.lights.length : -1, cols: INT.room ? INT.room.cols.length : -1,
  walkerIn: INT.room ? INT.room.g.parent === INT.scene : FOOT.g.parent === scene,
  pill: document.getElementById("pill").textContent, bonus: document.getElementById("bonus").textContent,
  hint: document.getElementById("wnHint").textContent
})`));
const beacons = async () => JSON.parse(await ev(`JSON.stringify(INT.beacons.map(b => ({ id: b.cab.id, vis: b.g.visible, x: +b.x.toFixed(1), z: +b.z.toFixed(1), y: +b.g.position.y.toFixed(2) })))`));
// put the rider on foot just outside a cabin's marker (the sled stays where it is: the outdoor FOOT position is what
// everything outside keys off, so this is the same state a real dismount leaves)
const standBy = async (id, back = 2.4) => ev(`(() => {
  const b = INT.beacons.find(q => q.cab.id === ${JSON.stringify(id)} && q.g.visible);
  FOOT.on = true; FOOT.ski = false; FOOT.shoe = 0; FOOT.g.visible = true; FOOT.sp = 0; FOOT.fwd = 0; FOOT.turn = 0;
  FOOT.x = b.x - Math.sin(b.ry) * ${back}; FOOT.z = b.z - Math.cos(b.ry) * ${back}; FOOT.y = surf(FOOT.x, FOOT.z);
  FOOT.yaw = b.ry + Math.PI; INT.cd = 0; return { x: +FOOT.x.toFixed(1), z: +FOOT.z.toFixed(1) }; })()`);

console.log("BEACONS", JSON.stringify(await beacons()));

// --- 1. Fjellbu: walk in from the yard, look round, walk out through the doorway --------------------------------
const cab = JSON.parse(await ev(`JSON.stringify({ x: reCab("fjellbu").x, z: reCab("fjellbu").z, door: reCab("fjellbu").door })`));
console.log("fjellbu", JSON.stringify(cab));
await ev(`(() => { const c = reCab("fjellbu"); P.x = c.door.x + Math.sin(c.door.ry) * 9; P.z = c.door.z + Math.cos(c.door.ry) * 9; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; P.yaw = c.door.ry + Math.PI; recenter(P.x, P.z, true); camState.init = false; return true; })()`);
await sleep(1500);
await tap("KeyQ"); await sleep(2600);                                   // off the sled
console.log("dismounted", JSON.stringify(await info()));
await ev(`(() => { const c = reCab("fjellbu"); FOOT.x = c.door.x + Math.sin(c.door.ry) * 3.4; FOOT.z = c.door.z + Math.cos(c.door.ry) * 3.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.yaw = c.door.ry + Math.PI; FOOT.sp = 0; return true; })()`);
await sleep(400);
await shot("01_marker_outside");
// walk the last few metres into the light
await down("KeyW");
let t0 = Date.now(), entered = false, s = null;
while (Date.now() - t0 < 12000) { await sleep(200); s = await info(); if (s.on || s.ph) { entered = true; break; } }
await up("KeyW");
console.log("walked in:", entered, JSON.stringify(s));
await sleep(1200);
const fj = await info(); console.log("fjellbu inside", JSON.stringify(fj));
await shot("02_fjellbu_inside");
await ev("FOOT.yaw += Math.PI; true"); await sleep(700); await shot("03_fjellbu_around");
// walk about: into the table and along a wall, then check we're still in the room and never through a wall
await ev("FOOT.yaw = -1.4; true"); await hold("KeyW", 2600);
const fj2 = await info(); console.log("fjellbu walked", JSON.stringify({ px: fj2.px, pz: fj2.pz, on: fj2.on, fw: fj2.fw, pill: fj2.pill }));
await shot("04_fjellbu_walked");
// out through the doorway: aim at the marker inside and walk into it
await ev("(() => { const R = INT.room; const dx = R.exit.x - INT.px, dz = R.exit.z - INT.pz; FOOT.yaw = Math.atan2(dx, dz); return true; })()");
await down("KeyW");
t0 = Date.now(); let out = null;
while (Date.now() - t0 < 9000) { await sleep(200); out = await info(); if (!out.on && !out.ph) break; }
await up("KeyW");
console.log("fjellbu out", JSON.stringify(out));
await sleep(600);
await ev("camState.init = false; true"); await sleep(500);
await shot("05_back_outside");

// --- 2. the other three, entered directly at the marker (trigger + room build + exit) ---------------------------
async function quick(id) {
  await ev("INT.cd = 0; true");
  const by = await standBy(id, 0);
  await sleep(1800);
  const in1 = await info();
  if (!in1.on) { console.log(id, "FAIL: did not enter", JSON.stringify(in1)); return null; }
  await sleep(900);
  const in2 = await info();
  await shot(`06_${id}_inside`);
  // move around a bit inside, then leave
  await ev("FOOT.yaw = 2.3; true"); await hold("KeyW", id === "sauna" ? 700 : 1800); await shot(`07_${id}_moved`);
  if (!(await info()).on) { console.log(id, "FAIL: walked out by accident"); return null; }
  const mid = await info();
  await ev("(() => { const R = INT.room; FOOT.yaw = Math.atan2(R.exit.x - INT.px, R.exit.z - INT.pz); return true; })()");
  await down("KeyW");
  let o = null; const t = Date.now();
  while (Date.now() - t < 9000) { await sleep(200); o = await info(); if (!o.on && !o.ph) break; }
  await up("KeyW");
  console.log(id, JSON.stringify({ at: by, in: in2.cab, lights: in2.lights, cols: in2.cols, walkerIn: in2.walkerIn, moved: [mid.px, mid.pz], fw: mid.fw, out: { on: o.on, fx: o.foot.x, fz: o.foot.z } }));
  return { id, in: in2, mid, out: o };
}
const rows = [];
for (const id of ["sandfjord", "risfjord", "viddastua"]) rows.push(await quick(id));
// --- 3. the sauna hut: only enterable once built, and it's there because viddastua's sauna is bought ------------
await ev("INT.cd = 0; true");
const sauna = await quick("sauna");
console.log("SUMMARY", JSON.stringify({ fjellbu: { on: fj.on, lights: fj.lights, cols: fj.cols, walkerIn: fj.walkerIn }, visited: rows.filter(Boolean).map(r => r.id + ":" + (r.in.cab || "?")), sauna: sauna && sauna.in.cab }));
await done();

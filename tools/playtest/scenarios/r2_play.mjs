// R2 the sleds in play: a ride over rough powder on two machines (suspension parts must stay attached and unstretched), a crash,
// first person, the track rolling. Stills into $OUT (NOSTILLS=1: asserts only). Prints FAIL lines, exit 1 on any.
// Run: tools/playtest/run.sh tools/playtest/scenarios/r2_play.mjs <outdir>     (VW/VH for the viewport, LOW=1 plants the low preset before boot)
import { boot, ev, raw, shot, done, sleep, down, up, errors, park, reload } from "../lib.mjs";
const STILLS = !process.env.NOSTILLS, fails = [];
const ok = (c, m) => { if (!c) { fails.push(m); console.log("FAIL " + m); } else console.log("  ok " + m); };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot({ width: process.env.VW ? +process.env.VW : 1280, height: process.env.VH ? +process.env.VH : 720 });
if (process.env.LOW) { await raw(`localStorage.setItem("tracklayer.set.v1", JSON.stringify({ gfx: "low" })); true`); await reload(); ok((await J("({ l: TLXL.lite })")).l, "low preset planted before boot"); }
await ev("tutSkip(); WX.at = () => 0; GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + 12 + 120 * 24; FOOT.on = false; VEH.cur = null; crashCancel(); camState.init = false; true");
await ev(`(() => { QG.on = false; renderer.setPixelRatio(${process.env.PR || 1.5}); renderer.setSize(innerWidth, innerHeight); return true; })()`);
await sleep(1200);
const spot = await park("P.x + 400", "P.z + 300"); console.log("parked", JSON.stringify(spot));
const snap = async n => { if (STILLS) { await sleep(300); await shot(n); } };
// the machine's parts in sled space: every visible mesh's bounding box centre, and the skis' pivots
const PARTS = (id) => `(() => { sledRoot.updateMatrixWorld(true); const mc = V.machineOf(${JSON.stringify(id)}), b = new THREE.Box3(), inv = new THREE.Matrix4().copy(sledBody.matrixWorld).invert(), fin = [];
  const vis = o => { for (let p = o; p && p !== sledRoot; p = p.parent) if (!p.visible) return false; return true; };
  [mc, V.track].forEach(root => root.traverse(o => { if (o.isMesh && vis(o) && !(() => { for (let p = o; p; p = p.parent) if (p === V.rider || p === V.tab) return true; return false; })() && !o.frustumCulled === false) { o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)); b.union(bb); const c = bb.getCenter(new THREE.Vector3()); fin.push(c.x, c.y, c.z); } }));
  const sk = mc.userData.skis.map(p => [p.position.x, p.position.y, p.position.z]);
  return { size: [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z], finite: fin.every(Number.isFinite), skis: sk, n: fin.length / 3 }; })()`;
for (const id of ["frontier", "apex"]) {
  await ev(`GS.own.sled = ${JSON.stringify(id)}; restat(); applyLoadout(); crashCancel(); FOOT.on = false; P.vx = P.vz = P.vy = 0; P.yaw = 0; P.y = surf(P.x, P.z) + 0.3; camMode = 1; camState.init = false; window.camOv = null; true`);
  await sleep(900);
  const a = await J(PARTS(id));
  const u0 = await J(`({ u: V.beltU.value, wa: V.wheelA.rotation.x })`);
  await down("KeyW"); let sn = 0;
  let vmax = 0;
  for (let i = 0; i < 40; i++) { await sleep(180); vmax = Math.max(vmax, await ev("Math.hypot(P.vx, P.vz)")); if (i === 18 && i % 2 === 0) await ev("input.steer = 0; true"); if (STILLS && (i === 14 || i === 24)) { await shot(`${id}_ride_${sn++}`); } if (i === 12) await down("KeyA"); if (i === 20) { await up("KeyA"); await down("KeyD"); } if (i === 28) await up("KeyD"); }
  await up("KeyW"); await sleep(1200);
  const v = await J(`({ sp: Math.hypot(P.vx, P.vz), u: V.beltU.value, wa: V.wheelA.rotation.x })`);
  const b = await J(PARTS(id));
  ok(vmax > 3, `${id}: rode at up to ${vmax.toFixed(1)} m/s over rough snow`);
  ok(v.u !== u0.u && v.wa !== u0.wa, `${id}: belt and wheels rolled (${u0.u.toFixed(1)} -> ${v.u.toFixed(1)})`);
  ok(b.finite && b.n === a.n, `${id}: every part still finite (${a.n} -> ${b.n} meshes)`);
  ok(Math.abs(b.size[0] - a.size[0]) < 0.12 && Math.abs(b.size[1] - a.size[1]) < 0.12 && Math.abs(b.size[2] - a.size[2]) < 0.12, `${id}: nothing stretched or detached (${a.size.map(x => x.toFixed(2))} -> ${b.size.map(x => x.toFixed(2))})`);
  ok(b.skis.every((p, i) => Math.hypot(p[0] - a.skis[i][0], p[1] - a.skis[i][1], p[2] - a.skis[i][2]) < 0.02), `${id}: ski pivots stayed on their mounts`);
  // first person
  await ev("camMode = VIEWS.findIndex(v => v.fp); camState.init = false; true"); await sleep(1400); await snap(`${id}_fp`);
  await ev("camMode = 1; camState.init = false; true");
  // a crash at speed
  await ev("P.vx = 0; P.vz = 25; true"); await ev("crashEject('test', 0, 1, 25, null); true"); await sleep(1800); await snap(`${id}_crash0`); await sleep(1500); await snap(`${id}_crash1`);
  const c = await J(PARTS(id)); ok(c.finite, `${id}: parts finite after a crash`);
  await ev("crashCancel(); FOOT.on = false; true");
}
await sleep(300);
ok(errors.length === 0, "no page errors " + errors.slice(0, 3).join(" | "));
await done(fails.length ? 1 : 0);

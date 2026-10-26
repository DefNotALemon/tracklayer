// G3 frozen lakes: do they read as snow-covered lake ice (wind streaks, scoured blue patches, a little sky sheen) or a
// flat pale disc? Weather pinned clear. Lake 3 (900, 300, r 300), the big one nearest the start. Shots, Nov 1 noon (sun 4°)
// and 1 March noon: from the shore 25 m up looking ~150 m onto the ice across the sun (`shore`), a vista 120 m up from
// 650 m out (`vista`), and at rider height 2 m up on the ice 40 m from the shore looking out (`low`, near patch + far
// terrain meet). Lake-only numbers: tools/playtest/lakestats.py <outdir> (crops where the ice fills the frame).
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_lake.mjs
import { boot, ev, shot, sideCam, sleep, done } from "../lib.mjs";

await boot(); await sideCam();
await ev("WX.at = () => 0; GS.storm = 0; true");
const noon = async (offDays = 0) => { await ev(`GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + 12 + ${offDays * 24}; camState.init = false; true`); await sleep(1500); };
const L = JSON.parse(await ev(`JSON.stringify(LAKES[3])`)); console.log("lake", L);
// a: bearing (rad) from the lake centre to the camera; put the sled there so the near snow patch follows
const place = (x, z) => ev(`(() => { P.x = ${x}; P.z = ${z}; P.y = surf(${x}, ${z}) + 0.5; P.vx = P.vy = P.vz = 0; P.safe = { x: P.x, z: P.z, yaw: P.yaw }; recenter(P.x, P.z, true); camState.init = false; return true; })()`);
const cam = (x, z, up, tx, tz, tup) => ev(`(() => { window.camOv = c => { c.position.set(${x}, surf(${x}, ${z}) + ${up}, ${z}); c.lookAt(${tx}, surf(${tx}, ${tz}) + ${tup}, ${tz}); }; return true; })()`);
const sunA = Number(await ev("Math.atan2(sunDir.z, sunDir.x)"));
const set = async tag => {
  const a = sunA + Math.PI / 2;                                  // camera off to the side of the sun: look across it
  const sx = L.x + Math.cos(a) * L.r * 1.05, sz = L.z + Math.sin(a) * L.r * 1.05;
  await place(sx, sz); await sleep(2500);
  await cam(sx, sz, 25, L.x + Math.cos(a) * L.r * 0.55, L.z + Math.sin(a) * L.r * 0.55, 0); await sleep(1200); await shot(`${tag}_shore`);
  const vx = L.x + Math.cos(a) * 650, vz = L.z + Math.sin(a) * 650;
  await place(vx, vz); await sleep(2500);
  await cam(vx, vz, 120, L.x, L.z, 0); await sleep(1200); await shot(`${tag}_vista`);
  const lx = L.x + Math.cos(a) * (L.r - 40), lz = L.z + Math.sin(a) * (L.r - 40);
  await place(lx, lz); await sleep(2500);
  await cam(lx, lz, 2, L.x + Math.cos(a + 0.4) * 60, L.z + Math.sin(a + 0.4) * 60, 0.5); await sleep(1200); await shot(`${tag}_low`);
};
await noon(0); await set("01_nov");
await noon(120); await set("02_mar");
await ev("window.camOv = null; true");
await done();

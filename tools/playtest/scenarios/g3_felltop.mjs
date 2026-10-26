// G3 fell-top vista: from a fell top / high spot, a camera 80 m up pitched ~6° down looks across,
// across the sun both ways and 25° off it at Nov 1 noon (sun 4°) and 1 March noon, over the land 0.4-2.5 km out where the baked
// cast shadows of the fells would land. Weather pinned clear. (b53 tried baked hill shadows here: not landed, see PROGRESS.)
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_felltop.mjs
import { boot, ev, shot, sideCam, sleep, done } from "../lib.mjs";

await boot(); await sideCam();
await ev("WX.at = () => 0; GS.storm = 0; true");
const noon = async (offDays = 0) => { await ev(`GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + 12 + ${offDays * 24}; camState.init = false; true`); await sleep(2500); };
const aim = a => ev(`(() => { const s = Math.atan2(sunDir.z, sunDir.x) + ${a} * Math.PI / 180, dx = Math.cos(s), dz = Math.sin(s), y = surf(P.x, P.z) + 80;
  window.camOv = c => { c.position.set(P.x, y, P.z); c.lookAt(P.x + dx * 1000, y - 110, P.z + dz * 1000); }; return true; })()`);
const set3 = async tag => { for (const [n, a] of [["across", 90], ["across2", -90], ["toward", 25]]) { await aim(a); await sleep(1500); await shot(`${tag}_${n}`); } };
// the highest open spot within 2.5 km of SPAWN (a fell top: views over the land below)
console.log("spot", await ev(`(() => {
  let best = null;
  for (let r = 300; r < 2500; r += 60) for (let a = 0; a < 6.28; a += 0.15) {
    const x = SPAWN.x + Math.cos(a) * r, z = SPAWN.z + Math.sin(a) * r;
    if (isSea(x, z) || isWater(x, z) || obNear(x, z, 30)) continue;
    const h = surf(x, z); if (!best || h > best.h) best = { x, z, h };
  }
  P.x = best.x; P.z = best.z; P.y = best.h + 0.5; P.vx = P.vy = P.vz = 0; P.safe = { x: best.x, z: best.z, yaw: P.yaw };
  recenter(best.x, best.z, true); camState.init = false; return JSON.stringify({ x: Math.round(best.x), z: Math.round(best.z), h: Math.round(best.h) });
})()`));
await noon(0); await sleep(2000);
await set3("01_top_nov");
await noon(120);
await set3("02_top_mar");
await ev("window.camOv = null; true");
await done();

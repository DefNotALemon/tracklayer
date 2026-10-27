// G3 snow LOD line (owner note 26 Oct 23:40): Lemon sees a drastic change in the snow ~9-12 m from the player.
// Parks on open, gentle backcountry fell (pinned search from SPAWN, clear weather), then shoots the same views at
// noon / 15:00 / 21:00: the game's own chase camera (sled still), and a low "along the snow" camera 1.0 m up.
// SL_VARIANTS=1 also shoots the noon chase view with each candidate term of the snow patch shader switched off
// (wraps patchMat.onBeforeCompile with a string replace), to find which term draws the line.
// Prints the screen rows where the ground 6/9/12/15/25/45 m ahead of the chase camera lands, so a band crop can be cut.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_snowlod.mjs <outdir>
import { boot, ev, shot, camOff, sleep, done } from "../lib.mjs";

await boot();
await ev("WX.at = () => 0; GS.storm = 0; true");
const spot = await ev(`(() => {
  const x0 = SPAWN.x, z0 = SPAWN.z;
  for (let r = 1500; r < 5000; r += 100) for (let a = 0; a < 6.28; a += 0.3) {
    const x = x0 + Math.cos(a) * r, z = z0 + Math.sin(a) * r;
    if (isSea(x, z) || isWater(x, z) || obNear(x, z, 60)) continue;
    if ([[0, 0], [40, 0], [-40, 0], [0, 40], [0, -40]].some(([u, v]) => bioAt(x + u, z + v) !== 0)) continue;
    if (SITES.some(s => Math.hypot(s.x - x, s.z - z) < 600)) continue;
    if (Math.abs(groundAt(x + 20, z) - groundAt(x - 20, z)) > 1.2 || Math.abs(groundAt(x, z + 20) - groundAt(x, z - 20)) > 1.2) continue;
    P.x = x; P.z = z; P.y = surf(x, z) + 0.5; P.vx = P.vy = P.vz = 0; P.yaw = 0.6; P.safe = { x, z, yaw: P.yaw };
    recenter(x, z, true); camState.init = false; return JSON.stringify({ x: Math.round(x), z: Math.round(z) });
  }
  return "none";
})()`);
console.log("spot", spot);
const at = async h => { await ev(`GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + ${h}; P.vx = P.vy = P.vz = 0; camState.init = false; true`); await sleep(1800); };
const rows = async tag => console.log(tag, await ev(`(() => { const c = camera, f = new THREE.Vector3(); c.getWorldDirection(f); f.y = 0; f.normalize();
  const out = {}; for (const d of [6, 9, 12, 15, 25, 45]) { const x = c.position.x + f.x * d, z = c.position.z + f.z * d;
    const v = new THREE.Vector3(x, surf(x, z), z).project(c); out[d] = Math.round((1 - v.y) / 2 * innerHeight); }
  return JSON.stringify({ camY: +(c.position.y - surf(c.position.x, c.position.z)).toFixed(2), rows: out }); })()`));
const low = `window.camOv = c => { const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw), x = P.x - fx * 3, z = P.z - fz * 3;
  c.position.set(x, surf(x, z) + 1.0, z); c.lookAt(P.x + fx * 30, surf(P.x + fx * 30, P.z + fz * 30) + 0.2, P.z + fz * 30); }; true`;

for (const [h, tag] of [[12, "noon"], [15, "h15"], [21, "night"]]) {
  await at(h);
  await shot(`${tag}_chase`); if (h === 12) await rows("rows_chase");
  await ev(low); await sleep(500); await shot(`${tag}_low`); if (h === 12) await rows("rows_low"); await camOff();
}
if (process.env.SL_VARIANTS) {
  const V = {
    relief: [["normal = normalize(normal - (viewMatrix", "normal = normalize(normal - 0.0 * (viewMatrix"]],
    micro: [["if (uMicroK > 0.01) {", "if (false) {"]],
    sparkle: [["col += step(0.985, rnd)", "col += 0.0 * step(0.985, rnd)"]],
    sheen: [["fr * uSkyK * skyW", "0.0 * uSkyK * skyW"]],
    warm: [["outgoingLight += reflectedLight.directDiffuse * (uSunRef - 1.0)", "outgoingLight += 0.0 * reflectedLight.directDiffuse * (uSunRef - 1.0)"]],
  };
  await at(12);
  for (const [name, reps] of Object.entries(V)) {
    await ev(`(() => { const ob = window.__ob0 || (window.__ob0 = patchMat.onBeforeCompile); const R = ${JSON.stringify(reps)};
      patchMat.onBeforeCompile = function (sh) { ob(sh); for (const [a, b] of R) { if (!sh.fragmentShader.includes(a)) console.warn("miss " + a); sh.fragmentShader = sh.fragmentShader.split(a).join(b); } };
      patchMat.customProgramCacheKey = () => "v_${name}"; patchMat.needsUpdate = true; return true; })()`);
    await sleep(900); await shot(`noon_chase_no_${name}`);
  }
}
await done();

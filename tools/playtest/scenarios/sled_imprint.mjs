// Sled track / ski groove / foot path imprint (Lemon, 12 Nov 2026): lays three straight lines on flat open snow with the real
// stamp()/xcGroove()/footPath(), asserts the depth field and trailTex, then shoots low chase-angle stills side by side.
// Also checks the ski groove's markTrail survives a recenter() away and back. Run: tools/playtest/run.sh <this> <outdir>
import { boot, ev, shot, camOff, sleep, done } from "../lib.mjs";
await boot();
await ev("tutSkip(); FOOT.on = false; VEH.cur = null; crashCancel(); true"); await sleep(400);
await ev("WX.at = () => 0; GS.storm = 0; GS.hour = 34; true");
const spot = await ev(`(() => {
  const x0 = SPAWN.x, z0 = SPAWN.z;
  for (let r = 1500; r < 5000; r += 100) for (let a = 0; a < 6.28; a += 0.3) {
    const x = x0 + Math.cos(a) * r, z = z0 + Math.sin(a) * r;
    if (isSea(x, z) || isWater(x, z) || obNear(x, z, 60)) continue;
    if ([[0,0],[40,0],[-40,0],[0,40],[0,-40],[0,80]].some(([u, v]) => bioAt(x + u, z + v) !== 0)) continue;
    if (SITES.some(s => Math.hypot(s.x - x, s.z - z) < 600)) continue;
    if (Math.abs(groundAt(x + 20, z) - groundAt(x - 20, z)) > 0.8 || Math.abs(groundAt(x, z + 40) - groundAt(x, z - 40)) > 0.8) continue;
    P.x = x; P.z = z; P.y = surf(x, z) + 0.5; P.vx = P.vy = P.vz = 0; P.yaw = 0; recenter(x, z, true); camState.init = false;
    return JSON.stringify({ x: Math.round(x), z: Math.round(z) });
  }
  return "none";
})()`);
console.log("spot", spot);
const { x: X, z: Z } = JSON.parse(spot);
// lines run along +z (heading fx=0,fz=1; lx=fz=1, lz=0). sled at X, ski at X+5, foot at X+9
const res = JSON.parse(await ev(`(() => {
  const out = {}; const fx = 0, fz = 1, lx = 1, lz = 0;
  P.wh = 0; P.yaw = 0;
  for (let i = 0; i < 160; i++) { P.x = ${X}; P.z = ${Z} + i * 0.2 - 10; P.vx = 0; P.vz = 5; stamp(fx, fz, lx, lz, 0.5); markTrail(P.x, P.z); }
  for (let i = 0; i < 160; i++) xcGroove(${X + 5}, ${Z} + i * 0.2 - 10, fx, fz);
  for (let i = 0; i < 160; i++) footPath(${X + 9}, ${Z} + i * 0.2 - 10, fx, fz);
  const pk = (x, z) => { const ix = Math.round((x + HALF) / CELL), iz = Math.round((z + HALF) / CELL); return +packOf(depthAt(ix, iz), freshAt(ix, iz)).toFixed(2); };
  out.sledCentre = pk(${X}, ${Z}); out.sledSki = pk(${X + 0.52}, ${Z} + 1); out.sledBerm = pk(${X + 0.8}, ${Z}); out.sledOff = pk(${X + 2}, ${Z});
  out.ski = pk(${X + 5 + 0.11}, ${Z}); out.foot = pk(${X + 9}, ${Z}); out.untouched = pk(${X + 14}, ${Z});
  const tr = (x, z) => trailData[(clamp(((z + HALF) / (WORLD / TR)) | 0, 0, TR - 1) * TR + clamp(((x + HALF) / (WORLD / TR)) | 0, 0, TR - 1)) * 4];
  out.trailSki = tr(${X + 5}, ${Z}); out.trailFoot = tr(${X + 9}, ${Z}); out.trailSled = tr(${X}, ${Z}); out.trailNone = tr(${X + 14}, ${Z});
  return JSON.stringify(out);
})()`));
console.log("pack", JSON.stringify(res));
// cross-section across the sled track at one row: surface height relative to untouched snow, every 12.5 cm
console.log("xsec(cm)", await ev(`(() => { const o = []; for (let u = -1.25; u <= 1.26; u += 0.125) { const x = ${X} + u, z = ${Z} + 3.1; o.push(Math.round((surf(x, z) - surf(${X + 14} + u, z)) * 100)); } return o.join(" "); })()`));
// recenter away and back: the ski trail must still be on the far trail map
await ev(`recenter(${X + 3000}, ${Z}, true); true`); await sleep(500);
await ev(`recenter(${X}, ${Z}, true); true`); await sleep(500);
const after = await ev(`trailData[(clamp(((${Z} + HALF) / (WORLD / TR)) | 0, 0, TR - 1) * TR + clamp(((${X + 5} + HALF) / (WORLD / TR)) | 0, 0, TR - 1)) * 4]`);
console.log("trailSki after recenter", after);
await ev(`window.__oR = renderer.render.bind(renderer); window.__cc = null; renderer.render = function (sc, cm) { const c = window.__cc; if (c) { cm.position.set(c.x, c.y, c.z); cm.lookAt(c.lx, c.ly, c.lz); } return window.__oR(sc, cm); }; true`);
const cam = (cx, h, back, look) => ev(`(() => { const x = ${cx}, z = ${Z} - ${back}, lz = ${Z} + ${look[1]}; window.__cc = { x, y: Math.max(surf(${X + 14}, z), surf(${cx} + 2, z), surf(${cx} - 2, z), surf(${cx}, z - 2)) + ${h}, z, lx: ${look[0]}, ly: surf(${X + 14}, lz) - 0.3, lz }; return 1; })()`);
await ev(`for (const id of ["help","speedo","job","mapWrap"]) { const e = document.getElementById(id); if (e) e.hidden = true; } document.querySelectorAll(".toast,#toasts,#tutCard,.tutcard").forEach(e => e.remove()); true`);
await ev(`P.x = ${X + 20}; P.z = ${Z} - 30; true`);
await cam(X + 4.5, 2.6, 6, [X + 4.5, 12]); await sleep(900); await shot("all3_low");
await cam(X + 0.3, 3.0, 4, [X + 0.3, 8]); await sleep(900); await shot("sled_low");
await cam(X + 5.1, 2.4, 3.5, [X + 5.1, 8]); await sleep(900); await shot("ski_low");
await cam(X + 9, 2.4, 3.5, [X + 9, 8]); await sleep(900); await shot("foot_low");
await cam(X + 6, 14, 18, [X + 6, 14]); await sleep(900); await shot("all3_high");
await ev("window.__cc = null; true");
const bad = res.sledCentre < 0.6 || res.ski < 0.2 || res.foot < 0.3 || res.untouched > 0.1 || res.trailSki < 100 || after < 100;
console.log(bad ? "FAIL" : "PASS");
await done(bad ? 1 : 0);

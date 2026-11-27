// Night shoot: the sled under a hint of aurora, for the Steam capsule and a night screenshot.
process.env.TL_URL = (process.env.TL_URL || "") + "?gfx=ultra";
const { boot, ev, shot, sleep, done, down, up, park } = await import("/Users/lemon/Documents/GitHub/tracklayer-steam/tools/playtest/lib.mjs");
await boot({ width: 1920, height: 1080 });
await ev("tutSkip(); WX.at = () => 0; WX.atT = () => 0; GS.storm = 0; GS.warmth = 100; true");
await ev("QG.on = false; renderer.setPixelRatio(1.25); true");
await ev(`(() => { const s = document.createElement('style'); s.textContent = 'body > *:not(#gl){visibility:hidden !important}'; document.head.appendChild(s);
  const rr = renderer.render.bind(renderer); renderer.render = (s2, c) => { if (window.camOv && s2 === scene) window.camOv(c); rr(s2, c); };
  // camera relative to the sled: f forward, r right, h above the snow at the camera; looks at a point lf ahead, lh above the sled
  window.__rel = (f, r, h, lf, lr, lh, fov) => { window.camOv = c => { const y = P.yaw, fx = Math.sin(y), fz = Math.cos(y), rx = Math.cos(y), rz = -Math.sin(y);
    const x = P.x + fx * f + rx * r, z = P.z + fz * f + rz * r, tx = P.x + fx * lf + rx * lr, tz = P.z + fz * lf + rz * lr;
    c.position.set(x, surf(x, z) + h, z); c.lookAt(tx, P.y + lh, tz); if (c.fov !== fov) { c.fov = fov; c.updateProjectionMatrix(); } }; };
  window.__eye = (x, z, h, lx, lz, lh, fov) => { window.camOv = c => { c.position.set(x, surf(x, z) + h, z); c.lookAt(lx, surf(lx, lz) + lh, lz); if (c.fov !== fov) { c.fov = fov; c.updateProjectionMatrix(); } }; };
  return true; })()`);
const info = async (t, e) => console.log(t, await ev(e));
const hour = h => ev(`GS.hour = Math.floor(GS.hour / 24) * 24 + ${h}; true`);
const rel = (...a) => ev(`window.__rel(${a.join(",")}); true`);
const eye = (...a) => ev(`window.__eye(${a.join(",")}); true`);
const snap = async (n, wait = 900) => { await sleep(wait); await shot(n, 93); console.log("shot", n, await ev("JSON.stringify({v: Math.round(Math.hypot(P.vx, P.vz)), roll: +(P.roll || 0).toFixed(2), gnd: P.gnd, aur: +AUR.v.toFixed(2), crash: CRASH.on})")); };
const ride = () => ev("crashCancel(); CRASH.cool = 1; FOOT.on = false; VEH.cur = null; camMode = 0; camState.init = false; true");
await info("date", "JSON.stringify({h: GS.hour, pn: CAL.isPolarNight()})");

let k = 0;
for (const [lvl, h] of [[0.5, 22.5], [0.75, 22.5], [0.5, 15.5]]) {
  await ev(`AUR.level = () => ${lvl}; true`); await hour(h);
  for (const yaw of [0, 1.57, 3.14, 4.71]) {
    await ride(); await park("depot.x + 700", "depot.z + 500");
    await ev(`P.yaw = ${yaw}; true`); await sleep(k ? 600 : 3000);
    await down("KeyW"); await sleep(2600);
    const t = `a${String(lvl * 100)}_h${Math.round(h)}_y${Math.round(yaw * 57.3)}`;
    await rel(-8.5, 1.6, 0.55, 30, 0, 7.5, 42); await snap(t + "_lowrear");
    if (lvl === 0.5 && h > 20) {
      await rel(-6, -2.4, 0.9, 30, 3, 6, 50); await snap(t + "_rearleft", 500);
      await rel(7, 2.6, 0.5, -20, -1, 6.5, 40); await snap(t + "_lowfront", 500);
      await rel(1, 7.5, 0.6, 1, -20, 5.5, 44); await snap(t + "_lowside", 500);
    }
    await up("KeyW"); k++;
  }
}
// the town under a faint sky
await ev("AUR.level = () => 0.5; true"); await hour(22.5);
await eye(-1300, -372, 1.5, -1360, -400, 7, 50); await snap("town_street_up", 1500);
await ev("window.__d = KIT.doors.map(d => ({x: d.x, z: d.z, D: Math.hypot(d.x - depot.x, d.z - depot.z)})).sort((a, b) => a.D - b.D); true");
const dep = JSON.parse(await ev("JSON.stringify([depot.x, depot.z])"));
for (const i of [0, 3]) {
  const d = JSON.parse(await ev(`JSON.stringify(window.__d[${i}])`));
  const L = Math.hypot(dep[0] - d.x, dep[1] - d.z) || 1, ux = (dep[0] - d.x) / L, uz = (dep[1] - d.z) / L;
  await eye(d.x + ux * 15, d.z + uz * 15, 1.2, d.x, d.z, 5.5, 48); await snap("town_house" + i + "_up", 900);
}
await done();

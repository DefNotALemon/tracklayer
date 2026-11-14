// x3_footcam_eave (beta 0165 #4): standing on foot just outside a site building (herder cabins, depots, village halls,
// homes), the garage or the hospital with your back to it, the camera behind you must not end up inside its walls or
// under its eaves. 0165 saw the whole screen go flat grey-blue facing east at the Sandfjorddalen cabin door at night:
// the third-person camera sat 0.1 m inside the cabin's wall box, because those buildings only had round obstacles
// (r 1.45 on a 1.9 m grid) that stop 0.4 m short of the walls and miss the 0.5 m roof overhang, and camWallClip only
// slab-tests a `box`. For every building and every face it stands the walker 1.0 m out from the eave line facing away,
// lets the camera settle, then asserts (a) the camera is outside the building's real footprint + eaves and (b) a ray
// from the camera to the walker's chest hits the walker before any other mesh (you can see yourself). Night, weather
// pinned. Exit 1 on any failure.
import { boot, ev, sleep, shot, done } from "../lib.mjs";
await boot();
await ev(`tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; GS.hour = 24 + 22; true`); await sleep(600);
// every building: centre, rotation (c, s as K.house: world = centre + u*(c, -s) + v*(s, c)), half sizes of walls+eaves
const B = JSON.parse(await ev(`(() => { const out = [];
  for (const s of SITES) { if (s.type === "shop" || s.type === "relay" || s.x === undefined) continue;
    const big = s.type === "depot", D = big ? 9 : s.kind === "village" ? 7 : 5.5, W = big ? 12 : s.kind === "village" ? 8 : 6.5;
    out.push({ n: s.id, x: s.x - 11, z: s.z, c: 1, s: 0, hu: D / 2 + 0.5, hv: W / 2 + 0.55 }); }
  out.push({ n: "garage", x: garageSite.x - 12, z: garageSite.z, c: 1, s: 0, hu: 5.8, hv: 4.3 });
  if (HOSP.built !== false || HOSP.x) out.push({ n: "hospital", x: HOSP.x, z: HOSP.z, c: Math.cos(HOSP.ry), s: Math.sin(HOSP.ry), hu: 9.1, hv: 5.6 });
  return JSON.stringify(out); })()`));
console.log("buildings", B.length, B.map(b => b.n).join(" "));
const fails = []; let n = 0, worstIn = 0, blocked = 0;
for (const b of B) {
  for (const [fu, fv] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (b.n === "hospital" && (fv === 1 || fu === -1)) continue;   // the entrance canopy out front and the ambulance bay on the left end are roofs you stand under
    const r = JSON.parse(await ev(`(() => { const b = ${JSON.stringify(b)}, fu = ${fu}, fv = ${fv};
      const u = fu ? fu * (b.hu + 1.0) : 0, v = fv ? fv * (b.hv + 1.0) : 1.6;   /* off the door ring on the door face */
      const x = b.x + u * b.c + v * b.s, z = b.z - u * b.s + v * b.c;
      const nx = fu * b.c + fv * b.s, nz = -fu * b.s + fv * b.c, yaw = Math.atan2(nx, nz);
      if (INT.on) intGoOut(); crashCancel(); camMode = 0; FOOT.on = true; FOOT.ski = false; FOOT.dig = false; FOOT.x = x; FOOT.z = z; FOOT.yaw = yaw;
      FOOT.y = surf(x, z) + 0.05; FOOT.sp = 0; FOOT.fwd = 0; FOOT.turn = 0; if (FOOT.g) FOOT.g.visible = true;
      P.x = x + nx * 30; P.z = z + nz * 30; P.y = surf(P.x, P.z) + 0.3; recenter(x, z, true);
      camState.init = false; camState.yaw = yaw; return JSON.stringify({ x, z, sea: isSea(x, z) }); })()`));
    if (r.sea) continue;
    await sleep(1300);
    const q = JSON.parse(await ev(`(() => { const b = ${JSON.stringify(b)}, c = camera.position;
      const px = c.x - b.x, pz = c.z - b.z, lu = px * b.c - pz * b.s, lv = px * b.s + pz * b.c;
      const inside = Math.min(b.hu - Math.abs(lu), b.hv - Math.abs(lv));
      const chest = new THREE.Vector3(FOOT.x, FOOT.y + 1.2, FOOT.z), dir = chest.clone().sub(c), L = dir.length(); dir.normalize();
      const rc = new THREE.Raycaster(c.clone(), dir, 0.05, L + 0.5); rc.camera = camera; let first = null;
      for (const h of rc.intersectObjects(scene.children, true)) { let o = h.object, vis = true, me = false; while (o) { if (!o.visible) vis = false; if (o === FOOT.g) me = true; o = o.parent; }
        if (!vis || h.object.isPoints || h.object.isSprite || (h.object.material && h.object.material.transparent && !me)) continue; first = { me, d: h.distance, n: h.object.geometry.type }; break; }
      return JSON.stringify({ inside: +inside.toFixed(2), first, L: +L.toFixed(2), cy: +(c.y - groundAt(c.x, c.z)).toFixed(2), fin: isFinite(camera.quaternion.x), int: !!(INT.on || INT.ph) }); })()`));
    if (q.int) { console.log(`skip ${b.n} face ${fu},${fv}: stood in a door ring`); await ev(`intGoOut(); true`); continue; }
    n++;
    const seen = q.first && (q.first.me || q.first.d > q.L - 0.35);
    if (q.inside > worstIn) worstIn = q.inside;
    const ok = q.inside <= 0 && seen && q.fin;
    if (!seen) blocked++;
    const tag = `${b.n} face ${fu},${fv}`;
    console.log(`${ok ? "ok  " : "FAIL"} ${tag}: camera ${q.inside > 0 ? "INSIDE by " + q.inside : "outside by " + (-q.inside)} m, ${q.L} m from chest, ${q.cy} m up, first hit ${q.first ? (q.first.me ? "walker" : q.first.n + " at " + q.first.d.toFixed(2)) : "none"}`);
    if (!ok) { fails.push(tag); if (fails.length <= 4) await shot("fail_" + b.n + "_" + fu + "_" + fv); }
    if (b.n === "sandfjord" && fu === 1) await shot("sandfjord_east");
  }
}
// 0165's exact spot: 2 m out from the Sandfjorddalen door ring, facing east (away from the cabin)
{
  const q = JSON.parse(await ev(`(() => { if (INT.on) intGoOut(); const b = INT.beacons[0]; FOOT.on = true; FOOT.x = b.x + Math.sin(b.ry) * 2; FOOT.z = b.z + Math.cos(b.ry) * 2; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.yaw = 1.57; recenter(FOOT.x, FOOT.z, true); camState.init = false; return JSON.stringify({ id: b.cab && b.cab.id }); })()`));
  await sleep(2500);
  const r = JSON.parse(await ev(`(() => { const c = camera.position, s = SITES.find(s => s.id === "sandfjord"), bx = s.x - 11; return JSON.stringify({ int: INT.on, gap: +(c.x - (bx + 5.5 / 2 + 0.5)).toFixed(2) }); })()`));
  await shot("sandfjord_0165_spot");
  const ok = q.id === "sandfjord" && !r.int && r.gap > 0;
  console.log(`${ok ? "ok  " : "FAIL"} 0165 spot (${q.id}): camera ${r.gap} m east of the cabin's eave line`);
  n++; if (!ok) fails.push("0165 spot");
}
console.log(`RESULT ${n} spots, ${fails.length} fail (camera inside worst ${worstIn.toFixed(2)} m, view blocked ${blocked})`);
if (n < 20) { console.log("FAIL too few spots tested"); await done(1); }
await done(fails.length ? 1 : 0);

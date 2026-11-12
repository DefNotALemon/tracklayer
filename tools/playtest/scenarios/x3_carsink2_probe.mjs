// probe (3.4b1): where is the drawn snow under a car on the road, vs the car's y (surf)?
import { boot, ev, sleep, done } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(1000);
for (const S of [811, 1500]) {
  await ev(`(() => { const p = TLXT.lanePt("skjanes", ${S} - 30, 1); P.x = p.cx + 12; P.z = p.cz + 12; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; recenter(P.x, P.z, true); const c = TLXT.place("skjanes", ${S}, 1); c.v = 0; TLXT.TRAF.passWait = 1e9; return true; })()`);
  await sleep(3000);
  const q = await J(`(() => { const c = TLXT.cars[0], fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), rx = -fz, rz = fx, o = [];
    const ms = []; scene.traverse(m => { if (m.isMesh && m.visible && !/traffic/.test(m.name) && m.geometry) ms.push(m); });
    for (const l of [-3, -1.2, 0, 1.2, 3]) { const x = c.x + rx * l, z = c.z + rz * l; const rc = new THREE.Raycaster(new THREE.Vector3(x, c.y + 6, z), new THREE.Vector3(0, -1, 0)); let hs = []; for (const m of ms) { try { hs.push(...rc.intersectObject(m, false)); } catch (e) {} } hs.sort((a, b) => a.distance - b.distance); o.push([l, +(surf(x, z) - c.y).toFixed(2), hs.slice(0, 2).map(h => [h.object.name || h.object.type, +(h.point.y - c.y).toFixed(2), h.object.material && h.object.material.type, h.object.geometry.attributes.position.count, h.object.parent && (h.object.parent.name || h.object.parent.type), +h.object.position.y.toFixed(2), h.object.material && h.object.material.transparent, h.object.renderOrder])]); }
    return { S: ${S}, v: c.v, o }; })()`);
  console.log(JSON.stringify(q));
}
await done(0);

// stills for beta fix 0127: the switchback loops on the Lebesby and fv888 climbs, seen from above and from the cab
// height, plus the pickup parked in one. Chase/aerial camera via sideCam.
import { boot, ev, sleep, done, shot, sideCam, camOff } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`); await sleep(500);
// the tightest loop on each climb route
const spots = await J(`["lebesby", "fv888"].map(id => { const r = TLXR.routes.find(q => q.id === id), p = r.pts; let mn = 1e9, at = 0;
  for (let i = 2; i < p.length - 5; i++) { const v = TLXR.turnR(p, i); if (v < mn) { mn = v; at = i; } } return { ri: TLXR.routes.indexOf(r), at, R: +mn.toFixed(1) }; })`);
console.log("spots", JSON.stringify(spots));
for (const s of spots) {
  for (const [k, back, up, ang] of [[0, 34, 30, Math.PI * 0.85], [1, 12, 5, Math.PI * 0.75]]) {
    await ev(`(() => { const p = TLXR.routes[${s.ri}].pts; const a = p[${s.at - 3}], b = p[${s.at}]; BOG.on = false; crashCancel(); P.x = a[0]; P.z = a[1]; P.yaw = Math.atan2(b[0]-a[0], b[1]-a[1]); P.vx = P.vz = 0; P.y = surf(a[0], a[1]) + 0.2; recenter(a[0], a[1], true); return 1; })()`);
    await sleep(1800); await sideCam(undefined, back, up, ang); await sleep(500); await shot(`loop_${s.ri}_${k}`); await camOff();
  }
}
await done(0);

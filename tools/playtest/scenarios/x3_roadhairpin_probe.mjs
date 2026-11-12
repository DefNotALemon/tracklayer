// 3.1 beta 0127 (v191): hairpin geometry per open route (min turning radius over 3-point windows, count under 8 m / 12 m) + stills of fv888 idx 138-152 and lebesby 112-120.
import { boot, ev, sleep, done, shot, sideCam, camOff } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`); await sleep(500);
const rep = await J(`TLXR.routes.filter(r => !r.closed).map(r => { const p = r.pts; let n8 = 0, n12 = 0, mn = 1e9, at = 0; const bad = [];
  for (let i = 2; i < p.length - 2; i++) { const a = p[i - 2], b = p[i], c = p[i + 2];
    const ab = Math.hypot(b[0]-a[0], b[1]-a[1]), bc = Math.hypot(c[0]-b[0], c[1]-b[1]), ca = Math.hypot(c[0]-a[0], c[1]-a[1]);
    const cr = Math.abs((b[0]-a[0])*(c[1]-a[1]) - (b[1]-a[1])*(c[0]-a[0])); const R = cr < 1e-6 ? 1e9 : ab*bc*ca/(2*cr);
    if (R < 8) { n8++; if (!bad.length || i - bad[bad.length-1] > 6) bad.push(i); } if (R < 12) n12++; if (R < mn) { mn = R; at = i; } }
  return { id: r.id, n: p.length, minR: +mn.toFixed(1), at, n8, n12, hairpins: bad.slice(0, 12) }; })`);
for (const r of rep) console.log("hair", JSON.stringify(r));
const look = async (ri, idx, name) => {
  await ev(`(() => { const r = TLXR.routes[${ri}]; const a = r.pts[${idx}], b = r.pts[${idx}+3]; BOG.on = false; crashCancel(); P.x = a[0]; P.z = a[1]; P.yaw = Math.atan2(b[0]-a[0], b[1]-a[1]); P.vx = P.vz = 0; P.y = surf(a[0], a[1]) + 0.2; recenter(a[0], a[1], true); return 1; })()`);
  await sleep(1500); await sideCam(undefined, 14, 11, Math.PI * 0.8); await sleep(400); await shot(name); await camOff();
};
await look(0, 144, "fv888_hairpin"); await look(4, 114, "lebesby_118");
await done(0);

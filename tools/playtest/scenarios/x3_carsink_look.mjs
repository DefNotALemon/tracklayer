// look (3.4b2a): a driven car side-on and three-quarter at day, low camera, to judge whether it sits on the snow
import { boot, ev, sleep, shot, done } from "../lib.mjs";
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 36; true`); await sleep(1000);
await ev(`(() => { const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); }; return true; })()`);
for (const S of [811, 1500]) {
  await ev(`(() => { const p = TLXT.lanePt("skjanes", ${S} - 30, 1); P.x = p.cx + 14; P.z = p.cz + 14; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; recenter(P.x, P.z, true); const c = TLXT.place("skjanes", ${S}, 1); c.v = 0; TLXT.TRAF.passWait = 1e9; TLXT.hold = true; return true; })()`);
  await sleep(2500);
  for (const [nm, ang, d, h] of [["side", 1.5708, 6, 0.9], ["q34", 0.8, 7, 1.4], ["low", -1.5708, 5, 0.5]]) {
    await ev(`window.camOv = cam => { const c = TLXT.cars[0], a = c.yaw + ${ang}; cam.position.set(c.x + Math.sin(a) * ${d}, c.y + ${h}, c.z + Math.cos(a) * ${d}); cam.lookAt(c.x, c.y + 0.6, c.z); }; true`);
    await sleep(600);
    await shot(`sink_${S}_${nm}`);
  }
  console.log(await ev(`JSON.stringify((() => { const c = TLXT.cars[0]; return { y: +c.y.toFixed(2), s: +surf(c.x, c.z).toFixed(2), v: c.v, st: c.st }; })())`));
}
await done(0);

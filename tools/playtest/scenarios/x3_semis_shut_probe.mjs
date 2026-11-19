// Probe: a dist semi stopped at a shut stretch later drives through it. Log shut flag, why, waiting, v each 2 game s.
import { boot, ev, sleep, done } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(1000);
const SI = await J(`TLXT.cars.findIndex(c => c.semi)`);
const rid = await J(`TLXT.routes.slice().sort((a, b) => b.len - a.len)[0].id`);
const s0 = await J(`TLXT.routes.find(q => q.id === "${rid}").s0 + 500`);
await ev(`(() => { crashCancel(); FOOT.on = false; const p = TLXT.lanePt("${rid}", ${s0} - 500, 1); P.x = p.cx + 90; P.z = p.cz + 90; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; recenter(P.x, P.z, true); TLXT.cars.forEach((c, i) => { if (i !== ${SI}) c.on = false; }); const c = TLXT.place("${rid}", ${s0}, 1, ${SI}, "dist"); c.v = 9; return true; })()`);
const gi = await J(`(() => { const c = TLXT.cars[${SI}], gs = c.r.rt.seg; let gi = -1; for (const g of gs) { if (!g.legs.length) continue; if (g.a > c.s + 120) { if (gi < 0 || g.a < gs[gi].a) gi = g.i; } } TLXR.setSnow("${rid}", 1, gi); return gi; })()`);
const t0 = await clock(); let last = -9;
while ((await clock()) - t0 < 60) {
  const t = (await clock()) - t0;
  if (t - last >= 2) { last = t; console.log(t.toFixed(0), JSON.stringify(await J(`(() => { const c = TLXT.cars[${SI}], g = c.r.rt.seg[${gi}]; return { s: +c.s.toFixed(0), v: +c.v.toFixed(1), why: c.why, w: !!c.waiting, t: +(c.t||0).toFixed(1), st: c.st, shut: g.shut, snow: TLXR.status("${rid}"), on: c.on, hold: TLXT.hold, pass: c.pass, dd: Math.hypot(c.x-P.x,c.z-P.z)|0 }; })()`))); }
  await sleep(150);
}
await done(0);

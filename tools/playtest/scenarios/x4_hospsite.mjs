// The helsesenter stands where it always stood (beta 0393 #1). Its site is searched for at boot, clear of every
// obstacle within 26 m; when the street lamps were moved to a later build step (RD1b) they stopped counting, and the
// building moved 145 m to a street's end with its forecourt (a plow lot, 4.2c1) lying across the street and a house's
// yard, where the lot could not be cut clear. This pins the site and what must be true of it.
import { boot, ev, sleep, done, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); WX.at = () => 0; GS.storm = 0; true`); await sleep(500);
const a = await J(`(() => { const d = HOSP.door, K = window.TLXRK, own = (x, z) => Math.hypot(x - HOSP.x, z - HOSP.z) < 16;
  let road = 0, sq = 0; for (let u = -9; u <= 9; u++) for (let v = -9; v <= 9; v++) { if (Math.hypot(u, v) > 9) continue; sq++; if (K && K.onRoad(d.x + u, d.z + v, 0.3)) road++; }
  let lo = 1e9, hi = -1e9; for (let u = -9; u <= 9; u++) for (let v = -9; v <= 9; v++) { if (Math.hypot(u, v) > 9) continue; const g = groundAt(d.x + u, d.z + v); lo = Math.min(lo, g); hi = Math.max(hi, g); }
  const doors = KIT.doors.map(q => Math.hypot(q.x - HOSP.x, q.z - HOSP.z)).sort((p, q) => p - q)[0];
  const lamps = (KIT.lamps || []).filter(l => !own(l.x, l.z)).map(l => Math.hypot(l.x - HOSP.x, l.z - HOSP.z)).sort((p, q) => p - q)[0];
  const lot = TLXPL.lot.list().find(q => q.id === "hosp");
  return { built: HOSP.built, kit: !!(K && K.ready), hx: HOSP.x - depot.x, hz: HOSP.z - depot.z, road, sq, drop: hi - lo, door: doors, lamp: lamps === undefined ? 999 : lamps, nLamps: (KIT.lamps || []).length, n: lot ? lot.n : 0,
    wet: isSea(d.x, d.z) || isWater(d.x, d.z), pad: !!HOSP.pad }; })()`);
console.log("  ", JSON.stringify(a));
ok(a.built && a.pad && !a.wet, "the helsesenter is built, with its pad, on dry ground");
ok(Math.hypot(a.hx - 17.6, a.hz - 85.8) < 1.5, `it stands where it always stood, 88 m from the depot on the edge of town (${a.hx.toFixed(1)}, ${a.hz.toFixed(1)} from the depot; 17.6, 85.8 wanted)`);
ok(a.kit && a.road === 0, `no street or road runs through its forecourt (${a.road} of ${a.sq} points on a road)`);
ok(a.door > 26, `no house stands within 26 m of it (the nearest door: ${a.door.toFixed(1)} m)`);
ok(a.nLamps > 20 && a.lamp > 26, `no street lamp stands within 26 m of it (the nearest: ${a.lamp.toFixed(1)} m, ${a.nLamps} lamps in town)`);
ok(a.drop < 0.3, `the forecourt is level (${a.drop.toFixed(2)} m from its lowest to its highest point)`);
ok(a.n >= 120 && a.n <= 150, `the forecourt is a plow lot of ${a.n} squares`);
if (!process.env.NOSTILLS) {
  await ev(`(() => { FOOT.on = false; const d = HOSP.door; if (!window.__camHk) { window.__camHk = 1; const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); }; }
    window.camOv = cam => { cam.position.set(d.x + 30, surf(d.x, d.z) + 32, d.z - 30); cam.lookAt(d.x, surf(d.x, d.z), d.z); }; return true; })()`);
  await sleep(2000); await shot("hospsite");
}
await done(fails ? 1 : 0);

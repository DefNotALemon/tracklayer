// G3 verify v138 (station pump/canopy hardware): nozzle at ride distance, bollard/post bands at night,
// the forecourt pool on a moonless/auroraless dark night, and a fuel cabin's jerry-can pallet up close.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_station_hardware_check.mjs [outdir]  then sheet.py <outdir>
import { boot, ev, shot, sleep, done } from "../lib.mjs";

const ST = process.env.ST || "0";
await boot();
await ev(`(() => { WX.at = () => 0; GS.storm = 0;
  const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); };
  tabCull = () => {}; return true; })()`);

// ride-by views of the pump/nozzle at a realistic riding distance (~18-22 m), day and night
const RIDE_VIEWS = [
  ["ride_day", 12, 0, "nov"],
  ["ride_night", 12, 0, "night"],
];
for (const [tag, h, _unused, period] of RIDE_VIEWS) {
  await ev(`GS.storm = 0; AUR.v = 0.05; GS.hour = Math.floor(GS.hour / 24) * 24 + ${period === "night" ? 21 : 12}; true`);
  await sleep(900);
  await ev(`(() => { const t = STATIONS[${ST}], cr = Math.cos(t.ry), sr = Math.sin(t.ry);
    const W = (a, b) => [t.x + a * cr + b * sr, t.z - a * sr + b * cr];
    const gy = groundAt(t.x, t.z) - 0.2, [cx, cz] = W(18, 14), [lx, lz] = W(4.4, 0);
    P.x = cx + 30; P.z = cz + 30; recenter(t.x, t.z, true);
    const ey = Math.max(gy + 1.9, groundAt(cx, cz) + 1.5);
    window.camOv = c => { c.position.set(cx, ey, cz); c.lookAt(lx, gy + 1.3, lz); }; return true; })()`);
  await sleep(900); await shot(tag);
}

// bollard + post bands close, at night (lit pool nearby)
await ev(`GS.storm = 0; AUR.v = 0.05; GS.hour = Math.floor(GS.hour / 24) * 24 + 23; true`); await sleep(900);
await ev(`(() => { const t = STATIONS[${ST}], cr = Math.cos(t.ry), sr = Math.sin(t.ry);
  const W = (a, b) => [t.x + a * cr + b * sr, t.z - a * sr + b * cr];
  const gy = groundAt(t.x, t.z) - 0.2, [cx, cz] = W(2.2, 3.0), [lx, lz] = W(0, 0.55);
  P.x = cx + 30; P.z = cz + 30; recenter(t.x, t.z, true);
  const ey = Math.max(gy + 1.2, groundAt(cx, cz) + 1.5);
  window.camOv = c => { c.position.set(cx, ey, cz); c.lookAt(lx, gy + 0.9, lz); }; return true; })()`);
await sleep(900); await shot("bollard_night");

// forecourt canopy pool on a moonless, aurora-free dark night (AUR.v forced to 0)
await ev(`GS.storm = 0; AUR.v = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + 2; true`); await sleep(900);
await ev(`(() => { const t = STATIONS[${ST}], cr = Math.cos(t.ry), sr = Math.sin(t.ry);
  const W = (a, b) => [t.x + a * cr + b * sr, t.z - a * sr + b * cr];
  const gy = groundAt(t.x, t.z) - 0.2, [cx, cz] = W(10, 9), [lx, lz] = W(0, 0);
  P.x = cx + 30; P.z = cz + 30; recenter(t.x, t.z, true);
  const ey = Math.max(gy + 1.8, groundAt(cx, cz) + 1.5);
  window.camOv = c => { c.position.set(cx, ey, cz); c.lookAt(lx, gy + 1.6, lz); }; return true; })()`);
await sleep(900); await shot("pool_moonless");
console.log("pool_moonless_stats", await ev("JSON.stringify({ hour: GS.hour, aurV: AUR.v })"));

// a fuel cabin's jerry-can pallet, up close, day and night
await ev(`GS.storm = 0; AUR.v = 0.05; GS.hour = Math.floor(GS.hour / 24) * 24 + 12; true`); await sleep(900);
const cabin = await ev(`(() => { const c = SITES.find(q => q.fuelPrice && q.type === "cabin"); return c ? { x: c.x, z: c.z, name: c.name } : null; })()`);
console.log("cabin", JSON.stringify(cabin));
if (cabin) {
  for (const [tag, h] of [["jerrycan_day", 12], ["jerrycan_night", 21]]) {
    await ev(`GS.storm = 0; AUR.v = 0.05; GS.hour = Math.floor(GS.hour / 24) * 24 + ${h}; true`); await sleep(900);
    await ev(`(() => { const cx0 = ${cabin.x}, cz0 = ${cabin.z};
      const gy = groundAt(cx0, cz0) - 0.2, cx = cx0 - 11 + 3.0, cz = cz0 - 2.0;
      P.x = cx + 30; P.z = cz + 30; recenter(cx0, cz0, true);
      const ey = Math.max(gy + 1.3, groundAt(cx, cz) + 1.5);
      window.camOv = c => { c.position.set(cx, ey, cz); c.lookAt(cx0 - 11, gy + 0.9, cz0 - 8); }; return true; })()`);
    await sleep(900); await shot(tag);
  }
}
await done();

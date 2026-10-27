// G3 chimney smoke (v151) verify pass: judge the plumes the way a rider actually sees them —
// (1) riding through the quay town on the default chase cam at ride distance, (2) a storm (does the
// plume lay flat per the "a storm lays it flat" design comment?), (3) the wide polar-night skyline.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_chimney_ride.mjs [outdir]; then sheet.py.
import { boot, ev, shot, sleep, hold, down, up, done } from "../lib.mjs";
await boot();

const waitGame = async (secs) => { const t0 = await ev("gameClock"); for (let i = 0; i < 100; i++) { await sleep(400); if ((await ev("gameClock")) - t0 >= secs) break; } };

// --- 1. Ride through the quay town, default chase cam, clear noon, judge smoke at normal riding range.
await ev(`(() => { WX.at = () => 0; GS.storm = 0; GS.hour = (Math.floor(GS.hour / 24)) * 24 + 12;
  const d = SITES.find(s => s.id === "depot");
  // approach a nearby door along the depot->door line (the route a real rider takes, so it's clear of
  // the house itself), starting 15 m short of the door and driving the rest of the way past chimneys.
  const near = KIT.doors.filter(k => Math.hypot(k.x - d.x, k.z - d.z) < 160 && Math.hypot(k.x - d.x, k.z - d.z) > 20)
    .sort((a, b) => Math.hypot(a.x - d.x, a.z - d.z) - Math.hypot(b.x - d.x, b.z - d.z));
  const tgt = near[Math.floor(near.length / 2)] || near[0] || d;
  const dist = Math.hypot(tgt.x - d.x, tgt.z - d.z), ux = (tgt.x - d.x) / dist, uz = (tgt.z - d.z) / dist;
  const sx = d.x + ux * (dist - 15), sz = d.z + uz * (dist - 15);
  P.x = sx; P.z = sz; P.y = surf(P.x, P.z) + 0.3; P.yaw = Math.atan2(ux, uz); P.vx = P.vz = P.vy = 0;
  recenter(P.x, P.z, true); return { sx, sz, tgt, nearN: near.length }; })()`);
console.log("ride start", await ev("JSON.stringify({x:+P.x.toFixed(1), z:+P.z.toFixed(1), chimneys: (KIT.chimneys||[]).length})"));
await down("KeyW");
let t0 = await ev("gameClock");
for (let i = 0; i < 5; i++) {
  await sleep(1800);
  const g = await ev("gameClock");
  await shot(`ride_${i}_t${(g - t0).toFixed(0)}`);
}
await up("KeyW");
console.log("ride end", await ev("JSON.stringify({x:+P.x.toFixed(1), z:+P.z.toFixed(1), mph:+(Math.hypot(P.vx,P.vz)*2.237).toFixed(1)})"));

// --- 2. Storm: pin a strong storm, static viewpoint near a smoking chimney, see if the plume lays flat.
await ev(`(() => { const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); }; return true; })()`);
await ev(`(() => { GS.storm = 1.3; WX.at = () => 1; GS.hour = (Math.floor(GS.hour / 24)) * 24 + 14;
  const d = SITES.find(s => s.id === "depot");
  const near = KIT.doors.filter(k => Math.hypot(k.x - d.x, k.z - d.z) < 160);
  const anchor = near[0] || d; const cx = anchor.x, cz = anchor.z;
  P.x = cx; P.z = cz; P.y = surf(P.x, P.z) + 0.5; P.vx = P.vy = P.vz = 0; recenter(cx, cz, true);
  window.camOv = c => { c.position.set(cx + 16, groundAt(cx, cz) + 6, cz + 12); c.lookAt(cx, groundAt(cx, cz) + 7, cz); }; return true; })()`);
await waitGame(10);
console.log("storm wind", await ev("JSON.stringify({storm: GS.storm, wx: +CSMK.wx.toFixed(2), wz: +CSMK.wz.toFixed(2), puffs: CSMK.live})"));
await shot("storm_depot");

// --- 3. Deep polar night, wide skyline, aurora if the seed gives one tonight.
await ev(`(() => { GS.storm = 0; WX.at = () => 0;
  GS.hour = (Math.floor(GS.hour / 24)) * 24 + 1;
  const s = SITES.find(q => q.id === "mehamn"); const cx = s.x + 52, cz = s.z + 34;
  window.camOv = c => { c.position.set(cx, groundAt(cx, cz) + 6, cz); c.lookAt(s.x, groundAt(s.x, s.z) + 5 + 4, s.z); }; return true; })()`);
await waitGame(10);
console.log("night", await ev("JSON.stringify({hour: +(GS.hour%24).toFixed(2), auroraV: (typeof AURORA !== 'undefined' ? +AURORA.v.toFixed(2) : -1), puffs: CSMK.live})"));
await shot("night_mehamn");

await done();

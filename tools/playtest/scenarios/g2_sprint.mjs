// G2: is the Sprint 580 SX a real step or a trap? Its blurb says "terrible in deep snow, glorious on a groomed
// trail / the lake run", but on paper the Summit (5 deliveries later) out-powers it everywhere. This rides each
// sled from rest, yaw held straight, weather calm, noon, for SP_SECS game-s on three surfaces:
//   powder: fresh open flat ground;  trail: back along that same pass's own track (packed groove);
//   ice: across the middle of a big frozen lake.
// Prints average speed (m along / game-s) and top mph per surface.
// Env: SP_SLEDS=ranger,sprint,summit  SP_SECS=14
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_sprint.mjs
import { boot, ev, sleep, down, up, done, park } from "../lib.mjs";
const sleds = (process.env.SP_SLEDS || "ranger,sprint,summit").split(",");
const SECS = +(process.env.SP_SECS || 14);
await boot();
await ev(`(() => { WX.at = () => 0; if (WX.atT) WX.atT = () => 0; GS.storm = 0; GS.hour = 12; GS.cash = 1e6;
  GS.own.sleds = SLEDS.map(s => s.id); return true; })()`);
async function ride(label, sled) {
  await sleep(1200);
  const t0 = await ev("gameClock"); let maxMph = 0, last = null, packs = [], ices = 0, n = 0;
  await down("KeyW");
  try {
    for (;;) {
      await sleep(250);
      const q = JSON.parse(await ev(`(() => { const c = window.__sp; if (!CRASH.on) P.yaw = c.yaw;
        return JSON.stringify({ t: gameClock, along: (P.x - c.x) * Math.sin(c.yaw) + (P.z - c.z) * Math.cos(c.yaw),
          mph: Math.hypot(P.vx, P.vz) * 2.237, pack: P.pack, ice: !!P.ice, crash: !!(CRASH.on || FOOT.on) }); })()`));
      maxMph = Math.max(maxMph, q.mph); last = q; packs.push(q.pack); ices += q.ice ? 1 : 0; n++;
      if (q.crash || q.t - t0 >= SECS) break;
    }
  } finally { await up("KeyW"); }
  const gs = last.t - t0, row = { sled, surf: label, gameS: +gs.toFixed(1), m: Math.round(last.along), ms: +(last.along / gs).toFixed(1),
    topMph: Math.round(maxMph), pack: +(packs.reduce((a, b) => a + b, 0) / n).toFixed(2), ice: +(ices / n).toFixed(2), crash: last.crash };
  console.log("RIDE " + JSON.stringify(row));
  await ev("P.vx = P.vz = 0; true"); await sleep(600);
  return row;
}
const rows = [];
let k = 0;
for (const s of sleds) {
  // powder + trail on fresh ground, each sled on its own line
  const sp = JSON.parse(JSON.stringify(await park(`SPAWN.x + 600 + ${k * 90}`, `SPAWN.z - 500`)));
  k++;
  await ev(`(() => { GS.own.sled = "${s}"; restat(); applyLoadout(); GS.fuel = 99; GS.warmth = 100; GS.hour = 12;
    window.__sp = { x: P.x, z: P.z, yaw: 0 }; P.yaw = 0; return true; })()`);
  rows.push(await ride("powder", s));
  // back to the start, same heading: ride the groove we just cut
  await ev(`(() => { const c = window.__sp; P.x = c.x; P.z = c.z; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = P.vy = 0; P.yaw = c.yaw; return true; })()`);
  rows.push(await ride("trail", s));
  // lake ice: biggest lake, start 230 m from its centre, ride across it
  await ev(`(() => { const L = LAKES[0], a = ${k} * 0.7; const x = L.x - Math.sin(a) * 230, z = L.z - Math.cos(a) * 230;
    P.x = x; P.z = z; P.y = surf(x, z) + 0.3; P.vx = P.vz = P.vy = 0; P.yaw = a; recenter(x, z, true);
    window.__sp = { x, z, yaw: a }; GS.fuel = 99; return true; })()`);
  rows.push(await ride("ice", s));
}
console.log("SUMMARY sled      powder m/s  trail m/s  ice m/s  (top mph p/t/i)");
for (const s of sleds) {
  const g = l => rows.find(r => r.sled === s && r.surf === l) || {};
  console.log(`  ${s.padEnd(9)} ${String(g("powder").ms).padEnd(11)} ${String(g("trail").ms).padEnd(10)} ${String(g("ice").ms).padEnd(8)} ${g("powder").topMph}/${g("trail").topMph}/${g("ice").topMph}`);
}
await done();

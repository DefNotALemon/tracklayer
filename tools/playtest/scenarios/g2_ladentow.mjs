// G2: coldRun()'s rideS estimate (min(12+6*power, 10.5*power/drag)) was fitted on EMPTY sleds (g2_cruise.mjs,
// report 0034/PROGRESS v97) and PROGRESS flags it as unmeasured for laden trailers/flatbeds (follow-up after
// v97, repeated in 0039's ideas). This rides the top-tier sleds that actually haul big cargo (Apex=fell,
// Matriarch=tonne, Aurora=clean-air) BOTH empty and towing a realistic load for their own job type, same
// route, same harness as g2_cruise, and reports the along-line m/s ratio empty vs laden and vs the formula.
// Env: LT_SECS=25 (game-s per leg)
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_ladentow.mjs
import { boot, ev, sleep, down, up, done, sideCam, camOff, shot } from "../lib.mjs";
const SECS = +(process.env.LT_SECS || 25);
await boot();
await ev(`(() => { WX.at = () => 0; if (WX.atT) WX.atT = () => 0; GS.storm = 0; GS.hour = 12; GS.cash = 1e6;
  GS.own.sleds = SLEDS.map(s => s.id); return true; })()`);
// combo: sled, hitch part (or "none"), cargo kg (0 = empty), matching the job tier that sled actually hauls
const combos = [
  { sled: "apex", hitch: "flatbed", kg: 0, tag: "apex-empty" },
  { sled: "apex", hitch: "flatbed", kg: 320, tag: "apex-fell320" },
  { sled: "matriarch", hitch: "flatbed", kg: 0, tag: "matriarch-empty" },
  { sled: "matriarch", hitch: "flatbed", kg: 1000, tag: "matriarch-tonne1000" },
  { sled: "aurora", hitch: "trailer", kg: 0, tag: "aurora-empty" },
  { sled: "aurora", hitch: "trailer", kg: 190, tag: "aurora-cleanair190" }
];
const a = "skjanes", b = "ifjord";
const rows = [];
let leg = 0;
for (const c of combos) {
  const off = 70 * (leg++ % 2 ? -1 : 1) * Math.ceil(leg / 2);   // fresh-snow line each leg
  const setup = JSON.parse(await ev(`(() => {
    const f = SITES.find(x => x.id === "${a}"), d = SITES.find(x => x.id === "${b}");
    GS.own.sled = "${c.sled}"; restat(); GS.own.parts.hitch = "${c.hitch}";
    GS.load = ${c.kg > 0 ? `[{ big: true, bays: 1, kg: ${c.kg}, cargo: "test", fragile: false, look: "crate", dest: { id: "test", name: "Test", x: 0, z: 0, y: 0 } }]` : "[]"};
    applyLoadout(); GS.fuel = 99; GS.warmth = 100; GS.hour = 12;
    const L = Math.hypot(d.x - f.x, d.z - f.z), ux = (d.x - f.x) / L, uz = (d.z - f.z) / L;
    P.x = f.x + ux * 120 - uz * ${off}; P.z = f.z + uz * 120 + ux * ${off}; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = P.vy = 0;
    P.yaw = Math.atan2(ux, uz); recenter(P.x, P.z, true);
    window.__cr = { fx: P.x, fz: P.z, ux, uz, dx: d.x - uz * ${off}, dz: d.z + ux * ${off} };
    return JSON.stringify({ L: Math.round(L), power: +ST.power.toFixed(2), drag: +ST.drag.toFixed(2),
      formula: +(12 + 6 * ST.power).toFixed(1), est: +Math.min(12 + 6 * ST.power, 10.5 * ST.power / ST.drag).toFixed(1) });
  })()`));
  await sleep(1800);   // let TOW.kind attach and towSnap settle before driving off
  const t0 = await ev("gameClock"); let res = null, maxMph = 0, tipped = false;
  await down("KeyW");
  try {
    for (;;) {
      await sleep(250);
      const q = JSON.parse(await ev(`(() => { const c = window.__cr, dx = c.dx - P.x, dz = c.dz - P.z;
        if (!CRASH.on) P.yaw = Math.atan2(dx, dz);
        return JSON.stringify({ t: gameClock, along: (P.x - c.fx) * c.ux + (P.z - c.fz) * c.uz, crash: !!(CRASH.on || FOOT.on),
          tip: TOW.tipT > 0, mph: Math.hypot(P.vx, P.vz) * 2.237, left: Math.hypot(dx, dz) }); })()`));
      maxMph = Math.max(maxMph, q.mph); if (q.tip) tipped = true;
      const dt = q.t - t0;
      if (q.crash || dt >= SECS || q.left < 150) { res = { dt, along: q.along, crash: q.crash }; break; }
    }
  } finally { await up("KeyW"); }
  if (c.tag.startsWith("matriarch")) { await sideCam("[P.x, P.y + 0.8, P.z]", 7, 3); await sleep(300); await shot(`${c.tag}`); await camOff(); }
  await ev(`(() => { if (CRASH.on) crashGetUp(); FOOT.on = false; FOOT.ski = false; return true; })()`);
  const v = res.along / res.dt;
  const row = { tag: c.tag, kg: c.kg, power: setup.power, drag: setup.drag, formula: setup.formula, est: setup.est,
    gameS: +res.dt.toFixed(1), alongM: Math.round(res.along), ms: +v.toFixed(1),
    estRatio: +(v / setup.est).toFixed(2), maxMph: Math.round(maxMph), crash: res.crash, tipped };
  rows.push(row); console.log("LEG", JSON.stringify(row));
  await ev(`(() => { GS.own.sled = "frontier"; GS.own.parts.hitch = "none"; GS.load = []; restat(); return true; })()`);
  await sleep(500);
}
for (let i = 0; i < rows.length; i += 2) {
  const e = rows[i], l = rows[i + 1];
  if (e && l && e.gameS > 10 && l.gameS > 10) console.log("DROP", e.tag.split("-")[0], "empty", e.ms, "-> laden", l.ms, "ratio", +(l.ms / e.ms).toFixed(2));
}
await done();

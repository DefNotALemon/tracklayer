// G2: laden-trailer follow-up to g2_cruise.mjs (v97). coldRun() assumes min(12 + 6 x power, 10.5 x power/drag) m/s,
// fitted on EMPTY sleds. This rides the same yaw-to-target harness with a hitch and CR_KG kg of cargo really on it
// (a big load in GS.load, so TOW.mass is the game's own), weather calm, and reports along-line m/s vs the estimate.
// Env: CR_KG=300 (0 = no hitch), CR_HITCH=flatbed|trailer, CR_SLEDS, CR_ROUTES, CR_SECS (as g2_cruise).
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_cruise_laden.mjs
import { boot, ev, sleep, down, up, done } from "../lib.mjs";
const sleds = (process.env.CR_SLEDS || "woodsman,summit,apex,aurora,matriarch").split(",");
const routes = (process.env.CR_ROUTES || "skjanes-ifjord").split(",");
const SECS = +(process.env.CR_SECS || 40);
// laden variant: CR_KG=300 (cargo kg on the hitch, 0 = no hitch at all), CR_HITCH=trailer|flatbed
const KG = +(process.env.CR_KG ?? 300), HITCH = process.env.CR_HITCH || "flatbed";
await boot();
await ev(`(() => { WX.at = () => 0; if (WX.atT) WX.atT = () => 0; GS.storm = 0; GS.hour = 12; GS.cash = 1e6;
  GS.own.sleds = SLEDS.map(s => s.id); return true; })()`);
const rows = [];
let leg = 0;
for (const r of routes) for (const s of sleds) {
  const off = 70 * (leg++ % 2 ? -1 : 1) * Math.ceil(leg / 2);   // each leg on its own fresh-snow line (no riding the last one's trench)
  const [a, b] = r.split("-");
  const setup = JSON.parse(await ev(`(() => {
    const f = SITES.find(x => x.id === "${a}"), d = SITES.find(x => x.id === "${b}");
    GS.own.sled = "${s}"; GS.lic.freight = true; GS.load = GS.load.filter(j => !j.big);
    if (${KG} > 0) { GS.own.partsOwned["hitch:${HITCH}"] = true; GS.own.parts.hitch = "${HITCH}"; }
    else GS.own.parts.hitch = "none";
    restat(); applyLoadout();
    if (${KG} > 0) GS.load.push({ big: true, kg: ${KG}, bays: 1, cond: 100, hits: 0, bond: 0, pay: 0, cargo: "test load", need: "${HITCH}", dest: d, from: f });
    applyLoadout(); GS.fuel = 99; GS.warmth = 100; GS.hour = 12;
    const L = Math.hypot(d.x - f.x, d.z - f.z), ux = (d.x - f.x) / L, uz = (d.z - f.z) / L;
    // start 120 m out of the village so the yard/houses don't trip the first seconds
    P.x = f.x + ux * 120 - uz * ${off}; P.z = f.z + uz * 120 + ux * ${off}; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = P.vy = 0;
    P.yaw = Math.atan2(ux, uz); recenter(P.x, P.z, true);
    window.__cr = { fx: P.x, fz: P.z, ux, uz, dx: d.x - uz * ${off}, dz: d.z + ux * ${off} };
    return JSON.stringify({ L: Math.round(L), power: +ST.power.toFixed(2), formula: +(12 + 6 * ST.power).toFixed(1), est: +Math.min(12 + 6 * ST.power, 10.5 * ST.power / ST.drag).toFixed(1) });
  })()`));
  await sleep(1500);
  const t0 = await ev("gameClock"); let res = null, maxMph = 0, towM = 0;
  await down("KeyW");
  try {
    for (;;) {
      await sleep(250);
      const q = JSON.parse(await ev(`(() => { const c = window.__cr, dx = c.dx - P.x, dz = c.dz - P.z;
        if (!CRASH.on) P.yaw = Math.atan2(dx, dz);
        return JSON.stringify({ t: gameClock, along: (P.x - c.fx) * c.ux + (P.z - c.fz) * c.uz, crash: !!(CRASH.on || FOOT.on),
          mph: Math.hypot(P.vx, P.vz) * 2.237, tm: TOW.mass, left: Math.hypot(dx, dz) }); })()`));
      maxMph = Math.max(maxMph, q.mph); towM = q.tm;
      const dt = q.t - t0;
      if (q.crash || dt >= SECS || q.left < 150) { res = { dt, along: q.along, crash: q.crash }; break; }
    }
  } finally { await up("KeyW"); }
  await ev(`(() => { if (CRASH.on) crashGetUp(); FOOT.on = false; FOOT.ski = false; return true; })()`);
  const v = res.along / res.dt;
  const row = { route: r, sled: s, power: setup.power, formula: setup.formula, gameS: +res.dt.toFixed(1), alongM: Math.round(res.along),
    ms: +v.toFixed(1), ratio: +(v / setup.formula).toFixed(2), est: setup.est, estRatio: +(v / setup.est).toFixed(2), maxMph: Math.round(maxMph), towKg: Math.round(towM), crash: res.crash };
  rows.push(row); console.log("LEG", JSON.stringify(row));
  await ev(`(() => { GS.own.sled = "frontier"; restat(); return true; })()`);
  await sleep(500);
}
const ok = rows.filter(r => r.gameS > 15);
console.log("SUMMARY legs", rows.length, "usable(>15 s)", ok.length, "mean ratio", ok.length ? +(ok.reduce((a, r) => a + r.ratio, 0) / ok.length).toFixed(2) : "-");
await done();

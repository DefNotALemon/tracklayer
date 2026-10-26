// G2 follow-up to v102 (laden COLD RUN estimate): ride a laden freight card that the card flags and compare the
// warmth it really costs with what the card says. A full multi-km leg is too long for one run at headless speed, so
// it rides LR_SECS game-s of the real leg (the card's load really on the hitch, calm weather) and extrapolates:
// projected loss = measured warmth loss per game-s x (leg length / measured along-line pace).
// Env: LR_SLED=woodsman LR_LVL=6 LR_HOUR=12 LR_HITCH=trailer LR_SECS=120 LR_KIND=any|heavy|clean|fell|tonne
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_coldrun_ride_laden.mjs
import { boot, ev, sleep, down, up, shot, done } from "../lib.mjs";
const SLED = process.env.LR_SLED || "woodsman", LVL = +(process.env.LR_LVL || 6), HOUR = +(process.env.LR_HOUR || 12);
const HITCHID = process.env.LR_HITCH || "trailer", SECS = +(process.env.LR_SECS || 120), KIND = process.env.LR_KIND || "any", FROM = process.env.LR_FROM || "";
await boot();
const pick = JSON.parse(await ev(`(() => {
  WX.at = () => 0; if (WX.atT) WX.atT = () => 0; GS.storm = 0;
  GS.cash = 50000; GS.lic.freight = true; GS.own.sleds = SLEDS.map(s => s.id); GS.own.sled = "${SLED}";
  GS.own.partsOwned["hitch:${HITCHID}"] = true; GS.own.parts.hitch = "${HITCHID}"; GS.delivered = ${LVL}; GS.hour = ${HOUR};
  for (const slot of GEAR_ORDER) { const o = GEAR[slot].options || GEAR[slot]; GS.own.gear[slot] = o[0].id; }
  restat(); applyLoadout();
  const rows = [];
  for (let i = 0; i < 12; i++) { makeContracts(depot);
    GS.contracts.forEach(x => { if (x.locked || !x.big || x.tour || x.rescue) return;
      const kind = x.clean ? "clean" : x.tonne ? "tonne" : x.fell ? "fell" : "heavy";
      if ("${KIND}" !== "any" && kind !== "${KIND}") return;
      if (contractBlock(x)) return;
      if ("${FROM}" && (conFrom(x).id || "depot") !== "${FROM}") return;
      const f = conFrom(x), km = +conKm(x).toFixed(1), tk = HITCH["${HITCHID}"].mass + x.kg;
      const e = coldRun(f, x.dest, km), l = coldRun(f, x.dest, km, tk);
      if (l.loss < 70) return;
      rows.push({ kind, dest: shortName(x.dest), f: f.id || "depot", fx: f.x, fz: f.z, dx: x.dest.x, dz: x.dest.z, km, kg: x.kg, towKg: tk,
        empty: Math.round(e.loss), laden: Math.round(l.loss), c: x }); }); }
  rows.sort((a, b) => b.laden - a.laden);
  const r = rows.find(r => r.laden >= 100) || rows[0];
  if (!r) return JSON.stringify(null);
  GS.load = GS.load.filter(j => !j.big);
  GS.load.push({ big: true, kg: r.kg, bays: r.c.bays || 1, cond: 100, hits: 0, bond: 0, pay: 0, cargo: "test load", need: "${HITCHID}", dest: r.c.dest, from: conFrom(r.c) });
  applyLoadout();
  delete r.c; r.flagged = rows.length;
  const L = Math.hypot(r.dx - r.fx, r.dz - r.fz), ux = (r.dx - r.fx) / L, uz = (r.dz - r.fz) / L;
  P.x = r.fx + ux * 120; P.z = r.fz + uz * 120; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = P.vy = 0;
  P.yaw = Math.atan2(ux, uz); recenter(P.x, P.z, true); GS.fuel = 99; GS.warmth = 100; GS.near = null;
  window.__lr = { fx: P.x, fz: P.z, ux, uz, dx: r.dx, dz: r.dz, L };
  r.coldPerS = +((0.3 + 0.35 * (1 - dayFactor()) + 0.9 * clamp(GS.storm, 0, 1.2)) * ST.coldMul).toFixed(3);
  r.estMs = +Math.min(12 + 6 * ST.power, 10.5 * ST.power / ST.drag).toFixed(1);
  return JSON.stringify(r);
})()`));
if (!pick) { console.log("NO FLAGGED LADEN CARD"); await done(); }
console.log("CARD", JSON.stringify(pick));
await sleep(1500);
const t0 = await ev("gameClock"), w0 = await ev("GS.warmth");
let res = null, crashes = 0, maxMph = 0, nS = 0;
await down("KeyW");
try {
  for (;;) {
    await sleep(300);
    const q = JSON.parse(await ev(`(() => { const c = window.__lr, dx = c.dx - P.x, dz = c.dz - P.z;
      if (!CRASH.on && !FOOT.on) P.yaw = Math.atan2(dx, dz);
      return JSON.stringify({ t: gameClock, along: (P.x - c.fx) * c.ux + (P.z - c.fz) * c.uz, crash: !!(CRASH.on || FOOT.on),
        mph: Math.hypot(P.vx, P.vz) * 2.237, w: GS.warmth, tm: TOW.mass, left: Math.hypot(dx, dz),
      dep: +(surf(P.x, P.z) - groundAt(P.x, P.z)).toFixed(2), wat: isWater(P.x, P.z) || isSea(P.x, P.z), y: +P.y.toFixed(0) }); })()`));
    maxMph = Math.max(maxMph, q.mph);
    if (++nS % 25 === 0) console.log("  s", Math.round(q.t - t0), "along", Math.round(q.along), "mph", Math.round(q.mph), "depth", q.dep, "water", q.wat, "y", q.y);
    if (q.crash) { crashes++; await ev(`(() => { if (CRASH.on) crashGetUp(); FOOT.on = false; FOOT.ski = false; return true; })()`); await sleep(500); }
    if (q.t - t0 >= SECS || q.left < 150) { res = q; break; }
  }
} finally { await up("KeyW"); }
const dt = res.t - t0, loss = w0 - res.w, pace = res.along / dt, rate = loss / dt;
const legM = pick.km * 1000, proj = rate * legM / pace;
console.log("RIDE", JSON.stringify({ gameS: +dt.toFixed(1), alongM: Math.round(res.along), paceMs: +pace.toFixed(2), estEmptyMs: pick.estMs,
  estLadenMs: +(pick.estMs / (1 + pick.towKg / 320)).toFixed(2), lossPerS: +rate.toFixed(3), modelPerS: pick.coldPerS, towKg: Math.round(res.tm),
  crashes, maxMph: Math.round(maxMph) }));
console.log("RESULT card empty-pace", pick.empty + "%", "card laden", pick.laden + "%", "projected real", Math.round(proj) + "%");
await shot("01_laden_ride");
await done();

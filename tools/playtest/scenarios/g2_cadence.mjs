// G2 ladder cadence: how many deliveries and how much game time each sled upgrade takes after the first,
// for a steady player who keeps taking the best-paying job on the real board. No riding: each step builds a
// real board (makeJobs/makeContracts at the current GS state), keeps only jobs the player can take
// (contractBlock() === "" for contracts), picks the best pay per minute, and books the game's own time estimate
// (jobGeom est for pickup + drop, the same one the board's $/min uses; report 0082 rode early legs ~2.4x faster
// than est, so est-minutes are a conservative upper bound). Pay is the posted pay (no late/condition losses,
// no polar-night x1.5). Two players:
//   A "parcels": only board parcels; buys each next sled the moment it can.
//   B "rig":     also gets the freight licence + receiver + trailer once heavy freight posts (rank 5), the flatbed
//                at rank 20, and takes contracts; same sled rule (a sled purchase waits until the rig is bought).
// Prints per-sled: delivery #, cumulative est-minutes, gap since the previous purchase, and the wait reason
// (cash vs deliveries). Run: tools/playtest/run.sh tools/playtest/scenarios/g2_cadence.mjs
import { boot, ev, done } from "../lib.mjs";
await boot();
const RUNS = +(process.env.CAD_RUNS || 6), MAXD = +(process.env.CAD_MAX || 70);
const out = JSON.parse(await ev(`(() => {
  const res = [];
  const here = { x: depot.x, z: depot.z, y: depot.y };
  const restore = JSON.stringify({ cash: GS.cash, delivered: GS.delivered, own: GS.own, lic: GS.lic });
  for (const mode of ["parcels", "rig"]) for (let run = 0; run < ${RUNS}; run++) {
    const o = JSON.parse(restore); GS.own = OWN0(); GS.cash = 0; GS.delivered = 0; GS.lic = {}; GS.claims = []; GS.load = []; GS.groomJob = null; GS.rescueJob = null;
    restat();
    let t = 0; const ev = [], log = [];
    const buy = (cat, id) => { const p = partDef(cat, id); if (GS.cash < p.cost || sledTier() < p.tier) return false; GS.cash -= p.cost; GS.own.partsOwned[ownKey(cat, id)] = true; GS.own.parts[cat] = id; restat(); ev.push({ what: id, d: GS.delivered, t }); return true; };
    for (let step = 0; step < 400 && GS.delivered < ${MAXD}; step++) {
      // purchases first (between jobs, at the garage)
      for (let guard = 0; guard < 6; guard++) {
        let did = false;
        if (mode === "rig") {
          if (GS.delivered >= RANKS[2].at && !GS.lic.freight) { GS.lic.freight = true; ev.push({ what: "licence", d: GS.delivered, t }); did = true; }
          if (GS.delivered >= RANKS[2].at && GS.own.parts.recv === "none" && PARTS.recv) did = buy("recv", PARTS.recv.options[1].id) || did;
          if (GS.delivered >= RANKS[2].at && GS.own.parts.recv !== "none" && GS.own.parts.hitch === "none") did = buy("hitch", "trailer") || did;
          if (GS.delivered >= RANKS[4].at && GS.own.parts.hitch === "trailer" && recvOk("flatbed")) did = buy("hitch", "flatbed") || did;
          if (GS.delivered >= RANKS[4].at && GS.own.parts.hitch === "trailer" && !recvOk("flatbed")) { const r = PARTS.recv.options.find(x => recvOk("flatbed", { parts: Object.assign({}, GS.own.parts, { recv: x.id }) })); if (r) did = buy("recv", r.id) || did; }
        }
        const rigWait = mode === "rig" && ((GS.delivered >= RANKS[2].at && GS.own.parts.hitch === "none") || (GS.delivered >= RANKS[4].at && GS.own.parts.hitch === "trailer"));
        const i = SLEDS.findIndex(s => s.id === GS.own.sled), nx = SLEDS[i + 1];
        if (nx && !rigWait && GS.delivered >= nx.need && GS.cash >= nx.cost) { GS.cash -= nx.cost; GS.own.sleds.push(nx.id); GS.own.sled = nx.id; restat(); ev.push({ what: nx.id, d: GS.delivered, t, sled: true, left: GS.cash }); did = true; }
        if (!did) break;
      }
      P.x = here.x; P.z = here.z;
      GS.contracts = null; makeJobs(depot); if (!GS.contracts) makeContracts(depot);
      const opts = [];
      for (const j of GS.jobs || []) { if (j.tour) continue; const f = j.from || depot; const tt = (f !== depot ? jobGeom(f, here).est : 0) + jobGeom(j.dest, f).est; opts.push({ k: "parcel", pay: j.pay, tt }); }
      if (mode === "rig") for (const c of GS.contracts || []) {
        if (c.locked || !c.pay || c.tour || c.rescue) continue;
        if (contractBlock(c)) continue;
        const f = c.from || depot, tt = (f !== depot ? jobGeom(f, here).est : 0) + jobGeom(c.dest, f).est * (c.groom ? 1.3 : 1);
        opts.push({ k: c.groom ? "groom" : c.tonne ? "tonne" : c.fell ? "fell" : c.clean ? "clean" : c.expedition ? "exped" : c.priority ? "prio" : "heavy", pay: c.pay, tt });
      }
      if (!opts.length) { t += 60; continue; }
      opts.sort((a, b) => b.pay / b.tt - a.pay / a.tt);
      const j = opts[0]; t += j.tt; GS.cash += j.pay; GS.delivered++;
      log.push(j.k);
    }
    const kinds = {}; for (const k of log) kinds[k] = (kinds[k] || 0) + 1;
    res.push({ mode, run, ev, kinds, endCash: GS.cash, endD: GS.delivered, endT: t });
  }
  const o = JSON.parse(restore); GS.cash = o.cash; GS.delivered = o.delivered; GS.own = o.own; GS.lic = o.lic; restat();
  return JSON.stringify({ res, sleds: SLEDS.map(s => ({ id: s.id, cost: s.cost, need: s.need })) });
})()`));
const med = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[(s.length - 1) >> 1] : NaN; };
for (const mode of ["parcels", "rig"]) {
  const runs = out.res.filter(r => r.mode === mode);
  console.log(`\n== ${mode} (${runs.length} runs, median) ==  sled  $cost/need  bought@delivery  est-min  gap(deliv/min)  waited-on`);
  let pd = 0, pt = 0;
  for (const s of out.sleds.slice(1)) {
    const hits = runs.map(r => r.ev.find(e => e.what === s.id)).filter(Boolean);
    if (!hits.length) { console.log(`  ${s.id.padEnd(10)} $${s.cost}/${s.need}  not reached`); continue; }
    const d = med(hits.map(h => h.d)), t = med(hits.map(h => h.t)) / 60;
    console.log(`  ${s.id.padEnd(10)} $${String(s.cost).padStart(5)}/${String(s.need).padStart(2)}  @${String(d).padStart(2)}  ${t.toFixed(1).padStart(6)} min  +${d - pd}/${(t - pt).toFixed(1)}  ${d > s.need ? "cash (" + (d - s.need) + " extra deliveries)" : "deliveries"}  $${med(hits.map(h => h.left))} left after  [${hits.length}/${runs.length}]`);
    pd = d; pt = t;
  }
  const parts = [...new Set(runs.flatMap(r => r.ev.filter(e => !e.sled).map(e => e.what)))];
  for (const p of parts) { const h = runs.map(r => r.ev.find(e => e.what === p)).filter(Boolean); console.log(`  part ${p.padEnd(10)} @${med(h.map(x => x.d))}  ${(med(h.map(x => x.t)) / 60).toFixed(1)} min`); }
  console.log("  job mix (run 0):", JSON.stringify(runs[0].kinds), " end $", runs[0].endCash, "deliveries", runs[0].endD, (runs[0].endT / 60).toFixed(0), "min");
}
await done();

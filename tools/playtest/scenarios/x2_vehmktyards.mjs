// Beta breaker for slice 2.7: collect a paid used pickup and trailer at EVERY seller's site; is the yard spot sane?
//  per site: dry, no obstacle at the spot, 7-30 m from the seller, 7 m from the rider; then the same with the rider ON FOOT and
//  with the rider parked ON the first-choice spot (should pick another spot, not stack). Prints ok/FAIL, exit 1 on a FAIL.
import { boot, ev, sleep, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.delivered = 12; GS.cash = 90000; true`); await sleep(600);
const sites = await J(`(() => { const ids = new Set(); for (let i = 0; i < 6000; i++) { const q = mktMake(CAL.abs()); if (q && q.cat === "veh") ids.add(q.site); } return [...ids]; })()`);
console.log("seller sites with vehicles:", sites.length, sites.join(","));
ok(sites.length >= 3, "several seller sites list vehicles");
const rows = [];
// the real thing, one probe per (site,item,mode), calling the veh market's collect straight (as mktCollect does)
for (const id of sites) for (const item of ["pickup", "haul"]) for (const mode of ["ride", "foot", "onspot"]) {
  const r = await J(`(() => {
    const s = TLX.state("vehicles"); s.owned.length = 0; s.haul = null; GS.mkt.held.length = 0; crashCancel(); FOOT.on = false;
    const site = SITES.find(q => q.id === "${id}"); if (!site) return { err: "nosite" };
    const V = TLXV.mkt || null;
    // park the rider
    P.x = site.x + 12; P.z = site.z; P.y = surf(P.x, P.z) + 0.2; P.vx = P.vy = P.vz = 0; recenter(P.x, P.z, true);
    if ("${mode}" === "onspot") { // first collect to learn the first-choice spot, then park the rider exactly on it and redo
      const h0 = { cat: "veh", item: "${item}", cond: 0.7, seller: "T", site: "${id}", name: "T", state: "wait", seed: 1 }; GS.mkt.held.push(h0); mktCollect(site);
      const o0 = "${item}" === "haul" ? s.haul : s.owned[0]; if (o0) { P.x = o0.x; P.z = o0.z; P.y = surf(P.x, P.z) + 0.2; }
      s.owned.length = 0; s.haul = null; GS.mkt.held.length = 0; }
    if ("${mode}" === "foot") { FOOT.on = true; FOOT.x = P.x + 3; FOOT.z = P.z; }
    const h = { cat: "veh", item: "${item}", cond: 0.7, seller: "Test", site: "${id}", name: "T", state: "wait", seed: 1 };
    GS.mkt.held.push(h);
    const before = JSON.stringify([s.owned.length, !!s.haul]);
    mktCollect(site);
    const o = "${item}" === "haul" ? s.haul : s.owned[0];
    if (!o) return { none: true, held: GS.mkt.held.length };
    const d = Math.hypot(o.x - site.x, o.z - site.z), dp = Math.hypot(o.x - P.x, o.z - P.z);
    return { d, dp, water: isWater(o.x, o.z), sea: isSea(o.x, o.z), ob: obNear(o.x, o.z, 1), y: o.yaw, held: GS.mkt.held.length };
  })()`);
  rows.push({ id, item, mode, ...r });
  if (r.none) { console.log(`note ${id} ${item} ${mode}: no spot (held ${r.held}) – nag path`); continue; }
  const good = r.d >= 6.5 && r.d <= 31 && !r.water && !r.sea && !r.ob && r.dp >= 6.9 && r.held === 0;
  ok(good, `${id} ${item} ${mode}: ${r.d.toFixed(1)} m from seller, ${r.dp.toFixed(1)} m from rider, water ${r.water}, sea ${r.sea}, obstacle ${r.ob}`);
}
const none = rows.filter(r => r.none).length;
console.log("collects with no spot:", none, "of", rows.length);
await done(fails ? 1 : 0);

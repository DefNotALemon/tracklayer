// G1: which Kjøllefjord shore-road lots actually got a house, and is each one's yard plowed?
// For every lot in buildTown's list (offsets from the depot) logs isSea, the yard value and snow depth at
// the lot, at 8 m out, and whether an obstacle (the house walls) stands there. Run:
//   tools/playtest/run.sh tools/playtest/scenarios/g1_townlots.mjs
import { boot, ev, done } from "../lib.mjs";
await boot();
const out = JSON.parse(await ev(`(() => {
  const lots = [[46,26],[46,-12],[18,40],[-16,44],[-40,20],[-38,-16],[10,-42],[-20,-40],[70,8],[-66,4],[30,66],[-8,70],[24,-34]];
  const cell = (x, z) => { const ix = Math.round((x + HALF) / CELL), iz = Math.round((z + HALF) / CELL), d = depthAt(ix, iz), f = freshAt(ix, iz); return { d: +d.toFixed(2), pack: +(f > 0.02 ? Math.max(0, Math.min(1, 1 - d / f)) : 1).toFixed(2) }; };
  const r = [];
  for (const [ox, oz] of lots) {
    const x = depot.x + ox, z = depot.z + oz;
    let nearYard = 1e9; for (const Y of YARDS) nearYard = Math.min(nearYard, Math.hypot(Y.x - x, Y.z - z));
    r.push({ ox, oz, sea: isSea(x, z), ob: obNear(x, z, 1), yard: +yardAt(x, z).toFixed(2), nearYard: +nearYard.toFixed(1), at: cell(x, z), out8: cell(x + 8, z) });
  }
  return JSON.stringify({ quay: QUAY ? { qa: +QUAY.qa.toFixed(2), qx: +(QUAY.qx - depot.x).toFixed(1), qz: +(QUAY.qz - depot.z).toFixed(1) } : null, yards: YARDS.length, r });
})()`));
console.log("quay", JSON.stringify(out.quay), "yards", out.yards);
for (const l of out.r) console.log(`lot ${String(l.ox).padStart(4)},${String(l.oz).padStart(4)} sea ${l.sea} ob ${l.ob} yard ${l.yard} nearestYard ${l.nearYard} m · at d ${l.at.d} pack ${l.at.pack} · +8m d ${l.out8.d} pack ${l.out8.pack}`);
console.log("ROWS " + JSON.stringify(out));
await done();

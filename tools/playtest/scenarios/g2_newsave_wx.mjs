// G2 (report 0031 F2): how often does a brand-new save get hit by a storm in its first game hours?
// Samples 300 weather seeds (the new-game seed is random) at the quay and 1 km inland, 09:36 -> 16:00 on
// 1 November, and prints the share of saves with a storm (WX.at > 0.55) per window plus the warmth a
// Frontier rider loses standing out in it (cold formula from updGame, coldMul 1, no elevation).
// Then plays the real thing: a fresh save, weather NOT pinned, warmth/s over the first 20 game-s.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_newsave_wx.mjs
import { boot, ev, timed, done } from "../lib.mjs";
await boot();
const r = await ev(`JSON.stringify((() => {
  const seed0 = WX.seed, H0 = 9.6, wins = [[9.6, 11], [11, 13], [13, 15], [15, 18]], N = 300;
  const spots = [[depot.x, depot.z], [depot.x + 700, depot.z - 700]];
  const hit = wins.map(() => 0); let lossSum = 0, lossMax = 0, firstSum = 0, firstN = 0;
  for (let s = 0; s < N; s++) {
    WX.seed = 1000 + s * 7919; WX.fronts = {};
    const w = wins.map(() => 0); let loss = 0, first = null;
    for (let H = H0; H < 18; H += 0.05) for (const [x, z] of spots) {
      const v = WX.at(x, z, H);
      wins.forEach((b, i) => { if (H >= b[0] && H < b[1] && v > 0.55) w[i] = 1; });
      if (x === depot.x && H < 13) loss += (0.3 + 0.35 * (1 - sstep(-7, 3, sunEl(H % 24))) + 0.9 * v) * 0.05 * GAMEHOUR;
      if (first === null && v > 0.55) first = H;
    }
    w.forEach((q, i) => hit[i] += q); lossSum += loss; lossMax = Math.max(lossMax, loss); if (first !== null && first < 18) { firstSum += first; firstN++; }
  }
  WX.seed = seed0; WX.fronts = {};
  return { N, stormShare: wins.map((b, i) => b[0] + "-" + b[1] + ": " + Math.round(hit[i] / N * 100) + "%"),
    warmthLost_0936_1300_avg: Math.round(lossSum / N), max: Math.round(lossMax), firstStormHourAvg: firstN ? +(firstSum / firstN).toFixed(2) : null, firstN };
})())`);
console.log("seeds", r);
const t = await timed([], 20, async () => 0);
console.log("live new save", await ev(`JSON.stringify({ hour: +(GS.hour%24).toFixed(2), storm: +GS.storm.toFixed(2), wx: +WX.at(P.x, P.z).toFixed(2), warmth: +GS.warmth.toFixed(1) })`));
await done();

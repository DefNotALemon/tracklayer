# 0380 — RD1 road model, no kerbs (v296, d42c386): beta

Part: new road model `tlx-roadkit.js` (streets + network roads). Run on origin/main f25ba31 (v298). Scenario `rd1_roads.mjs` rerun (builder's); no new scenario. Stills not judged this pass.

## Results
- `rd1_roads`: all ok, page errors none. 13 roads, 282 chunks, kit built in 97 ms; zero kerb/old-builder hits.
- Height: centre 0.012-0.070 m from surface over 12961 rings, no stair steps, 0 doubled surfaces in 63280 samples.
- Driving: sled Kaigata 27.3 m/s, Depotgata through the junction 26.7, fv888 stretch no snag; rolled 13.9 m off the street edge unstopped; traffic car drove 98 m of skjanes.
- Snow state flips plowed -> snowed in -> plowed; July is bare asphalt, no plow bank. Old save loads.

## Findings
1. POLISH — coverage misses: Lebesby has 3 of 3 street-flagged segments without the new model (`stMiss` 3), Dyfjord 1 of 4, fv888 1 of 9 (total misses fv888 1/164, lebesby 1/131; the test only asserts "every segment"-style totals and passed). Check whether those are junction/street stubs the assertion tolerates; a gap would show as an old-model or empty patch in Lebesby's streets.
2. POLISH — steepest ring grade is 62% at fv888:0 (1019,-532); only 3% over the surface's own, so it is the terrain, not the ribbon. Known switchback area, no action.
3. UNTESTED — look (lines, poles, shoulder) under night and headlight; frame cost (`rd1_perf`); routes themselves not moved yet per plan.

No BLOCKER or BUG.

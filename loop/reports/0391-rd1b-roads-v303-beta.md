# 0391 — RD1b roads (v303, 86e5331): beta rerun

Run on origin/main 86e5331 (script v303), headless, fresh profile.

## Results
- `rd1_roads`: all passed, exit 0, page errors none. Street asphalt width wanders (sd 0.11 m, range 0.37 m on the least varied of 7 streets). The plow bank edge wanders (sd 0.37 m). All 21 lamps stand 0.72 m or more off the asphalt. The bank is open at all 25 driveway mouths. The worst colour step at a junction join is 0.132, against a limit of 0.161. Pole reflector band contrast: 1.80 at 36 m and 2.19 at 113 m, with the sled turned away it is about 1.06. The sled drives Kaigata, Depotgata and a network stretch at 22-23 m/s with no snag and no crash. It rolled 13 m across the old kerb line unstopped. The snowed-in state toggles. July has bare asphalt. An old save loads with 13 roads.
- `smoke`: exit 0, page errors none.

## Findings
No BLOCKER or BUG found.
1. POLISH: the 0.132 junction colour step is close to its 0.161 limit, and the plain-street baseline is 0.098. A junction is slightly more visible than a plain street, but within the limit.
2. POLISH: the junction colour check is on pixels only. I did not look at the stills myself, so rounded corners, the crisp edge outline and the lack of stipple on a pad GPU are unjudged by vision.

Not covered: traffic or the plow turning through the rounded junctions, night riding past the poles at a pixel ratio above 1, other lanes' slices.

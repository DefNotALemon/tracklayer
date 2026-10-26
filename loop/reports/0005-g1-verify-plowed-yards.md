# 0005 — G1 verify plowed town yards landing (v61, 7200a84)
Scenario: tools/playtest/scenarios/g1_yards.mjs (reused, unchanged)
Shots: ~/.hermes/cache/scratch/tlloop/reports/0005.jpg (sheet)

## Verified since last time
- "Plowed yards in town" (7200a84, G1, script v61): re-ran `g1_yards.mjs` unchanged on fresh origin/main.
  Numbers landed exactly as the builder logged: depot yard 2.54 m/s, garage forecourt 2.54, Strandbu home
  2.52, Mehamn village 2.55 (all start+target depth 0.07–0.09 m, pack 0.85), open powder unchanged 1.38 m/s.
  page errors: none. Stills (00–02 depot, 03 home, 04 depot night in the sheet): packed yards read as a
  smooth grey apron around each building, no hard rings or floating geometry, buildings intact day and
  night. **Confirmed working, no regression.**

## Findings (most important first)
1. [G1][med] The scenario's own "shore-road house" stop (12 m out from depot.x+46, depot.z+26, a Kjøllefjord
   shore-road building) is NOT plowed: start depth 0.47 m / pack 0.13 (deep powder) vs 0.07–0.09 / 0.85 at
   every other yard, and the 10 m walk there averaged only **0.58 m/s in 14.08 s** — roughly a quarter the
   speed of the depot/garage/Strandbu/Mehamn yards (2.5+ m/s) and even slower than open powder (1.38 m/s),
   because the last couple meters cross into the plowed disc right at the door and the walker is still
   wading for most of the 10 m. This looks like one specific shore-road house (or a building type/`KIT.house`
   variant along that stretch) that `addYard`'s per-building discs didn't reach — worth checking whether
   this address is a `SITES` entry without a `KIT.house` call, or whether its yard radius is too small for
   how far the door sits from the building anchor. Not every shore-road house was retested, so this may be
   one outlier rather than the whole street; the backlog's existing "plowed lanes along the shore road" item
   is the right place to land a fix, but this gives it a concrete repro (dep.x+46, dep.z+26, yaw -1.2 rad)
   and a number to compare against.
2. [G3][low] HUD badge still reads "OPEN BACKCOUNTRY" at the depot yard, garage and home yards right next to
   buildings (all 5 panels in the sheet) — same zone-boundary quirk already logged in report 0004 finding 3.
   Confirming it's still present post-v61 landing, not a new regression; stays a low item.
3. [G1][info] Open powder pace (1.38 m/s) and yard/garage/home paces (2.52–2.55) both match the builder's
   log exactly — the plowed-yard mechanic is solid everywhere it's wired up; the shore-road gap in finding 1
   is the only place it doesn't reach yet.

## Ideas
- Reuse `g1_yards.mjs`'s "shore-road house" spot as the before/after repro when the shore-road plowed-lane
  item is built; it already isolates the exact building and prints depth/pack at both the start point and
  the door.

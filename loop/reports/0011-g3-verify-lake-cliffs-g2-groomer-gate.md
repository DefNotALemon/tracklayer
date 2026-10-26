# 0011 — Verify v68 lake-cliff fix (G3) + G2 groomer-wording check — main @ e842cf5
Scenarios: tools/playtest/scenarios/g3_ridge.mjs (existing), tools/playtest/scenarios/g2_groomer_gate.mjs (existing)
Shots: /tmp/tlout0011/sheet.jpg (also ~/.hermes/cache/scratch/tlloop/reports/0011.jpg), /tmp/tlout0011b/sheet.jpg
(also .../0011b.jpg)

## Verified since last time
- v68 "no more cliff rims round the lakes" (d276e89): **confirmed**. g3_ridge.mjs at the same pinned spot
  (1700,-379, dir 1, 3.0 km out, Røyevatnet area) reproduced the PROGRESS numbers exactly: `cliffs` 683,
  `lakeCliffs` 110 (pre-fix was 4525 / 3952). Vision on the wide + 3 telephoto stills: far hillsides and the
  lake surroundings read as smooth, continuous snow with natural wind-ripple shading (from v67) — no
  comb/sawtooth teeth, no stair-step rings anywhere in frame, no seams at the lake edge. Night band item
  (0010 F1) wasn't in scope this pass (needs the specific night village angle, not this scenario).

## Findings
1. [G2][med, confirmed still open] The backlog item "rank 3 announces grooming but the groomer/receiver are
   Woodsman-tier" is still live in code: `contractBlock` (tracklayer.js:6039) still reads `"That's grooming
   work. You need a groomer drag on the hitch: the garage sells them."` with no mention of needing a
   Woodsman-or-newer sled first. Reproduced with g2_groomer_gate.mjs at delivered=3, cash=500: the only
   place that actually says "Fits the Woodsman 440 W/T and newer (4 deliveries, $600)" is the garage Parts
   tab's lock line for the groomer/receiver (already fixed, presumably the v59 landing referenced in the
   scenario's header comment) — the contract-side toast/card text at line 6039 was never updated to match.
   A player who taps the locked grooming job before opening the garage Parts tab only hears "the garage
   sells them," not that they need a different sled first (one extra garage visit to discover the real
   lock, as the backlog item already says — confirming it's still accurate and ready to build).
2. [G2][info] Garage clarity otherwise good at delivered=3/cash=500: Woodsman sled card reads "$600 once
   you've made 4 deliveries (you have 3) · opens 22 more parts in the shop" — clear progress-to-unlock
   messaging. At delivered=4/cash=5000, `buySled("woodsman")` succeeds immediately (`GS.own.sled` →
   "woodsman"), no friction.
3. [G2][low, scenario note for the builder] g2_groomer_gate.mjs's crew-board capture (`TABLET.go("crew")`
   then querying `#tablet .tcard, .card`) returns empty — the crew board renders on the in-dash 3D tablet
   mesh, not as a flat DOM overlay like the garage, so that selector never matches. The screenshot itself
   (01_crew_board_at_3.jpg) shows the HUD/world view with no readable board text. Not a game bug, but the
   scenario doesn't currently prove what the crew-board card itself says — only `contractBlock`'s toast
   text (which this report confirms via source read instead). Worth fixing the scenario (aim the camera at
   the dash, or read the board's data model directly) before using it to verify a wording fix.

## Ideas
- When the builder reworks contractBlock's groom lock text, grep all three `c.groom` branches (4926, 6039,
  7050) — the backlog item only pointed at 6039/toast text, but 7050's card-note branch should be checked
  too in case it has the same gap.

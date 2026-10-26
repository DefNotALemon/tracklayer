# 0021 — G2 first5min drive-to-delivery + verify v79/v80 — main @ 93d92e8

Scenario: `tools/playtest/scenarios/g2_first5min.mjs` (extended, committed), `tools/playtest/scenarios/g3_day.mjs`,
`tools/playtest/scenarios/g1_ski.mjs` (both reused, no change). Shots: `~/.hermes/cache/scratch/tlloop/reports/0021.jpg`
(first5min + g3_day contact sheet, 3-col); ski shots in `~/.hermes/cache/scratch/tlloop/0021_ski/`.

Focus: verify the two builder landings since 0020 first (v79 low-sun warmth, v80 ski-slope fix), then extend
`g2_first5min.mjs` per 0020's idea to actually drive the accepted job to delivery and time it.

## Verified since last time
- v79 (low sun warms snow, 75c52d6): `g3_day.mjs` rig at Nov-1 noon reproduces the landed numbers exactly
  (sun ffb77f, hemi 95bbff, el 4.04°, exp 1.05). Vision on the sheet: quay/toward-sun/sled-closeup read warm
  peach-cream on sunlit faces, shadows stay blue, no seam — matches the claim, no regression.
- v80 (skis feel the real slope, 61b5e51): reran `g1_ski.mjs` independently. Flat **2.51 m/s** (claimed 2.51),
  uphill **0.78** (claimed 0.78), downhill **5.12** (claimed 5.13), across **2.42** (claimed 2.41); felt-grade ≈
  ground-grade in all four (flat 0.003/0.003, up 0.243/0.24, down −0.173/−0.186, across −0.028/−0.032) — matches
  claim to the decimal, no regression. `page errors: none` both reruns.

## Findings (most important first)

1. [G2][medium][new] The Parcels tablet app does not live-refresh while a delivery completes with the tablet
   left open: drove an accepted "Two dozen eggs" job (quay → Myrvang, 768 m) to delivery with Tab still open
   the whole way. The toast correctly fired "Delivered two dozen eggs to Myrvang: +$120" and the HUD banner
   behind the tablet flipped to "No cargo / Tap for work", and the real game state updated (`GS.cash` 0→120,
   `GS.load.length` 1→0) — but the open Parcels screen itself kept showing **stale** data: header still read
   "$0" and "0 delivered", the SLOTS counter still said "1/1 · full", and the ABOARD row still listed "Two dozen
   eggs" as if still on the rack. Still `03_delivered.jpg`. A player who checks the tablet right after a
   delivery completes (very plausible — it's the natural "did that land?" reflex) sees contradictory info: a
   toast saying paid, a tablet saying $0 and still carrying. Fix: re-render the open Parcels/Home app on
   delivery (the same event that fires the toast), not just on next open.

2. [G2][info][new] First job acceptance → delivery, new save, default Frontier 340, straight-line auto-nav:
   accepted at `gameClock` 3.8, delivered at 45.0 → **41.2 game-s** for 768 m (quay → Myrvang), **+$120** cash
   (0→120). Well inside LOOP.md's "first upgrade within ~10–15 min" target — getting first cash at all takes
   under a game-minute once a new player finds the board and commits. Board at t=0 showed 6 posted jobs
   ($120–$235, all "quay → <village>, 0.6–0.9 km"), all with clear pay/route/fragility text; no confusion at
   accept. This closes the "extend g2_first5min.mjs" backlog ask for the first-cash leg; getting a full
   gameClock-to-$600 trace needs ~4 more deliveries and is reasonable scope for a dedicated future pass
   (roughly 4×40 game-s ≈ 3 game-min of driving plus board/accept overhead, not attempted this pass to stay
   inside the tool-call budget).

3. [G1][info][no action] 0020 F5 (fix `g1_town_quay.mjs`'s `sideCam` target args before relying on its
   stills) not touched this pass — rotated to G2/verify work instead; still open for whoever next uses that
   scenario.

## Ideas
- Finding 1 is a quick, well-scoped G2 fix: find the delivery event (`deliver(site)`) and call the Parcels/Home
  app's render alongside the existing toast, same pattern as other live HUD updates.
- Next playtester pass: continue the first5min trace toward $600 (G2) if the builder hasn't already covered it,
  or G3 daylight slice 8 (backcountry contrast) now that v79/v80 both verify clean.

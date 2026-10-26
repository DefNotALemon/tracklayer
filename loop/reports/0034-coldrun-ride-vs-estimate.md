# 0034 — G2 follow-up to v95 (COLD RUN chip): play a flagged card, check the estimate against a real ride — main @ 8ee52c0 (script v95)

Scenario: new `tools/playtest/scenarios/g2_coldrun_ride.mjs` (committed with this report). Woodsman lvl6,
stock kit, noon, weather pinned calm (`WX.at=()=>0`, `GS.storm=0`) — the exact "woodsman lvl6 stock 12:00"
combo from `g2_coldcard.mjs`. Shots in `~/.hermes/cache/scratch/tlloop/0034/` (not retained); contact sheet
`~/.hermes/cache/scratch/tlloop/reports/0034.jpg` (2 tiles: the flagged card, the ride's end state).

Focus: PROGRESS's newest backlog item (added by the v95 builder pass) — ride one COLD RUN-flagged freight
card for real (not just read `coldRun()`'s number) and see whether the ≈N% estimate matches what the rider's
own warmth actually does, plus whether the chip's "thaw out at X" stop is actually on the route.

## Findings

1. [G2][info] **Only one non-clean/tour/rescue freight card was flagged at this combo**, not 5–7. v95's
   PROGRESS entry counted `g2_coldcard.mjs`'s "5/7 flagged" across every big-card kind (clean-air runs
   included, which get their own, longer routes); restricted to plain freight the board only offered one:
   Skjånes → Ifjord, 7.46 km, predicted **192%** ("more than you've got"). Not a bug, just worth the builder
   knowing the flagged-card count in PROGRESS mixes freight types — a plain-freight-only count would read
   lower and might look like the chip under-fires if someone compares the two numbers later.

2. [G2][med][real ride found a bigger problem than the estimate] **The sled never reached a sustained
   19.2 m/s (the formula's assumed `12 + 6×power` for Woodsman).** Driving straight at the destination with
   a yaw-to-target nav harness (same pattern as `g2_cleanair_deliver.mjs`), the rig covered 2,338 m of the
   7,460 m leg in 184.3 game-s — average **12.7 m/s (28 mph)**, 66% of the assumed cruise speed — before
   crashing/ejecting the rider in open "High Country" terrain. At the crash, `GS.warmth` had already dropped
   **100% → 25.3% (−74.7 pts)** in just 49% of the route's distance. Extrapolating the observed cold rate
   (≈0.405 pts/game-s) over the time a sustained 12.7 m/s leg would actually take (588 game-s, vs the
   formula's assumed 388.5 game-s) gives **≈238%** warmth loss — well past the card's own 192% estimate.
   In this case both numbers already say "don't go," so the player isn't misled, but for a borderline card
   (chip showing 70–99%) the same gap could tip an "it'll hurt but I'll make it" read into an actual
   blackout, because real off-road speed is lower than the formula assumes. One sample (one route, one
   nav-harness run, not a human driver) — worth the builder re-running on 2–3 shorter flagged legs with a
   gentler nav harness (avoid crashing) to see if the speed gap holds up before changing the formula.

3. [G2][low] **The chip's "thaw out at Risfjord" stop sits 288 m off the direct Skjånes→Ifjord line**, at
   the 20%-of-route mark (`coldRun`'s nearest-site search only requires both legs ≤85% of the direct
   distance, so a site can sit a few hundred metres to the side and still qualify). 288 m off a 7.46 km route
   is a minor jog, not a real detour — reads as fine, but worth the builder knowing the tolerance is loose
   if a future route produces a stop that's a bigger swing out.

4. [G2][info] `GS.warmth` readout in the HUD (25%) matched the scenario's own tracked value (25.3%) exactly
   — the chip's number and the live HUD stat agree on what "warmth" means, no unit mismatch.

5. [info] Scenario ran clean: page errors: none, exit 0 (ride was capped by `DRIVE_CAP_S`/a crash, not a
   script error — handled as a normal early-stop case).

## Ideas
- Builder: re-run `g2_coldrun_ride.mjs` (or a shorter-leg variant) on 2–3 more flagged cards with a gentler
  nav harness (ease off W near obstacles, avoid the crash that ended this run early) to see whether real
  achievable cruise speed is consistently below the formula's `12 + 6×power` assumption, or whether this
  route's terrain was unusually slow. If it holds up, either lower the assumed speed in `coldRun()` or treat
  its output as a floor, not a point estimate, in the card text.
- Not urgent: the stop-distance tolerance (finding 3) is fine as-is; only revisit if a future report finds a
  stop that reads as a real detour.

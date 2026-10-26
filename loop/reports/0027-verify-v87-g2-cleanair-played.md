# 0027 — Verify v87 (G2): clean-air runs, played end to end — main @ 676edce (code 596deae)
Scenario: tools/playtest/scenarios/g2_cleanair_deliver.mjs (new)   Shots: ~/.hermes/cache/scratch/tlloop/reports/0027.jpg
Raw stills/console: ~/.hermes/cache/scratch/tlloop/0027/ (board audit, reuses 0026's g2_cleanair.mjs) and
~/.hermes/cache/scratch/tlloop/0027b/ (live play-through, new g2_cleanair_deliver.mjs).

Focus: builder's latest landing since report 0026 was v87 (07:05 pass, "Clean-air runs: first work the
Aurora E opens", G2, hash 596deae) — 0026 had verified the older v85 fell landing, so v87 (and v86 tonne,
landed between them) were still unverified. Ran the existing `g2_cleanair.mjs` board audit unchanged
against current `origin/main`, then wrote a new scenario that actually takes a clean-air contract through
the real UI (clicks the Freight app's STRAP IT DOWN button), drives it to the destination with a
yaw-to-target nav harness, and checks what happens — the board-read verification report 0022-style passes
had already covered the numbers; this one plays the job.

## Findings (most important first)

1. [G2][info][confirms landing] **v87's board numbers reproduce.** `g2_cleanair.mjs` on current
   `origin/main`: clean-air contracts appear only from 60 deliveries, avg pay $10,430/$10,502 at
   60/75 deliveries [8,665–11,675] (PROGRESS claimed $10,222/$10,378 — within run-to-run board noise).
   Gate text unchanged: Apex/Matriarch read "Zero exhaust at the station: NILU only lets a battery sled
   near its samplers, the Aurora E…", Aurora reads "OK". Locked card at 50 deliveries, Aurora garage card,
   and Freight app CLEAN AIR card all match PROGRESS's claims. Not a false landing.

2. [G2][info][new, closes a real gap] **Played one end to end: claim → strap → drive → outcome.**
   `g2_cleanair_deliver.mjs` clicked the real `con:` button in the DOM (not a direct `acceptContract()`
   call) for an Ozone/Clean-room battery contract to Skjånes. It strapped correctly: toast
   "Strapped down: Clean-room battery bank (220 kg) for Skjånes. $2095 bond paid…", `TOW.kind` became
   `"trailer"`, `TOW.mass` 290 (220 cargo + 70 kg trailer tare). **Still 02_rig_behind.jpg (camera behind
   and 2.3 m up): the crate's mesh (`look: "crate"`) is clearly visible sitting in the trailer tub behind
   the Aurora**, straps and all — this directly answers report 0026 finding 4's open question (whether
   flatbed/trailer cargo renders at all): for the crate/tanks look family it does, cleanly, from a camera
   framed to include the hitch. 0026's "no cargo visible" was a camera-framing artifact of that pass's
   side-on 3.2 m shot, not a missing-mesh bug.

3. [G1/G2][med][real outcome, needs a follow-up scenario] **The run itself ended in "YOU BLACKED OUT"
   before reaching Skjånes.** The nav harness drove in a straight line from the quay (no roads/villages),
   breaking fresh powder the whole 4.9 km (HUD showed "POWDER · Breaking trail" throughout, snow drag up to
   1654 N). Over 137.6 gameClock-s (≈2h45m in-game, since 09:40 → 12:25) warmth drained 100% → 0% and the
   rider blacked out: "The Red Cross crew found you half-buried in drift… –$60. The clean-room battery bank
   didn't make it. The shippers keep your $2095 bond." Net result of the whole run: **–$2155** (bond +
   rescue fee), **zero pay**, cargo destroyed. The strap toast itself hints the intended route isn't a
   straight line through virgin powder ("Fragile science on the trailer: it's a long way out, and any
   village can plug you in on the way"), so this is very likely a nav-harness artifact (a real player would
   follow the coastal road through Lebesby/Dyfjord/etc., which is both faster and lets you warm up in a
   village along the way) rather than a bug in the clean-air job itself. But it does show the warmth clock
   is a real, severe risk on the game's longest hauls (clean-air dests are 4.0–5.1 km, the farthest routes
   on the ladder) if a player free-rides cross-country instead of sticking to plowed roads — worth a
   road-following version of this scenario next pass to see whether the *intended* route survives the trip
   without a village stop, since "any village can plug you in" implies the designer expects one.

4. [test-tooling][low] My own harness's "delivered" check (`loadLeft === 0`) is ambiguous: it fired as
   `delivered: true` with `gained: -60` when the cargo was actually destroyed by the blackout, not
   delivered. Scenario should check `GS.cash` against expected pay or watch for the specific delivery toast
   instead of just an empty load array — noting it here so the next pass that reuses this scenario for a
   road-following retest doesn't trust "delivered:true" at face value; fix queued for that rewrite, not
   filed as a game bug.

5. [G2][info] `page errors: none` on both scenario runs (board audit and live play-through) — no regression
   from the v87 landing, confirmed by actually playing it, not just reading contract-board numbers.

## Verified since last time
- v87 (clean-air runs, Aurora E, 596deae): board numbers hold, strap flow works via the real UI, cargo mesh
  renders correctly on the trailer. The straight-line drive outcome (finding 3) is inconclusive on whether
  the *intended* route is survivable — needs a road-following retest, not a verdict on the landing itself.

## Ideas
- A road-following nav scenario (stick to `YARDS`/plowed lanes + the coastal road, stop to plug in at a
  village) would answer whether the clean-air run's warmth budget is survivable as designed, separate from
  this pass's worst-case straight-line powder slog.
- If the intended route really does need a village stop, the CLEAN AIR card could say so more explicitly
  than the current flavour line ("any village can plug you in on the way") — e.g. a rough ETA or a warmth
  warning icon, consistent with G1's "clear on-foot/route prompts" direction.

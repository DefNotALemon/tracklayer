# 0090 — Ranger + flatbed heavy COLD RUN leg: autonav stalls on a grade (G2, follow-up to 0043/b54) — main @ 036a79b

**Focus**: rotating to G2 (fewest recent landings of the 3 goals in the last 10 reports — G1 4, G3 4, G2 2).
Last game landing (v150, pine snow caps) was already verified clean by 0089; the pass after it (036a79b) was
harness-only, nothing to verify. Picked the open G2 backlog ask (0043/b54 follow-up): "re-ride on a Ranger with
the flatbed and hand-steered/hardened nav" to get a real-player COLD RUN percentage instead of the earlier
auto-nav runs that crashed/oscillated.

Scenario: `tools/playtest/scenarios/g2_coldrun_ride_laden.mjs` (existing, reused as-is) —
`LR_SLED=ranger LR_HITCH=flatbed LR_KIND=heavy LR_LVL=10 LR_HOUR=12 LR_SECS=120`. Still:
`~/.hermes/cache/scratch/tlloop/shots/1026-231641-56914/01_laden_ride.jpg`, copied to
`~/.hermes/cache/scratch/tlloop/reports/0090.jpg`.

## Findings

1. [G2][med] **The Ranger+flatbed heavy leg (Ifjord → Gamvik, 9.5 km, towKg 265 = flatbed 125 + 140 kg cargo)
   stalls hard within the first 35 game-s and never recovers.** Speed samples: 31 → 15 → 16 → 10 → 3 → 1 → 0 mph
   while climbing world-y 22 → 91 (a rise onto 440 m "OPEN BACKCOUNTRY"), then pinned at 0–1 mph for the
   remaining ~85 s. Total distance covered: 206 m of a 9,500 m leg in 120 game-s. `maxMph` only 36 (never got to
   cruising speed before the climb killed it). Reconfirms 0052/b54's "Ranger flatbed heavy leg again useless"
   finding on a different route and a different scenario (this one steers via `P.yaw = atan2` every 300 ms
   instead of the old oscillating autopilot) — the failure mode is the same class, not a one-off harness bug.
2. [G2][low] **It's a stall, not a crash or snag**: `crashes: 0` for the whole run, `CRASH.on`/`FOOT.on` never
   tripped. The still shows the sled sitting upright on its own packed trench (HUD: "PACKED · On your tracks",
   3 mph), flatbed trailing normally behind with no visible detachment or tip. Snow depth stayed shallow (0.03–
   0.23 m) the entire ride, so this is not a powder-bogging case — it's a grade/power case: the loaded Ranger
   can't hold speed on whatever slope the straight-line route to Gamvik climbs at ~440 m elevation.
3. [G2][low] **The COLD RUN card's own number is suspect for this case**: `pick.empty` and `pick.laden` both
   printed **279%** (identical), which looks like the card's own estimator isn't differentiating empty vs. this
   particular laden tow for this route — separate from the ride result and worth the builder's eyes if `coldRun`
   is touched again. The measured-vs-projected comparison (card 279%, ride-projected 1706%) is not trustworthy
   given finding 1: a stalled sled projects near-infinite warmth loss per metre travelled, so this projection is
   an artifact of the stall, not a real "the card undersold it by 6x" result.
4. [G2][low, methodology] **This closes the open backlog ask as "not automatable the way it's written", not as
   a pass/fail on the game.** Three attempts now (0034, 0043/b54, this one) across different autonav styles have
   all failed to produce a usable Ranger-flatbed-heavy ride, each time because the straight-line steer drives
   the sled into terrain it can't climb rather than routing around it like a real player would. A faithful
   "real-player" number needs either an actual hand-driven session or a route-aware autonav (check `slopeAt`
   along the forward line and nudge around a steep grade, not just yaw-at-target) — that's a scenario/harness
   change, not something the playtester can land. Suggest the builder either write the slope-avoiding steer once
   (reusable for every future laden-ride scenario) or mark this ask as needing a manual Lemon playtest instead.

## Verified since last time
- v150 pine snow caps: already closed by 0089 (ride distance + night both clean); nothing new to add here.

## Ideas
- If the builder wants real numbers here without a full route-aware autonav: pick a LR_FROM/dest pair known to
  be flat the whole way (e.g. depot ↔ a quay along the coast road) so the straight-line steer can't hit a climb,
  and accept that as a lower bound rather than the worst-case route the current random `rows.find` picks.

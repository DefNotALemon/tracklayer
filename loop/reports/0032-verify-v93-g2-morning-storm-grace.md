# 0032 — Verify v93 (G2: new-save first-morning storm grace) — main @ 079d7e5 (script v93)

Scenarios: `tools/playtest/scenarios/g2_newsave_wx.mjs` (existing, builder-committed with v93),
`g2_coldrate.mjs` (existing, from 0031), and a new `g2_morninggrace_shot.mjs` (visual sky check across
hours, committed alongside this report). Shots: `~/.hermes/cache/scratch/tlloop/reports/0032.jpg`
(2x2 sheet, hours 10/13/14.2/16). Raw stills in the run's own scratch shots dir (not retained).

Focus: verify the builder's latest (only) landing since report 0031 — "A new game's first morning stays
clear until about 13:00 and storms ease in over the next two hours" (079d7e5, script v93), which gates
`WX.atT` to zero before calendar hour 13 and ramps it in 13→15 via `sstep(13,15,T)` on raw (unwrapped)
calendar hours, so it only ever suppresses weather in the first ~15 hours since epoch — i.e. only a
brand-new save's first in-game day, matching the commit's claim.

## Findings

1. [G2][info][confirms landing] **v93 reproduces exactly.** `g2_newsave_wx.mjs` (300 random weather
   seeds, quay + 1 km inland, 09:36→18:00 on day 1): storm share (WX.at > 0.55) is **0% in both the
   09:36–11:00 and 11:00–13:00 windows**, then **13% in 13:00–15:00** and **24% in 15:00–18:00** as the
   grace ramp lifts — before v93 the backlog's cited number was "14% of new saves had one before 11:00".
   `warmthLost_0936_1300_avg` (straight exposure math, no shelter) is now 52 over that whole pre-13:00
   window vs the ~1.1 pts/s à storm would have cost continuously. Live fresh save at hour 10.04: storm 0,
   wx 0, warmth 100 — clean start. No regression in the numbers the commit claims.

2. [G2][info][confirms landing, rules out a 0031 hypothesis] **The warmth drain is purely weather-driven,
   not a crash/on-foot cold multiplier.** `g2_coldrate.mjs` with weather pinned calm (`STORM=0`): sled
   parked −0.339, riding −0.329, foot standing −0.318, foot walking −0.312, **post-crash standing −0.305**,
   post-crash walking −0.302 warmth/s — crashing does not cost more than ordinary exposure (if anything
   slightly less, probably the "winded" pose being out of the wind a hair). With weather pinned to a full
   storm (`STORM=1`) every one of those numbers lands at **−1.20 to −1.24 warmth/s**, matching report
   0031's observed ≈1.1 pts/s post-crash drain almost exactly. This confirms the builder's diagnosis (storm
   intensity, not crash state) and closes 0031's open "check whether FOOT/crash state applies an extra
   cold multiplier" idea — it doesn't; don't spend a build slot on it.

3. [G3][info][visual, inconclusive by itself] `g2_morninggrace_shot.mjs` jumped a fresh save's `GS.hour`
   to 10/13/14.2/16 at the starting quay and shot each (0032.jpg): HUD reads "Clear" and the sky stays
   calm in all four, including hour 16 (just night falling, no storm visible). This save's random weather
   seed simply has no front near the quay in that window — expected, since the sampled storm share is only
   13–24% even after the grace lifts, so most individual seeds show nothing. Don't rely on a single-seed
   screenshot to confirm or deny this feature; the 300-seed numeric sweep in finding 1 is the real evidence.

4. [G2][low][harness follow-up, not a game bug] `g2_first5min.mjs`'s auto-nav still has no obstacle
   avoidance (0031 F3, unaddressed — fine, it's playtester-owned, not top of backlog). Didn't re-run it
   this pass since v93 doesn't touch movement/collision.

## Verified since last time
- v93 (new-save first-morning storm grace, G2, 079d7e5): storm share 0% pre-13:00 / 13–24% after,
  reproduces the commit's numbers; live new save confirms clear start. No regression.

## Ideas
- Builder: 0031's "extra cold multiplier after a crash" idea is now disproven by finding 2 — can be
  dropped from consideration without further testing.
- Playtester follow-up (low): once the obstacle-avoidance fix for `g2_first5min.mjs` lands (0031 F3), redo
  the first-5-minutes-to-$600 distance/time audit (open G2 backlog item) since the current harness crashes
  before covering real ground on this job/route.

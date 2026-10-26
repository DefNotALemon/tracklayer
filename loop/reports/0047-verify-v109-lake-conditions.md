# 0047 — Verify v109: frozen-lake ice skin off clear noon (G3) — main @ 22fbdb9
Scenario: tools/playtest/scenarios/g3_lake_conditions.mjs (new)   Shots: ~/.hermes/cache/scratch/tlloop/reports/0047.jpg

## Verified since last time
- v109 (f38ad4f, lake skin) landed before report 0046 but 0046's "Verified since last time" only covered v108
  (horizon haze) — this pass closes that gap and also answers the open follow-up note on the G3 backlog item
  ("unchecked: night/twilight/aurora, storm, melt, rider-height seam ~45 m out").
- Builder pass 53 (hill-cast shadows) was **not landed** (reverted same pass) — nothing new to verify there.

## Findings (most important first)
1. [G3][info] **Night and a forced-strong aurora both keep the wind-streaked/bare-ice look.** `lakestats.py`:
   night shore/low std **25.2 / 37.9**, local contrast **1.7 / 1.9** — close to the clear-noon numbers PROGRESS
   reported for v109 (std 8.6 shore / 11.0 low at a different angle), i.e. the streak pattern reads at least as
   clearly at night as at noon (moonlight/starlight contrast helps). Forcing `AUR.v = 0.8` (a night the natural
   seed wouldn't necessarily give) pushes std up further (56.6 / 36.4) with a visible green cast over the same
   streak pattern — no banding, no loss of the ice texture under the aurora tint. (0047.jpg tiles 1–4)
2. [G3][low] **A storm washes the lake to a near-flat white/grey field.** `lakestats.py`: storm shore/low std
   drops to **3.4 / 7.4** (vs. 25–57 clear/night/aurora), local contrast 0.4/0.8 — visually a flat whiteout, no
   streaks or bare-ice patches visible at all (0047.jpg tiles 5–6). This matches every other terrain surface in
   a storm (fog + snow showers kill contrast everywhere, not a lake-specific bug) so it's **not a regression**,
   just confirming the lake has no special-cased storm look (nothing to fix unless Lemon wants lake ice to read
   through light snow showers better than the surrounding land, which it currently doesn't and shouldn't need to).
3. [G3][low, inconclusive] **The ~45 m near/far shader hand-over (tracklayer.js:450) wasn't reliably isolated
   this pass.** Two attempts to stand on the ice and look at the hand-over band (one from the lake's recorded
   centre `LAKES[3]`, one from the known-good "low" shot's vantage reused at 20/45/90 m) both landed the camera
   looking at land-like terrain (brown patches, drift dunes) rather than lake ice in the frame — `LAKES[3]`'s
   `{x,z,r}` is evidently an approximate bounding circle, not the real (and apparently non-circular/off-centre)
   ice mask, and `isWater()` reads false everywhere on a frozen lake in winter so it couldn't be used to confirm
   footing either. Need a different way to confirm "standing on ice" next time (e.g. check `P.ice` while moving,
   or sample `lkBare`/ice uniforms directly) before the 45 m seam itself can be judged. Not treating this as a
   found seam — just an untested gap, logged so the next pass doesn't repeat the same wrong assumption.
4. [G3][info] Page errors: none across all three sub-runs (first 45m attempt, retry, final retry). `gameClock`
   advanced normally in all cases (no scenario hangs).

## Ideas
- Next attempt at the 45 m hand-over: walk/ride onto the lake from the shore (known to be ice per the existing
  `shoreAndLow` vantage) and sample `P.ice` each step to confirm footing before placing the hand-over camera,
  instead of trusting `LAKES[].r` as a literal circle.
- Melt-stage lake (open water winning over streaks from the shore in) still untested — skipped this pass for
  time; `CAL.jumpTo(3, 15)` + a short run to let `MELT.kq` ramp (it's per-frame budgeted, not instant) is the
  likely approach, worth a dedicated pass.

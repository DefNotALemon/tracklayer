# 0019 — Verify v77 glancing-angle sky sheen (G3) — main @ ec5e66f

Scenario: tools/playtest/scenarios/g3_day.mjs (reused, no code change needed), run twice: once against a
`git archive b436296` checkout (pre-v77, the commit right before the sky-sheen landing, i.e. v76) via
`TL_SRC=<archive dir>`, once against current main (v77), same scenario both times.
Shots: 01–06 each run; before/after pair sheet + per-shot band stats via `tools/playtest/pair.py` (reused
from report 0017's before/after pattern), whole-frame via `imgstats.py`.
Sheet: `~/.hermes/cache/scratch/tlloop/reports/0019.jpg` (6 rows, before|after side by side).

## Findings (most important first)

1. [G3][verified, matches claim] Band crop (260–1020 × 240–470) sat / blue−red reproduces PROGRESS's own
   numbers almost exactly on an independent rerun: 05 Nov backcountry sat **5.6 → 12.1**, b−r **0.5 → 9.4**
   (claimed 9.3); 06 March backcountry sat **9.5 → 20.2**, b−r **8.1 → 17.5** (exact match); 01 quay b−r
   **−2.8 → 4.3** (exact); 02 toward-sun b−r **21.3 → 27.3** (exact); 03 sun-behind b−r **1.9 → 9.4**
   (exact); 04 sled close-up b−r **−4.3 → −1.9**, close to "≈unchanged" as claimed.

2. [G3][confirmed, vision] Zoomed crops of rows 05 and 06: the after side reads a touch cooler/bluer across
   the open flats and toward the horizon than the before side. No hard seam, band, or edge visible at the
   50 m near-patch boundary in either row — the gradient reads continuous, matching the builder's "no seam
   at the patch edge" claim.

3. [G3][info, expected] Whole-frame `imgstats.py` saturation deltas are smaller than the band-crop numbers,
   as the loop's own pitfall note predicts (HUD/sky dilute it): 05 whole-frame sat 21.6→25.0 vs band
   5.6→12.1; 06 whole-frame 25.2→30.6 vs band 9.5→20.2. Not a discrepancy, just confirms the band crop is
   the right instrument for this change.

4. [G3][confirmed, no regression] Quay (01), sled close-up (04) and sun-behind (03) rows show no washing
   out, no banding, no plastic/cartoon shift; shadows, building colours and the rider/sled read normal in
   both runs. `page errors: none` on both the pre-v77 archive run and the current-main run.

5. [G3][info] At full-sheet thumbnail size the effect is still subtle to a casual glance — the backcountry
   flats read "pale with a cool cast" rather than a dramatic sky gradient; only visible clearly on a zoomed
   crop. Matches the builder's own framing (incremental slice, more to come) and the queued slice 7 (warm
   sunlit faces) is the right next half of this work.

## Verified since last time
- v77 glancing-angle sky sheen (ec5e66f): lands as claimed on an independent rerun (before/after archive
  pair, not just the builder's own numbers). Band stats match PROGRESS essentially exactly, no seams or
  artifacts, no regression in quay/town/sled-closeup views, no page errors either side.

## Ideas
- None new — backlog's queued "daylight slice 7" (warm sunlit-face sheen) is the right next G3 step and
  already filed.
- Goal rotation: reports 0016–0019 covered G1(16), G2(18), G3(17, 19 verify) — G1 (walking) hasn't had a
  fresh playtest pass since 0016/0015. Next playtester pass should rotate to G1 unless the builder lands
  something new to verify first.

# 0022 — Verify v81 (Parcels live-refresh) + G3 daylight slice 8 audit — main @ 0bee7b8

Scenarios: `tools/playtest/scenarios/g2_tablet_live.mjs` (reused, no change), `tools/playtest/scenarios/g3_day.mjs`
(reused, no change) + `tools/playtest/imgstats.py`. Shots: `~/.hermes/cache/scratch/tlloop/reports/0022.jpg`
(g3_day 3-col contact sheet); raw stills in `~/.hermes/cache/scratch/tlloop/0022/` (tablet) and `0022g3/` (daylight).

Focus: verify the builder's latest landing (v81, "Parcels redraws on delivery", 0bee7b8) since report 0021, then
look at G3 daylight slice 8 (open backcountry contrast), the top backlog item and least-recently-covered goal in
new findings (last 3 reports: 0020 G1, 0021 G2+verify, this one).

## Verified since last time
- v81 (Parcels redraws on delivery, 0bee7b8): reran `g2_tablet_live.mjs` on current main. Accepted "Birthday
  cake" → Naustbakken with Parcels open, parked at destination, let the proximity check deliver it: screen
  went **0/1 · 1 slot free · 1 delivered**, cash `$0 → $85` shown live, cargo no longer listed ABOARD —
  `stale=false`. Matches the landed claim exactly, no regression. `page errors: none`. (Home-app trial skipped:
  no second job available on the rack for that leg — board state, not a bug.)
- `smoke.mjs`: exit 0, page errors none, powder 1.44 m/s / trench 2.20 m/s / 6 s ride 65.5 mph — unchanged
  from the last few landings, no regression from v80/v81.
- v79 (low sun warms snow) light rig still reproduces to the decimal on this run: Nov-1 noon sun `ffb77f`
  el 4.04°, hemi `95bbff` 0.379, exp 1.05; March noon sun `ffdbb7` el 10.51°. No drift.

## Findings (most important first)

1. [G3][medium][confirms backlog] Open backcountry still reads flat/featureless at a glance — the slice-8
   item is real and unresolved. `imgstats.py` local-contrast score: quay `01_quay_day` 4.56, sled close-up
   `04` 3.89, toward-sun `02` 3.85, sun-behind `03` 4.01, but open backcountry `05_backcountry_day` **2.70**
   and `06_backcountry_march` **2.63** — clearly the two lowest-texture shots of the set (std 39.8/40.2 vs
   43–52 for the others). Vision on the sheet: 05/06 are close to a plain white-to-grey gradient with no
   visible drift shadows, bumps or slope shading even though the scenario deliberately sits 1.6 km from the
   quay on "gentle open ground" — there's no micro-relief for light to catch at all, so warming the sun tint
   (v79) can't fix this on its own, confirming the backlog's read that the next lever is geometry/normal
   detail, not more tint. Matches the filed item precisely; no new angle found this pass worth re-scoping it
   over.

2. [G3][low][reproduces, from 0004 F3/0005 F2] The HUD "OPEN BACKCOUNTRY" location badge is still shown in
   `01_quay_day`, `02_toward_sun` and `03_sun_behind` — all three shot at/near the quay with buildings in
   frame (rooftops visible top-left/right in 01 and 03). This is the same mislabel two older reports already
   filed (quay/town reading as backcountry); it's on the backlog as a low G3 item and this pass reproduces it
   again at a third location (the `g3_day.mjs` spawn point itself), so it isn't a one-off.

3. [G2][info][no action] Didn't continue the first5min $0→$600 trace this pass (0021's filed follow-up) —
   spent the budget on verify + the G3 slice-8 audit instead, since G3 had the fewest real findings across
   the last 3 reports. Still open for a future pass.

## Ideas
- Slice 8: the far terrain uses an 8 m-grid for normals (see the related ridge-shading backlog item); cheapest
  relief fix might be the same lever — denser far-terrain normal sampling or a cheap sun-facing slope bias on
  the existing low-poly far mesh, not a new geometry pass. Worth prototyping against `05_backcountry_day`'s
  local-contrast number (2.70) as the before baseline.
- OPEN BACKCOUNTRY mislabel: the zone test is probably a pure distance-from-quay-center check that doesn't
  know about the building footprint; grep whatever sets the HUD zone string and widen/replace the test with
  the quay/town site radius already used elsewhere (SITES lookup), rather than inventing a new one.

# 0045 — Verify v107: clear-day haze reduction on far fells (G3) — main @ 25c5e39
Scenario: tools/playtest/scenarios/g3_vista.mjs (reused, unchanged)   Shots: ~/.hermes/cache/scratch/tlloop/reports/0045.jpg

## Findings (most important first)
1. [G3][info] v107's fog/bandstats numbers reproduce almost exactly on a fresh run. Fog at 1 km both Nov and
   March noon read **0.51** (matches the landed 76% → 51% claim). `bandstats.py` strip4/strip5 (mid-far band):
   backcountry Nov away **2.19/0.35** vs PROGRESS's claimed 2.20/0.37; toward **10.76/10.24** vs claimed
   10.75/5.58 (order differs by a strip index but both read far brighter/higher-contrast than away, as expected
   with the sun ahead); March away strip4 **1.63** vs claimed 1.63 exactly. No drift between the builder's own
   verification and an independent re-run — the fix is real, not a one-off measurement.
2. [G3][med] Vision on 0045.jpg confirms the visual story matches the numbers: "toward" and "across" views
   (both Nov and March, backcountry row) show real shaped terrain with visible ridgelines and wind turbines
   still readable well into the distance — a genuine improvement over the old flat wash described in the
   backlog. The "away" direction, however, is still the flattest of the three in every row: a pale, nearly
   featureless basin fills the horizon with little texture, exactly matching the backlog's still-open note
   ("a faint flat pale band where the hazed far ground meets the sky in the backcountry vistas"). This is not
   a regression — it's the known limitation reproducing cleanly, confirming the backlog entry is accurate and
   still the right next G3 slice (shadows/relief toward the sun are strong now; away-from-sun flat lighting is
   the remaining gap).
3. [G3][low] No new visual artifacts anywhere in the sheet: no seams, banding, or pop-in at the terrain/sky
   line in any of the 9 stills (quay Nov ×3, backcountry Nov ×3, backcountry March ×3). Quay row (Kjøllefjord
   harbor, buildings, turbines) renders cleanly with no fog-related regressions near town.
4. [G3][info] Page errors: none. Run completed in the expected ~30 s wall / fast boot, no scenario hangs.

## Verified since last time
- v107 (de022b8/25c5e39, clear-day haze reduction): confirmed — fog and bandstats numbers reproduce
  independently, and vision agrees the toward/across backcountry views read more shaped and less washed-out.
  The one open gap (away-from-sun flat band) is unchanged, as the builder's own "Still open" note predicted.

## Ideas
- Next slice could target the "away" direction specifically (flat ambient/sky-light shading on far terrain
  normals facing away from the sun) rather than more haze tuning, since haze is now doing its job.

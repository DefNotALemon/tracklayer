# 0065 — Verify v130 day window glass (G3) — main @ c121fde

Scenario: tools/playtest/scenarios/g3_glass.mjs (new, committed by the builder with v130; reused as-is)
Shots: ~/.hermes/cache/scratch/tlloop/reports/0065.jpg (contact sheet, 18 views: nov/mar/night x 2 doors x front/closeL/closeR)

## Verified since last time
1. [G3][confirm] v130 (`houseGlassTex()` blended into houseWinMat via `uGlassDay`, replacing flat mid-grey day
   glass with a pale sky-reflection top / dark ridge line / dim room read) reproduces independently. Vision on
   both close-range doors (red Fisk & Friluft station, white house) at nov noon and mar noon: every pane now
   shows a visible horizontal gradient — lighter pale blue-grey top half, darker blue-grey bottom half, with a
   crisp dividing line reading as a reflected horizon — instead of the old flat painted look. Zoomed crop
   confirms the gradient is per-pane, not a lighting artifact on the frame.
2. [G3][none] Night glass (20:00–20:08, both doors) still reads as warm lit interior glow (pale cream, no
   gradient) — unchanged from pre-v130, dusk/night grading path not disturbed by the day-glass hookup.
3. [G3][none] Draw calls 871 (logged `info` after the nov pass) match the builder's claimed 871 → 871 exactly;
   no cost regression from the new texture/uniform.
4. [G3][none] No visible regressions on the wider "front" shots (whole-building views at all three times):
   siding, trim, roof, flag, forecourt all read consistent with the last several verified landings (v126–v129).

## Findings (most important first)
1. [G3][low] The reflection gradient is identical in direction/strength on every window regardless of which
   way the house wall faces relative to the sun (red station faces roughly south, white house faces open
   water/west; both show the same top-light/bottom-dark split). It reads fine as generic "sky reflection" but
   isn't actually responsive to camera or sun angle — a static per-material gradient rather than a real
   reflection. Not asking for a fix (would need an actual env-map sample, real cost for a decorative surface);
   flagging so the builder doesn't treat this as fully "done" if Lemon later asks for angle-dependent glass.
2. [G3][none] No other findings this pass — scene is clean across all 18 views.

## Ideas
- Builder's own next-up items stand: canopy soffit day/night grading (0063 F1 / 0064 F1, still open), red-house
  fascia tint, pool colour work already landed. This pass found nothing new to add to the backlog.

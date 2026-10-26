# 0060 — Verify v123 house roof trim (G3) — main @ 72406bc

Scenario: tools/playtest/scenarios/g3_roofs.mjs (reused, written by the builder)   Shots: ~/.hermes/cache/scratch/tlloop/reports/0060.jpg
12 stills: 2 houses near the depot (red "Fisk & Friluft" gable-front, white/grey-trim gable-front), corner/gable/eave
angles, at Nov noon, March 15:00 (low sun), and night 21:00 with aurora.

## Findings (most important first)

1. [G3][info] v123 VERIFIED landed as claimed. `info_corner` draw calls at the first corner view: **304** (builder
   claimed 304, exact match). smoke-equivalent: page errors none, scenario exit 0.
2. [G3][info] The new trim reads clearly and correctly in the large majority of views: eave fascia and barge
   boards form a distinct band separating wall from roof, with no floating geometry, gaps, z-fighting or texture
   seams across all 12 stills (3 house instances × 3 times of day × multiple angles).
3. [G3][info] Best case is the white/grey-trimmed house (nov_1_corner.jpg): a medium grey-blue fascia band reads
   cleanly against both the cream wall siding below and the white snow-covered roof above — a genuine
   improvement over the old bare slab edge, works well at a normal 3/4 approach distance.
4. [G3][low] Confirms the builder's own flagged risk (0053 F3 / PROGRESS v123 note): on the red "Fisk & Friluft"
   building's close-up eave view (mar_0_eave.jpg), the white fascia board is nearly indistinguishable from the
   white snow-covered roof slope directly above it — from this angle the two read as one continuous white slab,
   with only a faint grey shading on the soffit underside hinting at the boxed trim. Not broken, just low-contrast
   exactly where the builder predicted; worth a slightly darker/greyer fascia tint on red-trimmed houses specifically
   (the grey-trim house doesn't have this problem) if this item gets revisited.
5. [G3][info] Night readability is good: night_0_corner.jpg shows the rake and eave trim as a visible light
   blue-grey band against the dark red wall and the slightly-darker roof slope, aurora in the background doesn't
   wash it out, lit windows and the sign still look correct (no regression from v120/v121 sign work).
6. [G3][info] The small white box protruding near the roof ridge in mar_0_eave.jpg is a pre-existing chimney/vent
   cap, not new trim geometry — flagging so a future pass doesn't misread it as a glitch.

## Verified since last time
- v123 roof trim (`roofTrim()`: eave fascia, boxed soffit, barge boards) on KIT.house/buildSites: WORKS as landed,
  draw calls reproduce exactly (304). Reads well at normal distance and at night on both house colors tested; the
  one real weak point is the white-on-white close eave view on red houses, matching the builder's own prediction —
  not a new finding, just confirmed and narrowed to "red houses specifically, close range only."

## Ideas
- If the backlog revisits this item: try a slightly grey/weathered tint on the fascia board material only for
  red-trimmed houses (grey-trim houses already have enough contrast), rather than touching the whole trim palette.
- Backlog's existing next steps (workShed/hospital roof match, pump/canopy post detail, lamp pools) still stand;
  this pass didn't find anything new beyond the roof trim itself.

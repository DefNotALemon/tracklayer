# 0070 — verify v137 shore staircase fix (closes the last shore-slide stuck spot) (G1) — main @ 1ec2b27

Scenario: tools/playtest/scenarios/g1_shore.mjs (reused, unchanged)
Shots: ~/.hermes/cache/scratch/tlloop/reports/0070.jpg (contact sheet: shore_0_45, shore_1_45)

## Verified since last time
- v137 (fd13d4a, "shore staircase slide"): re-ran `g1_shore.mjs` on current main (HEAD 1ec2b27). Numbers reproduce
  the builder's landing exactly: avg along-shore **5.53 m**/5 game-s over 16 walks (was 5.13 pre-v137), **stuck
  (<1 m): 0** (was 1). Spot 3 45° side −1 — the one stuck case report 0069 flagged as a steep-slope read, not a
  shoreSlide bug — now covers **3.8 m along / 4.8 m moved** in 5 s (was 0.5 m along before v137; 0069 had measured
  only 0.65 m total on the pre-v137 build at that exact spot/angle). v137's dry x-only/z-only fallback evidently
  does reach that spot even though the local grade is steep (`slopeAt` ~1.32 there per 0069) — slope and the
  shore-slide math aren't mutually exclusive, and the fallback finds enough give to keep moving. No spot across
  all 4 locations × 2 angles × 2 sides sticks any more.
  Stills (shore_0_45, shore_1_45, both 45° side 1): walker is mid-stride, upright, feet planted on the snow
  surface in both frames; no clipping into terrain, no sinking into or standing on open water, no pose glitches.
  Both frames are night/dusk (polar-night lighting), readable enough to confirm no visual break.

## Findings
1. [G1][none — backlog item closes] The open shore-slide item ("walk the quay edge by hand, long diagonal beach,
   spot 3") is fully clean: 0/16 walks stuck, including spot 3 which was the one unresolved case. Recommend the
   builder closes this backlog line; no further shore-slide work needed unless Lemon raises a new spot.
2. [G1][low, new idea] 0069's open question stands independently of shore-slide: is a ~1.3 grade (~53°) meant to
   near-fully stop on-foot walking? That's a separate "steep-slope walking speed" question, not shore code; worth
   its own low-priority backlog line distinct from the now-closed shore item (0069 already proposed this; seconding
   it so it doesn't get lost).
3. [G1][info] Both stills are shot at night (09:58/10:23 in-game, polar night); the shore-slide fix reads
   identically at night and day based on the across-run numbers (no time-of-day branch in the code), so this isn't
   flagged as a gap — just noting the contact sheet happens to be dark.

## Ideas
- Since G1's shore line is now fully closed, next playtester pass should rotate to G2 or G3 per LOOP.md rotation
  (G1 has had 3 of the last 4 landings: v134 crest, v136 shore, v137 shore staircase).

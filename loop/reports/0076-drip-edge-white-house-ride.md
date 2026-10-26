# 0076 — roof drip edge at ride distance: white house vs ordinary house (G3) — main @ d798f2f

Scenario: tools/playtest/scenarios/g3_drip_ride.mjs (already existed, unrun since being left in the backlog;
no code change needed). Shots: ~/.hermes/cache/scratch/tlloop/reports/0076.jpg (contact sheet, 6 stills).
Backlog item (G3 buildings slice 3, left since report 0067): judge the v132 roof drip edge from ride distance
(15–25 m) on a white-painted house (grey trim) vs an ordinary painted one. Houses used: the Kjøllefjord
tackle shop (red, ordinary trim) and the nearest grey-trim white house to the depot.

## Findings (most important first)

1. [G3][low] On the **ordinary red house**, the drip edge reads clearly at both ride distances tested: a
   thin, continuous dark line sits right where the white snow-capped roof meets the red wall, visible along
   the whole gable eave in both `nov_near_15` and `nov_near_20`. It's a single crisp hairline, not busy or
   banded — doesn't fight the "FISK & FRILUFT" signage or window trim below it. This half of the v132/v067
   question is closed: ordinary-house drip edge looks right at ride distance, matching the 0067 up-close
   verification.
2. [G3][low] On the **white house**, the drip edge is already hard to make out at 15 m (`nov_white_15`): the
   grey trim line is there if you know to look, but at ride-distance resolution and lighting it reads as
   barely more than a soft shadow crease between two nearly-identical light-grey/white surfaces (vertical
   wall siding and snow roof), not a distinct line like the red house's. By 25 m (`nov_white_25`) it's gone
   entirely — the whole house reads as one flat pale volume with no visible eave edge, just a silhouette
   against the snow and sky. This matches the concern report 0060 F4/0067 already flagged (white house +
   grey trim = low self-contrast) but confirms it concretely at the actual ride distances the backlog asked
   for, rather than up close.
3. [G3][low] Night shots (`night_near_15`, `night_white_15`) don't add new information either way: at
   Kjøllefjord's Nov 21:00 the whole roofline on both houses sits in flat ambient dark with no moon/aurora
   lighting it from this angle, so the drip edge (day-only detail per design) isn't a fair test at night —
   consistent with report 0067's "fades at night, by design, no action" call. Not re-flagging.
4. [G3][low] Draw calls at the first corner view: 692 (logged by the scenario, informational only — no
   comparison baseline was taken for this specific camera setup, so it's not a before/after number).

## Verified since last time
- No new builder landing since v142 (0075/0074 already confirmed it); nothing to re-verify this pass.

## Ideas
- If the white-house case is worth a fix: give white/grey-trim houses a slightly darker trim shade than
  the red/painted houses' same grey (report 0060 F4's own idea — "a slightly grey fascia tint for white
  trim" was aimed at close range; at ride distance the gap would need to be bigger, maybe 1–2 shades darker
  specifically on `trimG` relative to plain `trim`, since the two currently share the same drip-edge darkness
  despite starting from very different wall contrast). Low priority: a flat white house silhouette reading
  as "a house" without a crisp eave line at 25 m isn't a bug players will notice riding past at speed, it's
  only visible because this pass stopped and looked.
- This closes the last open ask on the roof-trim backlog sub-item (buildings slice 3): builder can drop the
  "white gabled SITES homes (naust/brattli)" line, or re-open narrowly as "contrast fix" if the idea above is
  taken.

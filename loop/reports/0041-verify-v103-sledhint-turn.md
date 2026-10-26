# Playtest 0041 — verify v103 sledWhere() on-foot hint (G1)

Focus: verify the builder's latest landing (v103, 10:50, "On-foot prompt says where the sled is") and
close the backlog follow-up asking to check the hint through a real A/D turn (not a scripted yaw snap).
Scenario: `scenarios/g1_sledhint.mjs` (existing, reused as-is) + new `scenarios/g1_sledhint_turn.mjs`.
Both committed with this report. Calm weather pinned (`WX.at = () => 0; GS.storm = 0`), gameClock timed.

## Findings

**F1 — sledWhere() reproduces exactly.** `g1_sledhint.mjs`: 25 m out, 6 facings all read a distance
(6/6, matches v103's claim), and the direction word is correct in every case: rel180 "behind you",
rel0 "straight ahead", rel±90 "on your left/right", rel±35 "ahead on your left/right". Near prompt
correctly reverts to "Q: get on the sled" both off the sled (d=1.1 m) and back at it (d=2.2 m).
Walking back using only the hint took 12.8 s for ~23 m (≈1.8 m/s, normal walk pace). No bug.

**F2 — HUD pill renders clean (vision, 0041.jpg).** All six far-hint stills and the near-prompt still
show the text fully inside the dark HUD pill, centered, not clipped or overlapping the fuel/power/stats
panel or the minimap. Readable at a glance. No visual issue.

**F3 — turn-in-place tracks correctly, closing the v103 follow-up (vision + numbers, 0041b.jpg).**
Backlog asked to check "straight ahead" reads right after a normal A/D turn, since the camera trails a
sudden turn. Ran `g1_sledhint_turn.mjs`: started facing away (sled "behind you", relDeg -180), held D to
turn in place with real input (not a scripted yaw assignment) — the hint flipped live through the turn
and settled on "straight ahead" at relDeg -12 (sled visible dead ahead in the still), continued turning
to "on your right" at relDeg -99. No lag or mismatch between the camera and the hint text at any sampled
point (150 ms polling through the whole turn). **This item can be closed — no camera-trail bug found.**

**F4 — the other half of that backlog item is still open.** The follow-up also wanted "a small world
marker over a far sled at night / in a storm when it's out of sight" — that's a feature, not yet built;
this pass only verified the text hint (which doesn't depend on seeing the sled). Not tested here: hint
legibility/usefulness at night or in a storm with the sled actually out of view. Suggest a quick night
pass before building the marker, to confirm the text hint alone isn't already enough.

**F5 — long-hint wrapping untested.** The ahead+left/right hint string ("Sled 25 m ahead on your left ·
walk back and press Q") is the longest variant; both scenarios ran at the harness's default viewport
(1920 wide) where it fit on one line with room to spare. Not checked at a narrow/mobile-ish viewport —
low priority since Tracklayer is desktop-first, but flagging in case the HUD pill has a min-width that
could wrap it awkwardly.

## Suggested next step
Close "check A/D turning" part of the v103 follow-up (F3, confirmed fine). Keep "world marker when out
of sight at night/storm" as the open backlog item — it still needs F4's night/storm check before or
during the build.

Stills: `~/.hermes/cache/scratch/tlloop/reports/0041.jpg` (g1_sledhint.mjs sheet),
`~/.hermes/cache/scratch/tlloop/reports/0041b.jpg` (g1_sledhint_turn.mjs sheet).

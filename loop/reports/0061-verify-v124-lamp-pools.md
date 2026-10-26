# 0061 — Verify v124 street-lamp light pools (G3) — main @ 590bbcb

Scenario: tools/playtest/scenarios/g3_lamps.mjs (reused, LAMPS=0,4,9)   Shots: ~/.hermes/cache/scratch/tlloop/reports/0061.jpg
12 stills: 3 lamps (Lebesby house lamp, Nordkinn Redning base lamp, Kjøllefjord village lamp) × near (9 m) / ride (22 m)
× night 21:00 / Nov noon.

## Findings (most important first)

1. [G3][info] v124 VERIFIED landed as claimed. `renderer.info.render.calls` at night: **508** (builder claimed
   507 → 508, exact match). smoke-equivalent: page errors none, scenario exit 0.
2. [G3][info] At ride distance (22 m, how a player actually sees these while driving past) the pool reads clearly:
   a soft warm orange disc on the snow around the post, drift streaks show through it, no hard edge, nothing
   drawn over the sign/house/pump island (night_4_ride.jpg, night_9_near.jpg village view). Good improvement
   over the old bare dark-ground-under-glowing-head look.
3. [G3][low] At near distance (9 m, almost standing on the post) the pool is noticeably fainter and harder to
   pick out than at ride distance — the opposite of what you'd expect standing right next to it (night_0_near.jpg).
   Likely just foreshortening: a 13 m disc centered on the post, viewed from 9 m away and ~2 m up, puts most of
   the disc edge-on/behind the camera rather than in frame. Not a bug, but worth noting since a player walking
   up to a lamp on foot (G1 focus) gets a weaker impression of the light than one riding past at speed.
4. [G3][info] Confirms the builder's own flagged follow-up (PROGRESS v124 note): lamp heads (`K.glowM`) still
   glow bright white at Nov noon in full daylight (zoomed crop of nov_0_near.jpg lamp fixture) — a pre-existing,
   already-tracked issue shared with ferry windows/pump displays, not new.
5. [G3][info] Kjøllefjord village view (night_9_near.jpg) with lamp, tackle-shop building and plowed lane all in
   frame at once: pool sits correctly on the plowed snow, doesn't bleed onto the red building wall or the sign
   text, no z-fighting with the lane's plow texture.
6. [G3][info] No FPS/visual regression spotted across the 3 lamp locations tested (house yard, open base lot,
   village street) — pools look consistent regardless of surrounding geometry.

## Verified since last time
- v124 street-lamp pools (`lampPools()`): WORKS as landed, draw calls reproduce exactly (508). Reads well at
  ride distance and in a mixed village scene with other geometry nearby; the one new wrinkle is that the pool
  is actually less visible from directly beside the post than from 22 m away, which the builder may want to
  know if lamp pools come up again (a slightly wider disc radius or brighter near-field falloff could help foot
  players specifically).

## Ideas
- If lamp pools get revisited: a non-linear/brighter near falloff so a player standing right at the post (not
  just riding past) sees the glow too, complementing the existing backlog item to match the station pool's
  tint/strength (0059 F3).
- Backlog's existing next steps (lamp head noon glow, workShed/hospital roof match, red-house fascia tint) still
  stand; this pass didn't find anything new beyond the lamp pools and the near/ride visibility note above.

# Builder progress log

Newest first. One entry per builder pass:

```
## <date time> — <short title> (Gn) — <landed hash | not landed: why>
What changed for the player, numbers before → after (gameClock), smoke result, stills judged (paths), what's next.
```

## 2026-10-26 04:25 — Walls slide you along instead of wedging you (G1) — 3567c2b
No new reports (last 13). Took the wall-stall item over daylight slice 4: G1 had no landing since v64 and it's
friction a player hits at every door. Cause: house walls are a grid of r 1.35 discs 1.9 m apart, so the walker's
per-disc push-out left a 0.29 m notch between discs (trap for any approach within ~35° of square) and round-post
corners (a 20° approach stopped dead where the corner disc's normal faced the walk). `footStep` now sums the normals of
every disc within a probe 0.3 m wider than the body, takes the into-the-wall part off the step, and pushes out along
that one normal; discs tagged `ax` (building yaw: `KIT.house`, depot buildings, garage) snap their normal to the
nearest face, so walls act flat. Per-disc push kept as fallback. New `scenarios/g1_wallslide.mjs` (6 game-s holding W
from 7.5 m off the shore-road house wall): 20° off square **3.9 m moved / 1.4 m along the wall → 10.2 / 5.4** (slides
and rounds the corner); 0° stops square (sideways drift −0.55 → 0.00 m); 35/50/65° and a lone tree unchanged; never
inside a disc. `g1_yards.mjs` "shore-rd old aim" **0.58 → 1.64 m/s** (10 m in 14.1 → 6.1 s); other rows unchanged.
smoke.mjs exit 0, page errors none (powder 1.44, trench 2.22, 6 s ride 65.2 mph). Not visual, no stills. README walking
paragraph; v73. Follow-up: tag the remaining disc-grid buildings with `ax`. Next: daylight slice 4.

## 2026-10-26 04:00 — Rank-up nag gone once the rig is hitched (G2) — 7fb1d8a
Triage 0013: F1 real bug in v70 — `rankOpens()` returned the raw `RANKS[].opens` (still ending "You'll want a groomer on
the hitch.") when the rig was already fitted, so a rider who had just hitched a groomer was told to go get one. Took it
ahead of daylight slice 4 (small, a just-landed feature telling the player something false). Now the canned nag is always
stripped and `rigNeed()` appended only when something's missing. `g2_rig_wording.mjs` state "Woodsman + receiver +
groomer fitted": rank3 "Grooming contracts are on the board. You'll want a groomer on the hitch." → "Grooming contracts
are on the board."; other 6 states unchanged. F2 (rest of v70 checks out): no action. smoke.mjs exit 0, page errors none
(powder 1.48, trench 2.18, 6 s ride 65.4 mph). Text-only, no README change; v72. Next: daylight slice 4.

## 2026-10-26 03:55 — Far beacons shrink to a soft glow (G3) — 796dc3b
Report 0012 F1: from 0.7–1.2 km the guide beacon was a hard hairline from the roofline to the top of the frame (too few
px wide for v69's silhouette fade). `beaconMat` now passes the camera's ground distance to the pillar (vBD) and blends
by `smoothstep(300, 1100)`: the top fade moves from 450–1000 m of height down to 30–280 m, the foot falloff steepens a
little and strength drops to 0.85×. Inside 300 m nothing changes. `g3_beacon.mjs` now also shoots 700 m. Before → after
(top of pillar in the 1280×720 frame, contrast-boosted strips b14/strip.jpg): 700 m night ran to the HUD at y≈60 → fades
out by y≈130; 700 m day full-height hard line → soft taper fading toward the top; 1200 m day (foot behind a hill) a
faint line at the top of the sky +33 luma at y120 → +11 (gone). 120/350 m unchanged (vision on b14/crop.jpg; row stats
there are dominated by toasts/HUD). smoke.mjs exit 0, page errors none (powder 1.44, trench 2.18, 6 s ride 65.5 mph).
README tablet paragraph; v71. No new reports to triage (last 12). Next: daylight slice 4 (far terrain contrast).

## 2026-10-26 03:45 — Rig gates say what you're missing (G2) — d1a31b7
Rank 3 told a Frontier rider "You'll want a groomer" and the groom card said "the garage sells them", but the groomer
(and the trailer at rank 5) fit only the Woodsman and newer and need a $150 receiver. New hoisted `rigNeed(id)` (tier
lock via `genWhy` with sled price/deliveries, else "the garage sells … ($N)", else "yours is at the garage: hitch it on",
plus the receiver if `recvOk` fails) and `rankOpens(r)`; used by the groom + heavy-freight `contractBlock` lines, both
accept toasts and the rank-up toast. Locked cards now end "(Woodsman+ sleds)". New `scenarios/g2_rig_wording.mjs`
(reads the strings directly at 6 ladder states). Before: every state said "the garage sells them". After, 3 deliveries on
a Frontier: "The tow-behind groomer drag ($700) fits the Woodsman 440 W/T and newer (4 deliveries, $600). It hooks to a
hitch receiver ($150)."; on a Woodsman it drops the sled line, then the receiver line, then is empty once fitted.
Still of the Trail Crew app (b13shot/01): the line fits the card on three small lines, no clipping. smoke.mjs exit 0, page
errors none (powder 1.47, trench 2.24, 6 s ride 65.4 mph). README rank section; v70. Triage 0012: F1 beacon hairline at
1.2 km → new G3 item at top; F2 wall-stall re-confirmed 0.58 m/s (noted); F3/F4 info. Next: beacon distance fade.

## 2026-10-26 03:30 — Guide beacons are soft light columns (G3) — c91d357
Report 0010 F1's "huge uniform grey band" in the night sky was the guide beacon over the quay (empty-handed you get
one over the depot): a 4.4 m × 1 km additive tube at flat opacity 0.2 with no fog, so from 120–350 m it drew a
hard-edged bar from the village to the top of the frame. Kept the beacon (it's how you find your way) and gave all
of them (sites, lookouts, school yards, school checkpoint) one `beaconMat`: a MeshBasic `onBeforeCompile` that fades
alpha to 0 at the silhouette (view·normal²), keeps it strong at the foot and thins it upward, fading out over the top
half instead of a cut. New `scenarios/g3_beacon.mjs` (depot beacon from 120/350/1200 m, midnight + noon, weather
pinned). Before → after (half-max width of the pillar at a mid-sky row, 1280 px frame): 120 m night **22–24 → 16 px**,
day 22 → 16–18; core peak unchanged (+85–100 luma over the sky), so it still reads clearly as a marker. Vision on
shots b12/crop.jpg (before top, after bottom): flat bar → glowing column with soft edges, no artifacts.
smoke.mjs exit 0, page errors none (powder 1.44, trench 2.20, 6 s ride 65.4 mph). README tablet paragraph; v69.
Triage 0011: F1 re-confirms the groomer wording item (moved to top, G2 has had one landing to G3's four); F2 garage
clarity fine (no action); F3 `g2_groomer_gate.mjs` can't read the 3D board (noted on the item). Next: groomer wording.

## 2026-10-26 03:20 — No more cliff rims round the lakes (G3) — d276e89
Took the far-terrain sawtooth item over daylight slice 4 (a visible artifact beats a contrast nudge). Cause was
geometry, not shading: `genWorld` carves each lake basin with `mk = 1 − sstep(0.85, 2.1, t)` but skips cells past
`dd > 1.7 r`; with the noisy t, mk was still up to ~0.5 at that cut, so every lake had a ring of 20–40 m one-cell cliff
steps (probe: 360 → 388 m in 4 m) that the 8 m far terrain drew as a comb of teeth. Fix: mk also fades to 0 from
1.2 r → 1.7 r (ice and banks inside t < 0.97 untouched; icefish depth charts unchanged; lakeside cabins use
`flatSpot` at runtime). New `scenarios/g3_ridge.mjs` (finds the worst view, logs cliff counts, TL_SPOT pins a spot).
Before → after: 4 m edges rising >10 m world-wide **4525 → 683**, within 2 r of a lake **3952 → 110** (rest are sea
cliffs). Pinned spot −234,676 (Røyevatnet, 1.5 km out): vision on shots/b11/cmp.jpg — comb ridge gone, slopes read
as one smooth fell, no new seams; a soft zigzag of shaded triangles where snow thins to rock remains (new low item).
smoke.mjs exit 0, page errors none (powder 1.48, trench 2.21, 6 s ride 65.7 mph). README intro line; script v68.
Triage 0010: F1 night-sky grey diagonal band → new G3 item; F2/F3 night walking fine (no action); F4 quay contrast
variance (ignore unless it recurs). Next: night band (G3) or groomer wording (G2).

## 2026-10-26 03:08 — Wind-sculpted snow relief (G3) — 454630b
Daylight slice 3. First fixed `g3_day.mjs`'s backcountry teleport: its search started at r 300 m, so the first
obstacle-free spot was the town edge; now 1.5 km+ out, 600 m+ from every site, open fell (`bioAt` 0, no frozen lake),
gentle ground, and it logs the distance (1.50 km). Then `patchMat` fragment: fresh untouched snow gets a per-pixel
normal tilt from a world-space height noise (sastrugi ripples stretched across a NW wind, bent by a domain warp,
gathered in patches, plus slow ~10 m drift swells); fades out on packed snow, ice, rock/bare ground, wet spring snow
and from 28 → 45 m (the patch edge). No geometry/physics change; sin-free hash so big world coords don't band.
g3_day before → after (imgstats local contrast / std): backcountry Nov **2.35 → 2.78** / 40.0 → 40.1; March **2.29 →
2.66** / 40.8; quay 4.41 → 4.42, sled close-up 3.78 → 3.83 (yards are plowed so near-unchanged, as intended). A first
try (stronger, uniform ripples) looked like motion-blur streaks at dawn from the chase cam; softened ~35%, warped and
patched; vision on shots/b10/cmp2/sheet.jpg: reads as natural wind-blown snow, no seam where it fades, no artifacts.
smoke.mjs exit 0, page errors none (powder 1.43, trench 2.20, 6 s ride 65.6 mph). README daylight paragraph; v67.
Triage 0009: all confirmations of v66 (no action; the card-height idea noted for the Aurora perk item). Found: a
sawtooth band on far hillsides (new G3 item). Next: daylight slice 4 (far terrain) or the G2 groomer wording.

## 2026-10-26 02:52 — Trekker earns its place: built-in touring kit (G2) — 2e529fb
The Trekker ($3400, 24 deliveries) had less power than the Summit before it and nothing else to show; its 0.9-burn
engine didn't even count (stock engines report burn 1). Decided not to retune its power (it's a touring sled, not a
mountain sled) but to make it the long-haul machine: new `SLEDS[].perks` (added in `stats()` after parts, so it stacks)
and `perk` text shown in green on the garage card. Trekker: +2.5 warmth (heated grips/seat, tall shield), +1 parcel slot
(its rack), burn −0.1. New `scenarios/g2_sledperks.mjs`. Before → after (Trekker): slots 1 → **2**, warmth 5 → **7.5**
(cold drain 100% → 73%), burn 1 → 0.9, range 30 → 33.3 L-equiv = **1.25× → 1.39× the Summit** (Aurora 1.42); 20 s ride
2.29 → 1.78 L/km. Other sleds unchanged. Card text checked in the scenario log. smoke.mjs exit 0, page errors none
(powder 1.49, trench 2.25, 6 s ride 65.6 mph). README garage paragraph; script v66. Did not touch the two-up seat /
tours (Lemon's spare-seat work). Triage 0008: all confirmations (v65 verified, slice 3 + g3_day teleport + HUD badge
already queued). Follow-up: Aurora E vs Matriarch (new item, use perks). Next: daylight slice 3 (G3).

## 2026-10-26 02:45 — Clear-day air: thinner, cool-blue haze (G3) — 5085562
Daylight slice 2, fog part. `updSky`: while the sun is up and the sky clear (`clr` = sun ramp × (1 − storm)) fog
density drops 30% (0.0017 → 0.00119) and its colour (shared with the sky shader's horizon, so no seam) leans 35%
toward a cool blue `C_AIRDAY` (Nov noon fog b5b8c6 → adb8cd); storms and night unchanged. `GFX.fogK` (low preset
1.3×) had no consumer; it now multiplies the density. g3_day.mjs before → after (imgstats std/local/sat): quay
51.1/4.53/37.5 → 52.4/4.41/37.2; backcountry Nov 39.0/2.69/24.8 → 40.2/2.78/25.3; March 40.5/2.62/25.7 → 40.9/2.71/25.8;
sled close-up unchanged. Vision (shots/fog_cmp/sheet.jpg): far headland keeps more shape, sky/fog a cleaner blue
instead of lavender-grey, no terrain/sky seam or far-edge pop. Modest: the flat look is mostly the near snow
(slice 3 queued). smoke.mjs exit 0, page errors none (powder 1.47, trench 2.20, 6 s ride 65.1 mph). README; v65.
Triage 0007: F1/F4 confirm v63 (no action), F2 folded into the first-5-min item (low), F3 5th HUD-badge confirmation.
Found: g3_day's backcountry teleport doesn't leave town (stills 0.31 km from quay), noted in slice 3. Next: Trekker trap (G2,
no G2 landings yet) or daylight slice 3.

## 2026-10-26 02:33 — Plowed apron out from every house door (G1) — f4741a8
Cause of report 0005 F1 (0.58 m/s at the shore-road house): a measurement artifact. New `scenarios/g1_townlots.mjs`
shows all 13 buildTown lots built and fully plowed (yard 1, pack 0.85); the old `g1_yards` aim walked at the
house's middle from the side and stalled against the wall (10 m never reached in 14 s). Re-aimed square-on at
the door (kept the old aim as a row): 1.93 m/s, slower than other yards because `KIT.house`'s disc reaches only
~4 m past the door wall. Fix: lit (doored) `KIT.house` adds a 3.5 m disc 5 m out from the door wall → plowed
~8.5 m out, easing over 6 m. g1_yards before → after: shore-road door 1.93 → **2.42 m/s** (start depth 0.45 →
0.31); depot/garage/Strandbu/Mehamn 2.52–2.55 and open powder 1.38 unchanged. Stills (shots/apron_cmp/sheet.jpg):
no rings or artifacts, packed snow reads the same as the rest of the yard. smoke.mjs exit 0, page errors none
(powder 1.52, trench 2.25, 6 s ride 65.3 mph). README walking paragraph; script v64.
Triage: 0006 F1 confirms daylight slice 2 (already queued, now top), F2 third confirmation of the HUD badge item,
F3 info. Follow-up: walking into a wall at an angle stalls (new G1 item). Next: daylight slice 2 (G3).

## 2026-10-26 02:22 — A clear first ride (G1) — 60e578a
Cause: `buildHospital` picks the flattest lot 75–205 m from the depot and nothing kept it off the spawn's heading
(SPAWN = depot +6 z, yaw π), so it stood 81 m dead ahead (−5°); behind it, the south town-limit sign (12 spokes
round the depot, spoke k=9 is exactly the spawn line) had a post 1.1 m off the lane. Fix: the hospital lot search
skips a 220 m × 80 m corridor ahead of SPAWN; the one sign whose spoke runs down that lane turns 0.11 rad (~12 m)
aside. New `scenarios/g1_start.mjs` (spawn geometry, obstacles in the forward lane, 12 s full throttle, hit log).
Before: lane obstacles at 68–78 m (hospital), ride stopped at 74 m (0.6 mph, nose-in under the sign); after moving
the hospital alone it hit the sign post at 114 m (63.9 → 11.4 mph). After both: lane clear to 120 m, **309 m in
12 s**, top 65.8 mph, no hits; smoke 6 s ride ends at 65.6 mph instead of 1 mph. Hospital now at 82 m, 41° right
of the spawn heading, still in view from the start. Vision (cmp_start/sheet.jpg): spawn view natural, helsesenter
sits to the right behind the houses, ride ends on open snow along the coast. smoke.mjs exit 0, page errors none
(powder 1.42, trench 2.20). README helsesenter line; script v63. No new reports (last triaged 5).
Next: shore-road house yard gap (G1).

## 2026-10-26 02:12 — Daylight has shape (G3) — 10a0dc9
Cause: on 1 Nov the noon sun is 4° up, so at its true angle flat snow got N·L ≈ 0.07 of the key light and the
whole scene was lit by the even sky fill (hemi 0.54, near-white ground bounce) = no shadows, one flat grey.
`updSky`: while the sun is the key light its direction is lifted to y ≥ 0.22 (~13°; sky disc untouched, moon
keeps the old 0.05 floor), sun intensity ramps in over −1.5..4° instead of −1..7° (1.31 → 1.9 at Nov noon),
and by day the hemi fill drops 30% with a slightly bluer ground bounce (`sunK`; 0 at night, so night is
unchanged). New `scenarios/g3_day.mjs` (weather pinned clear, rig numbers logged, Nov + Mar noon) and
`tools/playtest/imgstats.py` (luma mean/std/p5-p95/sat/local contrast). Before (origin/main) → after: quay std
45.0 → 51.3, local 4.19 → 4.63; sun-behind 42.6 → 49.6; sled close-up 44.6 → 51.2; backcountry 36.7 → 39.0;
March 40.2 → 40.5; mean luma ~unchanged (164 → 165). Vision on cmp3 sheet + 01_quay full-res: long blue shadows
from the houses and the sled now lie on the snow (none before), sunlit snow warmer; no black or harsh shading;
backcountry only slightly better. smoke.mjs exit 0, page errors none (powder 1.46, trench 2.18). README daylight
paragraph; script v62. Stills: ~/.hermes/cache/scratch/tlloop/shots/day_b3, day_a3, cmp3/sheet.jpg.
Smoke still shows the sled nose-in at the Helsesenter after 6 s (the v61 "74 m" note was wrong): start item stays.
Triage: 0005 F1 (shore-road house unplowed, 0.58 m/s) → new G1 item #2; F2 merged into the HUD badge item; F3
confirmation. Next: fix the start (G1), then the shore-road gap; daylight slice 2 queued.

## 2026-10-26 01:58 — Plowed yards in town (G1) — 7200a84
New `addYard(x, z, r)` discs (fully plowed inside r, easing to powder over 6 m) around every `KIT.house`, each
site's building + parking (depot 20 m, village shop 13, homes/cabins/relay 10), the garage forecourt, the
helsesenter door and a lane of 6 m discs from the depot down to the quay. `yardOf(cx, cz)` caches a per-chunk
0..1 map; plowed cells start at d = f·(1 − 0.85·y) (pack 0.85), `refill` fills them back only to that level,
`depthAt`/`fillCell` read it for unloaded chunks too (`restCell`). HUD says "Plowed yard" instead of "On your
tracks" there. New `scenarios/g1_yards.mjs` (10 m from a standstill toward the door, before = origin/main copy):
depot yard 1.53 → **2.53 m/s**, garage 1.54 → 2.54, Strandbu home 1.48 → 2.52, Mehamn 1.54 → 2.55 (depth 0.48–0.59
→ 0.07–0.09 m, pack 0 → 0.85); open powder unchanged 1.37/1.38. Stills (yards_b2.jpg vs yards_a2.jpg): soft grey
packed yards round each house, no hard rings, nothing floating; buildings show a bit more wall. smoke.mjs exit
0, page errors none (powder 1.46, trench 2.21; the sled now makes 74 m in 6 s from the yard). README walking
paragraph; script v61. Not measured: FPS cost of the extra Map lookup per unloaded cell in `fillCell` (small).
Triage: 0004 F1+F2 (flat, washed-out daytime; scores quay day 5 / night 8) → new G3 item, now top; the
playtester's `views.mjs` closes the "baseline views" item. F3 (OPEN BACKCOUNTRY badge at the quay) → low item.
Follow-up: plowed lanes along the Kjøllefjord shore road. Next: daytime lighting (G3).

## 2026-10-26 01:40 — Hills count on foot (G1) — b2b786a
`footStep` now reads the ground grade along the way you face (`groundAt` 0.7 m ahead minus behind, not the
snow top, or your own trench reads as a climb; smoothed in `FOOT.grade`). Uphill pace ×(1 − 0.85·grade),
floor 0.5; gentle descent up to +18%; steeper than ~0.3 down it eases off again; climbing adds strain (winds
you sooner). New `scenarios/g1_slope.mjs` (inland hillside 1074,−458, grade 0.27, 0.85 m powder, three
parallel 8 s walks from a standstill): before up 1.20 / across 1.35 / down 1.27 m/s (ratios 0.89 / 0.94, depth
noise only) → after up 0.91 / across 1.32 / down 1.49 (ratios 0.69 / 1.13). Kept the climb penalty mild (first
try 0.95·grade gave the same 0.69 avg incl. ramp; end speeds 0.99 vs 1.40). smoke.mjs exit 0, page errors
none, flat powder 1.45 / trench 2.16 (unchanged within noise). Stills (slope_after2.jpg): wading pose normal
on the hill, no float/sink. README walking paragraph; script v60.
Triage: 0002 F1 (town never packed; backlog's "should be 2.9 m/s" premise was wrong) → replaced the town
measurement item with a packed-town feature item, now top. 0002 F2/F3 (quay obstacle/sea edge clean) are
confirmations; F4 (shore road faster than quay core) dropped as a 20 m ramp artifact. 0003 F1 (groom card
doesn't mention the Woodsman) merged into the rank-3 groomer item; F2 info. Follow-up: skiStep grade uses surf.
Next: packed snow around town/quay/yards.

## 2026-10-26 01:30 — Progression audit + garage says what's next (G2) — 127af07
Audit: new `scenarios/g2_ladder.mjs` (per-sled stats via `stats()`, job boards sampled 40× at 12 delivery
levels, garage text). Ladder table + pay curve written into LOOP.md "Progression map". Worst findings: Trekker
weaker than the Summit before it, Aurora weaker than the Matriarch, nothing above the Summit opens a part,
grooming announced at rank 3 but its gear needs the Woodsman (4), parcels ≈$50/est-min flat at every level.
First upgrade timing is fine (Woodsman ≈ 4–5 round-town jobs ≈ 15 game-min). Each became a backlog item.
Built the slice a player hits first: the garage's locks were unreadable. Before (`g2_garage.mjs`, 2 deliveries,
$450): locked sleds showed only "4 deliveries" (no price), locked parts showed "Gen 2+ / Gen 3+ / Gen 4+ /
Gen 5+" with nothing mapping a generation to a sled. After: lock labels "Woodsman+ / Ranger+ / Sprint+ /
Summit+", each locked part's line ends "Fits the Woodsman 440 W/T and newer (4 deliveries, $600)" (or "switch
sleds" if you own one), locked sled cards add an amber "$600 once you've made 4 deliveries (you have 2) · opens
22 more parts in the shop"; the tier toast in `fitPart` says the same. First try used `<b>`, which picked up
the title style and shouted (vision); changed to an amber span the size of the other text. smoke.mjs exit 0,
page errors none (powder 1.49, trench 2.18). README garage paragraph; script v59. No new reports to triage.
Next: G1 slope on foot, then the Trekker/Aurora sidegrade problem.

## 2026-10-26 01:15 — Walking pace in powder up ~45%, tiredness softer (G1) — 31a0364
Fresh powder: `wade` floor 0.42 → 0.57 and full pace 2.7 → 2.9 m/s in `footStep`; tiredness builds
0.07 → 0.04 ×strain/s and recovers 0.05 → 0.08/s (tired only drives the pose/breathing, not speed).
New scenario `g1_walk30.mjs` (30 m of powder from a standstill, then 25 m back along the trench):
powder 30 m **28.1 s → 19.3 s** (avg 1.07 → 1.56 m/s), tired at 30 m 1.00 → 0.77; trench 1.96 → 2.23 m/s
(trench/powder ratio 1.83 → 1.43, still clearly faster). smoke.mjs: powder 1.01 → 1.51, trench 1.75 → 2.13,
exit 0, page errors none. Stills before/after (side + chase): same stride and trench, after reads less
hunched; no regressions. README walking paragraph updated; script v58.
Triage: report 0001 → finding 1 (no slope term on foot) became a backlog item; findings 2 (obstacle
collision clean) and 3 (turn rate = spec) are confirmations, no item. Reordered: did this G1 pace item ahead
of the G2 audit since it's Lemon's first-named complaint and a direct player win; the audit is next.
Next: G2 ladder audit; then slope on foot; town/quay walking check.

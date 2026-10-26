# Builder progress log

Newest first. One entry per builder pass:

```
## <date time> — <short title> (Gn) — <landed hash | not landed: why>
What changed for the player, numbers before → after (gameClock), smoke result, stills judged (paths), what's next.
```

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

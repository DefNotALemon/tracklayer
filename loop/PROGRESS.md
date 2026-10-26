# Builder progress log

Newest first. One entry per builder pass:

```
## <date time> — <short title> (Gn) — <landed hash | not landed: why>
What changed for the player, numbers before → after (gameClock), smoke result, stills judged (paths), what's next.
```

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

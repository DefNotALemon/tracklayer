# 0033 — Verify v94 (G3: sharp wind crests instead of blue oval hollows) — main @ 1e75240 (script v94)

Scenarios: `tools/playtest/scenarios/g3_macro.mjs` (existing, builder-committed with v94) and
`g3_midband.mjs` (existing, from v88). Shots in `~/.hermes/cache/scratch/tlloop/0033/{macro,midband}`
(not retained); contact sheet `~/.hermes/cache/scratch/tlloop/reports/0033.jpg` (9 tiles: the 7 macro
shots + 2 midband backcountry shots).

Focus: verify the builder's latest landing since report 0032 — "Sharp wind crests instead of blue oval
hollows" (1e75240, script v94), which folds the near-term `fdH` dune relief into a ridged crest with a
pixel-footprint-weighted blend (`nc`) so facing hillsides keep the crests while grazing flats don't
barcode.

## Findings

1. [G3][info][confirms landing] **v94 reproduces exactly.** `g3_macro.mjs`'s pinned-spot search landed
   on the same backcountry point as the commit (**−1637,−1943**). `imgstats.py` local contrast: tile 01
   (eye level, across) **2.60** (commit: 2.60→2.61), tile 03 (9 m up, across) **3.22** (commit: 3.22),
   tile 04 (9 m up, away) **4.16** (commit: 4.16), tile 05 (9 m up, cross-sun) **3.56** (commit: 3.57).
   All within noise of the landed numbers — no regression.

2. [G3][info][confirms landing] **`g3_midband.mjs` strip-3 numbers also reproduce.** `bandstats.py` on
   the backcountry/midband shots: Nov **5.50** (commit: 5.49), March **5.04** (commit: 5.05),
   mid-across (cross-sun) **1.25** (commit: across 1.26), mid-away **0.26** (commit: away 0.23) — all
   match the landed v94 figures closely.

3. [G3][info][visual, confirms fix] Vision on the contact sheet: the midband tile
   (`08_midband_day.jpg`, 9 m camera, open backcountry) shows clean wind-streaked dune relief radiating
   organically from the foreground toward the horizon — long, slightly curved streaks of varying width,
   not uniform blobs. No flat oval "puddle" shapes and no regular barcode striping anywhere in the 7
   macro tiles or 2 midband tiles, including the facing-hillside cross-sun shots (03/05) that the v88
   fix originally targeted. The v94 fix holds up visually, not just in the numbers.

4. [G3][low][known open item, still open — no action needed] Global contrast (`imgstats` std) across
   the 7 macro tiles is **37.8–43.5** (01: 39.5, 02: 42.3, 03: 37.8, 04: 40.5, 05: 41.0, 06: 38.4, 07:
   43.5) — still in the ~40 band PROGRESS already flags as the next lever after the crest fix ("still
   open: global std (~40)/overall low contrast"). Confirms the item is correctly still on the backlog;
   v94 was a local-relief fix and wasn't expected to move this number.

5. [info] Both scenarios ran clean: `g3_macro.mjs` and `g3_midband.mjs` — page errors: none, exit 0.

## Verified since last time
- v94 (sharp wind crests, G3, 1e75240): pinned-spot search, imgstats local contrast, and bandstats
  strip-3 all reproduce the landed numbers; vision confirms no oval/barcode artifacts on the contact
  sheet. No regression.

## Ideas
- Builder: global terrain contrast (std ~38–43, flagged since report 0022) is the next G3 lever once
  it's next up for rotation — a mid-scale (2–4 m) relief or albedo variation term, not more tint, per
  the existing backlog note.

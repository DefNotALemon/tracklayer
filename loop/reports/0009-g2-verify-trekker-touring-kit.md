# 0009 — verify v66 Trekker touring kit landing (G2) — main @ db9b64f
Scenario: tools/playtest/scenarios/g2_sledperks.mjs (reused, unchanged) + new tools/playtest/scenarios/g2_trekker_card.mjs
Shots: ~/.hermes/cache/scratch/tlloop/reports/0009.jpg (sheet), raw stills ~/.hermes/cache/scratch/tlloop/1026-025745-3421/

## Verified since last time
- "Trekker 550 Tour touring kit built in" (2e529fb, G2, script v66): fresh origin/main, `g2_sledperks.mjs`
  matches the builder's log exactly — Trekker `ST`: p/d 1.61, fuel 30 L, burn **0.9** (vs 1.0 stock), range
  33.3 L/burn = **1.39×** the Summit's 24, slots **2** (Summit 1), warm **7.5** (base 5 + 2.5 kit), coldMul
  0.73. 20 s full-throttle ride: Summit burned 2.059 L in 18 s game / 561 m, Trekker 1.629 L in 19 s / 574 m
  (Trekker clearly thriftier per metre despite covering more ground, consistent with the 10% burn cut).
  Garage card text (both scenarios, 30 deliveries, Trekker owned): "Touring kit built in: heated grips &
  seat behind a tall shield (+2.5 warmth), a rack that carries a second parcel, and a frugal tune (10%
  thriftier). The longest range on a tank until the Aurora E." — matches the landed description word for
  word. `grep` confirms `SLEDS[].perks`/`perk` is stats-only (no new mesh), so a visual check targeted the
  one real risk: **does the long new perk line break the garage card layout?** New `g2_trekker_card.mjs`
  owns every sled, opens the Sleds tab, and screenshots the Trekker card at natural scroll position (sheet
  0009.jpg). Vision: the card grows to 156 px tall next to neighbours' 119–138 (the two extra perk-line
  sentences), text wraps cleanly in the card's own green accent colour, nothing clips, overlaps the "Owned"
  badge, or pushes into the next card — no regression. page errors: none both runs. **Confirmed landed and
  working, no regression.**

## Findings (most important first)
1. [G2][info] No new bug found this pass — the touring kit lands clean on every axis checked (stats, ride
   fuel use, slots, garage text, garage layout). Nothing to add to the backlog from this change.
2. [G2][low] Minor polish idea, not a bug: the Trekker card's perk sentence is now the longest text block of
   any sled card (2 sentences, ~230 chars) and visibly taller than its neighbours (156 px vs 119–138). Still
   readable and uncramped at 1200×800, but if a future sled stacks 2+ perks the same way, card height will
   start to vary a lot down the list — worth a max-line-clamp or consistent card height if that happens.
3. [G2][info] Confirms report 0008's G2 angle: of the three sleds with `perks` potential (Trekker done, Aurora
   and the "trap" sleds still open backlog items), the pattern the builder used (stats bundle + one green card
   line) reads well in the UI and is a good template for the Aurora E fix already queued in LOOP.md.
4. [G1/G3][info] Not this pass's focus, but the sheet's garage overlay also shows last pass's G1/G3 landings
   still intact: HUD still reads "PACKED / Plowed yard" at the garage forecourt (v61) and the quay/town art
   behind the panel looks normal — no visible regression from v66 spilling into rendering.

## Ideas
- When the Aurora E perk item comes up (LOOP.md backlog, G2), reuse `g2_trekker_card.mjs`'s card-screenshot
  approach to check its card layout the same way before/after, since it's likely to get a similarly long
  perk sentence.

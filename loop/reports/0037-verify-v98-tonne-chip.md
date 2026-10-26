# 0037 — Verify v98 TONNE chip on tonne-load freight cards (G2) — main @ 13b8803 (script v98)

Scenario: tools/playtest/scenarios/g2_tonnechip.mjs (reused, already in repo)   Shots: ~/.hermes/cache/scratch/tlloop/reports/0037.jpg

Focus: the most recent builder landing (v98, 13b8803) hadn't been playtest-verified yet — 0036 covered the
jog follow-up instead. Ran the existing scenario: Matriarch, 50 deliveries, Freight licence + flatbed + heavy
receiver, re-rolled the board until it held both a tonne and a non-tonne fell card, opened the tablet Freight
app, read every chip's text + computed colour, and shot the board.

## Findings (most important first)

1. [G2][info][verified] **v98 lands as designed.** Board held `fell:520kg` and `tonne:1000kg` side by side.
   Chip text/colour dump: `FELL=rgb(143,208,196)` (teal, unchanged) and `TONNE=rgb(231,154,201)` (pink, new) —
   matches the before/after numbers in PROGRESS's v98 entry exactly (`rgb(143,208,196)` / `rgb(231,154,201)`).
   No other chip (`HEAVY` amber, `COLD RUN`/`DUE`/`PRIORITY` red-orange, `FREIGHT LICENCE` green,
   `PICKUP DYFJORD` grey, `EXPEDITION` purple) collides with TONNE's pink.

2. [G2][info][verified] **Visually legible on the actual card, not just in computed-style numbers.** Still
   `01_freight_board.jpg`: the "Diesel genset & two tanks" card (1000 kg) shows a `TONNE` pill next to its
   `DUE 04:16` chip — same pill shape/size as every other chip, good contrast against the dark card background,
   not clipped or overlapping the due-time chip or the card title. Zoomed crop confirms it at full legibility.
   The fell card above it ("Diesel tank, full", 520 kg) correctly keeps its teal `FELL` chip, not TONNE — so the
   split is working on real contract data, not just the two synthetic cases PROGRESS quoted.

3. [info] Board also surfaced 4 `big` (non-fell, non-tonne) cards at 120–260 kg with no FELL/TONNE chip, as
   expected (only ≥ fell-threshold loads get either tag).

4. [info] Page errors: none, exit 0.

## Verified since last time
- v98 TONNE chip (13b8803): confirmed — legible, distinct colour, correct card gating. No regression found.

## Ideas
- None; this was a clean verification pass. Next playtest should rotate to G1 (per LOOP.md: the backcountry
  blow-twice jog item is still open) or take the G3 self-shadow lever once the builder has something to show.

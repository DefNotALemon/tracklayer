# 0086 — Garage Engines & Workshop tabs: legibility audit (G2) — main @ 5f3677d

Scenario: tools/playtest/scenarios/g2_engines_workshop.mjs (new, committed with this report)
Shots: ~/.hermes/cache/scratch/tlloop/reports/0086.jpg (contact sheet, 5 stills)

Focus: G2 asks whether the garage "says what's next, what it costs, what it needs, and why you'd want
it." Every other garage tab (Sleds, Parts, Rider kit) has dedicated playtest coverage already
(`g2_garage.mjs`, `g2_trekker_card.mjs`, `g2_lockgap_card.mjs`); Engines and Workshop did not. This pass
checks both across 3 saves: fresh (2 deliveries, stock Frontier), mid-game (owns Frontier/Woodsman/Ranger,
two sleds worn, a used engine sitting on the shelf), and a sled swap that should flip a locked boost part's
reason text (Woodsman → tier below the Bolt-on turbo kit's Ranger+ gate).

## Findings (most important first)

1. **[G2][info] Both tabs read cleanly with no bugs across all 3 cases — nothing to fix.** Engines: current
   engine always shows first under "In the <sled>" with power%/thirst/condition and provenance ("The motor
   it left the factory with" vs hours + seller), a shelf section lists spare engines with Fit/Sell actions
   and their own condition, the "Buying an engine" blurb explains the Bytteboden-only sourcing + Workshop
   restore loop, and boost parts show a concrete unlock reason per card ("Fits the Woodsman 440 W/T and
   newer (4 deliveries, $600)") rather than a bare lock icon. Workshop: lists every owned item under 100%
   with its condition, restore fee and what the fee covers ("the chassis, the track and its own motor" vs
   a shelf engine's "rebuilt top end"), and a clean-garage case gets an explanatory empty state instead of
   a blank list. Confirmed in stills (0086.jpg) — no text overflow/clipping on any card at 1920px, no
   overlapping badges, lock tags (Woodsman+/Ranger+/Summit+) render as pills, not raw text.
2. **[G2][info] The sled-swap case (05) proves the boost-part lock text is dynamic and specific, not a
   static "locked" label.** Same Bolt-on turbo kit card: with the Ranger owned/ridden it's buyable at "$2400";
   switch to the Woodsman (tier below) and the exact same row becomes "Fits the Ranger 500 and newer: switch
   sleds on the Sleds tab" — i.e. it tells the player the unlock condition is already met, just on a
   different machine, and points at the tab to fix it. That's a better "why would I want it" signal than
   G2's own worry list anticipated; no action needed, just confirming it works as designed.
3. **[G2][info] "Won't fit" items (Boost controller & tune, needs a factory-turbo engine) give a plain-English
   reason in the sub-line ("Needs an engine with a factory turbo") in every case tested**, including on a
   sled/engine combo where no other boost part is even unlocked yet — so a confused player never just sees
   an inert disabled row.
4. **[G2][low] Minor wording asymmetry, not a bug:** the restore-fee sub-line calls a sled's wear "the
   chassis, the track and its own motor" but a shelf engine's wear "rebuilt top end" — both are accurate for
   what's being restored, but a first-time reader comparing the two rows side by side (04_workshop_worn.jpg)
   might not immediately parse why the phrasing differs. Cosmetic; not worth a backlog slot on its own.

## Verified since last time
- No new game code landed since report 0085 (origin/main HEAD 5f3677d is the builder's triage-only commit,
  no `tracklayer.js?v=` bump since v147/627a385, already verified by 0083/0084/0085); nothing to re-verify
  this pass. Rotated to G2 since the three prior reports (0083 G3, 0084 G3, 0085 G1) left it least recently
  covered.

## Ideas
- None rise to backlog-worthy; this pass mainly closes the Engines/Workshop coverage gap in the garage
  legibility sweep, cleanly.

# 0013 — Verify rig-gate wording (v70) (G2) — main @ 0a1a8d5
Scenario: tools/playtest/scenarios/g2_rig_wording.mjs   Shots: none (text-state read, no visual change)

## Findings (most important first)
1. [G2][med] `rankOpens()` (tracklayer.js ~4952) only strips the canned "You'll want a groomer on the
   hitch." / "Needs a trailer." phrase from `RANKS[].opens` in the *unsatisfied* branch, where it's
   replaced by `rigNeed()`. The *satisfied* branch (`return r.opens || ""` at line 4954) returns the raw
   string unmodified, and that raw string still contains the nag phrase baked into the `RANKS` table
   (line 4714: `"Grooming contracts are on the board. You'll want a groomer on the hitch."`). Reproduced:
   state "Woodsman + receiver + groomer fitted" (scenario step 5) — `groomCard` correctly comes back `""`
   (card logic is right), but `rank3` toast text is still
   `"Grooming contracts are on the board. You'll want a groomer on the hitch."` even though the rider
   already has a groomer hitched. A player who just bought and fitted the part gets told to go buy one.
   Fix: apply the same `.replace(/ (You'll want a groomer on the hitch|Needs a trailer)\.$/, "")` in the
   satisfied branch too (or just always strip before appending/returning).
2. [G2][low] Everything else in v70's rig-gate wording checks out across all 7 states tested: Frontier
   pre-purchase groom/heavy cards both correctly show "fits the Woodsman 440 W/T and newer (4 deliveries,
   $600)"; post-Woodsman-purchase-no-receiver correctly switches to "the garage across the road sells…";
   post-receiver drops the receiver clause; fitted groomer makes `groomCard` empty; unhitching a *owned*
   groomer correctly reads "Yours is at the garage: hitch it on there (Parts)." instead of re-offering a
   purchase. Locked board cards at 2 deliveries correctly say "(Woodsman+ sleds)". No regressions, no page
   errors, exit 0.

## Verified since last time
- Rig gates say what you're missing (v70, 0a1a8d5): mostly works as designed (finding 2) but the
  rank-up toast still shows the old unconditional nag text once the gate is actually satisfied
  (finding 1) — a real, reproducible gap in the just-landed feature, not a new idea.

## Ideas
- None this pass; focus was verification only.

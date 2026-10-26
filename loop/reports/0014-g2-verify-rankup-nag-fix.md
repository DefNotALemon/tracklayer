# 0014 — Verify rank-up nag fix (v72) (G2) — main @ ef881ce
Scenario: tools/playtest/scenarios/g2_rig_wording.mjs   Shots: none (text-state read, no visual change)

## Findings (most important first)
1. [G2][info] v72's fix for 0013 F1 holds. Re-ran the same 7 ladder states. State "Woodsman + receiver +
   groomer fitted": `rank3` now reads `"Grooming contracts are on the board."` with no trailing nag — before
   v72 this state wrongly appended `"You'll want a groomer on the hitch."` even though the groomer was
   already hitched. `groomCard` still correctly empty at this state. No regression in the other 6 states:
   pre-purchase ("fits the Woodsman 440 W/T and newer ($600)"), post-Woodsman-no-receiver ("the garage
   across the road sells…"), post-receiver (drops receiver clause), owned-but-unhitched ("Yours is at the
   garage: hitch it on there (Parts)."), and the 2-delivery locked-card state all read as v70 intended.
   `rank5`/heavy-freight (trailer, not groomer) is untouched by this fix and still correctly shows its own
   gate text throughout — confirms the fix is scoped to the groomer phrase only, not a blanket change that
   could have broken the trailer wording. smoke.mjs not re-run this pass (text-only scenario, no code path
   this touches overlaps physics); page errors: none, exit 0 on the g2_rig_wording run itself.
2. [G2][none] No new issues found in this area. The groomer/trailer rig-gate wording work (v70–v72) is now
   fully verified across both completion and incompletion of the gate, in both toast and card text.

## Verified since last time
- Rank-up nag gone once the rig is hitched (v72, 7fb1d8a): confirmed fixed, no regression in the 6 other
  ladder states or in the parallel trailer/heavy-freight wording.

## Ideas
- None this pass; focus was verification only. Backlog is unchanged by this report (no new findings to
  triage) — next builder pick should be the next backlog item as ordered (G3 daylight slice 4).

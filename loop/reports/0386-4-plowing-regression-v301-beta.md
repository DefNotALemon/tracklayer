# 0386 — Milestone 4 plowing, regression sweep on v301: beta

Run on origin/main 43b17b2 (script v301). Nothing new for 4.x had landed since the last reports, and the newest part (gifts, 0385) was under two hours old, so this pass reran lane A's existing milestone-4 scenarios unchanged, to check that later landings (v296-v301: roads model, hint box, gifts, button names) broke nothing in the plowing chain.

## Results (all exit 0, zero FAIL lines, "page errors: none" on every run)
- `x4_bladeroad` (4.1a2 road credit: both sides of the centre line, new snow wipes marks, council-cleared stretch not counted): pass.
- `x4_conweek` + `x4_weekpay` (road contract week pay carried after hand-back, Monday line): pass.
- `x4_plowused` (used blades on Bytteboden), `x4_bladewear` (cutting edge wear, ragged under 30, mend): pass.
- `x4_plowtruck` (Brøyt truck, 60 cm run, drift): pass.
- `x4_statements` (three whole weeks kept): pass.
- `x4_bladework` (hold-to-slew, square blade carries): pass.
- `x4_plowapp` (Plow app, contracts): pass.

## Findings
No BLOCKER, BUG or POLISH. The RD1 road model (v296) did not disturb the road credit or the blade's cut.

Not covered: pad and touch inputs (separate `_inputs_` scenarios were not rerun), v302's new toast wording (landed while this ran), anything on 5.4 drivers (0383 covers it). No new scenario files.

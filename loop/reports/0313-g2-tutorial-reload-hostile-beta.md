# 0313 — G2 first-ride tutorial: reload at every stage and hostile saved `tut` values — main @ 41ba85a (script v255), tester 1

Nothing new landed for milestones 1-4 since 0312 (11:03, under two hours), so this tests a base-game part no report covers: the first-ride tutorial. `g2_tutorial.mjs` passes as is (ALL PASS, page errors none). New scenario `g2_tutorial_reload_beta.mjs` reloads the page at stages 1, 2 and 3 and plants odd `tut/tutA/tutB` saves through `reload(saveObj)`. Headless, page errors none.

## Findings
1. OK — reload at stage 1 (garage panel open): stays stage 1, sled hidden, card "Back to the garage". Reload at stage 3: stays 3, exactly one tutorial claim, no duplicate.
2. POLISH — reload at stage 2 ("Get on your sled", sled collected, walker beside it) comes back as stage 3 with the rider already seated (`onFoot` false). The player skips the climb-on step and the card jumps to "Pick up the package". Probably the load path seating the rider on purpose; if the climb-on lesson matters, restore on foot beside the sled for stage 2.
3. OK — `tut:"2"` (string) → stage 99, tutorial dropped, no NaN. `tut:null` with no deliveries → 99. `tutA:"nowhere"`/`tutB:"void"` at stage 3 → replaced by solbakken/strandbu with one claim. Stage 4 with null ids and numeric/object ids → rebuilt to stage 3 with a package claim. Positions finite everywhere.
4. POLISH — `tut:7` (out of range) loads as stage 7 and stays: no claim, no cargo, card reads "Deliver the package", job says "Kjøllefjord quay". Tutorial never ends. Hand-edited saves only. Suggested: in the loader, `stage = [0,1,2,3,4,99].includes(v) ? v : 99`.
5. POLISH — `tut:-1` loads as stage -1: sled hidden, on foot, card "Deliver the package" while the job line says "To the garage" (card text and stage disagree). Same clamp fixes it.
6. NOTE (scenario bug, not game) — in `g2_tutorial.mjs` step 06 a `// ...` comment swallows the rest of the line, so `ok(s.stage === 3 && s.claims === 1 ...)` and the "04_mounted" shot never run. Move the comment to its own line. This run's output shows stage 3, claims 1 at that step, so the assert would have passed.
7. NOT TESTED — reload mid-swing (mount/dismount in progress), touch and pad input on the tutorial card (0xx pad names are checked by `g2_tutorial.mjs`: Xbox/DualSense/Switch all show the right names).

No BLOCKER or BUG. The 4 FAIL lines in the run: #2 (my assert expected stage 2), #4, #5, and one wrong assert of mine (unknown ids are repaired, which is good).

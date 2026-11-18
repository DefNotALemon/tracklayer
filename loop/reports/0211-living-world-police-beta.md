# 0211 — Living world release 1 (police, flats, slumlords) beta — main @ 64ecdfc
Scenarios: slice's own `x15_living.mjs` (full run twice, `ONLY=G` twice) and new `x15_police_break.mjs` (pursuit with $0, owed fine across a reload). Keyboard/scripted only; not covered: pad/touch on the flat's REPORT/FIX prompt, night, flats/slumlords beyond what x15 asserts.

## Findings
1. [BUG, test flake] `x15_living.mjs` section G fails in the FULL run, both times: "unseen long enough: got away, no fine, heat 0". Record read `chases: 2, escapes: 0, heat 94` when the check ran, i.e. a second chase was logged during the search and the escape never completed in 20 game-s. Run alone (`ONLY=G`, twice) it passes (chases 1, escapes 1, heat 0). So state left by section F (or the second cruiser re-spotting the player) leaks into G. Either the scenario's `clearWorld()` misses something, or a cruiser can re-start a pursuit during SEARCH and keep heat high; the second would be a real gameplay issue (escape harder than designed after a prior warning). Suggest: log `TLXP.mode` and each cop's `task` at the failing moment; if cop 1 re-spots during search, that is intended and the test should lengthen the outrun.
2. [Verified] Pursuit with $0 cash then stopping: fined 361 (incl. fleeing surcharge), cash stays 0, `owed` 361, never negative or NaN.
3. [Verified] Reload with that debt: owed 361 kept, mode clear, 2 cruisers rebuilt, no tick error, still sane 10 s later.
4. [Not tested] Reload during an active warn/pursuit: my second `TLXP.patrol` did not trigger a warning right after a bust (cooldown), so the reload landed in "clear". Worth a follow-up scenario.
5. [Verified] Rest of x15 (A-F, H-O: renting, arrears, eviction, slumlord complaints, in-flat fixtures, buying/selling, options off, old save) all ok; page errors none.

No BLOCKER. Finding 1 needs a look from the builder.

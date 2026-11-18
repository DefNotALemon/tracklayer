# 0214 — Politi "They've seen you again" toast (0213 #1 probe) — main @ a2c64ec
Scenario: `x15_living.mjs`, run twice more (full run, then `ONLY=G`). Scripted driver only; no pad/touch, no night. No code landed since 0213, so this is a narrowing of its one open finding.

## Findings
1. [POLISH, cause unresolved, likely test-order dependent] Full run: G2 "told 'They've seen you again'" FAILS again (2 of 2 full runs, plus 0213's). `said: []`, mode search -> pursuit, chases 1, heat held ~46. `ONLY=G` (sections A + G only): the same assert PASSES, `said: ["They've seen you again."]`. So `toPursuit` does fire the toast in the search branch (tlx-police.js:135) and the recorder works; something left over from sections B-F in the same page swallows it in the full run. Candidates: `toast()` dedupe/queue state (tracklayer.js:6759-6761, `toastTm` waiting while 4 toasts are live and 3.4 s old), or the 80 ms recorder missing a toast that is queued and shown between polls after the scenario's own `TOASTQ.length = 0`. A player who has just been fined/warned could plausibly miss the message the same way (toast cap 4, pump waits up to 3.4 s), but that is not shown.
   Suggested: in the scenario, wait until `#toasts` is empty before arming the recorder (or run G2 under `ONLY`); if it still fails, log `TOASTQ` + `#toasts` children right after `TLXP.put(1,…)`.
2. [Verified] With `ONLY=G`: one chase in the record, heat unchanged while unseen (78 samples, rise 0.000), rises when seen (1.62/step), outrun -> escape, $800 intact, heat 0. All other x15 asserts pass; page errors none.

No BLOCKER, no BUG in the game confirmed.

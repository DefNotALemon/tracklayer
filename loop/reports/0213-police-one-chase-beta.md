# 0213 — Politi "one chase, heat only while seen" fix (0211 #1) beta — main @ f837814
Scenarios: `x15_living.mjs` (full run, once; section G2 is new with the fix), `x15_police_break.mjs` (reload mid-warn, $0 fine). Keyboard/scripted only; no pad/touch, night not covered.

## Findings
1. [BUG or test bug, unresolved] `x15_living.mjs` G2 fails: "told \"They've seen you again\", not a new \"They're after you\"". Mode did go search → pursuit, chases stayed 1, heat 46 → 46 (held), but the toast recorder (`__tsaw2`, 80 ms poll of TOASTQ + #toasts) caught NO toast at all (`said: []`). Either `toPursuit` in search mode isn't reaching `api.toast` in this path (the player gets no "seen again" message), or the recorder missed it (toast already queued/shown before the recorder was armed, or the dedupe at tracklayer.js:6761). I did not probe further; builder: log `TOASTQ` right after `TLXP.put(1,…)` to tell which. Only 1 of 70+ asserts failed.
2. [Verified] Heat holds while unseen: 74 samples unseen at 144 km/h, biggest rise 0.000 (G2).
3. [Verified] Same chase in the record when seen again in the search: chases 1, task "chase", pursuit again with heat held at ~46.
4. [Verified] Previous flake (0211 #1) gone: section G in the full run now passes (one chase, escape, no fine, heat 0).
5. [Verified] 0211 #4 covered by the updated `x15_police_break.mjs`: reload mid-warn comes back as SEARCH, owed 361 kept, no error, sane 10 s later. $0 fine: cash stays 0, owed 361.
6. Rest of x15 (renting, fixtures, buying, save/reload, options off) ok; page errors none.

No BLOCKER. Finding 1 is POLISH (missing/unverified message) pending a probe.

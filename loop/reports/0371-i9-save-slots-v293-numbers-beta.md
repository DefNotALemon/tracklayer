# 0371 — I9 save-slot fixes (v293): verify + numeric-extremes break pass — main @ e250b3e
Scenarios: `i9_slotsafe.mjs` (builder's), `i9_slots_break_beta.mjs` (0366's), new `i9_slotsafe_numbers_beta.mjs`. Shots: none (storage/logic).

## Verified since last time (0366 #1, #2)
- 0366 #1 fixed: double/triple LOAD and BACK make one slot change; panel buttons go dead (8 live -> 0), button reads LOADING…; slot 1 no longer overwritten (`{cur:1,s1:500,s4:null,v2:500}`).
- 0366 #2 fixed: string cash loads as $0, wrong-typed `own`/`x` dropped, machines-not-a-table refused. Builder's scenario: all passed, page errors none. 0366's scenario: all passed.

## Findings
1. [BUG][low] Negative numbers load as-is. `{cash:-500, delivered:-3, hour:-20}` plays with cash -495 (after +5), hour -19.95. Deliveries/rescues were clamped to 0 here, but cash and hour are not. Fix: clamp cash to >= 0, hour to >= 0 in the same sanitiser.
2. [BUG][low] `own.sleds:["frontier","frontier","ghost",7]` loads as `["frontier","frontier"]`: nonexistent/non-string entries are dropped (good) but duplicates stay, so the garage may list one sled twice. Fix: dedupe.
3. [POLISH] `cash:1e300` and `hour:1e9` are accepted and play (finite, no page errors). Cap cash (say 1e12) if you want a bounded save.
4. Verified fine: null cash/delivered/hour -> new-game values; `{}` save loads; empty `own.sleds` -> frontier restored; no page errors in any case.
5. Harness: one `ERR_CONNECTION_RESET` on `tlx-gramk-a.js` mid-run (reloaded automatically, known flake).

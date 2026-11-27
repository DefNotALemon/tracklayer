# 0366 — I9 save slots (v286): break pass (base game) — main @ 6e7d5e8
Scenario: tools/playtest/scenarios/i9_slots_break_beta.mjs (new)   Shots: none (logic/storage test)

Rerun of the builder's `i9_slots.mjs`: all passed, page errors none.

## Findings (most important first)
1. [BUG][med] Two `TLSLOT.go()` calls before the reload (a double click on a slot card, or LOAD then another card) write the live game over slot 1. Run: slot 2 in play, `go(1)` then `go(4)` (reload suppressed, as the page would still be alive for a moment). Slot 1 afterwards held slot 2's game (`cash:"lots"`), the real slot 1 was lost. The second `go` stores the in-memory GS into the slot it believes is current, but the first `go` already swapped the index. The `TLSLOT.lock` that blocks `save()` after the first go isn't checked by the second go. Fix: make `go` return at once when `TLSLOT.lock` is set (and disable the panel buttons on first click).
2. [BUG][low] An imported save file is validated only as "has a `save` object". `{save:{cash:"lots", own:5, x:"no"}}` imports cleanly, loads, and the game runs with `GS.cash === "lots"` (a string). Page errors none during the check, but cash maths would give NaN/string concatenation once spent or earned. Fix: after import (and in load) coerce known numeric fields (cash, delivered, hour) and reject or default `own`/`x` of the wrong type.
3. Verified fine: names are capped at 24 chars and stripped of markup (an `<img onerror>` name did not run in the panel); `__proto__` in an import caused no pollution; importing into the slot in play is refused; copy to slot 0 or 9 is refused; `pagehide`/`visibilitychange` after a slot change wrote nothing to `save.v2`; empty rename keeps "Save 1".

## Verified since last time
- v286 save slots: builder's own scenario passes.

## Ideas
- A confirm step before DELETE on the slot in play would help; it's one tap from the card list.

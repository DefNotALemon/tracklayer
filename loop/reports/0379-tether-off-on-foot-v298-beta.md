# 0379 — Tether rope off on foot (v298, a54f211): beta

Part: base-game fix "tether rope is off you once you are on your own feet" + pad/touch wording of the get-on line.
Run on origin/main e58be5f (v298). Scenarios: `g3_tether.mjs` (builder's, rerun) and new `g3_tether_touch.mjs`.

## Results
- `g3_tether.mjs`: all 8 checks pass, page errors none. Rope drawn 172 of 175 frames while thrown; 0 frames drawn or clipped when standing, walking 4 m off and back, after getting on and off, after an N reset, or with the tether set to none. Held you 1.34 m from the sled (L = 1.4).
- Wording: keyboard says "Press Q", DualSense says "Press L1", touch says "Tap GET ON" (no "Press", no undefined).
- No "You unclip the tether" toast anywhere.

## Findings
1. POLISH — a crash toast appears twice in the toast column in the touch run (the keyboard one from the earlier crash was still up, so likely my scenario's back-to-back crashes, not a bug). Not reproduced in a single crash.
2. POLISH — at crashGetUp the rope vanishes in one frame while the sled is still sliding/at 1.3 m; there's no visible unclip. Fine for the request, but a one-frame pop. Suggest nothing unless it reads badly on a still.
3. UNTESTED — crash from a truck/other vehicle (does `C.tied` apply there?), and a reload mid-crash.

No BLOCKER or BUG. Scenario `g3_tether_touch.mjs` committed.

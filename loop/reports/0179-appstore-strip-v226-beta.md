# 0179 — App Store Today card strip follows keyboard/pad focus (v226, fix for 0168 #1) beta (G7/base) — main @ bf7d5b7
Scenario: tools/playtest/scenarios/g7_appstore_strip.mjs (landed with the fix), new g7_appstore_strip_pad.mjs   Shots: ~/.hermes/cache/scratch/tlloop/b0178b/g7sp_end.jpg

## Findings (most important first)
1. [POLISH] The fix works. Keyboard arrows on a 975 px strip: crew → freight → realestate → rescue, scrollLeft 18 → 417, every focused card fully in view; left returns 360 → 18. Phone portrait (390 px, 82 % cards): scrollLeft 273 → 534 → 728, every step in view, both directions. Enter on the last card opens its page. Page errors: none.
2. [POLISH] The landed scenario's pad sweep FAILS on a clean run (exit 1): with a 180 ms d-pad pulse and a 250 ms wait, headless (~0.6x) drops the first press and a later one (pad right: crew, crew, freight; pad left: focus reads null). It is the test's timing, not the game: my rerun with 400 ms presses and 350 ms gaps reached the last card (scrollLeft 417, in view) and came back to crew (18) with no lost focus. Suggest the builder lengthen the pulse in `g7_appstore_strip.mjs` (or poll for the focus change) so the gate is not flaky.
3. [POLISH] Left on the first card goes to the tablet's Back button (`TABLET.focus = __back`, no card shown focused). Normal d-pad navigation, but it means one extra left press leaves the strip; fine unless you want the strip to stop at its first card.

## Verified since last time
- 0168 #1 (strip slides off the right edge on arrow/d-pad focus): fixed on keyboard, pad and phone portrait.

## Ideas
- New `g7_appstore_strip_pad.mjs` (3 left presses assertions) is the stable pad check.

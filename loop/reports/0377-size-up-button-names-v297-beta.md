# 0377 — "size it up" control names the device's button (v297, 508dfa0): beta

Scenarios: `g3_sizeup.mjs` (the builder's, rerun) and new `g3_sizeup_break.mjs` (out-of-order / edge cases). Both exit 0, page errors none.

## Findings
1. **OK: names per device.** Keyboard `X`, Xbox `X`, DualSense `□`, Switch Pro `Y`; pressing the named pad button (index 2) reads the job out on each. Touch shows a SIZE UP button, tap works, and 30 m off there is no button or line.
2. **OK: hooked at the victim.** Keyboard "X at them: double", DualSense "□ at them", touch button DOUBLE. After doubling, touch reads SINGLE (the hint says "SINGLE at them: single line"), and the DualSense line flips to "□ at them: single line". No SPACE/E/Q key names on touch or pad in the hooked line.
3. **OK: no winch fitted.** The line does not promise "size it up" and there is no tcX button. Touch shows "tap GET ON" only.
4. **POLISH: keyboard get-on hint is a bare "press Q".** With the sled 8 m away, keyboard reads "Sled 8 m on your left · walk back and press Q"; touch reads "tap GET ON". The other hints use `keyHint` ("Q: get on"). It is correct per device, only the wording style differs. Suggest `keyHint("mount","get on")`.
5. **Not verified:** a victim who leaves mid-approach (my flags `left`/`gone` did not end the recovery, so that test proved nothing), and a reload mid-rescue.

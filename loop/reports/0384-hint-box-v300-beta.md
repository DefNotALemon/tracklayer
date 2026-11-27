# 0384 — Hint box clear of controls on phones (v300, 45d66de): beta

Run on origin/main f12b132. Builder's `x4_mobilehint` rerun: all passed, page errors none. New scenario `g3_hintbox_edges_beta.mjs` checks the box against every visible fixed element, not only touch controls, in states the builder's one doesn't use (keyboard 640x360 and 960x540, real bogged sled, tablet open). Stills: scratch `tlloop/t1b/`.

## Results
- Keyboard 640x360 and 960x540, on foot and riding: box clear of everything, speedometer included (box 250,253 138x35 at 640x360). The v300 claim holds.
- Touch 390x664, 667x375, 320x568, on foot and with a real bogged sled (`enterBog()`): box overlaps no control or HUD panel. Bogged line "BOGGED · tap GET OFF, and dig · ↺: reset" is 259 px wide at 320x568 and wraps to 2 lines (49 px tall), still clear.
- With the tablet open the scenario flags overlaps (`tabS`, `tmapc`, `tabWid`) in 5 cases. Stills show the box is not visible there (the tablet covers it), so this is a false positive of my probe, not a defect.

## Findings
1. BUG — The bogged toast hard-codes keyboard keys on touch (and pad): "Bogged to the skis. Get off (Q) and dig (hold E), or press R." (tracklayer.js:14651; the wading variant likewise "Get off (Q) … (E)"). Seen in the 667x375 touch still. Same class v299 fixed for rescue lines, and R is not even reset (that's N). Route it through `btn()` / `keyHint` like the hint line right beside it, which already reads correctly ("BOGGED · tap GET OFF, and dig · ↺: reset").
2. POLISH — On touch the toast ("Tutorial skipped…", Gram card) renders over the open tablet's top edge; harmless, noted only because the tablet then hides the hint box entirely, so a hint like "tap GET ON" is unavailable while the tablet is up (probably intended).

No BLOCKER. Untested: a real phone's safe-area insets (notch / home bar) — CDP emulation has none.

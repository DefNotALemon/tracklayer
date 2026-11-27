# 0390 — v303 pad Menu + device-specific key sheet / STUCK? card: beta

Run on origin/main ec75797 (script v303). Lane A's `g3_helpsheet` rerun: all ok, page errors none, exit 0.

## Results
- Keyboard, Xbox, DualSense, Switch, touch sheets and STUCK? card each name only their own controls; Menu opens/shuts Settings four times running; RT at 15% counts as pad in hand; View resets a real stuck sled (30 m).
- New `g3_helpsheet_break` (640x360 itch embed, pad): sheet is hidden (no overlap with HUD), card reads "STUCK? PRESS VIEW". Menu pressed three times with the Weather tablet requested open: Settings open/shut/open (alternates, no one-frame flash). B closes it. Menu during a crash opens Settings and B closes it. A key press returns to kbm.

## Findings
No BLOCKER or BUG.
1. POLISH: a bare `mousemove` event (synthetic, movementX 5) left the device on `pad`; only a key press switched back. Real mouse events may differ; I did not test with Input.dispatchMouseEvent.
2. POLISH: my probe of "tablet open" read a wrong flag (`TABLET.open`), so the tablet-with-Menu case shows Settings alternating, not whether the tablet stays open behind it. Not verified.

Not covered: Switch/DualSense Menu equivalent (Options/+) in the break scenario; pad sheet at portrait phone sizes.

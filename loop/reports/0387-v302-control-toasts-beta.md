# 0387 — v302 control-naming toasts (bog, winch, truck stuck, visor, garage, note): beta

Run on origin/main 295ab18 (script v302, c786f35). Lane A's `g3_bogtoast` rerun by the beta tester: 151 ok lines, 0 FAIL, "all passed", page errors none, exit 0.

## Results
- Keyboard, Xbox, DualSense and touch each read their own controls in the bog line, the winch line, the visor-icing line, the garage line and the tablet note line. None names another device's control (checked by regex for `(Q)`, `press R`, `hold E`, LB/L1/L3/View/Create, and "Tap X").
- Real bog on touch: the toast reads "Tap GET OFF and tap DIG beside the sled to dig, or tap ↺ to reset". GET OFF is the button label on screen, and beside the sled the use button wears DIG. One press starts the dig.
- Keyboard: N (the reset the line names) frees the bogged sled. After touch, the line goes back to key names ("Get off (Q) and press E ... or press N").
- Xbox winch line: "Get off (LB), wade to a tree and hook your winch (L3)".

## Findings
No BLOCKER or BUG. 

1. POLISH: the on-foot dig toggle toast (tracklayer.js ~15917, "Digging. Hold still." / "Stopped digging.") names no control. That is fine. The line at ~16065 ("not a rescue job") already goes through `btn()`. I did not check it per device.

Not covered: the truck "Stuck to the axles" line (14660) was not driven live. Its wording goes through `doHint`/`pressHint` like the others, but the scenario's list did not show a truck case. The pad (hold L3) versus touch dig behaviour was not re-tested beyond the scenario. No new scenario files.

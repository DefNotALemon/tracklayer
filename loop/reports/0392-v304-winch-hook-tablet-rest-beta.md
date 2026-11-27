# 0392 — v304 winch HOOK reach + use control resting behind the tablet (56fffaf): beta

Run on origin/main f39aed3 (script v304), headless, fresh profile.

## Results
- `x2_winchuse_break` (builder's, updated in v304): all passed, page errors none. Out of reach: no verb, hint "Line's at its end (26 m)...", E toasts out of reach. In reach: HOOK, then UNHOOK; 4 m from strap: no verb; pad L3 unhooks. Tablet open: E, pad L3 and the touch button leave a hooked winch alone and no verb is offered; tablet away: UNHOOK is back and E unhooks. Reload while hooked: stowed.
- New `x2_winchedge_break` (this report): fairlead 25.40 m from the tree on a 26 m line gives HOOK and E hooks; at 25.80, 26.20 and 26.60 m the label is null and E does not hook. Label and E agree at all four. With the tablet open, E does not start a dig on a bogged sled; with it away, E digs (label STOP).

## Findings
No BLOCKER or BUG found.
1. POLISH: the label drops at about 25.6 m (line minus 0.4 m), while the hint at the edge reads "Line's at its end (26 m)". Harmless, but the last 0.4 m of line is unusable for hooking. Intended margin per the code comment.
2. POLISH: the sweep is for a tree anchor only. Boulders, pad-only and touch-label at the edge, and a dig already running when the tablet opens (does it pause or continue unseen?) are untested.

Not covered: lane B-D slices, an old save.

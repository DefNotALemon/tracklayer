# 0394 — v305 "size it up" rests behind the tablet (c29fa87): beta

Run on origin/main 5ce1115 (script v305), headless, fresh profile.

## Results
- `x2_tabletx` (builder's, new in v305): all ok, page errors none. Tablet away: X sizes it up, touch button reads SIZE UP. Tablet up: keyboard X, pad X and the touch button say nothing and no label is offered. At a hooked strap with the snatch block: X doubles the line, with the tablet up keyboard, pad and touch leave it, tablet away they change it again. Q still gets you on with the tablet up.

## Findings
No BLOCKER or BUG found.
1. POLISH (test artefact, not the game): the sized-up line read "about 0 lb to drag out" because the scenario sets `BOG.on = true` without `BOG.resist`. The real bog sets resist (line 15992 uses `BOG.resist * 1.2`); the scenario should assert the number is above 0 after entering a real bog (`enterBog`), otherwise a zero-pound line would pass.
2. POLISH: still untested from 0392: a dig already running when the tablet opens, boulder anchors, an old save.

Not covered: lanes B-D slices.

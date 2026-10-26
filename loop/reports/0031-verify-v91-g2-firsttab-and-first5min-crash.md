# 0031 — Verify v91 (G2: first-Tab Parcels) + first-5-min drive investigation — main @ 73cbaea (script v91)

Scenarios: `tools/playtest/scenarios/g2_firsttab.mjs` (unchanged, existing), `g2_first5min.mjs` (unchanged,
existing), and a new instrumented variant `g2_first5min_drivelog.mjs` (logs onFoot/warmth/slope every
~0.3 game-s during the auto-nav drive) committed alongside this report. Shots:
`~/.hermes/cache/scratch/tlloop/reports/0031.jpg` (firsttab, not copied — see note), `0031b.jpg` (drivelog
4-up + final). Raw stills: `~/.hermes/cache/scratch/tlloop/0031/`, `0031b/`, `0031c/`.

Focus: verify the builder's latest landing (07:57 pass, "First Tab on a new save opens the Parcels board",
G2, hash 35d5108, v91) — the only landing since report 0030, so the "verify first" rule points here.

## Findings

1. [G2][info][confirms landing] **v91 reproduces exactly.** `g2_firsttab.mjs`: new save 1st Tab → `{open:
   true, app:"parcels", title:"PARCELS"}` (was Home pre-v91); 2nd Tab closes it; 3rd reopens Parcels;
   veteran (5 deliveries) 1st Tab → Home (`NORDKINN`); new save with a job already taken → Home. Matches
   PROGRESS's claim field for field. No regression.

2. [G2][medium][new, real gameplay] **Being thrown off the sled drains warmth far faster than normal
   riding.** Running the existing `g2_first5min.mjs` (accept the opening Pharmacy order, hold W toward
   Neset) crashed the sled into a shed near the quay at **71 mph** about 10–15 game-s after leaving (toast:
   "Came off at 71 mph. Winded and bruised... the tether caught you and pulled the sled right beside you.
   Press Q to get back on."). From that point, with the harness still holding W (now driving the on-foot
   character, not remounting), warmth fell **87.9% (t=43.9s) → 30% (t≈94s)** — about **50 game-seconds**,
   ≈1.1 pts/s. For comparison, report 0027's straight powder sled ride drained 100%→0% over 137.6 game-s
   (≈0.73 pts/s) while actually exposed to wind at speed. Here the character is barely moving (foot speed
   0.71 m/s, "winded and bruised") yet loses warmth faster than riding. Stills `t15`/`t30`/`t46`/`t61` in
   `0031b.jpg` show the sequence: crash toast next to a building, then three near-identical "Walk back to
   the sled and press Q" frames with the warmth bar visibly draining (97%→92%→87%→83% on the HUD, separate
   from the exact script-logged values) and the temp readout sliding 46°→39°→39°→34°. Possible causes worth
   the builder checking: a crash/"winded" status may stack a cold-vulnerability multiplier on top of normal
   exposure, or warmth regen/clamping might not apply correctly while `FOOT.active` right after an eject.

3. [G2][low][harness note, not a game bug] **`g2_first5min.mjs`'s auto-nav has no obstacle avoidance**, so
   on routes where the straight-line bearing to the dest clips a building (this Neset job, quay-side,
   "climb 122 m") it can crash before covering real distance — both this run and the original committed
   run topped out around 843–844 m remaining of 895 m at the 150 s wall cap, which reads as "barely moved"
   but is actually "crashed early, then shuffled on foot." A real player steering visually wouldn't hit the
   shed. This means `g2_first5min.mjs`'s drive-distance numbers aren't reliable on this particular job/route
   until the harness either steers around near obstacles or detects the eject and presses Q to remount.
   Suggested fix for playtester-owned follow-up: after a crash, check `FOOT.active` and auto-tap Q once
   back near the sled (or abort cleanly and report "crashed at Xs" instead of treating it as capped
   distance).

4. [G2][info][scope note] **This was NOT the warm-route long-haul case from 0027/backlog** (that item wants
   a coastal-road rerun with a village stop, `g2_cleanair_deliver.mjs`); this is a different, earlier-game
   warmth-drain path (fresh save, first job, post-crash) that the backlog didn't have a number for yet.
   Flagging separately since the drain rate looks disproportionate to how little the character is actually
   doing.

## Verified since last time
- v91 (first Tab opens Parcels on a new save, G2, 35d5108): works exactly as claimed, no regression.

## Ideas
- Builder: check whether `FOOT`/crash state applies an extra cold multiplier, and whether that's
  intentional (a "shaken up, chilling fast" consequence of crashing) or a bug (e.g. warmth regen gated on
  `onSled` not firing at all on foot, so it's not regen-vs-drain balance, it's just an uncapped drain).
  If intentional, consider a toast/HUD cue so the player understands why warmth is falling so fast right
  after a crash (the generic "You're freezing" message doesn't distinguish this from slow exposure).
- Playtester follow-up: harden `g2_first5min.mjs` (or add a variant) to detect the eject and remount via Q
  so first-5-minutes distance/time numbers aren't corrupted by an early crash on routes that clip terrain
  near the quay.

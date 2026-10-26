# 0075 — sled-ready toast cascade on a milestone delivery (G2) — main @ 003c593

Scenario: tools/playtest/scenarios/g2_toast_stack.mjs   Shots: ~/.hermes/cache/scratch/tlloop/reports/0075.jpg
Backlog item (follow-up to v135 sled-ready toast): does the 4th-delivery "garage will sell you the Woodsman"
toast read alongside the delivery toast (3-toast cap, 4.2 s each), and is 4.2 s long enough? Driven through the
real `deliver()`/`bumpDelivered()` code path (GS.delivered set to 3, one real parcel dropped at a non-depot
home `strandbu` so the fuel/backhaul toast fires too), not synthetic toast calls.

## Findings (most important first)
1. [G2][med] The 3-toast cap (`toast()`: `while (box.children.length > 3) box.firstChild.remove()`) evicts
   the **"Delivered..." payment toast early** on a milestone delivery, before its own 4.2 s timer expires.
   A single home delivery queued **5 toasts in 2.7 s**: `Delivered mail parcel to Strandbu: +$80` (t=0),
   `Strandbu. Someone's already at the window.` (mailVisit, t=0.09), `They topped off your tank and handed
   you trail report for the boat...` (backhaul, t=1.4), `4 deliveries: the garage will sell you the Woodsman
   440...` (sled-ready, t=2.6), `2 pieces of post for the boat from Strandbu (+$29...)` (t=2.7). With 5
   additions in under 3 s against a cap of 3, the cap strips the OLDEST toast by insertion order regardless
   of how long it's been visible: "Delivered +$80" — arguably the one thing a player most wants confirmed —
   was gone from the DOM by the t=2.9 s checkpoint, ~1.3–2.8 s before its 4.2 s timer would have removed it
   naturally. Reproduces every time (deterministic setTimeout delays, no randomness in this path).
2. [G2][low] The stack itself renders cleanly: toasts stack as separate full-width bars top-left, never
   overlapping or clipping each other, even with the long 3-line sled-ready message sitting under two shorter
   ones (0075.jpg, t1900/t2900 frames). So the backlog's "does it read alongside" visual-crowding worry is a
   non-issue — the real problem is the cap evicting by age-in-queue instead of age-on-screen.
3. [G2][low] 4.2 s is enough time to read even the long sled-ready sentence (3 short lines, no truncation) —
   confirmed by zooming the stills. Not a length problem; don't shorten `sledReadyMsg`.
4. [G2][low] A "trail report" item is handed out as the boat backhaul cargo on a Mail-parcel delivery — reads
   oddly ("picking up a trail report" for a mail run); cosmetic, not filed as its own item.

## Verified since last time
- v141 sledGap lock-card text (0073) and v142 round-obstacle sidestep (0072/0074) not touched by this pass;
  nothing new landed since 0074 to re-verify.

## Ideas
- Fix direction: either (a) extend the cap to 4 (5 genuinely queues on a milestone delivery, and the layout
  has visible headroom per finding 2), or (b) make the cap evict whichever toast has the LEAST time left on
  its own 4.2 s timer rather than `box.firstChild` (oldest-inserted), so an early toast with time left isn't
  cut short by a burst of later ones. (b) keeps the cap's purpose (bound screen clutter) without silently
  dropping the pay confirmation.

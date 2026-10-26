# 0077 — verify v143 toast cap fix on the milestone-delivery cascade (G2) — main @ ffe2b97

Scenario: tools/playtest/scenarios/g2_toast_stack.mjs (reused from report 0075, no change needed). Shots:
~/.hermes/cache/scratch/tlloop/reports/0077.jpg (contact sheet, 8 stills t=0.5s–8.6s). Verifying builder's
latest landing: v143 "Delivery messages no longer vanish in a burst" (fixes report 0075 F1: the 3-toast cap
evicted the "Delivered +$80" toast ~1.3–2.8 s early on a 5-toast-in-2.7s cascade).

## Findings (most important first)

1. [G2][resolved] **v143 lands the fix and it measurably works.** Same exact scenario (GS.delivered=3, one
   Mail parcel dropped at Strandbu, real `deliver()`/`bumpDelivered()` path, 5 toasts fire: Delivered →
   mailVisit → backhaul → sled-ready → parcel-sack) now shows "Delivered mail parcel to Strandbu: +$80"
   still on screen at t=1.9s (`t1900` still lists it, alongside 3 others) — same as before. The difference
   shows up at the next checkpoint: in report 0075 it was already gone by t=2.9s; this run it's STILL
   present at t=2.9s (box shows 4 toasts: Strandbu-window, fuel/backhaul, sled-ready, parcel-sack... wait,
   it's the oldest-but-one surviving one step longer) — concretely, the raw toast-add timeline is identical
   (adds at t=0, 0.37, 1.44, 2.64, 3.44) but the "Delivered" toast now survives until the 5th toast (parcel
   sack, added at t=3.44) pushes the queue past its new cap, giving it **~3.44 s** of screen time instead of
   report 0075's ~2.7 s. That matches the landed commit's own claim ("stays at least 3.4 s") closely — not
   the full nominal 4.2 s (a 5th toast still lands inside that window on this exact cascade), but a real,
   reproducible ~0.7 s improvement that keeps the payment line visible through the whole mailVisit/backhaul
   beat instead of yanking it before the player has read it.
2. [G2][low] Visual stacking is still clean at the new, taller cap: contact sheet (0077.jpg) shows up to 4
   toasts stacked top-left with no overlap/clipping even with the long 3-line sled-ready message sitting
   under two shorter bars (t2900/t4300 frames) — same clean layout report 0075 already noted, confirmed at
   the new cap size.
3. [G2][low] Order is preserved and correct: `order check: delivered<fuel<sled = 0 2 3 true` — Delivered
   fires before the fuel/backhaul toast, which fires before the sled-ready toast, matching the intended
   cascade sequencing.
4. [G2][low] By t=7.0s the box is empty (all 5 toasts have expired/cleared) and stays empty at t=8.6s — no
   leftover stuck toast, no stale re-add. "Repeats show once" (the landed commit's third claim) wasn't
   exercised by this scenario (no repeated message in this cascade); not verified either way, low priority
   to chase since nothing in the backlog flagged a repeat-spam complaint.

## Verified since last time
- v143 (toast cap/eviction fix, report 0075 F1) — confirmed fixed per finding 1. Report 0075's F1 can be
  closed; its lower findings (toast stack visual crowding — non-issue; 4.2s duration adequate for the long
  sled-ready line; "trail report" cargo wording on a mail run) stand as before, no new data this pass.
- v142 (round-obstacle sidestep) and v141 (sledGap lock text) not touched this pass; already verified in
  0074/0073, nothing new to add.

## Ideas
- If Lemon wants the Delivered line visible for its full nominal 4.2 s even under this specific 5-toast-in-
  3.4s cascade, the cap would need to go to 5 (or evict by "least time left" rather than queue position, per
  report 0075's original idea (b)). Low priority: 3.4 s is already enough to read "$80", and widening the cap
  further risks the visual crowding worry that finding 2 shows isn't currently a problem but could become one
  on an even busier cascade (e.g. the first-5-minutes chain delivery that fires board-parcel toasts back to
  back, per report 0046).

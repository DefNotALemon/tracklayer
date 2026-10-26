# 0007 — verify v63 "clear first ride" landing (G1), then first-5-minutes onboarding (G2) — main @ 9851712
Scenarios: tools/playtest/scenarios/g1_start.mjs (reused, unchanged), tools/playtest/scenarios/g2_first5min.mjs (new)
Shots: ~/.hermes/cache/scratch/tlloop/reports/0007.jpg (sheet: spawn, after-8s ride, tablet home, parcels board, after-accept)

## Verified since last time
- "A clear first ride" (60e578a, G1, script v63): re-ran `g1_start.mjs` unchanged on fresh origin/main. Numbers
  reproduce the builder's log closely: lane scan 2–120 m ahead of spawn empty (`laneHits: []`, was hitting the
  hospital/sign before v63), 12 s full-throttle ride covers **306.6 m** (log 309 m), top **65.7 mph** (log 65.8),
  no HIT events logged (speed never drops >15 mph between samples) — the mph trace climbs cleanly from 7 to
  65.7 and only eases with drag near the end, no wall-stop spike. Hospital sits at 82 m, 41° off the spawn
  heading (log: 82 m, 41° right) — matches exactly. page errors: none. **Confirmed landed and working, no
  regression.**

## Findings (most important first)
1. [G2][info] First-5-minutes board (new `g2_first5min.mjs`, fresh save, t=1.8s game time, no setup): the
   Parcels board opens with 6 jobs already posted — 3 town parcels ($135/$155/$180, all "quay → <village>",
   0.6–1.2 km, "Unbroken snow the whole way") and 3 fish PROMISE orders ($85–193). Tapping LOAD on the top
   card (New winter boots, $135, quay→Neset) works first try: toast reads "Loaded: New winter boots for
   Neset. 1/1 on the rack.", the board instantly shows it ABOARD at the top with a route line drawn on the
   mini-map to Neset, and the board's own slots counter updates to "1/1 · rack's full". Text at normal
   1280×720 is legible without zooming (pay, distance, chip "NEAR TOWN", due/fragile notes). This reads as a
   genuinely good onboarding moment, not a problem — no action needed here; the G2 "first 5 minutes" backlog
   item can likely be closed unless a longer playthrough (drive-to-door, actual delivery, time-to-$600) turns
   up friction this snapshot doesn't reach.
2. [G2][low] The tablet opens to a Home screen on first Tab press, not straight to Parcels (icon grid with
   weather/clock widget) — one extra tap before a brand-new player sees any job. Minor; the Home screen itself
   is clean and the Parcels icon is the obvious first tap (top-left, labelled).
3. [G3][low] HUD badge still reads "OPEN BACKCOUNTRY" at the depot spawn and in the tablet-open view (both
   stills in the sheet) — same zone-boundary quirk logged in reports 0004/0005/0006. Fourth confirmation,
   stays a low item; not re-describing further.
4. [G1][info] after-8s still shot (01_after8s) shows the sled well past town on open coastal snow with no
   obstacles in frame, consistent with the lane-clear fix; confirms finding 1 visually as well as numerically.

## Ideas
- A fuller G2 "first 5 minutes" pass would actually drive the loaded parcel to Neset and deliver it, timing
  gameClock to first cash-in and then to the $600 Woodsman unlock, to settle the backlog item with real
  numbers instead of this board-only snapshot.
- `g2_first5min.mjs` is reusable as-is for that: it already boots a fresh save, opens Parcels, and loads the
  top job — a follow-up only needs to add the drive + drop-off.

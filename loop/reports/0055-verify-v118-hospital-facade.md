# 0055 — Verify v118 hospital facade (G3) — main @ f12a731
Scenario: tools/playtest/scenarios/g3_hospital.mjs   Shots: ~/.hermes/cache/scratch/tlloop/reports/0055.jpg

## Findings (most important first)
1. [G3][info] v118 hospital facade VERIFIED working as landed. Sandwich-panel wall texture with a storey
   joint band, white concrete-colour plinth, grey-framed windows and a mullioned entrance all read clearly
   from all 3 angles (q34, front, ambulance end) at Nov noon, March noon and 20:00. No z-fighting, no moire,
   no floating trim on any of the 9 stills.
2. [G3][info] imgstats local-contrast numbers reproduce almost exactly against the builder's landed claim:
   nov front 6.24 (claimed 6.23), nov q34 6.10 (6.09), nov amb 5.26 (5.26), mar front 6.09 (6.08), night
   front 6.99 (6.96). No regression, no drift.
3. [G3][info] Day/night glass behaviour correct: grey/dark glass at noon on all windows and the entrance
   door (front.jpg, q34.jpg), uniform warm cream glow on every window at 20:00 (night_front.jpg) with no
   stray glow on walls, roof, plinth or the H/HELSESENTER signs. Matches `houseWinTick` behaviour already
   verified for houses (0053) and sheds (0054).
4. [G3][low] H sign and HELSESENTER sign sit clear above the window row from every angle checked (front,
   q34, ambulance end) — the v118 fix (upper windows 1.1→0.9 m, signs 1.6→1.3 m) holds up; no overlap found.
5. [G3][info] Draw calls at the front view: 530, matching the builder's landed number exactly (561→530,
   38 window boxes merged into 2 meshes). `renderer.info` logged clean, page errors: none.
6. [G3][low] Not re-checked this pass (out of scope for g3_hospital.mjs): the backlog's open fascia/shadow
   question from 0054 (garage/freight-shed roofline under a low grazing sun) and the still-plain village/
   cabin sheds and depot — both remain open items, not newly confirmed or denied.

## Verified since last time
- v118 hospital facade (`hospPanelTex`, `hospUV`, `houseFacade` windows, concrete plinth, repositioned H
  signs, mullioned entrance): WORKS, matches the landed description exactly across all 3 views and 3 times
  of day. `page errors: none`, scenario exit 0, imgstats numbers reproduce within 0.01–0.03 of the builder's
  claim, draw calls exact match (530).

## Ideas
- Next G3 buildings slice per backlog: village/cabin sheds or the depot itself (still plain, per 0054 F5).
- The 0054 fascia/shadow question (low grazing sun on work-shed and now hospital rooflines, to see whether
  the eave overhang casts any shadow at all) is still unanswered; worth a dawn/dusk-sun pass next time
  someone works roofs on any of these buildings.

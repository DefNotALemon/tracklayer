# 0385 — Thank-yous at the door (v301, 96695cb): beta

Run on origin/main f0f30c7. Builder's `g2_gifts` rerun: all passed, page errors none (756 generated gifts across every site: no broken line, none over 240 chars, 77 distinct givers, option off/on, reload). New breaker `g2_gifts_beta.mjs` (committed): two parcels at one door, spare worth more than the part, reload while the words are pending, old save without the gifts key.

## Results
- Two parcels at one door count as one hand-over (one gift). Holds.
- A $90 part bought with $500 spares and $0 cash: fitted, credit left $410. Holds.
- Old save with no `gifts` key loads with empty state, hook wired. Holds.
- Pocket, trade-in credit and the log survive a reload.

## Findings
1. POLISH — The words and the toast live only in memory (`pend` in tlx-gifts.js) for 2.6 s after the hand-over. A reload (or the page closing) in that window keeps the gift (pocket has the lefse) but the player never sees who gave it or what it was. Seen: reload right after `deliver` gave pocket 1, `TLXGIFT.said` null, no tablet note. Suggested fix: if `pend` is set when saving, store `s.pendMsg` and re-arm it in `init`; or drop it (rare).
2. POLISH — "Take a cinnamon bun, still warm for the road." The snack text embeds a clause ("still warm") into the "Take ${a} for the road" template, so it reads as a glitch. Same with "Take a flask of black coffee for the road. My late father..." fine, only the bun. Suggested: move ", still warm" out of `a` into the eaten line, or reword the template.
3. POLISH — Fish cakes (`where: {fish:3}`, no herd entry) are handed out by herder cabins at the same weight 1 as lefse (seen at Risfjord herder cabin; also stockfish at Naustbakken is fine). A herder cabin giving fiskekake is odd; give it `herd: 0.3` like stockfish.

No BLOCKER, no BUG. Untested: pad/touch (the words contain no control text; the tablet note on the 640x360 embed was covered by the builder's step 11).

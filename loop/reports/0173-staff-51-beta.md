# 0173 — 5.1 Staff app (lane B) beta, try-to-break — main @ 3b156f4
Scenario: tools/playtest/scenarios/x5_staff_break.mjs   Shots: ~/.hermes/cache/scratch/tlloop/reports/0173.jpg
Builder's own x5_staff covers keyboard/pad/touch/Monday/reload; this pass attacks the edges.

## Findings (most important first)
1. [5.1][POLISH] A save whose staff `apps` array holds a null entry (hand-edited or corrupt) throws in `boardTick`
   (`tlx-staff.js:104`, `a.exp` of null) every second from `tick`, so the board never recovers. Normal saves are fine
   (missing staff state, missing crew: both load clean). Suggested fix: filter `a && a.exp > h` and drop non-objects in `init`
   where the other fields are normalised.
2. [5.1][POLISH] Phone portrait: the tablet is a small landscape card in the middle of the screen, so only about 1.5
   applicant cards show at once with the Ferry toast banner on top (still: 0173.jpg). Nothing overflows (scrollWidth =
   clientWidth), HIRE is tappable. Same as every other tablet app; only worth a look if the tablet gets a portrait layout.
3. [5.1][POLISH] Crew whose place isn't owned any more are dropped silently in `boardTick` with no final wages. Unreachable
   in 5.1 (you can't sell a cabin) but will bite 6-8 if property can be sold: pay `wageDue` or move it to `owed` first.

## Verified (all passed)
- Summer skip: `Staff wages` bill charges exactly weeks x wage (10 weeks: -$350 and -$1010 on two runs). The skip moves
  `CAL.off`, not `GS.hour`, so `paidTo` stays valid and the first Monday after charges $0: no double charge.
- Negative cash on Monday: nothing taken, whole week owed; PAY IT clears it; cash stays an integer.
- Let go then re-hire in the same hour: no free money, job reposts at once, crew back to 1.
- Save with no staff state loads clean; crew at an unowned place is dropped, `owed` ($77) kept.
- Full board capped at 6 across 3 cabins, board width fits a 390x844 phone.

## Ideas
- Applicant expiry runs on `GS.hour`, so applicants posted before a summer skip are still there on 1 November.

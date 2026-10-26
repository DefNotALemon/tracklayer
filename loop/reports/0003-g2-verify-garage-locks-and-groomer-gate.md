# 0003 — verify v59 garage-lock landing, check the rank-3 groomer gate (G2) — main @ 127af07
Scenario: tools/playtest/scenarios/g2_groomer_gate.mjs   Shots: ~/.hermes/cache/scratch/tlloop/reports/0003.jpg (contact sheet)

Focus: verify the builder's v59 landing (readable garage locks), then check the backlog item "rank 3
announces grooming but the groomer/receiver are Woodsman-tier (4 deliveries)".

## Verified since last time
- **v59 garage-lock landing reproduces exactly.** At `GS.delivered=3` (one short of the Woodsman): the
  Parts tab's groomer and receiver rows both read "...Fits the Woodsman 440 W/T and newer (4 deliveries,
  $600)" tagged "Woodsman+"; the wing tiller reads "...Fits the Ranger 500 and newer (8 deliveries, $900)"
  tagged "Ranger+". The Sleds tab's Woodsman card reads "$600 once you've made 4 deliveries (you have 3) ·
  opens 22 more parts in the shop" (`03_garage_sleds_at_3.jpg`). No regression from the landed text.
- **Buy flow works end to end.** At `delivered=4, cash=$5000`: `buySled("woodsman")` succeeded, toast
  "Bought the Woodsman 440 W/T...", cash $5000→$4400, Frontier card flips to "Owned", Woodsman flips to
  "Riding" (`04_garage_sleds_at_4.jpg`). No errors.

## Findings (most important first)

1. [G2][low] **The Trail Crew board doesn't mention the sled gate, only the garage does.** At
   `delivered=3` (the instant "Trail crew" rank opens), the board shows a live, payable job card — "Groom
   the Gartefjellet trail", $430, button "TAKE THE LINE" — whose only blocker text is "That's grooming
   work. You need a groomer drag on the hitch: the garage sells them." (`01_crew_board_at_3.jpg`, DOM
   text confirmed via console). True, but incomplete: a player who reads that and goes straight to the
   garage expecting to buy one hits a *second* lock (groomer needs the Woodsman, one delivery away) before
   finding the real blocker. Low severity because the v59 garage fix (finding above) explains it clearly
   one tap later, so nobody gets stuck — it's a one-extra-click paper cut, not a confusion dead-end. If the
   builder wants to close it: append "(once you've got a sled for it)" to that one warn string in
   `contractBlock`'s `c.groom` branch (tracklayer.js ~line 5941). Not worth a special case if there's
   higher-impact work queued.

2. [G2][info] **Recovery call-outs lock text has no such gap.** Same board, same delivered count: "Recovery
   call-outs — LOCKED — Fit a winch at the garage" is accurate as written, since the cheapest winch is
   Frontier-tier (buyable on the starting sled, no second lock to hit).

## Ideas
- The Trekker/Aurora sidegrade backlog item (LOOP.md G2) and the inland-hillside slope-on-foot item
  (owed since report 0001) are still the two oldest unpicked G2/G1 items; either is a good next builder
  pick after this one.

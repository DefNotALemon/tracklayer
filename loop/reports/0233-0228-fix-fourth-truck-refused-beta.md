# 0233 — beta fix 0228 #1 recheck: 4th truck refused before cash moves (G4 milestone 3, tlx-vehicles v26) — main @ 786087e
Scenarios: x3_usedlorry_break.mjs (rerun, all ok, page errors none) and new tools/playtest/scenarios/x3_cap_cash_break.mjs (all ok, page errors none). No stills (economy test).

## Findings
1. [VERIFIED] 0228 #1 is fixed. With 2 trucks owned, a used pickup paid and waiting, and a tractor listing that was already on the board, paying the lorry is refused with "That would be 4 trucks: the pickup you paid for is waiting in Johan Henrik's yard in Lebesby." Owned stays 2, held stays 1; after collecting everything it ends at 3 trucks, 0 held. The pickup is no longer dropped. This also covers POLISH 0228 #2: the toast names the reason.
2. [VERIFIED] Break attempts all hold. At the cap (3 owned), 3 repeat pays of the same listing leave cash at 80000, the listing on the board and no held order. After save+reload the state is identical and the buy is still refused with cash intact. Drop to 2 trucks and the same listing buys normally (cash falls).
3. [POLISH] At the cap the pool won't generate a tractor or pickup listing at all (mktMake returns nothing), so the refusal only fires for listings made before you reached the cap. That is sensible, but a player won't see the "That would be 4 trucks" line in normal play beyond that case. No change needed unless the listing page should say "full" up front.

## Verified since last time
- x3_usedlorry_break A-E still pass (SEND then reload then collect, collect from another truck's cab, licence loss refund, lorry sold then pool relists).

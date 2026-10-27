# 0088 — footBadge ski/ice lines (G1, follow-up to v149)

**Focus**: verify the builder's latest landing, v149 (`8bad103`, "On foot, the snow badge reads the walker's
snow, not the parked sled's"). That pass's own next-step was "playtester checks the ski/ice lines" — `footBadge()`'s
ski branch (`F.ski ? "Gliding on ice" : "Slippery footing"`, `"Skiing a track"`, `"Skis float you"`) had never been
exercised because no fresh save starts with cross-country skis.

**Scenario**: new `tools/playtest/scenarios/g1_footbadge_ski.mjs`. Equips `GS.own.xc = {id:"tur"}` (Turski
all-rounder), teleports the sled + taps Q to dismount at four spots, reads truth the same way `footBadge()` itself
computes it (cell pack/depth/ice), and shots each with `sideCam`. Weather pinned (`WX.at=()=>0`, `GS.storm=0`,
`hour=12`).

**Findings**

1. **All 4 spots: pill text matches truth, 4/4 OK** (`B` needed a land-point search since a blind offset landed in
   the sea and silently blocked dismount — not a game bug, a harness issue, fixed in-scenario).
   - A (depot yard, skis): PACKED / "Plowed yard" — correct (yard pavement wins over the generic ski-trail line,
     matches `footBadge`'s own precedence).
   - B (open backcountry, skis, `d=0.47`): POWDER / **"Skis float you"** — correct.
   - C (lake centre `LAKES[3]`, skis, `pk=0`): ICE / **"Gliding on ice"** — correct.
   - D (same lake centre, bare boots): ICE / **"Slippery footing"** — correct contrast case.
2. **Vision on the sheet (`tlloop/b97_sheet.jpg`, zoomed C vs D crop)**: C clearly shows red ski blades under the
   boots with the "Gliding on ice" line; D shows bare boots, same stance, "Slippery footing" line. No clipping, no
   double geometry, skis read as skis even standing still next to the sled.
3. **Not hit in this pass**: a clean non-yard **"Skiing a track"** read (A landed inside the yard, which correctly
   took precedence) — the line exists and reads right in the code (`pack>0.62 && yardAt<0.5`), but wasn't shot. Low:
   pure text, same code path already proven for PACKED/ICE elsewhere.
4. **Harness note for future use of this scenario**: don't hand-pick a "powder" coordinate by eyeballing a depot
   offset — part of the backcountry close to the depot can be open fjord/sea, and a teleport into water silently
   fails the dismount guard (`P.wet` check) with no error, just `FOOT.on` staying false. `g1_footbadge_ski.mjs` now
   searches outward by ring for a valid land cell instead; reuse that pattern for other foot-teleport scenarios
   rather than literal offsets.

**Verdict**: v149's footBadge ski/ice branch is clean, 4/4. No new backlog item — this closes the "next" note
from the footBadge landing. Scenario committed for reuse (e.g. if skis/footBadge logic changes again).

Stills: `tlloop/b97/A_yard_ski.jpg`, `B_powder_ski.jpg`, `C_ice_ski.jpg`, `D_ice_noski.jpg`; sheet copied to
`~/.hermes/cache/scratch/tlloop/reports/0088.jpg`.

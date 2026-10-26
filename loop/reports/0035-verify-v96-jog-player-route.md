# 0035 — verify v96 (Shift jog): play it like a player, not isolated 20 m reps — main @ a2e68c2 (script v96)

Scenario: new `tools/playtest/scenarios/g1_jog_player.mjs` (committed with this report). Woodsman fresh
save, noon, weather pinned calm (`WX.at=()=>0; GS.storm=0`). Jogged (Shift+W, steering toward the target
each tick, like a player on a stick) depot yard → a real shore-road door (lot2, `g1_lanes.mjs`'s route),
then jogged up a nearby slope (grade 0.196) found by search near the depot. Stills in
`~/.hermes/cache/scratch/tlloop/0035/`; contact sheet `~/.hermes/cache/scratch/tlloop/reports/0035.jpg`
(not retained in the repo).

Focus: backlog's newest G1 item (added by the v96 builder pass) — does the jog feel right played like a
player (turns, a real door, a real slope), not just straight 20 m reps? Does the toast repeat? Does the
pose read as a jog?

## Findings

1. [G1][info] **The depot→door walk in Kjøllefjord is almost entirely on plowed lane**, not open powder:
   jogging it end to end covered 48.9 m in 12.9 game-s, avg **3.79 m/s**, wind only reached 0.58 (never
   blown) — matches v96's "plowed lane 3.7–3.8 m/s, blown after 17 s / 58 m" exactly, it's just that this
   particular door is well inside that 58 m. Realistic takeaway: in town, where the lane work (v84/v89)
   already reaches most doors, a player jogging to a door basically never gets blown — the breath meter is
   doing its real job out in open powder, not on the lanes it was partly designed to make less necessary.
   Not a bug, just confirms the two systems (lanes, jog) stack the way the design intended rather than
   fighting each other.

2. [G1][info] **Toast never fired in this run** (0 entries in a hooked `toast()` log) because nothing on
   this route pushed wind to 1.0. Can't confirm or deny "does the toast repeat annoyingly" from this
   playthrough — the isolated `g1_jog.mjs` rep (straight 20 m powder) is still the only evidence it fires
   once per blow with a 20 s cooldown (`F.blownT`), which reads sane from the code (`if (F.blownT <= 0)
   toast(...)`, reset to 20). Builder: if you want this actually player-verified, the next playtest should
   target a route with 50+ m of continuous fresh powder (open backcountry, not town) and jog the whole way.

3. [G1][low][contra a backlog worry] **The jog pose does read as a jog, not a stretched walk.** Vision on
   01_at_door and 03_slope_after: visible forward lean, wider stride, elbows out — clearly different from
   a normal walk cadence. The backlog item worried "no run pose of its own (stride lengthened only)"; at
   least from these two angles it reads fine. Not exhaustive (only two viewpoints, both side-on at ~2.8 m).

4. [G1][low] **Uphill jog (grade 0.196) gives only a modest boost**: avg 1.83 m/s vs flat powder jog 1.79
   m/s baseline from PROGRESS — climbs eat almost all of the jog's speed gain by design (`jogK`'s
   `sstep(0.1, 0.35, gw)` term), which matches the code comment ("little help on a real climb"). Feels
   consistent, not a problem.

5. [G1][info] Harness note, not a game issue: `00_start_depot.jpg` came out black (camera fired before
   `FOOT.g` was visible after the Q mount). Scenario still measured correctly off `gameClock`/`FOOT` state;
   just drop that still if reusing the scenario, or add a short sleep before the first shot.

6. [info] Scenario ran clean: page errors: none, exit 0.

## Ideas
- Builder/playtester: a proper toast-repeat check needs an open-powder route long enough to blow twice
  (~120+ m at jog pace) — worth a short follow-up scenario if the toast-spam question matters enough to
  chase; on the evidence so far (code read) it looks fine.
- No code change indicated by this pass — v96 behaves as designed on a real route. G1 backlog item can be
  considered addressed; rotate to G2/G3 or a different G1 angle (e.g. open-backcountry long jog, which
  this report didn't cover).

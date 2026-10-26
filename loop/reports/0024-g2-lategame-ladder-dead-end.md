# 0024 — G2: late-game ladder dead end (Apex/Matriarch/Aurora) — main @ 320693f

Scenarios: `tools/playtest/scenarios/g2_ladder.mjs` (reused, no change) + new
`tools/playtest/scenarios/g2_lategame.mjs` (samples job/contract board at delivery counts 20/32/40/46/55/60/75 —
the thresholds for Apex/Matriarch/Aurora and beyond — plus a garage-sleds-tab still and a tablet still at
$100k cash / 60 deliveries). Shots: `~/.hermes/cache/scratch/tlloop/reports/0024.jpg` (2-col sheet:
garage top-tier cards | tablet); raw stills in `~/.hermes/cache/scratch/tlloop/g2late/`.

Focus: verify builder's latest landing first, then rotate (last 3 reports: 0021 G2, 0022 G3, 0023 G1 — G2 due).
No new landing to verify: 0023 already confirmed v83 (320693f) is still the tip of `origin/main`, and
`loop/PROGRESS.md`'s top entry is still that same pass, so there's nothing new since 0023 to re-check.

Rotated to G2 and took the backlog's open question directly: *"Nothing above the Summit opens a part... does
late-sled gear/jobs exist, or does pay make parcels pointless after rank 3?"*

## Findings (most important first)

1. [G2][high][confirms backlog, quantifies it] **The job/contract board is completely flat from delivery 20
   onward — all the way to 75, i.e. well past Aurora's 60-delivery requirement.** `g2_lategame.mjs` sampled
   200 parcels + all contracts at each of 20/32/40/46/55/60/75 deliveries: contract **kinds never change**
   (`exped, groom, heavy, prio` — same four at level 20 as at level 75) and the **average pay is noise-flat**:
   parcels $351–$377 avg across all seven levels (no trend), groom $848–$904, heavy $1608–$1849, prio
   $2251–$2577, exped $3525–$3627 — these ranges fully overlap level 20 through level 75 with no visible
   climb. A player who grinds from the Summit ($2400, 18d) through Apex ($5200, 32d), Matriarch ($9800, 46d)
   and Aurora ($14500, 60d) — spending nearly $27,000 over 42 more deliveries — sees literally the same job
   board the entire way. The backlog's suspicion ("contract pay vs parcel pay makes parcels pointless after
   rank 3") actually understates it: it's not that parcels fall behind contracts, it's that **nothing at all
   is gated on delivery count past ~20**, so the last three sleds have zero gameplay reason to exist beyond
   their raw stats.

2. [G2][high][new, explains #1] **The garage cards for Apex/Matriarch/Aurora drop the "opens N more parts in
   the shop" line entirely** (vision on `01_garage_lvl60.jpg`). Every sled through Summit 600 says e.g.
   "$2400 once you've made 18 deliveries · opens 3 more parts in the shop"; Apex/Matriarch/Aurora's cards (all
   showing "Owned"/"Riding" in this test) have no such line at any point — compare to the ladder table in
   LOOP.md which already notes "nothing" in their Opens column. This isn't just a missing fix from the player's
   side (#1): the UI quietly stops promising *anything* for these three, so a player isn't even misled — the
   game just goes silent. Confirms these are stat-only "number go up" purchases with no systemic payoff, the
   exact dead end the backlog flagged, now reproduced with both board data and a still.

3. [G2][medium][scenario/tooling note] `g2_lategame.mjs`'s tablet screenshot (`02_board_lvl60.jpg`) landed on
   the ferry/Map tab, not Jobs — `TABLET.toggle(undefined, "jobs")` didn't take because the ride had just
   booted at the quay with a ferry-arrival toast queued, which seems to grab tablet focus. Not worth a second
   pass to fix since the numeric board data (finding 1) already came straight from `makeJobs`/`GS.contracts`,
   not the screenshot; flagging so the builder (or a future playtest pass reusing this scenario) opens Jobs
   explicitly after a short `sleep` if a Jobs-tab still is ever needed.

4. [G2][low][info] The groom contract average is essentially a constant ($848–$904) across every delivery
   level sampled in both this run and 0022/report history — it was never designed to scale with player
   progress at all (unlike heavy/prio/exped, which do climb modestly). Not a bug on its own, just context for
   whoever picks up finding 1: three of four contract types do scale a little with level, they just all
   plateau around level 20 instead of continuing to climb with the three most expensive sleds in the game.

## Ideas (not mine to build, builder's call)
- Cheapest fix matching finding 1: add one new contract tier (or raise the exped ceiling) gated on
  32/46/60 deliveries so the top three sleds have a reason — "you need an Apex-class machine to take this
  job" the same way groom/heavy/prio/exped already gate on earlier sleds via weight/power, not just unlock
  order.
- Alternative: if the top three are meant to be pure luxury/flex purchases (faster, nicer, no new unlocks),
  say so explicitly in their garage card instead of silently dropping the "opens..." line — a one-line
  "no new jobs, just the best ride on the ladder" reads as intentional instead of unfinished.

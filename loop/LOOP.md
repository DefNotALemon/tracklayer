# Tracklayer improvement loop

Two unattended bots work on the web game full time (Lemon's order, Mon 26 Oct 2026):

> "I want the full time opus and sonnet bots playtesting and coding tracklayer to be better, the walking
> easier to traverse, the snowmobile progression make more sense, the visuals to be better"

- **Playtester (Sonnet, cron "Tracklayer playtester")** plays the current `origin/main` in headless Chrome,
  measures, takes stills, judges them, and writes one report per pass to `loop/reports/`. It never edits
  game code.
- **Builder (Opus, cron "Tracklayer builder")** triages new reports into the backlog below, takes the top
  item, builds it in its worktree, verifies it by playing, and lands it on `main` (push to GitHub).

Neither bot asks Lemon anything. Decide, log the reasoning, move on. Lemon steers by editing this file
(the **Owner notes** section wins over everything else here) or by talking to a Hermes session.

## The three goals

### G1 Walking: easier to traverse
On foot is where the game fights you hardest. Make getting around on foot pleasant without losing the
deep-snow feel (powder should still be slower than a packed trail; you should still want the sled).
Baseline measured 26 Oct (smoke.mjs, fresh Frontier save, flat open ground):
fresh powder **1.01 m/s** and tired 0.57 after 8 s; back along your own trench **1.75 m/s**.
Since v58 (g1_walk30.mjs): powder **1.56 m/s**, 30 m in **19.3 s**; trench **2.23 m/s**; tired 0.77 after 30 m.
Directions to explore (measure before and after, by gameClock):
- Base pace in powder and on packed snow, the tiredness curve, how much depth slows you.
- Snagging: trees/rocks/buildings/the sled push you sideways (`footStep` obstacle loop); getting stuck on
  corners, doorways, quay edges, slopes. Steering feel (turn rate 2.2 rad/s, turning on the spot).
- Slopes: walking up/down hills, cliffs, what the camera does on foot.
- Ways to go faster on foot that fit the game: packed paths in town, plowed roads, snowshoes as a cheap
  Bytteboden/shop item, a jog key, gentler start-up when you first press W.
- Clear on-foot prompts (where's my sled, how to get back on, what E does here).
Target: a new player can walk from the sled to a door 30 m away in powder in under ~20 s game time
without fighting the controls, and town/quay walking feels brisk.

### G2 Snowmobile progression that makes sense
The ladder (`SLEDS`: cost + `need` = deliveries), parts (`PARTS`), courier ranks (`RANKS`), jobs and their
gates should tell one clear story: earn → see what the next machine/part opens → buy it → do new work.
Things to check and fix:
- Map the full ladder: every sled's cost, delivery requirement, stats, what jobs it unlocks/suits.
  Is each step a real upgrade for a reason the player can see? Is any sled pointless or a trap?
- Earn rate vs prices: how long (game minutes, number of jobs) from a new save to the first upgrade, the
  second, ... Aim for the first meaningful purchase within ~10–15 min of play and a steady cadence after.
- Does the garage/tablet say what's next, what it costs, what it needs, and why you'd want it?
  Locked items should say how to unlock them. Job cards should say which sled/part they need.
- Starting experience: what does a brand-new player do in the first 5 minutes? Is the first job obvious?
Write the ladder table into this file (section "Progression map") the first time it's audited and keep
it current.

### G3 Visuals
Make it look better at a glance and up close: lighting, snow surface, sky, the sled and rider models,
buildings, trees, towns, UI polish. Judge with stills (contact sheets + vision). Lemon notices boxy
shapes, flat lighting, plastic look and over-bright effects first. Keep frame rate in mind: check with
the FPS readout or `renderer.info` before/after anything heavy, and respect the `GFX` presets.
Day and night both matter (polar night is most of the game's daylight), and so does the first view on
the title screen and at the quay.

## Rules (both bots)
- Work only in your own worktree: builder `~/Documents/GitHub/tracklayer-loop-build` (branch `loop`),
  playtester `~/Documents/GitHub/tracklayer-loop-play` (detached, reset to `origin/main` each pass).
  **Never touch `~/Documents/GitHub/tracklayer`** (Lemon's checkout; other sessions keep uncommitted work
  there, e.g. the spare-seat tour work) or the `settings-desktop` worktree.
- One change per builder pass. Small, finished, verified, landed. A big item gets split.
- Test with `tools/playtest/run.sh <scenario>` only (isolated ports + fresh profile, cleans up after
  itself). `scenarios/smoke.mjs` must pass (exit 0, "page errors: none") before anything lands.
- Player-facing change → update README.md and bump `tracklayer.js?v=N` in index.html.
- Keep the game's canon: one map (tablet Map app, M toggles it, no big map), realism-first handling,
  the tether/crash/rescue systems, Norwegian Finnmark setting. Don't delete features to "simplify".
- Commit messages in plain English saying what the player will notice, ending `; script vN` like the
  existing history. Stage only your own paths. `git fetch` + rebase before push; re-run smoke after a
  rebase that pulled code.
- Disk: if `df -g ~` shows under 20 GB free, skip all Chrome runs that pass and log it.

## Owner notes (Lemon edits here; overrides everything above)
- (none yet)

## Progression map
First audit 26 Oct 01:25 (`scenarios/g2_ladder.mjs`: stats as `stats()` computes them with stock parts; boards
sampled 40× per level). Part `tier` = SLEDS index the part needs (Woodsman = tier 1). p/d = power ÷ powder drag.

| Sled | $ | Deliveries | Power | Drag | Grip | Fuel L | p/d | Opens (parts at its tier) |
|---|---|---|---|---|---|---|---|---|
| Frontier 340 | 0 | 0 | 1.00 | 1.05 | 0.5 | 16 | 0.95 | (zip 1.6: sharp off the line) |
| Woodsman 440 | 600 | 4 | 1.20 | 1.00 | 0.4 | 22 | 1.20 | 22 parts: receiver-heavy, groomer, trailer, elec winch, supercharger |
| Ranger 500 | 900 | 8 | 1.41 | 1.02 | 0.3 | 20 | 1.38 | 18: flatbed, tiller, turbo, paddle track, heavy winch |
| Sprint 580 | 1700 | 13 | 1.58 | 1.12 | 1.1 | 18 | 1.41 | 8: EFI, hybrid track, freight deck |
| Summit 600 | 2400 | 18 | 1.68 | 0.88 | 0.8 | 24 | 1.91 | 3: mountain track, stage 3, expedition tank |
| Trekker 550 | 3400 | 24 | 1.61 | 1.00 | 0.6 | 30 | 1.61 | nothing — **weaker than the Summit it follows** |
| Apex 800 | 5200 | 32 | 2.02 | 0.78 | 1.3 | 26 | 2.59 | nothing |
| Matriarch 850T | 9800 | 46 | 2.50 | 0.66 | 1.8 | 30 | 3.79 | nothing |
| Aurora E | 14500 | 60 | 2.24 | 0.72 | 1.6 | 34 | 3.11 | nothing — **weaker than the Matriarch, +$4700** |

Ranks/contracts (pay = average offered): 3 deliveries grooming ~$900 (needs groomer $700 + receiver $150, both
Woodsman-tier, so really opens at 4); 5 heavy freight ~$1500 (trailer $900 + Freight licence); 12 priority
~$2450; 20 Slettnes expedition ~$3500 (flatbed $2400, Ranger-tier). Board parcels: $145 avg at 0–5 deliveries
(0.6 km), ~$295 at 6–10 (roaming, 2.3 km), ~$370 at 12+; all ≈ **$48–60 per estimated minute at every level**
(sled upgrades only raise it by beating the estimate). First upgrade (Woodsman $600 at 4 deliveries) ≈ 4–5
round-town jobs ≈ 15 game-min: on target. After that a single contract outpays 6 parcels.

## Backlog
Order = priority. Builder keeps it ordered; ties go to whichever goal has had the fewest recent landings.
Format: `- [ ] Gn: what, why (report #, numbers)`. Done items move to `loop/PROGRESS.md`.

- [ ] G1: Slope does nothing on foot: `footStep` never reads the grade (report 0001: "uphill" 1.66 m/s,
      "downhill" 2.41 vs flat 1.04, all explained by snow depth). Add a grade term like `skiStep`'s
      (`surf` ahead minus behind): uphill slower, gentle downhill a touch quicker, capped. Test on an inland
      hillside, not the fjord bank.
- [ ] G1: Measure walking in town/quay (plowed, pack≈1 → should be 2.9 m/s since v58) and around doors;
      check nothing snags on building corners or the quay edge.
- [ ] G3: Baseline contact sheet of fixed views (title, quay day, quay night, open backcountry, sled
      close-up, rider on foot) as `scenarios/views.mjs`, scored 1–10 per view in PROGRESS.md; every later
      visual pass re-shoots it.
- [ ] G1: Fix the start: 6 s of throttle from the spawn runs the Frontier into the Helsesenter wall
      (smoke.mjs still 01_riding). Spawn facing open snow or a clear lane.
- [ ] G2: Trekker 550 ($3400, 24 deliveries) is weaker than the Summit 600 it follows (p/d 1.61 vs 1.91,
      power 161% vs 168% shown on its card) and opens no parts: a trap on raw numbers. Give it a reason the
      player can see (its two-up seat for aurora tours? range: 30 L + 0.9 burn engine is already its thing; say
      so on the card) or retune toward its place in the ladder. Don't touch Lemon's spare-seat tour work in
      his checkout; read origin/main only. Same check for Aurora E vs Matriarch (3.11 vs 3.79, +$4700).
- [ ] G2: Rank 3 announces grooming ("You'll want a groomer") but the groomer and receiver are Woodsman-tier
      (4 deliveries + $600 + $850): the toast and the locked contract card should say "on a Woodsman or newer".
- [ ] G2: Nothing above the Summit opens a part (tiers stop at 4): Apex/Matriarch/Aurora are only stats. Look
      at whether late sleds should open late gear or jobs, and whether contract pay ($900–3500) vs parcel pay
      ($145–370) makes parcels pointless after rank 3.
- [ ] G2: First-5-minutes playtest of a new save: is the first job obvious, how long to the first $600?
      (playtester can own this; builder triages).

Last triaged report: 1

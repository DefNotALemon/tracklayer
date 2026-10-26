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
(builder fills this in on the first G2 audit)

## Backlog
Order = priority. Builder keeps it ordered; ties go to whichever goal has had the fewest recent landings.
Format: `- [ ] Gn: what, why (report #, numbers)`. Done items move to `loop/PROGRESS.md`.

- [ ] G2: Audit the progression ladder end to end (code read + a fast-forwarded playtest) and write the
      Progression map table above; turn the worst problems into backlog items.
- [ ] G1: Raise base walking pace in fresh powder (baseline 1.01 m/s) and soften the tiredness build-up so
      a 30 m walk is not a slog; keep packed/trench clearly faster than powder.
- [ ] G3: Baseline contact sheet of fixed views (title, quay day, quay night, open backcountry, sled
      close-up, rider on foot) as `scenarios/views.mjs`, scored 1–10 per view in PROGRESS.md; every later
      visual pass re-shoots it.
- [ ] G1: Fix the start: 6 s of throttle from the spawn runs the Frontier into the Helsesenter wall
      (smoke.mjs still 01_riding). Spawn facing open snow or a clear lane.

Last triaged report: 0

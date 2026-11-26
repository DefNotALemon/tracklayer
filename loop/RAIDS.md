# Armed work and raids (goal G9)

Lemon, 25 Nov 2026, word for word: "can you also add in missions that you get as tips from doing regular missions
involving guns(couriering and whatnot, maybe also add in security and guard missions for governments and corporations)
where you go to local underground drug farms, pot plants, meth labs, whatever else, and have a gta style mission where
you shoot up the place then leave before the police get there? you can steal there money and go, and you have to be
qualified to get these tipoffs, but theyll add to your map like a story mission, and once you do a couple your name will
get out there and people will give you more of them".

Built from chat sessions the G4 way: design here, one `delegate_task` builder per slice, the supervising session re-runs
the gate and looks at the stills. Worktree `~/Documents/GitHub/tracklayer-raids` (branch `raids`,
`git push origin raids:main`, gate and land with `TL_WT` set to it).

## Status
| Slice | What | State |
|---|---|---|
| A1 | Armed work: armed courier and guard shifts for the state and for companies, armed standing | landed (25 Nov 2026, `tlx-armed.js` v1, `a1_armed.mjs`) |
| A2a | The places and the people outside: seeded sites, the grow barn inside and out, the crew's suspicious routines, spotting one yourself, tips from standing, the map mark | landed (25 Nov 2026, `tlx-raids.js` v1, `a2a_sites.mjs`, 152 assertions) |
| A2b | The raid itself: the crew fights, the cash, the Politi clock, getting clear | not started |
| A3 | More places (meth lab, hjemmebrent still, smugglers' boathouse, pill press), your name gets out | not started |
| A4 | Tools for the job: pistol, pump shotgun, body armour, a mask; crews that come looking for you | not started |
| A5 | Played as a player: three raids start to finish, stills and feel, the nitpick round | not started |

## The loop the player lives
1. **Qualify.** Hunter's licence, a rifle of your own, and a clean enough Politi record get you onto the armed work list.
2. **Armed work (legal, steady pay).** Jobs on the board from named employers:
   - *Armed courier*: a sealed case (cash, payroll, medicines, a firearm for the gun shop, evidence for the lensmann)
     from A to B with the rifle on your back. Time limit, the case can be lost in a crash, sometimes someone follows you.
   - *Guard shift*: stand watch at a place for a set stretch of game time. The state: Kystverket's lighthouse depot,
     the Forsvaret radar hut, the kommune's fuel store, the ferry quay on payroll day. Companies: the fish plant, the
     power company's substation, the mine survey camp, a film crew's kit truck. Things happen on a shift (a prowler to
     challenge, a fox at the bins, a drunk, a sled with no lights that turns back when you step out, nothing at all).
   - *Escort* (A3): ride with the payroll van or the cash sled.
   Every finished job adds **armed standing** with that employer and overall.
3. **The tip.** People you work beside talk. After a job, with enough standing, a named person (the fish plant's night
   foreman, a courier dispatcher, a guard on the other shift, later a bent constable) passes you a tip: a message on
   the tablet, and the place goes on your map with its own mark, like a story mission. Tips never expire inside a week;
   an ignored one goes stale (the crew has moved on).
4. **The raid.** A remote, real place in the world (never inside a village's houses): go there, deal with the armed
   crew, take the money, and get out before the Politi arrive. The first shot starts the clock (somebody always hears
   it); the clock is the real drive time of a cruiser from the nearest road. Gone before they see you = clean. Seen
   leaving = a pursuit that starts hot. Caught = a heavy fine and the money back.
5. **Your name.** Each clean raid adds to your name. A name brings more tipsters, tips more often, bigger places with
   more money and better-armed crews, and (A4) crews that know who hit them.

## Rules for this work
- Tracklayer's own clothes: Finnmark, snow, real Norwegian names and trades. GTA's feel, never its names or look.
- **Who can be shot.** The gun system's rule "people can never be shot" stays everywhere with ONE exception, by
  Lemon's ask: the armed crew of a raid site (figures flagged hostile by this system). Villagers, families
  (`TLXN.people`), skiers, drivers, police, employers and anyone on a guard shift can never be shot; the rifle's
  safe-line check keeps working for them. Raid sites sit far enough from houses that the safe check passes there.
- Crews are people with the realistic-animation rule: gait, cover, aim, a hit reaction and a fall with weight. No
  sliding, no pop-in on top of the player, no teleport.
- They shoot back through the wounds system (`tlx-wounds.js`); health 0 is the game's own blackout.
- Gore follows the Northern Front decision (yes, with a Settings > Options switch to turn it down).
- New systems are `tlx-armed.js` (work, standing, tips) and `tlx-raids.js` (sites, crews, loot, the clock), registered
  with `TLX.register`, reaching the game through the expansion api. Options (on by default): `armedwork`, `raids`,
  `raidgore`. With `police` off, the clock still runs and ends the raid (the crew's own back-up arrives instead).
- Every job and tip has a row in the Jobs app and can be tracked; every control is bound on keyboard, pad and touch and
  named through `btn(action)`.
- Everything posts to the news bus (`TLXN.post`): a guard shift is village talk, a raid is on Radio Nordkinn ("shots
  heard out by ...") without naming you until your name is out.
- Money: armed work pays a little over a hauling job of the same length; a first raid pays about ten of them; the
  balance numbers go in each slice's notes.

## Slices

### A1. Armed work (`tlx-armed.js`)
- Qualification card in the Jobs/board flow: licence + own rifle + no unpaid fines over the Politi's limit. Locked
  cards say what is missing.
- Armed courier: 4+ case kinds, employers and routes drawn from the real sites (quay, villages, lighthouse, shops).
  Rifle must be carried the whole way. Case lost in a crash = job failed, standing down. One in four runs has a
  tail (a sled that follows and gives up if you keep pace or lose it): no shooting in A1.
- Guard shift: 6+ posts across state and company employers, each a real spot with a small built post (a hut, a
  barrier, a lamp, a brazier or a parked van). The shift runs in game time with the clock visibly passing; you can
  walk the perimeter; events from a table (at least 8) each need a small right action (step out, challenge with the
  use control, phone it in from the tablet, do nothing). Leaving the post fails the shift.
- Armed standing per employer and overall, shown in a new **Vakt** tablet app (work list, standing, your record;
  A2 adds the tips tab).
- Asserting scenario `a1_armed.mjs`: locked without licence/rifle; courier accept, carry, deliver, pay, standing;
  case lost on a crash; a guard shift with a forced event handled right and one handled wrong; leaving fails it;
  save and reload mid-shift and mid-run; rows in Jobs; prompts under keyboard, pad and touch; old save loads.

### A2. Tip-offs and the first raid (`tlx-raids.js`)
- Tips: earned from standing (first one after about five armed jobs), named tipster with a short message thread in
  the Vakt app's Tips tab, a mark on the Map app (`TABLET.addLayer("marks")`, own glyph and colour) and a Jobs row.
- The grow barn: a remote farm outbuilding with blacked-out windows leaking purple light, a generator, a snowed-in
  van, tracks in to it. Inside (a walk-in room): rows of plants under lamps, a drying line, a table with the cash.
- The crew: 3 to 5 armed figures, a lookout outside. States: idle, patrol, alerted (hears a sled, sees you), fight
  (cover, aimed shots that can miss, a hit reaction), break (the last one runs). Shootable under the rule above.
- The money: bags and a strongbox, a hold on the use control per pile; carried cash shows on the HUD and is yours
  only once you are clear.
- The clock: the first unsuppressed shot calls it in; a HUD line counts the cruiser's real drive time; cruisers
  come through `TLXP`. Clear the area unseen = clean; seen = pursuit at high heat with an armed-robbery fine.
- **Found by chance** (Lemon, 25 Nov, same day: "also make it so you can naturslly come across them, with sus people
  outside doing sus thigs"). The places exist in the world whether or not anyone tipped you: a few are seeded per
  week at real remote spots, and a tip only puts one of them on your map. Ride or walk past and you can spot one
  yourself from what is going on outside: a lookout smoking by the door who watches you the whole way past, two men
  carrying sealed tubs from a van, someone burning rubbish in a drum at night, a man on the phone who walks inside
  when he sees you, a sled with its lights off idling at the gate, a dog on a chain, purple light under a blacked-out
  window, a generator running where no one lives, fresh tracks to a "disused" shed. No marker and no prompt until you
  have seen enough: looking at it for a few seconds from range (or through the scope) fills a quiet "something's off
  here" read, and then it is marked on your map as a place you found, raidable with no tip and no qualification
  (an unqualified player can stumble into one; the crew is no weaker for it). Come too close before that and the
  lookout warns you off, then the crew comes out. Found places count toward your name the same as tipped ones.
- Split (supervisor, 25 Nov): **A2a** = sites seeded in the world, the barn outside and inside, the crew living there with
  its suspicious routines and the warn-off, the spot-it read and the found mark, tips and the Tips tab, Jobs row.
  **A2b** = alert and fight, shootable crew, wounds, the money, the clock and the Politi, clean or seen, your name +1.
- Carried over from A1 (supervisor's look at the stills): the walk-in figure runs in a deep crouch with both arms held
  out in front like holding handlebars and its feet tucked up off the snow (`a1_prowler_strip.jpg`); guard posts are
  plain boxes standing in open snow with no plant, depot or store beside them, and the van's wheels sit proud of the
  snow; a kommune fuel store's contact is a nurse (pick a contact whose trade fits, or the duty desk); a tablet
  notification covers the Work/Standing tabs.
- Asserting scenario `a2_raid.mjs` plus stills of the barn by night, the crew's stride and fall strips, the room.

### A3. More places, and your name
- Meth lab in a caravan or cabin (drums and glassware that burn when hit), a hjemmebrent still in a boathouse, a
  smugglers' cache at a fjord quay (reached by boat too), a pill press in a fishing shed. Each has its own layout,
  crew size and money. Escort jobs. The name ladder: tipsters unlock, tips come faster, sites get bigger.

### A4. Tools for the job, and what comes back
- A pistol and a pump shotgun in the gun shop's own model (frames and parts), body armour and a mask at Sport &
  Vinter (a mask means a clean raid stays anonymous). Crews that know your name ambush a courier run or turn up at
  your door.

### A5. Played as a player
- Three raids from a fresh qualification, played start to finish with no forced state; stills at each beat; the ten
  worst things listed and fixed; repeat until it plays like a mission worth driving out for.

### A1 notes (built 25 Nov 2026)
Built as `tlx-armed.js` (global `TLXAW`, state `x.sys.armed`, option `armedwork`), the Vakt tablet app (Work / Standing), Jobs rows through `api.jobx`, the
use control through an `api.footx` provider (so keyboard, pad and touch all work), `api.warmx` for the post's brazier and hut heater, and one hook in
tracklayer.js (`crashEject` calls `TLXAW.crashed`). Scenario `a1_armed.mjs`.
- **Pay (read off the board).** A parcel pays `30 + 0.09 m + 0.4 climb` (x cargo), a long parcel `60 + 0.11 m + 0.5 climb`, heavy freight `120 + 0.3 m + 1.2 climb`
  (x a mul). Armed courier = the long-parcel formula x 1.15 x a case mul (payroll 1.2, firearm 1.15, pharmacy 1.1, evidence 1.05, cores 1.05, lighthouse spares
  1.0): 1.15x to 1.38x a long parcel of the same distance (a 2.5 km run pays about $430-470). Guard shift = $85 a game hour for the state, $95 for a company
  (3 or 4 h: $255-380; the ferry quay on a Friday x1.2). A game hour is 50 s of play, so a shift of 3 h is about 2.5 minutes of game time and pays a little over
  a hauling job of the same length. Right calls add $6-24, wrong ones take $8-45 (never below 40% of the shift). Each standing level adds 3%.
- **Standing.** +3 overall and with the employer for a clean job, -4 for a failed one (-1 for abandoning, a missed pickup or arriving at a post too late), +1 /
  -1 per right / wrong call on a shift. Never below 0. Levels at 0 / 4 / 10 / 20 / 35 points: New, Known, Trusted, Reliable, Old hand. A2 reads `TLXAW.standing()`
  (`{ all, level, name, emp: { employer: points } }`); a Tips tab is NOT in A1.
- **Decisions.** The build has no way to sell, drop or stow the rifle, so "carried the whole way" fails the run when `TLXGUN.gun()` is no longer there (sold,
  dropped or removed by a later system); the rule is checked every frame. One armed job at a time. The shift starts when you reach the post; you must reach it
  within 4 game hours of accepting. Guard figures and the tail are never shot (A1 has no shooting). The tail follows your own breadcrumb trail (so it can never
  take a line through water or a house), spawns 140 m back along it and settles 40-80 m behind; patience (30 s) runs only while it sits on your tail.
  A named person in a card or a news post is a real household member (`TLXN.people`, by trade); the armed forces and the lensmann's desk have none, so they
  read "the duty desk". Posts: the spot is found in the world by `findSpot` (dry, level, 11 m clear of obstacles, 30 m of any door, 40 m of other sites), seeded by
  the post id, so the same post stands in the same place in every game. The post is warm (brazier / hut heater through `api.warmx`), or a guard would freeze.
- **Tested only with forced odds.** The tail's one-in-four chance is forced in the scenario (`TLXAW.force({ tail: true })`); every guard event is started by hand
  (`TLXAW.evStart`) rather than waiting for the schedule; events run in a time-lapse (`TUNE.evK = 3`) except the gait strip; the tail's patience is shortened to 12 s.
  The tail giving up by line of sight is tested as the LOS function only (open ground sees, a rise blocks), not as a drive.

### A2a notes (built 25 Nov 2026)
- Supervisor's look at the A2a stills (25 Nov), fixes for A2b: the dog is a cream blob with a tube body (remake or remove); the two tub carriers walk inside each other (carry one tub between them, or keep them apart); the purple leak reads as a magenta box outline on the windows rather than light spilling out.
- `tlx-raids.js`, state `x.sys.raids` (sites with `found`/`tipped`/`raided`, tip threads, read fill). API `window.TLXRD` (S, build, spawn, crew, fig, readTick, giveTip, signs, losPts, testEnter, ...). Kinds table `KINDS` (A3 adds entries); the barn is `KINDS.grow`.
- Seeding: 2-3 sites per game week from world + week; each >= 250 m from any door, >= 400 m from the other sites, dry, level (ground height, not snow height, so the weather never moves a site), no collider within 22 m, off roads, trails and plowed yards. Week 0: three sites (Sandfjorddalen cabin, Risfjord cabin, Gartefjellet wind farm). A site stales with its week unless the player is within sight.
- Distances: meshes built within 1500 m (past the fog), disposed past 1800 m; crew simulated within 760 m, freed past 860 m (no flicker margin). Far sites cost nothing.
- Crew: 3-5 figures, roles look/carA/carB/shov/phone/rider/dog; routines look (smoking, tracks the player), carry (tubs van to barn, both hands), phone (paces; goes in when you appear), refuel (can into the generator), drum fire (rubbish at night), shovel, rider (sled idles at the gate, leaves when you near, comes back), dog (chained, lifts its head, barks). Reactions by distance and line of sight: 90 m notice, 60 m wary, 35 m warn-off (look-out walks out, hand raised, shouted toast), 20 m barred (everyone in, bar across the door); reset after 7 s beyond 140 m. The door is locked in A2a (test hook `TLXRD.testEnter`).
- Spotting: read fills only with a clear sight line within 220 m (x(scope zoom x 0.45) through the rifle scope), more by night with the purple leak showing, closer, and with more routines in view; 0.04/s base; the HUD line shows from 0.34; full = found: Map mark, Jobs row, toast, Vakt note. No licence or standing needed.
- Tips: first tip at 12 armed standing points and 5 finished armed jobs, then every 8 points, at most one a day (`TUNE.tipMin/tipJobs/tipEvery`); named real contact fitting the employer's trade or "the duty desk"; 8+ templates; Tips tab in the Vakt app; found + tipped merge into one mark.
- A1 fixes done: walk-in figure crouch (`poseWalker` took `o.hard` off the wading branch and `crouch` as a parameter); posts carry their employer's things and vans sit in the snow; contact trade by post; the notification banner sits at the bottom of the Vakt app.
- Performance (default pixel ratio 1.5, noisy machine, `a2a_perf.mjs`): render CPU +2.5 ms with a full crew (5 men, rider, dog) in view at 25-60 m, GPU time unchanged within noise, draw calls +700. Over the 1.5 ms aim; the figure kit is ~55 meshes of distinct materials a man so it cannot be merged. Far figures drop shadows and small parts past 45 m. Cheaper crews or an impostor figure is a later pass.
- Frank: the purple room reads pink in daylight-lit stills (walls take the lamp colour too strongly); the look-out still is framed from behind the player; bin bags are a bit large; the map glyphs are small at full-map zoom.

## Decisions (defaults are built; Lemon can change any)
- Only raid crews can be shot (default above).
- Money only: the product is left or burned, never carried or sold. Default: left.
- The player is never jailed: fines and money back, as the Politi already work.
- Bodies stay until you leave the area.

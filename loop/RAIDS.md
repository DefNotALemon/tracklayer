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
| A1 | Armed work: armed courier and guard shifts for the state and for companies, armed standing | building |
| A2 | Tip-offs and the first raid: the grow barn, an armed crew, the cash, the Politi clock | not started |
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

## Decisions (defaults are built; Lemon can change any)
- Only raid crews can be shot (default above).
- Money only: the product is left or burned, never carried or sold. Default: left.
- The player is never jailed: fines and money back, as the Politi already work.
- Bodies stay until you leave the area.

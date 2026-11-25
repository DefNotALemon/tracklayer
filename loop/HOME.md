# Home on the Nordkinn (goal G7): a life, not only a job

Lemon, 24 Nov 2026, from a list of fresh ideas: "implement it fully ... expand on all this and get it going,
can't wait for it to turn into a better stardew valley". This file is the plan. Built in worktree
`~/Documents/GitHub/tracklayer-home` (branch `home`, lands with `git push origin home:main`), one slice at a
time, one builder per slice, from a chat session (not a cron lane). Log each slice in `loop/PROGRESS.md`.

## Status

| # | Part | State |
|---|---|---|
| H0 | The news bus (`tlx-news.js`) | built with H1a (bus, families in real houses; only the trails post so far) |
| H1 | Ski trail network (`tlx-trails.js`) | done (H1a, H1b, H1c, plus the H2a posture fixes) |
| H2 | Gram: feed, reels, local chat (`tlx-gram.js`) | H2a and H2b built (feed, Reels, Local chat); H2c own posts next |
| H3 | Radio Nordkinn with call-ins (`tlx-radio.js`) | design below, after H2 |
| H4 | Whales, seals and seabirds (`tlx-sealife.js`) | design below, after H3 |
| H5 | The outdoors life (avalanches, sea ice, snow shelters, ghosts, dog team, camera) | outline |
| H6 | Your own land (buy, build, raise animals) | outline |
| H7 | Herding and the wind farm | outline |
| H8 | Romance and family | outline |

## What it is

The expansion (G4) made the Nordkinn a place to run businesses. G7 makes it a place where people live and you are
one of them. Three threads:

1. **The villagers do things you can see.** They ski the trails you set, post about it, ring the radio about it,
   and talk in the local chat. What you did yesterday is what they talk about today.
2. **The outdoors is a hobby as well as a job.** Photos, peaks, races, storms, whales, dogs: things done because
   they are good, shared on Gram.
3. **You put down roots.** Land you own, buildings you raise, animals you keep, and later someone to share it with.

Must not change (same as EXPANSION.md): snow is the main mechanic, handling is realism-first, nothing existing is
removed, a player who ignores all of it finds the game as good as today. All the G4 build rules apply: each system
is a `tlx-<system>.js` behind `tlx.js`, state under `x`, reach the game through the `initExpansion()` api, options
through `TLX.option`, controls through `btn(action)` on keyboard, pad and touch, realistic animation, an asserting
scenario per slice, smoke + `x1_save.mjs` before landing.

## H0. The news bus (`tlx-news.js`, id `news`)

One ring of things that happened, which every other G7 system reads. Built first, with H1a, because H2 and H3 are
nothing without it.

- `TLXN.post({ kind, who, place, x, z, text, data })` stamps `t = GS.hour` and an id, keeps the newest 240, saved.
- `TLXN.since(t)`, `TLXN.near(x, z, r, sinceT)`, `TLXN.on(fn)` (a listener called on each post).
- `who` is a person from `TLXN.people`, and people come in **families that live in real houses** (Lemon, 24 Nov:
  "plenty of different lively towns around the world, with plenty of different families joined in houses"). The
  roll is built per place from its actual lit houses (`KIT.doors` and each village's own houses): every house is a
  household (`TLXN.homes`: door position, village, surname, members), and a household is a family of one to six:
  a couple, children with ages, a grandparent, a lodger, someone living alone. Each person has a first name, age,
  role in the family, handle for Gram, two or three interests out of ski / sled / fish / birds / photos / dogs /
  racing / gossip, and a voice line style; relatives share a surname and talk about each other ("my brother set
  that trail"). Every town and village has its own roll and its own character (a fishing village, a herders'
  village, the town with the school and the hotel): different surnames, trades and interests, so each feels like
  a different place. Seeded, so a house holds the same family in every game; saved only where it changes. Reuse
  the names the game already has where a person exists (the plow's households, staff, landlords, car owners, the
  NPC riders) so one person is one person everywhere and lives at one door. `"you"` is the player.
  `TLXN.homeOf(person)`, `TLXN.family(person)`, `TLXN.peopleIn(village)`.
- The same rule holds for every land added later (the county, Greenland, the Front): a new place brings its own
  towns, houses and families through the same roll, never a nameless crowd.
- `place` is the nearest named thing (village, trail, road, lake, peak): `TLXN.placeOf(x, z)`.
- Kinds start with: `ski`, `groom`, `trail`, `road`, `storm`, `wildlife`, `job`, `rescue`, `crash`, `race`.
  A kind nobody reads yet costs nothing. Existing systems get a one-line post where it is cheap and safe (a road
  shut or opened, a storm starting and ending, a rescue done, a groom contract finished). Do not rewrite them.

## H1. The ski trail network (`tlx-trails.js`, id `trails`)

Today grooming is a contract: drag a straight line from the quay to a cabin, get paid, done. Nobody uses it.
H1 makes the groomed trail a thing that lives: named ski trails (løyper) that villagers ski while the track is
good, and the løypelag pays you by how much they are used. The old grooming contracts stay as they are.

### The trails
- Six to eight named trails, fixed per map (seeded, built once at boot from the terrain, never through the sea, a
  lake that is not frozen, a house, a cliff or along a road; crossing a road is fine and is marked). A mix:
  - **Lysløypa**: a 2.5 km lit loop on the edge of Kjøllefjord from the sled country / groomer shed. The one that
    is skied on a weekday evening.
  - a short family loop at Mehamn, and one at Lebesby or Ifjord,
  - two or three **turløyper** of 5 to 9 km from a village to a lookout or a herder cabin and back,
  - one long **fjelløype** over the fell joining two villages.
- Each trail is a polyline of points 25 m apart with a grade limit (a skier's: under 14% sustained, the route goes
  round rather than over). Plot them from above before trusting the router (the roads work found its artefacts
  only that way).
- Furniture, built once: a trailhead board at each start (the trail's name, length, a little map, a condition
  slate that reads the real state), marker poles every 50 m with the trail's colour, lamp posts every 40 m on
  Lysløypa (lit from dusk to 22:00 when the trail is yours and its lamps are on), a gapahuk (lean-to with a bench
  and a fire ring) at the far end or the best view of each turløype. All solid, all on the snow whatever its depth.
- Map app: each trail as a line in its colour (through the chart's paint hook, a line is fine there), a pin at each
  trailhead. A legend row.

### The track
- A trail is cut in 50 m segments. Each has `set` 0..1: how good the prepared track is. It is written by the real
  thing: the groomer drag (or the wing tiller, which also makes it a skating lane, `wide`) pulled along it with the
  pan down. Hook `groomStamp` once (an `api.groomx` list of listeners called with x, z, heading, width) rather than
  reading the snow back.
- It wears by what really happens there: new snow falling on it (a few cm softens it, 10 cm buries it), wind drift
  on the open fell, a thaw and refreeze (icy: `set` holds but `ice` rises and skiers like it less), sleds ridden
  along it (a sled chews a ski track: each pass at speed takes a little, a truck far more), and skiers themselves
  very slowly. A night's hard frost after grooming sets it harder (it lasts longer): groom in the evening.
- Derive a plain word for the board, the app and people's talk: freshly set / good / worn / snowed under / icy /
  not prepared.

### Taking a trail on
- A new tablet app, **Løyper** (the løypelag's trail app; the old Trail Crew app keeps contracts and gets a card
  pointing at it). A page per trail: the condition of each segment as a strip, who is on it now, visits today and
  this week, what it paid, TAKE ON / HAND BACK, lamps on/off for Lysløypa (the power is your bill: a small hourly
  cost while lit).
- A trail nobody keeps is not prepared and nobody skis it. A trail you have taken on is yours to keep good. The
  løypelag pays every Monday by use: a rate per skier-kilometre, more on a weekend, a bonus for a week with no day
  under "good", nothing for a day it lay snowed under. One Jobs row per trail that needs work ("Lysløypa: snowed
  under, 1.2 km to set"), the compass to its nearest bad segment.
- Needs what grooming needs today (the groomer on the hitch, the Trail crew rank). Economy: a well-kept Lysløypa
  should pay about what one good grooming contract pays per week for about an hour's work a week, the long trails
  more for more; all of them together are a real income but less than plowing all three roads.
- Statements for the last three weeks in the app, the same shape as the Plow app's.

### The skiers
- Everyone who skis is a person from the news bus's roll with `ski` among their interests, living in a village on
  the trail. Each has a habit (mornings / after work / weekends, a favourite trail, a pace, classic or skate) and a
  limit (the cold they go out in, the wind, the dark unless the trail is lit, how poor a track they put up with).
- Out of sight they are bookkeeping: each game hour the system decides who went out, where, and how far, from the
  trail's state, the weather, the hour and the day; that is the visits the løypelag pays for.
- In sight (within about 500 m) they are there: figures from `api.newWalker` posed with the game's own skier gait
  (diagonal stride on a classic track, skating on a `wide` one; uphill herringbone above a grade; a tuck on a
  descent), in their own colours, a headlamp in the dark, a pack on a turløype. They start from the trailhead (skis
  on beside the board), ski out, rest on the gapahuk's bench with a fire lit, and ski back. A pool sized by the
  graphics preset (8 on desktop, 4 on a phone). The realistic-animation rule applies: judge from side-on and
  front-on strips, feet never slide, no figure moved by its root.
- They leave real ski tracks in the snow behind them (a pressed pair of grooves, landed behind the skier).
- They share the trail with you: a skier hears a sled coming, steps off to the side and waits, lifts a pole as you
  pass slowly; passed fast and close they are startled (a stagger, a shout) and it is a complaint to the løypelag.
  Three complaints in a week and the trail's bonus is gone; option `skicomplaints`. A skier is solid and is never
  run over: the sled stops against them as against a walker, and it counts as the worst complaint.
- On foot or stopped beside one, the use control hails them (the plow driver's hail): they say how the track is in
  their own words, and now and then where they saw something (a herd, a bogged rider, the aurora).
- A skier who goes down hard on an icy descent, or is caught out by weather, is a rescue call for the existing
  SAR job, now and then, on a trail you keep; option `skirescue`.
- Snow-free seasons: the trails are closed and say so (walkers on them are a later slice).
- Every outing posts to the news bus (`ski`: who, which trail, how far, the track's word, a line in their voice);
  your grooming pass posts `groom`; a trail going bad posts `trail`. H2 and H3 are built from these.

### Slices
- [x] **H1a** The trails, the track and the app, plus H0. `tlx-news.js` (the bus and the roll of people, with
      posts from the trails only), `tlx-trails.js`: the routes, furniture, the `groomx` hook, `set` / wear /
      refreeze, the Løyper app (pages, TAKE ON / HAND BACK, strip), Map lines and pins, Jobs rows, save. No skiers
      yet: use is bookkeeping (the hourly roll of who went out), so Monday pay and statements already work.
      `h1_trails.mjs` asserts: every trail is on land, off houses, within the grade limit, loops close; grooming a
      segment with the drag sets it and without the drag does not; 12 cm of new snow buries it; a sled pass wears
      it; a kept good trail has more visits than a worn one and none when not prepared; Monday pays; a reload keeps
      state; an old save loads; the app's text under keyboard, pad and touch.
- [x] **H1b** The skiers seen: figures, gaits, the trailhead start, tracks in the snow, the pool, headlamps, the
      share-the-trail behaviour and complaints, the hail. `h1_skiers.mjs` with gait strips.
- [x] **H1c** (done, script v271) Lysløypa's lamps and bill, the gapahuk rest with a fire, the ski rescue call, the wing tiller's
      skating lane, weekend crowds, a Sunday "skidag" once a month (a crowd, a waffle table at the trailhead, a
      bonus if the trail is freshly set that morning).

## H2. Gram (`tlx-gram.js`, id `gram`)

A tablet app in the style of a photo and reels app, for the Nordkinn only. Three tabs.

- **Feed.** Posts from villagers and from the game itself: a picture, who, where, when, a caption in their voice,
  likes and a few comments from other villagers. A post is made from a news-bus event or from an ambient idea, and
  its picture is a real render of the real place: an off-screen camera set where that person would have stood
  (a peak at sunrise, the fjord in a blow, the trail they just skied, a reindeer a metre away), with the hour and
  weather of the moment, rendered small to a texture and kept for the session. Saved as the recipe (where, which
  way, hour, weather, subject), not the pixels, so an old post draws again after a reload. Renders are spread out
  (one at a time, never while the frame rate is low, a painted fallback on a weak phone).
- **Reels.** Short loops that play as you scroll: a recipe for a little scene (a camera path and actors) rendered
  live at low resolution while it is on screen. The first set, each a real thing in the world or one that will be:
  the view turning on a peak; riders racing on a lake and the crowd at the rope; a sled skipping open water and
  making the far bank (or not); two sleds in a whiteout with only tail lamps; a reindeer licking the lens from
  above a snow hole; a skier's tuck down Lysløypa at night; a whale's fluke off the skiff's bow; the plow truck
  throwing a white wall; the aurora over the lighthouse. Lemon's note: these are also a list of things the player
  should be able to do; each reel that shows something not yet playable is a line in "Inspired by Gram" below.
- **Local.** A chat for the place you are in (the nearest village; it changes as you travel), with the last days'
  events as people talked about them: the road shut, who set the trail, a moose in the school yard, the ferry late,
  a storm coming, your own crash on the quay. Familiar names, familiar places, the right hour. You can post a line
  from a short list of replies that fit the last message, and people answer.
- **You.** Post your own: a shutter control takes the shot you are looking at (until H5's camera, the view as it
  is), with a caption picked or written. Villagers like and comment by what is in it (the subject is known from
  what was in the frustum: a peak, an animal, a storm, a person, your sled). Followers grow with good posts; a few
  small real effects (a tourist asks for the spot, a seller knocks a little off for a face they know).
- A notification now and then, never a stream. Option `gramnotes`.

Slices: H2a feed + render recipes + local chat from the bus; H2b reels; H2c your own posts, likes, followers.

- [x] **H2a** (script v272) the feed with render recipes and real off-screen pictures, the ambient generator, bus posts from the game's systems, the Local chat. `h2_gram.mjs`.
- [x] **H2b** (script v273) the Reels tab: twelve reel types (summit pan, lake drag race, at the rope, water skip and its sinking twin, storm ride, reindeer at the snow hole, night ski, plow wall, aurora over the lighthouse, skiff at sea, kids sledging, powder turn), each a recipe planned into a scene script and drawn live at 270x480 through `gramShot`; `tlx-reels.js`, `tlx-reelscenes.js`; plus the H2a fixes (feed layout, composition rule, Local chat order and voice). `h2_reels.mjs`.
- [ ] **H2c** your own posts (the shutter, captions, likes, followers).

## H3. Radio Nordkinn (`tlx-radio.js`, id `radio`)

- A radio on the sled's dash tablet and in every cab: on/off and volume on a control bound on all three schemes.
  One local station. Music is a synthesised bed (WebAudio, no files), a jingle, the weather on the hour from the
  real forecast, road and convoy news from the roads, the ferry, and **call-ins**: villagers ringing in with what
  they saw, built from the news bus (the trail report from someone who skied it this morning, a herd on the road,
  a whale off Slettnes, thanks to whoever dug their car out, which may be you by name).
- Heard as captions in a small strip (who is speaking, the line) with the voice an option: off by default, the
  browser's speech voice when on. Reception fades behind the fell and in a storm (static, dropped words); the relay
  mast matters.
- Your own life comes back at you: a job done well, a trail kept good all week, a rescue, a complaint.
- Later: ring in yourself from the tablet with a report (road shut here, whale here) and it is on air and on the
  bus; requests.

## H4. Whales, seals and seabirds (`tlx-sealife.js`, id `sealife`)

- Humpbacks and minke (a blow seen from far off, a back, a fluke, a breach now and then), an orca pod working the
  herring in winter, porpoises on the bow wave, seals hauled out on skerries, an otter at a jetty.
- Birds: gulls behind a boat with fish aboard, a sea eagle on a post that lifts off as you come, eider rafts, a
  gannet colony's dives, a bird cliff loud in summer (puffins from April), ptarmigan on the fell.
- Seen from the skiff, the ferry, the shore and the lighthouses; they keep their distance from an engine and come
  closer to a boat lying still. Seasons and hours matter (orca in the dark months, puffins in summer).
- Realistic motion by the wildlife rules (no slid roots: a whale's back is an arc through the surface with the
  water moved, a bird's wingbeat by speed). Sightings post to the bus (`wildlife`), so they reach Gram, the radio
  and the chat. A whale-watch tour for skiff owners (the aurora tour's pattern) as its last slice.

## H5 to H8, in outline (designed when their turn comes)

- **H5 The outdoors life.** Lemon: "1, 3, 4, 6, 9 and 10 could go hand in hand". Avalanches (slopes that load in a
  storm, cornices, a beacon and probe, dig-out rescues); sea ice and ice roads in a hard cold snap (drill to read
  the thickness, sleds first, trucks later); snow shelters dug with the shovel; ghost time trials on any route you
  have ridden and a village race day; a dog team and a kennel; the camera with a real viewfinder, paid shots and
  prints on your walls. Each one feeds Gram.
- **H6 Your own land.** Lemon: "the game should have bought land that you can build on, develop on, raise animals
  on". Plots for sale in Real Estate (a fjord-side smallholding, a fell plot, a lake plot); a build mode that
  places real buildings a stage at a time with materials you haul (a cabin, a barn, a boathouse, a sauna, fences,
  a kennel, a drying rack); animals to keep (sheep, goats, hens, a few reindeer of your own, the dogs) that need
  feed, water, shelter and a path dug to the barn after a storm; hay made in summer because winter eats it.
- **H7 Herding and the wind farm.** Driving the herd between pastures for the herders with the sled; turbine
  de-icing and service in the weather nobody rides in.
- **H8 Romance and family.** Lemon: "maybe one day we could add a romance and raise a family". People from the
  roll you come to know through what you both do (the skier you hail, the keeper at your light, the voice on the
  radio), gifts that fit them, days out, moving in, a home that changes, children who grow with the seasons. Last,
  and only on top of a village that already feels alive.

## Inspired by Gram (things a reel shows that the player cannot do yet)

- Water skipping a sled across open water. Lake drag races with a crowd. Riding in a group with friends through a
  storm. A reindeer coming up to you in a snow hole. Peak-bagging with a summit view. Add a line when a reel adds one.
- Night skiing under the lamps with a headtorch. Standing at a rope to watch a race. A plow's wall of snow at the road edge. A sled carving a deep powder turn below a ridge. The lighthouse beam under the aurora. A skiff in swell (whales come with H4: `TLXRL.hooks.sea` is the hook). Kids' sledging banks in the villages.

## Decisions (defaults are built until Lemon says otherwise)

1. The old grooming contracts stay beside the trail network. Default: yes.
2. Gram's name. Default: "Gram".
3. Radio voice. Default: captions on, spoken voice off.
4. Sleds allowed on ski trails. Default: yes, but they wear the track and close fast passes are complaints.

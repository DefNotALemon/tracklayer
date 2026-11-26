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
| H2 | Gram (`tlx-gram.js`) | remade (Lemon, 25 Nov) and done at v284: Local = the whole land, Reels = the whole world, one moment director, ~40 photo kinds, 23 reel kinds, scroll test `gram_scroll.mjs`. Leftovers in `loop/OPEN.md`. |
| I1-I10 | Indoors and Senses update: walk-in places, a word with anybody, furnishing, radio stations with sound, haptics, camera, field guide, Paths, save slots, summer on foot | designed 25 Nov; I1 after the Gram remake |
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

## H2. Gram, remade (`tlx-gram.js`, id `gram`)

Lemon, 25 Nov, on the first build (feed + reels + local chat + own posts next): "no ok i wanna remake the gram. the
game should have it's own way to make the gram posts, you just have to come up with cool posts for it and test how
cool it is to scroll through both the local gram and the reels gram". The player's own posts (old H2c) are dropped
until he asks again.

**What was wrong with the first build** (scrolled after three ordinary game days, stills in
`~/.hermes/cache/scratch/gramscroll/s2/`): almost every picture was the same shot, a person seen from behind standing
in dusk snow, whatever the caption said (a "catch" post showed no fish); captions were a few templates with a voice
tag glued on each end ("Behold. ... As one does."); "not yet" wish posts broke the fiction; three days produced zero or
one reel; the polar night made every picture the same murky purple; three small cards across on a wide tablet is not
a feed anyone scrolls.

### Two grams, one scroll each
- **Local**: the whole land you are in (Lemon, 25 Nov: "make local cover the current place you're in, the whole map
  like all of greenland, or all of maine"). On the Nordkinn that is every village, trail, road, harbour and fell of the
  peninsula; in Greenland all of Greenland; in the county all of the county. It is keyed to `TLX.region()`, never to the
  nearest village. One post per screen in a phone-shaped column, snap-scrolled, newest first: photos, short clips and
  text posts mixed, each naming its village or place. The old Local chat lives here as text posts and as the comments
  under posts. Posts from near where you stand may sort a little earlier among posts of the same hour, nothing more.
- **Reels**: the whole world: clips from every land the game has (today only the Nordkinn exists, so the director
  takes a region id and Reels asks it for all regions; a land's reels show its name). One per screen, playing as you
  land on it, swipe for the next. A land you have not travelled to yet still shows up here: that is the advert for it.
- Tabs: Local, Reels. Nothing else. No "soon" cards, no "not yet" posts: everything shown is something that happens.

### The game's own way of making a post: moments
One director (`TLXGR.director`) makes every post and reel from a **moment**: a small scene the world could really be
showing right now, staged at a real place with real people from the households, shot the way that person would shoot
it. A moment kind is one table row: when it can happen (season, hour, light, weather, place type, who: interests, age,
family, trade), its cast and props, where it is set, one or more **shots** (camera, lens, who is facing it), whether
it moves (a clip) or is a still, and how its caption and comments are written. A photo is one good frame of the scene;
a reel is the same scene moving. So one library feeds both grams, and adding a kind of post is adding a row.
- **Witnessed first.** When the simulation is truly showing the thing (skiers out on a trail you keep, the plow truck
  on its round, the ferry at the quay, a herd near the road, an NPC rider on the fell, a fire lit at a gapahuk, the
  player's own crash, bog, groomed trail or rescue), the moment is pinned to those real things: same people, same
  place, same hour. Otherwise it is staged from what the bookkeeping says people did that hour.
- **Light.** The Nordkinn is dark for two months. Every shot carries its own light plan: the scene's lamps (headlamps,
  sled and truck lights, windows, street lamps, a fire, the aurora, the moon on snow) and a phone-style fill from the
  camera on faces and close subjects, with exposure lifted like a phone's night mode. A picture that comes out murky
  (measured: the subject's mean luminance, the frame's contrast) is re-lit or dropped, never posted.
- **A subject, always.** Faces to the camera for people shots (a selfie is an arm out and a face, not a back), the
  thing the caption names visible and big (the fish, the buried car, the fox). Composition is checked from projected
  bounds before a moment is accepted.
- **Variety is the director's job.** It keeps a memory of what the feed has shown: no kind twice within five posts, no
  place twice within four, no person twice in a day, a mix of people / action / animals / weather / work / cosy /
  funny in any ten, and it favours kinds the player has not seen yet.
- **Captions are written per kind**, each with at least eight lines that only make sense for that kind, filled from
  the moment (who, where, how much, what happened) and bent by the person's voice in word choice, not by a tag glued
  on. Comments come from the people who would care: who is in the picture, family, the neighbour who knows the spot,
  someone it annoys.
- **Rhythm.** About 30 to 40 Local posts a game day across the land you are in, 8 to 12 reels a day,
  more on a weekend and after a storm, fewer at 04:00. A new game starts with two days of posts already there.

### The posts (the catalogue: each is a moment kind; a * also makes a reel)
People: summit selfie with the view behind*; family selfie on skis at the trailhead; a child's grin with the sled
they just rode*; grandfather with the thermos at the gapahuk fire; two friends on sleds, visors up; a couple at the
lighthouse rail; first day on skis for a three-year-old*; the whole village in the road for the sun's return*.
Action: off a cornice, mid-air*; a deep powder turn from below*; the hill climb that made it, and the one that did
not (sled on its tail)*; the lake drag launch from the rope*; skipping open water, and sinking short*; a wheelie down
the harbour road*; the kids' sledging bank and the tumble at the bottom*; the tuck down Lysløypa under the lamps*;
a sprint finish on the skating lane*; a snowball fight*; riding in file through a whiteout on tail lamps*.
Animals: a reindeer's nose in the lens from a snow hole*; the herd crossing the road in the headlights, cars
waiting*; a moose looking in at the kitchen window; the fox that took a fish off the quay*; the sea eagle lifting
off its post*; "spot the ptarmigan" (white on white); an ermine on the woodpile; a hare's tracks to the door; gulls
behind the boat*.
Sea and work: the catch held up to the camera, face behind a cod; the deck in a swell*; stockfish racks under the
aurora; the ferry coming in lit through snow*; the plow's white wall*; the groomer's corduroy at first light (yours,
by name, when you set it); digging the car out, only the roof showing*; the convoy's tail lamps going over the fell*.
Weather and light: the door opened on a wall of snow; a car that is now a mound with an aerial; "this is the road"
(nothing but white and one pole); waves over the breakwater*; the aurora's corona straight up*; a moon halo over
the fell; the pink hour on the peaks; the first sun on a face.
Cosy: bonfire and sausages on sticks*; the waffle table at skidag; a snow lantern with a candle; the snowman family
(one per family member, same heights); the kicksled outside the shop; skis stood in the drift outside a lit cabin;
the woodpile, squared and proud; Christmas lights on the last house before the fell.
Funny: sled buried to the bars, "it's fine"; the snapped ski pole; whoever parked like that; the snow that slid off
the roof onto the path just shovelled*; a glove on a fence post, "whose?".
About you: your sled outside the shop; your plowed drive, "legend"; your crash, witnessed*; the trail you set.
Text posts (Local only, no picture, a coloured card): the trail report, the road, a lost glove, waffles Sunday,
"who has a rope", the ferry, the storm coming, thanks by name.

### Testing how cool it is (the scroll test, a tool kept in the repo)
`tools/playtest/scenarios/gram_scroll.mjs`: plays N ordinary days at a named date (polar night, sun's return, spring),
then scrolls Local (the whole land) and Reels as a player would and writes every screen as a still plus contact sheets,
and prints the numbers: kinds per 30 posts, the longest run of one kind / place / shot type, repeated captions, the
share of people shots with a face to camera, each picture's subject size and luminance, how different each picture
is from the one before, posts and reels per day. The gate asserts the floor (below); the builder and then the
supervising session LOOK at the sheets and write down what is boring, and that list is the next round's work. A slice
is not done until a 30-post scroll has nothing one would flick past twice.
Floor: in any 30 consecutive Local posts at least 12 kinds and 6 of the 7 families of kinds; no kind within 5, no place
within 4; no caption twice in 60; every people shot has a face to camera unless the kind says otherwise; subject at
least 25% of frame height; no picture under the luminance floor; adjacent pictures differ (thumbnail distance over a
threshold); Reels has at least 8 new a day and at least 10 kinds in 20.

### Slices
- [x] H2a, H2b (v272, v273): the first build (feed, 12 reel scenes, local chat). Its render path (`gramShot`), reel
      engine and cast pool, bus posts and tests are the base the remake is cut from.
- [x] **H2R-a** (v275, tlx-gram v3) The remake's core: the director and moment table (`tlx-gramkinds.js`, `tlx-gramk-a/b/c.js`),
      the light plan and the checks, the phone-column Local gram (`tlx-gramui.js`) with text posts and comments, 28 photo
      kinds across all seven families, the old Feed/Local chat/You tabs gone, two days of posts on a new game, Local keyed
      by `TLX.region()` (the whole land, one feed), recipes and reels carry a region id, and `gram_scroll.mjs` with its floor.
      Left for H2R-c: eight kinds are built but switched off (`TLXGK.offs`: kicksled, skisoutside, snowlantern, woodpile,
      digout, doorwall, gloveonpost, bonfire) because their prop or framing is not good enough yet; the "about you" kind
      (crashseen) exists but has weight 0 until the player's own posts are asked for again; text cards are still flat.
- [x] **H2R-b** (v277) Reels gram on the same moments: full-height player, every starred kind as a clip (at least 20), the
      rhythm, and the scroll test for reels.
- [x] **H2R-c** (v278-v284) Faces read as people; weather-and-light kinds (moon halo, aurora corona, stockfish racks, the sun's return, Christmas lights,
      ptarmigan, convoy tail lamps); the director guarantees the family mix; car mound, lake race, roof slide remade; reel cast built
      over idle frames; new-game backlog no longer test-renders; short-screen layout (640x360, phones); far-village houses keep their
      walls in pictures (`gramShot` shows far-culled meshes near the lens); house posts laid out from the front wall (`SP.door`).
      Left out on purpose: `doorwall` and `skipole` stay off (their staging never read clearly). Known weak, in `loop/OPEN.md`: the
      low-preset painted pictures are generic, the gapahuk-fire photo washes out in daylight, the kicksled post can show only a wall.

## The Indoors and Senses update (Lemon, 25 Nov): slices I1 to I10, built in this order after the Gram remake

His words: "add in 1 and 2 as a big update, where you can now go inside and talk to people ... a stardew valley
conversation real quick with somebody where you exchange a sentence while nothing around the world stops. also add in
6 to this loop, businesses and homes need plenty to furnish. keep 5 [cooking] in mind when you do all the assets ...
[clothing:] either spend a bunch of time on clothing adding in truly cool and fitting options to your wardrobe, or
don't spend any time on it. [music:] give me different radio stations with different styles, and no matter what
station you're on you should get safety updates ... i thought you would go ahead and add sound to them. [rumble:]
i play on a dualsense 5 so make sure the rumble and all works on an xbox controller too, but for now i want the full
dualsense controller haptics hooked up. [photo:] a camera app from now on that is like a pokemon snap mode where you
can take pictures from fpv right there, but without the pause. field guide as an app to keep track of wildlife,
their tracks, their locations, their nests. [goals page:] sounds awesome, paths app? [save slots:] do that, and
[summer hiking and swimming] should've been done already".

- [ ] **I1 Walk-in places, with people in them.** Every village gets real rooms you walk into through the existing
      interiors system (`api.intAdd`, the int* furniture kit): Kjøllefjord a café, the pub, the church, the school
      hall, the shop floor, the garage's waiting room; each smaller village at least a shop with a coffee corner and a
      meeting house, plus the homes of households (a knock, and you are let in when someone is home and regards you).
      People from the households are really there by the hour and day (the café at 10, church on Sunday, the pub on
      Friday, kids in the hall after school, home in the evening) and the room agrees with the outside (a lit window
      means someone is in). They sit, stand, drink, read, play cards, knit, look up when you come in. Realistic
      animation rule. Everything a room needs is built as **placeable furniture assets** in one shared catalogue
      (`tlx-furnish.js`), and every kitchen is built **cooking-ready** (a stove with hobs and an oven door that opens,
      a sink, counters, pots, pans, a kettle, plates, a fridge and a larder as separate named props with anchor
      points), so the later cooking update needs no new models.
- [ ] **I2 A word with anybody.** Walk up to any person, indoors or out, press the use control: one exchange, one
      line each way, in a small speech bubble over their head, two or three replies to pick from (or none: it closes
      itself in a few seconds). **Nothing stops**: no pause, no camera cut, no lock on movement; walk away and it
      ends. Who is busy says so in a word and carries on: someone serving at a counter or working a job (selling, a
      mechanic at work, a plow driver driving, a keeper at the lens) is a counter or a job, not a chat. What they say
      comes from what they know: the news bus, their family, the weather, the trail, what you did (your crash, the
      drive you plowed), their own day, and it does not repeat. Each person keeps a small regard for you that rises
      with a word a day, a favour, a familiar face (the seed of H8). Keyboard, pad and touch.
- [ ] **I3 Furnishing homes and businesses.** A furnish mode for every interior you own or rent (cabins, flats, the
      depot rooms, inns, the garage, a shop): pick from the catalogue, place, turn, snap to walls and floors, stack on
      tables and shelves, move, sell back. A big catalogue ("plenty to furnish"): at least 150 pieces across beds and
      sofas, tables and chairs, kitchens (the cooking-ready set), stoves and lamps, rugs, curtains, shelves and books,
      pictures (your own camera shots can be hung), plants, coat racks and boot trays, workshop benches and tool
      walls, shop counters and racks, café tables, bar stools, reception desks, guest-room beds. Bought from a
      furniture shop, the marketplace, and by catalogue order that arrives on the ferry as freight you carry home.
      Business rooms score on what is in them (an inn room with a bed, a lamp and a rug rents for more; a café with
      seats fills them with villagers).
- [x] **I4 The radio, with sound (replaces the old H3 below).** (`tlx-radio.js` v1, `i4_radio.mjs`. Built by the supervising session.
      Controls are in the Radio tablet app on all three schemes; there is no dash shortcut key yet. Rooms get the radio with I1.
      NOT yet heard by a person: the notes, levels and styles are asserted, whether it is pleasant is Lemon's ears' call.)
       A radio on the sled, in every cab and in rooms:
      on/off, station and volume on all three control schemes. **Several stations, each a different style**, all real
      sound made in the browser (WebAudio synthesis and sequencing, no files to load): Radio Nordkinn (local: talk,
      call-ins from villagers built from the news bus, trail and road reports, accordion and dance-band), a rock
      station for riding, a calm ambient night station for the polar night, a country and trucker station the plow
      drivers have on, a Sami station with joik-inspired music, a classical and news station. Each has its own jingle,
      presenter (captions always; spoken voice an option using the browser's speech), programme by hour, and hours of
      generated music in its style before a tune repeats. **Safety updates cut in on every station**: storm warnings,
      a road shut or a convoy leaving, avalanche and thin-ice warnings when those exist, a rescue call near you, with
      a two-tone alert and the music ducked. Reception fades behind the fell and in a storm; the relay mast matters.
- [x] **I5 Haptics.** (v285, `tlx-haptics.js`, `i5_haptics.mjs`; built by the supervising session. NOT yet felt on a real pad: the report
      bytes follow the published DualSense layout and are asserted, but only Lemon's hands can say the feel is right.)
       Full use of the pad. DualSense first (Lemon's pad), Xbox working too, anything else falls back
      to plain rumble. Through the Gamepad API (`vibrationActuator.playEffect`: dual-rumble on every pad,
      trigger-rumble where the browser offers it) and, for the DualSense's own features, WebHID after a one-time
      "connect controller" prompt in Settings (Chrome and Edge; a browser without it gets the Gamepad API rumble and
      the page says so): adaptive triggers (throttle resistance that rises with load and goes slack when the track
      spins in powder, a brake that firms up and pulses when the sled slides, a click at the rev limiter, the winch),
      the light bar (cold, fuel, a warning). Effects designed per surface and event, not one buzz: engine idle and
      revs, powder versus packed trail versus ice versus gravel, landings by height, bogging down, ice cracking under
      you, a collision by speed, the blade biting, a fish on the line, a heartbeat when freezing. Strength slider and
      off switch in Settings. A scenario records every effect call per event.
- [ ] **I6 Camera app (replaces the old H2c).** A camera on the tablet and a shortcut on every scheme: lifts the phone
      into first person right where you are, riding, walking or in a cab, and **the world keeps running** (Pokemon
      Snap style: animals move, weather blows). Zoom, a focus reticle that names what it is on, a shutter. Each shot is
      scored on subject, size, pose (an animal doing something beats one standing), light and rarity, kept in a roll,
      can be hung in a furnished room (I3) and files itself in the Field guide (I7).
- [ ] **I7 Field guide app.** Every animal, bird and fish of the land with a page that fills in as you meet it: your
      best photo, where and when you have seen it (pins on a map, by season and hour), its **tracks** (the real
      prints it leaves in the snow), its **nests, dens and haul-outs** once found, what it eats, how close it lets
      you. Tracks in the snow become readable in the world (fresh or old, which way) so the guide can be used to find
      the animal. A count per species group and per area.
- [x] **I8 Paths app.** (v288, `tlx-paths.js`, `i8_paths.mjs`: twelve paths and the today card; the village path counts people who know
      you once I2 lands, and the field guide and photos once I6/I7 land.)
       One screen for your whole life here: each path (courier, freight, trail crew, rescue, plowing,
      roads, staff, property, lighthouses, boats, fishing, hunting, trails, the village: people who know you, places
      furnished, field guide, photos) as a line with where you stand, the next step in plain words and what it opens,
      and a "today" card of three things worth doing now. Reads the real state of every system.
- [x] **I9 Save slots.** (v286, `SLOT` and `savesPanel` in tracklayer.js, `i9_slots.mjs`: five slots; NEW GAME moved into the Saves panel as
      START OVER on the slot in play and NEW GAME HERE on an empty one.)
       Three or more named saves with a card each (place, day, cash, time played, a thumbnail),
      new / load / copy / delete with a confirm, export to and import from a file; the old single save becomes slot 1.
- [ ] **I10 Summer on foot and in the water.** Marked hiking trails in the snow-free months (the ski trails and old
      routes as paths, cairns and signposts, summit books to sign, the gapahuks in use, villagers out walking), and
      swimming: a real stroke by the realistic-animation rule, cold that bites, the quay ladder, a beach at each
      village, a sauna-and-jump where there is a sauna. First an audit of milestone 9 (four seasons, v260) against
      Lemon's original brief for anything else summer is missing, written into `loop/OPEN.md`.

Not in this update, on purpose: **clothing** (Lemon: all of it or none of it; it gets its own full update when he
calls it) and **cooking** (his later update; I1 and I3 build the kitchens ready for it).

## H3. Radio Nordkinn (superseded by I4 above; kept for its notes) (`tlx-radio.js`, id `radio`)

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

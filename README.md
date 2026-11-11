# Tracklayer

A snowmobile courier-survival game that runs in the browser. No build step: `index.html` holds the page and styles, `tracklayer.js` holds the game code, `icefish.js` the ice fishing.

It is set on the Nordkinn peninsula in Finnmark, Norway's far north. You run freight off
the coastal ferry at Kjøllefjord quay and out across eight kilometres of bare plateau,
frozen lakes and birch valleys to the villages along the coast — Dyfjord, Mehamn, Gamvik,
Skjånes, Lebesby, Ifjord — the reindeer herders' cabins up on the fell, the wind farm on
Gartefjellet and the lighthouse at Slettnes. The fjords never freeze; ride off the quay
and a fishing boat pulls you out, minus the load. Each lake sits in a basin whose sides
rise in one even slope to the fell around it (no cliff rim round the outside).

## The idea

The snow is the main mechanic. It is a deformable height field at 25 cm resolution:
the skis and track press it down permanently, carving hard throws up berms, and hard
landings leave craters. Fresh powder drags on the sled and drinks fuel. Snow you have
already packed has almost nothing left to compress, so your own trails are fast and
cheap to ride — until falling snow fills them back in, slowly in calm weather and in
under a minute during a storm. Which routes you keep open is the strategy.
Pines catch the snow that falls on them, so each one stands in a tree well: the snow is about half
as deep against the trunk, easing back to full depth at the edge of the lowest branches. On foot that
is easier wading; on the sled it's a dip you feel. Birches are bare and barely catch any. Under each
pine's snow-laden tiers the green branch tips hang out ragged and drooping, not in a level lampshade hem,
and the snow on each tier sags down onto those tips in a ragged zigzag edge instead of a smooth band.

Loose snow is never still: in any wind the surface shows spindrift, pale filaments of powder that skim downwind in gusty bands (faster and denser as the wind picks up, absent on packed trails, ice and rock, and faded by distance like the ripples).

## Playing

The title menu sits over the live world: your sled parked at the quay in the low morning sun.
Continue (or Ride, first time), New game, Garage, Settings, How to play and Credits; the
arrow keys and Enter, the mouse, a tap or a gamepad all work.

**Your first ride (tutorial).** A brand-new game (first visit, or New game) starts you on foot on the quay with no
sled. A card under the top-left panel walks you through five steps, and the top compass points at each one:
walk across the road to Nordkinn Skuter & Service and open the garage; collect your first sled (the Frontier 340,
free, the highlighted row at the top of Sleds); walk out to it on the forecourt and climb on; ride to the package
the garage has claimed for you and stop there to load it; ride it to the drop-off and stop to hand it over. You get
normal delivery pay and the tutorial ends. The card names buttons for whatever you last touched: keyboard,
an Xbox, PlayStation or Nintendo pad, or touch. If you lose the package (the fjord, a blackout, a reload) it waits at
the pickup again. **Settings → Controls → Skip tutorial** (press twice) ends it and parks your sled beside you;
the god menu has **Restart tutorial**. Saves from before the tutorial skip it.

- **W / S** throttle, brake · **A / D** steer · **Shift** lean (on foot: jog) · **Space** hop · **Ctrl** wheelie (on skis: **W** kick, **S** plough)
- **Q** gets you off the sled and back on. Nothing slides you through the air: from wherever you stand within a few metres you walk to the nearer running board on your own feet, take the near grip, step a boot up onto the board, drive up over it, and throw the other leg back and over the seat as your hips turn to face forward; it lands on the far board and you drop into the seat. Getting off is the same body the other way: up off the seat, far leg back over, down to the snow, then the other boot. The body is simulated as it goes (a pelvis with weight on a muscle, a trunk that lags and catches up, loose arms, boots that stay exactly where they are planted), so it is a little different every time, on deep powder or a plowed yard, and the sled tips toward the loaded board and settles as you sit. Push a direction during the walk over to call it off.
- **S / Down** brakes; hold it once you've stopped and the sled **reverses** (about 9 mph tops). There are no gears: every sled is stepless.
- **Tab** dash tablet · **E** horn (or go fishing, open the tackle shop or the fish buyer when you're stopped by one) · **T** garage (across the road) · **F** call a rescue sled (only for a dunking in the fjord or an empty tank) · **R** reset a stuck sled · **Q** get off or on the sled · **Z** wipe frost off your visor · **U** put a bandage on a bleeding wound (see *Wounds*, below)
- **V** cycle camera (chase, close, first person, drone; the chase views pull in short of a wall instead of ending up inside the house behind you, and on foot slide over your right shoulder so your helmet doesn't block the view; riding close past a pine they slide out of its branches, and a tree right at the lens fades see-through) · **Esc** settings · **M** map · **B** weather (both on the tablet) · **J** next job on the compass · **H** hide help
- Gamepad: **RT / LT** throttle, brake · **left stick** steer · **RB** lean · **A** hop · **X** wheelie ·
  **B** garage, or back · **D-pad up** dash tablet · **Menu** settings · **View** reset · **D-pad left** wipe visor · **D-pad down** bandage · **L3** horn (or E's fish / shop / sell) · **R3** camera · **D-pad right** weather · **Y** god menu
- Phones and tablets get their own touch controls, a different set for riding and for walking:
  - **Left thumb:** a stick appears wherever your thumb lands in the lower left. On the sled it steers. On foot it
    walks: push up to walk, down to step back, sideways to turn on the spot, out to the rim to jog (the ring turns
    orange).
  - **Right thumb, riding:** a tall **GAS** pedal (analog: press it higher up for more throttle, it fills as you
    press), **BRAKE** beside it, and **HOP** (right above GAS, so you slide up into a jump), **LEAN**, **WHEELIE** and
    **HORN** round them.
  - **Right thumb, on foot:** one big button named for what you can do right there (**STRAP** a tree, **DIG** the sled
    out, **UNHOOK**, **HOOK ON**, **HELP UP**, **RIG ROPE**, **TIE BACK**...), **GET ON** at the sled, and **SIZE UP** /
    **DOUBLE** when there's a job to size up. **REEL** appears while the winch is hooked.
  - **Drag anywhere else** to look around; the view springs back when you let go.
  - **TABLET** and **MORE** sit by the map (MORE: map, camera, reset, wings, full screen, settings). **GARAGE**,
    **FISH** / **SHOP** / **SELL**, **WIPE VISOR** and **CALL HELP** turn up when they apply (GARAGE and the rest step
    aside while the tablet is open; on 320-wide phones the stick is a little smaller so HORN and WHEELIE stay clear of
    it, and GET OFF keeps its place above the stick). The prompts on screen name
    these buttons instead of keys.

**Graphics and phones.** The game knows when it's on a phone or tablet (including iPads, which report themselves as
Macs, and Firefox / Chrome / Edge on iPhone). Phones start on the low preset, desktops on high, and on **Graphics:
auto** (the default) it then watches its own frame rate and steps the detail down (render scale, how often the sun's
shadows are redrawn, shadow map size, how far trees are drawn) until the frame rate holds steady, and back up when
there's room. If dropping a step doesn't help (an iPhone in Low Power Mode is capped at 30 fps, for one) it puts the
detail back and holds instead of blurring the picture for nothing. **Settings > Graphics** can pin **high** or **low**
instead, and **Frame rate: shown** puts a small readout at the top (fps, and the step it's on out of seven). Trees past
the draw distance aren't drawn at all (that alone cut a frame from ~21 million triangles to ~2.6 million on phones),
and the sun's shadows follow you and the sled (they used to be drawn once at the title and never again).

**Full screen.** On Android, iPad and desktop browsers, **MORE > FULL SCREEN** (or Settings > Graphics) hides the
browser, and on a phone launching from the title goes full screen by itself. iPhone browsers can't hide their bars
(Safari, and Firefox / Chrome / Edge, which are Safari underneath), so on an iPhone add Tracklayer to your Home Screen
(in Firefox: menu **≡** > **Share** > **Add to Home Screen**) and open it from the icon: it runs edge to edge with no
browser bars. A card on the title screen says how until you tap **Got it**. In landscape the controls stay clear of
the notch.

The panel at the top left names where you are, on the sled or on foot: **Kjøllefjord** anywhere in town (the quay,
the garage, the shore road), a village, cabin, home or school by name when you're in its yard, and otherwise the
country itself (open backcountry, boreal forest, high country, a frozen lake, open water). On a phone that panel and
the minimap are left off; the vitals bars move to the top left and the speedometer to the top right instead, out of
the way of the touch stick and pedals. Upright, the compass has the top row to itself, the vitals and speedometer sit
under it, TABLET / MORE under the speedometer and the tutorial card and messages down the left; on its side, TABLET /
MORE sit beside the speedometer with the compass between them and the vitals. Messages are hidden while the MORE sheet is
open.

Work comes in on the **dash tablet**, an iPad-style screen on the bars that shows a live map while
you ride. **Tab** (pad **d-pad up**, touch **TABLET**) dips your head down to it: the world keeps
running and you can still steer, you just can't see much trail. In third person it opens as a big
overlay instead. Until your first delivery, with nothing aboard or claimed, it opens straight on the
Parcels board, so a new courier's first Tab shows the jobs. Apps: **Parcels** (pickups and drop-offs, each with its own little chart; left open, it
redraws the moment a drop-off pays, so the rack, your delivered count and what's aboard are always current),
**Map** (the survey chart with deliveries, pins, rescues and depots, plus the ferry and mail widget),
**Weather**, **Calendar**, **Trail Crew** (grooming lines, and volunteer recovery call-outs once
you've a winch), **Bytteboden** (the marketplace, below), **Logbook** (a field notebook: kilometres, flattened birches, airtime, fjord dunkings, deliveries and more) and the **App Store**. Arrows (or the d-pad) move, **Enter** (or
**A**) picks, **Esc / Backspace** (or **B**) backs out; taps and clicks work on the screen too.
**The HUD is minimal.** Bottom-left, four thin bars (bottom to top: red warmth, brown hunger, yellow fuel, blue thirst) that
fade to nearly invisible after a few seconds without a change and come back the moment one moves; a bar under a quarter
stays lit and pulses. Bottom-right, your speed as a plain number with an arc round its top-left that follows engine rpm
(red at the redline). Top-middle, a compass strip in the Elder Scrolls style: N, E, S, W and the points between slide
along it as you turn the camera, a small triangle under the middle marks where you're facing, and the tracked job is a
diamond on the strip. When the job is right under the triangle its name and distance fade in below it for about three
seconds, then fade out again. The compass below picks the job the way it always did; only how it's shown changed.

The compass at the top middle of the screen points at one job at a time. On
its own it picks: a rescue first, then a tour, the nearest drop-off aboard, grooming, a Bytteboden pickup, the
nearest claimed pickup, the quay. The **Jobs** app on the tablet lists everything you've accepted (aboard, claimed
pickups, tours, grooming, recovery and search-and-rescue call-outs, Bytteboden pickups, mail for the quay) with its
route chart, distance and pay; **Track** one and the compass follows it instead ("TRACKED 2/4" under the compass)
until it's done, then goes back to auto. A tracked claim stays tracked once it's loaded and points on to its drop-off.
**J** steps the compass through your jobs (after the last one, back to auto); tapping or clicking the compass opens Jobs.
A soft column of light stands over wherever you're carrying a load (empty-handed, over the quay), brightest
at its foot and fading out high in the sky; from far off it shrinks to a shorter, softer glow over the place
instead of a thin line up the whole sky.
Take a job where it's waiting and it goes straight on the sled; take it anywhere else and you
claim it, and it loads when you stop at its **P**. Your first six deliveries are round town, picked
up at the quay. After that the work comes to you: every drop-off posts parcels from wherever you
are, mostly short hops to places within a few kilometres plus a long haul or two across the map.
Pings on the dash (with a banner when the tablet's down) tell you when something comes up.
The garage (**T**) sells nine sleds, 1970 to 2029. Each newer one needs a number of deliveries and its
price; a locked sled's card says both (and how many you've made), plus how many shop parts it opens up.
The delivery that opens a sled says so in a toast: its price (and your cash if you're short), how much more power
it has than the sled you ride, how many parts it opens and any work only it can do.
Messages (toasts) stay up 4.2 s, up to four at once (three on touch screens); a burst never pushes one off before
3.4 s, so the "Delivered … +$" line stays readable when a milestone delivery fires five at once (later ones wait their
turn), and the same line twice in a row shows once.
Parts the shop won't fit yet are marked with the sled they need (**Woodsman+**, **Ranger+**, …).
The Sprint 580 SX is the trail racer: its tall gearing pulls a quarter harder once the snow underneath is packed
(groomed trails, your own tracks, plowed ground) or lake ice, which makes it the quickest sled there until the Apex.
In fresh powder it ploughs and the Summit floats past it. The garage card says so.
The Trekker 550 Tour isn't a faster Summit, it's the long-haul sled: its touring kit is built in (heated grips and
seat behind a tall shield, +2.5 warmth; a rack that carries a second parcel; a frugal tune that burns 10% less, so
its 30 L go about 40% further than the Summit's tank). Built-in kit stacks with the parts you fit, and the card says so.
The Aurora E has less shove than the Matriarch; its reason is freedom. It plugs in at every warm stop (any village,
cabin, relay or home, and the pumps) for $0.75 per litre of charge, under a third of the pump price, and regen makes
it 15% thriftier, so its 34 L battery goes furthest of any sled. Stop beside one and it charges; "Battery low" names
the nearest place to plug in.
The screen sits in the world's light: it goes through the same tone curve and fog as everything else, picks up a
cast from the sky (warm at sunset, blue in polar night, green under a strong aurora) and turns itself down in the
dark. It rides on a short stalk off the hood, on the rider's side of the steering column; the column rakes forward
into the hood, clear of it, so from the seat you see the column stand on the hood, not on the tablet.

## Apps and licences

The **App Store** sells three more apps: **Freight** ($120), **Rescue** ($90) and **Real Estate**
($50). Freight and Rescue each come with a sign-up for their licence school: the **Nordkinn Frakt
training yard** south-east of town, under Gartefjellet, and the **Nordkinn Redning base** out west
toward Lebesby. Sign up and the school is pinned on the Map and the arrow takes you there; stop in
the yard to start. On the course you ride the school's Matriarch 850T (your own sled waits in the
yard with anything on it) and stay on the course or the instructor fetches you back. Freight school
is four short missions: hook up a trailer and hold a side-hill, drag 300 kg up the big hill, a
timed priority run with a fragile load, and a flatbed expedition loop. Pass them all for your
**Freight licence**, which opens heavy, priority, expedition and fell freight in the Freight app (your
courier rank still decides which). Aurora tours are posted in Parcels.

**Real Estate** sells depot cabins: two of the herder cabins and two lakeside cabins, Fjellbu and
Viddastua. Tourists rent a depot on the nights you're not there, paid every Monday; a stove,
insulation and a sauna raise the rent. Each depot has a fuel cache: its pump fills you free, and
the bill (a weekly standing charge plus the litres you took) comes out every Monday. Your depots
show on the Map's Depots layer, and you can warm up in them.
You can walk into them, GTA-style: a warm ring of light stands on the snow in front of each depot's door (and the sauna
hut's once you've built it). Get off the sled and walk into the light; the screen dips and you're standing inside a room
built for that cabin: log walls, a plank floor, windows onto the snow, a stove or a stone hearth whose firelight
flickers, lamps, bunks, a table, and the gear that cabin would keep (reindeer hides and nets in the herder cabins, the ice
auger in Fjellbu, a long table for six in Viddastua, two tiers of benches round a stone stove in the sauna). The
soapstone stove and triple glazing show once you've bought them. The camera follows close over your shoulder and a wall
lifts out of the way when it has to back through it. Walk back into the lit ring at the door to go out. You can look
round a cabin before you buy it.

## Search and rescue

Rescue school is four missions round the Nordkinn Redning base: **search** for a lost hiker (fly the
expanding-square pattern on the Map, find the boot prints and the dropped glove, and the search
circle shrinks), **rescue** a rider stranded on a slope too steep to ride (Q off, walk up, **E** to
help them, and they ride pillion), **tow** a bogged sled (winch it out, **E** at their sled to rig a
tow rope, haul it home), and **save** a hypothermic casualty in the **rescue toboggan** (a new hitch,
issued with the licence). Every casualty has a survival clock: their warmth, draining with the same
night, storm and height that chill you. It drains slower on your pillion and much slower in the
toboggan, and your stove or thermos warms them. Stop at any warm place to hand them over.

Licensed, go **on duty** in the Rescue app. Nearby callouts ping the dash with 30 seconds to accept,
more often in storms and a little more in polar night. Accepted calls go on the Map's rescue layer
with their clock (a search shows the area, never the person). Saves pay and build **reputation**,
which brings better-paid calls further out; a lost casualty or a handed-over call costs reputation,
and so does letting pings go two or more in a row. Volunteer winch recoveries stay in Trail Crew.

Some callouts are **hospital runs** (the HOSPITAL chip): every cold casualty, most hurt riders and the
odd hiker who took a fall. A cabin stove only slows their clock; they're saved when you stop at
**Kjøllefjord helsesenter**, the health centre on the edge of town (the blue **H** on the maps). These
pay a bit more. It (and the town-limit sign) stands clear of the lane you face when a new save starts at the
depot, so your first ride out of town is open snow.

## Crashes and the health centre

Hit a trunk, a rock or a wall hard enough (about 30 mph into it), land a big drop too hard, or come
down badly crooked at speed, and you come off the sled. The rider flies with the speed the sled had:
real gravity, air drag, snow that soaks up the bounce, powder that grabs and hardpack that lets you
skid, and trees you can hit on the way. Every impact adds up. Get away with it and you get up where
you landed and walk back to the sled (Q to get on). Overdo it and you wake up in the health centre a
few hours later with a bill; the Red Cross brings the sled in and parks it out front, but any freight
is gone, the same as a blackout. Big enough sleds still mow birches down rather than crash into them.

Every sled comes with a **tether**: a short orange rope from the kill switch on the bars to your
belt. Come off with it tied on and you only go a couple of feet: the rope snaps tight, pulls the
kill cord so the engine dies, and you land right next to the sled (if it's still sliding, it drags
you along). Get up, press Q, and you're back on. The rope stays clipped on while you stand there
and comes undone if you walk off. Untie it in the garage (Parts, Tether) if you'd rather fly.

## Bytteboden: buying used

The tablet's marketplace. Private sellers in the villages, cabins and homes list used engines,
whole sleds, hitch receivers, trailers, groomers, ice-fishing rods, reels and augers, and
cross-country skis. Listings
come and go one at a time, each lasting a few days. Used gear is cheaper than new and a bit worn,
at 65–90% condition, and it looks it: faded paint, chips, a little rust, a dent. Condition costs a
little performance. Haggle in the listing's chat (some sellers are stubborn, some desperate), and
stop at the seller's to inspect it before you pay, because about one ad in six is worse than it
says.

The garage doesn't sell engines any more. Buy one on Bytteboden, haul it home on a trailer, and
the shop fits it for labour. Trailers and groomers hook straight on if your **hitch receiver**
takes them (the flatbed and wing tiller need the heavy-duty one). Sleds you ride home, and tackle
goes in your pack. The garage's **Workshop** tab restores condition for a fee, but the wear marks
stay. Fishing gear can't be restored.

### Santa's Sled (rare)

Once in a while a **Rare** listing turns up: **Santa's Sled**, red lacquer and gold leaf, one of a
kind and never a lemon (Bytteboden pings you when it's listed). Pay, bring a trailer or flatbed with
a free bay to the seller's, and haul it home to the garage. It has no engine, and it won't move
until its team is back: **nine runaway reindeer** in red harness and gold bells, loose round the
peninsula. They're tame: ride or walk right up to one and it's found, and it trots off to wait at
the garage. You hear their sleigh bells from a couple of hundred metres, louder as you close in, and
once the sleigh's yours the Jobs app (and compass) points at where the nearest one was last seen.
The ninth, **Rudolph**, only shows up once you've found the other eight: look for a red glow on the
highest ground. With all nine, pick it in the garage (Sleds): the team runs in harness in front of
you, Rudolph in the lead. It's the strongest pull on the peninsula, floats over powder, burns no
fuel and makes no engine noise, just bells. Get it going fast enough and the team leaves the snow.

### Cross-country skis

Three kinds turn up on Bytteboden: **Turski** touring skis (the all-rounder), **Fjellski** backcountry
skis (wide, steel edges, they float in powder) and **Skøyteski** skate skis (fastest on a packed
trail, they sink in fresh snow). Collect them and they ride strapped along the right of your sled's
tunnel, poles with them. **Q** off the sled and you're on them instead of wading: **W** kicks, **A / D**
steer, let go to glide, **S** ploughs. They're slow to get going (the first few kicks barely move
you) but they build to two or three times walking pace on packed snow, run downhill on their own
and glide a long way (the hill they feel is the snow under you, not the groove you just cut, so flat
ground skis flat). Your sled tracks are the fast lanes, and the skis leave grooves of their own.
Skiing through a forest stand, a trunk in the way turns you round it like walking does: a glancing one
just slides you along it with a little speed lost, and only running square into one at speed stops you.
Getting back on: **Q** within about 4 m clicks you out, the pair goes back on the rack, and you walk to the board and swing on.

On foot without skis you break trail: every step leaves a boot hole and your legs plough a
trench about half a metre wide behind you. It shows on the minimap. Wading fresh powder you make
about 1.5 m/s (30 m in under 20 s); walking back along your own trench is quicker again. The more you
use a trench, the harder it packs. Deep
wading winds you after about 25 s, and you get your breath back quickly once you stop. Hills count:
climbing shortens your stride (a 25% grade costs about a quarter of your pace and blows you faster), a
gentle descent lets you lope a little quicker, and on a really steep one you slow to pick your footing.
A tap of **A / D** nudges you round a few degrees to line up on a door; hold it and you pivot quicker, so
turning to face the way you came takes about a second.
The garage's $120 recovery kit (shovel, strap and **snowshoes**, any sled) puts the snowshoes on your feet
every time you Q off without skis: you float on fresh powder instead of wading (about 2.1 m/s, 30 m in ~14 s
against ~20), sink in half as far and tire less. Packed snow and plowed lanes are no quicker in them. Once
bought they stay in your pack even if you swap the kit for the satellite messenger. They are full-size
aluminium-framed shoes with red decking, so you can see them on your boots from the chase camera.
Off the snow (the quay's concrete, plowed yards and lanes, a hard-packed trail, ground the spring has melted
out, and the ferry's deck) you stop wading and walk like a person: about 1.4 m/s, easing into a brisk 1.8 m/s
after a few seconds of steady walking, with a real walking gait (heel down first, rolling over the foot onto
the toes, the knee folding as the leg swings through, hips and shoulders turning against each other, arms
swinging opposite the legs, planted boots that don't skate). How much loose snow is under your boots sets
the gait, so stepping off the quay into a drift blends from the walk into the high-knee wade over a stride
or two. Concrete and decking take no boot prints or trench and your steps knock instead of crunch. The quay
itself is bare concrete now, with the plowed snow banked along its sides.
Hold **Shift** (gamepad **RB**, the touch lean button) to jog: about 3 m/s on hard ground and plowed lanes
(a proper running stride with both feet off the ground between steps) and a fifth quicker wading powder, but it
spends your breath: about 15–20 s of jogging on hard pack (~60 m), 10 s or so in deep powder, then you're
out of breath and walk until you've got it back (walking refills it slowly, standing still quickly). It
helps little on a real climb or a steep descent.
Folk keep their yards plowed: around every house, the quay and the lane down to it, the garage
forecourt, the shops, cabins and the helsesenter door the snow is pushed back and packed hard (the
HUD says "Plowed yard"), so you walk to a door at a normal walking pace instead of wading, and snowfall never
buries a yard again. Off the sled, the snow badge by the speedo reads the snow under your own boots (PACKED
"Plowed yard" / "Packed trail", POWDER "Wading powder" / "Wading deep powder", ICE on a frozen lake, and
what your snowshoes or skis do for you), not wherever you left the sled. Every lived-in house also has a plowed apron running about 8 m out from its front
door, so you reach the hard pack well before you reach the step. In Kjøllefjord a plowed lane runs from
the depot yard to every house, the store, the church and the tackle shop, plowed round the houses, the
pier sheds, woodpiles and lamp posts rather than under them, so the walk from the quay to any door in town
is hard pack all the way and nothing stands in the lane. Walk into a wall at an angle and you
slide along it and round the corner instead of sticking (houses, the depot, the garage, the hospital, the
pier freight shed, the fish buyer and the drying racks); only walking straight at it stops you, and then
you stand there with your legs still rather than marching on the spot (and a jog into a wall costs no breath).
Walk into something round and on its own (a tree, a rock, a fuel cabin's can pallet), even dead square, and you
step round it on the side you were leaning to, in about a second, instead of hanging on its face or creeping
round it. Two trunks too close together to squeeze between work the same way: you step round the nearer one
and carry on, instead of wedging in the gap between them.
The waterline works the same way: walk (or ski) along the quay or a beach angled a little toward the sea and
you follow the shore instead of freezing on the edge, round the little steps and corners of a jagged
beach too; only heading straight out to sea stops you.
Once you've wandered off, the on-foot prompt tells you where the sled is from the way you're facing
("Sled 25 m ahead on your left", "Sled 140 m behind you"), on foot or on skis, until you're close enough for Q.
Past 30 m a slim pale-yellow light column also stands over the sled (fading in by 60 m), so you can spot it
at night, in a storm or over a rise; when a ridge stands between you, it rises from behind the crest, and far out it
grows taller and thicker so it still reads. It goes when you climb back on.

## Wildlife

Reindeer herds, moose, arctic foxes and mountain hares roam the open country away from the villages.
They graze and wander, and most of them bolt when a sled comes at them (or when you walk right up),
jinking out of your way, so you won't run them over. A moose is different: it stands its ground
longer, and it's solid. Ride into one and you're the one who ends up in the snow.
Lemmings scurry about in little bands and vanish under the snow (with a squeak) when you get close;
ermine, stoats in their winter white with a black tail tip, bound away.

**Grizzlies** are the dangerous ones. Get too close (about 20 m on foot, less on a moving sled, more
if she has a cub) and a bear stands its ground, huffing and swinging its head: back off. Keep coming,
or bump it with the sled, and it charges at about 30 mph and chases you for half a minute or until
you're well clear. If it catches you, a swipe knocks you off the sled or sends you sprawling; three
in quick succession and you black out (the Red Cross crew brings you round at the quay). Sometimes
it decides you're no threat once you're down and walks off. You can kill one with the sled, but you
have to be going fast: about 49 mph or more and it goes down for good. Any slower and you're thrown
off, and the bear is furious.

## The ferry and the mail

The coastal ferry calls at Kjøllefjord twice a day: **northbound** alongside 08:15, sails 09:30, and
**southbound** alongside 19:45, sails 21:00. You see her come up the fjord, hear her horn before she
casts off, and watch her go. Storms can hold her up a few hours or cancel a call; the forecast warns
you, and a delay or cancellation is posted on the dash six hours ahead.

Every home, cabin, village or the lighthouse you stop at for work hands you their post. It's a few
pieces at $15–30 each (more from further out), and it's only paid when you hand the sack in
at the quay before she sails. Miss a sailing and it rides the next one free. Miss a second and
there's a 10% fine. Miss a third and you pay the full value and the post office takes it back. The
countdown, the piece count and the value are on the minimap (the ring round the dial is the ferry
clock) and in the Map app's corner. It's the mail, not the jobs, that brings you back to town.

**Hunger and thirst** are two more stats (0-100, both start full). They drain slowly with game time (about 90 and 60
minutes from full to empty, so a delivery run never feels like a survival game) and refill at the quay and the garage the
way the fuel tank does. Empty is a mild penalty: you lose warmth a bit faster. They live in `tlx-survival.js`.

**Wounds** (`tlx-wounds.js`; Settings > Options > *Poachers on the fell*, on by default). Rarely, and only on the open
backcountry far (600 m+) from every village, cabin and the quay, with the tutorial and the licence schools done, a shot
cracks across the fell and you take a wound. There's no enemy to see or fight: it's a hazard, not a combat system. Up to
three wounds can be open at once and each bleeds your health (0-100) down; the red health bar pours up from the bottom of
the screen only while you're bleeding. **U** (D-pad down on a pad, the BANDAGE button on touch) puts a bandage on one
wound, but only in the first six seconds after the hit; a wound that old has soaked through, and keeps bleeding until the
quay, the garage or the hospital patches you up. You carry three bandages and the quay restocks them. If your health
hits zero it's the same defeat as any other: the Red Cross crew tows you back to the quay.

Fuel and warmth both run down. Villages, cabins and the quay refill them. Run out of warmth
and the Red Cross sled drags you home, minus the cargo and a fee. A freight card whose leg would
cost 70% or more of your warmth in the current light and weather, with the kit you're wearing, wears
a COLD RUN chip saying roughly how much, and names a village or cabin on the way to thaw out at. The estimate assumes the pace your sled really
holds across open powder (about 10.5 × power ÷ drag m/s, so a Woodsman ~13 m/s, never above 12 + 6 × power), slowed by what
the hitch drags past 300 kg (rig plus cargo): an ordinary trailer load doesn't change it, half a tonne rides at about 0.55 of that
and a tonne at about 0.25. Under a fifth of a tank you get
one "Fuel low" (or "Battery low") warning naming the nearest pump or plug; the quay and the garage
top you up free and stay quiet about it.
Money buys sleds, parts and rider kit at Nordkinn Skuter & Service. Progress saves in your browser.

## The calendar, the dark and the weather

A game day is 20 real minutes, and the calendar is real: a new game starts on 1 November and
the season runs to the end of May, then the summer fast-forwards and you come back on 1 November
to a fresh snowpack with everything you own (the Calendar app counts the years). Daylight follows Kjøllefjord's 70.9°N. In early November the sun
barely clears the horizon at noon. From about 20 November to 22 January it doesn't rise at
all: there's a blue twilight around noon and dark the rest of the time, and **every job pays
×1.5**. By March the days are twelve hours, and from mid-May the sun never sets. While the sun is up it lights the snow as if a little higher than it really stands, so even the low November noon throws long blue shadows off houses and sleds onto warm-lit snow instead of one flat grey. On a clear sunny day the air is dry and thin: the haze is half as thick as on an overcast day and a cool blue, so hills one or two kilometres off keep their sunlit and shaded sides (storms and night still close in; the low graphics preset keeps a little more haze). Where the hazed far land meets the sky the haze fades up into the sky over the lowest few degrees, so there is no hard pale line along the horizon. Untouched snow is wind-sculpted: soft drift swells and patches of ripples bending across the fell catch the low sun with clearly readable light-and-shade ripples right around your sled, so open country no longer reads as one flat sheet; under the real low winter sun every swell and ripple also throws its own long cold-blue lee shadow across the snow around you (strongest in November–January, a few streaks by March, none at night or in cloud); your own tracks and packed trails stay smooth. The finest ripples, their lee shadows and the snow's glints ease out gradually with distance as they get too small to see, so there's no line ten-odd metres in front of the sled where the snow suddenly turns into fine hatching. The same wind shaping carries on out to the hills, at a bigger scale: wind-scooped dunes with sharp, ragged crests shape the ground from about 40 m out to a few hundred metres (so the middle distance is no longer a flat white wash, and a hillside seen from a rise reads as wind-sculpted drifts rather than rows of blue oval hollows), long drift ridges and their cold-blue lee sides streak the far slopes in low sun, and under the low winter sun those dunes and swells cast their own lee shadows out to a kilometre or two, fading into the haze about 3 km out. Where the wind has scoured the snow thin on a far slope, grey rock shows through in ragged scree patches and snow tongues rather than a sawtooth of triangles. Under a clear sky the light filling the shade is properly sky-blue, so snow turned away from the sun reads cold blue against the warm sunlit faces; overcast and storm light stays grey. Snow you look across at a glancing angle mirrors a little of that clear sky too, so the open flats run from white at your feet to a cold blue toward the horizon and distance reads at a glance. The low sun itself lights the snow around you a touch warmer, and slopes facing it catch a peach glow, so warm sunlit snow and cold blue shade and distance read against each other. Frozen lakes are wind-scoured: long streaks of thin white snow lie over patches of bare blue-grey ice, drawn out along the wind, with a little sky sheen on the ice, so a lake reads as a snow-swept sheet of ice from the shore or from a ridge instead of a flat grey disc (the ice under you rides the same as before). The houses in town and in the villages are clad in vertical painted boards with white corner boards (grey on the white houses), sit on a dark stone plinth, have finished rooflines (a painted fascia board and boxed soffit along each eave and painted barge boards down the gable ends, in the same trim colour, with a thin dark steel drip edge along the top where they meet the snow load so the roof edge doesn't blur into one white slab, also on the depot, village shops, cabins and fell homes), and have framed, glazing-barred windows on every wall and a framed front door: by day the glass reads as real glass, mirroring the pale sky across its top above the dark room inside with a faint sheen that slides across the panes as you walk or ride past (look up at a pane and it fills with sky; at a glancing angle it turns to sky altogether), and from dusk, in storms and through the polar night the windows glow warm. The work buildings match: the garage is corrugated steel on a concrete plinth with white trim, a framed roll door and framed service windows, and the freight shed and the fish buyer's shed on the pier are board-clad with corner trim, a fascia under the snow-laden roof (all three with the same thin dark drip edge where the fascia meets the snow), framed doors and windows; their windows too are dark by day and lit after dusk. The helsesenter is clad in white sandwich panels on a concrete plinth, with grey-framed windows on both floors (dark by day, lit through the evening) and a mullioned glass entrance. The quay depot, the village shops, the herder and wind-farm cabins and the homes out on the fell match the town houses too: board cladding on a stone plinth, a framed door, and framed service windows that are dark by day and lit after dusk instead of glowing cream at noon. Signs take the same light as the walls they hang on: painted boards (the fish buyer, the fuel cabins' price boards, the for-sale signs; the school signs keep only a faint lamp on them) fall into shade and darkness like everything else, while the lit ones (the helsesenter's name board and its backlit H boxes, the fuel station price pylon, the Fisk & Friluft board, the helipad markings) light up from dusk instead of shining at full daylight brightness all night. The garage has its name up: a red-and-cream NORDKINN SKUTER & SERVICE board on a post in the forecourt (painted on both faces, softly lit after dusk) and a NORDKINN SKUTER & SERVICE name board over the roll door. The fuel stations keep their forecourts plowed, and after dark the canopy lights throw a warm sodium-orange pool across the forecourt and the pump island, a little brighter than a street lamp's; by day the canopy's light panel is a shaded frosted diffuser in the white soffit instead of glowing flat white at noon. The street lamps in the villages, at the schools, sites and cabins do the same: after dark each throws a warm pool of light on the snow, brightest at the foot of the post and fading out over eight metres or so like a real lamp hung four metres up, and by day their globes are plain frosted glass instead of glowing at noon. The church windows and the coastal ferry's windows and portholes are dark glass by day too and light up from dusk. Each fuel pump shows a grey-green LCD readout (the last sale, the litres and the station's price per litre) you can read by day, backlit after dusk. The pumps stand on a brushed-steel kick plate with a white stripe under the readout, and on each face the nozzle hangs in a steel holster with its black hose looping down into the pump; steel bollards with an amber band guard the ends of the pump island, and the canopy posts stand on concrete crash feet with amber-and-black hazard bands and a steel collar under the canopy. The remote fuel cabins keep their jerry cans on a real pine pallet (deck boards on blocks) on a shovelled patch of pack by the porch: proper 20 L cans with the stamped X on each face, the three-bar handle and a black spout cap, the back stack held by a yellow ratchet strap. Every lived-in house, in town, in the villages and out on the fell, has its wood stove going: a slow column of grey wood smoke rises from the chimney, swells and thins out as it climbs and leans off with the wind (a storm lays it flat), lit by the same sky as the snow so it goes blue-grey under the moon instead of glowing.

Auroras come more often and burn brighter in the polar night. A strong one lights the snow
green enough to ride by. While one is up, tourists queue at the quay for a ride to one of
three viewpoints (Finnkirka lookout, Stjernevarden, Ifjordfjellet ridge). They pay by how
strong the lights are when you get there.

Storms are weather fronts that sweep across the map, so the west coast gets hit before the
quay. The tablet's Weather app (or **B**, for barometer) opens on a radar: the peninsula's map with
the storms painted over it where they are right now (pale blue showers, violet storm, magenta severe)
and each front's leading line drawn with triangles pointing the way it's moving. It loops the next six
hours so you can watch a front cross the map toward you; **SHOW NOW** holds it on the live picture.
Below it is a 3-day forecast. Tomorrow's is usually right; days two and three carry a
confidence figure and are sometimes wrong. It also shows whether the ferry's calls look
on time, delayed or cancelled. A new game's first morning (1 November) stays clear until about
13:00, with fronts easing in over the next two hours, so your first jobs aren't run in a storm.

## The spring melt

From April the snow goes to slush in the afternoons (heavier, slower, sloppier) and sets to a
crust overnight. From about 9 April it starts melting out: south-facing slopes and the shore
first, the high fell last. Bare ground scrapes and throws sparks, and a sled crawls across it
and runs hot. From May the lakes open up from the shore in. Open water skips like the fjord,
and a band of dark, thin ice ahead of it cracks under a slow sled and gives way. As trails melt
out they close: the Map app shows each one as open, melting or closed, and work thins out and
only goes where the trail still holds (melting trails pay a little extra). At the end of May
there's a summer montage, then it all freezes over again for the next winter.

## The pickup

The garage has a **Trucks** tab, and the first thing on it is the **Fjellvogn**, a four-wheel-drive
pickup for $4,200. It is a bought-new machine like the sleds: pay, and it is parked on the plowed
forecourt with a full 70 L tank, clear of your sled. You can own up to three.

It is a truck, not a bigger sled. On plowed yards, village lanes and hard pack it grips, pulls
away properly and carries eight parcels in the bed. The cab is closed and heated, so you lose a
fraction of the warmth you lose on the sled. In fresh powder it has nothing to float on: each tyre
sinks, the belly drags, and the more you spin the wheels the deeper they dig. Hold the throttle and
it ends stuck to the axles. Then you get out and dig (there is no winch on it), or reset. Drive in
the ruts you have already pressed and it is easier, which also means you can usually back out the
way you came. It understeers on ice, hits trees and houses like a ton and a half of truck (a dented
panel, not a crash), and goes through thin lake ice quicker than the sled does. It is for roads once
there are roads. The open fell is still the sled's.

Walk up to a truck and the on-foot line says **get in the pickup** instead of **get on the sled**:
whichever vehicle is nearest is the one the get-on button takes. The walker goes round to the
driver's door, opens it, steps up, sits and pulls it shut. Getting out is the same in reverse.
Gas, brake, steering and the get-on / get-off button are the same on keyboard, pad and touch. Hold
the brake at a standstill to reverse. Each vehicle keeps its own fuel and its own parcels, and
stays where you left it, including across a save and a reload (reload while sitting in the pickup
and you are still in it).

The tablet works from the cab on every control scheme (Tab, d-pad up, the TABLET button; M for
the Map). The dash glass is on the sled, so in a truck the tablet comes up as the big screen you
hold, the same as on foot, and the HUD minimap stays up in first person. Parcels work the same:
claim them anywhere, load at the quay (the pickup's bed holds 8), and they deliver when you stop at
the drop-off. The Map pins every vehicle you aren't in (**S** the sled, **T** a truck), and on foot
the YOU arrow is you, not the vehicle you got out of. Carrying a sled on a trailer comes later.

**One hitch for everything.** Every rig (groomer drag, wing tiller, freight trailer, heavy flatbed,
rescue toboggan) has the same small coupler, so it hooks to the sled or to the pickup. Stand at the
rig's tongue on foot and use it (the on-foot use control: E, the left stick click on a pad, or the
UNHITCH / HITCH button on touch) to unhitch it: it stands on its jack where you left it. Back any
machine up until its ball is near the coupler, get out, and use it again to hitch it on. The
receiver is a weight rating: the sled's light receiver takes the trailer, the drag and the
toboggan, its heavy-duty one takes everything, and the pickup's takes 1,500 kg. Behind the pickup
a rig tracks, tips, grooms and carries big loads just as it does behind the sled (its bays become
the truck's), and the truck feels its weight and drag. You can't unhitch with a big load strapped
on or a casualty in the toboggan. A rig fitted at the garage goes on the sled.

**The sled trailer.** The Trucks tab also sells the **Fjordhenger sled trailer** ($950, 420 kg): a
single-axle trailer with a 3.9 m wooden deck and a full-width ramp gate at the back. It goes on a
truck's ball, not the sled's, and a ball holds one thing, so a truck pulls either a rig or the sled
trailer. Back a truck up to its coupler, get out and use it at the coupler (E, the left stick
click, or HITCH / UNHITCH on touch) to hitch or unhitch it; use it at the tail (LOWER RAMP /
RAISE RAMP) to swing the ramp gate down onto the snow or pin it up. Behind the truck it follows on
its single axle: it cuts the inside of corners, reversing pushes it round until the tongue binds at
about 70°, and the truck feels its weight and the drag of its tyres in the snow. The chase camera
backs off so you can see it.

**Loading the sled.** With the ramp down, line the sled up behind the trailer and ease it up: the
ramp and the deck carry it like any other ground, and the front stop rail holds its nose (come in
hot and you bang into the rail, which your fragile parcels feel). Coming at the side, or at the
tail with the ramp up, the trailer is a wall. Get off, stand beside the deck and use it (E, the left
stick click, or STRAP / UNSTRAP on touch) to ratchet four straps over the skis and the rear bumper.
Strapped, the sled won't drive (the throttle does nothing and it tells you so), it goes where the
trailer goes, and it stays strapped through a reload. Unstrap it and back it down the ramp to
unload. You can't raise the ramp while the sled is standing on it.

**Towing the sled.** Strapped down, the sled is weight on the truck: the pickup's receiver takes
1,500 kg, and the trailer (420 kg) plus the sled (280 kg, a little more with parcels in its rack)
is well inside that, but the truck pulls it slower off the line and its tyres drag in deep snow.
Raise the ramp before you drive off: towed with the ramp down, its lip drags through the snow and
you're told so. The Map shows the sled and its trailer where they are, and everything stays
hitched and strapped through a reload. Unhitch the sled's own drag or trailer before loading it:
a sled towing a rig can't be strapped on, and the garage won't fit a rig to a sled that's strapped
down (unstrap it first; a rig put on any other way takes the straps off and says so).

## The hitch and bigger work

The garage sells the tow-behind rigs, one on the hitch at a time. You need a **hitch receiver**
first ($150, or $380 for the heavy-duty one the flatbed and wing tiller want):

- **Groomer drag** — packs a two-metre lane flat and hard; groomed snow takes three
  times as long to fill back in. Takes grooming contracts.
- **Freight sled trailer** — one big load. Tips if you corner it hard.
- **Heavy flatbed** — two big loads, or one expedition load. Harder to roll.

Anything on the hitch adds weight and drag, burns more fuel, cuts the inside of corners,
creeps downhill on side-hills and snags on trees.

Courier rank comes from deliveries, and each rank puts bigger contracts on the board:

| Rank | Deliveries | Opens |
|---|---|---|
| Trail crew | 3 | Grooming contracts: groom the line to a village, paid by how much you cover |
| Freight hauler | 5 | Heavy freight: stoves, freezers, generators, propane, solar kits, battery banks |
| Priority courier | 12 | Emergency runs to villages in trouble: about double pay, a tight clock, a 25% bond |
| Expedition hauler | 20 | Slettnes lighthouse loads on the flatbed: batteries, turbine, standby generator |
| Fell hauler | 32 | Fell freight: 450–540 kg flatbed loads up to the wind farm and the high herder cabin (turbine gearbox, hut kits, reindeer feed, diesel). The best-paid work on the board (about $3,900–7,600), and the shippers only insure it behind an Apex 800 or bigger |
| Fell master | 46 | Tonne loads: 920–1,050 kg in one piece to the top of the fell (turbine blade set, snowcat cab, a whole built hut, a diesel genset), about $9,600–10,400, nearly twice a fell load; their cards wear a pink TONNE chip. Only the Matriarch 850T is rated to pull them (the Aurora E is lighter: its strength is range) |
| Clean-air courier | 60 | NILU's clean-air runs: samplers, an ozone monitor, a balloon hut or a battery bank on the trailer (110–220 kg, mostly fragile) from the quay to the far end of the peninsula (the lighthouse, Skjånes, Gamvik, Ifjord, Risfjord: 4–5 km out), about $8,700–11,700. One whiff of exhaust ruins the samples, so only a battery sled (the Aurora E) is let near the stations |

The groomer drag and the freight trailer fit the Woodsman 440 and newer and hook to a hitch
receiver, so the first two ranks can arrive before your sled can tow their work. The rank-up
message and the locked contract cards say exactly what's still missing (sled, rig, receiver,
with prices), and once it's all bought they just point you to the garage to hitch it on.
The fell, tonne and clean-air cards do the same for the sled they need: how many deliveries and how
much cash you're still short of it, or, if it's already yours, to swap onto it at the garage.

Big loads pay by condition. Hits, snags and rollovers wear it down, and below 30% the
village refuses it. The bond is paid up front and refunded on delivery. You lose it if the
load is refused, if a priority run is late, or if you black out.

## Ice fishing

Every frozen lake up on the plateau can be fished: sixteen of them, each with its own name, depth
chart and mix of the seven Finnmark species (char, trout, grayling, whitefish, burbot, perch, pike).
Stop the sled by the ice and press **E** (pad **L3**, touch **FISH**) to get off. Walk out with **A / D**
and **W / S**. Hold **Space** to drill, then sit at the hole. **↓** lets line out and **Space** jigs; set
the hook on the bite, and hold **↑** to reel while the tension's under red. **B** opens the tackle box at
the hole, **Q** stands you up, and **E** at the sled changes augers, rods, reels, line and bait or packs
you up. Pad: stick walks, **A** acts and jigs, **LT / RT** let out and reel, **X** tackle, **B** back,
**LB** pack up at the sled.

The day follows the real light. In polar night you fish by headlamp and the glow jig shines brightest.
Ice thickens through the winter and goes soft in the spring; under 12 cm the lake is off limits.
The catch keeps in the cooler on the sled (10 fish) for about two days, then loses value. Sell it at the
**fish buyer** on the quay pier, or take **FRESH FISH** orders from Parcels to homes and cabins for more.
Rods, reels, line, augers and bait come from **Nordkinn Fisk & Friluft**, the tackle shop by the quay
(stop there and press **E**). The Logbook keeps your catch, kilos and personal bests.
The fishing code is `icefish.js`.

## Running it

Open `index.html`, or play the hosted copy at
<https://defnotalemon.github.io/tracklayer/>. It also appears in the arcade at
<https://defnotalemon.github.io/>.

Built with three.js (r128, from a CDN). Everything else — terrain generation, snow
deformation, physics, weather, audio — is hand-rolled in `tracklayer.js`.
Ice fishing is `icefish.js`. `tlx.js` is the socket the Four Seasons & Enterprise
expansion plugs into: each of its systems gets a file of its own, and its state rides in
the same save.


## Winch and recovery
Low on the throttle in deep, unpacked snow and the track digs a bog. Get off (**Q**), wade to a tree or boulder, hook the winch (**E**) and reel (hold **Space**); the cable drags you to your anchor, not the other way round. The hand winch is short and slow, the electric winch reaches further, and the heavy-duty winch has a snatch block (**X**) to double the line. Stall it and the line sings; overload the anchor and it parts or the tree comes out. **F** only calls a rescue sled when you go through the ice or run dry.
On a pad the on-foot action (hook, unhook, dig, help a casualty up, rig a tow) is a click of the **left stick** and reeling is the bottom face button; on touch a button by the right thumb wears the verb (**DIG**, **HOOK**, **HELP UP**) whenever there is something to use. The hint line names the control for whatever you last touched.

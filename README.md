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
Your own sled gets snowed on: a coat on the hood and tail seat fills with snowfall (a light fall dusts it thin, a storm builds a thick, lumpy drift of mounds), melts in warm air and off the hot engine (the hood first), and sheds with speed and bumps, throwing a few run-off flakes. Not saved.

## Playing

The title menu sits over the live world: your sled parked at the quay in the low morning sun.
Continue (or Ride, first time), New game, Garage, Settings, How to play and Credits; the
arrow keys and Enter, the mouse, a tap or a gamepad all work.

**Your first ride (tutorial).** A brand-new game (first visit, or New game) starts you on foot on the quay with no
sled. A card at the top left walks you through five steps, and the top compass points at each one:
walk across the road to Nordkinn Skuter & Service and open the garage; collect your first sled (the Frontier 340,
free, the highlighted row at the top of Sleds); walk out to it on the forecourt and climb on; ride to the package
the garage has claimed for you and stop there to load it; ride it to the drop-off and stop to hand it over. You get
normal delivery pay and the tutorial ends. The card names buttons for whatever you last touched: keyboard,
an Xbox, PlayStation or Nintendo pad, or touch. If you lose the package (the fjord, a blackout, a reload) it waits at
the pickup again. **Settings → Controls → Skip tutorial** (press twice) ends it and parks your sled beside you;
the god menu has **Restart tutorial**. Saves from before the tutorial skip it.

**Rejoining.** When you come back to a game you've already started, about one launch in three drops you in mid-ride:
you're already on the sled, rolling along the road out of the depot, with one quick local parcel loaded and on the
compass. Deliver it for the normal pay, or just let it go: it has no deadline and costs nothing to ignore. The rest
of the time you start at the depot as usual. New games never do this.

- **W / S** throttle, brake · **A / D** steer · **Shift** lean (on foot: jog) · **Space** hop · **Ctrl** wheelie (on skis: **W** kick, **S** plough)
- **Q** gets you off the sled and back on. Nothing slides you through the air: from wherever you stand within a few metres you walk to the nearer running board on your own feet, take the near grip, step a boot up onto the board, drive up over it, and throw the other leg back and over the seat as your hips turn to face forward; it lands on the far board and you drop into the seat. Getting off is the same body the other way: up off the seat, far leg back over, down to the snow, then the other boot. The body is simulated as it goes (a pelvis with weight on a muscle, a trunk that lags and catches up, loose arms, boots that stay exactly where they are planted), so it is a little different every time, on deep powder or a plowed yard, and the sled tips toward the loaded board and settles as you sit. Push a direction during the walk over to call it off.
- **S / Down** brakes; hold it once you've stopped and the sled **reverses** (about 9 mph tops). There are no gears: every sled is stepless.
- **Tab** dash tablet · **E** horn (or go fishing, open the tackle shop or the fish buyer when you're stopped by one) · **L** rifle up / slung (on foot, out on the fell) · **T** garage (across the road) · **P** call a rescue sled (only for a dunking in the fjord or an empty tank; it winches you out onto level ground well clear of the water, sled or pickup; under a cliff they carry you round to the nearest level bank) · **N** reset a stuck sled · **Q** get off or on the sled · **Z** wipe frost off your visor · **U** put a bandage on a bleeding wound (see *Wounds*, below)
- **V** cycle camera (chase, close, first person, drone; the chase views pull in short of a wall instead of ending up inside the house behind you, and on foot slide over your right shoulder so your helmet doesn't block the view; riding close past a pine they slide out of its branches, and a tree right at the lens fades see-through) · **Esc** settings · **M** map · **B** weather (both on the tablet) · **J** next job on the compass · **H** hide help
- In first person, looking down far enough that your own hood or dash tablet fills the centre of the view makes the rider stand up on the footrests (same pose as climbing a steep face) to see over it, and sit back down when you look up again. Dipping to the tablet doesn't trigger it, and it never lifts the nose or pulls the chase camera up (those stay slope-only).
- Gamepad: **RT / LT** throttle, brake · **left stick** steer · **RB** lean · **A** hop · **X** wheelie ·
  **B** garage, or back · **D-pad up** dash tablet · **Menu** settings · **View** reset · **D-pad left** wipe visor (with a rifle: a tap wipes, a hold opens the gun wheel) · **D-pad down** bandage (or calls the rescue sled while you're in the water or out of fuel; a fresh wound still gets the bandage first, press again to call) · **L3** horn (or E's fish / shop / sell) · **R3** camera · **A** on foot: rifle up / slung · **D-pad right** weather · **Y** god menu
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
auto** (the default) it then watches its own frame rate and steps the detail down within about a second (render scale in fine steps, how long the snow's
lee-shadow march is, how often the sun's shadows are redrawn, shadow map size, how far trees are drawn) until the frame rate holds steady, and back up when
there's room. It remembers the step that held for your screen size, so the next launch (title screen included) starts there. If dropping a step doesn't help (an iPhone in Low Power Mode is capped at 30 fps, for one) it puts the
detail back and holds instead of blurring the picture for nothing. **Settings > Graphics** can pin **high** or **low**
instead, and **Frame rate: shown** puts a small readout at the top (fps, the step it's on out of nine, and the render scale). Trees past
the draw distance aren't drawn at all (that alone cut a frame from ~21 million triangles to ~2.6 million on phones),
and the sun's shadows follow you and the sled (they used to be drawn once at the title and never again). Tree and boulder cells outside the view (and outside the shadow's reach) are skipped too, which took a town or title frame from ~10 million triangles to ~3 million, and a house's wall, roof and trim pieces are baked into a few meshes instead of ~15 each. HUD panels lose their backdrop blur on phones and on the lower steps, since a blur re-reads the 3D view behind it every frame.

**Full screen.** On Android, iPad and desktop browsers, **MORE > FULL SCREEN** (or Settings > Graphics) hides the
browser, and on a phone launching from the title goes full screen by itself. iPhone browsers can't hide their bars
(Safari, and Firefox / Chrome / Edge, which are Safari underneath), so on an iPhone add Tracklayer to your Home Screen
(in Firefox: menu **≡** > **Share** > **Add to Home Screen**) and open it from the icon: it runs edge to edge with no
browser bars. A card on the title screen says how until you tap **Got it**. In landscape the controls stay clear of
the notch.

There's no top-left place/weather panel any more — it's gone for good. The HUD minimap (bottom right) shows only
on foot and in a cab; riding the sled in third person shows no minimap at all (press **M** for the tablet's Map app
instead). On the minimap and the Map, sites are coloured dots with a white ring: blue for the quay/depot, amber for
the garage, green for homes, pale grey for villages and cabins. On a phone the minimap is left off; the vitals bars
move to the top left and the speedometer to the top right instead, out of
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
**Map** (the survey chart with deliveries, pins, rescues and depots, plus the ferry and mail widget; drag to pan
around it, scroll the wheel or use +/– to zoom smoothly from the whole peninsula down to 180 m, ◎ snaps back to
your position, and a tap that doesn't drag drops a yellow marker the compass follows until you clear it, track a
job, or a rescue comes in),
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

**It fits the window, whatever it is (v240).** Every panel is laid out from the window's width *and* height, not the screen or the pixel ratio, so it reads the same in the 640x360 itch.io embed, a 1366x768 laptop, a 1920x1080 or ultrawide monitor, a tablet either way up and a phone in portrait or landscape, and it re-flows live when the window is resized or the phone is turned. Small windows compress structure rather than scale everything: the minimap shrinks with the short side of the view and drops its ferry/mail captions under 560 px of height, the speed readout shrinks, the compass target label hangs under the strip instead of reserving room, toasts stack two high on a short window, the key cheat-sheet (**H** hides it) shows only the core keys unless the window is tall, and the on-foot hint line steps out of the middle of the screen. The middle of the screen stays clear of HUD panels at every size. Settings, Garage and the title panels never run off the screen: they are capped to the window and scroll inside. There is no HUD-scale slider; none is needed. `tools/playtest/scenarios/ui_responsive.mjs` asserts all of this (bounding boxes, overlap, central clearance, scrolling modals, touch controls, runtime resize and orientation flips) and writes contact sheets.

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

The **App Store** is built like Apple's: a **Today** page with a swipeable row of big colour feature cards
(each app has its own colour; the next one worth getting is ringed and marked "start here"), then a ranked
**Top apps** list in the same order (1 Trail Crew, which you already have, 2 Freight, 3 Real Estate, 4 Rescue) with
GET / OPEN pills. Tap a card or a row to open the app's **product page**: a coloured banner with its GET button,
price / category / income, **What it does**, **Why get it** and an at-a-glance list. Back (or Esc) returns to Today.
It sells three more apps: **Freight** ($120), **Rescue** ($90) and **Real Estate**
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
Once there is more than depot cabins on the books, the app has a strip of **property types** along the top (Depot
cabins, Lighthouses; more as they come up for sale) and a page for each. The first is **Slettnes lighthouse
station** ($12,500): the keeper's white house and the room at the foot of the tower, each with its own door ring.
Walk in and look round before you buy. Guests pay to sleep in the keeper's house on the nights you're not there
($110 a night, paid Mondays, with a statement on the page). A place like this has several rooms and **each room
collects its own grit and dust**: sweeping the keeper's house does nothing for the tower floor, the app shows a row
per room, and the nights let follow the rooms' average. It has stood empty, so it's dusty when you get the keys.
You can hire a caretaker for it in Staff, and it shows on the Map's Depots layer.
With the keys comes **the lamp**, and a **Lights** app on the tablet. The lamp burns paraffin from a 180 L tank at the
foot of the tower, 2.5 L an hour, and a sun valve shuts it by day: it burns only while the sun is down, so a full tank
is about three days of polar night. Kystverket pays a **stipend of $12 for every hour it's lit**, on Mondays, with a
statement in the app; dark hours it should have burned are counted there and earn nothing. Oil comes in 60 L drums
($45, ordered in the app): a drum waits at the Kjøllefjord quay like any claimed pickup (the Jobs app and the compass
track it, it rides in a parcel slot), and stopping at the lighthouse rolls it into the oil store. In the tower room,
stand at the drum rack and use the use control to **pump a drum into the tank** by hand (a few seconds; use again to
stop). If the tank runs dry the lamp goes out, the tower stops flashing, the app badges it, and it stays dark until
there's oil in the tank and you've used the use control at the foot of the stair to **climb up and light it**. The
last keeper leaves you about 18 hours of oil. A light you don't own is Kystverket's and never goes out.
Two **smaller sea lights** are for sale on the Lighthouses page as well: **Finnkirka light** ($4,400) on the headland
at the mouth of the Kjøllefjord, west of town, and **Kinnarodden light** ($5,200) on the outermost point of the
peninsula, far to the north. Each is a whitewashed lantern hut with the lamp on its roof and its own flash (Finnkirka
two short flashes every eight seconds, Kinnarodden lit with a short eclipse every six), and one room behind a door
ring: a bunk, a stove, the oil rack and the ladder up to the lamp. They run like Slettnes on smaller numbers: an 80 L
tank, 1 L an hour (about four days of polar night), a stipend of $6 an hour at Finnkirka and $7 at Kinnarodden, 20
hours of oil with the keys, and the bunk let to walkers at $35 a night. **Drums are ordered for one light**: the
Lights app has a card per lamp with its own ORDER A DRUM (three at most for a small light), each drum is a pickup at
the quay bound for that light, and stopping the sled (or the skiff) by the hut rolls that light's drums into its
store and nobody else's. Pump at the rack and light the lamp at the foot of the ladder, as in the tower.
You can walk into them, GTA-style: a warm ring of light stands on the snow in front of each depot's door (and the sauna
hut's once you've built it). Get off the sled and walk into the light; the screen dips and you're standing inside a room
built for that cabin: log walls, a plank floor, windows onto the snow, a stove or a stone hearth whose firelight
flickers, lamps, bunks, a table, and the gear that cabin would keep (reindeer hides and nets in the herder cabins, the ice
auger in Fjellbu, a long table for six in Viddastua, two tiers of benches round a stone stove in the sauna). The
soapstone stove and triple glazing show once you've bought them. The camera follows close over your shoulder and a wall
lifts out of the way when it has to back through it. Walk back into the lit ring at the door to go out. You can look
round a cabin before you buy it.
Depots get dirty. Guests track grit across the floor on the nights they're let, and dust settles on everything; a
dirty cabin is let less often (a clean one a little more), and the app shows each depot's floor and shelves. A
caretaker (see Staff) cleans every day, as hard as they work. Or do it yourself: buy a **cleaning kit** in the Real
Estate app (eight cleans), walk into the cabin and use it. **Sweep** puts a broom in both hands and slows you to a
sweeping pace: walk the floor and the grit comes up where the broom goes. **Dust** works facing a piece of furniture
up close: you stand and wipe it down, one piece at a time. A swept floor or a dusted cabin uses one clean from the kit.

**Staff** (on the tablet once you have Real Estate) is where you hire people. Every depot cabin you own needs a
caretaker, and people from the villages apply for the job: each card shows their name, where they're from, the weekly
wage they want and how many years they say they've done it. That's their word: some oversell, and how hard someone
works only shows once they're on the job. Applicants wait a few days for an answer, then withdraw; new ones come in
while the job is open. A caretaker keeps the cabin aired, warm, clean and booked, so it's let more nights. Wages come out
every Monday (part of a week for someone who started midweek). If you can't cover them the rest is owed, and nobody
works until you pay it from the app. You can let someone go once you've paid what you owe.
INTERVIEW an applicant first and it opens a chat: ask about their experience, what they'd do when the stove won't
draw in a cold snap, for a reference you can ring, and why they want the job (each once). Someone who padded their
application tends to slip when you ask for detail, and a reference is the surest test: caught out, their card says
what they really have and they ask less. Their tone gives away their temper, and why they want the job says a lot
about how hard they'll work. You can offer a lower wage, but push too hard and they lose patience; a short-tempered
one stops talking money altogether.
Once they're on the books, each card shows how they feel: Happy, Content, Fed up or Miserable. Fair pay for what
they can really do keeps people content (an overseller you hired at their padded wage is delighted; someone you
beat down is not), time with you helps, and owing them wages makes them miserable fast. Happier people work better.
PRAISE or CRITICISE them in person: go to their cabin and the buttons come alive (once or so a day). Praise lifts
them, though less if you've just said it; criticism makes a content worker knuckle down for a few days, but a fed-up,
short-tempered one may hand in their notice on the spot. RAISE works from anywhere, and unhappy staff ask for one
(GIVE or REFUSE). Miserable for a day, they hand in a week's notice; make things right and they'll stay, otherwise
they leave and the job is posted again. Leave wages unpaid for three days and everyone walks out (Settings >
Options: "Unpaid staff walk out").

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

Hit a trunk or a wall hard enough (about 70 mph into it), land a big drop too hard, or come
down badly crooked at speed, and you come off the sled. The rider flies with the speed the sled had:
real gravity, air drag, snow that grabs fast and kills a tumble quickly, powder that grabs harder and
hardpack that lets you skid a bit further, a real bounce off the snow on a hard fast landing before you
settle back into it, and trees you can hit on the way.

Rocks are everywhere out on the fell and in the backcountry (never in town or on the roads), each one standing clear of the snow so you can see it coming. A stone is not a wall: clip one at up to about 30 mph and it **bucks** the sled sideways off its curved face and scrubs half your speed or more; hit one harder than that and it throws you off, and the riderless sled slews to a near stop. The sled itself brakes hard the moment you come
off and holds still riderless until you get back on (Q) — it doesn't coast away or creep in reverse.
Every impact adds up. Get away with it and you get up where
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

**Vehicles.** From six deliveries on, sellers list used **Fjellvogn pickups** (roughly $2,400–3,800
against $4,200 new), and anyone without one sees the odd used **Fjordhenger sled trailer** (about
$550–850 against $950). They haggle and hide faults like everything else: a lemon pickup is down at
40–60% condition, which costs it power (a 50% truck pulls 83%), and a worn trailer rolls heavier
behind the truck. Collect it at the seller's: they set it down in their yard (a pickup comes with a
quarter tank) and you walk over and take it. The garage's Trucks tab repairs a truck ($20 a
condition point) or the trailer ($4 a point) back to 100% when it's within 40 m of the garage;
that also mends the dents a truck takes from trees. Three trucks is the limit, used or new, and one
you've paid for but not collected yet counts: the garage won't sell you a second trailer or a fourth
truck over it (its Trucks tab says where the paid-for one is waiting), and Bytteboden won't take your
money for one either: a used truck or trailer still on the board when you reach the limit another way
says why on its page and when you try to pay, and what you already paid for stays yours. A boat is not
a truck and does not count. If an older save already has an
order that can never be handed over, the seller refunds it.

**Boats.** The garage's **Boats** tab sells the **Fjordsnekka 460** ($2,600): a 4.6 m aluminium
skiff with a 20 hp tiller outboard, a 25 L tank and room for 4 parcels. She's moored at the timber
jetty below the quay: walk down its gangway and out along the planks, and get in beside her the
same way you get on the sled. Throttle, brake and steer work as they do on the sled: she climbs
onto the plane over a few seconds and runs at about 19 mph, the outboard only turns her when
it's pushing or she's moving, and holding the brake runs the prop astern (it stops her, then backs
her). The fjords never freeze; the lakes do, and ice counts as land. Waves get up with the weather,
and in a storm she pitches, slams and gets cold fast (an open boat is colder than the sled). She
draws 32 cm: run her into the shallows or a rocky shore and she grounds (hard, and the hull dents),
and the brake backs her off. Step out at the jetty, or onto any low bit of shore within a step of
the gunwale; where the shore is too high, the game tells you so and you stay aboard.

Dyfjord, Lebesby and Ifjord have jetties of their own (anchor pins on the Map). Tie up alongside
one, or idle there, and it works as the village: parcels for it are handed over and paid as usual,
pickups waiting there are loaded, and the quay jetty takes anything bound for the quay. In the boat
the compass points at your target's jetty ("to its jetty"), or tells you there's "no jetty there".
The east coast (Mehamn, Gamvik, Skjånes, Slettnes) lies on another sea that no water route from
Kjøllefjord reaches, so it has no jetty yet.

Once you own a skiff the Parcels board also carries sea freight, marked BY BOAT: fish boxes, crab
pots, an outboard for the workshop, from one jetty to another. Claim it anywhere; it waits on the
jetty and loads when you tie up alongside, then hands over at the other jetty. A sled can't take it.
It pays by the distance by sea, and 35% more when the road between the two places is snowed in or
shut for the winter (ROAD SHUT +35%). Tied up at a village's jetty you have the village's warmth,
and at the quay jetty the quay's hose fills her tank.

**The Boats app and the tow home.** Once you own a boat the tablet has a **Boats** app. Each boat
gets a card: whether you're aboard, moored at a jetty or she's lying afloat somewhere (and how far
off which jetty), how far that is by sea from the quay jetty, the fuel in her tank and roughly how
far it takes her flat out, the state of her hull and what the dents cost her, and the parcels
aboard. **MARK ON MAP** drops the Map's marker on a boat you've left somewhere, so the compass
leads you back to her. **TOW HOME** has the harbour boat bring her to a free berth at the quay
jetty: $40 and $30 for every kilometre by sea, half as much again in a blow. What's aboard stays
aboard. If you're in her you ride along: the screen fades, and the clock has moved on by the time
a tow takes (about 11 km/h). If you're not, she's fetched and you make your own way. Run the tank
dry at sea and the help control (P, D-pad down, CALL HELP on touch) calls the same tow instead of
a fuel sled, and nobody is left out there for want of cash: it takes what you have. Tied up at the
quay jetty she fills again. Under the cards the app lists every jetty with its distance by sea
from your boat and any sea jobs waiting on it.

**The boatyard.** Beside the quay jetty stands Kjøllefjord Båt & Motor's yard: a red boathouse on
piles over the water's edge, a slip running from its doors down into the fjord with a hull on the
cradle, and a plank walk across from the jetty's deck to its side door. Run the skiff aground
hard and her hull dents, which costs her power; the yard knocks the dents out for $8 a point of
hull (at least $20, $800 for a wreck). She has to be at the quay jetty, within reach of the slip,
and you have to be out of her. Order it from the Boats app, where a dented boat gets a
**Boatyard** card with the price and **REPAIR HULL** (or where to bring her), or walk across to
the shed's door and use the use control there (E, L3, the REPAIR button on touch). The skiff
can't run through the shed, the slip or the walk.

**Fishing from the boat.** Stopped over 4 m or more of water, the use control (E, L3, the FISH
button on touch) puts a handline over the side: a wooden frame of heavy line with a pilk on the end.
With the line down, brake lets it out (the pilk sinks about 3 m a second until it lies on the
bottom) and gas hauls it in hand over hand; the motor gets nothing until you stow the line with the
use control again. Work the pilk: a lift and a drop is a jig stroke, and a worked pilk draws about
three times the fish of a still one. What bites follows the water. Saithe (sei) hunt in mid-water
almost anywhere; cod (torsk) feed within a few metres of the bottom in 10 m and deeper, haddock
(hyse) hug it from 18 m, wolffish (steinbit) lie on it; redfish (uer) want 40 m and more, and
halibut (kveite), rare and worth the most, lie on deep ground past 30 m. Some marks hold far more
fish than others and they don't move: if nothing tugs, shift a few hundred metres. A tug gives you
about a second and a half to haul and set the hook. A small fish just comes up; a heavy one runs,
and hauling against a run stretches the line (the bar turns red) until it parts and takes the pilk
with it. Hold still on a run, or give line with the brake, and haul between runs; leave the line
slack too long and the hook shakes out. The fish go in the same cooler as your lake fish (ten, two
days fresh), the Fiskemottak on the quay pier buys them at the day's price per kilo, they fill
"any fresh fish" orders in Parcels, and the tablet's logbook keeps your best of each under "From
the boat". Too rough in a storm: the line comes in by itself when the sea gets up.

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
door, so you reach the hard pack well before you reach the step. Kjøllefjord is laid out on a street grid: three
plowed east-west streets (the middle one, Kaigata, runs out to the pier) crossed by four north-south ones (the
depot's street is the one a new save spawns facing down). Between them the houses stand in regular lots, gable
to the street, back to back round a shared back alley, each with a shed and
woodpile in the back yard, a mailbox, a porch lamp and fairy lights; the store is on Kaigata, the church closes
the south end, and a street lamp stands on every other lot line. A short plowed spur runs from each door to its
street, so the walk from the quay to any door in town is hard pack all the way and nothing stands in the lane.
The streets are real roads, the way a plowed Maine street looks: dark asphalt showing through with a thin film of salt and
snow (bare wheel tracks, a snowy ridge down the middle over a faint yellow centre line, packed snow in the gutters), a low grey
concrete curb with a snow cap down both sides, and storm drains at the corners. The curb opens wherever a house spur or yard
lane meets the street, and it is only for looks: a sled rolls over it without a bump. There are no fences in town.
On the east edge of town, at the end of the groomed trail, sits the sled country: a groomer shed with its
piste groomer parked out front, a plowed sled park (six sleds on a log rail, block-heater posts), a warming
hut with a lit stove, a jerry-can stand, the SKUTERLØYPE trailhead arch, a trail map board and orange stakes
running off east. Walk into a wall at an angle and you
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

**Clothing layers.** Under your riding kit you wear a base layer and a mid layer, from **Nordkinn Fisk & Friluft** by the
quay (its Base layers and Mid layers tabs, beside the tackle). You start in a cotton tee with no mid layer, which adds no
warmth. A merino top ($85, +0.5 warmth) or wool long johns ($140, +1.2), a fleece ($95, +1.2) or a down jacket ($240,
+2.4) add warmth like any piece of kit. Hard work on foot (wading powder, a jog, digging) works up a sweat, faster under
a heavy mid layer, and a damp base layer chills you on the sled: damp cotton drains your warmth up to about 1.4× as
fast and dries slowly, while merino and wool wick it and stay warm damp. Down is the warmest while it's dry and loses
most of its loft when you sweat in it; a fleece shrugs it off. Through the ice soaks you to the skin. Any stove (a
village, a cabin, the quay, a room) dries you out in about half a minute. Owned layers swap back free in the shop. The
code is `tlx-gear.js`.

**Sport & Vinter, the winter store.** A clothing shop in one of Kjøllefjord's houses, about 45 m from the quay, with a
SPORT & VINTER board over the door. Walk into the light at the door to go in: clothing rails, a table of folded layers,
boots and skis on the walls, a stove, and the counter at the back. At the counter the use control (it reads SHOP) opens
the store: the **riding kit** (helmet, jacket, bibs, boots, gloves; the garage's Kit tab still sells the same), the
**base and mid layers**, and **spares**: dry gloves and socks ($24 a pair, up to 4 in the pack). Out on the trail, once
you've worked up a damp sweat, the use control offers **DRY PAIR**: change into a dry pair and about a third of the damp
comes off (one pair used). Walk back into the doorway to go out.

**Jakt & Våpen, the gun shop.** A hunting shop in Kjøllefjord, about 55 m from the quay, with a JAKT & VÅPEN board over
the door: a rifle rack, a glass case of scopes and magazines, antlers, a shelf of ammunition, and the gunsmith's counter
(the use control reads SHOP). Its tabs: **Licence** (the hunter's licence course, $180: the counter sells a rifle only to
a licence holder; switch it off in Settings > Options), **Rifles** (a bolt-action .308, $1,450, fitted with its stock
parts and showing its stats), **Parts** (barrel, stock, grip, magazine and sight, three of each, every one a trade-off:
the carbine barrel swings faster but reaches less and is louder, the 3-9x scope reaches 250 m and steadies the shot but
weighs and slows the swing, a bigger magazine holds more rounds and hangs heavier; each card shows the stat changes
before you buy) and **Ammunition** (four loads for the .308, 20 to a box, 120 rounds in the pack all told, and it stays 120: with the pack full, a change of load trades rounds one for one
with the magazine, and a smaller magazine waits until there is room for the rounds it won't hold: **soft point** $38, the
standard the sights are set for; **surplus ball** $24, cheap, looser groups and a fifth less clean reach; **match** $74,
tighter groups and 15% more reach with a sharper push; **subsonic** $58, no crack, so only herds within about 170 m
bolt instead of 420 m, but it kills clean only to about half the distance. The magazine holds one load at a time:
*Load these* on a card, or the wheel's Ammo slot out on the fell, empties it back into the pack and it refills from the
new load. Run a load dry and the rifle goes on to the next one you carry and says so). A part you've bought is yours:
swap it on and off free. A fifth tab, **Game**, buys what you bring in off the fell. The code is `tlx-guns.js`.

**Hunting.** On foot, out on the fell and well clear of town, the villages and the cabins, **L** (pad A, the RIFLE button
on touch) brings the rifle to your shoulder, and the same control slings it again; in town it stays slung, and opening Settings slings it (nothing fires under a menu). Shouldered,
you look down the rifle you built: open sights, the red dot's window, or the scope's ring and its magnified view. Your
boots stay planted and the walk controls swing the aim (a tap creeps, held it builds; a scope swings slower). The view
breathes: hold still a couple of seconds and it settles, swing hard or arrive out of breath and it wanders, and a
tighter build holds steadier. The use control is the trigger (E, pad L3, and the touch button reads FIRE). It is a bolt
action: work the bolt after each shot, and an empty magazine refills from the pack a round at a time. Inside the
build's clean-kill range (140 m stock, 250 m with the scope) an animal with its chest on the sight drops where it
stands; past it the round falls short and the toast says so. The shot sends every herd in earshot running, further
with a louder barrel. Walk up to the animal and the use control dresses it (DRESS): reindeer $230, moose $620, fox pelt
$85, hare $22 at the gun shop's Game tab, up to 260 kg carried. **People can never be shot:** with a rider, a car, the
dog, a house or the town anywhere near the line of fire the rifle stays on safe, no round is spent, and it says why.

**The quick-customize wheel.** Hold **R** (D-pad left on a pad, the GUN button on touch) and a wheel opens over the game at
once, pausing nothing, on foot or on the sled, even with the rifle at your shoulder: the five part slots (barrel, stock, grip,
magazine, sight) and a sixth, Ammo, round a picture of your rifle as it is fitted now. Pick a slot (1-6, D-pad / stick / LB RB, or tap it) and
a strip shows only the parts you already own for it, each with small bars for what it would change against what's fitted
(accuracy, recoil, handling, reach, weight, noise). Pick one (1-9, A, or tap it) and it snaps on and the wheel closes. The Ammo slot lists the loads in your pack with
how many of each, and picking one changes what the magazine fills from.
**Esc** (B on a pad, the ✕ on touch) closes it. Buying a part is still only at Jakt & Våpen. The code is `tlx-gunwheel.js`.

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

## Roads

The Nordkinn has roads now. From Kjøllefjord one runs out past the fuel station, up by the
Gartefjellet wind farm and over the fell to Mehamn, then on to Gamvik and the Slettnes lighthouse;
a branch leaves it for Skjånes in the east; another goes north-west to Dyfjord; and one heads south
past the Lebesby station to Lebesby. They wind the way real roads do, round the lakes and houses and
along the slopes rather than straight up them. Where one climbs a steep hillside it does it in proper
switchbacks: each turn swings out round a level loop, never tighter than about 13 m, and the plowed
strip is wider through the bends, so a pickup taken round at a sensible crawl (about 20 km/h) stays
on the hard pack. Each road is built like a real one: cut into the
hillside and banked up over the dips, so it sits level from side to side and keeps to a gentle
grade, with snowy banks easing back to the natural slope either side. Each village has plowed
streets from the road's end to every door.

In winter the council keeps them plowed: a firm, packed strip about six metres wide, sunk below the
snow either side, with orange snow poles every fifty metres on both sides to steer by when the
light goes flat. The pickup is at home on them. The one exception is the road over **Ifjordfjellet**
from Lebesby to Ifjord: it is shut for the winter, so it is just a line of poles across deep snow.
The roads are drawn on the Map and the minimap in orange; the shut one is dashed.

Storms snow the roads in. Wherever a storm is blowing, the snow drifts back over the plowed strip a
stretch at a time; three hours of a real storm leave half a metre on it, more than the pickup can push
through. Light snow and a grey drizzle hardly build on them at all. A stretch that has drifted shut turns ice blue on the Map and the minimap, and you get a word
when the first road goes. Once the storm eases (the plow works on through light snow) the council plow sets out from the start of each road
and works its way along (about an hour behind the storm on the near end, a couple on the far one),
cutting each stretch back to hard pack as it reaches it; you hear when the roads are all open again.
Village streets, house yards and the quay are kept plowed through it all, and a night's sleep finds
the roads plowed. Where the snow on each road stands is saved with the game.

The Map app has a small road legend in the corner (open, snowed in with how many roads are, closed).
The Map app's chart draws each settlement as a warm, lit little town: a lot round every house, the plowed lanes and short back lanes between doors so they close into blocks, lit windows and chimney smoke, and sled country on the outskirts (trailhead flags where each road leaves a village, groomer shed and sled park at the garage, warming huts at lookouts and cabins, the radio relay mast, orange trail stakes along the open road legs).
When a job's way by road runs over a stretch that has drifted shut, a heads-up pops up once per road per
storm, and the compass label and the job's row in the Jobs app say so ("Kjøllefjord–Mehamn road snowed in"; a trip over Ifjordfjellet says it's shut
for the winter); places out in the backcountry, where you'd take the sled anyway, never warn. A pickup
stuck in a drifted road tells you plainly: the road's drifted shut, wait for the plow or take the sled.

A road the plow has just been down in a cold snap (a clear day from December to March; a clear November
day hardly does it) is scraped to the ice in its wheel tracks. Ride a sled in a wheel track and you feel
it: the carbides grind (more drag, about a fifth off your speed), sparks come off the skis and the HUD
says "Scraped road". The hard pack between the ruts and out on the shoulders rides as well as ever. It
lasts the best part of a day after the plow (or until fresh snow covers it), and is saved with the game.

People live in the towns, so their cars are parked outside: about every other house in Kjøllefjord and
the villages has one nosed in by the door, off the road. They're solid (ride into one and you stop; a
good jump clears it). A storm buries them: snow on the roof first, then a drift up the doors, and after
six hours or so a rounded heap where the car was. Once the weather eases the owners dig out, each in
their own time, so the morning after a storm some cars stand clear and some are still drifts (a few
owners are away for a day or two). Which cars are snowed in is saved with the game.

You can dig one out yourself for a bit of cash (Settings > Options: "Dig out buried cars", on by
default). On foot beside a buried car the use control (E, the left stick click on a pad, the DIG button
on touch) offers to dig out the owner's car and says roughly what it pays; press it again to stop. It
takes 20 to 40 seconds by hand depending on how deep the drift is, and pays $40 to $90 the same way: the
owner comes out with a thank-you as the last of it comes off. Each car pays once per storm, and if the
owner gets to it before you finish, you get nothing. By the tackle shop and the fish buyer, E still
opens the shop.

A few locals are out driving on the open roads (Settings > Options: "Road traffic", on by default). They
keep to the right-hand lane at about 45 km/h, slow right down for the bends, and stop well short of
anything in their lane: another car, your sled or truck, a parked vehicle, someone on foot. Where a storm
has drifted the road shut they pull up before the drift, wait a little and turn round in the road; at the
end of a road they turn round or drive on into the village. Ride into one and you bounce off it as off a
boulder (and the driver isn't pleased). There are fewer of them on phones (the low graphics preset).
Leave your sled (or yourself) standing in their lane and they don't wait for ever: after a few seconds,
if nothing is coming the other way, they pull out into the other lane, creep past and move back in. Their
wheels turn as they roll. After dark their headlights throw a soft pool of light down the road ahead
of them (you'll see one coming over a rise long before the car), and you hear one before you see it: a low
engine note and the crunch of tyres on packed snow, rising as it nears and fading as it goes by.
Some of the parked cars in the villages aren't there when you arrive: their owners are out. Now and then
one comes home: it leaves the road where the road ends (or as it crosses a village), drives the plowed
street slowly to its own door, round the corners and past the houses, and parks nose-in where it stood,
in its own colour. Stand in the street in front of it and it waits for you. Switch "Road traffic" off
and every owner is home.

**Storm closures and convoys** (Settings > Options: "Storm closures and convoys", on by default). The two
roads over the fell, Kjøllefjord to Mehamn and Kjøllefjord to Lebesby, have a barrier a little way in
from each end: a red and white boom, two red lamps and a board. While any stretch between the barriers
is snowed in, both booms are down, the lamps flash and the board reads CLOSED. Drivers and lorries
heading in stop at the boom and wait in a queue there instead of driving up to the drift and turning
round. Once the storm has eased and the council plow is out, the next convoy is called for the full
hour: the board, the Map's road legend and the compass's warning for a job over that road all give the
time ("Lebesby road: convoy 14:00"), and the Map shows a red dot at each lowered barrier. The council's
plow truck (orange, a gritter body, an angled blade, two amber beacons flashing) stands just inside one
of the booms until then. On the hour the longer queue goes first: its boom lifts, the plow truck pulls
away with its blade down and the line follows at 36 km/h, at least thirty metres apart, while the far
boom stays down. The road between the barriers is still snowed in at that point: the truck opens it as
it goes, slowing to 25 km/h with the blade in a drift, and the Map shows each stretch open as it is cut.
Just short of the far boom it stops, turns round across the road and waits there while the line drives
out past it; then it leads anyone waiting at that end back as the return convoy, and after that the
road is open and the truck drives off. With the road snowed in and nobody waiting it goes through
alone, and in a real storm the convoy is put back an hour. Far out of your sight with nobody behind it,
it works at the council's old pace, so a road you are nowhere near is open about an hour or two after
the storm. Nobody in the line passes the plow truck; it
is solid, and it stops for you if you stand in its lane. Come up to a lowered boom and a message says why
it is down and when the next convoy leaves. The boom doesn't stop you: a sled goes round it as it
always could, and a pickup still meets the drift. Switch the option off and there are no barriers.

You can ride or drive in the convoy yourself, in anything. Wait on the road at a lowered boom, facing
in, and you count as someone waiting there: alone at the far end of a snowed-in road, the truck comes
through, turns and leads a return convoy just for you. When the boom lifts, fall in within sixty metres
behind the last in the line (a message says you are in). While you are in it the riding hint gives your
speed against the line's 36 km/h, the gap to the one ahead and whether to drop back, hold or close up.
The convoy does not end, and the far boom does not open to the traffic waiting there, until you are out
past it; once the others are through you have about three quarters of a minute to follow them out.
Fall more than eighty metres behind the one ahead, leave the road or your seat for three seconds, or go
past the head of the line, and you have left the convoy. Between the barriers that puts an orange flag
on the Map where you left it, with a line in the road legend, until you are out past either barrier or
back in the line.

Lorries share the roads too: a refrigerated box on a two-axle day cab, a long-haul curtainsider behind a
high-roof sleeper, a fuel tanker. They run slower than the cars (about 40 km/h) and take the bends gently,
and the trailer swings on its coupling: it cuts inside every bend and straightens out behind the tractor.
A car stuck behind one waits behind its tail and overtakes the whole length when the road is clear. A
lorry won't turn round on a narrow road: at a drift or the road's end it waits, engine idling, and has
gone the next time you come by. Ride into one and you bounce off it like a wall.

## The lorry

Under the pickup on the garage's **Trucks** tab is the **Nordtrekk 4x2**, a two-axle cab-over tractor
unit for $11,500: the front half of an articulated lorry, with a fifth wheel over its drive axle. The
garage sells it only to a holder of the **Freight licence**; without one the row is greyed out and says
so. It counts as one of your three trucks and is bought, parked, saved and found on the Map like the
pickup.

Walk up to the driver's door and the on-foot line reads "get in the lorry". You climb the two steps
into a cab that sits most of a metre higher than the pickup's, and first person looks out over the
road from there. It weighs seven tonnes: it pulls away slower than the pickup (about 8 m/s after four
seconds against 14), is limited to 25 m/s (90 km/h), needs some 45 m to stop from 20 m/s on packed
snow, and reverses at a walk. It has a 300 L tank and drinks from it at better than twice the pickup's
rate. It carries two parcels in the cab, has twin tyres on the drive axle and no tow ball, so none of
your sled rigs hitch to it.

It is a road machine. On a plowed road or a plowed street it drives as described; in fresh powder it
sinks at once, digs in and sits there until you dig it out or reset.

**Semitrailers.** Three trailers stand on their landing legs in plowed lay-bys beside the road: a box
trailer on the road out of Kjøllefjord, a couple of hundred metres past the last houses, a tanker
trailer outside Lebesby and a curtainsider half a kilometre short of Mehamn. All are pinned on the Map with your vehicles. To couple one, back the
tractor's fifth wheel under the trailer's front at a crawl and in line with it: the kingpin locks with
a thud and the lorry stops. Come in faster than a walk, or more than about ten degrees off the
trailer's line, and it does not lock; a message says which. The trailer's front stops the cab if you
run on under it.

A coupled trailer still stands on its legs, and the lorry will not move until they are up: get out,
walk to the trailer's front and use the legs (the on-foot line reads "wind the box trailer's legs
up"). After that it is on the lorry. It doubles the weight, so the rig pulls away at well under half
the bare tractor's rate; its own axles add braking and their own drag in snow. It follows the fifth
wheel the way the lorries in traffic do, cutting inside every bend and straightening out behind you,
and swings the other way when you reverse. The chase camera sits further back to keep it in view.

A trailer is solid, standing or coupled: you walk round it, a sled or the pickup driven at its side
stops against it, and drivers on the road stop behind its tail instead of behind your cab. Backing
up takes small corrections, steering toward the side the trailer is drifting to. Let it swing too far
and it jackknifes: at about sixty degrees the trailer's corner is against the cab, the lorry will not
go back any further and a message says so. Pull forward and it straightens out behind you.

With a trailer on, the lorry pulls away in its low gears: the 14-tonne rig (trailer empty) starts from rest on the
steepest stretch of the fell road (about 12%) and works up to some 75 km/h on a level cleared road,
against the bare tractor's 90. Leave a coupled rig standing (switch to the sled or another truck) and
it stays coupled where it is: a message says so and a red warning triangle stands on the road twelve
metres behind the trailer until you are back at the wheel. A trailer left on its legs anywhere but its
own lay-by gets the triangle too. Sell the lorry from under a trailer and the trailer stays where it
was, on its legs, with a message. After dark a coupled trailer's marker lamps are lit; one standing on
its legs has no power and shows dark.

To leave it, stop on level ground, get out and use the legs again: they wind down, the fifth wheel
lets go and the trailer stands where it is. Drive out from under it. It can be picked up again from
wherever you left it, and the save keeps where each trailer stands and which lorry it is on.

**Trailer runs.** Once you own a tractor unit and hold the Freight licence, the Freight app has a
Trailer runs section: one run posted per trailer, a cargo for its kind (fish boxes or groceries in the
box trailer, timber in the curtainsider, heating oil or diesel in the tanker, 2.6 to 4 tonnes) to be
hauled from where the trailer stands to another of the three lay-bys. The card shows the weight, where
the trailer is, the distance by road and the pay, which goes by tonnes and by road distance (about
$500 for the 4 km from Kjøllefjord to Lebesby, about $1,000 for the 9 km from Lebesby to Mehamn).
TAKE puts the cargo's weight on the trailer; one run at a time. The Jobs app lists the run, and when
you have nothing else on the compass follows it by itself: to the trailer's kingpin until it is on
your lorry with its legs up, then to the far lay-by, which is also marked on the Map. It is delivered
when the trailer stands there uncoupled on its legs, anywhere within about 40 m of the lay-by's
middle. Stood clear of the road (in the plowed lay-by, ahead of the trailer that lives there) it pays
10% more and needs no warning triangle. The trailer stays there, and its next run starts from there.
GIVE UP on the card ends a run for nothing. Loaded, the 18-tonne rig still starts from rest on a 9%
road, but not on the steepest stretch of the fell road (about 12%): carry 40 km/h into it and it goes
over without dropping below 12 km/h; stop on it and you back down for another run.

**A used one.** With the Freight licence and six deliveries behind you, a used Nordtrekk turns up on
Bytteboden under Vehicles now and then, for roughly $6,000 to $10,000 against $11,500 new, worn and
haggled over like anything else there (one in six is not what the ad says: look it over in person). A
lorry is too big for a yard, so only people living near one of the three lay-bys sell one, and it
stands in that lay-by. Settle up at the seller's door, by SEND and a visit or in person, and the keys
are yours: the lorry is in the lay-by, facing out on plowed ground with a quarter tank, and on your
Map. If the lay-by is full of your own machines the seller keeps it until you have moved one.

## The pickup

The garage has a **Trucks** tab, and the first thing on it is the **Fjellvogn**, a four-wheel-drive
pickup for $4,200. It is a bought-new machine like the sleds: pay, and it is parked on the plowed
forecourt with a full 70 L tank, clear of your sled. You can own up to three.

It is a truck, not a bigger sled. On plowed yards, village lanes and hard pack it grips, pulls
away properly and carries eight parcels in the bed. The cab is closed and heated, so you lose a
fraction of the warmth you lose on the sled. In a light fall (a hand's depth of fresh, up to about a
boot's) it pulls away from a standstill with the tyres working; past that it crawls, and in deep
fresh powder it has nothing to float on: each tyre
sinks, the belly drags, and the more you spin the wheels the deeper they dig. Hold the throttle and
it ends stuck to the axles. Then you get out and dig (there is no winch on it), or reset. Drive in
the ruts you have already pressed and it is easier, which also means you can usually back out the
way you came. Once a stuck truck is back on plowed ground it is free again. It understeers on ice, hits trees and houses like a ton and a half of truck (a dented
panel, not a crash), and goes through thin lake ice quicker than the sled does. It is for roads once
there are roads. The open fell is still the sled's.

Walk up to a truck and the on-foot line says **get in the pickup** instead of **get on the sled**:
whichever vehicle is nearest is the one the get-on button takes. The walker goes round to the
driver's door, opens it, steps up, sits and pulls it shut. Getting out is the same in reverse.
Gas, brake, steering and the get-on / get-off button are the same on keyboard, pad and touch. Hold
the brake at a standstill to reverse (on a pad even a light pull on the trigger creeps it back). Off the plowed lanes a truck backs out along its own ruts
and the trench its belly ploughed; if it's high-centred in powder it says so (the wheels spin in
reverse and dig in) and then bogs like the sled, with the usual dig-out. A truck that sits still for a
second with the gas or reverse held always tells you why: digging in (only when the wheels really spin), too steep for its grip (or too steep
in this snow), no grip, not enough throttle for the snow (a light pull on a pad trigger can't push 35 cm: give it
more), snow deeper than it can push, or something solid behind or in front of it (a parked sled, a rock, a wall). In fresh powder the pickup pulls away through a
boot's depth, slows to a crawl by about 35 cm (about walking pace; its traction control trims the wheelspin, so a
floored pedal keeps crawling, up a gentle grade too, instead of digging itself in), creeps a few metres through 38-40 cm, and stops from about 42 cm (no 5 cm cliff from a crawl to a bog). A truck still
making way, forward or backing up, is left alone instead of being told to ease off. A run at a deep bank carries
you a few metres in before it stops and digs in. Each vehicle keeps its own fuel and its own parcels, and
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
unload. You can't raise the ramp while the sled is standing on it. The driving schools won't start a
course while your sled is strapped to the trailer: unstrap it and ride it off the deck first.

**Towing the sled.** Strapped down, the sled is weight on the truck: the pickup's receiver takes
1,500 kg, and the trailer (420 kg) plus the sled (280 kg, a little more with parcels in its rack)
is well inside that, but the truck pulls it slower off the line and its tyres drag in deep snow.
Raise the ramp before you drive off: towed with the ramp down, its lip drags through the snow and
you're told so. The Map shows the sled and its trailer where they are, and everything stays
hitched and strapped through a reload. Unhitch the sled's own drag or trailer before loading it:
a sled towing a rig can't be strapped on, and the garage won't fit a rig to a sled that's strapped
down (unstrap it first; a rig put on any other way takes the straps off and says so).

## The plow blade

The garage has a **Plow** tab. The **Fjellskjær 2.3** ($1,450) is a 2.3 m steel blade for the
Fjellvogn. Slewed, it throws to the right or the left and clears a lane just over two metres
wide; square, it carries the snow in front of it. The pickup
has to stand within 60 m of the garage to have it fitted. Taking it off puts it in the garage's
shed, and fitting it again costs nothing. It adds 280 kg on the truck's nose.

**Dropping it.** In a truck with a blade, the use control (**E**, **L3** on a pad, the **BLADE
DOWN** / **BLADE UP** button on touch) drops and lifts it. That control is the horn in any other
truck; a truck wearing a blade has no horn on it. While Settings, the garage or the tablet is up
the control rests: it neither drops, lifts nor slews the blade.

**Plowing.** With the blade down and the truck rolling forward, the snow in front of the bumper is
cut down to the level of a plowed yard, and what came off is thrown into a windrow along the
right-hand side. Your wheels follow in the cut, so the pickup doesn't sink the way it does in
powder: what holds it back now is the push on the blade. That grows with the depth of the snow and
steeply with speed. About 30 cm is steady work at 20 km/h, 60 cm is a crawl at 12 km/h, and a
drift that stands over the top of the blade stops the truck with a line telling you to lift it,
back up and take it in bites.

**The throw.** With the blade down, **hold** the use control for half a second (a tap still lifts
it) and the blade swings to its next setting: throw right, throw left, square, and round again. A
line says which, the hint shows it and names the next one, and the blade keeps its setting through
a save. Slewed, the windrow goes off the trailing end on that side. **Square**, nothing is thrown:
the snow rides on the blade, twice what a slewed blade holds, and what is over a bladeful spills
off both ends. Stop, or lift the blade, and what it carries is left as a heap in front of it:
that is how you clear a yard and stack the snow in one corner. A heap is a heap, though: the
blade won't push through one it has just built.

**Back-dragging.** Reverse with the blade down and it drags snow back with you instead of pushing
it: the way to get snow away from a door or a wall you can't plow toward. Drive up with the blade
lifted, drop it against the door, back away. The back of the blade takes the top of the snow
(about half the pack is left, where a forward cut leaves a plowed yard) and pulls up to a bladeful
along; the hint reads "back-dragging" and how much it is pulling. When you stop, lift it or drive
forward again, what it pulled is left as a heap under the blade, ready to be plowed away forward.

**The cutting edge.** The steel edge along the bottom of the blade wears with every metre of snow
it cuts, forward or back-dragging: about a point every 250 m, so a road stretch plowed out and back
costs three. The garage's Plow tab shows it ("Cutting edge 84%"). Under 30% the edge is ragged and
leaves twice the snow in the lane; a line tells you when it gets there and the hint says so while
you cut. With the truck within 60 m of the garage the same tab mends it at $6 a point, as many
points as your cash covers. A blade in the shed keeps the edge it had.

**A used blade.** Once you own a pickup with no blade for it, Bytteboden lists a used Fjellskjær 2.3
now and then, under Vehicles, for roughly two thirds of the new price. Its condition is its cutting
edge: the card gives the percentage and what a new edge would cost at the garage, so the sum against
a new blade is in front of you, and a seller can lie about it like any other (inspect it in person).
It weighs 280 kg, so it is collected in a pickup, not on the sled: stop at the seller's door in a
pickup with no blade and they help you bolt it on there and then; in one that already carries a
blade it goes in the bed and into the garage's shed, where the Plow tab fits it to another pickup
for nothing. Arrive on the sled and the seller says to come back in the truck; the order waits.

**The plow truck.** Under the lorry on the garage's Trucks tab is the **Nordtrekk Brøyt 4x2**
($16,800, Freight licence, one of your three trucks): the council's kind of truck, an orange
cab-over with a gritter body and its own blade, the **Brøytskjær 3.5**, on the nose
from the factory. The blade is part of the truck: it does not come off, is never sold apart, and the
Plow tab only mends its cutting edge. It works by the same control as the pickup's (tap to drop and
lift, hold to slew), clears 3.1 m and throws a windrow over a metre high. Nearly ten tonnes on
winter tyres pushes what a pickup stalls in: 30 cm at about 35 km/h, 60 cm at about 25 km/h (the
pickup: 12), and a 90 cm drift taken at a run. Its blade is wide enough to count for both sides of a
road, so **one pass down the middle opens a snowed-in road stretch**. With the blade up, or off the
road in soft snow, it is ten tonnes that sink; and it needs a yard or a three-point turn to come
about (its turning circle is 11 m at the truck's middle, a road is 6.4 m wide).

**The gritter.** The plow truck's body is a gritter with a 3 t hopper, empty on a new truck. The
garage's Plow tab fills it by the kilo at $50 a tonne ($150 full, or as much as your cash covers),
with the truck within 60 m. In the cab with the blade **up**, **hold** the use control (E / L3 /
the BLADE DOWN button) half a second to start the spinner, and hold it again to stop it; a tap
still drops and lifts the blade, and with the blade down the hold still slews it, so the gritter
keeps running while you plow. It spreads only while the truck rolls, about 40 kg every 100 m (a
full hopper does 7.5 km of road), and you can see it: grit flies off the spinner's disc and the
heap in the hopper sinks. On a road every 10 m you grit grips about a third better under the
tyres of any truck you drive (the plow truck stops from 50 km/h in 18 m instead of 21, a pickup
from 43 km/h in 12.5 m instead of 15) for six hours, fading out by ten, or until new snow buries
it. Grit on a stretch under deep snow does nothing unless the blade is down and cutting in front
of it, and off the road it just goes on the snow: the riding hint says which, and what share of
the stretch is done. What is in the hopper rides on the truck (three tonnes more to pull and to
stop when full). When it runs out the spinner stops and says so. Sleds feel nothing of it. The
hopper's load and the gritted lengths are saved; the spinner is off after a reload.

**A used plow truck.** With the Freight licence and six deliveries behind you, a used Nordtrekk
Brøyt now and then turns up on Bytteboden under Vehicles (less often than a tractor unit, and
seldom once you own one), for about two thirds to three quarters of the $16,800 it costs new.
It sells by the lorry's rules: only people living within 1.5 km of a road lay-by sell one, it
stands in that lay-by and not in a yard, you settle at the seller's door for the keys, one can
be waiting for you at a time, and it counts as one of your three trucks. It comes with a quarter
tank, an empty hopper and its own blade, whose cutting edge is as worn as the truck: the listing
says "cutting edge 73%", and the garage's Plow tab mends it at the usual $6 a point. A lemon's
edge is worse than the ad says, like the rest of it; looking it over in person shows the truth
and drops the price.

**The Plow app: the kommune's road contracts.** Once you own a blade the tablet has a **Plow** app.
It lists the kommune's roads that no convoy runs on (the Dyfjord, Skjånes and Gamvik roads), each
out to tender. **SIGN** for one, with a blade fitted to a truck, and that road is yours: the
council's plow stays home on it. From then on every 400 m stretch with snow on it that your blade
opens (both sides of the centre line with the pickup's blade, one pass down the middle with the
plow truck) pays **$100, at once** (25 cents a metre; half as much again in the polar night, like
every job): in full if you open it inside 3 hours of the weather easing, sliding down to half at 8
hours. The clock does not run while the storm is still over the stretch. A dusting that would not
have brought the council out pays nothing. The Jobs app lists each of your roads that has work on
it, the compass points at the nearest stretch (by itself when you are at the wheel of a bladed
truck and nothing else is on), and the app's cards show what is waiting and what the week has
earned. A contract is at risk when the road is left: a stretch that lies **shut** for 8 hours, or
that you sleep through, is opened by the kommune's own truck, unpaid, and is a **warning** (a line
tells you at 4 hours). Three warnings and the road is taken back and not tendered to you for a
week; a Monday after a week without one strikes a warning off and writes the week's statement.
**HAND BACK** returns a road to the council whenever you like, but it does not wipe the slate: the
kommune keeps a road's warnings on file (the card of a road you gave up reads **WARNING 2 OF 3 ON
FILE**) and they come back with it when you sign again, where it then takes a whole clean week held
before a Monday strikes one off. The clock on a stretch that still has snow on it keeps running
while the road is out of your hands, and handing a road back with a stretch that has lain shut 4
hours or more is a warning in itself (the card says so before you press); the third warning takes
the road back for a week however it was earned.

**Driveways.** Under the roads the Plow app lists eight Kjøllefjord households with a drive beside
the house, each **ASKING**. Until you **TAKE ONE ON** its owner shovels it by hand and nothing about
it changes. Once it is yours the shovel is put away: the drive snows in with every storm (the snow
really lies there, 30 cm and more where the yard was hard pack; the walk to the front door stays
clear), the Jobs app gets a row for your snowed-in drives, the compass points at the nearest and the
Map pins each one. Plow it out with the blade down, driving up it from the street or back-dragging
out of it: the riding hint counts how much is done, and once four fifths of its length is cut the
drive is clear and the customer pays **at once**, $12 a call plus $3 a metre ($42 for a 10 m
drive), in full inside 4 hours of the weather easing and sliding to half at 12. Leave a drive 12
hours, or sleep through it, and the customer digs it out by hand: no pay, and the second time they
find someone else for a week (a paid clearing wipes the first miss). **DROP** gives a drive back for
nothing. Monday's statement has one line for all the drives you cleared that week.

**Mind the doors.** The snow a blade moves has to end up somewhere, and the wrong place is somebody's
way in: the front walk of a house (the few metres from its door to the street) or the mouth of a
drive. Push a pile down a street throwing right and the windrow lies across every walk you pass;
lift a square blade or stop a back-drag in a drive's mouth and the heap stays there. While you are
still beside it the riding hint says **your snow lies across Sander's front walk**, and nothing else
happens: nose in from the street and cut it away to one side (or slew the blade to throw the other
way before you get there) and nobody ever knows. Drive on and it is on a clock: a line, a row in the
Jobs app, a pin on the Map and a **Doors** list at the top of the Plow app. Clear it and it is
forgotten. Leave it 3 hours (the clock stands in a storm), or sleep through it, and the household
digs it out by hand and holds it against you: a customer counts it exactly like a drive left snowed
in (the second time you lose them for a week), a household that was only asking stops asking you
for 3 days, and after three complaints in a week nobody new takes you on before Monday. It never
costs cash. The mouth of your own snowed-in drive is your work site and is not counted until the
drive is clear. Settings > Options > **Plow snow at doors** turns all of it off.

**A solid blade that trips.** The blade is part of the truck now: up or down, it meets walls, trees,
posts, rocks and parked cars 80 cm before the bumper does, and it is 2.1 m across, so a bladed
pickup needs more room than a bare one. With it down at over 14 km/h, a rock, a log or a parked car
trips it, as a real plow's springs let it: the blade folds forward over the thing with a thud and
sparks, the truck keeps about three fifths of its speed instead of stopping dead, and the cutting
edge loses 2 to 8 points depending on how fast you were going. What tripped it then meets the
bumper at the speed that is left, so a fast hit still dents the truck, only less. The blade stays
folded while the thing is under it (the hint says to back off) and springs back with a clunk once
it is clear. Slower than that, or against a wall or a tree, the truck simply stops at the blade.
Settings > Options > "Plow blade trips" turns the trip off: the blade is then plain steel and the
truck takes the whole blow.

**What you hear.** The blade lands with a clunk and comes up against its stop with a smaller one.
Down and moving it scrapes: louder with speed, a high ringing scrape on a plowed lane or bare
ground, duller and quieter the deeper the snow it is into. On a scraped road stretch (freshly
plowed by the council in a cold snap) the edge rings higher still and strikes sparks.

**Start from cleared ground.** The blade only clears what is in front of it. Drop it while the
truck is standing in deep snow and the wheels are still in snow it never reached: the hint says
so. Back up to a yard, a road or your own cut and plow in from there. Rolling slowly through
shallower snow you can drop it on the move and it cuts its own way out.

**The hint.** In a bladed truck, slow or stopped with snow worth cutting ahead, the hint offers the
control to drop it. With it down it gives your speed and the depth being cut, or says there is
nothing to cut, then the control to lift it and what holding it will do.

**Opening a road.** A snowed-in road is yours to open. The roads keep their snow in 400 m
stretches. Plow along a stretch on one side of the road, turn round past its end and plow back on
the other side: when four fifths of both sides are done the whole stretch is plowed for good, edge
to edge, the Map shows it clear and a line names the road and the kilometres ("The Dyfjord road is
open again: your blade cleared km 0.8 to 1.2"). With the blade down on a road that has snow on it,
the hint counts both sides for you ("Dyfjord road: this side 60%, the other side 0%"; 100% is
enough to open it). Twice along the same side does not open it. New snow on the stretch, or the
council's plow getting there first, wipes your count. The pickup's blade handles a road that has
just drifted shut (about 55 cm, at 15 km/h); a road drifted level with the snowpack stops it, and
is work for bites or a bigger truck. The Plow tab counts the stretches you have opened.

A lane cut across open country snows in again with the weather and is not kept in the save (the
blade comes back up after a reload, too); a road stretch you opened is kept. Being paid for
plowing comes next.

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
Rods, reels, line, augers and bait come from **Nordkinn Fisk & Friluft**, the tackle and outdoor shop by the quay
(stop there and press **E**). The Logbook keeps your catch, kilos and personal bests.
The fishing code is `icefish.js`.

## The living world: the Politi, flats and landlords

The first release of a broader idea (see the Owner note in `loop/LOOP.md`): the world reacts to how you drive and where you live. Three switches in Settings > Options: **Politi patrols and pursuits**, **Flats: rent or buy** and **Slumlords**. Each is on by default; off means that part of the world isn't there (no cruisers and no fines; no flats, rent or charges; every landlord fair). Old saves load with a clean slate.

**The Politi** (`tlx-police.js`). Two white cruisers with a blue band, POLITI on the doors and a blue light bar patrol the open roads like any other traffic car (they are traffic cars: same road driver, same solid bodies). Limits are by place, never by vehicle: 30 km/h inside the town limit and 70 km/h on a marked road. The open fell has no limit, so ordinary snowmobile travel is never an offence. Over the limit by more than 10%, a close pass at speed (a car or a person within 3.5 m), sliding the machine round in town or on a road, and hitting traffic all count, on a sled, the pickup or a lorry (boats and walking don't).
- It only counts if someone sees it: a cruiser within sight (170 m by day, less at night and in a storm, and a hill hides you) or, for the serious ones, a driver or rider within 50 m who phones it in. A cruiser is then dispatched from a road 380 m or more away; nothing appears beside you.
- **Warn.** The nearest cruiser comes up behind you with its lights and a two-tone siren on and the top-left HUD says to slow down and stop. Stop (a cruiser within 60 m) and you are fined; slow to the limit for 6 s after a minor offence and it ends with a warning only. Keep speeding or ignore it and it's a pursuit.
- **Pursuit.** Heat builds (five pips) while they see you, faster the further over the limit you are, and holds while you are out of their sight; more cruisers are called at 35 and 65 heat and they get quicker. A cruiser leaves the road and drives over the snow to you (slower in powder and on slopes, round water, rocks and houses), can be rammed or outrun, and gives up if it's stuck for 5 s. Stop with a cruiser on you, or boxed in by two, and you're busted: the fine plus a fleeing surcharge. Stop with none close and you give yourself up (the fine). Break sight for 7 s and it becomes a **search**: heat falls while they drive to where they lost you, and 24 s unseen means you got away (no fine). Seen again within 120 m and it's a pursuit again ("They've seen you again"): the same chase, counted once in your record.
- **Fines** come off your cash and never take it below zero: what you can't pay is owed, grows 10% every Monday, and at over $300 owed the patrols know your face and start you at 20 heat. Pay it from the **Politi** tablet app (it also holds your record and the rules). You never lose the machine.

**Flats** (`tlx-housing.js`, the **Homes** tablet app). Six flats in Kjøllefjord, each behind a real town door (a ring in front of the door and a TIL LEIE plaque, like the other walk-in rooms) with a small furnished room inside. Rent is $28 to $95 a week, taken on Mondays (once per Monday, however the clock moves); owning is $41,000 to $96,000, 870 to 1,460 weeks of the rent, with a $6 a week property charge and 75% back if you sell. Signing takes the deposit and the first week up front (not enough cash: nothing is taken). One lease at a time; owning a flat as well is fine.
- Short of rent on a Monday it isn't taken: it goes to **arrears** (plus a late fee), never to negative money. Two weeks behind is a notice to quit; a week later you're out, and the deposit goes to the arrears. Rent you still owe after that is debt: pay it before you can sign again (the fair landlords also won't see you for 14 days).
- Moving out gets the deposit back minus whatever that landlord keeps, minus arrears.

**Landlords and slumlords.** Three landlords own the flats and the lease on each listing says what you're signing: weekly rent, deposit, how long repairs take, what the rent may rise to, what's kept from the deposit. Reviews say the rest.
- Kåre Bjørnstad is fair: faults fixed in about two days, deposit all back, rent fixed. Eiendom Nord AS is slow (about six days), now and then "forgets", and keeps a sliver of the deposit. **Rolf Haugen** is the slumlord: half the going rent, a ruin of a flat (a dead radiator and a damp wall at the door), things keep breaking, repairs in two weeks or never, 50% of the deposit kept for "cleaning", and a rent rise of up to 25% if you write to him.
- Faults are real: a dead radiator, a damp wall, a ceiling leak, mice, each with its fixture in the room. A dead radiator drains your warmth while you're in the flat; a working one restores it. Stand by a fault in your flat and use the use control: **report** it (the landlord's clock starts), and once reported use it again to **fix it yourself** for the parts ($35 to $60).
- A reported fault that has stood open a week can be taken to the municipality (**Complain** in the Homes app). It rules in three days, usually for you: the landlord is fined, the repair is ordered within two days, you get 25% of the rent back for the weeks it was broken, the deposit comes back whole, and he can't hit back with a rent rise for 30 days.
- Slumlords off: every landlord behaves like Kåre.

## Running it

Open `index.html`, or play the hosted copy at
<https://defnotalemon.github.io/tracklayer/>. It also appears in the arcade at
<https://defnotalemon.github.io/>.

Built with three.js (r128, from a CDN). Everything else — terrain generation, snow
deformation, physics, weather, audio — is hand-rolled in `tracklayer.js`.
Ice fishing is `icefish.js` (fishing from the boat is `tlx-seafish.js`). `tlx.js` is the socket the Four Seasons & Enterprise
expansion plugs into: each of its systems gets a file of its own, and its state rides in
the same save.


## Winch and recovery
Low on the throttle in deep, unpacked snow and the track digs a bog. Get off (**Q**), wade to a tree or boulder, hook the winch (**E**) and reel (hold **Space**); the cable drags you to your anchor, not the other way round. The hand winch is short and slow, the electric winch reaches further, and the heavy-duty winch has a snatch block (**X**) to double the line. Stall it and the line sings; overload the anchor and it parts or the tree comes out. **F** only calls a rescue sled when you go through the ice or run dry.
On a pad the on-foot action (hook, unhook, dig, help a casualty up, rig a tow) is a click of the **left stick** and reeling is the bottom face button; on touch a button by the right thumb wears the verb (**DIG**, **HOOK**, **HELP UP**) whenever there is something to use. The hint line names the control for whatever you last touched.

# Tracklayer

A snowmobile courier-survival game that runs in the browser. No build step: `index.html` holds the page and styles, `tracklayer.js` holds the game code.

It is set on the Nordkinn peninsula in Finnmark, Norway's far north. You run freight off
the coastal ferry at Kjøllefjord quay and out across eight kilometres of bare plateau,
frozen lakes and birch valleys to the villages along the coast — Dyfjord, Mehamn, Gamvik,
Skjånes, Lebesby, Ifjord — the reindeer herders' cabins up on the fell, the wind farm on
Gartefjellet and the lighthouse at Slettnes. The fjords never freeze; ride off the quay
and a fishing boat pulls you out, minus the load.

## The idea

The snow is the main mechanic. It is a deformable height field at 25 cm resolution:
the skis and track press it down permanently, carving hard throws up berms, and hard
landings leave craters. Fresh powder drags on the sled and drinks fuel. Snow you have
already packed has almost nothing left to compress, so your own trails are fast and
cheap to ride — until falling snow fills them back in, slowly in calm weather and in
under a minute during a storm. Which routes you keep open is the strategy.

## Playing

The title menu sits over the live world: your sled parked at the quay in the low morning sun.
Continue (or Ride, first time), New game, Garage, Settings, How to play and Credits; the
arrow keys and Enter, the mouse, a tap or a gamepad all work.

- **W / S** throttle, brake · **A / D** steer · **Shift** lean · **Space** hop · **Ctrl** wheelie
- **Tab** dash tablet · **E** horn · **T** garage (across the road) · **F** call a rescue sled (only for a dunking in the fjord or an empty tank) · **R** reset a stuck sled · **Q** get off or on the sled · **Z** wipe frost off your visor
- **V** cycle camera (chase, close, first person, drone) · **Esc** settings · **M** map · **B** weather (on the tablet) · **H** hide help
- Gamepad: **RT / LT** throttle, brake · **left stick** steer · **RB** lean · **A** hop · **X** wheelie ·
  **B** garage, or back · **D-pad up** dash tablet · **Menu** settings · **View** reset · **D-pad left** wipe visor · **L3** horn · **R3** camera · **D-pad right** weather · **Y** god menu
- Phones and tablets get touch controls: steer pad under the left thumb, the rest under the right.

Work comes in on the **dash tablet**, an iPad-style screen on the bars that shows a live map while
you ride. **Tab** (pad **d-pad up**, touch **TABLET**) dips your head down to it: the world keeps
running and you can still steer, you just can't see much trail. In third person it opens as a big
overlay instead. Apps: **Parcels** (pickups and drop-offs, each with its own little chart),
**Map** (the survey chart with deliveries, pins, rescues and depots, plus the ferry and mail widget),
**Weather**, **Calendar**, **Trail Crew** (grooming lines, and volunteer recovery call-outs once
you've a winch), **Logbook** (a field notebook: kilometres, flattened birches, airtime, fjord dunkings, deliveries and more) and the **App Store**. Arrows (or the d-pad) move, **Enter** (or
**A**) picks, **Esc / Backspace** (or **B**) backs out; taps and clicks work on the screen too.
Take a job where it's waiting and it goes straight on the sled; take it anywhere else and you
claim it, and it loads when you stop at its **P**. Your first six deliveries are round town, picked
up at the quay. After that the work comes to you: every drop-off posts parcels from wherever you
are, mostly short hops to places within a few kilometres plus a long haul or two across the map.
Pings on the dash (with a banner when the tablet's down) tell you when something comes up.

## Apps and licences

The **App Store** sells three more apps: **Freight** ($120), **Rescue** ($90) and **Real Estate**
($50). Freight and Rescue each come with a sign-up for their licence school: the **Nordkinn Frakt
training yard** south-east of town, under Gartefjellet, and the **Nordkinn Redning base** out west
toward Lebesby. Sign up and the school is pinned on the Map and the arrow takes you there; stop in
the yard to start. On the course you ride the school's Matriarch 850T (your own sled waits in the
yard with anything on it) and stay on the course or the instructor fetches you back. Freight school
is four short missions: hook up a trailer and hold a side-hill, drag 300 kg up the big hill, a
timed priority run with a fragile load, and a flatbed expedition loop. Pass them all for your
**Freight licence**, which opens heavy, priority and expedition freight in the Freight app (your
courier rank still decides which). Aurora tours are posted in Parcels. Rescue school's course and
the Real Estate listings come with later updates.

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

Fuel and warmth both run down. Villages, cabins and the quay refill them. Run out of warmth
and the Red Cross sled drags you home, minus the cargo and a fee.
Money buys sleds, parts and rider kit at Nordkinn Skuter & Service. Progress saves in your browser.

## The calendar, the dark and the weather

A game day is 20 real minutes, and the calendar is real: a new game starts on 1 November and
the season runs to the end of May, then the summer fast-forwards and you come back on 1 November
to a fresh snowpack with everything you own (the Calendar app counts the years). Daylight follows Kjøllefjord's 70.9°N. In early November the sun
barely clears the horizon at noon. From about 20 November to 22 January it doesn't rise at
all: there's a blue twilight around noon and dark the rest of the time, and **every job pays
×1.5**. By March the days are twelve hours, and from mid-May the sun never sets.

Auroras come more often and burn brighter in the polar night. A strong one lights the snow
green enough to ride by. While one is up, tourists queue at the quay for a ride to one of
three viewpoints (Finnkirka lookout, Stjernevarden, Ifjordfjellet ridge). They pay by how
strong the lights are when you get there.

Storms are weather fronts that sweep across the map, so the west coast gets hit before the
quay. The tablet's Weather app (or **B**, for barometer) shows a 3-day forecast. Tomorrow's is usually right; days two and three carry a
confidence figure and are sometimes wrong. It also shows whether the ferry's calls look
on time, delayed or cancelled.

## The spring melt

From April the snow goes to slush in the afternoons (heavier, slower, sloppier) and sets to a
crust overnight. From about 9 April it starts melting out: south-facing slopes and the shore
first, the high fell last. Bare ground scrapes and throws sparks, and a sled crawls across it
and runs hot. From May the lakes open up from the shore in. Open water skips like the fjord,
and a band of dark, thin ice ahead of it cracks under a slow sled and gives way. As trails melt
out they close: the Map app shows each one as open, melting or closed, and work thins out and
only goes where the trail still holds (melting trails pay a little extra). At the end of May
there's a summer montage, then it all freezes over again for the next winter.

## The hitch and bigger work

The garage sells three tow-behind rigs, one on the hitch at a time:

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

Big loads pay by condition. Hits, snags and rollovers wear it down, and below 30% the
village refuses it. The bond is paid up front and refunded on delivery. You lose it if the
load is refused, if a priority run is late, or if you black out.

## Running it

Open `index.html`, or play the hosted copy at
<https://defnotalemon.github.io/tracklayer/>. It also appears in the arcade at
<https://defnotalemon.github.io/>.

Built with three.js (r128, from a CDN). Everything else — terrain generation, snow
deformation, physics, weather, audio — is hand-rolled in `tracklayer.js`.


## Winch and recovery
Low on the throttle in deep, unpacked snow and the track digs a bog. Get off (**Q**), wade to a tree or boulder, hook the winch (**E**) and reel (hold **Space**); the cable drags you to your anchor, not the other way round. The hand winch is short and slow, the electric winch reaches further, and the heavy-duty winch has a snatch block (**X**) to double the line. Stall it and the line sings; overload the anchor and it parts or the tree comes out. **F** only calls a rescue sled when you go through the ice or run dry.

# Tracklayer

A snowmobile courier-survival game that runs in the browser. No build step: `index.html` holds the page and styles, `tracklayer.js` holds the game code.

It is set on the Nordkinn peninsula in Finnmark, Norway's far north. You run freight off
the coastal steamer at Kjøllefjord quay and out across eight kilometres of bare plateau,
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
- **E** job board (at the quay) or garage (across the road) · **F** call a rescue sled (only for a dunking in the fjord or an empty tank) · **R** reset a stuck sled · **Q** get off or on the sled
- **V** cycle camera (chase, close, first person, drone) · **Esc** settings · **M** map · **H** hide help
- Gamepad: **RT / LT** throttle, brake · **left stick** steer · **RB** lean · **A** hop · **X** wheelie ·
  **B** job board, garage, or back · **Menu** settings · **View** reset · **R3** camera · **Y** god menu
- Phones and tablets get touch controls: steer pad under the left thumb, the rest under the right.

The job board is a survey chart of the Nordkinn drawn from the terrain itself. Pick a parcel
or contract and it plots the line a courier would ride from the quay — round the fjords, easy
on the climbs, along trail you've already packed — with the distance by trail and the climb.
**↑ / ↓** (or the stick) to choose, **Enter** (or **A**) to take it, **1**–**8** for a quick pick.
On a touch screen, tap a line to plot it and tap it again to take it.

Fuel and warmth both run down. Villages, cabins and the quay refill them. Run out of warmth
and the Red Cross sled drags you home, minus the cargo and a fee. The winter sun is up for
a few hours around midday and never gets high; the rest is twilight, stars and the aurora.
Money buys sleds, parts and rider kit at Nordkinn Skuter & Service. Progress saves in your browser.

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

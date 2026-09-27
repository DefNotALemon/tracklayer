# Tracklayer

A snowmobile courier-survival game that runs in the browser. No build step: `index.html` holds the page and styles, `tracklayer.js` holds the game code.

You run supplies out of Hollis Ranger Station to six backcountry cabins and a summit
relay, across four kilometres of mountains, boreal forest and frozen lakes.

## The idea

The snow is the main mechanic. It is a deformable height field at 25 cm resolution:
the skis and track press it down permanently, carving hard throws up berms, and hard
landings leave craters. Fresh powder drags on the sled and drinks fuel. Snow you have
already packed has almost nothing left to compress, so your own trails are fast and
cheap to ride — until falling snow fills them back in, slowly in calm weather and in
under a minute during a storm. Which routes you keep open is the strategy.

## Playing

- **W / S** throttle, brake · **A / D** steer · **Shift** lean · **Space** hop · **Ctrl** wheelie
- **E** job board (at the station) · **F** call a tow · **R** reset the sled
- **V** cycle camera (chase, close, first person, drone) · **Esc** settings · **M** mute · **H** hide help
- Gamepad supported.

Fuel and warmth both run down. Cabins and the station refill them. Run out of warmth
and a ranger drags you home, minus the cargo and a fee. Money buys sleds, parts and
rider kit at Hollis Sled & Service. Progress saves in your browser.

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
| Trail crew | 3 | Grooming contracts: groom the line to a cabin, paid by how much you cover |
| Freight hauler | 5 | Heavy freight: stoves, freezers, generators, propane, solar kits, battery banks |
| Priority courier | 12 | Emergency runs to cabins in trouble: about double pay, a tight clock, a 25% bond |
| Expedition hauler | 20 | Summit Relay loads on the flatbed: batteries, turbine, tower generator |

Big loads pay by condition. Hits, snags and rollovers wear it down, and below 30% the
cabin refuses it. The bond is paid up front and refunded on delivery. You lose it if the
load is refused, if a priority run is late, or if you black out.

## Running it

Open `index.html`, or play the hosted copy at
<https://defnotalemon.github.io/tracklayer/>. It also appears in the arcade at
<https://defnotalemon.github.io/>.

Built with three.js (r128, from a CDN). Everything else — terrain generation, snow
deformation, physics, weather, audio — is hand-rolled in `tracklayer.js`.

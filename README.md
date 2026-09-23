# Tracklayer

A snowmobile courier-survival game that runs in the browser. One file, no build step.

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
and a ranger drags you home, minus the cargo and a fee. Money buys nine upgrades:
tanks, a suit, heated grips, a bigger engine, a paddle track, suspension, a light bar
and an insulated cargo box. Progress saves in your browser.

## Running it

Open `index.html`, or play the hosted copy at
<https://defnotalemon.github.io/tracklayer/>. It also appears in the arcade at
<https://defnotalemon.github.io/>.

Built with three.js (r128, from a CDN). Everything else — terrain generation, snow
deformation, physics, weather, audio — is hand-rolled in the one file.

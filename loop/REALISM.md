# The realistic look (goal G8): every asset, street, house, figure and sled

Lemon, 24 Nov 2026: "go through tracklayers assets, roads, viewport, character, every bit of it and make it more
like a highly realistic roblox game ... it doesn't need metahuman, just realistic clothes, streets, houses,
character, body and sleds ... you could manage that by slowly nitpicking yourself".

Lemon, 26 Nov 2026: "we should have workers working to make tracklayer be photoreal, or at least as close as ultra
graphics roblox games go, we dont need to make the roblox game roblox is my example of a game that doesn't have good
graphics unless you're on the right game where it's beautiful."

So the bar is raised from "realistic assets" to **the whole picture reads as photoreal, or as near as the best
ultra-graphics Roblox games get**, and builders work on it continuously: when a slice lands and the supervisor has
looked at its stills, the next is dispatched at once, without asking, until R8 is done (one builder at a time, his
standing rule). What makes those games beautiful is mostly the light and the picture (soft contact shade, bloom on
lamps and windows, a real sky and haze, sharp soft shadows, reflections, a film grade), then materials, then meshes.
That is why slice P1 now comes first.

Web game only (the no-Roblox rule stands): "highly realistic Roblox game" is the LOOK to hit, not a port.
Built in worktree `~/Documents/GitHub/tracklayer-realism` (branch `realism`, lands with
`git push origin realism:main`, gate/land with `TL_WT` set to it), one slice at a time, one builder per slice,
from a chat session. Log each slice in `loop/PROGRESS.md`. After a slice lands, the next is dispatched without asking.

## Status

| # | Part | State |
|---|---|---|
| R1 | The figure: body, clothes, head, hands, boots (walker, rider, every other person) + the look kit `tlx-look.js` | landed v265, reworked v267 (24 Nov 2026) |
| R2 | The sleds: every machine in `SLEDS`, parts, Santa's sled | landed v269 (25 Nov 2026) |
| P1 | The picture: a post chain (contact shade, bloom, grade), sky and haze, sky light on every material, shadows; an Ultra preset | landed v291 (26 Nov 2026) |
| R3 | Streets and roads: asphalt, kerbs, markings, snowbanks, lamps, signs, street furniture | after P1 |
| R4 | Houses and buildings: cladding, roofs, windows, doors, porches, foundations, snow on them; interiors | after R3 |
| R5 | Vehicles and props: trucks, cars, boats, trailers, crates, fuel pumps, quay | after R4 |
| R6 | Nature close up: trees, rocks, animals' coats | after R5 |
| R7 | The viewport, second pass: camera framing, HUD fit, what P1 left (reflections on wet road and ice, depth of field for stills, motion blur) | after R6 |
| R8 | The nitpick round: a full audit of every still set against the bar, fixing the worst 30 | after R7 |

## The bar

Where it was on 24 Nov (stills in `~/.hermes/cache/scratch/tlreal/base/`): every object is boxes and cylinders in
flat colours. The walker is a blue box torso on grey tube legs with a ball head and a black bar for goggles; the
sled is a yellow slab hood with box skis; houses are clean boxes with a plank stripe texture; streets are a black
ribbon with white blobs and white box kerbs.

Where it has to get: what the best realistic Roblox games look like (smooth mesh bodies and layered clothing,
PBR surfaces with normal and roughness detail, real proportions, worn and weathered materials, small parts that
make an object read as manufactured). Concretely, for every asset:

1. **No primitive reads as a primitive at 2.5 m.** No visible box, cylinder or ball that stands for a shaped part.
   Shapes come from lathes, extrusions with bevels, tubes along curves, lofted sections and subdivided rounded
   boxes; edges that are rounded in life are rounded.
2. **Real proportions.** Measure against the real thing (an adult is 7.5 heads tall, a utility sled is about
   3.2 m by 1.2 m, a kerb is 12 to 15 cm tall, a door 2.0 m by 0.9 m, cladding boards 12 to 15 cm).
3. **Every surface has a material, not a colour.** A base colour map with variation, a normal map and a roughness
   map, drawn on a canvas at load (no image files, no build step). Fabric has weave, leather has grain, plastic has
   moulding texture, rubber is matt, paint has orange peel and chips at edges, wood has grain along the board.
4. **Construction shows.** Seams, zips, cuffs, hems, stitching, laces, buckles; bolts, panel gaps, vents, decals,
   welds, hinges, handles, gaskets, drip edges, gutters, flashing.
5. **Wear and weather.** Snow in creases and on top faces, dirt low down, scuffs on edges, salt on the road, ice
   at the eaves. Never uniform.
6. **Lit like the rest of the world.** Everything takes the sun, the sky light and shadows; nothing glows at night
   (unlit things are driven from `updSky`); shiny parts mirror the sky cube.

Not required: a MetaHuman face. A simple, well shaped face (nose, brow, cheeks, chin, ears, mouth line, eyes) that
reads as a person at 1.5 m is the bar, and most of the time it is behind goggles and a collar.

## How each slice is built: the nitpick loop

Lemon's method. A slice is not done when it is built, it is done when the builder can no longer list defects
that a player would see.

1. **Before stills.** A turntable set of the slice's subject at 1280x720 with the pixel ratio forced to 1.5 (the
   headless auto preset drops to 0.7 and hides everything), noon clear, overcast, and night under a lamp. Sheet it.
2. **Build round 1.**
3. **Critique.** Shoot the same set. Look at the sheet AND at zoomed crops. Write down the ten worst things by
   name ("the knee is a visible ball joint", "the jacket hem ends in a hard ring", "the hood has no panel gap")
   against the six points of the bar. Be hard on it: compare with a photo-true mental image of the real thing.
4. **Fix those ten. Repeat 3 and 4 at least four times**, and stop only when a round's list has nothing a player
   would notice at 2.5 m. Keep each round's sheet and list (`~/.hermes/cache/scratch/tlreal/<slice>/roundN.jpg`
   and `roundN.md`).
5. **Check it in play**, not only on the turntable: in motion (gait strips, a ride, a crash), from the default
   chase camera, first person, at night, in a storm, on the low graphics preset and at the 640x360 itch size.
6. **Cost.** `renderer.info.render` calls and triangles and the frame time, before and after, in town and on the
   fell. A slice may not add more than 15 draw calls per figure or sled, or cost more than 1 ms a frame on this
   Mac; merge geometry per material, share materials and textures, and give the low preset a lighter version.

## Rules

- Nothing that works may break: every rig, pose, animation, IK chain, gear option, part option, collider, save
  key and scenario keeps working. The new meshes hang on the same bones and groups; where a part was found by
  child index (`hd.children[0]`), give it a name instead and fix the reader.
- The shared look kit is `tlx-look.js` (`TLXL`): canvas PBR texture makers, shape helpers, shared materials. It
  is loaded before `tracklayer.js` and owns no save state. Every slice adds to it rather than writing another
  noise function or another material in place.
- Textures are made once at load, cached by key, sized for the job (256 to 1024), with mipmaps and anisotropy.
  The load time added by a slice is measured and reported (budget: 150 ms a slice).
- Colours, liveries and gear choices the player has bought keep their identity: a red jacket is still red.
- All the standing rules of `loop/EXPANSION.md` apply (controls through `btn(action)`, an asserting scenario per
  slice, smoke and `x1_save` before landing, README for anything a player notices, `?v=` bumped).

## Slice notes

### R1. The figure

Every person in the game: the walker (`makeWalker`, `poseWalker`, `walkerLook`), the seated rider on the sled
(`rider` group near `V.rider`, `poseRider`), the pillion passengers and tourists, the crash body, villagers, staff,
the truck driver, anglers. First job: find every place a human is built, and make them all come from one body
kit so the hand-over between walker and rider never changes the person.

Body: tapered, slightly oval limb sections (thigh, calf, upper arm, forearm), a shaped torso (chest, waist,
hips, shoulders that slope), a neck, a head with a face, hands as insulated gloves with a separate thumb and a
finger block that curls on a grip, boots with a sole, heel, toe cap, laces and a cuff. Joints must not show as
balls or gaps at any pose in the gait, the seat or the swing (overlap the sections, or bridge them).

Clothes (a winter rider's): a shell jacket with a collar, a storm flap and zip, shoulder and elbow panels,
pockets, cuffs with tabs, a hem with a drawcord, reflective piping that only reflects (never glows); bib trousers
with knee panels and a boot gaiter; a helmet with a visor, a peak and vents, or the beanie with goggles on a
strap, or the balaclava, as `GS.own.gear.head` says; the pack. Fabric normal maps with weave and stitched seams;
snow dusting on shoulders and boots when it has been snowing.

#### R1 as built (24 Nov 2026, script v265)

`tlx-look.js` (`TLXL`) offers, for the next slices:
- Textures, cached by key, mipmapped, anisotropy from `TLXL.init(renderer)`: `TLXL.height(w,h)` height field with `.noise .weave .grain .bumps .seam .zip .ridge .panel .toNormal .toGray .toTone` (UV rectangles, v up); `TLXL.fabric(kind, {size, stamp, repeat, key})` for `shell fleece knit leather rubber plastic gloss skin lens` returns `{map, normalMap, roughnessMap}`; `TLXL.dressMat(mat, kind, opts)` puts them on a material and keeps its colour as the tint. Maps are neutral on purpose: recolouring a material still works. Use `size` 128 for small things, 256 for tiles, 512 only for an atlas with stamped seams.
- Shapes: `TLXL.loft(sections, {axis, seg, uv, a0, a1, inflate, roundTop, roundBottom, cap})` (elliptical sections along y or z; an arc range makes a trim patch that follows the surface), `rbox`, `ell`, `lathe`, `tube`, `xf` (transform in place), `mergeGeo`, `merge(items)`, `build(items, parent)` (one mesh per material, always a plain BufferGeometry).
- The figure kit `TLXL.fig`: `dress`, `kitFor(m)`, `torso pelvis thigh shin upper fore elbow kneePad band furCollar neck pack torsoPatch hand boot face liner helmet goggles beanie balaclava`. `makeWalker` / `makeFigure` / `buildHeadKit` / `limbKit` in tracklayer.js assemble them. Atlas layout for the jacket and trousers: torso `[0,.5,1,1]`, upper limb `[0,.25,.5,.5]`, lower limb `[.5,.25,1,.5]`.
- Numbers (machine calm): walker 40 -> 36 draw calls, 9.5k -> 20.0k triangles; rider 45 -> 34 calls, 6.3k -> 17.0k; lighter build 30 calls, 7.1k; textures 90 ms at load. Skeleton unchanged except the shoulder joint, 0.25 -> 0.21 from the spine (readers updated).
- Known remaining: walker arms hang straight in idle; fingers are blocks; beanie face is plain; rider arm reach (0.67 m) is longer than the walker's (0.49 m); the `icefish.js` angler is still the old box rig; everything outside the figure is untouched (R2 onward). Heated-glove band and heated visor strip keep their emissive LEDs on purpose (`userData.heater`).

#### R1b as built (24 Nov 2026, script v267): what changed after the reviewer pass

- `TLXL.smooth(table, n)` resamples a table of rows `[y, rx, rz, cz, n]` through a Catmull-Rom curve; `TLXL.loft` takes `mod(y, ringAngle)` (a radius multiplier: folds and bunching) and arc ranges must run low to high (`ar()` in the kit: a reversed range turns the patch inside out). `TLXL.fabric` takes `base` (map brightness): dark cloth uses 0.62 to 0.72 because the game's ACES grade lifts dark colours; cloth materials are roughness 1, metalness 0 or the low sun washes them grey from behind.
- Folds: `fold(cy, w, amp, side, freq, spread)` and `mods(...)` in the kit; patches laid on a folded surface (flaps, panels) must use the same `mod` and as many sections as the body, or they sink into it and show as ragged patches.
- Colour blocking: `TLXL.fig.sync()` derives the second-tone panels (`K.panel`, `K.pantsP`) and the beanie from `jacketMat`, `pantsMat` and `riderTrimMat`; `applySettings` calls it, so recolouring still drives everything. `r1_figure.mjs` asserts it with a red jacket.
- Goggles use `K.gog` (gradient map, metal, sky cube, so dimmed at night by `updSledEnv`); cheek and nose flush are `K.blush` discs. Boots: `F.boot(K, kind, ankH)` upper `K.bootA` (pac) or `K.bootB` (arctic), black rand/toe cap `K.sole`, tongue `K.boot`.
- Rider arms are the walker's arms at true size: `limbKit(items, L0*KS, ub, KS)`, `RIDER.upper = 0.25/RIDER_SCALE`, `RIDER.fore = 0.19/RIDER_SCALE`; the torso leans further to reach the bars and the elbow bends.
- Draw calls: shared one material for dark trim, foam, metal and lace so a figure stays near 48 calls (walker) and 46 (rider); `K.eye` doubles as laces and buckles. Triangles 22.1k walker, 19.7k rider; lite build 10.4k / 8.9k.
- `icefish.js` builds the angler from the kit (`TLXL.fig.K` must exist, else the old boxes show); the old box rig stays as the skeleton so the rod still follows `handR`.
- Debug trick that found the hem poke-through: a `THREE.Raycaster` from the still camera through a pixel, listing hits with material colour and distance (a tie between two meshes is z-fighting or poke-through).
- Known remaining: boots read as short and chunky; visor is opaque; slim side view; the pack is a box in profile; fingers are tubes; folds are low amplitude; the sled and everything else outside the figure is R2 onward.

### R2. The sleds

Ten machines in `SLEDS` (frontier 1970, woodsman 1979, ranger 1989, sprint 1994, summit 2004, trekker 2009,
apex 2015, matriarch 2026, aurora 2029, santa 1823), each built by `buildMachine(sd)` from `sd.shape`
(`hoodProfile`, `SEAT_PROFILES`, `SKI_PROFILES`), then dressed by `applyLoadout` with the 22 part categories in
`PART_ORDER`, liveries, decals (`SET.decal`), wear (`WEAR.apply`), snow on the sled, and the dash tablet.

What it looked like on 24 Nov (`base/a0_sheet.jpg` tiles 06 to 09): the Frontier's hood is an extruded yellow
slab with a flat face, a white disc for a headlight and three black bars for vents; the skis are white box
rails on a box spindle; the track is a black block with square notches; the tunnel and running boards are flat
plates; the seat is a black box; the bars are a tube with a box each end; the windshield is a flat sheet. Each
era must read as its era (a 1970 bubble-nose single headlight, a 1990s wedge, a 2015 mountain sled with a
narrow sharp hood, a 2029 electric), and as a real manufactured machine.

- **Hood and belly pan**: a lofted body with crowned sides, not an extrusion with flat flanks: section changes
  along the length, a shut line between hood and pan, a headlight bucket with a reflector, a lens and a bezel,
  louvred vents cut in (dark recess behind slats), a hood latch each side, a badge, livery stripes that follow
  the shape, a bumper tube round the nose on its brackets.
- **Windshield**: curved, tinted, with a thick edge and a rubber base trim; mirrors the sky cube.
- **Bars and controls**: bent tube bars with a riser, grips with flanges, a throttle lever, a brake lever with a
  master cylinder, a kill switch and tether post, bar pad on the sport sleds, a gauge pod (or the dash tablet
  where it is today: keep the tablet rules in the skill).
- **Seat**: a moulded vinyl cushion with stitched seams, a piped edge and a grab strap, on a seat base.
- **Tunnel and boards**: sheet aluminium with rolled edges, rivet lines, punched traction holes or serrated edge
  rails on the boards, a rear snow flap with a logo, a tail lamp with a lens, a rear bumper/grab bar tube.
- **Track and rear suspension**: a real belt: lugs in a pattern on the outside (per track part: trail, paddle,
  studded), drive windows, rails, bogie or idler wheels with hubs, a rear axle with idlers, shock and torsion
  springs visible through the side. The track must still animate (find how it moves today).
- **Front end**: skis with a real profile (keel, carbide runner, loop handle at the tip, a saddle and bolt),
  spindles, and the front suspension of the era: leaf springs (1970s), struts, or A-arms with coil-over shocks.
- **Engine bay glimpse / exhaust**: an exhaust outlet, a pull-start handle, a fuel cap, a coolant cap, cables.
- **Materials** (extend `tlx-look.js`): gel-coat or moulded plastic hood paint with a clear sheen and edge chips,
  brushed and cast aluminium, black textured plastic, vinyl with grain and stitching, rubber, tinted
  polycarbonate, lens glass with a fluted pattern, reflector chrome, decal sheets drawn on a canvas.
- **Every part option must still fit and show**: racks, tanks, cans, light bars, winch, hitch, guards, shields,
  the xc ski rack, cargo. Check each `PART_ORDER` category on at least three machines of different sizes.
- **Santa's Sled** is wood, brass, leather and paint: carved runners, a dash rail, upholstered bench, bells,
  harness leather. It gets the same care.
- The rider (R1) must still sit, grip the bars and plant boots on the boards on every machine: check
  `references/sled-geometry.md` numbers still hold, and shoot the seated rider on all ten.

#### R2 as built (25 Nov 2026, script v269, tlx-look.js v11)

`TLXL.sled` (end of `tlx-look.js`) is the sled kit. Everything returns `{g, m}` items for `TLXL.build` (one mesh per material); `buildMachine` in tracklayer.js passes each machine's `shape` numbers and the live livery materials (`SKCTX`) and keeps every `userData` field the rest of the game reads.
- `S.mats(ctx)`: the shared set `S.M` (alu, cast, steel, chrome, black, dark, rubber, belt, lug, stud, glass, tint, lamp, led, tail lenses with a drawn bulb and reflector rings, board with punched holes (alpha), dial, screen, brass, leather, paint red). The livery materials (`bodyMat`, `panelMat`, `sledTrimMat`, `V.seatMat`) are dressed in place, so recolouring and wear still work. Lens emissive follows `headlight.intensity` (set in `updSledEnv`), so lenses are dull by day. `S.texMs` is the texture time (about 45 to 60 ms).
- `S.hood(shape, H, HB, ctx)`: lofted hood, belly pan, recessed shut line, pinstripe, `decal.stripe/wide/flash` patches, firewall, lamp bucket per `shape.lamp` (bezel, reflector bowl, lens), intake, louvres, crown slots, latches, badge, bumper (hoop/bar/skid) and skid plate. `STYLE` sets plan taper, side squareness and nose cap per `shape.style`. The hood top is exactly `crownY + HB`, so `ud.hoodY`, the first-person block test and the tablet rules are unchanged. Helpers inside: `patch` (a band of the loft between two heights or widths), `frontZ`, `sideX`.
- `S.chassis`: tunnel (lofted, rivets), deck, tail, snow flap, tail lamp, grab bar, running boards (punched alpha holes, serrated rail, gussets), bogies, rack, spoiler, charge port, exhaust. `S.seat`: vinyl loft with stitched seams, piping, strap, grab rails. `S.ski(kind)`: swept ski, keel, spine, loop, saddle, spindle (leaf pack or strut). `S.front`: radius rods or A-arms with coil-over springs. `S.carbide`.
- `S.track`: the belt is path geometry (`aPath` = distance along the loop, height, lateral) moved by one uniform `TLXL.sled.beltU` in the vertex shader (`pathify` patches belt, lug and stud materials), so lugs really roll round the wheels. `updVisuals` adds distance to `V.beltU` and turns `V.wheelA/B`. `V.lugs` (stock), `V.paddles`, `V.hardpack`, `V.studs[0]` are separate meshes; belt meshes are `frustumCulled = false` (positions live in the shader; `sledCopy` copies that flag). Lug and wheel sizes assume the track group's x/z scale (trackW, trackLen).
- `S.bars` (bars, grips, levers, master cylinder, kill switch, guards, riser, mirrors), `S.shield`, `S.pod`, `S.column`, `S.parts` (cans, light bar, race/trail/turbo cans, rack box, deck, coil kits, clutch guard, scoops, and models for cool, grips, tether, tank pods, guard, survival, recovery, winch, receiver, hitch), `S.sleigh` (Santa: lacquered side boards, brass rails and bells, leather, tufting, sack, gifts).
- Low preset (`TLXL.lite`): fewer segments, 24.6k triangles instead of 39k.
- Numbers (frontier, sled meshes only, no rider): 135 -> 66 draw calls, 8.4k -> 39.1k triangles (lite 24.6k); ten machines 58-64 ms -> 157-188 ms to build; sled textures 45-60 ms; look kit total 88-94 -> 150-162 ms (same load, back to back).
- Lessons: `BufferGeometry.applyQuaternion` does not exist in r128 (use `applyMatrix4`); hand-built index winding must be checked against the outward normal (the belt first rendered inside-out); a lens set flush with the hood skin disappears (stand it 2 mm proud); an AABB of an AABB inflates under pitch (measure bounds in sled space with one matrix); big-load gate runs inflate every timing 5x (check `uptime` before trusting a budget assert).
- Known remaining: paint has no chips and only a name decal; the 1990s wedge hoods are softer than real sheet plastic; no cables or hoses on the bars; handguards are curved plates; chrome and alu read pale under the noon sky; the flap has no logo; no engine glimpse, pull-start or fuel cap; powder skis are the stock ski with a wider blade; the two-up seat piping wobbles; `r2_sleds` `buildMachines` and texture asserts are generous because the gate machine is shared. `g2_santa` (rareSpots()[0].q is null) and `x2_deckeverysled` (the sled never leaves the start) fail the same way on origin/main (not caused by R2).

### P1. The picture (audit of 26 Nov 2026, stills `~/.hermes/cache/scratch/tlreal/audit2/`)

What the stills show at v283, pixel ratio 1.5, noon / 19:30 / 22:30 in Kjøllefjord:
- **No contact shade anywhere.** Houses, kerbs, lamp posts, the chimney box and the sled meet the snow on a hard
  line with nothing under them; walls under the eaves are as bright as the open wall. Everything looks pasted on.
- **Lamps and lit windows do not glow.** A street lamp is a cream ball with a hard-edged pool on the ground; a lit
  window is a flat cream rectangle with no spill on the snow and no bloom. Night looks like a diagram.
- **The sky is a flat gradient** by day (no sun disc glow, no horizon haze band, clouds only as smudges), and the
  far hills end on a hard edge against it with no aerial perspective between town and fell.
- **Shade is one flat blue.** Snow in shadow and snow in sun differ by a hard edge only; no sky bounce, no
  warm/cool split, the shadow edge is jagged at 15 m (41_chase_noon).
- **Nothing but the sled mirrors the sky.** Window glass is a dark gradient, the wet road is matt, roof snow is a
  flat white plane with no sheen.
- **The picture is ungraded**: no gentle highlight roll-off on snow (large areas at flat #fff or flat pale blue),
  no vignette, no grain, hard aliasing on thin lines (wind turbine blades, road dashes far off).
- Asset problems seen in the same stills belong to later slices and are listed under R3 and R4 below.

What P1 builds (new file `tlx-post.js`, global `TLXP`, loaded before `tracklayer.js`; three r128, no build step, no
image files, so every pass is hand-written against `THREE.WebGLRenderTarget`):
1. **A post chain** the main frame goes through when on: scene to a HDR (half-float) multisampled target with a
   depth texture, then passes, then ONE final pass that does tone mapping (the same ACES curve and exposure
   `updSky` sets) and sRGB out. A render target skips the renderer's tone mapping (known from `gramShot`), so the
   final pass owns it and the scene's materials must render linear into the target. The interior scene
   (`INT.scene`), the ice-fishing pass (`FISH.render`), `gramShot`, the showroom and the title screen all still
   work: either they go through the chain or they keep the direct path, decided per case and tested.
2. **Contact shade**: screen-space ambient occlusion from the depth buffer (normals rebuilt from depth), half
   resolution, blurred with a depth-aware blur, applied to ambient light only as far as a post pass can (multiply,
   strength falling off in direct sun is not known in post, so keep it gentle: darkest 0.55), radius about 0.6 m in
   world space, faded out past 60 m. Must not band on flat snow or halo the sled against the sky.
3. **Bloom**: bright-pass on HDR values over 1, a 5-level downsample/upsample chain, so the sun glint on snow, lamp
   globes, lit windows, headlights, tail lamps, the aurora and the purple site light bleed softly. Lamp globes and
   lit windows get real HDR emissive values (driven from `updSky`, so nothing glows by day). Never a foggy overall
   glow: a white daylit snowfield must not bloom.
4. **Sky and haze**: a sun disc with a soft aureole and a horizon band whose colour follows the sun height (the
   existing sky dome is the base: improve it, do not replace its night, stars or aurora); aerial perspective that
   takes the sky's horizon colour, so the fell fades into the sky instead of ending on an edge; height fog low in
   the fjord at dawn and dusk.
5. **Sky light on everything**: the sky cube the sled already mirrors (`sledEnvCube`, repainted by
   `updSledEnv`) becomes the scene's environment light at a low strength for every standard material, with window
   glass, the road, roof snow and car paint getting more. Nothing may glow at night (the cube is already dimmed
   there; check it).
6. **Shadows**: softer and steadier sun shadows near the camera (a second, tight shadow cascade round the player
   or a texel-snapped camera, PCF with more taps), no shimmer when riding, no jagged edge at 15 m. Keep
   `shadowMap.autoUpdate = false` and the per-frame `needsUpdate` rule (see `references/rendering.md`).
7. **The grade**: highlight roll-off so sunlit snow keeps texture instead of clipping, a slight cool shade / warm
   sun split, gentle vignette, very fine grain, and FXAA or SMAA after tone mapping if the multisampled target is
   not enough for thin lines.
8. **An Ultra preset**: Settings > Graphics gets Ultra above High. Auto on a desktop picks Ultra only when the frame
   governor (`QG`) says there is room; phones and the low preset skip the chain entirely and look exactly as today.
   The governor drops bloom and contact shade before it drops the pixel ratio.

Asserts for `p1_picture.mjs`: chain on by default on high/ultra and off on low (and the low picture is pixel-near
today's); with the chain on, the mean luma and mean hue of a pinned noon frame are within 4 % of the direct path
with every effect at zero (the chain itself changes nothing); contact shade darkens the pixel at a wall foot by at
least 12 % and an open snow pixel by under 2 %; a lamp globe at night has a bloom halo (luma 12 px outside the
globe is at least 1.5x the luma 60 px out) and at noon has none; no pixel of a clear-noon snowfield frame is
bloomed (frame with bloom on vs off differs by under 1 % mean); `INT`, fishing, `gramShot`, the showroom and the
tablet still render (non-black, right size); frame cost on this Mac at 1280x720 pixel ratio 1.5: at most 2.5 ms
added with everything on, measured back to back in town and on the fell; resize, pixel-ratio change by the
governor and a GFX preset change at run time all keep the chain the right size.

#### P1 as built (26 Nov 2026, script v291)

`tlx-post.js`, global **`TLXPOST`** (`TLXP` is the police system's). Owns no save state. What it offers the next slices:
- `TLXPOST.render(scene, camera)` is what `frame()` calls for the main scene (false = the caller draws directly). `TLXPOST.on()`, `.setLevel(0|1)`, `.fx` (`ao bloom grade fxaa vig grain`, 0..1 each; all zero = a plain tone map that equals the direct path to 0.2 %), `.light({thr, knee, bloomK, hf, ...})` (updSky feeds bloom threshold/strength and the dawn/dusk height-fog amount), `.setAO(n)`, `.depthTex()` / `.sceneTex()` (resolved scene depth and HDR colour, valid after a frame: a later slice can add a pass such as reflections or depth of field), `.size`, `.stats`, `.dbg = 1` (view the contact-shade buffer), `.readAO()`.
- Pipeline: scene -> half-float 4x multisampled target with a depth texture (r128 resolves colour and depth on the blit) -> contact shade (half-res SSAO from depth, normals rebuilt from depth, 0.7 m radius, faded past 60 m, darkest 0.55, depth-aware blur and depth-aware upsample so there is no halo round the sled against the sky) -> bloom (bright pass, 5 down, 4 additive up) -> one composite (contact shade, bloom, cool-shade/warm-sun split, ACES with the exposure `updSky` sets, a roll-off of the last quarter of the curve, sRGB, fog, vignette, grain) -> FXAA -> canvas.
- **r128 facts that matter for any later pass**: materials tone-map inside their own shaders, also into render targets, so the chain sets `renderer.toneMapping = NoToneMapping` while it draws the scene (materials compile a Linear-encoding program for targets, separate from the canvas one) and restores ACES for every direct path. Fog is mixed AFTER tone mapping, so the chain sets `scene.fog = null` while drawing and redoes FogExp2 from depth in the composite (same curve and colour, display space); mixing it in linear light first made the far fell brighter and greyer. The sky dome is display-referred (no chunks): it writes alpha 0 into the target (`uChain`), and alpha 0 means "no curve, no sRGB" in the composite. Transparent decals blend in LINEAR light inside the chain, so the same opacity looks brighter than before (lamp pools needed x0.38). Anything with a custom shader that writes display values must write alpha 0 too.
- HDR values: lamp globes (`hdr` factor in `houseWinTick`), lit windows, canopy lights, sign glow, sled lamp and tail lenses are multiplied only while the chain is on (`TLXPOST.on()`), so the low preset and the direct paths look as before. Bloom threshold is 1.5 at night and 12 by day (the sky's sun disc is 24 in the chain); a daylit snowfield (<= 2.5) never reaches it.
- Sky light: `skyLightCube` (32 px, repainted by `updSledEnv` in coarse steps) is `scene.environment` while the chain is on, at 0.36 of the sled cube's light. Materials with their own `envMap` (sleds, helmets) keep the brighter sled cube. NOT done: stronger sky light on window glass, road, roof snow and car paint (set `envMap = sledEnvCube` + `envMapIntensity` on those materials when R3/R4/R5 rebuild them).
- Shadows: `snapSun()` moves the sun target in whole shadow-map texels in the light's plane (asserted). PCF stays r128's `PCFSoftShadowMap` (already a 5x5 bilinear block); no second cascade. Ultra uses a 4096 map.
- Presets: Settings > Graphics cycles auto, high, ultra, low. `GFX.chain` = any non-phone desktop; the chain is off on low (live, no reload). The governor (`QG`) has three new first rungs: all effects, no contact shade, no bloom (all at pixel ratio 1.5) before the pixel ratio falls. Auto picks Ultra while rung 0 holds a median frame of 10 ms or less (leaves it above 14 ms or any lower rung). `?chain=0` turns the chain off for a load, `?gfx=ultra` pins ultra.
- Not post-processed (direct path, as today): `INT.scene` interiors, `FISH.render()`, `gramShot` pictures. They still render right (asserted).

Numbers (this Mac, headless Chrome on Metal, machine load 6-9 from the other builder, 1280x720 pixel ratio 1.5, back to back with `gl.finish`, min of 4 runs): town off 3.6 ms, on 4.1 ms (+0.5); fell 3.0 -> 3.7 (+0.7); ultra about +1.3 in town; individual runs under heavier load scattered from -0.3 to +5 ms, so trust the min. Draw calls unchanged (622 town); the chain adds 14 full-screen passes. First chain frame (shader compile, once, on the title): about 470 ms. Mean luma of the 17 look stills before -> after: within 3 % (noon 127 -> 126, night 53 -> 54, the overview from above 163 -> 176 because the horizon haze and fjord fog are brighter).

Lessons: (1) a render target does not remove tone mapping in r128 - it keeps it in the material unless you switch the renderer's `toneMapping`; (2) check the fog order before moving to HDR; (3) the governor sheds effects by itself in a slow headless run (`QG.on = false` is not enough: call `QG.apply(0)`); (4) pixel reads via `gl.readPixels` use a bottom-left origin; (5) never set `GS.hour` with `+ 120*24` twice in one scenario (it drifts into June and the midnight sun); (6) bloom as an average needs a much larger strength than a sum, tune it on a lamp, not on a number.

Known remaining (see `~/.hermes/cache/scratch/tlreal/p1/round4.md`): contact shade is gentle in full sun; no cloud structure in the sky; shade snow is one flat blue; no window or lamp spill on the snow beyond the old decals; roof snow, road and car paint have no extra sheen; interiors are not post-processed.

### R3 roads: Lemon's order of 27 Nov overrides the road part of R3
"completely redo the road design, the roads themselves, re place them around the map, drop the curbs too, make the
roads look much nicer, you can make them look more worn down, but realistic is my main priority." So R3's roads are
not a re-skin: new routes over the whole map, new road mesh and surface, kerbs removed everywhere (plow banks and
gravel shoulders instead). He added: "I want the road model entirely replaces": the old road model is deleted and a
new one built from nothing, never re-skinned. Full wording and scope in `loop/OPEN.md`, build order 3a.

### R3 and R4: defects already seen in the 26 Nov audit (for their briefs)

Lemon, 26 Nov 2026, on the town: "can you fix the vewry shittily pla ced roads to be nice and actually look like a town?
there should not be a regular road of two lanes sittings nexyt to another clipped off half one lane". And on the sleds:
"i can see through the middle of the sled, you aren't really finishing these assets".

- Fixed the same day (v286): the half-width strip of asphalt and kerb that ran the whole length of Kaigata 5 m beside it
  (the 7 m depot yard lane was being cut by streets far past its own end, `townRoads` cuts), and the row of "holes" down
  the middle of every seat (a stitched seam stamped at 4 cm per stitch that mirrored the sky; solid geometry, checked by
  ray). Overhead stills before/after: `~/.hermes/cache/scratch/tlstreets/a0`, `a1`.
- **Still to do in R3, the layout itself (his "actually look like a town")**: seen from above Kjøllefjord is a bare
  rectangle of seven ruler-straight streets, 126 x 96 m, that all stop dead at the rectangle's edge. None of the three
  roads out of town (fv888 east, Dyfjord north, Lebesby south-west) joins a street as a road: their town legs are 3 m
  snow lanes that start at the depot and cut diagonally across house lots. The quay, the garage, the fuel station, the
  hospital, the church and the trailhead stand off the grid in open snow with no street to them. R3 must: bring each
  road out of town in as a real street that meets the grid at a proper junction (asphalt, kerbs, same width, the route's
  own town leg moved onto it); run a street to the quay and to every site that has a door; break the perfect rectangle
  (a main street that carries on through, side streets of different lengths, a bend or two following the shore and the
  slope); T-junctions with corner radii instead of square overlaps; no two parallel carriageways closer than a lot's
  depth; no street ending in a blunt cut (a turning head, or it fades to a plowed lane). Asserts: from every lit door and
  every site a walker reaches every road out of town on asphalt or plowed lane without crossing unplowed snow; no asphalt
  strip under 4 m wide and over 10 m long; no two asphalt centre lines run parallel within 12 m of each other for more
  than 10 m; every street end is a junction, a turning head or a road out. Judge from overhead stills as well as from the saddle.
- **Rule for every asset slice from now on (after the seat):** a slice is not done until each asset has been looked at
  from the game's own cameras (chase from behind and above, first person, on foot beside it) at full size, not only on
  a side-on turntable, and a ray grid through its silhouette finds no hole.

- Road surface is a black ribbon with a tiled pattern of round white blobs that repeats visibly (30_street,
  41_chase_noon); it should be worn asphalt showing through packed snow in wheel lanes, sanded, with a snow
  shoulder that feathers out instead of a ruler-straight edge. Centre dashes are bright yellow bars floating on it.
- Kerbs are white square beams with grey end caps, laid in straight segments that overlap at corners; parallel
  streets and their kerbs meet in a stack of box ends (41_chase_noon, centre). Road pieces meet at hard seams with a
  tone change between them.
- Lamp posts are a cone hat on a ball on a plain pole, the same pale colour as the snow.
- Houses: wall cladding is a stripe texture on a flat face with no board relief, no corner boards with depth, the
  white trim is flat strips; roofs are one flat white slab with a grey fascia, no snow thickness, no drift, no
  icicles, no gutter; windows are flat grey frames with a dark gradient pane; the chimney is an orange box
  standing on the ground beside the wall; foundations are a grey band; nothing is dirty or weathered.
- Depot shed: corrugated wall is a stripe texture; its roof is a flat slab.
- Hillside rocks are grey pebbles scattered evenly like litter; chimney smoke is a grey smudge sprite.

### R3 to R8

Written by the session before each is dispatched, from a fresh still audit of that subject.

## RD1 as built (27 Nov 2026, script v298): the new road model

Lemon's order: "completely redo the road design ... drop the curbs too ... make the roads look much nicer ... more worn
down, but realistic is my main priority" / "I want the road model entirely replaces" / "and as i said no more curbs".

**What was deleted.** `townRoads()` (the asphalt ribbon, 1.25 m kerb pieces + snow caps, storm-drain grates, junction
squares), `townRoadTex()` (128 px canvas, round white blobs), `CURB_H/CURB_W`, `crossesAt` and the curb-gap logic, the
`TOWNG.road` fields `curbPieces/gaps/gapPts/junctions/segs`, and `tlx-roads.js`'s pole mesh (a vertex-coloured cylinder).
The network roads never had a mesh at all: they were a plowed snow channel, poles and a bed cut into the 4 m ground grid,
so there was nothing to delete there, only a surface to build. `grep -i 'kerb\|curb'` over `tracklayer.js`, `tlx*.js`,
`icefish.js` finds no code (the scenario `rd1_roads` asserts it, comments stripped).

**What replaced it: `tlx-roadkit.js` (`TLXRK`), loaded before `tlx-roads.js`** (because `tlx-roads` adds the network's roads
in its `init` and `townRoads()` adds the streets after `initExpansion()`; the kit builds once, in `townRoads()`, so both sets
resolve junctions together; it is its own file so neither big file grows a road system).
- Geometry: a ribbon of 19 columns (crowned asphalt 6.2 m for the fylkesvei / 4.8 m for a village street, a gravel shoulder
  0.9 / 0.5 m that falls away, then the plow bank), rings every 2 m, chunks of 48 rings (96 m, own bounding sphere), draped on
  `surf()`: every column within 1.2-7 cm of the snow/ground surface, the centre height smoothed along the line, edge columns
  wobbled. The far terrain buries a plowed trench, so a vertex eases up to `farSurf` between 40 and 105 m (and 2.2 mm per metre
  for facet error). Re-draped lazily (one chunk a frame, nearest first, 350 m; one more every 4th frame beyond) when the melt
  moves (7 % steps) or a stretch's snow changes (`TLXR.touchKit` from `snowApply`). Boot: chunks within 220 m are made, the rest
  as the player nears them (all 282 at once cost 5.5 s).
- Junctions (`resolve()`): roads are ranked (kind, then length). A lower road is cut where it lies on a higher one, its end
  is projected onto the through road's edge line and flared on a corner radius (6 m fylkesvei, 4.5 m street: `R - sqrt(R^2 -
  (R-d)^2)`), the through road's shoulder, bank and edge line open in the mouth. A road that stops short of a higher one is
  carried on to its edge. Roads that run along each other (a shared trunk) are cut and taper. A free end gets a rounded turning place
  and its surface goes to gravel. 20 mouths, 10 tapers and 16 turning places at present.
- Surface: one `MeshStandardMaterial` + `onBeforeCompile`, everything per pixel from world and road-local (u across, s along)
  coordinates, no texture: aged grey asphalt with tone drift and aggregate grain, polished darker wheel paths (two per lane,
  wandering, oil between), alligator cracks (voronoi) mostly in the wheel paths, sealed long cracks, transverse cracks, patch
  repairs with a sealed border, frost-heave bump in the normal, faded and worn-away markings (yellow dashed centre, white edge
  lines 0.3 m in from the edge, only on the fylkesvei; Kaigata gets a faint centre line; side streets none), gravel and sand
  strewn toward the edges, a broken irregular edge. Winter on top: packed snow and ice over the carriageway with bare wheel tracks,
  a ridge between and at the edges, grit, dirty plow banks (dirty on the road side, clean outward), ice where the tracks are
  bare (roughness 0.16, so the sky light and the headlight give a sheen). A snowed-in stretch is discarded in the shader so plain snow
  shows. Every layer fades to its mean with the pixel footprint (`fwidth`), so no moire. Opaque pass with `alphaToCoverage`
  (the MSAA target): real alpha blending of the road cost 0.8-1.2 ms in town.
- Snow state: `aRd.z` per vertex = the stretch's snow (0 plowed .. 1 snowed in) read from `rt.st.s`; the fell road is built
  with 1 (shows only in summer); town streets 0.28. Seasons: `uWinter` (1 - sst(0.02, 0.6, MELT.k)) drives snow cover, banks
  (geometry too) and the far lift; `uWet` from `MELT.wet` and rain in summer wets the asphalt.
- Poles: `TLXRK.poles` (Statens vegvesen h111 and R610: pairs, up to ~50 m apart on a straight and ~25 m in a bend under R 300,
  red plastic, a white reflector field from 1.0 m up, here 14 cm instead of 10 so it reads). The field glows from `RK.head` (the
  sled's headlight position/direction, updated each frame by `headTick`), tuned for the camera behind the sled.
- Lamps: the street lamps stand on the gravel shoulder (65 cm off the asphalt edge) and the junction lamps just outside the
  corner radius. Nothing else expected a kerb: no collider, heap or driveway read one (`x4_streetheap`, `x4_streetjoin`, `g1_lanes` pass).
- Low preset / phones (`GFX.low || GFX.phone`): same geometry, `RK_LOW`: no voronoi cracks, no bump normal.
- Hooks: `TLXRK.roads` (each with `.spans`, `.chunks`, `.meta`), `TLXRK.probe(id)` (centre and edge columns of every ring),
  `.covered(x, z)`, `.fillAll()` (tests; the game fills a few chunks a frame), `.touch(id, s0, s1)`, `.stats`, `TLXR.rk`
  (road id, route, offset), `TOWNG.road = { ids, lines, meshes, roads, kit }`.
- Tests: `rd1_roads` (asserts), `rd1_stills` (before/after stills: `tlroads/before` and `tlroads/r1..r8`), `rd1_perf`, `rd1_overhead`
  (the plan stills + `plan.json`). Existing scenarios edited: `x_townroads` (its kerb and kerb-gap asserts replaced by no-kerb,
  carriageway-on-surf and spur-mouth asserts; "curb" wording in the ride checks), `p1_picture` (`BASE_LOW` 128.0 -> 146.6: the
  pinned frame looks down a street and the black ribbon became grey asphalt; nothing in the chain changed).

**Not done / still wrong** (the ten worst of the last critique round, `tlroads/r7`, `r8`):
1. The streets are still the 126 x 96 m ruler rectangle; the four corners are rounded stubs. (RD plan.)
2. The routes were not moved: hairpin stacks near Kjøllefjord, roads ending in a village centre. (RD plan.)
3. Four parallel wheel tracks everywhere; no lane changes, no braking marks, no oil on the shoulder, no manhole covers or drains.
4. The plow bank is a uniform white ridge with no throw marks and no gap at driveways; at 40-90 m the far lift makes it grow a little.
5. Ice sheen is only visible under the headlight and a low sun; at noon the bare tracks read matte dark.
6. Reflectors are 1-2 px beyond 60 m; their glow is verified only in the shader and at night in one still.
7. The near snow beside a bank is the terrain shader's pebble-dash; the closed fell road is invisible in winter by design (no hump).
8. Driveways and yard lanes have no surface (plowed lanes only); village-street ends fade into snow with no parking bay.
9. Summer: the terrain beside the road is the low-poly checker (not the road's); the first 10 s after a teleport can show a
   chunk or two unfilled (hidden) beyond 350 m.
10. Measured frame cost is noisy on this machine under other sessions' load: see the measured numbers in PROGRESS.

## RD1b as built (27 Nov 2026, script v303, tlx-roadkit v2): the supervisor's defects on RD1

Fixed on top of RD1, same model (no kerb, no re-skin). What each item turned out to be:
1. **Junctions are one surface now.** A *node* is where two roads cross, or where a road that stops short of another is carried on
   to its centre line (`findNodes`; roads within 9 m of an existing node are not new nodes, a road that would join 8-11 m beside
   one joins it as another arm). Every road through the node is cut back to the end of its arm (where the fillets are tangent to its
   edges, + 0.6 m) and ONE patch mesh fills the gap (`buildPatch` / `fillPatch`): the asphalt out to an outline of each arm's
   straight edge and a circular fillet between neighbouring arms (R 4.5 m streets, 6 m fylkesvei, 4 m lanes), then the gravel
   shoulder and plow bank wrapped round the outline. The patch copies the 19 end-ring vertices of every arm (position, normal and all
   attributes), so there is no crack, no overlap and no tone step; fillets are solved from the arms' REAL end rings (the roads
   bend), not from straight lines through the node. Shader: every road-local feature (wheel paths, cracks, seals, patches, centre
   ridge, edge wobble, markings) fades to 10 % over the last 7 m of an arm (`joint`, `jf` / `jc`), the patch keeps only
   world-space tone and wheel wear that follows each corner's turning arc (per-vertex arc centre, radius, tangent directions in
   `aPa` / `aPb`; the patch has its own material, `RK_PATCH`), grit darkens the snow near a junction. A node beside a
   shared-trunk run (two roads along each other) gets no patch and keeps RD1's cut / abut / taper. Four grid corners (two street
   ends meeting in an L) are still two rounded stubs, not a patch. Asserted in `rd1_roads` D: exactly one road triangle under
   every one of 6885 sample points of the junction asphalt, one under 9173 of 9180 on the shoulder and bank; L: the colour step
   across each arm end is no bigger than between two plain windows on a plain street (measured in the same still, shadows off).
2. **Street edges wander** like the open road's: asphalt width (low-frequency, +-0.3 of the half width plus a faster wobble), shoulder
   width 0.5-1.7 times nominal, the plow bank's outer edge +-1 m, snow lapping over the asphalt edge in places (`lapN`) and the
   edge wobble in the shader (3 octaves). All settle to nominal width in a junction. Street ends keep RD1's rounded turning place.
   Asserted in I (sd of the asphalt width and of the bank edge along each street vs the open road).
3. **The dotted stipple was `alphaToCoverage` on a soft alpha**: the shoulder and bank faded out with a smooth alpha, and the MSAA
   target turns a mid alpha into its fixed, regular sample mask: a screen of dots, worst on the overhead and the chase. Fix: the
   fade is a crisp, irregular outline (`rkCrisp`: coverage = smoothstep of (smooth coverage + a 3-octave world noise), one pixel of
   anti-aliasing from `fwidth`), nothing is ever a soft alpha. Coverage is computed FIRST and a fragment that is not road is
   discarded before any of the surface is made (cheaper too). Still shows nothing but edge anti-aliasing from 2 m to 300 m
   (`tlroads/rd1b/strip/sheet_*.jpg`, 3 frames of a moving sled).
4. **Poles**: 3 cm fibreglass sticks, 2.3 m, orange-red, one 17 cm reflective band 45 cm below the top (they were 5 cm posts with the
   band at 1 m). A pole is never thinner than 1 pixel and its band never shorter than 2.6 pixels (vertex shader, `uVh`, `uBC`), so
   a pole is visible out to 300 m by day and its band is a lit dot out to ~150 m at night: retro-reflection (`pow(dot(camDir,
   lightDir), 10)`) gated by the headlight's own cone (`uHCos` from its angle), 8.0 / (1 + d^2 * 0.00003). Asserted in J from stills:
   band contrast 1.8x at 36 m and 2.1x at 113 m in the beam, 1.03-1.06 with the sled turned away (full-moon night).
5. **Snow on the street**: wheel tracks wander in two octaves and drift together and apart (`wom`), the centre ridge breaks up
   (`ridgeB`), snow-brown slush at the road side of the bank, dark glazed ice patches with a sheen (`iceP`, roughness 0.13), grit
   near junctions, a real centre line on the fylkesvei (see "the comment that ate two assignments" below).
6. **Lamps and driveways**: lamps are no longer built in `townBlocks()`: it queues them (`lampQ`) and `townRoads()` builds them once
   the kit knows where the asphalt is (`TLXRK.onRoad`): a lamp on asphalt (a street's end bulb, a junction) moves out 0.5 m at a time.
   Street lamps stand 1.15 m off the nominal edge, junction lamps inside the fillet. Each house's door mouth opens the street's plow
   bank (`mouths` in `TLXRK.add`, 25 driveways: bank beside a mouth 0.07 m, elsewhere 0.3 m). Asserted in K.
7. **Tests**: `ui_responsive` foot embed640 failed from 4b441bc (v295, a longer hint beside a truck; the 12 px side padding was
   outside `max-width` in a `content-box`): fixed by someone else's v300 (9cdeb23), not the road kit. `p1_picture` "fell added cost": NOT the
   road kit either: the same test printed +8.88 ms on d9f6848 (before any road kit) and +0.85 / +1.5 / +1.26 ms on v298 and on this tree:
   it measured the chain while the world was still streaming in after the teleport (draw calls 253 vs 833 vs 1239 on the same view);
   the scenario now waits until the draw-call count holds still (`settle`). `rd1_roads` E and `x3_roads` A: three runs each, all
   passed; the 3.5 s boot was load (13-24): boot is 0.88-0.89 s without the kit (d9f6848), 0.98-1.02 s with it (v298 and now).

**A bug found on the way**: RD1's `fill()` wrote `fx[v*4+2] = ring.cm; fx[v*4+3] = K.sh;` after a `//` comment on the same line, so
the centre-line mask and the shoulder width were never set (no centre line anywhere, shoulder width 0). Mid-line `//` in a one-line
statement swallows what follows: use `/* */`.

**Cost** (`rd1_perf`, GPU timer, p10 of 5 reads, load 6-9 so +-1 ms): the kit costs about 0.0-0.6 ms in the town view and 0.0-0.8 ms on
the open road (it was 0.8 in RD1); the early discard of non-road fragments is what the fell gained. Not measured on an idle machine.

**Still wrong after RD1b** (the ten worst of round 3, `tlroads/rd1b/r3`):
1. The four grid corners are two overlapping rounded stubs, not a corner patch; the grid is still the 126 x 96 m rectangle.
2. The routes are unmoved (RD2-RD8).
3. Wear arcs are visible only on a close look; no braking marks, oil, manholes or drains.
4. The plow bank is one wandering white ridge: no throw marks, no windrows across the junction corner.
5. Driveways have no surface of their own (plowed lanes; only the bank opens).
6. The wheel-track pairs are still parallel on a straight (they merge and drift, but there is no lane change).
7. Reflectors are 3 pixels at 150 m and nothing at 300 m at night; poles stand in pairs only.
8. Summer: the terrain beside the road is the low-poly checker.
9. Shared-trunk runs (two roads side by side) still use RD1's taper, and two crossings of fv888 and skjanes at a shallow angle have no patch.
10. Ice sheen shows only under the headlight and a low sun.

## RD plan: roads re-placed (design only; no route was moved in RD1)

**What I looked at.** Overhead stills of Kjøllefjord, Mehamn, Gamvik, Dyfjord, Lebesby and four stretches (fv888 mid, the
Lebesby road's switchbacks, Skjånes, the Lebesby bend), at noon in March, shot with the new surface so the routes read:
`~/.hermes/cache/scratch/tlroads/plan/` (`place_*_wide.jpg`, `place_*_close.jpg`, `stretch_*`, and `plan.json` with the numbers
below). References: `web_search` gives text only, so I did not see photographs; the facts come from Statens vegvesen's handbooks (h111,
R610, N302: red plastic snow poles in pairs ~50 m apart, ~25 m in bends, reflector 1 m up, yellow centre line, edge line 0.25 m inside the
asphalt edge), Wikipedia and travel guides on fv888 (101.8 km, opened 1989, 346 m max, "fully paved", ~60-100 closures a winter, convoys
Bekkarfjord-Hopseidet, the Nordkyn junction where fv894 splits left to Kjøllefjord, right to Mehamn; fv894 Rundvannet-Kjøllefjord 22.4 km;
AADT 125-225) and my own picture of a Finnmark county road: narrow, grey chip-sealed asphalt, no kerb, gravel edge, steep plow banks.

**Today, per road** (grade = 30 m windows along the route; `TLXR.grades`):
| route | runs from / to | length | grade p50 / p95 / max | what is wrong |
|---|---|---|---|---|
| fv888 | depot (quay) -> station -> wind farm -> Mehamn | 5219 m (x1.54 the straight line) | 5.5 / 10.7 / 15.2 % | leaves Kjøllefjord by a street leg that starts at the depot, cuts across lots to a ring point; climbs in a switchback stack right behind the town, then a long contour-hugging wander (x1.54 over the straight line); ends at Mehamn's ring |
| gamvik | Mehamn -> Gamvik -> Slettnes | 2481 m | 0.8 / 3.2 / 4.6 % | the road runs through the middle of the Gamvik lot rectangle with no streets, houses off to the side |
| dyfjord | depot -> Dyfjord | 2008 m | 2.4 / 7.4 / 8 % | arrives from the SE and stops dead in the village centre; the village has 4 doors and no street |
| skjanes | wind farm -> Skjånes | 5775 m | 2.4 / 5.5 / 14.5 % | a branch off nothing: starts at the wind farm's ring, not at a junction on fv888 |
| lebesby | depot -> station -> Lebesby | 4126 m | 4.4 / 9.4 / 10.3 % | a stack of about six hairpin loops on one hillside within 400 m of Kjøllefjord (the bulbs of `bulbs()`; counted from the still); then follows the shore; ends in the village centre |
| ifjordfjellet | Lebesby -> Ifjord (closed in winter) | 5980 m | 4.7 / 10.5 / 32.5 % | a 32 % wall near Ifjord |
**Today, per village:** Kjøllefjord: 7 streets in a 126 x 96 m ruler rectangle (Nygata z-36, Kaigata z+12, Fjellveien z+60; Skolegata x-42,
Depotgata x+2, Kirkegata x+48, Storgata x+84, depot-relative), 28 doors on lot rows 21 m back to back round alleys, every street ends
dead at the rectangle's edge (RD1 rounded the four corners only). The three roads out enter by 3 m plowed lanes from the depot, not
by a street. The quay (the depot site is the quay: sea 90 m west) has no street, Kaigata stops 8 m past Skolegata; the garage,
fuel station (st_kjollefjord, 120 m east), hospital (H pad south of the grid), church (south of Fjellveien, "at the south end of the shore street" in `townBlocks`) and the
trailhead (sled country, east edge) stand off the grid in snow with no street. Mehamn (8 doors, no sea within 400 m: the village is inland, the real one is on the shore), Gamvik (5 doors, sea 110 m north), Dyfjord (4 doors, sea 120 m west), Lebesby (6 doors, sea 160 m
west), Skjånes (3), Ifjord (3): each is a small rectangle of lots a road cuts through or ends in; the snow field shows the village's
loaded patch as a visible rectangle of lighter snow from the air (a snow-chunk edge, not a road problem, noted for R6).

**Principles for the new layout** (Norway, Finnmark): a county road is one carriageway that follows the shore on the landward side or
the valley floor, side-hill cut rather than straight up, never over ~8-9 % except a short hairpin at 10-12 % (the game's A* penalises
over 11 %); hairpins are a last resort and are spaced; a village is a main street along the shore with the road coming in as that
street, short side streets running back from it (1-3 per village), driveways to every door; every door is on a street or a driveway;
junctions are T's at near-right angles with corner radii (RD1's kit already makes them from any two lines); a road ends in a turning place
or at a quay, never in a snow dead end; the Nordkyn junction (fv894 left to Kjøllefjord, fv888 right to Mehamn) is a real three-way
junction on the trunk, not three routes starting at the depot.

**Where each should run** (targets for the builders; positions are map metres, depot = (-1300, -385)):
- *Kjøllefjord*: a shore street (Kaigata) along the real shoreline, 20-30 m inland, from the quay (x about -1390) east to the station,
  curving with the coast; Storgata becomes the entry from fv888 (arrives from the east / north-east at the station junction, passes
  the fuel station and meets Kaigata at a T); a second entry from the south-west along the shore for the Lebesby road (Strandveien)
  and one from the north for the Dyfjord road; 3-4 side streets running back up the slope, different lengths (60-110 m), one bend
  each, none longer than 120 m, none parallel closer than a lot's depth; a street to the quay (the quay is the street's west end,
  with a turning place on the pier root), one to the garage forecourt, the hospital, the church and the trailhead (ends in its sled
  park). The 126 x 96 m rectangle is dissolved: lots re-cut along the new streets (RD=21 m rows no longer assumed); every door gets
  a 4-12 m driveway off a street.
- *fv888 east of Kjøllefjord*: leave by the station, climb the first 200 m of the slope on one long switchback-free side-hill cut
  (target 7-8 %), keep to the valley floor to the wind farm, then the coastal contour to Mehamn; shorten the x1.54 detour to under x1.3.
  Skjånes branches at a real T junction on fv888 at the wind farm.
- *Dyfjord road*: from Kjøllefjord's north entry along the shore (the sea is 120 m west of Dyfjord) and enter as the main street from the
  south-east, one side street back; end at the quay.
- *Lebesby road*: replace the loop stack by one or two honest hairpins spaced 120 m or more, or better follow the shore line round the
  headland (the sea is the south boundary of the stack); enter Lebesby as its main street from the north-east with the closed
  Ifjordfjellet road leaving at a T, the boom gate on it, and the 32 % wall replaced by a switchbacked climb.
- *Mehamn, Gamvik, Skjånes, Ifjord*: main street = the through road (Gamvik: bend the road so it runs along the shore, houses on the
  landward side with driveways, one side street), Mehamn moves its houses' street plan to the shore side (a quay street) or
  the village is left on its hill with a proper main street and two side streets; Skjånes and Ifjord get one street each.

**Systems each move touches** (all must keep working; none is changed by RD1):
`TLXR` routes and `R.routes[*].segs/pts/len/ends` (the map chart, `R.trip` graph anchored on `ROADS.routes[].via` waypoints and
`ROADS.node/anchor/reach`), road snow state saved as `x.sys.roads.r[id].s[stretch]` + `t[]` (stretches are 400 m of route, so a new route
length pads/trims: `snowInit` already tolerates it; the plow position `p` is metres along the route and resets), `bed()` (the road bed
cut into the 4 m ground grid, `cutMax` 8 m, trees cleared with it), `addLane`/YARDS plowed ground for each route, village `streets(W)`
lanes to every lit door and `buildLanes` spurs (`TOWNL`), `KIT.doors`, house lots in `townBlocks()` (rows at `RD = 21`, `D.grid`),
`LOTS`/public yards for plow contracts (`tlx-plow.js LOT.street`, `townStreetNear`), the convoy barriers (`convoy: [names]` at the
route ends: Kjøllefjord-Mehamn, Kjøllefjord-Lebesby, `tlx-convoy.js`), traffic lanes (`TLXT.lanePt`, 6 cars bubble-placed on routes),
semis, the plow trucks' stretches (`R.plowSeg`), parked cars (`tlx-cars.js` keeps clear of `townStreetNear`), stations (`@st_*`
waypoints fixed in `STATIONS`), jobs and delivery targets (`SITES` and doors), the ferry quay (depot site), people's homes
(`TLXN.homes` from `KIT.doors`), houses' mailboxes (`HW + 0.9`), lamps, snow poles, the Map and minimap chart (`paintMap`), and
tests that pin lengths/ratios (`x3_roads` A: boot cost < 2500 ms and `len/straight` ratios, `x3_roadsnow`, `x3_traffic`, `x4_bladeroad`,
`g1_lanes`, `g1_towngrid_*`, `g1_townlots`, `x4_streetjoin`).

**Slices** (each one builder, one session; an asserting scenario each; routes only move from RD2):
- **RD2 Terrain-honest router.** New A* cost in `tlx-roads.js`: prefer the landward side of the shore (a bonus 30-120 m from the sea),
  penalise cross-slope not only grade, valley-floor bonus, hairpin penalty, 8 % target; keep the old router as `ROADS.old` for a
  switch; no route changes yet; stills of the candidate lines overlaid (`rd2_routes.mjs`) and numbers per route (detour ratio, grade
  p95, hairpin count). Touches: tlx-roads only. Done when every route's candidate is under x1.3, p95 <= 9 %, <= 2 hairpins.
- **RD3 Kjøllefjord's street plan.** New `TOWNG` lines (curved, `townBlocks()` lots follow them), shore street, quay street, streets to
  the garage, station, hospital, church, trailhead; the three roads enter as streets; driveways as `lane` roads in the kit. Touches
  townBlocks, buildLanes, lamps, KIT.doors, tlx-cars spots, tlx-plow lots, tests `g1_towngrid_*`, `x_townroads`, `rd1_roads`.
- **RD4 Entering Kjøllefjord from the three roads**: the route ends become the street junctions of RD3; the station junction;
  the convoy barrier positions. Touches tlx-roads `ring()`, tlx-convoy.
- **RD5 The trunk and the junctions**: fv888/fv894 Nordkyn junction, Skjånes as a T off fv888, shared trunk with branching instead of
  side-by-side routes; the kit's `resolve()` gets an explicit junction list. Touches tlx-roads `build`, `R.trip`, traffic lanes.
- **RD6 Villages**: Mehamn, Gamvik, Dyfjord, Lebesby, Skjånes, Ifjord: main street + side streets + driveways, every door on a street or
  a driveway, `streets(W)` rewritten, each with its quay street where it has one. Touches `streets()`, lots/doors, TLXN homes.
- **RD7 Hairpins and grades**: the Lebesby stack, the 32 % Ifjordfjellet wall, `bed()` for the new lines; road snow stretch re-index.
- **RD8 Follow-through**: traffic lane tables, plow contract stretch names and saves migration test (old saves with the old route ids and stretch counts), the chart, minimap, the
  Roads legend, README; `x3_*` pins re-measured.

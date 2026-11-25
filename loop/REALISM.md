# The realistic look (goal G8): every asset, street, house, figure and sled

Lemon, 24 Nov 2026: "go through tracklayers assets, roads, viewport, character, every bit of it and make it more
like a highly realistic roblox game ... it doesn't need metahuman, just realistic clothes, streets, houses,
character, body and sleds ... you could manage that by slowly nitpicking yourself".

Web game only (the no-Roblox rule stands): "highly realistic Roblox game" is the LOOK to hit, not a port.
Built in worktree `~/Documents/GitHub/tracklayer-realism` (branch `realism`, lands with
`git push origin realism:main`, gate/land with `TL_WT` set to it), one slice at a time, one builder per slice,
from a chat session. Log each slice in `loop/PROGRESS.md`. After a slice lands, the next is dispatched without asking.

## Status

| # | Part | State |
|---|---|---|
| R1 | The figure: body, clothes, head, hands, boots (walker, rider, every other person) + the look kit `tlx-look.js` | landed v265, reworked v267 (24 Nov 2026) |
| R2 | The sleds: every machine in `SLEDS`, parts, Santa's sled | next |
| R3 | Streets and roads: asphalt, kerbs, markings, snowbanks, lamps, signs, street furniture | after R2 |
| R4 | Houses and buildings: cladding, roofs, windows, doors, porches, foundations, snow on them; interiors | after R3 |
| R5 | Vehicles and props: trucks, cars, boats, trailers, crates, fuel pumps, quay | after R4 |
| R6 | Nature close up: trees, rocks, animals' coats | after R5 |
| R7 | The viewport: camera framing, image sharpness, sky light on every material, contact shade, grade, HUD fit | after R6 |
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

### R3 to R8

Written by the session before each is dispatched, from a fresh still audit of that subject.

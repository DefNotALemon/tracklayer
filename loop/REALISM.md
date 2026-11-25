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
| R1 | The figure: body, clothes, head, hands, boots (walker, rider, every other person) + the look kit `tlx-look.js` | next |
| R2 | The sleds: every machine in `SLEDS`, parts, Santa's sled | after R1 |
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

### R2 to R8

Written by the session before each is dispatched, from a fresh still audit of that subject.

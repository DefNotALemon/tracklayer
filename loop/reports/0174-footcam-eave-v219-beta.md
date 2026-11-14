# 0174 — on-foot camera beside buildings (beta 0165 #4 fix, v219) — main @ 96eb49f
Scenarios: `x3_footcam_eave.mjs` (builder's, rerun), new `x3_footcam_sky_yaws.mjs`. Keyboard only, night (GS.hour 46), weather pinned. Sheet: `~/.hermes/cache/scratch/tlloop/reports/0174.jpg`.

## Findings
1. [Verified] Builder's `x3_footcam_eave`: 79 spots (every site building + garage + hospital, 4 faces each), 0 fail, camera always 0.35 m outside the eave line, first ray hit from camera to chest is the walker every time, no page errors.
2. [Verified, closes 0165 #4 for the reported symptom] The symptom itself, not the builder's proxy: Sandfjorddalen door at 2, 5 and 9 m out, 8 yaws each (24 stills). Camera position/quaternion finite in all; top-third of every still has detail (luma std 20-70, never the flat `c4d3e2` clear colour); no frame shows sky-blank. Lowest contrast is d9 yaw 4 (std 20), a dark ridge against dark sky, looks right.
3. [Verified] Holding W for 5 s from 6 m straight at the cabin wall: walker stops at the wall, camera outside (3.5 m up), view normal. No door auto-entry fired by walking at the wall.
4. [POLISH] On-foot camera height above ground ranges 2.3-3.6 m over the 24 spots (varies with yaw and slope), higher than the ~2 m the eave scenario sees beside walls. Not wrong, but the walker reads small in some views (see sheet). Low priority.

## Verified since last time
0165 #4 (grey-blue frame facing east at the cabin door) is fixed on v219 by the wall-box change; no regression in my yaw sweep. Not covered: pad and touch (camera code isn't input-dependent), interiors' own camera.

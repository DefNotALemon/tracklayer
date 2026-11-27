# 0368 — I6 the Camera (v290), break pass (G4/I6) — main @ 2f36b75
Scenario: tools/playtest/scenarios/i6_camera_break_beta.mjs (new)   Shots: ~/.hermes/cache/scratch/tlloop/reports/0368.jpg

Builder's i6_camera.mjs re-run: all passed, no page errors. Break scenario: all passed, no page errors.

## Findings (most important first)
1. [I6][POLISH] The reticle's live label and the score of the shot disagree. Night still: label reads "The view ★☆☆☆☆ 16", the shot taken seconds later in the same aim scored 4 (storm shot 3). If 16 is a prediction before the pose/light terms it should say so, or match. Suggest the label call the same scorer `shoot()` uses.
2. [I6][POLISH] Rapid shutter spam (12 `shoot()` calls in 162 ms) kept 1 picture: a cooldown exists, fine, but there is no feedback (no toast/flash) on a refused press that I could see. Suggest a brief "wait" hint on the reticle.
3. [I6][POLISH] With the camera up, a crash (20 m/s eject) keeps the camera on and the pose finite, but the toast banner and speedo overlay the frame (crash still). Acceptable; consider hiding toasts while the frame is up.
4. [I6][info] Camera is dropped, not kept, by: opening the garage (cam off, HUD hidden, no shot through the panel), opening Settings then K (stays off), reload (flag and overlay agree, off). Tablet toggled first then K: camera on and tablet closed. All sensible.

## Verified since last time
- Camera v290: Q mount and dismount with the camera up (eye 1.58 m on foot, swing completes, no stuck MNT/DMT); crash with camera up (no NaN, no err); night and storm shots produce a picture (4015 / 3699 bytes); roll cap holds.

## Not covered
- Old-save load without `x.camera`: my save read from localStorage failed (key lookup), so unverified here; x1_save covers old saves. Real touch device, truck cab.

// I6 the Camera, break pass: camera up through crash, mount/dismount, garage, tablet, night, reload, spam, storm.
import { boot, ev, sleep, done, reload, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 400)); } };
const SETUP = `tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; GS.stormPhase = "calm"; GS.warned = false; GS.warmth = 100; GS.fuel = GS.cap; TLX.setOn("police", false); TLX.setOn("traffic", false); true`;
const key = c => ev(`window.dispatchEvent(new KeyboardEvent("keydown", { code: "${c}", bubbles: true })); window.dispatchEvent(new KeyboardEvent("keyup", { code: "${c}", bubbles: true })); true`);
await boot(); await ev(SETUP); await sleep(1200);
await ev(`(() => { GS.hour = 100 * 24 + 12; const W = TLX.api.world; let sx = 0, sz = 0; for (let r = 400; r < 3000 && !sx; r += 150) for (let a = 0; a < 6.28; a += 0.5) { const x = W.depot.x + Math.cos(a) * r, z = W.depot.z + Math.sin(a) * r; if (!W.isSea(x, z) && !W.isWater(x, z) && W.slopeAt(x, z, 6) < 0.12 && !W.obNear(x, z, 30)) { sx = x; sz = z; break; } } FOOT.on = false; P.x = sx; P.z = sz; P.yaw = 0; P.vx = P.vz = 0; })(); true`);
await sleep(600);
const errs = () => ev(`TLXCAM.err || ""`);
await section("A crash with the camera up", async () => {
  await key("KeyK"); await sleep(400); ok(await ev(`TLXCAM.on`), "up");
  await ev(`P.vz = 20; crashEject("test", 0, 1, 20, null); true`); await sleep(1500);
  const a = await J(`({ on: TLXCAM.on, crash: CRASH.on, nan: !isFinite(TLX.api.camera.position.x + TLX.api.camera.position.y + TLX.api.camera.quaternion.x) })`);
  ok(!a.nan, "camera pose finite in a crash " + JSON.stringify(a)); await shot("crash", 80);
  await ev(`crashCancel(); true`); await sleep(500); ok(!(await errs()), "no err after crash: " + await errs());
});
await section("B mount/dismount with camera up", async () => {
  await ev(`TLXCAM.on || TLXCAM.open(); true`); await key("KeyQ"); await sleep(4500);
  const a = await J(`({ on: TLXCAM.on, foot: FOOT.on, mnt: MNT.on, dmt: DMT.on })`); console.log(JSON.stringify(a));
  const eye = await J(`TLX.api.camera.position.y - TLX.api.world.surf(FOOT.on ? FOOT.x : P.x, FOOT.on ? FOOT.z : P.z)`);
  ok(eye > 0.8 && eye < 2.4 && isFinite(eye), "eye height sane after Q: " + eye.toFixed(2));
  await key("KeyQ"); await sleep(5000);
  const b = await J(`({ on: TLXCAM.on, foot: FOOT.on, mnt: MNT.on, dmt: DMT.on })`); console.log(JSON.stringify(b));
  ok(!b.mnt && !b.dmt, "swing finished with camera up (no stuck MNT/DMT)");
  ok(!(await errs()), "no err: " + await errs());
});
await section("C garage / tablet / settings while up", async () => {
  await ev(`TLXCAM.on || TLXCAM.open(); GS.garageOpen = true; true`); await sleep(500);
  const g = await J(`({ on: TLXCAM.on, hud: !document.getElementById("camHud").hidden })`); console.log("garage open: " + JSON.stringify(g));
  const sc0 = await J(`TLXCAM.roll().length`); await key("Space"); await ev(`document.getElementById("camHud").click(); true`); await sleep(300);
  ok((await J(`TLXCAM.roll().length`)) === sc0 || !g.hud, "no shot taken through the garage panel (roll " + sc0 + ")");
  await ev(`GS.garageOpen = false; TLXCAM.close(); TLX.api.TABLET.toggle(true, "map"); true`); await sleep(500);
  await ev(`TLXCAM.open(); true`); await sleep(400);
  console.log("tablet open then K: cam " + await ev(`TLXCAM.on`) + " tablet " + await ev(`TLX.api.tablet()`));
  await ev(`TLX.api.TABLET.toggle(false); TLXCAM.close(); true`);
  await ev(`TLXCAM.open(); $("settings").hidden = false; true`); await sleep(300); await key("KeyK"); await sleep(300);
  console.log("settings open, K pressed: cam " + await ev(`TLXCAM.on`)); await ev(`$("settings").hidden = true; TLXCAM.close(); true`);
});
await section("D shutter spam, night, storm", async () => {
  await ev(`TLXCAM.open(); true`); await sleep(300);
  const n0 = await J(`TLXCAM.roll().length`); const t0 = Date.now();
  for (let i = 0; i < 12; i++) await ev(`TLXCAM.shoot(); true`);
  const n1 = await J(`TLXCAM.roll().length`); console.log("12 rapid shoots: roll " + n0 + " -> " + n1 + " in " + (Date.now() - t0) + " ms");
  ok(n1 <= 30, "roll cap holds under spam");
  await ev(`GS.hour = 100 * 24 + 1; updSky && updSky(); true`); await sleep(800); await shot("night", 80);
  const p = await J(`(() => { const p = TLXCAM.shoot(); return p && { score: p.score, name: p.name, img: (p.img || "").length }; })()`);
  ok(p && p.img > 500, "night shot has a picture " + JSON.stringify(p));
  await ev(`GS.storm = 1; GS.stormPhase = "storm"; true`); await sleep(800);
  const q = await J(`(() => { const p = TLXCAM.shoot(); return p && { score: p.score, img: (p.img || "").length }; })()`); console.log("storm shot " + JSON.stringify(q));
  ok(!(await errs()), "no err: " + await errs());
});
await section("E reload with camera up; old save without camera state", async () => {
  await ev(`save(); true`); await reload(); await ev(SETUP); await sleep(800);
  console.log("after reload cam on: " + await ev(`TLXCAM.on`) + " hud hidden: " + await ev(`document.getElementById("camHud").hidden`));
  ok((await ev(`TLXCAM.on`)) === (!(await ev(`document.getElementById("camHud").hidden`))), "camera flag and overlay agree after reload");
  const sv = await J(`(() => { const s = JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => /tracklayer/.test(k) && !/set/.test(k)))); return s; })()`).catch(() => null);
  if (sv && sv.x) { delete sv.x.camera; await reload(sv); await ev(SETUP); await sleep(800);
    const r = await J(`({ n: TLXCAM.roll().length, ok: (() => { TLXCAM.open(); const p = TLXCAM.shoot(); TLXCAM.close(); return !!p; })() })`);
    ok(r.n === 0 && r.ok, "old save with no camera key: empty roll and a shot works " + JSON.stringify(r)); }
  else console.log("could not read save for old-save test");
  ok(!(await errs()), "no err: " + await errs());
});
console.log(fails ? `FAILS: ${fails}` : "all passed");
await done(fails ? 1 : 0);

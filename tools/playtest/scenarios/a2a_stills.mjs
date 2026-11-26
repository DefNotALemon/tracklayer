// G9 A2a stills (not part of the gate): the barn by day and night, each routine close up, strips, the reactions, the room, the map, the Tips tab, two posts.
// Output: $OUT/*.jpg plus sheet.jpg (a contact sheet). Run: OUT=<dir> tools/playtest/run.sh tools/playtest/scenarios/a2a_stills.mjs <dir>
import { boot, ev, sleep, done, shot } from "../lib.mjs";
import fs from "node:fs";
import { execSync } from "node:child_process";
const OUT = process.env.OUT || "./shots";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function until(expr, secs, ms = 100) { const t0 = await clock(); while ((await clock()) - t0 < secs) { if (await ev(expr)) return true; await sleep(ms); } return !!(await ev(expr)); }
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(80); }
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 37; TLX.setOn("police", false); TLX.setOn("traffic", false); TLX.setOn("armedwork", true); TLX.setOn("raids", true); TLXAW.TUNE.evK = 1; QG.on = false; renderer.setPixelRatio(1.5); true`;
const KIT = `(() => {
  clearInterval(window.__warm); window.__warm = setInterval(() => { GS.warmth = 100; GS.health = 100; }, 400);
  window.__S = i => TLXRD.S().sites[i];
  window.__door = i => { const s = __S(i), B = s.B || TLXRD.build(s); return B.pt(B.pts.door[0], B.pts.door[1] - 0.45); };
  window.__atD = (i, d, a, face) => { const s = __S(i), dp = __door(i), an = s.ry + (a || 0), x = dp.x + Math.sin(an) * d, z = dp.z + Math.cos(an) * d;
    FOOT.on = true; FOOT.x = x; FOOT.z = z; FOOT.y = surf(x, z); FOOT.sp = FOOT.fwd = 0; if (face !== false) FOOT.yaw = Math.atan2(dp.x - x, dp.z - z); camState.init = false; if (FOOT.g) FOOT.g.visible = true; return true; };
  window.__camF = null; window.__snapReq = false; window.__snapOut = null; window.__capOn = false; window.__caps = [];
  if (!window.__hk) { window.__hk = true; const r = renderer.render.bind(renderer);
    renderer.render = (s, c) => { if (window.__camF) { const k = window.__camF(); if (k) { if (k.fov && c.fov !== k.fov) { window.__fov0 = window.__fov0 || c.fov; c.fov = k.fov; c.updateProjectionMatrix(); } c.position.set(k.x, k.y, k.z); c.lookAt(k.lx, k.ly, k.lz); } }
      r(s, c);
      if (window.__snapReq) { window.__snapOut = renderer.domElement.toDataURL("image/jpeg", 0.92); window.__snapReq = false; }
      if (window.__capOn && gameClock - window.__capLast >= window.__capDt) { window.__caps.push(renderer.domElement.toDataURL("image/jpeg", 0.9)); window.__capLast = gameClock; if (window.__caps.length >= window.__capN) window.__capOn = false; } }; }
  window.__camOff = () => { window.__camF = null; const c = camera; if (window.__fov0) { c.fov = window.__fov0; c.updateProjectionMatrix(); } return true; };
  window.__siteCam = (i, a, b, fov) => { const s = __S(i), B = s.B, co = B.co, si = B.si, W = (lx, lz) => [s.x + lx * co + lz * si, s.z - lx * si + lz * co];
    window.__camF = () => { const A = W(a[0], a[1]), P = W(b[0], b[1]); return { x: A[0], y: surf(A[0], A[1]) + a[2], z: A[1], lx: P[0], ly: surf(P[0], P[1]) + b[2], lz: P[1], fov: fov || 0 }; }; return true; };
  window.__figCam = (i, role, yawOff, dist, h, lh, fov, dy) => { const s = __S(i); window.__camF = () => { const f = TLXRD.fig(s, role); if (!f) return null; const o = f.o, a = (o.yaw || 0) + yawOff, gy = surf(o.x, o.z);
    return { x: o.x - Math.sin(a) * dist, y: gy + h, z: o.z - Math.cos(a) * dist, lx: o.x, ly: gy + lh, lz: o.z, fov: fov || 0 }; }; return true; };
  window.__q = (lic, rifle, owed) => { const g = TLXGUN, s = g.state(); s.licence = !!lic; s.owned = rifle ? [g.newGun(g.FRAMES[0].id)] : []; s.cur = rifle ? 0 : -1; TLXP.S().owed = owed || 0; return true; };
  window.__plant = (o) => { const S = TLXAW.S(); S.active = null; const base = { type: "shift", emp: TLXAW.postDef(o.post).emp, spot: TLXAW.spotOf(o.post), len: 3, pay: 255, n: 3 }; const c = Object.assign({ id: "t" + Math.random().toString(36).slice(2, 7) }, base, o); S.offers = [c]; return c.id; };
  return true; })()`;
const saved = [];
async function snap(name) {
  await ev(`window.__snapOut = null; window.__snapReq = true; true`);
  for (let i = 0; i < 60; i++) { if (await ev(`!!window.__snapOut`)) break; await sleep(100); }
  const d = await ev(`window.__snapOut`); if (!d) { console.log("no snap", name); return; }
  fs.writeFileSync(`${OUT}/${name}.jpg`, Buffer.from(d.split(",")[1], "base64")); saved.push(name); return name;
}
async function strip(name, n, dt, cols = 3, crop) {
  await ev(`window.__caps = []; window.__capLast = gameClock - 1; window.__capDt = ${dt}; window.__capN = ${n}; window.__capOn = true; true`);
  for (let i = 0; i < 150 && (await ev("window.__capOn")); i++) await sleep(100);
  const caps = await J("window.__caps"); const dir = `${OUT}/${name}_frames`; fs.mkdirSync(dir, { recursive: true });
  caps.forEach((d, i) => fs.writeFileSync(`${dir}/f${i}.jpg`, Buffer.from(d.split(",")[1], "base64")));
  const c = crop ? JSON.stringify(crop) : "None";
  execSync(`/usr/bin/python3 - <<'PY'
from PIL import Image
import glob
fs=sorted(glob.glob("${dir}/f*.jpg"), key=lambda p:int(p.split('/f')[-1][:-4]))
ims=[Image.open(f) for f in fs]
c=${c}
if c:
    w,h=ims[0].size
    ims=[im.crop((int(c[0]*w),int(c[1]*h),int((c[0]+c[2])*w),int((c[1]+c[3])*h))) for im in ims]
w,h=ims[0].size
cols=${cols}
rows=(len(ims)+cols-1)//cols
sh=Image.new('RGB',(w*cols,h*rows))
for i,im in enumerate(ims): sh.paste(im,((i%cols)*w,(i//cols)*h))
sh.save("${OUT}/${name}.jpg", quality=90)
PY`); saved.push(name); return caps.length;
}
const site = 0;
const waitSt = async (role, st, secs = 80) => until(`(() => { const f = TLXRD.fig(__S(${site}), ${JSON.stringify(role)}); return f && f.st === ${JSON.stringify(st)} && !f.inside; })()`, secs);
const cam = (a, b, fov) => ev(`__siteCam(${site}, ${JSON.stringify(a)}, ${JSON.stringify(b)}, ${fov || 0}); true`);
const fig = (role, yo, d, h, lh, fov) => ev(`__figCam(${site}, ${JSON.stringify(role)}, ${yo}, ${d}, ${h}, ${lh}, ${fov || 0}); true`);

await boot();
await ev(SETUP); await sleep(800); await ev(KIT);
await ev(`$("toasts").style.display = "none"; true`);
console.log("sites", JSON.stringify(await J(`TLXRD.S().sites.map(s => [s.id, Math.round(s.x), Math.round(s.z)])`)));
// a crew of five with a rider, then by day
await ev(`(() => { const s = __S(${site}); s.n = 5; s.rider = true; GS.hour = 37; __atD(${site}, 230, 0); return true; })()`);
await until(`!!__S(${site}).C && __S(${site}).C.queue.length === 0`, 20); await ev(`__S(${site}).C.react.calm = 0; true`);
await waitGame(14);
// the barn from 150, 60 and 20 m by day
await cam([0, 150, 1.7], [0, 0, 1.6], 0); await sleep(500); await snap("barn_day_150m");
await cam([4, 60, 1.7], [0, 0, 1.6], 0); await sleep(500); await snap("barn_day_60m");
await cam([5, 20, 1.7], [0, 2, 1.6], 0); await sleep(500); await snap("barn_day_20m");
await cam([13, 14, 1.8], [0, 3, 1.3], 0); await sleep(500); await snap("barn_day_side");
// the routines close up
await waitSt("look", "post", 40); await fig("look", 2.5, 3.4, 1.5, 1.35, 38); await sleep(400); await strip("routine_lookout_smoking", 6, 0.45, 3);
await waitSt("carA", "carry", 60); await fig("carA", 1.57, 3.6, 1.15, 0.95, 36); await strip("strip_tub_carrier_side", 6, 0.12, 3);
await waitSt("carB", "pick", 60); await fig("carB", 0.9, 3.4, 1.2, 0.7, 40); await sleep(500); await strip("routine_tub_pickup", 6, 0.28, 3);
await waitSt("carA", "set", 60); await fig("carA", 0.7, 3.6, 1.3, 0.6, 40); await strip("routine_tub_setdown", 6, 0.22, 3);
await waitSt("shov", "shovel", 40); await fig("shov", 2.0, 3.8, 1.4, 0.95, 40); await strip("routine_shoveller", 6, 0.38, 3);
await waitSt("phone", "stop", 60); await fig("phone", 2.3, 3.4, 1.5, 1.35, 38); await sleep(300); await strip("routine_phone", 4, 0.8, 2);
await waitSt("phone", "pour", 120); await fig("phone", 1.2, 3.6, 1.5, 0.9, 40); await sleep(2500); await strip("routine_refuelling", 4, 0.9, 2);
await ev(`(() => { const B = __S(${site}).B; const g = B.pt(B.pts.gate[0], B.pts.gate[1]); const s = __S(${site}); window.__camF = () => ({ x: g.x + Math.sin(s.ry + 1.3) * 12, y: surf(g.x, g.z) + 1.8, z: g.z + Math.cos(s.ry + 1.3) * 12, lx: g.x, ly: surf(g.x, g.z) + 0.9, lz: g.z, fov: 40 }); return true; })()`);
await until(`(() => { const f = TLXRD.fig(__S(${site}), "rider"); return f && f.st === "idle" && !f.hidden; })()`, 60); await sleep(800); await snap("routine_sled_idling_at_gate");
// night
await ev(`GS.hour = 46; true`); await waitGame(3);
await cam([4, 60, 1.7], [0, 2, 1.4], 0); await sleep(500); await snap("barn_night_60m");
await cam([6, 20, 1.7], [0, 3, 1.3], 0); await sleep(500); await snap("barn_night_20m");
await cam([2.5, 9.5, 1.6], [0.5, 4.2, 1.2], 0); await sleep(400); await snap("barn_night_door_leak");
await waitSt("shov", "throw", 90); await fig("shov", 1.3, 3.8, 1.5, 1.1, 40); await strip("routine_burning_rubbish_night", 6, 0.3, 3);
await waitSt("shov", "warm", 30); await fig("shov", 0.9, 3.4, 1.5, 1.2, 40); await sleep(500); await snap("routine_drum_fire_warm_night");
// the dog, and the reactions (daylight again)
await ev(`GS.hour = 37; true`); await waitGame(2);
await ev(`__atD(${site}, 78, 0); true`); await until(`__S(${site}).C.react.lvl >= 1`, 8); await waitGame(2.5);
await ev(`(() => { const s = __S(${site}), pl = FOOT; window.__camF = () => { const f = TLXRD.fig(s, "look"); const a = Math.atan2(f.o.x - pl.x, f.o.z - pl.z); return { x: pl.x - Math.sin(a) * 2.2 + Math.cos(a) * 0.9, y: surf(pl.x, pl.z) + 1.6, z: pl.z - Math.cos(a) * 2.2 - Math.sin(a) * 0.9, lx: f.o.x, ly: surf(f.o.x, f.o.z) + 1.3, lz: f.o.z, fov: 36 }; }; return true; })()`);
await sleep(500); await snap("lookout_watching_you"); await strip("lookout_watching_strip", 3, 1.2, 3, [0.2, 0.15, 0.6, 0.7]);
await fig("look", 0.0, -4.0, 1.5, 1.35, 38); await sleep(300); await snap("lookout_turned_to_you_front");
await ev(`__atD(${site}, 52, 0); true`); await until(`__S(${site}).C.react.lvl >= 2`, 8); await waitGame(2.5);
await fig("dog", 0.8, 3.0, 0.9, 0.5, 40); await sleep(500); await snap("dog_barking");
await ev(`__atD(${site}, 28, 0); true`); await until(`(() => { const f = TLXRD.fig(__S(${site}), "look"); return f.st === "warn"; })()`, 10);
await until(`(() => { const f = TLXRD.fig(__S(${site}), "look"); return f.handUp > 1; })()`, 15);
await ev(`(() => { const s = __S(${site}), pl = FOOT; window.__camF = () => { const f = TLXRD.fig(s, "look"); const a = Math.atan2(f.o.x - pl.x, f.o.z - pl.z); const mx = (pl.x + f.o.x) / 2, mz = (pl.z + f.o.z) / 2, d = Math.hypot(f.o.x - pl.x, f.o.z - pl.z); return { x: mx + Math.cos(a) * (d * 0.9 + 3), y: surf(mx, mz) + 1.7, z: mz - Math.sin(a) * (d * 0.9 + 3), lx: mx, ly: surf(mx, mz) + 1.3, lz: mz, fov: 40 }; }; return true; })()`);
await sleep(500); await snap("warn_off_hand_raised"); await strip("warn_off_strip", 3, 0.8, 3);
await ev(`__atD(${site}, 14, 0); true`); await until(`__S(${site}).C.react.lvl === 4`, 10); await waitGame(8);
await cam([4, 16, 1.7], [0, 3.5, 1.2], 0); await sleep(500); await snap("barred_door");
await ev(`__camOff(); true`);
// the room
await ev(`GS.hour = 37; true`);
console.log("enter", await ev(`TLXRD.testEnter(__S(${site}).id)`));
await until(`INT.on`, 8); await sleep(1200);
await ev(`FOOT.yaw = 0.2; true`); await sleep(600); await shot("room_a");
await ev(`INT.pz += 0.9; FOOT.yaw = 2.2; true`); await sleep(900); await shot("room_b");
await ev(`FOOT.yaw = -1.3; INT.px += 0.6; true`); await sleep(900); await shot("room_c");
await ev(`INT.px = INT.room.exit.x; INT.pz = INT.room.exit.z; true`); await until(`!INT.on`, 8);
// the map and the Tips tab
await ev(`(() => { const S = TLXRD.S(); S.sites.forEach(s => { s.found = false; s.tipped = false; }); S.sites[1].found = true; S.sites[0].tipped = true; S.sites[2].found = true; S.sites[2].tipped = true; S.tips.length = 0; S.last = { day: -9, pts: 0 }; S.sites[0].tipped = false; TLXAW.S().standing.all = 30; TLXAW.S().rec.done = 9; TLXRD.giveTip({ emp: "fisk", id: "s" }); FOOT.on = true; $("toasts").style.display = "none"; return true; })()`);
await ev(`TABLET.toggle(true, "map"); true`); await sleep(1500); await shot("map_found_and_tipped");
await ev(`TABLET.close(true); true`); await sleep(300);
await ev(`(() => { const S = TLXRD.S(); S.last = { day: -9, pts: 0 }; S.sites.forEach(s => { if (!s.found) s.tipped = false; }); GS.hour += 24; TLXAW.S().standing.all = 50; TLXRD.giveTip({ emp: "kommune", post: "fuel", id: "s2" }); TLXAW.setTab("tips"); return true; })()`);
await ev(`TABLET.toggle(true, "armed"); true`); await sleep(1200); await shot("tips_tab");
await ev(`TABLET.close(true); true`); await sleep(300);
// the posts (A1 fixes)
await ev(`__q(true, true, 0); TLXRD.S().sites.forEach(s => { s.found = false; }); true`);
for (const [id, nm] of [["fuel", "post_fuel_store"], ["radar", "post_radar_hut"], ["fish", "post_fish_plant"], ["film", "post_film_crew"]]) {
  const sid = await ev(`__plant({ post: ${JSON.stringify(id)} })`); await ev(`TLXAW.accept(${JSON.stringify(sid)}); true`);
  await ev(`(() => { const sp = TLXAW.S().active.spot, a = sp.ry + 0.9; FOOT.on = true; FOOT.x = sp.x + Math.sin(sp.ry) * 16; FOOT.z = sp.z + Math.cos(sp.ry) * 16; FOOT.y = surf(FOOT.x, FOOT.z); camState.init = false; window.__camF = () => ({ x: sp.x + Math.sin(a) * 17, y: surf(sp.x, sp.z) + 3.2, z: sp.z + Math.cos(a) * 17, lx: sp.x, ly: surf(sp.x, sp.z) + 1.5, lz: sp.z, fov: 50 }); return true; })()`);
  await sleep(1200); await snap(nm); await ev(`__camOff(); TLXAW.fail(TLXAW.S().active, "abandon"); true`);
}
// the fixed guard-shift walk-in figure
{
  const sid = await ev(`__plant({ post: "fish" })`); await ev(`TLXAW.accept(${JSON.stringify(sid)}); (() => { TLXAW.S().active.sched = []; const sp = TLXAW.S().active.spot; FOOT.on = true; FOOT.x = sp.x; FOOT.z = sp.z + 5; FOOT.y = surf(FOOT.x, FOOT.z); camState.init = false; return true; })()`);
  await until(`TLXAW.S().active && TLXAW.S().active.state === "on"`, 10); await ev(`TLXAW.EV.wait = 0; TLXAW.evStart("prowler"); true`);
  await ev(`window.__camF = () => { const e = TLXAW.EV.cur; if (!e || !e.f) return null; const o = e.f.o, a = o.yaw + 1.5708, gy = surf(o.x, o.z); return { x: o.x - Math.sin(a) * 3.8, y: gy + 1.1, z: o.z - Math.cos(a) * 3.8, lx: o.x, ly: gy + 0.95, lz: o.z, fov: 34 }; }; true`);
  await until(`(() => { const e = TLXAW.EV.cur; return e && e.f && e.f.v > 1.1; })()`, 40); await sleep(300);
  await strip("strip_guard_walkin_fixed", 6, 0.12, 3);
  await ev(`__camOff(); TLXAW.evEnd(); TLXAW.fail(TLXAW.S().active, "abandon"); true`);
}
await done();
// the contact sheet
const names = fs.readdirSync(OUT).filter(f => f.endsWith(".jpg") && f !== "sheet.jpg").sort();
execSync(`/usr/bin/python3 - <<'PY'
from PIL import Image, ImageDraw
import os
names=${JSON.stringify(names)}
W=480;H=270
cols=5
rows=(len(names)+cols-1)//cols
sh=Image.new('RGB',(W*cols,H*rows),(20,20,24))
d=ImageDraw.Draw(sh)
for i,n in enumerate(names):
    im=Image.open("${OUT}/"+n); im.thumbnail((W,H-14))
    sh.paste(im,((i%cols)*W,(i//cols)*H+14)); d.text(((i%cols)*W+3,(i//cols)*H+1),n[:-4],fill=(230,230,230))
sh.save("${OUT}/sheet.jpg", quality=88)
PY`);
console.log("stills:", names.length);

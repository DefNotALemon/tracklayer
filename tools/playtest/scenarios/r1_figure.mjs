// R1 the figure (G8): the body kit, asserted and shot. Stills at pixel ratio 1.5 into $OUT (NOSTILLS=1: asserts only).
// Asserts (FAIL lines, exit 1): rig arrays and head kits, no bare primitive under the walker or rider, every figure material
// textured, nothing emissive but the heated-glove/visor LEDs, the budget (draw calls, triangles), walker 1.76-1.84 m, one set of
// jacket/pants materials for walker and rider, walking moves the walker, mounting ends seated.
// Run: tools/playtest/run.sh tools/playtest/scenarios/r1_figure.mjs <outdir>     (R0=1: shoot only, skip the asserts)
import { boot, ev, raw, shot, done, sleep, down, up, tap, errors, reload } from "../lib.mjs";
const STILLS = !process.env.NOSTILLS, fails = [];
const ok = (c, m) => { if (!c) { fails.push(m); console.log("FAIL " + m); } else console.log("  ok " + m); };
await boot({ width: process.env.VW ? +process.env.VW : 1280, height: process.env.VH ? +process.env.VH : 720 });
if (process.env.LOW) {   // the low preset is planted BEFORE the game boots, the way GFX reads it, so the figures are built in their lighter form
  await raw(`localStorage.setItem("tracklayer.set.v1", JSON.stringify({ gfx: "low" })); true`); await reload();
  const lo = await ev("JSON.stringify({ low: GFX.low, lite: TLXL.lite })"); console.log("preset", lo);
  ok(JSON.parse(lo).low && JSON.parse(lo).lite, "low preset planted before boot: the lite figures are built");
}
await ev("tutSkip(); WX.at = () => 0; GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + 12 + 120 * 24; camState.init = false; true");
await ev(`(() => { QG.on = false; renderer.setPixelRatio(${process.env.PR || 1.5}); renderer.setSize(innerWidth, innerHeight); return true; })()`);
await sleep(2500);
await ev(`(() => { if (!window.__camHk) { window.__camHk = 1; const rr = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv && s === scene) window.camOv(c); if (window.preR && s === scene) window.preR(); rr(s, c); }; } return true; })()`);
const pr = await ev("renderer.getPixelRatio()"); console.log("pixel ratio", pr);
const snap = async n => { if (STILLS) { await sleep(450); await shot(n); } };
const orbit = (tgt, ang, dist, h, look) => ev(`window.camOv = c => { const T = ${tgt}, a = T[3] + ${ang}; c.position.set(T[0] + Math.sin(a) * ${dist}, T[1] + ${h}, T[2] + Math.cos(a) * ${dist}); c.lookAt(T[0], T[1] + ${look}, T[2]); }; true`);
const WK = "[FOOT.x, FOOT.y, FOOT.z, FOOT.yaw]";
const RD = "(() => { const v = new THREE.Vector3(); V.ub.getWorldPosition(v); return [v.x, v.y - 0.5, v.z, P.yaw]; })()";
const HD = "(() => { const v = new THREE.Vector3(); (FOOT.on ? FOOT.g.userData.head : V.head.g).getWorldPosition(v); return [v.x, v.y, v.z, FOOT.on ? FOOT.yaw : P.yaw]; })()";
const info = e => ev(e);

// ---------------- asserts: the walker ----------------
const A = JSON.parse(await info(`JSON.stringify((() => {
  const out = {}, U = FOOT.g.userData;
  out.rig = { arms: U.arms.length, fore: U.fore.length, legs: U.legs.length, shins: U.shins.length, ank: U.ank.length, torso: !!U.torso, head: !!U.head, skis: U.skis.length, poles: U.poles.length, shoes: U.shoes.length, headKit: Object.keys(U.headKit).join() };
  out.rider = { legs: V.legs.length, boots: V.boots.length, bootCuff: V.bootCuff.length, footPlain: V.footPlain.length, kneePads: V.kneePads.length, reflect: V.reflect.length, hipParts: V.hipParts.length, fpHide: V.fpHide.length, arms: V.arms.length, hands: V.hands.length, gloves: V.gloves.length, mitts: V.mitts.length, torso: !!V.torso, chest: !!V.chest, hips: !!V.hips, furCollar: !!V.furCollar, neck: !!V.neck, visor: !!V.visor, goggles: !!V.goggles, headAll: V.headAll.length };
  const isGear = o => { for (let p = o; p; p = p.parent) { if (U.skis.includes(p) || U.poles.includes(p) || U.shoes.includes(p) || p === V.xcRack) return true; } return false; };
  const bad = [], untex = [], glow = [];
  const walk = (root, tag) => root.traverse(o => { if (!o.isMesh || isGear(o)) return;
    const t = o.geometry.type; if (t === "BoxGeometry" || t === "CylinderGeometry" || t === "SphereGeometry" || t === "CapsuleGeometry") bad.push(tag + ":" + t + ":" + (o.name || ""));
    const m = o.material; if (!(m.map || m.normalMap) && !m.userData.heater && !m.userData.flush) untex.push(tag + ":" + (m.color ? m.color.getHexString() : "?"));
    if (m.emissive && m.emissive.getHex() !== 0 && !m.userData.heater) glow.push(tag + ":" + m.emissive.getHexString()); });
  walk(FOOT.g, "walker"); walk(V.rider, "rider");
  out.bad = bad; out.untex = [...new Set(untex)]; out.glow = glow;
  const vis = o => { for (let p = o; p; p = p.parent) if (!p.visible && p !== FOOT.g) return false; return true; };
  const count = (root, rootVis) => { let calls = 0, tris = 0; root.traverse(o => { if (o.isMesh && (rootVis || vis(o)) && !isGear(o)) { let ok = true; for (let p = o; p && p !== root.parent; p = p.parent) if (!p.visible && p !== root) ok = false; if (ok) { calls++; tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } } }); return { calls, tris: Math.round(tris) }; };
  FOOT.g.visible = true; out.walkerCost = count(FOOT.g, false); const rv = V.rider.visible; V.rider.visible = true; out.riderCost = count(V.rider, false); V.rider.visible = rv;
  const b = new THREE.Box3(); FOOT.g.updateMatrixWorld(true);
  const walkB = o => { if (!o.visible) return; if (o.isMesh) { o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld); b.union(bb); } o.children.forEach(walkB); };
  const gy = FOOT.g.position.y, r0 = FOOT.g.rotation.y; FOOT.g.rotation.set(0, 0, 0); FOOT.g.updateMatrixWorld(true);
  const sv = U.torso.rotation.x; walkB(FOOT.g); out.h = (b.max.y - b.min.y) / FOOT.g.scale.y; out.gameScale = FOOT.g.scale.y; out.hmin = b.min.y - gy;
  out.sameJacket = (() => { let w = false, r = false; FOOT.g.traverse(o => { if (o.isMesh && o.material === jacketMat) w = true; }); V.rider.traverse(o => { if (o.isMesh && o.material === jacketMat) r = true; }); return w && r; })();
  out.samePants = (() => { let w = false, r = false; FOOT.g.traverse(o => { if (o.isMesh && o.material === pantsMat) w = true; }); V.rider.traverse(o => { if (o.isMesh && o.material === pantsMat) r = true; }); return w && r; })();
  out.ms = window.TLXL ? { look: +(TLXL.ms - ((TLXL.sled && TLXL.sled.texMs) || 0)).toFixed(1), sled: +((TLXL.sled && TLXL.sled.texMs) || 0).toFixed(1), fig: +(TLXL.figMs || 0).toFixed(1), log: TLXL.log } : { look: 0, fig: 0 };
  return out; })())`));
console.log(JSON.stringify(A));
if (!process.env.R0) {
  ok(A.rig.arms === 2 && A.rig.fore === 2 && A.rig.legs === 2 && A.rig.shins === 2 && A.rig.ank === 2 && A.rig.torso && A.rig.head, "walker rig arrays and bones exist");
  ok(A.rig.skis === 2 && A.rig.poles === 2 && A.rig.shoes === 2 && A.rig.headKit === "helmet,beanie,mask", "walker skis/poles/shoes/headKit exist");
  const R = A.rider; ok(R.legs === 4 && R.boots === 2 && R.bootCuff === 2 && R.footPlain === 2 && R.kneePads === 2 && R.reflect >= 4 && R.arms === 4 && R.hands === 2 && R.gloves === 2 && R.mitts === 2 && R.torso && R.chest && R.hips && R.furCollar && R.neck && R.visor && R.goggles && R.fpHide.length !== 0, "rider arrays exist with the expected lengths " + JSON.stringify(R));
  ok(A.bad.length === 0, "no bare Box/Cylinder/Sphere geometry in a body part " + A.bad.slice(0, 6).join(","));
  ok(A.untex.length === 0, "every figure material has a map or normal map " + A.untex.join(","));
  ok(A.glow.length === 0, "no figure material is emissive " + A.glow.join(","));
  ok(A.walkerCost.calls <= 40 + 15 && A.walkerCost.tris < 25000, `walker budget: ${A.walkerCost.calls} calls, ${A.walkerCost.tris} tris`);
  ok(A.riderCost.calls <= 40 + 15 && A.riderCost.tris < 25000, `rider budget: ${A.riderCost.calls} calls, ${A.riderCost.tris} tris`);
  ok(A.h > 1.76 && A.h < 1.84, "walker standing height " + A.h.toFixed(3) + " m at the kit's own scale (the game then draws it at " + A.gameScale + ")");
  ok(A.sameJacket && A.samePants, "walker and rider share the jacket and pants materials");
  ok(A.ms.look + 0 < 150, "look kit textures " + A.ms.look + " ms, figure kit " + A.ms.fig + " ms");
}
// the lighter build (GFX.low / GFX.mobile): same rig, fewer segments and no small trim
{
  const r = JSON.parse(await ev(`JSON.stringify((() => { const was = TLXL.lite; TLXL.lite = true; const g = makeWalker({ jacket: jacketMat, pants: pantsMat, trim: riderTrimMat, helmet: M.helmet, visor: M.visor, glove: M.glove, boot: M.boot });
    TLXL.lite = was; let calls = 0, tris = 0; g.traverse(o => { if (o.isMesh) { let v = true; for (let p = o; p; p = p.parent) if (!p.visible) v = false; if (v) { calls++; tris += o.geometry.index.count / 3; } } });
    const U = g.userData; return { calls, tris: Math.round(tris), rig: U.arms.length + U.fore.length + U.legs.length + U.shins.length + U.ank.length }; })())`));
  console.log("lite walker", JSON.stringify(r));
  ok(r.rig === 10 && r.tris < 14000, `lite walker: ${r.calls} calls, ${r.tris} tris`);
}
// head kits: each shows only its own parts
for (const k of ["helmet", "beanie", "mask"]) {
  const r = JSON.parse(await ev(`JSON.stringify((() => { GS.own.gear.head = "${k}"; applyLoadout(); walkerLook(); const U = FOOT.g.userData, sel = new Set(U.headKit["${k}"]), all = new Set(); for (const n in U.headKit) U.headKit[n].forEach(m => all.add(m));
    let good = true; for (const m of all) if (m.visible !== sel.has(m)) good = false;
    const vh = V.head["${k}"] || []; const allR = ["helmet", "beanie", "mask"].flatMap(n => V.head[n]); let goodR = true; for (const m of new Set(allR)) if (m.visible !== vh.includes(m)) goodR = false; return { good, goodR, n: sel.size }; })())`));
  if (!process.env.R0) ok(r.good && r.goodR, `head kit ${k} shows only its own parts`);
}
await ev(`GS.own.gear.head = "helmet"; applyLoadout(); walkerLook(); true`);
await ev("FOOT.g.rotation.y = FOOT.yaw; true");

// ---------------- stills: the walker ----------------
if (STILLS) {
  await ev("GS.own.gear.head = 'helmet'; applyLoadout(); walkerLook(); true");
  await ev("WX.at = () => 0; GS.storm = 0; true"); await orbit(WK, 0, 2.6, 1.3, 0.95); await snap("01_walker_front"); await orbit(WK, 3.14, 2.6, 1.3, 0.95); await snap("01b_walker_back_sun");
  await orbit(WK, 1.57, 2.6, 1.3, 0.95); await snap("02_walker_side");
  await orbit(WK, 3.14, 2.6, 1.3, 0.95); await snap("03_walker_back");
  await orbit(WK, 0.8, 2.6, 1.3, 0.95); await snap("04_walker_34");
  await orbit(WK, 0.8, 4.0, 1.5, 0.9); await snap("04b_walker_34_4m");
  await ev("camState.init = false; window.camOv = null; true"); await sleep(1800); await snap("04c_chase_onfoot");
  await orbit(WK, 0.35, 0.8, 1.45, 1.4); await snap("05_walker_face_helmet");
  await orbit(WK, 0.5, 0.75, 0.95, 0.85); await snap("06_walker_glove");
  await orbit(WK, 0.6, 0.85, 0.35, 0.12); await snap("07_walker_boot");
  await orbit(WK, 0.4, 1.2, 1.45, 1.2); await snap("08_walker_torso");
  for (const k of ["beanie", "mask"]) { await ev(`GS.own.gear.head = "${k}"; applyLoadout(); walkerLook(); true`); await orbit(WK, 0.35, 0.8, 1.45, 1.4); await snap("09_head_" + k); await orbit(WK, 1.4, 0.9, 1.45, 1.4); await snap("09_head_" + k + "_side"); }
  await ev(`GS.own.gear.head = "helmet"; applyLoadout(); walkerLook(); true`);
}
// walking: move + a mid-stride strip
const p0 = JSON.parse(await ev("JSON.stringify([FOOT.x, FOOT.z])")), t0 = await ev("gameClock");
await orbit(WK, 1.57, 3.0, 1.2, 0.9);
await down("KeyW"); let strip = 0;
for (let i = 0; i < 80; i++) {
  await sleep(150); const t = await ev("gameClock");
  if (STILLS && t - t0 > 1.6 && strip < 4 && (!strip || t - (globalThis.__ts || 0) >= 0.1)) { globalThis.__ts = t; await shot("10_stride_" + strip); strip++; }
  if (t - t0 > 3.2 && (strip >= 4 || !STILLS)) break;
}
await up("KeyW"); await sleep(300);
const p1 = JSON.parse(await ev("JSON.stringify([FOOT.x, FOOT.z])")), dW = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
ok(dW > 1.5, `walking 3 s moved the walker ${dW.toFixed(2)} m`);

// ---------------- mount and the seated rider ----------------
await ev("(() => { const dx = P.x - FOOT.x, dz = P.z - FOOT.z; console.log('sled dist', Math.hypot(dx, dz)); return true; })()");
await ev("(() => { const f = Math.sin(P.yaw), s = Math.cos(P.yaw); FOOT.x = P.x + s * 1.6 - f * 0.3; FOOT.z = P.z - Math.sin(P.yaw) * 1.6 - Math.cos(P.yaw) * 0.3; FOOT.y = walkFloor(FOOT.x, FOOT.z); FOOT.yaw = P.yaw - 1.57; return true; })()");
await sleep(500);
await tap("KeyQ");
let seated = false;
for (let i = 0; i < 60; i++) { await sleep(300); if (!(await ev("FOOT.on"))) { seated = true; break; } }
await sleep(1500);
ok(seated && !(await ev("MNT.on")), "mount ends seated (FOOT.on false)");
await ev("camState.init = false; true");
if (STILLS) {
  await ev("P.vx = P.vz = 0; true");
  await orbit(RD, 1.57, 3.0, 1.3, 1.0); await snap("20_rider_side");
  await orbit(RD, 0.7, 3.0, 1.3, 1.0); await snap("21_rider_34front");
  await orbit(RD, 3.14, 3.0, 1.3, 1.0); await snap("22_rider_rear");
  await orbit(RD, 0.9, 1.5, 1.35, 1.0); await snap("23_rider_close");
  await orbit(RD, 0.5, 1.15, 1.1, 0.85); await snap("24_rider_hands");
  for (const k of ["helmet", "beanie", "mask"]) { await ev(`GS.own.gear.head = "${k}"; applyLoadout(); true`); await orbit(HD, 0.45, 0.9, 0.12, 0.0); await snap("25_riderhead_" + k); }
  await ev(`GS.own.gear.head = "helmet"; applyLoadout(); true`);
  await orbit(RD, 1.2, 1.0, 0.55, 0.35); await snap("26_rider_knee_boot");
  await ev("window.camOv = null; camState.init = false; true"); await sleep(1500); await snap("27_chase_default");
  await ev("camMode = 2; camState.init = false; true"); await sleep(1500); await snap("28_first_person");
  await ev("camMode = 0; camState.init = false; true");
}
if (STILLS) {   // a crash: the body tumbles (crashEject / crashStep)
  const CB = "[FOOT.g.position.x, FOOT.g.position.y, FOOT.g.position.z, 0]";
  await ev("crashCancel(); FOOT.on = false; P.vz = 25; crashEject('test', 0, 1, 25, null); true"); await sleep(500);
  await orbit(CB, 0.9, 4.5, 1.8, 0.6); await snap("29_crash_fly"); await sleep(1500); await snap("29_crash_tumble"); await sleep(2500); await snap("29_crash_down");
  await ev("crashCancel(); true");
}
// ---------------- night under a lamp, overcast ----------------
if (STILLS) {
  await ev("FOOT.on = true; FOOT.x = P.x + 2.2; FOOT.z = P.z + 0.6; FOOT.y = walkFloor(FOOT.x, FOOT.z); FOOT.g.visible = true; true"); await sleep(600);
  await ev("GS.hour = Math.floor(GS.hour / 24) * 24 + 22.5; window.__lamp = new THREE.PointLight(0xffd9a0, 6, 14, 1.6); scene.add(window.__lamp); window.preR = () => window.__lamp.position.set(FOOT.x + 1.2, FOOT.y + 3.2, FOOT.z + 1.0); true"); await sleep(2500);
  await orbit(WK, 0.7, 2.6, 1.3, 0.95); await snap("30_night_lamp_front"); await orbit(WK, 2.4, 2.6, 1.3, 0.95); await snap("31_night_lamp_back");
  await ev("scene.remove(window.__lamp); window.preR = null; GS.hour = Math.floor(GS.hour / 24) * 24 + 12; WX.at = () => 0.9; GS.storm = 0; true"); await sleep(2500);
  await orbit(WK, 0.7, 2.6, 1.3, 0.95); await snap("32_overcast");
}
{   // colour blocking follows the player's colours: a red jacket gets dark red second-tone panels, and the jacket stays the source of colour
  const r = JSON.parse(await ev(`JSON.stringify((() => { const old = SET.jacket; SET.jacket = "#c02020"; applySettings(); const K = TLXL.fig.K, o = { pr: K.panel.color.r, pb: K.panel.color.b, jr: jacketMat.color.r, jb: jacketMat.color.b, dark: K.panel.color.r < jacketMat.color.r, map: !!jacketMat.map };
    SET.jacket = old; applySettings(); return o; })())`));
  ok(r.pr > r.pb * 2 && r.dark && r.jr > r.jb * 2 && r.map, "the second-tone panels are derived from the jacket colour (a red jacket: dark red panels)");
}
console.log(fails.length ? "FAILS: " + fails.length : "all asserts ok");
await done(fails.length ? 1 : 0);

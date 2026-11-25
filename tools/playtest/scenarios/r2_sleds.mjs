// R2 the sleds (G8): all ten machines, asserted and shot. Stills at pixel ratio 1.5 into $OUT (NOSTILLS=1: asserts only).
// Asserts (FAIL lines, exit 1): every machine builds and shows; userData fields finite; no bare BoxGeometry in a shaped part;
// every material has a map or normal map; nothing emissive but light lenses; V.tabClear / V.colShows on every machine; rider hands within
// 6 cm of the grips and boots within 5 cm of the boards; draw calls and triangles per machine; every part option changes something;
// the track animates; buildMachines time.
// Run: tools/playtest/run.sh tools/playtest/scenarios/r2_sleds.mjs <outdir>     (R0=1: shoot only, skip the asserts)
//      ONLY=frontier,apex limits the machines; CLOSE=frontier,apex,trekker picks the close-up machines.
import { boot, ev, raw, shot, done, sleep, errors, park, reload } from "../lib.mjs";
const STILLS = !process.env.NOSTILLS, fails = [], R0 = !!process.env.R0;
const ok = (c, m) => { if (!c) { fails.push(m); console.log("FAIL " + m); } else console.log("  ok " + m); };
await boot({ width: process.env.VW ? +process.env.VW : 1280, height: process.env.VH ? +process.env.VH : 720 });
if (process.env.LOW) {
  await raw(`localStorage.setItem("tracklayer.set.v1", JSON.stringify({ gfx: "low" })); true`); await reload();
  ok(JSON.parse(await ev("JSON.stringify({ low: GFX.low, lite: TLXL.lite })")).lite, "low preset planted before boot");
}
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await ev("tutSkip(); WX.at = () => 0; GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + 12 + 120 * 24; camState.init = false; FOOT.on = false; VEH.cur = null; crashCancel(); true");
await ev(`(() => { QG.on = false; renderer.setPixelRatio(${process.env.PR || 1.5}); renderer.setSize(innerWidth, innerHeight); return true; })()`);
await sleep(1500);
// open, plowed road far from houses (the open fell is deep powder: the sled sinks to the belt and the camera sees a trench)
const spot = await J(`(() => { for (const Y of YARDS) { if (Y.x2 === undefined || Math.hypot(Y.x - depot.x, Y.z - depot.z) < TOWN_R + 150) continue; const x = (Y.x + Y.x2) / 2, z = (Y.z + Y.z2) / 2; if (obNear(x, z, 40) || isSea(x, z)) continue;
  P.x = x; P.z = z; P.y = surf(x, z) + 0.3; P.vx = P.vz = P.vy = 0; P.yaw = 0; recenter(x, z, true); return { x: Math.round(x), z: Math.round(z), d: +(surf(x, z) - groundAt(x, z)).toFixed(2) }; } return null; })()`);
console.log("parked", JSON.stringify(spot));
await ev(`(() => { const st = document.createElement("style"); st.textContent = "body > *:not(canvas) { visibility: hidden !important; }"; document.head.appendChild(st); return true; })()`);
await ev("FOOT.on = false; crashCancel(); true");
await ev(`(() => { if (!window.__camHk) { window.__camHk = 1; const rr = renderer.render.bind(renderer); renderer.render = (s, c) => { if (s === scene) { if (window.camOv) window.camOv(c); if (window.preR) window.preR(); } rr(s, c); }; } return true; })()`);
const snap = async n => { if (STILLS) { await sleep(420); await shot(n); } };
const ids = process.env.ONLY ? process.env.ONLY.split(",") : await J("SLEDS.map(s => s.id)");
const CLOSE = (process.env.CLOSE || "frontier,apex,trekker").split(",");
const setSled = id => ev(`(() => { window.preR = null; GS.own.sled = ${JSON.stringify(id)}; restat(); applyLoadout(); crashCancel(); FOOT.on = false; P.vx = P.vz = P.vy = 0; P.yaw = 0; P.y = surf(P.x, P.z) + 0.3; return true; })()`);
// camera orbit round a point in sled space: az 0 = ahead of the sled, PI/2 = its left; elev in radians above level
const cam = (lx, ly, lz, az, dist, elev, hideRider = true, fov) => ev(`(() => { window.preR = () => { V.rider.visible = ${!hideRider}; V.hands.forEach(h => h.visible = ${!hideRider}); }; window.camOv = c => { sledBody.updateMatrixWorld(true); const T = sledBody.localToWorld(new THREE.Vector3(${lx}, ${ly}, ${lz})), a = P.yaw + ${az};
  c.position.set(T.x + Math.sin(a) * Math.cos(${elev}) * ${dist}, T.y + Math.sin(${elev}) * ${dist}, T.z + Math.cos(a) * Math.cos(${elev}) * ${dist}); c.lookAt(T); ${fov ? `if (c.fov !== ${fov}) { c.fov = ${fov}; c.updateProjectionMatrix(); }` : ""} }; return true; })()`);
await ev("window.__fov0 = camera.fov; true");
const resetFov = () => ev("camera.fov = window.__fov0; camera.updateProjectionMatrix(); true");

// the machine's own visible meshes (sled space, no rider, no tablet): cost, material and geometry checks
const AUDIT = `(() => {
  const out = { calls: 0, tris: 0, box: [], untex: [], glow: [], mats: 0 }, ms = new Set();
  const skip = o => { for (let p = o; p; p = p.parent) { if (p === V.rider || p === V.tab || p === V.tabArm || p === V.tabKnob || p === cargoMesh || p === V.rackBox || (window.SNS && p === SNS.g)) return true; } return false; };
  const vis = o => { for (let p = o; p && p !== sledRoot; p = p.parent) if (!p.visible) return false; return true; };
  sledBody.traverse(o => { if (!o.isMesh || !vis(o) || skip(o)) return;
    out.calls++; const g = o.geometry; out.tris += (g.index ? g.index.count : g.attributes.position.count) / 3; const m = o.material; ms.add(m);
    if (g.type === "BoxGeometry" && !(o.userData.flat)) out.box.push(o.name || "box");
    if (!(m.map || m.normalMap) && !m.userData.flat) out.untex.push(m.color ? m.color.getHexString() : "?");
    if (m.emissive && m.emissive.getHex() !== 0 && !m.userData.lens) out.glow.push(m.emissive.getHexString()); });
  out.mats = ms.size; out.untex = [...new Set(out.untex)]; return out; })()`;
const UD = id => `(() => { const u = V.machineOf(${JSON.stringify(id)}).userData, bad = []; for (const k of ["boardX","zBack","tw","tl","barY","barZ","seatTop","seatW","hoodW","hoodZ0"]) if (!Number.isFinite(u[k])) bad.push(k);
  for (const k of ["hip","shield","lightBar","scoop"]) if (!u[k]) bad.push(k); for (const k of ["hoodY","seatTopAt"]) if (typeof u[k] !== "function") bad.push(k);
  for (const k of ["hood","seat","pod"]) if (!u[k]) bad.push(k); if (!u.skis || u.skis.length !== 2) bad.push("skis"); if (!u.decal || !u.decal.stripe || !u.decal.wide || !u.decal.flash) bad.push("decal"); if (!u.hoodPts || !u.hoodPts.length) bad.push("hoodPts"); if (!u.footwell || u.footwell.length !== 2) bad.push("footwell");
  return bad; })()`;
const HANDS = `(() => { sledRoot.updateMatrixWorld(true); const gp = V.grip.map(g => barPivot.localToWorld(g.clone())), hp = V.hands.map(h => { const v = new THREE.Vector3(); h.getWorldPosition(v); return v; });
  const grip = gp.map((g, i) => g.distanceTo(hp[i])); const u = V.machineOf(GS.own.sled).userData, bz = [];
  const boots = (V.footPlain.concat(V.boots)).filter(b => { for (let p = b; p; p = p.parent) if (!p.visible) return false; return true; }).map(b => { const v = new THREE.Vector3(); b.getWorldPosition(v); sledBody.worldToLocal(v); return { x: v.x, y: v.y, z: v.z }; });
  return { grip, boots, boardX: u.boardX, boardTop: 0.385 }; })()`;

// ---------------- boot cost ----------------
const BM = await J(`({ bm: V.buildMs === undefined ? null : V.buildMs, ms: TLXL.sled ? (TLXL.sled.ms || 0) : 0, sledTex: TLXL.sled ? (TLXL.sled.texMs || 0) : 0, lookMs: TLXL.ms })`); console.log("buildMachines", JSON.stringify(BM));
if (!R0) {
  ok(BM.bm !== null && BM.bm < 900, `buildMachines took ${BM.bm} ms for ten machines`);
  ok(BM.sledTex < 250, `sled textures ${BM.sledTex.toFixed(0)} ms (the whole look kit ${BM.lookMs.toFixed(0)} ms)`);
}

// ---------------- per machine: asserts + the turntable ----------------
const table = {};
for (const id of ids) {
  await setSled(id); await sleep(300);
  const bad = await J(UD(id)); const A = await J(AUDIT);
  const tab = await J("({ c: V.tabClear, s: V.colShows })");
  const H = await J(HANDS);
  table[id] = { calls: A.calls, tris: Math.round(A.tris), mats: A.mats };
  console.log(id, JSON.stringify(table[id]), "box:", A.box.length, "untex:", A.untex.join(","), "tabClear", tab.c && tab.c.toFixed(3), tab.s, "grip", H.grip.map(v => v.toFixed(3)).join("/"), "boots", H.boots.map(b => `${b.x.toFixed(2)},${b.y.toFixed(3)}`).join(" "));
  if (!R0) {
    ok(bad.length === 0, `${id}: userData complete ${bad.join(",")}`);
    ok(A.box.length === 0, `${id}: no bare BoxGeometry in a shaped part (${A.box.length}: ${[...new Set(A.box)].slice(0, 6).join(",")})`);
    ok(A.untex.length === 0, `${id}: every material has a map or normal map ${A.untex.join(",")}`);
    ok(A.glow.length === 0, `${id}: nothing emissive but light lenses ${A.glow.join(",")}`);
    ok(tab.c >= 0 && tab.s === true, `${id}: tablet clear of the column (${tab.c}) and the column shows (${tab.s})`);
    ok(H.grip.every(d => d < 0.06), `${id}: hands within 6 cm of the grips (${H.grip.map(v => v.toFixed(3)).join("/")})`);
    ok(H.boots.length === 2 && H.boots.every(b => Math.abs(Math.abs(b.x) - H.boardX) < 0.1 && Math.abs(b.y - 0.385) < 0.05), `${id}: boots on the boards (${H.boots.map(b => b.x.toFixed(2) + "," + b.y.toFixed(3)).join(" ")} boardX ${H.boardX.toFixed(2)})`);
    ok(A.calls <= (process.env.CALLS ? +process.env.CALLS : 90) && A.tris < 60000, `${id}: budget ${A.calls} calls, ${Math.round(A.tris)} tris`);
  }
  if (!STILLS) continue;
  const u = await J(`(() => { const u = V.machineOf(${JSON.stringify(id)}).userData; return { zBack: u.zBack, tl: u.tl, zc: (u.zBack + 1.0) / 2, tw: u.tw, barY: u.barY, barZ: u.barZ, hoodTop: u.hoodY(0.6) }; })()`);
  const zc = (u.zBack + 1.0) / 2;
  await cam(0, 0.62, zc, 0.62, 3.3, 0.28); await snap(`${id}_a34front`);
  await cam(0, 0.62, zc, 1.5708, 3.3, 0.12); await snap(`${id}_b_side`);
  await cam(0, 0.62, zc, 3.14 - 0.62, 3.3, 0.28); await snap(`${id}_c34rear`);
  await cam(0, 0.62, zc, 0, 3.2, 0.12); await snap(`${id}_d_front`);
  await cam(0, 0.5, zc, 0.5, 3.4, 0.87); await snap(`${id}_e_top`);
  await cam(0, 0.62, zc, 1.5708, 3.3, 0.1, false); await snap(`${id}_f_rider_side`);
  if (CLOSE.includes(id)) {
    const z1 = 1.25;
    await cam(0, 0.62, z1, 0.5, 1.5, 0.12); await snap(`${id}_g_nose`);
    await cam(0, u.barY, u.barZ, 0.6, 1.1, 0.5, true); await snap(`${id}_h_bars`);
    await cam(0, 0.78, -0.55, 1.0, 1.4, 0.35, true); await snap(`${id}_i_seat`);
    await cam(0, 0.3, -0.7, 1.5708, 1.8, 0.0, true); await snap(`${id}_j_track`);
    await cam(0.5, 0.15, 0.92, 0.9, 1.3, 0.1, true); await snap(`${id}_k_ski`);
    await cam(0, 0.5, u.zBack, 3.14 - 0.5, 1.5, 0.25, true); await snap(`${id}_l_tail`);
  }
}
if (!R0 && ids.length > 1) { const calls = ids.map(i => table[i].calls); console.log("calls", JSON.stringify(table)); }

// ---------------- the track animates ----------------
if (!R0) {
  await setSled(ids[0]);
  const t0 = await J(`({ off: V.beltTex ? V.beltTex.offset.y : null, u: V.beltU ? V.beltU.value : null, wa: V.wheelA.rotation.x })`);
  await ev(`(() => { P.vx = Math.sin(P.yaw) * 12; P.vz = Math.cos(P.yaw) * 12; return true; })()`); const g0 = await ev("gameClock"); await sleep(1100);
  const t1 = await J(`({ off: V.beltTex ? V.beltTex.offset.y : null, u: V.beltU ? V.beltU.value : null, wa: V.wheelA.rotation.x })`);
  ok(t1.off !== t0.off || t1.u !== t0.u, `the belt rolls at speed (${JSON.stringify(t0)} -> ${JSON.stringify(t1)})`);
  ok(t1.wa !== t0.wa, "the wheels turn");
}

// ---------------- part options: each changes something, none throws ----------------
if (!R0) {
  const three = ["frontier", "ranger", "trekker"].filter(i => ids.includes(i) || !process.env.ONLY);
  const cats = await J("PART_ORDER.map(c => [c, PARTS[c].options.map(o => o.id)])");
  const sig = `(() => { sledRoot.updateMatrixWorld(true); const out = []; const vis = o => { for (let p = o; p && p !== sledRoot; p = p.parent) if (!p.visible) return false; return true; }, inR = o => { for (let p = o; p; p = p.parent) if (p === V.rider) return true; return false; };
    sledBody.traverse(o => { if (o.isMesh && vis(o) && !inR(o)) { const e = o.matrixWorld.elements; out.push(o.geometry.id + ":" + o.material.id + ":" + [e[0], e[5], e[10], e[12], e[13], e[14]].map(v => v.toFixed(3)).join(",")); } });
    out.push("bar" + barPivot.position.y.toFixed(3)); return out.join("|"); })()`;
  const errs0 = errors.length;
  for (const id of three) {
    await setSled(id);
    const own0 = await J("JSON.parse(JSON.stringify(GS.own.parts))");
    for (const [cat, opts] of cats) {
      let prev = null; const sigs = new Set();
      for (const o of opts) { await ev(`GS.own.parts[${JSON.stringify(cat)}] = ${JSON.stringify(o)}; applyLoadout(); true`); sigs.add(await ev(sig)); }
      // options that are free stat changes with no mesh (none: every category must show something)
      ok(sigs.size > 1 || opts.length < 2, `${id}: ${cat} has ${opts.length} options, ${sigs.size} distinct looks`);
      await ev(`GS.own.parts[${JSON.stringify(cat)}] = ${JSON.stringify(own0[cat])}; applyLoadout(); true`);
    }
  }
  ok(errors.length === errs0, "cycling every part option threw nothing " + errors.slice(errs0).join(" | "));
}

// ---------------- a fully loaded machine on three sizes ----------------
if (STILLS) {
  const loaded = await J("PART_ORDER.map(c => [c, PARTS[c].options[PARTS[c].options.length - 1].id])");
  for (const id of ["frontier", "ranger", "trekker"].filter(i => ids.includes(i))) {
    await setSled(id);
    await ev(`(() => { const L = ${JSON.stringify(loaded)}; for (const [c, o] of L) GS.own.parts[c] = o; applyLoadout(); return true; })()`);
    const zc = ((await J(`V.machineOf(${JSON.stringify(id)}).userData.zBack`)) + 1.0) / 2;
    await cam(0, 0.62, zc, 0.7, 4.8, 0.25, false); await snap(`${id}_m_loaded34`);
    await cam(0, 0.62, zc, 1.5708, 4.8, 0.12, false); await snap(`${id}_m_loaded_side`);
    await ev(`GS.own.parts = OWN0().parts; applyLoadout(); true`);
  }
}
// ---------------- first person, night, overcast, chase, garage ----------------
if (STILLS) {
  for (const id of ["frontier", "apex", "trekker"].filter(i => ids.includes(i))) {
    await setSled(id); await ev("window.camOv = null; window.preR = null; camMode = VIEWS.findIndex(v => v.fp); camState.init = false; true"); await sleep(1500); await snap(`${id}_n_firstperson`);
    await ev("camMode = 1; camState.init = false; true"); await sleep(600);
  }
  const id0 = ids.includes("frontier") ? "frontier" : ids[0];
  await setSled(id0); const zc0 = (await J(`V.machineOf(${JSON.stringify(id0)}).userData.zBack`) + 1.0) / 2;
  await ev("GS.hour = Math.floor(GS.hour / 24) * 24 + 23; true"); await sleep(1200);
  await cam(0, 0.62, zc0, 0.5, 4.3, 0.2, false); await snap(`${id0}_o_night`);
  await ev("GS.hour = Math.floor(GS.hour / 24) * 24 + 12; WX.at = () => 0.9; GS.storm = 0; true"); await sleep(1500);
  await cam(0, 0.62, zc0, 0.5, 4.3, 0.2, false); await snap(`${id0}_p_overcast`);
  await ev("WX.at = () => 0; true");
  // the default chase camera at speed (track animating)
  await ev("window.camOv = null; window.preR = null; camMode = 1; camState.init = false; P.yaw = 0; true"); await sleep(600);
  await ev("(() => { window.__drive = setInterval(() => { P.vz = 14 * Math.cos(P.yaw); P.vx = 14 * Math.sin(P.yaw); }, 30); return true; })()"); await sleep(2500); await snap(`${id0}_q_chase`); await sleep(160); await snap(`${id0}_q_chase2`);
  await ev("clearInterval(window.__drive); P.vx = P.vz = 0; true");
  // the garage / showroom preview
  await ev("GS.garageOpen = true; true"); await sleep(1500); await snap(`${id0}_r_garage`); await ev("GS.garageOpen = false; true");
}
await sleep(300);
ok(errors.length === 0, "no page errors " + errors.slice(0, 4).join(" | "));
await done(fails.length ? 1 : 0);

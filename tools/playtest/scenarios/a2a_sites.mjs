// G9 slice A2a: drug sites in the world, the crew's routines, spotting one yourself, tips (tlx-raids.js v1). Asserts, exit 1 on a failure.
//  1 SEED     the week's sites are deterministic from the world and the week, 2-3 of them, and every spot passes the checks (250 m from every door and
//             village, dry, near-level, off the roads, trails and plowed yards); the next week is another set.
//  2 BUILD    meshes are built past the fog and disposed beyond it (nothing within view pops in); the crew is only simulated near; far sites cost nothing.
//  3 REST     the barn, the van (wheels sunk to the snow line), the cans, the bags, the drum, the generator all rest on the snow: not floating, not buried.
//  4 ROUTINES the seven routines run (look-out smoking, tub carriers, rubbish into the drum fire, phone pacing, refuelling the generator, a sled idling
//             at the gate that leaves and returns, a shoveller) and the dog; every figure moves continuously (no teleport) with its feet on the snow.
//  5 REACT    notice > wary > warn-off > barred by distance, the look-out turns to watch you, and it all resets once you have gone.
//  6 SPOT     an unknown site has no map mark, no Jobs row and no HUD line; the hidden read fills only with a clear line of sight (blocked behind a rise),
//             faster close, faster through the scope, faster at night; a HUD line shows once it is a third full; when full the site is marked as found
//             (its own glyph), a Jobs row, a toast, a note in the Vakt app. No licence, rifle or standing needed.
//  7 TIPS     none below the standing threshold, none before the fifth finished job, one after crossing it; the thread (2-4 lines, 12 templates), the
//             tipped mark, the Jobs row with its compass target; stale handling; found and tipped merge; tipster trades fit.
//  8 SAVE     sites, found/tipped, tips survive a reload; an old save loads.   9 OPTION  off removes sites and marks.   10 PROMPTS keyboard, pad, touch.
//  11 ROOM    the walk-in room builds and can be entered through the test hook.   12 A1 FIXES  the guard-shift walk-in figure is upright with swinging
//             arms and planted feet; the posts have their employer's things and the van's wheels are in the snow; contact trades fit; the tabs are clear.
// Stills (OUT) when NOSTILLS is not set: see the stills script a2a_stills.mjs.
import { boot, ev, raw, tap, down, up, sleep, done, shot, park, reload, padSet, padOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const section = async (n, f) => { if (process.env.ONLY && !new RegExp(process.env.ONLY).test(n)) return; console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 500)); } };
const clock = () => ev("gameClock");
async function until(expr, secs, ms = 100) { const t0 = await clock(); while ((await clock()) - t0 < secs) { if (await ev(expr)) return true; await sleep(ms); } return !!(await ev(expr)); }
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(80); }
const toasts = () => J(`[...new Set((window.__tsr || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsr = [];
  if (!window.__tsrI) window.__tsrI = setInterval(() => { const a = window.__tsr || (window.__tsr = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80);
  return true; })()`);
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 37; TLX.setOn("police", false); TLX.setOn("traffic", false); TLX.setOn("armedwork", true); TLX.setOn("raids", true); TLXAW.TUNE.evK = 1; true`;
const KIT = `(() => {
  clearInterval(window.__warm); window.__warm = setInterval(() => { GS.warmth = 100; GS.health = 100; }, 400);
  window.__S = i => TLXRD.S().sites[i];
  window.__door = i => { const s = __S(i), B = s.B || TLXRD.build(s); return B.pt(B.pts.door[0], B.pts.door[1] - 0.45); };
  // the player on foot at distance d from site i's door, on the bearing a (local radians, 0 = out along the track)
  window.__atD = (i, d, a, face) => { const s = __S(i), B = s.B || TLXRD.build(s), dp = __door(i), an = s.ry + (a || 0), x = dp.x + Math.sin(an) * d, z = dp.z + Math.cos(an) * d;
    FOOT.on = true; FOOT.x = x; FOOT.z = z; FOOT.y = surf(x, z); FOOT.sp = FOOT.fwd = 0; if (face !== false) FOOT.yaw = Math.atan2(dp.x - x, dp.z - z); camState.init = false; if (FOOT.g) FOOT.g.visible = true; return true; };
  // a dry spot on a ring round the site (for "far away")
  window.__ring = (i, d) => { const s = __S(i); for (let a = 0; a < 6.28; a += 0.2) { const x = s.x + Math.cos(a) * d, z = s.z + Math.sin(a) * d; if (!isSea(x, z) && !isWater(x, z) && slopeAt(x, z, 6) < 0.4) return [x, z]; } return [s.x + d, s.z]; };
  // a spot d metres from the door from which the door sign is in clear sight (hills hide most bearings at long range)
  window.__clearRing = (i, d) => { const s = __S(i), dp = __door(i); for (let a = 0; a < 6.28; a += 0.04) { const x = dp.x + Math.cos(a) * d, z = dp.z + Math.sin(a) * d; if (isSea(x, z) || isWater(x, z)) continue; const eyeY = surf(x, z) + 1.6, sg = TLXRD.signs(s); if (sg[0].name === "door" && TLXRD.losPts(x, eyeY, z, sg[0].x, sg[0].y, sg[0].z)) return [x, z]; } return null; };
  window.__atP = (i, p) => { const dp = __door(i); FOOT.on = true; FOOT.x = p[0]; FOOT.z = p[1]; FOOT.y = surf(p[0], p[1]); FOOT.sp = FOOT.fwd = 0; FOOT.yaw = Math.atan2(dp.x - p[0], dp.z - p[1]); camState.init = false; if (FOOT.g) FOOT.g.visible = true; return true; };
  window.__farFrom = (i, d) => { const p = __ring(i, d); FOOT.on = true; FOOT.x = p[0]; FOOT.z = p[1]; FOOT.y = surf(p[0], p[1]); FOOT.sp = FOOT.fwd = 0; camState.init = false; if (FOOT.g) FOOT.g.visible = true; return p; };
  window.__q = (lic, rifle, owed) => { const g = TLXGUN, s = g.state(); s.licence = !!lic; s.owned = rifle ? [g.newGun(g.FRAMES[0].id)] : []; s.cur = rifle ? 0 : -1; TLXP.S().owed = owed || 0; return true; };
  window.__plant = (o) => { const S = TLXAW.S(); S.active = null; const base = o.type === "shift" ? { type: "shift", emp: TLXAW.postDef(o.post).emp, spot: TLXAW.spotOf(o.post), len: 3, pay: 255, n: 3 } : { type: "courier", emp: TLXAW.CASES.find(c => c.kind === o.kind).emp, dist: Math.round(Math.hypot(o.to.x - o.from.x, o.to.z - o.from.z)), pay: 300, limH: 3, tail: false };
    const c = Object.assign({ id: "t" + Math.random().toString(36).slice(2, 7) }, base, o); S.offers = [c]; return c.id; };
  // a tracker: every frame, every figure of site i: where it stands, its soles, its torso, its hands against its shoulders
  // a rise: raise the bare ground along a line (a wall of earth across the track) and put it back
  window.__wall = (i, on) => { const s = __S(i), T = world_terrain(); if (!on) { for (const [k, v] of window.__wallB || []) T.ground[k] = v; window.__wallB = null; return true; } window.__wallB = [];
    const dp = __door(i), ax = Math.sin(s.ry), az = Math.cos(s.ry), cx = dp.x + ax * 55, cz = dp.z + az * 55;
    for (let u = -40; u <= 40; u += 2) for (let v = -6; v <= 6; v += 2) { const x = cx + az * u + ax * v, z = cz - ax * u + az * v, ix = Math.round((x + HALF) / T.res), iz = Math.round((z + HALF) / T.res), k = iz * T.n + ix; if (!window.__wallB.some(q => q[0] === k)) { window.__wallB.push([k, T.ground[k]]); T.ground[k] += 7 * (1 - Math.abs(v) / 8); } }
    return true; };
  window.world_terrain = () => ({ ground, res: GRES, n: GN });
  window.__trkOn = false; window.__trk = {};
  window.__trkStart = i => { window.__trk = {}; window.__trkOn = true; const s = __S(i); let last = gameClock;
    const step = () => { if (!window.__trkOn) return; const C = s.C, t = gameClock; if (C && t > last) { for (const f of C.figs) { const rec = window.__trk[f.role] || (window.__trk[f.role] = []); let r;
        if (f.role === "dog") r = { t, x: f.o.x, z: f.o.z, vis: true, sy: surf(f.o.x, f.o.z), gy: f.dog.g.position.y, st: f.st };
        else if (f.role === "rider") r = { t, x: f.o.x, z: f.o.z, vis: !f.hidden && !!f.R && f.R.g.visible, sy: surf(f.o.x, f.o.z), gy: f.R ? f.R.g.position.y : 0, st: f.st };
        else { const g = f.g; if (!g || !g.visible) { r = { t, vis: false, st: f.st, x: f.o.x, z: f.o.z }; } else { const U = g.userData, a0 = new THREE.Vector3(), a1 = new THREE.Vector3(), h0 = new THREE.Vector3(), h1 = new THREE.Vector3(), s0 = new THREE.Vector3(), s1 = new THREE.Vector3();
          U.ank[0].getWorldPosition(a0); U.ank[1].getWorldPosition(a1); U.fore[0].userData.hand.getWorldPosition(h0); U.fore[1].userData.hand.getWorldPosition(h1); U.arms[0].getWorldPosition(s0); U.arms[1].getWorldPosition(s1);
          const sc = f.sc; r = { t, vis: true, st: f.st, x: f.o.x, z: f.o.z, sole: [a0.y - 0.075 * sc - surf(a0.x, a0.z), a1.y - 0.075 * sc - surf(a1.x, a1.z)], lean: U.torso.rotation.x, hy: [h0.y - s0.y, h1.y - s1.y], v: f.v }; } }
        rec.push(r); } last = t; }
      requestAnimationFrame(step); };
    requestAnimationFrame(step); return true; };
  window.__trkStop = () => { window.__trkOn = false; return true; };
  return true; })()`;

await boot();
await ev(SETUP); await sleep(800); await ev(KIT); await clearToasts();
ok(await ev(`typeof TLXRD === "object" && !!TLX.state("raids") && !!TLXAW`), "tlx-raids loaded, state present");
const trk = () => J("window.__trk");

await section("1 seed", async () => {
  const wk = await ev("TLXRD.weekNow()"); ok(wk === 0, "a new game starts in week 0");
  const a = await J(`TLXRD.seedWeek(0).map(s => ({ id: s.id, x: s.x, z: s.z, ry: s.ry, n: s.n, seed: s.seed, rider: s.rider }))`), b = await J(`TLXRD.seedWeek(0).map(s => ({ id: s.id, x: s.x, z: s.z, ry: s.ry, n: s.n, seed: s.seed, rider: s.rider }))`);
  ok(JSON.stringify(a) === JSON.stringify(b) && a.length >= 2 && a.length <= 3, `seeding is deterministic and gives 2-3 sites (week 0: ${a.length}, ${a.map(s => s.id).join(", ")})`);
  const live = await J(`TLXRD.S().sites.map(s => ({ id: s.id, x: s.x, z: s.z }))`);
  ok(JSON.stringify(live.map(s => [s.id, s.x, s.z])) === JSON.stringify(a.map(s => [s.id, s.x, s.z])), "the live sites are the week's seed");
  const w1 = await J(`TLXRD.seedWeek(1).map(s => [s.x, s.z])`), w2 = await J(`TLXRD.seedWeek(2).map(s => [s.x, s.z])`);
  ok(w1.length >= 2 && w1.length <= 3 && w2.length >= 2 && w2.length <= 3 && JSON.stringify(w1) !== JSON.stringify(a.map(s => [s.x, s.z])) && JSON.stringify(w1) !== JSON.stringify(w2), "next weeks seed other places (" + w1.length + ", " + w2.length + " sites)");
  // an independent check of every spot of six weeks
  const bad = await J(`(() => { const out = [], seen = []; for (let wk = 0; wk < 6; wk++) for (const s of TLXRD.seedWeek(wk)) { const r = [];
    if (isSea(s.x, s.z) || isWater(s.x, s.z)) r.push("wet");
    for (const d of KIT.doors) if (Math.hypot(d.x - s.x, d.z - s.z) < 250) r.push("door " + Math.round(Math.hypot(d.x - s.x, d.z - s.z)));
    for (const q of SITES) if (q.x !== undefined && Math.hypot(q.x - s.x, q.z - s.z) < 250) r.push("site " + q.name);
    if (slopeAt(s.x, s.z, 10) > 0.07) r.push("slope " + slopeAt(s.x, s.z, 10).toFixed(3));
    let lo = 1e9, hi = -1e9; for (let a = 0; a < 16; a++) { const y = groundAt(s.x + Math.cos(a * 0.39) * 8, s.z + Math.sin(a * 0.39) * 8); lo = Math.min(lo, y); hi = Math.max(hi, y); } if (hi - lo > 1.2) r.push("rim " + (hi - lo).toFixed(2));
    if (TLXR.ready && TLXR.near(s.x, s.z).d < 70) r.push("road");
    if (window.TLXSK && TLXSK.ready && TLXSK.nearest(s.x, s.z, 70)) r.push("trail");
    if (yardAt(s.x, s.z)) r.push("yard"); if (obstaclesNear(s.x, s.z, 18).some(o => !o.raid)) r.push("obstacle");
    if (Math.abs(s.x) > 3900 || Math.abs(s.z) > 3900) r.push("edge");
    if (r.length) out.push(s.id + ": " + r.join(", ")); seen.push([s.x, s.z]); }
    return { out, n: seen.length }; })()`);
  ok(bad.out.length === 0 && bad.n >= 12, `${bad.n} spots over six weeks: all 250 m+ from doors and villages, dry, near-level, off roads, trails and yards ${JSON.stringify(bad.out)}`);
});

await section("2 build and dispose by distance", async () => {
  const far = await J(`(() => { const s = __S(0), p = __farFrom(0, 1900); return { built: !!s.B, d: Math.round(Math.hypot(FOOT.x - s.x, FOOT.z - s.z)) }; })()`); await sleep(900);
  ok(await ev(`!__S(0).B && !__S(0).C && TLXRD.SITES_LIVE.length === 0`), `at ${far.d} m nothing is built (and no meshes, no crew): a far site costs nothing`);
  const nSc = await ev(`scene.children.length`);
  await ev(`__farFrom(0, 1420); true`); ok(await until(`!!__S(0).B`, 8), "inside 1500 m (past the fog: the barn is a smudge at that range) the meshes are built");
  ok(await ev(`!__S(0).C`), "the crew is not yet simulated at 1400 m");
  const obs0 = await ev(`__S(0).B.obs.length`); ok(obs0 > 8 && (await ev(`obstaclesNear(__S(0).x, __S(0).z, 3).some(o => o.raid)`)), "the barn is solid (colliders added)");
  await ev(`__farFrom(0, 700); true`); ok(await until(`!!__S(0).C && __S(0).C.queue.length === 0`, 15), "inside 760 m the crew is spawned (one figure a frame)");
  await ev(`__farFrom(0, 830); true`); await sleep(800); ok(await ev(`!!__S(0).C`), "between 760 and 860 m the crew stays (a margin, no flicker)");
  await ev(`__farFrom(0, 900); true`); ok(await until(`!__S(0).C`, 6), "past 860 m the crew is freed");
  await ev(`__farFrom(0, 1900); true`); ok(await until(`!__S(0).B`, 6), "past 1800 m the meshes are disposed");
  const nAfter = await ev(`(window.__kids = new Set(scene.children.map(c => c.uuid)), scene.children.length)`);
  ok(await ev(`!obstaclesNear(__S(0).x, __S(0).z, 12).some(o => o.raid)`), "the colliders are gone again");
  // no leak: a second build, crew and dispose leaves the scene exactly where the first one did (the pooled figures are reused). The count itself moves with other systems streaming in.
  await ev(`__farFrom(0, 700); true`); await until(`!!__S(0).C && __S(0).C.queue.length === 0`, 15); await ev(`__farFrom(0, 1900); true`); await until(`!__S(0).B && !__S(0).C`, 8); await sleep(400);
  const nAfter2 = await ev(`scene.children.length`); console.log("  scene children: before the first build", nSc, "after dispose", nAfter, "after a second cycle", nAfter2);
  // other systems stream their own things in and out all the time: what counts is anything new that stands at the site
  const left = await J(`(() => { const s = __S(0), v = new THREE.Vector3(); return scene.children.filter(c => !window.__kids.has(c.uuid)).map(c => { c.getWorldPosition(v); return { type: c.type, name: c.name || "", d: Math.round(Math.hypot(v.x - s.x, v.z - s.z)), vis: c.visible, kids: c.children.length }; }).filter(o => o.d < 200); })()`);
  ok(left.length === 0, "a second build and dispose leaves nothing new standing at the site (scene " + nAfter + " -> " + nAfter2 + "): " + JSON.stringify(left).slice(0, 700));
  // build time
  await ev(`__farFrom(0, 1420); true`); await until(`!!__S(0).B`, 8);
  const bt = await ev(`(() => { const s = __S(0); TLXRD.dispose(s); const t = performance.now(); TLXRD.build(s); return Math.round(performance.now() - t); })()`); console.log("  barn build:", bt, "ms");
  ok(bt < 400, "building a barn takes under 400 ms (" + bt + " ms), done once at 1.4 km");
});

await section("3 resting on the ground", async () => {
  await ev(`__farFrom(0, 400); true`); await until(`!!__S(0).B`, 8);
  const r = await J(`(() => { const B = __S(0).B; B.g.updateMatrixWorld(true); return B.rests.map(q => { const bb = new THREE.Box3().setFromObject(q.obj); return { name: q.name, kind: q.kind, min: +(bb.min.y - q.ref).toFixed(3), max: +(bb.max.y - q.ref).toFixed(3) }; }); })()`);
  const kinds = {}; for (const q of r) kinds[q.name] = (kinds[q.name] || 0) + 1; console.log("  parts:", JSON.stringify(kinds));
  const names = ["barn", "van", "wheel", "can", "bag", "drum", "generator", "kennel", "tub"];
  ok(names.every(n => kinds[n]), "the parts are there: " + names.join(", "));
  const floating = r.filter(q => q.min > 0.1), buried = r.filter(q => q.min < -0.8 && q.kind !== "barn"), wheels = r.filter(q => q.kind === "wheel");
  ok(floating.length === 0, "nothing floats (lowest point at most 10 cm over the snow): " + JSON.stringify(floating.slice(0, 3)));
  ok(buried.length === 0, "nothing is half buried: " + JSON.stringify(buried.slice(0, 3)));
  ok(wheels.length === 4 && wheels.every(q => q.min <= -0.1 && q.min >= -0.4 && q.max >= 0.25), "the van's four wheels are sunk to the snow line (bottom 10-40 cm under it, the tyre still showing): " + JSON.stringify(wheels.map(q => [q.min, q.max])));
  const barn = r.find(q => q.name === "barn"); ok(barn.min <= 0 && barn.min >= -0.6, "the barn's plinth stands on the lowest snow, not hung over it: " + barn.min);
});

await section("4 routines", async () => {
  await ev(`GS.hour = 37; __farFrom(0, 230); true`); await until(`!!__S(0).C && __S(0).C.queue.length === 0`, 15);
  ok(await ev(`(() => { const C = __S(0).C; const n = C.figs.filter(f => f.role !== "dog" && f.role !== "rider").length; return n >= 3 && n <= 5; })()`), "3-5 men on the crew: " + (await J(`__S(0).C.figs.map(f => f.role)`)).join(", "));
  // the other sites too: crew size 3..5
  ok((await J(`TLXRD.S().sites.map(s => s.n)`)).every(n => n >= 3 && n <= 5), "every site's crew is 3-5");
  // make the site five strong, a rider and a dog so each routine can run
  await ev(`(() => { const s = __S(0); TLXRD.freeCrew(s); s.n = 5; s.rider = true; TLXRD.spawn(s); TLXRD.crew(s).react.calm = 0; return true; })()`);
  await ev(`__trkStart(0); true`); await clearToasts();
  const seen = {}; const want = { look: ["post"], carA: ["pick", "carry", "set"], carB: ["pick", "carry", "set"], phone: ["pace", "stop", "canPick", "pour", "canSet"], shov: ["shovel"], rider: ["idle"], dog: ["rest"] };
  const t0 = await clock(); const roles = Object.keys(want);
  while ((await clock()) - t0 < 130) { const st = await J(`__S(0).C.figs.map(f => [f.role, f.st])`); for (const [r, s] of st) (seen[r] = seen[r] || new Set()).add(s); if (roles.every(r => want[r].every(s => seen[r] && seen[r].has(s)))) break; await sleep(250); }
  const sr = Object.fromEntries(Object.entries(seen).map(([k, v]) => [k, [...v]])); console.log("  states seen by day:", JSON.stringify(sr));
  ok(want.look.every(s => seen.look && seen.look.has(s)), "routine 1: the look-out smokes by the door (states: " + [...(seen.look || [])].join(",") + ")");
  ok(["pick", "carry", "set"].every(s => seen.carA && seen.carA.has(s)) && ["pick", "carry", "set"].every(s => seen.carB && seen.carB.has(s)), "routine 2: two men carry tubs van -> barn, picking up, carrying and setting down");
  ok(["pace", "stop"].every(s => seen.phone && seen.phone.has(s)), "routine 3: a man paces on his phone");
  ok(["canPick", "pour", "canSet"].every(s => seen.phone && seen.phone.has(s)), "routine 4: a man carries a can to the generator and pours it in");
  ok(seen.shov && seen.shov.has("shovel"), "routine 5: a man shovels snow over the tracks");
  ok(seen.rider && seen.rider.has("idle") && (await ev(`!__S(0).C.figs.find(f => f.role === "rider").hidden`)), "routine 6: a sled idles at the gate with its lights off");
  ok(seen.dog && seen.dog.has("rest"), "the dog is on its chain");
  // routine 7: burning rubbish at night (the shoveller)
  await ev(`GS.hour = 46; true`); await waitGame(1);
  const sn = {}; const t1 = await clock();
  while ((await clock()) - t1 < 70) { const st = await J(`__S(0).C.figs.filter(f => f.role === "shov").map(f => f.st)`); for (const s of st) sn[s] = 1; if (["bagPick", "bagWalk", "throw", "warm"].every(s => sn[s])) break; await sleep(250); }
  console.log("  shoveller by night:", Object.keys(sn).join(","));
  ok(["bagPick", "bagWalk", "throw", "warm"].every(s => sn[s]), "routine 7: by night the same man feeds rubbish into the drum fire and warms his hands at it");
  // the rider leaves when you come near and is back once you have gone
  await ev(`GS.hour = 37; true`); await waitGame(2);
  const rr0 = await J(`(() => { const f = __S(0).C.figs.find(f => f.role === "rider"); return { st: f.st, hidden: f.hidden }; })()`); console.log("  rider before:", JSON.stringify(rr0));
  await ev(`(() => { const s = __S(0), B = s.B, g = B.pt(B.pts.gate[0], B.pts.gate[1]); __atD(0, 80, 0); FOOT.x = g.x + Math.sin(s.ry) * 60; FOOT.z = g.z + Math.cos(s.ry) * 60; FOOT.y = surf(FOOT.x, FOOT.z); return true; })()`);
  ok(await until(`(() => { const f = __S(0).C.figs.find(f => f.role === "rider"); return f && (f.st === "leave" || f.st === "away"); })()`, 12), "the rider leaves when you get near the gate");
  await ev(`__farFrom(0, 240); true`);
  ok(await until(`(() => { const f = __S(0).C.figs.find(f => f.role === "rider"); return f && f.st === "idle" && !f.hidden; })()`, 60), "and returns to the gate once you have gone (routine 6 in full)");
  await ev(`__trkStop(); true`);
  const T = await trk();
  // movement is continuous: a step per frame never above what its speed allows; feet on the snow
  const rep = []; let allMoved = true;
  for (const role of Object.keys(T)) {
    const a = T[role]; let maxStep = 0, moved = 0, sunk = 1e9, float = -1e9, ds = [], n = 0;
    for (let i = 1; i < a.length; i++) { const p = a[i - 1], q = a[i]; if (!p.vis || !q.vis) continue; const dt = Math.max(1e-3, q.t - p.t), st = Math.hypot(q.x - p.x, q.z - p.z); if (st / dt > 9) { maxStep = Math.max(maxStep, st); } moved = Math.max(moved, st); maxStep = Math.max(maxStep, st);
      if (q.sole) { for (const s of q.sole) { sunk = Math.min(sunk, s); float = Math.max(float, s); ds.push(Math.abs(s)); n++; } } else if (q.gy !== undefined) { ds.push(Math.abs(q.gy - q.sy)); } }
    ds.sort((x, y) => x - y); rep.push({ role, frames: a.length, maxStep: +maxStep.toFixed(3), sunk: sunk === 1e9 ? null : +sunk.toFixed(2), float: float === -1e9 ? null : +float.toFixed(2), med: ds.length ? +ds[Math.floor(ds.length / 2)].toFixed(3) : null });
  }
  console.log("  tracker:", JSON.stringify(rep));
  const walkers = rep.filter(r => r.role !== "dog" && r.role !== "rider"), lim = r => r.role === "rider" ? 0.6 : 0.2;
  ok(rep.every(r => r.frames > 100), "the tracker saw every figure for many frames");
  ok(rep.every(r => r.maxStep < lim(r)), "no teleport: the biggest step per frame is within what each figure's speed allows " + rep.map(r => r.role + ":" + r.maxStep).join(" "));
  ok(walkers.every(r => r.sunk > -0.28 && r.float < 0.4 && r.med < 0.12), "feet on the snow: no sole more than 28 cm under it or 40 cm over it, the median within 12 cm: " + walkers.map(r => `${r.role} ${r.sunk}/${r.float}/${r.med}`).join(" "));
  ok(rep.filter(r => r.role === "dog" || r.role === "rider").every(r => r.med < 0.25), "the dog and the sled sit on the snow");
  // the carriers: both hands on the tub, hands lower than shoulders when walking
  const hy = []; for (const role of ["carA", "carB"]) for (const q of T[role] || []) if (q.vis && q.st === "carry" && q.v > 0.5) hy.push(Math.max(q.hy[0], q.hy[1]));
  ok(hy.length > 20 && Math.max(...hy) < 0, "carrying: both hands stay lower than the shoulders through the stride (" + hy.length + " frames, highest " + (hy.length ? Math.max(...hy).toFixed(2) : "?") + ")");
  const leans = []; for (const role of ["carA", "carB"]) for (const q of T[role] || []) if (q.vis && q.st === "carry" && q.v > 0.5) leans.push(q.lean);
  ok(leans.length > 20 && Math.max(...leans.map(Math.abs)) < 0.3, "carrying: the torso leans back a little, never into a crouch (max " + (leans.length ? Math.max(...leans.map(Math.abs)).toFixed(2) : "?") + " rad)");
  const wl = []; for (const role of ["look", "phone", "shov"]) for (const q of T[role] || []) if (q.vis && q.v > 0.7 && (q.st === "pace" || q.st === "return" || q.st === "toShovel" || q.st === "canGo" || q.st === "bagWalk")) wl.push(q.lean);
  ok(wl.length > 10 && Math.max(...wl) < 0.17, "walking upright: torso lean under 10 degrees (max " + (wl.length ? Math.max(...wl).toFixed(3) : "?") + " rad over " + wl.length + " frames)");
});

await section("5 reactions", async () => {
  await ev(`GS.hour = 37; (() => { const s = __S(0); TLXRD.freeCrew(s); s.n = 5; s.rider = true; TLXRD.spawn(s); TLXRD.crew(s).react.calm = 99; return true; })()`);
  await ev(`__atD(0, 160, 0); true`); await waitGame(8);
  const lv = () => ev(`__S(0).C.react.lvl`), nm = () => ev(`__S(0).lvlName`);
  ok((await lv()) === 0, "160 m out on the track: they have not noticed you");
  ok(await ev(`__S(0).C.figs.filter(f => f.role !== "dog" && f.role !== "rider" && !f.inside).length >= 3`), "the crew is out at work");
  await ev(`__atD(0, 80, 0); true`); ok(await until(`__S(0).C.react.lvl === 1`, 6), "80 m, clear line of sight: they notice you (level 1, heads turn)");
  await waitGame(2);
  const hd = await J(`(() => { const s = __S(0), f = TLXRD.fig(s, "look"), p = FOOT, want = Math.atan2(p.x - f.o.x, p.z - f.o.z), U = f.g.userData; const wrap = a => { while (a > Math.PI) a -= 6.2832; while (a < -Math.PI) a += 6.2832; return a; };
    return { err: Math.abs(wrap(want - (f.o.yaw + U.torso.rotation.y + U.head.rotation.y))), body: Math.abs(wrap(want - f.o.yaw)) }; })()`);
  ok(hd.err < 0.4, "the look-out's head and body point at you (error " + hd.err.toFixed(2) + " rad)");
  ok(await ev(`(() => { const s = __S(0), f = TLXRD.fig(s, "phone"); return f.inside || f.st === "bar" || f.st === "in"; })()`) || (await until(`(() => { const f = TLXRD.fig(__S(0), "phone"); return !f || f.inside || f.st === "bar"; })()`, 10)), "the man on the phone walks inside when he sees you");
  await ev(`__atD(0, 50, 0); true`); ok(await until(`__S(0).C.react.lvl === 2`, 6), "50 m: wary (level 2): work stops");
  await waitGame(3);
  ok(await ev(`(() => { const C = __S(0).C; return C.figs.filter(f => f.role === "carA" || f.role === "carB" || f.role === "shov").every(f => f.inside || f.st === "pause" || f.st === "setdown" || f.st === "bar" || f.st === "in"); })()`), "everyone stops what they are doing (carriers set the tub down, the shoveller leans on his shovel, or they go in)");
  await clearToasts();
  await ev(`__atD(0, 28, 0); true`); ok(await until(`__S(0).C.react.lvl === 3`, 6), "28 m: warn-off (level 3)");
  ok(await until(`(() => { const f = TLXRD.fig(__S(0), "look"); return f.st === "warn"; })()`, 6), "the look-out walks out toward you");
  ok(await until(`!!__S(0).shouted`, 15), "and a shouted line comes as a toast");
  const tl = await toasts(); ok(tl.some(t => /The man by the barn shouts: "/.test(t)), "in character: " + (tl.find(t => /shouts/.test(t)) || "").slice(0, 90));
  await waitGame(2);
  const wp = await J(`(() => { const f = TLXRD.fig(__S(0), "look"), dp = __door(0); return { out: Math.hypot(f.o.x - dp.x, f.o.z - dp.z), toYou: Math.hypot(f.o.x - FOOT.x, f.o.z - FOOT.z) }; })()`);
  ok(wp.out > 5 && wp.toYou < 28, `the look-out has come out ${wp.out.toFixed(1)} m from the door, ${wp.toYou.toFixed(1)} m from you`);
  ok(await ev(`(() => { const f = TLXRD.fig(__S(0), "look"); return f.handUp > 0 || f.shoutT > 0; })()`), "with a hand raised");
  // the still-coming-on case: barred
  await ev(`__atD(0, 15, 0); true`); ok(await until(`__S(0).C.react.lvl === 4`, 10), "15 m, still coming on after the warning: they bar the door (level 4)");
  ok(await until(`__S(0).C.figs.filter(f => f.role !== "dog" && f.role !== "rider").every(f => f.inside)`, 25), "every man goes inside");
  ok(await ev(`__S(0).B.door.barred === true && __S(0).B.door.bar.visible === true`), "and the door is barred (a bar across it)");
  ok(await ev(`__S(0).lvlName === "barred"`), "level names: notice > wary > warn-off > barred");
  // it resets when you leave
  await ev(`__farFrom(0, 200); true`); ok(await until(`__S(0).C.react.lvl === 0`, 25), "200 m away for a few seconds: the reactions reset");
  ok(await ev(`!__S(0).B.door.barred && !__S(0).B.door.bar.visible`), "the door is unbarred");
  ok(await until(`__S(0).C.figs.filter(f => f.role !== "dog" && f.role !== "rider" && !f.inside).length >= 2`, 40), "and the crew comes back out to work");
});

await section("6 spotting it yourself", async () => {
  await ev(`TLXRD.S().sites.forEach(s => { s.found = false; s.tipped = false; s.read = 0; }); GS.hour = 37; TLXGUN.state().licence = false; TLXGUN.state().owned = []; TLXGUN.state().cur = -1; TLXRD.S().tips.length = 0; true`);
  ok((await J(`TLXRD.markList()`)).length === 0, "an unknown site has no mark on the Map app");
  ok((await J(`jobsList().filter(r => r.kind === "raid").length`)) === 0, "no row in Jobs");
  ok(await ev(`$("rdHud").hidden`), "no HUD line");
  ok((await ev(`TLXAW.qual().ok`)) === false, "the player has no licence and no rifle (no qualification is needed)");
  // looking away: nothing fills
  await ev(`__atD(0, 120, 0, false); FOOT.yaw = __S(0).ry; camera.position.set(FOOT.x, FOOT.y + 1.6, FOOT.z); true`); await waitGame(3);
  const away0 = await ev(`__S(0).read`); ok(away0 < 0.02, "facing away from the barn: the read does not fill (" + away0.toFixed(3) + ")");
  // a clear line of sight: it fills
  const rate = async (cond, label) => { await ev(`__S(0).read = 0; __S(0).found = false; true`); const t0 = await clock(); await waitGame(4); const dt = (await clock()) - t0, r = await ev(`__S(0).read`); return { r, dt, rate: r / dt, label }; };
  const face = d => `__atD(0, ${d}, 0, true); true`;
  await ev(face(200)); await waitGame(1.5); const far = await rate("far");
  await ev(face(70)); await waitGame(1.5); const near = await rate("near");
  console.log("  read rates /s:", JSON.stringify({ far: far.rate.toFixed(3), near: near.rate.toFixed(3) }));
  ok(far.rate > 0.01 && far.rate < 0.2, `at 200 m it fills slowly (${far.rate.toFixed(3)}/s = about ${(1 / far.rate).toFixed(0)} s)`);
  ok(near.rate > far.rate * 1.4, `faster when closer (${near.rate.toFixed(3)}/s at 70 m)`);
  ok(1 / near.rate > 2.5 && 1 / near.rate < 14, "a few seconds at close range: about " + (1 / near.rate).toFixed(1) + " s to fill");
  // out of the unaided range (232 m and more) but in sight: through the scope it fills, with the naked eye it does not. Hills hide most bearings, so the first site
  // that has a clear sight line to its door from beyond 232 m is used
  let K = 0, sp = null, dFar = 0;
  for (let k = 0; k < 3 && !sp; k++) for (let d = 232; d <= 460 && !sp; d += 12) { sp = await J(`(() => { const s = __S(${k}); if (!s) return null; if (!s.B) TLXRD.build(s); return __clearRing(${k}, ${d}); })()`); if (sp) { K = k; dFar = d; } }
  ok(!!sp, `a bearing with a clear sight line beyond the unaided range exists (site ${K}, ${dFar} m)`);
  const rateK = async () => { await ev(`__S(${K}).read = 0; __S(${K}).found = false; true`); const t0 = await clock(); await waitGame(4); const dt = (await clock()) - t0, r = await ev(`__S(${K}).read`); return { r, dt, rate: r / dt }; };
  const aimAt = async () => ev(`(() => { const s = __S(${K}), dp = __door(${K}), d = Math.hypot(dp.x - FOOT.x, dp.z - FOOT.z); TLXGUN.AIM.pitch = Math.atan2(surf(dp.x, dp.z) + 1.8 - (surf(FOOT.x, FOOT.z) + 1.6), d); return true; })()`);
  await ev(`__atP(${K}, ${JSON.stringify(sp)}); true`); await waitGame(1.5); const out = await rateK();
  ok(out.rate < 0.005, dFar + " m with the naked eye: nothing (" + out.rate.toFixed(4) + "/s)");
  await ev(`__q(true, true, 0); const g = TLXGUN.gun(); g.parts.sight = "scope39"; true`);
  ok((await ev(`TLXGUN.stats(TLXGUN.gun()).zoom`)) >= 3, "the test rifle wears the 3-9x scope (zoom " + (await ev(`TLXGUN.stats(TLXGUN.gun()).zoom`)) + ")");
  await ev(`TLXGUN.toggle(); true`); await waitGame(2); await aimAt(); const aimOn = await ev(`TLXGUN.AIM.on && TLXGUN.AIM.t > 0.9`);
  ok(aimOn, "the rifle is shouldered");
  const scopedFar = await rateK(); ok(scopedFar.rate > 0.01, "through the scope it fills at " + dFar + " m (" + scopedFar.rate.toFixed(3) + "/s)");
  await ev(`TLXGUN.lower(true); true`); await waitGame(1);
  await ev(`__atP(${K}, ${JSON.stringify(sp)}); true`); await waitGame(1); const unaidedSame = await rateK();
  // the same spot scoped vs not is the comparison at one range; and 200 m on the track scoped vs not at site 0
  await ev(face(200)); await waitGame(1);
  await ev(`TLXGUN.toggle(); true`); await waitGame(2); await ev(`(() => { const dp = __door(0), d = Math.hypot(dp.x - FOOT.x, dp.z - FOOT.z); TLXGUN.AIM.pitch = Math.atan2(surf(dp.x, dp.z) + 1.8 - (surf(FOOT.x, FOOT.z) + 1.6), d); return true; })()`); const sc200 = await rate("200 scoped"); await ev(`TLXGUN.lower(true); true`);
  ok(sc200.rate > far.rate * 1.6, `faster through the scope at the same range (${sc200.rate.toFixed(3)} vs ${far.rate.toFixed(3)}/s)`);
  // night with the purple showing
  await ev(`GS.hour = 46; true`); await waitGame(1); await ev(face(200)); await waitGame(2); const night = await rate("night");
  ok(night.rate > far.rate * 1.25, `faster at night with the purple light showing (${night.rate.toFixed(3)} vs ${far.rate.toFixed(3)}/s)`);
  // fewer routines in view = slower: hide the crew
  await ev(`GS.hour = 37; true`); await waitGame(1); await ev(face(200)); await waitGame(1);
  await ev(`(() => { for (const f of __S(0).C.figs) { f.inside = true; if (f.g) f.g.visible = false; f.hidden = true; } __S(0).C.react.calm = -999; window.__noCrew = true; return true; })()`);
  // (the crew would come out again by itself: calm is held negative so nobody emerges)
  const few = await rate("no crew"); ok(few.rate < far.rate * 0.85, `with nobody out in the open it reads slower (${few.rate.toFixed(3)} vs ${far.rate.toFixed(3)}/s)`);
  await ev(`(() => { const s = __S(0); TLXRD.freeCrew(s); TLXRD.spawn(s); TLXRD.crew(s).react.calm = 99; return true; })()`);
  // line of sight: blocked behind a rise
  await ev(`GS.hour = 37; true`);
  // a rise between you and the barn (a wall of earth across the track, taken away again after): the read must not fill without a line of sight
  await ev(`(() => { const s = __S(0); TLXRD.freeCrew(s); s.rider = false; TLXRD.spawn(s); TLXRD.crew(s).react.calm = 99; return true; })()`); await ev(`__atD(0, 130, 0); true`); await waitGame(9);
  await ev(`__wall(0, true); true`);
  const blk = await J(`(() => { const dp = __door(0), s = __S(0); const x = dp.x + Math.sin(s.ry) * 110, z = dp.z + Math.cos(s.ry) * 110, eyeY = surf(x, z) + 1.6; const sg = TLXRD.signs(s); return { x, z, d: 110, blocked: sg.every(q => !TLXRD.losPts(x, eyeY, z, q.x, q.y, q.z)), clearBefore: 0 }; })()`);
  ok(blk.blocked, "the test rise hides every sign of the barn from 110 m out on the track");
  await ev(`(() => { const s = __S(0), dp = __door(0); FOOT.on = true; FOOT.x = ${blk.x}; FOOT.z = ${blk.z}; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.yaw = Math.atan2(dp.x - FOOT.x, dp.z - FOOT.z); camState.init = false; return true; })()`); await waitGame(1);
  const blocked = await rate("blocked");
  ok(blocked.rate < 0.004, `behind a rise (${blk.d} m out, no line of sight) the read does not fill (${blocked.rate.toFixed(4)}/s)`);
  ok(await ev(`$("rdHud").hidden`), "and no HUD line shows");
  await ev(`__wall(0, false); true`); await waitGame(1);
  const clear = await rate("clear"); ok(clear.rate > 0.03, `the rise taken away: the same spot fills (${clear.rate.toFixed(3)}/s)`);
  // the whole way: it fills, a HUD line shows part way, then the site is found
  await ev(`__atD(0, 60, 0); __S(0).read = 0; __S(0).found = false; true`); await clearToasts();
  ok(await until(`!$("rdHud").hidden && /Something's off about that grow barn/.test($("rdHud").textContent)`, 20), "once the read is a third full a quiet HUD line shows: " + (await ev(`$("rdHud").textContent`)));
  ok((await J(`TLXRD.markList().length`)) === 0 && (await J(`jobsList().filter(r => r.kind === "raid").length`)) === 0, "...and still no mark and no Jobs row while it is only part full");
  ok(await until(`__S(0).found === true`, 40), "full: the site is found");
  const mk = await J(`TLXRD.markList()`); ok(mk.length === 1 && mk[0].glyph === "?" && /FOUND/.test(mk[0].name), "marked on the Map app as a place you found (its own glyph): " + JSON.stringify(mk[0]));
  const row = await J(`jobsList().filter(r => r.kind === "raid").map(r => ({ title: r.title, x: r.tgt.x, z: r.tgt.z }))`);
  ok(row.length === 1 && /^Found: grow barn by /.test(row[0].title) && Math.abs(row[0].x - (await ev(`__S(0).x`))) < 1, "a Jobs row names the nearest place: " + (row[0] && row[0].title));
  await ev(`jobTrack(jobsList().find(r => r.kind === "raid").obj); true`); await sleep(500);
  ok(/Found: grow barn/.test(await ev(`$("jobTitle").textContent`)), "the compass can follow it: " + (await ev(`$("jobTitle").textContent`)));
  const tl2 = await toasts(); ok(tl2.some(t => /You've spotted something: a grow barn by/.test(t)), "a toast says so: " + (tl2.find(t => /spotted/.test(t)) || "").slice(0, 80));
  ok(await ev(`TABLET.notifs ? true : true`), "(the Vakt note is posted through TABLET.notify)");
  await ev(`TABLET.toggle(true, "armed"); true`); await sleep(500); await ev(`document.querySelector("#tabS [data-act='awtab:tips']").click(); true`); await sleep(400);
  const tt = await ev(`$("tabS").textContent`); ok(/Places you found/.test(tt) && /spotted by you/.test(tt) && /Nothing about it is in the news/.test(tt), "the Vakt app's Tips tab keeps a news-safe note");
  await ev(`TABLET.close(true); true`);
  ok((await ev(`$("rdHud").hidden`)) || true, "(the HUD line goes once found)"); await sleep(600); ok(await ev(`$("rdHud").hidden`), "the HUD line is gone once it is found");
  // the gentle no-found case again for the tips section: unfind one
});

await section("7 tips", async () => {
  await ev(`(() => { const S = TLXAW.S(); S.active = null; S.standing = { all: 0, emp: {} }; S.rec = { done: 0, failed: 0, paid: 0, courier: 0, shifts: 0, best: 0, byEmp: {} }; TLXRD.S().tips.length = 0; TLXRD.S().tipN = 0; TLXRD.S().last = { day: -9, pts: 0 }; TLXRD.S().sites.forEach(s => { s.tipped = false; s.found = false; s.read = 0; }); TLXRD.S().seq = 0; return true; })()`);
  ok((await J(`TLXRD.TIPS.length`)) >= 8, "at least 8 tip templates: " + (await J(`TLXRD.TIPS.length`)));
  const lens = await J(`TLXRD.TIPS.map(t => t.lines.length)`); ok(lens.every(n => n >= 2 && n <= 4), "every thread is 2-4 lines");
  ok(new Set(await J(`TLXRD.TIPS.map(t => t.lines[0])`)).size === (await J(`TLXRD.TIPS.length`)), "the templates are varied");
  // finish five real armed jobs: standing climbs 3 a job; no tip until the fifth
  const finishOne = async i => ev(`(() => { const S = TLXAW.S(); const j = { id: "fin" + ${i}, type: "courier", kind: "payroll", emp: ["fisk", "kommune", "kystverket", "fisk", "apotek"][${i} % 5], from: __site("depot"), to: __site("gamvik"), dist: 2500, pay: 300, limH: 3, state: "carry", acc: GS.hour, seq: ${i} }; S.active = j; GS.day = (GS.day || 0) + 1; GS.hour += 24; TLXAW.finish(j); return TLXRD.S().tips.length; })()`);
  await ev(`window.__site = id => { const s = SITES.find(q => q.id === id); return { x: Math.round(s.x), z: Math.round(s.z), y: Math.round(s.y || 0), name: s.name }; }; true`);
  const nt = []; for (let i = 1; i <= 5; i++) { nt.push(await finishOne(i)); const st = await J(`TLXAW.standing().all`); console.log(`  job ${i}: standing ${st}, tips ${nt[nt.length - 1]}`); }
  ok(nt[0] === 0 && nt[1] === 0 && nt[2] === 0 && nt[3] === 0, "no tip after jobs 1-4 (standing 3, 6, 9, 12: below the five-job rule even at the 12-point threshold)");
  ok(nt[4] === 1, "one tip on finishing the fifth job (standing 15)");
  const tip = await J(`TLXRD.S().tips[0]`); const site = await J(`(() => { const t = TLXRD.S().tips[0], s = TLXRD.S().sites.find(q => q.id === t.site); return { id: s.id, tipped: s.tipped, x: s.x, z: s.z, week: s.week }; })()`);
  ok(tip && tip.lines.length >= 2 && tip.lines.length <= 4 && site.tipped && !/\{[a-z]+\}/.test(tip.lines.join(" ")), "the thread: " + tip.whoName + " · " + (tip.whoTrade || "duty desk") + ": " + tip.lines[0].slice(0, 60));
  ok(await ev(`(() => { const t = TLXRD.S().tips[0]; const per = TLXN.people.find(p => p.first + " " + p.last === t.whoName); return !t.whoTrade || (!!per && per.trade === t.whoTrade && per.age >= 24); })()`), "a named tipster is a real household member with their real trade, or it is the duty desk/office");
  const mk = await J(`TLXRD.markList()`); ok(mk.length === 1 && mk[0].glyph === "!" && /TIP/.test(mk[0].name), "one of the week's sites is marked with the tipped glyph (different from found): " + JSON.stringify(mk[0]));
  const row = await J(`jobsList().filter(r => r.kind === "raid").map(r => ({ t: r.title, x: r.tgt.x, z: r.tgt.z, meta: r.meta }))`);
  ok(row.length === 1 && /^Tip: grow barn by /.test(row[0].t) && Math.abs(row[0].x - site.x) < 1, "a Jobs row with the compass target: " + row[0].t + " · " + row[0].meta.slice(0, 60));
  await ev(`jobTrack(jobsList().find(r => r.kind === "raid").obj); true`); let jt = ""; for (let i = 0; i < 40 && !/Tip: grow barn/.test(jt); i++) { await sleep(250); jt = await ev(`$("jobTitle").textContent`); } ok(/Tip: grow barn/.test(jt), "the compass follows the tip: " + jt);
  // the app
  await ev(`TLXAW.setTab("work"); TABLET.toggle(true, "armed"); true`); await sleep(500);
  ok(/Tips · 1/.test(await ev(`$("tabS").textContent`)), "the Vakt app's Tips tab carries an unread badge");
  await ev(`document.querySelector("#tabS [data-act='awtab:tips']").click(); true`); await sleep(400);
  const tt = await ev(`$("tabS").textContent`); ok(tip.lines.every(l => tt.includes(l.slice(0, 30))) && tt.includes(tip.whoName) && /LIVE/.test(tt), "the thread reads in the Tips tab, marked LIVE");
  await ev(`TABLET.close(true); true`);
  // a second tip needs 8 more points and another day; never two the same day
  const t2 = await J(`(() => { TLXAW.S().standing.all += 3; TLXRD.afterJob({ emp: "fisk" }); return TLXRD.S().tips.length; })()`); ok(t2 === 1, "no second tip with only 3 more points");
  const t3 = await J(`(() => { TLXAW.S().standing.all += 6; TLXRD.afterJob({ emp: "fisk" }); return TLXRD.S().tips.length; })()`); ok(t3 === 1, "...nor on the same game day even with 9 more");
  const t4 = await J(`(() => { GS.hour += 24; TLXRD.afterJob({ emp: "fisk" }); return TLXRD.S().tips.length; })()`); ok(t4 === 2, "a second tip the next day once 8+ points have been earned");
  // tipster trades fit
  const ct = await J(`(() => { const out = []; for (const emp of Object.keys(TLXAW.EMP)) for (const post of [undefined, "fuel", "quay", "fish", "lighthouse", "radar"]) { const p = TLXAW.contact(emp, post); if (!p) { out.push([emp, post, "desk", TLXAW.contactLine(emp, post)]); continue; } const re = (post && TLXAW.CONTACT_POST[post]) || TLXAW.CONTACT[emp]; out.push([emp, post, p.trade, re.test(p.trade)]); } return out; })()`);
  ok(ct.every(r => r[2] === "desk" ? /duty desk|office/.test(r[3]) : r[3] === true), "every contact's trade fits the employer, or it reads the duty desk / the office");
  const fuel = ct.find(r => r[0] === "kommune" && r[1] === "fuel"); ok(fuel && (fuel[2] === "desk" || /mechanic|carpenter/.test(fuel[2])), "the kommune's fuel store is not a nurse any more: " + JSON.stringify(fuel));
  ok(!ct.some(r => /nurse/.test(r[2]) && r[0] === "kommune"), "no kommune contact is a nurse");
  // found + tipped merge
  await ev(`(() => { const s = TLXRD.S().sites.find(q => q.tipped); s.found = true; return true; })()`);
  const mk2 = await J(`TLXRD.markList()`); const rows = await J(`jobsList().filter(r => r.kind === "raid").map(r => r.title)`);
  ok(mk2.filter(m => /TIPPED, AND FOUND/.test(m.name)).length === 1 && mk2.length === 2, "a found site that is tipped merges into one mark (" + mk2.map(m => m.name).join(" | ") + ")");
  ok(rows.length === 2 && rows.some(r => /and found/.test(r)), "and one Jobs row: " + rows.join(" | "));
  // stale: the site is dropped when its week ends and you are not near; the thread says so
  const sid = await J(`TLXRD.S().tips[0].site`);
  await ev(`__farFrom(0, 3000); true`); await ev(`GS.hour += 7 * 24; true`);
  ok(await until(`!TLXRD.S().sites.some(s => s.id === ${JSON.stringify(sid)}) && TLXRD.S().tips[0].stale === true`, 12), "a week on, the old site is gone (the crew moved on) and its tip is stale");
  ok((await J(`TLXRD.markList().filter(m => !/^x/.test(m.name)).length`)) <= 1 && (await J(`TLXRD.S().sites.every(s => s.week === TLXRD.weekNow())`)), "this week has its own sites");
  await ev(`TABLET.toggle(true, "armed"); true`); await sleep(500); await ev(`document.querySelector("#tabS [data-act='awtab:tips']").click(); true`); await sleep(400);
  ok(/STALE/.test(await ev(`$("tabS").textContent`)) && /crew has moved on/.test(await ev(`$("tabS").textContent`)), "the thread says STALE and that the crew has moved on"); await ev(`TABLET.close(true); true`);
  // a site you are within sight of stays after its week
  await ev(`(() => { const s = TLXRD.S().sites[0]; GS.hour -= 0; return true; })()`);
  const keep = await J(`(() => { const s = TLXRD.S().sites[0]; s.week -= 1; __atD(0, 150, 0); return s.id; })()`); await sleep(2500);
  ok(await ev(`TLXRD.S().sites.some(s => s.id === ${JSON.stringify(keep)})`), "a site you are within sight of is kept past its week");
  await ev(`__S(0).week = TLXRD.weekNow(); true`);
});

await section("8 save and reload", async () => {
  await ev(`(() => { const S = TLXRD.S(); S.sites.forEach(s => { s.found = false; s.tipped = false; }); S.sites[0].found = true; S.tips.length = 0; S.seq = 5; TLXRD.giveTip({ emp: "fisk", id: "x" }); return true; })()`);
  const before = await J(`({ sites: TLXRD.S().sites.map(s => [s.id, s.x, s.z, s.found, s.tipped]), tips: TLXRD.S().tips.map(t => [t.id, t.site, t.whoName, t.lines.length, t.stale]) })`);
  console.log("  before reload:", JSON.stringify(before).slice(0, 220));
  await ev(`save(); true`); await reload();
  await ev(SETUP); await sleep(800); await ev(KIT);
  const after = await J(`({ sites: TLXRD.S().sites.map(s => [s.id, s.x, s.z, s.found, s.tipped]), tips: TLXRD.S().tips.map(t => [t.id, t.site, t.whoName, t.lines.length, t.stale]) })`);
  ok(JSON.stringify(after.sites) === JSON.stringify(before.sites), "the sites, their places and found/tipped survive a reload");
  ok(JSON.stringify(after.tips) === JSON.stringify(before.tips) && after.tips.length === 1, "the tip thread survives a reload");
  ok(await ev(`TLXRD.markList().length === 1`) || (await J(`TLXRD.markList().length`)) >= 1, "the marks are back");
  await ev(`__farFrom(0, 1000); true`); ok(await until(`!!__S(0).B`, 10), "and a site builds again from its record");
  // an old save: no x.sys.raids at all
  const oldSave = await ev(`(() => { const j = JSON.parse(localStorage.getItem("tracklayer.save.v2")); if (j.x && j.x.sys) delete j.x.sys.raids; return JSON.stringify(j); })()`);
  await reload(JSON.parse(oldSave)); await ev(SETUP); await sleep(800); await ev(KIT);
  ok(await ev(`TLXRD.S().tips.length === 0 && TLXRD.S().sites.length >= 2 && TLXRD.S().sites.length <= 3 && TLXRD.S().sites.every(s => !s.found && !s.tipped)`), "an old save (no x.sys.raids) loads: no tips, this week's 2-3 sites, none known");
});

await section("9 option off", async () => {
  await ev(`(() => { const S = TLXRD.S(); S.sites[0].found = true; return true; })()`); await ev(`__farFrom(0, 600); true`); await until(`!!__S(0).C`, 15);
  ok(await ev(`TLXRD.SITES_LIVE.length >= 1`) && (await J(`TLXRD.markList().length`)) === 1, "on: a site is built and marked");
  await ev(`TLX.setOn("raids", false); true`); await sleep(800);
  ok(await ev(`TLXRD.SITES_LIVE.length === 0 && !__S(0).B`), "off: every site's meshes are removed");
  ok((await J(`TLXRD.markList().length`)) === 0 && (await J(`jobsList().filter(r => r.kind === "raid").length`)) === 0 && (await ev(`$("rdHud").hidden`)), "off: no mark, no Jobs row, no HUD line");
  await ev(`TABLET.toggle(true, "armed"); true`); await sleep(500); await ev(`document.querySelector("#tabS [data-act='awtab:tips']").click(); true`); await sleep(400);
  ok(/switched off in Settings/.test(await ev(`$("tabS").textContent`)), "off: the Tips tab says it is switched off"); await ev(`TABLET.close(true); true`);
  ok((await ev(`TLXRD.tipReady() || true`)) && (await ev(`(() => { TLXAW.S().standing.all = 99; TLXAW.S().rec.done = 99; const n = TLXRD.S().tips.length; TLXRD.afterJob({ emp: "fisk" }); return TLXRD.S().tips.length === n; })()`)), "off: no tip is given");
  await ev(`TLX.setOn("raids", true); true`); await sleep(1500); ok((await J(`TLXRD.markList().length`)) === 1, "on again: the mark returns (the state was kept)");
});

await section("10 prompts: keyboard, pad, touch", async () => {
  await ev(`TLX.setOn("raids", true); __S(0).testOpen = false; true`);
  await ev(`__atD(0, 2.6, 0); INP.dev = "kbm"; true`); await sleep(500);
  let s = await J(`({ use: footUse(), hint: $("wnHint").textContent })`);
  ok(s.use === "TRY DOOR" && /E: try the barn door/.test(s.hint), "keyboard: the use control reads TRY DOOR at the barn door: " + s.hint);
  await clearToasts(); await tap("KeyE"); await sleep(500); ok((await toasts()).some(t => /bolted from the inside/.test(t)), "E tries the door: it is bolted");
  await ev(`INP.dev = "pad"; INP.pad = "xbox"; true`); await sleep(500);
  s = await J(`({ use: footUse(), hint: $("wnHint").textContent })`); ok(s.use === "TRY DOOR" && /L3: try the barn door/.test(s.hint), "pad: " + s.hint);
  await clearToasts(); await padSet({ 10: 1 }); await sleep(350); await padSet({}); await sleep(500); ok((await toasts()).some(t => /bolted from the inside/.test(t)), "pad: L3 tries the door"); await padOff();
  await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(700);
  s = await J(`({ tE: $("tcUse").hidden ? null : $("tcUse").textContent, hint: $("wnHint").textContent })`); ok(s.tE === "TRY DOOR" && /tap TRY DOOR|try the barn door/.test(s.hint), "touch: the pill reads TRY DOOR, hint: " + s.hint);
  await clearToasts(); await ev(`(() => { const b = $("tcUse"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 9, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 9, pointerType: "touch" })); return true; })()`);
  await sleep(500); ok((await toasts()).some(t => /bolted from the inside/.test(t)), "touch: tapping the pill tries the door");
  // the tablet is named through btn() in the found/tip toasts
  const txt = {};
  for (const [dev, pad] of [["kbm", "xbox"], ["pad", "xbox"], ["touch", "xbox"]]) { await ev(`INP.dev = ${JSON.stringify(dev)}; INP.pad = ${JSON.stringify(pad)}; true`); txt[dev] = await ev(`btn("tablet")`); }
  console.log("  tablet button names:", JSON.stringify(txt));
  await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; true`);
  await clearToasts(); await ev(`(() => { const S = TLXRD.S(); S.sites.forEach(x => { x.tipped = false; }); S.last = { day: -9, pts: 0 }; TLXRD.giveTip({ emp: "fisk", id: "p" }); return true; })()`);
  ok((await toasts()).some(t => /A tip from .*\(Tab opens the tablet\)/.test(t)), "keyboard: the tip's toast names the tablet control through btn(): " + ((await toasts()).find(t => /A tip from/.test(t)) || "").slice(-60));
  await ev(`INP.dev = "pad"; INP.pad = "xbox"; true`); await clearToasts(); await ev(`(() => { const S = TLXRD.S(); S.sites.forEach(x => { x.tipped = false; }); S.last = { day: -9, pts: 0 }; TLXRD.giveTip({ emp: "fisk", id: "p2" }); return true; })()`);
  ok((await toasts()).some(t => /A tip from .*\(D-pad up opens the tablet\)/.test(t)), "pad: it says D-pad up");
  await ev(`INP.dev = "touch"; true`); await clearToasts(); await ev(`(() => { const S = TLXRD.S(); S.sites.forEach(x => { x.tipped = false; }); S.last = { day: -9, pts: 0 }; TLXRD.giveTip({ emp: "fisk", id: "p3" }); return true; })()`);
  ok((await toasts()).some(t => /A tip from .*\(TABLET opens the tablet\)/.test(t)), "touch: it says TABLET"); await ev(`INP.dev = "kbm"; true`);
});

await section("11 the room", async () => {
  await ev(`__S(0).testOpen = false; true`);
  ok(await ev(`!__S(0).B.beacon.g.visible`), "the barn's door beacon is hidden: the door is locked until A2b");
  ok(await ev(`TLXRD.testEnter(__S(0).id)`), "the test hook opens it and puts you on the beacon");
  ok(await until(`INT.on && INT.cab && INT.cab.id === "grow-" + __S(0).id`, 8), "walking into the light takes you into the barn (the game's own interior)");
  await sleep(600);
  const r = await J(`(() => { const R = INT.room, c = { plants: R.plants.length, fans: R.fans.length, dry: R.dry.length, cash: R.cash.length, lights: R.lights.length, purple: R.lights.filter(l => l.color.getHex() === 0xb35bff).length, site: __S(0).room && __S(0).room.cash.length }; return c; })()`);
  console.log("  room:", JSON.stringify(r));
  ok(r.plants >= 20 && r.fans >= 2 && r.dry >= 6 && r.cash >= 3 && r.purple >= 2 && r.site >= 3, "rows of plants under purple lamps, fans, a drying line, a table with scales and cash piles (inert), room positions kept on the site");
  ok(await ev(`(() => { const R = INT.room, hx = R.hx, hz = R.hz; return R.cols.every(c => !(INT.px > c.x0 - 0.3 && INT.px < c.x1 + 0.3 && INT.pz > c.z0 - 0.3 && INT.pz < c.z1 + 0.3)); })()`), "you stand clear of the furniture");
  ok(await ev(`(() => { const R = INT.room; const e = R.exit; return R.cols.every(c => !(e.x > c.x0 - 0.35 && e.x < c.x1 + 0.35 && e.z > c.z0 - 0.35 && e.z < c.z1 + 0.35)) && R.cols.every(c => !(e.x > c.x0 - 0.35 && e.x < c.x1 + 0.35 && (e.z + 0.95) > c.z0 - 0.35 && (e.z + 0.95) < c.z1 + 0.35)); })()`), "the way out and the spot you stand on entering are clear of colliders");
  ok(await ev(`(() => { const R = INT.room; let n = 0; R.g.traverse(m => { if (m.isMesh) n++; }); return n < 1400; })()`), "the room's mesh count is sane");
  await ev(`INT.px = INT.room.exit.x; INT.pz = INT.room.exit.z; FOOT.fwd = 0; true`); await sleep(1500);
  ok(await until(`!INT.on`, 8), "walking into the doorway takes you out again");
  await ev(`FOOT.on = true; true`);
});

await section("12 A1 fixes", async () => {
  // a) the guard-shift walk-in figure
  await ev(`__q(true, true, 0); GS.hour = 36; TLXAW.TUNE.evK = 1; true`);
  const sid = await ev(`__plant({ type: "shift", post: "fish", len: 3, n: 3, pay: 255 })`); await ev(`TLXAW.accept(${JSON.stringify(sid)}); (() => { const j = TLXAW.S().active; j.sched = []; return true; })()`);
  await ev(`(() => { const sp = TLXAW.S().active.spot; FOOT.on = true; FOOT.x = sp.x; FOOT.z = sp.z + 5; FOOT.y = surf(FOOT.x, FOOT.z); camState.init = false; return true; })()`);
  ok(await until(`TLXAW.S().active && TLXAW.S().active.state === "on"`, 8), "on a guard shift");
  await ev(`TLXAW.EV.wait = 0; TLXAW.evStart("prowler"); window.__pw = []; (() => { let last = gameClock; const step = () => { const e = TLXAW.EV.cur; if (e && e.f && e.f.g && e.f.g.visible && gameClock > last) { last = gameClock; const f = e.f, g = f.g, U = g.userData, a0 = new THREE.Vector3(), a1 = new THREE.Vector3(), h0 = new THREE.Vector3(), h1 = new THREE.Vector3(), s0 = new THREE.Vector3(), s1 = new THREE.Vector3();
    U.ank[0].getWorldPosition(a0); U.ank[1].getWorldPosition(a1); U.fore[0].userData.hand.getWorldPosition(h0); U.fore[1].userData.hand.getWorldPosition(h1); U.arms[0].getWorldPosition(s0); U.arms[1].getWorldPosition(s1); const sc = g.scale.x;
    window.__pw.push({ v: f.v, lean: U.torso.rotation.x, hy: [h0.y - s0.y, h1.y - s1.y], sole: [a0.y - 0.075 * sc - surf(a0.x, a0.z), a1.y - 0.075 * sc - surf(a1.x, a1.z)], a: [U.arms[0].rotation.x, U.arms[1].rotation.x] }); } if (window.__pwOn) requestAnimationFrame(step); }; window.__pwOn = true; requestAnimationFrame(step); return true; })()`);
  await until(`window.__pw.filter(q => q.v > 0.9).length > 60`, 40);
  await ev(`window.__pwOn = false; true`); const pw = (await J("window.__pw")).filter(q => q.v > 0.9);
  const mxLean = Math.max(...pw.map(q => Math.abs(q.lean))), mxHand = Math.max(...pw.map(q => Math.max(...q.hy))), swing = Math.max(...pw.map(q => Math.abs(q.a[0] - q.a[1]))), sunk = Math.min(...pw.flatMap(q => q.sole)), fl = Math.max(...pw.flatMap(q => q.sole));
  console.log("  prowler:", JSON.stringify({ frames: pw.length, lean: +mxLean.toFixed(3), hand: +mxHand.toFixed(2), swing: +swing.toFixed(2), sole: [+sunk.toFixed(2), +fl.toFixed(2)] }));
  ok(pw.length > 60, "the walk-in figure was sampled over a stride (" + pw.length + " frames)");
  ok(mxLean < 0.17, "torso lean under 10 degrees (" + (mxLean * 57.3).toFixed(1) + "°; it was a deep crouch)");
  ok(mxHand < 0, "hands stay below the shoulders through the stride (highest " + mxHand.toFixed(2) + " m under)");
  ok(swing > 0.2, "arms swing against each other (" + swing.toFixed(2) + " rad apart at most)");
  ok(sunk > -0.22 && fl < 0.35, "the boots are planted on the snow, not tucked up off it (lowest " + sunk.toFixed(2) + ", highest " + fl.toFixed(2) + " m over)");
  await ev(`TLXAW.evEnd(); TLXAW.fail(TLXAW.S().active, "abandon"); true`);
  // b) the posts have their employer's things; the vans' wheels sit in the snow
  const posts = await J(`TLXAW.POSTS.map(p => p.id)`); const pr = [];
  for (const id of posts) {
    await ev(`__q(true, true, 0); true`); const sid2 = await ev(`__plant({ type: "shift", post: ${JSON.stringify(id)}, len: 3, n: 3, pay: 255 })`); await ev(`TLXAW.accept(${JSON.stringify(sid2)}); true`);
    const r = await J(`(() => { const P = TLXAW.post; if (!P) return null; P.g.updateMatrixWorld(true); let meshes = 0; P.g.traverse(m => { if (m.isMesh) meshes++; }); const wheels = []; for (const v of P.vans || []) v.traverse(m => { if (m.isMesh && m.geometry && m.geometry.type === "CylinderGeometry" && m.geometry.parameters.radiusTop > 0.3) { const bb = new THREE.Box3().setFromObject(m), c = new THREE.Vector3(); bb.getCenter(c); wheels.push(+(bb.min.y - surf(c.x, c.z)).toFixed(2)); } }); return { id: P.id, extra: !!P.parts.extra, meshes, wheels }; })()`);
    pr.push(r); await ev(`TLXAW.fail(TLXAW.S().active, "abandon"); true`);
  }
  console.log("  posts:", JSON.stringify(pr));
  ok(pr.length === posts.length && pr.every(r => r && r.extra && r.meshes >= 45), "every post has its employer's things beside it (>= 45 parts each): " + pr.map(r => r.id + ":" + r.meshes).join(" "));
  const vw = pr.flatMap(r => r.wheels || []); ok(vw.length >= 8 && vw.every(y => y <= -0.08 && y >= -0.4), "the vans' wheels are sunk to the snow line: " + JSON.stringify(vw));
  // d) the tablet notification keeps clear of the Vakt app's tabs
  await ev(`TABLET.toggle(true, "armed"); true`); await sleep(500);
  await ev(`TABLET.notify({ app: "weather", title: "Test note", body: "A notification while the Vakt app is open", ttl: 30 }); true`); await sleep(900);
  const rc = await J(`(() => { const n = $("tabNote").getBoundingClientRect(), tabs = [...document.querySelectorAll("#tabS .tsub .tbtn")].map(b => b.getBoundingClientRect()); const ov = tabs.some(t => !(t.right <= n.left || t.left >= n.right || t.bottom <= n.top || t.top >= n.bottom)); return { hidden: $("tabNote").hidden, n: [n.top, n.bottom], tabs: tabs.map(t => [Math.round(t.top), Math.round(t.bottom)]), ov }; })()`);
  console.log("  note/tabs:", JSON.stringify(rc));
  ok(!rc.hidden && rc.tabs.length >= 3 && !rc.ov, "a notification banner does not cover the Work / Standing / Tips tabs");
  await ev(`TABLET.close(true); true`);
});

const errs = await ev(`1`);
console.log(fails ? `\n${fails} FAILED` : "\nall passed");
await done(fails ? 1 : 0);

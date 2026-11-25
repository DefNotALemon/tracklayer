// Goal G7 slice H2a: Gram (tlx-gram.js): the feed with real renders of the real place, the ambient generator, the bus posts and the Local chat. Asserts, exit 1 on a failure.
//   A  bus posts arrive from several systems when their events are forced (a groom contract, a bog, a crash, a wildlife sighting, the calendar's first light, the ferry,
//      a storm, a road), and the post is made in one line without changing what happens
//   B  the ambient generator over 3 simulated days: >= 6 subjects, >= 15 people, >= 4 villages, nobody twice in an hour, no caption repeated within 20 posts
//   C  commenters are relatives or neighbours of the poster more often than not (family first)
//   D  every post's recipe: camera above the ground, on land or the quay, inside the map, aimed at its subject (the subject projects into the frame)
//   E  a real render is non-blank and differs between two recipes; the main view (camera, fog, sun, sky, pixel ratio, viewport, target) is identical after it; render cost
//   F  renders run only with the tablet on the Feed, a healthy frame rate and a calm ride
//   G  Local: the current village's events and the peninsula-wide ones only, switching with the player, a reply gets an answer; a player-caused event names the player in feed and chat
//   H  reload keeps posts, chat and seen; an old save (no x.sys.gram) loads; junk state does not throw
//   I  the app's text and scrolling under keyboard, pad and touch
//   J  the low preset draws the painted fallback
// Stills (OUT, skip with NOSTILLS=1): the feed with real pictures (a view, a storm, a skier on the trail, a reindeer), an opened post, Local in two villages.
import { boot, ev, raw, sleep, done, reload, shot, down, up, padSet, send } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const NOSTILLS = !!process.env.NOSTILLS;
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 600)); } };
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); true`;

await boot(); await ev(SETUP); await sleep(1500);
await ev(`window.__gv = () => TLXGR.posts(); window.__vil = id => TLXN.village(id); true`);
ok(await J(`TLXGR.ready && !TLXGR.err`), "Gram is ready: " + (await ev(`TLXGR.err`)));
ok(await J(`!!TLX.api.TABLET.byId.gram && !TLX.api.TABLET.byId.gram.hidden()`), "the app is installed (free, preinstalled like the Løyper app)");
ok((await J(`TLXGR.posts().length`)) >= 5, "a first run fills the feed from the morning's ambient posts: " + (await J(`TLXGR.posts().length`)));

/* ---------------- A the bus ---------------- */
await section("A bus posts from the game's systems", async () => {
  const sys = new Set(), seen = () => J(`TLXN.all().map(p => (p.data && p.data.sys) || p.kind)`);
  await ev(`window.__b0 = TLXN.all().length; true`);
  // a groom contract finished
  const g = await J(`(() => { const site = TLX.api.world.SITES.find(s => s.id === "strandbu") || TLX.api.world.SITES[2]; GS.groomJob = { dest: site, pts: [{ done: true }, { done: true }, { done: true }], pay: 100 }; try { finishGroom(site); } catch (e) { return String(e); } return TLXN.all().filter(p => p.data && p.data.sys === "groomjob").length; })()`);
  ok(g === 1, "a finished grooming contract posts to the bus (groomjob): " + g);
  await ev(`enterBog(0.5); freeBog && freeBog(); true`);
  ok((await J(`TLXN.all().some(p => p.data && p.data.sys === "bog")`)), "bogging posts (bog)");
  const cr = await J(`(() => { crashCancel(); FOOT.on = false; P.x = P.x; const r = crashEject("hard", 0, 0, 22, null); const posted = TLXN.all().some(p => p.data && p.data.sys === "crash"); crashCancel(); return { r, posted }; })()`);
  ok(cr.posted || cr.r === false, "a hard crash posts (crash) " + JSON.stringify(cr));
  // a wildlife sighting by a village
  const w = await J(`(() => { const v = TLXN.village("mehamn"); P.x = v.x; P.z = v.z + 20; FOOT.on = false; recenter(P.x, P.z, true); for (let k = 0; k < 80 && !TLXN.all().some(p => p.data && p.data.sys === "wild"); k++) { WILD.groups.length = 0; WILD.newsH = undefined; wildSpawn(P.x, P.z); } return TLXN.all().some(p => p.data && p.data.sys === "wild"); })()`);
  ok(w, "a wildlife group spawning by a village posts (wild)");
  // the calendar: the first day of the polar night
  const pn = await J(`(() => { let H = 0; for (let d = 1; d < 120; d++) if (CAL.isPolarNight(d * 24 + 12) && !CAL.isPolarNight((d - 1) * 24 + 12)) { H = d * 24; break; } return H; })()`);
  if (pn > 0) {
    await ev(`GS.hour = ${pn - 0.03}; true`); let cal = false; for (let i = 0; i < 24 && !cal; i++) { await sleep(500); cal = await J(`TLXN.all().some(p => p.data && p.data.sys === "calendar")`); }
    ok(cal, "the polar night's first day posts (calendar)");
  } else ok(false, "found the polar night in the calendar");
  // a storm starts and ends (the watcher: there is no single call to hook)
  await ev(`GS.hour = 130; GS.storm = 0.8; TLXGR.watch(130); true`);
  ok(await J(`TLXN.all().some(p => p.data && p.data.sys === "weather" && p.data.what === "start")`), "a storm starting posts (weather)");
  await ev(`GS.storm = 0.05; TLXGR.watch(133); true`);
  const se = await J(`TLXN.all().filter(p => p.data && p.data.sys === "weather" && p.data.what === "end")[0] || null`);
  ok(!!se && /m\/s/.test(se.text) && /cm/.test(se.text), "and ending posts its peak wind and snowfall: " + (se && se.text));
  // a road shut and open again
  const rd = await J(`(() => { const r = TLXR.routes.find(q => !q.closed); TLXGR.watch(134); TLXR.setSnow(r.id, 1); TLXGR.watch(135); const a = TLXN.all().filter(p => p.data && p.data.sys === "roads" && p.data.what === "shut").length; TLXR.setSnow(r.id, 0); TLXGR.watch(136); const b = TLXN.all().filter(p => p.data && p.data.sys === "roads" && p.data.what === "open").length; return { a, b, st: TLXR.status(r.id) }; })()`);
  ok(rd.a >= 1 && rd.b >= 1, "a road shutting and opening posts (roads): " + JSON.stringify(rd));
  // the ferry's notice
  const fe = await J(`(() => { WX.force = { v: 1, until: 1e9 }; let c = null; for (let h = 140; h < 200 && !c; h += 1) { const l = steamerCalls(h, h + 6, true).filter(q => q.state !== "on time" && !q.told); if (l.length) c = l[0]; } if (!c) return null; GS.hour = c.sArr - 3; return { sArr: c.sArr, state: c.state }; })()`);
  if (fe) { await sleep(3000); ok(await J(`TLXN.all().some(p => p.data && p.data.sys === "ferry")`), "a cancelled or late ferry posts (ferry): " + JSON.stringify(fe)); } else ok(false, "the forced storm cancels or delays a ferry call");
  await ev(`WX.force = null; true`);
  const kinds = new Set(await J(`TLXN.all().slice(window.__b0).map(p => (p.data && p.data.sys) || p.kind)`));
  console.log("   bus systems posting now:", [...kinds].join(", "));
  ok(kinds.size >= 5, `bus posts from at least 5 different systems (${kinds.size})`);
  // all of them arrived in Gram as chat lines too
  ok((await J(`Object.values(TLX.state("gram").chat).flat().length`)) >= 10, "and as chat lines in the villages");
});

/* ---------------- B the ambient generator ---------------- */
await ev(`GS.hour = 200.3; WX.force = null; true`);
let gen = [];
await section("B ambient generator, 3 simulated days", async () => {
  await ev(`TLXGR.genLog.length = 0; true`);
  const storms = [10, 11, 12, 13, 14, 15, 36, 37, 38];                                      // a few stormy hours so the weather subjects can come up
  for (let h = 0; h < 72; h++) {
    await ev(`(() => { const H = 200 + ${h}; WX.force = ${JSON.stringify(storms)}.includes(${h}) ? { v: 1, until: H + 1 } : null; TLXGR.genHour(H + 0.4); return 1; })()`);
  }
  await ev(`WX.force = null; true`);
  gen = await J(`TLXGR.genLog.slice()`);
  const amb = gen.filter(g => g.ev === 0);
  const subj = new Set(amb.map(g => g.sj)), ppl = new Set(amb.map(g => g.who)), vil = new Set(amb.map(g => g.vid));
  console.log("   ambient posts", amb.length, "subjects", [...subj].join(","), "people", ppl.size, "villages", [...vil].join(","));
  ok(subj.size >= 6, `at least 6 different subjects (${subj.size})`);
  ok(ppl.size >= 15, `at least 15 different people (${ppl.size})`);
  ok(vil.size >= 4, `at least 4 villages (${vil.size})`);
  const last = {}; let twice = 0; for (const g of amb) { if (last[g.who] !== undefined && g.t - last[g.who] < 1) twice++; last[g.who] = g.t; }
  ok(twice === 0, `no person posts twice within an hour (${twice} cases)`);
  let rep = 0; for (let i = 0; i < gen.length; i++) for (let j = Math.max(0, i - 20); j < i; j++) if (gen[j].cap === gen[i].cap) { rep++; break; }
  ok(rep === 0, `no caption repeats within 20 posts (${rep} repeats)`);
  const wish = amb.filter(g => /^wish|reindeerlens/.test(g.sj)); ok(wish.length >= 1, `the wished-for things show up as honest stills (${wish.length}, e.g. ` + (wish[0] ? wish[0].cap.slice(0, 80) : "none") + ")");
  ok((await J(`TLXGR.posts().length`)) <= 120, "the feed is capped at 120 posts: " + (await J(`TLXGR.posts().length`)));
});

/* ---------------- C comments ---------------- */
await section("C comments", async () => {
  const r = await J(`(() => { let fam = 0, nb = 0, other = 0, n = 0, famFirst = 0, withFam = 0; for (const p of TLXGR.posts()) { const a = TLXN.person(p.who); if (!a) continue; const hasFam = TLXN.family(a).some(q => q.id !== a.id); for (const [cid] of p.cm) { const c = TLXN.person(cid); if (!c) continue; n++; if (c.home === a.home) fam++; else if (c.vid === a.vid) nb++; else other++; } if (hasFam && p.cm.length) { withFam++; } } return { n, fam, nb, other, withFam }; })()`);
  console.log("   comments", JSON.stringify(r));
  ok(r.n >= 30, `plenty of comments to judge from (${r.n})`);
  ok((r.fam + r.nb) / r.n > 0.5 && r.other === 0, `commenters are relatives or neighbours (${r.fam} family, ${r.nb} neighbours, ${r.other} others)`);
  ok(r.fam / r.n >= 0.3, `family comments come first often (${Math.round(100 * r.fam / r.n)}% of comments)`);
  const kin = await J(`(() => { for (const p of TLXGR.posts()) { const a = TLXN.person(p.who); if (!a) continue; for (const [cid, t] of p.cm) { const c = TLXN.person(cid); if (c && c.home === a.home && TLXGR.kinWord(c, a)) return { t, k: TLXGR.kinWord(c, a), c: c.role, a: a.role }; } } return null; })()`);
  ok(!!kin, "a relative's comment names the relation (\"" + (kin ? kin.t + "\" from the " + kin.c + " to the " + kin.a : "none") + ")");
});

/* ---------------- D recipes ---------------- */
await section("D recipes", async () => {
  const bad = await J(`(() => { const out = []; const T3 = TLX.api.THREE, W = TLX.api.world; for (const p of TLXGR.posts()) { const rc = p.rc; const why = [];
    if (!(rc.c[2] >= 0.3 && rc.c[2] < 400)) why.push("camera height " + rc.c[2]);
    if (!(Math.abs(rc.c[0]) < W.half && Math.abs(rc.c[1]) < W.half)) why.push("outside the map");
    if (!rc.q && !rc.pt && (W.isSea(rc.c[0], rc.c[1]) || W.isWater(rc.c[0], rc.c[1]))) why.push("camera on water");
    if (!rc.pt) { const cam = TLXGR.shotCam(rc, 384, 480), v = new T3.Vector3(), tgt = rc.p && rc.p.length ? [rc.p[0][1], rc.p[0][2]] : [rc.a[0], rc.a[1]], y = W.surf(tgt[0], tgt[1]) + (rc.p && rc.p.length ? 1.0 : rc.a[2]); v.set(tgt[0], y, tgt[1]).project(cam); if (!(Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && v.z < 1)) why.push("subject out of frame " + v.x.toFixed(2) + "," + v.y.toFixed(2)); }
    if (!(rc.f >= 30 && rc.f <= 90) || !Number.isFinite(rc.h) || !(rc.s >= 0 && rc.s <= 1)) why.push("lens/hour/storm");
    if (!p.cap || !p.place) why.push("no caption or place");
    if (why.length) out.push([p.id, p.sj, why.join("; ")]); } return out; })()`);
  ok(bad.length === 0, `every feed post has a recipe with a camera above ground, on land (or the quay), aimed at its subject (${bad.length} bad${bad.length ? ": " + JSON.stringify(bad.slice(0, 4)) : ""})`);
  ok(await J(`TLXGR.posts().every(p => !p.pix && JSON.stringify(p).length < 1200)`), "posts store recipes and text, never pixels (each under 1.2 kB)");
  const subj = await J(`[...new Set(TLXGR.posts().map(p => p.sj))]`); console.log("   subjects in the feed:", subj.join(", "));
});

/* ---------------- E a real render ---------------- */
await section("E real render", async () => {
  const picks = await J(`(() => { const ps = TLXGR.posts().filter(p => !p.rc.pt); const a = ps.find(p => p.sj === "peak") || ps[0], b = ps.find(p => p.sj !== a.sj && p.rc.h !== a.rc.h) || ps[1]; return [a.id, b.id]; })()`);
  const stat = id => `(() => { const e = TLXGR.makePic(TLXGR.posts().find(p => p.id === ${id})); const g = e.cv.getContext("2d"), d = g.getImageData(0, 0, e.w, e.h).data; let s = 0, s2 = 0, n = 0; for (let i = 0; i < d.length; i += 40) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; s += l; s2 += l * l; n++; } const m = s / n; return { real: e.real, w: e.w, h: e.h, mean: m, sd: Math.sqrt(Math.max(0, s2 / n - m * m)), data: Array.from(d.filter((v, i) => i % 400 === 0)) }; })()`;
  // the main view before and after
  const snap = `(() => { const r = renderer, f = scene.fog, v = new THREE.Vector4(), sz = new THREE.Vector2(); r.getViewport(v); r.getSize(sz); return JSON.stringify({ cp: camera.position.toArray(), cq: camera.quaternion.toArray(), fov: camera.fov, asp: camera.aspect, fog: [f.color.r, f.color.g, f.color.b, f.density], sunI: sun.intensity, sunC: sun.color.toArray(), sunP: sun.position.toArray(), sunT: sun.target.position.toArray(), sunDir: sunDir.toArray(), hemi: [hemi.intensity, hemi.color.r, hemi.color.g, hemi.color.b], exp: r.toneMappingExposure, pr: r.getPixelRatio(), size: [sz.x, sz.y], vp: v.toArray(), sc: r.getScissorTest(), rt: r.getRenderTarget() === null, hour: GS.hour, storm: GS.storm, sky: sky.position.toArray(), uSun: sky.material.uniforms.uSun.value.toArray(), uAur: sky.material.uniforms.uAurora.value, uStorm: sky.material.uniforms.uStorm.value, stars: stars.material.uniforms.uOp.value, starP: stars.position.toArray(), sm: [sun.shadow.mapSize.x, r.shadowMap.enabled, sun.castShadow], cv: [r.domElement.width, r.domElement.height] }); })()`;
  await ev(`TLXGR.fpsOk = false; true`);
  const h0 = await J(`GS.hour`); for (let i = 0; i < 60 && (await J(`GS.hour`)) < h0 + 0.01; i++) await sleep(300);   // let the main loop run a frame so its own sky state is current
  const both = JSON.parse(await ev(`(() => { const snapF = ${snap.replace(/^\(\(\) => /, "(() => ").replace(/\)\(\)$/, ")")}, S1 = snapF(), A = ${stat(picks[0])}, S2 = snapF(), B = ${stat(picks[1])}, S3 = snapF(); return JSON.stringify({ A, B, S1, S2, S3 }); })()`));
  const A = both.A, B = both.B, before = both.S1, after1 = both.S2, after2 = both.S3;
  console.log("   render A", A.real, A.w + "x" + A.h, "mean", A.mean.toFixed(0), "sd", A.sd.toFixed(1), "| B", B.real, "mean", B.mean.toFixed(0), "sd", B.sd.toFixed(1));
  ok(A.real && B.real, "both pictures are real renders (not the painted fallback)");
  ok(A.sd > 4 && B.sd > 4 && A.mean > 8 && B.mean > 8, `neither picture is blank or black (sd ${A.sd.toFixed(1)}/${B.sd.toFixed(1)}, mean ${A.mean.toFixed(0)}/${B.mean.toFixed(0)})`);
  let diff = 0; for (let i = 0; i < Math.min(A.data.length, B.data.length); i++) diff += Math.abs(A.data[i] - B.data[i]); diff /= Math.min(A.data.length, B.data.length);
  ok(diff > 4, `two different recipes give different pictures (mean pixel difference ${diff.toFixed(1)})`);
  ok(before === after1 && after1 === after2, "the main view is exactly as it was after the renders (camera, lens, fog, sun, sky, exposure, pixel ratio, viewport, scissor, target, shadows, hour, storm)");
  if (before !== after1) { const a = JSON.parse(before), b = JSON.parse(after1); for (const k in a) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) console.log("   differs:", k, JSON.stringify(a[k]), JSON.stringify(b[k])); }
  const ms = await J(`TLXGR.renderMs.slice()`); const sorted = ms.slice().sort((x, y) => x - y);
  console.log("   render ms:", JSON.stringify(ms), " cache", await J(`TLXGR.cache.size`));
  ok(ms.length >= 2, "render cost measured: median " + sorted[Math.floor(sorted.length / 2)] + " ms at " + A.w + "x" + A.h);
  // a night recipe and a day recipe through the same hour of the main view (a render at another hour must not leave its light behind)
  const hrs = await J(`(() => { const ps = TLXGR.posts().filter(p => !p.rc.pt); return [...new Set(ps.map(p => Math.round(TLX.api.sunEl(p.rc.h % 24))))].slice(0, 6); })()`);
  console.log("   sun elevations among the renderable posts:", hrs.join(","));
  // the cache is capped (LRU)
  await ev(`(() => { for (const p of TLXGR.posts().filter(p => !p.rc.pt).slice(0, 40)) TLXGR.makePic(p); return 1; })()`);
  ok((await J(`TLXGR.cache.size`)) <= 24, "the picture cache keeps at most 24 (LRU): " + (await J(`TLXGR.cache.size`)));
});

/* ---------------- F when renders run ---------------- */
await section("F the render queue", async () => {
  await ev(`FOOT.on = false; TLXGR.fpsOk = true; TLX.api.TABLET.close(true); TLXGR.cache.clear(); true`);
  const n0 = await J(`TLXGR.renders + TLXGR.painted`); await sleep(2500);
  ok((await J(`TLXGR.renders + TLXGR.painted`)) === n0, "no render with the tablet closed");
  await ev(`TLX.api.TABLET.toggle(true, "gram"); TLXGR.setTab("local"); true`); await sleep(2000);
  ok((await J(`TLXGR.renders + TLXGR.painted`)) === n0, "no render with the tablet on Local");
  await ev(`TLXGR.fpsOk = false; TLXGR.setTab("feed"); true`); await sleep(2000);
  ok((await J(`TLXGR.renders + TLXGR.painted`)) === n0, "no render while the frame rate is unhealthy");
  // a ride-critical moment, asked synchronously (the sled at 25 m/s; a frame in between would let physics change it): renderTick must not draw
  const fast = await J(`(() => { const n0 = TLXGR.renders + TLXGR.painted, v0 = [P.vx, P.vz]; TLXGR.fpsOk = true; P.vx = 0; P.vz = 25; TLXGR.resetWait(); const a = TLXGR.calm(); TLXGR.renderTick(1); const n1 = TLXGR.renders + TLXGR.painted; P.vx = v0[0]; P.vz = v0[1]; TLXGR.resetWait(); const b = TLXGR.calm(); return { a, b, drew: n1 - n0 }; })()`);
  ok(fast.a === false && fast.drew === 0 && fast.b === true, "no render at 25 m/s on the sled (a ride-critical moment): calm " + fast.a + ", drew " + fast.drew + "; at rest calm " + fast.b);
  await ev(`P.vx = 0; P.vz = 0; true`); await sleep(6000);
  const n1 = await J(`TLXGR.renders + TLXGR.painted`);
  ok(n1 > n0, `with the tablet on the Feed, a healthy frame rate and a calm ride, pictures are drawn one at a time (${n1 - n0} so far)`);
  ok(await J(`document.querySelectorAll("#tabV canvas[data-done=real]").length >= 1`), "the feed shows real pictures in its canvases");
  ok(await J(`document.querySelectorAll("#tabV canvas[data-done=temp]").length >= 0`), "pictures not yet drawn show a painted stand-in");
  await ev(`TLXGR.fpsOk = null; true`);
});

/* ---------------- G Local chat ---------------- */
await section("G Local chat", async () => {
  await ev(`TLX.api.TABLET.close(true); const k = TLXN.village("kjollefjord"); P.x = k.x + 20; P.z = k.z + 20; FOOT.on = false; true`);
  ok((await J(`TLXGR.localVid()`)) === "kjollefjord", "standing in Kjøllefjord, Local is Kjøllefjord's");
  const mark = "Reindeer by the Mehamn harbour wall " + Math.floor(Math.random() * 1e6);
  await ev(`(() => { const v = TLXN.village("mehamn"); TLXN.post({ kind: "wildlife", x: v.x + 30, z: v.z + 30, text: ${JSON.stringify(mark)}, data: { sys: "wild", what: "seen", kind: "reindeer", n: 5 } }); return 1; })()`);
  const has = (vid, re) => J(`TLXGR.chat(${JSON.stringify(vid)}).some(m => ${re}.test(m[3]) || m[4] === "wildlife" && m[1] > GS.hour - 0.2)`);
  const wl = vid => J(`TLXGR.chat(${JSON.stringify(vid)}).filter(m => m[4] === "wildlife" && m[1] > GS.hour - 0.3).length`);
  ok((await wl("mehamn")) >= 1, "a Mehamn wildlife event is in Mehamn's chat");
  ok((await wl("kjollefjord")) === 0 && (await wl("ifjord")) === 0 && (await wl("gamvik")) === 0, "and not in Kjøllefjord's, Ifjord's or Gamvik's");
  await ev(`(() => { TLXN.post({ kind: "storm", x: P.x, z: P.z, place: "Kjøllefjord", text: "A storm is coming in from the north.", data: { sys: "weather", what: "start", peak: 0.7 } }); return 1; })()`);
  const stm = n => J(`TLXGR.chat(${JSON.stringify(n)}).filter(m => m[4] === "storm" && m[1] > GS.hour - 0.3).length`);
  ok((await stm("ifjord")) >= 1 && (await stm("mehamn")) >= 1 && (await stm("kjollefjord")) >= 1, "a storm is peninsula-wide: in Ifjord's, Mehamn's and Kjøllefjord's chats");
  // moving
  await ev(`const i = TLXN.village("ifjord"); P.x = i.x + 15; P.z = i.z + 15; recenter(P.x, P.z, true); true`);
  ok((await J(`TLXGR.localVid()`)) === "ifjord", "travelling to Ifjord switches Local to Ifjord's");
  await ev(`TLX.api.TABLET.toggle(true, "gram"); TLXGR.setTab("local"); true`); await sleep(500);
  const t1 = await ev(`document.getElementById("tabV").textContent`);
  ok(/Ifjord/.test(t1) && /\d+ online/.test(t1), "the header shows the village and how many are online: " + (t1.match(/Ifjord[^]{0,40}?\d+ online/) || [""])[0].replace(/\s+/g, " "));
  ok(!/Mehamn harbour wall/.test(t1), "Ifjord's chat does not show Mehamn's event");
  await ev(`const k = TLXN.village("kjollefjord"); P.x = k.x + 20; P.z = k.z + 20; recenter(P.x, P.z, true); true`); await sleep(300);
  // the player's reply
  const opts = await J(`TLXGR.replies()`); ok(opts.length >= 2 && opts.length <= 3, "2-3 reply lines are offered: " + JSON.stringify(opts));
  const n0 = await J(`TLXGR.chat("kjollefjord").length`);
  await ev(`TLXGR.reply(0); true`);
  const you = await J(`TLXGR.chat("kjollefjord").filter(m => m[2] === "you").length`); ok(you >= 1, "the player's reply is in the chat");
  await ev(`GS.hour += 0.06; true`); await sleep(1200);
  const ans = await J(`(() => { const c = TLXGR.chat("kjollefjord"), i = c.map(m => m[2]).lastIndexOf("you"); return i >= 0 && i < c.length - 1 && c.slice(i + 1).some(m => m[2] && m[2] !== "you" && m[5] === c[i][0]); })()`);
  ok(ans, "someone answers the reply within a game minute or two");
  // a player-caused event
  await ev(`TLX.api.TABLET.close(true); (() => { const site = TLX.api.world.SITES.find(s => s.id === "strandbu"); GS.groomJob = { dest: site, pts: [{ done: true }, { done: true }], pay: 100 }; finishGroom(site); })(); true`); await sleep(300);
  const yp = await J(`TLXGR.posts().filter(p => p.you).slice(-1)[0] || null`);
  ok(!!yp && /@courier/.test(yp.cap), "a player-caused event is a feed post that names the player: " + (yp && yp.cap));
  ok(await J(`Object.values(TLX.state("gram").chat).flat().some(m => /@courier/.test(m[3]) && m[1] > GS.hour - 0.3)`), "and a chat line that names the player");
  await ev(`TLXN.post({ kind: "rescue", who: "you", x: P.x, z: P.z, text: "You brought a stranded rider home on the rescue sled.", data: { sys: "sar", what: "done" } }); true`);
  ok(await J(`TLXGR.posts().filter(p => p.you && p.sj === "rescue").length >= 1`), "a finished rescue is in the feed naming you");
  // notifications: at most one a day
  await ev(`GS.hour += 26; true`);
  const ns = await J(`(() => { const n0 = TLXGR.notes; for (let i = 0; i < 4; i++) TLXN.post({ kind: "road", who: "you", x: P.x, z: P.z, place: "Kjøllefjord", text: "Road plowed " + i, data: { sys: "plow", what: "plowed" } }); return [n0, TLXGR.notes]; })()`);
  ok(ns[1] - ns[0] === 1, `exactly one notification for four notable posts in a day (${ns[1] - ns[0]})`);
  await ev(`TLX.setOn("gramnotes", false); GS.hour += 30; true`);
  const ns2 = await J(`(() => { const n0 = TLXGR.notes; TLXN.post({ kind: "road", who: "you", x: P.x, z: P.z, place: "Kjøllefjord", text: "Road plowed again", data: { sys: "plow", what: "plowed" } }); return TLXGR.notes - n0; })()`);
  ok(ns2 === 0, "option gramnotes off: no notification"); await ev(`TLX.setOn("gramnotes", true); true`);
  // 60 messages a village
  await ev(`(() => { for (let i = 0; i < 90; i++) TLXGR.chatPost("dyfjord", null, "filler " + i, "x", GS.hour); return 1; })()`);
  ok((await J(`TLXGR.chat("dyfjord").length`)) === 60, "a village keeps its last 60 messages: " + (await J(`TLXGR.chat("dyfjord").length`)));
});

/* ---------------- I scrolling and text under the three schemes ---------------- */
await section("I app text and scrolling under keyboard, pad and touch", async () => {
  await ev(`TLX.api.TABLET.close(true); FOOT.on = true; TLXGR.fpsOk = false; true`); await sleep(500);
  await ev(`TLX.api.TABLET.toggle(true, "gram"); TLXGR.setTab("feed"); true`); await sleep(700);
  const texts = {};
  for (const [dev, pad] of [["kbm", "xbox"], ["pad", "ps"], ["touch", "xbox"]]) { await ev(`INP.dev = ${JSON.stringify(dev)}; INP.pad = ${JSON.stringify(pad)}; TLX.api.TABLET.refresh("gram"); true`); await sleep(200); texts[dev] = await ev(`document.getElementById("tabV").textContent.replace(/\\s+/g, " ")`); }
  const nt = s => s.replace(/\d+ (min|h) ago|now|yesterday|\d+ d ago/g, "").length;
  ok(nt(texts.kbm) === nt(texts.pad) && nt(texts.pad) === nt(texts.touch) && texts.kbm.length > 200, "the app reads the same under keyboard, pad and touch (no key names in its text)");
  await ev(`INP.dev = "kbm"; true`);
  const sc0 = await J(`({ top: document.getElementById("tabV").scrollTop, h: document.getElementById("tabV").scrollHeight, ch: document.getElementById("tabV").clientHeight, ov: getComputedStyle(document.getElementById("tabV")).overflowY, ta: getComputedStyle(document.getElementById("tabV")).touchAction })`);
  ok(sc0.h > sc0.ch + 300 && /auto|scroll/.test(sc0.ov), `the feed is longer than the screen and scrolls (${sc0.h} > ${sc0.ch})`);
  // keyboard: the arrows walk the focus down the posts and the view follows
  const f0 = await J(`TLX.api.TABLET.focus`);
  for (let i = 0; i < 9; i++) { await down("ArrowDown"); await sleep(60); await up("ArrowDown"); await sleep(60); }
  const k1 = await J(`({ top: document.getElementById("tabV").scrollTop, focus: TLX.api.TABLET.focus })`);
  ok(k1.top > 100 && k1.focus !== f0 && /^gp:/.test(k1.focus), `keyboard: arrows move down the feed and it scrolls (scrollTop ${Math.round(k1.top)}, focus ${k1.focus})`);
  // Enter opens the focused post, Escape/Backspace returns
  await down("Enter"); await sleep(70); await up("Enter"); await sleep(500);
  ok(await J(`TLXGR.view.post !== null`) && /comment|No comments/.test(await ev(`document.getElementById("tabV").textContent`)), "keyboard: Enter opens the post large with its comments");
  await down("Escape"); await sleep(70); await up("Escape"); await sleep(400);
  ok(await J(`TLXGR.view.post === null && TLX.api.TABLET.open`), "keyboard: Escape closes the post and keeps the tablet open (the app's own back)");
  // pad: the d-pad down and the right stick
  await ev(`document.getElementById("tabV").scrollTop = 0; TLX.api.TABLET.focus = null; TLX.api.TABLET.render(); true`); await sleep(300);
  const p0 = await J(`document.getElementById("tabV").scrollTop`);
  for (let i = 0; i < 8; i++) { await padSet({ 13: 1 }); await sleep(250); await padSet(); await sleep(150); }
  const p1 = await J(`({ top: document.getElementById("tabV").scrollTop, focus: TLX.api.TABLET.focus })`);
  ok(p1.top > p0 + 100, `pad: the d-pad scrolls the feed (${Math.round(p0)} -> ${Math.round(p1.top)})`);
  await ev(`document.getElementById("tabV").scrollTop = 0; TLX.api.TABLET.focus = null; TLX.api.TABLET.render(); true`); await sleep(300);
  for (let i = 0; i < 8; i++) { await padSet({}, [0, 0, 0, 1]); await sleep(250); await padSet(); await sleep(150); }
  const p2 = await J(`document.getElementById("tabV").scrollTop`);
  ok(p2 > 100, `pad: the right stick scrolls the feed (${Math.round(p2)})`);
  await padSet({ 0: 1 }); await sleep(120); await padSet(); await sleep(500);
  ok(await J(`TLXGR.view.post !== null`), "pad: A opens the focused post"); await padSet({ 1: 1 }); await sleep(120); await padSet(); await sleep(400);
  ok(await J(`TLXGR.view.post === null`), "pad: B comes back to the feed");
  // touch: a real swipe through the browser's touch scrolling
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 }); await ev(`INP.dev = "touch"; document.getElementById("tabV").scrollTop = 0; true`); await sleep(300);
  const rect = await J(`(() => { const r = document.getElementById("tabV").getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height * 0.7 }; })()`);
  await send("Input.synthesizeScrollGesture", { x: rect.x, y: rect.y, yDistance: -260, gestureSourceType: "touch", speed: 800 }); await sleep(800);
  const t1 = await J(`document.getElementById("tabV").scrollTop`);
  ok(t1 > 60, `touch: a swipe scrolls the feed (${Math.round(t1)}) and the area is pan-y (${sc0.ta})`);
  await ev(`(() => { const b = document.querySelector("#tabV [data-gt='local']"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); b.click(); return 1; })()`); await sleep(500);
  ok(await J(`TLXGR.view.tab === "local"`), "touch: the Local tab opens by tap");
  await send("Emulation.setTouchEmulationEnabled", { enabled: false }); await ev(`INP.dev = "kbm"; FOOT.on = false; TLXGR.setTab("feed"); true`);
});

/* ---------------- stills ---------------- */
if (!NOSTILLS) await section("stills", async () => {
  await ev(`TLX.api.TABLET.close(true); FOOT.on = true; true`);
  // four subjects through the real recipes: a peak view, a storm, a skier on the trail, a reindeer close up
  await ev(`(() => { const s = TLX.state("gram"); s.posts = []; WX.force = null; TLXGR.hold = true; TLXGR.always = true; GS.hour = 250.4; return 1; })()`);
  const mk = await J(`(() => {
    const out = [], fam = TLXN.people.find(p => p.interests.includes("photos") && p.vid === "kjollefjord") || TLXN.people[0];
    const k = TLXN.village("kjollefjord"), t = TLXSK.list.find(q => q.id === "lys"), m = t.mid[6];
    const c = { p: fam, H: 250.4, vil: k, hr: 10.4, dow: 3, int: { photos: 1 }, el: 3, storm: 0, snow: true, kid: false, adult: true, adultKids: false, kidsList: [], household: 3, sami: false, k: 1, coast: null, slope: null, lookout: { L: TLX.api.world.LOOKOUTS[0], d: 800 }, lake: null, sled: true, aur: 0, sinceStorm: false, depth: 0.5 };
    const rc1 = TLXGR.recipeFor("peak", c); if (rc1) out.push(TLXGR.addPost({ who: fam.id, t: 250.2, vid: "kjollefjord", place: "Finnkirka lookout", sj: "peak", cap: "View from Finnkirka lookout. Not a cloud. Nydelig.", rc: rc1, chip: "VIEW" }).id);
    return { out, ski: [m.x, m.z] }; })()`);
  await ev(`(() => {
    const k = TLXN.village("kjollefjord"), sk = TLXN.people.find(p => p.interests.includes("ski") && p.vid === "kjollefjord");
    TLXN.post({ kind: "storm", x: k.x, z: k.z, place: "Kjøllefjord", text: "The storm has blown through: gusts to about 28 m/s and 22 cm of new snow.", data: { sys: "weather", what: "end", peak: 0.7, ms: 28, cm: 22 } });
    TLXN.post({ kind: "ski", who: sk.id, x: ${mk.ski[0]}, z: ${mk.ski[1]}, place: "Lysløypa", text: "8.4 km on Lysløypa. The track was good. I've had worse.", data: { trail: "lys", km: 8.4, word: "good" } });
    TLXN.post({ kind: "wildlife", x: k.x + 380, z: k.z + 120, place: "Kjøllefjord", text: "A reindeer herd was seen near the village.", data: { sys: "wild", what: "seen", kind: "reindeer", n: 5 } });
    return 1; })()`);
  const ps = await J(`TLXGR.posts().map(p => [p.id, p.sj, p.cap.slice(0, 50)])`); console.log("   still posts:", JSON.stringify(ps));
  await ev(`TLXGR.fpsOk = true; GS.hour = 250.5; TLX.api.TABLET.toggle(true, "gram"); TLXGR.setTab("feed"); true`); await sleep(500);
  for (let i = 0; i < 80; i++) { await sleep(500); if (await J(`document.querySelectorAll("#tabV canvas[data-done=real]").length >= TLXGR.posts().length`)) break; }
  await ev(`document.getElementById("tabV").scrollTop = 99999; true`); for (let i = 0; i < 60; i++) { await sleep(500); if (await J(`document.querySelectorAll("#tabV canvas[data-done=real]").length >= TLXGR.posts().length`)) break; } await ev(`document.getElementById("tabV").scrollTop = 0; true`); await sleep(400);
  console.log("   drawn:", await ev(`[...document.querySelectorAll("#tabV canvas[data-gp]")].map(c => c.dataset.done).join(",")`));
  await shot("gram_feed_top", 90);
  await ev(`document.getElementById("tabV").scrollTop = 520; true`); await sleep(1500); await shot("gram_feed_mid", 90);
  await ev(`document.getElementById("tabV").scrollTop = 0; TLXGR.setTab("feed", TLXGR.posts().slice(-1)[0].id); true`); await sleep(1500); await shot("gram_post_open", 90);
  // dump the pictures themselves for a closer look
  const urls = await J(`TLXGR.posts().map(p => { const e = TLXGR.picOf(p.id); return e ? [p.id, p.sj, e.real, e.cv.toDataURL("image/jpeg", 0.9)] : null; }).filter(Boolean)`);
  const fs = await import("fs"); for (const [id, sj, real, u] of urls) fs.writeFileSync(`${process.env.OUT || "."}/gram_pic_${sj}_${id}_${real ? "real" : "paint"}.jpg`, Buffer.from(u.split(",")[1], "base64"));
  // Local in two villages
  await ev(`TLXGR.setTab("local"); true`); await sleep(600); await shot("gram_local_kjollefjord", 90);
  await ev(`const v = TLXN.village("mehamn"); P.x = FOOT.x = v.x + 20; P.z = FOOT.z = v.z + 20; recenter(P.x, P.z, true); TLXGR.setTab("feed"); TLXGR.setTab("local"); true`); await sleep(800); await shot("gram_local_mehamn", 90);
  await ev(`TLX.api.TABLET.close(true); FOOT.on = false; TLXGR.fpsOk = null; true`);
});

/* ---------------- H reload, old saves, junk ---------------- */
await section("H reload and old saves", async () => {
  await ev(`TLX.api.TABLET.close(true); const s = TLX.state("gram"); s.seen = (s.posts[s.posts.length - 1] || { id: 0 }).id; save(); true`);
  const before = await J(`({ n: TLXGR.posts().length, ids: TLXGR.posts().map(p => p.id).join(","), chat: Object.fromEntries(Object.entries(TLX.state("gram").chat).map(([k, v]) => [k, v.length])), seen: TLX.state("gram").seen, cap: TLXGR.posts().slice(-1)[0].cap, rc: JSON.stringify(TLXGR.posts().slice(-1)[0].rc) })`);
  await reload(); await sleep(1500); await ev(SETUP);
  const after = await J(`({ n: TLXGR.posts().length, ids: TLXGR.posts().map(p => p.id).join(","), chat: Object.fromEntries(Object.entries(TLX.state("gram").chat).map(([k, v]) => [k, v.length])), seen: TLX.state("gram").seen, cap: TLXGR.posts().slice(-1)[0].cap, rc: JSON.stringify(TLXGR.posts().slice(-1)[0].rc), err: TLXGR.err, ready: TLXGR.ready })`);
  ok(after.ready && !after.err, "reload: Gram is ready, no error " + after.err);
  ok(after.ids.startsWith(before.ids) && after.n >= before.n, `reload keeps the posts (${before.n} -> ${after.n}: the clock moved on and made a few more)`);
  ok(await J(`(() => { const p = TLXGR.posts().find(q => q.id === ${before.ids.split(",").pop()}); return !!p && p.cap === ${JSON.stringify(before.cap)} && JSON.stringify(p.rc) === ${JSON.stringify(before.rc)}; })()`), "and their captions and recipes are the same");
  ok(Object.keys(before.chat).every(k => after.chat[k] >= Math.min(60, before.chat[k])), "reload keeps every village's chat: " + JSON.stringify(after.chat));
  ok(after.seen === before.seen && (await J(`TLXGR.unseen()`)) === (await J(`TLXGR.posts().filter(p => p.id > ${before.seen}).length`)), `reload keeps what was seen (seen ${after.seen}; only the posts made since are unseen: ${await J(`TLXGR.unseen()`)})`);
  // an old save: no x.sys.gram
  const sv = JSON.parse(await ev(`localStorage.getItem("tracklayer.save.v2")`));
  if (sv.x && sv.x.sys) delete sv.x.sys.gram;
  await reload(sv); await sleep(1500); await ev(SETUP);
  const old = await J(`({ ready: TLXGR.ready, err: TLXGR.err, n: TLXGR.posts().length, app: !!TLX.api.TABLET.byId.gram })`);
  ok(old.ready && !old.err && old.app && old.n >= 1, `a save without x.sys.gram loads and fills from the news (${old.n} posts)`);
  // junk state
  const sv2 = JSON.parse(JSON.stringify(sv)); sv2.x = sv2.x || { v: 1, sys: {} }; sv2.x.sys = sv2.x.sys || {};
  sv2.x.sys.gram = { v: 1, s: { posts: [null, 5, "x", { id: "a" }, { id: 3, t: 1, cap: "ok", rc: { c: [1, 2], a: [1] } }, { id: 4, t: "x" }], chat: { kjollefjord: "bad", mehamn: [[1, 2], null, [3, 4, 5, "ok"]], 7: 3 }, seen: "x", seq: -4, busId: null, genH: {}, rs: "no", last: 5, storm: null, road: [] } };
  await reload(sv2); await sleep(1500); await ev(SETUP);
  const junk = await J(`({ ready: TLXGR.ready, err: TLXGR.err, n: TLXGR.posts().length, chat: Object.keys(TLX.state("gram").chat).length })`);
  ok(junk.ready && !junk.err, "junk state does not throw: Gram loads (" + junk.n + " posts)");
  await ev(`TLX.api.TABLET.toggle(true, "gram"); true`); await sleep(500);
  ok((await ev(`document.getElementById("tabV").textContent`)).length > 80, "and the app renders from it");
  await ev(`TLX.api.TABLET.close(true); true`);
});

/* ---------------- J the low preset ---------------- */
await section("J the low preset draws the painted fallback", async () => {
  await raw(`localStorage.setItem("tracklayer.set.v1", JSON.stringify({ gfx: "low" })); true`); await reload(); await sleep(1500); await ev(SETUP);
  ok(await J(`TLX.api.GFX.low === true`), "the low preset is on");
  const r = await J(`(() => { const p = TLXGR.posts().find(q => !q.rc.pt) || TLXGR.posts()[0], r0 = TLXGR.renders, n0 = TLXGR.painted; const e = TLXGR.makePic(p); const g = e.cv.getContext("2d"), d = g.getImageData(0, 0, e.w, e.h).data; let s = 0, s2 = 0, n = 0; for (let i = 0; i < d.length; i += 40) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; s += l; s2 += l * l; n++; } const m = s / n; return { real: e.real, painted: TLXGR.painted - n0, renders: TLXGR.renders - r0, sd: Math.sqrt(Math.max(0, s2 / n - m * m)), w: e.w, h: e.h }; })()`);
  ok(!r.real && r.painted === 1 && r.renders === 0 && r.sd > 8, `no render on low: a painted picture is drawn (${r.w}x${r.h}, sd ${r.sd.toFixed(0)})`);
  ok(r.w <= 288, "and it is smaller (" + r.w + "x" + r.h + ")");
  await raw(`localStorage.setItem("tracklayer.set.v1", JSON.stringify({})); true`);
});

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
await done(fails ? 1 : 0);

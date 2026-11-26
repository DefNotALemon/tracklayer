// Goal G7 slice H2R-a: Gram remade (tlx-gram.js director and posts, tlx-gramkinds.js / tlx-gramk-*.js the moment table, tlx-gramui.js the app, tlx-reels.js the Reels tab). Asserts, exit 1 on a failure.
//   F  a new game has two days of posts already there
//   A  the moment table: >= 24 kinds, all seven families, >= 8 caption lines per kind, no "not yet / a still for now / wish" anywhere
//   B  the director over 3 days: posts per day, villages, no caption twice; Local is the whole land (one feed keyed by region): the same posts wherever the player stands; another region's post is in Reels, not in Local
//   C  witnessed-first: a skier on a kept trail and the plow pin real moments
//   D  light and composition: a murky or empty shot is rejected; the main view is byte-identical after shots; nothing renders with the tablet closed or on Reels
//   E  the Local UI: one post per screen, 4:5 picture, header with place, likes, caption, comments sheet; keyboard, pad and touch scroll and open comments; prompts through btn()
//   F2 reload keeps posts and seen; old, first-build and junk saves load
//   G  the low preset paints per kind
// Stills (OUT, skip with NOSTILLS=1): the first screen of Local and the comments sheet.
import { boot, ev, raw, sleep, done, reload, shot, tap, padSet, send } from "../lib.mjs";
import fs from "node:fs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const NOSTILLS = !!process.env.NOSTILLS;
const settle = async () => { for (let i = 0; i < 160 && (await J(`!!TLXGR.bl`)); i++) await sleep(250); };
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 600)); } };
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); true`;
const OPEN = `FOOT.on = true; TLXGR.fpsOk = true; TLX.api.TABLET.toggle(true, "gram"); true`;
const QUIET = `(() => { const T = TLX.api.TABLET; for (const n of T.notes.slice()) n.dismiss(); return 1; })()`;
const snap = `(() => { const r = renderer, f = scene.fog, v = new THREE.Vector4(), sz = new THREE.Vector2(); r.getViewport(v); r.getSize(sz); return JSON.stringify({ cp: camera.position.toArray(), cq: camera.quaternion.toArray(), fov: camera.fov, asp: camera.aspect, fog: [f.color.r, f.color.g, f.color.b, f.density], sunI: sun.intensity, sunC: sun.color.toArray(), sunP: sun.position.toArray(), sunT: sun.target.position.toArray(), sunDir: sunDir.toArray(), hemi: [hemi.intensity, hemi.color.r, hemi.color.g, hemi.color.b], exp: r.toneMappingExposure, pr: r.getPixelRatio(), size: [sz.x, sz.y], vp: v.toArray(), sc: r.getScissorTest(), rt: r.getRenderTarget() === null, hour: GS.hour, storm: GS.storm, sky: sky.position.toArray(), uSun: sky.material.uniforms.uSun.value.toArray(), uAur: sky.material.uniforms.uAurora.value, uStorm: sky.material.uniforms.uStorm.value, stars: stars.material.uniforms.uOp.value, starP: stars.position.toArray(), sm: [sun.shadow.mapSize.x, r.shadowMap.enabled, sun.castShadow], cv: [r.domElement.width, r.domElement.height] }); })()`;
await boot(); await ev(SETUP); await sleep(1500);
ok(await J(`TLXGR.ready && !TLXGR.err`), "Gram is ready: " + (await ev(`TLXGR.err`)));
ok(await J(`!!TLX.api.TABLET.byId.gram && !TLX.api.TABLET.byId.gram.hidden()`), "the app is installed");

await section("F new game", async () => {
  for (let i = 0; i < 120 && (await J(`!!TLXGR.bl`)); i++) await sleep(250);
  ok(!(await J(`!!TLXGR.bl`)) && (await J(`TLXGR.backlogMs`)) > 0, "the two days of posts are made a few hours per frame, not in one block (" + (await J(`TLXGR.backlogMs`)) + " ms of work in all)");
  const pc = await J(`(() => { const a = (TLXGR.pieceLog || []).map(q => q[1]).sort((x, y) => x - y); return { n: a.length, p90: a[Math.floor(a.length * 0.9)] || 0, max: a[a.length - 1] || 0, top: (TLXGR.pieceLog || []).slice().sort((x, y) => y[1] - x[1]).slice(0, 3).map(q => q.join(":")) }; })()`);
  ok(pc.n >= 60 && pc.p90 < 60 && pc.max < 200, `no backlog piece is a long frame: ${pc.n} pieces, 90th percentile ${pc.p90} ms, longest ${pc.max} ms [${pc.top}] (the cast of the shot engine is built a figure per frame; gram_backlog.mjs measures the frames themselves)`);
  const b = await J(`(() => { const ps = TLXGR.localPosts(); return { n: ps.length, span: Math.max(...ps.map(p => p.t)) - Math.min(...ps.map(p => p.t)) }; })()`);
  ok(b.n >= 40 && b.span >= 30, `a new game starts with two days of posts already there (${b.n} posts over ${b.span.toFixed(0)} h)`);
  ok(await J(`TLXGR.localPosts().every(p => p.rg === TLX.region() && p.k && (p.k.startsWith("txt:") || p.rc))`), "every post carries its region, and every picture post its recipe");
});

await section("A the moment table", async () => {
  const t = await J(`(() => { const ks = TLXGK.kinds, fam = new Set(Object.values(ks).map(r => r.fam)); return { n: Object.keys(ks).length, fams: [...fam], poor: Object.entries(ks).filter(([k, r]) => !(r.cap && r.cap.length >= 8)).map(([k]) => k), noCm: Object.entries(ks).filter(([k, r]) => !r.cm || !r.cm.nb || !r.cm.nb.length).map(([k]) => k), plans: Object.values(ks).every(r => typeof r.plan === "function" && typeof r.anchor === "function") }; })()`);
  ok(t.n >= 24, `at least 24 photo kinds (${t.n})`); ok(["people", "action", "animals", "sea", "weather", "cosy", "funny"].every(f => t.fams.includes(f)), "all seven families: " + t.fams.join(","));
  ok(t.poor.length === 0, "at least 8 caption lines per kind" + (t.poor.length ? ": " + t.poor : "")); ok(t.noCm.length === 0, "every kind has neighbour comments" + (t.noCm.length ? ": " + t.noCm : ""));
  ok(t.plans, "every kind carries a plan (still and clip) and an anchor");
  const src = ["tlx-gram.js", "tlx-gramkinds.js", "tlx-gramk-a.js", "tlx-gramk-b.js", "tlx-gramk-c.js", "tlx-gramk-d.js", "tlx-gramui.js"].map(f => fs.readFileSync(new URL("../../../" + f, import.meta.url), "utf8")).join("\n");
  ok(!/not yet|a still for now|a still: not in the game|wish:/i.test(src), "no 'not yet / a still for now / wish' posts anywhere in the gram sources");
  await ev(`TLXGR.forceW = true; TLXGR.noText = true; true`);
  const r = await J(`(() => { const vs = TLXN.villages().map(v => v.id), made = [], fail = []; let n = 0; for (const k of Object.keys(TLXGK.kinds)) { let got = null; for (let tr = 0; tr < 6 && !got; tr++) { const t = Math.floor(GS.hour / 24) * 24 + [10.5, 12.2, 13.5, 15.4][tr % 4]; try { got = TLXGR.makeOne(t, vs[(tr + n) % vs.length], { only: k }); } catch (e) { fail.push(k + ":" + e); } } n++; if (got) made.push(k); else fail.push(k); } return { made, fail }; })()`);
  console.log("   made " + r.made.length + " of the table; not at this date/place: " + r.fail.join(","));
  ok(r.made.length >= 18, `the director stages at least 18 kinds on a forced run (${r.made.length})`);
  const bad = await J(`TLXGR.genLog.filter(g => g.cap && (g.cap.length < 12 || /\\{[a-z0-9]+\\}/.test(g.cap))).map(g => g.k + ": " + g.cap)`); ok(bad.length === 0, "no caption has an unfilled {slot}: " + bad.slice(0, 3));
  await ev(`TLXGR.forceW = false; TLXGR.noText = false; true`);
});

await section("B director over 3 days, Local is the land", async () => {
  const h0 = 40 * 24 + 5.4; await ev(`TLXGR.hold = true; GS.hour = ${h0}; true`);
  for (let h = 0; h < 72; h++) { await ev(`(() => { const H = ${h0} + ${h}; WX.force = ${h % 29 === 7 || h % 29 === 8} ? { v: 1, until: H + 1 } : null; GS.hour = H; TLXGR.genHour(H + 0.4); return 1; })()`); if (h % 8 === 0) await sleep(40); }
  await ev(`WX.force = null; TLXGR.hold = false; GS.hour = ${h0 + 71.5}; true`);
  const per = await J(`(() => { const o = {}; for (const p of TLXGR.localPosts()) { const d = Math.floor(p.t / 24); if (d >= 40 && d < 43) o[d] = (o[d] || 0) + 1; } return Object.values(o); })()`);
  ok(per.slice(0, 3).every(n => n >= 20 && n <= 60), `about 30-40 Local posts a game day for the land: ${JSON.stringify(per)}`);
  const L = await J(`TLXGRUI.list().slice(0, 30).map(p => ({ id: p.id, v: p.vid, k: p.k, cap: p.cap, place: p.place }))`);
  ok(new Set(L.map(p => p.v)).size >= 5, `Local holds posts from at least 5 villages in 30: ${new Set(L.map(p => p.v)).size}`);
  ok(L.every(p => p.place), "every post names its place for the header"); ok(new Set(L.map(p => p.cap)).size === L.length, "no caption twice in 30");
  let rep = 0; for (let i = 0; i < L.length; i++) for (let j = Math.max(0, i - 5); j < i; j++) if (L[j].k === L[i].k) rep++; ok(rep === 0, `no kind within 5 in the feed order (${rep})`);
  // one synchronous read at both villages with the director frozen: the only thing that may differ is the player's position
  const both = await J(`(() => { TLXGR.hold = true; const out = []; for (const v of ["mehamn", "kjollefjord"]) { const k = TLXN.village(v); P.x = FOOT.x = k.x; P.z = FOOT.z = k.z; recenter(P.x, P.z, true); out.push(TLXGR.localPosts().map(p => p.id).sort((a, b) => a - b).join(",")); } TLXGR.hold = false; return out; })()`);
  const ids1 = both[0], ids2 = both[1];
  ok(ids1 === ids2 && ids1.length > 100, "Local's content does not change when the player moves from one village to another");
  const ms = await J(`(() => { const a = TLXGR.localPosts().length, rl = TLXRL.list().length; TLXGR.addPost({ k: "txt:news", who: null, t: GS.hour, vid: "mehamn", place: "Nuuk", cap: "A post from another land", rg: "greenland", tx: { h: 200, i: "x" } }); const s = TLX.state("gram"); s.reels.seq++; s.reels.list.push({ id: s.reels.seq, t: GS.hour, who: null, vid: null, place: "Nuuk", ty: "sea", sd: 1, rg: "greenland", x: 0, z: 0, a: 0, h: 12, s: 0, cap: "A reel from another land", cm: [], lk: 3, sn: 0 }); return { local: TLXGR.localPosts().length - a, inLocal: TLXGR.localPosts().some(p => p.rg === "greenland"), inUi: TLXGRUI.list().some(p => p.rg === "greenland"), reels: TLXRL.list().length - rl, inReels: TLXRL.list().some(r => r.rg === "greenland"), land: TLXRL.landName("greenland") }; })()`);
  ok(ms.local <= 0 && !ms.inLocal && !ms.inUi, "a post planted with another region id is not in Local");
  ok(ms.reels === 1 && ms.inReels, `and a reel with another region id shows in Reels (the land shown: ${ms.land})`);
  await ev(`(() => { const s = TLX.state("gram"); s.posts = s.posts.filter(p => p.rg !== "greenland"); s.reels.list = s.reels.list.filter(r => r.rg !== "greenland"); return 1; })()`);
});

await section("C witnessed first", async () => {
  const sk = await J(`(() => { const X = window.TLXSK; if (!X || !X.ready) return { err: "no trails" }; const per = TLXN.peopleIn("mehamn").find(q => q.age > 16 && q.age < 70), tr = X.list[0], sv = X.skiers; X.skiers = () => [{ p: per.id, trail: tr.id, x: tr.pts[3][0], z: tr.pts[3][1] }]; const s = TLX.state("gram"); delete s.pinT.skier; const n0 = TLXGR.posts().length; try { TLXGR.pinnedHour(GS.hour); } finally { X.skiers = sv; } const p = TLXGR.posts().find((q, i) => i >= 0 && q.pin === "skier" && q.id > TLX.state("gram").seq - 5); return p ? { k: p.k, who: p.rc.w[0] === per.id, x: Math.abs(p.rc.x - tr.pts[3][0]) < 1 } : { none: 1 }; })()`);
  ok(sk.k === "trailskier" && sk.who && sk.x, "a skier on a kept trail is pinned: the post is of that skier at that spot " + JSON.stringify(sk));
  const pl = await J(`(() => { const s0 = TLX.state("gram").seq; TLXN.post({ kind: "road", who: null, x: P.x + 30, z: P.z + 30, place: "Kjøllefjord", text: "The road was plowed", data: { sys: "plow", what: "plowed" } }); const p = TLXGR.posts().find(q => q.id > s0 && q.k === "plowwall"); return p ? { pin: p.pin, x: p.rc.x === Math.round((P.x + 30) * 10) / 10 } : { none: 1 }; })()`);
  ok(pl.pin && pl.x, "the plow's real position is pinned: a plowwall post at the event " + JSON.stringify(pl));
});

await section("D light and composition", async () => {
  const r = await J(`(() => { const E = TLXRL.E; E.prepare({}); E.marks = [[1e5, 0, 1e5], [1e5, 2, 1e5]]; E.faces = []; E.needH = 0.25; const bad = TLXGR.compose(E, { open: true }); const cv = document.createElement("canvas"); cv.width = 72; cv.height = 90; const g = cv.getContext("2d"); g.fillStyle = "#06080c"; g.fillRect(0, 0, 72, 90); E.marks = [[0, 0, 0]]; const m = TLXGR.measure(cv, E); return { composeOk: bad.ok, why: bad.why, sub: m.sub, contrast: m.contrast, floor: TLXGR.FLOOR }; })()`);
  ok(!r.composeOk, "a shot whose subject is out of the frame is rejected: " + r.why.join("; "));
  ok(r.sub < r.floor.sub && r.contrast < r.floor.contrast, `a black picture is under the luminance and contrast floors (sub ${r.sub.toFixed(0)}/${r.floor.sub}, contrast ${r.contrast.toFixed(0)}/${r.floor.contrast})`);
  const f = await J(`TLXGR.framing`); ok(f.rejected > 0 && f.ok > 5, `composition rejected ${f.rejected} of ${f.tries} staged shots and accepted ${f.ok}; light dropped ${await J("TLXGR.dropped.length")}, re-lit ${await J("TLXGR.relit")}`);
  await ev(`TLXGR.fpsOk = false; true`);
  const h1 = await J(`GS.hour`); for (let i = 0; i < 60 && (await J(`GS.hour`)) < h1 + 0.01; i++) await sleep(300);
  const both = JSON.parse(await ev(`(() => { const snapF = ${snap.replace(/^\(\(\) => /, "(() => ").replace(/\)\(\)$/, ")")}, S1 = snapF(), ps = TLXGRUI.list().filter(p => !p.k.startsWith("txt:")).slice(0, 3), o = []; for (const p of ps) { const e = TLXGRUI.makePic(p); o.push([e.real, e.w, e.h]); } return JSON.stringify({ S1, S2: snapF(), o }); })()`));
  const before = both.S1, after = both.S2, e = both.o;
  ok(e.length === 3 && e.every(x => x[0] && x[1] === 360 && x[2] === 450), "three pictures render for real at 360x450 (4:5)");
  ok(before === after, "the main view (camera, fog, sun, hemi, exposure, sky, viewport, size) is byte-identical after the shots");
  if (before !== after) { const a = JSON.parse(before), b = JSON.parse(after); console.log("   differs:", Object.keys(a).filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k])).join(",")); }
  await ev(`TLX.api.TABLET.close(true); true`); const n0 = await J(`TLXGR.renders + TLXGR.painted`);
  await ev(`for (let i = 0; i < 12; i++) TLXGRUI.tick(0.5); true`); await sleep(500);
  ok((await J(`TLXGR.renders + TLXGR.painted`)) === n0, "nothing renders with the tablet closed");
  await ev(OPEN); await ev(`TLXGR.setTab("reels"); true`); await sleep(500); const n1 = await J(`TLXGR.renders`);
  await ev(`for (let i = 0; i < 12; i++) TLXGRUI.tick(0.5); true`); ok((await J(`TLXGR.renders`)) === n1, "nothing from Local renders while the Reels tab is up");
  await ev(`TLXGR.setTab("local"); TLX.api.TABLET.close(true); true`);
});

await section("E the Local UI", async () => {
  await ev(OPEN); await ev(`TLXGR.setTab("local"); true`); await sleep(1200); await ev(QUIET);
  const g = await J(`(() => { const sn = document.getElementById("gSn"), col = document.querySelector("#tabS .gcol"), s = sn.children[0], r = sn.getBoundingClientRect(), pw = s.querySelector(".gpw").getBoundingClientRect(), tv = document.getElementById("tabV").getBoundingClientRect(), cr = col.getBoundingClientRect(); return { n: sn.children.length, secH: s.getBoundingClientRect().height / (r.height || 1), ratio: pw.height / pw.width, colW: cr.width, tvW: tv.width, tvH: tv.height, colH: cr.height, centred: Math.abs((cr.left + cr.right) / 2 - (tv.left + tv.right) / 2) < 12, head: !!s.querySelector(".gph .gav") && /@/.test(s.querySelector(".gwho b").textContent) && s.querySelector(".gwho span").textContent.includes("·"), likes: !!s.querySelector(".glk"), tabs: [...document.querySelectorAll("#tabS .gtabs .tml")].map(b => b.dataset.gt), all: !!sn.querySelector(".gall"), hint: document.querySelector(".ghint").textContent }; })()`);
  ok(g.n >= 30, `one feed, ${g.n} posts`); ok(Math.abs(g.secH - 1) < 0.02, "one post per screen (a section is as tall as the scroller)"); ok(Math.abs(g.ratio - 1.25) < 0.02, "the picture is 4:5 (" + g.ratio.toFixed(2) + ")");
  ok(g.centred && g.colW < g.tvW && g.colH >= g.tvH * 0.9, `a phone-shaped column, centred, as tall as the tablet allows (${Math.round(g.colW)}x${Math.round(g.colH)} in ${Math.round(g.tvW)}x${Math.round(g.tvH)})`);
  ok(g.head && g.likes && g.all, "header (avatar, handle, place, time), likes, caption and a way to all comments"); ok(JSON.stringify(g.tabs) === '["local","reels"]', "only the Local and Reels tabs: " + g.tabs);
  ok(!(await J(`!!document.querySelector('[data-gt="feed"],[data-gt="you"]')`)), "Feed, the old Local chat and You are gone");
  ok(/Up \/ Down|D-pad|Swipe/.test(g.hint), "the hint comes from btn(): " + g.hint);
  await ev(`TLXGR.view.cur = 0; true`); const cur0 = await J(`TLXGR.view.cur`);
  await ev(`(() => { window.__rn = 0; const T = TLX.api.TABLET, f = T.render; T.render = function () { window.__rn++; return f.apply(this, arguments); }; return 1; })()`);
  await tap("ArrowDown"); await sleep(800); ok((await J(`TLXGR.view.cur`)) === cur0 + 1, "Arrow down scrolls to the next post");
  await tap("ArrowDown"); await sleep(700); await tap("ArrowUp"); await sleep(700); ok((await J(`TLXGR.view.cur`)) === cur0 + 1, "Arrow up goes back one");
  ok((await J(`window.__rn`)) === 0, "scrolling does not re-render the tablet page");
  await sleep(1500); const pix = await J(`(() => { const sn = document.getElementById("gSn"), n = TLXGR.view.cur; return [n, n + 1, n + 2].map(i => sn.children[i] ? (sn.children[i].querySelector("canvas[data-gp]") || { dataset: { done: "text" } }).dataset.done || "" : "x"); })()`);
  ok(pix.every(d => d === "real" || d === "text" || d === "paint"), "the current post and the next two are drawn ahead: " + pix);
  await ev(QUIET); await tap("Enter"); await sleep(400); const sh = await J(`!!document.querySelector("#tabS .gsheet") && document.querySelectorAll("#tabS .gsheet .gmsg").length`);
  ok(sh > 0, `Enter opens all the comments (${sh})`); if (!NOSTILLS) await shot("sheet_open");
  await tap("Escape"); await sleep(300); ok(!(await J(`!!document.querySelector("#tabS .gsheet")`)), "Back closes the comments and keeps the place");
  ok(await J(`TLX.api.TABLET.open && TLX.api.TABLET.app === "gram"`), "and the app stays open");
  const c1 = await J(`TLXGR.view.cur`); await padSet({ 13: 1 }); await sleep(250); await padSet(); await sleep(800); ok((await J(`TLXGR.view.cur`)) === c1 + 1, "the d-pad scrolls one post");
  await padSet({}, [0, 0, 0, 1]); await sleep(250); await padSet(); await sleep(800); ok((await J(`TLXGR.view.cur`)) >= c1 + 2, "the right stick scrolls too");
  await padSet({ 0: 1 }); await sleep(120); await padSet(); await sleep(500); ok(await J(`!!document.querySelector("#tabS .gsheet")`), "A opens the comments"); await padSet({ 1: 1 }); await sleep(120); await padSet(); await sleep(400); ok(!(await J(`!!document.querySelector("#tabS .gsheet")`)), "B closes them");
  await ev(`TLX.api.INP.dev = "touch"; TLX.api.TABLET.render(); true`); await sleep(500);
  const hint2 = await J(`document.querySelector(".ghint").textContent`); ok(/Swipe/.test(hint2), "touch shows the swipe prompt: " + hint2);
  const c2 = await J(`TLXGR.view.cur`), rc = await J(`(() => { const r = document.getElementById("gSn").getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height * 0.75 }; })()`);
  await send("Input.synthesizeScrollGesture", { x: rc.x, y: rc.y, yDistance: -420, speed: 900, gestureSourceType: "touch" }); await sleep(1100);
  ok((await J(`TLXGR.view.cur`)) >= c2 + 1, "a touch swipe up moves on to the next post");
  await ev(`TLX.api.INP.dev = "kbm"; true`);
  if (!NOSTILLS) { await ev(`TLXGR.view.cur = 0; TLX.api.TABLET.render(); true`); await sleep(1500); await ev(QUIET); await shot("local_first"); }
  const tc = await J(`(() => { const ps = TLXGRUI.list(); return { text: ps.filter(p => p.k.startsWith("txt:")).length, cm: ps.filter(p => p.cm.length).length, thread: ps.some(p => p.cm.some(c => c[2] >= 0)), n: ps.length }; })()`);
  ok(tc.text >= 3 && tc.cm >= tc.n * 0.7 && tc.thread, `text posts (${tc.text}), comments on ${tc.cm} of ${tc.n}, and threaded replies exist`);
  await send("Emulation.setDeviceMetricsOverride", { width: 640, height: 360, deviceScaleFactor: 1, mobile: false }); await sleep(700); await ev(`TLX.api.TABLET.render(); true`); await sleep(500);
  const sm = await J(`(() => { const col = document.querySelector("#tabS .gcol"), tv = document.getElementById("tabV"), p = document.querySelector("#tabS .gpo .gpw").getBoundingClientRect(), r = col.getBoundingClientRect(), v = tv.getBoundingClientRect(); return { pic: p.height, inside: r.bottom <= v.bottom + 2 && r.top >= v.top - 2 }; })()`);
  ok(sm.inside && sm.pic > 100, `on 640x360 the column fits the tablet and the picture is still ${Math.round(sm.pic)} px tall`);
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await ev(`TLX.api.TABLET.close(true); true`);
});

await section("F2 reload and old saves", async () => {
  await ev(`TLX.api.TABLET.close(true); const s = TLX.state("gram"); s.seen = (s.posts[s.posts.length - 1] || { id: 0 }).id; save(); true`);
  const before = await J(`({ n: TLXGR.posts().length, ids: TLXGR.posts().map(p => p.id).join(","), seen: TLX.state("gram").seen, cap: TLXGR.posts().slice(-1)[0].cap, rc: JSON.stringify(TLXGR.posts().slice(-1)[0].rc) })`);
  await reload(); await sleep(1500); await ev(SETUP); await settle();
  const after = await J(`({ n: TLXGR.posts().length, ids: TLXGR.posts().map(p => p.id).join(","), seen: TLX.state("gram").seen, err: TLXGR.err, ready: TLXGR.ready })`);
  ok(after.ready && !after.err, "reload: Gram is ready, no error " + after.err);
  { const a = new Set(after.ids.split(",")), top = before.ids.split(",").map(Number).sort((x, y) => y - x).slice(0, 100); ok(top.every(i => a.has(String(i))) && after.n >= Math.min(before.n, 100), `reload keeps the posts (${before.n} -> ${after.n}; the newest 100 are all still there)`); }
  ok(await J(`(() => { const p = TLXGR.posts().find(q => q.id === ${before.ids.split(",").pop()}); return !!p && p.cap === ${JSON.stringify(before.cap)} && JSON.stringify(p.rc) === ${JSON.stringify(before.rc)}; })()`), "and their captions and recipes are the same");
  ok(after.seen === before.seen, `reload keeps what was seen (${after.seen})`);
  const sv = JSON.parse(await ev(`localStorage.getItem("tracklayer.save.v2")`)), keep = JSON.parse(JSON.stringify(sv));
  if (sv.x && sv.x.sys) delete sv.x.sys.gram;
  await reload(sv); await sleep(1500); await ev(SETUP); await settle();
  const old = await J(`({ ready: TLXGR.ready, err: TLXGR.err, n: TLXGR.localPosts().length, app: !!TLX.api.TABLET.byId.gram })`);
  ok(old.ready && !old.err && old.app && old.n >= 40, `a save with no gram state starts with two days of posts (${old.n})`);
  const sv1 = JSON.parse(JSON.stringify(keep)); sv1.x = sv1.x || { v: 1, sys: {} }; sv1.x.sys = sv1.x.sys || {};
  sv1.x.sys.gram = { v: 1, s: { seq: 5, seen: 3, cseq: 9, busId: 1, genH: 20, noteD: -9, rs: 4, last: {}, storm: { on: 0, peak: 0, t0: 0, cm: 0 }, road: {}, reels: { seq: 0, list: [] }, chat: { mehamn: [[1, 5, "x", "hello there", 0, 0, ""]] }, posts: [{ id: 1, t: 5, who: "x", vid: "mehamn", place: "Mehamn", cap: "old first-build post", sj: "peak", lk: 4, cm: [], rc: { c: [1, 2, 3], a: [1, 2], f: 50, h: 12, s: 0 } }] } };
  await reload(sv1); await sleep(1500); await ev(SETUP); await settle();
  const fb = await J(`({ ready: TLXGR.ready, err: TLXGR.err, n: TLXGR.localPosts().length, old: TLXGR.posts().some(p => p.cap === "old first-build post"), chat: !!TLX.state("gram").chat })`);
  ok(fb.ready && !fb.err && !fb.old && fb.n >= 40 && !fb.chat, `the first build's save is discarded cleanly and the game starts with two days of new posts (${fb.n})`);
  const sv2 = JSON.parse(JSON.stringify(keep)); sv2.x.sys.gram = { v: 2, s: { posts: [null, 5, "x", { id: "a" }, { id: 3, t: 1, cap: "ok", k: "nokind", rc: { k: "nokind" } }, { id: 4, t: "x" }, { id: 9, t: 5, cap: "fine", k: "txt:news", cm: [[1, "x"]], lk: 3 }], seen: "x", seq: -4, busId: null, gen: {}, rs: "no", last: 5, storm: null, road: [], mem: 7, sk: "no" } };
  await reload(sv2); await sleep(1500); await ev(SETUP); await settle();
  const junk = await J(`({ ready: TLXGR.ready, err: TLXGR.err, n: TLXGR.localPosts().length })`);
  ok(junk.ready && !junk.err, "junk state does not throw: Gram loads (" + junk.n + " posts)");
  await ev(OPEN); await sleep(800); ok((await ev(`document.getElementById("tabV").textContent`)).length > 80, "and the app renders from it"); await ev(`TLX.api.TABLET.close(true); true`);
});

await section("G the low preset paints per kind", async () => {
  await raw(`localStorage.setItem("tracklayer.set.v1", JSON.stringify({ gfx: "low" })); true`); await reload(); await sleep(1500); await ev(SETUP); await settle();
  ok(await J(`TLX.api.GFX.low === true`), "the low preset is on");
  const r = await J(`(() => { const ps = TLXGRUI.list().filter(p => !p.k.startsWith("txt:")), by = {}; for (const p of ps) { const row = TLXGK.kinds[p.k]; if (row && !by[row.paint]) by[row.paint] = p; } const out = [], r0 = TLXGR.renders; for (const p of Object.values(by).slice(0, 5)) { const e = TLXGRUI.makePic(p), d = e.cv.getContext("2d").getImageData(0, 0, e.w, e.h).data; let s = 0, s2 = 0, n = 0, sig = 0; for (let i = 0; i < d.length; i += 40) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; s += l; s2 += l * l; n++; sig = (sig * 31 + Math.round(l / 8)) % 1000003; } const m = s / n; out.push({ paint: TLXGK.kinds[p.k].paint, real: e.real, w: e.w, sd: Math.sqrt(Math.max(0, s2 / n - m * m)), sig }); } return { out, renders: TLXGR.renders - r0 }; })()`);
  ok(r.out.length >= 3 && r.out.every(o => !o.real && o.sd > 8 && o.w <= 288) && r.renders === 0, `no render on low: painted pictures are drawn, ${r.out.length} paint styles, none real`);
  ok(new Set(r.out.map(o => o.sig)).size === r.out.length, "and each kind paints its own picture (" + r.out.map(o => o.paint).join(",") + ")");
  await raw(`localStorage.setItem("tracklayer.set.v1", JSON.stringify({})); true`);
});

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
await done(fails ? 1 : 0);

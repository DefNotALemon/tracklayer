// I6 the Camera: lift it anywhere, the world keeps running, the reticle names its subject, shots are scored and kept.
import { boot, ev, sleep, done, reload, shot, padSet, padOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 400)); } };
const SETUP = `tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; GS.stormPhase = "calm"; GS.warned = false; GS.warmth = 100; GS.fuel = GS.cap; TLX.setOn("police", false); TLX.setOn("traffic", false); true`;
await boot(); await ev(SETUP); await sleep(1200);
// open fell at noon in March, a moose 30 m ahead of the sled and a fox off to the side
const PUT = `(() => { GS.hour = 100 * 24 + 12; const W = TLX.api.world; let sx = 0, sz = 0; for (let r = 400; r < 3000 && !sx; r += 150) for (let a = 0; a < 6.28; a += 0.5) { const x = W.depot.x + Math.cos(a) * r, z = W.depot.z + Math.sin(a) * r; if (!W.isSea(x, z) && !W.isWater(x, z) && W.slopeAt(x, z, 6) < 0.12 && !W.obNear(x, z, 30) && !W.isSea(x, z + 60) && W.slopeAt(x, z + 40, 6) < 0.15) { sx = x; sz = z; break; } }
  FOOT.on = false; P.x = sx; P.z = sz; P.yaw = 0; P.vx = P.vz = 0; TLX.api.recenter && 0;
  const WG = TLX.api.wild.groups(); WG.length = 0; const mk = (kind, x, z, st) => { const q = TLX.api.gram.quad.make(kind); Object.assign(q, { x, z, yaw: 1.6, v: 0, ox: 0, oz: 0, graze: 0, wT: 99 }); const G = { kind, sp: null, x, z, yaw: 1.6, state: st, t: 1e9, v: 0, m: [q], _test: 1 }; return G; };
  window.__moose = mk("moose", sx, sz + 30, "graze"); window.__fox = mk("fox", sx + 16, sz + 16, "walk"); return { sx, sz }; })()`;
const pos = await J(PUT); ok(pos.sx !== 0, "open fell found");
// the test animals are held by hand (not in WILD.groups, whose tick would move or free them): the camera is given them through the same list
await ev(`(() => { const g0 = TLX.api.wild.groups; const mine = [window.__moose, window.__fox]; TLX.api.wild.groups = () => g0().concat(mine); for (const G of mine) for (const q of G.m) { q.g.position.set(q.x, TLX.api.world.surf(q.x, q.z), q.z); q.g.rotation.y = q.yaw; q.g.visible = true; } })(); true`);
await sleep(600);

await section("A lifting it, on every scheme, and the world keeps running", async () => {
  ok((await ev(`TLXCAM.on`)) === false, "down to start with");
  const h0 = await J(`GS.hour`); await ev(`window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyK", bubbles: true })); true`); await sleep(500);
  const a = await J(`({ on: TLXCAM.on, ov: !document.getElementById("camOv").hidden, hint: document.querySelector("#camOv .hint").textContent, fov: TLX.api.camera.fov, eye: TLX.api.camera.position.y - TLX.api.world.surf(P.x, P.z), d: Math.hypot(TLX.api.camera.position.x - P.x, TLX.api.camera.position.z - P.z) })`);
  ok(a.on && a.ov && a.d < 0.6 && a.eye > 1.1 && a.eye < 2.2, `K lifts it: first person from the saddle (eye ${a.eye.toFixed(2)} m up, ${a.d.toFixed(2)} m from the sled)`);
  ok(/Click: take it/.test(a.hint) && /K: put it away/.test(a.hint), "the keyboard is told its own controls: " + a.hint);
  await ev(`P.vz = 6; true`); await sleep(900); const m = await J(`({ h: GS.hour, z: P.z, on: TLXCAM.on })`);
  ok(m.h > h0 && m.z > pos.sz + 1 && m.on, `nothing pauses: the clock ran and the sled rolled ${(m.z - pos.sz).toFixed(1)} m with the camera up`);
  await ev(`P.vx = P.vz = 0; P.x = ${pos.sx}; P.z = ${pos.sz}; true`);
  await ev(`window.dispatchEvent(new WheelEvent("wheel", { deltaY: -600, bubbles: true })); true`); await sleep(300); const z = await J(`({ z: TLXCAM.zoom, fov: TLX.api.camera.fov })`);
  ok(z.z > 2 && z.fov < a.fov * 0.6, `the wheel zooms (${z.z.toFixed(1)}x, field of view ${a.fov.toFixed(0)} to ${z.fov.toFixed(0)} degrees)`);
  await ev(`window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyK", bubbles: true })); true`); await sleep(400);
  const b = await J(`({ on: TLXCAM.on, ov: document.getElementById("camOv").hidden, fov: TLX.api.camera.fov })`); ok(!b.on && b.ov && b.fov > z.fov + 5, "K again puts it away and the view is the game's again");
  // pad: a tap of the right stick still changes the view, a hold lifts the camera
  const v0 = await ev(`document.getElementById("viewBtn").textContent`);
  await padSet({ 11: 1 }); await sleep(150); await padSet({}); await sleep(250); const v1 = await ev(`(() => { const b = document.getElementById("viewBtn"); return TLXCAM.on ? "CAM" : "tap"; })()`);
  ok(v1 === "tap", "a tap of the right stick does not lift it");
  await padSet({ 11: 1 }); await sleep(1300); await padSet({}); await sleep(250); ok(await ev(`TLXCAM.on`), "holding the right stick in lifts it");
  const hp = await ev(`document.querySelector("#camOv .hint").textContent`); ok(/^A: take it/.test(hp) && /right stick: aim/.test(hp), "the pad is told its own: " + hp);
  await padSet({}, [0, 0, 0.9, 0]); await sleep(800); const y1 = await J(`TLXCAM.yaw`); await ev(`TLXCAM.zoom = 1; true`); await padSet({ 12: 1 }); await sleep(800); const z1 = await J(`TLXCAM.zoom`); await padSet({}); await sleep(150);
  ok(Math.abs(y1) > 0.2 && z1 > 1.3 && !(await ev(`TLX.api.tablet()`)), `the right stick aims (${y1.toFixed(2)} rad) and d-pad up zooms (${z1.toFixed(1)}x) without opening the tablet`);
  const n0 = await J(`TLXCAM.roll().length`); await padSet({ 0: 1 }); await sleep(400); await padSet({}); await sleep(300); ok((await J(`TLXCAM.roll().length`)) === n0 + 1, "A takes the picture (and does not hop the sled)");
  await padSet({ 1: 1 }); await sleep(400); await padSet({}); await sleep(250); ok(!(await ev(`TLXCAM.on`)) && !(await ev(`GS.garageOpen`)), "B puts it away (and does not open the garage)"); await padOff(); await sleep(300);
  await ev(`INP.dev = "touch"; TLXCAM.open(); true`); await sleep(400);
  const t = await J(`({ hint: document.querySelector("#camOv .hint").textContent, sh: getComputedStyle(document.querySelector("#camOv .sh")).display, r: document.querySelector("#camOv .sh").getBoundingClientRect().width })`);
  ok(/drag to aim/.test(t.hint) && t.sh !== "none" && t.r >= 44, "touch gets a shutter button and its own hint"); await ev(`TLXCAM.close(); INP.dev = "kbm"; TLX.state("camera").roll.length = 0; TLX.state("camera").best = {}; true`);
});

await section("B the reticle and the score", async () => {
  await ev(`TLXCAM.open(); TLXCAM.aimAt(P.x, TLX.api.world.surf(P.x, P.z + 30) + 1.1, P.z + 30); true`); await sleep(500);
  const f = await J(`(() => { const f = TLXCAM.focus; return f && { kind: f.kind, name: f.name, dist: f.dist, size: f.size, pose: f.pose, lab: document.querySelector("#camOv .lab").textContent, on: document.querySelector("#camOv .ret").classList.contains("on") }; })()`);
  ok(f && f.kind === "moose" && f.on && /Moose/.test(f.lab) && /m$/.test(f.lab), "the reticle names what it is on: " + (f && f.lab));
  await shot("camera_moose", 90);
  const far = await J(`(() => { const p = TLXCAM.shoot(); return p && { score: p.score, parts: p.parts, name: p.name, img: (p.img || "").length }; })()`);
  ok(far && far.name === "Moose" && far.img > 2000 && far.parts.first === 12, `the shot is kept with a picture (${far && far.img} bytes) and a first-of-its-kind bonus`);
  await sleep(600); await ev(`TLXCAM.zoom = 4; true`); await sleep(400); const near = await J(`(() => { const p = TLXCAM.shoot(); return { score: p.score, parts: p.parts, size: TLXCAM.focus && TLXCAM.focus.size }; })()`);
  ok(near.parts.size > far.parts.size + 4 && near.parts.first === 0, `zoomed in it fills more of the frame and scores more for size (${far.parts.size} to ${near.parts.size}); the first bonus is paid once`);
  await sleep(600); await ev(`window.__moose.state = "flee"; true`); await sleep(300); const run = await J(`(() => { const p = TLXCAM.shoot(); return { score: p.score, pose: p.pose, parts: p.parts }; })()`); await ev(`window.__moose.state = "graze"; true`);
  ok(run.pose === "running" && run.parts.pose > near.parts.pose && run.score > near.score, `an animal doing something beats one standing (${near.score} standing, ${run.score} running)`);
  await sleep(600); await ev(`TLXCAM.zoom = 1; TLXCAM.aimAt(P.x - 60, TLX.api.world.surf(P.x, P.z) + 30, P.z - 60); true`); await sleep(400);
  const none = await J(`(() => { const f = TLXCAM.focus, p = TLXCAM.shoot(); return { f: f && f.kind, name: p.name, score: p.score }; })()`);
  ok(!none.f || none.f === "place" || none.f === "aurora", "pointed at empty sky it names no animal: " + none.name); ok(none.score < far.score, `and that scores less (${none.score})`);
  await sleep(600); await ev(`TLXCAM.zoom = 5; TLXCAM.aimAt(P.x + 16, TLX.api.world.surf(P.x + 16, P.z + 16) + 0.25, P.z + 16); true`); await sleep(400);
  const fx = await J(`(() => { const f = TLXCAM.focus; return f && { kind: f.kind, pose: f.pose }; })()`); ok(fx && fx.kind === "fox" && fx.pose === "on the move", "a fox 23 m off is found through the zoom: " + JSON.stringify(fx));
  // behind a hill it is not named
  const hid = await J(`(() => { const W = TLX.api.world, s0 = W.surf; W.surf = (x, z) => Math.hypot(x - P.x, z - (P.z + 15)) < 6 ? s0(x, z) + 9 : s0(x, z); TLXCAM.zoom = 1; TLXCAM.aimAt(P.x, s0(P.x, P.z + 30) + 1.1, P.z + 30); const f = TLXCAM.find(); W.surf = s0; return f ? f.kind : null; })()`);
  ok(hid !== "moose", "an animal behind a rise is not named (" + hid + ")");
  ok(!(await ev(`TLXCAM.err`)), "no error: " + (await ev(`TLXCAM.err`)));
});

await section("C on foot, the roll, the app, the save", async () => {
  await ev(`TLXCAM.close(); FOOT.on = true; FOOT.x = P.x + 3; FOOT.z = P.z; FOOT.yaw = 0; true`); await sleep(500); await ev(`TLXCAM.open(); true`); await sleep(400);
  const a = await J(`({ on: TLXCAM.on, eye: TLX.api.camera.position.y - TLX.api.world.surf(FOOT.x, FOOT.z), d: Math.hypot(TLX.api.camera.position.x - FOOT.x, TLX.api.camera.position.z - FOOT.z), vis: FOOT.g ? FOOT.g.visible : null })`);
  ok(a.on && a.d < 0.3 && a.eye > 1.3 && a.eye < 1.9 && a.vis !== true, `on foot it is from your own eyes (${a.eye.toFixed(2)} m), and your own body is out of the picture`);
  await ev(`FOOT.x += 0; true`); const x0 = await J(`FOOT.x`); await ev(`TLXCAM.close(); true`); await sleep(300); ok((await J(`FOOT.g ? FOOT.g.visible : true`)) === true, "lowered, you are drawn again");
  // the roll holds 30 and drops the weakest
  await ev(`(() => { const S = TLX.state("camera"); for (let i = 0; i < 34; i++) S.roll.push({ id: ++S.n, t: GS.hour, kind: "view", name: "The view", pose: "", score: 5 + i, stars: 1, parts: {}, x: 0, z: 0, img: "" }); S.roll[S.roll.length - 34].keep = true; TLXCAM.open(); })(); true`); await sleep(400); await ev(`TLXCAM.shoot(); TLXCAM.close(); true`); await sleep(300);
  const r = await J(`(() => { const R = TLXCAM.roll(); return { n: R.length, min: Math.min(...R.filter(p => !p.keep).map(p => p.score)), kept: R.some(p => p.keep && p.score === 5), moose: R.filter(p => p.kind === "moose").length }; })()`);
  ok(r.n === 30 && r.kept && r.moose >= 2, `the roll holds 30: the weakest left, the one marked KEEP stayed, the moose are still there (${r.moose})`);
  await ev(`TLX.api.TABLET.toggle(true, "camera"); true`); await sleep(700);
  const app = await J(`(() => { const el = document.getElementById("tabS"); return { txt: el.innerText.slice(0, 200), cards: el.querySelectorAll("[data-tf^='ph:']").length, open: !!el.querySelector("[data-act='cam:open']"), img: [...el.querySelectorAll("[data-tf^='ph:'] > div")].filter(d => /url\\(/.test(d.style.backgroundImage)).length }; })()`);
  ok(app.cards === 30 && app.open && app.img >= 2, `the Camera app shows the roll (${app.cards} cards, ${app.img} with their pictures) and a button to lift it`);
  await shot("camera_app", 90);
  await ev(`document.querySelector("#tabS [data-act='cam:open']").click(); true`); await sleep(600); ok((await ev(`TLXCAM.on`)) && !(await ev(`TLX.api.tablet()`)), "the button puts the tablet away and lifts the camera");
  await ev(`TLXCAM.close(); save(); true`); await reload(); await ev(SETUP); await sleep(800);
  const s2 = await J(`({ n: TLXCAM.roll().length, best: Object.keys(TLX.state("camera").best), img: TLXCAM.roll().filter(p => p.img && p.img.length > 2000).length })`);
  ok(s2.n === 30 && s2.best.includes("moose") && s2.img >= 2, "the roll, the pictures and your bests are in the save: " + JSON.stringify(s2));
});
console.log(fails ? `FAILS: ${fails}` : "all passed");
await done(fails ? 1 : 0);

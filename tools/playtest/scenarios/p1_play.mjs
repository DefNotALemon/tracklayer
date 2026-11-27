// P1 in play: riding (default chase and first person), on foot, night, a storm, the low preset, and the 640x360 itch size. Stills + a few sanity asserts.
// Run: bash tools/playtest/run.sh tools/playtest/scenarios/p1_play.mjs <outdir>   (SIZE=640x360 for the itch embed)
import { boot, ev, raw, shot, sleep, done, park, reload, hold, errors } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const [W, H] = (process.env.SIZE || "1280x720").split("x").map(Number);
await boot({ width: W, height: H });
const hide = () => ev(`(() => { const t = document.getElementById('toasts'); if (t) t.style.display = 'none'; return true; })()`);
await ev(`tutSkip(); crashCancel(); FOOT.on = false; VEH.cur = null; WX.at = () => 0; GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + 12 + 120 * 24; camState.init = false; QG.on = false; QG.apply(0); renderer.setPixelRatio(${W > 800 ? 1.5 : 1}); true`);
await hide(); await sleep(2500);
const luma = () => ev(`new Promise(res => requestAnimationFrame(() => { const gl = renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, b = new Uint8Array(w * h * 4); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, b); let s = 0, n = 0; for (let i = 0; i < b.length; i += 32) { s += b[i] * 0.2126 + b[i + 1] * 0.7152 + b[i + 2] * 0.0722; n++; } res(s / n); }))`);
const st = async () => J(`({ chain: TLXPOST.on(), size: TLXPOST.size, db: [renderer.domElement.width, renderer.domElement.height], ao: TLXPOST.fx.ao, bl: TLXPOST.fx.bloom, rung: QG.rung })`);
await park("depot.x + 1500", "depot.z - 900"); await sleep(1800);
// riding: hold W for a few seconds, default chase camera
await ev("camMode = 0; camState.init = false; true");
await ev("mount && (FOOT.on && mount()); true"); await sleep(3500);
await hold(["KeyW"], 4000); await shot("play_ride_chase");
let l = await luma(); ok(l > 40, `riding chase: not black (luma ${l.toFixed(1)}) ${JSON.stringify(await st())}`);
await ev("camMode = 1; camState.init = false; true"); await sleep(1200); await hold(["KeyW"], 1500); await shot("play_ride_fp");
l = await luma(); ok(l > 40, `riding first person: not black (luma ${l.toFixed(1)})`);
await ev("camMode = 0; camState.init = false; FOOT.on = true; FOOT.x = P.x + 3; FOOT.z = P.z + 3; FOOT.y = surf(FOOT.x, FOOT.z); true"); await sleep(2000); await shot("play_foot");
l = await luma(); ok(l > 40, `on foot: not black (luma ${l.toFixed(1)})`);
await ev("FOOT.on = false; GS.hour = Math.floor(GS.hour / 24) * 24 + 22.5; camState.init = false; true"); await sleep(3000); await hold(["KeyW"], 2500); await shot("play_night");
l = await luma(); ok(l > 8, `night: not black (luma ${l.toFixed(1)})`);
await ev("GS.hour = Math.floor(GS.hour / 24) * 24 + 12; WX.at = () => 1; GS.storm = 1; true"); await sleep(3500); await hold(["KeyW"], 2000); await shot("play_storm");
l = await luma(); ok(l > 40, `storm: not black (luma ${l.toFixed(1)}) ${JSON.stringify(await st())}`);
// the governor on: let it run for a bit and see what it does with the effects
await ev("WX.at = () => 0; GS.storm = 0; QG.on = true; true"); await sleep(6000); console.log("governor after 6 s:", JSON.stringify(await st()));
// low preset
await raw(`localStorage.setItem("tracklayer.set.v1", JSON.stringify({ gfx: "low" })); true`);
await ev("save = function () { }; true"); await reload(); await sleep(1500); await hide();
await ev("tutSkip(); crashCancel(); FOOT.on = false; VEH.cur = null; WX.at = () => 0; GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + 12 + 120 * 24; camState.init = false; true"); await sleep(3500); await shot("play_low");
const lo = await J(`({ chain: TLXPOST.on(), low: GFX.low, env: !!scene.environment, pr: renderer.getPixelRatio() })`);
l = await luma(); ok(lo.low && !lo.chain && l > 40, `low preset: chain off, picture drawn directly (luma ${l.toFixed(1)}) ${JSON.stringify(lo)}`);
await raw(`localStorage.removeItem("tracklayer.set.v1"); true`);
console.log("page errors:", errors.length ? errors.slice(0, 4).join(" | ") : "none");
ok(!errors.some(e => /shader error|WebGLProgram|TLXPOST off/.test(e)), "no shader / chain errors");
console.log(fails ? "FAILED " + fails : "ALL OK");
await done(fails ? 1 : 0);

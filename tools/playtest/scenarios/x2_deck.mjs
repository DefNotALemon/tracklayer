// Expansion slice 2.6b: the sled drives on and off the sled trailer, and straps down. Asserts, exit 1 on a failure.
//   With the ramp down the sled climbs the ramp under its own power and rides up onto the deck, the front stop rail holds it;
//   on foot beside it, use STRAPs it down (keyboard E, pad L3, touch STRAP) and UNSTRAPs it; strapped, the throttle does
//   nothing and a toast says why; a reload keeps it strapped on the deck; strapped it goes where the trailer goes; unstrapped
//   it backs down the ramp onto the snow. The trailer's side is a wall, and with the ramp up so is its tail; the ramp won't
//   come up under a sled standing on it. Old saves (no strap field) load. Headless Chrome is ~0.6x: measured by gameClock.
import { boot, ev, tap, sleep, done, park, padSet, padOff, shot, down, up, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(120); }
async function waitUntil(expr, maxGame = 12) { const t0 = await clock(); while ((await clock()) - t0 < maxGame) { if (await ev(expr)) return true; await sleep(120); } return false; }
const hookToasts = () => ev(`(() => { const o = toast; toast = (m, k) => { (window.__T = window.__T || []).push(m); return o(m, k); }; return 1; })()`);
const toasts = () => J(`(window.__T || []).concat((typeof TOASTQ !== "undefined" ? TOASTQ : []).map(t => t.msg), [...$("toasts").children].map(c => c.textContent))`);
const clearToasts = () => ev(`window.__T = []; if (typeof TOASTQ !== "undefined") TOASTQ.length = 0; $("toasts").textContent = ""; true`);
// the sled (P while you're on it or beside it) in the trailer's frame, and what's under it
const S = () => J(`(() => { const h = TLXV.haul(), L = TLXV.haulLocal(h, P.x, P.z), on = TLXV.sledOnDeck(P.x, P.z, P.y), g = rideSurf(P.x, P.z);
  return { lx: L.x, lz: L.z, y: P.y, g, up: P.y - g, on: !!on, top: on ? on.top : null, ramp: on ? on.ramp : null, strap: h.strap, hr: h.ramp, sp: Math.hypot(P.vx, P.vz), foot: FOOT.on, cur: TLX.state("vehicles").cur,
    use: FOOT.on ? footUse() : null, hint: $("wnHint").textContent, fin: [P.x, P.y, P.z, P.yaw].every(Number.isFinite) }; })()`);
const LIM = 2.25 - 0.06 - 1.5;           // the sled's middle when its nose is on the front rail
// put the sled at a point in the trailer's frame, pointing along it (+ dyaw), riding, still
const sledAt = (lx, lz, dyaw = 0, onDeck = false) => ev(`(() => { const h = TLXV.haul(), w = TLXV.haulWorld(h, ${lx}, ${lz}); crashCancel(); FOOT.on = ${onDeck}; MNT.on = DMT.on = false;
  P.x = w[0]; P.z = w[1]; P.yaw = h.yaw + ${dyaw}; P.vx = P.vz = P.vy = 0; P.yr = 0; P.y = ${onDeck} ? (TLXV.deckAt(P.x, P.z, 99) ?? rideSurf(P.x, P.z)) : rideSurf(P.x, P.z); recenter(P.x, P.z, true); return 1; })()`);
// the walker beside the deck (left side), level with the sled
const walkerBeside = (side = 1) => ev(`(() => { const h = TLXV.haul(), L = TLXV.haulLocal(h, P.x, P.z), w = TLXV.haulWorld(h, ${side} * (TLXV.HAUL.deckW / 2 + 0.75), L.z);
  FOOT.on = true; FOOT.x = w[0]; FOOT.z = w[1]; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.yaw = h.yaw - ${side} * Math.PI / 2; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
const pressUseTouch = () => ev(`(() => { const b = $("tcUse"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return true; })()`);
const cam = (side, back, upH) => ev(`(() => { if (!window.__camH) { const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); }; window.__camH = 1; }
  window.camOv = c => { const h = TLXV.haul(), fx = Math.sin(h.yaw), fz = Math.cos(h.yaw), lx = fz, lz = -fx, y = rideSurf(h.x, h.z);
    c.position.set(h.x + lx * ${side} - fx * ${back}, y + ${upH}, h.z + lz * ${side} - fz * ${back}); c.lookAt(h.x - fx * 0.6, y + 0.7, h.z - fz * 0.6); }; return 1; })()`);
const camOff = () => ev(`window.camOv = null; true`);

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await hookToasts();
await ev(`crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`);
console.log("parked", JSON.stringify(await park()));
// a long plowed lane; the trailer stands free on it with its ramp down, the sled 7 m behind its tail
const lane = await J(`(() => { let best = null; for (const Y of YARDS) { if (Y.x2 === undefined || Y.r > 2.5) continue; const L = Math.hypot(Y.x2 - Y.x, Y.z2 - Y.z); if (!best || L > best.L) best = { x: Y.x, z: Y.z, x2: Y.x2, z2: Y.z2, L }; } return best; })()`);
ok(lane && lane.L > 30, `a plowed lane to work on (${lane ? lane.L.toFixed(0) : 0} m)`);
await ev(`(() => { const L = ${JSON.stringify(lane)}, ux = (L.x2 - L.x) / L.L, uz = (L.z2 - L.z) / L.L, yaw = Math.atan2(ux, uz);
  TLX.state("vehicles").haul = { on: null, x: L.x + ux * 18, z: L.z + uz * 18, yaw, ramp: 1 }; recenter(L.x + ux * 18, L.z + uz * 18, true); return 1; })()`);
await sledAt(0, -8); await waitGame(1.5);
let s = await S();
ok(s.on === false && Math.abs(s.up) < 0.25 && s.hr === 1, `the sled sits on the snow behind the trailer, ramp down (lz ${s.lz.toFixed(2)}, ${s.up.toFixed(2)} m over the snow)`);
ok((await ev(`TLXV.deckAt(...TLXV.haulWorld(TLXV.haul(), 0, 0), 99)`)) > (await ev(`rideSurf(...TLXV.haulWorld(TLXV.haul(), 0, 0))`)) + 0.4, "the deck stands about half a metre above the snow");
await cam(4.2, 1.0, 1.6); await shot("x2deck_0_behind");

// ---- 1. drive up the ramp under its own power, feathering the throttle like a player loading up (about 2-3 m/s)
const climb = [];
const t0 = await clock(); let topSeen = false, wDown = false;
while ((await clock()) - t0 < 14) {
  s = await S(); climb.push(s);
  if (s.ramp && !topSeen && s.up > 0.25) { topSeen = true; await shot("x2deck_1_ramp"); }
  if (s.on && !s.ramp && s.lz > LIM - 0.02) break;
  const want = s.sp < 2.2; if (want !== wDown) { wDown = want; await (want ? down : up)("KeyW"); }
  await sleep(60);
}
if (wDown) await up("KeyW");
await waitGame(1.0);
s = await S();
const rampY = climb.filter(c => c.ramp).map(c => c.up);
console.log("climb", climb.length, "samples; ramp samples", rampY.length, "final", JSON.stringify(s));
ok(rampY.length > 0, `the sled went up the ramp itself (${rampY.length} samples on it, max ${Math.max(0, ...rampY).toFixed(2)} m up)`);
ok(s.on && !s.ramp && Math.abs(s.y - s.top) < 0.12, `it rides on the deck (y ${s.y.toFixed(2)}, deck ${s.top ? s.top.toFixed(2) : "-"}, ${s.up.toFixed(2)} m above the snow)`);
ok(climb.every(c => c.fin) && s.fin, "pose finite all the way");
await cam(4.5, 0.5, 1.7); await shot("x2deck_2_ondeck");
// ---- 2. the front stop rail: 2 s more throttle goes nowhere past it
await down("KeyW"); await waitGame(2.0); await up("KeyW"); await waitGame(0.6);
s = await S();
ok(s.on && s.lz <= LIM + 0.03, `the front rail stops it (middle at lz ${s.lz.toFixed(2)}, stop ${LIM.toFixed(2)}), still on the deck`);
const maxSp = Math.max(...climb.map(c => c.sp));
ok(maxSp < 5.5, `loaded at a walking pace (top ${maxSp.toFixed(1)} m/s)`);

// ---- 3. strap it down: keyboard E beside it
await tap("KeyQ"); ok(await waitUntil("FOOT.on && !DMT.on", 12), "Q gets off");
await waitGame(0.4);
await walkerBeside(1); await waitGame(0.7);
s = await S();
console.log("beside", JSON.stringify(s));
ok(s.on && s.use === "STRAP" && /E: strap the sled down/.test(s.hint), `on foot beside it: "${s.hint}" (${s.use})`);
await clearToasts(); await tap("KeyE"); await waitGame(0.5);
s = await S();
ok(!!s.strap && (await toasts()).some(t => /strapped to the trailer/.test(t)), `E straps it down (strap ${JSON.stringify(s.strap)})`);
await cam(3.8, -0.2, 1.4); await shot("x2deck_3_strapped");
// pad L3 unstraps, touch straps again
await waitGame(0.3);
s = await S(); ok(s.use === "UNSTRAP", `now use reads ${s.use}`);
await padSet({ 10: 1 }); await sleep(350); await padSet(); await sleep(450); await padOff();
s = await S(); ok(!s.strap, `pad L3 unstraps it (strap ${JSON.stringify(s.strap)})`);
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await waitGame(0.6);
let t = await J(`({ t: $("tcUse").hidden ? null : $("tcUse").textContent, hint: $("wnHint").textContent })`);
ok(t.t === "STRAP" && /tap STRAP/.test(t.hint), `touch: the use button reads ${t.t}; "${t.hint}"`);
await pressUseTouch(); await waitGame(0.4);
s = await S(); ok(!!s.strap, "touch STRAP straps it");
await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; true`); await sleep(300);

// ---- 4. strapped: on it, the throttle does nothing, and says so
const p0 = await J(`({ x: P.x, z: P.z })`);
await ev(`FOOT.on = false; MNT.on = DMT.on = false; true`); await waitGame(0.3);
await clearToasts(); await down("KeyW"); await waitGame(2.0); await up("KeyW"); await waitGame(0.3);
const p1 = await J(`({ x: P.x, z: P.z })`), mv = Math.hypot(p1.x - p0.x, p1.z - p0.z);
ok(mv < 0.05, `strapped, 2 s of throttle moves it ${mv.toFixed(3)} m`);
ok((await toasts()).some(t => /strapped to the trailer\. Get off and unstrap/.test(t)), "a toast says it's strapped: get off and unstrap it");
// strapped, it goes where the trailer goes (the trailer nudged 1.5 m along and 0.2 rad round)
await ev(`(() => { const h = TLXV.haul(); h.x += Math.sin(h.yaw) * 1.5; h.z += Math.cos(h.yaw) * 1.5; h.yaw += 0.2; return 1; })()`); await waitGame(0.5);
s = await S();
ok(s.on && Math.abs(s.lz - (await ev("TLXV.haul().strap.z"))) < 0.02 && Math.abs(s.y - s.top) < 0.12, `strapped, it moves with the deck (lz ${s.lz.toFixed(2)}, on deck ${s.on})`);
await ev(`(() => { const h = TLXV.haul(); h.yaw -= 0.2; h.x -= Math.sin(h.yaw) * 1.5; h.z -= Math.cos(h.yaw) * 1.5; return 1; })()`); await waitGame(0.5);

// ---- 5. reload keeps it strapped on the deck
await reload(); await sleep(1500); await hookToasts(); await waitGame(1.2);
s = await S();
console.log("after reload", JSON.stringify(s));
ok(!!s.strap && s.on && Math.abs(s.y - s.top) < 0.15 && s.fin, `after a reload it is still strapped on the deck (y ${s.y.toFixed(2)}, deck ${s.top ? s.top.toFixed(2) : "-"})`);

// ---- 6. unstrap and back it down the ramp onto the snow
await ev(`WX.at = () => 0; GS.storm = 0; true`);
await ev(`crashCancel(); FOOT.on = false; MNT.on = DMT.on = false; true`); await waitGame(0.3);
await walkerBeside(-1); await waitGame(0.6);
s = await S(); ok(s.use === "UNSTRAP" && /E: unstrap/.test(s.hint), `beside it on the other side: "${s.hint}"`);
await tap("KeyE"); await waitGame(0.4);
s = await S(); ok(!s.strap, "E unstraps it");
await ev(`FOOT.on = false; MNT.on = DMT.on = false; true`); await waitGame(0.3);
await down("KeyS"); const t1 = await clock(); const back = [];
while ((await clock()) - t1 < 10) { s = await S(); back.push(s); if (!s.on && s.lz < -3.2 - 1.5) break; await sleep(100); }
await up("KeyS"); await waitGame(1.5);
s = await S();
console.log("backed off", JSON.stringify(s), "samples", back.length, JSON.stringify(back.filter((c, i) => i % 4 === 0).map(c => [+c.lz.toFixed(2), +c.up.toFixed(2), +c.sp.toFixed(1), c.on])));
ok(back.some(c => c.ramp) && !s.on && s.lz < -3.05 && Math.abs(s.up) < 0.3 && s.fin, `reversing takes it down the ramp onto the snow (lz ${s.lz.toFixed(2)}, ${s.up.toFixed(2)} m over the snow, on the ramp on the way: ${back.some(c => c.ramp)})`);

// ---- 7. the side is a wall: driving square into it from 3 m out
await sledAt(3.2, 0.3, -Math.PI / 2); await waitGame(0.4);
await down("KeyW"); const wall = []; const t2 = await clock();
while ((await clock()) - t2 < 3) { wall.push(await S()); await sleep(100); }
await up("KeyW"); await waitGame(0.4); s = await S();
const minLx = Math.min(...wall.map(c => Math.abs(c.lx)));
ok(minLx >= 2.16 / 2 + 0.5 && !wall.some(c => c.on), `driving into its side, the sled stops against it (closest middle ${minLx.toFixed(2)} m from its centre line, never on the deck)`);

// ---- 8. ramp up: the tail is a wall too
await ev(`TLXV.haul().ramp = 0; true`); await waitGame(1.5);
await sledAt(0, -7.5); await waitGame(0.4);
await down("KeyW"); const tail = []; const t3 = await clock();
while ((await clock()) - t3 < 4) { tail.push(await S()); await sleep(100); }
await up("KeyW"); await waitGame(0.4);
const maxLz = Math.max(...tail.map(c => c.lz));
ok(maxLz <= -1.65 - 1.5 + 0.02 && !tail.some(c => c.on), `ramp up, it stops at the tail (nose at ${(maxLz + 1.5).toFixed(2)}, tail -1.65), never climbs on`);

// ---- 9. the ramp won't come up under a sled standing on it
await ev(`TLXV.haul().ramp = 1; true`); await waitGame(1.5);
await sledAt(0, -2.4, 0, true); await waitGame(0.5);
s = await S(); ok(s.ramp === true, `the sled stands on the ramp (lz ${s.lz.toFixed(2)}, ${s.up.toFixed(2)} m up)`);
await ev(`(() => { const h = TLXV.haul(), t = TLXV.haulTail(h); FOOT.on = true; FOOT.x = t[0] - Math.sin(h.yaw) * 0.5 + Math.cos(h.yaw) * 1.2; FOOT.z = t[1] - Math.cos(h.yaw) * 0.5 - Math.sin(h.yaw) * 1.2; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await waitGame(0.6);
s = await S(); ok(s.use === null && /sled is on the ramp/.test(s.hint), `at the tail with the sled on the ramp: "${s.hint}" (use ${s.use})`);

// ---- 10. a 2.6a-era save (trailer with no strap field) and a junk strap both load
await ev(`crashCancel(); FOOT.on = false; true`);
const sv = await J(`(() => { save(); const o = JSON.parse(localStorage.getItem("tracklayer.save.v2")); return o; })()`);
const sys = sv.x && sv.x.sys && sv.x.sys.vehicles; ok(!!sys, "the save carries the vehicles system");
if (sys) { sys.s.haul.strap = { x: "a", z: NaN }; }
await reload(sv); await sleep(1500); await waitGame(0.6);
s = await J(`({ strap: TLXV.haul() ? TLXV.haul().strap : "gone", fin: [P.x, P.y, P.z].every(Number.isFinite) })`);
ok(s.strap === null && s.fin, `a junk strap field loads as unstrapped (${JSON.stringify(s)})`);
await camOff();
await done(fails ? 1 : 0);

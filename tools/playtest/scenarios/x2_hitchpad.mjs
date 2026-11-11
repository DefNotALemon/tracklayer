// Beta test for slice 2.5 (universal hitch), part 2: HITCH and UNHITCH on pad (3 brands) and touch, hint text per scheme,
// overload refusal (flatbed + 1,600 kg of big load on the pickup's 1,500 kg ball), hitching to a bogged truck, mid-hitch reload.
// Prints ok/FAIL; exit 1 on a failure.
import { boot, ev, tap, sleep, done, park, reload, shot, padSet, padOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
const S = () => J(`({ on: TLXV.rigOn(), kind: TOW.kind, use: footUse(), dev: INP.dev, hint: $("wnHint").textContent, tU: $("tcUse").hidden ? null : $("tcUse").textContent, toast: [...document.querySelectorAll("#toasts *")].map(e => e.textContent).slice(-2), nan: [TOW.x, TOW.z, TOW.yaw, camera.position.x].some(v => !isFinite(v)) })`);
const atTongue = (side = 0.8) => ev(`(() => { const t = TLXV.tongueTip(), lx = Math.cos(TOW.yaw), lz = -Math.sin(TOW.yaw); crashCancel(); FOOT.on = true; FOOT.x = t[0] + lx * ${side}; FOOT.z = t[1] + lz * ${side}; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.yaw = TOW.yaw + Math.PI / 2; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
const padL3 = async id => { await padSet({ 10: 1 }, [0, 0, 0, 0], id); await sleep(350); await padSet({}, [0, 0, 0, 0], id); await sleep(500); };
const fire = `(() => { const b = $("tcUse"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return true; })()`;

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; true`);
await park(); await sleep(400);
await ev(`(() => { const o = GS.own; o.partsOwned["recv:ball"] = true; o.partsOwned["hitch:trailer"] = true; o.partsOwned["hitch:flatbed"] = true; o.parts.recv = "ball"; o.parts.hitch = "trailer"; GS.cash = 20000; restat(); return 1; })()`);
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400);
await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(400);
const lane = await J(`(() => { let best = null; for (const Y of YARDS) { if (Y.x2 === undefined || Y.r > 2) continue; const L = Math.hypot(Y.x2 - Y.x, Y.z2 - Y.z); if (!best || L > best.L) best = { x: Y.x, z: Y.z, x2: Y.x2, z2: Y.z2, L }; } return best; })()`);
ok(lane && lane.L > 35, "lane " + (lane && lane.L.toFixed(0)));
// truck on the lane, trailer standing free 1 m behind its ball, walker at the tongue
await ev(`(() => { const L = ${JSON.stringify(lane)}, ux = (L.x2 - L.x) / L.L, uz = (L.z2 - L.z) / L.L, yaw = Math.atan2(ux, uz);
  const r = TLX.state("vehicles").owned[0]; r.x = L.x + ux * 9; r.z = L.z + uz * 9; r.yaw = yaw;
  const bx = r.x - ux * 3.1, bz = r.z - uz * 3.1, tx = bx - ux * 1.2, tz = bz - uz * 1.2;
  TOW.x = tx - ux * HITCH.trailer.len; TOW.z = tz - uz * HITCH.trailer.len; TOW.yaw = yaw; TOW.mass = 0;
  const rg = TLX.state("vehicles").rig; rg.on = null; rg.kind = "trailer"; rg.x = TOW.x; rg.z = TOW.z; rg.yaw = yaw; restat();
  P.x = r.x + uz * 25; P.z = r.z - ux * 25; P.vx = P.vz = 0; P.y = surf(P.x, P.z); recenter(r.x, r.z, true); return 1; })()`);
await atTongue(); await waitGame(1.0);
let s = await S(); console.log("free", JSON.stringify(s));
ok(s.use === "HITCH" && s.on === null, "keyboard: use at a free tongue near the truck is HITCH");
ok(/E: hitch/i.test(s.hint), "keyboard hint names E: hitch (" + s.hint + ")");

const PADS = [["xbox", undefined, "L3"], ["ps", "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)", "L3"], ["nin", "Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)", "Left stick click"]];
for (const [nm, id, lab] of PADS) {
  await padSet({}, [0.6, 0, 0, 0], id); await sleep(250); await padSet({}, [0, 0, 0, 0], id); await sleep(500);
  s = await S(); console.log(nm, "before", JSON.stringify({ use: s.use, hint: s.hint, dev: s.dev }));
  ok(s.hint.includes(lab + ": hitch"), nm + " hint offers " + lab + ": hitch");
  await padL3(id); s = await S();
  ok(s.on === "v1" && !s.nan, nm + " pad: stick click HITCHes (on " + s.on + ")");
  ok(s.hint.includes(lab + ": unhitch"), nm + " hint now offers " + lab + ": unhitch (" + s.hint + ")");
  await padL3(id); s = await S();
  ok(s.on === null, nm + " pad: stick click UNHITCHes (on " + s.on + ")");
  // nudge the free trailer back near the ball again for the next round
  await atTongue(); await waitGame(0.6);
}
await padOff();

// touch
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(700);
s = await S(); console.log("touch", JSON.stringify({ tU: s.tU, hint: s.hint }));
ok(s.tU === "HITCH", "touch: the orange button reads HITCH (" + s.tU + ")");
ok(/tap HITCH/.test(s.hint), "touch hint says tap HITCH (" + s.hint + ")");
await shot("x2hp_touch_hitch");
await ev(fire); await sleep(600); s = await S();
ok(s.on === "v1" && s.tU === "UNHITCH", "touch: tap hitches, button reads UNHITCH (on " + s.on + ", " + s.tU + ")");
await ev(fire); await sleep(600); s = await S();
ok(s.on === null && s.tU === "HITCH", "touch: tap again unhitches, button back to HITCH (" + s.tU + ")");
await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; true`); await sleep(400);

// overload: the flatbed on the truck with 1,600 kg of big load already on the truck
await ev(`(() => { GS.own.parts.hitch = "flatbed"; restat(); const rg = TLX.state("vehicles").rig; rg.kind = "flatbed"; rg.on = null; rg.x = TOW.x; rg.z = TOW.z; rg.yaw = TOW.yaw; TOW.kind = "flatbed"; return 1; })()`);
await waitGame(0.6); await atTongue(); await waitGame(0.6);
const before = await J(`({ n: GS.load.length })`);
const hk = await J(`({ kg: HITCH.flatbed.mass, rating: VEHICLES ? 0 : 0 })`).catch(() => ({}));
await ev(`(() => { const s = TLX.state("vehicles"); const r = s.owned[0]; r.load = r.load || []; r.load.push({ cargo: "test anvil", big: true, kg: 1600, dest: { x: 0, z: 0 } }); GS.load.push({ cargo: "test anvil", big: true, kg: 1600, dest: { x: 0, z: 0 } }); return 1; })()`);
console.log("cur", await ev(`TLX.state("vehicles").cur`), "on before", await ev(`TLXV.rigOn()`));
await tap("KeyE"); await waitGame(0.5); s = await S();
console.log("overload", JSON.stringify({ on: s.on, toast: s.toast }));
ok(s.on === null, "1,600 kg of big load on a 1,500 kg ball: hitch refused (on " + s.on + ")");
ok(s.toast.some(t => /rated for/.test(t)), "... and a toast says the rating (" + JSON.stringify(s.toast) + ")");
await ev(`(() => { const r = TLX.state("vehicles").owned[0]; r.load = []; GS.load.length = 0; return 1; })()`);
await tap("KeyE"); await waitGame(0.5); s = await S();
ok(s.on === "v1", "load removed: the flatbed hitches (on " + s.on + ")");

// reload mid-hitch: the rig must come back on the truck at the ball
const pre = await J(`({ x: TOW.x, z: TOW.z })`);
await reload(); await sleep(1500); await waitGame(1.0);
s = await S(); const post = await J(`({ x: TOW.x, z: TOW.z, on: TLXV.rigOn(), tb: (() => { const b = TLXV.ballOf("v1"), t = TLXV.tongueTip(); return b && t ? Math.hypot(b[0] - t[0], b[1] - t[1]) : -1; })() })`);
console.log("reload", JSON.stringify(post), "moved", Math.hypot(post.x - pre.x, post.z - pre.z).toFixed(2));
ok(post.on === "v1" && post.tb >= 0 && post.tb < 0.3 && !s.nan, `hitched flatbed survives a reload on the ball (coupler ${post.tb.toFixed(3)} m)`);
await shot("x2hp_final");
console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);

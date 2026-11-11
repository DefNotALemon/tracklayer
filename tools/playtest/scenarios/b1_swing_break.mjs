// Beta break test for the swing (v173): real-time input, out-of-order and hostile use. Prints ok/FAIL, exit 1 on a FAIL.
// Tries: Q mash mid-swing, keyboard, pad (LB), touch (GET ON), night, reload mid-mount, skis on, tablet/garage opened mid-swing,
// far-side mount, mount on a slope, mount then immediately ride away, every sled.
// Run: tools/playtest/run.sh tools/playtest/scenarios/b1_swing_break.mjs
import { boot, ev, send, tap, sleep, done, park, padSet, padOff, reload, errors } from "../lib.mjs";
const fails = []; const ok = (c, m) => { console.log((c ? "  ok   " : "  FAIL ") + m); if (!c) fails.push(m); };
const S = async () => JSON.parse(await ev(`JSON.stringify({ foot: FOOT.on, mnt: MNT.on, dmt: DMT.on, sim: SWG.sim, walk: SWG.walk, cr: CRASH.on, vis: FOOT.g ? FOOT.g.visible : null, rider: V.rider.visible,
  nan: [P.x, P.y, P.z, FOOT.x, FOOT.y, FOOT.z, camera.position.x, camera.position.y, camera.quaternion.x].some(v => !Number.isFinite(v)), fd: Math.hypot(FOOT.x - P.x, FOOT.z - P.z), roll: SWG.roll, dip: SWG.dip, gc: gameClock, hint: (document.getElementById('wnHint') || {}).textContent || '' })`));
const settle = async (cond, cap = 12000) => { const t0 = Date.now(); while (Date.now() - t0 < cap) { const s = await S(); if (cond(s)) return s; await sleep(150); } return await S(); };
const place = (lx, lz) => ev(`(() => { crashCancel(); MNT.on = DMT.on = false; SWG.sim = SWG.walk = false; FOOT.on = true; FOOT.ski = false;
  const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw), sx = Math.cos(P.yaw), sz = -Math.sin(P.yaw); FOOT.x = P.x + sx * ${lx} + fx * ${lz}; FOOT.z = P.z + sz * ${lx} + fz * ${lz}; FOOT.y = walkFloor(FOOT.x, FOOT.z); FOOT.yaw = P.yaw + 1; FOOT.sp = 0; P.vx = P.vz = 0; return true; })()`);
const settled = s => !s.mnt && !s.dmt && !s.sim && !s.walk;
const clean = (s, tag) => { ok(!s.nan, tag + ": no NaN in sled/walker/camera"); ok(settled(s), tag + ": swing flags all cleared (mnt " + s.mnt + " dmt " + s.dmt + " sim " + s.sim + " walk " + s.walk + ")");
  ok(Math.abs(s.roll) < 0.02 && Math.abs(s.dip) < 0.02, tag + ": sled roll/dip settled (" + s.roll.toFixed(3) + "/" + s.dip.toFixed(3) + ")");
  ok(s.foot ? s.vis !== false : s.rider, tag + ": exactly the right figure shown (foot " + s.foot + " walker " + s.vis + " rider " + s.rider + ")"); };
await boot(); await ev("tutSkip(); GS.hour = 12; WX.at = () => 0; GS.storm = 0; true"); await park(); await sleep(1500);

console.log("1 keyboard on/off, day");
await place(2.2, 0.3); await tap("KeyQ"); let s = await settle(x => !x.foot && settled(x)); ok(!s.foot, "keyboard Q mounts"); clean(s, "kbd on");
await tap("KeyQ"); s = await settle(x => x.foot && settled(x)); ok(s.foot, "keyboard Q dismounts"); clean(s, "kbd off");

console.log("2 Q mash mid-swing");
await place(2.2, 0.3); for (let i = 0; i < 12; i++) { await tap("KeyQ", 30); await sleep(120); } await sleep(6000); s = await settle(settled); clean(s, "mash on"); console.log("   ended foot=" + s.foot);
for (let i = 0; i < 12; i++) { await tap("KeyQ", 30); await sleep(90); } await sleep(6000); s = await settle(settled); clean(s, "mash 2");
await ev("DMT.on = false; true");

console.log("3 Q on foot far out and at 3.5 m");
await place(2.2, 5); await tap("KeyQ"); await sleep(400); s = await S(); ok(!s.mnt, "6 m out: Q does nothing but toast");
await place(3.3, 0); await tap("KeyQ"); s = await settle(x => !x.foot && settled(x)); ok(!s.foot, "3.3 m out: walks in and mounts"); clean(s, "3.3 m");

console.log("4 dismount while still rolling / then ride off at once");
await ev("P.vx = Math.sin(P.yaw) * 6; P.vz = Math.cos(P.yaw) * 6; true"); await tap("KeyQ"); await sleep(500); s = await S(); ok(!s.dmt && !s.foot, "Q at 6 m/s is refused (stays on)");
await ev("P.vx = P.vz = 0; true"); await tap("KeyQ"); await sleep(300); await send("Input.dispatchKeyEvent", { type: "keyDown", code: "KeyW", key: "w", windowsVirtualKeyCode: 87 }); await sleep(3500); await send("Input.dispatchKeyEvent", { type: "keyUp", code: "KeyW", key: "w", windowsVirtualKeyCode: 87 });
s = await settle(settled); clean(s, "off then W held"); 

console.log("5 tablet / garage opened mid-swing");
await ev("FOOT.on = false; MNT.on = DMT.on = false; SWG.sim = SWG.walk = false; true"); await sleep(300); await tap("KeyQ"); await sleep(500); await ev("TABLET.toggle(true, 'map'); true"); await sleep(4000); await ev("TABLET.toggle(false); true"); s = await settle(settled); clean(s, "tablet mid-dismount");
await place(2.2, 0.3); await tap("KeyQ"); await sleep(600); await ev("GS.garageOpen = true; true"); await sleep(3000); await ev("GS.garageOpen = false; true"); s = await settle(settled, 15000); clean(s, "garage flag mid-mount");

console.log("6 skis on, and from the right side");
await ev("GS.own.xc = GS.own.xc || { have: true }; true");
await place(-2.2, 0.2); await ev("FOOT.ski = !!xcOwn(); true"); await tap("KeyQ"); s = await settle(x => !x.foot && settled(x)); clean(s, "right side (skis " + await ev("FOOT.ski") + ")");

console.log("7 every sled, night");
await ev("GS.hour = 34; true");
const ids = JSON.parse(await ev("JSON.stringify(SLEDS.map(s => s.id))"));
for (const id of ids) { await ev(`GS.own.sled = ${JSON.stringify(id)}; restat(); true`); await sleep(300); await park(); await sleep(500);
  await ev("crashCancel(); FOOT.on = false; MNT.on = DMT.on = false; SWG.sim = SWG.walk = false; true"); await tap("KeyQ"); let a = await settle(x => x.foot && settled(x), 8000); await tap("KeyQ"); let b = await settle(x => !x.foot && settled(x) && x.fd < 9, 8000);
  ok(a.foot && !b.foot && !a.nan && !b.nan, `${id}: off then on at night (${a.foot} ${b.foot})`); }

console.log("8 pad (LB) and touch (GET ON)");
await ev("GS.hour = 12; GS.own.sled = SLEDS[0].id; restat(); true"); await park(); await sleep(500); await ev("crashCancel(); FOOT.on = false; true");
await padSet({ 4: 1 }); await sleep(150); await padSet(); await sleep(300); s = await settle(x => x.foot && settled(x), 8000); ok(s.foot, "LB dismounts"); 
ok(/LB/.test(await ev("btn('mount')")), "pad prompt reads LB: " + await ev("btn('mount')")); console.log("   hint:", (await S()).hint);
await padSet({ 4: 1 }); await sleep(150); await padSet(); s = await settle(x => !x.foot && settled(x), 8000); ok(!s.foot, "LB mounts"); await padOff();
await send("Emulation.setTouchEmulationEnabled", { enabled: true }); await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 640, y: 200 }] }); await sleep(100); await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await sleep(400);
await ev("SET.touch = 'on'; setTouchUI(); true"); await sleep(300);
console.log("   touch mount label:", await ev("btn('mount')"), "/", await ev("btn('dismount')"));
const press = id => ev(`(() => { const e = document.getElementById(${JSON.stringify(id)}) || document.querySelector('[data-act=${id}]'); if (!e) return 'none'; e.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 5 })); e.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 5 })); return 'ok'; })()`);
const btnIds = await ev(`JSON.stringify([...document.querySelectorAll('button,div')].filter(e => /GET (ON|OFF)/i.test(e.textContent) && e.children.length < 2 && e.id).map(e => e.id + ':' + getComputedStyle(e).display))`); console.log("   touch buttons:", btnIds);
await send("Emulation.setTouchEmulationEnabled", { enabled: false });

console.log("9 reload mid-mount and mid-dismount");
await place(2.2, 0.3); await tap("KeyQ"); await sleep(900); s = await S(); console.log("   before reload: mnt", s.mnt, "sim", s.sim);
await reload(); await ev("tutSkip(); true"); await sleep(1200); s = await S(); clean(s, "after reload mid-mount"); console.log("   foot after reload:", s.foot);
await ev("crashCancel(); true"); if (!s.foot) { await tap("KeyQ"); await sleep(300); await sleep(300); await ev("true"); const t = await settle(x => x.dmt === false && !x.mnt, 6000); await sleep(1500); const u = await S(); await tap("KeyQ"); await sleep(700); await reload(); await ev("tutSkip(); true"); await sleep(1200); const w = await S(); clean(w, "after reload mid-dismount"); console.log("   foot:", w.foot, "fd", w.fd.toFixed(2)); }
else { const f = await S(); ok(f.fd < 400, "on foot after reload, near sled? fd " + f.fd.toFixed(1)); await tap("KeyQ"); const t = await settle(x => !x.foot && settled(x), 9000); clean(t, "mount after reload"); }

console.log(errors.length ? "page errors:\n" + errors.join("\n") : "page errors: none");
console.log(fails.length ? fails.length + " FAILED" : "ALL OK");
await done(fails.length ? 1 : 0);

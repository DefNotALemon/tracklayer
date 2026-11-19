// Beta fix 0305 #1: a plow truck stopped beside a lake. The hint offered "drop the blade", the press went ice fishing
// instead (the game's use control is fishing's within 40 m of a lake), the driver stood on the ice with a rod and the
// truck "would not move". Now the blade claims the control while it has work (TLXV.addUse wants -> VEH.cur.useWants):
//  A  on the shore in 25 cm of snow, keyboard: the fishing context IS there, the hint and the press are the blade's,
//     the truck then pulls away with it down, a second press lifts it; nobody ever goes fishing
//  B  the same on a DualSense (L3) and on touch (the pill reads BLADE DOWN, not FISH)
//  C  standing ON the lake ice with the blade up: no drop offered, the hint and the press are fishing's (as before)
//  D  on the ice with the blade DOWN: the press lifts it; it never traps the blade down
//  E  the sled and a pickup with no blade by the lake: the press still goes fishing (unchanged)
// Exit 1 on a failure. Run: tools/playtest/run.sh tools/playtest/scenarios/x4_bladelake.mjs [outdir]
import { boot, ev, send, sleep, shot, done, down, up, tap, padSet, padOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const PS = "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)";
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 90000; GS.lic = GS.lic || {}; GS.lic.freight = true; WX.at = () => 0; GS.storm = 0; GS.hour = 12; TLX.setOn("traffic", false); TLX.setOn("police", false); true`;
const FIELD = `(() => { if (!window.__F) { const fb0 = freshBase; window.__F = []; freshBase = (ix, iz) => { const F = window.__F, x = ix * CELL - HALF, z = iz * CELL - HALF; for (let i = F.length - 1; i >= 0; i--) { const q = F[i]; if (x >= q[0] && x <= q[1] && z >= q[2] && z <= q[3]) return q[4]; } return fb0(ix, iz); }; }
  window.__field = (x0, x1, z0, z1, dep) => { window.__F.push([x0 - 0.01, x1 + 0.01, z0 - 0.01, z1 + 0.01, dep]); for (let iz = Math.ceil((z0 + HALF) / CELL); iz <= Math.floor((z1 + HALF) / CELL); iz++) for (let ix = Math.ceil((x0 + HALF) / CELL); ix <= Math.floor((x1 + HALF) / CELL); ix++) {
    const c = getChunk(ix >> 5, iz >> 5), k = (iz & 31) * CH + (ix & 31), d0 = c.d[k]; c.f[k] = dep; c.d[k] = dep; if (c.g) c.g[k] = 0; writeCell(ix, iz, d0, dep, dep); } return true; }; return true; })()`;
await boot(); await ev(SETUP); await sleep(600);
await ev(`TLXV.buy("plowtruck"); true`); await sleep(600);
const u = await ev(`TLXV.state().owned[0].uid`); const U = JSON.stringify(u);
await ev(`TLXV.swapTo(${U}); FOOT.on = false; true`); await sleep(700);
// a shore spot: off the ice, 8-14 m from it, flat, clear, 45 m of flat clear ground ahead along the shore; and a spot out on the ice
const sp = await J(`(() => { const bad = (x, z) => isSea(x, z) || isWater(x, z) || bioAt(x, z) === 1 || obNear(x, z, 9) || slopeAt(x, z, 8) > 0.05 || yardAt(x, z) > 0.02;
  for (const L of LAKES) for (let a = 0; a < 6.28; a += 0.13) { const cx = Math.cos(a), cz = Math.sin(a); let r = L.r * 0.4; if (bioAt(L.x + cx * r, L.z + cz * r) !== 1) continue;
    while (r < L.r * 2.2 && bioAt(L.x + cx * r, L.z + cz * r) === 1) r += 2; r += 9;
    const x = L.x + cx * r, z = L.z + cz * r, tx = -cz, tz = cx; let no = false;
    for (let k = -8; k <= 45 && !no; k += 4) for (const s of [-5, 0, 5]) if (bad(x + tx * k + cx * s, z + tz * k + cz * s)) { no = true; break; }
    if (no) continue;
    const ir = L.r * 0.4, ixx = L.x + cx * ir, izz = L.z + cz * ir; let iceOk = true; for (let k = -12; k <= 12; k += 4) if (bioAt(ixx + tx * k, izz + tz * k) !== 1 || isWater(ixx + tx * k, izz + tz * k) || obNear(ixx + tx * k, izz + tz * k, 9)) iceOk = false;
    if (!iceOk) continue;
    return { x, z, yaw: Math.atan2(tx, tz), ix: ixx, iz: izz }; } return null; })()`);
ok(!!sp, "a shore spot beside a lake, and a spot out on its ice " + JSON.stringify(sp)); if (!sp) await done(1);
await ev(FIELD); await ev(`__F.length = 0; __field(${sp.x - 60}, ${sp.x + 60}, ${sp.z - 60}, ${sp.z + 60}, 0.25); __field(${sp.ix - 20}, ${sp.ix + 20}, ${sp.iz - 20}, ${sp.iz + 20}, 0.25); true`);
const place = (x, z, yaw, blade = false) => ev(`(() => { if (FISH.on) FISH.abort(); __F.length = 0; __field(${sp.x - 60}, ${sp.x + 60}, ${sp.z - 60}, ${sp.z + 60}, 0.25); __field(${sp.ix - 20}, ${sp.ix + 20}, ${sp.iz - 20}, ${sp.iz + 20}, 0.25); const B = TLXPL.rt(TLXV.state().cur); if (B) { B.down = ${blade}; B.hold = null; B.grit = false; B.k = ${blade ? 1 : 0}; } BOG.on = false; BOG.acc = 0; crashCancel(); FOOT.on = false; P.x = ${x}; P.z = ${z}; P.yaw = ${yaw}; P.y = surf(P.x, P.z); P.vx = P.vz = 0; recenter(P.x, P.z, true); return true; })()`);
const S = () => J(`(() => { const B = VEH.cur && TLXPL.rt(TLXV.state().cur); return { down: B ? B.down : null, fish: !!FISH.on, flbl: FISH.ctxLabel(), wants: !!(VEH.cur && VEH.cur.useWants && VEH.cur.useWants()), hint: WN.hint || "", pill: $("tcE").hidden ? null : $("tcE").textContent, v: +Math.hypot(P.vx, P.vz).toFixed(2), d: +Math.hypot(P.x - ${sp.x}, P.z - ${sp.z}).toFixed(2), ice: bioAt(P.x, P.z) === 1, dev: INP.dev, thr: input.thr }; })()`);
const gclock = () => ev("gameClock"), waitGame = async s => { const t0 = await gclock(); while (await gclock() - t0 < s) await sleep(60); };

// ---- A: the shore, keyboard
await place(sp.x, sp.z, sp.yaw); await waitGame(1.2);
let s = await S(); console.log("  A rest", JSON.stringify(s));
ok(s.flbl === "FISH" && !s.ice, "A: the truck stands off the ice inside fishing's reach (fishing would take the press: " + s.flbl + ")");
ok(s.wants && /drop the blade/.test(s.hint) && !/fish/i.test(s.hint), "A: the hint offers the blade and nothing about fishing: " + s.hint);
await shot("a_shore_hint");
await tap("KeyE", 120); await waitGame(1); s = await S(); console.log("  A after E", JSON.stringify(s));
ok(s.down === true && !s.fish, "A: the press drops the blade, nobody goes fishing");
ok(/BLADE DOWN/.test(s.hint), "A: the hint is the blade's: " + s.hint.slice(0, 80));
await down("KeyW"); await waitGame(7); s = await S(); await up("KeyW"); console.log("  A after W", JSON.stringify(s));
ok(s.thr === 1 && s.d > 3 && !s.fish, "A: with the blade down the truck pulls away through 25 cm: " + s.d + " m in 7 s, " + s.v + " m/s");
await shot("a_shore_cutting");
await ev(`P.vx = P.vz = 0; true`); await waitGame(0.5);
await tap("KeyE", 120); await waitGame(1); s = await S();
ok(s.down === false && !s.fish, "A: a second press, stopped by the lake with the blade down, lifts it (no fishing)");

// ---- B: a DualSense, then touch
await place(sp.x, sp.z, sp.yaw); await padSet({ 7: 1 }, [0, 0, 0, 0], PS); await sleep(120); await padSet({}, [0, 0, 0, 0], PS); await ev(`P.vx = P.vz = 0; true`); await waitGame(1);
s = await S(); ok(s.dev === "pad" && s.wants && s.flbl === "FISH" && /drop the blade/.test(s.hint) && !/\bE:/.test(s.hint), "B pad: the hint names the pad's control: " + s.hint);
await padSet({ 10: 1 }, [0, 0, 0, 0], PS); await sleep(150); await padSet({}, [0, 0, 0, 0], PS); await waitGame(1); s = await S();
ok(s.down === true && !s.fish, "B pad: L3 drops the blade, nobody goes fishing");
await padSet({ 10: 1 }, [0, 0, 0, 0], PS); await sleep(150); await padSet({}, [0, 0, 0, 0], PS); await waitGame(1); s = await S();
ok(s.down === false && !s.fish, "B pad: L3 again lifts it");
await padOff(); await sleep(200);
await place(sp.x, sp.z, sp.yaw);
await send("Emulation.setTouchEmulationEnabled", { enabled: true });
await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 640, y: 200 }] }); await sleep(100);
await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await sleep(200);
await ev(`SET.touch = "on"; setTouchUI(); true`); await waitGame(1);
const press = () => ev(`$("tcE").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 5, pointerType: "touch" })); true`);
const release = () => ev(`$("tcE").dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 5, pointerType: "touch" })); true`);
s = await S(); ok(s.dev === "touch" && s.pill === "BLADE DOWN" && /tap BLADE DOWN/.test(s.hint), "B touch: the pill reads BLADE DOWN, not FISH (" + s.pill + "), hint: " + s.hint);
await shot("b_touch_pill");
await press(); await sleep(180); await release(); await waitGame(1); s = await S();
ok(s.down === true && !s.fish && s.pill === "BLADE UP", "B touch: a tap drops the blade (pill " + s.pill + "), nobody goes fishing");
await press(); await sleep(180); await release(); await waitGame(1); s = await S();
ok(s.down === false && !s.fish && s.pill === "BLADE DOWN", "B touch: a tap lifts it (pill " + s.pill + ")");
// on the ice, still on touch: the pill is fishing's
await place(sp.ix, sp.iz, sp.yaw); await waitGame(1.2); s = await S();
ok(s.ice && s.pill === "FISH" && !s.wants, "C touch: out on the ice with the blade up the pill reads FISH (" + s.pill + ")");
await ev(`SET.touch = "auto"; setTouchUI(); true`); await send("Emulation.setTouchEmulationEnabled", { enabled: false });
await tap("KeyH"); await sleep(150); await tap("KeyH"); await sleep(300);

// ---- C: on the ice, blade up, keyboard: fishing's, as before
await place(sp.ix, sp.iz, sp.yaw); await waitGame(1.2); s = await S(); console.log("  C rest", JSON.stringify(s));
ok(s.ice && !s.wants && s.flbl === "FISH", "C: on the lake ice the blade claims nothing");
ok(/fish/i.test(s.hint) && !/drop the blade/.test(s.hint), "C: the hint is fishing's, no blade drop offered: " + s.hint);
await shot("c_ice_hint");
await tap("KeyE", 120); await sleep(900); s = await S();
ok(s.fish && s.down === false, "C: the press goes fishing, the blade stays up");
await ev(`FISH.abort(); true`); await sleep(500); s = await S(); ok(!s.fish, "C: packed up again");

// ---- D: on the ice with the blade down: the press lifts it
await place(sp.ix, sp.iz, sp.yaw, true); await waitGame(1.2); s = await S();
ok(s.down === true && s.wants && /BLADE DOWN/.test(s.hint), "D: blade down on the ice, the control is the blade's: " + s.hint.slice(0, 70));
await tap("KeyE", 120); await waitGame(1); s = await S(); console.log("  D after E", JSON.stringify(s));
ok(s.down === false && !s.fish, "D: the press lifts it, nobody goes fishing");

// ---- E: no blade, no claim: a pickup, then the sled, by the lake
await ev(`TLXV.buy("pickup"); true`); await sleep(600);
const u2 = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`);
await ev(`TLXV.swapTo(${JSON.stringify(u2)}); FOOT.on = false; true`); await sleep(700);
await place(sp.x, sp.z, sp.yaw); await waitGame(1.2); s = await S(); console.log("  E pickup", JSON.stringify(s));
ok(!s.wants && s.flbl === "FISH" && /fish/i.test(s.hint), "E: a pickup with no blade by the lake: the hint is fishing's: " + s.hint);
await padSet({ 7: 1 }, [0, 0, 0, 0], PS); await sleep(120); await padSet({}, [0, 0, 0, 0], PS); await ev(`P.vx = P.vz = 0; true`); await waitGame(1.2);
s = await S(); ok(s.dev === "pad" && /get off and fish/.test(s.hint) && !/^E:/.test(s.hint), "E pad: fishing's hint names the pad's control, not E: " + s.hint.slice(0, 50));
await padOff(); await sleep(200);
await tap("KeyE", 120); await sleep(900); s = await S(); ok(s.fish, "E: its press goes fishing (unchanged)");
await ev(`FISH.abort(); true`); await sleep(500);
await ev(`TLXV.swapTo(null); FOOT.on = false; true`); await sleep(700);
const onSled = await ev(`!VEH.cur`);
if (onSled) {
  await ev(`(() => { crashCancel(); FOOT.on = false; P.x = ${sp.x}; P.z = ${sp.z}; P.yaw = ${sp.yaw}; P.y = surf(P.x, P.z); P.vx = P.vz = 0; recenter(P.x, P.z, true); return true; })()`); await waitGame(1.2);
  const h = await ev(`WN.hint || ""`); await tap("KeyE", 120); await sleep(900);
  ok(/fish/i.test(h) && await ev(`!!FISH.on`), "E: on the sled by the lake the press goes fishing (unchanged): " + h);
  await ev(`FISH.abort(); true`);
} else ok(false, "E: could not get back on the sled (TLXV.swapTo(null))");
await done(fails ? 1 : 0);

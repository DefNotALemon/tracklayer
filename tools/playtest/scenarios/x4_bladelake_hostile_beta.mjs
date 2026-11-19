// Beta 0319: hostile cases for the 0305 #1 lake fix (blade claims the use control): dismount with blade down, gritter, reload with blade down, thin-snow shore, slewing hold by the lake.
import { reload, boot, ev, send, sleep, shot, done, down, up, tap, padSet, padOff } from "../lib.mjs";
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

const gs = async () => { const s = await S(); console.log("   ", JSON.stringify(s)); return s; };
// 1 blade down on shore, Q off: the walker's E near the lake must be fishing's / nothing blade
await place(sp.x, sp.z, sp.yaw); await waitGame(1); await tap("KeyE", 120); await waitGame(1);
let s = await gs(); ok(s.down === true, "1 setup: blade down at the shore");
await tap("KeyQ"); const t0 = Date.now(); while (Date.now() - t0 < 9000 && !(await ev("FOOT.on"))) await sleep(200);
await waitGame(1.5); s = await gs(); const hf = await ev(`WN.hint || ""`); console.log("  foot hint:", hf);
ok(await ev("FOOT.on"), "1: got off beside the lake");
ok(!/blade/i.test(hf), "1: on foot the hint is not the blade's: " + hf);
await tap("KeyE", 120); await sleep(1200); const fo = await ev("!!FISH.on"); console.log("  fish after foot E:", fo);
ok(true, "1 info: foot E by lake with blade left down -> fishing=" + fo); await ev("if (FISH.on) FISH.abort(); true");
// 2 gritter on, stopped by lake
await place(sp.x, sp.z, sp.yaw); await waitGame(1);
await ev(`(() => { const B = TLXPL.rt(TLXV.state().cur); B.grit = true; B.down = false; return true; })()`); await waitGame(1);
s = await gs(); ok(s.wants, "2: gritter running claims the control: wants=" + s.wants + " hint " + s.hint);
await tap("KeyE", 120); await waitGame(1); s = await gs();
ok(!s.fish, "2: E with gritter on beside lake does not go fishing");
ok(s.down === true || await ev(`!TLXPL.rt(TLXV.state().cur).grit`) , "2: E did something blade-side (down=" + s.down + ")");
// 3 reload with blade down at the shore
await place(sp.x, sp.z, sp.yaw); await waitGame(1); await tap("KeyE", 120); await waitGame(1);
await ev("save && save(); true"); await reload(); await sleep(1500);
await ev(SETUP); await sleep(400); s = await gs();
console.log("  after reload: cur", await ev("JSON.stringify(TLXV.state().cur)"), "down", await ev(`(() => { const B = TLXPL.rt(TLXV.state().cur); return B && B.down; })()`));
// 4 shore in thin snow: blade has nothing, fishing keeps the press
await ev(`TLXV.swapTo(${U}); FOOT.on = false; true`); await sleep(700);
await ev(FIELD); await ev(`window.__F && (__F.length = 0); __field(${sp.x - 60}, ${sp.x + 60}, ${sp.z - 60}, ${sp.z + 60}, 0.02); true`);
await ev(`(() => { if (FISH.on) FISH.abort(); const B = TLXPL.rt(TLXV.state().cur); B.down = false; B.hold = null; B.grit = false; crashCancel(); FOOT.on = false; P.x = ${sp.x}; P.z = ${sp.z}; P.yaw = ${sp.yaw}; P.y = surf(P.x, P.z); P.vx = P.vz = 0; recenter(P.x, P.z, true); return true; })()`);
await waitGame(1.5); s = await gs();
ok(!s.wants && /fish/i.test(s.hint), "4: 2 cm of snow at the shore: blade claims nothing, hint fishing's: " + s.hint);
await tap("KeyE", 120); await sleep(900); s = await gs(); ok(s.fish, "4: press goes fishing"); await ev("FISH.abort(); true");
// 5 hold E (slew) by lake with blade down: no fishing started at release
await ev(`__F.length = 0; __field(${sp.x - 60}, ${sp.x + 60}, ${sp.z - 60}, ${sp.z + 60}, 0.25); true`);
await place(sp.x, sp.z, sp.yaw, true); await waitGame(1);
await down("KeyE"); await sleep(1200); await up("KeyE"); await waitGame(1); s = await gs();
ok(!s.fish, "5: a long hold by the lake with blade down does not start fishing");
await shot("end"); await done(fails ? 1 : 0);

// Beta fix 0364 #2/#3: the pump fills the machine, not the rider, and one fill is one tank. Asserts, exit 1 on a failure.
//   A  seated at the pump from 5 L: one "Tank full" naming the litres that went in (65 of a 70 L tank), nothing after it
//   B  get out mid-fill (Q): the truck goes on filling and billing while you stand beside it, the count carries over the
//      door (one "Tank full" for the whole fill, no "Pulled off the pump"), the till is litres x price, and it stops at full
//   C  on foot and short of cash: it stops at what you can pay ("Out of cash"), cash 0 and never under, and a broke
//      machine left at the pump does not write the save every frame
//   D  one fill is one tank: fuel lost from the tank mid-fill closes the count (no toast names more than the tank holds);
//      on foot, walking over to the sled parked at the same pump makes the sled the tank: the truck's count is closed
//      ("Filling stopped", its own litres), the sled fills on its own count
//   E  a pad's LB and the touch pill get you out mid-fill just the same and the fill goes on
//   F  the tutorial's hidden sled takes no fuel while you walk past a pump; walking off with the machine at the pump and
//      back changes nothing; driving off mid-fill still says "Pulled off the pump"
import { boot, ev, tap, sleep, done, padSet, padOff } from "../lib.mjs";
let fails = 0; const failed = []; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) { fails++; failed.push(m); } };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(120); }
async function waitUntil(expr, maxGame = 14) { const t0 = await clock(); while ((await clock()) - t0 < maxGame) { if (await ev(expr)) return (await clock()) - t0; await sleep(100); } return -1; }
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80);
  return 1; })()`);
const litres = m => { const r = /: ([\d.]+) L /.exec(m); return r ? +r[1] : NaN; };
const f1 = v => (+v).toFixed(1);
const beside = () => ev(`(() => { const s = TLX.state("vehicles"), r = s.owned[0]; const cur = s.cur === r.uid, x = cur ? P.x : r.x, z = cur ? P.z : r.z, yaw = cur ? P.yaw : r.yaw; const fx = Math.sin(yaw), fz = Math.cos(yaw);
  crashCancel(); FOOT.on = true; FOOT.x = x + fz * 3 - fx * 0.3; FOOT.z = z - fx * 3 - fz * 0.3; FOOT.yaw = yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
async function board() { if (!(await ev("FOOT.on"))) return true; await beside(); await sleep(900); await tap("KeyQ"); return (await waitUntil(`!MNT.on && !FOOT.on && !!VEH.cur`)) !== -1; }
const getOut = async how => { await how(); const t = await waitUntil("!DMT.on && FOOT.on", 14); return t; };
// the truck at the first station's pump, side on (a pose its hull allows and both doors work from), with f litres and c cash
const atPump = (f, c) => ev(`(() => { const t = STATIONS.find(t => t.x !== undefined); if (FS.spot) fuelEnd("left"); P.x = t.x; P.z = t.z; P.yaw = 1.57; P.y = surf(t.x, t.z); P.vx = P.vz = 0; recenter(t.x, t.z, true); GS.fuel = ${f}; GS.cash = ${c}; return 1; })()`);
const S = () => J(`({ fuel: GS.fuel, cap: GS.cap, cash: GS.cash, fs: !!FS.spot, L: FS.L, foot: FOOT.on, cur: TLX.state("vehicles").cur, rec: TLX.state("vehicles").owned[0].fuel })`);

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.cash = 20000; GS.warmth = 100; garageTab = "trucks"; openGarage(); true`); await sleep(400);
await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(500);
const U = await J(`TLX.state("vehicles").owned[0].uid`);
await ev(`FOOT.on = true; true`);
ok(await board(), "seated in the pickup");
const st = await J(`(() => { const t = STATIONS.find(t => t.x !== undefined); return { name: t.name, price: t.fuelPrice }; })()`);
const cap = await ev("GS.cap");

// ---- A
await atPump(5, 5000); await clearToasts();
{ const t = await waitUntil(`!FS.spot && GS.fuel > GS.cap - 0.1`, 30); await waitGame(3);
  const T = await toasts(), full = T.filter(m => /^Tank full/.test(m));
  ok(t !== -1 && full.length === 1 && Math.abs(litres(full[0]) - (cap - 5)) < 0.6, `A seated: one "Tank full" for ${f1(cap - 5)} L (${JSON.stringify(full)})`);
  ok(!T.some(m => /Pulled off|Filling stopped/.test(m)), "A nothing else said about the pump"); }

// ---- B
await atPump(20, 5000); await clearToasts();
await waitGame(1.5);
{ const a = await S(); ok(a.fs && a.fuel > 22, `B filling in the cab (${f1(a.fuel)} L)`);
  const t = await getOut(() => tap("KeyQ")); ok(t !== -1, `B out by Q mid-fill (${f1(t)} s)`);
  const b = await S(); await waitGame(1.2); const c = await S();
  ok(b.foot && c.fuel > b.fuel + 2 || c.fuel > cap - 0.1, `B the truck goes on filling with you beside it (${f1(b.fuel)} -> ${f1(c.fuel)} L)`);
  const tf = await waitUntil(`!FS.spot && GS.fuel > GS.cap - 0.1`, 30); const d = await S();
  ok(tf !== -1 && d.foot, `B full while on foot (${f1(d.fuel)} of ${cap})`);
  const paid = 5000 - d.cash, want = (cap - 20) * st.price;
  ok(Math.abs(paid - want) < 1.5, `B the till is litres x price (${paid.toFixed(2)} vs ${want.toFixed(2)})`);
  await waitGame(3); const e = await S();
  ok(Math.abs(e.cash - d.cash) < 0.01 && e.fuel <= cap + 1e-6, "B nothing more billed once it is full");
  ok(Math.abs(e.rec - e.fuel) < 0.6 && e.cur === U, `B the truck's own record holds the tank (${f1(e.rec)})`);
  const T = await toasts(), full = T.filter(m => /^Tank full/.test(m));
  ok(full.length === 1 && Math.abs(litres(full[0]) - (cap - 20)) < 0.6, `B one "Tank full" for the whole ${f1(cap - 20)} L, said while on foot (${JSON.stringify(full)})`);
  ok(!T.some(m => /Pulled off|Filling stopped/.test(m)), `B getting out is not "pulled off the pump" (${JSON.stringify(T)})`); }

// ---- C (still on foot beside the truck at the pump)
await clearToasts();
await ev(`(() => { window.__sv = 0; if (!window.__svW) { window.__svW = 1; const o = save; save = function () { window.__sv++; return o.apply(this, arguments); }; } GS.fuel = 5; GS.cash = 10; return 1; })()`);
await waitGame(3);
{ const a = await S(), T = await toasts();
  ok(a.foot && a.cash >= 0 && a.cash < 0.5, `C on foot, cash 10: the till stops at nothing left (${a.cash})`);
  ok(Math.abs(a.fuel - (5 + 10 / st.price)) < 0.5, `C and the tank at what 10 buys (${f1(a.fuel)} L)`);
  ok(T.filter(m => /^Out of cash/.test(m)).length === 1, `C one "Out of cash" (${JSON.stringify(T)})`);
  await ev(`window.__sv = 0; true`); await waitGame(2.5); const n = await ev("window.__sv"), b = await S();
  ok(n <= 2, `C a broke machine at the pump does not write the save every frame (${n} saves in 2.5 s)`);
  ok(Math.abs(b.fuel - a.fuel) < 0.05 && b.cash >= 0, "C and takes nothing more"); }

// ---- D
ok(await board(), "D back in the cab");
await atPump(10, 5000); await clearToasts();
await waitGame(4);
await ev(`GS.fuel = 10; true`);                                   // the tank loses what went in (a leak, a swap, a cheat) with the nozzle still in
await waitUntil(`!FS.spot && GS.fuel > GS.cap - 0.1`, 30); await waitGame(1);
{ const T = await toasts(), nums = T.map(litres).filter(v => !isNaN(v));
  ok(nums.length >= 2 && nums.every(v => v <= cap + 0.05), `D1 fuel lost mid-fill: each count is one tank's worth (${JSON.stringify(nums)} of ${cap})`);
  ok(T.filter(m => /^Tank full/.test(m)).length === 1 && Math.abs(litres(T.filter(m => /^Tank full/.test(m))[0]) - (cap - 10)) < 0.6, `D1 "Tank full" names the last fill only (${JSON.stringify(T)})`); }
// two machines at one pump: the truck filling, the sled parked 8 m along with a near-empty tank, you walk over to the sled
await atPump(8, 5000); await waitGame(0.8);
{ const t = await getOut(() => tap("KeyQ")); ok(t !== -1, "D2 out of the filling truck");
  await clearToasts();
  const pre = await S();
  await ev(`(() => { const s = TLX.state("vehicles"), t = STATIONS.find(t => t.x !== undefined); s.sled.x = t.x - 8; s.sled.z = t.z + 1; s.sled.y = surf(s.sled.x, s.sled.z); s.sled.fuel = 2; s.sled.bog = null;
    FOOT.x = s.sled.x - 1.4; FOOT.z = s.sled.z + 0.6; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; return 1; })()`);
  const tf = await waitUntil(`TLX.state("vehicles").cur == null`, 6); await waitGame(0.5);
  const a = await S(), T1 = await toasts(), stop = T1.filter(m => /^Filling stopped/.test(m));
  ok(tf !== -1 && a.cap !== cap, `D2 beside the sled it is the current machine (tank ${a.cap} L)`);
  ok(stop.length === 1 && litres(stop[0]) <= cap - 8 + 0.05 && litres(stop[0]) > 0.3, `D2 the truck's count is closed with its own litres (${JSON.stringify(stop)})`);
  ok(a.rec > 8.3 && a.rec < cap - 1, `D2 the truck stands part filled (${f1(a.rec)} L)`);
  const t2 = await waitUntil(`!FS.spot && GS.fuel > GS.cap - 0.1`, 30); await waitGame(1);
  const b = await S(), T2 = await toasts(), full = T2.filter(m => /^Tank full/.test(m));
  ok(t2 !== -1 && full.length === 1 && Math.abs(litres(full[0]) - (b.cap - 2)) < 0.6, `D2 the sled fills on its own count (${JSON.stringify(full)} for a ${b.cap} L tank from 2)`);
  ok(Math.abs(b.rec - a.rec) < 0.05, "D2 the truck took nothing while the sled was the tank");
  const paid = pre.cash - b.cash, want = ((a.rec - pre.fuel) + (b.cap - 2)) * st.price;
  ok(Math.abs(paid - want) < 3, `D2 paid for both tanks' litres and no more (${paid.toFixed(2)} vs ${want.toFixed(2)})`); }

// ---- E
ok(await board(), "E back in the cab");
await atPump(10, 5000); await clearToasts(); await waitGame(1);
{ const t = await getOut(async () => { await padSet({ 4: 1 }); await sleep(180); await padSet(); });
  const a = await S(); await waitGame(1.2); const b = await S();
  ok(t !== -1 && b.fuel > a.fuel + 2, `E pad LB: out, and it goes on filling (${f1(a.fuel)} -> ${f1(b.fuel)})`);
  ok(!(await toasts()).some(m => /Pulled off|Filling stopped/.test(m)), "E pad: no word of pulling off"); }
await padOff(); await sleep(300);
ok(await board(), "E in again");
await atPump(10, 5000); await waitGame(1); await clearToasts();   /* atPump closes the count it found open: that toast is the test's */
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(700);
{ const t = await getOut(() => ev(`(() => { const b = $("tcQ"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return 1; })()`));
  const a = await S(); await waitGame(1.2); const b = await S();
  ok(t !== -1 && (b.fuel > a.fuel + 2 || b.fuel > cap - 0.1), `E touch pill: out, and it goes on filling (${f1(a.fuel)} -> ${f1(b.fuel)})`);
  { const T = await toasts(); ok(!T.some(m => /Pulled off|Filling stopped/.test(m)), `E touch: no word of pulling off (${JSON.stringify(T)})`); } }
await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; true`).catch(() => 0);

// ---- F
await waitUntil(`!FS.spot && GS.fuel > GS.cap - 0.1`, 30);
{ // walk 60 m off and back with the truck left at the pump mid-fill: it fills, the toast finds you
  await clearToasts(); await ev(`GS.fuel = 12; GS.cash = 5000; true`); await waitGame(0.6);
  await ev(`(() => { FOOT.x += 60; FOOT.y = surf(FOOT.x, FOOT.z); return 1; })()`);
  const t = await waitUntil(`!FS.spot && GS.fuel > GS.cap - 0.1`, 30); const a = await S(), T = await toasts();
  ok(t !== -1 && a.cur === U && T.filter(m => /^Tank full/.test(m)).length === 1, `F 60 m away the truck still fills and "Tank full" reaches you (${JSON.stringify(T)})`);
  // the tutorial's hidden sled: nothing fills
  const r = await J(`(() => { const st0 = TUT.stage; GS.fuel = 12; TUT.stage = 1; const f0 = GS.fuel; for (let i = 0; i < 40; i++) fuelStep(0.05, 0); const f1 = GS.fuel, fs = !!FS.spot; TUT.stage = st0; GS.fuel = GS.cap; return { f0, f1, fs, hid: st0 !== 1 }; })()`);
  ok(r.f1 === r.f0 && !r.fs, `F while the tutorial hides the sled a walker at the pump fills nothing (${r.f0} -> ${r.f1})`); }
ok(await board(), "F back in the cab");
await atPump(10, 5000); await clearToasts(); await waitGame(1.5);
await ev(`(() => { P.x += 40; P.y = surf(P.x, P.z); recenter(P.x, P.z, true); return 1; })()`); await waitGame(0.6);
{ const T = await toasts(), off = T.filter(m => /^Pulled off the pump/.test(m));
  ok(off.length === 1 && litres(off[0]) < cap - 10 && !(await ev("!!FS.spot")), `F driving off mid-fill is still "Pulled off the pump" (${JSON.stringify(off)})`); }
ok(!(await ev(`[P.x, P.z, GS.fuel, GS.cash, GS.cap].some(v => !isFinite(v))`)), "no NaN");

console.log(fails ? `\n${fails} FAILED:\n  ` + failed.join("\n  ") : "\nALL OK");
await done(fails ? 1 : 0);

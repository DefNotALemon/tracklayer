// Beta pass on the v195 rescue: lake dunking (the `P.wl !== SEA` path), touch CALL HELP press, DualSense/Switch D-pad down,
// reload while the rescue is running, rescue called twice, sled + trailer in a lake.
import { boot, ev, sleep, done, tap, padSet, padOff, shot, reload } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
let fails = 0;
const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const PS = "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)";
const NIN = "Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)";
const openLake = async (x, z) => { await ev(`(() => { meltSeason(); GS.hour += (MELT.dApr + 58) * 24 - CAL.abs(); return 1; })()`); for (let k = 0; k < 40; k++) { await sleep(500); if (await ev(`MELT.kq >= 0.95 && !MELT.sweep && wlvAt(${x}, ${z}) !== null`)) break; } return ev(`JSON.stringify({ kq: MELT.kq, sweep: !!MELT.sweep, wl: wlvAt(${x}, ${z}), season: CAL.season().id })`); };
const dunkAt = (x, z) => ev(`(() => { BOG.on = false; crashCancel(); HELP.dryT = 0; P.x = ${x}; P.z = ${z}; P.yaw = 0; P.vx = P.vz = P.vy = 0; P.y = (wlvAt(${x}, ${z}) ?? surf(${x}, ${z})) - 0.3; recenter(P.x, P.z, true); return 1; })()`);
const toasts = () => ev(`[...document.querySelectorAll("#toasts *")].filter(e => e.children.length === 0).map(e => e.textContent).join(" || ")`);
async function finish() { let t = 0; while ((await ev("HELP.on")) && t < 90) { await waitGame(2); t += 2; } await waitGame(1); return t; }
const state = () => J(`({ wet: P.wet, water: isWater(P.x, P.z), on: HELP.on, called: HELP.called, x: Math.round(P.x), z: Math.round(P.z), slope: +slopeAt(P.x, P.z, 3).toFixed(3), y: +P.y.toFixed(2), cash: GS.cash, wl: P.wl, sea: SEA, warm: Math.round(GS.warmth) })`);

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; GS.cash = 9000; true`); await sleep(600);
const lakes = await J(`LAKES.map((L, i) => ({ i, x: L.x, z: L.z, r: L.r, ok: L.ok, w: isWater(L.x, L.z), sea: isSea(L.x, L.z) }))`);
console.log("lakes:", JSON.stringify(lakes.slice(0, 4)));

// A: lake dunk in the middle of three lakes; touch button press
let n = 0;
for (const L of lakes.filter(l => l.ok).slice(0, 3)) {
  n++;
  await ev(`INP.dev = "touch"; SET.touch = "on"; setTouchUI(); true`);
  const c0 = await ev("GS.cash");
  console.log("opened lake level", await openLake(L.x, L.z));
  await dunkAt(L.x, L.z); await waitGame(2);
  const s0 = await state();
  console.log(`A${n} lake ${L.i} (${L.x},${L.z}) dunk:`, JSON.stringify(s0), "|", (await toasts()).slice(0, 160));
  ok(s0.on && s0.wl !== s0.sea, `A${n}: lake dunking starts (HELP.on ${s0.on}, wl ${s0.wl})`);
  const shown = await ev(`!!document.getElementById("tcF") && !!document.getElementById("tcF").offsetParent`);
  ok(shown, `A${n}: touch CALL HELP button shown`);
  await ev(`(() => { const b = document.getElementById("tcF"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 9, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 9, pointerType: "touch" })); return 1; })()`);
  await sleep(300);
  ok(await ev("HELP.called"), `A${n}: touch press called the rescue`);
  // second call must not double charge
  await tap("KeyP"); await sleep(200);
  await finish();
  const s1 = await state();
  console.log(`A${n} after:`, JSON.stringify(s1), "|", (await toasts()).slice(0, 200));
  ok(!s1.wet && !s1.water && !s1.on, `A${n}: out and dry`);
  ok(c0 - s1.cash === 140, `A${n}: one fee (${c0} -> ${s1.cash})`);
  ok(s1.slope <= 0.2, `A${n}: gentle ground ${s1.slope}`);
  const tx = await toasts();
  if (/fjord/i.test(tx) && !/lake/i.test(tx)) console.log(`   note A${n}: toast says fjord for a lake: ${tx.slice(0, 120)}`);
  if (n === 1) await shot("A1_lake_landed");
  await waitGame(8);
  const s2 = await state(); ok(!s2.wet && !s2.on && Math.hypot(s2.x - s1.x, s2.z - s1.z) < 3, `A${n}: stays dry and put 8 s later`);
}
await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kb"; true`);

// B: pad brands, D-pad down (button 13)
for (const [tag, id] of [["PS", PS], ["Switch", NIN]]) {
  await ev(`GS.cash = 9000; true`);
  await dunkAt(1493, -2822); await waitGame(2);
  await padSet({ 8: 1 }, [0, 0, 0, 0], id); await sleep(200); await padSet({}, [0, 0, 0, 0], id); await sleep(300);
  const hint = await ev(`(document.getElementById("wnHint") && document.getElementById("wnHint").offsetParent ? document.getElementById("wnHint").textContent : "") + " | " + [...document.querySelectorAll("body *")].filter(e => e.children.length === 0 && e.offsetParent && /IN THE WATER/i.test(e.textContent)).map(e => e.textContent).join(" / ")`);
  console.log(`B ${tag} hint:`, hint);
  await padSet({ 13: 1 }, [0, 0, 0, 0], id); await sleep(300); await padSet({}, [0, 0, 0, 0], id); await sleep(300);
  ok(await ev("HELP.called"), `B ${tag}: D-pad down called the rescue`);
  await padOff();
  await finish();
  const s = await state(); ok(!s.wet && !s.on, `B ${tag}: dry after`);
}

// C: reload while the rescue is mid-approach
await ev(`GS.cash = 9000; true`);
await dunkAt(1493, -2822); await waitGame(2); await tap("KeyP"); await waitGame(5);
const c0 = await state(); console.log("C before reload:", JSON.stringify(c0));
await reload();
await ev(`tutSkip(); true`); await sleep(600); await waitGame(3);
const c1 = await state(); console.log("C after reload:", JSON.stringify(c1));
ok(!c1.wet && !c1.water || c1.on, "C: after reload mid-rescue: dry or rescue running");
ok(c0.cash - c1.cash <= 140, `C: not charged twice (${c0.cash} -> ${c1.cash})`);

// D: sled + freight trailer in a lake
await ev(`GS.cash = 9000; (() => { const o = GS.own; o.partsOwned["recv:ball"] = true; o.partsOwned["hitch:trailer"] = true; o.parts.recv = "ball"; o.parts.hitch = "trailer"; restat(); return 1; })()`);
await waitGame(1);
const L = lakes.filter(l => l.ok)[1];
await openLake(L.x, L.z); await dunkAt(L.x, L.z); await waitGame(2); await tap("KeyP"); await finish();
const d = await J(`({ wet: P.wet, rig: TLXV.rigOn(), dist: Math.hypot(P.x - TOW.x, P.z - TOW.z), want: hitchBack(GS.own.parts.rack) + HITCH.trailer.len, tw: isWater(TOW.x, TOW.z), px: Math.round(P.x), pz: Math.round(P.z) })`);
console.log("D:", JSON.stringify(d));
ok(!d.wet && d.rig === "sled" && !d.tw && Math.abs(d.dist - d.want) < 1, "D: trailer hitched, behind the sled, on dry ground");

console.log(fails ? `FAILED ${fails}` : "ALL OK");
await done(fails ? 1 : 0);

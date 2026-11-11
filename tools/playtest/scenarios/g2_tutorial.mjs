// First-ride tutorial: a brand-new save walks from the quay to the garage, collects the sled, climbs on, picks up
// the tutorial package and delivers it. Teleports between steps (walking/driving is covered elsewhere), but every
// step is finished by the real action: T at the garage, the Collect row, Q to mount, stopping at pickup/drop-off.
import { boot, ev, st, tap, hold, shot, sleep, done, click, padSet, padOff } from "../lib.mjs";
await boot();
const S = () => ev(`JSON.stringify({ stage: TUT.stage, a: TUT.a, b: TUT.b, onFoot: FOOT.on, sledVis: sledRoot.visible, near: GS.near && GS.near.id,
  card: $("tut").hidden ? null : $("tuStep").textContent + " | " + $("tuTitle").textContent + " | " + $("tuKeys").textContent,
  job: $("jobTitle").textContent + " / " + $("jobSub").textContent, claims: GS.claims.filter(j => j.tut).length, load: GS.load.filter(j => j.tut).length,
  cash: GS.cash, delivered: GS.delivered, foot: [+FOOT.x.toFixed(1), +FOOT.z.toFixed(1)], P: [+P.x.toFixed(1), +P.z.toFixed(1)],
  garage: [+garageSite.x.toFixed(1), +garageSite.z.toFixed(1)], toasts: [...document.querySelectorAll('.toast')].map(t => t.textContent).slice(-2) })`);
const log = async l => { const s = JSON.parse(await S()); console.log(l, JSON.stringify(s)); return s; };
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("FAIL:", m); } };
let s = await log("00 start");
ok(s.stage === 0 && s.onFoot && !s.sledVis, "fresh game: stage 0, on foot, sled hidden");
await shot("00_start");
console.log("hint shown at start:", await ev(`JSON.stringify([...document.querySelectorAll('#foothint,#hint,.hint')].filter(e=>!e.hidden&&e.offsetParent).map(e=>e.textContent).slice(0,3))`));
for (const [nm, id] of [["xbox", undefined], ["ps", "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)"], ["nin", "Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)"]]) {
  await padSet({ 7: 1 }, [0, 0, 0, 0], id); await sleep(400); await padSet({}, [0, 0, 0, 0], id); await sleep(300);
  console.log("pad", nm, await ev(`$("tuKeys").textContent`));
}
await padOff(); await tap("KeyH"); await sleep(300); console.log("kbm again", await ev(`$("tuKeys").textContent`));
// walk a few seconds toward the garage for real
await hold("KeyW", 2500); s = await log("01 walked");
// mount must be refused
await tap("KeyQ"); await sleep(400); s = await log("02 Q refused"); ok(s.onFoot && s.stage === 0, "mount refused before collection");
// teleport walker to the garage door
await ev(`FOOT.x = garageSite.x + 6; FOOT.z = garageSite.z; FOOT.y = surf(FOOT.x, FOOT.z); recenter(FOOT.x, FOOT.z, true); true`);
await sleep(1200); s = await log("03 at garage"); await shot("01_at_garage");
await tap("KeyT"); await sleep(800); s = await log("04 garage open"); await shot("02_garage");
const rowHas = await ev(`!!document.querySelector("#garage .row.tutRow")`); ok(rowHas && s.stage === 1, "garage open, Collect row");
ok(await ev(`[...document.querySelectorAll("#garage .row")].filter(r => r.textContent.includes(sledDef().name)).length`) === 1, "one starter row");
await ev(`document.querySelector("#garage .row.tutRow").click(); true`);
await sleep(1500); s = await log("05 collected"); ok(s.stage === 2 && s.sledVis, "collected: sled visible"); await shot("03_collected");
// walk to the sled and climb on
await ev(`FOOT.x = P.x + 2; FOOT.z = P.z; FOOT.y = surf(FOOT.x, FOOT.z); true`); await sleep(500);
await tap("KeyQ"); for (let i = 0; i < 40 && await ev("FOOT.on"); i++) await sleep(400); await sleep(400); s = await log("06 mounted");   // the walk to the board and the swing take a few seconds ok(s.stage === 3 && s.claims === 1 && !s.onFoot, "mounted: one tutorial claim"); await shot("04_mounted");
// drive to the pickup: drop the sled 8 m from it and let it stop
const tp = id => ev(`(() => { const s = SITES.find(x => x.id === "${id}"); const x = s.x + 8, z = s.z; P.x = x; P.z = z; P.vx = P.vy = P.vz = 0; P.y = surf(x, z) + 0.3; recenter(x, z, true); camState.init = false; towSnap(); return true; })()`);
await tp(s.a); await sleep(9000); s = await log("07 at pickup"); ok(s.stage === 4 && s.load === 1 && s.claims === 0, "package loaded"); await shot("05_pickup");
await tp(s.b); await sleep(5000); s = await log("08 delivered"); ok(s.stage === 99 && s.delivered === 1 && s.cash > 0 && s.load === 0, "delivered once, tutorial done"); await shot("06_delivered");
// reload persistence: stage survives in the save
const saved = await ev(`JSON.parse(localStorage.getItem("tracklayer.save.v2")).tut`); ok(saved === 99, "stage 99 saved");
// skip path from a restart
await ev(`tutRestart(); true`); await sleep(600); s = await log("09 restarted"); ok(s.stage === 0 && s.onFoot && !s.sledVis, "restart");
await ev(`tutSkip(); true`); await sleep(600); s = await log("10 skipped");
ok(s.stage === 99 && s.sledVis && Math.hypot(s.foot[0] - s.P[0], s.foot[1] - s.P[1]) < 4, "skip: sled beside walker");
console.log(fails ? `${fails} FAILED` : "ALL PASS");
await done(fails ? 1 : 0);

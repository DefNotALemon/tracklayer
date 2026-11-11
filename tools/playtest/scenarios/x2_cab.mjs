// Expansion slice 2.4: the tablet, map, jobs and parcels from the pickup's cab. Asserts, exit 1 on a failure.
//   In the truck: Tab, pad d-pad up and the touch TABLET button open the tablet as the held overlay (the dash glass is on the
//   parked sled, so the camera must not dip to it); first person in the cab keeps the HUD minimap; M opens the Map with a pin on
//   the parked sled; parcels LOAD at the quay and CLAIM elsewhere from the cab (toasts say "in the bed"), claims load when the
//   truck stops at the quay, the Jobs app lists them, and a parcel delivers from the truck. On foot: the chart's YOU arrow is
//   the walker and both vehicles get pins. Back on the sled: the tablet goes back on the dash glass (mode "dash").
// Headless Chrome runs ~0.6x real time: everything is measured by gameClock.
import { boot, ev, tap, sleep, done, park, padSet, padOff, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(150); }
async function waitUntil(expr, maxGame = 12) { const t0 = await clock(); while ((await clock()) - t0 < maxGame) { if (await ev(expr)) return true; await sleep(150); } return false; }
const walkerBeside = (uidExpr, off = 3.0) => ev(`(() => { const s = TLX.state("vehicles"), r = s.owned.find(r => r.uid === ${uidExpr}); const cur = s.cur === r.uid, x = cur ? P.x : r.x, z = cur ? P.z : r.z, yaw = cur ? P.yaw : r.yaw; const fx = Math.sin(yaw), fz = Math.cos(yaw);
  FOOT.on = true; FOOT.x = x + fz * ${off} - fx * 0.3; FOOT.z = z - fx * ${off} - fz * 0.3; FOOT.yaw = yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
// move whatever P is (the truck while seated) to a spot, stopped
const putP = (xe, ze) => ev(`(() => { const x = ${xe}, z = ${ze}; P.x = x; P.z = z; P.y = surf(x, z); P.vx = P.vy = P.vz = 0; BOG.on = false; recenter(x, z, true); camState.init = false; return 1; })()`);
const tabState = () => J(`({ open: TABLET.open, mode: TABLET.mode, e: +TABLET.e.toFixed(2), app: TABLET.app, hidden: $("tab").hidden, camD: +camera.position.distanceTo(new THREE.Vector3(P.x, P.y, P.z)).toFixed(2) })`);
const closeTab = async () => { await ev(`TABLET.close(true); true`); await sleep(300); };

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`(() => { const o = toast; toast = (m, k) => { (window.__T = window.__T || []).push(m); return o(m, k); }; return 1; })()`);   // every toast, queued or shown
await ev(`crashCancel(); FOOT.on = false; true`);
console.log("parked", JSON.stringify(await park()));

// ---- 0. the sled baseline: riding, Tab puts the OS on the dash glass
await sleep(500); await tap("Tab"); await waitGame(0.6);
let s = await tabState();
ok(s.open && s.mode === "dash", `on the sled Tab opens the tablet on the dash glass (mode ${s.mode})`);
await closeTab();

// ---- buy the pickup and get in with Q
await ev(`GS.cash = 5000; P.vx = P.vz = 0; true`); await sleep(400);
const sledPose = await J(`({ x: P.x, z: P.z })`);
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(500);
await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400);
await ev(`closeGarage(); true`); await sleep(300);
await walkerBeside("'v1'", 3.2); await sleep(1200);
await tap("KeyQ"); await sleep(400);
ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 12), "Q gets in the truck");
await sleep(500);

// ---- 1. keyboard: Tab in the cab
await tap("Tab"); await waitGame(0.6);
s = await tabState();
ok(s.open && !s.hidden && s.mode === "overlay" && s.e > 0.9, `keyboard: Tab opens the tablet in the cab as the held overlay (mode ${s.mode}, ease ${s.e})`);
ok(s.camD < 14, `the camera stays with the truck, it doesn't fly to the sled's dash (${s.camD} m from the truck)`);
await shot("x2cab_tab_home");
await tap("Tab"); await waitGame(0.6);
s = await tabState(); ok(!s.open, "Tab again puts it away");

// ---- 2. first person in the cab keeps the HUD minimap
await ev(`camMode = VIEWS.findIndex(v => v.fp); camState.init = false; true`); await waitGame(0.8);
s = await J(`({ fpv: document.body.classList.contains("fpv"), map: getComputedStyle($("mapWrap")).display })`);
ok(!s.fpv && s.map !== "none", `first person in the cab: the HUD minimap stays up (fpv ${s.fpv}, display ${s.map})`);
await tap("Tab"); await waitGame(0.6);
s = await tabState(); ok(s.open && s.mode === "overlay", "first person in the cab: Tab opens the overlay too");
await closeTab();
await ev(`camMode = 0; camState.init = false; true`); await waitGame(0.5);

// ---- 3. M: the Map, with the parked sled pinned
await tap("KeyM"); await waitGame(0.8);
s = await J(`({ app: TABLET.app, open: TABLET.open, me: tabMe(), p: { x: P.x, z: P.z }, pins: tabVehPts() })`);
ok(s.open && s.app === "map", "M opens the Map app from the cab");
ok(Math.hypot(s.me.x - s.p.x, s.me.z - s.p.z) < 0.01, "on the chart YOU is the truck");
ok(s.pins.length === 1 && s.pins[0].kind === "sled" && Math.hypot(s.pins[0].x - sledPose.x, s.pins[0].z - sledPose.z) < 0.5, `the Map pins the parked sled where it was left (${JSON.stringify(s.pins)})`);
await ev(`TABLET.byId.map.zoom = 1; TABLET.render(); true`); await waitGame(0.6);
await shot("x2cab_map");
await closeTab();

// ---- 4. pad: d-pad up opens, B closes
await padSet({ 12: 1 }); await sleep(250); await padSet(); await waitGame(0.6);
s = await tabState(); ok(s.open && s.mode === "overlay", "pad: d-pad up opens the tablet in the cab");
for (let i = 0; i < 3 && await ev("TABLET.open"); i++) { await padSet({ 1: 1 }); await sleep(250); await padSet(); await waitGame(0.4); }   // B backs out of an app, then closes
s = await tabState(); ok(!s.open, "pad: B backs out and puts it away");
await padOff(); await sleep(200);

// ---- 5. touch: the TABLET button
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(600);
const tapB = id => `(() => { const b = $("${id}"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return 1; })()`;
s = await J(`({ vis: $("tcTablet").offsetParent !== null })`);
ok(s.vis, "touch: the TABLET button is on screen in the cab");
await ev(tapB("tcTablet")); await waitGame(0.6);
s = await tabState(); ok(s.open && s.mode === "overlay", "touch: TABLET opens it in the cab");
await shot("x2cab_touch");
await ev(tapB("tcTablet")); await waitGame(0.5);
s = await tabState(); ok(!s.open, "touch: TABLET again puts it away");
await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; true`); await sleep(400);

// ---- 6. parcels from the cab: claim one away from the quay, load one at the quay
await ev(`GS.load = []; GS.claims = []; makeJobs(depot); window.__T = []; true`);
const nj = await ev(`GS.jobs.length`);
console.log("jobs on the board", nj);
ok(nj >= 2, `the board has work (${nj} parcels)`);
await putP("depot.x + 90", "depot.z + 90"); await waitGame(0.6);
const pickBtn = lbl => ev(`(() => { const b = [...document.querySelectorAll("#tabV .pbr button.tbtn[data-a]")].find(b => b.textContent.trim() === "${lbl}" && !b.classList.contains("blocked")); if (b) { b.click(); return "tap"; } return "none"; })()`);   // the row's own CLAIM / LOAD button
await ev(`TABLET.toggle(true, "parcels"); true`); await waitGame(0.5);
s = await J(`({ near: GS.near && GS.near.id, open: TABLET.open, app: TABLET.app })`);
ok(s.open && s.app === "parcels" && !s.near, "away from any site, the Parcels app opens from the cab");
let how = await pickBtn("CLAIM");
s = await J(`({ claims: GS.claims.length })`);
ok(s.claims === 1, `CLAIM from the cab (${how}): ${s.claims} claimed`);
await closeTab();
await putP("depot.x + 6", "depot.z + 6"); await waitGame(1.5);
s = await J(`({ near: GS.near === depot, load: GS.load.length, claims: GS.claims.length })`);
ok(s.near && s.load === 1 && s.claims === 0, `stopping at the quay in the truck loads the claim (${s.load} aboard, ${s.claims} claimed)`);
await ev(`TABLET.toggle(true, "parcels"); true`); await waitGame(0.5);
how = await pickBtn("LOAD");
await sleep(200);
s = await J(`({ load: GS.load.length, toast: window.__T.filter(t => /^Loaded/.test(t)).join(" | "), slots: TABLET.byId.parcels ? 1 : 0, txt: $("tabV").textContent })`);
ok(s.load === 2, `LOAD at the quay from the cab (${how}): ${s.load} in the bed`);
ok(/in the bed/.test(s.toast) && !/on the rack/.test(s.toast), "the load toast says in the bed: " + s.toast.slice(0, 160));
ok(/\/8\b|· 2\/8/.test(s.txt), "the board counts the truck's 8 slots");
await closeTab();

// ---- 7. Jobs app and the compass
s = await J(`({ jobs: jobsList().length, title: $("jobTitle").textContent })`);
ok(s.jobs >= 2 && s.title.length > 0, `the Jobs list has the truck's parcels (${s.jobs}) and the compass points at one: "${s.title}"`);
await ev(`TABLET.toggle(true, "jobs"); true`); await waitGame(0.5);
s = await J(`({ app: TABLET.app, cards: document.querySelectorAll("#tabV [data-tf^='jb:']").length })`);
ok(s.app === "jobs" && s.cards >= 2, `the Jobs app lists them in the cab (${s.cards} cards)`);
await closeTab();

// ---- 8. deliver from the truck
const dest = await J(`(() => { const j = GS.load[0]; return { id: j.dest.id, x: j.dest.x, z: j.dest.z, pay: j.pay }; })()`);
const cash0 = await ev("GS.cash"), del0 = await ev("GS.delivered");
await putP(`${dest.x} + 7`, `${dest.z} + 7`); await waitGame(1.5);
s = await J(`({ cash: GS.cash, del: GS.delivered, left: GS.load.filter(j => j.dest.id === "${dest.id}").length, load: GS.load.length })`);
ok(s.cash > cash0 && s.del > del0 && s.left === 0, `a parcel delivers from the truck at ${dest.id}: cash ${cash0} -> ${s.cash}, delivered ${del0} -> ${s.del} (${s.load} aboard, any backhaul included)`);

// ---- 9. on foot: YOU is the walker, both vehicles pinned
await ev(`P.vx = P.vz = 0; true`); await tap("KeyQ");
ok(await waitUntil("!DMT.on && FOOT.on", 12), "Q gets out");
await sleep(400);
await ev(`FOOT.x += 6; FOOT.z += 6; FOOT.y = surf(FOOT.x, FOOT.z); true`); await sleep(500);
await tap("KeyM"); await waitGame(0.6);
s = await J(`({ open: TABLET.open, mode: TABLET.mode, me: tabMe(), foot: { x: FOOT.x, z: FOOT.z }, pins: tabVehPts().map(p => p.kind).sort() })`);
ok(s.open && s.mode === "overlay", "on foot M opens the Map overlay");
ok(Math.hypot(s.me.x - s.foot.x, s.me.z - s.foot.z) < 0.01, "on foot YOU on the chart is the walker, not the vehicle");
ok(s.pins.join() === "sled,truck", `on foot both vehicles are pinned (${s.pins.join()})`);
await closeTab();

// ---- 10. back on the sled: the dash glass again, the truck pinned
await ev(`FOOT.x = ${sledPose.x} + 2; FOOT.z = ${sledPose.z}; FOOT.y = surf(FOOT.x, FOOT.z); recenter(FOOT.x, FOOT.z, true); true`); await sleep(1500);
await tap("KeyQ");
ok(await waitUntil("!MNT.on && !FOOT.on && !VEH.cur", 12), "Q gets back on the sled");
await sleep(400);
await tap("Tab"); await waitGame(0.6);
s = await J(`({ open: TABLET.open, mode: TABLET.mode, pins: tabVehPts().map(p => p.kind) })`);
ok(s.open && s.mode === "dash", `on the sled again the tablet is on the dash glass (mode ${s.mode})`);
ok(s.pins.length === 1 && s.pins[0] === "truck", "and the Map pins the parked truck");
await closeTab();

console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);

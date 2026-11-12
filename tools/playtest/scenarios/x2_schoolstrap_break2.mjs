// Beta 0138: tries to break the v196 school/strap guard. A: ping notification at the yard while strapped (does it still
// offer START COURSE?). B: course running, strap the SCHOOL sled to the trailer on foot, then quit: where do the own sled
// and the strap end up? C: reload mid-course, check own sled + strap survive. D: strapped, tablet card text.
import { boot, ev, sleep, done, park, shot, timed } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }

await boot(); await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`);
await park(); await sleep(400);
await ev(`GS.cash = 9000; garageTab = "trucks"; openGarage(); true`); await sleep(500);
await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400);
await ev(`[...document.querySelectorAll("#garageBody .row")].find(e => /Fjordhenger/.test(e.textContent)).click(); closeGarage(); true`); await sleep(400);
ok(!!(await ev(`TLXV.haul() ? 1 : 0`)), "bought truck + trailer");

// A: strapped, ride into the yard from outside so the arrival ping fires
await ev(`(() => { const sc = SCHOOLS.freight, h = TLXV.haul(); GS.apps.freight = true; GS.signed.freight = true; GS.lic.freight = false;
  h.on = null; h.x = sc.x + 80; h.z = sc.z + 8; h.yaw = 0; h.ramp = 0; h.strap = { x: 0, z: 0.69, yaw: 0 };
  const w = TLXV.haulWorld(h, 0.0, 0.69); P.x = w[0]; P.z = w[1]; P.yaw = 0; P.vx = P.vz = P.vy = 0; P.y = TLXV.deckAt(P.x, P.z, 99); recenter(P.x, P.z, true); SCHOOL.pingT = {}; return 1; })()`);
await waitGame(2);
await ev(`(() => { const sc = SCHOOLS.freight, h = TLXV.haul(); h.x = sc.x + 8; h.z = sc.z + 8; const w = TLXV.haulWorld(h, 0.0, 0.69); P.x = w[0]; P.z = w[1]; return 1; })()`);
await waitGame(2);
const ping = await J(`(typeof TABLET.queue !== "undefined" ? TABLET.queue : (TABLET.notes || [])).length`).catch(() => "?");
const pingTxt = await ev(`[...document.querySelectorAll("#tabNotif, .tabNotif, .notif, #notif, [class*=notif]")].map(e => e.textContent).join(" | ").slice(0, 300)`);
console.log("ping dom:", pingTxt);
await shot("x2b_ping");
const offered = /START COURSE|RESUME COURSE/i.test(pingTxt);
ok(!offered, `arrival ping does not offer START COURSE while strapped (offered ${offered})`);
await ev(`TABLET.toggle(true, "freight"); true`); await sleep(500);
const card = await ev(`(document.querySelector("#tabS") || document.body).innerText.replace(/\\s+/g, " ").slice(0, 700)`);
console.log("card:", card);
ok(/strapped/i.test(card), "freight app card tells the player why start is blocked");
await shot("x2b_card");
await ev(`TABLET.close(); true`); await sleep(300);

// B: unstrap, start course, then strap the school sled to the trailer
await ev(`TLXV.haul().strap = null; true`);
await ev(`(() => { const sc = SCHOOLS.freight; P.x = sc.x - 4; P.z = sc.z + 6; P.vx = P.vz = 0; P.y = surf(P.x, P.z) + 0.3; recenter(P.x, P.z, true); return 1; })()`);
await waitGame(1.5);
await ev(`schoolBegin("freight"); true`); await waitGame(1.5);
ok(await ev(`SCHOOL.on`), "course on");
const ownBefore = await ev(`SCHOOL.saved.sled`);
// put trailer on the school sled's pad, sled on the deck, then on-foot strap
await ev(`(() => { const h = TLXV.haul(); h.on = null; h.x = P.x + 6; h.z = P.z; h.yaw = 0; h.ramp = 1; const w = TLXV.haulWorld(h, 0, 0.69); P.x = w[0]; P.z = w[1]; P.yaw = 0; P.vx = P.vz = 0; P.y = TLXV.deckAt(P.x, P.z, 99); return 1; })()`);
await waitGame(1);
const can = await J(`(() => { const f = TLXV.strapFoot; return { onDeck: !!TLXV.sledOnDeck(P.x, P.z, P.y) }; })()`);
console.log("school sled on deck:", JSON.stringify(can));
// force strap as the on-foot action would
await ev(`(() => { const h = TLXV.haul(); const L = TLXV.haulLocal(h, P.x, P.z); h.strap = { x: L.x, z: L.z, yaw: 0 }; return 1; })()`);
await waitGame(1);
const b1 = await J(`({ x: P.x, z: P.z, on: SCHOOL.on })`);
await timed(["KeyW"], 1.5);
const b2 = await J(`({ x: P.x, z: P.z })`);
console.log("school sled strapped, W 1.5 s moved", Math.hypot(b2.x - b1.x, b2.z - b1.z).toFixed(1), "m");
await ev(`schoolEnd("quit"); true`); await waitGame(2);
const q = await J(`({ on: SCHOOL.on, sled: GS.own.sled, strap: !!TLXV.haul().strap, x: P.x, z: P.z, hx: TLXV.haul().x, hz: TLXV.haul().z, nan: [P.x, P.z, P.y, camera.position.x].some(v => !isFinite(v)) })`);
console.log("after quit:", JSON.stringify(q));
ok(!q.nan && q.sled === ownBefore, `quit: own sled ${q.sled} back, finite`);
const dTr = Math.hypot(q.x - q.hx, q.z - q.hz);
ok(!q.strap || dTr < 4, `quit: own sled not teleported/glued to a trailer it was never on (strap ${q.strap}, ${dTr.toFixed(1)} m from trailer)`);
await shot("x2b_afterquit");

// C: reload mid-course
await ev(`TLXV.haul().strap = null; true`);
await ev(`(() => { const sc = SCHOOLS.freight; P.x = sc.x - 4; P.z = sc.z + 6; P.vx = P.vz = 0; P.y = surf(P.x, P.z) + 0.3; recenter(P.x, P.z, true); return 1; })()`);
await waitGame(1.5);
await ev(`schoolBegin("freight"); true`); await waitGame(1.5);
const saveObj = await J(`JSON.parse(localStorage.getItem("tracklayer.save.v2"))`);
console.log("mid-course save own.sled:", saveObj.own && saveObj.own.sled);
ok(saveObj.own && saveObj.own.sled === ownBefore, "saved game holds the own sled during the course");
await done(fails ? 1 : 0);

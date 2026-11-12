// Beta fix 0133 #1: a school course can't start while your sled is strapped to the deck trailer (strapTick would glue the
// school's Matriarch to the deck). A: strapped -> refused with a toast, card blocked, nothing swapped. B: backstop: forced past
// the check, the school sled still stands at the yard start and drives; quitting brings the own sled back strapped by the
// trailer. C: strap off -> the course starts as before. Exit 1 on any fail.
import { boot, ev, sleep, done, park, shot, timed } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
const toasts = () => J(`[...document.querySelectorAll("#toasts *")].map(e => e.textContent).concat((typeof TOASTQ !== "undefined" ? TOASTQ : []).map(t => t.msg || t.text || String(t))).slice(-6)`);

await boot(); await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`);
await park(); await sleep(400);
await ev(`GS.cash = 9000; garageTab = "trucks"; openGarage(); true`); await sleep(500);
await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400);
await ev(`[...document.querySelectorAll("#garageBody .row")].find(e => /Fjordhenger/.test(e.textContent)).click(); closeGarage(); true`); await sleep(400);
ok(!!(await ev(`TLXV.haul() ? 1 : 0`)), "bought truck + trailer");
const strapOn = () => ev(`(() => { const sc = SCHOOLS.freight, h = TLXV.haul(); GS.apps.freight = true; GS.signed.freight = true; GS.lic.freight = false;
  h.on = null; h.x = sc.x + 8; h.z = sc.z + 8; h.yaw = 0; h.ramp = 0; h.strap = { x: 0, z: 0.69, yaw: 0 };
  const w = TLXV.haulWorld(h, 0.0, 0.69); P.x = w[0]; P.z = w[1]; P.yaw = 0; P.vx = P.vz = P.vy = 0; P.y = TLXV.deckAt(P.x, P.z, 99); recenter(P.x, P.z, true); return 1; })()`);
await strapOn(); await waitGame(2);
const s0 = await J(`({ strap: !!TLXV.haul().strap, here: SCHOOL.here && SCHOOL.here.id, sled: GS.own.sled })`);
ok(s0.strap && s0.here === "freight", `strapped sled in the freight yard (here ${s0.here})`);

// A: refused
const why = await ev(`schoolCanStart(SCHOOLS.freight)`);
ok(/strapped/i.test(why), `schoolCanStart says why: "${why}"`);
await ev(`schoolBegin("freight"); true`); await waitGame(1);
const a = await J(`({ on: SCHOOL.on, sled: GS.own.sled, strap: !!TLXV.haul().strap })`);
const ta = await toasts();
ok(!a.on && a.sled === s0.sled && a.strap, `course refused, own sled kept and still strapped (on ${a.on}, sled ${a.sled})`);
ok(ta.some(t => /strapped to the trailer/i.test(t)), `refusal toast shown (${JSON.stringify(ta.slice(-2))})`);
ok(ta.every(t => !/\b(Q|E|F|W|Space|Shift)\b:/.test(t)), "no hard-coded key in the toast");
await ev(`TABLET.toggle(true, "freight"); true`); await sleep(500);
const blocked = await ev(`(() => { const b = document.querySelector('[data-act="sch:sb"], [data-a="sch:sb"]'); return b ? (b.disabled || b.classList.contains("blocked") || !!b.closest(".blocked")) : "n/a"; })()`);
console.log("start button blocked:", blocked);
await shot("x2st_refused");
await ev(`TABLET.close(); true`); await sleep(300);

// B: backstop (forced past the check)
await ev(`window.__vs = VEH.strapped; VEH.strapped = () => false; schoolBegin("freight"); VEH.strapped = window.__vs; true`); await waitGame(2.5);
const b = await J(`({ on: SCHOOL.on, x: P.x, z: P.z, hx: TLXV.haul().x, hz: TLXV.haul().z, strap: !!TLXV.haul().strap, nan: [P.x, P.z, camera.position.x].some(v => !isFinite(v)) })`);
const st = await J(`(() => { const s = SCHOOLS.freight; return { x: s.x, z: s.z + 10 }; })()`);
const dStart = Math.hypot(b.x - st.x, b.z - st.z), dTr = Math.hypot(b.x - b.hx, b.z - b.hz);
ok(b.on && !b.nan, "backstop: course on, finite");
ok(dTr > 4, `backstop: school sled not glued to the trailer (${dStart.toFixed(1)} m from start, ${dTr.toFixed(1)} m from trailer)`);
await timed(["KeyW"], 2.5);
const c = await J(`({ x: P.x, z: P.z })`);
const mv = Math.hypot(c.x - b.x, c.z - b.z);
ok(mv > 3, `backstop: school sled drives (${mv.toFixed(1)} m in 2.5 s of W)`);
await shot("x2st_backstop");
await ev(`schoolEnd("quit"); true`); await waitGame(2);
const d = await J(`({ on: SCHOOL.on, sled: GS.own.sled, strap: !!TLXV.haul().strap, x: P.x, z: P.z, hx: TLXV.haul().x, hz: TLXV.haul().z, nan: [P.x, P.z, P.y, camera.position.x].some(v => !isFinite(v)) })`);
ok(!d.on && !d.nan && d.sled === s0.sled, `quit: own sled ${d.sled} back, finite`);
ok(d.strap && Math.hypot(d.x - d.hx, d.z - d.hz) < 4, `quit: still strapped on the trailer (${Math.hypot(d.x - d.hx, d.z - d.hz).toFixed(1)} m)`);

// C: unstrapped -> starts
await ev(`(() => { const sc = SCHOOLS.freight, h = TLXV.haul(); h.strap = null; P.x = sc.x - 4; P.z = sc.z + 6; P.vx = P.vz = 0; P.y = surf(P.x, P.z) + 0.3; recenter(P.x, P.z, true); return 1; })()`);
await waitGame(1.5);
const why2 = await ev(`schoolCanStart(SCHOOLS.freight)`);
ok(why2 === "", `unstrapped: nothing blocks ("${why2}")`);
await ev(`schoolBegin("freight"); true`); await waitGame(1.5);
const e = await J(`({ on: SCHOOL.on, sled: GS.own.sled })`);
ok(e.on, `unstrapped: course starts (sled ${e.sled})`);
await ev(`schoolEnd("quit"); true`); await waitGame(1);
await done(fails ? 1 : 0);

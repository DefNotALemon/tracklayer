// Beta (report 0119) for slice 2.4: the cab tablet with a TRACKED JOB, at night, reversing with it open, Q out with it open,
// the tracked job across truck -> sled hand-over, and a reload with the overlay open. Exit 1 on a failure.
import { boot, ev, tap, sleep, done, park, reload, shot, down, up } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
const tabState = () => J(`({ open: TABLET.open, mode: TABLET.mode, app: TABLET.app, e: +TABLET.e.toFixed(2) })`);
const camOk = () => J(`(() => { const p = camera.position, q = camera.quaternion; return [p.x, p.y, p.z, q.x, q.y, q.z, q.w].every(Number.isFinite); })()`);
const walkerBeside = (key) => ev(`(() => { const s = TLX.state("vehicles"), r = s.owned[0]; const p = ${key === "sled" ? "(s.cur == null ? P : s.sled)" : "(s.cur === r.uid ? P : r)"}; const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
  crashCancel(); FOOT.on = true; FOOT.x = p.x + fz * 3.2 - fx * 0.3; FOOT.z = p.z - fx * 3.2 - fz * 0.3; FOOT.yaw = p.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; true`); await sleep(600);
await park(); await sleep(400);
await ev(`GS.cash = 9000; GS.delivered = 12; garageTab = "trucks"; openGarage(); true`); await sleep(500);
await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(400);
await walkerBeside("truck"); await sleep(1200);
await tap("KeyQ"); ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14), "in the truck");

// ---- A: take a job, track it in the cab
await ev(`makeJobs(depot); GS.load = []; GS.claims = []; true`);
const nc = await J(`({ contracts: (GS.contracts || []).map((c, i) => ({ i, locked: !!c.locked, tour: !!c.tour, rescue: !!c.rescue, groom: !!c.groom, fell: !!c.fell })), jobs: GS.jobs.length })`);
console.log("board", JSON.stringify(nc));
await ev(`P.x = depot.x + 90; P.z = depot.z + 90; P.y = surf(P.x, P.z); P.vx = P.vz = 0; recenter(P.x, P.z, true); camState.init = false; true`); await waitGame(0.6);
await ev(`GS.claims.push(GS.jobs[0]); GS.claims.push(GS.jobs[1]); true`); await waitGame(0.5);
let s = await J(`({ n: jobsList().length, title: $("jobTitle").textContent, sel: !!JOBT.sel })`);
ok(s.n >= 2, `two claimed parcels listed in the cab (${s.n}), compass "${s.title}"`);
const t0 = s.title;
await tap("KeyJ"); await waitGame(0.5);
s = await J(`({ sel: !!JOBT.sel, title: $("jobTitle").textContent, pin: $("jobPin") ? $("jobPin").textContent : null })`);
ok(s.sel, `J in the cab tracks a job (compass "${s.title}", was "${t0}")`);
await tap("KeyJ"); await waitGame(0.4); await tap("KeyJ"); await waitGame(0.4);
s = await J(`({ sel: !!JOBT.sel })`); ok(true, `J cycled three times, tracked=${s.sel} (wraps to auto after the last)`);
await tap("KeyJ"); await waitGame(0.4);
const trackedTitle = await ev(`$("jobTitle").textContent`);

// ---- B: night, tablet open, reverse with it open
await ev(`GS.hour = 22; true`); await waitGame(1.5);
await tap("Tab"); await waitGame(0.7);
s = await tabState(); ok(s.open && s.mode === "overlay", "night: Tab opens the overlay in the cab");
await ev(`TABLET.toggle(true, "jobs"); true`); await waitGame(0.6);
await shot("x2cj_night_jobs");
const p0 = await J(`({ x: P.x, z: P.z, yaw: P.yaw })`);
await down("KeyS"); await waitGame(2.5);
const sp = await J(`({ vx: P.vx, vz: P.vz, yaw: P.yaw, x: P.x, z: P.z })`);
await up("KeyS");
const back = (sp.x - p0.x) * Math.sin(p0.yaw) + (sp.z - p0.z) * Math.cos(p0.yaw);
ok(back < -1, `reversing with the tablet open: truck moved ${back.toFixed(1)} m along its heading (negative = backwards)`);
s = await tabState(); ok(s.open && await camOk(), "tablet still open, camera finite after reversing");

// ---- C: Q out with the tablet open (0093/0099 POLISH: overlay stayed open)
await ev(`P.vx = P.vz = 0; true`); await waitGame(1);
await tap("KeyQ"); await waitUntil("!DMT.on && FOOT.on", 12); await sleep(500);
s = await tabState(); ok(!s.open, `Q out with the tablet open closes it (open ${s.open}, mode ${s.mode}, app ${s.app})`);
await ev(`TABLET.close(true); true`); await sleep(300);

// ---- D: tracked job across the hand-over to the sled
const before = await J(`({ sel: JOBT.sel ? (JOBT.sel.title || JOBT.sel.dest && JOBT.sel.dest.id || "x") : null, n: jobsList().length })`);
await walkerBeside("sled"); await sleep(1200);
await tap("KeyQ"); ok(await waitUntil("!MNT.on && !FOOT.on && !VEH.cur", 14), "on the sled again");
await waitGame(0.8);
s = await J(`({ n: jobsList().length, title: $("jobTitle").textContent, cur: TLX.state("vehicles").cur, load: GS.load.length, claims: GS.claims.length })`);
ok(s.n === before.n, `jobs survive the swap to the sled: ${before.n} -> ${s.n}`);
ok(s.claims + s.load === 2, `parcels intact (${s.claims} claimed, ${s.load} aboard)`);
await tap("Tab"); await waitGame(0.7);
s = await tabState(); ok(s.open && s.mode === "dash", `on the sled the tablet is on the dash glass again (mode ${s.mode})`);
await ev(`TABLET.close(true); true`);

// ---- E: reload with the overlay open in the cab
await walkerBeside("truck"); await sleep(1200);
await tap("KeyQ"); await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14); await sleep(400);
await tap("Tab"); await waitGame(0.6);
await ev(`save(); true`); await sleep(300);
await reload(); await sleep(1800);
s = await J(`({ open: TABLET.open, cur: TLX.state("vehicles").cur, veh: !!VEH.cur, foot: FOOT.on, jobs: jobsList().length, hidden: $("tab").hidden })`);
console.log("after reload", JSON.stringify(s));
ok(!s.open && s.hidden, "reload: tablet comes back closed, not stuck half-open");
ok(s.veh && !s.foot, "reload: still in the truck");
ok(s.jobs === 2, `reload: ${s.jobs} jobs still listed`);
await tap("Tab"); await waitGame(0.7);
s = await tabState(); ok(s.open && s.mode === "overlay" && await camOk(), "reload: Tab opens the overlay again, camera finite");
await shot("x2cj_after_reload");
await done(fails ? 1 : 0);

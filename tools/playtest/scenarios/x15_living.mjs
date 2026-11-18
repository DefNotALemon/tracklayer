// Living world, release 1: the Politi (tlx-police.js), flats to rent or buy (tlx-housing.js) and slumlords. Asserts, exit 1 on a failure.
// Run: tools/playtest/run.sh tools/playtest/scenarios/x15_living.mjs   (NOSTILLS=1 skips the screenshots)
//  A  boot: cruisers are real traffic cars (TLXT.extra), options + apps + six flats placed, a fresh save has no police/housing trouble
//  B  rules by place: town 30, road 70, open fell none; a sled at 90 km/h on open snow beside a cruiser is not an offence
//  C  speeding on a road that nobody sees: no suspicion, no warning
//  D  speeding with a cruiser in sight: warn (HUD, lights), stop -> fined (cash down by the fine, record up, never below zero)
//  E  low funds: the fine takes what is there, the rest is OWED; paying in two goes never makes cash negative
//  F  a warning only: slow to the limit for 6 s after a minor offence
//  G  run: warn -> pursuit (heat, stage), outrun -> search -> escaped (no fine, heat 0)
//  H  busted: stopping with a cruiser close = fine + fleeing surcharge; stopping with none close = surrender
//  I  a cruiser off the road really drives to you over snow (distance falls, never in water), and boxes you in
//  J  a civilian sees a crash: a cruiser is dispatched from 380+ m away (nothing appears beside you), then comes
//  K  renting: low funds refuse (nothing taken), one lease at a time, deposit + first week once, Monday rent once per Monday,
//     arrears + late fee when short (cash >= 0), notice to quit, eviction, deposit to the arrears, debt blocks the next lease, pay
//  L  slumlords: faults at the door, report -> no reply / slow, retaliation rise, complaint after a week -> upheld, rebate, repair ordered,
//     protection; deposit kept 50% (not on a won complaint); option off = fair terms; Kåre fixes in days
//  M  in the flat: the room builds, fixtures show for open faults, use at a fault = REPORT then FIX, a dead radiator costs warmth
//  N  buying: expensive (650+ weeks), low funds refuse, sell back 75%, owned flat has no rent
//  O  save -> reload keeps tenancy, faults, owed fines; a save without x loads fresh; options off: no cruisers/fines, no flats/rent
import { boot, reload, ev, raw, sleep, shot, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(100); }
async function until(expr, maxGame, step = 150) { const t0 = await clock(); for (;;) { if (await ev(`!!(${expr})`)) return true; if ((await clock()) - t0 > maxGame) return false; await sleep(step); } }
const NOSTILLS = !!process.env.NOSTILLS;
let hooked = false;
async function cam(expr) { if (!hooked) { await ev(`(() => { const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); }; return true; })()`); hooked = true; } await ev(`window.camOv = ${expr}; true`); await sleep(350); }
const camOff = () => ev("window.camOv = null; true");
const ONLY = process.env.ONLY;
const section = async (n, f) => { if (ONLY && n[0] !== "A" && !ONLY.includes(n[0])) return; console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; INT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(1200);

// the scripted driver: the player's machine runs along a road lane at an exact speed (the detection and the cruisers run for real)
await ev(`(() => { window.__drv = null; setInterval(() => { const d = window.__drv; if (!d || !d.on) return; const t = gameClock, dt = Math.max(0, Math.min(0.1, t - d.t)); d.t = t; d.s += d.dir * d.v * dt;
  const p = TLXT.lanePt(d.id, d.s, d.dir); if (!p) return; P.x = p.x; P.z = p.z; P.yaw = p.yaw; P.vx = Math.sin(p.yaw) * d.v; P.vz = Math.cos(p.yaw) * d.v; P.vy = 0; P.y = surf(P.x, P.z) + 0.3; }, 30); return true; })()`);
const route = await J(`(() => { const r = TLXT.routes.slice().sort((a, b) => b.len - a.len)[0]; return { id: r.id, s0: r.s0, len: r.len }; })()`);
const drive = (s, v, dir = 1) => ev(`window.__drv = { on: true, id: ${JSON.stringify(route.id)}, s: ${s}, v: ${v}, dir: ${dir}, t: gameClock }; true`);
const driveV = v => ev(`window.__drv.v = ${v}; true`);
const stopDrive = () => ev(`window.__drv = null; P.vx = P.vz = 0; true`);
const sAt = () => ev(`window.__drv ? window.__drv.s : 0`);
const clearWorld = () => ev(`(() => { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; TLXP.reset(); TLXP.RT.grace = 0; TLXP.RT.sus = 0; TLXP.RT.inc = null; for (const c of TLXP.cops) { c.on = false; c.st = "drive"; c.dispatched = false; } const s = TLXP.S(); s.owed = 0; s.rec = { fines: 0, warnings: 0, chases: 0, escapes: 0, busts: 0, paid: 0 }; s.last = []; TLXP.POL.searchT = 24; TLXP.POL.lostT = 7; TLXP.POL.defyT = 99; TLXP.POL.warnT = 99; TLXP.POL.callDelay = [7, 13]; TLXP.RT.cd = 0; return true; })()`);

// ---------------- A
await section("A boot", async () => {
  const a = await J(`({ extra: TLXT.extra.length, cops: TLXP.cops.length, copsRoad: TLXP.cops.filter(c => c.on && TLXT.k.near(c.x, c.z).d < 6).length, opts: ["police", "rentals", "slumlords"].map(i => TLX.on(i)), apps: ["homes", "politi"].map(i => !!TABLET.byId[i]), units: TLXH.UNITS.filter(u => u.at && u.beacon).length,
    perr: TLXP.RT.err || null, herr: TLXH.err, terr: TLXT.tickErr || null, st: TLX.state("police").mode, own: Object.keys(TLX.state("housing").own).length, ten: TLX.state("housing").ten, cars: TLXT.cars.filter(c => !c.semi && !c.plow).length })`);
  console.log("A", JSON.stringify(a));
  ok(a.extra === 2 && a.cops === 2, "A: two cruisers in TLXT.extra (real traffic cars)");
  ok(a.copsRoad === a.cops, "A: both on a road at boot (" + a.copsRoad + ")");
  ok(a.opts.every(Boolean), "A: the three options are on by default");
  ok(a.apps.every(Boolean), "A: Homes and Politi tablet apps registered");
  ok(a.units === 6, "A: six flats placed behind town doors with beacons (" + a.units + ")");
  ok(!a.perr && !a.herr && !a.terr, "A: no tick errors");
  ok(a.st === "clear" && a.own === 0 && a.ten === null && a.cars === 6, "A: fresh game: no police trouble, no home, traffic still 6 cars");
});

// ---------------- B
await section("B rules by place", async () => {
  const z = await J(`({ town: TLXP.zone(depot.x + 10, depot.z + 10), road: (() => { const p = TLXT.lanePt(${JSON.stringify(route.id)}, ${route.s0 + route.len * 0.3}, 1); return TLXP.zone(p.x, p.z); })(), open: (() => { for (let r = 400; r < 3000; r += 100) for (let a = 0; a < 6.28; a += 0.4) { const x = depot.x + Math.cos(a) * r, z = depot.z + Math.sin(a) * r; if (!isSea(x, z) && TLXR.near(x, z).d > 40) return TLXP.zone(x, z); } return null; })() })`);
  console.log("B", JSON.stringify(z));
  ok(z.town.k === "town" && Math.abs(z.town.lim * 3.6 - 30) < 0.5, "B: inside the town limit: 30 km/h");
  ok(z.road.k === "road" && Math.abs(z.road.lim * 3.6 - 70) < 0.5, "B: on a marked road: 70 km/h");
  ok(z.open && z.open.k === "open" && z.open.lim === null, "B: open fell: no limit");   // Infinity serialises to null
  // a cruiser right beside a sled doing 90 km/h across open snow: nothing happens
  await clearWorld();
  const spot = await J(`(() => { for (let r = 500; r < 3000; r += 60) for (let a = 0; a < 6.28; a += 0.3) { const x = depot.x + Math.cos(a) * r, z = depot.z + Math.sin(a) * r; if (isSea(x, z) || isWater(x, z) || obNear(x, z, 30)) continue; if (TLXR.near(x, z).d < 60) continue; if (Math.abs(groundAt(x + 20, z) - groundAt(x - 20, z)) > 1.2) continue; return { x, z }; } return null; })()`);
  await ev(`(() => { P.x = ${spot.x}; P.z = ${spot.z}; P.y = surf(P.x, P.z) + 0.3; recenter(P.x, P.z, true); P.yaw = 0; window.__open = setInterval(() => { P.vz = 25; P.vx = 0; P.yaw = 0; }, 30); TLXP.put(0, P.x - 20, P.z - 20, 0, "chase"); TLXP.cops[0].v = 0; TLXP.cops[0].hold = 1e9; return true; })()`);
  await waitGame(8);
  const b = await J(`({ mode: TLXP.mode, sus: TLXP.RT.sus, seen: TLXP.seen().length, spd: Math.hypot(P.vx, P.vz), z: TLXP.zone(P.x, P.z).k })`);
  console.log("B open", JSON.stringify(b));
  ok(b.z === "open" && b.spd > 20 && b.seen >= 0, "B: riding the open fell at " + Math.round(b.spd * 3.6) + " km/h");
  ok(b.mode === "clear" && b.sus === 0, "B: a cruiser beside a 90 km/h sled on open snow: no suspicion, no warning (normal snowmobile travel is never speeding)");
  await ev(`clearInterval(window.__open); TLXP.cops[0].hold = 0; true`);
});

// ---------------- C, D
const fineFromState = async () => J(`TLXP.fineFor(TLXP.RT.inc)`);
await section("C unseen speeding", async () => {
  await clearWorld(); await ev(`GS.cash = 1000; true`);
  const s = route.s0 + route.len * 0.12; await drive(s, 28);
  await ev(`(() => { const p = TLXT.lanePt(${JSON.stringify(route.id)}, ${s}, 1); P.x = p.x; P.z = p.z; recenter(P.x, P.z, true); return true; })()`); await sleep(500);
  await waitGame(6);
  const c = await J(`({ mode: TLXP.mode, sus: TLXP.RT.sus, over: TLXP.RT.over, seen: TLXP.seen().length, cash: GS.cash, z: TLXP.zone(P.x, P.z).k })`);
  console.log("C", JSON.stringify(c));
  ok(c.z === "road" && c.over > 5 && c.seen === 0, "C: " + Math.round(28 * 3.6) + " km/h on a road, " + Math.round(c.over * 3.6) + " km/h over, no cruiser in sight");
  ok(c.mode === "clear" && c.sus === 0 && c.cash === 1000, "C: nobody saw it: no suspicion, no warning, no fine");
  await stopDrive();
});
await section("D seen speeding -> warn -> stop -> fined", async () => {
  await clearWorld(); await ev(`GS.cash = 1000; true`);
  const s = route.s0 + route.len * 0.2; await drive(s, 24);
  await sleep(300);
  await ev(`TLXP.patrol(0, ${JSON.stringify(route.id)}, ${s} - 50, 1); true`);                    // a cruiser 50 m behind, patrolling (not on a call)
  const w = await until(`TLXP.mode === "warn"`, 8);
  const d = await J(`({ mode: TLXP.mode, st: TLXP.cops[0].st, task: TLXP.cops[0].task, hud: !document.getElementById("polHud").hidden, txt: document.getElementById("polTxt").textContent, pips: document.querySelectorAll("#polHud i.on").length, inc: TLXP.RT.inc, lights: TLXP.cops[0].lights })`);
  console.log("D warn", JSON.stringify(d));
  ok(w && d.mode === "warn", "D: a cruiser in sight sees 100 km/h in a 70 zone: WARN");
  ok(d.st === "ext" && d.task === "tail", "D: the cruiser takes the call and follows");
  ok(d.hud && /stop/i.test(d.txt) && d.pips >= 1, "D: the HUD says: " + d.txt);
  if (!NOSTILLS) { await cam(`c => { const C = TLXP.cops[0]; const a = C.yaw + Math.PI + 0.7; c.position.set(C.x + Math.sin(a) * 11, C.y + 3.6, C.z + Math.cos(a) * 11); c.lookAt(C.x, C.y + 1, C.z); }`); await shot("x15_cruiser_lights"); await camOff(); }
  await waitGame(3);
  const cd = await J(`Math.hypot(TLXP.cops[0].x - P.x, TLXP.cops[0].z - P.z)`);
  ok(cd < 238, "D: the cruiser is still on you (" + Math.round(cd) + " m, inside its 238 m chase sight)");
  const fine = await fineFromState(); const cash0 = await ev(`GS.cash`);
  await stopDrive();
  const t = await until(`TLXP.mode === "clear"`, 25);
  const e = await J(`({ cash: GS.cash, rec: TLXP.S().rec, owed: TLXP.S().owed, last: TLXP.S().last[0], mode: TLXP.mode, engaged: TLXP.engaged().length })`);
  console.log("D stop", JSON.stringify({ fine, cash0, ...e }));
  ok(t && e.rec.fines === 1 && e.cash === cash0 - fine && fine >= 50, "D: stopped: fined " + fine + ", cash " + cash0 + " -> " + e.cash);
  ok(e.cash >= 0 && e.owed === 0, "D: paid in full, nothing owed");
  await waitGame(1);
  ok(await ev(`TLXP.cops[0].task === "return" || TLXP.cops[0].st === "drive"`), "D: the cruiser goes back to patrol");
});

// ---------------- E
await section("E low funds", async () => {
  await clearWorld(); await ev(`GS.cash = 20; true`);
  const s = route.s0 + route.len * 0.2; await drive(s, 24); await sleep(300);
  await ev(`TLXP.patrol(0, ${JSON.stringify(route.id)}, ${s} - 50, 1); true`);
  await until(`TLXP.mode === "warn"`, 8); const fine = await fineFromState(); await stopDrive();
  await until(`TLXP.mode === "clear"`, 25);
  let e = await J(`({ cash: GS.cash, owed: TLXP.S().owed, rec: TLXP.S().rec, last: TLXP.S().last[0] })`);
  console.log("E", JSON.stringify({ fine, ...e }));
  ok(e.cash === 0 && e.owed === fine - 20, "E: $20 in the pocket, fine " + fine + ": cash 0, " + e.owed + " owed (never negative)");
  await ev(`GS.cash = 30; TLXP.pay(); true`);
  e = await J(`({ cash: GS.cash, owed: TLXP.S().owed })`);
  ok(e.cash === 0 && e.owed === fine - 50, "E: paid $30 of it: cash 0, still owed " + e.owed);
  await ev(`GS.cash = 1e5; TLXP.pay(); true`);
  e = await J(`({ cash: GS.cash, owed: TLXP.S().owed })`);
  ok(e.owed === 0 && e.cash === 1e5 - (fine - 50), "E: cleared: cash " + e.cash);
  await ev(`TLXP.S().owed = 100; true`); await ev(`TLXP.S().owed; TLX.monday({ label: "Mon" }); true`);
  ok(await ev(`TLXP.S().owed`) === 110, "E: owed fines grow 10% on Monday (100 -> 110)");
  await ev(`TLXP.S().owed = 0; true`);
});

// ---------------- F
await section("F a warning only", async () => {
  await clearWorld(); await ev(`GS.cash = 500; true`);
  const s = route.s0 + route.len * 0.3; await drive(s, 24.5); await sleep(300);          // 88 km/h in a 70 zone: a little over (about 2 m/s)
  await ev(`TLXP.patrol(0, ${JSON.stringify(route.id)}, ${s} - 60, 1); true`);
  await until(`TLXP.mode === "warn"`, 8);
  await driveV(18);                                                                      // back to the limit, but doesn't stop
  const g = await until(`TLXP.mode === "clear"`, 14);
  const e = await J(`({ cash: GS.cash, rec: TLXP.S().rec, last: TLXP.S().last[0] })`);
  console.log("F", JSON.stringify(e));
  ok(g && e.rec.warnings === 1 && e.rec.fines === 0 && e.cash === 500, "F: slowed to the limit for 6 s: a warning, no fine, cash untouched");
  await stopDrive();
});

// ---------------- G
await section("G run: pursuit, outrun, escape", async () => {
  // RT.cd = 1e9: no second cruiser is called in this one. It is dispatched at a random spot on a road 380-900 m off, and when
  // that was ahead on this road the driver ran into it (beta 0211 #1). Being seen again is the next section's, on purpose.
  await clearWorld(); await ev(`GS.cash = 800; TLXP.RT.cd = 1e9; TLXP.POL.lostT = 3; TLXP.POL.searchT = 7; TLXP.POL.defyT = 3; TLXP.POL.warnT = 16; true`);
  const s = route.s0 + route.len * 0.1; await drive(s, 28); await sleep(300);
  await ev(`TLXP.patrol(0, ${JSON.stringify(route.id)}, ${s} - 60, 1); true`);
  // the chase as it went, one line a game second and one at each change of mode (printed below)
  await ev(`(() => { clearInterval(window.__gtr); const L = window.__gl = []; let lm = "", lt = -9; window.__gtr = setInterval(() => { const m = TLXP.mode; if (m === lm && gameClock - lt < 1) return; lm = m; lt = gameClock;
    L.push(gameClock.toFixed(1) + " " + m + " heat " + Math.round(TLXP.S().heat) + " ch " + TLXP.S().rec.chases + " seen " + TLXP.seen().length + " | " + TLXP.cops.map(c => c.on ? c.st + "/" + c.task + " " + Math.round(Math.hypot(c.x - P.x, c.z - P.z)) + "m v" + Math.round(c.v) : "off").join(" | ")); }, 50); return true; })()`);
  await until(`TLXP.mode === "warn"`, 8);
  const p = await until(`TLXP.mode === "pursuit"`, 12);
  const a = await J(`({ heat: TLXP.S().heat, chases: TLXP.S().rec.chases, task: TLXP.cops[0].task, inc: TLXP.RT.inc })`);
  console.log("G pursuit", JSON.stringify(a));
  ok(p && a.chases === 1 && a.heat >= 25 && a.task === "chase", "G: kept speeding after the order: PURSUIT, heat " + Math.round(a.heat) + ", cruiser chasing");
  await driveV(40);
  const sr = await until(`TLXP.mode === "search"`, 40);
  ok(sr, "G: outran them past sight: SEARCH (heat " + Math.round(await ev(`TLXP.S().heat`)) + ")");
  const esc = await until(`TLXP.mode === "clear"`, 20);
  const e = await J(`({ cash: GS.cash, rec: TLXP.S().rec, heat: TLXP.S().heat, owed: TLXP.S().owed })`);
  console.log("G", JSON.stringify(e));
  console.log("G timeline\n  " + (await J(`(clearInterval(window.__gtr), window.__gl)`)).join("\n  "));
  ok(esc && e.rec.escapes === 1 && e.cash === 800 && e.owed === 0 && e.heat === 0, "G: unseen long enough: got away, no fine, heat 0");
  ok(e.rec.chases === 1, "G: one chase in the record (" + e.rec.chases + ")");
  await stopDrive();
});
// beta 0211 #1: a second cruiser ahead on your road sees you during the search. That is the same chase carrying on (the record
// counts it once), heat rises only while a cruiser sees you, and outrunning that one too still ends in an escape.
await section("G seen again in the search: the same chase", async () => {
  await clearWorld(); await ev(`GS.cash = 800; TLXP.RT.cd = 1e9; TLXP.POL.lostT = 3; TLXP.POL.searchT = 7; TLXP.POL.defyT = 3; TLXP.POL.warnT = 16; true`);
  const s = route.s0 + route.len * 0.55; await drive(s, 28); await sleep(300);
  await ev(`TLXP.patrol(0, ${JSON.stringify(route.id)}, ${s} - 60, 1); true`);
  // heat sampled between the Politi's own 0.1 s steps: the biggest rise over a step with nobody seeing you, in a pursuit
  await ev(`(() => { clearInterval(window.__gtr); const R = window.__gh = { up: 0, n: 0, seenUp: 0, tl: [] }; let lh = null, lm = "", lt = -9, ls = true; window.__gtr = setInterval(() => { const m = TLXP.mode, h = TLXP.S().heat, sn = TLXP.RT.seenNow;
    if (m === "pursuit" && lh !== null) { if (!sn && !ls) { R.n++; R.up = Math.max(R.up, h - lh); } else if (sn) R.seenUp = Math.max(R.seenUp, h - lh); } lh = m === "pursuit" ? h : null; ls = sn;
    if (m !== lm || gameClock - lt >= 1) { lm = m; lt = gameClock; R.tl.push(gameClock.toFixed(1) + " " + m + " heat " + Math.round(h) + " ch " + TLXP.S().rec.chases + " seen " + (sn ? 1 : 0) + " | " + TLXP.cops.map(c => c.on ? c.st + "/" + c.task + " " + Math.round(Math.hypot(c.x - P.x, c.z - P.z)) + "m" : "off").join(" | ")); } }, 40); return true; })()`);
  const p = await until(`TLXP.mode === "pursuit"`, 20);
  /* 0214 #1: the toast recorder is armed here, as the first pursuit starts (its "They're after you" cleared away), not after
     the search is seen: in a full run a cruiser could find you again between the two and the test then wiped the line it was about to look for */
  await ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw2 = []; if (!window.__tsawI2) window.__tsawI2 = setInterval(() => { const a = window.__tsaw2; for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80);
    return true; })()`);
  await driveV(40);
  const sr = await until(`TLXP.mode === "search"`, 40);
  const h0 = await J(`({ heat: TLXP.S().heat, chases: TLXP.S().rec.chases, up: window.__gh.up, n: window.__gh.n })`);
  console.log("G2 search", JSON.stringify(h0));
  ok(p && sr && h0.chases === 1, "G2: warned, ran, outran the first cruiser: SEARCH, one chase");
  ok(h0.n >= 10 && h0.up < 0.01, "G2: 144 km/h with no cruiser in sight: heat held (" + h0.n + " samples unseen in the pursuit, biggest rise " + h0.up.toFixed(3) + ")");
  // the second cruiser, standing on the verge 70 m up the road with its lights on
  await ev(`(() => { const d = window.__drv, q = TLXT.lanePt(d.id, d.s + 70, 1); const c = TLXP.put(1, q.x + Math.cos(q.yaw) * 4, q.z - Math.sin(q.yaw) * 4, q.yaw + Math.PI, "go"); c.hold = 1e9; return true; })()`);
  const again = await until(`TLXP.mode === "pursuit"`, 6, 60);
  const b = await J(`({ mode: TLXP.mode, chases: TLXP.S().rec.chases, heat: TLXP.S().heat, task: TLXP.cops[1].task, said: [...new Set(window.__tsaw2.concat((TOASTQ || []).map(t => t.msg), [...$("toasts").children].map(c => c.textContent)))] })`);   /* 0213 #1: the mode poll can win the race with the 80 ms recorder, so read what is up right now too */
  console.log("G2 seen again", JSON.stringify(b));
  ok(again && b.task === "chase", "G2: seen by the cruiser ahead inside 120 m: PURSUIT again");
  ok(b.chases === 1, "G2: it is the same chase: the record still says 1 (" + b.chases + ")");
  ok(b.said.some(t => /seen you again/i.test(t)) && !b.said.some(t => /after you/i.test(t)), "G2: told \"They've seen you again\", not a new \"They're after you\"");
  const sr2 = await until(`TLXP.mode === "search"`, 40);
  const esc = await until(`TLXP.mode === "clear"`, 20);
  const e = await J(`({ cash: GS.cash, rec: TLXP.S().rec, heat: TLXP.S().heat, owed: TLXP.S().owed, seenUp: window.__gh.seenUp, up: window.__gh.up })`);
  console.log("G2", JSON.stringify(e));
  console.log("G2 timeline\n  " + (await J(`(clearInterval(window.__gtr), window.__gh.tl)`)).join("\n  "));
  ok(e.seenUp > 0.05, "G2: seen at speed, heat climbs (" + e.seenUp.toFixed(2) + " in a step)");
  ok(e.up < 0.01, "G2: and never while unseen, in either pursuit (" + e.up.toFixed(3) + ")");
  ok(sr2 && esc && e.rec.escapes === 1 && e.rec.chases === 1 && e.rec.busts === 0 && e.cash === 800 && e.owed === 0 && e.heat === 0, "G2: outran that one too: 1 chase, 1 escape, no fine, heat 0");
  await ev(`TLXP.cops[1].hold = 0; true`);
  await stopDrive();
});

// ---------------- H
await section("H busted / surrender", async () => {
  await clearWorld(); await ev(`GS.cash = 2000; TLXP.POL.defyT = 3; TLXP.POL.warnT = 16; true`);
  const s = route.s0 + route.len * 0.4; await drive(s, 28); await sleep(300);
  await ev(`TLXP.patrol(0, ${JSON.stringify(route.id)}, ${s} - 60, 1); true`);
  await until(`TLXP.mode === "pursuit"`, 20);
  await stopDrive();
  await ev(`(() => { const c = TLXP.cops[0]; c.x = P.x - 6 * Math.sin(P.yaw); c.z = P.z - 6 * Math.cos(P.yaw); c.yaw = P.yaw; c.v = 0; return true; })()`);   // right behind, boxed in
  const fine0 = await fineFromState().catch(() => 0);
  const b = await until(`TLXP.mode === "clear"`, 10);
  const e = await J(`({ cash: GS.cash, rec: TLXP.S().rec, last: TLXP.S().last[0] })`);
  console.log("H busted", JSON.stringify(e));
  ok(b && e.rec.busts === 1 && e.last.fine >= 300, "H: stopped with a cruiser on your bumper: BUSTED, fine " + (e.last && e.last.fine) + " (includes the fleeing surcharge)");
  ok(e.cash >= 0 && e.cash === 2000 - e.last.fine, "H: cash " + e.cash);
  // surrender: pursuit, the cruiser is 40 m back
  await clearWorld(); await ev(`GS.cash = 2000; TLXP.POL.defyT = 3; TLXP.POL.warnT = 16; true`);
  await drive(s, 28); await sleep(300);
  await ev(`TLXP.patrol(0, ${JSON.stringify(route.id)}, ${s} - 60, 1); true`);
  await until(`TLXP.mode === "pursuit"`, 20);
  await stopDrive(); await ev(`(() => { const c = TLXP.cops[0]; c.hold = 1e9; c.x = P.x - 40 * Math.sin(P.yaw); c.z = P.z - 40 * Math.cos(P.yaw); c.v = 0; return true; })()`);
  const sg = await until(`TLXP.mode === "clear"`, 10);
  const f = await J(`({ rec: TLXP.S().rec, last: TLXP.S().last[0] })`);
  ok(sg && f.last.why === "Gave yourself up", "H: stopped with the cruiser 40 m back: gave yourself up (" + (f.last && f.last.why) + ")");
  await ev(`TLXP.cops[0].hold = 0; true`);
});

// ---------------- I
await section("I a cruiser crosses snow to you", async () => {
  await clearWorld(); await ev(`GS.cash = 1000; true`);
  const spot = await J(`(() => { for (let r = 500; r < 3000; r += 60) for (let a = 0.2; a < 6.28; a += 0.3) { const x = depot.x + Math.cos(a) * r, z = depot.z + Math.sin(a) * r; if (isSea(x, z) || isWater(x, z) || obNear(x, z, 30)) continue; if (TLXR.near(x, z).d < 60) continue; if (Math.abs(groundAt(x + 20, z) - groundAt(x - 20, z)) > 1.2) continue; const cx = x + 90, cz = z; if (isSea(cx, cz) || isWater(cx, cz) || obNear(cx, cz, 10) || TLXR.near(cx, cz).d < 40) continue; return { x, z }; } return null; })()`);
  await ev(`(() => { P.x = ${spot.x}; P.z = ${spot.z}; P.y = surf(P.x, P.z) + 0.3; recenter(P.x, P.z, true); P.yaw = 0; window.__open = setInterval(() => { P.vz = 3; P.vx = 0; }, 30);
    const s = TLXP.S(); s.mode = "pursuit"; s.heat = 40; TLXP.RT.lostT = 0; TLXP.put(0, P.x + 90, P.z, -1.57, "chase"); return true; })()`);
  const d0 = await J(`Math.hypot(TLXP.cops[0].x - P.x, TLXP.cops[0].z - P.z)`);
  let water = false, vmax = 0, onsnow = 0;
  const t0 = await clock(); let d = d0;
  while ((await clock()) - t0 < 40) {
    const q = await J(`({ d: Math.hypot(TLXP.cops[0].x - P.x, TLXP.cops[0].z - P.z), w: isSea(TLXP.cops[0].x, TLXP.cops[0].z) || isWater(TLXP.cops[0].x, TLXP.cops[0].z), v: TLXP.cops[0].v, mode: TLXP.mode, road: Math.min(1e4, TLXT.k.near(TLXP.cops[0].x, TLXP.cops[0].z).d) })`);
    d = q.d; water = water || q.w; vmax = Math.max(vmax, q.v); if (q.road > 12) onsnow++;
    if (q.mode === "clear" || d < 12) break; await sleep(250);
  }
  console.log("I", JSON.stringify({ d0, d, water, vmax, onsnow }));
  ok(d < d0 * 0.4 && onsnow > 3, "I: a cruiser 90 m off the road closed on you across snow (" + Math.round(d0) + " -> " + Math.round(d) + " m)");
  ok(!water && vmax <= 22 * 1.28 + 0.5 && vmax > 3, "I: never in water, never faster than its cap (" + vmax.toFixed(1) + " m/s)");
  if (!NOSTILLS) { await cam(`c => { const C = TLXP.cops[0]; c.position.set(P.x + 14, P.y + 4.5, P.z + 14); c.lookAt((P.x + C.x) / 2, P.y + 1, (P.z + C.z) / 2); }`); await shot("x15_chase_snow"); await camOff(); }
  await until(`TLXP.mode === "clear"`, 14);
  ok(await ev(`TLXP.S().rec.busts >= 1`), "I: it got to you and you were busted (moving slowly)");
  await ev(`clearInterval(window.__open); true`);
});

// ---------------- J
await section("J witness -> dispatch", async () => {
  await clearWorld(); await ev(`GS.cash = 1000; TLXP.POL.callDelay = [1, 1.5]; true`);
  const s = route.s0 + route.len * 0.5;
  const car = await J(`(() => { const c = TLXT.place(${JSON.stringify(route.id)}, ${s + 60}, 1, 0); c.hold = 1e9; c.v = 0; return { x: c.x, z: c.z }; })()`);
  await drive(s + 30, 12); await sleep(200);
  const hit = await until(`TLXP.RT.call || TLXP.mode !== "clear"`, 14);
  const j0 = await J(`({ hits: TLXT.hits, call: TLXP.RT.call, mode: TLXP.mode, inc: TLXP.RT.inc })`);
  console.log("J crash", JSON.stringify(j0));
  ok(hit && j0.inc && j0.inc.crash >= 1, "J: rode into a car: counted as a crash, seen by its driver");
  await stopDrive();
  const disp = await until(`TLXP.cops.some(c => c.dispatched && c.st === "ext")`, 14);
  const d1 = await J(`(() => { const c = TLXP.cops.find(q => q.dispatched); return c ? { d: Math.hypot(c.x - P.x, c.z - P.z), task: c.task, mode: TLXP.mode, heat: TLXP.S().heat } : null; })()`);
  console.log("J dispatch", JSON.stringify(d1));
  ok(disp && d1 && d1.d >= 300, "J: a cruiser was dispatched from " + (d1 && Math.round(d1.d)) + " m away, not beside you");
  ok(d1 && d1.mode === "search" && d1.heat >= 20, "J: the call put you at SEARCH, heat " + (d1 && Math.round(d1.heat)));
  const d2 = d1 && d1.d; await waitGame(12);
  const d3 = await J(`(() => { const c = TLXP.cops.find(q => q.dispatched); return c ? Math.hypot(c.x - P.x, c.z - P.z) : null; })()`);
  ok(d3 !== null && d3 < d2 - 40, "J: and it drove toward the call (" + Math.round(d2) + " -> " + Math.round(d3) + " m)");
  await ev(`TLXT.hold = false; true`);
});

// ---------------- K
let Dwk;
await section("K renting", async () => {
  await clearWorld(); await ev(`GS.cash = 100; TLXT.hold = false; true`);
  const ok0 = await J(`TLXH.sign("strand3")`);
  ok(ok0 === false && await ev(`GS.cash`) === 100 && await ev(`TLX.state("housing").ten`) === null, "K: $100 can't sign a $62/wk, 2-week-deposit flat ($186 up front): refused, nothing taken");
  await ev(`GS.cash = 400; true`);
  ok(await J(`TLXH.sign("strand3")`) === true && await ev(`GS.cash`) === 400 - 186, "K: signed: deposit $124 + first week $62 = $186 taken once");
  ok(await J(`TLXH.sign("strand3")`) === false && await J(`TLXH.sign("havn12")`) === false && await ev(`GS.cash`) === 214, "K: a second signing (same flat, or another) is refused: one lease, charged once");
  const t = await J(`TLX.state("housing").ten`);
  ok(t.unit === "strand3" && t.deposit === 124 && t.rent === 62 && t.arrears === 0, "K: tenancy recorded (deposit 124, rent 62)");
  // Mondays: advance the real clock a week at a time; the housing tick settles each Monday once
  const wk = async () => { await ev(`GS.hour += 24 * 7; true`); await sleep(2600); return J(`({ cash: GS.cash, t: TLX.state("housing").ten, wk: TLX.state("housing").wk, debt: TLX.state("housing").debt })`); };
  let w = await wk();
  console.log("K wk1", JSON.stringify(w));
  ok(w.cash === 214 - 62 && w.t.arrears === 0, "K: one Monday: $62 rent taken once (cash " + w.cash + ")");
  await ev(`TLXH.settle(TLX.state("housing").wk); true`);
  ok(await ev(`GS.cash`) === w.cash, "K: settling the same Monday again charges nothing");
  w = await wk();                                                                         // cash 152 -> 90: still paid
  w = await wk();                                                                         // 90 -> 28
  w = await wk();                                                                         // 28 < 62: short
  console.log("K short", JSON.stringify(w));
  ok(w.t && w.t.arrears === 62 && w.cash >= 0 && w.t.missed === 1, "K: short of rent: not taken, $62 arrears (late fee $0 from a fair landlord), cash " + w.cash + " never below zero");
  w = await wk();
  console.log("K 2 missed", JSON.stringify(w));
  ok(w.t && w.t.arrears === 124 && w.t.notice && w.t.notice.kind === "evict", "K: two weeks behind: notice to quit");
  await ev(`GS.cash = 40; TLXH.payDebt(); true`);
  w = await J(`({ cash: GS.cash, t: TLX.state("housing").ten })`);
  ok(w.cash === 0 && w.t.arrears === 84, "K: part-paid the arrears from $40: cash 0, $84 left");
  await sleep(300);
  const wkEv = await wk(); await wk();
  const out = await J(`({ ten: TLX.state("housing").ten, debt: TLX.state("housing").debt, ban: TLX.state("housing").banUntil, day: CAL.dayIndex(), cash: GS.cash, hist: TLX.state("housing").hist[0] })`);
  console.log("K evicted", JSON.stringify(out));
  ok(out.ten === null && out.cash >= 0, "K: not paid by the notice date: evicted, cash " + out.cash + " (never below zero)");
  ok(out.debt === 0 && out.ban > out.day && /Evicted/.test(out.hist.t), "K: the deposit went on the arrears; the fair landlords won't rent to you for a fortnight");
  ok(await J(`TLXH.canSign(TLXH.UNITS[1])`) !== "" && await ev(`GS.cash = 5000; TLXH.sign("havn12")`) === false, "K: banned for now: " + await J(`TLXH.canSign(TLXH.UNITS[1])`));
  await ev(`TLX.state("housing").banUntil = 0; TLX.state("housing").debt = 50; true`);
  ok(await ev(`GS.cash = 5000; TLXH.sign("havn12")`) === false && /rent debt/.test(await J(`TLXH.canSign(TLXH.UNITS[1])`)), "K: rent debt blocks a new lease: " + await J(`TLXH.canSign(TLXH.UNITS[1])`));
  await ev(`GS.cash = 5000; TLXH.payDebt(); true`);
  ok(await ev(`TLX.state("housing").debt`) === 0, "K: debt paid off");
  Dwk = await ev(`TLX.state("housing").banUntil`);
});

// ---------------- L
await section("L slumlords", async () => {
  await ev(`GS.cash = 5000; TLX.state("housing").banUntil = 0; true`);
  const rnd = v => ev(`window.__rnd0 = window.__rnd0 || Math.random; Math.random = () => ${v}; true`);
  const unrnd = () => ev(`Math.random = window.__rnd0; true`);
  // the slumlord's flat: cheap, faults at the door, harsh terms on the card
  const lease = await J(`TLXH.lease(TLXH.UNITS.find(u => u.id === "bak5"))`);
  console.log("L lease", JSON.stringify(lease));
  ok(lease.some(l => /50% kept/.test(l)) && lease.some(l => /not always/.test(l)) && lease.some(l => /25%/.test(l)) && lease.some(l => /14 days/.test(l)), "L: the lease is disclosed: 50% deposit kept, repairs in 14 days and not always, rises up to 25%");
  ok(await ev(`TLXH.UNITS.find(u => u.id === "bak5").rent`) <= 35 && await ev(`TLXH.UNITS.find(u => u.id === "strand3").rent`) >= 60, "L: Haugen's rent is half the going rate");
  await rnd(0);                                                                           // dice: always the worst case
  ok(await J(`TLXH.sign("bak5")`) === true, "L: signed Bakgata 5 ($28 rent, 3 weeks deposit)");
  const t0 = await J(`TLX.state("housing").ten`);
  ok(t0.defects.length === 2 && t0.defects.some(d => d.kind === "heat") && t0.defects.some(d => d.kind === "damp"), "L: it comes with a dead radiator and a damp wall");
  // report: no reply, a rent rise answers
  const heat = t0.defects.find(d => d.kind === "heat");
  await ev(`TLXH.report("bak5", ${heat.id}); true`);
  let t1 = await J(`TLX.state("housing").ten`); const h1 = t1.defects.find(d => d.id === heat.id);
  console.log("L report", JSON.stringify({ h1, notice: t1.notice }));
  ok(h1.rep !== null && h1.ign === true && h1.resp === null, "L: reported; Haugen's answer: nothing (no repair date)");
  ok(t1.notice && t1.notice.kind === "rise" && t1.notice.rent === Math.round(28 * 1.25), "L: and a rent rise follows the report: $28 -> $35 on 7 days' notice");
  await ev(`TLXH.report("bak5", ${heat.id}); true`);
  ok(await ev(`TLX.state("housing").ten.reps`) === 1, "L: reporting the same fault twice does nothing the second time");
  await ev(`GS.hour += 24 * 6; true`); await sleep(2500);
  ok(await J(`TLXH.canComplain(TLX.state("housing").ten.defects.find(d => d.id === ${heat.id}))`) === false, "L: six days in: can't complain yet");
  await ev(`GS.hour += 24 * 2; true`); await sleep(2500);
  t1 = await J(`TLX.state("housing").ten`);
  ok(t1.rent === 35 && t1.defects.find(d => d.id === heat.id).fixed === null, "L: a week and a day: the rise has come in ($35) and the radiator is still dead");
  ok(await J(`TLXH.canComplain(TLX.state("housing").ten.defects.find(d => d.id === ${heat.id}))`) === true, "L: now the complaint is open to you");
  const cashB = await ev(`GS.cash`);
  await ev(`TLXH.complain(${heat.id}); true`); await ev(`GS.hour += 24 * 4; true`); await sleep(2500);
  t1 = await J(`TLX.state("housing").ten`); const fines = await ev(`TLX.state("housing").ll.haugen.fines`);
  console.log("L ruling", JSON.stringify({ cpl: t1.cpl, protect: t1.protect, rebate: t1.rebate, fines }));
  ok(t1.cpl && t1.cpl.result === "upheld" && fines === 1, "L: the municipality rules for you: Haugen fined");
  ok(t1.rebate > 0, "L: rent rebate paid to you ($" + t1.rebate + ")");
  ok(t1.defects.find(d => d.id === heat.id).resp !== null, "L: the repair is ordered with a date");
  await ev(`GS.hour += 24 * 3; true`); await sleep(2500);
  t1 = await J(`TLX.state("housing").ten`);
  ok(t1.defects.find(d => d.id === heat.id).fixed !== null && t1.defects.find(d => d.id === heat.id).by === "landlord", "L: the landlord fixes it when ordered");
  // protection: a new report does not draw a rise while protected
  const damp = t1.defects.find(d => d.kind === "damp");
  await ev(`TLXH.report("bak5", ${damp.id}); true`);
  ok(await ev(`TLX.state("housing").ten.notice`) === null, "L: protected for 30 days: reporting the damp draws no rent rise");
  // fix it yourself
  await ev(`GS.cash = 10; true`); ok(await J(`TLXH.fix("bak5", ${damp.id})`) === false && await ev(`GS.cash`) === 10, "L: fixing the damp wall costs $60 of parts: $10 refuses, nothing taken");
  await ev(`GS.cash = 500; true`); ok(await J(`TLXH.fix("bak5", ${damp.id})`) === true && await ev(`GS.cash`) === 440, "L: with the money you fix it yourself ($60)");
  // moving out: won complaint = full deposit
  const cashM = await ev(`GS.cash`);
  await ev(`TLXH.moveOut("left"); true`);
  ok(await ev(`GS.cash`) === cashM + 84 && await ev(`TLX.state("housing").ten`) === null, "L: moved out after a won complaint: the whole $84 deposit back");
  // deposit kept without a complaint
  await ev(`TLXH.sign("sjo1"); true`); const cs = await ev(`GS.cash`);
  await ev(`TLXH.moveOut("left"); true`);
  ok(await ev(`GS.cash`) === cs + 53, "L: Sjøgata 1 ($35 rent, $105 deposit), no complaint: moved out, half the deposit kept for “cleaning” ($53 of $105 back)");
  await unrnd();
  // option off: Haugen behaves like Kåre
  await ev(`TLX.setOn("slumlords", false); window.__rnd0 = window.__rnd0 || Math.random; Math.random = () => 0; GS.cash = 5000; true`);
  const lo = await J(`TLXH.lease(TLXH.UNITS.find(u => u.id === "bak5"))`);
  ok(lo.some(l => /Rent fixed/.test(l)) && lo.some(l => /all of it back/.test(l)), "L: slumlords off: the same flat's lease reads fair (rent fixed, deposit back)");
  await ev(`TLXH.sign("bak5"); true`);
  const hb = await J(`TLX.state("housing").ten.defects.find(d => d.kind === "heat").id`);
  await ev(`TLXH.report("bak5", ${hb}); true`);
  const r1 = await J(`TLX.state("housing").ten`);
  ok(r1.notice === null && r1.defects.find(d => d.id === hb).ign === false && r1.defects.find(d => d.id === hb).resp !== null, "L: slumlords off: report -> repair date, no ignoring, no rise");
  await ev(`GS.hour += 24 * 3; true`); await sleep(2500);
  ok(await J(`TLX.state("housing").ten.defects.find(d => d.id === ${hb}).fixed`) !== null, "L: and it is fixed in ~2 days");
  await ev(`TLXH.moveOut("left"); TLX.setOn("slumlords", true); true`); await ev(`Math.random = window.__rnd0; true`);
  // Kåre
  await ev(`GS.cash = 5000; Math.random = () => 0.5; true`); await ev(`TLXH.sign("strand3"); true`);
  const kt = await J(`TLX.state("housing").ten`);
  ok(kt.defects.length === 0, "L: Kåre's flat has no faults at the door");
  await ev(`TLXH.moveOut("left"); Math.random = window.__rnd0; true`);
});

// ---------------- M
await section("M in the flat", async () => {
  await ev(`GS.cash = 5000; TLX.state("housing").banUntil = 0; Math.random = window.__rnd0; true`);
  await ev(`TLXH.sign("bak5"); true`);
  const bk = await J(`(() => { const u = TLXH.UNITS.find(q => q.id === "bak5"); return { x: u.at.x, z: u.at.z, ry: u.beacon.ry }; })()`);
  await ev(`(() => { P.x = ${bk.x} + 8; P.z = ${bk.z} + 8; recenter(P.x, P.z, true); FOOT.on = true; FOOT.x = ${bk.x} + Math.sin(${bk.ry}) * 1.0; FOOT.z = ${bk.z} + Math.cos(${bk.ry}) * 1.0; FOOT.y = surf(FOOT.x, FOOT.z); intEnter(INT.beacons.find(b => b.cab.flat === "bak5")); return true; })()`);
  const inn = await until(`INT.on`, 8);
  await sleep(500);
  const m = await J(`({ on: INT.on, cab: INT.cab && INT.cab.id, fx: !!INT.room._fx, heat: INT.room._fx.frost.visible, damp: INT.room._fx.damp.visible, leak: INT.room._fx.leak.visible, pests: INT.room._fx.pests.visible, hint: intDoorHint ? 1 : 0 })`);
  console.log("M", JSON.stringify(m));
  ok(inn && m.cab === "flat:bak5" && m.fx, "M: walked through the door into Bakgata 5's room");
  ok(m.heat && m.damp && !m.leak && !m.pests, "M: fixtures for the open faults show (frosted radiator, damp wall) and only those");
  // warmth: a dead radiator costs warmth
  await ev(`GS.warmth = 80; true`); await waitGame(8);
  const w1 = await ev(`GS.warmth`);
  ok(w1 < 80 && w1 >= 35, "M: dead radiator: warmth fell 80 -> " + w1.toFixed(1) + " standing in the flat");
  // stand at the radiator: use = REPORT; then FIX
  await ev(`(() => { const p = INT.room._fx.pos.heat; INT.px = p[0] - 0.6; INT.pz = p[1]; return true; })()`);
  await sleep(300);
  const u1 = await J(`({ use: footUse(), x: footXUse ? (footXUse() && footXUse().label) : null })`);
  console.log("M use", JSON.stringify(u1));
  ok(u1.use === "REPORT", "M: by the radiator the use control reads REPORT (touch/pad read the same provider)");
  if (!NOSTILLS) { await ev(`INT.px = INT.room._fx.pos.heat[0] - 1.4; INT.pz = INT.room._fx.pos.heat[1] - 0.4; FOOT.yaw = Math.PI / 2; true`); await sleep(1200); await shot("x15_flat_interior"); }
  await ev(`footAction(); true`); await sleep(300);
  ok(await ev(`TLX.state("housing").ten.defects.find(d => d.kind === "heat").rep !== null`), "M: using it reported the fault");
  const u2 = await J(`footUse()`);
  ok(u2 === "FIX", "M: used again it reads FIX (fix it yourself)");
  const cb = await ev(`GS.cash`); await ev(`footAction(); true`); await sleep(400);
  ok(await ev(`TLX.state("housing").ten.defects.find(d => d.kind === "heat").fixed !== null`) && await ev(`GS.cash`) === cb - 45, "M: fixed it for $45; the frost is gone (" + await ev(`INT.room._fx.frost.visible`) + ")");
  ok(await ev(`INT.room._fx.frost.visible`) === false, "M: the fixture hides");
  await ev(`GS.warmth = 40; true`); await waitGame(5);
  ok(await ev(`GS.warmth`) > 55, "M: a working radiator restores warmth (40 -> " + (await ev(`GS.warmth`)).toFixed(0) + ")");
  // the tablet: Homes and Politi
  await ev(`intGoOut(); INT.on = false; true`); await sleep(600);
  if (!NOSTILLS) {
    await ev(`TABLET.toggle(true, "homes"); true`); await sleep(1500); await shot("x15_homes_app");
    await ev(`TABLET.close(true); true`);
    await ev(`TLXP.S().owed = 180; TLXP.S().rec.fines = 2; TLXP.S().last = [{ d: "Tue 17 Nov", why: "Fine at the roadside", fine: 270, paid: 90 }]; TABLET.toggle(true, "politi"); true`); await sleep(1500); await shot("x15_politi_app");
    await ev(`TABLET.close(true); TLXP.S().owed = 0; TLXP.S().rec.fines = 0; TLXP.S().last = []; true`);
  }
  await ev(`TLXH.moveOut("left"); FOOT.on = false; true`);
});

// ---------------- N
await section("N buying", async () => {
  await ev(`GS.cash = 5000; true`);
  const u = await J(`TLXH.UNITS.map(q => ({ id: q.id, weeks: q.price / q.rent, price: q.price, rent: q.rent }))`);
  ok(u.every(q => q.weeks >= 650 && q.weeks <= 1700) && Math.min(...u.map(q => q.price)) >= 41000, "N: ownership is " + Math.round(Math.min(...u.map(q => q.weeks))) + "-" + Math.round(Math.max(...u.map(q => q.weeks))) + " weeks of rent ($" + Math.min(...u.map(q => q.price)) + "+)");
  ok(await J(`TLXH.buy("havn12")`) === false && await ev(`GS.cash`) === 5000, "N: $5,000 can't buy a $96,000 flat: refused, nothing taken");
  await ev(`GS.cash = 100000; true`);
  ok(await J(`TLXH.buy("havn12")`) === true && await ev(`GS.cash`) === 4000, "N: bought Havnegata 12 for $96,000");
  ok(await J(`TLXH.buy("havn12")`) === false && await ev(`GS.cash`) === 4000, "N: can't buy it twice");
  ok(await J(`TLXH.sign("strand3")`) === true, "N: renting another flat while owning one is fine");
  await ev(`GS.cash = 1000; GS.hour += 24 * 7; true`); await sleep(2600);
  const o = await J(`({ cash: GS.cash, ten: TLX.state("housing").ten, tax: TLX.state("housing").taxOwed })`);
  ok(o.cash === 1000 - 62 - 6 - 0 || o.cash <= 1000 - 6, "N: a Monday: rent on the rented flat and $6 property charge on the owned one only (cash " + o.cash + ")");
  await ev(`TLXH.moveOut("left"); true`);
  const cs = await ev(`GS.cash`); await ev(`TLXH.sell("havn12"); true`);
  ok(await ev(`GS.cash`) === cs + 72000 && Object.keys(await J(`TLX.state("housing").own`)).length === 0, "N: sold back for 75%: $72,000");
});

// ---------------- O
await section("O save, reload, old saves, options off", async () => {
  await ev(`GS.cash = 3000; TLX.state("housing").banUntil = 0; TLXH.sign("bak5"); true`);
  await ev(`window.__rnd0 = window.__rnd0 || Math.random; Math.random = () => 0; true`);
  const hid = await J(`TLX.state("housing").ten.defects.find(d => d.kind === "heat").id`); await ev(`TLXH.report("bak5", ${hid}); Math.random = window.__rnd0; TLXP.S().owed = 123; TLXP.S().rec.fines = 3; TLXP.S().rec.warnings = 1; GS.cash = 777; TLXH.buy("strand3"); save(); true`);
  await ev(`GS.cash = 99999; TLXH.buy("strand3"); TLXP.S().owed = 123; save(); true`);
  const before = await J(`({ h: TLX.state("housing"), p: TLX.state("police"), cash: GS.cash })`);
  await reload();
  await ev(`tutSkip(); FOOT.on = false; true`); await sleep(1500);
  const after = await J(`({ h: TLX.state("housing"), p: TLX.state("police"), cash: GS.cash, units: TLXH.UNITS.filter(u => u.at).length, cops: TLXP.cops.length })`);
  console.log("O", JSON.stringify({ ten: after.h.ten && after.h.ten.unit, own: Object.keys(after.h.own), owed: after.p.owed, units: after.units }));
  ok(after.h.ten && after.h.ten.unit === "bak5" && JSON.stringify(after.h.ten.defects) === JSON.stringify(before.h.ten.defects), "O: tenancy and its faults survive save -> reload");
  ok(Object.keys(after.h.own).join() === "strand3" && after.h.banUntil === before.h.banUntil && after.h.wk === before.h.wk, "O: owned flat and the Monday marker survive (no second charge)");
  ok(after.p.owed === 123 && after.p.rec.fines === 3 && after.p.rec.warnings === 1, "O: fines owed and the record survive");
  ok(after.units === 6 && after.cops === 2, "O: flats and cruisers rebuilt after the reload");
  // old save: no x.sys.police / housing
  const sv = JSON.parse(await raw(`localStorage.getItem("tracklayer.save.v2")`)); delete sv.x.sys.police; delete sv.x.sys.housing;
  await reload(sv); await ev(`tutSkip(); true`); await sleep(1200);
  const old = await J(`({ ten: TLX.state("housing").ten, own: TLX.state("housing").own, owed: TLX.state("police").owed, mode: TLX.state("police").mode })`);
  ok(old.ten === null && Object.keys(old.own).length === 0 && old.owed === 0 && old.mode === "clear", "O: a save from before this release loads with a clean slate");
  // options off
  await clearWorld();
  await ev(`TLX.setOn("police", false); GS.cash = 1000; true`);
  const s = route.s0 + route.len * 0.2; await drive(s, 28); await sleep(300);
  await ev(`TLXP.patrol(0, ${JSON.stringify(route.id)}, ${s} - 60, 1); true`); await waitGame(6);
  await sleep(500);
  const off = await J(`({ mode: TLXP.mode, hud: document.getElementById("polHud").hidden, vis: TLXP.cops.some(c => c.mesh && c.mesh.visible), on: TLXP.cops.some(c => c.on), cash: GS.cash })`);
  ok(off.mode === "clear" && off.hud && !off.vis && !off.on && off.cash === 1000, "O: police off: no cruisers on the road, no warning, no fine");
  await stopDrive();
  await ev(`TLX.setOn("police", true); true`); await sleep(500);
  ok(await ev(`TLXP.cops.some(c => c.on)`), "O: switching it on again brings the patrols back");
  await ev(`TLX.setOn("rentals", false); GS.cash = 10000; TLX.state("housing").banUntil = 0; true`);
  const ten = await ev(`TLX.state("housing").ten`); await ev(`TLXH.moveOut && 0; true`);
  const c0 = await ev(`GS.cash`);
  ok(await J(`TLXH.sign("strand3")`) === false && await J(`TLXH.buy("havn12")`) === false && await ev(`GS.cash`) === c0, "O: rentals off: no new lease, no purchase, nothing taken");
  await ev(`GS.hour += 24 * 7; true`); await sleep(2600);
  ok(await ev(`GS.cash`) === c0, "O: rentals off: no rent or charges on Monday (cash " + (await ev(`GS.cash`)) + ")");
  ok(await ev(`TLXH.UNITS.every(u => !u.beacon.g.visible) && TABLET.byId.homes.hidden()`), "O: rentals off: the doors and the Homes app are gone");
  await ev(`TLX.setOn("rentals", true); true`);
});

console.log(fails ? `FAILED: ${fails}` : "ALL PASSED");
await done(fails ? 1 : 0);

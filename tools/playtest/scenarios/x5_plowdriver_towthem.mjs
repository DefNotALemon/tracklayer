// Expansion slice 5.4c2b2a: TOW THEM: your own tow rope on a bogged plow driver's truck (tlx-plow.js v33).
// Asserts, exit 1 on a failure.
//   A a driver bogs out of your sight. You drive up in the pickup: the lane behind the bogged truck is cut (there is a
//     road to drive up). With the pickup too far off the use control at the towing eye says so; tail to tail within
//     reach it is HOOK ON (keyboard, a pad, touch all name their own control), a rope lies between the two trucks.
//     Driving off with the keys takes up the slack, then the bogged truck comes along the road no faster than
//     PDR.tow.v and your truck no faster than it; 10 m and they are out, the rope is gone, they plow on. A tow paid
//     for before is called off.
//   B the slack taken up too fast is a snatch (a dead stop, a word); a pull across the road moves nothing; UNHOOK on a
//     pad at your own truck's end; HOOK ON by the touch button; on the sled the rope stays on the two trucks and pulls
//     nothing; with no truck of yours near there is no rope to hook (the hail instead); a truck its driver walked home
//     from is not towed; a reload finds no rope.
//   C from the NOSE, on through the drift, with another driver on the way to help: out, the truck plows on from where
//     it was pulled to, the helper turns round.
// Stills (OUT): t1 roped (slack), t2 the pull, t3 out.
import { boot, ev, sleep, done, reload, shot, park, tap, down, up, padSet } from "../lib.mjs";
let fails = 0; const FAILED = []; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) { fails++; FAILED.push(m); } };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const NOSTILLS = !!process.env.NOSTILLS;
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };

const SETUP = `TLXPL.PDR.wayMax = 0; tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
const KIT = `(() => {
  window.__rt = id => TLXR.routes.find(r => r.id === id);
  window.__q = (h, st) => { st = st || 0.5; for (let t = 0; t < h - 1e-6; t += st) { GS.hour += Math.min(st, h - t); TLX.state("roads").h = GS.hour; TLXPL.con.step(); } return true; };
  window.__pdr = id => { const q = TLX.state("plow").pdr[id]; return q ? JSON.parse(JSON.stringify(q)) : null; };
  window.__drv = (id, work, xp, hap) => { const m = TLX.staff.at("plow:" + id); m.tr.work = work; m.tr.temper = 0; m.xpReal = xp; m.hap = hap; m.mood = 0; m.wage = TLX.staff.fair(m); m.paidTo = GS.hour; return TLXPL.pdr.skill(m, id); };
  window.__clean = id => { TLXR.setSnow(id, 0); const c = TLX.state("plow").con[id]; c.strikes = 0; c.cover = false; c.due = {}; c.clean = true; TLXPL.con.step(); return true; };
  window.__me = (x0, z0) => { crashCancel(); FOOT.on = false; if (VEH.cur) TLXV.swapTo(null); let x = x0, z = z0;
    const wet = (a, b) => isSea(a, b) || isWater(a, b) || isSea(a + 3, b) || isWater(a - 3, b) || isWater(a, b + 3) || isWater(a, b - 3);
    scan: for (let r = 0; r < 120; r += 4) for (let a = 0; a < 6.28; a += 0.4) { const u = x0 + Math.cos(a) * r, v = z0 + Math.sin(a) * r; if (!wet(u, v)) { x = u; z = v; break scan; } }
    P.x = x; P.z = z; P.y = surf(x, z) + 0.2; P.vx = P.vz = P.vy = 0; recenter(x, z, true); return true; };
  // you at the wheel of truck uid, at x, z, nosed along yaw
  window.__tr = (uid, x, z, yaw) => { crashCancel(); FOOT.on = false; if (FOOT.g) FOOT.g.visible = false; if (TLXV.state().cur !== uid) TLXV.swapTo(uid);
    P.x = x; P.z = z; P.yaw = yaw; P.y = surf(x, z) + 0.25; P.vx = P.vz = P.vy = 0; if (P.wy !== undefined) P.wy = 0; P.safe = { x, z, yaw }; recenter(x, z, true); return true; };
  // the same, on the road id at s metres along it, off m right of the crown, facing along it (dir 1) or back (dir -1)
  window.__trRoad = (uid, id, s, off, dir) => { const p = TLXPL.pdr.pt(__rt(id), s); return __tr(uid, p.x - p.tz * off, p.z + p.tx * off, Math.atan2(p.tx * dir, p.tz * dir)); };
  // you on foot at x, z, whatever you drove left where it stands
  window.__afoot = (x, z) => { FOOT.on = true; FOOT.g.visible = true; FOOT.x = x; FOOT.z = z; FOOT.y = surf(x, z); FOOT.sp = 0; P.vx = P.vz = 0; recenter(x, z, true); return true; };
  window.__in = () => { FOOT.on = false; if (FOOT.g) FOOT.g.visible = false; return true; };
  const V3 = () => new THREE.Vector3();
  // the towing eyes: of the truck bogged on road id, and of the truck you drive
  window.__eyes = id => { const Z = TLXPL.pdr.seen.get(id), R = TLXV.rt(), o = { b: null, m: null }; const f = v => ({ x: v.x, y: v.y, z: v.z });
    if (Z && Z.R) { Z.R.grp.updateMatrixWorld(true); o.b = { tail: f(TLXPL.pdr.hook(Z.R, false, V3())), nose: f(TLXPL.pdr.hook(Z.R, true, V3())), x: Z.x, z: Z.z, yaw: Z.yaw, tw: Z.tw || 0, tx: Z.tx, tz: Z.tz, cb: Z.cb, s: Z.s, vis: Z.R.grp.visible }; }
    if (R && R.body) { R.grp.updateMatrixWorld(true); o.m = { tail: f(TLXPL.pdr.hook(R, false, V3())), nose: f(TLXPL.pdr.hook(R, true, V3())) }; }
    return o; };
  window.__tw = () => { const T = TLXPL.pdr.tw, k = T.ropeK; return { id: T.id, uid: T.uid, mf: T.mf, tf: T.tf, taut: T.taut, along: T.along, slack: T.slack, rope: !!T.rope && !!T.rope.parent, ropeL: T.ropeL, low: T.ropeLow, rk: T.rope && k ? k.slice() : null, sn: T.snatches, terr: TLXPL.pdr.sx.terr || null, err: TLXPL.pdr.sx.err }; };
  window.__ropes = () => { let n = 0; scene.traverse(o => { if (o.isMesh && o.geometry && o.geometry.type === "TubeGeometry" && o.material && o.material.color && o.material.color.getHex() === 0xc8962e) n++; }); return n; };
  window.__dep = (id, s, off) => { const p = TLXPL.pdr.pt(__rt(id), s), x = p.x - p.tz * off, z = p.z + p.tx * off; return surf(x, z) - groundAt(x, z); };
  if (!window.__rh) window.__rh = setInterval(() => { try { TLX.state("roads").h = GS.hour; const q = TLX.state("plow").pdr.dyfjord; if (q && q.st === "stuck" && q.sk > 1) q.sk = 1; } catch (e) { } }, 30);   /* and nobody walks home mid-test */
  if (!window.__camHk) { window.__camHk = true; const rr = renderer.render.bind(renderer); renderer.render = (sc, cam) => { const o = window.__cam; if (o && sc === scene) { cam.position.set(o.x, o.y, o.z); cam.lookAt(o.tx, o.ty, o.tz); cam.updateMatrixWorld(); } rr(sc, cam); }; }
  // a camera beside the midpoint of the bogged truck and yours
  window.__look = (id, dist, h) => { const A = TLXPL.pdr.seen.get(id); if (!A) { window.__cam = null; return false; }
    const mx = (A.x + P.x) / 2, mz = (A.z + P.z) / 2; let dx = P.x - A.x, dz = P.z - A.z; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    const cx = mx - dz * dist, cz = mz + dx * dist; window.__cam = { x: cx, z: cz, y: Math.max(surf(cx, cz), surf(mx, mz)) + h, tx: mx, ty: surf(mx, mz) + 1.1, tz: mz }; return true; };
  return true; })()`;
const clearNotes = () => ev(`TABLET.log.length = 0; true`);
const notes = () => J(`TABLET.log.map(n => n.title + " | " + n.body)`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80); return true; })()`);
const toasts = async () => { await sleep(300); return J(`window.__tsaw || []`); };
const use = () => J(`({ use: footUse(), hint: $("wnHint").textContent, hid: $("wnHint").hidden })`);

await boot();
await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 90000; GS.lic = GS.lic || {}; GS.lic.freight = true; true`);
const ids = await J(`TLXPL.con.routes().map(r => r.id)`);
const RID = "dyfjord", HID = ids.find(i => i !== RID), rid = JSON.stringify(RID), hid = JSON.stringify(HID);
const TW = await J(`TLXPL.PDR.tow`);
console.log("   roads", JSON.stringify(ids), "| tow", JSON.stringify(TW));
const pdr = (id = RID) => J(`__pdr(${JSON.stringify(id)})`);
const eyes = () => J(`__eyes(${rid})`);
const tw = () => J(`__tw()`);
const km = v => ev(`TLXPL.PDR.bog.km = ${v}; true`);
const still = async (name, dist = 11, h = 3.2) => { if (NOSTILLS) return; await ev(`__look(${rid}, ${dist}, ${h})`); await sleep(500); await shot(name); await ev(`window.__cam = null; true`); };
let I = 1, UID = "", uid = "", FIRST = "";
const hire = async (road, kit) => {
  const r = JSON.stringify(road);
  await ev(`TLXPL.PDR.mine = ${kit === "mine" ? 1 : 0}; (() => { const m = TLX.staff.at("plow:" + ${r}); if (m) TLX.staff.letGo(m.id); TLXPL.con.step(); return true; })()`); await sleep(200);
  const id = await ev(`(() => { const S = TLX.state("staff"); S.apps = S.apps.filter(a => a.place !== "plow:" + ${r}); const a = TLX.staff.post({ id: "plow:" + ${r}, role: "plowdriver" }); a.tr.honest = true; a.xp = a.xpReal = 10; a.exp = GS.hour + 400; return a.id; })()`);
  const h = await ev(`TLX.staff.hire(${JSON.stringify(id)})`);
  await ev(`__drv(${r}, 1, 10, 70); TLXPL.con.step(); true`); await sleep(300);
  return h === true;
};
const setOut = async v => { await ev(`TLXR.setSnow(${rid}, ${v}, ${I}); TLXPL.con.step(); true`); await ev(`__q(0.74, 0.37)`); let q = await pdr(); for (let n = 0; n < 8 && q.st === "home"; n++) { await ev(`__q(0.1, 0.1)`); q = await pdr(); } return q; };
const until = async (pred, hrs = 1.2, id = RID) => { let q = await pdr(id); for (let t = 0; t < hrs && !pred(q); t += 0.04) { await ev(`__q(0.04, 0.02)`); q = await pdr(id); } return q; };
let FAR = null;
const far = async () => { if (!FAR) { await ev(`crashCancel(); FOOT.on = false; true`); FAR = await park("P.x + 2500", "P.z + 2500"); console.log("   far:", JSON.stringify(FAR)); } return ev(`__me(${FAR.x}, ${FAR.z})`); };
const bogNow = async () => { await far(); await ev(`__clean(${rid}); __clean(${hid}); __drv(${rid}, 1, 10, 70); true`); await ev(`__q(1.6, 0.1)`); await km(1e9); const q0 = await setOut(0.9); const q = q0.st === "stuck" ? q0 : await until(q => q.st === "stuck" || q.st === "home"); await km(0); return q; };
const home = async () => { await far(); await km(0); await ev(`__q(3, 0.1)`); const q = await until(q => q.st === "home", 2); const h = await until(q => q.st === "home" && !q.aid, 2, HID); return q.st === "home" && h.st === "home" && !h.aid; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const d3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const waitFor = async (f, pred, ms = 15000) => { let R = null; for (let t = 0; t <= ms; t += 150) { R = await f(); if (pred(R)) return R; await sleep(150); } console.log("   (deadline passed, last", JSON.stringify(R).slice(0, 240) + ")"); return R; };
// the pickup put tail to the bogged truck's tail (end "tail") or nose to its nose ("nose"), the two eyes `gap` m apart
const lineUp = async (end, gap) => {
  const q = await pdr(), sgn = end === "tail" ? -1 : 1;
  let s = q.p + sgn * 14;
  for (let n = 0; n < 4; n++) {
    await ev(`__trRoad(${uid}, ${rid}, ${s}, 1.9, ${sgn})`); await sleep(500);   /* tail pull: nosed back down the road; nose pull: nosed on up it */
    const E = await eyes(), d = d3(E.m.tail, E.b[end]);
    if (Math.abs(d - gap) < 0.25) return d;
    s -= sgn * (d - gap);
  }
  const E = await eyes(); return d3(E.m.tail, E.b[end]);
};
// you on foot 1 m beyond an eye of a truck (away from that truck's middle)
const standAtEye = (e, mid, by = 1.0) => { const L = Math.hypot(e.x - mid.x, e.z - mid.z) || 1; return ev(`__afoot(${e.x + (e.x - mid.x) / L * by}, ${e.z + (e.z - mid.z) / L * by})`); };

await section("A bogged unseen: the cut behind it, the rope, the pull with the keys", async () => {
  await ev(`TLXV.buy("plowtruck"); TLXV.buy("pickup"); true`); await sleep(600);   /* the plow truck only so the kommune signs with you; the pickup does the towing */
  UID = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`); uid = JSON.stringify(UID);
  await ev(`TLXPL.con.sign(${rid}); TLXPL.con.sign(${hid}); TLX.staff.tick(); true`); await sleep(300);
  I = await ev(`(() => { const r = __rt(${rid}); for (let i = 1; i < r.seg.length - 1; i++) if (r.seg[i].legs.length && (i + 1) * 400 + 40 <= r.len) return i; return -1; })()`);
  ok((await hire(RID, "own")) && (await hire(HID, "own")), "a driver with their own truck on each road");
  FIRST = await ev(`String(TLX.staff.at("plow:" + ${rid}).name).split(" ")[0]`);
  await clearNotes();
  let q = await bogNow(); ok(q.st === "stuck", `${FIRST} is bogged out of your sight, ${Math.round(q.p)} m along (stretch ${I} begins at ${I * 400})`);
  ok((await notes()).some(s => / is stuck \| .*pull them out yourself: your tow rope hooks on at either end/.test(s)), "the ping names the third way out");
  ok((await ev(`TLXPL.pdr.tow(${rid})`)) === true && (await pdr()).tow > 0, "a tow is paid for (it will be called off)");
  await ev(`TLX.state("plow").pdr[${rid}].tow = 50; true`);                        /* (a game hour is under a minute: the test must be the one to get there first) */
  const cash0 = await ev(`GS.cash`);
  // drive up: the pickup on the clean road just short of the stretch
  const sA = Math.max(I * 400 + 6, q.p - 60), sB = q.p - 12;
  const d0 = await J(`(() => { __trRoad(${uid}, ${rid}, ${Math.max(20, I * 400 - 25)}, 1.6, 1); return [__dep(${rid}, ${sA}, 1.6), __dep(${rid}, ${sB}, 1.6), __dep(${rid}, ${sB}, 2.6)]; })()`);
  const E0 = await waitFor(eyes, E => E.b && E.b.cb >= q.p - 1.01, 30000);
  await sleep(600);
  const d1 = await J(`[__dep(${rid}, ${sA}, 1.6), __dep(${rid}, ${sB}, 1.6), __dep(${rid}, ${sB}, 2.6)]`);
  console.log("   snow in the lane behind it, m: before", d0.map(v => v.toFixed(2)).join(" "), "| after", d1.map(v => v.toFixed(2)).join(" "), "| cut laid to", E0.b && E0.b.cb);
  ok(d0.every(v => v > 0.25), "out of your sight nothing was cut: the lane behind the bogged truck lay under snow");
  ok(d1.every(v => v < 0.16), "as you come up, its own cut is there behind it: a lane to drive up and to pull it back onto");
  // too far off: the eye says so
  let E = await eyes();
  await standAtEye(E.b.tail, E.b); await sleep(400);
  let u = await use(); console.log("   too far:", JSON.stringify(u));
  ok(u.use === "TOW ROPE" && /bring your Fjellvogn within 7 m of this end/.test(u.hint), "with the pickup far down the road the towing eye says to bring it within reach");
  await clearToasts(); await tap("KeyE", 90);
  ok((await toasts()).some(x => /Your tow rope is 8 m\. Bring your Fjellvogn within 7 m/.test(x)) && (await tw()).id === null, "the use control then explains, and hooks nothing");
  // on the sled: no rope to hook, the hail instead
  await ev(`__in()`);
  const dG = await lineUp("tail", 5); E = await eyes();
  console.log("   lined up: eyes", dG.toFixed(2), "m apart | bogged", JSON.stringify({ x: E.b.x, z: E.b.z, yaw: E.b.yaw }));
  ok(dG > 4 && dG < 6.2, `the pickup stands tail to tail, the towing eyes ${dG.toFixed(1)} m apart`);
  const mid = { x: (E.b.x + E.b.tail.x) / 2 - E.b.tz * 14, z: (E.b.z + E.b.tail.z) / 2 + E.b.tx * 14 };
  await ev(`__afoot(${mid.x}, ${mid.z})`); await sleep(400); u = await use();
  ok(u.use === "HAIL", "14 m to the side of it the use control is still the hail (" + u.use + ")");
  await standAtEye(E.b.tail, E.b, 0.9); await sleep(400); u = await use(); console.log("   at the eye:", JSON.stringify(u));
  ok(u.use === "HOOK ON" && new RegExp("^E: hook your tow rope to " + FIRST + "'s truck").test(u.hint), "at the bogged truck's tail the use control is HOOK ON, and the hint names the key");
  await padSet({}); await sleep(300); await padSet({ 0: 1 }); await sleep(120); await padSet({}); await sleep(400);
  u = await use();
  ok(u.use === "HOOK ON" && /: hook your tow rope to /.test(u.hint) && !/^E: /.test(u.hint), "on a pad the hint names the pad's control: " + u.hint);
  await ev(`window.__fakePad = null; SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(800);
  const tb = await J(`(() => { const b = $("tcUse"); return { txt: b.textContent, shown: !b.hidden && getComputedStyle(b).display !== "none", hint: $("wnHint").textContent }; })()`);
  ok(/HOOK ON/.test(tb.txt) && tb.shown && /tap/i.test(tb.hint), "touch: the use button wears HOOK ON and the hint says tap (" + JSON.stringify(tb) + ")");
  await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; true`); await sleep(400);
  await clearToasts(); await tap("KeyE", 90); await sleep(500);
  let T = await tw(); E = await eyes(); console.log("   hooked:", JSON.stringify(T));
  ok(T.id === RID && T.uid === UID && !T.mf && !T.tf && (await toasts()).some(x => new RegExp("Rope on: the tail of your Fjellvogn to the tail of " + FIRST + "'s truck").test(x)), "the use key hooks on: tail to tail, and says so");
  ok(T.rope && (await ev(`__ropes()`)) === 1 && T.rk && Math.hypot(T.rk[0] - E.m.tail.x, T.rk[2] - E.m.tail.z) < 0.3 && Math.hypot(T.rk[3] - E.b.tail.x, T.rk[5] - E.b.tail.z) < 0.3, "one rope, from your truck's towing eye to theirs");
  ok(T.low > -0.005 && T.slack > 1.5 && !T.taut, `it lies slack between them (${T.slack.toFixed(1)} m to spare), on the snow and never under it (lowest ${T.low.toFixed(3)} m over the top)`);
  ok(/Your rope is on/.test(await ev(`TLXPL.pdr.say(${rid})`)), "the driver, hailed, speaks of your rope");
  u = await use(); ok(u.use === "UNHOOK", "at the eye the use control is now UNHOOK");
  await still("t1_roped");
  // the pull
  await ev(`__in()`); await sleep(300);
  const l0 = await ev(`TLXPL.hint()`); console.log("   driving hint:", l0);
  ok(new RegExp("^TOW ROPE on " + FIRST + "'s truck · \\d\\.\\d m of slack").test(l0), "at the wheel the driving hint is the rope's: how much slack");
  const B0 = E.b; await clearToasts(); await clearNotes();
  let maxD = 0, maxV = 0, sawLine = false, last = null, shotDone = false, twMax = 0, outV = 0;
  await down("KeyW");
  for (let t = 0; t < 90000; t += 200) {
    await sleep(200);
    const R = await J(`(() => { const e = __eyes(${rid}), T = __tw(), q = TLX.state("plow").pdr[${rid}]; return { st: q.st, tw: e.b ? e.b.tw : null, b: e.b ? { x: e.b.x, z: e.b.z, yaw: e.b.yaw } : null, d: e.b && e.m ? Math.hypot(e.m.tail.x - e.b.tail.x, e.m.tail.z - e.b.tail.z) : 0, taut: T.taut, v: Math.hypot(P.vx, P.vz), line: TLXPL.hint(), sn: T.sn, id: T.id }; })()`);
    if (R.st !== "stuck") { last = last || R; break; }
    last = R; twMax = Math.max(twMax, Math.abs(R.tw || 0));
    if (R.id) maxD = Math.max(maxD, R.d);
    if (R.taut) { maxV = Math.max(maxV, R.v); if (/TOW ROPE tight · .* has come \d+\.\d of 10 m/.test(R.line)) sawLine = true; if (!shotDone && Math.abs(R.tw) > 4) { shotDone = true; await still("t2_pull"); } }
  }
  await up("KeyW");
  q = await pdr(); T = await tw();
  const moved = last && last.b ? (last.b.x - B0.x) * -B0.tx + (last.b.z - B0.z) * -B0.tz : 0;
  console.log(`   pull: tw ${twMax.toFixed(2)} m, the truck came back ${moved.toFixed(2)} m, eyes at most ${maxD.toFixed(2)} m apart, your speed on the tight rope at most ${maxV.toFixed(2)} m/s, snatches ${T.sn}, yaw ${B0.yaw.toFixed(3)} -> ${last && last.b ? last.b.yaw.toFixed(3) : "?"}`);
  ok(q.st === "out" && q.bogI === I, "pulled 10 m: the driver is out and plowing on (no second bog in that stretch)");
  ok(twMax > 9 && moved > 8, `the bogged truck came back ${moved.toFixed(1)} m along the road, onto its cut`);
  ok(maxD < TW.len + 1.3, `your truck never left the rope (eyes at most ${maxD.toFixed(2)} m apart, the rope is ${TW.len})`);
  ok(maxV < TW.v + 0.9, `and on the tight rope it went no faster than the truck it pulled (${maxV.toFixed(2)} m/s; they come at ${TW.v})`);
  ok(sawLine, "the driving hint counted the metres");
  ok(T.id === null && !T.rope && (await ev(`__ropes()`)) === 0, "the rope is off and gone");
  const ts = await toasts(), ns = await notes();
  ok(ts.some(x => new RegExp(FIRST + " is out\\. They unhook your rope").test(x)), "a word at the truck: out, the rope unhooked for you");
  ok(ns.some(s => / is moving again \| You pulled their truck out of the drift.*The tow truck you had paid for was called off/.test(s)), "the notification: you pulled them out, the paid tow is called off");
  ok(q.tow === 0 && (await ev(`GS.cash`)) === cash0, "no tow is coming any more, and nothing was refunded");
  ok(T.terr === null && T.err === null, "nothing thrown");
  await sleep(2500); await still("t3_out");
  const E2 = await eyes();
  ok(E2.b && Math.abs(E2.b.tw) < Math.abs(last.tw || 10) - 1, "free, the truck eases forward again toward where it plows on from");
  await ev(`__in()`);
  ok(await home(), "everyone home");
});

await section("B the snatch, a pull across the road, unhook, the sled, an abandoned truck, a reload", async () => {
  let q = await bogNow(); ok(q.st === "stuck", "bogged again");
  await ev(`__trRoad(${uid}, ${rid}, ${q.p - 40}, 1.6, 1)`); await waitFor(eyes, E => E.b && E.b.cb >= q.p - 1.01, 30000);
  const dG = await lineUp("tail", 6); let E = await eyes();
  ok((await ev(`TLXPL.pdr.towHook(${rid}, ${uid}, false, false)`)) === true, "roped up again (" + dG.toFixed(1) + " m between the eyes)");
  // the snatch: off down the road at 7 m/s with 2 m of slack
  await clearToasts(); const sn0 = (await tw()).sn;
  await ev(`(() => { const e = __eyes(${rid}), ux = e.m.tail.x - e.b.tail.x, uz = e.m.tail.z - e.b.tail.z, L = Math.hypot(ux, uz); window.__u = [ux / L, uz / L]; window.__pv = setInterval(() => { if (!TLXPL.pdr.tw.taut && TLXPL.pdr.tw.snatches === ${sn0}) { P.vx = __u[0] * 7; P.vz = __u[1] * 7; } }, 15); return true; })()`);
  let T = await waitFor(tw, T => T.sn > sn0, 12000); await ev(`clearInterval(window.__pv); true`); await sleep(250);
  const vAfter = await ev(`P.vx * __u[0] + P.vz * __u[1]`), E1 = await eyes();
  console.log("   snatch:", JSON.stringify({ sn0, sn: T.sn, vAfter, tw: E1.b.tw }));
  ok(T.sn === sn0 + 1 && (await toasts()).some(x => /The rope snatched tight at \d+ km\/h and stopped you dead/.test(x)), "the slack taken up at 25 km/h: the rope snatches and says so");
  ok(vAfter < 2 && Math.abs(E1.b.tw) < 0.6 && (await pdr()).st === "stuck", `it stops you (${vAfter.toFixed(2)} m/s along the rope after) and pulls nobody out`);
  // across the road: your truck set where the rope is tight and square to the road, and pushed outward
  await ev(`TLXPL.pdr.towDrop(""); true`);
  E = await eyes();
  const px = E.b.tail.x + E.b.tz * (TW.len + 2.9), pz = E.b.tail.z - E.b.tx * (TW.len + 2.9);   /* left of the tail eye, across the road, nose pointing away from it */
  await ev(`__tr(${uid}, ${px}, ${pz}, ${Math.atan2(E.b.tz, -E.b.tx)})`); await sleep(500);
  const Ex = await eyes(), dx0 = Math.hypot(Ex.m.tail.x - Ex.b.tail.x, Ex.m.tail.z - Ex.b.tail.z), tw0 = Ex.b.tw;
  await ev(`TLXPL.pdr.towHook(${rid}, ${uid}, false, false); window.__pv = setInterval(() => { P.vx = ${E.b.tz} * 2; P.vz = ${-E.b.tx} * 2; }, 15); true`);
  T = await waitFor(tw, T => T.taut && !T.along, 8000); await sleep(1500);
  const line = await ev(`TLXPL.hint()`); await ev(`clearInterval(window.__pv); P.vx = P.vz = 0; true`);
  const Ey = await eyes(), dx1 = Math.hypot(Ey.m.tail.x - Ey.b.tail.x, Ey.m.tail.z - Ey.b.tail.z);
  console.log("   across:", JSON.stringify({ dx0, dx1, tw0, tw1: Ey.b.tw, taut: T.taut, along: T.along, line }));
  ok(T.taut && !T.along && Math.abs(Ey.b.tw - tw0) < 0.2, "a pull square across the road moves the bogged truck nowhere");
  ok(dx1 < TW.len + 1.3 && /across the road it pulls nothing/.test(line), "your truck is held on the rope, and the driving hint says to line up along the road");
  // unhook on a pad, at your own truck's end
  E = await eyes(); await standAtEye(E.m.tail, { x: await ev(`P.x`), z: await ev(`P.z`) }, 0.9); await sleep(300);
  await padSet({}); await sleep(300); await padSet({ 0: 1 }); await sleep(120); await padSet({}); await sleep(400);
  let u = await use(); ok(u.use === "UNHOOK" && /: unhook the tow rope/.test(u.hint) && !/^E: /.test(u.hint), "at your own truck's end, on a pad: UNHOOK (" + u.hint + ")");
  await clearToasts(); await padSet({ 10: 1 }); await sleep(150); await padSet({}); await sleep(400);
  T = await tw(); ok(T.id === null && !T.rope && (await ev(`__ropes()`)) === 0 && (await toasts()).some(x => /Tow rope unhooked/.test(x)) && (await pdr()).st === "stuck", "L3 unhooks it: no rope, the truck still bogged");
  await ev(`window.__fakePad = null; INP.dev = "kbm"; __in(); true`);
  // touch hooks on
  await lineUp("tail", 5.5); E = await eyes(); await standAtEye(E.b.tail, E.b, 0.9);
  await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(800);
  await ev(`(() => { const b = $("tcUse"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return 1; })()`); await sleep(500);
  T = await tw(); const tb = await ev(`$("tcUse").textContent`);
  ok(T.id === RID && T.rope && /UNHOOK/.test(tb), "a tap on the touch button hooks on, and the button then wears UNHOOK");
  await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; true`); await sleep(300);
  // a save and a reload with the rope on
  await ev(`save(); true`);
  await reload(); await ev(SETUP); await sleep(600); await ev(KIT);
  T = await tw(); q = await pdr();
  ok(T.id === null && (await ev(`__ropes()`)) === 0 && q.st === "stuck" && !("tw" in q), "a reload: no rope, nothing of it in the save, the truck still bogged");
  // on the sled with the rope on: it stays on the two trucks and pulls nothing; with no truck of yours near, no rope to hook
  await ev(`__in()`); await lineUp("tail", 5.5);
  await ev(`TLXPL.pdr.towHook(${rid}, ${uid}, false, false)`); await sleep(300);
  E = await eyes(); await ev(`__me(${E.b.tail.x - E.b.tz * 9}, ${E.b.tail.z + E.b.tx * 9}); P.vx = 3; true`); await sleep(900);
  T = await tw(); const sl = await ev(`TLXPL.hint()`);
  ok(T.id === RID && T.rope && (await ev(`__ropes()`)) === 1 && !/TOW ROPE/.test(sl) && (await pdr()).st === "stuck", "on to the sled with the rope on: the rope stays on the two trucks, and the sled pulls nothing");
  await ev(`TLXPL.pdr.towDrop(""); true`);
  await ev(`__trRoad(${uid}, ${rid}, ${q.p - 150}, 1.6, 1)`); await sleep(400);
  E = await eyes(); await standAtEye(E.b.tail, E.b, 0.9); await sleep(600);
  u = await use(); console.log("   no truck near:", JSON.stringify(u), await ev(`JSON.stringify([TLXV.state().cur, FOOT.on])`));
  ok(u.use === "HAIL", "with no truck of yours near (come on the sled), the towing eye offers no rope: the hail (" + u.use + ")");
  // walked home from: not towed
  await lineUp("tail", 5.5); E = await eyes();
  await ev(`TLX.state("plow").pdr[${rid}].gone = true; true`); await standAtEye(E.b.tail, E.b, 0.9); await sleep(400);
  u = await use();
  ok(u.use === "TOW ROPE" && /nobody at the wheel/.test(u.hint) && (await ev(`TLXPL.pdr.towHook(${rid}, ${uid}, false, false)`)) === false, "a truck its driver walked home from is not towed: the eye says it needs the tow truck");
  await ev(`TLX.state("plow").pdr[${rid}].gone = false; __in(); true`);
});

await section("C from the nose, on through the drift, with help on the way", async () => {
  let q = await pdr(); ok(q.st === "stuck", "still bogged");
  await ev(`TLXPL.PDR.aid.hitch = 5; true`);
  ok((await ev(`TLXPL.pdr.send(${rid}, ${hid})`)) === true && (await pdr()).help === HID, "the other road's driver is sent");
  const dG = await lineUp("nose", 5.5); let E = await eyes();
  await standAtEye(E.b.nose, E.b, 0.9); await sleep(400);
  const u = await use(); await tap("KeyE", 90); await sleep(400);
  let T = await tw(); console.log("   nose:", JSON.stringify(u), JSON.stringify({ mf: T.mf, tf: T.tf, dG }));
  ok(u.use === "HOOK ON" && T.id === RID && T.tf === true && T.mf === false, "at its nose: HOOK ON, the rope from your tail to its nose");
  await ev(`__in()`); await clearNotes();
  const p0 = q.p;
  await ev(`window.__pv = setInterval(() => { const Z = TLXPL.pdr.seen.get(${rid}); if (Z && TLXPL.pdr.tw.id) { P.vx = Z.tx * 1.6; P.vz = Z.tz * 1.6; } }, 15); true`);
  q = await waitFor(pdr, q => q.st !== "stuck", 60000); await ev(`clearInterval(window.__pv); P.vx = P.vz = 0; true`);
  T = await tw();
  console.log("   out:", JSON.stringify({ st: q.st, p0, p: q.p, help: q.help }));
  ok(q.st === "out" && q.p > p0 + 5 && q.p <= p0 + TW.pull + 0.5 && q.p < (I + 1) * 400, `pulled on through the drift: out, and plowing on from ${(q.p - p0).toFixed(1)} m further up`);
  ok(T.id === null && (await ev(`__ropes()`)) === 0 && T.terr === null && T.err === null, "the rope is gone, nothing thrown");
  await far(); await ev(`__q(0.06, 0.03)`);
  const h = await pdr(HID);
  ok(h.aidB > 0 && (await notes()).some(s => / has turned round \| /.test(s)), "the helper on the way turns round");
  ok(await home(), "everyone home");
});

for (const m of FAILED) console.log("   failed: " + m);
console.log(fails ? `FAILS: ${fails}` : "ALL OK");
await done(fails ? 1 : 0);

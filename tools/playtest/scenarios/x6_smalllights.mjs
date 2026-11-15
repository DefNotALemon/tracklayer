// Slice 6.2b (G4): the two smaller lights (tlx-lights.js v2): Finnkirka and Kinnarodden, lantern huts on their own
// headlands, each its own Real Estate listing with one room, a smaller tank, burner and stipend, its own flash, and
// drums ordered per light. Asserts, exit 1 on a failure.
//  A. both stand on a headland: dry open ground with the sea round it, away from every village and from each other,
//     reachable overland from the quay; each flashes its own pattern while it is Kystverket's; the Lighthouses page
//     lists both (1 ROOM, SEA LIGHT); no Lights app yet.
//  B. have a look: into the lantern hut, nothing to do at the rack or the ladder; you aren't shut in.
//  C. buying Finnkirka: $4,400, lamp lit with 20 of 80 L, the Lights app card with its own numbers.
//  D. it burns 1 L a lamp hour while the sun is down; dry: out, its flash stops, Kinnarodden's doesn't.
//  E. drums are ordered per light: three at most for a small light, a claim from the quay to THAT light; with
//     Slettnes yours too its drums are counted apart.
//  F. hauling: stopped at Finnkirka only Finnkirka's drums roll in (no pay, no delivery counted); Slettnes's stay
//     aboard until the lighthouse.
//  G. in the hut: PUMP at the rack (keyboard), a second drum only tops the 80 L tank up, LIGHT at the ladder (pad
//     L3), touch reads PUMP; the flash is back.
//  H. Monday pays each lamp at its own rate.
//  I. reload: each light's drums wait at the quay for it again; a 6.2a save's one `quay` count becomes Slettnes's.
import { boot, reload, ev, tap, sleep, shot, sideCam, camOff, done, padSet, padOff, park } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function until(expr, secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) { if (await ev(expr)) return true; await sleep(80); } return !!(await ev(expr)); }
const Lr = id => J(`Object.assign({}, TLX.lights.rec("${id}"), { out: TLX.lights.out("${id}") })`);
const pass = (hours, step = 0.25) => ev(`(() => { for (let t = 0; t < ${hours} - 1e-9; t += ${step}) { GS.hour += ${step}; TLX.lights.step(); } return true; })()`);
const goAway = () => ev(`(() => { if (INT.on) intGoOut(); crashCancel(); FOOT.on = true; FOOT.x = depot.x + 600; FOOT.z = depot.z + 700; FOOT.y = surf(FOOT.x, FOOT.z); INT.cd = 0; return true; })()`);
const U = () => J(`(() => { const u = footUse(); return { use: u, hint: $("wnHint").textContent, tE: $("tcUse").hidden ? null : $("tcUse").textContent, on: INT.on, pump: TLX.lights.PUMP.on }; })()`);
const page = () => ev(`$("tabV").textContent`);
const app = async id => { await ev(`TABLET.toggle(false); TABLET.toggle(true, "${id}"); TABLET.render(); true`); await sleep(400); return page(); };
async function stepIn(id) {
  await ev(`(() => { if (INT.on) intGoOut(); const b = INT.beacons.find(q => q.cab.id === "${id}:hut"); crashCancel(); FOOT.on = true; FOOT.x = b.x; FOOT.z = b.z; FOOT.y = surf(b.x, b.z); FOOT.sp = FOOT.fwd = 0; INT.cd = 0; INT.ph = ""; camState.init = false; return true; })()`);
  const inside = await until(`INT.on && INT.cab.id === "${id}:hut"`, 8); await sleep(600); return inside;
}
const at = (x, z, yaw = 0) => ev(`(() => { INT.px = ${x}; INT.pz = ${z}; FOOT.yaw = ${yaw}; FOOT.sp = FOOT.fwd = 0; return true; })()`);
const RACK = [-0.3, 1.35], LADDER = [1.5, 1.05], MID = [0, -0.5];
// share of the time each small light's lamp shows, sampled over a few periods of game time
async function flashes(secs = 9) { const n = { finnkirka: 0, kinnarodden: 0, k: 0 }, t0 = await clock(); while ((await clock()) - t0 < secs) { const v = await J(`TLX.lights.SMALL.map(m => m.vis.blink.visible ? 1 : 0)`); n.finnkirka += v[0]; n.kinnarodden += v[1]; n.k++; await sleep(60); } return { f: n.finnkirka / n.k, k: n.kinnarodden / n.k, n: n.k }; }
const lookAt = (id, side, up, back) => ev(`(() => { const m = TLX.lights.small("${id}"), a = m.at, nx = Math.sin(a.ry), nz = Math.cos(a.ry); const px = a.x + nx * ${back} + nz * ${side}, pz = a.z + nz * ${back} - nx * ${side}; window.camOv = c => { c.position.set(px, Math.max(surf(px, pz), a.y) + ${up}, pz); c.lookAt(a.x, a.y + 3.2, a.z); }; return true; })()`);

const warm = () => ev(`window.__warm = window.__warm || setInterval(() => { GS.warmth = 100; }, 300); true`);   // stood outdoors for minutes: never let the cold black the walker out mid-check
await boot(); await warm();
await ev(`tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; GS.hour = 34; GS.cash = 30000; GS.apps.realestate = 1; TLX.state("staff").apps = []; TLX.state("staff").next = 1e9; true`);
await sleep(1200);
console.log("sled parked out of the way", JSON.stringify(await park()));

// ---- A: where they stand
const A = await J(`(() => {
  const relay = SITES.find(s => s.type === "relay"), out = {};
  // overland from the quay: a flood over everything that isn't sea, 40 m cells
  const n = Math.floor(2 * HALF / 40), seen = new Uint8Array(n * n), q = [], ci = v => Math.floor((v + HALF) / 40);
  const push = (i, j) => { if (i < 0 || j < 0 || i >= n || j >= n || seen[j * n + i]) return; if (isSea(i * 40 - HALF + 20, j * 40 - HALF + 20)) return; seen[j * n + i] = 1; q.push(i, j); };
  push(ci(depot.x), ci(depot.z)); for (let h = 0; h < q.length; h += 2) { const i = q[h], j = q[h + 1]; push(i + 1, j); push(i - 1, j); push(i, j + 1); push(i, j - 1); }
  for (const m of TLX.lights.SMALL) {
    const l = TLX.prop.listing(m.id), a = m.at; if (!a || !l || !l.at) { out[m.id] = null; continue; }
    let sea = 0; for (let k = 0; k < 16; k++) if (isSea(a.x + Math.cos(k * Math.PI / 8) * 150, a.z + Math.sin(k * Math.PI / 8) * 150)) sea++;
    let nd = 1e9, ns = ""; for (const s of SITES) { if (s.x === undefined) continue; const d = Math.hypot(a.x - s.x, a.z - s.z); if (d < nd) { nd = d; ns = s.id; } }
    const b = INT.beacons.find(q => q.cab.id === m.id + ":hut");
    out[m.id] = { x: Math.round(a.x), z: Math.round(a.z), g: +groundAt(a.x, a.z).toFixed(1), slope: +slopeAt(a.x, a.z, 6).toFixed(2), sea, nd: Math.round(nd), ns, relay: Math.round(Math.hypot(a.x - relay.x, a.z - relay.z)),
      dry: !isSea(a.x, a.z) && !isWater(a.x, a.z) && !isSea(b.x, b.z) && !isSea(m.drop.x, m.drop.z), reach: !!seen[ci(m.drop.z) * n + ci(m.drop.x)], ring: +Math.hypot(b.x - a.x, b.z - a.z).toFixed(2), ob: obNear(a.x, a.z, 1),
      mesh: m.vis.g.children.length, inSites: SITES.includes(m.drop), price: l.price, type: l.type, lamp: TLX.lights.LAMPS.find(q => q.id === m.id).tank };
  }
  const [f, k] = TLX.lights.SMALL; out.apart = f.at && k.at ? Math.round(Math.hypot(f.at.x - k.at.x, f.at.z - k.at.z)) : 0;
  out.hidden = TABLET.byId.lights.hidden(); out.out = [TLX.lights.out("finnkirka"), TLX.lights.out("kinnarodden")];
  return out; })()`);
console.log("A", JSON.stringify(A));
for (const id of ["finnkirka", "kinnarodden"]) {
  const q = A[id];
  ok(!!q && q.dry && q.g >= 3 && q.slope < 0.25 && q.sea >= 6, `A: ${id} stands on dry ground on a headland (ground ${q && q.g} m, slope ${q && q.slope}, sea on ${q && q.sea}/16 of the ring at 150 m)`);
  ok(!!q && q.nd > 350 && q.relay > 1500 && q.reach && !q.inSites, `A: ${id} is ${q && q.nd} m from the nearest place (${q && q.ns}), reachable overland from the quay`);
  ok(!!q && q.ob && q.mesh > 15 && q.ring > 2.6 && q.ring < 4 && q.type === "light" && q.lamp === 80, `A: ${id} is a solid hut with a door ring ${q && q.ring} m from its middle`);
}
ok(A.apart > 1500 && A.hidden && !A.out[0] && !A.out[1], `A: the two are ${A.apart} m apart; no Lights app before you own a light`);
let fl = await flashes();
console.log("A flash", JSON.stringify(fl));
ok(fl.f > 0.05 && fl.f < 0.32 && fl.k > 0.5 && fl.k < 0.88, `A: Kystverket's lamps flash, each its own way: Finnkirka shows ${(fl.f * 100).toFixed(0)}% of the time (two short flashes in 8 s), Kinnarodden ${(fl.k * 100).toFixed(0)}% (occulting, 6 s)`);
await ev(`TLX.prop.setTab("light"); TABLET.toggle(true, "realestate"); TABLET.render(); true`); await sleep(400);
let txt = await page();
ok(/Finnkirka light/.test(txt) && /Kinnarodden light/.test(txt) && /SEA LIGHT/.test(txt) && /1 ROOM(?!S)/.test(txt) && /\$4,400/.test(txt) && /\$5,200/.test(txt) && /Slettnes lighthouse station/.test(txt), "A: the Lighthouses page lists both, beside Slettnes");
await shot("x6s_a_listing"); await ev(`TABLET.toggle(false); true`); await sleep(300);
// stills: each light by day and at night
await sideCam();
for (const id of ["finnkirka", "kinnarodden"]) {
  await ev(`(() => { const m = TLX.lights.small("${id}"); crashCancel(); FOOT.on = true; FOOT.x = m.drop.x; FOOT.z = m.drop.z; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.yaw = m.at.ry + Math.PI; GS.hour = 24 + 11.5; recenter(FOOT.x, FOOT.z, true); camState.init = false; return true; })()`);
  await sleep(1500); await lookAt(id, 7, 2.6, 13); await sleep(500); await shot(`x6s_${id}_day`);
  await lookAt(id, -3, 1.8, 8); await sleep(400); await shot(`x6s_${id}_door`);
}
await ev(`GS.hour = 24 + 22; true`); await sleep(900); await lookAt("kinnarodden", 9, 3, 16); await until(`TLX.lights.small("kinnarodden").vis.blink.visible`, 7); await shot("x6s_kinnarodden_night");
await camOff(); await ev(`GS.hour = 34; true`);

// ---- B: have a look
ok(await stepIn("finnkirka"), "B: into Finnkirka's lantern hut (for sale, have a look)");
const room = await J(`(() => { const R = INT.room, hit = (x, z) => R.cols.some(c => x > c.x0 - 0.3 && x < c.x1 + 0.3 && z > c.z0 - 0.3 && z < c.z1 + 0.3); return { spawn: hit(INT.px, INT.pz), exit: hit(R.exit.x, R.exit.z), free: TLX.prop.freeCells(R).length, pieces: TLX.prop.piecesOf(R).length, rack: hit(${RACK[0]}, ${RACK[1]}), ladder: hit(${LADDER[0]}, ${LADDER[1]}), hx: R.hx }; })()`);
ok(!room.spawn && !room.exit && room.free >= 12 && room.pieces >= 3 && !room.rack && !room.ladder, "B: where you come in, the way out, and the spots by the rack and the ladder are clear: " + JSON.stringify(room));
await at(...RACK); await sleep(250); let s = await U(); const bRack = s.use;
await at(...LADDER); await sleep(250); s = await U();
ok(bRack === null && s.use === null, "B: not yours: nothing to do at the rack or the ladder");
await sideCam("[INT.room.g.position.x, (INT.py || 0) + 1.0, INT.room.g.position.z]", 3.0, 1.6, 2.6); await shot("x6s_b_hut"); await camOff();

// ---- C: buy Finnkirka
await goAway(); await sleep(300);
await ev(`GS.cash = 5000; TLX.prop.setTab("light"); TABLET.toggle(true, "realestate"); TABLET.render(); true`); await sleep(400);
const bought = await J(`(() => { const c = GS.cash, k = document.querySelector('#tabV [data-act="probuy:kinnarodden"]').classList.contains("blocked"); document.querySelector('#tabV [data-act="probuy:finnkirka"]').click(); return { paid: c - GS.cash, own: TLX.prop.owns("finnkirka"), kBlocked: k, sign: TLX.prop.listing("finnkirka").vis.k }; })()`);
await sleep(1600);
let r = await Lr("finnkirka");
ok(bought.paid === 4400 && bought.own && bought.kBlocked && bought.sign === "own", "C: BUY IT takes $4,400 (Kinnarodden at $5,200 is out of reach with $5,000); the sign is yours: " + JSON.stringify(bought));
ok(r.on && Math.abs(r.oil - 20) < 0.5 && r.store === 0 && r.q === 0 && !r.out, `C: its lamp is lit with ${r.oil.toFixed(0)} L in the tank`);
txt = await app("lights");
ok(!(await ev(`TABLET.byId.lights.hidden()`)) && /Finnkirka lykt/.test(txt) && /Tank 20 of 80 L · about 20 lamp hours/.test(txt) && /1 light to keep · \$6 a lamp hour/.test(txt) && /ORDER A DRUM/.test(txt) && !/Slettnes/.test(txt) && !/Kinnarodden/.test(txt), "C: the Lights app shows Finnkirka alone, with its own tank and rate");
await shot("x6s_c_app"); await ev(`TABLET.toggle(false); true`); await sleep(300);

// ---- D: it burns, it runs dry
await ev(`(() => { const q = TLX.lights.rec("finnkirka"); q.oil = 80; q.lit = 0; q.need = 0; GS.hour = Math.ceil(GS.hour / 24) * 24; TLX.state("lights").hT = GS.hour; return true; })()`);
const darkH = await ev(`(() => { let n = 0; for (let t = 0.125; t < 24; t += 0.25) if (TLX.lights.dark(GS.hour + t)) n += 0.25; return n; })()`);
await pass(24); r = await Lr("finnkirka");
ok(darkH > 6 && Math.abs(r.lit - darkH) < 0.6 && Math.abs((80 - r.oil) - r.lit * 1) < 0.05, `D: over a day (${darkH} dark hours) it burned ${r.lit.toFixed(2)} h and ${(80 - r.oil).toFixed(1)} L: 1 L a lamp hour`);
await ev(`(() => { const q = TLX.lights.rec("finnkirka"); q.oil = 5; q.lit = 0; q.need = 0; q.low = false; window.__n = []; const o = TABLET.notify.bind(TABLET); TABLET.notify = n => { window.__n.push(n.title + " | " + n.body); return o(n); }; return true; })()`);
await pass(30); r = await Lr("finnkirka");
const notes = await J(`window.__n`);
ok(!r.on && r.oil === 0 && r.out && Math.abs(r.lit - 5) < 0.01 && notes.some(n => /Finnkirka lykt is dark/.test(n) && /climb the ladder/.test(n)), `D: 5 L is 5 lamp hours, then it is out, with an alert: ${notes.filter(n => /dark/.test(n)).join(" || ")}`);
fl = await flashes(7);
ok(fl.f === 0 && fl.k > 0.5, `D: Finnkirka no longer flashes (${fl.f}); Kinnarodden, still Kystverket's, does (${(fl.k * 100).toFixed(0)}%)`);
ok((await ev(`TABLET.byId.lights.badge()`)) === "!", "D: the app badge says a lamp is dark");

// ---- E: drums per light
await ev(`GS.cash = 30000; true`);
const ord = await J(`(() => { const c = GS.cash; for (let i = 0; i < 5; i++) TLX.lights.order("finnkirka"); const cl = GS.claims.filter(j => j.oil), m = TLX.lights.small("finnkirka"); return { paid: c - GS.cash, n: cl.length, q: TLX.lights.rec("finnkirka").q, from: cl.every(j => j.from === depot), dest: cl.every(j => j.dest === m.drop), type: m.drop.type, rows: jobsList().filter(q => /Paraffin drum/.test(q.title)).map(q => q.title + " / " + q.meta) }; })()`);
ok(ord.paid === 135 && ord.n === 3 && ord.q === 3 && ord.from && ord.dest && ord.type === "light", "E: three drums is a small light's limit ($135): three claims from the quay to the light itself");
ok(ord.rows.length === 3 && /waiting at .*then to Finnkirka light/.test(ord.rows[0]), "E: the Jobs list tracks them: " + ord.rows[0]);
const both = await J(`(() => { TLX.prop.buy("slettnes"); TLX.lights.step(); TLX.lights.order("slettnes"); TLX.lights.order("slettnes"); const relay = SITES.find(s => s.type === "relay"), cl = GS.claims.filter(j => j.oil); return { own: TLX.lights.mine().map(l => l.id), qS: TLX.lights.rec("slettnes").q, qF: TLX.lights.rec("finnkirka").q, toRelay: cl.filter(j => j.dest === relay && j.lamp === "slettnes").length, toF: cl.filter(j => j.lamp === "finnkirka").length }; })()`);
ok(both.own.length === 2 && both.qS === 2 && both.qF === 3 && both.toRelay === 2 && both.toF === 3, "E: with Slettnes yours too, its drums are ordered and counted apart: " + JSON.stringify(both));
txt = await app("lights");
ok(/2 lights to keep · \$12 \/ \$6 a lamp hour/.test(txt) && /3 drums paid for/.test(txt) && /2 drums paid for/.test(txt) && /Finnkirka 1 L an hour from a 80 L tank/.test(txt) && /climb the ladder in the lantern hut|Order a drum and haul it out/.test(txt), "E: the app lists both lamps, each with its own drums and numbers");
await ev(`TABLET.toggle(true, "parcels"); TABLET.render(); true`); await sleep(400);
ok(/Paraffin drum/.test(await page()), "E: the Parcels app shows the claimed drums");
await shot("x6s_e_parcels"); await ev(`TABLET.toggle(false); true`); await sleep(300);

// ---- F: haul them
const slots = await ev(`(() => { let best = SLEDS[0]; for (const d of SLEDS) { GS.own.sled = d.id; restat(); if (ST.slots >= 5) { best = d; break; } if (ST.slots > (best._s || 0)) { best = d; best._s = ST.slots; } } GS.own.sled = best.id; restat(); return ST.slots; })()`);
await ev(`(() => { crashCancel(); FOOT.on = false; VEH.cur = null; GS.load = []; P.x = depot.x - 5; P.z = depot.z + 3; P.y = surf(P.x, P.z); P.vx = P.vz = 0; GS.fuel = GS.cap; camState.init = false; return true; })()`);
const want = Math.min(5, slots);
await until(`GS.load.filter(j => j.oil).length >= ${want}`, 40); await sleep(300);
// whatever the rack took, put one of each light's drums aboard so the hand-over can be told apart
await ev(`(() => { for (const id of ["finnkirka", "slettnes"]) if (!GS.load.some(j => j.oil && j.lamp === id)) { const c = GS.claims.find(j => j.oil && j.lamp === id); GS.claims.splice(GS.claims.indexOf(c), 1); const o = GS.load.findIndex(j => j.oil && j.lamp !== id); if (o >= 0 && GS.load.filter(j => j.oil && j.lamp !== id).length > 1) GS.claims.push(GS.load.splice(o, 1)[0]); GS.load.push(c); } TLX.lights.sync(); return true; })()`);
const ab = await J(`({ f: GS.load.filter(j => j.lamp === "finnkirka").length, s: GS.load.filter(j => j.lamp === "slettnes").length, slots: ST.slots, qF: TLX.lights.rec("finnkirka").q, qS: TLX.lights.rec("slettnes").q, cash: GS.cash, del: GS.delivered })`);
ok(ab.f >= 1 && ab.s >= 1 && ab.qF === 3 && ab.qS === 2, `F: loaded at the quay: ${ab.f} for Finnkirka, ${ab.s} for Slettnes aboard (${ab.slots} parcel slots)`);
// riding past at speed hands nothing over; stopped, it does
await ev(`(() => { const d = TLX.lights.small("finnkirka").drop; P.x = d.x + 4; P.z = d.z + 3; P.y = surf(P.x, P.z); P.vx = 9; P.vz = 0; TLX.lights.dropTick(); return true; })()`);
const fast = await ev(`GS.load.filter(j => j.lamp === "finnkirka").length`);
await ev(`(() => { const d = TLX.lights.small("finnkirka").drop; P.x = d.x + 4; P.z = d.z + 3; P.y = surf(P.x, P.z); P.vx = P.vz = 0; camState.init = false; return true; })()`);
const landed = await until(`GS.load.filter(j => j.lamp === "finnkirka").length === 0`, 20); await sleep(900);
r = await Lr("finnkirka");
const toasts = await J(`[...document.querySelectorAll("#toasts > *")].map(e => e.textContent).concat(typeof TOASTQ !== "undefined" ? TOASTQ.map(t => t.msg || t.text || String(t)) : [])`);
const aft = await J(`({ s: GS.load.filter(j => j.lamp === "slettnes").length, cash: GS.cash, del: GS.delivered, qS: TLX.lights.rec("slettnes").q, storeS: TLX.lights.rec("slettnes").store })`);
ok(fast === ab.f && landed && r.store === ab.f * 60 && r.q === 3 - ab.f, `F: past it at speed nothing happens; stopped at Finnkirka its ${ab.f} drum(s) roll in (${r.store} L in the store, ${r.q} still at the quay)`);
ok(aft.s === ab.s && aft.qS === 2 && aft.storeS === 0 && aft.cash === ab.cash && aft.del === ab.del, "F: Slettnes's drums stay aboard; no pay, no delivery counted");
ok(toasts.some(t => /rolled into the oil store at Finnkirka/.test(t) && /in the lantern hut/.test(t)), "F: the toast says so: " + (toasts.find(t => /oil store/.test(t)) || toasts.join(" | ")));
await shot("x6s_f_at_light");
await ev(`(() => { const s = SITES.find(q => q.type === "relay"); P.x = s.x - 3; P.z = s.z + 8; P.y = surf(P.x, P.z); P.vx = P.vz = 0; camState.init = false; return true; })()`);
const landS = await until(`GS.load.filter(j => j.lamp === "slettnes").length === 0`, 20); await sleep(500);
const sS = await Lr("slettnes");
ok(landS && sS.store === ab.s * 60 && sS.q === 2 - ab.s && (await Lr("finnkirka")).store === r.store, `F: and at the lighthouse Slettnes's ${ab.s} roll into ITS store (${sS.store} L)`);
await ev(`(() => { GS.claims = GS.claims.filter(j => !j.oil); GS.load = GS.load.filter(j => !j.oil); for (const id of ["finnkirka", "slettnes"]) TLX.lights.rec(id).q = 0; TLX.lights.sync(); TLX.lights.rec("finnkirka").store = 120; return true; })()`);

// ---- G: in the hut
await park("depot.x + 500", "depot.z - 400");
await ev(`(() => { const q = TLX.prop.rec("finnkirka:hut"); q.grit = 50; q.dust = 0; TLX.state("prop").kit = 8; FOOT.on = true; return true; })()`);
ok(await stepIn("finnkirka"), "G: into the lantern hut");
await at(...MID); await sleep(300); s = await U();
ok(s.use === "SWEEP", "G: mid-room with a gritty floor the use control is SWEEP (" + s.hint + ")");
await at(...LADDER); await sleep(300); s = await U();
ok(s.use === "LAMP" && /tank is dry: pump a drum in at the rack first/.test(s.hint), "G: at the ladder with a dry tank: " + s.hint);
await at(...RACK); await sleep(300); s = await U();
ok(s.use === "PUMP" && /E: pump a drum into the tank · tank 0 of 80 L · 2 full drums here/.test(s.hint), "G: at the rack: PUMP (" + s.hint + ")");
await tap("KeyE"); await sleep(500); s = await U();
ok(s.pump && s.use === "STOP", "G: the use key starts the hand pump");
await sideCam("[INT.room.g.position.x + INT.px, (INT.py || 0) + 1.0, INT.room.g.position.z + INT.pz]", 2.0, 0.6, 2.2); await shot("x6s_g_pump"); await camOff();
await until(`!TLX.lights.PUMP.on`, 9); await sleep(300); r = await Lr("finnkirka");
ok(r.oil === 60 && r.store === 60 && !r.on, `G: a drum pumped in: tank ${r.oil} of 80 L, ${r.store} L left in the store`);
await at(...RACK); await sleep(250); await tap("KeyE"); await sleep(400); await until(`!TLX.lights.PUMP.on`, 9); await sleep(300); r = await Lr("finnkirka");
ok(r.oil === 80 && r.store === 40, `G: the second drum only tops it up: tank ${r.oil} L, ${r.store} L stays in the drum`);
await at(...RACK); await sleep(250); s = await U();
ok(s.use !== "PUMP", "G: a full tank: no pump on offer (use " + s.use + ")");
await at(...LADDER); await sleep(300); s = await U();
ok(s.use === "LIGHT" && /climb up and light the lamp · tank 80 of 80 L/.test(s.hint), "G: at the ladder now: LIGHT (" + s.hint + ")");
await padSet({ 10: 1 }); await sleep(350); await padSet({}); await sleep(400);
r = await Lr("finnkirka");
ok(r.on && !r.out, "G: Xbox L3 at the ladder lights the lamp");
await padOff(); await sleep(200);
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; TLX.lights.rec("finnkirka").oil = 30; true`); await sleep(500);
await at(...RACK); await sleep(350); s = await U();
ok(s.tE === "PUMP" && /tap PUMP/.test(s.hint), "G: touch: the use button reads PUMP (" + s.hint + ")");
await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; true`); await sleep(200);
await goAway(); await sleep(300);
fl = await flashes(7);
ok(fl.f > 0.05, `G: and Finnkirka flashes again (${(fl.f * 100).toFixed(0)}%)`);

// ---- H: Monday, each at its own rate
const pay = await J(`(() => { for (const id of ["finnkirka", "slettnes"]) { const q = TLX.lights.rec(id); q.oil = TLX.lights.num(id, "tank"); q.on = true; q.lit = 0; q.need = 0; } TLX.state("lights").hT = GS.hour; for (let t = 0; t < 24; t += 0.25) { GS.hour += 0.25; TLX.lights.step(); } TLX.state("lights").last = []; const c = GS.cash, f = TLX.lights.rec("finnkirka").lit, s = TLX.lights.rec("slettnes").lit; TLX.lights.monday({ label: "Mon 8 Dec" }); return { got: GS.cash - c, f, s, last: TLX.state("lights").last[0] }; })()`);
ok(pay.f > 6 && Math.abs(pay.f - pay.s) < 0.01 && pay.got === Math.round(pay.f * 6 + pay.s * 12) && pay.last.pay === pay.got, `H: Monday pays ${pay.f.toFixed(1)} lamp hours at $6 and at $12: $${pay.got} ${JSON.stringify(pay.last)}`);
const wk = await ev(`(() => { let n = 0; for (let t = 0.125; t < 168; t += 0.25) if (TLX.lights.dark(GS.hour + t)) n += 0.25; return n; })()`);
console.log(`H: this week has ${wk} dark hours: Finnkirka earns $${Math.round(wk * 6)} and burns ${Math.round(wk)} L (${Math.ceil(wk / 60)} drums, $${Math.ceil(wk / 60) * 45}); Kinnarodden $${Math.round(wk * 7)}`);

// ---- I: saved
await ev(`(() => { GS.cash = 5000; TLX.lights.rec("finnkirka").store = 0; TLX.lights.order("finnkirka"); TLX.lights.order("finnkirka"); TLX.lights.order("slettnes"); const c = GS.claims.find(j => j.oil && j.lamp === "finnkirka"); GS.claims.splice(GS.claims.indexOf(c), 1); GS.load.push(c); TLX.lights.sync(); TLX.lights.rec("finnkirka").oil = 33; save(); return true; })()`);
await reload(); await warm(); await sleep(900);
const sv = await J(`(() => { TLX.lights.sync(); const m = TLX.lights.small("finnkirka"), relay = SITES.find(s => s.type === "relay"), cl = GS.claims.concat(GS.load).filter(j => j.oil); return { own: TLX.lights.mine().map(l => l.id), oil: TLX.lights.rec("finnkirka").oil, qF: TLX.lights.rec("finnkirka").q, qS: TLX.lights.rec("slettnes").q, toF: cl.filter(j => j.dest === m.drop).length, toS: cl.filter(j => j.dest === relay).length, legacy: TLX.state("lights").quay }; })()`);   // (the sled comes back at the quay, so some are aboard again already)
ok(sv.own.length === 2 && Math.abs(sv.oil - 33) < 1.5 && sv.qF === 2 && sv.qS === 1 && sv.toF === 2 && sv.toS === 1 && sv.legacy === undefined, "I: after a reload each light's drums wait at the quay for it again: " + JSON.stringify(sv));
const old = await J(`(() => { save(); const s = JSON.parse(localStorage.getItem("tracklayer.save.v2")), L = s.x.sys.lights.s; delete L.lamps.finnkirka; delete s.x.sys.prop.s.own.finnkirka; delete L.lamps.slettnes.q; L.quay = 2; return s; })()`);
await reload(old); await warm(); await sleep(1500);
const ov = await J(`(() => { TLX.lights.sync(); const relay = SITES.find(s => s.type === "relay"); return { own: TLX.lights.mine().map(l => l.id), qS: TLX.lights.rec("slettnes").q, cl: GS.claims.concat(GS.load).filter(j => j.oil && j.dest === relay).length, legacy: TLX.state("lights").quay, f: TLX.lights.out("finnkirka") }; })()`);
ok(ov.own.length === 1 && ov.own[0] === "slettnes" && ov.qS === 2 && ov.cl === 2 && ov.legacy === undefined && !ov.f, "I: a 6.2a save's two drums at the quay are Slettnes's: " + JSON.stringify(ov));
await done(fails ? 1 : 0);

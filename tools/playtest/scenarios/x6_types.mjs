// Slice 6.1b (G4): Real Estate sells new property types; a listing has several rooms, each with its own dirt
// (tlx-property.js). The first listing is Slettnes lighthouse station: the keeper's house and the tower room.
// Asserts, exit 1 on a failure.
//  A. the Real Estate app grows a strip of types (only types with a listing): Depot cabins is the old page, Lighthouses
//     lists Slettnes for sale; BUY is blocked while you can't afford it.
//  B. at Slettnes: a for-sale sign and two doors. Walking in (held W) works for both before you buy ("have a look"), the
//     use control offers nothing in a room that isn't yours; every room's way out and spawn are clear of furniture.
//  C. the BUY button: the price comes off, the rooms start dusty (stood empty), the sign changes, a Map pin, a caretaker
//     vacancy in the Staff system.
//  D. the rooms keep their OWN dirt: sweep the keeper's house and the tower's floor stays gritty; dust a piece in the
//     tower and the house's shelves stay dusty.
//  E. time: dirt piles up in both rooms and costs nights let; guests stay on nights you're away (not while you're
//     there or inside a room); Monday pays the lets and files a statement.
//  F. a caretaker hired for the station cleans both rooms and lifts the lets.
//  G. pad L3 starts a sweep in the tower room; touch: the use button reads STOP and stops it.
//  H. ownership, each room's dirt and the statement survive a reload; a save from before 6.1b (no own) loads unowned.
import { boot, reload, ev, tap, down, up, sleep, shot, sideCam, camOff, done, padSet, padOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function until(expr, secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) { if (await ev(expr)) return true; await sleep(80); } return !!(await ev(expr)); }
const R = id => J(`TLX.prop.rec("slettnes:${id}")`);
const pass = (hours, step = 2) => ev(`(() => { for (let t = 0; t < ${hours}; t += ${step}) { GS.hour += ${step}; if (TLX.staff.crewTick) TLX.staff.crewTick(); TLX.prop.step(); } return true; })()`);
const goAway = () => ev(`(() => { if (INT.on) intGoOut(); const l = TLX.prop.listing("slettnes"); crashCancel(); FOOT.on = true; FOOT.x = l.at.x - 700; FOOT.z = l.at.z + 500; FOOT.y = surf(FOOT.x, FOOT.z); INT.cd = 0; return true; })()`);
const U = () => J(`(() => { const u = footUse(); return { use: u, hint: $("wnHint").textContent, tE: $("tcUse").hidden ? null : $("tcUse").textContent, on: INT.on, cab: INT.on ? INT.cab.id : null, kit: TLX.prop.kit, sw: TLX.prop.SW.on, du: TLX.prop.DU.cur }; })()`);
const page = () => ev(`$("tabV").textContent`);
// stand 3 m out from a room's door ring, facing it, and walk in with held W
async function walkIn(room) {
  await ev(`(() => { if (INT.on) intGoOut(); const b = INT.beacons.find(q => q.cab.id === "slettnes:${room}"); crashCancel(); FOOT.on = true; FOOT.x = b.x + Math.sin(b.ry) * 3; FOOT.z = b.z + Math.cos(b.ry) * 3; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.yaw = Math.atan2(b.x - FOOT.x, b.z - FOOT.z); FOOT.sp = FOOT.fwd = 0; INT.cd = 0; camState.init = false; return true; })()`);
  await sleep(500);
  const hint = await ev(`intDoorHint()`);
  await down("KeyW"); const inside = await until(`INT.on && INT.cab.id === "slettnes:${room}"`, 14); await up("KeyW"); await sleep(700);
  return { inside, hint };
}
// teleport to the door ring (no walk), for the later steps
async function stepIn(room) {
  await ev(`(() => { if (INT.on) intGoOut(); const b = INT.beacons.find(q => q.cab.id === "slettnes:${room}"); crashCancel(); FOOT.on = true; FOOT.x = b.x; FOOT.z = b.z; FOOT.y = surf(b.x, b.z); FOOT.sp = FOOT.fwd = 0; INT.cd = 0; INT.ph = ""; camState.init = false; return true; })()`);
  const inside = await until(`INT.on && INT.cab.id === "slettnes:${room}"`, 8); await sleep(600); return inside;
}

await boot();
await ev(`tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; GS.hour = 34; GS.cash = 900; GS.apps.realestate = 1; TLX.state("staff").apps = []; TLX.state("staff").next = 1e9; true`);
await sleep(1200);

// ---- A: the app
const L0 = await J(`(() => { const l = TLX.prop.listing("slettnes"); return l && l.at ? { x: l.at.x, z: l.at.z, rooms: l.at.rooms, price: l.price, n: l.rooms.length } : null; })()`);
ok(!!L0 && L0.n === 2 && L0.price > 6800, `A: Slettnes station is on the books (${L0 && L0.n} rooms, $${L0 && L0.price}, dearer than any depot)`);
await ev(`TABLET.toggle(true, "realestate"); TABLET.render(); true`); await sleep(400);
let strip = await J(`[...document.querySelectorAll("#tabV [data-pty]")].map(b => ({ id: b.dataset.pty, t: b.textContent.trim(), on: b.classList.contains("on"), tf: b.dataset.tf }))`);
let txt = await page();
ok(strip.length === 2 && strip[0].id === "depot" && strip[0].on && strip[1].id === "light" && /Lighthouses/.test(strip[1].t) && strip.every(b => b.tf), "A: the app has a strip of types, only those with a listing: " + strip.map(b => b.t).join(" | "));
ok(/Depot cabins/.test(txt) && /Fjellbu/.test(txt) && /Viddastua/.test(txt) && !/Slettnes lighthouse station/.test(txt), "A: Depot cabins is the page it always was");
await shot("x6t_a_depots");
await ev(`document.querySelector('#tabV [data-pty="light"]').click(); true`); await sleep(400);
txt = await page(); strip = await J(`[...document.querySelectorAll("#tabV [data-pty]")].map(b => ({ id: b.dataset.pty, on: b.classList.contains("on") }))`);
const buyBtn = () => J(`(() => { const b = document.querySelector('#tabV [data-act="probuy:slettnes"]'); return b ? { blocked: b.classList.contains("blocked"), t: b.textContent } : null; })()`);
let bb = await buyBtn();
ok(strip[1].on && /Lighthouses/.test(txt) && /Slettnes lighthouse station/.test(txt) && /\$12,500/.test(txt) && /2 ROOMS/.test(txt) && /keeper's house, tower room/.test(txt) && !/Fjellbu/.test(txt), "A: Lighthouses lists Slettnes for sale with its rooms");
ok(bb && bb.blocked, "A: BUY IT is blocked with $900");
const c0 = await ev(`(() => { document.querySelector('#tabV [data-act="probuy:slettnes"]').click(); return GS.cash; })()`);
ok(c0 === 900 && !(await ev(`TLX.prop.owns("slettnes")`)), "A: pressing it without the money buys nothing");
await shot("x6t_a_forsale");
await ev(`document.querySelector('#tabV [data-pty="depot"]').click(); true`); await sleep(300);
ok(/Fjellbu/.test(await page()) && (await ev(`TLX.prop.tab`)) === "depot", "A: and back to the depot cabins");
await ev(`TABLET.toggle(false); true`); await sleep(300);

// ---- B: the place, before buying
const geo = await J(`(() => { const l = TLX.prop.listing("slettnes"), s = SITES.find(q => q.type === "relay"), bs = INT.beacons.filter(q => q.cab.prop === "slettnes");
  return { n: bs.length, d: bs.map(b => Math.hypot(b.x - s.x, b.z - s.z)), wet: bs.some(b => isSea(b.x, b.z) || isWater(b.x, b.z)), apart: bs.length === 2 ? Math.hypot(bs[0].x - bs[1].x, bs[0].z - bs[1].z) : 0,
    sign: l.vis ? { k: l.vis.k, d: Math.hypot(l.vis.g.position.x - s.x, l.vis.g.position.z - s.z), map: !!l.vis.mat.map } : null,
    other: INT.beacons.filter(q => q.cab.prop !== "slettnes").map(q => Math.min(...bs.map(b => Math.hypot(b.x - q.x, b.z - q.z)))).sort((a, b) => a - b)[0] }; })()`);
console.log("B geo", JSON.stringify(geo));
ok(geo.n === 2 && geo.d.every(d => d < 25) && !geo.wet && geo.apart > 6 && geo.other > 12, `B: two doors at the lighthouse, ${geo.apart.toFixed(1)} m apart, on dry ground, clear of every other door`);
ok(geo.sign && geo.sign.k === "sale" && geo.sign.map && geo.sign.d < 30, "B: a for-sale sign stands by the keeper's house");
const rooms = await J(`(() => { intMats(); const out = {}; for (const id of ["house", "tower"]) { const b = INT.beacons.find(q => q.cab.id === "slettnes:" + id), Rm = intRoom(b.cab), lim = 0.34, hits = [];
    const pts = { exit: [Rm.exit.x, Rm.exit.z], spawn: [Rm.exit.x, Rm.exit.z + 0.95], mid: [Rm.exit.x, Rm.exit.z + 0.47] };
    for (const k in pts) { const [x, z] = pts[k]; for (const c of Rm.cols) if (x > c.x0 - lim && x < c.x1 + lim && z > c.z0 - lim && z < c.z1 + lim) hits.push(k); if (Math.abs(x) > Rm.hx - lim || Math.abs(z) > Rm.hz - lim) hits.push(k + ":wall"); }
    out[id] = { hits, cells: TLX.prop.freeCells(Rm).length, pieces: TLX.prop.piecesOf(Rm).length, hx: Rm.hx, hz: Rm.hz }; } return out; })()`);
console.log("B rooms", JSON.stringify(rooms));
ok(!rooms.house.hits.length && !rooms.tower.hits.length, "B: both rooms: the way out and the spawn are clear of furniture");
ok(rooms.house.cells >= 25 && rooms.tower.cells >= 12 && rooms.house.pieces >= 4 && rooms.tower.pieces >= 3, `B: floor to sweep and furniture to dust in both (house ${rooms.house.cells} cells / ${rooms.house.pieces} pieces, tower ${rooms.tower.cells} / ${rooms.tower.pieces})`);
// outdoors stills: the tower door and the sign, by day
await ev(`(() => { const l = TLX.prop.listing("slettnes"); crashCancel(); FOOT.on = true; FOOT.x = l.at.x - 1; FOOT.z = l.at.z + 3; FOOT.y = surf(FOOT.x, FOOT.z); GS.hour = 36; camState.init = false; return true; })()`); await sleep(900);
const mid = `(() => { const l = TLX.prop.listing("slettnes"); return [l.at.x - 2, surf(l.at.x - 2, l.at.z + 3) + 1.6, l.at.z + 3]; })()`;
await sideCam(mid, 17, 4.5, 0.25); await shot("x6t_b_yard"); await sideCam(mid, 15, 3.5, 1.1); await shot("x6t_b_yard2");
await ev(`window.camOv = c => { const b = INT.beacons.find(q => q.cab.id === "slettnes:house"), y = surf(b.x, b.z); c.position.set(b.x + Math.sin(b.ry) * 9 + Math.cos(b.ry) * 2.5, y + 2.6, b.z + Math.cos(b.ry) * 9 - Math.sin(b.ry) * 2.5); c.lookAt(b.x, y + 1.2, b.z); }; true`); await sleep(300); await shot("x6t_b_front");
await camOff(); await sleep(200);
// walk in at each door, like a player
let w = await walkIn("tower"); let s = await U();
ok(/The tower door is \d+ m off: walk into the light to go in/.test(w.hint), "B: outdoors hint: " + w.hint);
ok(w.inside && s.use === null && /Tower room · walk into the doorway to go out/.test(s.hint), `B: held W walks into the tower room; not yours, so nothing to do there (use ${s.use}; "${s.hint}")`);
await shot("x6t_b_tower");
w = await walkIn("house"); s = await U();
ok(/The keeper's door is \d+ m off/.test(w.hint) && w.inside && s.use === null && /Keeper's house/.test(s.hint), `B: and into the keeper's house (use ${s.use}; "${s.hint}")`);
await shot("x6t_b_house");
// and out again by walking into the doorway
await ev(`(() => { const Rm = INT.room; INT.px = Rm.exit.x; INT.pz = Rm.exit.z + 0.9; FOOT.yaw = Math.PI; INT.cd = 0; return true; })()`);
await down("KeyW"); const outOk = await until(`!INT.on`, 8); await up("KeyW"); await sleep(600);
ok(outOk, "B: walking back into the doorway goes out");

// ---- C: buy it
await goAway(); await sleep(300);
await ev(`GS.cash = 20000; TLX.prop.setTab("light"); TABLET.toggle(true, "realestate"); TABLET.render(); true`); await sleep(400);
bb = await buyBtn();
const bought = await J(`(() => { const c = GS.cash; document.querySelector('#tabV [data-act="probuy:slettnes"]').click(); return { paid: c - GS.cash, own: TLX.prop.owns("slettnes") }; })()`); await sleep(500);
txt = await page();
ok(bb && !bb.blocked && bought.paid === 12500 && bought.own, `C: BUY IT takes $${bought.paid} and it's yours`);
let rh = await R("house"), rt = await R("tower");
ok(rh.dust > 25 && rt.dust > 25 && rh.grit > 5 && rt.grit > 5, `C: it stood empty: both rooms start dusty (house ${rh.grit}/${rh.dust}, tower ${rt.grit}/${rt.dust})`);
ok(/Yours/.test(txt) && /Slettnes station/.test(txt) && /Keeper's house/.test(txt) && /Tower room/.test(txt) && /Floor a bit gritty · shelves a bit dusty/.test(txt) && /Cleaning kit/.test(txt) && /\$110 a night/.test(txt) && !/BUY IT/.test(txt) && !/−0%/.test(txt), "C: the page shows it as yours, a row per room, the kit row");
const roww = await J(`[...document.querySelectorAll("#tabV .tprow b")].map(b => ({ t: b.textContent, h: b.getBoundingClientRect().height }))`);
ok(roww.length >= 4 && roww.every(q => q.h < 26), "C: the row labels sit on one line: " + roww.map(q => q.t + " " + Math.round(q.h)).join(", "));
await shot("x6t_c_owned");
const after = await J(`(() => { const l = TLX.prop.listing("slettnes"); let pins = []; for (const f of TABLET.layers.depots) pins = pins.concat(f()); return { sign: l.vis.k, pins: pins.map(p => p.name), vac: TLX.staff.vacancies().map(v => v.id), strip: [...document.querySelectorAll("#tabV [data-pty]")].map(b => b.textContent.trim()) }; })()`);
ok(after.sign === "own" && after.pins.includes("SLETTNES STATION") && after.vac.includes("pr:slettnes"), "C: the sign changes, a pin on the Map's depots layer, a caretaker vacancy: " + JSON.stringify(after));
ok(/Lighthouses 1/.test(after.strip[1]), "C: the strip counts what's yours: " + after.strip.join(" | "));
await ev(`TABLET.toggle(false); true`); await sleep(300);

// ---- D: each room's own dirt
await ev(`(() => { for (const id of ["house", "tower"]) { const r = TLX.prop.rec("slettnes:" + id); r.grit = 60; r.dust = 48; } TLX.state("prop").kit = 0; return true; })()`);
ok(await stepIn("house"), "D: into the keeper's house"); s = await U();
ok(s.use === "CLEAN" && /no cleaning kit/.test(s.hint), "D: yours now, no kit: CLEAN (" + s.hint + ")");
await ev(`TLX.state("prop").kit = 8; true`); await sleep(300);
const spot = await J(`(() => { for (const [x, z] of TLX.prop.freeCells(INT.room)) { INT.px = x; INT.pz = z; FOOT.yaw = 0; const u = TLX.prop.use(); if (u && u.label === "SWEEP") return [x, z]; } return null; })()`);
await sleep(250); s = await U();
ok(!!spot && s.use === "SWEEP" && /sweep the floor · floor gritty, shelves dusty · kit: 8/.test(s.hint), "D: with a kit: SWEEP (" + s.hint + ")");
await shot("x6t_d_house_dirty");
await tap("KeyE"); await sleep(400);
ok(await ev(`TLX.prop.SW.on && TLX.prop.SW.cab === "slettnes:house"`), "D: the use key starts sweeping the keeper's house");
await ev(`window.__rows = (() => { const C = TLX.prop.freeCells(INT.room), zs = [...new Set(C.map(c => c[1].toFixed(2)))].sort((a, b) => a - b), out = []; let dir = 1;
  for (const zk of zs) { const row = C.filter(c => c[1].toFixed(2) === zk).sort((a, b) => dir * (a[0] - b[0])); for (const [x, z] of row) for (const dx of [-0.2, 0, 0.2]) out.push([x + dir * dx, z, dir > 0 ? Math.PI / 2 : -Math.PI / 2]); dir = -dir; } return out; })(); window.__ri = 0; true`);
for (let i = 0; i < 900; i++) { const more = await ev(`(() => { const p = window.__rows[window.__ri++]; if (!p || !TLX.prop.SW.on) return false; INT.px = p[0]; INT.pz = p[1]; FOOT.yaw = p[2]; return true; })()`); if (!more) break; await sleep(45); if (i === 60) await shot("x6t_d_sweeping"); }
await sleep(300); rh = await R("house"); rt = await R("tower"); s = await U();
ok(rh.grit < 0.05 && !s.sw && s.kit === 7, `D: the keeper's house floor is swept (grit ${rh.grit.toFixed(3)}), one clean used (kit ${s.kit})`);
ok(rt.grit > 59 && rh.dust > 47, `D: the tower's floor is as gritty as it was (${rt.grit.toFixed(1)}), the house's shelves still dusty (${rh.dust.toFixed(1)})`);
ok(await stepIn("tower"), "D: into the tower room");
const dec = await J(`(() => { const g = INT.room._grit; return g ? { vis: g.im.visible, op: g.mat.opacity } : null; })()`);
ok(dec && dec.vis && dec.op > 0.5, "D: the tower floor shows its own grit");
const tp = await J(`TLX.prop.piecesOf(INT.room).map(c => TLX.prop.standAt(INT.room, c))`);
await ev(`(() => { const p = ${JSON.stringify(tp[0])}; INT.px = p.x; INT.pz = p.z; FOOT.yaw = p.yaw; return true; })()`); await sleep(300);
s = await U(); ok(s.use === "DUST", "D: facing the tower's furniture: DUST (" + s.hint + ")");
await shot("x6t_d_tower_dirty");
await tap("KeyE"); await sleep(500); await shot("x6t_d_dusting"); await until(`TLX.prop.DU.cur < 0`, 6); await sleep(200);
rh = await R("house"); rt = await R("tower");
ok(rt.dust < 48 - 48 / tp.length + 0.6 && rt.dust > 0 && Math.abs(rh.dust - 48) < 0.6, `D: one of ${tp.length} pieces wiped: tower dust 48 -> ${rt.dust.toFixed(1)}, the house's stays ${rh.dust.toFixed(1)}`);

// ---- E: time, guests, Monday
await goAway(); await sleep(300);
await ev(`(() => { for (const id of ["house", "tower"]) { const r = TLX.prop.rec("slettnes:" + id); r.grit = 0; r.dust = 0; } const s = TLX.state("prop"); TLX.prop.step(); s.own.slettnes.acc = 0; s.own.slettnes.nights = 0; s.own.slettnes.rented = 0; s.last = []; return true; })()`);
const occ0 = await ev(`TLX.prop.occP(TLX.prop.listing("slettnes"))`);
await ev(`window.__rnd = Math.random; Math.random = () => 0.01; true`);
await pass(96);
let o = await J(`TLX.state("prop").own.slettnes`);
ok(o.nights === 4 && o.rented === 4 && o.acc === 440, `E: four nights away, four nights let at $110: ${JSON.stringify(o)}`);
// at the station: nobody stays
await ev(`(() => { const l = TLX.prop.listing("slettnes"); FOOT.x = l.at.x + 6; FOOT.z = l.at.z + 14; FOOT.y = surf(FOOT.x, FOOT.z); return true; })()`);
await pass(48); o = await J(`TLX.state("prop").own.slettnes`);
ok(o.nights === 6 && o.rented === 4, `E: two nights with you there: not let (${o.rented} of ${o.nights})`);
await goAway();
await pass(144); await ev(`Math.random = window.__rnd; true`);
rh = await R("house"); rt = await R("tower"); const occ1 = await ev(`TLX.prop.occP(TLX.prop.listing("slettnes"))`);
ok(rh.grit > 55 && rt.grit > 55 && rh.dust > 40 && rt.dust > 40 && occ1 < occ0 - 0.05, `E: twelve days on, both rooms are dirty (house ${rh.grit.toFixed(0)}/${rh.dust.toFixed(0)}, tower ${rt.grit.toFixed(0)}/${rt.dust.toFixed(0)}) and it lets less: ${(occ0 * 100).toFixed(0)}% -> ${(occ1 * 100).toFixed(0)}%`);
// one clean room of two: half the penalty
const half = await ev(`(() => { const r = TLX.prop.rec("slettnes:house"), g = r.grit, d = r.dust; r.grit = 0; r.dust = 0; const v = TLX.prop.occP(TLX.prop.listing("slettnes")); r.grit = g; r.dust = d; return v; })()`);
ok(half > occ1 + 0.02 && half < occ0 - 0.02, `E: with only the house clean it sits between: ${(half * 100).toFixed(0)}%`);
o = await J(`TLX.state("prop").own.slettnes`);
const pay = await J(`(() => { const c = GS.cash, acc = TLX.state("prop").own.slettnes.acc; TLX.monday({ label: "Mon 8 Dec" }); const s = TLX.state("prop"); return { got: GS.cash - c, acc, left: s.own.slettnes.acc, nights: s.own.slettnes.nights, last: s.last }; })()`);
ok(pay.got === pay.acc && pay.acc >= 440 && pay.left === 0 && pay.nights === 0 && pay.last.length === 1 && pay.last[0].rent === pay.acc && pay.last[0].d === "Mon 8 Dec", `E: Monday pays the lets ($${pay.got}) and files a statement ${JSON.stringify(pay.last[0])}`);
await ev(`TLX.prop.setTab("light"); TABLET.toggle(true, "realestate"); TABLET.render(); true`); await sleep(400);
txt = await page();
ok(/Statements/.test(txt) && /Mon 8 Dec/.test(txt) && /filthy|gritty/.test(txt), "E: the page shows the statement and the rooms' state");
await shot("x6t_e_statement"); await ev(`TABLET.toggle(false); true`); await sleep(300);

// ---- F: a caretaker for the station
const cid = await ev(`(() => { const a = TLX.staff.post({ id: "pr:slettnes", role: "caretaker" }); Object.assign(a, { xp: 8, xpReal: 8, wage: 60 }); a.tr = { honest: true, temper: 0.2, work: 1.2 }; TLX.staff.hire(a.id); return a.id; })()`);
const wk = await J(`({ w: TLX.staff.workAt("pr:slettnes"), occ: TLX.staff.occAt("pr:slettnes"), crew: TLX.state("staff").crew.map(m => m.place) })`);
const before = [await R("house"), await R("tower")];
await pass(96); rh = await R("house"); rt = await R("tower");
ok(wk.w > 0.9 && wk.occ > 0 && wk.crew.includes("pr:slettnes") && rh.grit < before[0].grit - 5 && rt.grit < before[1].grit - 5 && rh.dust < before[0].dust - 10 && rt.dust < before[1].dust - 10,
  `F: a caretaker (work ${wk.w.toFixed(2)}, +${(wk.occ * 100).toFixed(1)}% let) cleans both rooms over four days: house ${before[0].grit.toFixed(0)}/${before[0].dust.toFixed(0)} -> ${rh.grit.toFixed(0)}/${rh.dust.toFixed(0)}, tower ${before[1].grit.toFixed(0)}/${before[1].dust.toFixed(0)} -> ${rt.grit.toFixed(0)}/${rt.dust.toFixed(0)}`);
await ev(`TLX.state("staff").owed = 0; TLX.state("staff").crew = []; true`);

// ---- G: pad and touch, in the tower
await ev(`(() => { const r = TLX.prop.rec("slettnes:tower"); r.grit = 50; r.dust = 0; TLX.state("prop").kit = 8; return true; })()`);
ok(await stepIn("tower"), "G: into the tower room");
const tspot = await J(`(() => { for (const [x, z] of TLX.prop.freeCells(INT.room)) { INT.px = x; INT.pz = z; FOOT.yaw = 0; const u = TLX.prop.use(); if (u && u.label === "SWEEP") return [x, z]; } return null; })()`); await sleep(300);
await padSet({ 10: 1 }); await sleep(350); await padSet({}); await sleep(400);
ok(!!tspot && (await ev(`TLX.prop.SW.on && TLX.prop.SW.cab === "slettnes:tower"`)), "G: Xbox L3 starts sweeping the tower room");
await sideCam("[INT.room.g.position.x + INT.px, (INT.py || 0) + 0.9, INT.room.g.position.z + INT.pz]", 2.0, 0.5, 0.6); await shot("x6t_g_tower_sweep"); await camOff();
await padOff(); await sleep(200);
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(600);
s = await U(); ok(s.tE === "STOP", "G: touch: the use button reads STOP while sweeping (" + s.tE + ")");
await ev(`(() => { const b = $("tcUse"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return true; })()`);
await sleep(500); s = await U();
ok(!s.sw && s.tE === "SWEEP" && /tap SWEEP/.test(s.hint), "G: tapping STOP stops it; the button reads SWEEP (" + s.hint + ")");
await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; true`); await sleep(200);

// ---- H: saved
await goAway();
await ev(`(() => { const a = TLX.prop.rec("slettnes:house"), b = TLX.prop.rec("slettnes:tower"); a.grit = 33; a.dust = 21; b.grit = 7; b.dust = 64; TLX.state("prop").own.slettnes.acc = 220; save(); return true; })()`);
await reload(); await sleep(700);
const sv = await J(`(() => { const s = TLX.state("prop"), l = TLX.prop.listing("slettnes"); return { own: TLX.prop.owns("slettnes"), a: TLX.prop.rec("slettnes:house"), b: TLX.prop.rec("slettnes:tower"), acc: s.own.slettnes.acc, last: s.last.length, sign: l.vis && l.vis.k, at: !!l.at }; })()`);
ok(sv.own && Math.abs(sv.a.grit - 33) < 0.5 && Math.abs(sv.a.dust - 21) < 0.5 && Math.abs(sv.b.grit - 7) < 0.5 && Math.abs(sv.b.dust - 64) < 0.5 && sv.acc === 220 && sv.last === 1 && sv.sign === "own", "H: ownership, each room's dirt, the week's lets and the statement survive a reload: " + JSON.stringify(sv));
const old = await J(`(() => { const s = JSON.parse(localStorage.getItem("tracklayer.save.v2")); const p = s.x.sys.prop.s; delete p.own; delete p.dT; delete p.last; p.cab = { fjellbu: { grit: 20, dust: 10 } }; return s; })()`);
await reload(old); await sleep(700);
const ov = await J(`(() => { const s = TLX.state("prop"), l = TLX.prop.listing("slettnes"); return { own: TLX.prop.owns("slettnes"), keys: Object.keys(s.own).length, last: s.last.length, sign: l.vis && l.vis.k, fj: s.cab.fjellbu, rooms: TLX.prop.allRooms().filter(r => r.prop).length }; })()`);
ok(!ov.own && ov.keys === 0 && ov.last === 0 && ov.sign === "sale" && ov.fj && ov.fj.grit === 20 && ov.rooms === 0, "H: a save from 6.1a (no listings in it) loads with the station still for sale and the depot's dirt kept: " + JSON.stringify(ov));
await done(fails ? 1 : 0);

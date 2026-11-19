// Tracklayer — the ferry as a passenger (G4 milestone 14, loop/EXPANSION.md slice 14.5a). Option `ferrypax` (on).
//
// The coastal ferry that brings Kjøllefjord its freight also takes passengers one port up the coast: MEHAMN, on the
// Barents side, 3.4 km over the fell by sled and a different sea from the one your skiff floats on. This file reads
// the game's own timetable (api.steamer: her two calls a day at Kjøllefjord, with the weather's delays and
// cancellations already in them) and adds nothing to it:
//   NORTHBOUND  boards at the Kjøllefjord pier while she lies alongside (08:15-09:30), at Mehamn PAX.north h after she sails.
//   SOUTHBOUND  calls at Mehamn PAX.south h before she is due at Kjøllefjord, boards there for PAX.call h, and lands you
//               on the Kjøllefjord pier as she comes alongside (19:45).
// A delayed call shifts all of it; a cancelled call does not sail. The southbound out of Kjøllefjord and the
// northbound out of Mehamn leave the map: no passage.
//
// BOARDING is on foot with the use control (keyboard, pad L3, the touch button: an api.footx provider) at the
// boarding sign on the pier, or at the waiting shelter on Mehamn's landing (built here: the low shore 430 m north of
// the village, with a plowed lane down to it and a pin on the Map). The first press says what it will cost and when
// you get there; a second press inside PAX.arm seconds goes aboard. Fare PAX.fare; your sled goes as deck cargo for
// PAX.sled more if it is the machine you are on and stands within PAX.sledR of the sign (anything towed behind it and
// what is strapped on come with it). A truck or a boat stays behind. The passage is a fade: the clock runs on to her
// arrival (in steps of PAX.step h, so the roads, the mail and the weather see hours pass, not a night's sleep), you
// stand at the other port with the sled beside you, and the fare is taken on arrival. A foot passenger at Mehamn is
// never refused for want of cash (the purser takes what you have): nobody is stranded on the far coast.
//
// Saved: x.sys.ferry { n } (passages made). Off = no prompt, no shelter, no pin (the plowed lane stays).
(() => {
"use strict";
if (!window.TLX || !TLX.register) return;
const PAX = { fare: 35, sled: 45, north: 1.75, south: 2.0, call: 0.75, reach: 4.5, sledR: 40, arm: 8, step: 1, stepMs: 130, darkMs: 600 };
let api = null, T = null, Q = null, M = null, FADE = null, ARM = null, PASS = null, PINNED = false;
const S = () => TLX.state("ferry") || {};
const on = () => !!(api && Q && M && TLX.on("ferrypax"));
const ports = () => [Q, M];
const other = p => p === Q ? M : Q;
const cash = n => api.fmtCash(n);

// every sailing a passenger could take from `port` that hasn't gone yet, soonest first
function sailings(port, H) {
  const out = [];
  for (const c of api.steamer.calls(H - 4, H + 60, true)) {
    if (c.dir !== port.dir) continue;
    const s = port === Q ? { open: c.arr, dep: c.dep, arr: c.dep + PAX.north } : { open: c.arr - PAX.south - PAX.call, dep: c.arr - PAX.south, arr: c.arr };
    s.c = c; s.cancelled = c.state === "cancelled"; s.delay = c.state === "delayed" ? c.delay : 0;
    if (s.dep > H) out.push(s);
  }
  return out.sort((a, b) => a.dep - b.dep);
}
function status(port, H = api.GS.hour) {
  const all = sailings(port, H), live = all.filter(s => !s.cancelled);
  const now = live.find(s => H >= s.open && H < s.dep) || null;
  return { now, next: now || live[0] || null, cancelled: all[0] && all[0].cancelled ? all[0] : null };
}
// does the sled come too? Only the sled itself (the machine you're on when no truck or boat is), parked by the sign
function sledAt(port) { const P = api.P; return !api.veh.cur && !api.BOG.on && Math.hypot(P.x - port.x, P.z - port.z) < PAX.sledR; }
function fareOf(port) { const sled = sledAt(port); return { sled, fare: PAX.fare + (sled ? PAX.sled : 0) }; }
const idle = () => { const F = api.FOOT; return !PASS && F.on && !api.MNT.on && !api.DMT.on && !(api.INT && api.INT.on) && !(api.tablet && api.tablet()) && !(api.shopOpen && api.shopOpen()) && !api.HELP.on && !api.busy() && !api.GS.dead; };
function portAt(x, z) { return ports().find(p => Math.hypot(x - p.x, z - p.z) < PAX.reach) || null; }
// why you can't go aboard just now ("" = you can)
function block(port) {
  const GS = api.GS, st = status(port);
  if (!on()) return "No passengers.";
  if (!idle()) return "Not just now.";
  if (!st.now) return timetable(port);
  const f = fareOf(port);
  if (GS.cash < f.fare && !(port === M && !f.sled)) return f.sled && GS.cash >= PAX.fare
    ? `With the sled it is ${cash(f.fare)} and you have ${cash(GS.cash)}. On foot it is ${cash(PAX.fare)}: leave the sled more than ${PAX.sledR} m from the sign and it stays here.`
    : `The fare is ${cash(f.fare)}. You have ${cash(GS.cash)}.`;
  return "";
}
function timetable(port) {
  const st = status(port), d = other(port).name, t = api.fmtTime;
  const can = st.cancelled ? ` The ${port.dir} due to sail ${t(st.cancelled.dep)} is cancelled for weather.` : "";
  if (st.now) return `The ${port.dir} ferry for ${d} is boarding: she sails ${t(st.now.dep)}, ${d} about ${t(st.now.arr)}.`;
  if (!st.next) return `No ferry for ${d} on the board.${can}`;
  return `Next ferry for ${d}: the ${port.dir} boards here from ${t(st.next.open)} and sails ${t(st.next.dep)}${st.next.delay ? " (running " + st.next.delay + " h late)" : ""}, ${d} about ${t(st.next.arr)}. ${cash(PAX.fare)} on foot, ${cash(PAX.fare + PAX.sled)} with a sled on deck.${can}`;
}
function press(port) {
  const why = block(port); if (why) { api.toast(why, status(port).now ? "warn" : "info"); ARM = null; return false; }
  const now = performance.now();
  if (ARM && ARM.port === port && now < ARM.until) { ARM = null; return board(port); }
  const st = status(port), f = fareOf(port), d = other(port).name, t = api.fmtTime;
  ARM = { port, until: now + PAX.arm * 1000 };
  api.toast(`${port.dir[0].toUpperCase() + port.dir.slice(1)} ferry: sails ${t(st.now.dep)}, ${d} about ${t(st.now.arr)}. ${f.sled ? `${cash(PAX.fare)} for you and ${cash(PAX.sled)} for the sled on deck: ${cash(f.fare)}` : `${cash(f.fare)} on foot${api.veh.cur ? "; what you drove here stays here" : "; your sled stays here (bring it within " + PAX.sledR + " m of the sign to ship it)"}`}, paid on arrival. ${api.btn("use")} again to go aboard.`, "info");
  return true;
}
function fadeEl() {
  if (!FADE) { FADE = document.createElement("div"); FADE.id = "tlxfFade"; FADE.style.cssText = "position:fixed;inset:0;z-index:5;background:#05070a;opacity:0;pointer-events:none;transition:opacity .5s linear"; document.body.appendChild(FADE); }
  return FADE;
}
function board(port) {
  const why = block(port); if (why) { api.toast(why, "warn"); return false; }
  const st = status(port), f = fareOf(port);
  PASS = { from: port, to: other(port), arr: st.now.arr, dep: st.now.dep, sled: f.sled, fare: f.fare, t: performance.now(), last: 0 };
  api.FOOT.sp = 0; if (api.TABLET.close) api.TABLET.close();
  fadeEl().style.opacity = "1";
  return true;
}
function endPass() { PASS = null; setTimeout(() => { if (FADE && !PASS) FADE.style.opacity = "0"; }, 450); }
// a clear place for the sled within a few metres of the walker
function sledSpot(p) {
  const W = api.world;
  for (const r of [3.2, 4.4, 5.6]) for (let i = 0; i < 12; i++) {
    const a = p.yaw + Math.PI / 2 + i * Math.PI / 6, x = p.x + Math.cos(a) * r, z = p.z - Math.sin(a) * r;
    if (W.obNear(x, z, 1.4) || W.isWater(x, z) || W.isSea(x, z) || W.slopeAt(x, z, 2) > 0.2) continue;
    return { x, z };
  }
  return null;
}
function arrive() {
  const p = PASS, to = p.to, GS = api.GS, F = api.FOOT, P = api.P, W = api.world, st = S();
  GS.hour = Math.max(GS.hour, p.arr);
  F.x = to.x; F.z = to.z; F.yaw = to.yaw; F.sp = 0; F.y = W.surf(F.x, F.z);
  let shipped = false;
  if (p.sled && !api.veh.cur) {
    const s = sledSpot(to);
    if (s) { P.x = s.x; P.z = s.z; P.yaw = to.yaw; P.vx = P.vy = P.vz = 0; P.yr = 0; P.pitch = P.roll = 0; P.y = W.surf(s.x, s.z) + 0.3; P.safe = { x: s.x, z: s.z, yaw: P.yaw }; if (api.towSnap) api.towSnap(); shipped = true; }
  }
  const fare = shipped ? p.fare : PAX.fare, paid = Math.min(fare, Math.max(0, GS.cash)); GS.cash -= paid;
  st.n = (st.n | 0) + 1;
  api.recenter(F.x, F.z, true); api.camState.init = false; api.camState.yaw = F.yaw;
  const back = status(to).next, t = api.fmtTime;
  api.toast(`${to.name}, ${t(GS.hour)}. ${cash(paid)} for the passage${shipped ? ", the sled craned off beside you" : ""}${paid < fare ? " (all you had on you: the purser let it go)" : ""}. ${back ? `The ${to.dir} for ${p.from.name} boards here from ${t(back.open)} and sails ${t(back.dep)}.` : ""}`, "good");
  api.save(); if (api.TABLET.refresh) api.TABLET.refresh();
  endPass();
}
function tick() {
  if (!api) return;
  if (M && M.grp) { const v = on(); if (M.grp.visible !== v) { M.grp.visible = v; if (Q.grp) Q.grp.visible = v; for (const o of M.obs) v ? api.world.addOb(o) : api.world.dropOb(o); } }
  if (ARM && performance.now() > ARM.until) ARM = null;
  if (!PASS) return;
  const GS = api.GS, now = performance.now();
  if (GS.dead || !api.FOOT.on) { endPass(); return; }                           // something else took the player: no passage, no fare
  api.FOOT.sp = 0; api.FOOT.x = PASS.from.x; api.FOOT.z = PASS.from.z;
  if (now - PASS.t < PAX.darkMs || now - PASS.last < PAX.stepMs) return;
  PASS.last = now;
  if (GS.hour < PASS.arr - 1e-6) { GS.hour = Math.min(PASS.arr, GS.hour + PAX.step); return; }
  arrive();
}

// ---- the two ports
function signTex(a, b) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 128; const g = c.getContext("2d");
  g.fillStyle = "#16324a"; g.fillRect(0, 0, 512, 128); g.strokeStyle = "#e9dcc0"; g.lineWidth = 6; g.strokeRect(8, 8, 496, 112);
  g.fillStyle = "#f3ead6"; g.font = "bold 50px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(a, 256, 52);
  g.font = "24px Georgia, serif"; g.fillText(b, 256, 98);
  const t = new T.CanvasTexture(c); if (T.sRGBEncoding) t.encoding = T.sRGBEncoding; return t;
}
// a boarding sign on two posts: local +z is the side it is read from
function signPost(grp, x, z, ry, a, b) {
  const { box, std } = api.mesh, g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry; grp.add(g);
  const wood = std(0x2a211a, 0.95, 0), face = new T.MeshStandardMaterial({ map: signTex(a, b), roughness: 0.8 });
  box(0.09, 2.3, 0.09, wood, -0.8, 1.15, 0, 0, 0, 0, g); box(0.09, 2.3, 0.09, wood, 0.8, 1.15, 0, 0, 0, 0, g);
  box(1.9, 0.5, 0.05, wood, 0, 2.0, 0, 0, 0, 0, g);
  const m = new T.Mesh(new T.PlaneGeometry(1.8, 0.45), face); m.position.set(0, 2.0, 0.031); g.add(m);
  const m2 = new T.Mesh(new T.PlaneGeometry(1.8, 0.45), face); m2.position.set(0, 2.0, -0.031); m2.rotation.y = Math.PI; g.add(m2);
  box(1.96, 0.06, 0.16, std(0xf2f5f8, 1, 0), 0, 2.28, 0, 0, 0, 0, g);              // snow on the board
  return g;
}
// the pier at Kjøllefjord: a clear spot on the slab, toward the ship's side
function siteQuay() {
  const W = api.world, q = api.steamer.quay && api.steamer.quay(); if (!q) return null;
  const dx = Math.cos(q.qa), dz = Math.sin(q.qa);
  for (const u of [15, 13, 11, 9, 7, 5]) for (const v of [0, 5, -5, 10, -10, 15, -15]) {
    const x = q.qx + dx * u - dz * v, z = q.qz + dz * u + dx * v;
    if (W.obNear(x, z, 2.2) || W.isSea(x, z) || W.isWater(x, z)) continue;
    return { id: "quay", name: "Kjøllefjord", dir: "northbound", x, z, yaw: Math.atan2(dx, dz), sea: [dx, dz] };   // walker faces inland on arrival
  }
  return null;
}
// Mehamn's landing: the nearest sea to the village, the first level dry ground in from the water
function siteMehamn() {
  const W = api.world, m = W.SITES.find(s => s.id === "mehamn"); if (!m) return null;
  let qa = 0, qd = 1e9;
  for (let k = 0; k < 72; k++) { const a = k / 72 * Math.PI * 2; for (let r = 20; r < 900; r += 4) if (W.isSea(m.x + Math.cos(a) * r, m.z + Math.sin(a) * r)) { if (r < qd) { qd = r; qa = a; } break; } }
  if (qd === 1e9) return null;
  const dx = Math.cos(qa), dz = Math.sin(qa);
  for (let r = qd - 8; r > 40; r -= 2) {
    const x = m.x + dx * r, z = m.z + dz * r;
    if (W.groundAt(x, z) < 0.9 || W.isWater(x, z) || W.isSea(x, z) || W.slopeAt(x, z, 4) > 0.1 || W.obNear(x, z, 7)) continue;
    const rr = r - 6;
    return { id: "mehamn", name: "Mehamn", dir: "southbound", x: m.x + dx * rr, z: m.z + dz * rr, yaw: Math.atan2(dx, dz), sea: [dx, dz], site: m, r: rr };
  }
  return null;
}
function buildMehamn(p) {
  const W = api.world, { box, cyl, std } = api.mesh, [dx, dz] = p.sea, ax = -dz, az = dx;
  // the plowed lane down from the village and a turning place at the landing
  const pts = []; for (let r = 30; r < p.r; r += 40) pts.push([p.site.x + dx * r, p.site.z + dz * r]); pts.push([p.x, p.z]);
  if (pts.length > 1) W.addLane(pts, 2.6, 0.9);
  W.addYard(p.x, p.z, 8);
  const g = new T.Group(); g.position.set(p.x, W.groundAt(p.x, p.z), p.z); g.rotation.y = Math.atan2(dx, dz); api.scene.add(g);   // local +z: toward the sea, +x: along the shore
  const red = std(0x5c1f1a, 0.95, 0), redD = std(0x4a1814, 0.95, 0), white = std(0xcfccc2, 0.9, 0), wood = std(0x3a2e24, 0.95, 0), snow = std(0xf2f5f8, 1, 0), dark = std(0x23282c, 0.8, 0.2);
  // the waiting shelter, 5.5 m along the shore from the sign: three boarded walls, open to the sea, a bench, a lamp
  const s = new T.Group(); s.position.set(5.5, 0, -1); g.add(s);
  box(3.4, 2.2, 0.1, red, 0, 1.1, -0.85, 0, 0, 0, s); box(0.1, 2.2, 1.7, red, -1.65, 1.1, 0, 0, 0, 0, s); box(0.1, 2.2, 1.7, red, 1.65, 1.1, 0, 0, 0, 0, s);
  for (let i = -5; i <= 5; i++) box(0.05, 2.2, 0.03, redD, i * 0.3, 1.1, -0.915, 0, 0, 0, s);                                   // battens over the board joints
  for (const sx of [-1.7, 1.7]) { for (let i = -2; i <= 2; i++) box(0.03, 2.2, 0.05, redD, sx + Math.sign(sx) * 0.015, 1.1, i * 0.34, 0, 0, 0, s); for (const sz of [-0.88, 0.86]) box(0.12, 2.24, 0.12, white, sx, 1.12, sz, 0, 0, 0, s); }
  box(3.5, 0.14, 0.14, white, 0, 0.07, -0.9, 0, 0, 0, s);
  box(3.8, 0.1, 2.2, dark, 0, 2.3, 0.05, 0.1, 0, 0, s); box(3.8, 0.14, 2.2, snow, 0, 2.42, 0.05, 0.1, 0, 0, s);
  box(3.0, 0.07, 0.42, wood, 0, 0.48, -0.55, 0, 0, 0, s); box(0.08, 0.48, 0.38, wood, -1.3, 0.24, -0.55, 0, 0, 0, s); box(0.08, 0.48, 0.38, wood, 1.3, 0.24, -0.55, 0, 0, 0, s);
  box(3.3, 0.06, 1.6, wood, 0, 0.03, 0, 0, 0, 0, s);
  const lampM = new T.MeshStandardMaterial({ color: 0xfff1c9, emissive: 0xffd58a, emissiveIntensity: 0, roughness: 0.6 });
  const lamp = box(0.22, 0.12, 0.22, lampM, 0, 2.12, 0.3, 0, 0, 0, s);
  lamp.onBeforeRender = () => { lampM.emissiveIntensity = 1.6 * (1 - api.dayFactor()); };
  signPost(g, -2.2, 0.6, 0, "MEHAMN KAI", "Hurtigruten · sørgående · Kjøllefjord");
  // two bollards and a coil toward the water, so the place reads as a landing
  for (const bx of [-4, 3]) { cyl(0.16, 0.2, 0.7, dark, bx, 0.35, 6, 0, 0, 0, g, 10); cyl(0.24, 0.24, 0.08, snow, bx, 0.74, 6, 0, 0, 0, g, 10); }
  p.grp = g;
  const sx = p.x + ax * 5.5 - dx * 1, sz = p.z + az * 5.5 - dz * 1;
  p.obs = [{ x: sx - ax * 0.9, z: sz - az * 0.9, r: 1.0, top: 1e9 }, { x: sx + ax * 0.9, z: sz + az * 0.9, r: 1.0, top: 1e9 }];
  for (const o of p.obs) W.addOb(o);
}
function buildQuay(p) {
  const W = api.world, [dx, dz] = p.sea, g = new T.Group();
  g.position.set(p.x - dz * 2.4, W.groundAt(p.x - dz * 2.4, p.z + dx * 2.4), p.z + dx * 2.4); g.rotation.y = Math.atan2(-dx, -dz); api.scene.add(g);
  signPost(g, 0, 0, 0, "MEHAMN", "Hurtigruten · nordgående · passasjerer");
  p.grp = g; p.obs = [];
}
const PROV = {
  use() {
    if (!on() || !idle()) return null;
    const F = api.FOOT, port = portAt(F.x, F.z); if (!port) return null;
    const st = status(port), d = other(port).name;
    if (st.now) { const f = fareOf(port); return { label: "BOARD", hint: () => api.keyHint("use", `board the ${port.dir} ferry for ${d} · sails ${api.fmtTime(st.now.dep)} · ${cash(f.fare)}${f.sled ? " with the sled" : ""}`), act: () => press(port) }; }
    return { label: "FERRY", hint: () => api.keyHint("use", `ferry to ${d}${st.next ? " · boards " + api.fmtTime(st.next.open) : ""}`), act: () => { api.toast(timetable(port), "info"); } };
  }
};
function init(a) {
  api = a; T = a.THREE;
  if (!a.steamer || !a.footx) return;
  try { Q = siteQuay(); M = Q && siteMehamn(); if (Q && M) { buildQuay(Q); buildMehamn(M); } else Q = M = null; } catch (e) { console.error("TLX ferry", e); Q = M = null; }
  if (!Q) return;
  if (!a.footx.includes(PROV)) a.footx.push(PROV);
  if (a.TABLET.addLayer && !PINNED) { PINNED = true; a.TABLET.addLayer("marks", () => on() ? [{ x: M.x, z: M.z, name: "MEHAMN KAI · FERRY", glyph: "F", col: "#9fc4e8" }] : []); }
}
TLX.register({ id: "ferry", v: 1, state0: () => ({ n: 0 }), migrate: st => st, init, tick });
if (TLX.option) TLX.option({ id: "ferrypax", name: "Ferry as a passenger", hint: "The coastal ferry takes you (and your sled, as deck cargo) between Kjøllefjord and Mehamn for a fare: northbound from the pier in the morning, southbound from Mehamn's landing in the evening. Off = she carries freight and mail only." });
window.TLXF = { PAX, ports: () => ({ quay: Q, mehamn: M }), sailings: (id, H) => sailings(id === "mehamn" ? M : Q, H === undefined ? api.GS.hour : H).map(s => ({ open: s.open, dep: s.dep, arr: s.arr, cancelled: s.cancelled, delay: s.delay })), status: id => status(id === "mehamn" ? M : Q), timetable: id => timetable(id === "mehamn" ? M : Q), fareOf: id => fareOf(id === "mehamn" ? M : Q), block: id => block(id === "mehamn" ? M : Q), press: id => press(id === "mehamn" ? M : Q), board: id => board(id === "mehamn" ? M : Q), pass: () => PASS, armed: () => !!ARM, on };
})();

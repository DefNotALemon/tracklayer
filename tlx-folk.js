// Tracklayer: the people in the street, and a word with them (goal G7, loop/HOME.md I2; the outdoor half of I1).
// Every household's people have a day. Out of sight it is bookkeeping (who is out this hour, doing what, by the
// hour, the weather and who they are). Near you they are there: figures from the households, in their own colours
// and faces, walking an errand along the plowed lanes, standing at the door, shovelling it clear, children playing
// in the yard, the boats' men at work on the quay. They look round when you come by.
//
// A WORD WITH ANYBODY. Walk up (or stop the sled beside them) and press the use control: they say a line, and you
// may answer with one (the use control again) and get a last word back. NOTHING STOPS: no pause, no camera cut, no
// lock on your feet; walk off and it is over. Somebody at work says so in a word and carries on. What they say comes
// from what they know: the weather, their family, the village news, their own day, and what you did (your trail,
// your crash, the drive you dug out). Each person keeps a small regard for you: a word on two different days and
// they know you by name (window.TLXTALK.known() is the count; the Paths app shows it).
(() => {
"use strict";
const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; };
const wrap = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
let api = null, S = null, W = null, N = null;
const X = window.TLXFOLK = { ready: false, err: "", cast: [], pool: [], force: null, hold: false, cap: 8, said: [], routes: {}, lastLine: null };
const T = window.TLXTALK = { cur: null, known: () => S ? Object.keys(S.reg).filter(k => S.reg[k] >= 2).length : 0, regard: id => (S && S.reg[id]) || 0 };
const day = () => Math.floor(api.GS.hour / 24), hod = () => ((api.GS.hour % 24) + 24) % 24;

/* ---------------- who is out, doing what ---------------- */
let DOORS = null;                                                                                           // home id -> { x, z (the house's centre), nx, nz, fx, fz (a spot 2.2 m in front of the wall) }
function doors() {
  if (DOORS) return DOORS; DOORS = {}; const ds = W.doors || [];
  for (const h of N.homes) { let best = null, bd = 6; for (const d of ds) { const q = Math.hypot(d.x - h.x, d.z - h.z); if (q < bd) { bd = q; best = d; } } if (!best) continue; const out = (best.d || 6) / 2 + 2.2; DOORS[h.id] = { x: best.x, z: best.z, nx: best.nx, nz: best.nz, fx: best.x + best.nx * out, fz: best.z + best.nz * out, wall: (best.d || 6) / 2 }; }
  return DOORS;
}
// the chance somebody is outdoors this hour
function outP(p, h, storm) {
  const hr = Math.floor(h % 24); let k = hr < 7 || hr >= 22 ? 0 : hr < 9 ? 0.25 : hr < 12 ? 0.45 : hr < 14 ? 0.35 : hr < 18 ? 0.5 : 0.28;
  if (p.age < 5) k *= 0.3; else if (p.age < 16) k *= hr >= 14 && hr < 19 ? 1.5 : hr >= 8 && hr < 14 ? 0.1 : 0.6; else if (p.age > 72) k *= 0.6;
  return k * (1 - 0.85 * clamp(storm, 0, 1));
}
// what one person is doing in a given hour: null (indoors) or { act, key }
function doing(p, h) {
  if (X.force && X.force[p.id]) return { act: X.force[p.id], key: "f" };
  const d = Math.floor(h / 24), hr = Math.floor(h % 24), r = hash(p.id + ":" + d + ":" + hr), storm = api.GS.stormPhase === "storm" ? 1 : api.GS.storm || 0;
  if (r > outP(p, h, storm)) return null; const q = hash(p.id + "a" + d + ":" + hr), fresh = (api.GS.storm || 0) > 0.15 || hash("snow" + d) < 0.35;
  let act; if (p.age < 13) act = q < 0.7 ? "play" : "errand"; else if (/fish|boat|quay|skipper/i.test(p.trade || "") && hr >= 8 && hr < 15 && q < 0.5) act = "work"; else if (fresh && q < 0.3) act = "shovel"; else if (q < 0.62) act = "errand"; else act = "stand";
  return { act, key: d + ":" + hr };
}
X.doing = doing; X.outP = outP;
// everyone outdoors now within r of a point (bookkeeping: no figures needed)
function outNear(x, z, r) { const D = doors(), out = [], h = api.GS.hour; for (const p of N.people) { const d = D[p.home]; if (!d) continue; const q = Math.hypot(d.fx - x, d.fz - z); if (q > r) continue; const a = doing(p, h); if (a) out.push({ p, d, a, dist: q }); } out.sort((a, b) => a.dist - b.dist); return out; }
X.outNear = outNear;

/* ---------------- the figures ---------------- */
function figure(i) {
  const R = window.TLXRL, K = window.TLXGK; if (!R || !R.E || !K) return null; R.E.prepare({}); const w = R.E.buildWalker(40 + i); w.o.quiet = true; w.o.vol = 0; w.o.hard = true; w.g.traverse(o => { o.frustumCulled = false; });
  const TH = api.THREE, sh = new TH.Group(), wood = api.mesh.std(0x8a6a3a, 0.9, 0), steel = api.mesh.std(0x9aa3ad, 0.5, 0.4); const st = new TH.Mesh(new TH.CylinderGeometry(0.016, 0.016, 1.15, 6), wood); st.position.y = 0.2; sh.add(st); const bl = new TH.Mesh(new TH.BoxGeometry(0.3, 0.34, 0.03), steel); bl.position.y = -0.52; sh.add(bl); sh.rotation.set(Math.PI / 2 - 0.5, 0, 0); sh.visible = false; w.U.fore[1].userData.hand.add(sh); w.shovel = sh;
  return w;
}
function release(c) { if (!c) return; c.w.g.visible = false; c.w.blob.visible = false; if (c.w.shovel) c.w.shovel.visible = false; X.pool.push(c.w); }
function route(d, v, key) {                                                                                 // along the plowed lanes from the door to the middle of the village and back
  if (X.routes[key]) return X.routes[key]; let pts = null; try { pts = W.laneRoute(d.fx, d.fz, v.x, v.z); } catch (e) { pts = null; }
  if (!pts || pts.length < 2) pts = [[d.fx, d.fz], [lerp(d.fx, v.x, 0.5), lerp(d.fz, v.z, 0.5)]];
  const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); const len = Math.min(L[L.length - 1], 140);
  return (X.routes[key] = { pts, L, len });
}
function along(rt, s) { s = clamp(s, 0, rt.len); let i = 1; while (i < rt.L.length - 1 && rt.L[i] < s) i++; const a = rt.pts[i - 1], b = rt.pts[i], k = (s - rt.L[i - 1]) / Math.max(1e-6, rt.L[i] - rt.L[i - 1]); return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), Math.atan2(b[0] - a[0], b[1] - a[1])]; }
let scanT = 0, routeBudget = 0;
function scan() {
  const F = api.FOOT, P = api.P, px = F.on ? F.x : P.x, pz = F.on ? F.z : P.z, low = api.GFX && api.GFX.low; X.cap = low ? 4 : 8;
  const want = X.hold || (api.INT && api.INT.on) ? [] : outNear(px, pz, 130).slice(0, X.cap), ids = new Set(want.map(o => o.p.id));
  for (let i = X.cast.length - 1; i >= 0; i--) { const c = X.cast[i], o = want.find(q => q.p.id === c.p.id); if (!ids.has(c.p.id) || !o || c.key !== o.a.key) { if (T.cur && T.cur.c === c) endTalk(); release(c); X.cast.splice(i, 1); } }
  routeBudget = 1;
  for (const o of want) {
    if (X.cast.some(c => c.p.id === o.p.id)) continue; const w = X.pool.pop() || figure(X.cast.length + X.pool.length); if (!w) return;
    const K = window.TLXGK, L = K.dress(w, o.p, { warm: true }); K.grin(w, 0.25); const sc = L.sc || (o.p.age < 13 ? 0.6 + o.p.age * 0.02 : 0.86);
    const c = { p: o.p, d: o.d, w, act: o.a.act, key: o.a.key, sc, t: hash(o.p.id + "t") * 600, s: 0, dir: 1, x: o.d.fx, z: o.d.fz, yaw: Math.atan2(o.d.nx, o.d.nz), look: 0, stop: 0, wave: 0, ph: hash(o.p.id) * 9 };
    const v = N.villages().find(q => q.id === o.p.vid) || { x: o.d.fx, z: o.d.fz };
    if (c.act === "errand" || c.act === "work") { if (routeBudget-- <= 0 && !X.routes[o.p.home]) { X.pool.push(w); continue; } const tgt = c.act === "work" && W.depot && Math.hypot(W.depot.x - o.d.fx, W.depot.z - o.d.fz) < 500 ? W.depot : v; c.rt = route(o.d, tgt, o.p.home + (c.act === "work" ? "w" : "")); c.s = hash(o.p.id + o.a.key) * c.rt.len; c.dir = hash(o.p.id + "d" + o.a.key) < 0.5 ? 1 : -1; if (c.act === "work") { c.s = c.rt.len; c.work = 1; } const q = along(c.rt, c.s); c.x = q[0]; c.z = q[1]; c.yaw = q[2]; }
    else { const hm = N.homeBy && N.homeBy[o.p.home], k = hm ? hm.members.indexOf(o.p.id) : 0, nm = hm ? hm.members.length : 1, lat = (k - (nm - 1) / 2) * 1.35 + (hash(o.p.id + "l") - 0.5) * 0.4, fwd = hash(o.p.id + "s") * 1.4 + (c.act === "play" ? 3 : 0); c.hx = o.d.fx + o.d.nz * lat + o.d.nx * fwd; c.hz = o.d.fz - o.d.nx * lat + o.d.nz * fwd; c.x = c.hx; c.z = c.hz; }      // each of the house has their own place on the step, so no two stand in one spot
    w.o.px = undefined; w.g.visible = true; X.cast.push(c);
  }
}
function step(c, dt, px, pz, psp) {
  const w = c.w, U = w.U, dx = px - c.x, dz = pz - c.z, dist = Math.hypot(dx, dz), talking = T.cur && T.cur.c === c; c.t += dt;
  const speed = c.p.age < 13 ? 1.7 : c.p.age > 70 ? 0.85 : 1.25; let moving = false;
  // somebody coming close, or a machine: they stop and let it by; a word stops them too
  if (dist < 1.6 || talking || (psp > 2 && dist < 9)) c.stop = 0.8; else c.stop = Math.max(0, c.stop - dt);
  if (c.stop <= 0) {
    if ((c.act === "errand") && c.rt) { c.s += c.dir * speed * dt; if (c.s >= c.rt.len) { c.s = c.rt.len; c.dir = -1; } else if (c.s <= 0) { c.s = 0; c.dir = 1; } const q = along(c.rt, c.s); c.x = q[0]; c.z = q[1]; c.yaw += wrap((c.dir > 0 ? q[2] : q[2] + Math.PI) - c.yaw) * Math.min(1, dt * 6); moving = true; }
    else if (c.act === "play") { const a = c.t * 0.9 + c.ph, r = 2.2 + Math.sin(c.t * 0.37 + c.ph) * 1.2, nx = c.hx + Math.cos(a) * r, nz = c.hz + Math.sin(a) * r; if (!W.obNear(nx, nz, 0.5)) { c.yaw += wrap(Math.atan2(nx - c.x, nz - c.z) - c.yaw) * Math.min(1, dt * 8); c.x = nx; c.z = nz; moving = true; } }
    else if (c.act === "work" && c.rt) { const a = Math.floor(c.t / 9), k = (c.t / 9) % 1, o0 = hash(c.p.id + "w" + a) * TAU, o1 = hash(c.p.id + "w" + (a + 1)) * TAU, e = k < 0.4 ? k / 0.4 : 1, bx = c.rt.pts[c.rt.pts.length - 1], nx = bx[0] + lerp(Math.cos(o0), Math.cos(o1), e) * 3, nz = bx[1] + lerp(Math.sin(o0), Math.sin(o1), e) * 3; if (k < 0.4 && !W.obNear(nx, nz, 0.5)) { c.yaw += wrap(Math.atan2(nx - c.x, nz - c.z) - c.yaw) * Math.min(1, dt * 6); c.x = nx; c.z = nz; moving = true; } }
  }
  if (!moving && (talking || dist < 5)) c.yaw += wrap(Math.atan2(dx, dz) - c.yaw) * Math.min(1, dt * (talking ? 5 : 1.2));                     // turns to you
  w.o.x = c.x; w.o.z = c.z; w.o.yaw = c.yaw; api.walkAs(w.g, w.o, dt); w.g.scale.setScalar(c.sc); w.g.visible = true;
  w.blob.position.set(c.x, W.surf(c.x, c.z) + 0.07, c.z); w.blob.visible = true;
  // what the hands and head are doing on top of the walk
  const want = dist < 12 ? clamp(wrap(Math.atan2(dx, dz) - c.yaw), -1.1, 1.1) : 0; c.look += (want - c.look) * Math.min(1, dt * 4); U.head.rotation.y = c.look;
  const shov = c.act === "shovel" && !talking && c.stop <= 0; if (w.shovel) w.shovel.visible = c.act === "shovel";
  if (shov) { const ph = c.t * 2.6, dig = Math.sin(ph); U.torso.rotation.x = 0.4 + 0.28 * dig; for (let i = 0; i < 2; i++) { U.arms[i].rotation.set(-0.75 - 0.55 * dig, 0, (i ? 1 : -1) * 0.14); U.fore[i].rotation.set(-0.5 + 0.2 * dig, 0, 0); } }
  else if (c.act === "work" && !moving && !talking) { const ph = c.t * 1.7; U.torso.rotation.x = 0.3 + 0.1 * Math.sin(ph); for (let i = 0; i < 2; i++) { U.arms[i].rotation.set(-0.9 + 0.25 * Math.sin(ph + i * 2), 0, (i ? 1 : -1) * 0.1); U.fore[i].rotation.set(-0.7, 0, 0); } }   // hands busy at a crate
  if (c.wave > 0) { c.wave -= dt; const k = Math.sin(clamp(c.wave / 1.6, 0, 1) * Math.PI); U.arms[1].rotation.set(-2.6 * k, 0, 0.5 * k + 0.25 * Math.sin(c.t * 9) * k); U.fore[1].rotation.set(-0.5 * k, 0, 0); }
  if (talking && !shov) { const g = Math.sin(c.t * 3.1); U.arms[0].rotation.x += -0.25 - 0.12 * g; U.fore[0].rotation.x += -0.5 - 0.2 * g; U.head.rotation.x = 0.04 * Math.sin(c.t * 2.3); }                                    // a hand moving while they talk
  // somebody who knows you lifts a hand as you come up
  if (!c.greeted && dist < 9 && T.regard(c.p.id) >= 2 && c.act !== "work") { c.greeted = 1; c.wave = 1.6; }
}

/* ---------------- a word ---------------- */
const pickS = (arr, seed) => arr[Math.floor(hash(seed) * arr.length) % arr.length];
const fem = q => /mother|daughter|wife|sister/.test(q.role), mas = q => /father|son|husband|brother/.test(q.role), obj = q => fem(q) ? "her" : mas(q) ? "him" : "them";
// how p speaks of q, a member of the same house: "My daughter Ingrid", "Our Ingrid"
const who = (p, q) => { const pr = p.role || "", qr = q.role || ""; let r = "";
  if (p.age < 18) r = { mother: "mum", father: "dad", grandmother: "grandma", grandfather: "grandpa", daughter: "sister", son: "brother" }[qr] || "";
  else if (/^(mother|father)$/.test(pr)) r = { daughter: "daughter", son: "son", mother: "wife", father: "husband", grandmother: "mother", grandfather: "father" }[qr] || "";
  else if (/grand/.test(pr)) r = { daughter: "granddaughter", son: "grandson", grandmother: "wife", grandfather: "husband" }[qr] || "";
  return r ? `My ${r} ${q.first}` : `Our ${q.first}`; };
// the lines somebody could say now: [id, text, your reply, their last word]
function lines(c) {
  const p = c.p, G = api.GS, h = hod(), reg = T.regard(p.id), L = [], add = (id, t, r, e) => L.push([id, t, r, e]), fam = (N.family ? N.family(p) : []).filter(q => q && q.id !== p.id), kid = p.age < 13, vn = p.village || "the village";
  const news = N.since ? N.since(G.hour - 36) : [], you = news.filter(q => q.who === "you").slice(-3), theirs = news.filter(q => q.who === p.id).slice(-1)[0], local = news.filter(q => q.who !== "you" && q.who !== p.id && q.text && (q.place || "").indexOf(vn) >= 0).slice(-2);
  // what you did
  for (const q of you) { const t = q.text || ""; if (/groom|trail|set/i.test(t) || q.kind === "groom") add("you:groom", "Was that you who set the trail? It skis like silk.", "It was. Out again tonight if it snows.", "Then I know where I will be tomorrow."); else if (q.kind === "crash" || /came off|crash/i.test(t)) add("you:crash", "I saw you come off the sled. All in one piece?", "Only my pride is hurt.", "That mends. Go easy."); else if (q.kind === "rescue" || /rescue|brought/i.test(t)) add("you:rescue", "They say you brought somebody in off the fell. That was well done.", "Anyone would have gone.", "Not anyone did. You did."); else if (/plow|dug|drive/i.test(t)) add("you:plow", "Somebody cleared the road before I was even up. You?", "Me and the blade.", "Coffee is on me, then."); }
  // the weather, always something to say about it
  if (G.stormPhase === "storm") add("wx:storm", kid ? "Mamma says I have to come in. It is blowing too much." : "What are you doing out in this? Get under a roof.", "On my way.", "Go on, then. Mind the drifts.");
  else if (G.warned) add("wx:warn", "They are giving a storm on the radio. I am getting the wood in.", "I will keep off the fell.", "Wise. It comes fast up there.");
  else if ((G.storm || 0) > 0.2) add("wx:snow", "More snow. I cleared the step an hour ago.", "It keeps me in work.", "Ha! It would.");
  else add("wx:clear", h < 10 ? "Cold and clear. A morning like this, you forgive the place everything." : h > 17 ? "Look at that sky. There will be lights tonight, I would bet on it." : "Not a breath of wind. Make the most of it.", "I mean to.", "Good.");
  // their day
  if (c.act === "shovel") add("act:shovel", "It never ends. This path was clear this morning.", "Want a hand?", "No, no. It is the only exercise I get.");
  if (c.act === "errand") add("act:errand", pickS(["Just down to the shop for milk.", "Off to see if the post has come.", "Stretching my legs before it gets dark.", "Down to the quay to see what came in."], p.id + day()), "I will not keep you.", "Never a bother.");
  if (c.act === "stand") add("act:stand", pickS(["Just taking the air.", "Waiting for the kettle, if I am honest.", "Listening. You can hear the ferry from here when the wind is right."], p.id + day()), "Nice spot for it.", "Best step in " + vn + ".");
  if (kid) { add("kid:sled", "Is that your sled? How fast does it go?", "Fast enough.", "I am getting one when I am big."); add("kid:fort", "We are building a fort. You cannot come in without the password.", "What is the password?", "I am not telling!"); }
  // family
  if (fam.length && !kid) { const q = pickS(fam, p.id + "f" + day()), w = who(p, q); add("fam:" + q.id, q.age < 16 ? `${w} would live outdoors if we let ${obj(q)}.` : q.interests && q.interests.includes("ski") ? `${w} is out on skis every chance.` : `${w} says hello, I am sure. Or would, if asked.`, "Say hello back.", "I will."); }
  if (kid && fam.length) { const q = fam.find(z => z.age > 25) || fam[0]; add("fam:kid", `${who(p, q)} says I have to be home when the lamps come on.`, "Then do as you are told.", "You sound like " + obj(q) + "."); }
  // the village news, and their own
  for (const q of local) add("news:" + q.id, "Did you hear? " + q.text, "I had not heard.", "Well, now you have.");
  if (theirs && !kid) add("own:" + theirs.id, "I put a picture up on Gram today. Go and have a look.", "I will.", "Tell me if it is any good.");
  // their trade and what they like
  if (!kid && p.trade && p.trade !== "retired" && p.trade !== "pupil") add("trade", /fish|boat/i.test(p.trade) ? "Cod is in off the banks. If the weather holds we are out again at four." : /teach/i.test(p.trade) ? "Twenty-two children and a snow day coming. Pray for me." : /shop|store/i.test(p.trade) ? "The freight was late again, so half my shelves are air." : `Work is work. ${p.trade[0].toUpperCase() + p.trade.slice(1)} does not stop for winter.`, "Good luck with it.", "Takk.");
  if (p.trade === "retired") add("retired", "Forty years I worked through winters like this. Now I watch them. Much better.", "You earned it.", "I did.");
  if (p.interests && p.interests.includes("ski") && !kid) add("int:ski", "If somebody set Lysløypa properly I would be out there every evening.", "Leave it with me.", "I will hold you to that.");
  if (p.interests && p.interests.includes("birds")) add("int:birds", "There was an eagle on the breakwater post this morning. Sat there like it owned the harbour.", "I will look for it.", "Early is best.");
  // who you are to them
  if (reg === 0) add("who:new", kid ? "Who are you?" : "You are the courier off the ferry, are you not? Welcome to " + vn + ".", kid ? "The one with the sled." : "That is me.", kid ? "Cool." : "You will do fine here.");
  else if (reg >= 4) add("who:friend", "There you are! I was just thinking it was too quiet.", "Good to see you.", "Come by for coffee. I mean it.");
  if (c.act === "work") return [["busy", pickS(["Cannot stop, the boat is waiting.", "Later! Hands full.", "Not now, we are loading."], p.id + day() + Math.floor(h)), "", ""]];
  return L;
}
X.lines = lines;
function choose(c) { const L = lines(c), mem = (S.mem[c.p.id] = S.mem[c.p.id] || []); const prio = L.filter(l => /^you:|^who:new|^busy/.test(l[0]) && !mem.includes(l[0])); let pool = prio.length ? prio : L.filter(l => !mem.includes(l[0]) && !X.said.includes(l[0] + c.p.vid)); if (!pool.length) pool = L; const l = pool[Math.floor(hash(c.p.id + ":" + S.n) * pool.length) % pool.length]; mem.push(l[0]); if (mem.length > 6) mem.shift(); X.said.push(l[0] + c.p.vid); if (X.said.length > 10) X.said.shift(); return l; }
function near(r) { const F = api.FOOT, P = api.P, px = F.on ? F.x : P.x, pz = F.on ? F.z : P.z; if (T.cur && X.cast.includes(T.cur.c) && Math.hypot(T.cur.c.x - px, T.cur.c.z - pz) < r + 0.6) return T.cur.c;      /* the one you are talking to stays the one you answer */ let best = null, bd = r; for (const c of X.cast) { const d = Math.hypot(c.x - px, c.z - pz); if (d < bd) { bd = d; best = c; } } return best; }
X.near = near;
function talk(c) {
  if (!c) return false; const now = performance.now();
  if (T.cur && T.cur.c === c && T.cur.stage === 1 && T.cur.l[2]) { T.cur.stage = 2; T.cur.t = now; bubble(c, T.cur.l[3], T.cur.l[2]); X.lastLine = { who: c.p.id, you: T.cur.l[2], text: T.cur.l[3] }; return true; }      // your answer, their last word
  const l = choose(c); S.n++; T.cur = { c, l, stage: 1, t: now }; bubble(c, l[1], ""); X.lastLine = { who: c.p.id, id: l[0], text: l[1] };
  if (l[0] !== "busy") { const d = day(); if (S.day[c.p.id] !== d) { S.day[c.p.id] = d; S.reg[c.p.id] = (S.reg[c.p.id] || 0) + 1; if (S.reg[c.p.id] === 2) api.toast(`${c.p.first} ${c.p.last} knows you by name now.`, "good"); } }
  return true;
}
function endTalk() { T.cur = null; if (bub) bub.style.opacity = "0"; }
X.talk = talk; X.endTalk = endTalk;
// the bubble: over their head, following it; your own line under it
let bub = null;
function bubble(c, text, mine) {
  if (!bub) { bub = document.createElement("div"); bub.id = "talkBub"; bub.style.cssText = "position:fixed;left:0;top:0;max-width:min(300px,46vw);padding:5px 9px;border-radius:10px;background:rgba(250,252,255,.94);color:#14202b;font:500 12.5px/1.3 'Barlow Semi Condensed',system-ui,sans-serif;pointer-events:none;z-index:6;opacity:0;transition:opacity .2s;transform:translate(-50%,-100%);box-shadow:0 2px 10px rgba(0,0,0,.25)"; document.body.appendChild(bub); }
  const e = t => String(t).replace(/[&<>"]/g, q => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[q]));
  bub.innerHTML = (mine ? `<div style="opacity:.6;font-size:11px;margin-bottom:2px">You: ${e(mine)}</div>` : "") + `<b style="font-size:10px;letter-spacing:.05em;opacity:.65">${e(c.p.first.toUpperCase())}</b><br>${e(text)}`; bub.style.opacity = "1";
}
const _v = { v: null };
function placeBubble() {
  if (!bub || !T.cur) return; const c = T.cur.c, TH = api.THREE; if (!_v.v) _v.v = new TH.Vector3(); const v = _v.v.set(c.x, W.surf(c.x, c.z) + 1.95 * c.sc + 0.25, c.z).project(api.camera);
  if (v.z > 1) { bub.style.opacity = "0"; return; } bub.style.left = clamp((v.x + 1) / 2 * innerWidth, 90, innerWidth - 90) + "px"; bub.style.top = clamp((1 - v.y) / 2 * innerHeight, 60, innerHeight - 40) + "px";
}
const kh = (a, w) => api.INP.dev === "touch" ? "tap " + api.btn(a) : api.btn(a) + ": " + w;
const label = c => T.cur && T.cur.c === c && T.cur.stage === 1 && T.cur.l[2] ? "REPLY" : "TALK";
const hintOf = c => T.cur && T.cur.c === c && T.cur.stage === 1 && T.cur.l[2] ? kh("use", `"${T.cur.l[2]}"`) : kh("use", `a word with ${c.p.first}`);
const blocked = () => !X.ready || api.busy() || (api.INT && api.INT.on) || (api.MNT && api.MNT.on) || (api.DMT && api.DMT.on);
const FOOTX = { use() { if (!api.FOOT.on || blocked()) return null; const c = near(2.8); if (!c) return null; return { label: label(c), hint: () => hintOf(c), act: () => talk(c) }; } };
const RIDEX = { use() { if (api.FOOT.on || blocked()) return null; const P = api.P; if (Math.hypot(P.vx, P.vz) > 1.2) return null; const c = near(4); if (!c) return null; return { label: label(c), act: () => talk(c) }; } };
const rideLine = () => { if (api.FOOT.on || blocked()) return ""; const P = api.P; if (Math.hypot(P.vx, P.vz) > 1.2) return ""; const c = near(4); return c ? hintOf(c) : ""; };
X.FOOTX = FOOTX; X.RIDEX = RIDEX;

function tick(dt) {
  if (!api.started() || !api.tutDone()) return; if (!N.people || !N.people.length) return;
  scanT -= dt; if (scanT <= 0) { scanT = 1; scan(); }
  const F = api.FOOT, P = api.P, px = F.on ? F.x : P.x, pz = F.on ? F.z : P.z, psp = F.on ? 0 : Math.hypot(P.vx, P.vz);
  for (const c of X.cast) step(c, dt, px, pz, psp);
  if (T.cur) { const c = T.cur.c, d = Math.hypot(c.x - px, c.z - pz), age = performance.now() - T.cur.t; if (d > 6 || age > (T.cur.stage === 2 || !T.cur.l[2] ? 4200 : 7000) || !X.cast.includes(c)) endTalk(); else placeBubble(); }
}
TLX.register({
  id: "folk", v: 1, state0: () => ({ reg: {}, day: {}, mem: {}, n: 0 }),
  init(a) {
    api = a; W = a.world; N = window.TLXN; S = TLX.state("folk"); for (const k of ["reg", "day", "mem"]) if (!S[k] || typeof S[k] !== "object" || Array.isArray(S[k])) S[k] = {}; if (!(S.n >= 0)) S.n = 0;
    for (const k in S.reg) if (!(S.reg[k] >= 0)) delete S.reg[k];
    if (!N) return; a.footx.push(FOOTX); if (a.rideUse) a.rideUse.push(RIDEX); if (a.ridex) a.ridex.push(rideLine); X.ready = true;
  },
  tick(dt) { if (!X.ready) return; try { tick(dt); } catch (e) { if (!X.err) { X.err = String(e && e.stack || e); console.error("TLX folk", e); } } }
});
})();

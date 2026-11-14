// Tracklayer — open-water fishing from the boat (expansion slice 14.3, loop/EXPANSION.md milestone 14).
// Loaded after tlx-boats.js (it plugs into the skiff through TLXB.addOn) and after icefish.js (it shares the catch).
//
// WHAT IT IS. Sat in the skiff, stopped, with 4 m or more of water under the keel, the use control puts a handline
// over the side: a wooden frame (juksa) of heavy line with a 200 g pilk on the end. The brake control lets line out
// (the pilk sinks about 3 m a second until it lies on the bottom), the gas control hauls it in hand over hand; a lift
// and a drop is a jig stroke, and the fish want it worked (each species has its own taste for how hard). What bites
// depends on the water: saithe hunt in mid-water over almost any depth, cod and haddock feed within a few metres of the
// bottom, wolffish lie on it, redfish live past 40 m and halibut are the rare heavy ones on deep ground. Some marks hold
// more fish than others (a fixed pattern over the sea: drift or move until the tugs come). A tug wants a haul within
// about a second and a half to set the hook; then the fish comes up against you. A small one just comes. A heavy one
// runs: hauling against a run stretches the line (the bar), and a second of that parts it; hold still, or give line
// with the brake control, until the run is over. Slack for too long and the hook shakes out.
//
// THE CATCH is ice fishing's catch: the same cooler (GS.fish.cooler, 10 fish, two days fresh), the same logbook and
// personal bests, the same Fiskemottak on the quay pier (today's price per kilo wanders the same way), and sea fish
// fill the "any fresh fish" orders in Parcels. The six sea species are added to icefish.js's species table through
// TLFish.addSpecies, so an old save with sea fish in the cooler loads. Nothing of its own is saved: a line that was
// down at a reload is simply back on its frame.
//
// CONTROLS. Nothing new to bind: use (E / L3 / the FISH pill on touch) starts and stows, gas and brake work the line
// while it is down (tracklayer.js hands them here through VEH.cur.grab and the boat's motor gets nothing). Getting out,
// a storm, the shallows or a rescue stow the line for you.
(() => {
"use strict";
if (!window.TLXB || !TLXB.addOn) return;

// the sea species. depth = the bottom depths it lives over (m); off = how far off the bottom it feeds; like = how hard
// it wants the pilk worked (0 still .. 1 hard); str = how it pulls for its weight; price = $ per kg at the Fiskemottak;
// w = how common; k, slim, col, belly as in icefish.js (length from weight, the picture)
const SEA = {
  saithe:   { name: "Saithe",   local: "sei",      col: "#4d5a55", belly: "#cfd6d2", kg: [0.5, 6],  depth: [4, 80],  off: 60,  str: 0.9, like: 1.0,  price: 2.4, w: 34,  k: 0.0105, slim: 0.24, sea: true },
  cod:      { name: "Cod",      local: "torsk",    col: "#8a7a4e", belly: "#e9e2c8", kg: [1, 14],   depth: [10, 80], off: 6,   str: 0.8, like: 0.7,  price: 4.2, w: 30,  k: 0.0115, slim: 0.26, sea: true },
  haddock:  { name: "Haddock",  local: "hyse",     col: "#6f7480", belly: "#e6e8ea", kg: [0.5, 3.5], depth: [18, 80], off: 3,  str: 0.6, like: 0.5,  price: 4.8, w: 18,  k: 0.0105, slim: 0.25, sea: true },
  wolffish: { name: "Wolffish", local: "steinbit", col: "#5c6470", belly: "#b9bdc4", kg: [2, 9],    depth: [15, 60], off: 1.5, str: 1.0, like: 0.3,  price: 5.6, w: 7,   k: 0.009,  slim: 0.2,  sea: true },
  redfish:  { name: "Redfish",  local: "uer",      col: "#c8432e", belly: "#f0a58c", kg: [0.4, 1.6], depth: [40, 80], off: 8,  str: 0.5, like: 0.6,  price: 8,   w: 14,  k: 0.017,  slim: 0.36, sea: true },
  halibut:  { name: "Halibut",  local: "kveite",   col: "#4a4636", belly: "#f1eee4", kg: [4, 45],   depth: [30, 80], off: 2,   str: 1.6, like: 0.4,  price: 13,  w: 2.5, k: 0.0125, slim: 0.4,  sea: true }
};
const ORDER = ["cod", "saithe", "haddock", "wolffish", "redfish", "halibut"];
if (window.TLFish && TLFish.addSpecies) for (const k of ORDER) TLFish.addSpecies(k, SEA[k]);

// tunables
const MIN_DEPTH = 4, STOP_V = 0.8, ROUGH = 0.65;                               // water under the keel to fish; "stopped"; too rough above this storm
const PAY_V = 3.0, HAUL_V = 1.5, SPOOL = 120;                                  // m/s the pilk sinks, m/s hand over hand, m of line on the frame
const BITE_K = 0.045, BITE_WIN = 1.5;                                          // bites per second per unit of everything; seconds to set the hook
const PART_T = 1.0, SLACK_T = 3.5, RIG_T = 5;                                  // seconds over the line's limit before it parts; of slack before the hook may shake out; to tie on a new pilk

let api = null, T = null, K = null;
const clamp = (x, a, b) => x < a ? a : x > b ? b : x, lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const F = { on: false, R: null, L: 0, bot: 0, act: 0, dir: 0, st: "down", fish: null, bite: null, tens: 0, strain: 0, slack: 0, rigT: 0, msg: "", msgT: 0, in: { thr: 0, brk: 0 }, v: 0, ph: 0, lean: 0,
  land: null, quiet: 0, saidQuiet: false, sess: 0 };
const D = () => api.GS.fish;
const coolerMax = () => (window.TLFish && TLFish.coolerMax ? TLFish.coolerMax() : 10);

// the marks: a fixed pattern over the sea, 0 (empty water) .. 1 (a good mark)
function hash(i, j) { let h = (i * 374761393 + j * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, z) { const i = Math.floor(x), j = Math.floor(z), u = x - i, v = z - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v); return lerp(lerp(hash(i, j), hash(i + 1, j), a), lerp(hash(i, j + 1), hash(i + 1, j + 1), a), b); }
function markAt(x, z) { return sstep(0.32, 0.72, 0.65 * vnoise(x / 150 + 31.7, z / 150 - 12.3) + 0.35 * vnoise(x / 47 - 5.1, z / 47 + 77.7)); }
// dawn and dusk are the bite; the middle of a bright day and the dead of night are slower
function todK() { const d = api.dayFactor(); return 0.75 + 0.6 * (1 - Math.abs(d - 0.45) / 0.55) * (d > 0.02 && d < 0.98 ? 1 : 0.4); }
// which species would look at a pilk at depth L over a bottom at bot, and how much each wants it right now
function takers(L, bot, act) {
  const out = []; let sum = 0;
  for (const k of ORDER) {
    const s = SEA[k]; if (bot < s.depth[0] || L < 2) continue;
    const up = bot - L; if (up > s.off + 1) continue;
    const ideal = 0.3 + 0.55 * s.like, jig = 0.15 + 0.85 * clamp(1 - Math.abs(act - ideal) / 0.9, 0, 1);
    const deepK = k === "saithe" ? 1 : 0.6 + 0.4 * sstep(s.depth[0], s.depth[0] + 15, bot);
    const w = s.w / 30 * jig * deepK * (up < 0.4 ? 0.35 : 1);                    // a pilk lying on the bottom isn't worked
    out.push([k, w]); sum += w;
  }
  return { list: out, sum };
}
function where() {
  const P = api.P; let best = null, bd = 1500;
  for (const Q of K.DOCKS) { const d = Math.hypot(Q.x - P.x, Q.z - P.z); if (d < bd) { bd = d; best = Q; } }
  return best ? "the fjord off " + (best.site && best.site.type === "depot" ? "the quay" : K.shortSite(best.site)) : "the open fjord";
}
function say(m, t = 2.2) { F.msg = m; F.msgT = t; }
const useName = () => api.INP.dev === "touch" ? null : api.btn("use");

/* ---------------- can I fish here, starting and stowing ---------------- */
function seated(R) { return !!R && api.veh.cur && !api.FOOT.on && !api.MNT.on && !api.DMT.on && !api.GS.dead && !(api.HELP.on && api.HELP.kind === "sea"); }
function can(R) {
  if (!seated(R) || !api.started() || api.busy()) return 0;
  const P = api.P; if (Math.hypot(P.vx, P.vz) > STOP_V) return 0;
  const d = K.depthAt(P.x, P.z); return d >= MIN_DEPTH ? d : 0;
}
function start(R) {
  const d = can(R); if (!d) return false;
  if ((api.GS.storm || 0) > ROUGH) { api.toast("Too rough to work a handline. Wait for the sea to lie down.", "warn"); return true; }
  Object.assign(F, { on: true, R, L: 0, bot: d, act: 0, dir: 0, st: "down", fish: null, bite: null, tens: 0, strain: 0, slack: 0, msg: "", msgT: 0, v: 0, land: null, quiet: 0, saidQuiet: false, sess: 0 });
  F.in.thr = F.in.brk = 0; R.fishing = true;
  build(R); hud(true);
  api.toast(`Handline over the side: ${Math.round(d)} m under the keel. ${api.btn("brake")} lets the pilk down, ${api.btn("gas")} hauls. Work it: lift and drop.`);
  return true;
}
function stop(R, why) {
  if (!F.on || (R && F.R !== R)) return;
  if (F.fish && !why) why = `You let the ${SEA[F.fish.key].name.toLowerCase()} go with the line.`;
  F.on = false; F.fish = null; F.bite = null; if (F.R) F.R.fishing = false;
  hud(false); if (F.G) { F.G.line.visible = false; F.G.frame.visible = false; F.G.fishM.visible = false; }
  if (why) api.toast(why, "warn");
  else if (F.sess) api.toast(`Line wound in. ${F.sess} fish this drift, ${D().cooler.length} of ${coolerMax()} in the cooler. The Fiskemottak on the quay pier buys.`);
}
function use(R) { if (F.on && F.R === R) { stop(R); return true; } return start(R); }
function useLabel(R) { return F.on && F.R === R ? "STOW" : can(R) ? "FISH" : null; }
function useHint(R) {
  if (F.on) return "";
  const d = can(R); if (!d) return "";
  const k = useName();
  return `${k ? k + ": " : ""}handline over the side · ${Math.round(d)} m under the keel${k ? "" : " · tap FISH"}`;
}
function grab(R, thr, brk) { if (!F.on || F.R !== R) return false; F.in.thr = thr; F.in.brk = brk; return true; }

/* ---------------- the line, the bite, the fight ---------------- */
function newFish(key) {
  const s = SEA[key], g = markAt(api.P.x, api.P.z), r = Math.pow(Math.random(), 2.6 - 0.8 * g);
  const kg = +(s.kg[0] + (s.kg[1] - s.kg[0]) * r).toFixed(2);
  return { key, kg, pull: s.str * (0.35 + 0.65 * Math.min(1.2, Math.sqrt(kg / 20))), stam: 1, run: 0, rest: 0.8 + Math.random() };
}
function lose(msg, parted) {
  F.fish = null; F.bite = null; F.st = "down"; F.tens = 0; F.strain = 0; F.slack = 0;
  if (parted) { F.L = 0; F.rigT = RIG_T; }
  say(msg, 3); api.toast(msg, "warn");
}
function land() {
  const f = F.fish, s = SEA[f.key], d = D(), cm = Math.round(Math.cbrt(f.kg * 1000 / s.k)), v = Math.max(1, Math.round(f.kg * s.price));
  F.fish = null; F.st = "down"; F.L = 0; F.tens = 0; F.strain = 0; F.act = 0;
  const lg = d.log; lg.n++; lg.kg = +(lg.kg + f.kg).toFixed(2);
  const pb = !lg.best[f.key] || f.kg > lg.best[f.key].kg;
  if (pb) lg.best[f.key] = { kg: f.kg, cm, lake: where(), at: api.CAL.now().label };
  F.land = { key: f.key, kg: f.kg, cm, t: 0 };
  const head = `${s.name} (${s.local}), ${f.kg.toFixed(1)} kg, ${cm} cm${pb ? ", your best" : ""}`;
  if (d.cooler.length >= coolerMax()) { api.toast(`${head}. The cooler's full at ${coolerMax()}: back it goes. Sell some at the Fiskemottak on the quay.`, "warn"); say("Released: the cooler's full", 3); }
  else {
    d.cooler.push({ sp: f.key, kg: f.kg, cm, v, t: +api.CAL.abs().toFixed(3), lake: where() }); lg.kept = (lg.kept || 0) + 1; F.sess++;
    api.toast(`${head}: ${api.fmtCash(v)} in the cooler (${d.cooler.length} of ${coolerMax()}).`, "good"); say(`${s.name}, ${f.kg.toFixed(1)} kg aboard`, 3);
  }
  api.thud(0.25); api.save();
}
function step(R, dt) {
  const P = api.P, I = F.in, haul = I.thr > 0.3, pay = I.brk > 0.3 && !haul;
  F.bot = K.depthAt(P.x, P.z);
  if (!seated(R)) { stop(R, F.fish ? "The line's gone over the side with the fish." : ""); return; }
  if (F.bot < MIN_DEPTH - 1) { stop(R, "She's drifted into the shallows: line wound in."); return; }
  if ((api.GS.storm || 0) > ROUGH + 0.1) { stop(R, "The sea's getting up: line wound in."); return; }
  F.msgT = Math.max(0, F.msgT - dt); F.rigT = Math.max(0, F.rigT - dt);
  if (F.land) { F.land.t += dt; if (F.land.t > 1.5) F.land = null; }
  const maxL = Math.min(SPOOL, F.bot - 0.1), L0 = F.L;
  if (F.fish) {                                                                 // ---- a fish on
    const f = F.fish, s = SEA[f.key], live = 0.4 + 0.6 * f.stam;
    if (f.run > 0) { f.run -= dt; if (f.run <= 0) f.rest = (1.4 + Math.random() * 2) * (1.6 - 0.6 * f.stam); }
    else if (f.stam > 0.15) { f.rest -= dt; if (f.rest <= 0) f.run = 1.1 + Math.random() * 1.1; }
    const running = f.run > 0;
    let tens = (haul ? 0.35 : 0.1) + f.pull * (running ? 0.75 : 0.25) * live + (haul && running ? 0.35 : 0);
    if (pay) tens *= 0.5;
    F.tens += (tens - F.tens) * (1 - Math.exp(-9 * dt));
    if (pay) F.L += 1.5 * dt;
    else if (haul && !running) F.L -= HAUL_V * (1 - 0.6 * clamp(f.pull * live, 0, 1)) * dt;
    else if (running) F.L += 0.5 * f.pull * dt;
    F.L = clamp(F.L, 0, maxL);
    f.stam = Math.max(0, f.stam - dt * (0.05 + (haul ? 0.12 : 0)) / (0.5 + f.kg / 8));
    F.strain = F.tens > 1 ? F.strain + dt : Math.max(0, F.strain - dt * 0.7);
    F.slack = !haul && !running ? F.slack + dt : Math.max(0, F.slack - dt * 2);
    if (F.strain > PART_T) return lose(`The line parted on the ${s.name.toLowerCase()}'s run. Give line when it runs. Tying on a new pilk.`, true);
    if (F.slack > SLACK_T && Math.random() < 0.3 * dt) return lose("Slack line: the hook shook out.");
    if (F.L <= 0.5) return land();
    if (F.msgT <= 0) F.msg = running ? (F.tens > 1 ? "IT'S RUNNING: ease off!" : "Running: hold, or give line") : haul ? "Coming up" : "Haul!";
  } else {                                                                      // ---- working the pilk
    F.tens += ((haul ? 0.12 : 0.04) - F.tens) * (1 - Math.exp(-6 * dt));
    if (F.rigT <= 0) { if (pay) F.L += PAY_V * dt; else if (haul) F.L -= HAUL_V * dt; }
    F.L = clamp(F.L, 0, maxL);
    const dir = F.rigT > 0 ? 0 : haul ? 1 : pay ? -1 : 0;
    if (dir === 1 && F.dir !== 1 && F.L > 2) F.act = Math.min(1.5, F.act + 0.4);  // a lift after a drop or a pause: one jig stroke
    if (dir !== 0) F.dir = dir;
    F.act = Math.max(0, F.act - 0.22 * dt);
    if (F.bite) {                                                               // a tug: haul to set the hook
      F.bite.t -= dt;
      if (haul) { F.fish = newFish(F.bite.key); F.bite = null; F.st = "fight"; F.slack = 0; F.strain = 0; F.quiet = 0; api.thud(0.2); say(`${SEA[F.fish.key].name} on!`, 1.6); }
      else if (F.bite.t <= 0) { F.bite = null; say("Missed it: haul the moment it tugs", 2.5); }
    } else if (F.rigT <= 0 && F.L > 2) {
      const tk = takers(F.L, F.bot, F.act), rate = BITE_K * tk.sum * (0.3 + 1.4 * markAt(P.x, P.z)) * todK();
      F.rate = rate;
      if (Math.random() < rate * dt) {
        let r = Math.random() * tk.sum, key = tk.list[0][0]; for (const [k, w] of tk.list) { r -= w; if (r <= 0) { key = k; break; } }
        F.bite = { key, t: BITE_WIN }; api.thud(0.12); say("A TUG! Haul!", BITE_WIN);
      }
      F.quiet += dt;
      if (F.quiet > 45 && !F.saidQuiet) { F.saidQuiet = true; api.toast(tk.sum < 0.2 ? "Nothing at this depth. Most fish feed near the bottom: let the pilk down." : "Slow here. Keep working it, or move to another mark.", "warn"); }
    }
    if (F.msgT <= 0) F.msg = F.rigT > 0 ? "Tying on a new pilk…" : F.L < 0.3 ? "Line's up" : F.L >= maxL - 0.05 ? "On the bottom: lift it" : F.act > 0.25 ? "Jigging" : "Lift and drop to work it";
  }
  F.v = (F.L - L0) / Math.max(dt, 1e-4);
  if (F.v < -0.05) F.ph += -F.v * dt * 5.2;                                     // hand over hand: one hand's pull is about 0.6 m
}

/* ---------------- what you see: the line over the gunwale, the frame, the fish coming aboard, the hands ---------------- */
const SIDE = -1;                                                               // starboard (the boat's +x is its left)
const LZ = -1.28;                                                              // where along the boat the line goes over
function build(R) {
  if (F.G && F.G.R === R) { F.G.line.visible = true; F.G.frame.visible = true; return; }
  const g = {}; g.R = R;
  g.pos = new Float32Array(9); g.geo = new T.BufferGeometry(); g.geo.setAttribute("position", new T.BufferAttribute(g.pos, 3));
  g.mat = new T.LineBasicMaterial({ color: 0xd9d2b4 }); g.line = new T.Line(g.geo, g.mat); g.line.frustumCulled = false; R.body.add(g.line);
  const wood = new T.MeshStandardMaterial({ color: 0x9a7a52, roughness: 0.85 }), cord = new T.MeshStandardMaterial({ color: 0xcfc7a6, roughness: 0.9 });
  g.frame = new T.Group();                                                      // the juksa: a wooden H frame wound with line, on the thwart beside you
  for (const sx of [-0.09, 0.09]) { const m = new T.Mesh(new T.BoxGeometry(0.025, 0.025, 0.3), wood); m.position.set(sx, 0, 0); g.frame.add(m); }
  for (const sz of [-0.1, 0.1]) { const m = new T.Mesh(new T.BoxGeometry(0.2, 0.022, 0.03), wood); m.position.set(0, 0, sz); g.frame.add(m); }
  { const m = new T.Mesh(new T.BoxGeometry(0.15, 0.05, 0.17), cord); g.frame.add(m); }
  g.frame.position.set(0.52, 0.29, K.ROW.seat.z + 0.02); g.frame.rotation.y = 0.5; g.frame.traverse(o => { o.castShadow = true; }); R.body.add(g.frame);
  // the fish on the line as it comes over the gunwale (one mesh, scaled and coloured per catch)
  g.fishMat = new T.MeshStandardMaterial({ color: 0x8a7a4e, roughness: 0.5, metalness: 0.15 });
  g.fishM = new T.Group();
  { const b = new T.Mesh(new T.SphereGeometry(0.5, 12, 8), g.fishMat); b.scale.set(0.24, 1, 0.19); g.fishM.add(b);
    const t = new T.Mesh(new T.ConeGeometry(0.16, 0.26, 4), g.fishMat); t.position.y = -0.58; t.scale.z = 0.25; g.fishM.add(t); }
  g.fishM.visible = false; g.fishM.traverse(o => { o.castShadow = true; }); R.body.add(g.fishM);
  if (F.G) { for (const o of [F.G.line, F.G.frame, F.G.fishM]) if (o.parent) o.parent.remove(o); }
  F.G = g;
}
function draw(R, dt) {
  const g = F.G; if (!g) return;
  const gx = SIDE * (K.bw(LZ) + 0.02), gy = K.sheer(LZ) + 0.03, f = F.fish, t = api.now();
  const wob = f ? (f.run > 0 ? 0.22 : 0.07) * (0.4 + 0.6 * f.stam) : 0;
  const hx = SIDE * 0.62, hy = 0.72 + 0.05 * Math.sin(F.ph), hz = LZ + 0.04;       // the hands, over the gunwale
  const wx = gx + SIDE * (0.1 + wob * Math.sin(t * 5.1)), wz = LZ + wob * Math.cos(t * 3.7) - clamp(api.P.vx * Math.sin(api.P.yaw) + api.P.vz * Math.cos(api.P.yaw), -1, 1) * 0.4;
  const p = g.pos; p[0] = hx; p[1] = hy; p[2] = hz; p[3] = gx; p[4] = gy; p[5] = LZ; p[6] = wx; p[7] = -1.6; p[8] = wz;
  g.geo.attributes.position.needsUpdate = true; g.line.visible = true;
  g.mat.color.setHex(0xd9d2b4).multiplyScalar(0.18 + 0.82 * api.dayFactor());   // an unlit line: it follows the daylight
  // the catch: up out of the water on the line, over the gunwale, down into the boat
  const ld = F.land;
  if (ld) {
    const s = SEA[ld.key], len = clamp(ld.cm / 100, 0.25, 1.5), u = clamp(ld.t / 1.1, 0, 1);
    g.fishMat.color.set(s.col); g.fishM.scale.set(len * (s.slim / 0.26), len, len);
    const y = u < 0.55 ? lerp(-0.5, gy + 0.45 * len + 0.25, sstep(0, 0.55, u)) : lerp(gy + 0.45 * len + 0.25, 0.1, sstep(0.55, 1, u));
    const x = u < 0.55 ? wx : lerp(wx, SIDE * 0.2, sstep(0.55, 1, u));
    g.fishM.position.set(x, y, LZ + 0.1); g.fishM.rotation.set(0, 0.6 * Math.sin(t * 9), u > 0.55 ? sstep(0.55, 1, u) * 1.3 : 0.12 * Math.sin(t * 22)); g.fishM.visible = ld.t < 1.25;
  } else g.fishM.visible = false;
}
// the helmsman turned to the gunwale, hauling hand over hand (tlx-boats.js poseSeated asks first)
function pose(R, g) {
  if (!F.on || F.R !== R) return false;
  const U = g.userData, d = K.ROW, f = F.fish, s = Math.sin(F.ph), run = f && f.run > 0 ? 1 : 0;
  F.lean += ((0.34 + 0.16 * clamp(F.tens, 0, 1.3) - 0.1 * run) - F.lean) * 0.12;
  g.position.set(d.seat.x + 0.16, d.seat.y - 0.93, d.seat.z + 0.08); g.rotation.set(0, SIDE * 0.8, 0);   // half turned on the thwart toward the side the line is on, boots inboard
  U.torso.rotation.set(F.lean, SIDE * 0.45, 0); U.torso.position.y = 0.93; U.head.rotation.set(0.3, SIDE * 0.15, 0);
  for (let i = 0; i < 2; i++) {
    U.legs[i].rotation.set(-1.3, 0, (i ? 1 : -1) * 0.14); U.legs[i].position.set(i ? 0.1 : -0.1, 0.93, 0); U.shins[i].rotation.x = 1.55; U.ank[i].rotation.x = 0.05;
    const k = i ? s : -s;                                                       // one hand reaches down the line as the other pulls up
    U.arms[i].rotation.set(-0.95 - 0.28 * k, 0, (i ? 1 : -1) * 0.1); U.fore[i].rotation.x = -0.72 + 0.4 * k;
  }
  return true;
}

/* ---------------- the HUD: line out, the bottom, the strain on the line ---------------- */
function hud(on) {
  let e = document.getElementById("sfHud");
  if (!e && on) {
    e = document.createElement("div"); e.id = "sfHud";
    e.style.cssText = "position:fixed;left:50%;bottom:calc(92px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:30;pointer-events:none;min-width:250px;max-width:min(92vw,330px);padding:9px 13px 10px;border-radius:12px;background:rgba(10,16,22,.72);color:#e9f0f4;font:600 13px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;text-align:center;backdrop-filter:blur(4px)";
    e.innerHTML = `<div id="sfTop" style="letter-spacing:.04em;font-size:12px;opacity:.85"></div><div id="sfMsg" style="font-size:16px;margin:3px 0 6px"></div><div style="height:7px;border-radius:4px;background:rgba(255,255,255,.16);overflow:hidden"><div id="sfBar" style="height:100%;width:0;background:#5fd38a"></div></div><div id="sfKeys" style="margin-top:6px;font-weight:500;font-size:12px;opacity:.8"></div>`;
    document.body.appendChild(e);
  }
  if (e) e.hidden = !on;
}
function hudTick() {
  const e = document.getElementById("sfHud"); if (!e || e.hidden) return;
  const $ = id => document.getElementById(id), k = useName();
  const top = `HANDLINE · ${F.L.toFixed(0)} m out · bottom ${Math.round(F.bot)} m`, keys = `${api.btn("gas")}: haul · ${api.btn("brake")}: let out · ${k ? k + ": stow" : "tap STOW"}`;
  if ($("sfTop").textContent !== top) $("sfTop").textContent = top;
  if ($("sfMsg").textContent !== F.msg) $("sfMsg").textContent = F.msg;
  if ($("sfKeys").textContent !== keys) $("sfKeys").textContent = keys;
  const b = $("sfBar"); b.style.width = Math.round(clamp(F.tens / 1.25, 0, 1) * 100) + "%"; b.style.background = F.tens > 1 ? "#ff5a4f" : F.tens > 0.75 ? "#ffc15a" : "#5fd38a";
  $("sfMsg").style.color = F.bite || F.tens > 1 ? "#ff9a4a" : "#e9f0f4";
}

function tick(R, r, isCur, dt) {
  if (!F.on || F.R !== R) return;
  if (!isCur) { stop(R, ""); return; }
  step(R, dt);
  if (F.on) { draw(R, dt); hudTick(); }
}
function init(a, kit) { api = a; T = a.THREE; K = kit; }
TLXB.addOn({ init, tick, use, useLabel, useHint, grab, stop: R => stop(R, ""), pose });
window.TLXSF = { SEA, ORDER, F, markAt, takers, todK, newFish, where,
  T: { MIN_DEPTH, STOP_V, ROUGH, PAY_V, HAUL_V, BITE_K, BITE_WIN, PART_T, SLACK_T, RIG_T } };
})();

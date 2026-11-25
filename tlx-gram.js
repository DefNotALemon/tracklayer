// Tracklayer: Gram (goal G7, loop/HOME.md H2). Slice H2a: the feed, its pictures, and the Local chat.
//
// A tablet app in the style of a photo app, for the Nordkinn. Tabs: Feed, Reels (a "soon" card: H2b), Local, You (a stub: H2c).
//   FEED   posts newest first: avatar disc, handle, place, how long ago, a picture, a caption in that person's voice, likes, 0-3 comments
//          (family first). A post is made from a news-bus event (TLXN.on) or by the AMBIENT GENERATOR: each game hour a few people do something
//          post-worthy that needs no new mechanics (a view from a lookout, the fjord in a blow, a sunrise, kids sledging, a catch on the quay,
//          northern lights from the door, the snow at the door after a storm, a waffle Sunday...). The wished-for things that are not playable yet
//          (a lake drag race with a crowd, a sled skipped over water, riding with friends in a storm, a reindeer at the lens) appear as honest stills.
//   PICTURES are real renders of the real place. A post stores a RECIPE (camera, aim, lens, game hour, storm, posed props), never pixels. The
//          picture is drawn when the tablet shows the Feed: one at a time, only while the frame rate is healthy and the ride is calm, through
//          api.gram.shot (tracklayer.js gramShot: the world from the recipe's camera at the recipe's hour and storm into a small viewport, copied
//          out to a canvas; the sky, fog and light are put back by one more updSky, so the main view is exactly as it was). Cached for the session
//          (LRU). Low graphics preset, or a render that comes back blank: a painted picture (gradient by hour, a horizon, an icon by subject).
//   LOCAL  a chat for the village you are nearest: the last days' bus events as people would say them, replies to each other, family teasing.
//          Each village has its own (a Mehamn event is not in Ifjord's chat unless it is peninsula wide: a storm, a road, the ferry). You can answer
//          with one of two or three offered lines, and someone answers within a game minute or two.
//
// SAVED: x.sys.gram = { posts: [newest 120 as compact records with recipes], chat: { village: [last 60] }, seen, busId, genH, noteD, last, ... }.
(() => {
"use strict";
const CAP = 120, CHAT = 60, BACKLOG = 20;
let api = null, W = null, T = null;
const G = { ready: false, err: "", view: { tab: "feed", post: null }, genLog: [], renders: 0, renderMs: [], painted: 0, fpsOk: null, cache: new Map(), busy: false, shots: 0, notes: 0, last: null };
window.TLXGR = G;
const S = () => TLX.state("gram");
TLX.option({ id: "gramnotes", name: "Gram notifications", hint: "Gram pings the tablet now and then (at most one a day) for something big: a road you opened, a rescue, a storm. Off = no pings; the feed still fills.", sys: "gram" });

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hashS = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const hash01 = s => hashS(String(s)) / 4294967296;
const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
function rnd() { const s = S(); s.rs = (s.rs + 0x6D2B79F5) >>> 0; let t = s.rs; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const pick = a => a[Math.floor(rnd() * a.length)];
const YOU = { id: "you", first: "Courier", last: "", name: "You", handle: "courier", voice: "warm", vid: null, age: 30, interests: [], role: "", village: "" };
const who = id => id === "you" ? YOU : (window.TLXN && TLXN.person(id)) || null;
const HOURS = () => api.gameHour || 50;
const calAt = H => api.CAL.now(H);

/* ---------------- places and spots ---------------- */
const nearestVil = (x, z) => { let b = null, bd = 1e12; for (const v of TLXN.villages()) { const d = Math.hypot(v.x - x, v.z - z); if (d < bd) { bd = d; b = v; } } return b; };
const surf = (x, z) => W.surf(x, z);
const landOk = (x, z) => !W.isSea(x, z) && !W.isWater(x, z) && W.groundAt(x, z) > 1;
const openOk = (x, z, r = 2.2) => landOk(x, z) && !W.obNear(x, z, r);
// a spot near (x, z) with room round it: the first of a growing ring
function openSpot(x, z, r0 = 3.5) {
  if (openOk(x, z)) return [x, z];
  for (let r = r0; r < 40; r += 3.5) for (let k = 0; k < 10; k++) { const a = k * 0.628 + r; const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (openOk(px, pz)) return [px, pz]; }
  return null;
}
const COAST = {};                                                                                     // a vantage on the shore near a village, looking out to sea (cached, not saved)
function coastOf(v) {
  if (COAST[v.id] !== undefined) return COAST[v.id];
  let best = null;
  for (let r = 40; r <= 700 && !best; r += 60) for (let k = 0; k < 24; k++) {
    const a = k / 24 * 6.283, x = v.x + Math.cos(a) * r, z = v.z + Math.sin(a) * r;
    if (!openOk(x, z, 3) || W.groundAt(x, z) > 40) continue;
    for (let q = 0; q < 16 && !best; q++) {                                                               // is the sea close, and in which direction
      const b = q / 16 * 6.283; for (let d = 25; d <= 120; d += 25) if (W.isSea(x + Math.cos(b) * d, z + Math.sin(b) * d)) { best = { x, z, yaw: b }; break; }
    }
    if (best) break;
  }
  return (COAST[v.id] = best);
}
const SLOPE = {};                                                                                    // a gentle slope near a village for the sledding (cached)
function slopeOf(v) {
  if (SLOPE[v.id] !== undefined) return SLOPE[v.id];
  let best = null, bs = 0;
  for (let r = 60; r <= 420; r += 40) for (let k = 0; k < 16; k++) {
    const a = k / 16 * 6.283, x = v.x + Math.cos(a) * r, z = v.z + Math.sin(a) * r; if (!openOk(x, z, 12) || W.groundAt(x, z) > 80) continue;
    const gx = (W.groundAt(x + 6, z) - W.groundAt(x - 6, z)) / 12, gz = (W.groundAt(x, z + 6) - W.groundAt(x, z - 6)) / 12, g = Math.hypot(gx, gz);
    if (g > 0.12 && g < 0.3 && openOk(x - gx / g * 12, z - gz / g * 12, 3) && openOk(x + gx / g * 12, z + gz / g * 12, 3) && g > bs) { bs = g; best = { x, z, dx: -gx / g, dz: -gz / g }; }   // d = the way down
  }
  return (SLOPE[v.id] = best);
}
const lookoutFor = v => { let b = null, bd = 1e12; for (const L of W.LOOKOUTS || []) { const d = Math.hypot(L.x - v.x, L.z - v.z); if (d < bd) { bd = d; b = L; } } return b ? { L: b, d: bd } : null; };
const lakeNear = v => { let b = null, bd = 1e12; for (const L of W.LAKES || []) { const d = Math.hypot(L.x - v.x, L.z - v.z); if (d < bd) { bd = d; b = L; } } return b && bd < 4500 ? b : null; };
const yawTo = (x, z, tx, tz) => Math.atan2(tz - z, tx - x);                                          // heading in the x/z plane: 0 = +x
const sunAz = H => { const c = calAt(H), ha = (c.h - 12) / 12 * Math.PI, dec = api.CAL.dec(), la = W.lat, cd = Math.cos(dec), cl = Math.cos(la), sl = Math.sin(la); return { x: -cd * Math.sin(ha), z: -(cl * Math.sin(dec) - sl * cd * Math.cos(ha)) }; };
const stormAt = (x, z, H) => { try { return api.WX.at(x, z, H); } catch (e) { return 0; } };
const elAt = H => api.sunEl(((H % 24) + 24) % 24);
const snowy = () => !(api.MELT && api.MELT.k > 0.45);

/* ---------------- recipes: where the picture is taken from ---------------- */
// rc: c = camera [x, z, height above the snow], a = aim [x, z, height], f = lens, h = game hour, s = storm 0..1, p = posed props [[kind, x, z, yaw, extra]], q = on the quay
function rcMake(c, a, o) {
  const rc = { c: [r1(c[0]), r1(c[1]), r1(c[2])], a: [r1(a[0]), r1(a[1]), r1(a[2] || 1)], f: o.f || 50, h: r2(o.h), s: r2(clamp(o.s || 0, 0, 1)) };
  if (o.p && o.p.length) rc.p = o.p.map(q => [q[0], r1(q[1]), r1(q[2]), r2(q[3]), q[4] === undefined ? 0 : q[4]]);
  if (o.q) rc.q = 1; if (o.pt) rc.pt = o.pt; return rc;
}
// the camera stands at (cx, cz) with eyes at hy, looking toward (ax, az)
const aimAt = (cx, cz, hy, ax, az, ah, o) => rcMake([cx, cz, hy], [ax, az, ah], o);
// the camera at (cx, cz) with eyes hy up, looking along the trig angle yaw (0 = +x) tilted by pitch (radians), aiming at the point dist metres out
function look(cx, cz, hy, yaw, pitch, dist, o) {
  const ax = cx + Math.cos(yaw) * dist, az = cz + Math.sin(yaw) * dist, ay = surf(cx, cz) + hy + Math.tan(pitch) * dist - surf(ax, az);
  return rcMake([cx, cz, hy], [ax, az, ay], o);
}
// is the way ahead open for dist metres (no house, rock or tree in the frame)
function clearAhead(cx, cz, yaw, dist = 30) { for (let d = 3; d <= dist; d += 3) if (W.obNear(cx + Math.cos(yaw) * d, cz + Math.sin(yaw) * d, 1.3)) return false; return true; }
// the direction (trig angle) of the sea from a spot: the nearest water within 220 m, else null
function seaDir(x, z) { let best = null, bd = 1e9; for (let k = 0; k < 36; k++) { const a = k / 36 * 6.283; for (let d = 10; d <= 220 && d < bd; d += 10) if (W.isSea(x + Math.cos(a) * d, z + Math.sin(a) * d)) { bd = d; best = a; break; } } return best; }
// where the shore of a lake is on the ray from its centre at angle a
function shoreAt(L, a) { for (let r = L.r * 0.5; r < L.r * 2.2; r += 4) { const x = L.x + Math.cos(a) * r, z = L.z + Math.sin(a) * r; if (!W.isWater(x, z) && !W.isSea(x, z) && landOk(x, z)) return r; } return L.r; }
// the first spot on a ring round (x, z) with room and a clear view along yaw
function viewSpot(x, z, yaw, dist) { for (let r = 0; r <= 160; r += 12) for (let k = 0; k < (r ? 10 : 1); k++) { const a = k * 0.628 + r * 0.3, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (openOk(px, pz, 2.5) && clearAhead(px, pz, yaw, dist)) return [px, pz]; } return null; }
function walkerProp(p, x, z, yaw) { return ["w", x, z, yaw, p ? p.id : 0]; }

/* ---------------- what they say: voices, captions, comments ---------------- */
const WRAP = {
  dry: { pre: ["", "", "Well. "], post: ["", " Fine.", " Noted.", " As expected.", ""] },
  warm: { pre: ["", "Hei! ", ""], post: [" Lovely.", " So lucky to live here.", " Takk, Nordkinn.", " Happy.", ""] },
  terse: { pre: [""], post: [""] },
  chatty: { pre: ["Okay, listen. ", "Right, so. ", ""], post: [" Honestly!", " I could go on.", " And then I stood there a while.", " Come and see sometime!", ""] },
  wry: { pre: ["", "Behold. "], post: [" As one does.", " Don't tell my knees.", " Not bad for a Tuesday.", ""] },
  earnest: { pre: [""], post: [" Good to be out.", " Grateful for it.", " Worth the effort.", " I will remember this one.", ""] }
};
// what a voice adds to a line about an event or in the chat (not a picture): short and never about a view
const WRAPE = { dry: ["", "", " Noted."], warm: ["", " Take care.", ""], terse: [""], chatty: ["", " Honestly!", ""], wry: ["", " As one does.", ""], earnest: ["", " Be careful out there.", ""] };
const NOR = { peak: [" Nydelig.", " Fy flate.", " Utsikt!"], storm: [" Uff.", " Fy søren."], day: [" Kos.", " Heia!"], aur: [" Nordlys!"], catch: [" Skikkelig fin fisk."], kids: [" Heia, heia!"] };
function say(p, bases, vars, nor, ev) {
  const v = (p && p.voice) || "warm", w = ev ? { pre: [""], post: WRAPE[v] || [""] } : (WRAP[v] || WRAP.warm), f = s => String(s).replace(/\{(\w+)\}/g, (m, k) => vars[k] !== undefined ? vars[k] : m);
  if (v === "terse") return f(bases[0]).replace(/[!]+/g, ".");
  let t = f(pick(bases)); const pre = pick(w.pre), post = pick(w.post);
  t = pre + t + post;
  if (nor && rnd() < 0.22 && (v === "warm" || v === "chatty" || v === "dry" || v === "earnest")) t += pick(nor);
  return t.replace(/\.\./g, ".").replace(/\s+/g, " ").trim();
}
const fishes = ["cod", "haddock", "saithe", "halibut", "wolffish", "redfish"], lakeFish = ["char", "grayling", "trout", "pike"];
const wordOfStorm = s => s > 0.8 ? "a full gale" : s > 0.55 ? "a proper blow" : "a stiff wind and snow";
const hourWord = h => h < 4 ? "in the small hours" : h < 9 ? "this morning" : h < 12 ? "mid-morning" : h < 15 ? "at lunch" : h < 18 ? "this afternoon" : h < 22 ? "this evening" : "late";

// each ambient subject: when it fits a person, where the camera stands, and what they write
const SUBJ = {
  peak: { chip: "VIEW", weight: c => c.el > -9 ? (c.int.photos ? 3 : 0) + (c.int.ski ? 1.5 : 0) + (c.int.sled ? 1 : 0) + (c.int.birds ? 1 : 0) + 0.25 : 0, nor: NOR.peak,
    bases: ["View from {look}. {w}", "{look}, {hr}. {w}", "Up on {look} and the whole fjord is out there. {w}", "Worth the climb to {look}. {w}"],
    chat: ["Up on {look} right now, you can see all the way out", "{look}: clear to the sea. Anyone coming?"] },
  fjordblow: { chip: "STORM", weight: c => c.storm >= 0.35 && c.el > -9 && c.coast ? (c.int.fish ? 3 : 1) + (c.int.photos ? 1 : 0.4) : 0, nor: NOR.storm,
    bases: ["The fjord in {wst}. Boats stay in.", "{place} in a blow. Do not go out.", "Look at the sea at {place} now. {wst}.", "Whitecaps to the horizon. {wst}, and still I came to look."],
    chat: ["The fjord is white at {place}. Keep the boats in", "{wst} at the shore, I would not drive the road now"] },
  sunrise: { chip: "LIGHT", weight: c => c.el > -5 && c.el < 6 && c.storm < 0.35 ? (c.int.photos ? 3.5 : 0.7) + (c.int.birds ? 0.5 : 0) : 0, nor: NOR.peak,
    bases: ["{light} over the fjord.", "{light} again. I never get used to it.", "Colour in the sky at {place}: {light}.", "Up early for this: {light}."],
    chat: ["Look south, the {light} is out over the water", "{light} right now, go to a window"] },
  kidssled: { chip: "KIDS", weight: c => c.kid && c.el > -6 && c.hr >= 12 && c.hr <= 20 && c.snow && c.slope ? 4 : (c.adultKids && c.el > -6 && c.hr >= 12 && c.hr <= 20 && c.snow && c.slope ? 2 : 0), nor: NOR.kids,
    bases: ["Sledding behind the houses. {kids} do not want to go in.", "The hill at {place} is ours today.", "Kids and a sled and a slope. That is the whole plan.", "Third time up the hill and no end in sight."],
    chat: ["The kids have taken the hill behind {place}, mind the bottom of it", "Sledding at {place} if your little ones need somewhere"] },
  coffee: { chip: "MORNING", weight: c => c.adult && c.el > -7 && c.snow !== undefined && ((c.hr >= 6 && c.hr < 10) || (c.hr >= 13 && c.hr < 16)) ? 2 + (c.int.photos ? 0.5 : 0) : 0, nor: NOR.day,
    bases: ["Coffee on the step, {wst2}.", "First coffee, the step, this view.", "The step at {place} and a hot cup. Not moving for an hour.", "Coffee outside. It is {temp}, it is fine."],
    chat: ["Coffee on the step at {place} if anyone is passing", "It is {temp} and I am outside with coffee on purpose"] },
  catch: { chip: "CATCH", weight: c => c.coast && c.int.fish && c.el > -8 && c.storm < 0.35 ? 4 : 0, nor: NOR.catch,
    bases: ["Landed {fish} off the quay. Fish soup tonight.", "{n} kg {fish}, off the quay at {place}.", "The catch at {place}: {fish}, and the gulls know.", "Quiet morning and {fish} for the freezer."],
    chat: ["{fish} on the quay at {place}, if anyone wants some", "Got {n} kg of {fish}, who is up for fish soup?"] },
  sledsummit: { chip: "SLED", weight: c => (c.int.sled || c.int.racing) && c.lookout && c.el > -8 && c.storm < 0.5 ? 3 : 0, nor: NOR.peak,
    bases: ["Parked on top of {look}. {w}", "The sled and the view at {look}.", "{look}, and the sled made it. {w}", "Rode up to {look}. The sled is happy too."],
    chat: ["Rode up to {look}, track is fine most of the way", "The sled is parked on top of {look} and I am not in a hurry"] },
  aurora: { chip: "AURORA", weight: c => c.el < -10 && c.aur > 0.35 && c.storm < 0.3 ? 3 + (c.int.photos ? 3 : 0) : 0, nor: NOR.aur,
    bases: ["Northern lights from the window at {place}.", "Aurora over {place} right now. Go outside.", "The sky is moving over {place}. {w2}", "Lights, straight over the roof. I will not sleep."],
    chat: ["Aurora over {place}!! Out of the window now", "Northern lights right above us, go out and look"] },
  snowdepth: { chip: "SNOW", weight: c => c.snow && c.sinceStorm && c.storm < 0.3 && c.depth > 0.25 ? 3 : 0, nor: NOR.storm,
    bases: ["{cm} cm of snow at my door after the night. Who is shovelling?", "Door nearly blocked: {cm} cm.", "Woke up to {cm} cm at {place}. The shovel and I have a date.", "{cm} cm. Not going anywhere before the plow comes."],
    chat: ["{cm} cm at my door this morning, has the plow been round {place}?", "I measured {cm} cm at the step. Anyone else buried?"] },
  waffles: { chip: "SUNDAY", weight: c => c.dow === 0 && c.hr >= 12 && c.hr < 18 && c.household > 2 ? 4 : 0, nor: NOR.day, paint: "waffle",
    bases: ["Waffle Sunday at ours.", "Vafler, jam and sour cream. The only Sunday plan.", "Waffles at {place} if anyone is passing.", "Sunday and the iron is hot."],
    chat: ["Waffles at ours, door is open", "Sunday waffles at {place}, come by"] },
  wishlake: { chip: "NOT YET", weight: c => (c.int.racing || c.int.sled) && c.lake && c.el > -7 && c.storm < 0.4 ? 1.2 : 0, nor: NOR.day, wish: true,
    bases: ["Picture the whole village at the rope on this lake and two sleds going for it. Not a thing yet. Today it is just the lake.", "Lake drag races, a crowd, a flag. We keep talking about it. Not yet. This is the lake as it is.", "Someone start the drag races here. Right now it is only ice and a very patient crowd of nobody."],
    chat: ["We should have drag races on the lake with the whole village at the rope", "Lake race, anyone? (Not yet, but I am dreaming)"] },
  wishskip: { chip: "NOT YET", weight: c => c.int.sled && c.coast && c.el > -7 && c.storm < 0.4 ? 1.2 : 0, nor: NOR.day, wish: true,
    bases: ["Somebody skip a sled across this and make the far bank. Cannot be done yet. Here is the water.", "Water skipping a sled: the dream. Not in yet, just the sea and a sled-sized ambition.", "This stretch is begging for a sled skip. Not yet, but I looked at it a long time."],
    chat: ["Has anyone skipped a sled over open water? I have been looking at the fjord at {place}", "Water skipping would be amazing, not possible yet"] },
  wishstorm: { chip: "NOT YET", weight: c => (c.int.sled || c.int.racing) && c.storm >= 0.5 && c.el > -9 && c.sled ? 1.5 : 0, nor: NOR.storm, wish: true,
    bases: ["Riding out with friends in this, tail lamps only. Not a thing yet. Pictured from the yard.", "A line of sleds in a storm: that is what I would post. For now, imagine the tail lamps.", "Group ride in a whiteout. Not yet possible, but this is how it would look."],
    chat: ["Imagine a group ride in this. Just the lamps ahead", "Whiteout ride with friends, one day"] },
  reindeerlens: { chip: "NOT YET", weight: c => (c.int.dogs || c.int.photos || c.sami) && c.el > -7 && c.storm < 0.5 && c.snow ? 1.4 : 0, nor: NOR.peak, wish: true,
    bases: ["A reindeer coming right up to the lens out of a snow hole. This is how it would look. Not in the game yet, so a still.", "Reindeer, a metre away, licking the camera: I want to see it. Not yet. A still.", "The reindeer that licks your lens from the snow hole. One day. Today, a very close still."],
    chat: ["Has any of you been licked by a reindeer? Asking for a friend. Not in the game yet", "Reindeer came to check on me. A still, for now"] }
};
const SUBJ_KEYS = Object.keys(SUBJ);

/* ---------------- the recipe for each subject ---------------- */
function lightWord(c) { return c.el < -3 ? "Blue hour" : c.el < 1 ? "Sunrise" : "Low sun"; }
function recipeFor(key, c) {
  const p = c.p, v = c.vil, H = c.H, st = c.storm, o = { h: H, s: st };
  const eye = 1.7;
  if (key === "peak" || key === "sledsummit") {
    const L = c.lookout.L, a0 = yawTo(L.x, L.z, v.x, v.z) + (rnd() - 0.5) * 1.6, hy = eye;
    const spot = openSpot(L.x, L.z, 2.5) || [L.x, L.z], cx = spot[0], cz = spot[1];
    if (key === "sledsummit") {
      const sx = cx + Math.cos(a0 + 1.7) * 4.5, sz = cz + Math.sin(a0 + 1.7) * 4.5, bx = sx - Math.cos(a0 + 0.35) * 5.2, bz = sz - Math.sin(a0 + 0.35) * 5.2;
      if (!openOk(bx, bz, 1)) return null;
      return aimAt(bx, bz, 1.3, sx + Math.cos(a0) * 8, sz + Math.sin(a0) * 8, 1.6 + (surf(sx, sz) - surf(bx, bz)), Object.assign(o, { f: 55, p: [["s", sx, sz, a0 - 1.2, 0]] }));
    }
    if (rnd() < 0.55) {                                                                                   // the poster in the foreground, seen from behind
      const wx = cx + Math.cos(a0) * 3.2 + Math.cos(a0 + 1.57) * 0.9, wz = cz + Math.sin(a0) * 3.2 + Math.sin(a0 + 1.57) * 0.9;
      if (openOk(wx, wz, 0.8) && Math.abs(Math.atan2(surf(wx, wz) + 1.0 - surf(cx, cz) - hy, 3.4) + 0.05) < 0.3) return look(cx, cz, hy, a0, -0.05, 500, Object.assign(o, { f: 58, p: [walkerProp(p, wx, wz, a0)] }));
    }
    return look(cx, cz, hy, a0, -0.05, 500, Object.assign(o, { f: 62 }));
  }
  if (key === "fjordblow" || key === "wishskip" || key === "catch" || key === "sunrise" && c.coast) {
    const cs = c.coast; if (!cs) return null; let cx = cs.x, cz = cs.z, q = 0;
    if (key === "catch" && v.id === "kjollefjord" && api.steamer && api.steamer.quay) { const Q = api.steamer.quay(); if (Q && Number.isFinite(Q.qx)) { cx = Q.qx + Math.cos(Q.qa) * 2; cz = Q.qz + Math.sin(Q.qa) * 2; q = 1; } }
    let yaw = seaDir(cx, cz); if (yaw === null) yaw = cs.yaw;
    if (key === "sunrise") { const s_ = sunAz(H); yaw = Math.atan2(s_.z, s_.x); if (!clearAhead(cx, cz, yaw, 40)) { const sp = viewSpot(cx, cz, yaw, 40); if (!sp) return null; cx = sp[0]; cz = sp[1]; } }
    const props = [];
    if (key === "catch") { const wx = cx + Math.cos(yaw + 0.2) * 6.5, wz = cz + Math.sin(yaw + 0.2) * 6.5; if (q || openOk(wx, wz, 0.7)) props.push(walkerProp(p, wx, wz, yaw + 2.6)); }
    if (key === "wishskip") { const sx = cx + Math.cos(yaw - 0.25) * 9, sz = cz + Math.sin(yaw - 0.25) * 9; if (openOk(sx, sz, 1)) props.push(["s", sx, sz, yaw + 1.1, 0]); }
    return look(cx, cz, key === "catch" ? 1.9 : 1.8, yaw, key === "sunrise" ? 0.045 : -0.012, 260, Object.assign(o, { f: key === "sunrise" ? 66 : 58, p: props, q }));
  }
  if (key === "sunrise") {
    const s_ = sunAz(H), yaw = Math.atan2(s_.z, s_.x), spot = viewSpot(p.x, p.z, yaw, 60); if (!spot) return null;
    return look(spot[0], spot[1], 1.7, yaw, 0.045, 300, Object.assign(o, { f: 64 }));
  }
  if (key === "kidssled") {
    const sl = c.slope; if (!sl) return null; const props = [], n = 2 + (rnd() < 0.5 ? 1 : 0), kids = c.kidsList || [];
    for (let i = 0; i < n; i++) { const d = 2 + i * 2.6, lat = (i - 1) * 1.5, x = sl.x + sl.dx * d * -1 + -sl.dz * lat, z = sl.z + sl.dz * d * -1 + sl.dx * lat; if (openOk(x, z, 0.8)) props.push(walkerProp(kids[i] || p, x, z, Math.atan2(sl.dz, sl.dx))); }
    const bx = sl.x + sl.dx * 8, bz = sl.z + sl.dz * 8; if (!openOk(bx, bz, 1)) return null;
    return aimAt(bx, bz, 1.4, sl.x - sl.dx * 3, sl.z - sl.dz * 3, 0.9, Object.assign(o, { f: 52, p: props }));
  }
  if (key === "coffee" || key === "aurora" || key === "snowdepth") {
    const spot = openSpot(p.x, p.z, 3); if (!spot) return null;
    if (key === "snowdepth") return aimAt(spot[0], spot[1], 0.9, p.x, p.z, 1.2, Object.assign(o, { f: 52 }));
    let yaw = key === "aurora" ? -Math.PI / 2 : (seaDir(spot[0], spot[1]) ?? yawTo(spot[0], spot[1], v.x, v.z) + Math.PI);
    if (key === "coffee") { let ok = false; for (let k = 0; k < 9 && !ok; k++) { const y2 = yaw + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.55; if (clearAhead(spot[0], spot[1], y2, 30)) { yaw = y2; ok = true; } } if (!ok) return null; }
    return look(spot[0], spot[1], key === "coffee" ? 1.25 : 1.6, yaw, key === "aurora" ? 0.5 : -0.01, 300, Object.assign(o, { f: key === "aurora" ? 70 : 58 }));
  }
  if (key === "wishlake") {
    const L = c.lake, a0 = yawTo(L.x, L.z, v.x, v.z), rs = shoreAt(L, a0), bx = L.x + Math.cos(a0) * (rs + 22), bz = L.z + Math.sin(a0) * (rs + 22), spot = openSpot(bx, bz, 4); if (!spot) return null;
    const props = [], yaw = yawTo(spot[0], spot[1], L.x, L.z), cx2 = L.x + Math.cos(a0 + 1.57) * 0, cz2 = L.z;
    for (let i = 0; i < 6; i++) { const ang = a0 + (i - 2.5) * (1.7 / Math.max(60, rs)), rr = shoreAt(L, ang) + 1.5, x = L.x + Math.cos(ang) * rr, z = L.z + Math.sin(ang) * rr; if (openOk(x, z, 0.6)) props.push(walkerProp(i === 0 ? p : null, x, z, ang + Math.PI)); }
    return aimAt(spot[0], spot[1], 1.7, L.x + Math.cos(a0) * rs * 0.55, L.z + Math.sin(a0) * rs * 0.55, 0.8, Object.assign(o, { f: 54, p: props }));
  }
  if (key === "wishstorm") {
    const yaw = rnd() * 6.283, spot = viewSpot(p.x, p.z, yaw, 36); if (!spot) return null; const props = [];
    for (let i = 0; i < 3; i++) { const x = spot[0] + Math.cos(yaw) * (9 + i * 6) + Math.cos(yaw + 1.57) * (i % 2 ? 1.8 : -1.5), z = spot[1] + Math.sin(yaw) * (9 + i * 6) + Math.sin(yaw + 1.57) * (i % 2 ? 1.8 : -1.5); if (openOk(x, z, 1)) props.push(["s", x, z, yaw, i]); }
    return look(spot[0], spot[1], 1.5, yaw, -0.02, 30, Object.assign(o, { f: 56, p: props }));
  }
  if (key === "reindeerlens") {
    const base = openSpot(v.x + Math.cos(c.k * 2.1) * 140, v.z + Math.sin(c.k * 2.1) * 140, 6); if (!base) return null; const yaw = rnd() * 6.283;
    const rx = base[0] + Math.cos(yaw) * 2.5, rz = base[1] + Math.sin(yaw) * 2.5;
    return aimAt(base[0], base[1], 0.5, rx, rz, 1.25, Object.assign(o, { f: 58, p: [["q:reindeer", rx, rz, yaw + Math.PI + 0.3, 0]] }));
  }
  return null;
}

/* ---------------- people, relatives and comments ---------------- */
const kinWord = (c, p) => {                                                                          // how commenter c would name poster p
  if (!c || !p || c.home !== p.home) return "";
  const adult = q => q.age >= 18, par = q => q.role === "mother" || q.role === "father", kid = q => q.role === "son" || q.role === "daughter", gp = q => /grand/.test(q.role);
  if (par(c) && kid(p)) return p.role === "son" ? "my boy" : "my girl";
  if (kid(c) && par(p)) return p.role === "mother" ? "mamma" : "pappa";
  if (kid(c) && kid(p)) return p.role === "son" ? "my brother" : "my sister";
  if (gp(c) && (kid(p) || par(p))) return kid(p) ? "the little one" : p.role === "mother" ? "my daughter" : "my son";
  if (gp(p) && !gp(c)) return p.role === "grandmother" ? "bestemor" : "bestefar";
  if (par(c) && par(p)) return p.role === "mother" ? "my wife" : "my husband";
  return adult(p) ? "our " + (p.role === "lodger" ? "lodger" : "neighbour under our roof") : "";
};
const CM = {
  fam: ["{kin}, this is lovely!", "Proud of {kin}. Come home for tea.", "{kin}, you said you would be back by four.", "That's {kin} for you, always out in it.", "Show {kin} off! Beautiful.", "{kin}! Dress warm."],
  famKid: ["{kin} is so cool", "can I come next time?", "that is MY {kinN}", "you promised to take me"],
  nb: ["Nice one, {first}!", "That's right outside {place}, isn't it? Lovely.", "Good light. Wish I had been out.", "Saw it from the road, nydelig.", "Tell us where, {first}!", "I was there yesterday. Even better today.", "Mind the road home, {first}.", "Great shot."],
  nbWish: ["Not yet, {first}, but I like it.", "Build it and we will come.", "One day. Save the spot.", "Ha, I would be at the rope."],
  fish: ["Fish soup at yours?", "Is there any left?", "{n} kg! Share some."], storm: ["Stay in, {first}.", "Have you seen the road?", "Uff, same here."], aur: ["Seeing it too, from the car park!", "Out of the window, wow.", "Go out, everyone!"], kids: ["Mine are out there too!", "Mind the bottom of the hill.", "Let them have it, it is Sunday."]
};
function comments(post, p, key) {
  const out = [], sub = SUBJ[key], fam = p ? TLXN.family(p).filter(q => q && q.id !== p.id) : [], vil = p ? TLXN.peopleIn(p.vid).filter(q => q.id !== p.id && q.home !== p.home) : [];
  const n = sub && sub.wish ? Math.floor(rnd() * 3) : Math.floor(rnd() * 4), seen = new Set();
  for (let i = 0; i < n; i++) {
    const useFam = fam.length && rnd() < 0.62, c = useFam ? pick(fam) : (vil.length ? pick(vil) : null); if (!c || seen.has(c.id)) continue; seen.add(c.id);
    let t;
    if (useFam) { const kin = kinWord(c, p); t = (c.age < 12 && rnd() < 0.6 ? pick(CM.famKid) : pick(CM.fam)).replace("{kin}", kin || p.first).replace("{kinN}", kin.replace("my ", "") || "one"); }
    else { const bank = key === "catch" ? CM.fish.concat(CM.nb) : key === "fjordblow" || key === "snowdepth" ? CM.storm.concat(CM.nb) : key === "aurora" ? CM.aur : key === "kidssled" ? CM.kids.concat(CM.nb) : sub && sub.wish ? CM.nbWish : CM.nb; t = pick(bank); }
    t = t.replace("{first}", p ? p.first : "friend").replace("{place}", post.place || "here").replace("{n}", post.n || "").replace(/\{\w+\}/g, "").replace(/^\s+/, ""); t = t.charAt(0).toUpperCase() + t.slice(1);
    out.push([c.id, t]);
  }
  return out;
}
const likesOf = (post, p) => { const b = 3 + Math.round((p ? TLXN.peopleIn(p.vid).length : 20) / 5), r = hash01("lk" + post.id); return Math.round(b + r * b * 2.2 + (post.cm ? post.cm.length * 3 : 0)); };

/* ---------------- the post store ---------------- */
function addPost(o) {
  const s = S(), rc = o.rc || null; if (!rc) return null;
  const p = o.who && o.who !== "you" ? who(o.who) : null;
  const post = { id: ++s.seq, t: r2(o.t === undefined ? api.GS.hour : o.t), who: o.who || null, vid: o.vid || (p ? p.vid : null), place: o.place || "", sj: o.sj, cap: o.cap, rc, ev: o.ev || 0, n: o.n || 0 };
  if (o.wish) post.wish = 1; if (o.chip) post.chip = o.chip; if (o.you) post.you = 1;
  post.cm = o.cm || (p ? comments(post, p, o.sj) : []); post.lk = likesOf(post, p);
  s.posts.push(post); if (s.posts.length > CAP) s.posts.splice(0, s.posts.length - CAP);
  G.last = post; G.genLog.push({ id: post.id, who: post.who, vid: post.vid, sj: post.sj, cap: post.cap, t: post.t, ev: post.ev }); if (G.genLog.length > 800) G.genLog.splice(0, 200);
  if (G.view.tab === "feed" && api.TABLET.open && api.TABLET.app === "gram") api.TABLET.refresh("gram");
  return post;
}
const posts = () => { const s = S(); return s ? s.posts : []; };
const unseen = () => { const s = S(); return s ? s.posts.filter(q => q.id > s.seen && q.who !== "you").length : 0; };

/* ---------------- the ambient generator ---------------- */
function ctxFor(p, H) {
  const v = TLXN.village(p.vid) || nearestVil(p.x, p.z), cal = calAt(H), hr = cal.h, int = {}; for (const k of p.interests) int[k] = 1;
  const kidsList = TLXN.family(p).filter(q => q && q.age < 14 && q.age > 4);
  const c = { p, H, vil: v, hr, dow: cal.dow, int, el: elAt(H), storm: stormAt(p.x, p.z, H), snow: snowy(), kid: p.age < 14 && p.age > 4, adult: p.age >= 18, adultKids: p.age >= 22 && kidsList.length > 0, kidsList, household: TLXN.family(p).length, sami: !!(TLXN.homeOf(p) && /herder/.test(p.trade || "")), k: hashS(p.id) % 97 };
  c.coast = coastOf(v); c.slope = slopeOf(v); const lk = lookoutFor(v); c.lookout = lk && lk.d < 6500 ? lk : null; c.lake = lakeNear(v); c.sled = true;
  c.aur = api.gram.aur().level(H); c.sinceStorm = stormAt(p.x, p.z, H - 5) >= 0.4;
  c.depth = Math.max(0, surf(p.x, p.z) - W.groundAt(p.x, p.z));
  return c;
}
function varsFor(key, c, p, post) {
  const v = c.vil, L = c.lookout ? c.lookout.L.name : "the ridge", ws = c.storm > 0.3 ? wordOfStorm(c.storm) : "clear";
  const vars = { look: L, place: p.village, hr: hourWord(c.hr), w: c.storm > 0.4 ? "The wind is something else." : c.el < -4 ? "Cold and blue." : "Not a cloud.", w2: "Green, then pink, then green again.", wst: wordOfStorm(c.storm), wst2: c.storm > 0.3 ? "wind and all" : "not a breath of wind", temp: c.storm > 0.3 ? "a bit raw" : "properly cold",
    kids: c.kidsList.length ? c.kidsList.map(q => q.first).join(" and ") : "the kids", fish: pick(c.coast ? fishes : lakeFish), n: (2 + Math.floor(rnd() * 9) * 0.5).toFixed(1), cm: Math.round(c.depth * 100), light: lightWord(c) };
  return vars;
}
function pickPerson(H) {
  const s = S(), vs = TLXN.villages().filter(v => TLXN.peopleIn(v.id).length), tot = vs.map(v => Math.pow(TLXN.peopleIn(v.id).length, 0.6));
  let r = rnd() * tot.reduce((a, b) => a + b, 0), vi = 0; for (let i = 0; i < vs.length; i++) { r -= tot[i]; if (r <= 0) { vi = i; break; } }
  const ppl = TLXN.peopleIn(vs[vi].id).filter(q => q.age > 4 && q.age < 85); if (!ppl.length) return null;
  for (let k = 0; k < 6; k++) { const q = pick(ppl), last = s.last[q.id]; if (last === undefined || (H - last >= 1 && (H - last > 18 || rnd() < 0.25))) return q; }
  return null;
}
function postAmbient(H, p) {
  const s = S(), c = ctxFor(p, H), ws = SUBJ_KEYS.map(k => Math.max(0, SUBJ[k].weight(c) || 0)), tot = ws.reduce((a, b) => a + b, 0); if (tot <= 0) return null;
  let r = rnd() * tot, ki = 0; for (let i = 0; i < ws.length; i++) { r -= ws[i]; if (r <= 0) { ki = i; break; } }
  const key = SUBJ_KEYS[ki], sub = SUBJ[key], vars = varsFor(key, c, p), rc = sub.paint ? rcMake([p.x, p.z, 1.6], [p.x, p.z + 3, 1], { h: H, s: 0, pt: sub.paint }) : recipeFor(key, c);
  if (!rc) return null;
  const recent = posts().slice(-20).map(q => q.cap); let cap = ""; for (let tryN = 0; tryN < 9; tryN++) { cap = say(p, sub.bases, vars, sub.nor); if (!recent.includes(cap)) break; if (tryN === 8) cap += ` (${calAt(H).time})`; }
  s.last[p.id] = H;
  const post = addPost({ who: p.id, t: H, vid: p.vid, place: key === "peak" || key === "sledsummit" ? vars.look : key === "wishlake" ? "a lake near " + p.village : p.village, sj: key, cap, rc, chip: sub.chip, wish: !!sub.wish, n: +vars.n });
  if (post && rnd() < 0.4) chatPost(p.vid, p.id, say(p, sub.chat, vars, null, true), "amb", H);
  return post;
}
function genHour(H) {
  const el = elAt(H), day = el > -10, n = day ? 2 + Math.floor(rnd() * 3) : (rnd() < 0.7 ? 1 : 0);
  for (let i = 0; i < n; i++) { const p = pickPerson(H); if (p) { try { postAmbient(H, p); } catch (e) { console.error("TLX gram ambient", e); G.err = String(e && e.stack || e); } } }
}

/* ---------------- the bus: events become posts and chat ---------------- */
const NOTABLE = { rescue: 1, road: 1, storm: 1, crash: 1, sky: 1, catch: 1, job: 1 };
const WIDE = { storm: 1, road: 1, ferry: 1, sky: 1 };
const A_FOR = (o, p) => (p ? "@" + p.handle : "someone");
function villageOf(ev) {
  const x = ev.x, z = ev.z; if (x === null || x === undefined) { const p = ev.who && ev.who !== "you" ? who(ev.who) : null; return p ? p.vid : "kjollefjord"; }
  const v = nearestVil(x, z); return v ? v.id : "kjollefjord";
}
function witness(vid, near) {                                                                           // a villager with something to say about it
  const ppl = TLXN.peopleIn(vid).filter(q => q.age > 12 && q.age < 85); if (!ppl.length) return null;
  const gos = ppl.filter(q => q.interests.includes("gossip") || q.interests.includes(near || "gossip")); return pick(gos.length && rnd() < 0.7 ? gos : ppl);
}
const THANKS = { dry: "Noted: {a} did right by the {thing}.", warm: "Thank you, {a}!", terse: "Thanks, {a}.", chatty: "{a}, you absolute legend, I will tell everyone.", wry: "Praise to {a}, who has not been asked, and did it anyway.", earnest: "Thank you, {a}. It matters." };
const PEN = "courier";
function busLines(ev) {                                                                                  // -> { vid[], who, text, tag } messages for chat, and maybe a feed post
  const d = ev.data || {}, k = ev.kind, vid = villageOf(ev), out = [];
  const person = ev.who && ev.who !== "you" ? who(ev.who) : null, you = ev.who === "you", pl = ev.place || (TLXN.village(vid) || {}).name || "the village";
  const w = person || witness(vid), me = "@" + PEN;
  const t = (bases, vars) => say(w, bases, Object.assign({ place: pl, you: me }, vars || {}), null, true);
  let text = "", sj = "scene", tag = k, wideV = !!WIDE[k], chip = "NEWS", wish = false;
  if (k === "ski") { text = ev.text; sj = "skitrail"; chip = "SKI"; }
  else if (k === "groom" || k === "trail") { text = ev.text; sj = "groomtrail"; chip = "TRAIL"; if (you || d.by === "you") text = ev.text + ` ${me} again.`; }
  else if (k === "rescue") { text = ev.text; sj = "rescue"; chip = "RESCUE"; if (d.what === "done" && you) text = t(["{you} brought a rider home on the rescue sled. Thank you.", "Heard that {you} got the stranded rider in safe. Thank you.", "Rescue done by {you}. Well done."]); }
  else if (k === "crash") { sj = "crash"; chip = "WRECK"; text = d.what === "bog" ? t(["{you} is bogged in deep snow near {place}. Anyone with a rope?", "{you} sat down in a drift at {place}. Somebody go and laugh, then help.", "Saw {you}'s sled sunk in the drift outside {place}."]) : t(["{you} came off hard near {place}. Hope you are in one piece.", "Big crash near {place}: {you} went over the bars. Check on them.", "{you} had a rough landing at {place}. Walked away, I hear."]); }
  else if (k === "road") { sj = "road"; chip = "ROAD"; const you2 = you || d.sys === "plow"; text = d.sys === "plow" ? t(["{you} has plowed the {road}: it is open.", "The {road} is clear thanks to {you}. Takk.", "{you} opened the {road} again. We can get to the shop."], { road: pl }) : d.what === "shut" ? ev.text : d.what === "convoy" ? ev.text : ev.text; }
  else if (k === "job") { sj = "groomtrail"; chip = "TRAIL"; text = t(["{you} groomed the trail to {place}. It is a pleasure to ski.", "New corduroy to {place} from {you}. Thank you!", "Trail to {place} is set: {you} did it."]); }
  else if (k === "storm") { sj = "storm"; chip = "STORM"; text = ev.text; }
  else if (k === "ferry") { sj = "ferry"; chip = "FERRY"; text = ev.text + (d.what === "cancelled" ? " Mail waits." : ""); }
  else if (k === "wildlife") { sj = "wildlife"; chip = "WILD"; text = t([d.kind === "reindeer" ? "Reindeer herd by {place}. Mind the road." : d.kind === "moose" ? "A moose by {place}, in someone's yard, I think." : d.kind === "fox" ? "Fox at {place} again. It knows the bins." : "Saw a " + (d.kind || "animal") + " near {place}."]); }
  else if (k === "sky") { sj = "light"; chip = "SKY"; text = t([d.what === "firstlight" ? "First light! The sun was over the fell at noon. I stood in the road like a fool." : "No sun today. The polar night is here."]); wideV = true; }
  else if (k === "catch") { sj = "catchbig"; chip = "FISH"; text = t(["Big fish at {place}: {you} landed {kg} kg {sp}. Come to the lake and see.", "{you} pulled a {kg} kg {sp} out at {place}. Not a story, a photo."], { kg: d.kg, sp: d.species || "fish" }); }
  else { text = ev.text || ""; }
  if (!text) return null;
  return { vid, wide: wideV, text, sj, chip, w, you, person, k, tag };
}
let _chatCnt = 0;
function chatPush(vid, m, quiet) {
  const s = S(); if (!s.chat[vid]) s.chat[vid] = []; const a = s.chat[vid]; a.push(m); if (a.length > CHAT) a.splice(0, a.length - CHAT);
  if (!quiet && G.view.tab === "local" && api.TABLET.open && api.TABLET.app === "gram" && vid === localVid()) api.TABLET.refresh("gram");
}
function chatPost(vid, pid, text, tag, H, re, quiet) {
  const s = S(), m = [++s.cseq, r2(H === undefined ? api.GS.hour : H), pid, String(text).slice(0, 300), tag || "", re || 0]; chatPush(vid, m, quiet); return m;
}
// a neighbour or relative answers a chat line (family teasing first)
function banter(vid, m, pid, H, quiet) {
  const p = pid && pid !== "you" ? who(pid) : null, ppl = TLXN.peopleIn(vid).filter(q => q.age > 11 && (!p || q.id !== p.id)); if (!ppl.length) return;
  const fam = p ? TLXN.family(p).filter(q => q && q.id !== p.id && q.age > 11) : [], c = fam.length && rnd() < 0.6 ? pick(fam) : pick(ppl);
  const kin = p ? kinWord(c, p) : "", tag = m[4];
  const bank = kin ? [`${kin} is at it again.`, `That's ${kin} for you.`, `Did ${kin} wear a hat?`, `${kin}, supper is at six.`] : tag === "road" || tag === "storm" || tag === "ferry" ? ["Thanks for the heads-up.", "Good to know before I head out.", "Same here, mind yourselves.", "Ugh. Thanks."] : tag === "wildlife" ? ["Mind the kids near the road.", "Saw it too from the shop window.", "Is it still there?"] : ["Nice.", "Wish I had been out.", "Saw that, good one.", "Ha. Yes."];
  chatPost(vid, c.id, say(c, bank, {}, null, true), "re", H, m[0], quiet);
}
function onBus(ev, quiet) {
  try {
    const s = S(); if (!s || !ev) return; if (ev.id <= s.busId && !quiet) return; s.busId = Math.max(s.busId, ev.id);
    const b = busLines(ev); if (!b) return;
    const pid = ev.who && ev.who !== "you" ? ev.who : (b.w ? b.w.id : null), vids = b.wide ? TLXN.villages().map(v => v.id) : [b.vid];
    // chat: the event in the voice of whoever said it; in each village a peninsula wide event reaches
    let first = null;
    for (const vid of vids) {
      const sayer = b.wide ? (witness(vid) || b.w) : (b.w || witness(vid)), m = chatPost(vid, sayer ? sayer.id : null, b.text, b.k, ev.t, 0, quiet);
      if (!first) first = m; if (!b.wide || vid === b.vid) { if (rnd() < (b.wide ? 0.5 : 0.8)) banter(vid, m, sayer ? sayer.id : null, ev.t, quiet); }
    }
    // feed: not every event is a picture; the ones about you and the rare ones always are
    const prob = ev.kind === "ski" ? 0.3 : ev.kind === "groom" || ev.kind === "trail" ? 0.4 : ev.kind === "rescue" && ev.data && ev.data.what === "worry" ? 0 : 1;
    if (prob >= 1 || G.always || rnd() < prob) {
      const rc = recipeForEvent(ev, b); if (rc) {
        const poster = b.w || witness(b.vid), pp = ev.who === "you" ? poster : (ev.who ? who(ev.who) : poster);
        const post = addPost({ who: pp ? pp.id : null, t: ev.t, vid: b.vid, place: ev.place || (TLXN.village(b.vid) || {}).name, sj: b.sj, cap: b.text, rc, chip: b.chip, ev: ev.id, you: ev.who === "you" || (ev.data && ev.data.by === "you") ? 1 : 0, n: 0 });
        if (post && !quiet && NOTABLE[ev.kind] && post.you) notify(post);
      }
    }
  } catch (e) { console.error("TLX gram bus", e); G.err = String(e && e.stack || e); }
}
function notify(post) {
  const s = S(), day = calAt(api.GS.hour).day; if (!TLX.on("gramnotes") || s.noteD === day) return; s.noteD = day;
  G.notes++; api.TABLET.notify({ app: "gram", title: "Gram: " + (post.place || "the Nordkinn"), body: post.cap.length > 110 ? post.cap.slice(0, 107) + "..." : post.cap, kind: "info", ttl: 7 });
}

// the camera for an event's picture
function recipeForEvent(ev, b) {
  const H = ev.t, d = ev.data || {}, o = { h: H, s: stormAt(ev.x === null ? 0 : ev.x, ev.z === null ? 0 : ev.z, H) }, vid = b.vid, v = TLXN.village(vid) || nearestVil(0, 0);
  const x = ev.x, z = ev.z, has = x !== null && x !== undefined && Number.isFinite(x);
  const k = ev.kind;
  if (k === "storm" || k === "ferry" || k === "sky" || (k === "road" && !has)) {
    const cs = coastOf(v) || null, base = cs || openSpot(v.x, v.z) && { x: openSpot(v.x, v.z)[0], z: openSpot(v.x, v.z)[1], yaw: -1.2 }; if (!base) return null;
    let yaw = base.yaw, q = 0, cx = base.x, cz = base.z; if (k === "ferry") { const Q = api.steamer && api.steamer.quay && api.steamer.quay(); if (Q && Number.isFinite(Q.qx)) { cx = Q.qx + Math.cos(Q.qa) * 3; cz = Q.qz + Math.sin(Q.qa) * 3; q = 1; yaw = Q.qa + Math.PI; } }
    if (k === "sky") { const s = sunAz(H); yaw = Math.atan2(s.z, s.x); o.h = (Math.floor(H / 24) * 24 + 11.7); }
    o.s = k === "storm" ? clamp(d.peak || 0.6, 0.3, 1) : o.s;
    return aimAt(cx, cz, 1.8, cx + Math.cos(yaw) * 300, cz + Math.sin(yaw) * 300, k === "sky" ? 30 : 6, Object.assign(o, { f: 60, q }));
  }
  if (!has) return null;
  if (k === "wildlife" && d.kind) {
    const rig = d.kind === "reindeer" || d.kind === "moose" || d.kind === "fox" || d.kind === "hare" ? d.kind : "fox", yaw = rnd() * 6.283, sp = openSpot(x, z, 6); if (!sp) return null;
    const cx = sp[0] - Math.cos(yaw) * 11, cz = sp[1] - Math.sin(yaw) * 11; if (!openOk(cx, cz, 1)) return null;
    const props = [["q:" + rig, sp[0], sp[1], yaw + 2.4, 0]]; if (rig === "reindeer") { props.push(["q:reindeer", sp[0] + 2.4, sp[1] - 1.5, yaw + 1.8, 1], ["q:reindeer", sp[0] - 2.2, sp[1] + 2.4, yaw + 3.1, 2]); }
    return aimAt(cx, cz, 1.5, sp[0], sp[1], 1.0, Object.assign(o, { f: 46, p: props }));
  }
  if (k === "ski" || k === "groom" || k === "trail" || k === "rescue" && d.trail || k === "job") {
    const t = window.TLXSK && TLXSK.ready ? TLXSK.nearest(x, z, 60) : null; const px = t ? t.tx : 0, pz = t ? t.tz : 1, hd = Math.atan2(pz, px);
    const sp = openSpot(x, z, 3); if (!sp) return null;
    const props = []; if (k === "ski" || k === "rescue") props.push(["k", sp[0], sp[1], hd, ev.who && ev.who !== "you" ? ev.who : 0]);
    const cx = sp[0] - Math.cos(hd) * 9 + Math.cos(hd + 1.57) * 3.5, cz = sp[1] - Math.sin(hd) * 9 + Math.sin(hd + 1.57) * 3.5, c2 = openSpot(cx, cz, 2) || [cx, cz];
    return aimAt(c2[0], c2[1], 1.6, sp[0], sp[1], 1.0, Object.assign(o, { f: 52, p: props }));
  }
  if (k === "crash" || k === "road" || k === "catch" || k === "rescue") {
    const sp = openSpot(x, z, 4); if (!sp) return null; const props = []; if (k === "crash") props.push(["s", sp[0], sp[1], rnd() * 6.283, 0]);
    const a = rnd() * 6.283, cx = sp[0] + Math.cos(a) * 8, cz = sp[1] + Math.sin(a) * 8, c2 = openSpot(cx, cz, 2) || [cx, cz];
    return aimAt(c2[0], c2[1], 1.6, sp[0], sp[1], 1.0, Object.assign(o, { f: 54, p: props }));
  }
  const sp = openSpot(x, z, 4); if (!sp) return null; const a = rnd() * 6.283, cx = sp[0] + Math.cos(a) * 14, cz = sp[1] + Math.sin(a) * 14, c2 = openSpot(cx, cz, 2) || [cx, cz];
  return aimAt(c2[0], c2[1], 1.7, sp[0], sp[1], 1.0, Object.assign(o, { f: 54 }));
}

/* ---------------- the watchers: a storm, a road, a convoy (state changes with no single call to hook) ---------------- */
function watch(H) {
  const s = S(), st = s.storm, g = api.GS.storm;
  if (g > 0.45 && !st.on) { st.on = 1; st.peak = g; st.t0 = H; st.cm = 0; TLXN.post({ kind: "storm", x: api.P.x, z: api.P.z, place: (nearestVil(api.P.x, api.P.z) || {}).name, text: `A storm is coming in${api.WX.f && api.WX.f.from ? " from the " + api.WX.f.from : ""}.`, data: { sys: "weather", what: "start", peak: r2(g) } }); }
  else if (st.on) {
    st.peak = Math.max(st.peak, g); st.cm += g * 1.8; 
    if (g < 0.15) { st.on = 0; const ms = Math.round(9 + 24 * st.peak), cm = Math.max(1, Math.round(st.cm)); TLXN.post({ kind: "storm", x: api.P.x, z: api.P.z, place: (nearestVil(api.P.x, api.P.z) || {}).name, text: `The storm has blown through: gusts to about ${ms} m/s and ${cm} cm of new snow.`, data: { sys: "weather", what: "end", peak: r2(st.peak), ms, cm } }); }
  }
  if (window.TLXR && TLXR.ready) for (const r of TLXR.routes) {
    const now = TLXR.status(r.id), was = s.road[r.id]; s.road[r.id] = now; if (was === undefined || was === now) continue;
    const m = r.pts[Math.floor(r.pts.length / 2)];
    if (now !== "open" && was === "open") TLXN.post({ kind: "road", x: m[0], z: m[1], place: r.name, text: `The ${r.name} is ${now}.`, data: { sys: "roads", what: "shut", road: r.id } });
    else if (now === "open") TLXN.post({ kind: "road", x: m[0], z: m[1], place: r.name, text: `The ${r.name} is open again.`, data: { sys: "roads", what: "open", road: r.id } });
  }
  if (window.TLXCV && TLXCV.ready) for (const Gc of TLXCV.roads) {
    const key = Gc.st + "|" + (Gc.st === "wait" || Gc.st === "run" ? Math.round((Gc.at || 0) * 4) : ""), was = s.road["cv:" + Gc.id]; s.road["cv:" + Gc.id] = key; if (was === undefined || was === key || (Gc.st !== "wait" && Gc.st !== "run")) continue;
    const m = Gc.gates && Gc.gates[0] ? Gc.gates[0] : { x: null, z: null };
    TLXN.post({ kind: "road", x: m.x, z: m.z, place: Gc.name, text: Gc.st === "wait" ? `Convoy on the ${Gc.name}: next leaves at ${api.fmtTime(Gc.at)}.` : `The convoy is on the ${Gc.name}.`, data: { sys: "convoy", what: "convoy", road: Gc.id } });
  }
}

/* ---------------- Local: the chat of the place you are in ---------------- */
let _lv = null;
function localVid() {
  const V = api.FOOT.on ? api.FOOT : api.P, v = nearestVil(V.x, V.z); if (!v) return "kjollefjord";
  if (_lv && _lv !== v.id) { const c = TLXN.village(_lv); if (c && Math.hypot(c.x - V.x, c.z - V.z) < Math.hypot(v.x - V.x, v.z - V.z) + 250) return _lv; }
  return (_lv = v.id);
}
G.localVid = localVid;
const onlineN = (vid, H) => { const n = TLXN.peopleIn(vid).length, hr = calAt(H).h, k = hr < 6 || hr > 23 ? 0.08 : hr < 8 || hr > 21 ? 0.3 : 0.55; return Math.max(1, Math.round(n * k * (0.8 + 0.4 * hash01(vid + Math.floor(H))))); };
G.online = onlineN;
const REPLIES = {
  road: ["Thanks, I will wait for the plow.", "Anyone driving through later?", "I will take the long way."], storm: ["Staying in today.", "Good to know, thanks.", "Anyone need anything from the shop first?"], ferry: ["Mail can wait.", "Thanks. I will skip the quay.", "Hope it sails tomorrow."], wildlife: ["I will go slow on the road.", "Thanks, I will keep the kids in.", "Which way was it heading?"],
  ski: ["Is the track any good?", "I will go out this evening.", "Nice one."], rescue: ["Is everyone okay?", "Thanks to whoever helped.", "I can bring blankets."], crash: ["Are you okay?", "I can come with a rope.", "Mind the ice there."], groom: ["Thank you for the track!", "I will ski it tomorrow.", "It is lovely, thanks."], other: ["Sounds good.", "Thanks for that.", "Heia!"]
};
const ANS = { dry: ["Right.", "Noted.", "If you say so.", "Good."], warm: ["Takk, {a}!", "You are welcome, {a}!", "Anytime, {a}.", "Take care out there, {a}."], terse: ["Yes.", "Fine.", "Ok.", "Heia."], chatty: ["Oh {a}, absolutely, and you know what else?", "Ha, {a}! Yes, yes, I was just saying.", "{a}, good thinking, I told them the same."], wry: ["Wise words from {a}.", "{a} has spoken.", "Naturally, {a}."], earnest: ["Thank you, {a}. That helps.", "Good to hear from you, {a}.", "I appreciate it, {a}."] };
function replyOptions() {
  const vid = localVid(), a = (S().chat[vid] || []); const last = a[a.length - 1]; const k = last ? last[4] : "other";
  const key = REPLIES[k] ? k : k === "amb" ? "other" : k === "re" ? "other" : k === "job" ? "groom" : k === "trail" ? "groom" : "other";
  return REPLIES[key];
}
function sendReply(i) {
  const s = S(), vid = localVid(), opts = replyOptions(), t = opts[i]; if (!t) return false;
  const m = chatPost(vid, "you", t, "you", api.GS.hour); (G.pending = G.pending || []).push({ at: api.GS.hour + (1 + Math.random()) / 60, vid, m });
  if (api.TABLET.open && api.TABLET.app === "gram") api.TABLET.refresh("gram"); return true;
}
function pendingTick() {
  const P = G.pending; if (!P || !P.length) return; const H = api.GS.hour;
  for (let i = P.length - 1; i >= 0; i--) if (H >= P[i].at) {
    const q = P.splice(i, 1)[0], ppl = TLXN.peopleIn(q.vid).filter(x => x.age > 11), last = (S().chat[q.vid] || []).filter(m => m[2] && m[2] !== "you").slice(-1)[0];
    const prev = last ? who(last[2]) : null, c = prev && rnd() < 0.6 ? prev : (ppl.length ? pick(ppl) : null); if (!c) continue;
    chatPost(q.vid, c.id, say(c, ANS[c.voice] || ANS.warm, { a: "@" + PEN }, null, true), "re", H, q.m[0]);
  }
}

/* ---------------- pictures: render queue, cache, painted fallback ---------------- */
const dims = () => api.GFX.low || api.GFX.mobile ? [256, 320] : [384, 480];
const cacheCap = () => api.GFX.low || api.GFX.mobile ? 10 : 24;
function paintKind(post) {
  const rc = post.rc; if (rc.pt) return rc.pt; const sj = post.sj;
  return { peak: "peak", sledsummit: "sled", fjordblow: "sea", sunrise: "sun", catch: "fish", kidssled: "kids", coffee: "house", aurora: "aurora", snowdepth: "house", wishlake: "lake", wishskip: "sea", wishstorm: "sled", reindeerlens: "deer", skitrail: "ski", groomtrail: "ski", wildlife: "deer", road: "road", storm: "sea", ferry: "sea", crash: "sled", rescue: "ski", sky: "sun", catchbig: "fish" }[sj] || "peak";
}
function paintPic(post, cv) {
  const [w, h] = [cv.width, cv.height], g = cv.getContext("2d"), rc = post.rc, hr = ((rc.h % 24) + 24) % 24, el = (() => { try { return elAt(rc.h); } catch (e) { return 5; } })(), st = rc.s, k = paintKind(post), rd = (() => { let a = hashS("p" + post.id); return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
  const day = clamp((el + 8) / 14, 0, 1), top = [18 + day * 70, 28 + day * 110, 60 + day * 150], bot = [60 + day * 150, 70 + day * 130, 100 + day * 120];
  const gr = g.createLinearGradient(0, 0, 0, h * 0.62); const mix = (c, f) => `rgb(${Math.round(c[0] * f)},${Math.round(c[1] * f)},${Math.round(c[2] * f)})`; const f = 1 - st * 0.35;
  gr.addColorStop(0, mix(top, f)); gr.addColorStop(1, el > -4 && el < 5 ? `rgb(${220 * day + 30},${140 * day + 40},${110 * day + 50})` : mix(bot, f)); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  if (k === "aurora" || (el < -8 && rd() < 0.0)) for (let i = 0; i < 4; i++) { const ag = g.createLinearGradient(0, 0, 0, h * 0.5); ag.addColorStop(0, "rgba(80,255,170,0)"); ag.addColorStop(0.5, `rgba(80,255,170,${0.35 - i * 0.05})`); ag.addColorStop(1, "rgba(80,255,170,0)"); g.fillStyle = ag; g.beginPath(); g.moveTo(0, h * 0.1 + i * 12); for (let x = 0; x <= w; x += 16) g.lineTo(x, h * (0.18 + 0.03 * i) + Math.sin(x * 0.02 + i + rd() * 2) * 22); g.lineTo(w, h * 0.55); g.lineTo(0, h * 0.55); g.fill(); }
  if (el < -8) { g.fillStyle = "rgba(255,255,255,.85)"; for (let i = 0; i < 60; i++) g.fillRect(rd() * w, rd() * h * 0.5, 1.4, 1.4); }
  if (k === "sun" || (el > -3 && el < 8)) { g.fillStyle = "rgba(255,210,150,.9)"; g.beginPath(); g.arc(w * (0.3 + 0.4 * rd()), h * 0.46, 22, 0, 6.283); g.fill(); }
  const hz = h * 0.6; const lw = el < -4 ? 0.55 : 1; g.fillStyle = `rgb(${Math.round(70 * lw + 90 * day)},${Math.round(90 * lw + 100 * day)},${Math.round(120 * lw + 100 * day)})`;
  g.beginPath(); g.moveTo(0, hz); for (let x = 0; x <= w; x += 20) g.lineTo(x, hz - 20 - rd() * 60 * (k === "peak" ? 1.4 : 0.8)); g.lineTo(w, hz); g.fill();
  g.fillStyle = k === "sea" || k === "fish" ? `rgb(${Math.round(30 + 40 * day)},${Math.round(60 + 60 * day)},${Math.round(90 + 70 * day)})` : `rgb(${Math.round(150 + 90 * day)},${Math.round(160 + 90 * day)},${Math.round(180 + 70 * day)})`; g.fillRect(0, hz, w, h - hz);
  const ink = "rgba(20,28,40,.88)"; g.fillStyle = ink; g.strokeStyle = ink; g.lineWidth = 3;
  const fig = (x, y, s) => { g.beginPath(); g.arc(x, y - 26 * s, 6 * s, 0, 6.283); g.fill(); g.fillRect(x - 5 * s, y - 20 * s, 10 * s, 20 * s); g.fillRect(x - 5 * s, y, 4 * s, 12 * s); g.fillRect(x + 1 * s, y, 4 * s, 12 * s); };
  if (k === "peak" || k === "kids" || k === "ski" || k === "lake") fig(w * 0.5, h * 0.84, 2.2);
  if (k === "house") { g.fillRect(w * 0.3, h * 0.68, w * 0.4, h * 0.2); g.beginPath(); g.moveTo(w * 0.27, h * 0.68); g.lineTo(w * 0.5, h * 0.55); g.lineTo(w * 0.73, h * 0.68); g.fill(); g.fillStyle = "rgba(255,200,110,.9)"; g.fillRect(w * 0.4, h * 0.74, 22, 28); g.fillRect(w * 0.55, h * 0.74, 22, 28); }
  if (k === "sled") { g.fillRect(w * 0.3, h * 0.78, w * 0.4, 22); g.fillRect(w * 0.55, h * 0.7, w * 0.15, 16); g.fillRect(w * 0.28, h * 0.86, w * 0.46, 5); }
  if (k === "deer") { g.beginPath(); g.ellipse(w * 0.5, h * 0.78, 56, 28, 0, 0, 6.283); g.fill(); g.fillRect(w * 0.4, h * 0.82, 6, 40); g.fillRect(w * 0.6, h * 0.82, 6, 40); g.beginPath(); g.arc(w * 0.62, h * 0.68, 12, 0, 6.283); g.fill(); g.beginPath(); g.moveTo(w * 0.62, h * 0.64); g.lineTo(w * 0.6, h * 0.5); g.moveTo(w * 0.64, h * 0.64); g.lineTo(w * 0.7, h * 0.52); g.stroke(); }
  if (k === "fish") { g.beginPath(); g.ellipse(w * 0.5, h * 0.82, 52, 20, 0, 0, 6.283); g.fill(); g.beginPath(); g.moveTo(w * 0.66, h * 0.82); g.lineTo(w * 0.76, h * 0.72); g.lineTo(w * 0.76, h * 0.92); g.fill(); }
  if (k === "waffle") { g.fillStyle = "rgb(214,162,82)"; g.beginPath(); g.arc(w / 2, h * 0.7, 92, 0, 6.283); g.fill(); g.strokeStyle = "rgb(150,100,40)"; g.lineWidth = 3; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(w / 2 + i * 22, h * 0.7 - 90); g.lineTo(w / 2 + i * 22, h * 0.7 + 90); g.moveTo(w / 2 - 90, h * 0.7 + i * 22); g.lineTo(w / 2 + 90, h * 0.7 + i * 22); g.stroke(); } }
  if (k === "road") { g.fillStyle = "rgba(230,235,245,.85)"; g.beginPath(); g.moveTo(w * 0.42, hz); g.lineTo(w * 0.58, hz); g.lineTo(w * 0.85, h); g.lineTo(w * 0.15, h); g.fill(); }
  if (st > 0.3) { g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 1.5; for (let i = 0; i < 90 * st; i++) { const x = rd() * w, y = rd() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 10, y + 12); g.stroke(); } }
}
function overlayWeather(post, g, w, h) {                                                               // falling snow over a real render, by the storm of the recipe
  const st = post.rc.s; if (st < 0.25) return; let a = hashS("o" + post.id); const rd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  g.strokeStyle = `rgba(255,255,255,${0.35 + 0.35 * st})`; g.lineWidth = 1.2; g.beginPath();
  for (let i = 0; i < 150 * st; i++) { const x = rd() * w, y = rd() * h; g.moveTo(x, y); g.lineTo(x - 5 - 6 * st, y + 7 + 8 * st); } g.stroke();
}
// props stood in the scene for the one frame of the shot
const PROPS = { walkers: [], sleds: {}, shown: [] };
const JK = [0xc8322a, 0x2a6fb8, 0xe0a030, 0x2f8f5a, 0x7a3fa0, 0xd9622b, 0x1f9ba8];
function propWalker(i) {
  if (PROPS.walkers[i]) return PROPS.walkers[i];
  const g = api.newWalker({ jacket: api.mesh.std(JK[i % JK.length], 0.85, 0) }); g.visible = false; api.scene.add(g); return (PROPS.walkers[i] = g);
}
const face = a => Math.PI / 2 - a;                                                                      // a recipe's angle is a direction in the x/z plane (0 = +x); a figure's yaw has 0 = +z
function showProps(rc) {
  const out = []; if (!rc.p) return out; let wk = 0;
  for (const q of rc.p) {
    const [k, x, z, a, e] = q, y = surf(x, z), yaw = face(a);
    try {
      if (k === "w") { if (wk >= 6) continue; const g = propWalker(wk++), pp = e ? who(e) : null; g.position.set(x, y, z); g.rotation.set(0, yaw, 0); g.scale.setScalar(pp && pp.age < 16 ? clamp(0.5 + 0.026 * pp.age, 0.6, 0.85) : 0.85); g.visible = true; out.push(() => { g.visible = false; }); }
      else if (k === "k") { const g = window.TLXSK && TLXSK.shotPose ? TLXSK.shotPose({ x, z, yaw, p: e }) : null; if (g) out.push(() => TLXSK.shotDone()); }
      else if (k === "s") { const id = api.GS.own.sled || "scout"; let c = PROPS.sleds[id]; if (!c) { try { c = PROPS.sleds[id] = api.sledCopy(id, {}); } catch (er) { c = null; } } if (c && c.g) { c.g.position.set(x, y + 0.03, z); c.g.rotation.set(0, yaw, 0); c.g.scale.setScalar(0.9); api.scene.add(c.g); c.g.visible = true; out.push(() => { api.scene.remove(c.g); }); } }
      else if (k.slice(0, 2) === "q:") { const kind = k.slice(2), Q = api.gram.quad; const rig = Q.make(kind, ""); rig.x = x; rig.z = z; rig.yaw = yaw; rig.v = 0; rig.graze = e === 1 ? 0.7 : 0; rig.g.position.set(x, y - 0.05, z); rig.g.rotation.y = yaw; rig.g.scale.setScalar(kind === "reindeer" && e ? 0.9 : 1); Q.pose(rig, 0, 0, rig.graze, 0); rig.g.visible = true; out.push(() => Q.free(rig)); }
    } catch (er) { console.error("TLX gram prop", er); }
  }
  return out;
}
const _cam = { c: null };
function shotCam(rc, w, h) {
  const T_ = api.THREE; const cam = _cam.c || (_cam.c = new T_.PerspectiveCamera(60, 1, 0.25, 9000));
  const cx = rc.c[0], cz = rc.c[1], cy = surf(cx, cz) + rc.c[2], ax = rc.a[0], az = rc.a[1], ay = surf(ax, az) + rc.a[2];
  cam.fov = rc.f; cam.aspect = w / h; cam.near = 0.25; cam.far = 9000; cam.updateProjectionMatrix(); cam.position.set(cx, cy, cz); cam.up.set(0, 1, 0); cam.lookAt(ax, ay, az); cam.updateMatrixWorld(true); return cam;
}
function blank(cv) {
  try { const g = cv.getContext("2d"), w = cv.width, h = cv.height; let mn = 255, mx = 0, sum = 0, n = 0; for (let i = 0; i < 40; i++) { const d = g.getImageData(Math.floor((i % 8 + 0.5) / 8 * w), Math.floor((Math.floor(i / 8) + 0.5) / 5 * h), 1, 1).data, l = (d[0] + d[1] + d[2]) / 3; mn = Math.min(mn, l); mx = Math.max(mx, l); sum += l; n++; } return mx - mn < 3 || sum / n < 2; } catch (e) { return true; }
}
// make a post's picture now (real render, else painted); returns the canvas
function makePic(post) {
  const [w, h] = dims(), cv = document.createElement("canvas"); cv.width = w; cv.height = h; const g = cv.getContext("2d"), t0 = performance.now(); let real = false;
  if (!api.GFX.low && !post.rc.pt && !G.forcePaint) {
    try {
      const cam = shotCam(post.rc, w, h), ps = showProps(post.rc);
      try { real = api.gram.shot({ cam, hour: post.rc.h, storm: Math.min(post.rc.s, 0.6), w, h, ctx: g }); } finally { for (const f of ps) try { f(); } catch (e) { } }
      G.lastShot = { ok: real, blank: real ? blank(cv) : null }; if (real && G.lastShot.blank) real = false;
      if (real) overlayWeather(post, g, w, h);
    } catch (e) { real = false; console.error("TLX gram shot", e); G.err = String(e && e.stack || e); }
  }
  if (!real) { paintPic(post, cv); G.painted++; } else { G.renders++; G.renderMs.push(Math.round(performance.now() - t0)); if (G.renderMs.length > 60) G.renderMs.shift(); }
  const e = { cv, real, id: post.id, w, h }; G.cache.set(post.id, e); if (G.cache.size > cacheCap()) G.cache.delete(G.cache.keys().next().value); return e;
}
G.makePic = makePic;
G.picOf = id => { const e = G.cache.get(id); if (e) { G.cache.delete(id); G.cache.set(id, e); } return e || null; };
function blit(root) {                                                                                  // draw cached pictures into the placeholders after a render of the app; a post with none yet gets its painted stand-in
  const posts_ = posts();
  for (const cv of root.querySelectorAll("canvas[data-gp]")) {
    const id = +cv.dataset.gp, e = G.picOf(id), g = cv.getContext("2d");
    if (e) { cv.width = e.w; cv.height = e.h; g.drawImage(e.cv, 0, 0); cv.dataset.done = e.real ? "real" : "paint"; }
    else { const post = posts_.find(q => q.id === id); if (post) { const [w, h] = dims(); cv.width = w; cv.height = h; paintPic(post, cv); cv.dataset.done = "temp"; } }
  }
}
// the render queue: one picture per turn, only with the tablet on the Feed, frame rate healthy and the ride calm; the ones on screen first
let _wall = 0, _ema = 16, _renderT = 0;
const calm = () => { const P = api.P, sp = Math.hypot(P.vx || 0, P.vz || 0); return !(api.MNT && api.MNT.on) && !(api.DMT && api.DMT.on) && !(api.HELP && api.HELP.on) && !(api.INT && api.INT.on) && (api.FOOT.on || sp < 14); };
G.healthy = () => G.fpsOk !== null ? G.fpsOk : _ema < 45;
G.calm = calm; G.resetWait = () => { _renderT = 0; G.busy = false; };
G.wantPics = () => api.TABLET.open && api.TABLET.app === "gram" && G.view.tab === "feed";
function nextPic(root) {                                                                                // the first placeholder in or near the view that still has no real picture
  const lo = root.scrollTop - 700, hi = root.scrollTop + root.clientHeight + 1000; let best = null;
  for (const cv of root.querySelectorAll("canvas[data-gp]")) { if (cv.dataset.done === "real" || cv.dataset.done === "paint") continue; const top = cv.offsetTop + (cv.offsetParent && cv.offsetParent !== root ? cv.offsetParent.offsetTop : 0); if (top + 80 < lo || top > hi) continue; best = +cv.dataset.gp; break; }
  return best;
}
function renderTick(dt) {
  const now = performance.now(); if (_wall) _ema += (now - _wall - _ema) * 0.05; _wall = now;
  if (!G.wantPics() || G.busy) return; _renderT -= dt; if (_renderT > 0) return;
  if (!G.healthy() || !calm()) return;
  const root = document.getElementById("tabV"); if (!root) return; const id = nextPic(root); if (id === null) return;
  const post = posts().find(q => q.id === id); if (!post) return;
  G.busy = true; _renderT = 0.18;
  try { const e = makePic(post); for (const cv of root.querySelectorAll(`canvas[data-gp="${id}"]`)) { const g = cv.getContext("2d"); cv.width = e.w; cv.height = e.h; g.drawImage(e.cv, 0, 0); cv.dataset.done = e.real ? "real" : "paint"; } }
  catch (e) { console.error("TLX gram render", e); G.err = String(e && e.stack || e); }
  G.busy = false;
}

/* ---------------- the app ---------------- */
const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r="1" fill="currentColor"/></svg>';
const CSS = `#tabS .gtabs{display:flex;gap:6px;margin:0 0 10px}#tabS .gtabs .tml{flex:1;text-align:center}#tabS .gtabs .tml.on{background:var(--band);border-color:var(--bandline)}
#tabS .gpost{display:block;width:100%;text-align:left;font:inherit;color:inherit;margin:0 0 12px;padding:10px;border-radius:var(--r-md);border:1px solid var(--rule);background:rgba(234,242,248,.035);cursor:pointer}
#tabS .gpost.tfoc{outline:none;border-color:var(--bandline);background-color:var(--band)}
#tabS .gph{display:flex;align-items:center;gap:9px;margin-bottom:8px}#tabS .gav{flex:none;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.4)}
#tabS .gwho{min-width:0;flex:1}#tabS .gwho b{display:block;font-size:14px}#tabS .gwho span{display:block;font-size:12px;color:var(--frost2)}
#tabS .gpic{display:block;width:100%;max-width:340px;height:auto;aspect-ratio:4/5;margin:0 auto;border-radius:10px;background:#0c1620}
#tabS .gcap{margin:8px 0 4px;font-size:14px;line-height:1.35}#tabS .gmeta{font-size:12px;color:var(--frost2)}#tabS .gcm{font-size:13px;margin:3px 0;color:var(--frost2)}#tabS .gcm b{color:inherit}
#tabS .gchip{display:inline-block;font-size:10px;letter-spacing:.06em;padding:2px 6px;border-radius:99px;border:1px solid var(--rule);margin-left:6px;color:var(--frost2)}
#tabS .gmsg{display:flex;gap:8px;margin:0 0 8px}#tabS .gmsg .gav{width:26px;height:26px;font-size:10px}#tabS .gmb{min-width:0;flex:1}#tabS .gmb b{font-size:12px}#tabS .gmb i{font-style:normal;color:var(--frost2);font-size:11px;margin-left:6px}
#tabS .gmb p{margin:2px 0 0;font-size:13px;line-height:1.35;word-wrap:break-word}#tabS .gmsg.you .gmb p{background:rgba(70,160,255,.16);padding:5px 8px;border-radius:9px;display:inline-block}
#tabS .gre{font-size:11px;color:var(--frost2)}#tabS .grep{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 4px}#tabS .grep .tbtn{flex:1 1 140px}`;
function avatar(p) {
  if (!p) return `<span class="gav" style="background:#46586a">N</span>`;
  const ini = ((p.first || "?")[0] + ((p.last || "")[0] || "")).toUpperCase(), hue = p.id === "you" ? 205 : Math.floor(hash01("av" + p.id) * 360);
  return `<span class="gav" style="background:hsl(${hue},48%,40%)">${esc(ini)}</span>`;
}
function ago(t) {
  const d = api.GS.hour - t; if (d < 0.02) return "now"; if (d < 1) return Math.max(1, Math.round(d * 60)) + " min ago"; if (d < 24) return Math.round(d) + " h ago";
  const D = Math.floor(d / 24); return D < 2 ? "yesterday" : D + " d ago";
}
G.ago = ago;
const tabsHTML = tab => `<div class="gtabs">${[["feed", "Feed"], ["reels", "Reels"], ["local", "Local"], ["you", "You"]].map(([id, n]) => `<button type="button" class="tml${tab === id ? " on" : ""}" data-tf="gt:${id}" data-gt="${id}">${n}${id === "feed" && unseen() ? ` <b>${unseen()}</b>` : ""}</button>`).join("")}</div>`;
function postHead(post) {
  const p = post.who === "you" ? YOU : who(post.who), handle = p ? "@" + p.handle : "@nordkinn";
  return `<div class="gph">${avatar(p)}<div class="gwho"><b>${esc(handle)}${post.chip ? `<i class="gchip">${esc(post.chip)}</i>` : ""}</b><span>${esc(post.place || "")} · ${ago(post.t)}</span></div></div>`;
}
const likes = post => `${post.lk} likes${post.cm.length ? " · " + post.cm.length + " comment" + (post.cm.length > 1 ? "s" : "") : ""}`;
function feedCard(post) {
  const cm = post.cm.slice(0, 2).map(([pid, t]) => { const c = who(pid); return `<div class="gcm"><b>${esc(c ? c.first : "?")}</b> ${esc(t)}</div>`; }).join("");
  return `<button type="button" class="gpost" data-tf="gp:${post.id}" data-gp="${post.id}">${postHead(post)}<canvas class="gpic" data-gp="${post.id}" width="${dims()[0]}" height="${dims()[1]}"></canvas><div class="gcap">${esc(post.cap)}${post.wish ? ` <span class="gmeta">(a still: not in the game yet)</span>` : ""}</div><div class="gmeta">${likes(post)}</div>${cm}</button>`;
}
function renderFeed(el) {
  const s = S(), ps = posts().slice().reverse(); let h = "";
  const cur = G.view.post && posts().find(q => q.id === G.view.post);
  if (cur) {
    const cms = cur.cm.map(([pid, t]) => { const c = who(pid), kin = c && who(cur.who) ? kinWord(c, who(cur.who)) : ""; return `<div class="gmsg">${avatar(c)}<div class="gmb"><b>${esc(c ? c.first + " " + (c.last || "") : "?")}</b>${kin ? `<i>${esc(kin.replace(/^my |^our /, ""))}</i>` : ""}<p>${esc(t)}</p></div></div>`; }).join("");
    h += tabsHTML("feed") + `<button type="button" class="tml" data-tf="gb" data-gb="1">‹ Feed</button><div class="gpost" style="cursor:default;margin-top:8px">${postHead(cur)}<canvas class="gpic" data-gp="${cur.id}" width="${dims()[0]}" height="${dims()[1]}"></canvas><div class="gcap">${esc(cur.cap)}</div><div class="gmeta">${likes(cur)}${cur.wish ? " · a still: this is not in the game yet" : ""}${cur.you ? " · about you" : ""}</div></div>${cms ? `<div style="margin-top:8px">${cms}</div>` : `<p class="tnote2">No comments yet.</p>`}`;
  } else {
    h += api.ui.tabHead("GRAM · NORDKINN", "Feed", "") + tabsHTML("feed");
    h += ps.length ? ps.map(feedCard).join("") : `<p class="tnote2">Nobody has posted yet. Give the morning a minute.</p>`;
  }
  el.innerHTML = `<div class="tapp">${h}</div>`;
}
function renderReels(el) {
  el.innerHTML = `<div class="tapp">${api.ui.tabHead("GRAM · NORDKINN", "Reels", "")}${tabsHTML("reels")}${api.ui.tabCard({ title: "Reels are coming", chips: api.ui.chip("SOON", "due"), meta: "Short loops that play as you scroll, made of the real place.", note: "Planned: the view turning on a peak · riders racing on a lake and the crowd at the rope · a sled skipping open water · two sleds in a whiteout with only tail lamps · a reindeer licking the lens from a snow hole · a skier's tuck down Lysløypa at night · a whale's fluke off the skiff · the plow throwing a white wall · the aurora over the lighthouse." })}</div>`;
}
function renderYou(el) {
  el.innerHTML = `<div class="tapp">${api.ui.tabHead("GRAM · NORDKINN", "You", "")}${tabsHTML("you")}<div class="gph" style="margin:6px 0 12px">${avatar(YOU)}<div class="gwho"><b>@${PEN}</b><span>${esc(calAt(api.GS.hour).long || "")}</span></div></div>${api.ui.tabCard({ title: "Followers", meta: "0 followers · 0 posts" })}${api.ui.tabCard({ title: "Post from the trail", chips: api.ui.chip("COMING", "due"), meta: "Take the shot you are looking at and share it. Villagers will like it and comment on what is in it." })}<p class="tnote2">Posts about you already show in the Feed and in Local: a trail you set, a road you opened, a rescue.</p></div>`;
}
function renderLocal(el) {
  const s = S(), vid = localVid(), v = TLXN.village(vid), msgs = (s.chat[vid] || []), H = api.GS.hour;
  let h = api.ui.tabHead("GRAM · LOCAL", esc(v ? v.name : "Local"), `${onlineN(vid, H)} online`) + tabsHTML("local");
  h += `<div class="gchat">` + (msgs.length ? msgs.map(m => {
    const p = m[2] === "you" ? YOU : who(m[2]), re = m[5] ? msgs.find(q => q[0] === m[5]) : null, rp = re ? (re[2] === "you" ? YOU : who(re[2])) : null;
    return `<div class="gmsg${m[2] === "you" ? " you" : ""}">${avatar(p)}<div class="gmb"><b>${esc(p ? (p.id === "you" ? "You" : p.first) : "Nordkinn")}</b><i>${ago(m[1])}</i>${rp ? `<div class="gre">↩ ${esc(rp.first || "you")}</div>` : ""}<p>${esc(m[3])}</p></div></div>`;
  }).join("") : `<p class="tnote2">${esc(v ? v.name : "The village")} is quiet. Nothing to report yet.</p>`) + `</div>`;
  h += `<div class="grep">` + replyOptions().map((t, i) => `<button type="button" class="tbtn ghost" data-tf="gr:${i}" data-gr="${i}">${esc(t)}</button>`).join("") + `</div>`;
  el.innerHTML = `<div class="tapp">${h}</div>`;
}
function render(el) {
  const s = S(); if (s && posts().length && G.view.tab === "feed") s.seen = Math.max(s.seen, ...posts().map(q => q.id));
  const tab = G.view.tab; if (tab === "reels") renderReels(el); else if (tab === "local") renderLocal(el); else if (tab === "you") renderYou(el); else renderFeed(el);
  for (const b of el.querySelectorAll("[data-gt]")) b.addEventListener("click", () => { G.view.tab = b.dataset.gt; G.view.post = null; if (G.view.tab === "local") G.scrollEnd = true; api.TABLET.refresh("gram"); });
  for (const b of el.querySelectorAll("button[data-gp]")) b.addEventListener("click", () => { G.view.post = +b.dataset.gp; el.scrollTop = 0; api.TABLET.refresh("gram"); });
  for (const b of el.querySelectorAll("[data-gb]")) b.addEventListener("click", () => { G.view.post = null; api.TABLET.refresh("gram"); });
  for (const b of el.querySelectorAll("[data-gr]")) b.addEventListener("click", () => { sendReply(+b.dataset.gr); G.scrollEnd = true; });
  blit(el); if (G.scrollEnd) { G.scrollEnd = false; el.scrollTop = el.scrollHeight; }
}
G.setTab = (tab, post) => { G.view.tab = tab; G.view.post = post || null; if (api.TABLET.open && api.TABLET.app === "gram") api.TABLET.refresh("gram"); };
G.reply = sendReply; G.replies = replyOptions; G.chat = vid => (S().chat[vid] || []).slice(); G.posts = posts; G.unseen = unseen; G.genHour = genHour; G.watch = watch; G.busLines = busLines; G.onBus = ev => onBus(ev); G.recipeFor = recipeFor; G.pendingTick = pendingTick; G.shotCam = shotCam; G.paintPic = paintPic; G.kinWord = kinWord; G.renderTick = renderTick; G.addPost = addPost; G.chatPost = chatPost;

/* ---------------- the system ---------------- */
let hooked = false, lastH = -1;
function sane(s) {
  if (!Array.isArray(s.posts)) s.posts = [];
  const num = Number.isFinite, arr = (a, n) => Array.isArray(a) && a.length >= n && a.slice(0, n).every(num);
  s.posts = s.posts.filter(p => p && typeof p === "object" && num(p.id) && num(p.t) && typeof p.cap === "string" && p.rc && typeof p.rc === "object" && arr(p.rc.c, 3) && arr(p.rc.a, 2) && num(p.rc.f) && num(p.rc.h)).slice(-CAP);
  for (const p of s.posts) { if (!Array.isArray(p.cm)) p.cm = []; p.cm = p.cm.filter(c => Array.isArray(c) && typeof c[1] === "string").slice(0, 4); if (!num(p.lk)) p.lk = 3; if (!num(p.rc.s)) p.rc.s = 0; if (p.rc.p && !Array.isArray(p.rc.p)) delete p.rc.p; p.sj = String(p.sj || "scene"); p.place = String(p.place || ""); }
  if (!s.chat || typeof s.chat !== "object" || Array.isArray(s.chat)) s.chat = {};
  for (const k of Object.keys(s.chat)) { const a = s.chat[k]; s.chat[k] = Array.isArray(a) ? a.filter(m => Array.isArray(m) && m.length >= 4 && num(m[0]) && num(m[1]) && typeof m[3] === "string").slice(-CHAT) : []; }
  for (const k of ["seq", "seen", "cseq", "busId", "genH", "noteD", "rs"]) if (!num(s[k])) s[k] = k === "genH" || k === "noteD" ? -9 : k === "rs" ? 4242 : 0;
  s.seq = Math.max(s.seq, ...s.posts.map(p => p.id)); s.cseq = Math.max(s.cseq, ...Object.values(s.chat).flat().map(m => m[0]), 0);
  if (!s.last || typeof s.last !== "object") s.last = {}; if (!s.storm || typeof s.storm !== "object") s.storm = { on: 0, peak: 0, t0: 0, cm: 0 }; if (!s.road || typeof s.road !== "object") s.road = {};
}
TLX.register({
  id: "gram", v: 1,
  state0: () => ({ seq: 0, posts: [], seen: 0, chat: {}, cseq: 0, busId: 0, genH: -9, noteD: -9, rs: (Math.random() * 2147483647) | 0, last: {}, storm: { on: 0, peak: 0, t0: 0, cm: 0 }, road: {} }),
  migrate: st => st,
  init(a) {
    api = a; W = a.world; T = a.THREE; G.ready = false; G.err = ""; G.cache.clear(); G.view = { tab: "feed", post: null }; G.pending = [];
    try {
      const s = S(); sane(s);
      if (!window.TLXN || !TLXN.ready) { G.err = "no news bus"; return; }
      if (!document.getElementById("gramCss")) { const st = document.createElement("style"); st.id = "gramCss"; st.textContent = CSS; document.head.appendChild(st); }
      const H = api.GS.hour;
      if (s.genH < -5 && !s.posts.length) {                                                       // a first run (or a save from before Gram): the last day's news and a morning's ambient posts, so the app is not empty
        for (const b of TLXN.all().filter(q => q.t >= H - 30).slice(-12)) onBus(b, true);
        for (let h = Math.max(0.5, Math.floor(H) - BACKLOG); h <= Math.floor(H); h++) { genHour(h + 0.3); s.genH = h; }
        s.seen = Math.max(0, ...posts().map(q => q.id));
      }
      s.busId = Math.max(s.busId, 0, ...TLXN.all().map(q => q.id));
      s.genH = Math.floor(H); lastH = Math.floor(H);
      if (!hooked) {
        hooked = true; TLXN.on(ev => onBus(ev));
        a.TABLET.register({ id: "gram", name: "Gram", icon: ICON, order: 5.7, hidden: () => !G.ready, badge: () => unseen() || "", render, onOpen() { G.view.post = null; if (G.view.tab === "local") G.scrollEnd = true; }, onBack() { if (G.view.post) { G.view.post = null; api.TABLET.refresh("gram"); return true; } return false; } });
      }
      G.ready = true;
    } catch (e) { G.err = String(e && e.stack || e); console.error("TLX gram", e); }
  },
  tick(dt) {
    if (!G.ready || !api.started()) return;
    try {
      const H = api.GS.hour, h = Math.floor(H);
      if (h !== lastH && G.hold) lastH = h;
      if (h !== lastH) {
        if (h > lastH && h - lastH <= 6) for (let k = lastH + 1; k <= h; k++) { watch(k); genHour(k + 0.4); } else if (h > lastH) { watch(h); genHour(h + 0.4); }
        lastH = h; S().genH = h;
      }
      pendingTick(); renderTick(dt);
    } catch (e) { if (!G.tickErr) console.error("TLX gram tick", e); G.tickErr = String(e && e.stack || e); }
  }
});
})();

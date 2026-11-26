// Tracklayer: Gram, remade (goal G7, loop/HOME.md H2 / H2R-a).
//
// Gram is the Nordkinn's photo app. Two tabs, one scroll each: LOCAL (what the place you are in is posting: one post per screen, newest first, from the nearest village and its
// trails, road, harbour and fell, plus the peninsula's big news) and REELS (full-height clips from the whole Nordkinn). Everything shown is something that happens.
//
// THE DIRECTOR makes every post from a MOMENT: a small scene the world could really be showing now, staged at a real place with real people from the households, shot the way
// that person would shoot it. A kind of moment is one row of the table in tlx-gramk-*.js (TLXGK.kinds): when it can happen (season, hour, light, weather, place, who: interests,
// age, family), its cast and props, its place, its camera, its words. A photo is one good frame of the row's scene; a reel is the same scene moving, so one table feeds both grams.
//   * WITNESSED FIRST: when the simulation is truly showing the thing (skiers out on a trail, the plow on its round, a herd, a lit gapahuk fire, the player's own crash or bog or
//     groomed trail or rescue or plowed drive) the moment is pinned to those real people and that real place and hour (pinned()). Otherwise it is staged from the households.
//   * LIGHT: every shot carries a light plan (litPlan): the scene's own lamps and glows, plus a phone-style fill from the camera on faces and close subjects and a night-mode exposure
//     lift, done with the lights the game already has (the key light is swung to the camera side for the frame, the sky fill and exposure lifted) and put back exactly (gramShot's
//     updSky restores them, litOff the rest). A picture is MEASURED (the subject's mean luminance, the frame's contrast): re-lit once, else the moment is dropped, never posted.
//   * A SUBJECT, always: composition is checked from the projected bounds of what the caption names (size, in frame, faces to the camera, nothing in front of it) before a moment is accepted.
//   * VARIETY: the director keeps a memory per village (no kind twice in five posts, no place twice in four, no person twice in a day, a mix of families in any ten) and favours kinds
//     the player has not seen. RHYTHM: about 30-40 posts a game day across the peninsula (8-15 in a village's Local), more at weekends and after a storm, few at 04:00.
//   * WORDS: each kind has its own caption lines (picked by the poster's voice, filled from the moment's facts) and comment pools (the person pictured, family, the neighbour who
//     knows the spot, someone it annoys), with replies threaded now and then.
// A post is saved as a RECIPE (kind, people ids, place, hour, weather, seed), never pixels; pictures are drawn when the tablet shows Local, the next two ahead of the reader.
// The text posts (a trail report, a road, a lost glove, waffles, "who has a rope") are coloured cards; the news bus (TLXN) feeds both kinds.
//
// SAVED: x.sys.gram = { v: 2, posts: [newest 160], seen, seq, busId, rs, mem, last, sk (kinds seen), day, storm, road, reels, gen (hours made) }.
(() => {
"use strict";
const CAP = 160, BACKLOG_H = 48;
let api = null, W = null, T = null;
const G = { framing: { tries: 0, ok: 0, rejected: 0, dropped: 0, why: [] }, ready: false, err: "", view: { tab: "local", cur: 0, sheet: 0, rcur: 0 }, genLog: [], renders: 0, renderMs: [], painted: 0, fpsOk: null, cache: new Map(), busy: false, notes: 0, last: null, checks: 0, dropped: [], relit: 0, H: {} };
window.TLXGR = G;
const S = () => TLX.state("gram");
TLX.option({ id: "gramnotes", name: "Gram notifications", hint: "Gram pings the tablet now and then (at most one a day) for something big about you: a road you opened, a rescue, a trail you set. Off = no pings; Local still fills.", sys: "gram" });

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hashS = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const hash01 = s => hashS(String(s)) / 4294967296;
const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
function rnd() { const s = S(); s.rs = (s.rs + 0x6D2B79F5) >>> 0; let t = s.rs; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const pick = a => a[Math.floor(rnd() * a.length)];
const YOU = { id: "you", first: "Courier", last: "", name: "You", handle: "courier", voice: "warm", vid: null, age: 30, interests: [], role: "", village: "" };
const who = id => id === "you" ? YOU : (window.TLXN && TLXN.person(id)) || null;
const calAt = H => api.CAL.now(H);
const surf = (x, z) => W.surf(x, z);
const landOk = (x, z) => !W.isSea(x, z) && !W.isWater(x, z) && W.groundAt(x, z) > 1;
const openOk = (x, z, r = 2.2) => landOk(x, z) && !W.obNear(x, z, r);
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
  const v = (p && p.voice) || "warm", w = ev === 2 ? { pre: [""], post: [""] } : ev ? { pre: [""], post: WRAPE[v] || [""] } : (WRAP[v] || WRAP.warm), f = s => String(s).replace(/\{(\w+)\}/g, (m, k) => vars[k] !== undefined ? vars[k] : m);
  if (v === "terse") return f(bases[0]).replace(/[!]+/g, ".");
  let t = f(pick(bases)); const pre = pick(w.pre), post = pick(w.post);
  t = pre + t + post;
  if (nor && rnd() < 0.22 && (v === "warm" || v === "chatty" || v === "dry" || v === "earnest")) t += pick(nor);
  t = t.replace(/\.\./g, ".").replace(/\s+/g, " ").trim(); return /[.!?]$/.test(t) ? t : t + ".";
}
const fishes = ["cod", "haddock", "saithe", "halibut", "wolffish", "redfish"], lakeFish = ["char", "grayling", "trout", "pike"];
const wordOfStorm = s => s > 0.8 ? "a full gale" : s > 0.55 ? "a proper blow" : "a stiff wind and snow";
const hourWord = h => h < 4 ? "in the small hours" : h < 9 ? "this morning" : h < 12 ? "mid-morning" : h < 15 ? "at lunch" : h < 18 ? "this afternoon" : h < 22 ? "this evening" : "late";
const nearestVil = (x, z) => { let b = null, bd = 1e12; for (const v of TLXN.villages()) { const d = Math.hypot(v.x - x, v.z - z); if (d < bd) { bd = d; b = v; } } return b; };
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

function seaDir(x, z) { let best = null, bd = 1e9; for (let k = 0; k < 36; k++) { const a = k / 36 * 6.283; for (let d = 10; d <= 220 && d < bd; d += 10) if (W.isSea(x + Math.cos(a) * d, z + Math.sin(a) * d)) { bd = d; best = a; break; } } return best; }
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
  fish: ["Fish soup at yours?", "Is there any left?", "{n} kg! Share some."], storm: ["Stay in, {first}.", "Have you seen the road?", "Uff, same here."], aur: ["Seeing it too, from the car park!", "Out of the window, wow.", "Go out, everyone!"], kids: ["Mine are out there too!", "Mind the bottom of the hill.", "Let them have it, it is Sunday."]
};
const likesOf = (post, p) => { const b = 3 + Math.round((p ? TLXN.peopleIn(p.vid).length : 20) / 5), r = hash01("lk" + post.id); return Math.round(b + r * b * 2.2 + (post.cm ? post.cm.length * 3 : 0)); };
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
const TK = {
  ski: [["w", "Just skied {trail}, {km} km, and the track was {word}! ❄️"], ["c", "ok so {trail} this morning, {km} km, {word} track, {cold} out, I am STARVING now 😅"], ["d", "{trail}. {km} km. The track's {word}. I've had worse."], ["t", "{trail}, {km} km. {word}."], ["y", "Did {km} km on {trail}. My knees have filed a complaint 🙃"], ["e", "Out on {trail} for {km} km. Track was {word}, the air {cold}. Good to be out."], ["wc", "{km} km on {trail} and I only fell over once 😄"], ["c", "anyone want to ski {trail} tomorrow? did {km} km today, {word} track!!"], ["dy", "{trail} was {word} this morning. Don't tell everyone, I like the quiet."], ["we", "Skiing {trail} at the moment. {cold} but so pretty."]],
  groom: [["wc", "{a} has been over {trail} with the groomer, it's lovely now! 🙌"], ["d", "went up {trail} this morning, somebody had set it. {a}, I assume. Noted, and appreciated."], ["t", "{a}, was that you on {trail}? lovely tracks"], ["ey", "Somebody set {trail} before I was up. It was {a}. Takk, whoever's reading this."], ["wc", "new corduroy on {trail} thanks to {a} ⛷️ who's coming?"]],
  trail: [["dt", "{trail} is {word} right now. Skip it today."], ["wc", "{trail} is {word} at the moment, maybe wait a day? 🥲"], ["ey", "Heads up, {trail} is {word}. Somebody should set it."], ["c", "has anyone been on {trail}? it's {word}. i walked part of it, not fun"], ["y", "{trail} is {word}. The løypelag will hear about it."]],
  shut: [["dt", "drove out to {road}, turned round. drifts over the whole thing. not today"], ["wc", "{road} is closed, just watched the barrier go across 😬"], ["e", "My brother just called from {road}, they have shut it. Tell your people to wait for the plow, please."], ["c", "okay so {road} is CLOSED. i was literally about to drive. anyone seen a plow?"], ["y", "{road} closed. Good thing I wanted a quiet day anyway 😌"], ["wt", "{road} is shut again, so we are staying in. soup on, who is coming over? 🍲"]],
  open: [["wc", "plow just went past our window, {road} is open again 🙌"], ["d", "so they finally got {road} open. only took all morning"], ["t", "plow went by. {road} is open. finally"], ["ce", "{road} open again!! i just saw the first car go through, tell your cousins"], ["y", "the plow came and I will now pretend I was not worried about {road} 😅"], ["we", "heard the plow come through, so {road} should be fine now. drive slow and wave at the driver 🚜"]],
  convoy: [["dt", "Convoy for {road} leaves {at}. I'll be in the queue."], ["wc", "convoy on {road} at {at}, who's driving? we can share 🚗"], ["e", "The convoy on {road} goes at {at}. Please be there early."], ["cy", "{road} convoy {at}. last time I waited forty minutes, so I'm bringing a thermos ☕"]],
  convoyrun: [["dt", "Convoy's on {road} now. Fingers crossed."], ["wc", "The convoy just left for {road}! Safe trip everyone 🙏"], ["ce", "convoy is rolling on {road}, I can see the lights from the kitchen"]],
  plow: [["wc", "{a} has cleared {road} 🙌 Takk!"], ["d", "was out at six and {a} had already been along {road}. fine work"], ["ce", "ok {a} just opened {road} for us, you absolute legend"], ["ey", "Thank you {a}. {road} is open and it matters."], ["t", "{a}!! thank you for {road} 🙏"]],
  stormstart: [["dt", "Wind's picking up from the {from}. Bringing the boat in."], ["wc", "storm coming in from the {from}! I'm filling the woodbox 🪵"], ["e", "A storm is on its way from the {from}. Check on your neighbours."], ["c", "you can hear it already, from the {from}. i'm not going anywhere today"], ["y", "Storm from the {from}. Good time to learn knitting 🧶"], ["wt", "Storm from the {from}. Stay in."]],
  stormend: [["wc", "storm's through! {cm} cm in the yard, and my shovel is crying 😩"], ["d", "{ms} m/s in the gusts, they say. {cm} cm out the door. the shed door is still on, barely"], ["c", "okay that was something. {ms} m/s in the gusts and {cm} cm outside the door!!"], ["e", "That is over, thank goodness. {ms} m/s at the worst and {cm} cm outside. Could someone check Mormor's roof for me?"], ["t", "well. {cm} cm. my back hurts already"], ["y", "{cm} cm. I will be shovelling until spring ⛏️"]],
  ferry: [["dt", "No {dir} ferry today. The mail can wait."], ["wc", "ferry's cancelled for the weather, {dir}. coffee at the quay instead? ☕"], ["e", "The {dir} ferry is cancelled. Please let your visitors know."], ["cy", "no {dir} boat AGAIN. i have parcels on it. of course."]],
  ferrylate: [["d", "The {dir} ferry is {delay} h late. Of course."], ["wc", "{dir} ferry is {delay} h late, I'm having another coffee 😅"], ["e", "{dir} ferry running {delay} h late. Plan accordingly."], ["t", "Ferry {delay} h late."]],
  wild_reindeer: [["wc", "reindeer on the road by {place}, go slow! 🦌"], ["d", "The herd is back at {place}. The road is theirs."], ["e", "Reindeer near {place}. Please drive carefully and keep the dogs in."], ["c", "OKAY the whole herd is by {place} again, the kids are at the window and i cannot get them away"], ["t", "Reindeer at {place}. Slow down."], ["y", "Reindeer at {place}, blocking traffic like they own the place. They do."]],
  wild_moose: [["wc", "a moose by {place}, in someone's yard I think 😮"], ["d", "Moose near {place}. Big one."], ["e", "A moose is near {place}. Keep your distance, especially with a calf."], ["cy", "there is a MOOSE in the garden at {place} and I am fully inside the house"]],
  wild_fox: [["wy", "That fox is at the bins by {place} again. It knows the schedule."], ["c", "fox at {place}!! so fluffy, so guilty 🦊"], ["dt", "Fox at {place}."], ["we", "A fox at {place}, perfectly white. Lovely."]],
  wild_other: [["wd", "Saw a {kind} near {place}. Thought you would want to know."], ["ce", "ok there is a {kind} near {place}, don't ask me what it is doing"], ["t", "{kind}, {place}."]],
  rescuedone: [["wc", "{a} brought the stranded rider in safe! Thank you 🙏"], ["e", "{a} got the rider home. Thank you. That's how we do it here."], ["d", "Rescue done by {a}. Well done."], ["c", "did you hear?? {a} went out and fetched that rider. what a day"]],
  rescuecall: [["e", "Rescue call out on {trail}. Anyone close, please check in."], ["dt", "Call out on {trail}. Someone's down."], ["wc", "heard on the scanner, someone's in trouble on {trail}. anyone near? 🙏"]],
  rescuelift: [["we", "Helicopter just went over, they've taken someone off {trail}. Hope they're ok."], ["dt", "Helicopter from Banak. {trail}."], ["cy", "the helicopter just went right over the roof, taking someone off {trail}, I hope they're all right"]],
  rescueother: [["ew", "Another crew took someone off {trail}. Good to know they're ok."], ["dt", "Somebody's been taken off {trail} already, so no need to go out."]],
  bog: [["wc", "{a} sat down in a drift outside {place}, anyone got a rope? 😅"], ["yd", "Saw {a}'s sled sunk in the drift at {place}. Somebody go and laugh, then help."], ["ce", "{a} is stuck in the snow outside {place} and I am watching from the window with tea 🍵"]],
  crash: [["we", "{a} came off hard near {place}. Hope you're in one piece."], ["cy", "heard {a} went over the bars at {place}, hope everything is still attached 😬"], ["dt", "Big crash near {place}: {a}. Check on them."]],
  firstlight: [["wc", "THE SUN. It came over the fell at noon. I stood in the road like a fool ☀️"], ["e", "I saw the sun over the fell today and I may have cried a little. We made it through, all of us."], ["cy", "sun!! actual sun!! the whole street was out looking at it 😭"], ["dt", "sun's back. about time, I was starting to talk to the fridge"]],
  polarnight: [["dt", "No sun today. Polar night's here."], ["wc", "polar night starts today, time for candles and cardamom buns 🕯️"], ["ey", "The sun did not come up. Light the lamps, check on the old ones."]],
  job: [["wc", "{a} groomed the trail to {place}, it's a pleasure to ski! ⛷️"], ["d", "New trail to {place} from {a}. Appreciated."], ["ce", "{a} did the trail to {place}. thank you!!"]],
  complaint_hit: [["wc", "someone ran into me on {trail}. On a SKI TRAIL. I filed a complaint 😤"], ["dy", "A sled ran into me on {trail}. The løypelag will hear about it."], ["e", "I was hit by a sled on {trail}. Please slow down near skiers."]],
  complaint_fast: [["dc", "sled came past me way too fast on {trail}. I've told the løypelag."], ["wy", "{trail} is for skis and quiet. A sled just went by at full throttle 🙄"], ["e", "Please slow down for skiers on {trail}. It's a shared track."]],
  skidag: [["wc", "skidag on {trail} {when}, {sf} to {st}. waffles! bring your kids 🥞"], ["e", "Skidag at {trail} {when}, {sf} to {st}. Everyone welcome."], ["dt", "Skidag: {trail}, {when}, {sf}-{st}."]],
  skidagdone: [["wc", "skidag done: {n} came, the track was {word}. Thank you all! 🥞"], ["e", "Skidag finished. {n} of us. Thank you for coming."], ["dy", "{n} people, one waffle iron. I am going to lie down."]]
};
const RP = {
  road: [["w", "Thanks for telling us! 🙏"], ["c", "wait, is it open all the way to the bridge?"], ["d", "Good to know before I head out."], ["y", "Just when I'd made peace with staying home 😅"], ["e", "Thank you. I'll tell my mother, she's driving later."], ["t", "Ok. Thanks."], ["w", "Anyone going that way? I need a lift to the shop."], ["c", "ugh ok. thanks. i'll take the long way"]],
  storm: [["w", "Stay safe everyone 🙏"], ["c", "is it that bad already?? the boat's still out"], ["d", "Staying in. The woodbox is full."], ["y", "Cancel everything, bring cake."], ["e", "I'll check on the neighbours when it eases."], ["t", "Got it. Staying in."], ["w", "anyone need anything from the shop first?"], ["c", "hahaha my roof is already making sounds"]],
  ferry: [["d", "Mail can wait."], ["w", "Thanks. I'll skip the quay."], ["c", "wait, so the parcel isn't coming at all?"], ["y", "Tomorrow, maybe. The ferry is an optimist."], ["t", "Ok."], ["e", "Hope it sails tomorrow."]],
  wildlife: [["w", "Is it still there? The kids want to see! 🦌"], ["c", "i'm at the window right now, they are HUGE"], ["d", "I'll go slow on the road."], ["y", "Tell it the shop closes at six."], ["t", "Seen it. Mind the road."], ["e", "Thanks. I'll keep the dog in."]],
  ski: [["w", "Is the track any good? ⛷️"], ["c", "I'm going this evening!! save me a bit of snow"], ["d", "Nice. I was going to say it's too cold."], ["y", "Do you want a medal or a hot drink?"], ["t", "Nice one."], ["e", "Well done. I need to get out more."]],
  rescue: [["w", "Is everyone ok?? 🙏"], ["c", "wait what happened? someone tell me"], ["e", "I can bring blankets if needed."], ["d", "Hope it ends well."], ["t", "Thinking of them."]],
  crash: [["w", "Are you ok?? 😮"], ["c", "I can come with a rope and a camera"], ["d", "Mind the ice there."], ["y", "Style points: ten. Landing points: not so many."], ["e", "I hope it isn't serious."]],
  sky: [["w", "Standing in the road with you ☀️"], ["c", "my whole family is on the porch!!"], ["d", "Noted. Back to work."], ["e", "Good to see it again."]],
  thanks: [["w", "Takk, {a}!"], ["c", "{a}, you absolute legend"], ["d", "Well done, {a}."], ["e", "Thank you, {a}. It matters."], ["y", "Praise to {a}, who has not been asked and did it anyway."], ["t", "Thanks {a}."]],
  other: [["w", "Sounds good! 🙂"], ["c", "ha, yes, I was just saying"], ["d", "Right."], ["y", "As one does."], ["t", "Ok."], ["e", "Thanks for telling us."]]
};
const ANS2 = [["w", "Yes, all the way! 😊"], ["c", "haha yes!! I saw it myself"], ["d", "Yes. Probably."], ["y", "As far as I know, and I know everything."], ["t", "Yes."], ["e", "As far as I could tell, yes."], ["w", "not sure, I'm only passing, but I'll look"], ["c", "I'll let you know in an hour 🙃"]];
const EMO = { w: ["😊", "🙂", "❄️", "☀️", "🙌"], c: ["😅", "😂", "🙈", "👀", "😮"], y: ["🙃", "😌"], e: [], d: [], t: [] };
const vk = p => ({ dry: "d", warm: "w", terse: "t", chatty: "c", wry: "y", earnest: "e" }[p && p.voice] || "w");
// make a line sound like the person: the child's lower case, the warm one's emoji
function flavor(p, t, tplv) {
  t = String(t).replace(/\s+/g, " ").trim(); if (!p) return t; const v = vk(p);
  if (p.age < 14) { t = t.charAt(0).toLowerCase() + t.slice(1); t = t.replace(/[.]+$/, "").replace(/!+/g, "!!"); if (rnd() < 0.5) t += pick([" lol", " omg", " haha"]); return t; }
  if (!/[\u{1F300}-\u{1FAFF}]/u.test(t) && EMO[v].length && rnd() < (v === "w" ? 0.35 : v === "c" ? 0.45 : 0.15)) t += " " + pick(EMO[v]);
  if (v === "t") t = t.replace(/!+/g, ".").replace(/[\u{1F300}-\u{1FAFF}]/gu, "").trim();
  if (!/[.!?]$|[\u{1F300}-\u{1FAFF}]$|\?$/u.test(t) && !/lol$|omg$|haha$/.test(t)) t += ".";
  return t;
}
// the ids of the last 30 messages' lines in a village (m[6])
const recentT = (vid, t) => { const c = {}; for (const q of posts().slice(-30)) if (q.lid) c[q.lid] = (c[q.lid] || 0) + 1; return c; };
// pick a line from a pool for a speaker: their voice first, a line seen once in the last 30 only if nothing fresh is left, never a third time
function pickLine(pool, key, p, vid, vars) {
  const v = vk(p), rec = recentT(vid, vars && vars.__t), items = pool.map((e, i) => ({ e, id: key + ":" + i, n: rec[key + ":" + i] || 0, own: e[0].includes(v) }));
  let c = items.filter(q => q.n === 0 && q.own); if (!c.length) c = items.filter(q => q.n === 0); if (!c.length) c = items.filter(q => q.n === 1); if (!c.length) c = items.slice().sort((a, b) => a.n - b.n).slice(0, 1);
  const q = pick(c), t = q.e[1].replace(/\{(\w+)\}/g, (m, k) => vars && vars[k] !== undefined ? vars[k] : m); return { t: flavor(p, t), id: q.id };
}
const hasKin = (c, p) => c && p && c.home === p.home;
// what an event sounds like in a chat, by who says it: -> { t, id } or null (then the bulletin is used)
function talkLine(ev, b, sayer) {
  const d = ev.data || {}, k = ev.kind, you = ev.who === "you", pl = ev.place || (TLXN.village(b.vid) || {}).name || "the village", a = "@" + PEN, txt = ev.text || "";
  const V = { __t: ev.t, place: pl, trail: pl, road: pl, a, km: d.km !== undefined ? (+d.km).toFixed(1) : "", word: d.word || "good", cold: /properly cold/.test(txt) ? "properly cold" : /\bcold\b/.test(txt) ? "cold" : "mild", n: d.n || "", dir: d.dir || "", delay: d.delay || "", ms: d.ms || "", cm: d.cm || "", kind: d.kind || "animal", from: (txt.match(/from the (\w+)/) || [0, "north"])[1], at: (txt.match(/(\d{1,2}:\d{2})/) || [0, "later"])[1], when: d.label || "soon", sf: "", st: "" };
  let pool = null, key = k;
  if (k === "ski") { pool = TK.ski; V.km = (+d.km || 5).toFixed(1); }
  else if (k === "groom") { pool = TK.groom; }
  else if (k === "trail") { pool = TK.trail; }
  else if (k === "road") { if (d.sys === "plow") { pool = TK.plow; key = "plow"; } else if (d.what === "shut") { pool = TK.shut; key = "shut"; } else if (d.what === "open") { pool = TK.open; key = "open"; } else if (d.what === "convoy") { pool = /leaves/.test(txt) ? TK.convoy : TK.convoyrun; key = /leaves/.test(txt) ? "convoy" : "convoyrun"; } }
  else if (k === "storm") { pool = d.what === "end" ? TK.stormend : TK.stormstart; key = d.what === "end" ? "stormend" : "stormstart"; }
  else if (k === "ferry") { pool = d.what === "cancelled" ? TK.ferry : TK.ferrylate; key = d.what === "cancelled" ? "ferry" : "ferrylate"; }
  else if (k === "wildlife") { const kd = d.kind === "reindeer" || d.kind === "moose" || d.kind === "fox" ? d.kind : "other"; pool = TK["wild_" + kd]; key = "wild_" + kd; }
  else if (k === "rescue") { const w = d.what; if (w === "done" && you) { pool = TK.rescuedone; key = "rescuedone"; } else if (w === "call") { pool = TK.rescuecall; key = "rescuecall"; } else if (w === "lifted") { pool = TK.rescuelift; key = "rescuelift"; } else if (w === "other") { pool = TK.rescueother; key = "rescueother"; } }
  else if (k === "crash") { pool = d.what === "bog" ? TK.bog : TK.crash; key = d.what === "bog" ? "bog" : "crash"; }
  else if (k === "sky") { pool = d.what === "firstlight" ? TK.firstlight : TK.polarnight; key = d.what === "firstlight" ? "firstlight" : "polarnight"; }
  else if (k === "job") { pool = TK.job; }
  else if (k === "complaint") { pool = d.how === "hit" ? TK.complaint_hit : TK.complaint_fast; key = d.how === "hit" ? "complaint_hit" : "complaint_fast"; }
  else if (k === "skidag") { if (d.what === "announce") { pool = TK.skidag; key = "skidag"; const m = txt.match(/(\d{1,2}:00)[^]*?(\d{1,2}:00)/); V.sf = m ? m[1] : "10:00"; V.st = m ? m[2] : "14:00"; } else { pool = TK.skidagdone; key = "skidagdone"; } }
  if (!pool) return null; const sp = sayer || (ev.who && ev.who !== "you" ? who(ev.who) : null);
  return pickLine(pool, key, sp, b.vid, V);
}
// someone answers a chat line: a relative teases, a neighbour reacts, now and then the first one answers back
function replyLine(m, sayerId, vid, tagKey, c) {
  const rp = tagKey === "road" || tagKey === "storm" || tagKey === "ferry" || tagKey === "wildlife" || tagKey === "ski" || tagKey === "rescue" || tagKey === "crash" || tagKey === "sky" ? tagKey : tagKey === "groom" || tagKey === "trail" || tagKey === "job" || tagKey === "plow" ? "ski" : "other";
  return pickLine(RP[rp], "re_" + rp, c, vid, { a: "@" + PEN });
}
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
function notify(post) {
  const s = S(), day = calAt(api.GS.hour).day; if (!TLX.on("gramnotes") || s.noteD === day) return; s.noteD = day;
  G.notes++; api.TABLET.notify({ app: "gram", title: "Gram: " + (post.place || "the Nordkinn"), body: post.cap.length > 110 ? post.cap.slice(0, 107) + "..." : post.cap, kind: "info", ttl: 7 });
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
let _lv = null;
function localVid() {
  const V = api.FOOT.on ? api.FOOT : api.P, v = nearestVil(V.x, V.z); if (!v) return "kjollefjord";
  if (_lv && _lv !== v.id) { const c = TLXN.village(_lv); if (c && Math.hypot(c.x - V.x, c.z - V.z) < Math.hypot(v.x - V.x, v.z - V.z) + 250) return _lv; }
  return (_lv = v.id);
}
G.localVid = localVid;
const onlineN = (vid, H) => { const n = TLXN.peopleIn(vid).length, hr = calAt(H).h, k = hr < 6 || hr > 23 ? 0.08 : hr < 8 || hr > 21 ? 0.3 : 0.55; return Math.max(1, Math.round(n * k * (0.8 + 0.4 * hash01(vid + Math.floor(H))))); };

function lightWord(c) { return c.el < -3 ? "Blue hour" : c.el < 1 ? "Sunrise" : "Low sun"; }
/* ================= kinds, captions, comments ================= */
const KT = () => window.TLXGK;
const kinds = () => (KT() ? KT().kinds : {});
const fill = (t, vars) => String(t).replace(/\{(\w+)\}/g, (m, k) => vars[k] !== undefined && vars[k] !== null ? vars[k] : "").replace(/\s+([.,!?])/g, "$1").replace(/\s{2,}/g, " ").trim();
const cap1 = t => t.charAt(0).toUpperCase() + t.slice(1);
// the caption of a moment: a line of this kind that suits the poster's voice (word choice, not a tag), filled from the moment's facts, never one the feed has had lately
function capFor(row, p, vars) {
  const v = vk(p), lines = row.cap, recent = new Set(posts().slice(-70).map(q => q.cap)); let last = "";
  for (let tr = 0; tr < 12; tr++) {
    const own = lines.filter(l => l[0].includes(v)), pool = own.length && rnd() < 0.85 ? own : lines, l = pool[Math.floor(rnd() * pool.length)];
    let t = flavor(p, cap1(fill(l[1], vars))); last = t; if (!recent.has(t)) return t;
  }
  return last + " " + calAt(vars._H || api.GS.hour).time;
}
const GENC = {
  pic: [["", "Delete this one."], ["", "My hat is crooked and nobody told me."], ["", "I look like a snowman. Thanks."], ["", "Fine, I'll admit it's a good one."], ["", "Why did you say it was only for the family?"]],
  grump: [["", "And who is going to tidy up after you?"], ["", "Was that really worth the trip out there?"], ["", "Some of us have work to do, you know."], ["", "Does the whole village need to see it?"]],
  nb: [["", "That's right by {place}, isn't it? Lovely."], ["", "Great one, {first}."], ["", "Saw you from the road!"], ["", "I know that spot. Good choice."]]
};
const RPL = { w: ["Thank you! 😊", "Come along next time!", "You should have been there!"], c: ["I know!! Honestly I could not stop looking", "ha, yes!! more tomorrow"], d: ["Thanks.", "It was fine.", "I'll pass it on."], t: ["Thanks.", "Yes."], y: ["I will take that as praise.", "Naturally."], e: ["Thank you. It meant a lot.", "Thanks for saying so."] };
// who would comment: the person pictured, family (in their own words for each other), the neighbour who knows the spot, someone it annoys; the poster answers one of them now and then
function makeComments(rec, row, p, vars) {
  const out = [], used = new Set([p.id]), cmx = row.cm || {}, fam = TLXN.family(p).filter(q => q && q.id !== p.id && q.age > 5), vil = TLXN.peopleIn(p.vid).filter(q => q.id !== p.id && q.home !== p.home && q.age > 9);
  const add = (c, line, re) => { if (!c) return -1; const t = flavor(c, cap1(fill(line, Object.assign({ first: p.first, place: vars.place, pic1: vars.pic1 }, vars)))); out.push([c.id, t, re === undefined ? -1 : re]); used.add(c.id); return out.length - 1; };
  const pics = (rec.w || []).map(who).filter(q => q && q.id !== p.id && q.age > 5);
  if (pics.length && rnd() < 0.7) { const c = pick(pics); add(c, pick(cmx.pic && cmx.pic.length ? cmx.pic.map(x => ["", x]) : GENC.pic)[1]); }
  const f = fam.filter(q => !used.has(q.id)); if (f.length && rnd() < 0.72) { const c = pick(f), kin = kinWord(c, p) || p.first; const pool = c.age < 12 ? CM.famKid : CM.fam; add(c, pick(pool).replace("{kin}", kin).replace("{kinN}", kin.replace("my ", "") || "one")); }
  const n = vil.filter(q => !used.has(q.id)); if (n.length && rnd() < 0.8) add(pick(n), pick(cmx.nb && cmx.nb.length ? cmx.nb : GENC.nb.map(x => x[1])));
  if (n.length > 1 && cmx.grump && rnd() < 0.3) { const g = n.filter(q => !used.has(q.id)); if (g.length) add(pick(g), pick(cmx.grump)); }
  if (out.length && rnd() < 0.42) { const i = Math.floor(rnd() * out.length), pool = cmx.reply && cmx.reply.length ? cmx.reply : RPL[vk(p)] || RPL.w; add(p, pick(pool), i); }
  if (out.length > 1 && rnd() < 0.25) { const i = Math.floor(rnd() * out.length); if (out[i][0] !== p.id) { const c = who(out[i][0]); if (c && vil.length) add(pick(vil.filter(q => q.id !== c.id)) || c, pick(["Same here!", "Ha, yes.", "Agreed.", "Me too."]), i); } }
  return out.slice(0, 5);
}
G.makeComments = makeComments;
const COMP = { gen: 0 };
G.capFor = capFor;

/* ================= the light plan, the composition check, the measure ================= */
const tv3 = () => G._tv || (G._tv = [new T.Vector3(), new T.Vector3(), new T.Vector3()]);
// The phone's way of seeing a dark scene, with the lights the game already has: the key light swung round to the camera's side (a fill on the face), the sky fill and the exposure lifted.
// Nothing is added to the scene (no shader recompiles); gramShot's updSky puts intensity, colour, sky fill and exposure back, litOff the key light's place.
function litPlan(Sc, rec, boost, skyOnly) {
  const R = window.TLXRL, E = R.E, L = api.gram.lights; if (!L) return;
  if (skyOnly) { E.lit = () => skyDress(E, rec, elAt(rec.h), Sc.storm !== undefined ? Sc.storm : rec.s || 0); E.litOff = () => { E.lit = null; E.litOff = null; }; return; }
  const el = elAt(rec.h), night = clamp((3 - el) / 14, 0, 1), P = Sc.light || {}, b = boost || 1;
  const fill = (P.fill !== undefined ? P.fill : 0.25 + 1.25 * night) * b, expo = (P.exp !== undefined ? P.exp : 0.7 * night) * (b > 1 ? 1.3 : 1), up = (P.hemi !== undefined ? P.hemi : 0.6 * night) * b, warm = P.warm || 0, swing = P.swing !== undefined ? P.swing : clamp(night * 2.5, 0, 1);
  let sp = null, st = null;
  E.lit = () => {
    const c = E.cam.position, m = E.marks && E.marks.length ? E.marks : null; let tx = c.x, ty = c.y, tz = c.z; if (m) { tx = ty = tz = 0; for (const q of m) { tx += q[0]; ty += q[1]; tz += q[2]; } tx /= m.length; ty /= m.length; tz /= m.length; } else { const d = tv3()[0]; E.cam.getWorldDirection(d); tx = c.x + d.x * 6; ty = c.y + d.y * 6; tz = c.z + d.z * 6; }
    sp = L.sun.position.clone(); st = L.sun.target.position.clone();
    if (swing > 0.02) {
      let dx = c.x - tx, dz = c.z - tz; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
      L.sun.position.set(tx + dx * 70, ty + 26, tz + dz * 70); L.sun.target.position.set(tx, ty, tz); L.sun.target.updateMatrixWorld();
      L.sun.intensity = L.sun.intensity + (fill - L.sun.intensity) * swing; L.sun.color.setRGB(1, 0.95 - 0.12 * warm, 0.88 - 0.34 * warm);
    }
    L.hemi.intensity += up; api.renderer.toneMappingExposure *= 1 + expo;
    skyDress(E, rec, el, Sc.storm !== undefined ? Sc.storm : rec.s || 0);
  };
  E.litOff = () => { if (sp) { L.sun.position.copy(sp); L.sun.target.position.copy(st); L.sun.target.updateMatrixWorld(); } E.lit = null; E.litOff = null; };
}
// A phone's night picture never has a flat black sky: stars brighter, a moon where the real one is down, a faint aurora on some clear nights, the dark fog lifted to a deep blue, and in the polar night's
// midday the dusk made blue. Changes the sky's uniforms and the fog colour for the frame only (gramShot's updSky puts them back).
function skyDress(E, rec, el, st) {
  const SU = api.gram.sky && api.gram.sky(), ST = api.gram.stars && api.gram.stars(); if (!SU) return; const clearK = 1 - clamp(st * 1.3, 0, 1); if (clearK < 0.2) return;
  const d = clamp((3 - el) / 11, 0, 1) * clearK; if (d < 0.05) return; const m = d * (el > -9 ? 0.6 : 0.88), fog = api.scene.fog, tmp = tv3()[0];
  const lerpC = (c, r, g, b, k) => c.setRGB(c.r + (r - c.r) * k, c.g + (g - c.g) * k, c.b + (b - c.b) * k);
  lerpC(SU.uZen.value, 0.03, 0.075, 0.2, m); lerpC(SU.uMid.value, 0.07, 0.15, 0.33, m); lerpC(SU.uHor.value, 0.17, 0.3, 0.46, m * (el > -9 ? 0.6 : 1)); lerpC(SU.uHorA.value, 0.14, 0.26, 0.42, m);
  if (fog && fog.color) { lerpC(fog.color, 0.1, 0.18, 0.3, m * 0.7); SU.uFog && SU.uFog.value.copy(fog.color); }
  if (ST && el < -6) ST.uOp.value = Math.max(ST.uOp.value, 0.9 * d) * 1.25;
  if (E.moonDir && el < -6) { SU.uMoon.value.copy(E.moonDir); SU.uMoonI.value = 0.95 * clearK; }                // a moment that wants the moon in a place (the halo) puts it there
  else if (el < -6 && (SU.uMoonI.value < 0.3 || SU.uMoon.value.y < 0.12)) {                                   // the real moon is down: put one in the frame, a little left of where the lens looks, well up
    E.cam.getWorldDirection(tmp); const a = Math.atan2(tmp.x, tmp.z) + 0.45 + 0.3 * (hash01("moon" + (rec.sd | 0)) - 0.5); SU.uMoon.value.set(Math.sin(a) * 0.9, 0.42, Math.cos(a) * 0.9).normalize(); SU.uMoonI.value = 0.8 * clearK;
  }
  if (el < -10 && (E.forceAur || hash01("aur" + (rec.sd | 0)) < 0.42)) SU.uAurora.value = Math.max(SU.uAurora.value, 0.75 * clearK);
}
G.litPlan = litPlan;
// the shot's subject on the frame: its projected box (NDC), whether each face is to the camera, whether anything stands in front
function compose(E, row) {
  const V = tv3()[0], m = E.marks || [], why = [], cam = E.cam; let x0 = 9, x1 = -9, y0 = 9, y1 = -9, n = 0, h = 0;
  if (!m.length) return { ok: false, why: ["no subject"], h: 0 };
  const asp0 = cam.aspect; cam.aspect = 0.8; cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);                       // the picture is 4:5, the clip engine's camera is 9:16
  try {
  for (const q of m) { V.set(q[0], q[1], q[2]).project(cam); if (V.z > 1 || V.z < -1) { why.push("behind"); continue; } x0 = Math.min(x0, V.x); x1 = Math.max(x1, V.x); y0 = Math.min(y0, V.y); y1 = Math.max(y1, V.y); n++; }
  h = (y1 - y0) / 2; const need = (E.needH || 0.25) * 0.82;
  if (n < m.length) why.push("subject behind the camera"); else {
    if (h < need) why.push("small " + h.toFixed(2) + "<" + need); if (x0 < -1.12 || x1 > 1.12 || y0 < -1.15 || y1 > 1.12) why.push("cropped " + [x0, y0, x1, y1].map(v => v.toFixed(2)).join(",")); if (!row.wideOk && ((x0 + x1) / 2 < -0.8 || (x0 + x1) / 2 > 0.8)) why.push("off centre");
  }
  for (const f of E.faces || []) { const dx = cam.position.x - f.x, dz = cam.position.z - f.z, dl = Math.hypot(dx, dz) || 1, d = (dx * Math.sin(f.yaw) + dz * Math.cos(f.yaw)) / dl; if (d < 0.5) { why.push("a face turned away " + d.toFixed(2)); break; } V.set(f.x, f.y, f.z).project(cam); if (Math.abs(V.x) > 1.1 || Math.abs(V.y) > 1.1) { why.push("a face out of frame"); break; } }
  if (!why.length && m.length) {                                                                         // the ground between the lens and the subject: a ridge or drift across the line hides it (the picture shows snow and a glare, no subject)
    const cx = cam.position.x, cy = cam.position.y, cz = cam.position.z; let hid = surf(cx, cz) > cy - 0.25;
    for (const q of m.slice(0, 4)) { if (hid || q[1] < surf(q[0], q[2]) + 0.6) continue; for (let k = 1; k < 10; k++) { const f = k / 12, px = cx + (q[0] - cx) * f, pz = cz + (q[2] - cz) * f, py = cy + (q[1] - cy) * f; if (py < surf(px, pz) + 0.15) { hid = true; break; } } }
    if (hid) { why.push("ground in the way"); G.hidden = (G.hidden || 0) + 1; }
  }
  if (!row.open && !why.length) {                                                                         // nothing solid between the lens and the subject
    const a = m[0], dx = a[0] - cam.position.x, dz = a[2] - cam.position.z, L = Math.hypot(dx, dz);
    for (let d = 1.6; d < L - 0.9; d += 1.6) if (W.obNear(cam.position.x + dx / L * d, cam.position.z + dz / L * d, 0.9)) { why.push("something in the way"); break; }
    if (W.obNear(cam.position.x, cam.position.z, 0.5)) why.push("camera inside something");
  }
  } finally { cam.aspect = asp0; cam.updateProjectionMatrix(); }
  return { ok: !why.length, why, h, box: [x0, y0, x1, y1] };
}
G.compose = compose;
const MC = { cv: null };
// the picture's numbers: the subject's mean luminance, the frame's contrast (5th to 95th percentile) and mean, from a 32x40 copy
function measure(cv, E) {
  if (!MC.cv) { MC.cv = document.createElement("canvas"); MC.cv.width = 32; MC.cv.height = 40; MC.g = MC.cv.getContext("2d", { willReadFrequently: true }); }
  const g = MC.g, V = tv3()[0]; g.drawImage(cv, 0, 0, 32, 40); const d = g.getImageData(0, 0, 32, 40).data, L = new Float32Array(1280);
  for (let i = 0; i < 1280; i++) L[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2];
  const s = Array.from(L).sort((a, b) => a - b), mean = s.reduce((a, b) => a + b, 0) / 1280; let sx0 = 31, sx1 = 0, sy0 = 39, sy1 = 0, any = false;
  for (const q of E.marks || []) { V.set(q[0], q[1], q[2]).project(E.cam); const px = (V.x + 1) / 2 * 32, py = (1 - V.y) / 2 * 40; sx0 = Math.min(sx0, px); sx1 = Math.max(sx1, px); sy0 = Math.min(sy0, py); sy1 = Math.max(sy1, py); any = true; }
  if (!any) { sx0 = 8; sx1 = 24; sy0 = 10; sy1 = 30; }
  const pad = 1.5; sx0 = clamp(Math.floor(sx0 - pad), 0, 31); sx1 = clamp(Math.ceil(sx1 + pad), 0, 31); sy0 = clamp(Math.floor(sy0 - pad), 0, 39); sy1 = clamp(Math.ceil(sy1 + pad), 0, 39);
  let sum = 0, nn = 0; const bl = []; for (let y = sy0; y <= sy1; y++) for (let x = sx0; x <= sx1; x++) { sum += L[y * 32 + x]; bl.push(L[y * 32 + x]); nn++; }
  bl.sort((a, b) => a - b); const bc = bl.length > 4 ? bl[Math.floor(bl.length * 0.92)] - bl[Math.floor(bl.length * 0.08)] : 0;      // the spread of light inside the subject's box: a sled, a car or a rack has edges, empty snow or a glare has none
  return { sub: nn ? sum / nn : mean, mean, contrast: s[1216] - s[64], bc, box: [sx0, sy0, sx1, sy1] };
}
G.measure = measure;
const FLOOR = { sub: 62, contrast: 30, mean: 34, bc: 26 };
G.FLOOR = FLOOR;
const dims = () => api.GFX.low || api.GFX.mobile ? [240, 300] : [360, 450];
G.dims = dims;
// one render of a moment into a canvas (size w x h), with its light plan; returns { Sc, E } or null
function shotInto(rec, cv, boost) {
  const R = window.TLXRL, E = R.E, row = kinds()[rec.k]; if (!R || !R.ready || !row || !api.gram.lights) return null;
  E.prepare(row.need || {}); const Sc = planOf(row, rec, E); if (Sc.setup) Sc.setup(E);
  E.tPrev = -1; E.reset = true; E.clearFx(); Sc.frame(Sc.still, E);
  const sig = E.walkers.length * 1000 + E.extra.length + E.sleds.length * 100000 + E.deer.length * 10 + (E.walkers.length && E.walkers[0].smile ? 7 : 0);       // a figure or prop that is new draws nothing for its first couple of renders (materials not ready): draw them out of sight first
  if (sig !== G.sig) { G.sig = sig; const w0 = cv.width, h0 = cv.height, tc = G.warmCv || (G.warmCv = document.createElement("canvas")); tc.width = 24; tc.height = 30; G.warmed = (G.warmed || 0) + 1; for (let i = 0; i < 3; i++) { E.tPrev = -1; E.reset = true; try { R.renderAt(Sc, Sc.still, tc, tc.getContext("2d")); } catch (e) { } } }
  litPlan(Sc, rec, boost); E.reset = true; E.tPrev = -1;
  const asp0 = E.cam.aspect; E.cam.aspect = cv.width / cv.height; E.cam.updateProjectionMatrix(); let ok = false;
  try { ok = R.renderAt(Sc, Sc.still, cv, cv.getContext("2d")); } finally { E.cam.aspect = asp0; E.cam.updateProjectionMatrix(); if (E.litOff) E.litOff(); }
  return ok ? { Sc, E } : null;
}
G.shotInto = shotInto;
// the plan of a moment with the street lamps put behind its subject at night
function planOf(row, rec, E) {
  const Sc = row.plan(rec, E); if (!Sc || row.nolamp || !window.TLXGK || !TLXGK.lampsBehind) return Sc; const fr = Sc.frame, night = clamp((2 - elAt(rec.h)) / 8, 0, 1);
  if (night > 0.3) Sc.frame = (t, E2) => { fr(t, E2); try { TLXGK.lampsBehind(E2, rec, night); } catch (e) { } };
  return Sc;
}
G.planOf = planOf;
const TC = { cv: null };
// is this moment worth posting: composition from the projected bounds, then a small test render measured and re-lit once; { ok, lb (the light boost to use), why }
function verify(rec, row) {
  const R = window.TLXRL; G.checks++;
  if (!R || !R.ready || !api.gram.lights) return { ok: true, lb: 1, skip: 1 };
  const E = R.E; E.prepare(row.need || {}); let Sc;
  try { Sc = planOf(row, rec, E); if (!Sc) return { ok: false, why: ["no plan"] }; if (Sc.setup) Sc.setup(E); E.tPrev = -1; E.reset = true; E.clearFx(); KT().begin(E); Sc.frame(Sc.still, E); } catch (e) { console.error("TLX gram plan", rec.k, e); G.err = String(e && e.stack || e); return { ok: false, why: ["plan threw"] }; }
  E.clearFx(); const cm = compose(E, row); G.framing.tries++; if (!cm.ok) { G.framing.rejected++; G.framing.why.push(rec.k + ": " + cm.why.join("; ")); if (G.framing.why.length > 80) G.framing.why.shift(); return { ok: false, why: cm.why }; }
  G.framing.ok++;
  if (api.GFX.low || G.noLum) return { ok: true, lb: 1, h: cm.h };
  if (!TC.cv) { TC.cv = document.createElement("canvas"); TC.cv.width = 72; TC.cv.height = 90; }
  let lb = 1, m = null;
  for (let tr = 0; tr < 2; tr++) {
    const r = shotInto(rec, TC.cv, lb); if (!r) return { ok: true, lb: 1, skip: 1, h: cm.h };
    m = measure(TC.cv, r.E); const need = row.close ? FLOOR.sub + 8 : FLOOR.sub, ok = m.sub >= need && m.contrast >= (row.flat ? FLOOR.contrast * 0.6 : FLOOR.contrast) && m.mean >= FLOOR.mean + 9 && m.sub >= need * 0.9 && m.mean < (tr === 0 ? 150 : 215) && (row.flat || row.nobc || m.bc >= FLOOR.bc * 0.7);
    if (ok) return { ok: true, lb, m, h: cm.h };
    if (tr === 0) { lb = m.mean >= 150 ? 0.55 : 1.7 + (m.sub < need * 0.7 ? 0.4 : 0); G.relit++; }
  }
  G.dropped.push({ k: rec.k, m: { sub: Math.round(m.sub), c: Math.round(m.contrast), mean: Math.round(m.mean) } }); if (G.dropped.length > 60) G.dropped.shift(); return { ok: false, why: ["murky " + Math.round(m.sub) + "/" + Math.round(m.contrast)], m };
}
G.verify = verify;

/* ================= the store ================= */
const posts = () => { const s = S(); return s ? s.posts : []; };
const unseen = () => { const s = S(); return s ? s.posts.filter(q => q.id > s.seen && q.who !== "you" && !q.dead).length : 0; };
function addPost(o) {
  const s = S(), p = o.who && o.who !== "you" ? who(o.who) : null;
  const post = { id: ++s.seq, rg: o.rg || TLX.region(), t: r2(o.t === undefined ? api.GS.hour : o.t), who: o.who || null, vid: o.vid || (p ? p.vid : null), place: o.place || "", k: o.k, cap: o.cap, cm: o.cm || [], rc: o.rc || null, ev: o.ev || 0 };
  if (o.tx) post.tx = o.tx; if (o.wide) post.wide = 1; if (o.you) post.you = 1; if (o.lb) post.lb = o.lb; if (o.pin) post.pin = o.pin; if (o.lid) post.lid = o.lid;
  post.lk = likesOf({ id: post.id, cm: post.cm }, p);
  const i = s.posts.findIndex(q => q.t > post.t); if (i < 0) s.posts.push(post); else s.posts.splice(i, 0, post);
  if (s.posts.length > CAP) s.posts.splice(0, s.posts.length - CAP);
  G.last = post; G.genLog.push({ id: post.id, who: post.who, vid: post.vid, k: post.k, cap: post.cap, t: post.t, ev: post.ev, pin: post.pin || "" }); if (G.genLog.length > 900) G.genLog.splice(0, 200);
  const mem = memOf(post.rg); mem.kinds.push(post.k); mem.fams.push(famOf(post.k)); mem.places.push(placeKey(post)); for (const a of ["kinds", "fams", "places"]) if (mem[a].length > 14) mem[a].shift();
  if (G.ui && G.ui.onPost) G.ui.onPost(post);
  return post;
}
G.addPost = addPost;
const famOf = k => k.slice(0, 4) === "txt:" ? "text" : (kinds()[k] ? kinds()[k].fam : "x");
const placeKey = post => post.rc ? Math.round(post.rc.x / 90) + "," + Math.round(post.rc.z / 90) : (post.place || "");
const memOf = rg => { const s = S(); rg = rg || TLX.region(); return s.mem[rg] || (s.mem[rg] = { kinds: [], fams: [], places: [] }); };
const regionOf = q => q.rg || "nordkinn";
const localPosts = () => posts().filter(q => !q.dead && regionOf(q) === TLX.region());                 // Local is the whole land you are in (TLX.region()), never the nearest village
G.localPosts = localPosts;
G.memOf = memOf;

/* ================= the director ================= */
const HRW = [0.3, 0.25, 0.2, 0.2, 0.3, 0.5, 1, 1.6, 1.9, 2, 2.2, 2.4, 2.6, 2.6, 2.4, 2.2, 2.2, 2.2, 2.2, 2, 1.6, 1.1, 0.8, 0.5];
function rateAt(H) {
  const cal = calAt(H), hr = Math.floor(cal.h) % 24; let k = HRW[hr] * 1.0; if (cal.dow === 0 || cal.dow === 6) k *= 1.25; const st = S().storm; if (st && st.endT !== undefined && H - st.endT < 8 && H >= st.endT) k *= 1.3; return k;
}
G.rateAt = rateAt;
function pickVillage(H) {
  const rec = localPosts().slice(-5).map(q => q.vid), vs = TLXN.villages().filter(v => TLXN.peopleIn(v.id).length > 2), w = vs.map(v => Math.pow(TLXN.peopleIn(v.id).length, 0.55) * (rec.includes(v.id) ? 0.25 : 1)); let r = rnd() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < vs.length; i++) { r -= w[i]; if (r <= 0) return vs[i].id; } return vs[0].id;
}
function pickPersonIn(vid, H) {
  const s = S(), day = calAt(H).day, ppl = TLXN.peopleIn(vid).filter(q => q.age > 5 && q.age < 88 && !(s.day[q.id] === day)); if (!ppl.length) return null;
  for (let k = 0; k < 6; k++) { const q = pick(ppl), last = s.last[q.id]; if (last === undefined || H - last > 3) return q; } return pick(ppl);
}
function pickKind(c, vid, H, only, bad) {
  const s = S(), mem = memOf(), ks = only ? [only] : Object.keys(kinds()), glob = posts().slice(-6).map(q => q.k), recentK = mem.kinds.slice(-5), fams = mem.fams.slice(-9), ws = [], fams30 = new Set(localPosts().slice(-30).map(q => famOf(q.k)));
  for (const k of ks) {
    const row = kinds()[k]; if (!row || (bad && bad[k])) { ws.push(0); continue; } let w = 0; try { w = Math.max(0, row.w(c) || 0); } catch (e) { w = 0; if (!G.errK) { G.errK = k + ": " + e; console.error("TLX gram w", k, e); } }
    if (only && G.forceW) w = 1;
    if (!only) { if (recentK.includes(k)) w = 0; if (glob.includes(k)) w *= 0.35; const fc = fams.filter(f => f === row.fam).length; w *= fc >= 3 ? 0.2 : fc >= 2 ? 0.55 : 1; w *= s.sk[k] ? 1 / (1 + 0.3 * s.sk[k]) : 1.6; if (!fams30.has(row.fam)) w *= (fams30.size < 6 ? 8 : 1.9); const sb = row.paint; if ((sb === "deer" || sb === "sled" || sb === "mound") && posts().slice(-6).some(q => (kinds()[q.k] || {}).paint === sb)) w *= 0.25; }
    ws.push(w);
  }
  if (!only) {                                                                                            // the family mix is a guarantee: a family absent from the last 18 posts gets the next picture post if any of its kinds can happen now
    const REQ = ["people", "action", "animals", "sea", "weather", "cosy", "funny"], seen18 = new Set(localPosts().slice(-18).map(q => famOf(q.k))), miss = REQ.filter(f => !seen18.has(f));
    if (miss.length) { let any = 0; for (let i = 0; i < ks.length; i++) if (ws[i] > 0 && miss.includes((kinds()[ks[i]] || {}).fam)) any++; if (any) for (let i = 0; i < ks.length; i++) if (!miss.includes((kinds()[ks[i]] || {}).fam)) ws[i] = 0; }
  }
  const tot = ws.reduce((a, b) => a + b, 0); if (tot <= 0) return null; let r = rnd() * tot; for (let i = 0; i < ks.length; i++) { r -= ws[i]; if (r <= 0) return ks[i]; } return ks[0];
}
function varsOf(key, c, p, rec, an) {
  const row = kinds()[key], base = varsFor(key, c, p), pics = (rec.w || []).map(who).filter(Boolean), v = Object.assign(base, { _H: rec.h, place: an.place || p.village, first: p.first, pic: pics.map(q => q.first).join(" and ") || p.first, pic1: pics[0] ? pics[0].first : p.first, pic2: pics[1] ? pics[1].first : "", fam: TLXN.homeOf(p) ? TLXN.homeOf(p).surname : "", hr: hourWord(calAt(rec.h).h) });
  if (row.vars) Object.assign(v, row.vars(c, rec, an, p)); return v;
}
// make one moment for somebody in a village at hour t: pick a kind that fits, stage it, check it, caption it, post it
function makeOne(t, vid, opt) {
  const s = S(), bad = {}; opt = opt || {};
  for (let at = 0; at < 8; at++) {
    const p = opt.p || pickPersonIn(vid, t); if (!p) return null; const c = ctxFor(p, t); const key = opt.pin ? opt.pin.k : pickKind(c, vid, t, opt.only, bad); if (!key) { if (opt.p) return null; continue; }
    const row = kinds()[key]; if (!row) return null; const sd = 1 + Math.floor(rnd() * 2147483000); let an = null;
    try { an = opt.pin ? opt.pin : row.anchor(c, KT().mulb(sd)); } catch (e) { console.error("TLX gram anchor", key, e); G.err = String(e && e.stack || e); }
    if (!an) { bad[key] = 1; continue; }
    const rec = { k: key, rg: TLX.region(), w: an.w || [p.id], x: r1(an.x), z: r1(an.z), a: r2(an.a || 0), h: r2(an.h !== undefined ? an.h : t - 0.05 - rnd() * 0.3), s: r2(an.s !== undefined ? an.s : c.storm), sd, v: an.v === undefined ? 0 : an.v };
    const chk = verify(rec, row); if (!chk.ok) { bad[key] = (bad[key] || 0) + 1; if (bad[key] < 2 && !opt.pin) { at--; } continue; }
    const vars = varsOf(key, c, p, rec, an), cap = capFor(row, p, vars);
    s.last[p.id] = t; s.day[p.id] = calAt(t).day; for (const q of rec.w) if (q !== "you") s.day[q] = calAt(t).day;
    const post = addPost({ k: key, who: p.id, t, vid: p.vid, place: vars.place, cap, rc: rec, cm: [], lb: chk.lb !== 1 ? chk.lb : 0, pin: opt.pin ? opt.pinSrc || "pin" : 0, ev: opt.ev || 0, you: opt.you ? 1 : 0, wide: row.wide ? 1 : 0 });
    post.cm = makeComments(rec, row, p, vars); post.lk = likesOf(post, p); G.lastM = chk.m || null; post.sh = r2(chk.h || 0); post.lm = chk.m ? Math.round(chk.m.sub) : 0;
    if (!opt.noReel && window.TLXRL && TLXRL.fromMoment) TLXRL.fromMoment(rec, p, c, an, row);                // the clip of the same moment, when the director takes it up
    return post;
  }
  return null;
}
G.makeOne = makeOne;
// a reel's caption: the same per-kind lines as the photo's, filled from the moment (who, where, how much)
G.capReel = (row, key, c, p, rec, an) => { const base = varsFor(key, c, p), pics = (rec.w || []).map(who).filter(Boolean); const v = Object.assign(base, { _H: rec.h, place: (an && an.place) || p.village, first: p.first, pic: pics.map(q => q.first).join(" and ") || p.first, pic1: pics[0] ? pics[0].first : p.first, pic2: pics[1] ? pics[1].first : "", fam: TLXN.homeOf(p) ? TLXN.homeOf(p).surname : "", hr: hourWord(calAt(rec.h).h) }); if (row.vars) Object.assign(v, row.vars(c, rec, an || {}, p)); return capFor(row, p, v); };
// one hour of the director, in pieces: the posts one at a time, then the pinned moments, then the reels. A piece is one frame's work (the backlog and the live hours step through them so that no frame
// carries a whole hour); genHour(H) runs every piece at once, for tests and scripts.
function hourStart(H) { return { H, n: Math.floor(rateAt(H) + rnd()), i: 0, stage: 0, made: 0 }; }
function hourStep(st) {
  const H = st.H;
  if (st.stage === 0) {
    if (st.i >= st.n) { st.stage = 1; return false; }
    const i = st.i++, vid = pickVillage(H), t = Math.floor(H) + (i + rnd()) / Math.max(1, st.n) * 0.95;
    try { const textP = rnd() < 0.14 && !G.noText; const post = textP ? makeText(t, vid) || makeOne(t, vid) : makeOne(t, vid); if (post) st.made++; } catch (e) { console.error("TLX gram director", e); G.err = String(e && e.stack || e); }
    return false;
  }
  if (st.stage === 1) { st.stage = 2; try { pinnedHour(H); } catch (e) { console.error("TLX gram pinned", e); G.err = String(e && e.stack || e); } return false; }
  st.stage = 3; reelHour(H); return true;
}
function genHour(H) { const st = hourStart(H); let g = 0; while (!hourStep(st) && g++ < 400); return st.made; }
G.hourStart = hourStart; G.hourStep = hourStep; G.stepMs = [];
G.genHour = genHour;
function reelHour(H) { if (window.TLXRL && TLXRL.ready) TLXRL.genHour(H + 0.45); }

/* ================= text posts: the coloured cards ================= */
const trailOf = v => { const X = window.TLXSK; if (!X || !X.ready) return null; const ts = X.list.filter(t => t.vil === v.id || (Array.isArray(t.vil) && t.vil.includes(v.id)) || (Array.isArray(t.villages) && t.villages.includes(v.id))); return ts.length ? pick(ts) : X.list.length ? X.list.slice().sort((a, b) => Math.hypot(a.pts[0][0] - v.x, a.pts[0][1] - v.z) - Math.hypot(b.pts[0][0] - v.x, b.pts[0][1] - v.z))[0] : null; };
const roadOf = v => { const R = window.TLXR; if (!R || !R.ready) return null; let b = null, bd = 1e12; for (const r of R.routes) { const d = Math.hypot(r.pts[0][0] - v.x, r.pts[0][1] - v.z); if (d < bd) { bd = d; b = r; } } return b; };
const TXT = {
  trailreport: { hue: 205, ico: "⛷", w: c => (c.int.ski ? 2.6 : 0.8) * (c.snow ? 1 : 0.1) * (c.el > -10 ? 1 : 0.2), vars: c => { const t = trailOf(c.vil); return { trail: t ? t.name : "the ski trail", word: pick(["firm and fast", "a bit soft after the snow", "freshly set", "icy in the shade", "lovely", "slow but pretty"]) }; },
    lines: [["wc", "{trail} this morning: {word}. Wax accordingly."], ["d", "{trail} is {word}. That is the report."], ["t", "{trail}: {word}."], ["y", "Trail report: {trail} is {word}, my knees are not."], ["we", "Skied {trail} today and it was {word}. Thank you to whoever keeps it."], ["c", "okay {trail}!! {word}!! go now before it changes!!"]] },
  roadnote: { hue: 28, ico: "🛣", w: c => (c.storm > 0.25 ? 2.6 : 0.9), vars: c => { const r = roadOf(c.vil); return { road: r ? r.name : "the road", how: c.storm > 0.3 ? pick(["drifting over at the bends", "slow with the wind", "snow packed hard"]) : pick(["bare and dry in places", "packed snow, fine with studs", "plowed this morning"]) }; },
    lines: [["wc", "{road} is {how}. Drive like the reindeer might be round the corner."], ["d", "{road}: {how}."], ["t", "{road}. {how}."], ["ey", "Anyone driving {road} later: it is {how}. Take care."], ["c", "just drove {road}, {how}, everyone slow down please!!"], ["y", "{road} is {how}. I shall be travelling at the speed of caution."]] },
  lostglove: { hue: 350, ico: "🧤", w: c => (c.snow ? 1.4 : 0.3), vars: c => ({ col: pick(["red", "grey", "blue", "orange", "green"]), where: pick(["by the shop", "at the harbour", "near the school", "on the road to the fell", "by the bus stop"]) }),
    lines: [["wc", "Lost: one {col} glove, left hand, {where}. A little tired but much loved."], ["d", "Found a {col} glove {where}. It is on the fence post. Fence post, not mine."], ["c", "has anyone seen a {col} glove?? {where}, it is my only left one!!"], ["t", "Lost {col} glove, {where}."], ["y", "A {col} glove has left me {where}. If you see it, tell it I understand."], ["e", "A {col} glove was lost {where}. Please let me know if you find it."]] },
  waffles: { hue: 42, ico: "🧇", w: c => (c.dow === 0 || c.dow === 6) && c.hr >= 9 && c.hr < 19 ? 4 : 0, vars: c => ({ at: pick(["two", "three", "four"]) }),
    lines: [["wc", "Waffles at ours from {at}. Bring the kids, the iron is hot."], ["d", "Waffles. Ours. From {at}. Jam is homemade."], ["c", "WAFFLES at {first}'s from {at}!! brown cheese too!!"], ["t", "Waffles at {first}'s, {at} o'clock."], ["y", "Waffles from {at}. Attendance is optional, hunger is not."], ["e", "We are doing waffles from {at}. All welcome, especially anyone alone today."]] },
  rope: { hue: 160, ico: "🪢", w: c => (c.snow ? 1.2 : 0.2) * (c.storm > 0.3 ? 1.5 : 1), vars: c => ({ what: pick(["a tow rope", "a long rope", "a strap", "a pair of jump leads"]), where: pick(["by the quay", "up past the shop", "out on the lake road", "behind the school"]) }),
    lines: [["wc", "Who has {what}? Someone is stuck {where} and I only have good intentions."], ["d", "Need {what} {where}. Bring a shovel."], ["c", "does anyone have {what}?? we are stuck {where} and it is getting dark!!"], ["t", "{what}, {where}. Anyone?"], ["y", "Looking for {what} {where}. Payment in coffee."], ["e", "If anyone has {what}, we need it {where}. Thank you."]] },
  ferrynote: { hue: 215, ico: "⛴", w: c => (c.coast ? 1.3 : 0.4), vars: () => ({ how: pick(["on time and nearly empty", "running a little late", "full of parcels", "in the fog, but coming"]) }),
    lines: [["wc", "The ferry is {how}. Coffee at the quay?"], ["d", "Ferry: {how}."], ["t", "Ferry {how}."], ["y", "The ferry is {how}, which in this weather counts as news."], ["ce", "ferry is {how}!! if you are expecting a parcel go now"], ["e", "The ferry is {how}. Please check on whoever is waiting for post."]] },
  stormwarn: { hue: 255, ico: "🌨", w: c => (c.storm > 0.2 && c.storm < 0.7 ? 3.2 : 0), vars: c => ({ w: wordOfStorm(Math.max(c.storm, 0.35)) }),
    lines: [["wc", "It is picking up outside, {w}. Fill the woodbox and check on your neighbours."], ["d", "{w} coming through. Staying in."], ["c", "you can hear it already!! {w}!! bringing the boat in!!"], ["t", "{w}. Stay in."], ["y", "{w}. Time to learn knitting."], ["e", "{w} is on its way. Please check on the ones who live alone."]] },
  thanks: { hue: 130, ico: "🙏", w: c => (c.household > 2 ? 0.8 : 0.4), vars: c => { const q = pick(TLXN.peopleIn(c.p.vid).filter(x => x.id !== c.p.id && x.age > 14)); return { name: q ? q.first : "whoever you are", what: pick(["shovelled our steps", "carried the shopping up", "pulled us out of the drift", "left wood on the porch", "sat with Mormor all afternoon"]) }; },
    lines: [["wc", "Thank you {name}, who {what}. You are the reason this place works."], ["d", "{name} {what}. Noted, with thanks."], ["c", "{name} {what} and did not even say anything!! legend!!"], ["t", "Thanks {name} for the help."], ["y", "{name} {what}. Praise to the person who was not asked and did it anyway."], ["e", "Thank you, {name}, who {what}. It matters more than you know."]] }
};
G.TXT = TXT;
function makeText(t, vid, only) {
  const s = S(), mem = memOf(), p = pickPersonIn(vid, t); if (!p || p.age < 12) return null; const c = ctxFor(p, t), keys = Object.keys(TXT), glob = posts().slice(-8).map(q => q.k);
  const ws = keys.map(k => { let w = only ? (k === only ? 1 : 0) : Math.max(0, TXT[k].w(c) || 0); if (mem.kinds.slice(-5).includes("txt:" + k) || glob.includes("txt:" + k)) w *= only ? 1 : 0.1; return w; }), tot = ws.reduce((a, b) => a + b, 0); if (tot <= 0) return null;
  let r = rnd() * tot, key = keys[0]; for (let i = 0; i < keys.length; i++) { r -= ws[i]; if (r <= 0) { key = keys[i]; break; } }
  const row = TXT[key], vars = Object.assign({ first: p.first, place: p.village }, row.vars(c)), v = vk(p), own = row.lines.filter(l => l[0].includes(v)), l = (own.length && rnd() < 0.85 ? pick(own) : pick(row.lines));
  const cap = flavor(p, cap1(fill(l[1], vars))); s.last[p.id] = t; s.day[p.id] = calAt(t).day;
  const rec = { k: "txt:" + key, rg: TLX.region(), w: [p.id], x: 0, z: 0, a: 0, h: r2(t), s: 0, sd: 0, v: 0 };
  const post = addPost({ k: "txt:" + key, who: p.id, t, vid: vid, place: p.village, cap, tx: { h: row.hue, i: row.ico }, wide: key === "stormwarn" || key === "roadnote" ? 0 : 0 });
  post.cm = makeComments(rec, { cm: {} }, p, { place: p.village, pic1: p.first }); post.lk = likesOf(post, p); return post;
}
G.makeText = makeText;

/* ================= witnessed first: the real thing, the real people ================= */
function pinPost(t, p, an, src, extra) { try { const post = makeOne(t, p.vid, Object.assign({ p, pin: an, pinSrc: src }, extra || {})); if (post) { G.pins = (G.pins || 0) + 1; G.pinLog = G.pinLog || []; G.pinLog.push({ src, k: post.k, who: post.who, id: post.id }); if (G.pinLog.length > 60) G.pinLog.shift(); } return post; } catch (e) { console.error("TLX gram pin", e); G.err = String(e && e.stack || e); return null; } }
function posterFor(per) { const fam = TLXN.family(per).filter(q => q && q.id !== per.id && q.age > 13 && q.age < 85); return fam.length && rnd() < 0.7 ? pick(fam) : per; }
const wideOK = (a, b) => true;
function pinnedHour(H) {
  const s = S(), X = window.TLXSK, due = (k, gap) => s.pinT[k] === undefined || H - s.pinT[k] >= gap;
  if (X && X.ready && due("skier", 4)) {
    const sk = X.skiers().filter(q => q.p && TLXN.person(q.p) && X.list.find(t => t.id === q.trail));
    if (sk.length) {
      const q = pick(sk), per = TLXN.person(q.p), tr = X.list.find(t => t.id === q.trail); let bi = 0, bd = 1e12; for (let i = 0; i < tr.pts.length; i++) { const d = Math.hypot(tr.pts[i][0] - q.x, tr.pts[i][1] - q.z); if (d < bd) { bd = d; bi = i; } }
      const a = tr.pts[Math.min(bi + 1, tr.pts.length - 1)], b = tr.pts[Math.max(bi - 1, 0)], yaw = Math.atan2(a[0] - b[0], a[1] - b[1]);
      s.pinT.skier = H; pinPost(H + 0.2, posterFor(per), { k: "trailskier", w: [per.id], x: q.x, z: q.z, a: yaw, place: tr.name, h: H, s: stormAt(q.x, q.z, H), v: 0 }, "skier");
    }
  }
  if (X && X.FU && due("fire", 7)) {
    const g = X.FU.gaps.find(q => q.fi > 0.3); if (g) { const v = nearestVil(g.x, g.z), ppl = TLXN.peopleIn(v.id).filter(q => q.age > 55 && q.age < 90); if (ppl.length) { const per = pick(ppl); s.pinT.fire = H; pinPost(H + 0.1, posterFor(per), { k: "gpthermos", w: [per.id], x: g.x, z: g.z, a: g.yaw, place: (g.t && g.t.name ? g.t.name + " gapahuk" : "the gapahuk"), h: H, s: 0, v: 1 }, "fire"); } }
  }
  try {
    const grp = api.wild && api.wild.groups ? api.wild.groups() : []; const P0 = api.FOOT.on ? api.FOOT : api.P;
    if (grp.length && due("wild", 14)) { const g = grp.find(q => (q.kind === "reindeer" || q.kind === "moose" || q.kind === "fox") && Number.isFinite(q.x) && Math.hypot(q.x - P0.x, q.z - P0.z) < 1500); if (g) { const v = nearestVil(g.x, g.z), ppl = TLXN.peopleIn(v.id).filter(q => q.age > 12); if (ppl.length) { s.pinT.wild = H; pinPost(H + 0.1, pick(ppl), { k: "wildclose", w: [], x: g.x, z: g.z, a: rnd() * 6.28, place: v.name, h: H, s: stormAt(g.x, g.z, H), v: g.kind }, "wild"); } } }
  } catch (e) { }
}
G.pinnedHour = pinnedHour;
// an event on the bus: the text card in somebody's voice, and where the world can show it, the picture of the real thing
function evPin(ev, b, quiet) {
  const d = ev.data || {}, k = ev.kind, you = ev.who === "you" || d.by === "you", has = Number.isFinite(ev.x), poster = b.w || witness(b.vid); if (!poster) return;
  const base = { w: [], x: ev.x, z: ev.z, a: rnd() * 6.28, place: ev.place || (TLXN.village(b.vid) || {}).name, h: ev.t, s: stormAt(ev.x || 0, ev.z || 0, ev.t), v: 0 };
  let an = null;
  if (k === "crash" && has) an = Object.assign(base, { k: "crashseen", v: d.what === "bog" ? 1 : 0 });
  else if ((k === "groom" || k === "job") && has && (you || rnd() < 0.5)) an = Object.assign(base, { k: "groomed", v: you ? 1 : 0 });
  else if (k === "road" && d.sys === "plow" && has) an = Object.assign(base, { k: "plowwall" });
  else if (k === "wildlife" && has && d.kind) an = Object.assign(base, { k: "wildclose", v: d.kind === "reindeer" || d.kind === "moose" || d.kind === "fox" || d.kind === "hare" ? d.kind : "fox" });
  else if (k === "ski" && has && ev.who && ev.who !== "you" && rnd() < 0.35) { const per = TLXN.person(ev.who); const t = window.TLXSK && TLXSK.ready ? TLXSK.nearest(ev.x, ev.z, 80) : null; if (per && t) an = Object.assign(base, { k: "trailskier", w: [per.id], a: Math.atan2(t.tx || 0, t.tz || 1) }); }
  if (!an || !kinds()[an.k]) return;
  const per = an.w && an.w[0] ? who(an.w[0]) : poster; pinPost(ev.t, per || poster, an, k, { ev: ev.id, you: you ? 1 : 0, p: an.k === "trailskier" ? posterFor(per) : poster });
}
function busComments(b, p) {
  const out = [], fam = p ? TLXN.family(p).filter(q => q && q.id !== p.id && q.age > 11) : [], ppl = TLXN.peopleIn(b.vid).filter(q => q.age > 11 && (!p || q.id !== p.id));
  const n = ppl.length ? 1 + Math.floor(rnd() * 2) : 0;
  for (let i = 0; i < n; i++) { const c = fam.length && rnd() < 0.5 ? pick(fam) : pick(ppl); if (out.some(x => x[0] === c.id)) continue; const kin = p ? kinWord(c, p) : ""; const K_ = kin ? kin.charAt(0).toUpperCase() + kin.slice(1) : ""; let t;
    if (kin && rnd() < 0.6) t = pick(/^(mamma|pappa|bestemor|bestefar)$/.test(kin) ? [`${K_}, will you be home for supper?`, `${K_}!! take me with you next time`] : [`That's ${kin} for you.`, `Did ${kin} wear a hat?`, `${K_} is at it again.`]); else t = replyLine(null, p ? p.id : null, b.vid, b.tag, c).t;
    out.push([c.id, flavor(c, t), -1]); }
  if (out.length && p && rnd() < 0.35) out.push([p.id, pick(ANS2.filter(x => x[0].includes(vk(p))).concat(ANS2))[1], 0]);
  return out;
}
function onBus(ev, quiet) {
  try {
    const s = S(); if (!s || !ev) return; if (ev.id <= s.busId && !quiet) return; s.busId = Math.max(s.busId, ev.id);
    const b = busLines(ev); if (!b) return; if (!quiet && window.TLXRL && TLXRL.ready) TLXRL.fromBus(ev, b);
    const sayer = b.w || witness(b.vid), tl = talkLine(ev, b, sayer), you = ev.who === "you" || (ev.data && ev.data.by === "you");
    const prob = ev.kind === "ski" ? 0.4 : ev.kind === "groom" || ev.kind === "trail" ? 0.5 : 1;
    if (prob >= 1 || G.always || rnd() < prob) {
      const text = tl ? tl.t : b.text, hue = { storm: 255, road: 28, ferry: 215, wildlife: 150, ski: 205, groom: 190, rescue: 0, crash: 12, sky: 45, job: 190, catch: 200 }[b.k] || 200, ico = { storm: "🌨", road: "🛣", ferry: "⛴", wildlife: "🦌", ski: "⛷", groom: "⛷", rescue: "🚑", crash: "💥", sky: "☀", job: "⛷" }[b.k] || "📣";
      const post = addPost({ k: "txt:news", who: sayer ? sayer.id : null, t: ev.t, vid: b.vid, place: ev.place || (TLXN.village(b.vid) || {}).name, cap: text, tx: { h: hue, i: ico }, wide: b.wide ? 1 : 0, ev: ev.id, you: you ? 1 : 0, lid: tl ? tl.id : "" });
      post.cm = busComments(b, sayer); post.lk = likesOf(post, sayer);
      if (post && !quiet && you) notify(post);
    }
    if (!quiet) evPin(ev, b, quiet);
  } catch (e) { console.error("TLX gram bus", e); G.err = String(e && e.stack || e); }
}
G.onBus = ev => onBus(ev);

/* ================= the painted picture: the low preset, and the placeholder until a render is ready ================= */
function paintPic(post, cv, tiny) {
  const w = cv.width, h = cv.height, g = cv.getContext("2d"), rc = post.rc || { h: post.t, s: 0 }, row = kinds()[post.k] || {}, pk = row.paint || "view";
  const el = (() => { try { return elAt(rc.h); } catch (e) { return 5; } })(), st = rc.s || 0, day = clamp((el + 8) / 14, 0, 1), night = 1 - day;
  let a = hashS("p" + post.id + post.k); const rd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const mix = (c, f) => `rgb(${Math.round(c[0] * f)},${Math.round(c[1] * f)},${Math.round(c[2] * f)})`, f = 1 - st * 0.35;
  const top = [18 + day * 70, 28 + day * 110, 60 + day * 150], bot = [60 + day * 150, 70 + day * 130, 100 + day * 120];
  const gr = g.createLinearGradient(0, 0, 0, h * 0.62); gr.addColorStop(0, mix(top, f)); gr.addColorStop(1, el > -4 && el < 5 ? `rgb(${220 * day + 30},${140 * day + 40},${110 * day + 50})` : mix(bot, f)); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  if (pk === "aurora" || (el < -8 && rd() < 0.3)) for (let i = 0; i < 4; i++) { const ag = g.createLinearGradient(0, 0, 0, h * 0.5); ag.addColorStop(0, "rgba(80,255,170,0)"); ag.addColorStop(0.5, `rgba(80,255,170,${0.35 - i * 0.05})`); ag.addColorStop(1, "rgba(80,255,170,0)"); g.fillStyle = ag; g.beginPath(); g.moveTo(0, h * 0.1 + i * 12); for (let x = 0; x <= w; x += 16) g.lineTo(x, h * (0.18 + 0.03 * i) + Math.sin(x * 0.02 + i + rd() * 2) * 22); g.lineTo(w, h * 0.55); g.lineTo(0, h * 0.55); g.fill(); }
  if (night > 0.4 && !tiny) { g.fillStyle = "rgba(255,255,255,.85)"; for (let i = 0; i < 50; i++) g.fillRect(rd() * w, rd() * h * 0.5, 1.4, 1.4); }
  if (el > -3 && el < 8) { g.fillStyle = "rgba(255,210,150,.9)"; g.beginPath(); g.arc(w * (0.3 + 0.4 * rd()), h * 0.46, h * 0.05, 0, 6.283); g.fill(); }
  const hz = h * (pk === "sea" || pk === "fish" ? 0.5 : 0.58), lw = night > 0.5 ? 0.55 : 1; g.fillStyle = `rgb(${Math.round(70 * lw + 90 * day)},${Math.round(90 * lw + 100 * day)},${Math.round(120 * lw + 100 * day)})`;
  g.beginPath(); g.moveTo(0, hz); for (let x = 0; x <= w; x += w / 14) g.lineTo(x, hz - h * 0.04 - rd() * h * 0.13); g.lineTo(w, hz); g.fill();
  g.fillStyle = pk === "sea" || pk === "fish" ? `rgb(${Math.round(30 + 40 * day)},${Math.round(60 + 60 * day)},${Math.round(90 + 70 * day)})` : `rgb(${Math.round(150 + 90 * day)},${Math.round(160 + 90 * day)},${Math.round(180 + 70 * day)})`; g.fillRect(0, hz, w, h - hz);
  const ink = "rgba(20,28,40,.9)", u = h / 450; g.fillStyle = ink; g.strokeStyle = ink; g.lineWidth = 3 * u;
  const head = (x, y, r, col) => { g.fillStyle = "rgb(226,176,148)"; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); g.fillStyle = col; g.beginPath(); g.arc(x, y - r * 0.15, r * 1.04, Math.PI, 0); g.fill(); g.fillRect(x - r * 1.04, y - r * 0.2, r * 2.08, r * 0.28); g.fillStyle = "#2a1c18"; g.beginPath(); g.arc(x - r * 0.38, y + r * 0.05, r * 0.09, 0, 6.283); g.arc(x + r * 0.38, y + r * 0.05, r * 0.09, 0, 6.283); g.fill(); g.strokeStyle = "#8a3030"; g.lineWidth = r * 0.08; g.beginPath(); g.arc(x, y + r * 0.25, r * 0.4, 0.2, Math.PI - 0.2); g.stroke(); g.fillStyle = "rgba(220,90,90,.35)"; g.beginPath(); g.arc(x - r * 0.62, y + r * 0.3, r * 0.2, 0, 6.283); g.arc(x + r * 0.62, y + r * 0.3, r * 0.2, 0, 6.283); g.fill(); g.fillStyle = ink; g.strokeStyle = ink; };
  const jc = ["#c8322a", "#2a6fb8", "#e0a030", "#2f8f5a"][hashS(post.k + post.id) % 4];
  if (pk === "face" || pk === "kid" || pk === "fish" || pk === "group") { g.fillStyle = jc; g.beginPath(); g.moveTo(w * 0.18, h); g.quadraticCurveTo(w * 0.5, h * 0.64, w * 0.82, h); g.fill(); head(w * 0.5, h * 0.52, h * 0.15, ["#b0302a", "#2a5a9a", "#e0a52a"][hashS(post.k) % 3]); if (pk === "fish") { g.fillStyle = "#7a8a6a"; g.beginPath(); g.ellipse(w * 0.5, h * 0.8, w * 0.32, h * 0.06, -0.1, 0, 6.283); g.fill(); g.beginPath(); g.moveTo(w * 0.8, h * 0.8); g.lineTo(w * 0.93, h * 0.72); g.lineTo(w * 0.93, h * 0.88); g.fill(); } if (pk === "group") { head(w * 0.2, h * 0.62, h * 0.1, "#2a5a9a"); head(w * 0.8, h * 0.62, h * 0.1, "#3c6a3a"); } }
  else if (pk === "fire") { g.fillStyle = "rgba(255,140,40,.9)"; g.beginPath(); g.moveTo(w * 0.42, h * 0.86); g.quadraticCurveTo(w * 0.5, h * 0.55, w * 0.58, h * 0.86); g.fill(); g.fillStyle = "rgba(255,200,90,.9)"; g.beginPath(); g.moveTo(w * 0.46, h * 0.86); g.quadraticCurveTo(w * 0.5, h * 0.68, w * 0.54, h * 0.86); g.fill(); g.fillStyle = "rgba(255,150,60,.25)"; g.beginPath(); g.arc(w * 0.5, h * 0.8, h * 0.28, 0, 6.283); g.fill(); head(w * 0.28, h * 0.66, h * 0.09, "#6a3a7a"); }
  else if (pk === "deer") { g.fillStyle = "#6a5a4a"; g.beginPath(); g.ellipse(w * 0.5, h * 0.78, w * 0.2, h * 0.09, 0, 0, 6.283); g.fill(); g.fillRect(w * 0.36, h * 0.82, w * 0.025, h * 0.14); g.fillRect(w * 0.6, h * 0.82, w * 0.025, h * 0.14); g.beginPath(); g.ellipse(w * 0.64, h * 0.64, h * 0.07, h * 0.055, -0.4, 0, 6.283); g.fill(); g.lineWidth = 3 * u; g.beginPath(); g.moveTo(w * 0.63, h * 0.6); g.lineTo(w * 0.6, h * 0.46); g.lineTo(w * 0.56, h * 0.42); g.moveTo(w * 0.65, h * 0.6); g.lineTo(w * 0.7, h * 0.45); g.lineTo(w * 0.74, h * 0.41); g.stroke(); }
  else if (pk === "sled") { g.fillRect(w * 0.26, h * 0.76, w * 0.46, h * 0.05); g.fillRect(w * 0.5, h * 0.66, w * 0.2, h * 0.1); g.fillStyle = jc; g.fillRect(w * 0.55, h * 0.62, w * 0.1, h * 0.06); g.beginPath(); g.arc(w * 0.46, h * 0.6, h * 0.04, 0, 6.283); g.fill(); g.fillStyle = "rgba(255,255,255,.75)"; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(w * (0.2 - i * 0.015), h * (0.84 - i * 0.012), h * (0.01 + i * 0.004), 0, 6.283); g.fill(); } }
  else if (pk === "snowman") { g.fillStyle = "#f2f6fa"; for (const [x, y, r] of [[0.5, 0.82, 0.11], [0.5, 0.67, 0.08], [0.5, 0.56, 0.055]]) { g.beginPath(); g.arc(w * x, h * y, h * r, 0, 6.283); g.fill(); } g.fillStyle = "#e07a1a"; g.fillRect(w * 0.5, h * 0.56, h * 0.06, h * 0.012); }
  else if (pk === "house") { g.fillStyle = "#6a4a3a"; g.fillRect(w * 0.25, h * 0.6, w * 0.5, h * 0.25); g.fillStyle = ink; g.beginPath(); g.moveTo(w * 0.21, h * 0.6); g.lineTo(w * 0.5, h * 0.46); g.lineTo(w * 0.79, h * 0.6); g.fill(); g.fillStyle = "rgba(255,200,110,.95)"; g.fillRect(w * 0.33, h * 0.68, w * 0.1, h * 0.09); g.fillRect(w * 0.57, h * 0.68, w * 0.1, h * 0.09); }
  else if (pk === "ski") { head(w * 0.5, h * 0.55, h * 0.07, "#2a5a9a"); g.fillStyle = jc; g.fillRect(w * 0.45, h * 0.62, w * 0.1, h * 0.2); g.lineWidth = 4 * u; g.beginPath(); g.moveTo(w * 0.25, h * 0.9); g.lineTo(w * 0.75, h * 0.84); g.moveTo(w * 0.25, h * 0.94); g.lineTo(w * 0.75, h * 0.88); g.stroke(); }
  else if (pk === "road") { g.fillStyle = "rgba(230,235,245,.85)"; g.beginPath(); g.moveTo(w * 0.44, hz); g.lineTo(w * 0.56, hz); g.lineTo(w * 0.85, h); g.lineTo(w * 0.15, h); g.fill(); g.fillStyle = "#c82020"; g.fillRect(w * 0.6, h * 0.5, w * 0.012, h * 0.16); }
  else if (pk === "mound") { g.fillStyle = "#eef3f8"; g.beginPath(); g.ellipse(w * 0.5, h * 0.8, w * 0.32, h * 0.11, 0, Math.PI, 0); g.fill(); g.fillStyle = ink; g.fillRect(w * 0.7, h * 0.58, w * 0.008, h * 0.2); }
  else if (pk === "sea") { g.fillStyle = "rgba(255,255,255,.8)"; for (let i = 0; i < 14; i++) { g.beginPath(); g.ellipse(rd() * w, hz + rd() * (h - hz), w * 0.05, h * 0.01, 0, 0, 6.283); g.fill(); } }
  else if (pk === "card") { }
  if (st > 0.3) { g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 1.5; for (let i = 0; i < 70 * st; i++) { const x = rd() * w, y = rd() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 8, y + 10); g.stroke(); } }
}
G.paintPic = paintPic;

/* ================= the system ================= */
let hooked = false, lastH = -1;
function sane(s) {
  const num = Number.isFinite;
  if (!Array.isArray(s.posts)) s.posts = [];
  const before = s.posts.length;
  s.posts = s.posts.filter(p => p && typeof p === "object" && num(p.id) && num(p.t) && typeof p.cap === "string" && typeof p.k === "string" && (p.k.slice(0, 4) === "txt:" || (p.rc && typeof p.rc === "object" && num(p.rc.x) && num(p.rc.z) && num(p.rc.h) && num(p.rc.sd)))).slice(-CAP);
  G.dropOld = before - s.posts.length;
  for (const p of s.posts) {
    if (!Array.isArray(p.cm)) p.cm = []; p.cm = p.cm.filter(c => Array.isArray(c) && typeof c[1] === "string").map(c => [c[0], c[1], num(c[2]) ? c[2] : -1]).slice(0, 8); if (!num(p.lk)) p.lk = 3; p.place = String(p.place || ""); if (p.rc) { if (!num(p.rc.s)) p.rc.s = 0; if (!num(p.rc.a)) p.rc.a = 0; if (!Array.isArray(p.rc.w)) p.rc.w = []; }
    if (p.tx && (typeof p.tx !== "object" || !num(p.tx.h))) p.tx = { h: 200, i: "" };
  }
  for (const k of ["seq", "seen", "busId", "rs", "gen"]) if (!num(s[k])) s[k] = k === "rs" ? 4242 : k === "gen" ? -9999 : 0;
  s.seq = Math.max(s.seq, ...s.posts.map(p => p.id), 0);
  for (const k of ["mem", "last", "sk", "day", "pinT"]) if (!s[k] || typeof s[k] !== "object" || Array.isArray(s[k])) s[k] = {};
  for (const v of Object.keys(s.mem)) { const m = s.mem[v]; if (!m || !Array.isArray(m.kinds) || !Array.isArray(m.fams) || !Array.isArray(m.places)) delete s.mem[v]; }
  delete s.chat; delete s.cseq; delete s.genH; delete s.noteD2; if (!num(s.noteD)) s.noteD = -9;
  if (window.TLXRL && TLXRL.sane) TLXRL.sane(s); else if (!s.reels) s.reels = { seq: 0, list: [] };
  if (!s.storm || typeof s.storm !== "object") s.storm = { on: 0, peak: 0, t0: 0, cm: 0 }; if (!s.road || typeof s.road !== "object") s.road = {};
  s.v = 2;
}
function backlog() {
  const s = S(), H = api.GS.hour; G.noText = false; const h0 = Math.floor(H) - BACKLOG_H, t0 = performance.now();
  for (let h = h0; h <= Math.floor(H); h++) { try { genHour(h + 0.3); } catch (e) { console.error("TLX gram backlog", e); } }
  s.posts = s.posts.filter(q => q.t <= H); s.seen = Math.max(0, ...s.posts.map(q => q.id)); G.backlogMs = Math.round(performance.now() - t0);
}
G.backlog = backlog;
// the two days of posts a new game starts with are made a couple of hours per frame, not in one block (the whole thing is about 4 s of work and froze the first seconds of a new game)
function startBacklog() { const H = api.GS.hour; G.noText = false; G.bl = { h: Math.floor(H) - BACKLOG_H, end: Math.floor(H), t0: performance.now(), ms: 0 }; }
function stepBacklog() {
  const b = G.bl; if (!b) return; const t0 = performance.now();
  for (let k = 0; k < 6 && b.h <= b.end; k++) {                                                          // pieces of an hour until about 14 ms are spent, never a whole hour
    if (!b.st) b.st = hourStart(b.h + 0.3);
    let fin = false; try { fin = hourStep(b.st); } catch (e) { console.error("TLX gram backlog", e); fin = true; }
    if (fin) { b.st = null; b.h++; }
    if (performance.now() - t0 > 14) break;
  }
  const dt = performance.now() - t0; b.ms += dt; G.stepMs.push(dt); if (G.stepMs.length > 120) G.stepMs.shift();
  if (b.h > b.end) { const s = S(), H = api.GS.hour; s.posts = s.posts.filter(q => q.t <= H); s.seen = Math.max(0, ...s.posts.map(q => q.id)); G.backlogMs = Math.round(b.ms); G.bl = null; if (G.ui && G.ui.onPost) G.ui.onPost(null); }
}
G.startBacklog = startBacklog; G.stepBacklog = stepBacklog;
const legacyComments = (post, p, key) => makeComments({ w: [] }, { cm: {} }, p, { place: post.place || "", pic1: p.first }).map(c => [c[0], c[1]]);
TLX.register({
  id: "gram", v: 2,
  state0: () => ({ v: 2, seq: 0, posts: [], seen: 0, busId: 0, rs: (Math.random() * 2147483647) | 0, gen: -9999, mem: {}, last: {}, sk: {}, day: {}, pinT: {}, noteD: -9, storm: { on: 0, peak: 0, t0: 0, cm: 0 }, road: {}, reels: { seq: 0, list: [] } }),
  migrate: st => st,
  init(a) {
    api = a; W = a.world; T = a.THREE; G.ui = window.TLXGRUI || null; G.ready = false; G.err = ""; G.cache.clear(); G.view = { tab: "local", cur: 0, sheet: 0, rcur: 0 }; G.pending = [];
    try {
      const s = S(); sane(s);
      if (!window.TLXN || !TLXN.ready) { G.err = "no news bus"; return; }
      if (!window.TLXGK || !TLXGK.ready) { G.err = "no moment kinds"; return; }
      G.H = Object.assign(G.H, { A: a, who, comments: legacyComments, likesOf, ctxFor, varsFor, rnd, pick, pickPerson, flavor: (p, t) => flavor(p, t), surf, openOk, openSpot, nearestVil, lookoutFor, coastOf, lakeNear, slopeOf, hash01, hashS, calAt, elAt, stormAt, sunAz, snowy, yawTo, esc, seaDir });
      const H = api.GS.hour;
      if (G.ui) G.ui.install(a);
      s.busId = Math.max(s.busId, 0, ...TLXN.all().map(q => q.id));
      if (!hooked) { hooked = true; TLXN.on(ev => onBus(ev)); }
      G.ready = true;
      if (window.TLXRL) TLXRL.init(a, G, G.H);
      lastH = Math.floor(H);
      if ((!s.posts.length || s.gen < -5) && !G.noBl) { startBacklog(); s.gen = Math.floor(H); }
      if (G.ui) G.ui.afterInit();
    } catch (e) { G.err = String(e && e.stack || e); console.error("TLX gram", e); }
  },
  tick(dt) {
    if (!G.ready || !api.started()) return;
    try {
      if (G.bl) { stepBacklog(); return; }
      const H = api.GS.hour, h = Math.floor(H);
      if (h !== lastH && G.hold) lastH = h;
      if (h !== lastH) { if (h > lastH && h - lastH <= 6) for (let k = lastH + 1; k <= h; k++) { watch(k); (G.q = G.q || []).push(hourStart(k + 0.4)); } else if (h > lastH) { watch(h); (G.q = G.q || []).push(hourStart(h + 0.4)); } lastH = h; S().gen = h; }
      if (G.q && G.q.length) { const t0 = performance.now(); try { if (hourStep(G.q[0])) G.q.shift(); } catch (e) { console.error("TLX gram live hour", e); G.q.shift(); } G.stepMs.push(performance.now() - t0); if (G.stepMs.length > 120) G.stepMs.shift(); }
      if (G.ui) G.ui.tick(dt); if (window.TLXRL) TLXRL.tick(dt);
    } catch (e) { if (!G.tickErr) console.error("TLX gram tick", e); G.tickErr = String(e && e.stack || e); }
  }
});
G.setTab = (tab, post) => { if (G.ui && G.ui.setTab) G.ui.setTab(tab); else G.view.tab = tab; }; G.hash01 = hash01; G.picOf = id => { const e = G.cache.get(id); if (e) { G.cache.delete(id); G.cache.set(id, e); } return e || null; }; G.posts = posts; G.unseen = unseen; G.ctxFor = ctxFor; G.varsFor = varsFor; G.rnd = rnd; G.pick = pick; G.who = who; G.watch = watch; G.localVid = localVid; G.online = onlineN; G.flavor = flavor; G.kinWord = kinWord; G.likesOf = likesOf; G.pickPerson = pickPerson; G.esc = esc; G.S = S; G.api = () => api; G.calAt = calAt; G.elAt = elAt; G.vk = vk; G.fill = fill; G.hourWord = hourWord; G.surf = surf; G.famOf = famOf;
})();

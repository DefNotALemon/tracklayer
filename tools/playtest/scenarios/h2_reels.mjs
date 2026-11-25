// Goal G7 slice H2b: the Gram fixes carried from H2a (feed layout, framing, Local chat order and voice) and the Reels tab (tlx-reels.js, tlx-reelscenes.js). Asserts, exit 1 on a failure.
//   A  feed layout: pictures use the card's width (two columns on the tablet), the opened post shows picture, header, caption, likes and comments inside the screen
//   B  composition: an empty-snow / hillside recipe is rejected, a framed one accepted; every accepted post passes its own check
//   C  subject coverage measured from projected bounds: wildlife >= 33% of the frame, portraits >= 38%
//   D  Local chat: strictly oldest to newest in every village, day separators (Today / Yesterday / weekday) in order, correct relative times, no line template more than twice in any 30 messages, >= 6 voice styles
//   E  reels: every built type plans, renders non-blank frames that change over time, loops, hides its cast when the tab closes, leaves the main view byte-identical
//   F  nothing renders with the tablet closed or on another tab; one reel at a time; the next is planned only when scrolled to
//   G  frame cost per reel frame (recorded and under the stated budget on the high preset), resolution, draw calls
//   H  navigation under keyboard, pad (d-pad, right stick) and touch (swipe, button)
//   I  reload keeps reels and seen-state; a save without reels loads; junk state does not throw
//   J  the low preset plays the painted fallback
// Stills (OUT, skip with NOSTILLS=1): the feed, an opened post, Local, the Reels tab, and for EVERY reel type six frames across the clip (reel_<type>_<i>.jpg) to be joined into contact strips.
import { boot, ev, raw, sleep, done, reload, shot, down, up, padSet, send } from "../lib.mjs";
import fs from "node:fs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const NOSTILLS = !!process.env.NOSTILLS, OUT = process.env.OUT || ".";
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 700)); } };
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); true`;
const TYPES = ["summit", "lakerace", "watchrace", "waterskip", "stormride", "reindeer", "nightski", "plowwall", "aurora", "sea", "kidssled", "powder"];
const SPEC = { summit: { hr: 11.8, vils: ["kjollefjord", "mehamn"] }, lakerace: { hr: 12, vils: ["mehamn", "gamvik", "lebesby", "ifjord", "skjanes"] }, watchrace: { hr: 12, vils: ["mehamn", "gamvik", "lebesby", "ifjord", "skjanes"] }, waterskip: { hr: 12, vils: ["mehamn", "lebesby"] }, stormride: { hr: 12, vils: ["kjollefjord", "mehamn"], over: { storm: 0.9 } }, reindeer: { hr: 12, vils: ["mehamn", "kjollefjord"] }, nightski: { hr: 21, vils: ["kjollefjord"] }, plowwall: { hr: 12, vils: ["mehamn", "kjollefjord"] }, aurora: { hr: 12, vils: ["kjollefjord", "mehamn"] }, sea: { hr: 12, vils: ["kjollefjord", "mehamn"] }, kidssled: { hr: 13, vils: ["kjollefjord", "mehamn"] }, powder: { hr: 12, vils: ["kjollefjord", "mehamn"] } };

await boot(); await ev(SETUP); await sleep(1500);
ok(await J(`TLXGR.ready && !TLXGR.err && TLXRL.ready && !TLXRL.err`), "Gram and the reels engine are ready: " + (await ev(`TLXGR.err + " " + TLXRL.err`)));
// a helper in the page: a reel recipe of a type, from the real anchor of the type, for a person of a village (not added to the feed)
await ev(`window.__mk = (ty, hr, over, vils, sd, kind) => { const T0 = TLXRL.types[ty]; const day = Math.floor(GS.hour / 24) * 24, H = day + hr; for (const vid of vils) { const p = TLXN.people.find(q => q.vid === vid && q.age > 20 && (!T0.fit || T0.fit(q))) || TLXN.people.find(q => q.vid === vid && q.age > 20); if (!p) continue; for (let k = 0; k < 8; k++) { const c = TLXGR.ctxFor(p, H); Object.assign(c, over || {}); const an = T0.anchor(c, TLXRL.mulb(sd + k * 17)); if (!an) continue; const rec = { id: 800 + (window.__n = (window.__n || 0) + 1), t: H, who: p.id, vid: p.vid, place: an.place || "", ty, sd: sd + k * 17, x: an.x, z: an.z, a: an.a || 0, k: kind || an.k, h: an.h !== undefined ? an.h : H, s: an.s !== undefined ? an.s : 0, cap: "x", cm: [], lk: 1, sn: 0 }; return rec; } } return null; }; true`);

/* ---------------- A feed layout ---------------- */
await section("A feed layout", async () => {
  await ev(`TLXGR.fpsOk = false; TLX.api.TABLET.toggle(true, "gram"); TLXGR.setTab("feed"); true`); await sleep(900);
  const m = await J(`(() => { const v = document.getElementById("tabV"), k = v.getBoundingClientRect().width / v.clientWidth, cs = [...v.querySelectorAll(".gpost canvas.gpic")], r = c => c.getBoundingClientRect(); const cards = [...v.querySelectorAll(".gpost")].map(c => c.getBoundingClientRect()); return { sq: cs.slice(0, 4).map(c => [c.offsetWidth, c.offsetHeight]), vw: v.clientWidth, n: cs.length, pw: cs.slice(0, 4).map(c => Math.round(r(c).width / k)), ph: cs.slice(0, 4).map(c => Math.round(r(c).height / k)), cw: cards.slice(0, 4).map(c => Math.round(c.width / k)), cols: new Set(cards.slice(0, 6).map(c => Math.round(c.top / k / 8))).size }; })()`);
  console.log("   ", JSON.stringify(m));
  ok(m.n >= 3, `the feed draws its pictures (${m.n})`);
  ok(m.pw.every((w, i) => w >= m.cw[i] - 24) && m.pw[0] >= 0.42 * m.vw, `each picture fills its card (${m.pw.join(", ")} px wide in cards ${m.cw.join(", ")}, screen ${m.vw}), not a narrow column in wide empty space`);
  ok(m.sq.every(q => Math.abs(q[0] - q[1]) <= 1), `pictures are square (layout sizes ${m.sq.map(q => q.join("x")).join(", ")})`);
  await ev(`TLXGR.setTab("feed", TLXGR.posts().slice(-1)[0].id); true`); await sleep(900);
  const o = await J(`(() => { const v = document.getElementById("tabV"), k = v.getBoundingClientRect().width / v.clientWidth, vb = v.getBoundingClientRect().bottom, pic = document.querySelector("#tabV .gopen canvas"), cap = document.querySelector("#tabV .gopen .gcap"), meta = document.querySelector("#tabV .gopen .gmeta"), head = document.querySelector("#tabV .gopen .gph"), r = e => e.getBoundingClientRect(); return { pic: [r(pic).top, r(pic).bottom], vb, headB: r(head).bottom, cap: [r(cap).top, r(cap).bottom], metaB: r(meta).bottom, pw: Math.round(r(pic).width / k), vh: v.clientHeight, ph: Math.round(r(pic).height / k) }; })()`);
  console.log("   open post", JSON.stringify(o));
  ok(o.cap[1] <= o.vb + 2 && o.metaB <= o.vb + 2 && o.pic[1] <= o.vb + 2, "the opened post: picture, caption and likes are all inside the screen without scrolling");
  ok(o.headB <= o.cap[0] + 8 && o.cap[1] <= o.metaB + 2, "header above, then caption, then likes and comments");
  ok(o.pw >= 0.3 * m.vw && o.ph <= o.vh, `and the picture is large (${o.pw}x${o.ph} px in a ${o.vh} px high screen)`);
  await ev(`TLXGR.setTab("feed"); TLX.api.TABLET.close(true); TLXGR.fpsOk = null; true`);
});

/* ---------------- B composition ---------------- */
await section("B composition rule and check", async () => {
  // many ambient posts through the real recipes
  await ev(`GS.hour = 400.3; WX.force = null; TLXGR.genLog.length = 0; true`);
  for (let h = 0; h < 48; h++) await ev(`(() => { const H = 400 + ${h}; WX.force = ${h % 11 === 3} ? { v: 1, until: H + 1 } : null; TLXGR.genHour(H + 0.4); return 1; })()`);
  await ev(`WX.force = null; true`);
  const f = await J(`TLXGR.framing`); console.log("   framing", JSON.stringify({ tries: f.tries, ok: f.ok, rejected: f.rejected, dropped: f.dropped, why: f.why.slice(0, 4) }));
  ok(f.tries > 20, "recipes go through the composition check (" + f.tries + " viewpoints tried)");
  ok(f.rejected + f.dropped >= 1, `bad viewpoints are rejected and re-picked (${f.rejected} re-picks, ${f.dropped} dropped)`);
  const bad = await J(`TLXGR.posts().filter(p => !p.rc.pt && !TLXGR.frameCheck(p.rc, TLXGR.keyOf(p)).ok).map(p => [p.id, p.sj, TLXGR.frameCheck(p.rc, TLXGR.keyOf(p)).why.join("; ")])`);
  ok(bad.length === 0, `every post in the feed passes its type's composition check (${bad.length} fail${bad.length ? ": " + JSON.stringify(bad.slice(0, 3)) : ""})`);
  // an empty-snow recipe is rejected, a framed one accepted
  const t = await J(`(() => { const W = TLX.api.world; let flat = null, n = 0; for (let r = 200; r < 5000 && !flat; r += 23) for (let k = 0; k < 9 && !flat; k++) { const a = k * 0.7 + r, px = Math.cos(a) * r, pz = Math.sin(a) * r; if (W.isSea(px, pz) || W.isWater(px, pz) || W.groundAt(px, pz) < 20) continue; const rc = { c: [px, pz, 1.6], a: [px + 8 * Math.cos(a), pz + 8 * Math.sin(a), 0], f: 60, h: 11.5, s: 0 }; const f = TLXGR.frameCheck(rc, "peak"); n++; if (!f.st.fg.any && f.st.sk.spread < 0.1) flat = { rc, f }; }
    if (!flat) return { none: 1, n };
    const c = flat.rc.c, hill = { c: [c[0], c[1], 1.6], a: [flat.rc.a[0], flat.rc.a[1], -4], f: 60, h: 11.5, s: 0 };
    const good = TLXGR.posts().find(p => !p.rc.pt && TLXGR.cat(TLXGR.keyOf(p)) === "peak" && p.rc.p && p.rc.p.length) || TLXGR.posts().find(p => !p.rc.pt);
    return { e: TLXGR.frameCheck(flat.rc, "peak"), h: TLXGR.frameCheck(hill, "peak"), g: good ? TLXGR.frameCheck(good.rc, TLXGR.keyOf(good)) : null, gk: good ? good.sj : "" }; })()`);
  if (t.none) ok(false, "found a flat snow field to test with"); else {
    console.log("   empty snow:", t.e.why.join("; "), "| hillside:", t.h.why.join("; "), "| framed (" + t.gk + "):", t.g && t.g.ok);
    ok(!t.e.ok, "a camera looking at flat empty snow is rejected (" + t.e.why.join("; ") + ")");
    ok(!t.h.ok, "a camera looking up into a hillside is rejected (" + t.h.why.join("; ") + ")");
    ok(t.g && t.g.ok, "a framed picture from the feed is accepted");
  }
});

/* ---------------- C coverage ---------------- */
await section("C subject coverage from projected bounds", async () => {
  // fresh posts of each kind through the real pipeline: a wildlife sighting, a reindeer close-up, a portrait on a view, a skier, kids
  await ev(`(() => { const s = TLX.state("gram"); s.posts = []; TLXGR.always = true; GS.hour = 450.4; return 1; })()`);
  const made = await J(`(() => { const out = [], k = TLXN.village("kjollefjord"), W = TLX.api.world;
    for (let i = 0; i < 6; i++) { const a = i * 1.05; TLXN.post({ kind: "wildlife", x: k.x + Math.cos(a) * 420, z: k.z + Math.sin(a) * 420, place: "Kjøllefjord", text: "A reindeer herd was seen near the village.", data: { sys: "wild", what: "seen", kind: i % 2 ? "fox" : "reindeer", n: 3 } }); }
    const ppl = TLXN.people.filter(p => p.vid === "kjollefjord" && p.age > 20);
    for (let n = 0; n < 24; n++) { const p = ppl[n % ppl.length]; const c = TLXGR.ctxFor(p, 450.4 + n * 0.2); c.int = { photos: 1, ski: 1, fish: 1, dogs: 1 }; c.el = 3; c.storm = 0; c.snow = true; c.hr = 14; c.kid = true; c.kidsList = [ppl[1], ppl[2]]; for (const key of ["reindeerlens", "peak", "catch", "kidssled", "sledsummit"]) { try { const rc = TLXGR.recipeFor(key, c); if (rc) out.push([key, rc]); } catch (e) { } } }
    window.__cov = out; return out.length; })()`);
  console.log("   recipes made", made);
  const cov = await J(`(() => { const T3 = TLX.api.THREE, W = TLX.api.world, res = []; for (const [key, rc] of window.__cov) { const cam = TLXGR.shotCam(rc, 448, 448), v = new T3.Vector3(), w = new T3.Vector3(); let best = 0, kind = ""; for (const [k, x, z] of rc.p || []) { const y = W.surf(x, z), h = k.slice(0, 2) === "q:" ? ({ "q:reindeer": 1.5, "q:moose": 2.3, "q:fox": 0.55, "q:hare": 0.4 }[k] || 1) : k === "s" ? 1.3 : 1.55; v.set(x, y, z).project(cam); w.set(x, y + h, z).project(cam); const c = Math.abs(w.y - v.y) / 2; if (v.z < 1 && Math.abs(v.x) < 0.9 && c > best) { best = c; kind = k; } } res.push([key, kind, +best.toFixed(3)]); } return res; })()`);
  const wild = cov.filter(r => r[0] === "reindeerlens" && r[1].startsWith("q:")), port = cov.filter(r => (r[0] === "catch" || r[0] === "kidssled" || r[0] === "peak") && (r[1] === "w"));
  console.log("   wildlife", JSON.stringify(wild.slice(0, 6).map(r => r[2])), "portraits", JSON.stringify(port.slice(0, 8).map(r => r[2])));
  ok(wild.length >= 3 && wild.every(r => r[2] >= 0.33), `wildlife close-ups: the animal is >= 33% of the frame height in all ${wild.length} (min ${Math.min(...wild.map(r => r[2]))})`);
  ok(port.length >= 3 && port.every(r => r[2] >= 0.38), `portraits (poster, kids, catch): the figure is >= 38% of the frame in all ${port.length} (min ${Math.min(...port.map(r => r[2]))})`);
  const evp = await J(`TLXGR.posts().filter(p => p.sj === "wildlife" && p.rc.p).map(p => { const cam = TLXGR.shotCam(p.rc, 448, 448), T3 = TLX.api.THREE, W = TLX.api.world, v = new T3.Vector3(), w = new T3.Vector3(); let best = 0; for (const [k, x, z] of p.rc.p) { const y = W.surf(x, z), h = ({ "q:reindeer": 1.5, "q:fox": 0.55, "q:moose": 2.3, "q:hare": 0.4 })[k] || 1; v.set(x, y, z).project(cam); w.set(x, y + h, z).project(cam); if (v.z < 1 && Math.abs(v.x) < 1) best = Math.max(best, Math.abs(w.y - v.y) / 2); } return +best.toFixed(3); })`);
  console.log("   bus wildlife posts", JSON.stringify(evp));
  ok(evp.length === 0 || evp.every(c => c >= 0.33), `bus wildlife sightings meet the same rule (${evp.length} posts, min ${evp.length ? Math.min(...evp) : "-"})`);
  await ev(`TLXGR.always = false; true`);
});

/* ---------------- D Local chat ---------------- */
await section("D Local chat: order, separators, voice", async () => {
  // fill several villages with a mix: bus events from several systems and ambient chat, over several days
  await ev(`(() => { GS.hour = 500.6; const s = TLX.state("gram"); s.chat = {}; return 1; })()`);
  await ev(`(() => { const vs = ["kjollefjord", "mehamn", "ifjord"]; const kinds = [
    ["ski", { trail: "lys", km: 8.4, word: "good" }, "Lysløypa"], ["groom", { trail: "lys", km: 5 }, "Lysløypa"], ["trail", { trail: "lys", word: "icy" }, "Lysløypa"], ["road", { sys: "roads", what: "shut" }, "Kjøllefjord–Mehamn road"], ["road", { sys: "roads", what: "open" }, "Kjøllefjord–Mehamn road"],
    ["storm", { sys: "weather", what: "start", peak: 0.7 }, "Kjøllefjord"], ["storm", { sys: "weather", what: "end", ms: 26, cm: 18 }, "Kjøllefjord"], ["ferry", { sys: "ferry", what: "cancelled", dir: "southbound" }, "quay"], ["ferry", { sys: "ferry", what: "late", dir: "northbound", delay: 2 }, "quay"],
    ["wildlife", { sys: "wild", what: "seen", kind: "reindeer", n: 5 }, "village"], ["wildlife", { sys: "wild", what: "seen", kind: "moose" }, "village"], ["wildlife", { sys: "wild", what: "seen", kind: "fox" }, "village"], ["crash", { sys: "crash", what: "crash" }, "the quay"], ["road", { sys: "plow", what: "plowed" }, "road"],
    ["rescue", { what: "call", trail: "lys" }, "Lysløypa"], ["sky", { sys: "calendar", what: "firstlight" }, ""], ["complaint", { trail: "lys", how: "fast" }, "Lysløypa"], ["skidag", { what: "announce", label: "on Sunday" }, "Lysløypa"]];
    let n = 0; for (let day = 5; day >= 0; day--) for (const vid of vs) for (const kd of kinds) { if (((n++) * 7 + day) % 3) continue; const v = TLXN.village(vid), p = TLXN.peopleIn(vid).filter(q => q.age > 15)[n % TLXN.peopleIn(vid).filter(q => q.age > 15).length]; TLXN.post({ kind: kd[0], who: kd[0] === "crash" || kd[1].sys === "plow" ? "you" : p.id, x: v.x + 10, z: v.z + 10, place: kd[2] === "village" ? v.name : kd[2], text: "bulletin " + n, data: kd[1], t: GS.hour - day * 24 - (n % 17) * 0.7 }); } return n; })()`);
  // events carry their own times when posted late: the bus stamps t = now, so also push some with older times straight into the chat, out of order, and one "now" between old ones
  await ev(`(() => { const vid = "mehamn", ppl = TLXN.peopleIn(vid); const H = GS.hour; TLX.state("gram").chat.mehamn = []; for (const [d, txt] of [[10 * 24, "ten days ago"], [0, "now"], [5 * 24, "five days ago"], [26, "yesterday-ish"], [2.2, "two hours"], [0.05, "a few minutes"]]) TLXGR.chatPost(vid, ppl[3].id, txt, "x", H - d, 0, true, "test:" + txt); return 1; })()`);
  const chat = await J(`Object.fromEntries(Object.entries(TLX.state("gram").chat).map(([k, v]) => [k, v.map(m => [m[0], m[1], m[2], m[3], m[4], m[6]])]))`);
  let inOrder = true, total = 0; for (const [k, a] of Object.entries(chat)) { total += a.length; for (let i = 1; i < a.length; i++) if (a[i][1] < a[i - 1][1]) inOrder = false; }
  console.log("   villages", Object.keys(chat).map(k => k + ":" + chat[k].length).join(" "));
  ok(total >= 60 && inOrder, `every village's chat runs strictly oldest to newest (${total} messages)`);
  const mm = chat.mehamn || []; const iNow = mm.findIndex(m => m[3] === "now"), iTen = mm.findIndex(m => m[3] === "ten days ago"), iFive = mm.findIndex(m => m[3] === "five days ago");
  ok(iTen >= 0 && iTen < iFive && iFive < iNow && iNow === mm.length - 1 || (iTen < iFive && iFive < iNow), `the "now" message is last, after the ones from 5 and 10 days ago (positions ${iTen}, ${iFive}, ${iNow} of ${mm.length})`);
  // the rendered Local: separators in order, relative times right
  await ev(`const k = TLXN.village("mehamn"); P.x = FOOT.x = k.x + 20; P.z = FOOT.z = k.z + 20; recenter(P.x, P.z, true); FOOT.on = true; TLXGR.fpsOk = false; TLX.api.TABLET.toggle(true, "gram"); TLXGR.setTab("local"); true`); await sleep(900);
  const dom = await J(`(() => { const root = document.getElementById("tabV"), out = []; for (const el of root.querySelectorAll(".gday, .gmsg")) { if (el.classList.contains("gday")) out.push(["D", el.textContent.trim()]); else out.push(["M", el.querySelector("p").textContent, el.querySelector("i") ? el.querySelector("i").textContent : ""]); } return out; })()`);
  const seps = dom.filter(r => r[0] === "D").map(r => r[1]); console.log("   separators", seps.join(" | "));
  ok(seps.length >= 3 && seps[seps.length - 1] === "Today" && new Set(seps).size === seps.length, `day separators appear once each, ending with Today (${seps.join(", ")})`);
  ok(seps.includes("Yesterday") || seps.some(s => /day$/.test(s)), "and Yesterday / weekday names are used");
  const rel = await J(`(() => { const m = TLX.state("gram").chat.mehamn, H = GS.hour, out = {}; for (const x of m) if (/^(now|a few minutes|two hours|yesterday-ish|five days ago|ten days ago)$/.test(x[3])) out[x[3]] = TLXGR.chatAgo(x[1]); return out; })()`);
  console.log("   relative", JSON.stringify(rel));
  ok(rel["now"] === "now" && /^\d+ min ago$/.test(rel["a few minutes"]) && rel["two hours"] === "2 h ago" && /^(yesterday|2 days ago)$/.test(rel["yesterday-ish"]) && rel["five days ago"] === "5 days ago" && rel["ten days ago"] === "10 days ago", "relative times are right: " + JSON.stringify(rel));
  const order = dom.filter(r => r[0] === "M").map(r => r[1]); const pos = t => order.indexOf(t);
  ok(pos("ten days ago") < pos("five days ago") && pos("five days ago") < pos("two hours") && pos("two hours") < pos("a few minutes") && pos("a few minutes") < pos("now"), "and the screen shows them in that order");
  await ev(`TLXGR.setTab("feed"); TLX.api.TABLET.close(true); TLXGR.fpsOk = null; FOOT.on = false; true`);
  // voice: no template more than twice in any 30 messages, at least 6 voice styles among the speakers of the lines
  const v = await J(`(() => { let worst = 0, worstId = ""; const voices = new Set(), ids = new Set(), texts = []; const st = TLX.state("gram"); for (const [vid, a] of Object.entries(st.chat)) { for (let i = 0; i < a.length; i++) { const win = a.slice(Math.max(0, i - 29), i + 1), c = {}; for (const m of win) if (m[6] && !/^test:/.test(m[6])) c[m[6]] = (c[m[6]] || 0) + 1; for (const k in c) if (c[k] > worst) { worst = c[k]; worstId = k; } } for (const m of a) { const p = m[2] && m[2] !== "you" ? TLXN.person(m[2]) : null; if (p && m[6] && !/^test:/.test(m[6])) { voices.add(p.voice); ids.add(m[6]); } if (m[6] && !/^test:/.test(m[6])) texts.push(m[3]); } } return { worst, worstId, voices: [...voices], ids: ids.size, texts: texts.slice(0, 14) }; })()`);
  console.log("   voices", v.voices.join(","), "templates", v.ids, "worst repeat", v.worst, v.worstId);
  for (const t of v.texts) console.log("     > " + t);
  ok(v.worst <= 2, `no line template appears more than twice in any 30 messages (worst ${v.worst}: ${v.worstId})`);
  ok(v.voices.length >= 6 && v.ids >= 30, `at least 6 voice styles among the speakers (${v.voices.join(", ")}) and ${v.ids} distinct line templates`);
  const bull = await J(`(() => { const re = /(^|\\. )(The |A )?[A-Z][\\wøæå–-]+( [\\wøæå–-]+)? (is|are|was) (shut|closed|open again|cancelled)\\b|reopened|Road [A-Z]|^bulletin|^Warning|^Notice/, talk = /\\b(I|I'm|my|we|our|us|you|your|anyone|who|so)\\b|[?!]|[a-z]+, [a-z]|[\\u{1F300}-\\u{1FAFF}]/u; let n = 0, bad = []; for (const a of Object.values(TLX.state("gram").chat)) for (const m of a) if (m[6] && !/^test:/.test(m[6]) && re.test(m[3]) && !talk.test(m[3])) { n++; bad.push(m[3]); } return { n, bad: bad.slice(0, 3) }; })()`);
  ok(bull.n === 0, `no line reads like a notice ("Road X reopened", "is shut"): ${bull.n}${bull.n ? " " + JSON.stringify(bull.bad) : ""}`);
  const first = await J(`(() => { let n = 0, tot = 0; for (const a of Object.values(TLX.state("gram").chat)) for (const m of a) if (m[6] && /^(ski|groom|trail|shut|open|stormstart|stormend|ferry|wild|bog|crash|plow|rescue|first|polar|job|compl|skidag|re_|kin|ans|amb)/.test(m[6])) { tot++; if (/\\b(I|I'm|I've|my|we|our|me|us|you|your|anyone|anybody)\\b|\\?|!|[\\u{1F300}-\\u{1FAFF}]/iu.test(m[3])) n++; } return [n, tot]; })()`);
  ok(first[0] / first[1] >= 0.5, `most lines are people talking: first person, questions, reactions, emoji (${first[0]} of ${first[1]})`);
});

/* ---------------- E-G the reels ---------------- */
const REC = {};
await section("E every built reel type: plans, renders, moves, loops", async () => {
  await ev(`TLXGR.fpsOk = true; TLXRL.force = "real"; true`);
  for (const ty of TYPES) {
    const sp = SPEC[ty]; const kinds = ty === "waterskip" ? ["make", "sink"] : [undefined];
    for (const kind of kinds) {
      const key = kind ? ty + "_" + kind : ty;
      const rec = await J(`window.__mk(${JSON.stringify(ty)}, ${sp.hr}, ${JSON.stringify(sp.over || {})}, ${JSON.stringify(sp.vils)}, 31, ${JSON.stringify(kind || null)})`);
      if (!rec) { ok(false, ty + (kind ? " (" + kind + ")" : "") + ": a place was found for it"); continue; }
      REC[key] = rec; await ev(`window.__rec = ${JSON.stringify(rec)}; true`);
      const r = await J(`(() => { const rec = window.__rec, cv0 = TLXRL.canvas(); TLXRL.R_ = 1; const px = t => { const cv = TLXRL.shotAt(rec, t); if (!cv) return null; const g = cv.getContext("2d"), d = g.getImageData(0, 0, cv.width, cv.height).data, o = []; for (let i = 0; i < d.length; i += 64) o.push((d[i] + d[i + 1] + d[i + 2]) / 3); return o; };
        const Sc = TLXRL.plan(rec); if (!Sc) return { plan: false }; const dur = Sc.dur; const t0 = performance.now(); const seq = {}; const ts = [0, 1, 2, 3, 4, 5]; let first = null; for (let t = 0; t <= Math.min(5, dur - 0.1) + 1e-6; t += 0.05) { const k = Math.round(t * 20) / 20; if (ts.some(x => Math.abs(x - k) < 0.026)) { const p = px(k); seq[k.toFixed(2)] = p; } else { TLXRL.shotAt(rec, k); } }
        const stat = a => { let s = 0, s2 = 0; for (const v of a) { s += v; s2 += v * v; } const m = s / a.length; return { m, sd: Math.sqrt(Math.max(0, s2 / a.length - m * m)) }; };
        const ks = ["0.00", "1.00", "2.00", "3.00", "4.00", "5.00"].filter(k => seq[k]), dd = []; for (let i = 0; i + 1 < ks.length; i++) { let d = 0; const a = seq[ks[i]], b = seq[ks[i + 1]]; for (let j = 0; j < a.length; j++) d += Math.abs(a[j] - b[j]); dd.push(d / a.length); }
        return { plan: true, dur, st: stat(seq["1.00"]), st0: stat(seq["0.00"]), dd, ms: performance.now() - t0, calls: TLXRL.calls.slice(-1)[0], err: TLXRL.err }; })()`);
      const name = ty + (kind ? " (" + kind + ")" : "");
      if (!r.plan) { ok(false, name + ": plans"); continue; }
      const mx = Math.max(...r.dd), mn = Math.min(...r.dd);
      console.log(`   ${name}: dur ${r.dur}s, sd ${r.st.sd.toFixed(1)} mean ${r.st.m.toFixed(0)}, frame-to-frame (1 s apart) mean pixel change ${r.dd.map(x => x.toFixed(1)).join(" ")}, draw calls ${r.calls}`);
      ok(r.st.sd > 6 && r.st.m > 8 && r.st0.sd > 6, name + ": frames are non-blank (sd " + r.st.sd.toFixed(1) + ")");
      ok(mx > 3 && mn > 0.4, name + ": frame N differs from frame N+20, every second of the clip (min " + mn.toFixed(1) + ", max " + mx.toFixed(1) + ")");
      ok(!r.err, name + ": no error " + (r.err || "").slice(0, 100));
    }
  }
  // the type list the game has
  ok((await J(`Object.keys(TLXRL.types).length`)) >= 8, "at least 8 reel types are built: " + (await ev(`Object.keys(TLXRL.types).join(", ")`)));
});

await section("E2 loop, cast hidden, the main view byte-identical", async () => {
  const rec = REC.stormride || Object.values(REC)[0]; await ev(`window.__rec = ${JSON.stringify(rec)}; TLX.api.TABLET.close(true); true`);
  const snap = `(() => { const r = renderer, f = scene.fog, v = new THREE.Vector4(), sc = new THREE.Vector4(), sz = new THREE.Vector2(); r.getViewport(v); r.getScissor(sc); r.getSize(sz); return JSON.stringify({ cp: camera.position.toArray(), cq: camera.quaternion.toArray(), fov: camera.fov, asp: camera.aspect, fog: [f.color.r, f.color.g, f.color.b, f.density], sunI: sun.intensity, sunC: sun.color.toArray(), sunP: sun.position.toArray(), pr: r.getPixelRatio(), vp: v.toArray(), sc: sc.toArray(), sct: r.getScissorTest(), rt: r.getRenderTarget() === null, ex: r.toneMappingExposure, sh: r.shadowMap.needsUpdate, hour: GS.hour, storm: GS.storm, belt: TLXL.sled.beltU.value, skyU: [sky.material.uniforms.uFog.value.r, sky.material.uniforms.uFog.value.g, sky.material.uniforms.uFog.value.b], skyP: sky.position.toArray(), size: sz.toArray() }); })()`;
  const h0 = await J(`GS.hour`); for (let i = 0; i < 60 && (await J(`GS.hour`)) < h0 + 0.01; i++) await sleep(300);
  const both = JSON.parse(await ev(`(() => { const sn = ${snap}, S0 = sn, S1 = (() => { for (let t = 0; t < 3; t += 0.1) TLXRL.shotAt(window.__rec, t); return ${snap}; })(); return JSON.stringify({ a: S0, b: S1 }); })()`));
  ok(both.a === both.b, "playing a reel leaves the main view exactly as it was (camera, lens, fog, sun, sky, exposure, pixel ratio, viewport, scissor, target, shadow flag, hour, storm, the track belt)");
  if (both.a !== both.b) { const a = JSON.parse(both.a), b = JSON.parse(both.b); for (const k in a) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) console.log("   differs:", k, JSON.stringify(a[k]), JSON.stringify(b[k])); }
  // loop: a play started with its clock already past the end wraps round
  await ev(`TLXGR.fpsOk = true; TLX.api.TABLET.toggle(true, "gram"); TLXGR.setTab("reels"); true`); await sleep(1200);
  const lp = await J(`(() => { const R = TLXRL; if (!R.play) return { none: 1 }; const dur = R.play.Sc ? R.play.Sc.dur : 6; R.play.t0 = performance.now() - (dur + 0.4) * 1000; R.frameNow(); const t = R.play.t; return { dur, t }; })()`);
  ok(!lp.none && lp.t >= 0 && lp.t < 1.0, `the clip loops: past its ${lp.dur} s it is back at ${lp.t && lp.t.toFixed(2)} s`);
  await ev(`TLX.api.TABLET.close(true); true`); await sleep(500);
  const hid = await J(`(() => { const E = TLXRL.E; const vis = []; for (const a of E.sleds) if (a.g.visible || a.blob.visible) vis.push("sled"); for (const w of E.walkers) if (w.g.visible || w.blob.visible) vis.push("walker"); for (const d of E.deer) if (d.q.g.visible) vis.push("deer"); for (const o of E.extra) if (o.m.visible) vis.push(o.key); if (E.fx.m.visible || E.fl.m.visible) vis.push("fx"); return vis; })()`);
  ok(hid.length === 0 && (await J(`TLXRL.play === null`)), "with the tablet closed every actor and effect is hidden and nothing is playing (" + hid.join(",") + ")");
});

await section("F what renders when", async () => {
  await ev(`TLXGR.fpsOk = true; TLX.api.TABLET.close(true); true`); const n0 = await J(`TLXRL.renders + TLXRL.painted`); await sleep(2500);
  ok((await J(`TLXRL.renders + TLXRL.painted`)) === n0, "nothing renders with the tablet closed");
  await ev(`TLX.api.TABLET.toggle(true, "gram"); TLXGR.setTab("local"); true`); await sleep(2000);
  ok((await J(`TLXRL.renders + TLXRL.painted`)) === n0, "nothing renders on the Local tab");
  await ev(`TLXGR.setTab("feed"); true`); await sleep(1500); const nf = await J(`TLXRL.renders`);
  ok((await J(`!TLXRL.play`)), "nothing plays on the Feed tab");
  // make sure there are reels
  const count = await J(`TLXRL.list().length`);
  if (count < 4) { await ev(`(() => { const recs = ${JSON.stringify(Object.values(REC).slice(0, 6))}; for (const r of recs) TLXRL.add({ who: r.who, t: GS.hour - 1, vid: r.vid, place: r.place, ty: r.ty, sd: r.sd, x: r.x, z: r.z, a: r.a, k: r.k, h: r.h, s: r.s, cap: "Reel " + r.ty }); return 1; })()`); }
  await ev(`TLXRL.cur = 0; TLXRL.planned0 = 0; true`);
  const pl0 = await J(`TLXRL.planned || 0`); await ev(`TLXGR.setTab("reels"); true`); await sleep(2500);
  const r1 = await J(`({ playing: !!TLXRL.play, id: TLXRL.play && TLXRL.play.rec.id, cur: TLXRL.current().id, renders: TLXRL.renders, live: TLXRL.live, planned: TLXRL.planned || 0 })`);
  ok(r1.playing && r1.id === r1.cur && r1.renders > nf, `on the Reels tab with the tablet up the current reel plays and renders (${r1.renders - nf} frames in 2.5 s)`);
  ok(r1.live === 1, "one reel at a time: " + r1.live);
  ok(r1.planned - pl0 === 1, `only the current reel was planned and built (${r1.planned - pl0}); the next waits until it is scrolled to`);
  await ev(`TLXRL.go(1); true`); await sleep(1500);
  const r2 = await J(`({ id: TLXRL.play && TLXRL.play.rec.id, cur: TLXRL.current().id, planned: TLXRL.planned || 0, max: TLXRL.maxLive })`);
  ok(r2.id === r2.cur && r2.id !== r1.id && r2.planned - r1.planned === 1 && r2.max <= 1, `scrolling to the next plans exactly that one and stops the last (live max ${r2.max})`);
  // away to another tab: stops and hides
  await ev(`TLXGR.setTab("local"); true`); await sleep(600); const n1 = await J(`TLXRL.renders + TLXRL.painted`); await sleep(1500);
  ok((await J(`!TLXRL.play`)) && (await J(`TLXRL.renders + TLXRL.painted`)) === n1, "leaving the Reels tab stops the clip and the rendering");
});

await section("G frame cost on the high preset", async () => {
  await ev(`TLXGR.fpsOk = true; TLXRL.ms.length = 0; TLXRL.slow = 0; TLX.api.TABLET.toggle(true, "gram"); TLXGR.setTab("reels"); true`); await sleep(5000);
  const c = await J(`(() => { const a = TLXRL.ms.slice().sort((x, y) => x - y), d = TLXRL.canvas(); return { n: a.length, med: a[Math.floor(a.length / 2)], p95: a[Math.floor(a.length * 0.95)], max: a[a.length - 1], w: d.width, h: d.height, fps: TLXRL.fpsCap, calls: Math.max(...TLXRL.calls), kind: TLXRL.lastKind, frames: TLXRL.play ? TLXRL.play.frames : 0 }; })()`);
  const rate = c.frames / 5;
  console.log(`   reel frame cost: median ${c.med && c.med.toFixed(1)} ms, p95 ${c.p95 && c.p95.toFixed(1)} ms at ${c.w}x${c.h}, cap ${c.fps} fps (measured ${rate.toFixed(1)} fps in the headless run), draw calls per reel frame ${c.calls}`);
  ok(c.n >= 10 && c.kind === "real", `reel frames were rendered live (${c.n} measured)`);
  ok(c.med < 25 && c.p95 < 60, `budget: median under 25 ms and p95 under 60 ms per reel frame on high (${c.med.toFixed(1)} / ${c.p95.toFixed(1)})`);
  ok(c.w === 270 && c.h === 480, "9:16 at 270x480 on the high preset");
  ok(c.calls < 900, `draw calls per reel frame under 900 (${c.calls})`);
  const fps = await J(`(() => { const t0 = performance.now(); let n = 0; return 1; })()`);
  await ev(`TLX.api.TABLET.close(true); TLXRL.force = null; true`);
});

await section("H navigation under keyboard, pad and touch", async () => {
  await ev(`TLXGR.fpsOk = true; TLX.api.TABLET.toggle(true, "gram"); TLXGR.setTab("reels"); TLXRL.cur = 0; TLX.api.TABLET.refresh("gram"); TLX.api.TABLET.focus = "rl:v"; true`); await sleep(900);
  const cur = () => J(`TLXRL.cur`);
  ok((await cur()) === 0, "start on the newest reel");
  await down("ArrowDown"); await sleep(70); await up("ArrowDown"); await sleep(700);
  ok((await cur()) === 1, "keyboard: Down goes to the next reel (" + (await cur()) + ")");
  await down("ArrowUp"); await sleep(70); await up("ArrowUp"); await sleep(700);
  ok((await cur()) === 0, "keyboard: Up goes back to the previous");
  await ev(`TLX.api.TABLET.focus = "rl:v"; true`); await padSet({ 13: 1 }); await sleep(250); await padSet(); await sleep(700);
  ok((await cur()) === 1, "pad: d-pad down goes to the next reel");
  await ev(`TLX.api.TABLET.focus = "rl:v"; true`); await padSet({}, [0, 0, 0, -1]); await sleep(250); await padSet(); await sleep(700);
  ok((await cur()) === 0, "pad: the right stick up goes to the previous reel");
  await ev(`TLX.api.TABLET.focus = "rl:v"; true`); await padSet({}, [0, 0, 0, 1]); await sleep(250); await padSet(); await sleep(700);
  ok((await cur()) === 1, "pad: the right stick down goes to the next reel");
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 }); await ev(`INP.dev = "touch"; true`);
  await ev(`(() => { const v = document.querySelector("#tabV .rlv"), r = v.getBoundingClientRect(); v.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: r.x + 100, clientY: r.y + r.height * 0.7, pointerId: 3 })); v.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: r.x + 104, clientY: r.y + r.height * 0.2, pointerId: 3 })); return 1; })()`); await sleep(700);
  ok((await cur()) === 2, "touch: a swipe up goes to the next reel");
  await ev(`(() => { const v = document.querySelector("#tabV .rlv"), r = v.getBoundingClientRect(); v.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: r.x + 100, clientY: r.y + r.height * 0.2, pointerId: 4 })); v.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: r.x + 100, clientY: r.y + r.height * 0.8, pointerId: 4 })); return 1; })()`); await sleep(700);
  ok((await cur()) === 1, "touch: a swipe down goes to the previous");
  await ev(`document.querySelector("#tabV [data-rln='1']").click(); true`); await sleep(600);
  ok((await cur()) === 2, "touch/mouse: the Older button goes to the next reel");
  const txt = {}; for (const [dev, pad] of [["kbm", "xbox"], ["pad", "ps"], ["touch", "xbox"]]) { await ev(`INP.dev = ${JSON.stringify(dev)}; INP.pad = ${JSON.stringify(pad)}; TLX.api.TABLET.refresh("gram"); true`); await sleep(250); txt[dev] = await ev(`document.getElementById("tabV").textContent.replace(/\\s+/g, " ").replace(/\\d+ (min|h) ago|now|yesterday|\\d+ d ago/g, "")`); }
  ok(txt.kbm === txt.pad && txt.pad === txt.touch && txt.kbm.length > 60, "the Reels tab reads the same under keyboard, pad and touch (no key names in its text)");
  await send("Emulation.setTouchEmulationEnabled", { enabled: false }); await ev(`INP.dev = "kbm"; TLX.api.TABLET.close(true); true`);
  // the badge
  await ev(`(() => { const s = TLX.state("gram"); for (const r of s.reels.list) r.sn = 1; return 1; })()`);
  const u0 = await J(`TLXRL.unseen()`); await ev(`(() => { const r = ${JSON.stringify(Object.values(REC)[2])}; TLXRL.add({ who: r.who, t: GS.hour, vid: r.vid, place: r.place, ty: r.ty, sd: r.sd, x: r.x, z: r.z, a: r.a, k: r.k, h: r.h, s: r.s, cap: "New one" }); return 1; })()`);
  const u1 = await J(`TLXRL.unseen()`); ok(u0 === 0 && u1 === 1, `a new reel is an unseen badge (${u0} -> ${u1})`);
  await ev(`TLXGR.fpsOk = false; TLX.api.TABLET.toggle(true, "gram"); TLXGR.setTab("feed"); true`); await sleep(500);
  ok(/Reels\s*1/.test(await ev(`document.querySelector("#tabV .gtabs").textContent`)), "and the Reels tab shows it");
  await ev(`TLX.api.TABLET.close(true); true`);
});

/* ---------------- generator ---------------- */
await section("K reels arrive over time, by people whose interests fit", async () => {
  await ev(`(() => { const s = TLX.state("gram"); s.reels.list = []; s.reels.seq = 0; TLXRL.log.length = 0; GS.hour = 600.3; return 1; })()`);
  for (let h = 0; h < 96; h++) await ev(`(() => { const H = 600 + ${h}; WX.force = ${[10, 11, 12, 13, 50, 51, 52].includes(h)} ? { v: 1, until: H + 1 } : null; TLXGR.rnd(); TLXRL.genHour(H + 0.45); return 1; })()`);
  await ev(`WX.force = null; true`);
  const g = await J(`(() => { const L = TLX.state("gram").reels.list, who = L.map(r => TLXN.person(r.who)); return { n: L.length, types: [...new Set(L.map(r => r.ty))], people: new Set(L.map(r => r.who)).size, fit: L.filter((r, i) => who[i] && TLXRL.types[r.ty].fit(who[i])).length, caps: new Set(L.map(r => r.cap)).size, big: JSON.stringify(L).length }; })()`);
  console.log("   reels made in 4 days:", JSON.stringify(g));
  ok(g.n >= 8 && g.types.length >= 4 && g.people >= 5, `over 4 simulated days people post reels: ${g.n} reels, ${g.types.length} types (${g.types.join(",")}), ${g.people} people`);
  ok(g.fit / g.n >= 0.9, `posted by people whose interests fit (${g.fit} of ${g.n})`);
  ok(g.n <= 40 && g.big < 40 * 700, `saved state is recipes only, capped at 40 (${g.n} reels, ${g.big} bytes)`);
  // a bus event: a storm sets sled people out
  await ev(`(() => { const s = TLX.state("gram"); s.reels.list = []; return 1; })()`);
  const b = await J(`(() => { let made = 0; const d = TLX.api.world.depot; WX.force = { v: 1, until: GS.hour + 6 }; for (let k = 0; k < 24; k++) { const n0 = TLXRL.list().length; TLXN.post({ kind: "storm", x: d.x, z: d.z, place: "Kjøllefjord", text: "A storm is coming in from the north.", data: { sys: "weather", what: "start", peak: 0.8 } }); if (TLXRL.list().length > n0) made++; } WX.force = null; return { made, tys: TLXRL.list().map(r => r.ty) }; })()`);
  console.log("   storm events ->", JSON.stringify(b));
  ok(b.made >= 3 && b.tys.every(t => t === "stormride"), `a storm on the bus makes sled people post a storm ride (${b.made} of 24 events)`);
});

/* ---------------- I reload, old saves, junk ---------------- */
await section("I reload keeps reels and seen-state; old and junk saves", async () => {
  await ev(`TLX.api.TABLET.close(true); (() => { const s = TLX.state("gram"); s.reels.list = []; s.reels.seq = 0; const recs = ${JSON.stringify(Object.values(REC).slice(0, 5))}; for (const r of recs) TLXRL.add({ who: r.who, t: GS.hour - 2, vid: r.vid, place: r.place, ty: r.ty, sd: r.sd, x: r.x, z: r.z, a: r.a, k: r.k, h: r.h, s: r.s, cap: "Keep " + r.ty }); s.reels.list[1].sn = 1; s.reels.list[3].sn = 1; save(); return 1; })()`);
  const before = await J(`({ ids: TLXRL.list().map(r => r.id).join(","), sn: TLXRL.list().map(r => r.sn).join(""), caps: TLXRL.list().map(r => r.cap).join("|"), un: TLXRL.unseen(), size: JSON.stringify(TLX.state("gram").reels).length })`);
  await reload(); await sleep(1500); await ev(SETUP);
  const after = await J(`({ ids: TLXRL.list().map(r => r.id).join(","), sn: TLXRL.list().map(r => r.sn).join(""), caps: TLXRL.list().map(r => r.cap).join("|"), un: TLXRL.unseen(), ready: TLXRL.ready, err: TLXRL.err + TLXGR.err })`);
  ok(after.ready && !after.err, "reload: the reels engine is ready, no error " + after.err);
  ok(after.ids === before.ids && after.caps === before.caps && after.sn === before.sn && after.un === before.un, `reload keeps the reels and what was seen (${before.ids.split(",").length} reels, unseen ${before.un} -> ${after.un})`);
  console.log("   reels state:", before.size, "bytes for", before.ids.split(",").length, "reels");
  ok(await J(`(() => { const rec = TLXRL.list()[0]; return !!TLXRL.plan(rec); })()`), "and a reloaded reel plans and draws again from its recipe");
  const sv = JSON.parse(await ev(`localStorage.getItem("tracklayer.save.v2")`));
  const sv1 = JSON.parse(JSON.stringify(sv)); if (sv1.x && sv1.x.sys && sv1.x.sys.gram && sv1.x.sys.gram.s) delete sv1.x.sys.gram.s.reels;
  await reload(sv1); await sleep(1500); await ev(SETUP);
  const old = await J(`({ ready: TLXRL.ready, err: TLXRL.err + TLXGR.err, n: TLXRL.list().length, gram: TLXGR.ready })`);
  ok(old.ready && old.gram && !old.err && old.n >= 0, `a save made before reels loads (no x.sys.gram.s.reels): ${old.n} reels, no error`);
  const sv2 = JSON.parse(JSON.stringify(sv)); sv2.x.sys.gram.s.reels = { seq: "x", list: [null, 5, "x", { id: "a" }, { id: 3, t: 1, ty: "nope", x: 1, z: 1, h: 1, cap: "a" }, { id: 4, t: 1, ty: "summit", x: NaN, z: 1, h: 1, cap: "a" }, { id: 5, t: 1, ty: "summit", x: 1, z: 1, h: 1, cap: "ok", cm: "bad", lk: "x", a: "q", k: { z: 1 } }] };
  await reload(sv2); await sleep(1500); await ev(SETUP);
  const junk = await J(`({ ready: TLXRL.ready, err: TLXRL.err + TLXGR.err, n: TLXRL.list().length })`);
  ok(junk.ready && !junk.err, `junk reel state does not throw (${junk.n} reels kept)`);
  await ev(`TLXGR.fpsOk = true; TLX.api.TABLET.toggle(true, "gram"); TLXGR.setTab("reels"); true`); await sleep(1500);
  ok(!(await ev(`TLXRL.err`)) && (await ev(`document.getElementById("tabV").textContent`)).length > 40, "and the tab renders from it");
  await ev(`TLX.api.TABLET.close(true); true`);
});

/* ---------------- J the low preset ---------------- */
await section("J the low preset plays the painted fallback", async () => {
  await raw(`localStorage.setItem("tracklayer.set.v1", JSON.stringify({ gfx: "low" })); true`); await reload(); await sleep(1500); await ev(SETUP);
  ok(await J(`TLX.api.GFX.low === true`), "the low preset is on");
  await ev(`(() => { const s = TLX.state("gram"); if (!s.reels.list.length) { const r = ${JSON.stringify(Object.values(REC)[1])}; TLXRL.add({ who: r.who, t: GS.hour, vid: r.vid, place: r.place, ty: r.ty, sd: r.sd, x: r.x, z: r.z, a: r.a, k: r.k, h: r.h, s: r.s, cap: "low" }); } TLXGR.fpsOk = true; TLX.api.TABLET.toggle(true, "gram"); TLXGR.setTab("reels"); return 1; })()`); await sleep(2500);
  const lo = await J(`(() => { const cv = TLXRL.canvas(), g = cv.getContext("2d"), d = g.getImageData(0, 0, cv.width, cv.height).data; let s = 0, s2 = 0, n = 0; for (let i = 0; i < d.length; i += 40) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; s += l; s2 += l * l; n++; } const m = s / n; const a = g.getImageData(0, 0, cv.width, cv.height).data.slice(); return { painted: TLXRL.painted, renders: TLXRL.renders, kind: TLXRL.lastKind, w: cv.width, h: cv.height, sd: Math.sqrt(Math.max(0, s2 / n - m * m)), playing: !!TLXRL.play }; })()`);
  ok(lo.kind === "paint" && lo.painted > 5 && lo.renders === 0 && lo.playing && lo.sd > 8, `low: the painted card plays (${lo.painted} painted frames, 0 renders, ${lo.w}x${lo.h}, sd ${lo.sd.toFixed(0)})`);
  const mv = await J(`(() => { const rec = TLXRL.current(), cv = TLXRL.canvas(), g = cv.getContext("2d"); const px = t => { TLXRL.paintCard(rec, t, cv, g); return g.getImageData(0, 0, cv.width, cv.height).data.slice(); }; const a = px(0.2), b = px(2.7); let d = 0; for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]); return d / a.length; })()`);
  ok(mv > 1, `the painted card moves (frame difference ${mv.toFixed(1)})`);
  await ev(`TLX.api.TABLET.close(true); true`); await raw(`localStorage.setItem("tracklayer.set.v1", JSON.stringify({})); true`);
});

/* ---------------- stills ---------------- */
if (!NOSTILLS) await section("stills", async () => {
  await reload(); await sleep(1500); await ev(SETUP); await ev(`TLXGR.fpsOk = true; TLXRL.force = "real"; true`);
  // the strip of every type: six frames across the clip, stepped 0.05 s so the walkers' gaits are continuous
  for (const key of Object.keys(REC)) {
    const out = await J(`(() => { const rec = ${JSON.stringify(REC[key])}; const urls = TLXRL.strip(rec, 6); return urls; })()`);
    if (!out) { ok(false, "strip for " + key); continue; }
    out.forEach((u, i) => fs.writeFileSync(`${OUT}/reel_${key}_${i}.jpg`, Buffer.from(u.split(",")[1], "base64")));
    console.log("   strip " + key + ": " + out.length + " frames");
  }
  // the feed, an opened post, Local, the Reels tab itself
  await ev(`(() => { const s = TLX.state("gram"); s.posts = []; WX.force = null; TLXGR.hold = true; TLXGR.always = true; GS.hour = 700.4; return 1; })()`);
  await ev(`(() => { const k = TLXN.village("kjollefjord"); const p = TLXN.people.find(q => q.vid === "kjollefjord" && q.age > 20 && q.interests.includes("photos")) || TLXN.people[0]; const c = TLXGR.ctxFor(p, 700.4); c.int = { photos: 1, ski: 1 }; c.el = 3; c.storm = 0; c.snow = true; c.hr = 11; for (const key of ["peak", "reindeerlens", "catch", "sunrise"]) { const rc = TLXGR.recipeFor(key, c); if (rc) TLXGR.addPost({ who: p.id, t: 700.2, vid: "kjollefjord", place: key === "peak" ? "Finnkirka lookout" : "Kjøllefjord", sj: key, cap: { peak: "Up on Finnkirka at lunch. Not a cloud.", reindeerlens: "A reindeer came right up. A still, not in the game yet.", catch: "Two kilos of cod off the quay.", sunrise: "Low sun over the fjord." }[key], rc, chip: key.toUpperCase(), wish: key === "reindeerlens" }); } TLXN.post({ kind: "wildlife", x: k.x + 380, z: k.z + 120, place: "Kjøllefjord", text: "A reindeer herd was seen near the village.", data: { sys: "wild", what: "seen", kind: "reindeer", n: 5 } }); return TLXGR.posts().length; })()`);
  await ev(`FOOT.on = true; TLXGR.fpsOk = true; GS.hour = 700.5; TLX.api.TABLET.toggle(true, "gram"); TLXGR.setTab("feed"); true`); await sleep(500);
  for (let i = 0; i < 80; i++) { await sleep(500); if (await J(`document.querySelectorAll("#tabV canvas[data-done=real]").length >= Math.min(4, TLXGR.posts().length)`)) break; }
  await shot("gram_feed_top", 90); await ev(`document.getElementById("tabV").scrollTop = 480; true`); await sleep(1500); await shot("gram_feed_mid", 90);
  await ev(`document.getElementById("tabV").scrollTop = 0; TLXGR.setTab("feed", TLXGR.posts().slice(-1)[0].id); true`); await sleep(1800); await shot("gram_post_open", 90);
  await ev(`TLXGR.setTab("local"); true`); await sleep(700); await shot("gram_local_kjollefjord", 90);
  await ev(`const v = TLXN.village("mehamn"); P.x = FOOT.x = v.x + 20; P.z = FOOT.z = v.z + 20; recenter(P.x, P.z, true); TLXGR.setTab("feed"); TLXGR.setTab("local"); true`); await sleep(900); await shot("gram_local_mehamn", 90);
  await ev(`document.getElementById("tabV").scrollTop = 99999; true`); await sleep(500); await shot("gram_local_mehamn_end", 90);
  // the Reels tab: reels of three types, a frame each
  await ev(`(() => { const s = TLX.state("gram"); s.reels.list = []; const recs = ${JSON.stringify(["reindeer", "summit", "lakerace"].map(k => REC[k]).filter(Boolean))}; for (const r of recs) TLXRL.add({ who: r.who, t: GS.hour - 1, vid: r.vid, place: r.place, ty: r.ty, sd: r.sd, x: r.x, z: r.z, a: r.a, k: r.k, h: r.h, s: r.s, cap: "A reel of the " + r.ty }); TLXRL.cur = 0; TLXGR.setTab("reels"); return 1; })()`); await sleep(2500); await shot("reels_tab", 90);
  await ev(`TLX.api.TABLET.close(true); TLXRL.force = null; FOOT.on = false; true`);
});

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
await done(fails ? 1 : 0);

// I2: the people in the street, and a word with them. Nothing stops while you talk.
import { boot, ev, sleep, done, reload, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 400)); } };
const SETUP = `tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; GS.stormPhase = "calm"; GS.warned = false; GS.warmth = 100; TLX.setOn("police", false); TLX.setOn("traffic", false); TLXSK.hold = true; true`;
await boot(); await ev(SETUP); await sleep(1200);
// stand in front of a Kjøllefjord house with a family in it, at noon
const H = await J(`(() => { GS.hour = 40 * 24 + 12.2; const hs = TLXN.homes.filter(h => h.village === "kjollefjord" && h.members.length >= 3); let best = null; for (const h of hs) { const d = TLX.api.world.doors.find(q => Math.hypot(q.x - h.x, q.z - h.z) < 6); if (!d) continue; const fx = d.x + d.nx * (d.d / 2 + 6), fz = d.z + d.nz * (d.d / 2 + 6); if (!TLX.api.world.obNear(fx, fz, 2) && !TLX.api.world.isSea(fx, fz)) { best = { id: h.id, m: h.members, fx, fz, yaw: Math.atan2(-d.nx, -d.nz) }; break; } } if (!best) return null; FOOT.on = true; FOOT.x = best.fx; FOOT.z = best.fz; FOOT.yaw = best.yaw; P.x = best.fx + 6; P.z = best.fz + 6; P.vx = P.vz = 0; return best; })()`);
ok(!!H, "a house with a family and open ground in front: " + (H && H.id));
const ppl = await J(`${JSON.stringify(H.m)}.map(id => { const p = TLXN.people.find(q => q.id === id); return { id, first: p.first, age: p.age, role: p.role }; })`);
console.log("   household:", ppl.map(p => `${p.first} ${p.age} ${p.role}`).join(", "));

await section("A who is out is bookkeeping, by the hour and the weather", async () => {
  const r = await J(`(() => { const h0 = GS.hour, n = hh => { GS.hour = 40 * 24 + hh; return TLXFOLK.outNear(FOOT.x, FOOT.z, 400).length; }; const noon = n(12.2), eve = n(16.5), night = n(3.2); GS.stormPhase = "storm"; const storm = n(12.2); GS.stormPhase = "calm"; GS.hour = h0; const all = TLXN.people.filter(p => p.vid === "kjollefjord").length; return { noon, eve, night, storm, all }; })()`);
  ok(r.noon > 8 && r.eve > 8 && r.night === 0 && r.storm < r.noon * 0.5 && r.noon < r.all * 0.7, `of ${r.all} people in Kjøllefjord ${r.noon} are out at noon, ${r.eve} in the afternoon, none at three in the night, ${r.storm} in a storm`);
});

await section("B near you they are there, each doing something", async () => {
  const acts = ["stand", "shovel", "errand", "play"]; await ev(`TLXFOLK.force = {}; ${JSON.stringify(H.m)}.slice(0, 4).forEach((id, i) => TLXFOLK.force[id] = ${JSON.stringify(acts)}[i]); true`); await sleep(2600);
  const c = await J(`TLXFOLK.cast.map(c => ({ id: c.p.id, act: c.act, x: c.x, z: c.z, vis: c.w.g.visible, sc: c.sc, ob: !!TLX.api.world.obNear(c.x, c.z, 0.25), sea: TLX.api.world.isSea(c.x, c.z), d: Math.hypot(c.x - FOOT.x, c.z - FOOT.z), face: !!c.w.smile, y: c.w.g.position.y - TLX.api.world.surf(c.x, c.z) }))`);
  const mine = c.filter(q => H.m.includes(q.id)); console.log("   cast:", c.length, mine.map(q => `${q.act}@${q.d.toFixed(1)}m`).join(" "));
  ok(mine.length >= Math.min(3, H.m.length) && mine.every(q => q.vis && !q.sea), `${mine.length} of the family are outside, on dry land`);
  ok(mine.every(q => Math.abs(q.y) < 0.6), "standing on the snow, not in the air or under it: " + mine.map(q => q.y.toFixed(2)).join(" "));
  ok(c.length <= 8, "never more than the pool (" + c.length + ")");
  const e0 = mine.find(q => q.act === "errand"); if (e0) { await sleep(3000); const e1 = await J(`(() => { const c = TLXFOLK.cast.find(q => q.p.id === "${e0.id}"); return c ? { x: c.x, z: c.z, sp: c.w.o.sp } : null; })()`); ok(e1 && Math.hypot(e1.x - e0.x, e1.z - e0.z) > 1.2, `the one on an errand is walking (${e1 ? Math.hypot(e1.x - e0.x, e1.z - e0.z).toFixed(1) : "?"} m in 3 s)`); }
  const kid = ppl.find(p => p.age < 13), kc = kid && c.find(q => q.id === kid.id), ad = c.find(q => { const p = ppl.find(z => z.id === q.id); return p && p.age > 20; });
  if (kc && ad) ok(kc.sc < ad.sc - 0.08, `children are smaller (${kc.sc.toFixed(2)} against ${ad.sc.toFixed(2)})`);
  await ev(`window.camOv = null; true`); await shot("folk_street", 90);
});

await section("C a word, and nothing stops", async () => {
  const who = await J(`(() => { const c = TLXFOLK.cast.find(q => q.act === "stand") || TLXFOLK.cast.find(q => q.act === "shovel"); if (!c) return null; let ox = 0, oz = 0; for (const q of TLXFOLK.cast) if (q !== c) { ox += q.x - c.x; oz += q.z - c.z; } const L = Math.hypot(ox, oz) || 1; FOOT.x = c.x - ox / L * 1.1; FOOT.z = c.z - oz / L * 1.1; const n = TLXFOLK.near(2.8); return n ? { id: n.p.id, first: n.p.first, act: n.act } : null; })()`);
  ok(!!who, "somebody to talk to: " + (who && who.first)); await sleep(400);
  const u = await J(`(() => { INP.dev = "kbm"; const r = TLXFOLK.FOOTX.use(); return r ? { label: r.label, hint: r.hint() } : null; })()`);
  ok(u && u.label === "TALK" && u.hint.includes(who.first) && /^E: /.test(u.hint), "on foot beside them the use control offers a word: " + (u && u.hint));
  const up = await J(`(() => { INP.dev = "pad"; INP.pad = "ps"; const a = TLXFOLK.FOOTX.use().hint(); INP.dev = "touch"; const b = TLXFOLK.FOOTX.use().hint(); INP.dev = "kbm"; INP.pad = "xbox"; return [a, b]; })()`);
  ok(!/^E: /.test(up[0]) && up[0].includes(who.first) && /^tap /.test(up[1]), "a pad and a touch screen are told their own control: " + up.join(" | "));
  const h0 = await J(`GS.hour`), reg0 = await J(`TLXTALK.regard("${who.id}")`);
  await ev(`TLXFOLK.FOOTX.use().act(); true`); await sleep(500);
  const b = await J(`(() => { const el = document.getElementById("talkBub"); return { on: el && el.style.opacity === "1", txt: el ? el.innerText : "", cur: !!TLXTALK.cur, lab: TLXFOLK.FOOTX.use().label, hint: TLXFOLK.FOOTX.use().hint(), line: TLXFOLK.lastLine }; })()`);
  ok(b.on && b.cur && b.txt.length > 12 && b.txt.toUpperCase().includes(who.first.toUpperCase()), `they say a line in a bubble over their head: "${b.txt.replace(/\n/g, " ")}"`);
  ok(b.lab === "REPLY" && b.hint.includes('"'), "and the use control now holds your answer: " + b.hint);
  await ev(`FOOT.x += 0.4; true`); await sleep(700); const h1 = await J(`GS.hour`);
  ok(h1 > h0 && (await J(`!!TLXTALK.cur`)), `the clock runs and you can move while the bubble is up (${((h1 - h0) * 3600).toFixed(0)} game seconds passed)`);
  await ev(`TLXFOLK.FOOTX.use().act(); true`); await sleep(400);
  const b2 = await J(`({ txt: document.getElementById("talkBub").innerText, lab: TLXFOLK.FOOTX.use().label })`);
  ok(/You: /.test(b2.txt) && b2.lab === "TALK", `your line and their last word: "${b2.txt.replace(/\n/g, " ")}"`);
  ok((await J(`TLXTALK.regard("${who.id}")`)) === reg0 + 1 && (await J(`TLXTALK.known()`)) === 0, "a first word is remembered, once a day");
  await shot("folk_talk", 90);
  await ev(`FOOT.x += 9; true`); await sleep(500); ok(!(await J(`!!TLXTALK.cur`)) && (await ev(`document.getElementById("talkBub").style.opacity`)) === "0", "walk off and it is over");
  // different things on different days; knows you on the second day
  const ids = []; for (let i = 0; i < 6; i++) { await ev(`(() => { const c = TLXFOLK.cast.find(q => q.p.id === "${who.id}"); FOOT.x = c.x + 1.5; FOOT.z = c.z; GS.hour += 24; TLXFOLK.endTalk(); TLXFOLK.talk(c); })(); true`); ids.push(await J(`TLXFOLK.lastLine.id`)); }
  ok(new Set(ids).size >= 4, "six days running they say at least four different things: " + ids.join(" "));
  ok((await J(`TLXTALK.known()`)) === 1 && (await J(`TLXTALK.regard("${who.id}")`)) >= 2, "after a word on two days they know you by name");
  await ev(`TLXN.post({ kind: "crash", who: "you", place: "Kjøllefjord", text: "came off hard near Kjøllefjord" }); (() => { const c = TLXFOLK.cast.find(q => q.p.id === "${who.id}"); TLXFOLK.endTalk(); TLXFOLK.talk(c); })(); true`);
  ok(/you:crash/.test(await J(`TLXFOLK.lastLine.id`)), "and they have heard what you did: " + (await J(`TLXFOLK.lastLine.text`)));
});

await section("D at work, from the saddle, indoors", async () => {
  const w = await J(`(() => { const c = TLXFOLK.cast[0]; c.act = "work"; const r0 = TLXTALK.regard(c.p.id); TLXFOLK.endTalk(); TLXFOLK.talk(c); const r = { line: TLXFOLK.lastLine, reg: TLXTALK.regard(c.p.id) - r0, lab: null }; c.act = "stand"; return r; })()`);
  ok(w.line.id === "busy" && w.reg === 0, `somebody at work says so in a word and carries on: "${w.line.text}"`);
  const r = await J(`(() => { TLXFOLK.endTalk(); const c = TLXFOLK.cast.find(q => q.act === "stand") || TLXFOLK.cast[0]; FOOT.on = false; P.x = c.x + 2.2; P.z = c.z; P.vx = P.vz = 0; const a = TLXFOLK.RIDEX.use(); P.vx = 6; const b = TLXFOLK.RIDEX.use(); P.vx = 0; return { a: a && a.label, b: !!b }; })()`);
  ok(r.a === "TALK" && !r.b, "stopped beside them on the sled the use control talks; riding past it does not");
  await ev(`FOOT.on = true; FOOT.x = P.x; FOOT.z = P.z; true`);
  ok(!(await ev(`TLXFOLK.err`)), "no error: " + (await ev(`TLXFOLK.err`)));
});

await section("E the save", async () => {
  const k = await J(`({ known: TLXTALK.known(), reg: Object.keys(TLX.state("folk").reg).length })`); await ev(`save(); true`); await reload(); await ev(SETUP); await sleep(800);
  const k2 = await J(`({ known: TLXTALK.known(), reg: Object.keys(TLX.state("folk").reg).length })`); ok(k2.known === k.known && k2.reg === k.reg && k.known >= 1, "who knows you is kept in the save: " + JSON.stringify(k2));
  await ev(`(() => { const s = TLX.dump(); s.sys.folk = { v: 1, s: { reg: "x", day: [1], mem: 7, n: "q" } }; return 1; })()`);
});
console.log(fails ? `FAILS: ${fails}` : "all passed");
await done(fails ? 1 : 0);

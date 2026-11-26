// Goal G7 slices H2b/H2R-a: the Reels tab (tlx-reels.js, tlx-reelscenes.js) inside the remade Gram app (the Local tab is tested in h2_gram.mjs). Asserts, exit 1 on a failure.
//   (the feed, composition and chat sections of the first build are gone with those tabs)
//   B  composition: an empty-snow / hillside recipe is rejected, a framed one accepted; every accepted post passes its own check
//   C  subject coverage measured from projected bounds: wildlife >= 33% of the frame, portraits >= 38%
//   D  Local chat: strictly oldest to newest in every village, day separators (Today / Yesterday / weekday) in order, correct relative times, no line template more than twice in any 30 messages, >= 6 voice styles
//   E  reels: every built type plans, renders non-blank frames that change over time, loops, hides its cast when the tab closes, leaves the main view byte-identical
//   F  nothing renders with the tablet closed or on another tab; one reel at a time; the next is prepared ahead (planned, cast built, compiled) but only drawn when scrolled to; like and comments sheet on the reel
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

/* ---------------- E-G the reels ---------------- */
const REC = {};
await section("E every built reel type: plans, renders, moves, loops", async () => {
  await ev(`TLXGR.fpsOk = true; TLXRL.force = "real"; true`);
  for (const ty of TYPES) {
    const sp = SPEC[ty]; const kinds = ty === "waterskip" ? ["make", "sink"] : [undefined];
    for (const kind of kinds) {
      const key = kind ? ty + "_" + kind : ty;
      // the aurora's strength is noise by game day: the clip needs a dark night with a real aurora in the 24 h before the hour asked for, so step the date to the first such day (root cause of the "a place was found for it" flake: the test used whatever day the clock had reached)
      if (ty === "aurora") ok(await J(`(() => { for (let d = 0; d < 40; d++) { const H = Math.floor(GS.hour / 24) * 24 + ${sp.hr}; for (let q = 0; q < 48; q++) { const hh = H - q * 0.5; if (TLXGR.elAt(hh) < -11 && TLX.api.gram.aur().level(hh) > 0.45) return true; } GS.hour += 24; } return false; })()`), "a night with a strong aurora was found to stage the aurora reel on");
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

await section("E3 every moment clip: staged from the moment table, frames non-blank and moving, under the draw-call budget", async () => {
  await ev(`TLXGR.fpsOk = true; TLXRL.force = "real"; TLXGR.forceW = true; TLXGR.hold = true; true`);
  const NEW = ["summitselfie", "kidgrin", "cornice", "hilltail", "herdroad", "foxquay", "snowball", "sledgebank", "wheelie", "roofslide", "bonfire", "digout"];
  ok(await J(`${JSON.stringify(NEW)}.every(k => TLXRL.types[k] && TLXRL.types[k].moment)`), "the moment clips are registered reel types: " + NEW.join(", "));
  let worst = 0; const missing = [];
  for (const ty of NEW) {
    const r = await J(`(() => { const R = TLXRL, day = Math.floor(GS.hour / 24) * 24; let rec = null; const ppl = TLXN.people.filter(q => q.age > 6 && q.age < 85);
      for (const hr of [11.5, 12.5, 13.5, 15.5, 19.5, 21.5]) { for (let k = 0; k < 24 && !rec; k++) { try { rec = R.genOne(day + hr, ppl[(k * 11 + Math.round(hr * 3)) % ppl.length], "${ty}"); } catch (e) { return { err: String(e) }; } } if (rec) break; }
      if (!rec) return { none: 1 }; const Sc = R.plan(rec); if (!Sc) return { plan: false };
      let shotMs = 0; const px = t => { const t0 = performance.now(), cv = R.shotAt(rec, t); shotMs = performance.now() - t0; if (!cv) return null; const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data, o = []; for (let i = 0; i < d.length; i += 64) o.push((d[i] + d[i + 1] + d[i + 2]) / 3); return o; };
      const seq = {}, calls = [], ms = []; R._sa = null; for (let t = 0; t <= Sc.dur - 0.1; t += 0.1) { const k = Math.round(t * 10) / 10; const p = px(k); ms.push(shotMs); calls.push(R.calls[R.calls.length - 1]); if (Math.abs(k * 1 - Math.round(k)) < 0.01 || Math.abs(k - Sc.dur * 0.5) < 0.06) seq[k.toFixed(1)] = p; }
      const stat = a => { let s = 0, s2 = 0; for (const v of a) { s += v; s2 += v * v; } const m = s / a.length; return { m, sd: Math.sqrt(Math.max(0, s2 / a.length - m * m)) }; }, ks = Object.keys(seq).filter(k => seq[k]), dd = [];
      for (let i = 0; i + 1 < ks.length; i++) { let d = 0; const a = seq[ks[i]], b = seq[ks[i + 1]]; for (let j = 0; j < a.length; j++) d += Math.abs(a[j] - b[j]); dd.push(d / a.length); }
      const sm = ms.slice().sort((a, b) => a - b); return { id: rec.id, dur: Sc.dur, st: stat(seq[ks[Math.floor(ks.length / 2)]]), dd, calls: Math.max(...calls), med: sm[sm.length >> 2], err: R.err, cap: rec.cap, w: rec.w, lit: !!Sc.lit }; })()`);
    if (r.none) { missing.push(ty); continue; }
    if (r.err && typeof r.err === "string" && r.plan === undefined) { ok(false, ty + ": " + r.err); continue; }
    console.log(`   ${ty}: dur ${r.dur}s, sd ${r.st.sd.toFixed(1)}, motion ${Math.min(...r.dd).toFixed(1)}..${Math.max(...r.dd).toFixed(1)}, draw calls max ${r.calls}, quarter-point frame ${r.med.toFixed(1)} ms`);
    ok(r.plan !== false && r.st.sd > 6, ty + ": plans and draws non-blank frames (sd " + (r.st ? r.st.sd.toFixed(1) : "-") + ")"); ok(Math.max(...r.dd) > 2.5 && Math.min(...r.dd) > 0.05, ty + ": the clip moves (frame difference " + Math.min(...r.dd).toFixed(2) + " to " + Math.max(...r.dd).toFixed(2) + ")");
    ok(r.calls < 900, ty + ": draw calls per frame under 900 (" + r.calls + ")"); ok(r.med < 25, ty + ": frame cost under 25 ms on high, 25th percentile so other processes on the machine do not decide it (" + r.med.toFixed(1) + ")"); ok(r.lit, ty + ": takes the photos' light plan"); worst = Math.max(worst, r.calls);
  }
  ok(missing.length <= 1, "a place and a moment was found for the clips (missing: " + (missing.join(",") || "none") + ")");
  console.log("   worst draw calls across the moment clips: " + worst);
  await ev(`TLXGR.forceW = false; TLXGR.hold = false; true`);
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
  ok(await J(`!TLXRL.play`), "no reel plays on the Local tab (its pictures are Gram's own stills)");
  await ev(`TLXGR.setTab("local"); true`); await sleep(1500); const nf = await J(`TLXRL.renders`);
  ok((await J(`!TLXRL.play`)), "nothing plays on the Local tab");
  // make sure there are reels
  const count = await J(`TLXRL.list().length`);
  if (count < 4) { await ev(`(() => { const recs = ${JSON.stringify(Object.values(REC).slice(0, 6))}; for (const r of recs) TLXRL.add({ who: r.who, t: GS.hour - 1, vid: r.vid, place: r.place, ty: r.ty, sd: r.sd, x: r.x, z: r.z, a: r.a, k: r.k, h: r.h, s: r.s, cap: "Reel " + r.ty }); return 1; })()`); }
  await ev(`TLXRL.cur = 0; TLXRL.planned0 = 0; true`);
  const pl0 = await J(`TLXRL.planned || 0`); await ev(`TLXGR.setTab("reels"); true`); await sleep(2500);
  const r1 = await J(`({ playing: !!TLXRL.play, id: TLXRL.play && TLXRL.play.rec.id, cur: TLXRL.current().id, renders: TLXRL.renders, live: TLXRL.live, planned: TLXRL.planned || 0 })`);
  ok(r1.playing && r1.id === r1.cur && r1.renders > nf, `on the Reels tab with the tablet up the current reel plays and renders (${r1.renders - nf} frames in 2.5 s)`);
  ok(r1.live === 1, "one reel at a time: " + r1.live);
  ok(r1.planned - pl0 === 1, `only the current reel was planned and built (${r1.planned - pl0}); the next is prepared ahead and only drawn once scrolled to`);
  ok(await J(`!!(TLXRL.next && TLXRL.next.Sc && TLXRL.next.id === TLXRL.list()[TLXRL.cur + 1].id)`), "the next reel is prepared ahead while this one plays (planned, cast built, materials compiled)");
  const lk = await J(`(() => { const rec = TLXRL.current(), q = () => document.querySelector("#tabS [data-rlk]"), a = rec.lk; q().click(); const b = rec.lk, m = rec.my; q().click(); return [a, b, m, rec.lk, rec.my]; })()`);
  ok(lk[1] === lk[0] + 1 && lk[2] === 1 && lk[3] === lk[0] && lk[4] === 0, `a like on the reel counts and toggles back (${lk.join(",")})`);
  await ev(`document.querySelector("#tabS [data-rlcm]").click(); true`); await sleep(400);
  ok(await J(`!!document.querySelector("#tabS .gsheet") && TLXGR.view.sheet < 0 && !!TLXRL.play`), "the comments sheet opens over the reel, which goes on playing beneath it");
  await ev(`document.getElementById("gsClose").click(); true`); await sleep(300); ok(await J(`!document.querySelector("#tabS .gsheet") && !TLXGR.view.sheet`), "and closes");
  await ev(`TLXRL.go(1); true`); await sleep(1500);
  const r2 = await J(`({ id: TLXRL.play && TLXRL.play.rec.id, cur: TLXRL.current().id, planned: TLXRL.planned || 0, max: TLXRL.maxLive })`);
  ok(r2.id === r2.cur && r2.id !== r1.id && r2.planned - r1.planned === 1 && r2.max <= 1, `scrolling to the next plans exactly that one and stops the last (live max ${r2.max})`);
  ok(await J(`(TLXRL.usedNext || 0) >= 1`), "scrolling to it played from the prepared plan");
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
  const txt = {}; for (const [dev, pad] of [["kbm", "xbox"], ["pad", "ps"], ["touch", "xbox"]]) { await ev(`INP.dev = ${JSON.stringify(dev)}; INP.pad = ${JSON.stringify(pad)}; TLX.api.TABLET.refresh("gram"); true`); await sleep(250); txt[dev] = await ev(`(() => { const c = document.getElementById("tabV").cloneNode(true); for (const h of c.querySelectorAll(".ghint")) h.remove(); return c.textContent; })().replace(/\\s+/g, " ").replace(/\\d+ (min|h) ago|now|yesterday|\\d+ d ago/g, "")`); }
  ok(txt.kbm === txt.pad && txt.pad === txt.touch && txt.kbm.length > 60, "the Reels tab reads the same under keyboard, pad and touch (no key names in its text)");
  await send("Emulation.setTouchEmulationEnabled", { enabled: false }); await ev(`INP.dev = "kbm"; TLX.api.TABLET.close(true); true`);
  // the badge
  await ev(`(() => { const s = TLX.state("gram"); for (const r of s.reels.list) r.sn = 1; return 1; })()`);
  const u0 = await J(`TLXRL.unseen()`); await ev(`(() => { const r = ${JSON.stringify(Object.values(REC)[2])}; TLXRL.add({ who: r.who, t: GS.hour, vid: r.vid, place: r.place, ty: r.ty, sd: r.sd, x: r.x, z: r.z, a: r.a, k: r.k, h: r.h, s: r.s, cap: "New one" }); return 1; })()`);
  const u1 = await J(`TLXRL.unseen()`); ok(u0 === 0 && u1 === 1, `a new reel is an unseen badge (${u0} -> ${u1})`);
  await ev(`TLXGR.fpsOk = false; TLX.api.TABLET.toggle(true, "gram"); TLXGR.setTab("local"); true`); await sleep(500);
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
  // (the first build staged a feed here; the Local tab is shot by gram_scroll)
  await ev(`FOOT.on = true; TLXGR.fpsOk = true; GS.hour = 700.5; TLX.api.TABLET.toggle(true, "gram"); TLXGR.setTab("local"); true`); await sleep(500);

  await sleep(1500); await shot("gram_local_top", 90);




  // the Reels tab: reels of three types, a frame each
  await ev(`(() => { const s = TLX.state("gram"); s.reels.list = []; const recs = ${JSON.stringify(["reindeer", "summit", "lakerace"].map(k => REC[k]).filter(Boolean))}; for (const r of recs) TLXRL.add({ who: r.who, t: GS.hour - 1, vid: r.vid, place: r.place, ty: r.ty, sd: r.sd, x: r.x, z: r.z, a: r.a, k: r.k, h: r.h, s: r.s, cap: "A reel of the " + r.ty }); TLXRL.cur = 0; TLXGR.setTab("reels"); return 1; })()`); await sleep(2500); await shot("reels_tab", 90);
  await ev(`TLX.api.TABLET.close(true); TLXRL.force = null; FOOT.on = false; true`);
});

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
await done(fails ? 1 : 0);

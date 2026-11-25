// G9 slice A1: armed work (tlx-armed.js v1): armed courier runs, guard shifts, armed standing, the Vakt app. Asserts, exit 1 on a failure.
//  1 LOCKED   no licence / no rifle / fines over the limit / the licence option off: each its own line, on the cards and in qual().
//  2 COURIER  a real board offer: accept in the app, a Jobs row on the pickup then on the drop (compass follows when tracked), TAKE CASE,
//             HAND OVER, paid (payNow), standing up overall and with the employer, a news post.
//  3 RIFLE    the rifle gone from the pack mid-run fails the run (clear toast, standing down).
//  4 CRASH    a soft tumble keeps the case, a hard crash loses it.
//  5 TAIL     a forced tail spawns 100+ m back along your tracks, never within 40 m of you, settles 40-80 m behind and follows; it gives up when
//             you hold your pace; a second run outpaces it; a third stands still and the case is snatched. LOS: losClear on a hill.
//  6 SHIFT    the built post (meshes) is there while the job is live and gone after; the clock runs in game time; every event of the table is
//             forced and answered the right way (pay up, standing up) or the wrong way (pay down, standing down); figures walk in without
//             a jump; leaving the perimeter past the grace fails the shift; a short shift finishes and pays.
//  7 SAVE     a reload mid-run and mid-shift resumes (post rebuilt, clock kept).
//  8 OLD SAVE a save without x.sys.armed loads empty.
//  9 OPTION   armedwork off: no offers (the app says so), accept refused, no Jobs row, an active job is dropped.
// 10 PROMPTS  keyboard (E), pad (L3) and touch (the pill) name the verb and do it.
// Time: events run in a time-lapse (TUNE.evK = 3) so the table fits in a few minutes; the gait strip is shot at evK 1. The tail's patience
// is shortened (TUNE.patience = 12 s) so a run needs 350 m of line, not 900; the constants are otherwise the game's.
// Stills (OUT): a guard post by day and night, a prowler walking in (6 frames, 0.1 s apart, side-on), the tail sled behind the player, the
// Vakt app's two tabs.
import { boot, ev, raw, tap, down, up, sleep, done, shot, park, reload, padSet, padOff } from "../lib.mjs";
import fs from "node:fs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const NOSTILLS = !!process.env.NOSTILLS, OUTD = process.env.OUT || "./shots";
const still = async name => { if (!NOSTILLS) await shot(name); };
const section = async (n, f) => { if (process.env.ONLY && !new RegExp(process.env.ONLY).test(n)) return; console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 400)); } };
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80);
  return true; })()`);
const clock = () => ev("gameClock");
async function until(expr, secs, ms = 120) { const t0 = await clock(); while ((await clock()) - t0 < secs) { if (await ev(expr)) return true; await sleep(ms); } return !!(await ev(expr)); }
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(80); }
const hudIs = async (re, secs = 8) => { await until(`/${re}/.test(TLXAW.hud())`, secs); return J(`TLXAW.hud()`); };
const act = () => J(`(() => { const a = TLXAW.S().active; return a ? { id: a.id, type: a.type, state: a.state, padj: a.padj, stadj: a.stadj, kind: a.kind || a.post, emp: a.emp, h0: a.h0, len: a.len, pay: a.pay, tail: a.tail } : null; })()`);
const stand = () => J(`TLXAW.standing()`);
const KIT = `(() => {
  window.__q = (lic, rifle, owed) => { const g = TLXGUN, s = g.state(); s.licence = !!lic; s.owned = rifle ? [g.newGun(g.FRAMES[0].id)] : []; s.cur = rifle ? 0 : -1; TLXP.S().owed = owed || 0; return true; };
  window.__site = id => { const s = SITES.find(q => q.id === id); return { x: Math.round(s.x), z: Math.round(s.z), y: Math.round(s.y || 0), name: s.name }; };
  window.__plant = (o) => { const S = TLXAW.S(); S.active = null; const base = o.type === "shift" ? { type: "shift", emp: TLXAW.postDef(o.post).emp, spot: TLXAW.spotOf(o.post), len: 3, pay: 255, n: 3 } : { type: "courier", emp: TLXAW.CASES.find(c => c.kind === o.kind).emp, dist: Math.round(Math.hypot(o.to.x - o.from.x, o.to.z - o.from.z)), pay: 300, limH: 3, tail: false };
    const c = Object.assign({ id: "t" + Math.random().toString(36).slice(2, 7) }, base, o); S.offers = [c]; return c.id; };
  window.__at = (p, dx, dz) => { FOOT.on = true; FOOT.x = p.x + (dx || 0); FOOT.z = p.z + (dz || 0); FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = FOOT.fwd = 0; camState.init = false; if (FOOT.g) FOOT.g.visible = true; return true; };
  window.__far = (sp, d) => { for (let a = 0; a < 6.28; a += 0.3) { const x = sp.x + Math.cos(a) * d, z = sp.z + Math.sin(a) * d; if (!isSea(x, z) && !isWater(x, z)) return [Math.cos(a) * d, Math.sin(a) * d]; } return [d, 0]; };
  window.__ride = (x, z) => { crashCancel(); FOOT.on = false; P.x = x; P.z = z; P.y = surf(x, z) + 0.3; P.vx = P.vz = P.vy = 0; recenter(x, z, true); return true; };
  window.__line = (len) => { const dep = depot, okp = (x, z) => !isSea(x, z) && !isWater(x, z);
    for (let r = 200; r < 2600; r += 150) for (let a = 0; a < 6.28; a += 0.4) { const x0 = dep.x + Math.cos(a) * r, z0 = dep.z + Math.sin(a) * r; if (!okp(x0, z0)) continue;
      for (let h = 0; h < 6.28; h += 0.35) { const dx = Math.cos(h), dz = Math.sin(h); let good = true, y0 = surf(x0, z0);
        for (let d = 0; d <= len && good; d += 12) { const x = x0 + dx * d, z = z0 + dz * d; if (!okp(x, z) || Math.abs(surf(x, z) - y0) > 22) good = false; else if (d >= 60 && !TLXAW.losClear({ x: x - dx * 60, z: z - dz * 60 }, { x, z })) good = false; }
        if (good) return { x: x0, z: z0, dx, dz }; } }
    return null; };
  window.__pup = (x, z, dx, dz, v) => { window.__pupOn = true; window.__pupV = v; let last = gameClock;
    const step = () => { if (!window.__pupOn) return; const t = gameClock, dt = Math.min(0.1, t - last); last = t; const sp = window.__pupV;
      if (dt > 0) { x += dx * sp * dt; z += dz * sp * dt; P.x = x; P.z = z; P.y = surf(x, z) + 0.3; P.vx = dx * sp; P.vz = dz * sp; P.vy = 0; P.yaw = Math.atan2(dx, dz); window.__pupPos = { x, z }; }
      requestAnimationFrame(step); };
    requestAnimationFrame(step); return true; };
  window.__rec = () => { window.__tr = []; clearInterval(window.__trI); window.__trI = setInterval(() => { const T = TLXAW.TAIL, p = window.__pupPos || { x: P.x, z: P.z }; window.__tr.push({ t: gameClock, on: T.on, mode: T.mode, gap: T.gap, why: T.why || "", d: T.on && T.px !== undefined ? Math.hypot(T.px - P.x, T.pz - P.z) : -1, v: window.__pupV }); }, 100); return true; };
  clearInterval(window.__warm); window.__warm = setInterval(() => { GS.warmth = 100; GS.health = 100; }, 400);   // a scenario stands still for minutes: the cold is not what is tested
  window.__camF = null; window.__capOn = false; window.__caps = [];
  if (!window.__hk) { window.__hk = true; const r = renderer.render.bind(renderer);
    renderer.render = (s, c) => { if (window.__camF) { const k = window.__camF(); if (k) { if (k.fov && c.fov !== k.fov) { window.__fov0 = window.__fov0 || c.fov; c.fov = k.fov; c.updateProjectionMatrix(); } c.position.set(k.x, k.y, k.z); c.lookAt(k.lx, k.ly, k.lz); } }
      r(s, c);
      if (window.__capOn && gameClock - window.__capLast >= window.__capDt) { window.__caps.push(renderer.domElement.toDataURL("image/jpeg", 0.88)); window.__capLast = gameClock; if (window.__caps.length >= window.__capN) window.__capOn = false; } }; }
  window.__camOff = () => { window.__camF = null; const c = camera; if (window.__fov0) { c.fov = window.__fov0; c.updateProjectionMatrix(); } return true; };
  return true; })()`;
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 36; TLX.setOn("police", false); TLX.setOn("traffic", false); TLX.setOn("armedwork", true); TLXAW.TUNE.evK = 1; TLXAW.TUNE.patience = 12; true`;
const post = id => ev(`(() => { return TLXAW.accept(${JSON.stringify(id)}); })()`);
async function openApp(tab) { await ev(`TABLET.toggle(true, "armed"); true`); await sleep(500); if (tab) { await ev(`(() => { const b = document.querySelector("#tabS [data-act='awtab:${tab}']"); if (b) b.click(); return true; })()`); await sleep(300); } return J(`$("tabS").textContent`); }
async function closeApp() { await ev(`TABLET.close(true); true`); await sleep(200); }
// frames of a moving subject, 0.1 s of game time apart, as a strip of crops
const hiGfx = () => ev(`QG.on = false; renderer.setPixelRatio(1.5); true`);
async function strip(name, camExpr, n = 6, crop = [0.3, 0.08, 0.4, 0.84]) {
  await hiGfx();
  await ev(`window.__camF = ${camExpr}; true`); await sleep(500);
  await ev(`window.__caps = []; window.__capLast = gameClock - 1; window.__capDt = 0.1; window.__capN = ${n}; window.__capOn = true; true`);
  for (let i = 0; i < 60 && (await ev("window.__capOn")); i++) await sleep(100);
  const caps = await J("window.__caps"); await ev(`window.__camOff(); true`);
  const dir = OUTD + "/" + name + "_frames"; fs.mkdirSync(dir, { recursive: true });
  caps.forEach((d, i) => fs.writeFileSync(dir + "/f" + i + ".jpg", Buffer.from(d.split(",")[1], "base64")));
  fs.writeFileSync(dir + "/crop.txt", crop.join(","));
  return caps.length;
}

await boot();
await ev(SETUP); await sleep(700); await ev(KIT); await clearToasts();
// a clean slate (a fresh game: nothing owned)
ok(await ev(`typeof TLXAW === "object" && !!TLX.state("armed")`), "tlx-armed loaded, state present");

await section("1 locked", async () => {
  await ev(`__q(false, false, 0); true`);
  let q = await J(`TLXAW.qual()`);
  ok(!q.ok && q.miss.length === 2 && /hunter's licence/.test(q.miss[0]) && /rifle of your own/.test(q.miss[1]), "no licence, no rifle: two lines, " + JSON.stringify(q.miss.map(m => m.slice(0, 30))));
  ok(await ev(`TLXAW.refreshOffers(true) || true`) && (await J(`TLXAW.S().offers.length`)) >= 3 && (await J(`TLXAW.S().offers.length`)) <= 5, "the board has 3 to 5 offers: " + (await J(`TLXAW.S().offers.length`)));
  let txt = await openApp("work"); console.log("  app:", txt.slice(0, 220));
  ok(/Not qualified yet/.test(txt) && /hunter's licence/.test(txt) && /rifle of your own/.test(txt) && /LOCKED/.test(txt), "the Work tab says what is missing on the cards (licence, rifle) and the buttons read LOCKED");
  ok((await post((await J(`TLXAW.S().offers[0].id`)))) === "locked", "accept is refused while locked");
  await closeApp();
  await ev(`__q(true, false, 0); true`); q = await J(`TLXAW.qual()`);
  ok(!q.ok && q.miss.length === 1 && /rifle of your own/.test(q.miss[0]), "licence, no rifle: only the rifle line");
  await ev(`__q(false, true, 0); true`); q = await J(`TLXAW.qual()`);
  ok(!q.ok && q.miss.length === 1 && /hunter's licence/.test(q.miss[0]), "rifle, no licence: only the licence line");
  await ev(`__q(true, true, 450); true`); q = await J(`TLXAW.qual()`);
  ok(!q.ok && q.miss.length === 1 && /fines owed \$450.*\$300/.test(q.miss[0]), "fines owed over the limit: its own line: " + (q.miss[0] || "").slice(0, 80));
  await ev(`__q(true, true, 300); true`); q = await J(`TLXAW.qual()`);
  ok(q.ok, "fines owed exactly at the limit: still qualified");
  await ev(`TLX.setOn("huntlic", false); __q(false, true, 0); true`); q = await J(`TLXAW.qual()`);
  ok(q.ok, "huntlic option off: a rifle alone qualifies");
  await ev(`TLX.setOn("huntlic", true); __q(true, true, 0); true`); q = await J(`TLXAW.qual()`);
  ok(q.ok, "licence + rifle + clean record: qualified");
});

await section("2 courier", async () => {
  await ev(`GS.hour = 36; TLXAW.refreshOffers(true); true`);
  const o = await J(`TLXAW.S().offers.find(o => o.type === "courier")`);
  ok(o && o.from && o.to && o.dist >= 500 && o.pay > 0 && o.limH > 0, `a real courier offer: ${o && o.kind} ${o && o.from.name} -> ${o && o.to.name}, ${o && o.dist} m, $${o && o.pay}, ${o && o.limH} h`);
  const kinds = await J(`TLXAW.CASES.map(c => c.kind)`); ok(kinds.length >= 4, "at least 4 case kinds: " + kinds.join(", "));
  const st0 = await stand(), cash0 = await J(`GS.cash`), payE = await J(`TLXAW.payNow(TLXAW.S().offers.find(o => o.id === "${o.id}"))`);
  await openApp("work"); await ev(`document.querySelector("#tabS [data-act='awacc:${o.id}']").click(); true`); await sleep(400);
  let a = await act(); ok(a && a.id === o.id && a.state === "collect", "accepted from the app: collecting");
  let rows = await J(`jobsList().filter(r => r.kind === "armed").map(r => ({ x: r.tgt.x, z: r.tgt.z, title: r.title, pay: r.pay }))`);
  ok(rows.length === 1 && rows[0].x === o.from.x && rows[0].z === o.from.z, "the Jobs app has a row; the target is the pickup: " + JSON.stringify(rows[0]));
  await ev(`jobTrack(jobsList().find(r => r.kind === "armed").obj); true`); await sleep(500);
  const jt = await J(`({ t: $("jobTitle").textContent, sub: $("jobSub").textContent })`); console.log("  compass:", jt.t, "|", jt.sub);
  ok(/Collect/.test(jt.t), "tracked: the compass reads the job");
  await closeApp();
  await ev(`__at({ x: ${o.from.x}, z: ${o.from.z} }, 4, 0); true`); await sleep(500);
  await hudIs("collect at"); await until(`$("wnHint").textContent.includes("take the case")`, 6);
  let fu = await J(`({ use: footUse(), hint: $("wnHint").textContent, hud: TLXAW.hud() })`); console.log("  at pickup:", JSON.stringify(fu));
  ok(fu.use === "TAKE CASE" && /E: take the case/.test(fu.hint), "at the pickup the use control reads TAKE CASE (keyboard: " + fu.hint + ")");
  ok(/ARMED COURIER · collect at/.test(fu.hud), "the HUD line: " + fu.hud.split("\n")[0]);
  await clearToasts(); await tap("KeyE"); await sleep(500);
  a = await act(); ok(a && a.state === "carry", "E takes the case");
  rows = await J(`jobsList().filter(r => r.kind === "armed").map(r => ({ x: r.tgt.x, z: r.tgt.z, title: r.title }))`);
  ok(rows.length === 1 && rows[0].x === o.to.x && rows[0].z === o.to.z && /Armed courier/.test(rows[0].title), "the row's target moved to the drop: " + rows[0].title);
  await sleep(500); ok(/Armed courier/.test(await J(`$("jobTitle").textContent`)), "the compass follows it to the drop");
  const hud = await hudIs("rifle stays on your back"); ok(/left/.test(hud) && /rifle stays on your back/.test(hud), "the HUD names the time left and the rifle rule: " + hud.replace(/\n/g, " | "));
  await ev(`__at({ x: ${o.to.x}, z: ${o.to.z} }, 3, 0); true`); await sleep(500);
  fu = await J(`({ use: footUse(), hint: $("wnHint").textContent })`);
  ok(fu.use === "HAND OVER" && /E: hand the case over/.test(fu.hint), "at the drop: HAND OVER, " + fu.hint);
  await clearToasts(); await tap("KeyE"); await sleep(600);
  const st1 = await stand(), cash1 = await J(`GS.cash`), tl = await toasts();
  ok((await act()) === null, "handed over: the job is done");
  ok(Math.abs(cash1 - cash0 - payE) < 1.5, `paid ${cash1 - cash0} (expected ${payE})`);
  ok(st1.all === st0.all + 3 && (st1.emp[o.emp] || 0) === (st0.emp[o.emp] || 0) + 3, `standing up: overall ${st0.all} -> ${st1.all}, ${o.emp} ${(st0.emp[o.emp] || 0)} -> ${st1.emp[o.emp]}`);
  ok(tl.some(t => /delivered at/.test(t)), "toast: " + (tl.find(t => /delivered/.test(t)) || "").slice(0, 100));
  ok(await J(`TLXN.all().some(p => p.kind === "armed" && p.data.ok === true)`), "a news post went out");
  ok((await J(`jobsList().filter(r => r.kind === "armed").length`)) === 0, "the Jobs row is gone");
});

// a planted courier job between real sites (so the later sections need no board)
const plantCourier = async (kind = "payroll", extra = {}) => {
  const from = await J(`__site("depot")`), to = await J(`__site("mehamn")`);
  from.name = "Kjøllefjord quay";
  const id = await ev(`__plant(Object.assign({ kind: ${JSON.stringify(kind)}, from: ${JSON.stringify(from)}, to: ${JSON.stringify(to)} }, ${JSON.stringify(extra)}))`);
  return { id, from, to };
};
const takeIt = async (from) => { await ev(`__at({ x: ${from.x}, z: ${from.z} }, 4, 0); true`); await sleep(400); await tap("KeyE"); await sleep(500); };

await section("3 rifle", async () => {
  await ev(`__q(true, true, 0); true`);
  const c = await plantCourier(); ok((await post(c.id)) === "ok", "accepted");
  await takeIt(c.from); ok((await act()).state === "carry", "case taken");
  const s0 = await stand(); await clearToasts();
  await ev(`TLXGUN.state().cur = -1; true`); await sleep(500);
  const tl = await toasts(), s1 = await stand();
  ok((await act()) === null && tl.some(t => /rifle is no longer on your back/.test(t)), "rifle gone: the run is withdrawn with a clear toast: " + (tl.find(t => /rifle/.test(t)) || "").slice(0, 100));
  ok(s1.all < s0.all || s0.all === 0, `standing down (${s0.all} -> ${s1.all})`);
  await ev(`__q(true, true, 0); true`);
});

await section("4 crash", async () => {
  const c = await plantCourier("pharmacy"); await post(c.id); await takeIt(c.from);
  await ev(`__ride(${c.from.x} + 30, ${c.from.z} + 30); P.yaw = 0; true`); await sleep(500);
  ok(await ev(`crashEject("test", 0, 0, 3, null) === true`), "a soft tumble (3 m/s)"); await sleep(500);
  ok((await act()).state === "carry", "a soft tumble keeps the case");
  await ev(`crashCancel(); true`); await sleep(300);
  await clearToasts(); ok(await ev(`(() => { P.vz = 20; return crashEject("test", 0, 1, 20, null) === true; })()`), "a hard crash (20 m/s)"); await sleep(500);
  const tl = await toasts(); ok((await act()) === null && tl.some(t => /came off hard: the case is lost/.test(t)), "the hard crash loses the case: " + (tl.find(t => /lost/.test(t)) || "").slice(0, 100));
  await ev(`crashCancel(); true`);
});

await section("5 tail", async () => {
  const L = await J(`__line(760)`); ok(!!L, "found a flat dry line 760 m long: " + JSON.stringify(L && { x: Math.round(L.x), z: Math.round(L.z) }));
  if (!L) return;
  // LOS: a hill between two points breaks it, open ground does not
  const los = await J(`(() => { const out = { open: null, blocked: null }; for (let k = 0; k < 4000 && (out.open === null || out.blocked === null); k++) { const x = depot.x + (Math.random() - 0.5) * 6000, z = depot.z + (Math.random() - 0.5) * 6000, a = Math.random() * 6.28, A = { x, z }, B = { x: x + Math.cos(a) * 90, z: z + Math.sin(a) * 90 }; if (isSea(A.x, A.z) || isSea(B.x, B.z)) continue; const m = { x: (A.x + B.x) / 2, z: (A.z + B.z) / 2 }, l = TLXAW.losClear(A, B); if (l && out.open === null && Math.abs(surf(m.x, m.z) - surf(A.x, A.z)) < 1) out.open = true; if (!l && out.blocked === null) out.blocked = true; } return out; })()`);
  ok(los.open === true && los.blocked === true, "line of sight: found open ground that sees and a rise that blocks");
  const run = async (speed, mode, wantWhy, secs, still) => {
    await ev(`__q(true, true, 0); TLXAW.force({ tail: true }); true`);
    const c = await plantCourier("evidence"); await post(c.id); await takeIt(c.from);
    await ev(`__ride(${L.x}, ${L.z}); P.yaw = Math.atan2(${L.dx}, ${L.dz}); true`); await sleep(400);
    await clearToasts(); await ev(`__rec(); __pup(${L.x}, ${L.z}, ${L.dx}, ${L.dz}, ${speed}); true`);
    return c;
  };
  // A: hold pace: it spawns far back, follows at 40-80 m, gives up
  await run(13, "paced");
  const gotTail = await until(`TLXAW.TAIL.on`, 40);
  ok(gotTail, "the tail came after the first 190 m of your tracks");
  if (gotTail) {
    await sleep(300);
    const first = await J(`window.__tr.find(r => r.on)`); ok(first && first.d >= 100, `it arrives from distance: first seen ${first && first.d.toFixed(0)} m behind (>= 40 required)`);
    await until(`TLXAW.TAIL.gap <= TLXAW.TAIL.G + 6`, 40); await waitGame(1);
    const s = await J(`({ gap: TLXAW.TAIL.gap, G: TLXAW.TAIL.G, vis: TLXAW.TAIL.R.g.visible, ph: window.__tr.filter(r => r.on && r.mode === "follow").map(r => r.d) })`);
    ok(s.gap >= 38 && s.gap <= 82 && s.vis, `it settles ${s.gap.toFixed(0)} m back (the gap it keeps is ${s.G.toFixed(0)} m) and is drawn`);
    ok((await hudIs("A sled has been behind you", 6)).includes("A sled has been behind you"), "the HUD says so");
    if (!NOSTILLS) {
      await hiGfx();
      // close: the tail sled and its rider, from beside and behind it
      await ev(`window.__camF = () => { const T = TLXAW.TAIL; if (!T.on || T.px === undefined) return null; const y = T.yaw, fx = Math.sin(y), fz = Math.cos(y), rx = Math.cos(y), rz = -Math.sin(y); return { x: T.px - fx * 7 + rx * 4.2, y: surf(T.px, T.pz) + 1.9, z: T.pz - fz * 7 + rz * 4.2, lx: T.px, ly: surf(T.px, T.pz) + 0.9, lz: T.pz }; }; true`); await sleep(900); await shot("a1_tail_close");
      // behind: the whole picture, the rider on your line and you ahead of it
      await ev(`window.__camF = () => { const T = TLXAW.TAIL; if (!T.on || T.px === undefined) return null; const y = T.yaw, fx = Math.sin(y), fz = Math.cos(y); return { x: T.px - fx * 14, y: surf(T.px, T.pz) + 3.4, z: T.pz - fz * 14, lx: T.px + (P.x - T.px) * 0.5, ly: surf(P.x, P.z) + 1.0, lz: T.pz + (P.z - T.pz) * 0.5, fov: 42 }; }; true`); await sleep(900); await shot("a1_tail_behind"); await ev(`window.__camOff(); true`);
    }
    await until(`TLXAW.TAIL.mode === "away" || !TLXAW.TAIL.on`, 60);
    const t = await J(`({ on: TLXAW.TAIL.on, mode: TLXAW.TAIL.mode, why: TLXAW.TAIL.why || "", j: TLXAW.S().active && TLXAW.S().active.tailGone })`);
    const tl = await toasts();
    ok((t.mode === "away" || !t.on) && tl.some(t2 => /has given up: you held your line/.test(t2)), "holding the pace made it give up: " + (tl.find(x => /given up/.test(x)) || "").slice(0, 90));
    const mn = await J(`Math.min(...window.__tr.filter(r => r.on).map(r => r.d))`);
    ok(mn >= 38, `never closer than 38 m while you kept moving (min ${mn.toFixed(0)} m)`);
    ok((await act()) && (await act()).state === "carry", "the case is still yours");
  }
  await ev(`window.__pupOn = false; P.vx = P.vz = 0; true`); await sleep(300); await ev(`TLXAW.fail(TLXAW.S().active, "abandon"); true`); await sleep(300);
  // B: outrun it
  await run(25, "outran");
  await until(`TLXAW.TAIL.on`, 40); const got2 = await until(`TLXAW.TAIL.mode === "away" || !TLXAW.TAIL.on`, 30);
  const w2 = await J(`window.__tr.filter(r => r.mode === "away").map(r => r.why)[0]`), tl2 = await toasts();
  ok(got2 && w2 === "outran" && tl2.some(t => /you have left it for dead/.test(t)), "at 25 m/s it is outpaced and falls away: " + w2);
  await ev(`window.__pupOn = false; P.vx = P.vz = 0; true`); await sleep(300); await ev(`TLXAW.fail(TLXAW.S().active, "abandon"); true`); await sleep(300);
  // C: stand still: it catches up and the case is snatched
  await run(13, "snatch");
  await until(`TLXAW.TAIL.on`, 40); await until(`TLXAW.TAIL.gap < 90`, 40);
  await clearToasts(); await ev(`window.__pupV = 0; P.vx = P.vz = 0; true`);
  const sn = await until(`TLXAW.S().active === null`, 40), tl3 = await toasts();
  const rec3 = await J(`window.__tr.filter(r => r.on).map(r => r.d)`);
  ok(sn && tl3.some(t => /it is gone/.test(t)) && Math.min(...rec3) < 12, `stopped on the spot: it closed to ${Math.min(...rec3).toFixed(0)} m and the case was snatched`);
  await ev(`window.__pupOn = false; TLXAW.TAIL.on && TLXAW.S(); true`); await sleep(200);
});

// ---- 6 guard shift
const shiftOn = async (id, len = 3, hr = 36) => {
  await ev(`__q(true, true, 0); GS.hour = ${hr}; true`);
  const sid = await ev(`__plant({ type: "shift", post: ${JSON.stringify(id)}, len: ${len}, n: 3, pay: 255 })`); const r = await post(sid);
  await ev(`(() => { const j = TLXAW.S().active; j.sched = []; return true; })()`);
  return r;
};
const atFar = async d => { const o = await J(`__far(TLXAW.S().active.spot, ${d})`); await atPost(o[0], o[1]); };
const atPost = async (dx = 0, dz = 0) => { await ev(`(() => { const sp = TLXAW.S().active.spot; __at(sp, ${dx}, ${dz}); return true; })()`); await sleep(400); };
const evtRun = async (id, expect, { actFn, label, timeout = 80 } = {}) => {
  const j0 = await act(), s0 = await stand();
  if (!j0) { console.log("  (no active job before " + id + "): " + (await toasts()).slice(-4).join(" | ")); return null; }
  await ev(`TLXAW.evStart(${JSON.stringify(id)}) || false`);
  const started = await ev(`!!TLXAW.EV.cur && TLXAW.EV.cur.id === ${JSON.stringify(id)}`);
  if (!started) { ok(false, id + ": the event did not start"); return null; }
  if (actFn) await actFn();
  const res = await until(`!TLXAW.EV.cur || !!TLXAW.EV.cur.res`, timeout);
  const r = await J(`({ res: TLXAW.EV.cur ? TLXAW.EV.cur.res : (TLXAW.S().active && TLXAW.S().active.log.length ? (TLXAW.S().active.log[TLXAW.S().active.log.length - 1].ok ? "right" : "wrong") : null) })`);
  await until(`!TLXAW.EV.cur`, 40);
  const j1 = await act(); if (!j1) { ok(false, id + ": the shift ended during the event: " + (await toasts()).slice(-4).join(" | ")); return null; }
  const s1 = await stand(), d = j1.padj - j0.padj, ds = (s1.emp[j1.emp] || 0) - (s0.emp[j0.emp] || 0);
  ok(r.res === expect && (expect === "right" ? d > 0 : d < 0), `${id}: handled ${expect === "right" ? "right" : "wrong"}: pay ${d > 0 ? "+" : ""}${d}, standing ${ds >= 0 ? "+" : ""}${ds} (${r.res})`);
  if (expect === "wrong") ok(ds <= 0 && (s1.emp[j1.emp] || 0) <= (s0.emp[j0.emp] || 0), id + ": wrong call: standing does not go up");
  return { d, ds };
};
await section("6 shift: post, clock, perimeter", async () => {
  const ids = await J(`TLXAW.POSTS.map(p => p.id)`); ok(ids.length >= 6, "at least 6 posts: " + ids.join(", "));
  const emps = await J(`TLXAW.POSTS.map(p => TLXAW.EMP[p.emp].state ? "state" : "company")`); ok(emps.filter(e => e === "state").length >= 4 && emps.filter(e => e === "company").length >= 4, "state and company posts: " + emps.join(","));
  const spots = await J(`(() => TLXAW.POSTS.map(p => { const s = TLXAW.spotOf(p.id); if (!s) return { id: p.id, bad: "none" }; const bad = []; if (isSea(s.x, s.z) || isWater(s.x, s.z)) bad.push("water"); if (obNear(s.x, s.z, 8)) bad.push("ob"); if (slopeAt(s.x, s.z, 5) > 0.12) bad.push("slope"); if (KIT.doors.some(d => Math.hypot(d.x - s.x, d.z - s.z) < 25)) bad.push("door"); return { id: p.id, bad: bad.join("+"), sl: +slopeAt(s.x, s.z, 5).toFixed(3) }; }))()`);
  ok(spots.every(s => !s.bad), "every post has a spot: dry, clear, level, off the doors " + JSON.stringify(spots.map(s => s.id + ":" + (s.bad || "ok") + (s.sl !== undefined ? "/" + s.sl : ""))));
  ok(await J(`TLXAW.POSTS.every(p => { const s = TLXAW.spotOf(p.id); return s && Math.abs(s.x) < 4700 && Math.abs(s.z) < 4700; })`), "inside the map");
  // the post exists while the job is live
  ok(!(await ev(`!!TLXAW.post`)), "no post before a job");
  ok((await shiftOn("fish")) === "ok", "accepted a guard shift at the fish plant");
  let P1 = await J(`({ n: TLXAW.post.g.children.length, inScene: scene.children.includes(TLXAW.post.g), x: TLXAW.post.x, z: TLXAW.post.z, y: TLXAW.post.g.position.y, gy: surf(TLXAW.post.x, TLXAW.post.z) })`);
  ok(P1.n >= 12 && P1.inScene && Math.abs(P1.y - P1.gy) < 0.01, `the built post stands while the job is live: ${P1.n} parts in the scene at ground level`);
  ok((await act()).state === "go" && /GUARD SHIFT · The fish plant/.test(await hudIs("GUARD SHIFT · The fish plant")), "before the shift starts: go to the post");
  const row = await J(`jobsList().filter(r => r.kind === "armed").map(r => ({ x: r.tgt.x, z: r.tgt.z, t: r.title }))`);
  ok(row.length === 1 && Math.abs(row[0].x - P1.x) < 1 && Math.abs(row[0].z - P1.z) < 1, "Jobs row targets the post: " + row[0].t);
  await clearToasts(); await atPost(0, 6);
  ok(await until(`TLXAW.S().active && TLXAW.S().active.state === "on"`, 6), "walking onto the post starts the shift");
  await ev(`(() => { const sp = TLXAW.S().active.spot, a = sp.ry + 2.6; __at(sp, Math.sin(sp.ry) * 7, Math.cos(sp.ry) * 7); FOOT.yaw = sp.ry + Math.PI; window.__camF = () => ({ x: FOOT.x + Math.sin(a) * 4.5, y: surf(FOOT.x, FOOT.z) + 2.1, z: FOOT.z + Math.cos(a) * 4.5, lx: sp.x, ly: surf(sp.x, sp.z) + 1.4, lz: sp.z }); return true; })()`); await hiGfx(); await sleep(900); await still("a1_hud_on_post"); await ev(`window.__camOff(); true`);
  await atPost(0, 6);
  await hudIs("GUARD · the fish plant · \\d\\d:\\d\\d to");
  const h0 = await J(`({ gh: GS.hour, hud: TLXAW.hud(), j: TLXAW.S().active.h0 }) `);
  await waitGame(4);
  const h1 = await J(`({ gh: GS.hour, hud: TLXAW.hud() })`);
  const left = t => { const m = /(\d+) h (\d\d)|(\d+) min/.exec(t); return m ? (m[1] !== undefined ? +m[1] * 60 + +m[2] : +m[3]) : -1; };
  ok(h1.gh > h0.gh && left(h1.hud) < left(h0.hud) && left(h0.hud) > 0, `the clock runs in game time: ${h0.hud.split("\n")[0]} -> ${h1.hud.split("\n")[0]}`);
  ok(/GUARD · the fish plant · \d\d:\d\d to \d\d:\d\d/.test(h1.hud), "the clock line names the stretch");
  // leaving the perimeter past the grace fails the shift
  const sA = await stand(); await clearToasts();
  await atFar(40); await waitGame(5);
  ok(/Off the post: back inside/.test(await hudIs("Off the post: back inside", 6)), "outside the ring the HUD counts the grace down");
  await atPost(0, 8); await waitGame(2); ok((await act()) !== null && /On post/.test(await hudIs("On post", 6)), "back inside within the grace: the shift goes on");
  await atFar(40); const gone = await until(`TLXAW.S().active === null`, 20); const tl = await toasts(), sB = await stand();
  ok(gone && tl.some(t => /You left the post/.test(t)), "outside past the grace: the shift fails: " + (tl.find(t => /left the post/.test(t)) || "").slice(0, 80));
  ok(sB.all <= sA.all && (sA.all === 0 || sB.all < sA.all), `standing down (${sA.all} -> ${sB.all})`);
  ok(!(await ev(`!!TLXAW.post`)) && !(await ev(`scene.children.some(c => c.children && c.children.length > 20 && c.position.distanceTo({ x: ${P1.x}, y: ${P1.y}, z: ${P1.z} }) < 0.01)`)), "the post is taken down afterwards (no group left in the scene at its spot)");
});

await section("6b shift: the event table", async () => {
  const ev9 = await J(`Object.keys(TLXAW.EVT)`); ok(ev9.length >= 8, "at least 8 events: " + ev9.join(", "));
  await ev(`TLXAW.TUNE.evK = 3; true`);
  ok((await shiftOn("film", 30)) === "ok", "accepted a shift at the film crew's truck");
  await atPost(0, 5); ok(await until(`TLXAW.S().active.state === "on"`, 6), "on post");
  await sleep(500); await ev(`TLXAW.EV.wait = 0; true`);
  // keep the tally
  await evtRun("prowler", "right", { actFn: async () => { ok(await until(`footUse() === "CHALLENGE"`, 60), "prowler: the use control reads CHALLENGE once he is in range"); await tap("KeyE"); } });
  await waitGame(1);
  await evtRun("prowler", "wrong");
  await evtRun("fox", "right");
  await evtRun("fox", "wrong", { actFn: async () => { ok(await until(`footUse() === "CALL OUT"`, 40), "fox: CALL OUT is offered"); await tap("KeyE"); } });
  await evtRun("lamp", "right", { actFn: async () => { ok(await J(`TLXAW.post.lampOn === false`), "the lamp is out"); await ev(`(() => { const l = TLXAW.post.lamps[0]; __at({ x: l.x, z: l.z }, 2, 0); return true; })()`); ok(await until(`footUse() === "CHANGE BULB"`, 10), "lamp: CHANGE BULB near the pole"); await tap("KeyE"); } });
  ok(await ev(`TLXAW.post.lampOn === true`), "the lamp is back on");
  await atPost(0, 4);
  await evtRun("lamp", "wrong"); ok(await ev(`TLXAW.post.lampOn === true`), "the lamp is restored when the moment passes");
  await evtRun("alarm", "right", { actFn: async () => { await ev(`(() => { const h = TLXAW.post.hut; __at({ x: h.x, z: h.z }, 0, 0); FOOT.x = h.x + 1.5; FOOT.z = h.z + 3.2; return true; })()`); ok(await until(`footUse() === "RESET ALARM"`, 10), "alarm: RESET ALARM at the hut"); await tap("KeyE"); } });
  await atPost(0, 4);
  await evtRun("alarm", "wrong");
  await evtRun("drunk", "right", { actFn: async () => { ok(await until(`footUse() === "SEE HIM HOME"`, 60), "drunk: SEE HIM HOME offered"); await tap("KeyE"); } });
  await evtRun("drunk", "wrong", { timeout: 120 });
  await evtRun("delivery", "wrong", { timeout: 120 });
  await evtRun("delivery", "right", { actFn: async () => { ok(await until(`footUse() === "SIGN FOR IT"`, 60), "delivery: SIGN FOR IT offered"); await tap("KeyE"); } });
  await evtRun("nolights", "right", { actFn: async () => { await until(`(() => { const f = TLXAW.EV.cur.f, sp = TLXAW.S().active.spot; return Math.hypot(f.o.x - sp.x, f.o.z - sp.z) < 60; })()`, 40); await ev(`(() => { const e = TLXAW.EV.cur, sp = TLXAW.S().active.spot; __at(sp, e.dx * 12, e.dz * 12); return true; })()`); } });
  await atPost(0, 4);
  await evtRun("nolights", "wrong", { timeout: 90 });
  await evtRun("quiet", "right", { timeout: 60 });
  await evtRun("quiet", "wrong", { actFn: async () => { await atFar(16); } });
  await atPost(0, 4);
  const a = await act(), log = await J(`TLXAW.S().active.log`);
  ok(log.length >= 16 && log.filter(l => l.ok).length >= 8 && log.filter(l => !l.ok).length >= 8, `the shift's log: ${log.filter(l => l.ok).length} right, ${log.filter(l => !l.ok).length} wrong, pay adjustment ${a.padj}`);
  // the walkers' motion: a prowler at the real pace: per-frame steps small (no jump), and a strip of the gait
  // back to the middle of the day for the gait strip (the shift's own clock moves with it)
  await ev(`(() => { const j = TLXAW.S().active, d = 36.45 - GS.hour; j.h0 += d; j.lastH += d; GS.hour = 36.45; return true; })()`);
  await ev(`TLXAW.TUNE.evK = 1; window.__fs = []; true`);
  await ev(`TLXAW.EV.wait = 0; TLXAW.evStart("prowler"); (() => { clearInterval(window.__fsI); window.__fsI = setInterval(() => { const e = TLXAW.EV.cur; if (e && e.f && e.f.g) window.__fs.push({ t: gameClock, x: e.f.o.x, z: e.f.o.z, v: e.f.v }); }, 20); return true; })()`);
  await until(`!!TLXAW.EV.cur && !!TLXAW.EV.cur.f && Math.hypot(TLXAW.EV.cur.f.o.x - TLXAW.post.x, TLXAW.EV.cur.f.o.z - TLXAW.post.z) < 13.5`, 80);
  const n = await strip("a1_prowler_strip", `() => { const e = TLXAW.EV.cur; if (!e || !e.f) return null; const f = e.f.o, y = f.yaw, c = Math.cos(y), s = Math.sin(y); return { x: f.x + c * 4.4, y: surf(f.x, f.z) + 1.25, z: f.z - s * 4.4, lx: f.x, ly: surf(f.x, f.z) + 0.95, lz: f.z, fov: 38 }; }`);
  ok(n === 6, "a 6-frame strip taken 0.1 s apart");
  await until(`!TLXAW.EV.cur || TLXAW.EV.cur.ph === "try"`, 60);
  const fs2 = await J(`window.__fs`); let maxStep = 0, maxV = 0; for (let i = 1; i < fs2.length; i++) { const dt = fs2[i].t - fs2[i - 1].t; if (dt > 0 && dt < 0.5) { maxStep = Math.max(maxStep, Math.hypot(fs2[i].x - fs2[i - 1].x, fs2[i].z - fs2[i - 1].z)); maxV = Math.max(maxV, Math.hypot(fs2[i].x - fs2[i - 1].x, fs2[i].z - fs2[i - 1].z) / dt); } }
  ok(fs2.length > 50 && maxStep < 0.25 && maxV < 1.7, `the prowler walks: ${fs2.length} samples, biggest step ${maxStep.toFixed(3)} m, top speed ${maxV.toFixed(2)} m/s (no teleport, no slide)`);
  await ev(`TLXAW.evEnd(); clearInterval(window.__fsI); TLXAW.TUNE.evK = 3; true`);
  // finish: a short shift pays
  const cash0 = await J(`GS.cash`), s0 = await stand(), j = await act();
  await ev(`(() => { const j = TLXAW.S().active; j.len = GS.hour - j.h0 + 0.05; return true; })()`); await clearToasts();
  const fin = await until(`TLXAW.S().active === null`, 20); const cash1 = await J(`GS.cash`), s1 = await stand(), tl = await toasts();
  const exp = Math.round(Math.max(j.pay * 0.4, j.pay + j.padj) * (await J(`payMul()`)) * (1 + 0.03 * s0.level) / 5) * 5;
  ok(fin && Math.abs(cash1 - cash0 - exp) <= 5 && cash1 > cash0, `the shift finished and paid ${cash1 - cash0} (base ${j.pay}, events ${j.padj}, expected ${exp})`);
  ok(s1.all >= s0.all + 3 && tl.some(t => /Guard shift at the film crew's kit truck|Guard shift at the kit truck done/.test(t) || /Guard shift at .* done/.test(t)), "standing +3 for the finished shift: " + (tl.find(t => /Guard shift at/.test(t)) || "").slice(0, 90));
  ok(!(await ev(`!!TLXAW.post`)), "the post is gone after the shift");
  await ev(`TLXAW.TUNE.evK = 1; true`);
});

await section("6c stills: posts by day and night, the app", async () => {
  if (NOSTILLS) return;
  await hiGfx(); await ev(`(() => { const st = document.createElement("style"); st.id = "__nt2"; st.textContent = "#toasts{display:none!important}"; document.head.appendChild(st); return true; })()`);
  for (const [tag, hr, id] of [["day", 36.5, "fish"], ["night", 46.5, "lighthouse"], ["night2", 46.5, "film"], ["day2", 36.5, "survey"]]) {
    await shiftOn(id, 3, hr); await ev(`(() => { TLXAW.S().active.sched = []; return true; })()`);
    await ev(`(() => { const sp = TLXAW.S().active.spot; __at(sp, Math.sin(sp.ry) * 6, Math.cos(sp.ry) * 6); const a = sp.ry + 0.85; window.__camF = () => ({ x: sp.x + Math.sin(a) * 13, y: surf(sp.x, sp.z) + 3.1, z: sp.z + Math.cos(a) * 13, lx: sp.x, ly: surf(sp.x, sp.z) + 1.2, lz: sp.z }); return true; })()`);
    await sleep(1200); await still(`a1_post_${tag}_${id}`);
    await ev(`window.__camOff(); TLXAW.fail(TLXAW.S().active, "abandon"); true`); await sleep(300);
  }
  await ev(`document.getElementById("__nt2").remove(); GS.hour = 36; true`); await ev(`TLXAW.refreshOffers(true); true`);
  await ev(`(() => { const st = document.createElement("style"); st.id = "__nt"; st.textContent = "#toasts{display:none!important}"; document.head.appendChild(st); FOOT.on = true; return true; })()`); await sleep(500);
  await openApp("work"); await sleep(300); await shot("a1_app_work");
  await openApp("stand"); await sleep(300); await shot("a1_app_standing"); await closeApp(); await ev(`document.getElementById("__nt").remove(); true`);
});

await section("7 save mid-run and mid-shift", async () => {
  await ev(`__q(true, true, 0); GS.hour = 36; true`);
  const c = await plantCourier("firearm"); await post(c.id); await takeIt(c.from);
  const before = await act(); await ev(`save(); true`); await sleep(300);
  await reload(); await sleep(900); await ev(SETUP); await sleep(500); await ev(KIT);
  let a = await act();
  ok(a && a.id === before.id && a.state === "carry" && a.kind === "firearm", "a reload mid-run resumes the courier job (carry): " + JSON.stringify(a));
  ok(/Armed courier|ARMED COURIER/.test(await J(`jobsList().find(r => r.kind === "armed").title + TLXAW.hud()`)), "its Jobs row and HUD are back");
  await ev(`TLXAW.fail(TLXAW.S().active, "abandon"); true`);
  await ev(`__q(true, true, 0); true`);
  await shiftOn("substation", 4); await atPost(0, 5); await until(`TLXAW.S().active.state === "on"`, 6); await waitGame(3);
  const b = await act(); await ev(`save(); true`); await sleep(300);
  await reload(); await sleep(900); await ev(SETUP); await sleep(800); await ev(KIT);
  a = await act();
  ok(a && a.id === b.id && a.state === "on" && Math.abs(a.h0 - b.h0) < 1e-6, `a reload mid-shift resumes it, on the same clock (h0 ${a && a.h0})`);
  ok(await ev(`!!TLXAW.post && scene.children.includes(TLXAW.post.g) && TLXAW.post.g.children.length >= 12`), "the post is rebuilt");
  await ev(`(() => { const sp = TLXAW.S().active.spot; __at(sp, 0, 5); return true; })()`); await waitGame(2);
  ok((await act()) && /GUARD · the substation/.test(await J(`TLXAW.hud()`)), "and the clock line runs again");
  await ev(`TLXAW.fail(TLXAW.S().active, "abandon"); true`);
  const dump = await J(`TLX.dump().sys.armed`); ok(dump && dump.v === 1 && dump.s && dump.s.standing && Array.isArray(dump.s.offers), "x.sys.armed is in the save");
});

await section("8 old save", async () => {
  const raw0 = JSON.parse(await raw(`localStorage.getItem("tracklayer.save.v2")`));
  const old = JSON.parse(JSON.stringify(raw0)); if (old.x && old.x.sys) delete old.x.sys.armed;
  ok(!(old.x && old.x.sys && old.x.sys.armed), "(planted a save without x.sys.armed)");
  await reload(old); await sleep(900); await ev(SETUP); await sleep(500);
  const s = await J(`({ active: TLXAW.S().active, st: TLXAW.S().standing, done: TLXAW.S().rec.done, v: TLX.state("armed") !== null })`);
  ok(s.v && s.active === null && s.st.all === 0 && s.done === 0, "an old save loads with armed work empty");
  await ev(KIT); await ev(`__q(true, true, 0); TLXAW.refreshOffers(true); true`);
  ok((await J(`TLXAW.S().offers.length`)) >= 3, "and the board fills as a new game's does");
});

await section("9 option off", async () => {
  await ev(`__q(true, true, 0); GS.hour = 36; TLXAW.refreshOffers(true); true`);
  const c = await plantCourier("payroll"); await post(c.id); ok((await act()) !== null, "(a job is active)");
  await ev(`TLX.setOn("armedwork", false); true`); await sleep(700);
  ok((await act()) === null && (await J(`jobsList().filter(r => r.kind === "armed").length`)) === 0 && (await J(`TLXAW.hud()`)) === "", "off: the active job is dropped, no Jobs row, no HUD line");
  const txt = await openApp("work"); ok(/switched off/.test(txt) && !/TAKE IT/.test(txt), "the app says armed work is switched off and offers nothing: " + txt.slice(0, 90));
  await ev(`__plant({ kind: "payroll", from: __site("depot"), to: __site("mehamn") }); true`);
  ok((await post("zzz")) === "off", "accept is refused");
  await closeApp();
  await ev(`TLX.setOn("armedwork", true); true`); await sleep(300);
  ok((await openApp("work")).includes("Today's board"), "switched back on: the board is back"); await closeApp();
});

await section("10 prompts: keyboard, pad, touch", async () => {
  await ev(`__q(true, true, 0); TLX.setOn("armedwork", true); GS.hour = 36; true`);
  // touch on the pickup, pad on the drop
  const c = await plantCourier("charts", { to: await J(`__site("depot")`) });
  // a drop near the quay is the town: use a village drop instead
  await ev(`TLXAW.S().offers[0].to = __site("gamvik"); true`);
  const to = await J(`__site("gamvik")`); await post(c.id);
  await ev(`__at({ x: ${c.from.x}, z: ${c.from.z} }, 4, 0); SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(700);
  let s = await J(`({ use: footUse(), tE: $("tcUse").hidden ? null : $("tcUse").textContent, hint: $("wnHint").textContent })`);
  ok(s.tE === "TAKE CASE" && /tap TAKE CASE/.test(s.hint), "touch: the pill reads TAKE CASE, hint: " + s.hint);
  await ev(`(() => { const b = $("tcUse"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return true; })()`);
  await sleep(600); ok((await act()).state === "carry", "touch: tapping the pill takes the case");
  await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; __at({ x: ${to.x}, z: ${to.z} }, 3, 0); INP.dev = "pad"; INP.pad = "xbox"; true`); await sleep(700);
  s = await J(`({ use: footUse(), hint: $("wnHint").textContent })`);
  ok(s.use === "HAND OVER" && /L3: hand the case over/.test(s.hint), "pad: " + s.hint);
  await padSet({ 10: 1 }); await sleep(350); await padSet({}); await sleep(600);
  ok((await act()) === null && (await J(`TLXAW.S().rec.done`)) >= 1, "pad: L3 hands the case over");
  await padOff(); await ev(`INP.dev = "kbm"; true`);
  // events by pad and touch
  await ev(`TLXAW.TUNE.evK = 3; true`);
  await shiftOn("fish"); await atPost(0, 5); await until(`TLXAW.S().active.state === "on"`, 6); await ev(`TLXAW.EV.wait = 0; true`);
  await ev(`TLXAW.evStart("prowler"); INP.dev = "pad"; INP.pad = "xbox"; true`);
  ok(await until(`footUse() === "CHALLENGE"`, 60), "the prowler is in range");
  await sleep(500); s = await J(`({ hint: $("wnHint").textContent })`); ok(/L3: challenge him/.test(s.hint), "pad: " + s.hint);
  await padSet({ 10: 1 }); await sleep(350); await padSet({}); await sleep(500);
  ok(await ev(`!TLXAW.EV.cur || TLXAW.EV.cur.res === "right"`), "pad: L3 challenges him"); await padOff(); await until(`!TLXAW.EV.cur`, 30);
  await ev(`TLXAW.EV.wait = 0; TLXAW.evStart("fox"); SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`);
  ok(await until(`footUse() === "CALL OUT"`, 40), "the fox is in range"); await sleep(400);
  s = await J(`({ tE: $("tcUse").hidden ? null : $("tcUse").textContent, hint: $("wnHint").textContent })`);
  ok(s.tE === "CALL OUT" && /tap CALL OUT/.test(s.hint), "touch: " + s.tE + " / " + s.hint);
  await ev(`(() => { const b = $("tcUse"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 8, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 8, pointerType: "touch" })); return true; })()`);
  await sleep(500); ok(await ev(`!TLXAW.EV.cur || TLXAW.EV.cur.res === "wrong"`), "touch: tapping the pill answers the fox (the wrong call, as a player who does not know would)");
  await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; TLXAW.TUNE.evK = 1; TLXAW.fail(TLXAW.S().active, "abandon"); true`);
});

const errs = await ev(`1`); // keep the page alive for the error summary
console.log(fails ? `\n${fails} FAILED` : "\nall passed");
await done(fails ? 1 : 0);

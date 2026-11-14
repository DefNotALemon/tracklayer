// Slice 11.3 (G4): ammo variety (tlx-guns.js AMMOS, the wheel's Ammo slot in tlx-gunwheel.js). Asserts, exit 1 on a failure.
//  A. the counter's Ammunition tab: four loads, each with its price and what it changes; buying a box of each; the pack
//     takes 120 rounds all loads together; "Load these" changes the load in the rifle.
//  B. the numbers: reach 140 / 112 / 161 / 77 m (soft point / surplus / match / subsonic), groups, recoil, noise.
//  C. in the field: subsonic drops a reindeer at 60 m and the herd 300 m off keeps grazing (soft point sends it running);
//     at 100 m it's past subsonic's reach and the toast names the load. The wheel's sixth slot changes load with the rifle
//     at the shoulder: the magazine's rounds go back in the pack (none lost), it refills from the new load. Match reaches
//     a moose at 155 m that soft point can't; surplus falls short at 125 m.
//  D. run a load dry: the rifle goes on to the next load you carry and says so.
//  E. the wheel's Ammo slot on a pad and on touch, prompts through btn().
//  F. saved: loads and the load in the rifle survive a reload; a corrupt entry loads clean; an 11.1b/11.2 save (no loads)
//     keeps its soft points.
import { boot, ev, tap, down, up, sleep, done, shot, reload, padSet, padOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function ready() { for (let i = 0; i < 100; i++) { await sleep(150); try { if (await ev(`typeof TLXGUN !== "undefined" && !!TLXGUN.state() && started`)) { await sleep(300); return true; } } catch (e) {} } return false; }
async function until(expr, secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) { if (await ev(expr)) return true; await sleep(80); } return !!(await ev(expr)); }
async function frames(n = 3) { const p0 = await ev("TLXGUN.AIM.ph"); let last = p0, c = 0; for (let i = 0; i < 200 && c < n; i++) { await sleep(40); const p = await ev("TLXGUN.AIM.ph"); if (p !== last) { c++; last = p; } } }
const toasts = () => J(`(TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))`);
const G = () => J(`(() => { const g = TLXGUN.gun(), s = TLXGUN.state(), pk = {}; for (const a of TLXGUN.AMMOS) pk[a.id] = TLXGUN.pk(a.id); return { load: g.ammo, rounds: g.rounds, pk, tot: TLXGUN.pkTotal(), all: TLXGUN.pkTotal() + g.rounds, st: TLXGUN.stats(g), cash: GS.cash, on: TLXGUN.AIM.on, last: TLXGUN.AIM.last,
  amm: $("gunHud") ? $("gunHud").children[2].textContent : "", hint: $("wnHint").textContent, sAmmo: s.ammo, alt: s.alt }; })()`);
const W = () => J(`({ open: TLXWHEEL.W.open, stage: TLXWHEEL.W.stage, slot: TLXWHEEL.W.slot, hl: TLXWHEEL.W.hl, text: $("gnWheel") ? $("gnWheel").textContent : "", parts: $("gnWheel") ? [...$("gnWheel").querySelectorAll("button[data-part]")].map(b => b.dataset.part) : [], strip: $("gnWheel") ? [...$("gnWheel").querySelectorAll("button[data-part]")].map(b => b.textContent) : [], slots: $("gnWheel") ? [...$("gnWheel").querySelectorAll("button[data-slot]")].map(b => b.textContent) : [] })`);
async function holdR() { await down("KeyR"); await until("TLXWHEEL.W.open", 6); await up("KeyR"); await sleep(150); }
const press = sel => ev(`(() => { const b = $("ifShop").querySelector('${sel}'); if (!b) return "none"; if (b.disabled) return "disabled:" + b.textContent; b.click(); return "clicked"; })()`);
const mk = (kind, d, off = 0) => ev(`window.__mk(${JSON.stringify(kind)}, ${d}, ${off})`);
const aimAt = n => ev(`(() => { const q = window.__an[${n}].m[0], sc = q.g.scale.x, cy = surf(q.x, q.z) + q.sp.hipY * sc * 0.92, ey = Math.max(FOOT.y, surf(FOOT.x, FOOT.z) - 0.4) + 1.6, d = Math.hypot(q.x - FOOT.x, q.z - FOOT.z);
  FOOT.yaw = Math.atan2(q.x - FOOT.x, q.z - FOOT.z); TLXGUN.AIM.pitch = Math.atan2(cy - ey, d); return d; })()`);
const boltDone = () => until("TLXGUN.AIM.bolt <= 0", 4);
const wild = () => ev(`(() => { WILD.max = 0; for (const G of WILD.groups) for (const q of G.m) wildFree(q); WILD.groups.length = 0; window.__an = [];
  window.__mk = (kind, d, off) => { const yw = window.__yaw + off, x = FOOT.x + Math.sin(yw) * d, z = FOOT.z + Math.cos(yw) * d, q = wildRig(kind);
    const G = { kind, sp: QSP[kind], x, z, yaw: yw + 1.57, state: "graze", t: 999, v: 0, m: [q] };
    Object.assign(q, { x, z, yaw: G.yaw, v: 0, ox: 0, oz: 0, graze: 0.3, wT: 999 }); q.ant.visible = true; WILD.groups.push(G); window.__an.push(G); return window.__an.length - 1; };
  return true; })()`);

await boot();
await ev(`tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; GS.hour = 36; TLX.setOn("wounds", false); GS.cash = 9000; true`); await sleep(400);
await wild();
await ev(`FOOT.on = true; FOOT.x = depot.x + 20; FOOT.z = depot.z + 14; FOOT.y = surf(FOOT.x, FOOT.z); P.x = FOOT.x + 5; P.z = FOOT.z; true`); await sleep(300);
ok(await ev(`TLXGUN.takeCourse() && TLXGUN.buyRifle("bolt308")`), "A: licence and rifle bought");

// ---- A: the counter
await ev(`FISH.openShop("g_ammo", "guns"); true`); await sleep(400);
let cards = await J(`[...$("ifShop").querySelectorAll("button[data-gammo]")].map(b => { const c = b.closest(".ifit"); return { id: b.dataset.gammo, btn: b.textContent, text: c ? c.textContent : "", load: !!(c && c.querySelector("button[data-gload]")) }; })`);
console.log("A cards", JSON.stringify(cards.map(c => [c.id, c.btn])));
ok(cards.map(c => c.id).join() === "sp308,fmj308,match308,sub308", "A: the Ammunition tab lists four loads: " + cards.map(c => c.id).join());
ok(/\$38/.test(cards[0].btn) && /\$24/.test(cards[1].btn) && /\$74/.test(cards[2].btn) && /\$58/.test(cards[3].btn), "A: priced $38 / $24 / $74 / $58 a box");
ok(/The standard load/.test(cards[0].text) && /Clean-kill range −28/.test(cards[1].text) && /Clean-kill range \+21/.test(cards[2].text) && /Accuracy −0\.5/.test(cards[2].text) && /Noise −0\.60/.test(cards[3].text) && /Clean-kill range −63/.test(cards[3].text),
  "A: each card says what the load changes against soft point: " + cards[3].text.replace(/\s+/g, " ").slice(-170));
ok(cards.every(c => !c.load), "A: nothing to load before a box is bought");
await shot("x11a_shop");
const cash0 = (await G()).cash;
for (const id of ["sp308", "fmj308", "match308", "sub308"]) await press(`button[data-gammo="${id}"]`);
await sleep(200);
let g = await G(); let tl = await toasts();
ok(g.pk.sp308 === 20 && g.pk.fmj308 === 20 && g.pk.match308 === 20 && g.pk.sub308 === 20 && g.cash === cash0 - 38 - 24 - 74 - 58, `A: a box of each: 80 rounds, $${cash0 - g.cash} spent`);
ok(tl.some(t => /A box of 20 subsonic: 20 of them in the pack, 80 rounds in all\./.test(t)), "A: the toast counts the load and the pack");
cards = await J(`[...$("ifShop").querySelectorAll("button[data-gammo]")].map(b => { const c = b.closest(".ifit"); return { id: b.dataset.gammo, text: c ? c.textContent : "", load: !!(c && c.querySelector("button[data-gload]")), on: !!(c && c.classList.contains("on")) }; })`);
ok(cards[0].on && !cards[0].load && /Loaded · 0 of 3 in the magazine/.test(cards[0].text) && cards.slice(1).every(c => c.load && !c.on), "A: soft point shows as loaded; the other three offer Load these");
await press(`button[data-gammo="sp308"]`); await press(`button[data-gammo="match308"]`); await sleep(150);
g = await G();
const full = await press(`button[data-gammo="fmj308"]`);
ok(g.tot === 120 && /^disabled:Carrying 120: that's all the pack takes/.test(full) && (await ev(`TLXGUN.buyAmmo("sub308")`)) === false && (await G()).tot === 120, "A: the pack stops at 120 rounds, all loads together: " + full);
await press(`button[data-gload="match308"]`); await sleep(200);
g = await G(); tl = await toasts();
ok(g.load === "match308" && tl.some(t => /Match rounds for the magazine: 40 in the pack\./.test(t)), "A: Load these puts match in the rifle");
ok(await ev(`[...$("ifShop").querySelectorAll(".ifit.on")].length === 1 && /match/.test($("ifShop").querySelector(".ifit.on").textContent)`), "A: and the match card is the one marked loaded");
await shot("x11a_shop_loaded");
await ev(`$("ifShopX").click(); true`); await sleep(200);

// ---- B: the numbers
const N = await J(`(() => { const g = TLXGUN.gun(), o = {}; for (const a of TLXGUN.AMMOS) o[a.id] = TLXGUN.stats(Object.assign({}, g, { ammo: a.id })); return o; })()`);
console.log("B", JSON.stringify(Object.fromEntries(Object.entries(N).map(([k, s]) => [k, { range: s.range, spread: s.spread, recoil: s.recoil, noise: s.noise, heard: Math.round(420 * s.noise) }]))));
ok(N.sp308.range === 140 && N.fmj308.range === 112 && N.match308.range === 161 && N.sub308.range === 77, `B: clean reach ${N.sp308.range} / ${N.fmj308.range} / ${N.match308.range} / ${N.sub308.range} m`);
ok(N.match308.spread < N.sp308.spread && N.sp308.spread < N.sub308.spread && N.sub308.spread < N.fmj308.spread, `B: groups: match ${N.match308.spread} < soft point ${N.sp308.spread} < subsonic ${N.sub308.spread} < surplus ${N.fmj308.spread} MOA`);
ok(N.sub308.recoil < N.sp308.recoil && N.match308.recoil > N.sp308.recoil && Math.abs(N.sub308.noise - 0.4 * N.sp308.noise) < 0.011 && N.fmj308.noise === N.sp308.noise, `B: subsonic kicks less (${N.sub308.recoil} vs ${N.sp308.recoil}) and is heard at ${Math.round(420 * N.sub308.noise)} m, not ${Math.round(420 * N.sp308.noise)} m; match kicks more (${N.match308.recoil})`);
ok(N.sp308.cap === N.sub308.cap && N.sp308.kg === N.match308.kg && N.sp308.handling === N.fmj308.handling, "B: a load changes nothing about the rifle itself (capacity, weight, handling)");

// ---- out on the fell
const spot = await J(`(() => { const W = { x: depot.x, z: depot.z };
  for (let r = 500; r < 2600; r += 60) for (let an = 0; an < 6.28; an += 0.35) {
    const x = W.x + Math.cos(an) * r, z = W.z + Math.sin(an) * r;
    if (Math.abs(x) > HALF - 400 || Math.abs(z) > HALF - 400 || isSea(x, z) || isWater(x, z) || obNear(x, z, 12)) continue;
    FOOT.x = x; FOOT.z = z; if (TLXGUN.slungWhy() && TLXGUN.slungWhy() !== "busy") continue;
    for (let yw = 0; yw < 6.28; yw += 0.4) {
      const dx = Math.sin(yw), dz = Math.cos(yw); let good = true, g0 = surf(x, z);
      for (let t = 10; t <= 260 && good; t += 10) { const px = x + dx * t, pz = z + dz * t; if (isSea(px, pz) || isWater(px, pz) || Math.abs(surf(px, pz) - g0) > 1.6 || solidNear(px, pz, 3)) good = false; }
      if (!good || TLXGUN.unsafe(x, z, dx, dz)) continue;
      FOOT.y = surf(x, z); FOOT.yaw = yw; FOOT.sp = 0; window.__yaw = yw; P.x = x - dx * 6; P.z = z - dz * 6; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; recenter(x, z, true); camState.init = false;
      return { x: Math.round(x), z: Math.round(z), yaw: +yw.toFixed(2), r };
    } }
  return null; })()`);
console.log("spot", JSON.stringify(spot));
ok(!!spot, "C: found open fell with a clear 260 m line");
if (!spot) await done(1);
await sleep(900);

// ---- C: subsonic, then the wheel, match, surplus
ok(await ev(`TLXGUN.loadAmmo("sub308", true)`), "C: subsonic loaded from the pack");
const all0 = (await G()).all;
await ev(`TLXGUN.TUNE.sway = 0; true`);
await tap("KeyL");
ok(await until("TLXGUN.AIM.on && TLXGUN.AIM.t >= 1", 5) && await until("TLXGUN.gun().rounds === 3", 6), "C: rifle up, the magazine fills with three subsonic");
await sleep(200); g = await G(); console.log("C hud", g.amm, "|", g.hint);
ok(g.pk.sub308 === 17 && g.pk.sp308 === 40 && /3 \/ 3 · 17 in the pack · SUBSONIC/.test(g.amm) && /clean to 77 m/.test(g.hint), `C: the rifle's line names the load and its reach: "${g.amm}"`);
await ev(`FOOT.yaw = window.__yaw; TLXGUN.AIM.pitch = 0; true`);
const r60 = await mk("reindeer", 60), herd = await mk("reindeer", 300, 1.2), near = await mk("reindeer", 120, -1.2);
await aimAt(r60); await frames(); await shot("x11a_subsonic");
await tap("KeyE"); await sleep(250);
g = await G();
let q = await J(`({ dead: window.__an[${r60}].m[0].dead, herd: window.__an[${herd}].state, near: window.__an[${near}].state })`);
console.log("C sub", JSON.stringify(g.last), JSON.stringify(q));
ok(g.last.res === "kill" && q.dead === 1 && g.last.ammo === "sub308", "C: subsonic drops the reindeer at 60 m");
ok(q.herd === "graze" && q.near === "flee" && Math.abs(g.last.heard - 168) < 3, `C: the herd 300 m off keeps grazing, the one at 120 m bolts (heard to ${Math.round(g.last.heard)} m)`);
await boltDone();
const r100 = await mk("reindeer", 100);
await aimAt(r100); await frames();
await tap("KeyE"); await sleep(250);
g = await G(); tl = await toasts();
ok(g.last.res === "short" && !(await ev(`window.__an[${r100}].m[0].dead`)) && tl.some(t => /100 m: past this rifle's clean reach with subsonic rounds \(77 m\)/.test(t)), "C: 100 m is past subsonic's 77 m, and the toast names the load");
await boltDone();
// the control: the same far herd hears a soft point
ok(await ev(`TLXGUN.loadAmmo("sp308", true)`) && await until("TLXGUN.gun().rounds === 3", 6), "C: soft point back in");
await ev(`TLXGUN.AIM.pitch = -0.4; true`); await frames();
await tap("KeyE"); await sleep(250);
g = await G(); q = await J(`({ herd: window.__an[${herd}].state })`);
ok(g.last.res === "miss" && g.last.ammo === "sp308" && q.herd === "flee", "C: a soft point fired from the same spot sends that herd running");
await boltDone();
// the wheel's sixth slot, rifle at the shoulder
const before = await G();
await holdR(); let w = await W();
ok(w.open && w.slots.length === 6 && /^6Ammo/.test(w.slots[5]) && /Soft point/.test(w.slots[5]), "C: the wheel has a sixth slot, Ammo, showing the load in the rifle: " + w.slots[5]);
await shot("x11a_wheel");
await tap("Digit6"); await sleep(250); w = await W();
console.log("C strip", JSON.stringify(w.strip));
ok(w.stage === "part" && w.parts.join() === "sp308,fmj308,match308,sub308" && /LOADED · \d+ in the pack/.test(w.strip[0]) && /Match rounds/.test(w.strip[2]) && /40 in the pack/.test(w.strip[2]), "C: 6 lists the loads in the pack with their counts");
ok(/Reach/i.test(w.strip[2]) && /loads it/.test(w.text) && /Esc back/.test(w.text), "C: each load shows its bars against what's loaded; help: " + w.text.slice(-40));
await shot("x11a_wheel_ammo");
await tap("Digit3"); await sleep(300);
g = await G(); w = await W(); tl = await toasts();
ok(g.load === "match308" && !w.open && g.on && g.pk.sp308 === before.pk.sp308 + before.rounds && g.all === before.all, `C: 3 loads match: wheel closed, rifle still up, the ${before.rounds} soft points went back in the pack (${before.all} rounds before, ${g.all} after)`);
ok(tl.some(t => /Match rounds loaded: 40 in the pack\./.test(t)), "C: and it says so");
ok(await until("TLXGUN.gun().rounds === 3", 6) && (await G()).pk.match308 === 37, "C: the magazine refills from the match rounds");
ok((await G()).all === all0 - 3, "C: three rounds fired in all, none lost in the swaps (" + (await G()).all + " of " + all0 + ")");
const m155 = await mk("moose", 155);
ok((await G()).st.range === 161 && N.sp308.range < 155, "C: 155 m is inside match's 161 m, outside soft point's 140 m");
await aimAt(m155); await frames();
await tap("KeyE"); await sleep(250);
g = await G();
ok(g.last.res === "kill" && (await ev(`window.__an[${m155}].m[0].dead`)) === 1, "C: match drops the moose at 155 m");
await boltDone();
ok(await ev(`TLXGUN.loadAmmo("fmj308", true)`) && await until("TLXGUN.gun().rounds === 3", 6), "C: surplus ball loaded");
const r125 = await mk("reindeer", 125, 0.06);
await aimAt(r125); await frames();
await tap("KeyE"); await sleep(250);
g = await G(); tl = await toasts();
ok(g.last.res === "short" && tl.some(t => /125 m: past this rifle's clean reach with surplus ball rounds \(112 m\)/.test(t)), "C: surplus ball falls short at 125 m (112 m reach)");
await boltDone();

// ---- D: run a load dry
await ev(`(() => { const s = TLXGUN.state(), g = TLXGUN.gun(); g.ammo = "sp308"; g.rounds = 1; s.ammo = 0; s.alt = { match308: 5 }; TLXGUN.AIM.load = 0; TLXGUN.AIM.pitch = -0.4; return true; })()`); await frames();
await tap("KeyE"); await sleep(300);
g = await G(); tl = await toasts();
ok(g.last.res === "miss" && g.load === "match308" && tl.some(t => /Out of soft point rounds: loading match\./.test(t)), "D: the last soft point fired, the rifle goes on to match and says so");
ok(await until("TLXGUN.gun().rounds === 3", 6) && (await G()).pk.match308 === 2, "D: three match in the magazine, two left in the pack");
// a part-used magazine never mixes loads: it waits until it's empty
await boltDone();
await ev(`(() => { const s = TLXGUN.state(), g = TLXGUN.gun(); g.rounds = 2; s.alt = { sub308: 6 }; TLXGUN.AIM.load = 0.2; return true; })()`); await sleep(900);
g = await G();
ok(g.load === "match308" && g.rounds === 2 && g.pk.sub308 === 6, "D: with two match still in it the magazine doesn't top up from another load");
await tap("KeyL"); await sleep(1500);
ok(!(await G()).on, "D: rifle slung");

// ---- E: pad and touch
await ev(`(() => { const s = TLXGUN.state(), g = TLXGUN.gun(); g.ammo = "sp308"; g.rounds = 2; s.ammo = 10; s.alt = { match308: 8, sub308: 6 }; return true; })()`);
await padSet({ 14: 1 }); await until("TLXWHEEL.W.open", 6); await sleep(100); await padSet({}); await sleep(300);
w = await W(); ok(w.open && /D-pad \/ stick pick a slot/.test(w.text), "E: pad: hold D-pad left opens the wheel");
await padSet({ 14: 1 }); await sleep(150); await padSet({}); await sleep(250);
w = await W(); ok(w.hl === 5, "E: D-pad left steps round to Ammo (slot " + (w.hl + 1) + ")");
await padSet({ 0: 1 }); await sleep(200); await padSet({}); await sleep(300); w = await W();
ok(w.stage === "part" && w.parts.join() === "sp308,match308,sub308" && /A loads it/.test(w.text) && /B back/.test(w.text), "E: A opens it: only the loads carried (" + w.parts.join() + "); help: " + w.text.slice(-30));
await padSet({ 15: 1 }); await sleep(150); await padSet({}); await sleep(250);
await padSet({ 0: 1 }); await sleep(200); await padSet({}); await sleep(350);
g = await G(); w = await W();
ok(g.load === "match308" && !w.open && g.rounds === 0 && g.pk.sp308 === 12 && !g.on, "E: D-pad right + A loads match; the two soft points are back in the pack; the rifle wasn't shouldered by the A press");
await padOff(); await sleep(200);
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(700);
await ev(`$("gnGun").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 9, pointerType: "touch" })); true`);
await until("TLXWHEEL.W.open", 4);
await ev(`$("gnGun").dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 9, pointerType: "touch" })); true`); await sleep(200);
ok((await W()).open, "E: touch: holding GUN opens the wheel");
await ev(`$("gnWheel").querySelector('button[data-slot="5"]').click(); true`); await sleep(250);
w = await W(); ok(w.stage === "part" && /loads it/.test(w.text), "E: tapping Ammo opens the loads: " + w.text.slice(-30));
await shot("x11a_touch_ammo");
await ev(`$("gnWheel").querySelector('button[data-part="sub308"]').click(); true`); await sleep(300);
g = await G(); ok(g.load === "sub308" && !(await W()).open, "E: tapping subsonic loads it, wheel closed");
await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; true`); await sleep(300);
// one load only: the strip says where to get more
await ev(`(() => { const s = TLXGUN.state(), g = TLXGUN.gun(); g.ammo = "sp308"; g.rounds = 0; s.ammo = 10; s.alt = {}; return true; })()`);
await holdR(); await tap("Digit6"); await sleep(250); w = await W();
ok(w.parts.join() === "sp308" && /One load in the pack: Jakt & Våpen sells three more\./.test(w.text), "E: with one load carried the strip says where the others are sold");
await tap("Escape"); await sleep(200);

// ---- F: saved
await ev(`(() => { const s = TLXGUN.state(), g = TLXGUN.gun(); g.ammo = "sub308"; g.rounds = 2; s.ammo = 10; s.alt = { match308: 8, sub308: 6 }; save(); return true; })()`);
await reload(); await ready();
g = await G();
ok(g.load === "sub308" && g.rounds === 2 && g.pk.sp308 === 10 && g.pk.match308 === 8 && g.pk.sub308 === 6, "F: the loads in the pack and the load in the rifle survive a reload");
const bad = await J(`(() => { const s = JSON.parse(localStorage.getItem("tracklayer.save.v2")), o = s.x.sys.guns.s; o.ammo = 100; o.alt = { match308: 9999, sub308: -4, plasma: 50, fmj308: "x", __proto__: 3 }; o.owned[0].ammo = "plasma"; return s; })()`);
await reload(bad); await ready();
g = await G();
ok(g.load === "sp308" && g.sAmmo === 100 && JSON.stringify(g.alt) === '{"match308":20}' && g.tot === 120, "F: a corrupt entry loads clean (unknown load -> soft point, the pack capped at 120): " + JSON.stringify(g.alt));
const bad2 = await J(`(() => { const s = JSON.parse(localStorage.getItem("tracklayer.save.v2")); s.x.sys.guns.s.alt = "lots"; return s; })()`);
await reload(bad2); await ready();
g = await G(); ok(JSON.stringify(g.alt) === "{}" && g.sAmmo === 100, "F: a garbage loads field is dropped");
const old = await J(`(() => { const s = JSON.parse(localStorage.getItem("tracklayer.save.v2")), o = s.x.sys.guns.s; delete o.alt; delete o.owned[0].ammo; o.ammo = 37; s.x.sys.guns.v = 2; return s; })()`);
await reload(old); await ready();
g = await G();
ok(g.load === "sp308" && g.sAmmo === 37 && g.tot === 37 && g.st.range === 140, "F: an 11.1b save (no loads) keeps its 37 soft points and the rifle shoots as before");
await done(fails ? 1 : 0);

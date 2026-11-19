// Expansion slice 14.4b2: handline tackle at the boatyard's counter (tlx-seafish.js, tlx-boats.js). Asserts, exit 1 on a failure.
//   a new game has the frame's own line and pilk and nothing bought; without a boat the yard's door opens no counter;
//   with one the use control at the door (key, pad L3, the touch button) opens the yard's shop panel with Lines / Pilks /
//   Gaff; short of cash nothing sells; a line is bought once and wound on, the old one stays owned; pilks are carried
//   three of a kind; the gaff is bought once; all of it survives a reload and a junk state loads sane; on the water the
//   400 g pilk sinks faster and the 120 g slower than the plain one, the svenskepilk draws saithe, mono draws more bites
//   and parts where the tarred line holds, the heavy line holds where the tarred line parts, a parted line takes the
//   bought pilk (and the last one puts the plain pilk back on), the gaff lifts a 6 kg fish from 3 m and leaves a small
//   one alone; tackle can't be changed with the line down; the Boats app's card changes line and pilk; the handline's
//   panel names what is on, hides under the tablet, and the tablet up takes the hands off the line (beta 0194 #1/#2).
//   Measured by gameClock. NOSTILLS=1 skips the stills.
import { boot, ev, send, tap, sleep, done, reload, down, up, shot, padSet, padOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
const STILLS = !process.env.NOSTILLS;
const still = async n => { if (STILLS) await shot(n); };
async function gameWait(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(60); }
// every toast shown since the last clear (a toast lives 4.2 s of wall time: record them as they appear)
const recOn = () => ev(`(() => { window.__tsaw = []; if (!window.__trec) window.__trec = setInterval(() => { const a = (typeof TOASTQ !== "undefined" ? TOASTQ.map(t => t.msg || t[0] || String(t)) : []).concat([...document.querySelectorAll("#toasts > *")].map(e => e.textContent)); for (const m of a) if (!window.__tsaw.includes(m)) window.__tsaw.push(m); }, 80); return 1; })()`);
const clearToasts = () => ev(`(() => { if (typeof TOASTQ !== "undefined") TOASTQ.length = 0; document.getElementById("toasts").textContent = ""; window.__tsaw = []; return 1; })()`);
const toasts = async () => { await sleep(200); return J(`window.__tsaw || []`); };
const TK = () => J(`(() => { const s = TLXSF.tackle(); return { line: s.line, pilk: s.pilk, lines: s.lines, pilks: s.pilks, gaff: s.gaff, cash: GS.cash }; })()`);
const atDoor = async () => { await ev(`(() => { const y = TLXB.yard(), D = TLXB.DOCKS[0], fx = Math.sin(D.yaw), fz = Math.cos(D.yaw), jx = -y.side * fz, jz = y.side * fx; if (!VEH.cur || FOOT.on) { P.vx = P.vz = 0; } FOOT.on = true; FOOT.g.visible = true; FOOT.x = y.door.x; FOOT.z = y.door.z; FOOT.yaw = Math.atan2(-jx, -jz); FOOT.y = TLXB.floorAt(FOOT.x, FOOT.z) ?? surf(FOOT.x, FOOT.z); FOOT.sp = 0; return 1; })()`); await sleep(700); };
const use = () => J(`({ use: footUse(), hint: $("wnHint").textContent })`);
const panel = () => J(`(() => { const e = document.getElementById("ifShop"), open = !!e && !e.hidden && FISH.panelOpen(); return { open, title: open ? e.querySelector("h2").textContent : "", eye: open ? e.querySelector(".ifey").textContent : "", tabs: open ? [...e.querySelectorAll("#ifShopTabs button")].map(b => b.textContent) : [], cur: open ? (e.querySelector("#ifShopTabs button.on") || {}).textContent : "", cards: open ? [...e.querySelectorAll("#ifShopList .ifit")].map(c => ({ nm: c.querySelector(".ifnm").textContent, pr: c.querySelector(".ifpr").textContent, on: c.classList.contains("on"), chips: [...c.querySelectorAll(".ifchip")].map(x => x.textContent), btn: c.querySelector("button").textContent, dis: c.querySelector("button").disabled })) : [], text: open ? e.innerText : "" }; })()`);
const tabTo = async l => { await ev(`(() => { const b = [...document.querySelectorAll("#ifShopTabs button")].find(b => b.textContent === ${JSON.stringify(l)}); if (b) b.click(); return !!b; })()`); await sleep(250); };
const press = async nm => { const r = await ev(`(() => { const c = [...document.querySelectorAll("#ifShopList .ifit")].find(c => c.querySelector(".ifnm").textContent === ${JSON.stringify(nm)}); const b = c && c.querySelector("button"); if (!b || b.disabled) return false; b.click(); return true; })()`); await sleep(250); return r; };
const shut = async () => { await ev(`(() => { if (FISH.panelOpen()) FISH.back(); return 1; })()`); await sleep(250); };
const app = async () => { await ev(`TABLET.toggle(false); true`); await sleep(250); await ev(`TABLET.toggle(true, "boats"); true`); await sleep(900); return ev(`document.getElementById("tabV").innerText`); };
const appOff = async () => { await ev(`TABLET.toggle(false); true`); await sleep(300); };
const clickAct = act => ev(`(() => { const b = document.querySelector("#tabV [data-act='${act}']"); if (b) b.click(); return !!b; })()`);
const outTo = u => ev(`(() => { const D = TLXB.DOCKS[0], e = TLXB.dockEnd(D); P.x = e.x + Math.sin(D.yaw) * ${u}; P.z = e.z + Math.cos(D.yaw) * ${u}; P.yaw = D.yaw; P.vx = P.vz = 0; P.y = wlvAt(P.x, P.z) || 0; recenter(P.x, P.z, true); return TLXB.depthAt(P.x, P.z); })()`);
const FS = () => J(`(() => { const F = TLXSF.F; return { on: F.on, L: +F.L.toFixed(2), bot: +F.bot.toFixed(1), fish: F.fish ? { key: F.fish.key, kg: F.fish.kg } : null, tens: +F.tens.toFixed(2), strain: +F.strain.toFixed(2), rig: +F.rigT.toFixed(1), n: GS.fish.log.n, top: (document.getElementById("sfTop") || {}).textContent || "", vis: (document.getElementById("sfHud") || { style: {} }).style.visibility || "" }; })()`);
// set what is on the frame directly (the game refuses a change with the line down: the test owns the state here)
const rig = (line, pilk, n) => ev(`(() => { const s = TLXSF.tackle(); if (${JSON.stringify(line)} !== "hand") s.lines[${JSON.stringify(line)}] = 1; s.line = ${JSON.stringify(line)}; if (${JSON.stringify(pilk)} !== "p200") s.pilks[${JSON.stringify(pilk)}] = ${n || 1}; s.pilk = ${JSON.stringify(pilk)}; return 1; })()`);
const lineOver = async () => { if (!(await ev("TLXSF.F.on"))) { await tap("KeyE"); await sleep(400); } return ev("TLXSF.F.on"); };
const stow = async () => { if (await ev("TLXSF.F.on")) { await tap("KeyE"); await sleep(400); } };
// a fish put on the hook by hand: pull = how it pulls, run = seconds of run left (0: it never runs)
const hook = (kg, pull, run, L) => ev(`(() => { const F = TLXSF.F, f = TLXSF.newFish("cod"); f.kg = ${kg}; f.pull = ${pull}; f.stam = ${run ? 1 : 0.1}; f.run = ${run}; f.rest = 99; F.fish = f; F.bite = null; F.st = "fight"; F.L = ${L}; F.tens = 0; F.strain = 0; F.slack = 0; F.rigT = 0; return 1; })()`);
// how fast the pilk goes down, m per game second (brake held from the top)
async function sinkRate() {
  await ev(`TLXSF.F.L = 0; TLXSF.F.rigT = 0; true`); await down("KeyS"); await gameWait(0.4);
  const a = await J(`({ L: TLXSF.F.L, t: gameClock })`); await gameWait(1.6); const b = await J(`({ L: TLXSF.F.L, t: gameClock })`); await up("KeyS");
  return (b.L - a.L) / (b.t - a.t);
}

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`);
await recOn();

// ---- 1. a new game: the frame's own tackle, nothing bought
let s = await TK();
ok(s.line === "hand" && s.pilk === "p200" && !Object.keys(s.lines).length && !s.gaff && Object.values(s.pilks).every(n => n === 0), `a new game has the tarred line and the plain pilk: ${JSON.stringify(s)}`);
let k = await J(`({ sys: !!TLX.state("seafish"), lines: TLXSF.LINES.map(l => [l.id, l.cost, l.lim, l.shy]), pilks: TLXSF.PILKS.map(p => [p.id, p.cost, p.sink]), gaff: TLXSF.GAFF, store: !!(TLX.stores && TLX.stores.boat), tabs: TLX.shopTabs.filter(t => (t.stores || []).includes("boat")).map(t => t.label) })`);
ok(k.sys && k.store && k.tabs.join() === "Lines,Pilks,Gaff,Yard", `the tackle is a saved system and the yard has a counter with ${k.tabs.join(" / ")}`);
ok(k.lines[0][1] === 0 && k.lines[0][2] === 1 && k.lines[0][3] === 1 && k.pilks[0][1] === 0 && k.pilks[0][2] === 3, "the free line and pilk are the old handline's numbers (strength 1, bites x1, 3 m/s)");

// ---- 2. no boat: the door has no counter
await ev(`P.x = depot.x; P.z = depot.z; P.vx = P.vz = 0; true`);
await atDoor();
s = await use();
ok(s.use === "BOATYARD" && !/tackle/.test(s.hint), `no boat: the door reads BOATYARD and offers no tackle: "${s.hint}"`);
await tap("KeyE"); await sleep(400);
ok(!(await panel()).open, "no boat: the use key opens no counter");

// ---- 3. a boat: the counter opens at the door
await ev(`GS.cash = 5000; TLXB.buy(); true`); await sleep(400);
await atDoor();
s = await use();
ok(s.use === "BOATYARD" && /^E: ask at the boatyard · hull repairs, handline tackle/.test(s.hint), `with a boat the hint names the counter by key: "${s.hint}"`);
await tap("KeyE"); await sleep(500);
let p = await panel();
ok(p.open && p.title === "Handline tackle" && /Båt & Motor/.test(p.eye) && p.tabs.join() === "Lines,Pilks,Gaff,Yard" && p.cur === "Lines", `the use key opens the yard's counter: "${p.eye}" / "${p.title}", tabs ${p.tabs.join(", ")}`);
ok(p.cards.length === 3 && p.cards[0].on && p.cards[0].btn === "On the frame" && p.cards[0].dis && p.cards[0].pr === "with the boat" && p.cards[1].pr === "$55" && p.cards[2].pr === "$90", `Lines: ${p.cards.map(c => c.nm + " " + c.pr).join(", ")}`);
ok(p.cards[1].chips.includes("strength −14%") && p.cards[1].chips.includes("bites +25%") && p.cards[2].chips.includes("strength +30%") && p.cards[2].chips.includes("bites −15%"), `the cards say what each line trades: ${JSON.stringify(p.cards.slice(1).map(c => c.chips))}`);
ok((await use()).use !== "BOATYARD", "with the counter up the door's use control is not offered again");
await still("t1_counter_lines");
// walking is off while the counter is up
{ const a = await J(`({ x: FOOT.x, z: FOOT.z })`); await down("KeyS"); await sleep(700); await up("KeyS"); const b = await J(`({ x: FOOT.x, z: FOOT.z })`);
  ok(Math.hypot(a.x - b.x, a.z - b.z) < 0.05, "the walker stands still while the counter is up"); }

// ---- 4. short of cash
await ev(`GS.cash = 30; true`); await shut(); await atDoor(); await tap("KeyE"); await sleep(500);
p = await panel();
ok(p.open && p.cards[1].dis && /not enough cash/.test(p.cards[1].btn) && p.cards[2].dis, `with $30 the lines read "${p.cards[1].btn}" and can't be pressed`);
await clearToasts();
ok(!(await ev(`TLXSF.buyLine("mono")`)) && (await toasts()).some(x => /That's \$55\. You have \$30\./.test(x)) && (await TK()).cash === 30, "and a buy is refused with the price and what you have");
await tabTo("Pilks"); p = await panel();
ok(p.cur === "Pilks" && p.cards.length === 3 && !p.cards[1].dis === false && p.cards[2].dis, "nor a $32 or $38 pilk");
await tabTo("Gaff"); p = await panel();
ok(p.cards.length === 1 && p.cards[0].dis && /not enough cash/.test(p.cards[0].btn), "nor the $65 gaff");

// ---- 5. buying: a line, pilks, the gaff
await ev(`GS.cash = 1000; true`); await shut(); await atDoor(); await tap("KeyE"); await sleep(500); await tabTo("Lines");
await clearToasts();
ok(await press("0.9 mm monofilament"), "press: buy the monofilament");
s = await TK(); p = await panel();
ok(s.cash === 945 && s.line === "mono" && s.lines.mono === 1 && p.cards[1].on && p.cards[1].btn === "On the frame" && p.cards[0].btn === "Wind this on" && !p.cards[0].dis, "$55 off, it is on the frame, and the tarred line can be wound back on");
ok((await toasts()).some(x => /0\.9 mm monofilament: wound onto the frame/.test(x)), "a line says it is on");
ok(await press("Tarred handline"), "press: wind the tarred line back on");
s = await TK(); p = await panel();
ok(s.cash === 945 && s.line === "hand" && s.lines.mono === 1 && p.cards[1].chips.includes("Owned") && p.cards[1].btn === "Wind this on", "back on the tarred line at no cost; the mono is still owned");
ok(await press("0.9 mm monofilament"), "press: wind the owned mono on"); s = await TK();
ok(s.cash === 945 && s.line === "mono", "an owned line goes on free");
await tabTo("Pilks");
p = await panel();
ok(p.cards[0].on && p.cards[0].chips.includes("sinks 3.0 m a second") && p.cards[1].chips.includes("for saithe, cod") && p.cards[1].chips.includes("0 of 3 in the box") && p.cards[2].chips.includes("sinks 4.6 m a second") && p.cards[2].chips.includes("for redfish, halibut, wolffish"), `Pilks: ${JSON.stringify(p.cards.map(c => c.chips))}`);
await still("t2_counter_pilks");
ok(await press("120 g svenskepilk"), "press: buy a svenskepilk"); s = await TK(); p = await panel();
ok(s.cash === 913 && s.pilks.sv120 === 1 && s.pilk === "sv120" && p.cards[1].on && p.cards[1].chips.includes("1 of 3 in the box") && p.cards[1].chips.includes("Tied on"), "$32 off, one in the box, tied on");
await press("120 g svenskepilk"); await press("120 g svenskepilk"); s = await TK(); p = await panel();
ok(s.cash === 849 && s.pilks.sv120 === 3 && p.cards[1].dis && /that's all it holds/.test(p.cards[1].btn), `three is the box: "${p.cards[1].btn}"`);
await clearToasts();
ok(!(await ev(`TLXSF.buyPilk("sv120")`)) && (await TK()).cash === 849 && (await toasts()).some(x => /3 of those is all the tackle box holds/.test(x)), "a fourth is refused and costs nothing");
ok(await press("400 g bergmannpilk"), "press: buy a bergmannpilk"); s = await TK(); p = await panel();
ok(s.cash === 811 && s.pilks.b400 === 1 && s.pilk === "b400" && p.cards[1].btn === "Tie one on" && !p.cards[1].dis, "$38 off, it is tied on, and the svenskepilks in the box offer to go back on");
ok(await press("120 g svenskepilk"), "press: tie a svenskepilk on"); s = await TK();
ok(s.cash === 811 && s.pilk === "sv120" && s.pilks.sv120 === 3 && s.pilks.b400 === 1, "tying one on costs nothing and uses none");
ok(await press("200 g pilk"), "press: tie the plain pilk on"); ok((await TK()).pilk === "p200", "the plain pilk is always there");
await tabTo("Gaff"); await clearToasts();
ok(await press("Gaff, 90 cm ash shaft"), "press: buy the gaff"); s = await TK(); p = await panel();
ok(s.cash === 746 && s.gaff === true && p.cards[0].dis && p.cards[0].btn === "In the boat", "$65 off, the gaff is in the boat and can't be bought twice");
ok((await toasts()).some(x => /A gaff, in the boat\. A fish of 3 kg or more/.test(x)), "and the toast says what it does");
await still("t3_counter_gaff");
await shut();
ok(!(await panel()).open && (await use()).use === "BOATYARD", "the counter shuts and the door is the door again");

// ---- 6. pad and touch open the counter too
await padSet({}, [0, 0, 0.7, 0]); await sleep(350); await padSet({}); await sleep(450);
s = await use();
ok(s.use === "BOATYARD" && !/\bE:/.test(s.hint) && /handline tackle/.test(s.hint), `pad: the hint names the pad's button, not a key: "${s.hint}"`);
await padSet({ 10: 1 }); await sleep(350); await padSet({}); await sleep(500);
ok((await panel()).open, "pad: L3 at the door opens the counter");
await padOff(); await shut(); await ev(`INP.dev = "kbm"; true`);
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(800);
s = await J(`({ hidden: $("tcUse").hidden, label: $("tcUse").textContent, hint: $("wnHint").textContent })`);
ok(!s.hidden && s.label === "BOATYARD" && /tap BOATYARD/.test(s.hint), `touch: the use button reads BOATYARD: "${s.hint}"`);
await ev(`(() => { const b = $("tcUse"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return 1; })()`); await sleep(500);
ok((await panel()).open, "touch: the button opens the counter");
await shut(); await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; true`);

// ---- 7. a reload keeps it; a junk state loads sane
await ev(`save(); true`); await reload(); await sleep(500);
await ev(`tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await recOn();
s = await TK();
ok(s.line === "mono" && s.pilk === "p200" && s.lines.mono === 1 && s.pilks.sv120 === 3 && s.pilks.b400 === 1 && s.gaff === true, `a reload keeps the tackle: ${JSON.stringify(s)}`);
{ await ev(`save(); true`);
  const sv = JSON.parse(await ev(`localStorage.getItem("tracklayer.save.v2")`));
  ok(!!(sv.x && sv.x.sys && sv.x.sys.seafish), "the save holds x.sys.seafish");
  const keep = JSON.parse(JSON.stringify(sv));
  sv.x.sys.seafish = { v: 1, s: { line: "rope", pilk: "b400", lines: "lots", pilks: { b400: "many", sv120: -4, anchor: 9 }, gaff: "yes" } };
  await reload(sv); await sleep(500); await ev(`tutSkip(); true`);
  s = await TK();
  ok(s.line === "hand" && s.pilk === "p200" && s.pilks.b400 === 0 && s.pilks.sv120 === 0 && s.gaff === false && !Object.keys(s.lines).length, `a junk tackle state loads as the frame's own: ${JSON.stringify(s)}`);
  sv.x.sys.seafish = { v: 1, s: { line: "heavy", pilk: "sv120", lines: {}, pilks: { sv120: 99 }, gaff: true } };
  await reload(sv); await sleep(500); await ev(`tutSkip(); true`);
  s = await TK();
  ok(s.line === "hand" && s.pilk === "sv120" && s.pilks.sv120 === 3 && s.gaff === true, `a line you don't own falls back, a box of 99 is a box of 3: ${JSON.stringify(s)}`);
  await reload(keep); await sleep(500);
  await ev(`tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await recOn(); }
s = await TK();
ok(s.line === "mono" && s.pilks.sv120 === 3 && s.gaff, "the real save is back");

// ---- 8. the Boats app's card
let t = await app();
ok(/Handline tackle/.test(t) && /0\.9 mm monofilament · 200 g pilk tied on/.test(t) && /3 × 120 g svenskepilk, 1 × 400 g bergmannpilk/.test(t) && /CHANGE LINE/.test(t) && /CHANGE PILK/.test(t), "the Boats app has a Handline tackle card: what is on, what is in the box, CHANGE LINE and CHANGE PILK");
await still("t4_boats_app_card");
await clickAct("sfp"); await sleep(600); s = await TK();
ok(s.pilk === "sv120", "CHANGE PILK ties on the next kind you carry"); 
await clickAct("sfp"); await sleep(600); ok((await TK()).pilk === "b400", "and the next");
await clickAct("sfl"); await sleep(600); ok((await TK()).line === "hand", "CHANGE LINE winds on the next line you own");
t = await ev(`document.getElementById("tabV").innerText`);
ok(/Tarred handline · 400 g bergmannpilk tied on/.test(t), "and the card follows");
await appOff();

// ---- 9. on the water: what the tackle does
await ev(`TLXV.swapTo(TLXV.state().owned.find(r => r.id === "skiff").uid); FOOT.on = false; true`); await sleep(500);
const dep = await outTo(150); await gameWait(1.2);
ok(dep > 15, `out over ${dep.toFixed(1)} m of water`);
await ev(`window.__rnd = Math.random; Math.random = () => 0.999; true`);          // no bites while measuring
await rig("hand", "p200"); ok(await lineOver(), "the line goes over");
s = await FS(); ok(/^HANDLINE · /.test(s.top), `the plain tackle reads as before: "${s.top}"`);
const v200 = await sinkRate();
await rig("hand", "b400"); const v400 = await sinkRate();
await rig("heavy", "sv120", 3); const v120 = await sinkRate();
console.log("sink m/s", v200.toFixed(2), v400.toFixed(2), v120.toFixed(2));
ok(Math.abs(v200 - 3) < 0.35 && Math.abs(v400 - 4.6) < 0.5 && Math.abs(v120 - 2) < 0.3, `the pilk sinks ${v200.toFixed(1)} m/s plain, ${v400.toFixed(1)} at 400 g, ${v120.toFixed(1)} at 120 g`);
s = await FS(); ok(/^HEAVY LINE · 120 g · /.test(s.top), `the panel names what is on: "${s.top}"`);
await still("t5_hud_tags");
// who wants which pilk
k = await J(`(() => { const s = TLXSF.tackle(), w = (pk, key) => { s.pilks[pk] = Math.max(1, s.pilks[pk] || 0); s.pilk = pk; const t = TLXSF.takers(44, 45, 0.6).list.find(a => a[0] === key); return t ? t[1] : 0; };
  return { sa0: w("p200", "saithe"), sa1: w("sv120", "saithe"), co1: w("sv120", "cod") / w("p200", "cod"), ha0: w("p200", "halibut"), ha4: w("b400", "halibut"), re4: w("b400", "redfish") / w("p200", "redfish"), sa4: w("b400", "saithe") / w("p200", "saithe") }; })()`);
ok(Math.abs(k.sa1 / k.sa0 - 1.6) < 0.01 && Math.abs(k.co1 - 1.15) < 0.01, `saithe want the svenskepilk x${(k.sa1 / k.sa0).toFixed(2)}, cod x${k.co1.toFixed(2)}`);
ok(Math.abs(k.ha4 / k.ha0 - 1.4) < 0.01 && Math.abs(k.re4 - 1.35) < 0.01 && Math.abs(k.sa4 - 1) < 0.01, `over deep ground halibut want the bergmannpilk x${(k.ha4 / k.ha0).toFixed(2)}, redfish x${k.re4.toFixed(2)}, saithe don't care`);
// bites by line
const shy = async line => { await rig(line, "p200"); await ev(`TLXSF.F.L = 12; TLXSF.F.act = 0.6; TLXSF.F.bite = null; true`); await gameWait(0.3);
  return ev(`(() => { const F = TLXSF.F; return F.rate / (TLXSF.T.BITE_K * TLXSF.takers(F.L, F.bot, F.act).sum * (0.3 + 1.4 * TLXSF.markAt(P.x, P.z)) * TLXSF.todK()); })()`); };
const sh = [await shy("hand"), await shy("mono"), await shy("heavy")];
ok(Math.abs(sh[0] - 1) < 0.04 && Math.abs(sh[1] - 1.25) < 0.05 && Math.abs(sh[2] - 0.85) < 0.04, `bites: tarred x${sh[0].toFixed(2)}, mono x${sh[1].toFixed(2)}, heavy x${sh[2].toFixed(2)}`);
// the tablet up: the panel hides and the hands are off the line
await rig("hand", "p200"); await ev(`TLXSF.F.L = 10; true`);
await ev(`TABLET.toggle(true, "map"); true`); await sleep(500);
await down("KeyW"); await gameWait(1.2); s = await FS(); await up("KeyW");
ok(s.vis === "hidden" && Math.abs(s.L - 10) < 0.05, `with the tablet up the handline's panel is hidden and gas hauls nothing (line still ${s.L} m)`);
await ev(`TABLET.toggle(false); true`); await sleep(500);
await down("KeyW"); await gameWait(1); s = await FS(); await up("KeyW");
ok(s.vis === "" && s.L < 9.2, `tablet down: the panel is back and gas hauls (${s.L} m)`);
// tackle can't be changed with the line down
await clearToasts();
ok(!(await ev(`TLXSF.fitLine("mono")`)) && !(await ev(`TLXSF.fitPilk("sv120")`)) && (await TK()).line === "hand" && (await toasts()).some(x => /Wind the line in first/.test(x)), "with the line over the side a change of tackle is refused");

// the strength of the line. A run the fish holds at 1.075 of the tarred line's limit:
await rig("hand", "sv120", 3); await clearToasts(); await hook(8, 1.3, 6, 10); await gameWait(2.6);
s = await FS(); let tk = await TK(); let ts = await toasts();
ok(!s.fish && s.rig > 0 && ts.some(x => /line parted on the cod's run/.test(x)), `the tarred line parts on a hard run you only hold (strain ${s.strain})`);
ok(tk.pilks.sv120 === 2 && tk.pilk === "sv120" && ts.some(x => /2 more 120 g svenskepilk in the box/.test(x)), "the parted line took the svenskepilk: two left, the next one goes on");
await rig("heavy", "sv120", 2); await clearToasts(); await hook(8, 1.3, 6, 10); await gameWait(2.6);
s = await FS(); tk = await TK();
ok(!!s.fish && s.strain === 0 && tk.pilks.sv120 === 2, `the heavy line holds the same run (tension ${s.tens}, no strain)`);
// a run the tarred line holds and the mono doesn't
await rig("hand", "sv120", 2); await hook(5, 1.1, 6, 10); await gameWait(2.4); s = await FS();
ok(!!s.fish && s.strain === 0, `a lighter run: the tarred line holds it (tension ${s.tens})`);
await rig("mono", "sv120", 1); await clearToasts(); await hook(5, 1.1, 6, 10); await gameWait(2.4);
s = await FS(); tk = await TK(); ts = await toasts();
ok(!s.fish && ts.some(x => /line parted/.test(x)), "the mono parts on it");
ok(tk.pilks.sv120 === 0 && tk.pilk === "p200" && ts.some(x => /That was your last 120 g svenskepilk: the plain 200 g goes on/.test(x)), "that was the last svenskepilk: the plain 200 g is on, and the toast says so");
// a parted plain pilk costs nothing
await rig("hand", "p200"); await hook(8, 1.3, 6, 10); await gameWait(2.6); tk = await TK();
ok(!(await FS()).fish && tk.pilk === "p200" && tk.pilks.b400 >= 1, "the plain pilks never run out, and the other kinds in the box are untouched");

// the gaff
await ev(`TLXSF.F.rigT = 0; GS.fish.cooler.length = 0; true`);
const n0 = (await FS()).n;
await ev(`TLXSF.tackle().gaff = false; true`); await hook(6, 0.5, 0, 2.8); await down("KeyW"); await gameWait(0.35); s = await FS();
ok(!!s.fish && s.L > 0.5 && s.L < 2.8 && s.n === n0, `no gaff: a 6 kg fish 2.8 m down is still on the line after a moment's hauling (${s.L} m)`);
await up("KeyW");
await ev(`TLXSF.tackle().gaff = true; true`); await hook(1.5, 0.3, 0, 2.8); await down("KeyW"); await gameWait(0.35); s = await FS();
ok(!!s.fish && s.n === n0, "the gaff leaves a 1.5 kg fish to come up on the line");
await up("KeyW");
await clearToasts(); await hook(6, 0.5, 0, 2.8); await down("KeyW"); await gameWait(0.35); await up("KeyW"); s = await FS(); ts = await toasts();
ok(!s.fish && s.n === n0 + 1 && ts.some(x => /^Gaffed and aboard: Cod \(torsk\), 6\.0 kg/.test(x)) && await ev(`GS.fish.cooler.length === 1 && GS.fish.cooler[0].kg === 6`), "with the gaff a 6 kg fish 2.8 m down is lifted aboard at once, into the cooler");
await clearToasts(); await hook(6, 0.5, 6, 2.8); await down("KeyW"); await gameWait(0.3); s = await FS(); await up("KeyW");
ok(!!s.fish, "but not while it is running");
await ev(`TLXSF.F.fish = null; Math.random = window.__rnd; true`);
await stow();
ok(!(await ev("TLXSF.F.on")), "line stowed");
ok(await ev(`TLXSF.fitLine("mono")`) && (await TK()).line === "mono", "with the line wound in the tackle changes again");

await done(fails ? 1 : 0);

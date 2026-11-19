// Expansion slice 14.4b3: winter haul-out and storm wear (tlx-boats.js). Asserts, exit 1 on a failure.
//   the option and the system are there; a boat on her berth gets a "Winter haul-out" card; storm wear by the clock:
//   half a point an hour on a berth in a full storm, three times that lying off, scaled by the blow, nothing under
//   storm 0.5, a clock jump counts 6 h at most, never under 30%, not with the option off, not while you are aboard,
//   yes while you stand beside her, and through the game's own tick; one notification a blow; the haul-out is refused
//   aboard, with parcels aboard, short of cash and away from the slip; hauled out she costs $120, stands on the cradle
//   (the yard's own hull gone), can't be towed, swapped to or worn, can be mended, survives a reload; the launch (free)
//   puts her on a berth; mouse, touch, pad A and keyboard Enter in the Boats app and the Yard tab at the door's counter
//   all work; hauling the boat you last stepped out of hands you back to the sled; a second boat goes in the shed;
//   junk `hard` values come out sane. NOSTILLS=1 skips the stills.
import { boot, ev, send, tap, sleep, done, reload, shot, padSet, padOff, sideCam, camOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const STILLS = !process.env.NOSTILLS;
const still = async n => { if (STILLS) await shot(n); };
const recOn = () => ev(`(() => { window.__tsaw = []; if (!window.__trec) window.__trec = setInterval(() => { const a = (typeof TOASTQ !== "undefined" ? TOASTQ.map(t => t.msg || t[0] || String(t)) : []).concat([...document.querySelectorAll("#toasts > *")].map(e => e.textContent)); for (const m of a) if (!window.__tsaw.includes(m)) window.__tsaw.push(m); }, 80); return 1; })()`);
const clearToasts = () => ev(`(() => { if (typeof TOASTQ !== "undefined") TOASTQ.length = 0; document.getElementById("toasts").textContent = ""; window.__tsaw = []; return 1; })()`);
const toasts = async () => { await sleep(250); return J(`window.__tsaw || []`); };
const notesOn = () => ev(`(() => { window.__n = []; if (!window.__no) { window.__no = TABLET.notify.bind(TABLET); TABLET.notify = n => { if (/wearing your boat/.test(n.title)) window.__n.push(n.title + " | " + n.body); return window.__no(n); }; } return true; })()`);
const app = async () => { await ev(`TABLET.toggle(false); true`); await sleep(250); await ev(`TABLET.toggle(true, "boats"); true`); await sleep(900); return ev(`document.getElementById("tabV").innerText`); };
const page = () => ev(`document.getElementById("tabV").innerText`);
const appOff = async () => { await ev(`TABLET.toggle(false); true`); await sleep(300); };
const B = `TLX.state("vehicles").owned.filter(r => r.id === "skiff")`;
const buy = async () => { await ev(`garageTab = "boats"; openGarage(); true`); await sleep(400); await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(300); await ev(`closeGarage(); true`); };
const clickAct = pre => ev(`(() => { const b = document.querySelector("#tabV [data-act^='${pre}:']"); if (b) b.click(); return !!b; })()`);
const atDoor = async () => { await ev(`(() => { const y = TLXB.yard(), D = TLXB.DOCKS[0], fx = Math.sin(D.yaw), fz = Math.cos(D.yaw), jx = -y.side * fz, jz = y.side * fx; if (!VEH.cur || FOOT.on) { P.vx = P.vz = 0; } FOOT.on = true; FOOT.g.visible = true; FOOT.x = y.door.x; FOOT.z = y.door.z; FOOT.yaw = Math.atan2(-jx, -jz); FOOT.y = TLXB.floorAt(FOOT.x, FOOT.z) ?? surf(FOOT.x, FOOT.z); FOOT.sp = 0; return 1; })()`); await sleep(700); };
const use = () => J(`({ use: footUse(), hint: $("wnHint").textContent })`);
const panel = () => J(`(() => { const e = document.getElementById("ifShop"), open = !!e && !e.hidden && FISH.panelOpen(); return { open, tabs: open ? [...e.querySelectorAll("#ifShopTabs button")].map(b => b.textContent) : [], cur: open ? (e.querySelector("#ifShopTabs button.on") || {}).textContent : "", text: open ? e.innerText : "", cards: open ? [...e.querySelectorAll("#ifShopList .ifit")].map(c => ({ nm: c.querySelector(".ifnm").textContent, pr: c.querySelector(".ifpr").textContent, note: c.querySelector(".ifnote").textContent, btn: c.querySelector("button").textContent, dis: c.querySelector("button").disabled })) : [] }; })()`);
const tabTo = async l => { await ev(`(() => { const b = [...document.querySelectorAll("#ifShopTabs button")].find(b => b.textContent === ${JSON.stringify(l)}); if (b) b.click(); return !!b; })()`); await sleep(250); };
const pressCard = async i => { const r = await ev(`(() => { const b = [...document.querySelectorAll("#ifShopList .ifit button")][${i}]; if (!b || b.disabled) return false; b.click(); return true; })()`); await sleep(300); return r; };
const shut = async () => { await ev(`(() => { if (FISH.panelOpen()) FISH.back(); return 1; })()`); await sleep(250); };
// two hours of weather on the clock, reckoned at once: what it cost boat i (the storm is put back to calm in the same call)
const blow = (storm, hours, i = 0) => ev(`(() => { const r = ${B}[${i}], c0 = r.cond; GS.storm = ${storm}; TLX.state("boats").wh = GS.hour - ${hours}; TLXB.yardTick(); GS.storm = 0; return +(c0 - r.cond).toFixed(4); })()`);
const setCond = (c, i = 0) => ev(`${B}[${i}].cond = ${c}; true`);
const rec = (i = 0) => J(`(() => { const r = ${B}[${i}]; return { uid: r.uid, x: r.x, z: r.z, yaw: r.yaw, cond: r.cond, hard: r.hard || 0, cur: TLX.state("vehicles").cur }; })()`);
const near = (a, b, e) => Math.abs(a - b) <= e;
// a camera in the yard's own frame (a: along the slip, seaward +; b: toward the jetty +; h above the shed floor)
const ycam = async (a, b, h, la, lb, lh) => { await sideCam(); await ev(`window.camOv = c => { const y = TLXB.yard(), fx = Math.sin(y.yaw), fz = Math.cos(y.yaw), jx = -y.side * fz, jz = y.side * fx; c.position.set(y.x + fx * ${a} + jx * ${b}, y.floor + ${h}, y.z + fz * ${a} + jz * ${b}); c.lookAt(y.x + fx * ${la} + jx * ${lb}, y.floor + ${lh}, y.z + fz * ${la} + jz * ${lb}); }; true`); await sleep(500); };

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 36; true`);
await recOn(); await notesOn();

// ---- A. the option, the system, the yard's hard
const A = await J(`({ opt: TLX.options.find(o => o.id === "stormwear") || null, on: TLX.on("stormwear"), st: TLX.state("boats"), fee: TLXB.HARD.fee, yard: !!TLXB.yard(), scen: !!(TLXB.yardScen() && TLXB.yardScen().visible) })`);
ok(A.opt && A.on === true && /left afloat/i.test(A.opt.hint), "the option \"Storm wear on boats\" is registered, on by default");
ok(A.st && typeof A.st === "object" && A.fee === 120, "the boats system has its saved state; the haul-out is $120");
ok(A.yard && A.scen, "the yard is there with its own hull on the cradle");
ok(await ev(`(() => { GS.storm = 1; TLX.state("boats").wh = GS.hour - 2; TLXB.yardTick(); GS.storm = 0; return true; })()`), "no boat: a storm on the clock is harmless");

// ---- B. a boat on her berth: the card
await ev(`GS.cash = 9000; true`); await buy();
let r = await rec();
ok(r.hard === 0 && await ev(`TLXB.atYard(${B}[0])`), "bought a skiff: afloat on her quay berth, within reach of the slip");
let t = await app();
console.log("card:", t.replace(/\s+/g, " ").slice(0, 700));
ok(/Winter haul-out/.test(t) && /AT THE SLIP/.test(t) && /HAUL OUT/.test(t) && t.includes("$120") && /a point of hull every 2 hours on a berth in a full storm, 3 times as fast lying off/.test(t), "the Boats app has a Winter haul-out card: AT THE SLIP, $120, HAUL OUT, and what a blow costs afloat");
ok(await ev(`[...document.querySelectorAll("#tabV [data-act]")].every(b => b.closest("[data-tf]") || b.dataset.tf)`), "every button in the app is reachable by pad / arrows (data-tf)");
ok(await ev(`!document.querySelector("#tabV [data-act^='bho:']").classList.contains("blocked")`), "the HAUL OUT button is live");
await still("h1_app_card");
await appOff();

// ---- C. storm wear by the clock
let d = await blow(1, 2);
ok(near(d, 1.0, 0.01), `a full storm, 2 h on her berth: ${d} points of hull (0.5 an hour)`);
d = await blow(0.7, 2); ok(near(d, 0.5, 0.01), `storm 0.7, 2 h on her berth: ${d} (half the full rate)`);
d = await blow(0.45, 2); ok(d === 0, `storm 0.45: nothing (${d})`);
d = await blow(1, 20); ok(near(d, 3.0, 0.01), `a clock jump of 20 h counts for 6: ${d} points`);
await setCond(100);
const berth = await rec();
await ev(`(() => { const r = ${B}[0], D = TLXB.DOCKS[0], e = TLXB.dockEnd(D); r.x = e.x + Math.sin(D.yaw) * 300; r.z = e.z + Math.cos(D.yaw) * 300; return TLXB.dockAt(r.x, r.z) === null; })()`);
d = await blow(1, 2); ok(near(d, 3.0, 0.01), `lying off 300 m out, a full storm, 2 h: ${d} points (three times the berth's)`);
await setCond(30.5); d = await blow(1, 6); ok(near(d, 0.5, 0.001) && (await rec()).cond === 30, `a storm never takes her under 30%: lost ${d} from 30.5`);
d = await blow(1, 6); ok(d === 0, "at 30% a storm costs nothing more");
await ev(`(() => { const r = ${B}[0]; r.x = ${berth.x}; r.z = ${berth.z}; r.yaw = ${berth.yaw}; r.cond = 100; return 1; })()`);
await ev(`TLX.setOn("stormwear", false); true`);
d = await blow(1, 2); ok(d === 0, "option off: a storm costs nothing");
t = await app(); ok(/Winter haul-out/.test(t) && !/she chafes/.test(t), "option off: the card still offers the haul-out, without the wear line");
await appOff(); await ev(`TLX.setOn("stormwear", true); true`);
// aboard: you are handling her; stood beside her: she wears
await ev(`TLXV.swapTo(${B}[0].uid); FOOT.on = false; true`); await sleep(500);
ok((await rec()).cur === berth.uid && await ev(`!!(VEH.cur && VEH.cur.floats)`), "aboard her (the test's swap)");
d = await blow(1, 2); ok(d === 0, "aboard in a full storm: no wear, you are handling her");
await ev(`(() => { const D = TLXB.DOCKS[0]; FOOT.on = true; FOOT.g.visible = true; FOOT.x = D.x + Math.sin(D.yaw) * (D.len - 3); FOOT.z = D.z + Math.cos(D.yaw) * (D.len - 3); FOOT.y = TLXB.floorAt(FOOT.x, FOOT.z); P.vx = P.vz = 0; return 1; })()`); await sleep(400);
d = await blow(1, 2); ok(near(d, 1.0, 0.02), `stood on the jetty beside her (still your current boat): she wears, ${d}`);
// through the game's own tick, and the notification
await setCond(100); await sleep(400); await ev(`window.__n = []; true`);   /* a few calm frames first: the last blow is over */
await ev(`WX.at = () => 1; GS.storm = 1; TLX.state("boats").wh = GS.hour; GS.hour += 1.5; TLX.state("roads") && (TLX.state("roads").h = GS.hour); true`); await sleep(700);
let c1 = (await rec()).cond; ok(c1 < 99.5 && c1 > 99.0, `the game's own tick: 1.5 h of storm on the clock took her to ${c1.toFixed(2)}%`);
ok((await J(`window.__n`)).length === 0, "under a full point: no notification yet");
await ev(`GS.storm = 1; TLX.state("boats").wh = GS.hour; GS.hour += 1.5; TLX.state("roads") && (TLX.state("roads").h = GS.hour); true`); await sleep(700);
let notes = await J(`window.__n`); console.log("notes", JSON.stringify(notes));
ok(notes.length === 1 && /The blow is wearing your boat/.test(notes[0]) && /against the jetty's piles/.test(notes[0]) && /hauls her out for \$120/.test(notes[0]) && /\$8 a point/.test(notes[0]), "past a full point: one notification, naming the haul-out and the repair rate");
await ev(`GS.storm = 1; TLX.state("boats").wh = GS.hour; GS.hour += 1.5; TLX.state("roads") && (TLX.state("roads").h = GS.hour); true`); await sleep(700);
ok((await J(`window.__n`)).length === 1, "the same blow says it once");
await ev(`WX.at = () => 0; GS.storm = 0; true`); await sleep(300);
t = await app(); ok(/HULL 9\d%/.test(t) && /Boatyard · hull repair/.test(t), "the worn hull shows on her card, with the repair card under it");
await appOff();

// ---- D. the haul-out refused: aboard, parcels aboard, short of cash, away from the slip
await ev(`FOOT.on = false; true`); await sleep(300);
ok(/Step ashore first/.test(await ev(`TLXB.haulBlock(${B}[0])`)), "aboard: step ashore first");
await ev(`TLXV.swapTo(null); FOOT.on = false; true`); await sleep(400);
ok((await rec()).cur === null, "back on the sled");
await ev(`${B}[0].load = [{ cargo: "Fish boxes on ice", pay: 10 }]; true`);
ok(/Unload her first/.test(await ev(`TLXB.haulBlock(${B}[0])`)), "parcels aboard: unload her first");
await ev(`${B}[0].load = []; GS.cash = 100; true`);
await clearToasts(); ok(await ev(`TLXB.haulOut(${B}[0].uid)`) === false && (await toasts()).some(x => /The haul-out is \$120/.test(x)) && await ev(`GS.cash === 100`), "short of cash: refused, with the price");
await ev(`GS.cash = 5000; (() => { const r = ${B}[0], b = TLXB.berthPose(TLXB.DOCKS[1], 1); r.x = b.x; r.z = b.z; r.yaw = b.yaw; return 1; })()`);
ok(/Bring her to the quay jetty first/.test(await ev(`TLXB.haulBlock(${B}[0])`)), "at another jetty: bring her to the quay jetty first");
t = await app(); ok(/Winter haul-out/.test(t) && /NOT HERE/.test(t) && /the yard's slip is beside it/.test(t) && await ev(`document.querySelector("#tabV [data-act^='bho:']").classList.contains("blocked")`), "the card says NOT HERE and where to bring her, the button blocked");
await ev(`(() => { const r = ${B}[0]; r.x = ${berth.x}; r.z = ${berth.z}; r.yaw = ${berth.yaw}; r.cond = 80; return 1; })()`);

// ---- E. hauled out (mouse, in the app)
t = await app(); await clearToasts();
ok(await clickAct("bho"), "click HAUL OUT"); await sleep(500);
r = await rec();
const H = await J(`(() => { const r = ${B}[0], h = TLXB.hardPose(r), R = TLXB.rt(r.uid), y = TLXB.yard(); return { h, d: Math.hypot(r.x - h.x, r.z - h.z), scen: TLXB.yardScen().visible, vis: R && R.grp.visible, gy: R && R.grp.position.y, gd: R && Math.hypot(R.grp.position.x - h.x, R.grp.position.z - h.z), wl: wlvAt(h.x, h.z) ?? 0, cash: GS.cash, foot: Math.hypot(h.x - y.foot.x, h.z - y.foot.z), sea: isSea(h.x, h.z) }; })()`);
console.log("hard", JSON.stringify(H));
ok(r.hard === 1 && H.d < 0.01 && H.cash === 4880, "she is on the hard (slot 1, the cradle), $120 off");
ok(H.scen === false && H.vis === true && H.gd < 0.05 && H.gy > H.wl + 0.6, `the yard's own hull has made way; yours stands on the cradle ${(H.gy - H.wl).toFixed(2)} m above the water`);
ok((await toasts()).some(x => /winched her up the slip/.test(x) && /on the cradle/.test(x) && x.includes("$120") && /launch is paid for/.test(x)), "the toast says where she is, what it cost and that the launch is paid");
t = await page();
console.log("card:", t.replace(/\s+/g, " ").slice(0, 700));
ok(/HAULED OUT/.test(t) && /On the hard/.test(t) && /LAUNCH/.test(t) && !/TOW HOME/.test(t) && !/Winter haul-out/.test(t) && /Hauled out, on the cradle/.test(t), "her card: HAULED OUT, an On the hard card with LAUNCH, no tow, no second haul-out");
ok(/Boatyard · hull repair/.test(t) && /AT THE SLIP/.test(t), "dented and on the hard she can still be mended");
await still("h2_app_hard");
ok(/hauled out at the boatyard/.test(await ev(`TLXB.towBlock(${B}[0])`)) && await ev(`TLXB.tow(${B}[0].uid)`) === false, "no tow for a boat on the hard");
d = await blow(1, 6); ok(d === 0, "a full storm for 6 h: on the hard she takes no wear");
await clearToasts(); ok(await clickAct("bry"), "click REPAIR HULL"); await sleep(400);
ok((await rec()).cond === 100 && await ev(`GS.cash === 4720`) && (await toasts()).some(x => /stays on the hard/.test(x)), "mended on the hard ($160 for 20 points); the toast says she stays out");
await appOff();
// walk up to her: nothing to get into, the sled stays your machine
await ev(`(() => { const h = TLXB.hardPose(${B}[0]), y = TLXB.yard(); FOOT.on = true; FOOT.g.visible = true; FOOT.x = y.door.x; FOOT.z = y.door.z; FOOT.y = TLXB.floorAt(FOOT.x, FOOT.z); return 1; })()`); await sleep(900);
ok((await rec()).cur === null, "stood at the yard beside her: she is not swapped to (nothing to get into)");
if (STILLS) { await ycam(17, -3.5, 1.6, 7, 0, 0.6); await still("h3_cradle_yours"); await ycam(26, -9, 4.5, 6, 0, 0.5); await still("h4_from_sea"); await ycam(4, 12, 3.2, 9, 0, 0.6); await still("h5_from_jetty"); await camOff(); }

// ---- F. a reload keeps her out
await ev(`FOOT.on = false; save(); true`); await sleep(300);
await reload(); await sleep(600);
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; true`); await sleep(600);
await recOn(); await notesOn();
r = await rec();
ok(r.hard === 1 && r.cond === 100 && await ev(`TLXB.yardScen().visible === false`) && await ev(`GS.cash === 4720`), "after a reload she is still on the cradle, the yard's hull still gone, the cash as it was");
ok(await ev(`typeof TLX.state("boats").wh === "number"`), "the wear clock is saved");

// ---- G. the launch at the door's counter (keyboard opens it)
await atDoor();
let s = await use();
ok(s.use === "BOATYARD" && /the haul-out/.test(s.hint) && /handline tackle/.test(s.hint), `the door's hint names the haul-out: "${s.hint}"`);
await tap("KeyE"); await sleep(500);
let p = await panel();
ok(p.open && p.tabs.includes("Yard") && p.cur === "Lines", `the counter opens on Lines and has a Yard tab (${p.tabs.join(" / ")})`);
await tabTo("Yard"); p = await panel();
console.log("yard tab:", JSON.stringify(p.cards), "|", p.text.replace(/\s+/g, " ").slice(0, 400));
ok(p.cards.length === 1 && p.cards[0].btn === "Launch her" && !p.cards[0].dis && /launch paid for/.test(p.cards[0].pr) && /\$120 for the lift, the storage and the launch/.test(p.text), "the Yard tab: her card reads Launch her, paid for; the note gives the fee");
await still("h6_counter_yard");
await clearToasts(); ok(await pressCard(0), "press Launch her");
r = await rec();
const L = await J(`(() => { const r = ${B}[0]; return { at: TLXB.dockAt(r.x, r.z) === TLXB.DOCKS[0], dep: TLXB.depthAt(r.x, r.z), scen: TLXB.yardScen().visible, cash: GS.cash, key: "hard" in r }; })()`);
ok(r.hard === 0 && !L.key && L.at && L.dep > 0.9 && L.scen && L.cash === 4720, `launched: afloat on a quay berth (${L.dep.toFixed(1)} m under her), the yard's hull back on the cradle, no charge`);
ok((await toasts()).some(x => /Down the slip and afloat/.test(x)), "the toast says so");
p = await panel(); ok(p.cards[0].btn === "Haul her out · $120" && !p.cards[0].dis, "the tab's card now offers the haul-out");
ok(await pressCard(0) && (await rec()).hard === 1 && await ev(`GS.cash === 4600`), "hauled out again from the counter ($120)");
await shut();

// ---- H. touch, pad and keyboard in the Boats app
await ev(`FOOT.on = false; true`);
t = await app();
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
const sb = await J(`(() => { const b = document.querySelector("#tabV [data-act^='bhl:']"); b.scrollIntoView({ block: "center" }); const q = b.getBoundingClientRect(); return { x: q.x + q.width / 2, y: q.y + q.height / 2, t: b.textContent }; })()`);
await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: sb.x, y: sb.y }] }); await sleep(60);
await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await sleep(500);
await send("Emulation.setTouchEmulationEnabled", { enabled: false }); await ev(`INP.dev = "kbm"; true`);
ok(sb.t === "LAUNCH" && (await rec()).hard === 0, "touch: a tap on LAUNCH puts her afloat");
t = await app();
await padSet({}); await sleep(300); await ev(`TABLET.focus = "bhc:" + ${B}[0].uid; TABLET.paintFocus(); true`);
await padSet({ 0: 1 }); await sleep(400); await padSet({}); await sleep(400); await padOff();
ok((await rec()).hard === 1 && await ev(`GS.cash === 4480`), "pad: A on the Winter haul-out card hauls her out ($120)");
await ev(`INP.dev = "kbm"; true`);
t = await app();
await ev(`TABLET.focus = "bhc:" + ${B}[0].uid; TABLET.paintFocus(); true`); await tap("Enter"); await sleep(500);
ok((await rec()).hard === 0, "keyboard: Enter on the On the hard card launches her");
await appOff();

// ---- I. hauling the boat you last stepped out of
await ev(`TLXV.swapTo(${B}[0].uid); FOOT.on = false; true`); await sleep(500);
const sled0 = await J(`(() => { const s = TLX.state("vehicles").sled; return { x: s.x, z: s.z }; })()`);
await atDoor();
ok((await rec()).cur === berth.uid, "on foot at the yard's door, the boat still your current machine");
await clearToasts();
ok(await ev(`TLXB.haulOut(${B}[0].uid)`) === true, "the yard hauls her out");
await sleep(500);
const I = await J(`({ cur: TLX.state("vehicles").cur, hard: ${B}[0].hard, px: P.x, pz: P.z, foot: FOOT.on, help: HELP.on, floats: !!(VEH.cur && VEH.cur.floats), sea: isSea(P.x, P.z) })`);
console.log("I", JSON.stringify(I), JSON.stringify(sled0));
ok(I.cur === null && I.hard === 1 && !I.floats && Math.hypot(I.px - sled0.x, I.pz - sled0.z) < 1 && I.foot && !I.help, "she is on the cradle and your sled is your machine again, where you left it; you are still on foot at the door");
await sleep(800);
ok((await rec()).cur === null && (await rec()).hard === 1, "a second later nothing has swapped back");

// ---- J. a second boat goes in the shed; junk values
await ev(`FOOT.on = false; GS.cash = 9000; true`); await buy();
ok((await J(B)).length === 2, "bought a second skiff (the first one's berth is free)");
ok(await ev(`TLXB.haulOut(${B}[1].uid)`) === true, "the yard takes the second one too"); await sleep(500);
const K = await J(`(() => { const r = ${B}[1], R = TLXB.rt(r.uid), y = TLXB.yard(); return { hard: r.hard, vis: R ? R.grp.visible : null, d: Math.hypot(r.x - y.x, r.z - y.z), where: TLXB.whereOf(r).text }; })()`);
ok(K.hard === 2 && K.vis === false && K.d < 0.5 && /in the boatyard's shed/.test(K.where), "the second is in the shed (slot 2), not drawn");
t = await app(); ok(/Stood on trestles inside the yard's shed/.test(t) && /Stood on the cradle at the head of the slip/.test(t) && (t.match(/LAUNCH/g) || []).length === 2, "both cards say where each stands, a LAUNCH each");
await appOff();
await ev(`${B}[0].hard = 7; ${B}[1].hard = "x"; true`); await sleep(500);
let hs = await J(`${B}.map(r => r.hard)`);
ok(hs[0] === 1 && hs[1] === 2, `junk hard values come out as one on the cradle, one in the shed (${hs})`);
ok(await ev(`TLXB.launch(${B}[0].uid) && TLXB.launch(${B}[1].uid)`) === true, "both launched"); await sleep(500);
const M = await J(`(() => { const a = ${B}[0], b = ${B}[1]; return { d: Math.hypot(a.x - b.x, a.z - b.z), at: [a, b].every(r => TLXB.dockAt(r.x, r.z) === TLXB.DOCKS[0]), hard: [a.hard || 0, b.hard || 0], scen: TLXB.yardScen().visible }; })()`);
ok(M.at && M.d > 3 && M.hard.join() === "0,0" && M.scen, `each on a berth of her own at the quay jetty (${M.d.toFixed(1)} m apart)`);
// with both berths taken a third launch has nowhere to go: put one back on the hard and fill her berth
await ev(`TLXB.haulOut(${B}[0].uid); true`); await sleep(300);
await ev(`(() => { const D = TLXB.DOCKS[0]; for (const sd of [-1, 1]) { const b = TLXB.berthPose(D, sd), o = ${B}[1]; if (Math.hypot(o.x - b.x, o.z - b.z) > 3) window.__fb = b; } return 1; })()`);
const blk = await ev(`(() => { const v = TLX.state("vehicles"), b = window.__fb; v.owned.push({ uid: "vfake", id: "pickup", x: b.x, z: b.z, yaw: 0, fuel: 1, cond: 100, load: [] }); const w = TLXB.launchBlock(${B}[0]); v.owned.pop(); return w; })()`);
ok(/No free berth at the quay jetty/.test(blk), "no free berth: the launch waits and says why");
ok(await ev(`TLXB.launch(${B}[0].uid)`) === true, "with the berth free again she launches");

console.log("fails:", fails);
await done(fails ? 1 : 0);

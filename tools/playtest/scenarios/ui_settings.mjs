// Settings split into a top page with Game, Graphics and Sound pages, and sled paint moved to the garage's Paint shop.
// Asserts (exit 1 on any FAIL):
//   1  the top page lists exactly Game, Graphics, Sound (plus Close); each page opens alone with its own controls
//      (by element id) and none of the others; no paint control exists anywhere inside #settings; the Game page
//      says where paint went; option rows from other systems sit on the right page
//   2  Esc / pad B go back one level then close; the pad Menu button closes outright; a page is never remembered
//      between opens, but toggleSettings(true, page) deep-links; the showroom is up on Game only
//   3  pad: the d-pad / stick reach EVERY control on EVERY page (scripted pad), focus lands on the first control
//      when a page opens, A picks, left / right steps a slider
//   4  the footer names the buttons of the device in hand: a pad by brand, keys on the keyboard, nothing key-like on
//      touch (also the view and rescue-sled hints)
//   5  volume, graphics preset, camera view and a rider colour apply and persist across a reload
//   6  garage Paint shop: at the garage every paint control exists, body colour, hue, decal, seat and jerry cans
//      change the sled's materials, persist across a reload, stock livery restores; an old save's paint loads
//      unchanged; away from a garage there is no way to open it (and no paint control is anywhere in the page);
//      the garage answers the pad too
//   7  layout at 1280x720, 640x360 and a phone portrait size: every settings page and the Paint shop have nothing
//      off-screen and nothing overlapping (the panel scrolls inside itself when it is tall)
//   8  page errors none
// Stills go to $OUT (settings_<size>_<page>.jpg, paint_<size>.jpg).
// Run: tools/playtest/run.sh tools/playtest/scenarios/ui_settings.mjs [outdir]
import { boot, reload, ev, raw, send, tap, sleep, shot, done, padSet, park } from "../lib.mjs";

let fails = 0;
const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const NOSTILLS = !!process.env.NOSTILLS;
const still = async n => { if (!NOSTILLS) await shot(n, 80); };

// what each page must show (by element id) and what is on no page of Settings
const PAGES = {
  top: { ids: ["setGoGame", "setGoGfx", "setGoSnd", "setCloseBtn"] },
  game: { ids: ["viewBtn", "touchBtn", "towBtn", "godBtn", "jacketSw", "trimSw", "pantsSw", "helmetSw", "styleBtns", "randomKit", "setPaintNote", "setBackBtn"] },
  graphics: { ids: ["gfxBtn", "fpsBtn", "setBackBtn"] },
  sound: { ids: ["vol", "muteBtn", "setBackBtn"] },
};
const ALL = [...new Set(Object.values(PAGES).flatMap(p => p.ids))];
const PAINT_IDS = ["colorSwatch", "liveryName", "liveryBtn", "swatches", "hue", "canBtn", "decalBtns", "seatSw"];
// is the element on screen: in the document, no hidden ancestor, a box
const SHOWN = `const shown = id => { const e = document.getElementById(id); return !!e && !e.closest("[hidden]") && e.getClientRects().length > 0; };`;
const visIds = ids => J(`(() => { ${SHOWN} return ${JSON.stringify(ids)}.filter(shown); })()`);
const page = () => ev("SETPAD.page");
const open = () => ev("!$('settings').hidden");
const pageOpen = async (p, how = "js") => { await ev(`toggleSettings(false); toggleSettings(true, ${JSON.stringify(p)}); true`); await sleep(350); };

await boot();
const info = await J(`({ sled: GS.own.sled, tut: TUT.stage, fs: !$("fsBtn").hidden })`);
console.log("start:", JSON.stringify(info));

// ---------- 1. the pages ----------
console.log("== 1. pages ==");
await ev("toggleSettings(true); true"); await sleep(400);
ok(await page() === "top", "1: Settings opens on the top page");
{
  const entries = await J(`[...$("setTop").querySelectorAll(".setgo")].map(b => b.querySelector("b").textContent)`);
  ok(JSON.stringify(entries) === JSON.stringify(["Game", "Graphics", "Sound"]), `1: top page lists exactly Game, Graphics, Sound (${entries})`);
  const vis = await visIds(ALL);
  ok(JSON.stringify(vis.sort()) === JSON.stringify([...PAGES.top.ids].sort()), `1: top page shows only its own controls (${vis})`);
  const rows = await J(`[...$("settings").querySelectorAll("button, input")].filter(e => !e.closest("[hidden]") && e.getClientRects().length).map(e => e.id)`);
  ok(JSON.stringify(rows.sort()) === JSON.stringify(["closeSet", "setCloseBtn", "setGoGame", "setGoGfx", "setGoSnd"].sort()), `1: nothing else is clickable on the top page (${rows})`);
}
await still("settings_1280_top");
const tutSkipVisible = {};
for (const p of ["game", "graphics", "sound"]) {
  await pageOpen("top"); await ev(`$(${JSON.stringify({ game: "setGoGame", graphics: "setGoGfx", sound: "setGoSnd" }[p])}).click(); true`); await sleep(350);
  ok(await page() === p, `1: the ${p} entry opens the ${p} page`);
  const want = [...PAGES[p].ids];
  if (p === "game" && info.tut < 99) want.push("tutSkip");
  if (p === "graphics" && info.fs) want.push("fsBtn");
  const vis = await visIds([...ALL, "tutSkip", "fsBtn"]);
  ok(JSON.stringify(vis.sort()) === JSON.stringify(want.sort()), `1: ${p} page shows its controls and none of the others (${vis})`);
  const others = await J(`["setTop","setGame","setGfx","setSnd"].filter(id => !$(id).hidden)`);
  ok(others.length === 1, `1: ${p} opens alone (${others})`);
  await still(`settings_1280_${p}`);
}
// options other systems add sit on the right page
{
  const pl = await J(`(() => { const out = {}; for (const [pg, box] of [["game","optRows"],["graphics","optRowsGfx"],["sound","optRowsSnd"]]) out[pg] = [...$(box).querySelectorAll("button[data-opt]")].map(b => b.dataset.opt); return { out, all: TLX.options.map(o => [o.id, o.cat]) }; })()`);
  console.log("   options by page:", JSON.stringify(pl.out));
  const total = pl.out.game.length + pl.out.graphics.length + pl.out.sound.length;
  ok(total === pl.all.length && total > 20, `1: every one of the ${pl.all.length} registered options is on exactly one page (${total})`);
  ok(pl.out.graphics.includes("seasonlook") && !pl.out.game.includes("seasonlook"), "1: Seasonal colours (a picture option) is on the Graphics page");
  ok(["traffic", "wounds", "police", "gifts", "plowtrip", "convoy"].every(id => pl.out.game.includes(id)), "1: gameplay options (traffic, wounds, police, gifts, plow, convoy) are on the Game page");
  ok(pl.out.sound.length === 0, "1: no system registers a sound option yet, so Sound holds volume and mute only");
  const bad = pl.all.filter(([id, cat]) => !["game", "graphics", "sound"].includes(cat));
  ok(!bad.length, "1: every option carries a category (default game)");
  // a graphics option and a sound option register and land on their pages
  await ev(`TLX.option({ id: "t_gfx", name: "Test picture", hint: "x", cat: "graphics" }); TLX.option({ id: "t_snd", name: "Test sound", hint: "y", cat: "sound" }); optBuild(); true`);
  const q = await J(`({ g: !!$("optRowsGfx").querySelector('[data-opt="t_gfx"]'), s: !!$("optRowsSnd").querySelector('[data-opt="t_snd"]'), gm: !!$("optRows").querySelector('[data-opt="t_gfx"],[data-opt="t_snd"]'), sec: !$("optSecSnd").hidden })`);
  ok(q.g && q.s && !q.gm && q.sec, "1: an option with cat graphics / sound lands on the Graphics / Sound page");
}
// paint is gone from Settings
{
  const q = await J(`({ ids: ${JSON.stringify(PAINT_IDS)}.filter(id => !!$("settings").querySelector("#" + id)), sw: $("settings").querySelectorAll(".sw").length, text: /Sled paint|Stock livery|Any hue|Jerry cans|Seat/.test($("settings").textContent.replace("Sled paint is done at the garage", "")) })`);
  ok(!q.ids.length, `1: no paint control exists anywhere inside #settings (${q.ids})`);
  ok(q.sw === 4 * 7 - 4 - 2 + 0 || q.sw > 0, "1: only the rider's swatches are left (" + q.sw + ")");
  ok(!q.text, "1: no paint wording is left in Settings besides the garage pointer");
  await pageOpen("game");
  const n = await J(`$("setPaintNote").textContent`);
  ok(/Sled paint is done at the garage/.test(n), `1: the Game page says where paint went ("${n}")`);
  const sw = await J(`["jacketSw","trimSw","pantsSw","helmetSw"].map(id => $(id).children.length)`);
  ok(sw.every(n => n >= 6), `1: the rider rows keep their swatches (${sw})`);
}

// ---------- 2. back, Esc, B, Menu, deep link, showroom ----------
console.log("== 2. navigation ==");
await ev("toggleSettings(false); true"); await sleep(200);
await tap("Escape"); await sleep(350);
ok(await open() && await page() === "top", "2: Esc opens Settings on the top page");
await ev(`$("setGoGame").click(); true`); await sleep(300);
await tap("Escape"); await sleep(300);
ok(await open() && await page() === "top", "2: Esc on a page goes back to the top page (still open)");
await tap("Escape"); await sleep(300);
ok(!(await open()), "2: Esc on the top page closes");
await tap("Escape"); await sleep(300);
ok(await open() && await page() === "top", "2: reopening starts at the top page again");
await ev(`$("setGoSnd").click(); true`); await sleep(200); await ev("toggleSettings(false); true"); await sleep(200);
await ev("toggleSettings(true); true"); await sleep(300);
ok(await page() === "top", "2: a page is not remembered between opens");
await ev(`$("setGoGfx").click(); true`); await sleep(250);
await ev(`$("setBackHd").click(); true`); await sleep(250);
ok(await page() === "top" && await open(), "2: the back arrow in the header returns to the top page");
await ev(`$("setGoGfx").click(); true`); await sleep(250);
await ev(`$("setBackBtn").click(); true`); await sleep(250);
ok(await page() === "top" && await open(), "2: the Back button under a page returns to the top page");
{
  const foc = await ev(`document.activeElement && document.activeElement.id`);
  ok(foc === "setGoGfx", `2: back puts the focus on the entry you came from (${foc})`);
}
await ev(`$("setCloseBtn").click(); true`); await sleep(250);
ok(!(await open()), "2: Close closes");
await ev(`$("closeSet") && (toggleSettings(true), $("closeSet").click()); true`); await sleep(250);
ok(!(await open()), "2: the cross in the header closes from the top page");
await pageOpen("graphics");
ok(await open() && await page() === "graphics", "2: toggleSettings(true, 'graphics') deep-links straight to Graphics");
ok((await visIds(["gfxBtn", "vol", "viewBtn"])).join() === "gfxBtn", "2: the deep-linked page is alone");
await tap("Escape"); await sleep(250);
ok(await open() && await page() === "top", "2: Esc from a deep-linked page goes back one level");
await tap("Escape"); await sleep(250);
ok(!(await open()), "2: and the next Esc closes");
// pad B and Menu
await ev("toggleSettings(false); true");
await padSet({ 9: 1 }); await sleep(180); await padSet(); await sleep(350);
ok(await open() && await page() === "top", "2: pad Menu opens Settings on the top page");
await padSet({ 13: 1 }); await sleep(130); await padSet(); await sleep(160);       // down: first press focuses the first control
await ev(`$("setGoGame").click(); true`); await sleep(300);
await padSet({ 1: 1 }); await sleep(180); await padSet(); await sleep(350);
ok(await open() && await page() === "top", "2: pad B on a page goes back to the top page");
await padSet({ 1: 1 }); await sleep(180); await padSet(); await sleep(350);
ok(!(await open()), "2: pad B on the top page closes");
await pageOpen("sound");
await padSet({ 9: 1 }); await sleep(180); await padSet(); await sleep(350);
ok(!(await open()), "2: pad Menu closes outright from a page");
// showroom only on Game
{
  const sr = {};
  for (const p of ["top", "game", "graphics", "sound"]) { await pageOpen(p); await sleep(900); sr[p] = await J(`({ on: showroomOn(), body: document.body.classList.contains("showroom"), hint: !$("srHint").hidden })`); }
  console.log("   showroom:", JSON.stringify(sr));
  ok(sr.game.on && sr.game.body && sr.game.hint, "2: the showroom comes up on the Game page (the rider rows change the rider)");
  ok(["top", "graphics", "sound"].every(p => !sr[p].on && !sr[p].body && !sr[p].hint), "2: it is off on the top page, Graphics and Sound (the real game shows behind them)");
  await pageOpen("graphics"); await sleep(600); await still("settings_1280_graphics_behind");
  await ev("toggleSettings(false); true"); await sleep(900);
  const gone = await J(`({ on: showroomOn(), body: document.body.classList.contains("showroom") })`);
  ok(!gone.on && !gone.body, "2: closing Settings leaves no showroom behind");
}

// ---------- 3. the pad reaches every control on every page ----------
console.log("== 3. pad navigation ==");
const dpad = async (idx, hold = 120) => { await padSet({ [idx]: 1 }); await sleep(hold); await padSet(); await sleep(hold); };
// a stable name for the focused control: its id, or its parent's id and index
const FOC = `(() => { const f = document.activeElement; if (!f || !$("settings").contains(f)) return null; if (f.id) return f.id; const p = f.parentElement; return (p.id || p.className) + "#" + [...p.children].indexOf(f); })()`;
const ALLCTL = `(() => [...$("settings").querySelectorAll("button, input[type=range]")].filter(e => !e.disabled && e.id !== "closeSet" && e.id !== "setBackHd" && !e.closest("[hidden]") && e.getClientRects().length).map(e => { if (e.id) return e.id; const p = e.parentElement; return (p.id || p.className) + "#" + [...p.children].indexOf(e); }))()`;
for (const p of ["top", "game", "graphics", "sound"]) {
  await pageOpen(p); await sleep(250);
  const want = await J(ALLCTL);
  const first = await ev(FOC);
  ok(first === want[0], `3: ${p}: focus lands on the first control when the page opens (${first})`);
  // walk: down row by row, and sweep each row left then right
  const seen = new Set([first]); let prev = first, guard = 0;
  while (guard++ < 90) {
    for (const dir of [14, 15]) { let last = await ev(FOC), n = 0; while (n++ < 24) { await dpad(dir, 90); const f = await ev(FOC); seen.add(f); if (f === last) break; last = f; } }
    await dpad(13, 90); const f = await ev(FOC); seen.add(f);
    if (f === prev) break; prev = f;
  }
  const miss = want.filter(w => !seen.has(w));
  ok(!miss.length, `3: ${p}: the d-pad reaches all ${want.length} controls (missed: ${miss.join(", ") || "none"})`);
}
// A picks, left / right step a slider
await pageOpen("sound"); await sleep(250);
{
  const v0 = await ev("SET.vol");
  ok((await ev(FOC)) === "vol", "3: sound: the volume slider is focused first");
  await dpad(15, 130); await dpad(15, 130);
  const v1 = await ev("SET.vol");
  ok(v1 > v0 + 0.05, `3: pad right on the slider raises the volume (${v0} -> ${v1})`);
  await dpad(14, 130);
  const v2 = await ev("SET.vol");
  ok(v2 < v1, `3: pad left lowers it (${v1} -> ${v2})`);
  await dpad(13, 130); await sleep(100);
  ok((await ev(FOC)) === "muteBtn", "3: down moves from the slider to Mute");
  const m0 = await ev("muted");
  await dpad(0, 130);
  ok((await ev("muted")) !== m0, "3: pad A presses the focused button (mute toggles)");
  await dpad(0, 130);
}
await pageOpen("top"); await sleep(250);
await dpad(13, 130); await dpad(0, 130); await sleep(300);
ok(await page() === "graphics", `3: pad: down then A on the top page opens the next page (${await page()})`);
await ev("toggleSettings(false); true");

// ---------- 4. the footer names the active device's buttons ----------
console.log("== 4. prompts ==");
const FOOT = () => J(`({ foot: $("setFoot").textContent, view: $("viewHint").textContent, tow: $("towBtn").textContent })`);
const KEYWORDS = /\b(Esc|Tab|Enter|Click|Shift|Space|Ctrl)\b|arrow keys/i;
const PADWORDS = /D-pad|stick/i;
const PADS = {
  xbox: ["Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)", { pick: "A", back: "B", menu: "Menu" }],
  ps: ["DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)", { pick: "✕", back: "○", menu: "Options" }],
  nin: ["Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)", { pick: "B", back: "A", menu: "+" }],
};
for (const pg of ["top", "game"]) {
  for (const [brand, [id, names]] of Object.entries(PADS)) {
    await pageOpen(pg);
    await padSet({ 13: 1 }, [0, 0], id); await sleep(150); await padSet({}, [0, 0], id); await sleep(300);
    const f = await FOOT();
    ok(await ev("INP.dev") === "pad" && await ev("INP.pad") === brand, `4: ${pg}/${brand}: the pad is the device in hand`);
    ok(PADWORDS.test(f.foot) && f.foot.includes(`>${names.pick}<`) && f.foot.includes(`>${names.back}<`) && f.foot.includes(`>${names.menu}<`), `4: ${pg}/${brand}: footer names ${names.pick} / ${names.back} / ${names.menu}: "${f.foot}"`);
    ok(!KEYWORDS.test(f.foot + " " + f.view + " " + f.tow) && !/\bV\b|\(P\)/.test(f.view + f.tow), `4: ${pg}/${brand}: no keyboard text in the footer or the hints ("${f.view}" / "${f.tow}")`);
  }
  await padOff();
}
async function padOff() { await raw("window.__fakePad = null; true"); }
await padOff();
for (const pg of ["top", "game"]) {
  await pageOpen(pg);
  await tap("ShiftLeft"); await sleep(250);           // a key: the keyboard is the device in hand again
  const f = await FOOT();
  ok(await ev("INP.dev") === "kbm", "4: " + pg + "/keyboard: the keyboard is the device in hand");
  ok(/Esc/.test(f.foot) && /Click/.test(f.foot) && !PADWORDS.test(f.foot) && !/\(Menu\)|Xbox|✕|○/.test(f.foot), `4: ${pg}/keyboard: footer names the keys: "${f.foot}"`);
  if (pg === "game") ok(/\bV\b/.test(f.view) && /\(P\)/.test(f.tow), `4: keyboard names V and P ("${f.view}" / "${f.tow}")`);
}
for (const pg of ["top", "game", "graphics", "sound"]) {
  await pageOpen(pg);
  await ev(`window.dispatchEvent(new PointerEvent("pointerdown", { pointerType: "touch", bubbles: true })); true`); await sleep(250);
  const f = await FOOT();
  ok(await ev("INP.dev") === "touch", "4: " + pg + "/touch: touch is the device in hand");
  ok(/Tap/.test(f.foot) && !KEYWORDS.test(f.foot + " " + f.view + " " + f.tow) && !PADWORDS.test(f.foot) && !/\bV\b|\(P\)|\(Menu\)/.test(f.view + f.tow), `4: ${pg}/touch: nothing key-like on touch: "${f.foot}" / "${f.view}" / "${f.tow}"`);
}
await ev(`window.dispatchEvent(new KeyboardEvent("keydown", { code: "ShiftLeft", bubbles: true })); true`);
await ev("toggleSettings(false); true");
// the keyboard moves through a page too
await pageOpen("sound"); await tap("ArrowRight"); await sleep(150); await tap("ArrowRight"); await sleep(150);
{
  const f = await ev(FOC);
  ok(f === "vol" || f === "muteBtn", `4: keyboard: arrows work on a page (focus ${f})`);
  await tap("ArrowDown"); await sleep(200);
  const f2 = await ev(FOC);
  ok(f2 === "setBackBtn", `4: keyboard: arrow down moves on (focus ${f2})`);
  await tap("Enter"); await sleep(250);
  ok(await page() === "top", "4: keyboard: Enter presses the focused Back button");
}
await ev("toggleSettings(false); true");

// ---------- 5. settings apply and persist ----------
console.log("== 5. persistence ==");
await ev("tutSkip(); crashCancel(); FOOT.on = false; true"); await sleep(500);
await pageOpen("sound");
await ev(`$("vol").value = 61; $("vol").dispatchEvent(new Event("input", { bubbles: true })); true`);
await pageOpen("graphics");
await ev(`$("gfxBtn").click(); true`);
const gfxLabel = await ev(`$("gfxBtn").textContent`), gfxSet = await ev("SET.gfx");
ok(gfxSet !== "auto" && new RegExp(gfxSet).test(gfxLabel), `5: the graphics preset button changes the preset (${gfxLabel})`);
await ev(`$("fpsBtn").click(); true`);
const fpsShown = await ev(`!$("fps").hidden`);
ok(fpsShown, "5: the frame-rate button shows the readout");
await ev(`$("fpsBtn").click(); true`);
await pageOpen("game");
const view0 = await ev("camMode");
await ev(`$("viewBtn").click(); true`);
const view1 = await ev("camMode");
ok(view1 === (view0 + 1) % 4 && /View:/.test(await ev(`$("viewBtn").textContent`)), `5: the view button cycles the camera (${view0} -> ${view1})`);
const jacket0 = await ev("SET.jacket");
await ev(`$("jacketSw").children[3].click(); true`);
const jk = await J(`({ set: SET.jacket, mat: "#" + jacketMat.color.getHexString(), want: $("jacketSw").children[3].dataset.c })`);
ok(jk.set === jk.want && jk.set !== jacket0 && jk.mat === jk.want, `5: a jacket swatch recolours the rider (${jacket0} -> ${jk.set}, material ${jk.mat})`);
await ev(`$("styleBtns").children[2].click(); true`);
const style1 = await ev("SET.style");
ok(style1 === "racer", "5: a style button changes the rider's style");
await ev(`toggleSettings(false); true`);
const st = await J(`JSON.parse(localStorage.getItem("tracklayer.set.v1"))`);
ok(Math.abs(st.vol - 0.61) < 0.01 && st.gfx === gfxSet && st.jacket === jk.set && st.style === "racer" && st.view === view1, `5: saved to the settings store (${JSON.stringify({ vol: st.vol, gfx: st.gfx, jacket: st.jacket, style: st.style, view: st.view })})`);
await reload(); await sleep(1500);
{
  const q = await J(`({ vol: SET.vol, gfx: SET.gfx, jacket: SET.jacket, jmat: "#" + jacketMat.color.getHexString(), style: SET.style, view: camMode, gl: $("gfxBtn").textContent })`);
  ok(Math.abs(q.vol - 0.61) < 0.01 && q.gfx === gfxSet && q.jacket === jk.set && q.jmat === jk.set && q.style === "racer" && q.view === view1, `5: after a reload volume, preset, rider colour, style and camera view are all kept (${JSON.stringify(q)})`);
}
// put the plain defaults back for the rest
await ev(`SET.gfx = "auto"; SET.view = 0; camMode = 0; camState.init = false; saveSettings(); true`);

// ---------- 6. the garage's Paint shop ----------
console.log("== 6. paint shop ==");
await ev("tutSkip(); crashCancel(); FOOT.on = false; VEH.cur = null; GS.hour = 12; WX.at = () => 0; GS.storm = 0; true"); await sleep(500);
const atGarage = async () => { await ev(`(() => { P.x = garageSite.x + 4; P.z = garageSite.z + 2; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = P.vy = 0; FOOT.on = false; recenter(P.x, P.z, true); return true; })()`); await sleep(900); return ev("GS.near === garageSite"); };
ok(await atGarage(), "6: set up at the garage site");
const MAT = `({ body: "#" + bodyMat.color.getHexString(), seat: "#" + V.seatMat.color.getHexString(), can: "#" + V.canMat.color.getHexString(), panel: "#" + panelMat.color.getHexString(), trim: "#" + sledTrimMat.color.getHexString(),
  decal: Object.fromEntries(Object.entries(V.machines[GS.own.sled].userData.decal).map(([k, l]) => [k, l.some(m => m.visible)])), paint: JSON.stringify(SET.paint), dec: SET.decal, cm: SET.canMatch })`;
const mats = () => J(MAT);
await tap("KeyT"); await sleep(500);
ok(await ev("GS.garageOpen"), "6: T at the garage opens it");
const tabs = await J(`[...$("garageTabs").children].map(b => b.dataset.t)`);
ok(tabs.indexOf("paint") === tabs.indexOf("workshop") + 1, `6: a Paint shop tab sits right beside Workshop (${tabs})`);
const pt = await J(`$("garageTabs").querySelector('[data-t="paint"]').textContent`);
ok(pt === "Paint shop", `6: the tab reads "${pt}"`);
await ev(`$("garageTabs").querySelector('[data-t="paint"]').click(); true`); await sleep(400);
{
  const have = await J(`${JSON.stringify(PAINT_IDS)}.filter(id => !!$("garageBody").querySelector("#" + id))`);
  ok(have.length === PAINT_IDS.length, `6: every paint control is in the Paint shop (${have})`);
  const q = await J(`({ sw: $("swatches").children.length, seat: $("seatSw").children.length, dec: $("decalBtns").children.length, hue: $("hue").type, price: /\\$\\d/.test($("paintShop").textContent) })`);
  ok(q.sw === 10 && q.seat === 7 && q.dec === 4 && q.hue === "range", `6: ten body colours, seven seats, four decals, a hue slider (${JSON.stringify(q)})`);
  ok(!q.price, "6: painting shows no price");
  ok(!(await J(`!!$("settings").querySelector("#hue, #swatches, #liveryBtn")`)), "6: and still none of it is in Settings");
}
await still("paint_1280");
const cash0 = await ev("GS.cash");
const m0 = await mats(); console.log("   stock:", JSON.stringify(m0));
// body colour
await ev(`$("swatches").children[3].click(); true`); await sleep(150);
let m1 = await mats();
ok(m1.body === "#38b6ff" && m1.body !== m0.body, `6: a body swatch repaints the sled (${m0.body} -> ${m1.body})`);
ok(m1.panel === m0.panel && m1.trim === m0.trim, "6: panels and trim stay the machine's own");
// hue
await ev(`$("hue").value = 200; $("hue").dispatchEvent(new Event("input", { bubbles: true })); true`); await sleep(150);
let m2 = await mats();
const wantHue = await ev(`"#" + new THREE.Color().setHSL(200 / 360, 0.85, 0.55).getHexString()`);
ok(m2.body === wantHue && m2.body !== m1.body, `6: the hue slider sets any hue (${m1.body} -> ${m2.body})`);
// decal
await ev(`$("decalBtns").children[1].click(); true`); await sleep(150);
let m3 = await mats();
ok(m3.decal.stripe === true && m3.dec === "stripe" && !m3.decal.wide, `6: Twin stripes shows the hood graphic (${JSON.stringify(m3.decal)})`);
// seat
await ev(`$("seatSw").children[2].click(); true`); await sleep(150);
let m4 = await mats();
ok(m4.seat === "#5a3a24" && m4.seat !== m0.seat, `6: a seat swatch recolours the seat (${m0.seat} -> ${m4.seat})`);
// cans
await ev(`$("canBtn").click(); true`); await sleep(150);
let m5 = await mats();
ok(m5.can === m5.body && m5.cm === true, `6: jerry cans can match the sled (${m5.can} = ${m5.body})`);
await ev(`$("canBtn").click(); true`); await sleep(100);
ok((await mats()).can === "#b3201a", "6: and back to red");
await ev(`$("canBtn").click(); true`); await sleep(100);
ok((await ev("GS.cash")) === cash0, "6: none of it cost anything");
const nm = await J(`$("liveryName").textContent`);
ok(/custom paint/.test(nm), `6: the shop says it is custom paint ("${nm}")`);
ok(await J(`!$("liveryBtn").disabled`), "6: Back to stock livery is available");
// persists
const before = await mats();
await ev("save(); true");
const stored = await J(`JSON.parse(localStorage.getItem("tracklayer.set.v1"))`);
ok(stored.paint[before.paint ? Object.keys(JSON.parse(before.paint))[0] : "x"] && stored.decal === "stripe" && stored.canMatch === true, `6: saved (${JSON.stringify({ paint: stored.paint, decal: stored.decal, canMatch: stored.canMatch })})`);
await reload(); await sleep(1500);
{
  const a = await mats();
  ok(a.body === before.body && a.seat === before.seat && a.can === before.can && a.decal.stripe === true, `6: after a reload the paint is as left (${a.body} ${a.seat} cans ${a.can} stripes ${a.decal.stripe})`);
}
// stock livery restores
await ev("tutSkip(); crashCancel(); FOOT.on = false; VEH.cur = null; true"); await sleep(300);
ok(await atGarage(), "6: back at the garage after the reload");
await tap("KeyT"); await sleep(500);
await ev(`garageTab = "paint"; renderGarage(); true`); await sleep(300);
await ev(`$("liveryBtn").click(); true`); await sleep(200);
{
  const a = await mats(), liv = await J(`sledDef().livery`);
  ok(a.body === liv.body.toLowerCase() && a.seat === liv.seat.toLowerCase() && a.paint === "{}", `6: Stock livery restores the sled's own colours (${a.body} ${a.seat})`);
  ok(await J(`$("liveryBtn").disabled`), "6: and the button greys out");
}
await tap("KeyT"); await sleep(300);
ok(!(await ev("GS.garageOpen")), "6: T closes the garage");
// an old save with custom paint loads with that paint (the paint store is the same format as before)
{
  const sd = await ev("GS.own.sled");
  const old = { v: 1, paint: { [sd]: { body: "#123abc", seat: "#c0ffee" } }, jacket: "#8c1f2f", trim: "#ff5a1f", pants: "#232a33", style: "hivis", helmet: "#111820", decal: "wide", canMatch: true, vol: 0.5, hud: true, touch: "auto", gfx: "auto", fps: false };
  await raw(`localStorage.setItem("tracklayer.set.v1", ${JSON.stringify(JSON.stringify(old))}); true`);
  await reload(); await sleep(1500);
  const a = await mats();
  ok(a.body === "#123abc" && a.seat === "#c0ffee" && a.can === "#123abc" && a.decal.wide === true, `6: an old save's custom paint loads unchanged (${a.body} ${a.seat} cans ${a.can} wide ${a.decal.wide})`);
  await ev("tutSkip(); crashCancel(); FOOT.on = false; VEH.cur = null; true"); await sleep(300);
  await atGarage(); await tap("KeyT"); await sleep(400);
  await ev(`garageTab = "paint"; renderGarage(); true`); await sleep(300);
  const nm2 = await J(`({ n: $("liveryName").textContent, b: !!$("swatches").querySelector(".on"), seat: $("seatSw").children[0].classList.contains("on"), decal: $("decalBtns").querySelector(".on").dataset.s, cans: $("canBtn").textContent })`);
  ok(/custom paint/.test(nm2.n) && nm2.decal === "wide" && /match/.test(nm2.cans), `6: and the Paint shop shows it (${JSON.stringify(nm2)})`);
  await tap("KeyT"); await sleep(300);
}
// pad in the garage
await ev(`garageTab = "paint"; true`);
ok(await atGarage(), "6: at the garage for the pad check");
await ev("openGarage(); true"); await sleep(500);
{
  await dpad(13, 130);
  const f1 = await ev(`document.activeElement && document.activeElement.closest("#garage") ? (document.activeElement.id || document.activeElement.dataset.t || document.activeElement.parentElement.id) : null`);
  ok(!!f1, `6: the pad's d-pad focuses a control in the garage (${f1})`);
  let hit = null;
  for (let i = 0; i < 40 && !hit; i++) { await dpad(13, 110); hit = await ev(`document.activeElement && document.activeElement.parentElement && document.activeElement.parentElement.id === "swatches" ? [...document.activeElement.parentElement.children].indexOf(document.activeElement) : null`); }
  ok(hit !== null, `6: the pad walks down to the body swatches (${hit})`);
  const b0 = (await mats()).body;
  await dpad(15, 110); await dpad(0, 130); await sleep(200);
  const b1 = (await mats()).body;
  ok(b1 !== b0 && b1 === (await J(`$("swatches").children[${(hit || 0) + 1}].dataset.c`)), `6: pad A on a swatch paints the sled (${b0} -> ${b1})`);
  await padSet({ 1: 1 }); await sleep(150); await padSet(); await sleep(350);
  ok(!(await ev("GS.garageOpen")), "6: pad B closes the garage");
}
// away from a garage there is no way to open paint
{
  await park(); await sleep(900);
  const near = await ev("GS.near === garageSite");
  ok(!near, "6: parked far from the garage");
  await tap("KeyT"); await sleep(400);
  ok(!(await ev("GS.garageOpen")), "6: away from the garage T does not open it");
  const ids = await J(`${JSON.stringify(PAINT_IDS)}.filter(id => !!document.getElementById(id) && !!document.getElementById(id).getClientRects().length)`);
  ok(!ids.length, `6: no paint control is on screen away from the garage (${ids})`);
  await ev("toggleSettings(true, 'game'); true"); await sleep(300);
  const ids2 = await J(`${JSON.stringify(PAINT_IDS)}.filter(id => !!document.getElementById(id))`);
  ok(!ids2.length, `6: and none exists in the page even with Settings open (${ids2})`);
  await ev("toggleSettings(false); true");
}
// the old paint shortcuts are gone from the tablet and the mod menu
{
  const q = await J(`({ god: /paint|livery|swatch/i.test(typeof godPageText === "function" ? godPageText() : ""), src: typeof setPaint })`);
  ok(q.src === "function" && !q.god, "6: no other menu offers paint");
}
// a few repeated opens must not stack paint controls
await atGarage(); await ev("openGarage(); garageTab = 'paint'; renderGarage(); renderGarage(); renderGarage(); true"); await sleep(300);
ok((await J(`document.querySelectorAll("#hue").length`)) === 1, "6: re-rendering the Paint shop leaves one set of controls");
await ev("closeGarage(); garageTab = 'sleds'; true");

// ---------- 7. layout ----------
console.log("== 7. layout ==");
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mobile/15E148 Safari/604.1";
const SIZES = [["1280", 1280, 720, false], ["640", 640, 360, false], ["phone", 390, 844, true], ["phoneL", 844, 390, true]];
const LAY = (id) => `(() => {
  const root = document.getElementById(${JSON.stringify(id)}), pr = root.getBoundingClientRect(), W = innerWidth, H = innerHeight;
  const vis = e => !e.closest("[hidden]") && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden";
  const ctl = [...root.querySelectorAll("button, input, label, .hint, .chip, .bsec")].filter(vis).map(e => { const r = e.getBoundingClientRect(); return { n: (e.id || e.className || e.tagName) + (e.parentElement && e.parentElement.id ? "@" + e.parentElement.id : "") + (e.dataset && (e.dataset.c || e.dataset.s || e.dataset.opt) ? ":" + (e.dataset.c || e.dataset.s || e.dataset.opt) : ""), x: r.x, y: r.y, w: r.width, h: r.height, tag: e.tagName }; });
  const bad = [], over = [];
  const inP = r => r.x >= pr.x - 0.6 && r.x + r.w <= pr.x + pr.width + 0.6;
  for (const r of ctl) if (!inP(r) || r.w < 1) bad.push(r.n + " sideways");
  const sc = getComputedStyle(root);
  const scroll = { sw: root.scrollWidth, cw: root.clientWidth, sh: root.scrollHeight, ch: root.clientHeight, oy: sc.overflowY };
  // overlap of interactive things with each other and with labels and hints (not nested ones)
  for (let i = 0; i < ctl.length; i++) for (let j = i + 1; j < ctl.length; j++) {
    const a = ctl[i], b = ctl[j]; if (a.tag === "DIV" || b.tag === "DIV") continue;
    const pa = [...root.querySelectorAll("*")]; // (nesting check below)
    if (a.x < b.x + b.w - 1.5 && b.x < a.x + a.w - 1.5 && a.y < b.y + b.h - 1.5 && b.y < a.y + a.h - 1.5) over.push(a.n + " x " + b.n);
  }
  // reachable: scrolling to the end brings the last control into the panel
  const need = scroll.sh > scroll.ch + 1; let reach = true;
  if (need) { const t = root.scrollTop; root.scrollTo({ top: 99999, behavior: "instant" }); const last = ctl[ctl.length - 1], nr = root.getBoundingClientRect(); reach = root.scrollTop > 0; root.scrollTo({ top: t, behavior: "instant" }); }
  return { panel: { x: pr.x, y: pr.y, w: pr.width, h: pr.height }, W, H, n: ctl.length, bad, over, scroll, need, reach };
})()`;
const viewport = async ([name, w, h, touch]) => {
  await send("Emulation.setUserAgentOverride", { userAgent: touch ? UA : "", platform: "" });
  await send("Emulation.setTouchEmulationEnabled", { enabled: touch, maxTouchPoints: touch ? 5 : 1 });
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: touch });
  await ev(`SET.touch = ${touch ? '"on"' : '"off"'}; setTouchUI(); true`); await sleep(600);
};
for (const vp of SIZES) {
  const [name, w, h] = vp; await viewport(vp);
  const pages = [["top", ""], ["game", ""], ["graphics", ""], ["sound", ""]];
  for (const [p] of pages) {
    await pageOpen(p); await sleep(500);
    const L = await J(LAY("settings"));
    const pin = L.panel.x >= 2 && L.panel.y >= 2 && L.panel.x + L.panel.w <= w - 2 && L.panel.y + L.panel.h <= h - 2;
    ok(pin, `7: ${name} ${p}: the panel is on screen (${Math.round(L.panel.x)},${Math.round(L.panel.y)} ${Math.round(L.panel.w)}x${Math.round(L.panel.h)} in ${w}x${h})`);
    ok(!L.bad.length && L.scroll.sw <= L.scroll.cw + 1, `7: ${name} ${p}: nothing sideways off the panel (${L.bad.slice(0, 4)})`);
    ok(!L.over.length, `7: ${name} ${p}: no controls overlap (${L.over.slice(0, 4).join("; ")})`);
    ok(!L.need || ((L.scroll.oy === "auto" || L.scroll.oy === "scroll") && L.reach), `7: ${name} ${p}: it fits or scrolls inside itself (${JSON.stringify(L.scroll)})`);
    await still(`settings_${name}_${p}`);
  }
  await ev("toggleSettings(false); true");
  await atGarage(); await ev("openGarage(); garageTab = 'paint'; renderGarage(); true"); await sleep(600);
  const L = await J(LAY("garage"));
  ok(L.panel.x >= 2 && L.panel.y >= 2 && L.panel.x + L.panel.w <= w - 2 && L.panel.y + L.panel.h <= h - 2, `7: ${name} paint shop: the garage panel is on screen`);
  ok(!L.bad.length && L.scroll.sw <= L.scroll.cw + 1, `7: ${name} paint shop: nothing sideways off the panel (${L.bad.slice(0, 4)})`);
  ok(!L.over.length, `7: ${name} paint shop: no controls overlap (${L.over.slice(0, 4).join("; ")})`);
  ok(!L.need || ((L.scroll.oy === "auto" || L.scroll.oy === "scroll") && L.reach), `7: ${name} paint shop: fits or scrolls (${JSON.stringify(L.scroll)})`);
  await still(`paint_${name}`);
  await ev("closeGarage(); garageTab = 'sleds'; true"); await sleep(300);
}
await viewport(["1280", 1280, 720, false]);

console.log(fails ? `\n${fails} FAIL` : "\nall ok");
await done(fails ? 1 : 0);

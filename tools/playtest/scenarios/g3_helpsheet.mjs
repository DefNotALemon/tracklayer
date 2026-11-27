// Tracklayer: the cheat-sheet (#help, top right) and the "STUCK?" card name the controls in hand (beta 0150 #1, 0320).
// The sheet was fixed keyboard text, so a pad player read W / S, Ctrl, Tab and Esc; the stuck card said PRESS N to
// someone holding a pad trigger, and a trigger held at 15% did not even count as "a pad is in hand".
//  1. keyboard: the sheet it always had (W / S, Ctrl, Tab, Esc, H to hide), the card says PRESS N.
//  2. Xbox, DualSense and Switch pads: every key name on the sheet is that pad's own, none is a keyboard key or another
//     brand's; the card names that pad's reset; no row's name runs into its text; the sheet lies clear of the other HUD.
//  3. the sheet tells the truth on a pad: the buttons it names for the tablet, the weather, the view, the wheelie and
//     Settings really do those things.
//  4. a pad trigger held at 15% (not "pressed") is a pad in hand; a key press brings the keyboard sheet back.
//  5. a real stuck sled shows the card, worded for the pad.
//  6. touch: no sheet on screen, the card says TAP ↺.
// Found while writing 3 (a game bug, fixed with it): on a pad every second press of Menu flashed Settings up for one frame
// and shut it again. 3 presses Menu four times running, held several frames, and Settings must open and shut each time.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_helpsheet.mjs [outdir]     (NOSTILLS=1 skips the stills)
import { boot, ev, send, sleep, shot, park, padSet, padOff, tap, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const NOSTILLS = !!process.env.NOSTILLS;
await boot({ width: 1500, height: 1050 });   // tall: the sheet's long rows (.mx) show from 1000 px up
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GOD.warm = true; GS.storm = 0; WX.at = () => 0; $("help").hidden = false; true`); await sleep(500);   // boot() hides the sheet with H: put it back up
await park(); await sleep(400);
// what is on the sheet: each row's key names (the first is the row's own), its text, and whether a name runs into the text
const sheet = () => J(`(() => { const h = $("help"), cs = getComputedStyle(h), hr = h.getBoundingClientRect();
  const rows = [...h.children].filter(d => getComputedStyle(d).display !== "none").map(d => { const bs = [...d.querySelectorAll("b")].map(b => b.textContent);
    const b = d.querySelector("b"), tn = b.nextSibling; let gap = 99;
    if (tn && tn.nodeType === 3 && tn.textContent.trim()) { const r = document.createRange(); r.setStart(tn, 0); r.setEnd(tn, 1); const a = r.getBoundingClientRect(), q = b.getBoundingClientRect(); if (Math.abs(a.top - q.top) < 8) gap = a.left - q.right + parseFloat(getComputedStyle(b).paddingRight); }
    return { keys: bs, text: d.textContent, gap }; });
  const vis = e => e && !e.hidden && getComputedStyle(e).display !== "none" && getComputedStyle(e).visibility !== "hidden" && e.getBoundingClientRect().width > 0;
  const hit = ["mapWrap", "job", "speedo", "vit", "compass", "toasts", "wnHud", "flip"].filter(id => { const e = $(id); if (!vis(e)) return false; const r = e.getBoundingClientRect(); return r.left < hr.right && r.right > hr.left && r.top < hr.bottom && r.bottom > hr.top; });
  return { shown: !h.hidden && cs.display !== "none", cls: h.className, rows, flip: $("flip").textContent, dev: INP.dev, pad: INP.pad, box: [Math.round(hr.left), Math.round(hr.top), Math.round(hr.right), Math.round(hr.bottom)], vw: innerWidth, vh: innerHeight, hit }; })()`);
const keysOf = S => S.rows.flatMap(r => r.keys);
const KB = ["W / S", "A / D", "Shift", "Space", "Ctrl", "S / ↓", "N", "E", "T", "G", "P", "Z", "Q", "Tab", "B", "V", "M", "J", "Esc", "H"];

// ---- 1. keyboard
await tap("KeyG"); await sleep(400);
{ const S = await sheet(); console.log("kbm:", JSON.stringify(keysOf(S)), S.flip);
  ok(S.dev === "kbm" && S.shown, "1: keyboard in hand, the sheet is up");
  ok(S.rows.length === 19, "1: all 19 rows on a tall screen (" + S.rows.length + ")");
  for (const k of ["W / S", "A / D", "Ctrl", "Tab", "Esc", "H", "N", "Y", "M", "J"]) ok(keysOf(S).includes(k), `1: the keyboard sheet names ${k}`);
  ok(!/\b(RT|LT|LB|RB|L3|R3|D-pad|Left stick|View|Menu)\b/.test(S.rows.map(r => r.text).join(" | ")), "1: no pad name on the keyboard sheet");
  ok(S.flip === "STUCK? PRESS N", `1: the card says "${S.flip}"`);
  ok(!/pad/.test(S.cls), "1: the sheet keeps its keyboard layout (" + S.cls + ")");
  ok(S.rows.every(r => r.gap >= 0), "1: no key name runs into its text");
  ok(S.hit.length === 0 && S.box[2] <= S.vw && S.box[3] <= S.vh, "1: the sheet is on screen and clear of the HUD (" + S.box + ", over: " + S.hit + ")");
  if (!NOSTILLS) await shot("helpsheet_kbm");
}

// ---- 2. pads
const PADS = {
  xbox: { id: undefined, want: ["RT / LT", "Left stick", "RB", "A", "X", "LT", "View", "L3", "B", "D-pad down", "D-pad left", "LB", "D-pad up", "D-pad right", "R3", "Menu", "Y"], flip: "STUCK? PRESS VIEW", not: /^(R2|L2|R1|L1|ZR|ZL|Create|Options|✕|○|□|△|−|\+)$/ },
  ps: { id: "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)", want: ["R2 / L2", "Left stick", "R1", "✕", "□", "L2", "Create", "L3", "○", "D-pad down", "D-pad left", "L1", "D-pad up", "D-pad right", "R3", "Options", "△"], flip: "STUCK? PRESS CREATE", not: /^(RT|LT|RB|LB|ZR|ZL|View|Menu|A|B|X|Y|−|\+)$/ },
  nin: { id: "Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)", want: ["ZR / ZL", "Left stick", "R", "B", "Y", "ZL", "−", "Left stick click", "A", "D-pad down", "D-pad left", "L", "D-pad up", "D-pad right", "Right stick click", "+", "X"], flip: "STUCK? PRESS −", not: /^(RT|LT|RB|LB|R2|L2|R1|L1|View|Menu|Create|Options|✕|○|□|△|L3|R3)$/ }
};
for (const [nm, W] of Object.entries(PADS)) {
  await padSet({ 5: 1 }, [0, 0, 0, 0], W.id); await sleep(500); await padSet({}, [0, 0, 0, 0], W.id); await sleep(400);
  const S = await sheet(), K = keysOf(S); console.log(nm + ":", JSON.stringify(K), S.flip, S.box);
  ok(S.dev === "pad" && S.pad === nm && S.shown, `2 ${nm}: the pad is in hand, the sheet is up`);
  ok(S.rows.length === 18, `2 ${nm}: 18 rows (${S.rows.length})`);
  for (const k of W.want) ok(K.includes(k), `2 ${nm}: the sheet names ${k}`);
  const kb = K.filter(k => KB.includes(k) && !W.want.includes(k)), other = K.filter(k => W.not.test(k) && !W.want.includes(k));
  ok(kb.length === 0, `2 ${nm}: no keyboard key on the sheet (${kb})`);
  ok(other.length === 0, `2 ${nm}: no other pad's name on the sheet (${other})`);
  ok(K.every(k => k && !/undefined|null/.test(k)) && S.rows.every(r => r.text.length >= r.keys[0].length + 3), `2 ${nm}: every row has a name and its words`);
  ok(S.flip === W.flip, `2 ${nm}: the card says "${S.flip}"`);
  ok(S.rows.every(r => r.gap >= 0), `2 ${nm}: no name runs into its text (tightest ${Math.min(...S.rows.map(r => r.gap)).toFixed(1)} px)`);
  ok(S.hit.length === 0 && S.box[0] >= S.vw / 2 && S.box[2] <= S.vw && S.box[3] <= S.vh, `2 ${nm}: on screen, in the right half, clear of the HUD (${S.box}, over: ${S.hit})`);
  if (!NOSTILLS) await shot("helpsheet_" + nm);
}

// ---- 3. the Xbox sheet tells the truth
// under another lane's gate the page runs at a few frames a second: waits are counted in the game's own frames, not only wall time
await ev(`(() => { window.__fc = 0; const f = () => { window.__fc++; requestAnimationFrame(f); }; requestAnimationFrame(f); return 1; })()`);
const frames = async (n, minMs = 0) => { const f0 = await J(`window.__fc`), t0 = Date.now(); while ((await J(`window.__fc`)) - f0 < n || Date.now() - t0 < minMs) await sleep(40); };
const press = async (i, ms = 200) => { await padSet({ [i]: 1 }); await frames(3, ms); await padSet({}); await frames(4, 450); };
await padSet({ 5: 1 }); await sleep(300); await padSet({}); await sleep(300);
await ev(`TABLET.close(); P.vx = P.vz = 0; true`); await sleep(300);
await press(12); ok(await J(`TABLET.open`), "3: D-pad up brings the dash tablet up");
await ev(`TABLET.close(); true`); await sleep(500);
await press(15); { const t = await J(`({ open: TABLET.open, app: TABLET.app })`); ok(t.open && t.app === "weather", "3: D-pad right opens Weather (" + JSON.stringify(t) + ")"); }
await ev(`TABLET.close(); true`); await sleep(500);
{ const c0 = await J(`camMode`); let c1 = c0; for (let n = 0; n < 3 && c1 === c0; n++) { await press(11, 120); c1 = await J(`camMode`); if (c1 === c0) await ev(`window.TLXCAM && TLXCAM.on && TLXCAM.claimR3(); true`); }   /* a tap held too long by a slow frame lifts the camera instead: put it down and tap again */ ok(c0 !== c1, `3: R3 cycles the view (${c0} -> ${c1})`); await press(11); await press(11); }
await padSet({ 2: 1 }); await sleep(300); { const w = await J(`input.wheelie`); ok(w === 1, "3: X is the wheelie (input.wheelie " + w + ")"); } await padSet({}); await sleep(300);
await ev(`crashCancel(); P.vx = P.vz = 0; true`); await frames(3, 300);
await press(9); { const q = await J(`({ open: !$("settings").hidden, crash: CRASH.on, dead: !!GS.dead, god: godOpen, tab: TABLET.open, cam: !!(window.TLXCAM && TLXCAM.on), spd: Math.hypot(P.vx, P.vz) })`); ok(q.open, "3: Menu opens Settings (" + JSON.stringify(q) + ")"); }
await press(1); ok(await J(`$("settings").hidden`), "3: B backs out of it");
// Menu, held as long as a thumb holds it (several frames), opens Settings every time and closes it every time: every
// second press used to flash the panel up for one frame and shut it (the panel read the opening press as its own "close")
{ const seen = []; for (let n = 0; n < 4; n++) { await press(9, n % 2 ? 350 : 120); const o = await J(`!$("settings").hidden`); await press(9, 150); const c = await J(`$("settings").hidden`); seen.push((o ? "open" : "SHUT") + "/" + (c ? "shut" : "OPEN")); }
  ok(seen.every(s => s === "open/shut"), "3: four times running, Menu opens Settings and Menu shuts it (" + seen.join(", ") + ")"); }
await ev(`toggleSettings(false); true`);
await ev(`P.vx = P.vz = 0; true`);

// ---- 4. a feathered trigger is a pad in hand; a key brings the keyboard sheet back
await padOff(); await sleep(200); await tap("KeyG"); await sleep(400);
ok((await sheet()).dev === "kbm", "4: a key press: keyboard in hand again");
ok(keysOf(await sheet()).includes("W / S") && (await sheet()).flip === "STUCK? PRESS N", "4: the keyboard sheet and card are back");
await ev(`P.vx = P.vz = 0; true`);
await padSet({ 7: 0.15 }); await frames(3, 600);
{ const S = await sheet(); ok(S.dev === "pad" && keysOf(S).includes("RT / LT") && S.flip === "STUCK? PRESS VIEW", `4: RT held at 15% makes it the pad's sheet and card (${S.dev}, "${S.flip}")`); }
await padSet({}); await sleep(300);

// ---- 5. a sled really stuck (held on its back) shows the card
await ev(`(() => { crashCancel(); FOOT.on = false; window.__tipI = setInterval(() => { CRASH.cool = 1; P.roll = 2.4; P.vx = P.vz = 0; }, 4); return 1; })()`);
let seen = null, lastF = null; { const g0 = await J(`gameClock`), w0 = Date.now(); while (!seen && Date.now() - w0 < 150000) { await sleep(250); const f = lastF = await J(`({ g: gameClock - ${g0}, hid: $("flip").hidden, disp: getComputedStyle($("flip")).display, t: $("flip").textContent, st: P.stuckT, roll: P.roll, crash: CRASH.on, foot: FOOT.on, bog: BOG.on, help: HELP.on })`); if (!f.hid && f.disp !== "none") seen = f; } }
if (!seen) console.log("5 last:", JSON.stringify(lastF));
ok(!!seen && seen.t === "STUCK? PRESS VIEW", "5: on its back for 2.5 s, the card comes up reading " + (seen ? `"${seen.t}"` : "nothing"));
if (!NOSTILLS && seen) await shot("helpsheet_stuck_pad");
await ev(`clearInterval(window.__tipI); window.__p5 = [P.x, P.z]; P.safe = { x: P.x + 30, z: P.z, yaw: P.yaw }; true`);
await press(8, 150); { const d = await J(`Math.hypot(P.x - window.__p5[0], P.z - window.__p5[1])`); ok(d > 25 && d < 35, "5: View, the button it names, resets the sled to its last safe spot (moved " + d.toFixed(1) + " m)"); }

// ---- 6. touch
await padOff();
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
await ev(`(() => { SET.touch = "on"; setTouchUI(); INP.dev = "touch"; window.__devI = setInterval(() => { INP.dev = "touch"; }, 50); return 1; })()`); await sleep(600);
{ const S = await sheet(); ok(S.dev === "touch" && !S.shown, "6: touch in hand: no sheet on screen");
  ok(S.flip === "STUCK? TAP ↺", `6: the card says "${S.flip}"`);
  ok(await J(`!!document.querySelector('#touch [data-k="reset"]')`), "6: and ↺ is a button the touch layout has"); }
await ev(`clearInterval(window.__devI); true`);
console.log(fails ? `${fails} FAILED` : "all ok");
await done(fails ? 1 : 0);

// Tracklayer: the toasts that tell you what to press name the control of the device in hand (beta 0384 #1). The bogged
// toast said "Get off (Q) and dig (hold E), or press R" to pad and touch players (and R is not the reset: N is, and the
// dig is a press, not a hold); the winch variant, the truck's, the visor's and the garage's had keyboard names too.
// For a keyboard, an Xbox pad, a DualSense and touch: a REAL enterBog() (no winch, with a winch, in a truck's seat via
// the line function), the icing visor and the garage's forecourt say only that device's names. On touch the DIG the
// toast names is the word the use button really wears beside the bogged sled, and the reset it names frees the sled.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_bogtoast.mjs [outdir]     (NOSTILLS=1 skips the still)
import { boot, ev, send, sleep, shot, park, padSet, padOff, tap, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot({ width: 667, height: 375 });
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GOD.warm = true; true`); await sleep(500);
await park(); await sleep(300);
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80);
  return 1; })()`);
// a real bog through the game's own function, its toast read from the recorder; the sled is freed again after
const bogToast = async winch => {
  await ev(`(() => { crashCancel(); FOOT.on = false; if (BOG.on) freeBog("test"); GS.own.parts.winch = ${winch ? `PARTS.winch.options[1].id` : `PARTS.winch.options[0].id`}; restat(); return 1; })()`);
  await clearToasts(); await ev(`enterBog(0.8); true`); await sleep(400);
  const t = (await toasts()).find(m => /^Bogged to the skis/.test(m)) || "";
  await ev(`freeBog("test"); true`); return t;
};
const lines = async () => ({ dig: await bogToast(false), winch: await bogToast(true),
  ...(await J(`({ truck: bogLine(true, false), visor: visorLine(), garage: garageLine(), note: tabNoteHtml({ id: "t", title: "A note", at: 10 }, true), dev: INP.dev, pad: INP.pad })`)) });
// names another device would use: single keyboard letters in brackets or after press/hold, pad names, touch words
const KEYS = /<kbd>Tab<|\((Q|E|R|N|T|Z)\)|\b[Pp]ress (Q|E|R|N|T|Z)\b|\b[Hh]old (E|Space)\b/, PADW = /\b(LB|L1|L3|View|Create|D-pad|Left stick click)\b/, TOUCHW = /\b[Tt]ap [A-Z↺]/;
const WANT = {
  kbm: { dig: ["(Q)", "press E", "press N"], winch: ["(Q)", "(E)"], truck: ["Get out (Q)", "press E", "press N"], visor: ["Press Z"], garage: ["Press T"], note: ["<kbd>Tab</kbd> to open"], not: [PADW, TOUCHW] },
  xbox: { dig: ["(LB)", "press L3", "press View"], winch: ["(LB)", "(L3)"], truck: ["(LB)", "press L3", "press View"], visor: ["Press D-pad left"], garage: ["Press B"], note: ["<kbd>D-pad up</kbd> to open"], not: [KEYS, TOUCHW] },
  ps: { dig: ["(L1)", "press L3", "press Create"], winch: ["(L1)", "(L3)"], truck: ["(L1)", "press L3", "press Create"], visor: ["Press D-pad left"], garage: ["Press ○"], note: ["<kbd>D-pad up</kbd> to open"], not: [KEYS, TOUCHW] },
  touch: { dig: ["Tap GET OFF", "tap DIG", "tap ↺"], winch: ["Tap GET OFF", "tap HOOK"], truck: ["Tap GET OFF", "tap DIG", "tap ↺"], visor: ["Tap WIPE VISOR"], garage: ["Tap GARAGE"], note: ["tap to open"], not: [KEYS, PADW] }
};
const check = (nm, L) => {
  console.log(nm, JSON.stringify(L));
  for (const k of ["dig", "winch", "truck", "visor", "garage", "note"]) {
    ok(typeof L[k] === "string" && L[k].length > 20 && !/undefined|null|\$\{/.test(L[k]), `${nm}: the ${k} line is said ("${L[k]}")`);
    for (const w of WANT[nm][k]) ok(L[k].includes(w), `${nm}: the ${k} line says "${w}"`);
    for (const re of WANT[nm].not) ok(!re.test(L[k]), `${nm}: the ${k} line names no other device's control (${re})`);
    ok(!/hold E|press R\b/.test(L[k]), `${nm}: the ${k} line has no "hold E" / "press R"`);
  }
};
// 1. keyboard
await tap("KeyH"); await sleep(300); await tap("KeyH"); await sleep(300);
{ const L = await lines(); ok(L.dev === "kbm", "keyboard in hand"); check("kbm", L); }
// 2. pads
const PADS = { xbox: undefined, ps: "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)" };
for (const [nm, id] of Object.entries(PADS)) {
  await padSet({ 7: 1 }, [0, 0, 0, 0], id); await sleep(500); await padSet({}, [0, 0, 0, 0], id); await sleep(400);
  await ev(`P.vx = P.vz = 0; true`);
  const L = await lines(); ok(L.dev === "pad" && L.pad === nm, nm + " pad in hand"); check(nm, L);
}
await padOff(); await sleep(300);
// 3. touch: the lines, then the words they name are the buttons really on screen
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
await ev(`(() => { SET.touch = "on"; setTouchUI(); INP.dev = "touch"; window.__devI = setInterval(() => { INP.dev = "touch"; }, 50); return 1; })()`); await sleep(500);
{ const L = await lines(); ok(L.dev === "touch", "touch in hand"); check("touch", L); }
await ev(`(() => { crashCancel(); FOOT.on = false; GS.own.parts.winch = PARTS.winch.options[0].id; restat(); P.vx = P.vz = 0; return 1; })()`);
await clearToasts(); await ev(`enterBog(0.8); true`);
let seen = "", q = null;
for (let i = 0; i < 25; i++) { await sleep(120); seen = await ev(`[...$("toasts").children].map(c => c.textContent).find(m => /^Bogged/.test(m)) || ""`); q = await J(`({ hid: $("tcQ").hidden, txt: $("tcQ").textContent })`); if (seen && !q.hid) break; }
ok(/Tap GET OFF and tap DIG beside the sled to dig, or tap ↺ to reset\./.test(seen), `touch: the toast on screen after a real bog reads for touch ("${seen}")`);
ok(!q.hid && q.txt === "GET OFF", `touch: the GET OFF it names is the button on screen ("${q.txt}")`);
if (!process.env.NOSTILLS) await shot("bogtoast_touch_667x375");
// on foot beside the sled the use button wears DIG, and a press starts the dig
await ev(`(() => { FOOT.on = true; FOOT.x = P.x + 1.5; FOOT.z = P.z; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; MNT.on = false; DMT.on = false; if (FOOT.g) FOOT.g.visible = true; GS.warmth = 100; return 1; })()`);
let use = null;
for (let i = 0; i < 25; i++) { await sleep(120); use = await J(`({ lab: footUse(), hid: $("tcUse").hidden, txt: $("tcUse").textContent, bog: BOG.on })`); if (use.lab === "DIG" && !use.hid && use.txt === "DIG") break; }
ok(use.bog && use.lab === "DIG" && !use.hid && use.txt === "DIG", `touch: beside the bogged sled the use button wears DIG (${JSON.stringify(use)})`);
await ev(`footAction(); true`); await sleep(300);
ok(await ev(`FOOT.dig === true`), "touch: one press starts the dig (a press, not a hold)");
await ev(`footAction(); true`); await sleep(200);
// the reset the line names frees the sled
await ev(`(() => { FOOT.on = false; FOOT.dig = false; if (FOOT.g) FOOT.g.visible = false; return 1; })()`); await sleep(200);
ok(await ev(`BOG.on === true`), "still bogged before the reset");
await send("Emulation.setTouchEmulationEnabled", { enabled: false });
await ev(`clearInterval(window.__devI); true`);
await tap("KeyN"); await sleep(600);
ok(await ev(`BOG.on === false`), "keyboard: N (the reset the line names) frees the bogged sled");
{ const L = await J(`({ dev: INP.dev, dig: bogLine(false, false) })`); ok(L.dev === "kbm" && L.dig.includes("press N"), `back on the keyboard the line reads for keys again ("${L.dig}")`); }
console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);

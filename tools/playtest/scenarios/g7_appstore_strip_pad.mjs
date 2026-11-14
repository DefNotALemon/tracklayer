// Beta 0178: v226 strip fix under a pad. d-pad right/left with a long press (400 ms) to separate "press dropped" from "focus lost".
import { boot, ev, shot, sleep, done, errors, padSet, padOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const FOC = `(() => { const el = document.querySelector('#tabV .stcard.tfoc'); const s = document.querySelector('#tabV .stcards');
  return { card: el ? el.dataset.tf : null, sl: s ? Math.round(s.scrollLeft) : null, ae: TABLET.focus, view: STO.view, open: !!TABLET.open }; })()`;
await boot();
await ev("tutSkip(); GS.cash = 1000; delete GS.apps.freight; delete GS.apps.rescue; delete GS.apps.realestate; TABLET.toggle(true, 'store'); true"); await sleep(1000);
const cards = await J(`[...document.querySelectorAll('#tabV .stcard')].map(e => e.dataset.tf)`);
await ev(`TABLET.focus = '${cards[0]}'; TABLET.paintFocus(); true`); await sleep(200);
const pr = async (b, ms) => { await padSet({ [b]: 1 }); await sleep(ms); await padSet(); await sleep(350); };
const log = [];
for (let i = 0; i < 4; i++) { await pr(15, 400); log.push(await J(FOC)); }
console.log("right", JSON.stringify(log));
ok(log.at(-1).card === cards.at(-1), "long-press d-pad right reaches last card: " + log.at(-1).card);
const back = [];
for (let i = 0; i < 3; i++) { await pr(14, 400); back.push(await J(FOC)); }
console.log("left", JSON.stringify(back));
ok(back.at(-1).card === cards[0], "long-press d-pad left returns to first: " + back.at(-1).card);
ok(back.every(v => v.card), "focus never lost on left presses");
await shot("g7sp_end");
await padOff();
ok(errors.length === 0, "no page errors");
await done(fails ? 1 : 0);

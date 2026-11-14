// Report 0168 #1: keyboard/pad focus on the App Store's Today card strip must scroll the focused card into view.
// Arrow right across every card, then back left, and the same with the pad d-pad; each focused card must sit inside the
// strip's visible window. Also on a narrow portrait phone layout.
import { boot, ev, shot, sleep, done, tap, errors, padSet, padOff, send } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const VIS = `(() => { const el = document.querySelector('#tabV .stcard.tfoc'); if (!el) return { card: null };
  const s = el.closest('.stcards'), offX = q => { let x = 0, m = q; while (m && m !== document.querySelector('#tabV')) { x += m.offsetLeft; m = m.offsetParent; } return x; };
  const lx = offX(el) - offX(s);
  return { card: el.dataset.tf, lx, w: el.offsetWidth, sl: Math.round(s.scrollLeft), cw: s.clientWidth, sw: s.scrollWidth,
    vis: lx >= s.scrollLeft - 1 && lx + el.offsetWidth <= s.scrollLeft + s.clientWidth + 1 }; })()`;
await boot();
await ev("tutSkip(); GS.cash = 1000; delete GS.apps.freight; delete GS.apps.rescue; delete GS.apps.realestate; TABLET.toggle(true, 'store'); true"); await sleep(1000);
const cards = await J(`[...document.querySelectorAll('#tabV .stcard')].map(e => e.dataset.tf)`);
console.log("cards:", cards.join(" "));
ok(cards.length >= 3, "Today strip has cards");
async function sweep(label, right, left) {
  await ev(`TABLET.focus = '${cards[0]}'; TABLET.paintFocus(); true`); await sleep(150);
  const seen = [];
  for (let i = 0; i < cards.length - 1; i++) { await right(); await sleep(250); const v = await J(VIS); seen.push(v); }
  console.log(label, "right:", JSON.stringify(seen.map(v => [v.card, v.lx, v.sl, v.cw])));
  ok(seen.at(-1).card === cards.at(-1), `${label}: right reaches the last card (${seen.at(-1).card})`);
  ok(seen.every(v => v.card && v.vis), `${label}: every card focused going right is in view`);
  const back = [];
  for (let i = 0; i < cards.length - 1; i++) { await left(); await sleep(250); back.push(await J(VIS)); }
  console.log(label, "left:", JSON.stringify(back.map(v => [v.card, v.lx, v.sl])));
  ok(back.at(-1).card === cards[0] && back.every(v => v.vis), `${label}: back left, every card in view, ends on the first`);
}
await sweep("keyboard", () => tap("ArrowRight"), () => tap("ArrowLeft"));
await shot("g7s_kb_last");
const pr = async b => { await padSet({ [b]: 1 }); await sleep(180); await padSet(); };
await sweep("pad", () => pr(15), () => pr(14));
await padOff();
// narrow portrait phone: cards are 82% wide, so each step must scroll
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await ev(`dispatchEvent(new Event("resize")); TABLET.go('store'); TABLET.render(); true`); await sleep(900);
await sweep("phone", () => tap("ArrowRight"), () => tap("ArrowLeft"));
await shot("g7s_phone");
// Enter opens the card that is focused and visible
await ev(`TABLET.focus = '${cards.at(-1)}'; TABLET.paintFocus(); true`); await sleep(200);
ok((await J(VIS)).vis, "a focus set straight on the last card scrolls it into view");
await tap("Enter"); await sleep(400);
ok(await J(`STO.view === "detail" && "stc:" + STO.sel === ${JSON.stringify(cards.at(-1))}`), "Enter opens the focused, visible card");
ok(errors.length === 0, "no page errors " + errors.join(" | "));
await done(fails ? 1 : 0);

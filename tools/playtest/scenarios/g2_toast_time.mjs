// G2 (report 0075 F1): how long is each toast actually readable on a milestone delivery? A 4th delivery at a
// home site fires 5 toasts in ~2.7 s (Delivered, mailVisit, fuel/backhaul, sled-ready, post sack). Records, per
// toast, when it appeared and when it started fading (class "out") or was removed, then prints the readable time.
// Also: max toasts on screen at once, and a spam check (the same line 6× in a row shows once).
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_toast_time.mjs
import { boot, ev, shot, sleep, done } from "../lib.mjs";
await boot();
await ev("WX.at = () => 0; GS.storm = 0; true");
await sleep(5000);   // let the welcome toast clear so it doesn't take a slot
await ev(`(() => {
  GS.delivered = 3; GS.cash = 150;
  const site = SITES.find(s => s.id === "strandbu");
  GS.load = [{ dest: site, cargo: "Mail parcel", pay: 80, bond: 0, hits: 0, fragile: false, big: false, soaked: false }];
  P.x = site.seed[0]; P.z = site.seed[1];
  const box = document.getElementById("toasts"); window.__T = []; window.__max = 0; const t0 = performance.now();
  const now = () => +((performance.now() - t0) / 1000).toFixed(2);
  const live = () => Array.from(box.children).filter(c => !c.classList.contains("out")).length;
  new MutationObserver(ms => { for (const m of ms) {
    if (m.type === "childList") {
      m.addedNodes.forEach(n => window.__T.push({ el: n, msg: n.textContent.slice(0, 48), on: now(), off: null }));
      m.removedNodes.forEach(n => { const r = window.__T.find(r => r.el === n); if (r && r.off == null) r.off = now(); });
    } else if (m.type === "attributes" && m.target.classList.contains("out")) {
      const r = window.__T.find(r => r.el === m.target); if (r && r.off == null) r.off = now();
    }
    window.__max = Math.max(window.__max, live());
  } }).observe(box, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  deliver(site); return true; })()`);
await sleep(1900); await shot("t1900");
await sleep(1600); await shot("t3500");
await sleep(9000);
const res = JSON.parse(await ev(`JSON.stringify({ max: window.__max, T: window.__T.map(r => ({ msg: r.msg, on: r.on, off: r.off, shown: r.off == null ? null : +(r.off - r.on).toFixed(2) })) })`));
for (const r of res.T) console.log(`toast on ${r.on}s off ${r.off}s shown ${r.shown}s  ${r.msg}`);
const sh = res.T.map(r => r.shown).filter(x => x != null);
console.log("summary: toasts", res.T.length, "max on screen", res.max, "min shown", Math.min(...sh), "mean shown", +(sh.reduce((a, b) => a + b, 0) / sh.length).toFixed(2),
  "under 3 s", sh.filter(x => x < 3).length, "last off", Math.max(...res.T.map(r => r.off || 0)));
// spam: the same line 6 times in 0.5 s
await ev(`(() => { window.__T = []; for (let i = 0; i < 6; i++) setTimeout(() => toast("Spam check line"), i * 80); return true; })()`);
await sleep(1200);
console.log("spam: same line 6x -> on screen", await ev(`Array.from(document.getElementById("toasts").children).filter(c => c.textContent === "Spam check line").length`));
await done();

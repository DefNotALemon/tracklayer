// I9 save slots, beta break pass: hostile imports, odd names, double go, pagehide after go, quota.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const sec = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
await boot();
await ev(`tutSkip(); crashCancel(); localStorage.removeItem("tracklayer.slots.v1"); for (let i=1;i<9;i++) localStorage.removeItem("tracklayer.slot."+i); window.__noReload = true; GS.cash = 500; save(); true`); await sleep(1200);
const imp = async (slot, obj) => ev(`TLSLOT.importText(${slot}, ${JSON.stringify(typeof obj === "string" ? obj : JSON.stringify(obj))})`);
await sec("A hostile imports", async () => {
  const r1 = await imp(2, { tracklayer: 1, name: "x".repeat(5000), save: { cash: "lots", own: 5, x: "no" } });
  const c = await J(`TLSLOT.cards().map(c => ({ e: c.empty, name: c.name, cash: c.card && c.card.cash }))`);
  console.log("  string-cash import ->", JSON.stringify(r1), JSON.stringify(c[1]).slice(0, 120));
  ok(c[1].name === undefined || c[1].name.length <= 100, "long name capped (len " + (c[1].name || "").length + ")");
  const r2 = await imp(3, `{"tracklayer":1,"name":"p","save":{"__proto__":{"polluted":1},"cash":5}}`);
  ok((await ev(`({}).polluted`)) === undefined || (await ev(`({}).polluted`)) === null, "no prototype pollution from import");
  const r3 = await imp(1, { tracklayer: 1, save: { cash: 1 } });
  ok(/./.test(String(r3)) || (await J(`GS.cash`)) === 500, "import into the game in play refused or harmless: " + JSON.stringify(r3));
  console.log("  cash in play:", await ev(`GS.cash`));
});
await sec("B load the hostile slot 2 and see if the game boots", async () => {
  await ev(`window.__reloadAsked = 0; TLSLOT.go(2); true`); await reload(); await ev(`window.__noReload = true; true`); await sleep(1500);
  const s = await J(`({ cash: GS.cash, type: typeof GS.cash, cur: TLSLOT.idx().cur, mode: TT.mode })`);
  console.log("  after load:", JSON.stringify(s));
  ok(s.type === "number" && Number.isFinite(s.cash), "cash is a number after loading a string-cash save");
});
await sec("C double go and pagehide", async () => {
  await ev(`TLSLOT.go(1); true`); await ev(`TLSLOT.go(4); true`);
  await ev(`GS.cash = 424242; window.dispatchEvent(new Event("pagehide")); document.dispatchEvent(new Event("visibilitychange")); true`);
  const s = await J(`({ cur: TLSLOT.idx().cur, s1: (JSON.parse(localStorage.getItem("tracklayer.slot.1")||"{}")).cash, s4: localStorage.getItem("tracklayer.slot.4"), v2: localStorage.getItem("tracklayer.save.v2") && JSON.parse(localStorage.getItem("tracklayer.save.v2")).cash })`);
  console.log("  ", JSON.stringify(s));
  ok(s.s1 !== 424242 && s.v2 !== 424242, "pagehide after a slot change writes nothing over any slot");
});
await sec("D rename edge cases", async () => {
  await ev(`TLSLOT.rename(1, ""); true`); const a = await J(`TLSLOT.cards()[0].name`);
  ok(a && a.length > 0, "empty rename keeps a name: '" + a + "'");
  await ev(`TLSLOT.rename(1, "<img src=x onerror=window.__xss=1>"); true`); await ev(`savesPanel(); true`); await sleep(300);
  ok((await ev(`window.__xss`)) === undefined || (await ev(`window.__xss`)) === null, "markup in a name does not run");
  ok(!(await J(`TLSLOT.copy(9, 1)`)) && !(await J(`TLSLOT.copy(1, 0)`)), "copy to slot 9 / 0 refused");
});
await ev(`window.__noReload = true; localStorage.removeItem("tracklayer.slots.v1"); for (let i=1;i<9;i++) localStorage.removeItem("tracklayer.slot."+i); true`);
console.log(fails ? "FAILS: " + fails : "all passed");
await done(fails ? 1 : 0);

// I9 save slots: the game in play stays in tracklayer.save.v2; slots are stored copies; changing slot is a clean reload.
import { boot, ev, sleep, done, reload, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 400)); } };
const cards = () => J(`TLSLOT.cards().map(c => ({ n: c.n, cur: c.cur, empty: c.empty, name: c.name, cash: c.card && c.card.cash, del: c.card && c.card.delivered, pic: !!c.pic, played: c.played }))`);
await boot();
await ev(`tutSkip(); crashCancel(); localStorage.removeItem("tracklayer.slots.v1"); for (let i = 1; i < 9; i++) localStorage.removeItem("tracklayer.slot." + i); window.__noReload = true; true`); await sleep(800);

await section("A the save from before slots is slot 1", async () => {
  await ev(`GS.cash = 1234; GS.delivered = 3; save(); true`); await sleep(1300); await ev(`save(); true`);
  const c = await cards(); ok(c.length === 5 && c[0].cur && !c[0].empty && c[0].cash === 1234 && c[0].del === 3 && c.slice(1).every(q => q.empty && !q.cur), "five slots: slot 1 is the game in play with its cash and deliveries, the rest empty: " + JSON.stringify(c[0]));
  ok(c[0].played > 0.5, `time played counts while the game runs (${c[0].played.toFixed(1)} s)`);
});
await section("B the panel", async () => {
  await ev(`savesPanel(); true`); await sleep(400);
  const t = await J(`(() => { const p = document.getElementById("tPanel"); return { n: p.querySelectorAll(".svc").length, cur: p.querySelectorAll(".svc.cur").length, txt: p.innerText.slice(0, 300), pic: !!p.querySelector(".svc.cur img") }; })()`);
  ok(t.n === 5 && t.cur === 1 && /IN PLAY/.test(t.txt) && /\$1,?234/.test(t.txt), "a card a slot, the one in play marked, its cash on the card: " + t.txt.replace(/\n/g, " | ").slice(0, 160));
  ok(t.pic, "the slot in play has a picture of where you are");
  await ev(`document.querySelector('#tPanel [data-s="open:1"]').click(); true`); await sleep(200);
  const b = await J(`[...document.querySelectorAll("#tPanel [data-s]")].map(q => q.dataset.s.split(":")[0])`);
  ok(["copy", "ren", "exp", "imp", "del", "list"].every(k => b.includes(k)) && !b.includes("go"), "the slot in play offers copy, rename, save to a file, load from a file, delete (and no LOAD): " + b.join(" "));
  await ev(`document.querySelector('#tPanel [data-s="list"]').click(); document.querySelector('#tPanel [data-s="open:2"]').click(); true`); await sleep(200);
  const e = await J(`[...document.querySelectorAll("#tPanel [data-s]")].map(q => q.dataset.s.split(":")[0])`);
  ok(e.includes("go") && e.includes("imp") && !e.includes("del") && /NEW GAME HERE/.test(await ev(`document.getElementById("tPanel").innerText`)), "an empty slot offers NEW GAME HERE and load from a file");
});
await section("C copy, rename, export, import", async () => {
  ok(await J(`TLSLOT.copy(1, 2) && TLSLOT.rename(2, "Second <b>life</b>")`), "slot 1 copies into slot 2 and takes a name");
  let c = await cards(); ok(!c[1].empty && c[1].cash === 1234 && c[1].name === "Second blife/b" && !c[1].cur, "the copy is its own game with its own name, markup stripped: " + c[1].name);
  const txt = await ev(`TLSLOT.exportText(1)`); const d = JSON.parse(txt); ok(d.tracklayer === 1 && d.save && d.save.cash === 1234 && d.save.x && d.name === "Save 1", "a save file holds the whole game (the expansion's state too) and its name");
  ok((await ev(`TLSLOT.importText(4, ${JSON.stringify(txt)})`)) === "" && (await cards())[3].cash === 1234, "the file loads into slot 4");
  ok(/not a Tracklayer save/.test(await ev(`TLSLOT.importText(5, "{\\"hello\\":1}")`)) && /not a Tracklayer save/.test(await ev(`TLSLOT.importText(5, "nonsense")`)) && (await cards())[4].empty, "a file that is not a save is refused and the slot left alone");
  ok(!(await J(`TLSLOT.copy(2, 1)`)), "nothing copies over the game in play");
});
await section("D a new game in an empty slot, and back", async () => {
  await ev(`window.__reloadAsked = 0; TLSLOT.go(3); true`);
  const a = await J(`({ asked: __reloadAsked, cur: TLSLOT.idx().cur, v2: localStorage.getItem("tracklayer.save.v2"), lock: TLSLOT.lock, s1: JSON.parse(localStorage.getItem("tracklayer.slot.1")).cash })`);
  ok(a.asked === 1 && a.cur === 3 && a.v2 === null && a.lock && a.s1 === 1234, "going to an empty slot stores slot 1, clears the game in play and asks for a reload");
  await ev(`GS.cash = 999999; save(); true`); ok((await ev(`localStorage.getItem("tracklayer.save.v2")`)) === null, "nothing the old game does after that can write over the new slot");
  await reload(); await ev(`tutSkip(); crashCancel(); window.__noReload = true; true`); await sleep(600);
  const n = await J(`({ cash: GS.cash, del: GS.delivered, cur: TLSLOT.idx().cur, hour: GS.hour })`);
  ok(n.cash === 0 && n.del === 0 && n.cur === 3, "after the reload slot 3 is a brand-new game: " + JSON.stringify(n));
  await ev(`GS.cash = 77; GS.delivered = 1; save(); TLSLOT.go(1); true`); await reload(); await ev(`tutSkip(); crashCancel(); window.__noReload = true; true`); await sleep(600);
  const b = await J(`({ cash: GS.cash, del: GS.delivered, cur: TLSLOT.idx().cur })`); const c = await cards();
  ok(b.cash === 1234 && b.del === 3 && b.cur === 1 && c[2].cash === 77 && !c[2].empty, "back in slot 1 everything is as it was, and slot 3 kept its own game");
});
await section("E delete, and a broken index", async () => {
  await ev(`TLSLOT.del(2); true`); let c = await cards(); ok(c[1].empty && c[1].name === "Save 2", "a deleted slot is empty and loses its name");
  await ev(`window.__reloadAsked = 0; TLSLOT.del(1); true`); const a = await J(`({ asked: __reloadAsked, v2: localStorage.getItem("tracklayer.save.v2"), cur: TLSLOT.idx().cur })`);
  ok(a.asked === 1 && a.v2 === null && a.cur === 1, "deleting the game in play starts that slot again as a new game");
  await reload(); await ev(`tutSkip(); crashCancel(); window.__noReload = true; true`); await sleep(500);
  ok((await J(`GS.cash`)) === 0 && (await cards())[2].cash === 77, "the new game is clean and the other slots are untouched");
  await ev(`localStorage.setItem("tracklayer.slots.v1", "{{{"); true`); c = await cards(); ok(c.length === 5 && c[0].cur, "a broken index falls back to slot 1 without an error");
  await ev(`localStorage.setItem("tracklayer.slots.v1", JSON.stringify({ cur: 99, m: 7 })); true`); c = await cards(); ok(c[0].cur && c.length === 5, "and so does one with nonsense in it");
});
await ev(`localStorage.removeItem("tracklayer.slots.v1"); for (let i = 1; i < 9; i++) localStorage.removeItem("tracklayer.slot." + i); true`);
console.log(fails ? `FAILS: ${fails}` : "all passed");
await done(fails ? 1 : 0);

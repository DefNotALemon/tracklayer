// I8 the Paths app: where you stand on every path, the next step, and three things for today, read from the real state.
import { boot, ev, sleep, done, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.warned = false; GS.warmth = 100; GS.fuel = GS.cap; TLX.setOn("police", false); TLX.setOn("traffic", false); GS.delivered = 0; GS.cash = 0; GS.load = []; GS.jobs = []; true`); await sleep(1200);
let R = await J(`TLXPATH.rows()`); const by = id => R.find(r => r.id === id);
console.log(R.map(r => `   ${r.name}: ${r.where} | ${r.next}`).join("\n"));
ok(R.length >= 10 && R.every(r => r.name && r.where && r.next && r.k >= 0 && r.k <= 1), `${R.length} paths, each with where you stand and a next step`);
ok(/Trail runner/.test(by("courier").where) && /3 more deliveries to Trail crew/.test(by("courier").next) && /Grooming contracts/.test(by("courier").opens), "a new courier: three more deliveries to Trail crew, and what that opens");
await ev(`GS.delivered = 4; GS.cash = 2600; true`); R = await J(`TLXPATH.rows()`);
ok(/Trail crew · 4 deliveries/.test(by("courier").where) && /1 more delivery to Freight hauler/.test(by("courier").next) && by("courier").k > 0.4 && /\$2,?600/.test(by("money").where), "it follows the game: four deliveries is Trail crew, one short of Freight hauler: " + by("courier").where);
ok(/No trail in your care/.test(by("trails").where) && /Lysløypa/.test(by("trails").next), "trails: none taken on, so the next step is Lysløypa");
await ev(`TLXSK.list[0].st.taken = 1; true`); R = await J(`TLXPATH.rows()`); ok(/1 trail of 7/.test(by("trails").where) && by("trails").k > 0.1, "taking a trail on shows at once: " + by("trails").where); await ev(`TLXSK.list[0].st.taken = 0; true`);
let T = await J(`TLXPATH.today()`); ok(T.length === 3 && T.some(t => /job from the board/.test(t.t)), "today, with nothing aboard: take a job from the board: " + T.map(t => t.t).join(" / "));
await ev(`GS.warned = true; GS.load = [{}, {}]; true`); T = await J(`TLXPATH.today()`); ok(/storm is coming/i.test(T[0].t) && T.some(t => /Deliver what is aboard/.test(t.t)), "a storm warning comes first, then what is aboard: " + T.map(t => t.t).join(" / "));
await ev(`GS.warned = false; GS.load = []; GS.warmth = 20; true`); T = await J(`TLXPATH.today()`); ok(/Get warm/.test(T[0].t), "freezing beats everything"); await ev(`GS.warmth = 100; true`);
await ev(`TLX.api.TABLET.toggle(true, "paths"); true`); await sleep(700);
const a = await J(`(() => { const el = document.getElementById("tabS"); return { txt: el.innerText, tf: el.querySelectorAll("[data-tf]").length, go: [...el.querySelectorAll("[data-act^='go:']")].map(b => b.dataset.act) }; })()`);
ok(/Today/i.test(a.txt) && /Courier/.test(a.txt) && /Next:/.test(a.txt) && a.tf >= R.length, "the app shows the today card and a card a path, each reachable with the d-pad");
ok(a.go.length >= 3, "paths with an app of their own have a button to it: " + a.go.join(" "));
await shot("paths_app", 90);
if (a.go.length) { await ev(`document.querySelector("#tabS [data-act^='go:']").click(); true`); await sleep(500); ok((await ev(`TLX.api.TABLET.app`)) === a.go[0].slice(3), "the button opens that app"); }
ok(!(await ev(`TLXPATH.err`)), "no path failed to read: " + (await ev(`TLXPATH.err`)));
console.log(fails ? `FAILS: ${fails}` : "all passed");
await done(fails ? 1 : 0);

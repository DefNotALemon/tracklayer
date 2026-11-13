// App Store rebuild: Today page (feature cards + ranked rows, per-app accent colours), tap-through to a product page
// (What it does / Why get it), GET on the page still goes through storeGet(), back returns. Stills desktop + phone portrait.
import { boot, ev, shot, send, sleep, done, tap, errors } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const view = async (w, h, mobile) => { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile }); await ev(`dispatchEvent(new Event("resize")); true`); await sleep(800); };
const q = (sel, js) => J(`[...document.querySelectorAll("#tabV ${sel}")].map(e => ${js})`);
const fits = () => J(`(() => { const v = document.querySelector("#tabV"), r = v.getBoundingClientRect(); return { hs: v.scrollWidth <= v.clientWidth + 1, bad: [...v.querySelectorAll(".stdet *, .strow *, .stban *")].filter(e => !e.closest(".stbgi,.stcbg") && (() => { const b = e.getBoundingClientRect(); return b.width && (b.right > r.right + 1 || b.left < r.left - 1); })()).length }; })()`);
await boot();
await ev("tutSkip(); GS.cash = 500; delete GS.apps.freight; delete GS.apps.rescue; delete GS.apps.realestate; TABLET.toggle(true, 'store'); true"); await sleep(1200);
ok(await J(`STO.view === "home"`), "opens on the Today page");
const rows = await q(".strow", `({ id: e.dataset.sid, ac: e.dataset.accent, bg: getComputedStyle(e.querySelector(".stic")).backgroundImage })`);
ok(rows.map(r => r.id).join() === "crew,freight,realestate,rescue", "4 rows in rec order");
ok(new Set(rows.map(r => r.ac)).size === 4, "4 distinct accent colours " + rows.map(r => r.ac));
ok(new Set(rows.map(r => r.bg)).size === 4 && rows.every(r => /gradient/.test(r.bg)), "icon tiles render distinct gradients in computed style");
const cards = await q(".stcard", `({ id: e.dataset.sid, next: e.classList.contains("next"), bg: getComputedStyle(e).backgroundImage })`);
ok(cards.length === 4 && new Set(cards.map(c => c.bg)).size === 4, "4 feature cards with distinct gradients");
ok(cards.filter(c => c.next).map(c => c.id).join() === "freight", "Freight card is the single START HERE");
await shot("g7_store_home_desktop");
// tap a row -> product page, no purchase
const c0 = await J("GS.cash");
for (const id of ["freight", "rescue", "realestate", "crew"]) {
  await ev(`STO.view = "home"; TABLET.render(); document.querySelector('#tabV .stmain[data-open=${id}]').click(); true`); await sleep(300);
  const d = await J(`({ view: STO.view, sel: STO.sel, name: document.querySelector("#tabV .stbname")?.textContent, h: [...document.querySelectorAll("#tabV .stsec h3")].map(h => h.textContent), what: document.querySelector("#tabV .stsec p")?.textContent.length, why: document.querySelectorAll("#tabV .stsec")[1]?.querySelector("p")?.textContent.length })`);
  ok(d.view === "detail" && d.sel === id && d.h.join() === "What it does,Why get it,At a glance" && d.what > 120 && d.why > 150, `${id}: product page shows What it does (${d.what} chars) + Why get it (${d.why} chars) for ${d.name}`);
  if (id === "freight") await shot("g7_store_detail_freight_desktop");
  if (id === "rescue") await shot("g7_store_detail_rescue_desktop");
  if (id === "realestate") await shot("g7_store_detail_realestate_desktop");
  if (id === "crew") await shot("g7_store_detail_crew_desktop");
}
ok(await J(`GS.cash === ${c0} && !GS.apps.freight`), "opening pages bought nothing");
// buy from the detail page
await ev(`STO.view = "home"; TABLET.render(); document.querySelector('#tabV .stmain[data-open=freight]').click(); true`); await sleep(300);
await ev(`document.querySelector('#tabV .stdet [data-get=freight]').click(); true`); await sleep(500);
const a = await J("({ cash: GS.cash, f: GS.apps.freight, view: STO.view, btn: document.querySelector('#tabV .stdet [data-get=freight]')?.textContent })");
ok(a.f === 1 && a.cash === c0 - 120, `detail GET deducts $120, sets GS.apps.freight (${c0} -> ${a.cash})`);
ok(a.view === "detail" && a.btn === "OPEN", "still on the page, button now OPEN");
// back: Escape key then the Today page shows Freight installed
await tap("Escape"); await sleep(400);
ok(await J(`STO.view === "home" && TABLET.app === "store"`), "Escape/back returns to the Today page, store stays open");
ok(await J(`document.querySelector('#tabV .strow[data-sid=freight] .stget').textContent === "OPEN" && document.querySelector('#tabV .stcard.next').dataset.sid === "realestate"`), "list: Freight OPEN, next pick moves to Real Estate");
// inline GET from the list, and a poor attempt
await ev("GS.cash = 10; TABLET.render(); true"); await sleep(200);
await ev(`document.querySelector('#tabV .strow[data-sid=rescue] [data-get]').click(); true`); await sleep(300);
ok(await J("!GS.apps.rescue && GS.cash === 10 && STO.view === 'home'"), "poor: inline GET blocked, cash untouched");
await ev("GS.cash = 500; TABLET.render(); true"); await sleep(200);
await ev(`document.querySelector('#tabV .strow[data-sid=rescue] [data-get]').click(); true`); await sleep(300);
ok(await J("GS.apps.rescue === 1 && GS.cash === 410"), "inline GET from the list still buys (Rescue $90)");
await ev(`document.querySelector('#tabV .stdet .stback')?.click(); true`);
// back button via the tablet header
await ev(`document.querySelector('#tabV .stmain[data-open=realestate]').click(); true`); await sleep(200);
await ev(`document.getElementById("tabBack").click(); true`); await sleep(300);
ok(await J(`STO.view === "home" && TABLET.app === "store"`), "tablet header back from a product page returns to Today");
await ev(`TABLET.go(null); TABLET.go('store'); true`); await sleep(300);
ok(await J(`STO.view === "home"`), "reopening the store starts on Today");
// phone portrait
await ev("delete GS.apps.freight; delete GS.apps.rescue; GS.cash = 500; true");
await view(390, 844, true);
await ev(`SET.touch='on'; setTouchUI(); TABLET.toggle(true, 'store'); TABLET.render(); true`); await sleep(900);
let f = await fits(); ok(f.hs, "phone home: no horizontal page scroll"); ok(f.bad === 0, "phone home: rows fit (" + f.bad + " overflow)");
await shot("g7_store_home_phone");
await ev(`document.querySelector('#tabV .stcard[data-sid=rescue]').click(); true`); await sleep(500);
f = await fits(); ok(f.hs && f.bad === 0, "phone detail: no overflow/clip " + JSON.stringify(f));
await shot("g7_store_detail_phone");
await ev(`document.querySelector('#tabV').scrollTop = 600; true`); await sleep(300);
await shot("g7_store_detail_phone_scrolled");
await view(1280, 720, false);
ok(errors.length === 0, "no page errors " + errors.join(" | "));
await done(fails ? 1 : 0);

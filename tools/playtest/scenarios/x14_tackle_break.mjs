// Beta break test for 14.4b2 handline tackle counter: pad navigation inside the counter, exact-cash and one-short buys,
// full box, double gaff, tablet up at the door, reload with the panel open, panel open blocks the sled, line-over purchase.
import { boot, ev, tap, sleep, done, reload, padSet, padOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const TK = () => J(`(() => { const s = TLXSF.tackle(); return { line: s.line, pilk: s.pilk, lines: s.lines, pilks: s.pilks, gaff: s.gaff, cash: GS.cash }; })()`);
const atDoor = async () => { await ev(`(() => { const y = TLXB.yard(), D = TLXB.DOCKS[0], fx = Math.sin(D.yaw), fz = Math.cos(D.yaw), jx = -y.side * fz, jz = y.side * fx; P.vx = P.vz = 0; FOOT.on = true; FOOT.g.visible = true; FOOT.x = y.door.x; FOOT.z = y.door.z; FOOT.yaw = Math.atan2(-jx, -jz); FOOT.y = TLXB.floorAt(FOOT.x, FOOT.z) ?? surf(FOOT.x, FOOT.z); FOOT.sp = 0; return 1; })()`); await sleep(700); };
const panel = () => J(`(() => { const e = document.getElementById("ifShop"), open = !!e && !e.hidden && FISH.panelOpen(); return { open, cur: open ? (e.querySelector("#ifShopTabs button.on") || {}).textContent : "", foc: document.activeElement ? (document.activeElement.textContent || "").slice(0, 40) : "", btns: open ? [...e.querySelectorAll("#ifShopList button")].map(b => b.textContent + (b.disabled ? " [dis]" : "")) : [] }; })()`);
const pbtn = async (i, ms = 220) => { await padSet({ [i]: 1 }); await sleep(ms); await padSet({}); await sleep(300); };

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; GS.cash = 5000; TLXB.buy(); true`); await sleep(500);
await atDoor();
await tap("KeyE"); await sleep(500);
let p = await panel(); ok(p.open && p.cur === "Lines", "counter open by key: " + JSON.stringify(p));

// pad: dpad down moves focus, A buys; B closes
await padSet({}, [0, 0, 0, 0]);
const f0 = (await panel()).foc;
await pbtn(13);   // dpad down
const f1 = (await panel()).foc;
console.log("focus", JSON.stringify(f0), "->", JSON.stringify(f1));
await pbtn(0);    // A
let t = await TK(); console.log("after pad A", JSON.stringify(t));
ok(t.cash < 5000 || t.line !== "hand", "pad: A on a focused card does something (cash " + t.cash + ", line " + t.line + ")");
await pbtn(1); await sleep(300);
p = await panel(); ok(!p.open, "pad: B closes the counter");
// panel open must not drive the sled/walker with pad stick
await atDoor(); await tap("KeyE"); await sleep(500);
const x0 = await J(`({ x: FOOT.x, z: FOOT.z })`);
await padSet({}, [0, -1, 0, 0]); await sleep(900); await padOff(); await sleep(200);
const x1 = await J(`({ x: FOOT.x, z: FOOT.z })`);
ok(Math.hypot(x1.x - x0.x, x1.z - x0.z) < 0.3, "pad stick doesn't walk while the counter is up: " + Math.hypot(x1.x - x0.x, x1.z - x0.z).toFixed(2) + " m");
await ev(`FISH.back(); true`); await sleep(300);

// one short / exact cash
await ev(`(() => { const s = TLXSF.tackle(); s.lines = {}; s.line = "hand"; s.pilks = {}; s.pilk = "p200"; s.gaff = false; GS.cash = 64; return 1; })()`);
await tap("KeyE"); await sleep(500);
await ev(`(() => { const b = [...document.querySelectorAll("#ifShopTabs button")].find(b => b.textContent === "Gaff"); b.click(); return 1; })()`); await sleep(300);
p = await panel(); ok(p.btns[0] && /not enough/.test(p.btns[0]) && /dis/.test(p.btns[0]), "gaff one dollar short is disabled: " + p.btns[0]);
await ev(`TLXSF.buyGaff(); true`); t = await TK(); ok(!t.gaff && t.cash === 64, "buyGaff() direct call short of cash refuses, cash unchanged " + t.cash);
await ev(`GS.cash = 65; TLXSF.buyGaff(); true`); t = await TK(); ok(t.gaff && t.cash === 0, "exact cash buys the gaff, cash 0: " + t.cash);
await ev(`GS.cash = 500; TLXSF.buyGaff(); true`); t = await TK(); ok(t.cash === 500, "second gaff doesn't charge: " + t.cash);
// full box
await ev(`GS.cash = 1000; for (let i = 0; i < 5; i++) TLXSF.buyPilk("b400"); true`); t = await TK();
ok(t.pilks.b400 === 3 && t.cash === 1000 - 3 * 38, "box caps at 3 and only charges for 3: " + JSON.stringify(t.pilks) + " cash " + t.cash);
await ev(`FISH.back(); true`); await sleep(300);
// tablet up at the door
await atDoor(); await ev(`TABLET.toggle(true, "boats"); true`); await sleep(500);
const u = await J(`({ use: footUse(), tab: TABLET.open !== undefined ? TABLET.open : null })`);
await tap("KeyE"); await sleep(400);
p = await panel(); console.log("tablet up + E at door:", JSON.stringify(u), "panel open", p.open);
await ev(`TABLET.toggle(false); if (FISH.panelOpen()) FISH.back(); true`); await sleep(300);
// panel open then reload
await atDoor(); await tap("KeyE"); await sleep(400);
const before = await TK();
await reload(); await sleep(800);
const after = await TK(); p = await panel();
ok(after.pilks.b400 === before.pilks.b400 && after.gaff === before.gaff, "reload with the panel open keeps tackle");
ok(!p.open, "panel is closed after reload");
const own = await J(`({ boat: !!TLXB.owned && TLXB.owned(), foot: FOOT.on })`).catch(() => ({})); console.log("post reload", JSON.stringify(own));
// line over then buy via direct call
await ev(`(() => { const D = TLXB.DOCKS[0], e = TLXB.dockEnd(D); FOOT.on = false; P.x = e.x + Math.sin(D.yaw) * 20; P.z = e.z + Math.cos(D.yaw) * 20; P.yaw = D.yaw; P.vx = P.vz = 0; P.y = wlvAt(P.x, P.z) || 0; recenter(P.x, P.z, true); return 1; })()`); await sleep(500);
await tap("KeyE"); await sleep(500);
const lo = await ev(`TLXSF.F.on`);
if (lo) {
  await ev(`GS.cash = 500; TLXSF.buyPilk("sv120"); TLXSF.buyLine("heavy"); true`); t = await TK();
  ok(t.line === "hand" && t.pilk !== "sv120", "line over: buying doesn't swap the tackle under the hook (line " + t.line + " pilk " + t.pilk + ")");
  console.log("line-over buy state", JSON.stringify(t));
} else console.log("could not get line over, skipped");
console.log(fails ? "FAILS " + fails : "all ok");
await done(fails ? 1 : 0);

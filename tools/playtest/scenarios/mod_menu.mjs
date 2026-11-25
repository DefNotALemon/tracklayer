// The mod menu (the trainer panel on Y): every page builds, every row does something, and the things Lemon asked for work:
// any sled spawned on foot or switched under you at speed, any part and engine fitted live, a truck dropped in front of
// you, rifle builds and cash dropped as pickups, any amount of cash typed in, and riding on with the menu open.
// Keyboard, pad and the search box. Asserts, exit 1 on a failure. Stills: 01 root, 02 upgrades, 03 pickups, 04 small.
// Run: tools/playtest/run.sh tools/playtest/scenarios/mod_menu.mjs
import { boot, ev, raw, send, tap, down, up, sleep, done, shot, padSet, padOff, park } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(80); }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; GS.cash = 500; true`); await sleep(500);
await park(); await sleep(400);
await ev(`window.__ts = []; if (!window.__tsI) window.__tsI = setInterval(() => { for (const c of document.getElementById("toasts").children) if (!window.__ts.includes(c.textContent)) window.__ts.push(c.textContent); }, 80); true`);
const toasts = async () => { const t = await raw("JSON.stringify(window.__ts)"); await raw("window.__ts = []; true"); return JSON.parse(t); };
const S = () => J(`({ open: godOpen, hid: $("god").hidden, sel: MOD.sel, n: MOD.rows.length, title: $("godTitle").textContent, depth: MOD.stack.length, sled: GS.own.sled, foot: FOOT.on, v: Math.hypot(P.vx, P.vz), cash: GS.cash, row: MOD.rows[MOD.sel] ? MOD.rows[MOD.sel].label : null })`);
let s;

// 1 opens on Y, every page builds, no dead rows
await tap("KeyY"); await sleep(300); s = await S();
ok(s.open && !s.hid && s.title === "Mod menu" && s.n >= 9, `1 Y opens the menu (${s.n} rows, "${s.title}")`);
const flat = await J(`(() => { const f = modFlat(); return { n: f.length, dead: f.filter(r => !r.go && !r.adj).map(r => r.path + "/" + r.label), paths: [...new Set(f.map(r => r.path.split(" › ")[0]))] }; })()`);
ok(flat.n > 150 && !flat.dead.length, `1 ${flat.n} rows across every page, none without an action (${flat.dead.slice(0, 4).join(", ")})`);
ok(["Sleds", "Sled upgrades", "Trucks & machines", "Weapons", "Cash", "Rider", "Cheats", "Time & weather", "Teleport", "Career"].every(p => flat.paths.includes(p)), `1 all ten pages there (${flat.paths.join(", ")})`);
await shot("01_root");

// 2 keyboard: Enter into Sleds, down to the Ranger, Enter switches the sled under you; Backspace backs out; Y closes
await tap("Enter"); await sleep(250); s = await S(); ok(s.title === "Sleds" && s.depth === 2, `2 Enter opens Sleds (${s.title})`);
for (let i = 0; i < 3; i++) { await tap("ArrowDown"); await sleep(90); }
s = await S(); ok(s.row === "Ranger 500", `2 three downs reach the Ranger (${s.row})`);
await tap("Enter"); await sleep(300); s = await S(); ok(s.sled === "ranger" && !s.foot && s.open, `2 Enter: riding the Ranger, menu still up (${s.sled})`);
await tap("Backspace"); await sleep(200); s = await S(); ok(s.depth === 1 && s.title === "Mod menu" && s.row === "Sleds", `2 Backspace goes back to the root, on the row it left (${s.row})`);
await tap("ArrowLeft"); await sleep(200); s = await S(); ok(!s.open && s.hid, "2 left at the root closes it");

// 3 riding on under the menu: W drives with it open, the arrows do not; a sled swaps at speed and keeps the speed
await tap("KeyY"); await sleep(250);
await down("ArrowUp"); await waitGame(1.2); await up("ArrowUp"); s = await S();
ok(s.v < 0.6, `3 ArrowUp under the menu doesn't drive (${s.v.toFixed(2)} m/s)`);
await down("KeyW"); await waitGame(3.5); s = await S();
ok(s.open && s.v > 3, `3 W drives with the menu open (${s.v.toFixed(1)} m/s)`);
const v0 = s.v; await ev(`modSled("summit"); true`); await sleep(120); s = await S();
ok(s.sled === "summit" && !s.foot && s.v > v0 * 0.7, `3 switched to the Summit at speed (${v0.toFixed(1)} -> ${s.v.toFixed(1)} m/s)`);
await up("KeyW"); await tap("KeyY"); await sleep(200);

// 4 every sled, riding
await park(); await sleep(300);
const ids = await J(`SLEDS.map(s => s.id)`);
for (const id of ids) { await ev(`modSled(${JSON.stringify(id)}); true`); await waitGame(0.25); s = await S(); ok(s.sled === id && !s.foot, `4 riding the ${id}`); }
ok(await ev(`santaN() === 9 && SLEDS.every(s => GS.own.sleds.includes(s.id))`), "4 the sleigh came with its team; every sled now owned");

// 5 on foot: which way is forward, then a sled lands in front of you; with "straight on it" you are riding
await ev(`modSled("frontier"); FOOT.on = true; FOOT.x = P.x + 40; FOOT.z = P.z + 25; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.yaw = 0.7; if (FOOT.g) FOOT.g.visible = true; MOD.seat = false; true`); await sleep(300);
const f0 = await J(`({ x: FOOT.x, z: FOOT.z, yaw: FOOT.yaw })`);
await down("KeyW"); await waitGame(1.6); await up("KeyW");
const f1 = await J(`({ x: FOOT.x, z: FOOT.z, yaw: FOOT.yaw })`), mv = Math.hypot(f1.x - f0.x, f1.z - f0.z);
const fdot = ((f1.x - f0.x) * Math.sin(f0.yaw) + (f1.z - f0.z) * Math.cos(f0.yaw)) / (mv || 1);
ok(mv > 0.5 && fdot > 0.9, `5 forward on foot is (sin yaw, cos yaw): walked ${mv.toFixed(2)} m, dot ${fdot.toFixed(2)}`);
await ev(`modSled("apex"); true`); await sleep(300);
const sp = await J(`({ d: Math.hypot(P.x - FOOT.x, P.z - FOOT.z), dot: ((P.x - FOOT.x) * Math.sin(FOOT.yaw) + (P.z - FOOT.z) * Math.cos(FOOT.yaw)) / Math.hypot(P.x - FOOT.x, P.z - FOOT.z), foot: FOOT.on, sled: GS.own.sled, fuel: GS.fuel, cap: GS.cap })`);
ok(sp.sled === "apex" && sp.foot && sp.d > 1.5 && sp.d < 6 && sp.dot > 0.4, `5 the Apex landed ${sp.d.toFixed(1)} m in front of the walker (dot ${sp.dot.toFixed(2)}), still on foot`);
ok(sp.fuel > sp.cap * 0.98, `5 with a full tank (${sp.fuel.toFixed(1)} of ${sp.cap})`);
await ev(`MOD.seat = true; modSled("matriarch"); true`); await sleep(400); s = await S();
ok(s.sled === "matriarch" && !s.foot, "5 with 'straight on it': riding the Matriarch");
await waitGame(0.6); ok(await ev(`Number.isFinite(camera.position.x) && Number.isFinite(camera.quaternion.x) && !MNT.on && !DMT.on`), "5 camera sane after the cut onto the seat");

// 6 every part of every slot fits live; the upgrade page cycles with right; engines
const fit = await J(`(() => { const bad = []; let n = 0, refused = 0; for (const cat of PART_ORDER) for (const o of PARTS[cat].options) { const r = modFit(cat, o.id, true); if (r) { n++; if (GS.own.parts[cat] !== o.id) bad.push(cat + ":" + o.id); } else refused++; } return { n, refused, bad }; })()`);
ok(fit.n > 70 && !fit.bad.length && fit.refused < 6, `6 ${fit.n} parts fitted live, ${fit.refused} refused (boosts the engine can't take) ${fit.bad.join(",")}`);
await ev(`(() => { const p0 = OWN0().parts; for (const c of PART_ORDER) GS.own.parts[c] = p0[c]; restat(); towSnap(); })(); true`);
await ev(`modSled("frontier"); true`); await sleep(200);
await tap("KeyY"); await sleep(200); await tap("ArrowDown"); await sleep(80); await tap("Enter"); await sleep(250); s = await S();
ok(s.title === "Sled upgrades", `6 the upgrades page (${s.title})`);
await tap("ArrowDown"); await sleep(80); s = await S(); ok(s.row === "Track", `6 on the Track row (${s.row})`);
await tap("ArrowRight"); await sleep(250);
ok(await ev(`GS.own.parts.track === "trail"`), "6 right on a part row fits the next option at once");
await tap("ArrowLeft"); await sleep(250); ok(await ev(`GS.own.parts.track === "stock"`) && (await S()).open, "6 left steps it back (and doesn't leave the page)");
await tap("Enter"); await sleep(250); s = await S(); ok(s.title === "Track" && s.n === 6, `6 Enter lists the slot's options (${s.title}, ${s.n})`);
await shot("02_track");
await tap("KeyY"); await sleep(200);
const e0 = await ev(`ST.power`); await ev(`modEngine("t850"); true`);
const e1 = await J(`({ p: ST.power, id: engineOf(sledDef()).def.id, stock: engineOf(sledDef()).stock })`);
ok(e1.id === "t850" && !e1.stock && e1.p > e0 * 2, `6 the 850 turbo in the Frontier: power ${e0.toFixed(2)} -> ${e1.p.toFixed(2)}`);
await ev(`modEngine(null); true`); ok(await ev(`engineOf(sledDef()).stock && Math.abs(ST.power - ${e0}) < 0.01`), "6 stock engine back");
await ev(`modSled("aurora"); modEngine("t850"); true`); ok(await ev(`engineOf(sledDef()).stock`), "6 no engine goes in the battery sled");
await toasts();

// 7 cash: any typed amount, the steps, and a bundle picked up off the snow
await ev(`modSled("frontier"); GS.cash = 500; true`);
await tap("KeyY"); await sleep(200);
await ev(`MOD.sel = MOD.rows.findIndex(r => r.label === "Cash"); modGo(); true`); await sleep(200); s = await S();
ok(s.title === "Cash" && await ev(`!$("godAmtWrap").hidden`), "7 the Cash page shows the amount box");
await raw(`(() => { const i = document.getElementById("godAmt"); i.focus(); i.value = "123456"; i.dispatchEvent(new Event("input", { bubbles: true })); return true; })()`); await sleep(150);
ok(await ev(`MOD.amt === 123456`), "7 a typed amount is the amount");
await tap("KeyY"); await sleep(150); ok((await S()).open, "7 typing a Y in the box doesn't close the menu");
await tap("Enter"); await sleep(250); s = await S(); ok(s.cash === 500 + 123456, `7 Enter in the box adds it (${s.cash})`);
await ev(`modAmtStep(1); true`); ok(await ev(`MOD.amt === 500000`), "7 stepping up from a typed amount goes to the next preset");
await ev(`MOD.amt = 777; modDrop("cash", { amt: 777 }); true`); await sleep(200);
let dr = await J(`({ n: MOD.drops.length, d: MOD.drops[0] ? Math.hypot(MOD.drops[0].x - P.x, MOD.drops[0].z - P.z) : -1 })`);
ok(dr.n === 1 && dr.d > 1.7 && dr.d < 9, `7 a bundle on the snow ${dr.d.toFixed(1)} m ahead`);
await tap("KeyY"); await sleep(150);
const c0 = (await S()).cash; await waitGame(1); ok((await S()).cash === c0, "7 it waits to be picked up");
await ev(`P.x = MOD.drops[0].x; P.z = MOD.drops[0].z; P.y = surf(P.x, P.z) + 0.3; true`); await waitGame(0.5);
s = await S(); ok(s.cash === c0 + 777 && await ev(`MOD.drops.length === 0`), `7 riding into it pays ${s.cash - c0}`);

// 8 weapons: a build dropped and picked up, a part swapped live, ammunition
ok(await ev(`!TLXGUN.gun()`), "8 no rifle to begin with");
await ev(`modDrop("gun", MOD_BUILDS[2]); modDrop("cash", { amt: 50 }); true`); await sleep(300);
await ev(`window.camOv = null; true`); await waitGame(0.3); await shot("03_pickups");
await ev(`(() => { const d = MOD.drops.find(d => d.kind === "gun"); P.x = d.x; P.z = d.z; P.y = surf(P.x, P.z) + 0.3; })(); true`); await waitGame(0.5);
const g = await J(`(() => { const g = TLXGUN.gun(), s = TLXGUN.state(); return g ? { parts: g.parts, rounds: g.rounds, cap: TLXGUN.stats(g).cap, pk: TLXGUN.pkTotal(), lic: s.licence } : null; })()`);
ok(g && g.parts.sight === "scope39" && g.parts.barrel === "heavy24" && g.parts.magazine === "det10" && g.rounds === 10 && g.cap === 10 && g.pk === 40 && g.lic, `8 picked up the long-range build, loaded, 40 rounds, licence (${JSON.stringify(g)})`);
await ev(`modGunPart("sight", "red1"); true`); ok(await ev(`TLXGUN.gun().parts.sight === "red1"`), "8 a red dot swapped on live");
ok(await ev(`modAmmo("match308", 20) === 20 && TLXGUN.pk("match308") === 20 && modAmmo("sp308", 999) === 60 && TLXGUN.pkTotal() === TLXGUN.AMMO.max && modAmmo("sp308", 20) === 0`), "8 ammunition by the box, to the pack's limit and no further");

// 9 trucks: one in front of you, then cleared
await park(); await sleep(300);
await ev(`modVeh("pickup"); true`); await sleep(400);
const tv = await J(`(() => { const r = TLXV.state().owned.find(r => r.mod); return r ? { id: r.id, d: Math.hypot(r.x - P.x, r.z - P.z), dot: ((r.x - P.x) * Math.sin(P.yaw) + (r.z - P.z) * Math.cos(P.yaw)) / Math.hypot(r.x - P.x, r.z - P.z), cur: TLXV.state().cur, n: TLXV.state().owned.length } : null; })()`);
ok(tv && tv.id === "pickup" && tv.d > 4 && tv.d < 16 && tv.dot > 0.3 && tv.cur == null, `9 a pickup ${tv && tv.d.toFixed(1)} m ahead (dot ${tv && tv.dot.toFixed(2)}), you stay on the sled`);
await waitGame(0.6); await ev(`modVehClear(); true`); await sleep(200);
ok(await ev(`TLXV.state().owned.filter(r => r.mod).length === 0`), "9 cleared again");
const vn = await J(`TLXV.VEHICLES.filter(d => !TLXV.kinds[d.id] && !(d.opt && !TLX.on(d.opt))).map(d => d.id)`);
for (const id of vn) await ev(`modVeh(${JSON.stringify(id)}); true`); await waitGame(0.8);
ok(await ev(`TLXV.state().owned.filter(r => r.mod).length === ${Math.min(8, vn.length)}`), `9 every wheeled machine spawns (${vn.join(", ")})`);
await ev(`modVehClear(); true`);

// 10 teleport, time, weather, cheats
const site = await J(`(() => { const s = SITES.filter(s => s.x !== undefined && s !== depot)[3]; godTeleport(s); return { d: Math.hypot(P.x - s.x, P.z - s.z), name: s.name }; })()`);
ok(site.d < 20, `10 teleported to ${site.name} (${site.d.toFixed(0)} m off)`);
await ev(`FOOT.on = true; FOOT.x = P.x + 2; FOOT.z = P.z; true`); await ev(`godTeleport(depot); true`);
ok(await ev(`Math.hypot(FOOT.x - SPAWN.x, FOOT.z - SPAWN.z) < 4 && Math.hypot(P.x - SPAWN.x, P.z - SPAWN.z) < 1`), "10 on foot, the walker comes along with the sled");
await ev(`FOOT.on = false; if (FOOT.g) FOOT.g.visible = false; modHour(17); true`); ok(await ev(`Math.abs(((GS.hour % 24) + 24) % 24 - 17) < 0.01`), "10 clock set to 17:00");
await ev(`modWeather(1); modToggle("fuel", "Infinite fuel"); GS.fuel = 1; true`); await waitGame(0.3);
ok(await ev(`WX.force.v === 1 && GOD.fuel && GS.fuel === GS.cap`), "10 a storm called in; infinite fuel holds the tank full");
await ev(`modToggle("fuel", "Infinite fuel"); WX.force = null; GS.hour = 12; true`);

// 11 the search box: every page at once
await park(); await sleep(200); await tap("KeyY"); await sleep(200);
await raw(`(() => { const i = document.getElementById("godSearch"); i.focus(); i.value = "apex"; i.dispatchEvent(new Event("input", { bubbles: true })); return true; })()`); await sleep(200);
s = await S(); ok(s.title === "Search" && s.row === "Apex 800", `11 "apex" finds the sled (${s.row}, ${s.n} rows)`);
await tap("Enter"); await sleep(300); s = await S(); ok(s.sled === "apex", "11 Enter in the box rides it");
await tap("Escape"); await sleep(200); s = await S(); ok(s.open && s.title === "Mod menu", "11 Esc in the box clears the search, menu stays");
await tap("Escape"); await sleep(200); ok(!(await S()).open, "11 Esc closes the menu");

// 12 a pad: Y opens, the D-pad moves, A picks, B backs out and closes, and the stick still steers
const pad = async b => { await padSet(b, [0, 0, 0, 0]); await sleep(140); await padSet({}, [0, 0, 0, 0]); await sleep(140); };
await pad({ 3: 1 }); s = await S(); ok(s.open, "12 pad Y opens it");
await pad({ 13: 1 }); s = await S(); ok(s.row === "Sled upgrades", `12 D-pad down (${s.row})`);
await pad({ 12: 1 }); await pad({ 0: 1 }); s = await S(); ok(s.title === "Sleds", `12 A opens a page (${s.title})`);
await pad({ 13: 1 }); await pad({ 0: 1 }); s = await S(); ok(s.sled === "frontier" && s.open, `12 A picks a sled (${s.sled})`);
await padSet({}, [0.8, 0, 0, 0]); await sleep(300);
ok(await ev(`godOpen && Math.abs(input.steer) > 0.3`), "12 the stick steers with the menu up");
ok((await ev(`$("godFoot").textContent`)).includes("D-pad"), "12 the footer names the pad's buttons");
await padSet({}, [0, 0, 0, 0]); await sleep(150);
await pad({ 1: 1 }); s = await S(); ok(s.open && s.depth === 1, "12 B goes back a page");
await pad({ 1: 1 }); s = await S(); ok(!s.open, "12 B at the root closes it");
ok(await ev(`!GS.garageOpen`), "12 and that B didn't open the garage");
await padOff(); await tap("KeyH"); await sleep(200); await tap("KeyH");

// 13 a click on a row, the small 640x360 embed, and the school
await tap("KeyY"); await sleep(250);
const box = await J(`(() => { const r = [...$("godList").children].find(c => c.textContent.includes("Cheats")).getBoundingClientRect(); return { x: r.left + 40, y: r.top + r.height / 2 }; })()`);
for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x: box.x, y: box.y, button: type === "mouseMoved" ? "none" : "left", clickCount: 1 });
await sleep(250); s = await S(); ok(s.title === "Cheats", `13 a click opens a page (${s.title})`);
await send("Emulation.setDeviceMetricsOverride", { width: 640, height: 360, deviceScaleFactor: 1, mobile: false }); await sleep(500);
const fitb = await J(`(() => { const r = $("god").getBoundingClientRect(), l = $("godList"); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: innerWidth, h: innerHeight, lh: l.clientHeight, row: l.children[0].getBoundingClientRect().height }; })()`);
ok(fitb.l >= 0 && fitb.t >= 0 && fitb.r <= fitb.w && fitb.b <= fitb.h && fitb.lh >= fitb.row * 3, `13 at 640x360 the panel is on screen with ${(fitb.lh / fitb.row).toFixed(1)} rows showing`);
await shot("04_small");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false }); await sleep(300);
await tap("KeyY"); await sleep(200);
ok(await ev(`(() => { SCHOOL.on = true; toggleGod(true); const o = godOpen; SCHOOL.on = false; return !o; })()`), "13 it stays shut during a driving lesson");
console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);

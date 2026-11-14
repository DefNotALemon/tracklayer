// Slice 11.1b (G4): the rifle in the field (tlx-guns.js "in the field"). Asserts, exit 1 on a failure.
//  A. no rifle: the rifle control does nothing but say so. With one, in town it stays slung ("Not in town").
//  B. out on the fell, L shoulders it: first-person down the rifle (walker hidden, camera at the eye), the magazine fills
//     from the pack a round at a time, the use control reads FIRE, the hint names fire / aim / sling through btn().
//  C. the walk controls swing the aim and the boots stay planted; the view sways and settles when held still.
//  D. a reindeer at 90 m, chest on the post: one shot drops it, the bolt has to be worked before the next, a herd in
//     earshot takes flight.
//  E. reach: a moose at 200 m is past the stock rifle's 140 m (a miss, the animal lives, the hint says why); with the
//     scope fitted (250 m, 6x: narrow view, scope ring) the same shot drops it. A shot into the snow is just a miss.
//  F. PEOPLE: a rider, the dog or a car anywhere near the line of fire, or a house / the town behind it, and the rifle
//     stays on safe: no shot, no round spent, even with an animal in front of them.
//  G. empty: it reloads itself from the pack; with nothing left it clicks.
//  H. L slings it: the walker and the chase view are back. Walk up to the animal: DRESS; the tally, the carry limit, a
//     dressed animal can't be dressed twice; the counter's Game tab pays.
//  I. Xbox pad (A up/down, stick + RT aim, L3 fire) and touch (RIFLE / LOWER button, FIRE) do all of it.
//  J. the tablet coming up lowers it. Saved: game, tally and rounds survive a reload; a corrupt entry loads clean.
import { boot, ev, tap, down, up, sleep, done, shot, reload, padSet, padOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
// after a reload: wait until the page is really back (beta 0184 #1: a fixed 500 ms was too short on a loaded machine)
async function ready() { for (let i = 0; i < 100; i++) { await sleep(150); try { if (await ev(`typeof TLXGUN !== "undefined" && !!TLXGUN.state() && started`)) { await sleep(300); return true; } } catch (e) {} } return false; }
async function until(expr, secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) { if (await ev(expr)) return true; await sleep(80); } return !!(await ev(expr)); }
const toasts = () => J(`(TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))`);
const A = () => J(`(() => { const a = TLXGUN.AIM, s = TLXGUN.state(), g = TLXGUN.gun(); return { on: a.on, t: a.t, pitch: a.pitch, still: a.still, bolt: a.bolt, load: a.load, last: a.last, sx: a.sx, rounds: g ? g.rounds : null, ammo: s.ammo, yaw: FOOT.yaw, x: FOOT.x, z: FOOT.z,
  use: footUse(), hint: $("wnHint").textContent, hud: !!$("gunHud") && !$("gunHud").hidden, amm: $("gunHud") ? $("gunHud").children[2].textContent : "", scope: !!$("gunHud") && !$("gunHud").children[0].hidden, ret: $("gunHud") ? $("gunHud").children[1].className : "",
  walker: !!(FOOT.g && FOOT.g.visible), camD: Math.hypot(camera.position.x - FOOT.x, camera.position.z - FOOT.z), fov: camera.fov, vm: !!(a.vm && a.vm.visible), vmKey: a.vmKey, game: s.game, taken: s.taken, cash: GS.cash }; })()`);
// aim dead on an animal's chest (what a player does with the stick): sway off for the shot
const aimAt = n => ev(`(() => { const q = window.__an[${n}].m[0], sc = q.g.scale.x, cy = surf(q.x, q.z) + q.sp.hipY * sc * 0.92, ey = Math.max(FOOT.y, surf(FOOT.x, FOOT.z) - 0.4) + 1.6, d = Math.hypot(q.x - FOOT.x, q.z - FOOT.z);
  FOOT.yaw = Math.atan2(q.x - FOOT.x, q.z - FOOT.z); TLXGUN.AIM.pitch = Math.atan2(cy - ey, d); return d; })()`);
// let the game run n frames (the aim line is rebuilt each frame; headless frame rates vary with the machine's load)
async function frames(n = 3) { const p0 = await ev("TLXGUN.AIM.ph"); let last = p0, c = 0; for (let i = 0; i < 200 && c < n; i++) { await sleep(40); const p = await ev("TLXGUN.AIM.ph"); if (p !== last) { c++; last = p; } } }
async function holdG(code, secs) { const t0 = await clock(); await down(code); while ((await clock()) - t0 < secs) await sleep(40); await up(code); await frames(2); }
const mk = (kind, d, off = 0) => ev(`window.__mk(${JSON.stringify(kind)}, ${d}, ${off})`);

await boot();
await ev(`tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; GS.hour = 36; TLX.setOn("wounds", false); GS.cash = 9000; true`); await sleep(400);
// no natural herds wandering into the test: only the animals the scenario stands up
await ev(`(() => { WILD.max = 0; for (const G of WILD.groups) for (const q of G.m) wildFree(q); WILD.groups.length = 0; window.__an = [];
  window.__mk = (kind, d, off) => { const yw = window.__yaw + off, x = FOOT.x + Math.sin(yw) * d, z = FOOT.z + Math.cos(yw) * d, q = wildRig(kind);
    const G = { kind, sp: QSP[kind], x, z, yaw: yw + 1.57, state: "graze", t: 999, v: 0, m: [q] };
    Object.assign(q, { x, z, yaw: G.yaw, v: 0, ox: 0, oz: 0, graze: 0.3, wT: 999 }); q.ant.visible = true; WILD.groups.push(G); window.__an.push(G); return window.__an.length - 1; };
  return true; })()`);

// A
await ev(`FOOT.on = true; FOOT.x = depot.x + 20; FOOT.z = depot.z + 14; FOOT.y = surf(FOOT.x, FOOT.z); P.x = FOOT.x + 5; P.z = FOOT.z; true`); await sleep(400);
await tap("KeyL"); await sleep(300);
let a = await A(), tl = await toasts();
ok(!a.on && !(await ev("TLXGUN.can()")) && tl.some(t => /No rifle\. Nordkinn Jakt & Våpen/.test(t)), "A: no rifle: L only says where to buy one");
ok(await ev(`TLXGUN.takeCourse() && TLXGUN.buyRifle("bolt308") && TLXGUN.buyAmmo()`), "A: licence, rifle and a box of 20 bought");
await tap("KeyL"); await sleep(300);
a = await A(); tl = await toasts();
ok(!a.on && (await ev("TLXGUN.slungWhy()")) === "town" && tl.some(t => /Not in town: the rifle stays slung/.test(t)), "A: in town it stays slung: " + (tl.find(t => /Not in town/.test(t)) || ""));

// find open fell: clear of houses, flat and unobstructed for 260 m along some bearing, nobody down-range
const spot = await J(`(() => { const W = { x: depot.x, z: depot.z };
  for (let r = 500; r < 2600; r += 60) for (let an = 0; an < 6.28; an += 0.35) {
    const x = W.x + Math.cos(an) * r, z = W.z + Math.sin(an) * r;
    if (Math.abs(x) > HALF - 400 || Math.abs(z) > HALF - 400 || isSea(x, z) || isWater(x, z) || obNear(x, z, 12)) continue;
    FOOT.x = x; FOOT.z = z; if (TLXGUN.slungWhy() && TLXGUN.slungWhy() !== "busy") continue;
    for (let yw = 0; yw < 6.28; yw += 0.4) {
      const dx = Math.sin(yw), dz = Math.cos(yw); let good = true, g0 = surf(x, z);
      for (let t = 10; t <= 260 && good; t += 10) { const px = x + dx * t, pz = z + dz * t; if (isSea(px, pz) || isWater(px, pz) || Math.abs(surf(px, pz) - g0) > 1.6 || solidNear(px, pz, 3)) good = false; }
      if (!good || TLXGUN.unsafe(x, z, dx, dz)) continue;
      FOOT.y = surf(x, z); FOOT.yaw = yw; FOOT.sp = 0; window.__yaw = yw; P.x = x - dx * 6; P.z = z - dz * 6; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; recenter(x, z, true); camState.init = false;
      return { x: Math.round(x), z: Math.round(z), yaw: +yw.toFixed(2), r };
    } }
  return null; })()`);
console.log("spot", JSON.stringify(spot));
ok(!!spot, "B: found open fell with a clear 260 m line");
if (!spot) await done(1);
await sleep(900);

// B
ok((await ev("TLXGUN.slungWhy()")) === null, "B: out here the rifle may come up");
const t0 = await clock();
await tap("KeyL");
ok(await until("TLXGUN.AIM.on && TLXGUN.AIM.t >= 1", 4), "B: L shoulders the rifle (raised in " + ((await clock()) - t0).toFixed(2) + " s)");
ok(await until("TLXGUN.gun().rounds === 3", 5), "B: the magazine fills from the pack");
a = await A(); console.log("B", JSON.stringify({ hint: a.hint, use: a.use, amm: a.amm, camD: a.camD, fov: a.fov, ret: a.ret }));
ok(a.rounds === 3 && a.ammo === 17 && /3 \/ 3 · 17 in the pack/.test(a.amm), `B: 3 in the magazine, 17 in the pack (${a.amm})`);
ok(!a.walker && a.camD < 0.05 && a.hud && a.vm && /post/.test(a.ret) && Math.abs(a.fov - 52) < 1, `B: looking down the irons: walker hidden, camera at the eye (${a.camD.toFixed(2)} m), fov ${a.fov.toFixed(1)}`);
ok(a.use === "FIRE" && /E: fire/.test(a.hint) && /A \/ D \/ W: aim/.test(a.hint) && /L: sling it/.test(a.hint) && /clean to 140 m/.test(a.hint), "B: use reads FIRE; hint: " + a.hint);
await shot("x11h_irons");

// C
const c0 = await A();
await holdG("KeyA", 1.2);
const c1 = await A();
await holdG("KeyW", 1.2);
const c2 = await A();
ok(Math.abs(c1.yaw - c0.yaw) > 0.1 && c1.yaw > c0.yaw && c2.pitch > 0.05, `C: A swings left ${(c1.yaw - c0.yaw).toFixed(2)} rad, W lifts the muzzle ${c2.pitch.toFixed(2)} rad`);
ok(Math.hypot(c2.x - c0.x, c2.z - c0.z) < 0.02, "C: the boots stay planted while aiming (" + Math.hypot(c2.x - c0.x, c2.z - c0.z).toFixed(3) + " m)");
ok(c2.still < 0.6, "C: swinging unsettles the hold (still " + c2.still.toFixed(2) + ")");
let sw = []; for (let i = 0; i < 8; i++) { sw.push((await A()).sx); await sleep(250); }
const swR = Math.max(...sw) - Math.min(...sw);
ok(await until("TLXGUN.AIM.still >= 1", 5) && swR > 0.0015, `C: the view sways (${(swR * 1000).toFixed(1)} mrad swing) and settles when held still`);

// D
await ev(`TLXGUN.TUNE.sway = 0; FOOT.yaw = window.__yaw; TLXGUN.AIM.pitch = 0; true`);
if (process.env.STILLS) { for (const sg of ["red1", "iron"]) { await ev(`GS.cash += 1000; TLXGUN.buyPart("sight", "${sg}"); TLXGUN.buyPart("barrel", "${sg === "red1" ? "heavy24" : "std22"}"); TLXGUN.buyPart("magazine", "${sg === "red1" ? "det10" : "int3"}"); true`); await sleep(600); await shot("x11h_vm_" + sg); } }
const rd = await mk("reindeer", 90), herd = await mk("reindeer", 300, 1.2);
const dD = await aimAt(rd); await frames(); await shot("x11h_reindeer");
await tap("KeyE"); await sleep(250);
a = await A(); tl = await toasts();
const dq = await J(`({ dead: window.__an[${rd}].m[0].dead, gs: window.__an[${rd}].state, herd: window.__an[${herd}].state })`);
console.log("D", JSON.stringify(a.last), JSON.stringify(dq));
ok(a.last && a.last.res === "kill" && dq.dead === 1 && dq.gs === "dead" && a.rounds === 2 && a.taken.reindeer === 1, `D: one round, the reindeer at ${dD.toFixed(0)} m drops`);
ok(tl.some(t => /The reindeer drops where it stood, 90 m out\. Walk up to it to dress it\./.test(t)), "D: the toast says so");
ok(a.bolt > 0 && dq.herd === "flee" && a.last.spooked >= 1, `D: the bolt is being worked (${a.bolt.toFixed(2)} s left); the herd 300 m off takes flight`);
await tap("KeyE"); await sleep(120);
ok((await A()).rounds === 2, "D: no second shot until the bolt's closed");
await until("TLXGUN.AIM.bolt <= 0", 3);

// E
const ms = await mk("moose", 200);
await aimAt(ms); await frames();
await tap("KeyE"); await sleep(250);
a = await A(); tl = await toasts();
ok(a.last.res === "short" && a.rounds === 1 && !(await ev(`window.__an[${ms}].m[0].dead`)) && tl.some(t => /200 m: past this rifle's clean reach \(140 m\)/.test(t)), "E: 200 m is past the stock rifle's 140 m: a miss, and it says why");
await until("TLXGUN.AIM.bolt <= 0", 3);
ok(await ev(`TLXGUN.buyPart("sight", "scope39")`), "E: scope bought and fitted on the fell-side (free swap model)");
const ms2 = await mk("moose", 200, 0.04);
await aimAt(ms2); await sleep(500); await frames();
a = await A(); console.log("E scope", JSON.stringify({ fov: a.fov, scope: a.scope, vm: a.vm, hint: a.hint }));
ok(Math.abs(a.fov - 52 / 6) < 0.3 && a.scope && !a.vm && /clean to 250 m/.test(a.hint), `E: through the scope: fov ${a.fov.toFixed(1)}, ring up, reach 250 m`);
await shot("x11h_scope");
await tap("KeyE"); await sleep(250);
a = await A();
ok(a.last.res === "kill" && (await ev(`window.__an[${ms2}].m[0].dead`)) === 1 && a.rounds === 0, "E: with the scope the moose at 200 m drops");
ok(await until("TLXGUN.gun().rounds === 3", 6), "G: empty, it reloads itself from the pack (3 more)");
a = await A(); ok(a.ammo === 14, "G: 14 left in the pack (" + a.ammo + ")");
await ev(`TLXGUN.AIM.pitch = -0.4; true`); await frames();
await tap("KeyE"); await sleep(200);
a = await A(); ok(a.last.res === "miss" && a.rounds === 2, "E: a shot into the snow is a miss, round spent");
await until("TLXGUN.AIM.bolt <= 0", 3);

// F: people
const f0 = (await A()).rounds;
const hare = await mk("reindeer", 60, -0.5);
await ev(`FOOT.yaw = window.__yaw - 0.5; true`); await aimAt(hare); await frames();
const F = await J(`(() => { const out = {}, g = TLXGUN.gun(), n = NPCS[0], yw = FOOT.yaw, at = d => [FOOT.x + Math.sin(yw) * d, FOOT.z + Math.cos(yw) * d];
  const keep = { x: n.x, z: n.z, v: n.g.visible, dx: DOG.x, dz: DOG.z, dv: DOG.g ? DOG.g.visible : null };
  [n.x, n.z] = at(130); n.g.visible = true; out.rider = [TLXGUN.fire(), TLXGUN.AIM.last.res, TLXGUN.AIM.last.why, g.rounds];
  n.x = keep.x; n.z = keep.z; n.g.visible = keep.v;
  TLXGUN.AIM.bolt = 0;
  if (DOG.g) { [DOG.x, DOG.z] = at(40); DOG.x += 3; DOG.g.visible = true; out.dog = [TLXGUN.fire(), TLXGUN.AIM.last.why, g.rounds]; DOG.x = keep.dx; DOG.z = keep.dz; DOG.g.visible = keep.dv; }
  const c = TLXT.cars[0], ck = c ? { on: c.on, x: c.x, z: c.z } : null;
  if (c) { c.on = true; [c.x, c.z] = at(400); out.car = [TLXGUN.fire(), TLXGUN.AIM.last.why, g.rounds]; Object.assign(c, ck); }
  const d0 = Math.hypot(depot.x - FOOT.x, depot.z - FOOT.z);
  out.town = TLXGUN.unsafe(depot.x + 300, depot.z + 300, -1, -1); out.away = TLXGUN.unsafe(depot.x + 300, depot.z + 300, 1, 1) === TLXGUN.unsafe(depot.x + 300, depot.z + 300, -1, -1);
  const D = KIT.doors.find(d => Math.hypot(d.x - depot.x, d.z - depot.z) > 400); if (D) out.house = TLXGUN.unsafe(D.x + 150, D.z, -1, 0);
  out.alive = !window.__an[${hare}].m[0].dead; out.clear = TLXGUN.unsafe(FOOT.x, FOOT.z, Math.sin(yw), Math.cos(yw)); return out; })()`);
console.log("F", JSON.stringify(F));
ok(F.rider[0] === false && F.rider[1] === "safe" && /A rider is down-range, 130 m out\. The rifle stays on safe\./.test(F.rider[2]) && F.rider[3] === f0, "F: a rider 130 m behind the reindeer: on safe, no round spent: " + F.rider[2]);
ok(!F.dog || (F.dog[0] === false && /A dog is down-range/.test(F.dog[1]) && F.dog[2] === f0), "F: the dog 3 m off the line: on safe" + (F.dog ? ": " + F.dog[1] : " (no dog out)"));
ok(!F.car || (F.car[0] === false && /A car is down-range, 400 m out/.test(F.car[1]) && F.car[2] === f0), "F: a car on the road 400 m out: on safe" + (F.car ? "" : " (no traffic)"));
ok(/toward Kjøllefjord/.test(F.town || "") && !F.away && (!("house" in F) || /house down-range|That's toward/.test(F.house || "")), `F: toward the town or a house: on safe (${F.town} / ${F.house})`);
ok(F.alive && F.clear === null, "F: the animal in front of them is untouched; the line is clear again once they're gone");
tl = await toasts(); ok(tl.some(t => /The rifle stays on safe/.test(t)), "F: the reason toasts");
await sleep(300); ok(/ON SAFE/.test((await A()).amm), "F: the rifle's line reads ON SAFE");
// G: nothing left
await ev(`TLXGUN.state().ammo = 0; TLXGUN.gun().rounds = 0; TLXGUN.AIM.load = 0; TLXGUN.AIM.bolt = 0; true`);
await tap("KeyE"); await sleep(250);
a = await A(); tl = await toasts();
ok(a.last.res === "empty" && a.rounds === 0 && tl.some(t => /Click\. Empty, and not a round in the pack/.test(t)), "G: empty with an empty pack: a click");
await ev(`TLXGUN.state().ammo = 14; true`);

// H: sling, dress, sell
await tap("KeyL"); await sleep(1800);
a = await A();
ok(!a.on && a.walker && !a.hud && !a.vm && a.camD > 1.5 && a.fov > 40, `H: L slings it: walker back, chase view (${a.camD.toFixed(1)} m behind, fov ${a.fov.toFixed(0)})`);
await ev(`(() => { const q = window.__an[${rd}].m[0]; FOOT.x = q.x - 1.6; FOOT.z = q.z; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.yaw = 1.57; recenter(FOOT.x, FOOT.z, true); camState.init = false; return true; })()`); await sleep(900);
a = await A(); console.log("H", a.use, a.hint);
ok(a.use === "DRESS" && /E: dress the reindeer/.test(a.hint), "H: at the animal the use control reads DRESS: " + a.hint);
await shot("x11h_dress");
await tap("KeyE"); await sleep(300);
a = await A(); tl = await toasts();
ok(a.game.length === 1 && a.game[0].k === "reindeer" && (await ev(`window.__an[${rd}].m[0].dead`)) === 2 && a.use !== "DRESS" && tl.some(t => /The reindeer, dressed: 48 kg of meat on the sled\. Jakt & Våpen pays \$230/.test(t)), "H: dressed: on the tally, and it can't be dressed twice");
await ev(`(() => { const q = window.__an[${ms2}].m[0]; FOOT.x = q.x - 1.8; FOOT.z = q.z; FOOT.y = surf(FOOT.x, FOOT.z); return true; })()`); await sleep(500);
await tap("KeyE"); await sleep(300);
a = await A(); ok(a.game.length === 2 && (await ev("TLXGUN.carriedKg()")) === 218, "H: the moose too: 218 kg carried");
const over = await J(`(() => { const q = window.__an[${ms}].m[0]; q.dead = 1; FOOT.x = q.x - 1.8; FOOT.z = q.z; const r = TLXGUN.dress(); return { r, n: TLXGUN.state().game.length, dead: q.dead }; })()`);
tl = await toasts(); ok(over.r === false && over.n === 2 && over.dead === 1 && tl.some(t => /You can't haul any more: 218 kg of game already/.test(t)), "H: a second moose is over the 260 kg you can haul");
const tabH = await ev(`TLX.shopTabs.find(t => t.id === "g_game").render(GS.cash)`);
ok(/Sell it all · \$850/.test(tabH) && /2 animals, 218 kg/.test(tabH), "H: the counter's Game tab offers $850 for the two");
const cash0 = (await A()).cash;
ok((await ev("TLXGUN.sellGame()")) && (await A()).cash === cash0 + 850 && (await A()).game.length === 0 && !(await ev("TLXGUN.sellGame()")), "H: sold: +$850, nothing left to sell");

// I: pad and touch, back on the clear line
await ev(`FOOT.x = ${spot.x}; FOOT.z = ${spot.z}; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.yaw = window.__yaw; recenter(FOOT.x, FOOT.z, true); camState.init = false; TLXGUN.fit("sight", "iron", true); TLXGUN.gun().rounds = 3; true`); await sleep(500);
await padSet({ 0: 1 }); await sleep(300); await padSet({}); 
ok(await until("TLXGUN.AIM.on && TLXGUN.AIM.t >= 1", 4), "I: pad A shoulders it");
a = await A(); ok(/L3: fire/.test(a.hint) && /Left stick \/ RT: aim/.test(a.hint) && /A: sling it/.test(a.hint), "I: pad hint: " + a.hint);
const p0 = await A(); { const t0 = await clock(); await padSet({ 7: 1 }, [0.9, 0, 0, 0]); while ((await clock()) - t0 < 1.2) await sleep(40); await padSet({}); await frames(2); } const p1 = await A();
ok(p1.yaw < p0.yaw - 0.05 && p1.pitch > p0.pitch + 0.03 && Math.hypot(p1.x - p0.x, p1.z - p0.z) < 0.02, `I: stick right swings right ${(p0.yaw - p1.yaw).toFixed(2)} rad, RT lifts ${(p1.pitch - p0.pitch).toFixed(2)}, boots planted`);
const pr = await mk("reindeer", 80); await ev(`FOOT.yaw = window.__yaw; true`); await aimAt(pr); await frames();
await padSet({ 10: 1 }); await sleep(300); await padSet({}); await sleep(200);
a = await A(); ok(a.last.res === "kill" && a.rounds === 2, "I: pad L3 fires: the reindeer at 80 m drops");
await padSet({ 0: 1 }); await sleep(300); await padSet({}); await sleep(300);
ok(!(await A()).on, "I: pad A again slings it"); await padOff();
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(700);
const tp = id => ev(`(() => { const b = $("${id}"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return true; })()`);
const T = () => J(`({ rifle: $("tcRifle").hidden ? null : $("tcRifle").textContent, use: $("tcUse").hidden ? null : $("tcUse").textContent, r: (() => { const a = $("tcRifle").getBoundingClientRect(), b = $("tcX").getBoundingClientRect(), u = $("tcUse").getBoundingClientRect(); return { top: a.top, bottom: a.bottom, uTop: u.top, xHid: $("tcX").hidden, xTop: b.top, w: a.width, h: a.height }; })() })`);
let t = await T(); console.log("I touch", JSON.stringify(t));
ok(t.rifle === "RIFLE" && t.r.h >= 30, "I: touch: a RIFLE button on foot with a rifle on your back");
await tp("tcRifle"); ok(await until("TLXGUN.AIM.on && TLXGUN.AIM.t >= 1", 4), "I: tapping RIFLE shoulders it");
await sleep(400); t = await T(); a = await A();
ok(t.rifle === "LOWER" && t.use === "FIRE" && t.r.bottom <= t.r.uTop + 1 && /tap FIRE/.test(a.hint) && /tap LOWER/.test(a.hint), "I: touch reads LOWER / FIRE; hint: " + a.hint);
const tr = await mk("fox", 40); await ev(`FOOT.yaw = window.__yaw; true`); await aimAt(tr); await frames();
await shot("x11h_touch");
await tp("tcUse"); await sleep(250);
a = await A(); ok(a.last.res === "kill" && a.last.kind === "fox", "I: tapping FIRE drops the fox at 40 m");
await tp("tcRifle"); await sleep(300); ok(!(await A()).on && (await T()).rifle === "RIFLE", "I: tapping LOWER slings it");
await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; true`); await sleep(200);

// J
await tap("KeyL"); await until("TLXGUN.AIM.on && TLXGUN.AIM.t >= 1", 4);
await ev(`TABLET.toggle(true, "map"); true`); await sleep(500);
a = await A(); ok(!a.on && !a.hud, "J: the tablet coming up lowers the rifle");
await ev(`TABLET.toggle(false); true`); await sleep(300);
await ev(`TLXGUN.state().game.push({ k: "hare" }); save(); true`);
await reload(); await ready();
a = await A(); console.log("J", JSON.stringify({ game: a.game, taken: a.taken, rounds: a.rounds, on: a.on }));
ok(!a.on && a.game.length === 1 && a.game[0].k === "hare" && a.taken.reindeer === 2 && a.taken.moose === 1 && a.taken.fox === 1 && a.rounds >= 1, "J: game, tally and the rounds in the magazine survive a reload; the rifle is slung");
const bad = await J(`(() => { const s = JSON.parse(localStorage.getItem("tracklayer.save.v2")); Object.assign(s.x.sys.guns.s, { game: [{ k: "dragon" }, null, { k: "moose", pay: 1e9 }, 7], taken: { reindeer: -3, moose: 2.7, unicorn: 4, __proto__: 1 } }); return s; })()`);
await reload(bad); await ready();
a = await A(); ok(a.game.length === 1 && a.game[0].k === "moose" && a.game[0].pay === undefined && a.taken.moose === 2 && !("reindeer" in a.taken) && !("unicorn" in a.taken), "J: a corrupt game list loads clean: " + JSON.stringify([a.game, a.taken]));
const old = await J(`(() => { const s = JSON.parse(localStorage.getItem("tracklayer.save.v2")); delete s.x.sys.guns.s.game; delete s.x.sys.guns.s.taken; s.x.sys.guns.v = 1; return s; })()`);
await reload(old); await ready();
a = await A(); ok(Array.isArray(a.game) && a.game.length === 0 && a.taken && Object.keys(a.taken).length === 0 && (await ev("TLXGUN.state().owned.length")) === 1, "J: an 11.1a save (no game list) keeps its rifle and starts an empty tally");
await done(fails ? 1 : 0);

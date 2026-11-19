// Expansion slice 14.4b1: the boatyard beside the quay jetty and hull repairs (tlx-boats.js). Asserts, exit 1 on a failure.
//   the yard is sited at boot: shed on dry ground clear of everything, the slip's foot in 1 m+ of sea, clear of the jetty
//   and its berths, the door reachable; with no boat the door's use control reads BOATYARD and says what the yard does;
//   a sound hull has no Boatyard card; a dented one gets a card (AT THE SLIP, the price, REPAIR HULL) and the door reads
//   REPAIR with the price; short of cash it is refused; the use key, pad L3, the touch button and the app's button each
//   mend her and charge $8 a point; aboard it is refused ("step ashore"); away at another jetty the card says where to
//   bring her and the door says the same; least price $20, a wreck $800; a reload keeps the dent and the yard; the lamp
//   and window come on at night. NOSTILLS=1 skips the stills.
import { boot, ev, tap, sleep, done, reload, shot, padSet, padOff, sideCam, camOff, down, up } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const STILLS = !process.env.NOSTILLS;
const toasts = () => J(`(typeof TOASTQ !== "undefined" ? TOASTQ.map(t => t.msg || t[0] || String(t)) : []).concat([...document.querySelectorAll("#toasts > *")].map(e => e.textContent))`);
const clearToasts = () => ev(`(() => { if (typeof TOASTQ !== "undefined") TOASTQ.length = 0; document.getElementById("toasts").textContent = ""; return 1; })()`);
const app = async () => { await ev(`TABLET.toggle(false); true`); await sleep(250); await ev(`TABLET.toggle(true, "boats"); true`); await sleep(900); return ev(`document.getElementById("tabV").innerText`); };
const appOff = async () => { await ev(`TABLET.toggle(false); true`); await sleep(300); };
const boatsS = `TLX.state("vehicles").owned.filter(r => r.id === "skiff")`;
const buy = async () => { await ev(`garageTab = "boats"; openGarage(); true`); await sleep(400); await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(300); await ev(`closeGarage(); true`); };
const clickAct = pre => ev(`(() => { const b = document.querySelector("#tabV [data-act^='${pre}:']"); if (b) b.click(); return !!b; })()`);
// stood at the door (back = metres back along the walk toward the jetty)
const atDoor = async (back = 0) => { await ev(`(() => { const y = TLXB.yard(), D = TLXB.DOCKS[0], fx = Math.sin(D.yaw), fz = Math.cos(D.yaw), jx = -y.side * fz, jz = y.side * fx; if (!VEH.cur || FOOT.on) { P.vx = P.vz = 0; } FOOT.on = true; FOOT.g.visible = true; FOOT.x = y.door.x + jx * ${back}; FOOT.z = y.door.z + jz * ${back}; FOOT.yaw = Math.atan2(-jx, -jz); FOOT.y = TLXB.floorAt(FOOT.x, FOOT.z) ?? surf(FOOT.x, FOOT.z); FOOT.sp = 0; return 1; })()`); await sleep(700); };
const use = () => J(`({ use: footUse(), hint: $("wnHint").textContent })`);
const dent = (c, i = 0) => ev(`${boatsS}[${i}].cond = ${c}; true`);
const cond = (i = 0) => ev(`${boatsS}[${i}].cond`);
// a camera at a point given in the yard's own frame (a: along the slip, seaward +; b: toward the jetty +; h above the shed floor)
const ycam = async (a, b, h, la, lb, lh) => { await sideCam(); await ev(`window.camOv = c => { const y = TLXB.yard(), fx = Math.sin(y.yaw), fz = Math.cos(y.yaw), jx = -y.side * fz, jz = y.side * fx; c.position.set(y.x + fx * ${a} + jx * ${b}, y.floor + ${h}, y.z + fz * ${a} + jz * ${b}); c.lookAt(y.x + fx * ${la} + jx * ${lb}, y.floor + ${lh}, y.z + fz * ${la} + jz * ${lb}); }; true`); await sleep(500); };
const still = async n => { if (STILLS) await shot(n); };

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 36; true`);

// ---- 1. the yard is there, and sited sanely
const Y = await J(`(() => { const y = TLXB.yard(); if (!y) return null; const D = TLXB.DOCKS[0];
  const q = (x, z) => { const fx = Math.sin(D.yaw), fz = Math.cos(D.yaw), dx = x - D.x, dz = z - D.z; return { v: dx * fz - dz * fx, u: dx * fx + dz * fz }; };
  const inR = (x, z, m) => { const k = q(x, z); return y.rects.some(r => k.u > r.u0 - m && k.u < r.u1 + m && k.v > r.v0 - m && k.v < r.v1 + m); };
  return { side: y.side, off: y.off, len: y.len, floor: y.floor, u0: y.u0, ud: y.ud, dlen: D.len, deck: D.y,
    footSea: isSea(y.foot.x, y.foot.z), footDepth: TLXB.depthAt(y.foot.x, y.foot.z), shedG: groundAt(y.x, y.z), shedSea: isSea(y.x, y.z),
    doorFloor: TLXB.floorAt(y.door.x, y.door.z), walk: y.walk,
    berths: [-1, 1].map(sd => { const b = TLXB.berthPose(D, sd); return { ok: TLXB.berthOK(D, sd), d: Math.hypot(b.x - y.foot.x, b.z - y.foot.z), hit: inR(b.x, b.z, 0.95), u: q(b.x, b.z).u }; }),
    depot: Math.hypot(depot.x - y.x, depot.z - y.z), meshes: y.mesh.children.length }; })()`);
console.log("yard", JSON.stringify(Y));
ok(!!Y, "the boatyard was sited beside the quay jetty");
if (!Y) await done(1);
ok(Y.shedSea && Y.shedG < Y.floor - 0.4, `the shed stands on piles over the water's edge (floor ${Y.floor.toFixed(2)} m, the bed under its middle ${Y.shedG.toFixed(2)} m)`);
ok(Math.abs(Y.floor - Y.deck - 0.25) < 0.01, "its floor is one step above the jetty's deck");
ok(Y.footSea && Y.footDepth >= 1.0, `the slip's foot is in the sea, ${Y.footDepth.toFixed(1)} m deep there`);
ok(Y.off >= 9.5 && Y.len > 5 && Y.len < 14, `the slip runs ${Y.len.toFixed(1)} m into the water, ${Y.off} m to one side of the jetty`);
ok(Y.berths.every(b => b.ok && !b.hit) && Y.berths.every(b => b.d <= 45 && b.d > 2.5), `both quay berths still float a hull, clear of the yard, within reach of the slip (${Y.berths.map(b => b.d.toFixed(1)).join(" and ")} m from its foot)`);
ok(Y.ud + 0.6 < Math.min(...Y.berths.map(b => b.u)) - 2.3, `the walk across (at ${Y.ud.toFixed(1)} m along the jetty) lies landward of the berthed hulls`);
ok(Y.doorFloor !== null && Math.abs(Y.doorFloor - Y.deck) < 0.01, "the spot at the door is on the walk's planks");
ok(Y.meshes > 60, `the yard is built (${Y.meshes} meshes)`);
// walk it: from the jetty's deck across to the door, on the planks all the way
await ev(`P.x = depot.x; P.z = depot.z; P.vx = P.vz = 0; true`);
{ await ev(`(() => { const y = TLXB.yard(), D = TLXB.DOCKS[0], fx = Math.sin(D.yaw), fz = Math.cos(D.yaw); FOOT.on = true; FOOT.g.visible = true; FOOT.x = D.x + fx * y.ud; FOOT.z = D.z + fz * y.ud; FOOT.y = TLXB.floorAt(FOOT.x, FOOT.z); FOOT.yaw = Math.atan2(y.door.x - FOOT.x, y.door.z - FOOT.z); FOOT.sp = 0; return 1; })()`); await sleep(500);
  const w0 = await J(`({ x: FOOT.x, z: FOOT.z, f: TLXB.floorAt(FOOT.x, FOOT.z) })`);
  await down("KeyW"); let wet = false, got = false;
  for (let i = 0; i < 80 && !got; i++) { await sleep(150); const k = await J(`(() => { const y = TLXB.yard(); return { d: Math.hypot(FOOT.x - y.door.x, FOOT.z - y.door.z), f: TLXB.floorAt(FOOT.x, FOOT.z), yaw: FOOT.yaw, y: FOOT.y }; })()`); if (k.f === null) wet = true; if (k.d < 1.2) got = true; }
  await up("KeyW"); await sleep(300);
  const w1 = await J(`(() => { const y = TLXB.yard(); return { d: Math.hypot(FOOT.x - y.door.x, FOOT.z - y.door.z), y: FOOT.y, moved: Math.hypot(FOOT.x - ${w0.x}, FOOT.z - ${w0.z}), help: HELP.on }; })()`);
  console.log("walk", JSON.stringify(w1));
  ok(got && !wet && !w1.help && Math.abs(w1.y - Y.deck) < 0.3, `walked ${w1.moved.toFixed(1)} m from the jetty's deck across to the door, on planks all the way`);
  // and the wall stops you: keep walking, you don't go through the shed into the sea
  await down("KeyW"); await sleep(2500); await up("KeyW"); await sleep(300);
  const w2 = await J(`({ f: TLXB.floorAt(FOOT.x, FOOT.z), help: HELP.on, y: FOOT.y })`);
  ok(w2.f !== null && !w2.help, "walking on at the door, the wall stops you on the planks"); }

// ---- 2. no boat: the door says what the yard is
await atDoor();
let s = await use();
ok(s.use === "BOATYARD" && /ask at the boatyard/.test(s.hint), `at the door the use control reads BOATYARD: "${s.hint}"`);
await clearToasts(); await tap("KeyE"); await sleep(400);
ok((await toasts()).some(x => /mends hulls on the slip/.test(x) && /Boats tab/.test(x)), "with no boat, it says the yard mends hulls and where the skiff is sold");
await ycam(26, -9, 4.5, 6, 0, 0.5); await still("y1_from_sea");
await ycam(-3, 13, 2.6, 0, 3, 1.2); await still("y2_from_jetty");
await ycam(30, 20, 22, 6, 4, 0); await still("y3_above");
await ycam(17, -3.5, 1.6, 7, 0, 0.6); await still("y4_slip_cradle");
await ycam(-16, 6, 7, 2, 2, 0.5); await still("y5_from_shore");
await camOff();
// away from the door there is nothing to use
await atDoor(3.6);
s = await use(); ok(s.use !== "BOATYARD" && s.use !== "REPAIR", "back at the jetty end of the walk the use control is not the yard's");

// ---- 3. a boat with a sound hull: no card; the door says she is sound
await ev(`FOOT.on = false; GS.cash = 9000; true`); await buy();
ok((await J(boatsS)).length === 1 && await ev(`TLXB.atYard(${boatsS}[0])`), "bought a skiff: on her quay berth she is within reach of the yard");
let t = await app();
ok(!/Boatyard/.test(t) && /Hull sound/.test(t) && /the boatyard/.test(t), "a sound hull has no Boatyard card; the jetty list names the boatyard at the quay jetty");
await appOff(); await atDoor();
await clearToasts(); await tap("KeyE"); await sleep(400);
ok((await toasts()).some(x => /hull is sound/.test(x) && /\$8 a point/.test(x)), "at the door with a sound hull: nothing to do, and the rate");
await ev(`(() => { if (FISH.panelOpen()) FISH.back(); return 1; })()`); await sleep(250);   // 14.4b2: with a boat the door also opens the yard's counter (x14_tackle.mjs)

// ---- 4. dented at the berth: the card, the door, broke, the use key
await dent(60);
ok(await ev(`TLXB.repairCost(${boatsS}[0])`) === 320, "40 points of hull cost $320 ($8 a point)");
t = await app();
console.log("card:", t.replace(/\s+/g, " ").slice(0, 900));
ok(/Boatyard · hull repair/.test(t) && /AT THE SLIP/.test(t) && /REPAIR HULL/.test(t) && t.includes("$320") && /60% back to 100%/.test(t), "the Boats app has a Boatyard card: AT THE SLIP, $320, REPAIR HULL");
ok(await ev(`[...document.querySelectorAll("#tabV [data-act]")].every(b => b.closest("[data-tf]") || b.dataset.tf)`), "every button in the app is reachable by pad / arrows (data-tf)");
ok(await ev(`!document.querySelector("#tabV [data-act^='bry:']").classList.contains("blocked")`), "the REPAIR HULL button is live");
await still("y6_app_card");
await ev(`GS.cash = 100; true`); await clearToasts(); await clickAct("bry"); await sleep(300);
ok((await toasts()).some(x => /The yard wants \$320/.test(x)) && (await cond()) === 60 && await ev(`GS.cash === 100`), "short of cash it is refused and says the price");
await appOff(); await ev(`GS.cash = 5000; true`);
s = await use();
ok(s.use === "REPAIR" && /mend the Fjordsnekka 460's hull \(\$320\)/.test(s.hint) && /^E: /.test(s.hint), `keyboard: the door reads REPAIR with the price: "${s.hint}"`);
await clearToasts(); await tap("KeyE"); await sleep(500);
ok((await cond()) === 100 && await ev(`GS.cash === 4680`), "keyboard: the use key has her mended, $320 off");
ok((await toasts()).some(x => /up the slip/.test(x) && /60% to 100%/.test(x) && x.includes("$320")), "the toast says what was done and what it cost");
s = await use(); ok(s.use === "BOATYARD", "mended, the door reads BOATYARD again");

// ---- 5. pad and touch at the door
await dent(80);
await padSet({}, [0, 0, 0.7, 0]); await sleep(350); await padSet({}); await sleep(450);
s = await use();
ok(s.use === "REPAIR" && !/\bE:/.test(s.hint) && s.hint.includes("$160"), `pad: the hint names the pad's button, not a key: "${s.hint}"`);
await padSet({ 10: 1 }); await sleep(350); await padSet({}); await sleep(500); await padOff();
ok((await cond()) === 100 && await ev(`GS.cash === 4520`), "pad: L3 at the door has her mended ($160)");
await ev(`INP.dev = "kbm"; true`);
await dent(90);
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(800);
s = await J(`({ hidden: $("tcUse").hidden, label: $("tcUse").textContent, hint: $("wnHint").textContent })`);
ok(!s.hidden && s.label === "REPAIR" && /tap REPAIR/.test(s.hint), `touch: the use button reads REPAIR and the hint says to tap it: "${s.hint}"`);
await ev(`(() => { const b = $("tcUse"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return 1; })()`); await sleep(500);
ok((await cond()) === 100 && await ev(`GS.cash === 4440`), "touch: the button has her mended ($80)");
await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; true`);

// ---- 6. from the app
await dent(50); t = await app();
ok(t.includes("$400"), "50 points: $400 on the card");
await clearToasts(); await clickAct("bry"); await sleep(500);
t = await ev(`document.getElementById("tabV").innerText`);
ok((await cond()) === 100 && await ev(`GS.cash === 4040`) && !/Boatyard · hull repair/.test(t) && /Hull sound/.test(t), "REPAIR HULL in the app mends her, charges $400, and the card goes");
await appOff();

// ---- 7. prices at the ends
await dent(99); ok(await ev(`TLXB.repairCost(${boatsS}[0])`) === 20, "one point of hull: the least the yard charges, $20");
await dent(0); ok(await ev(`TLXB.repairCost(${boatsS}[0])`) === 800, "a wreck of a hull: $800");
await dent(99.8); ok(await ev(`TLXB.repairCost(${boatsS}[0])`) === 0 && /sound/.test(await ev(`TLXB.repairBlock(${boatsS}[0])`)), "under half a point she counts as sound");

// ---- 8. aboard: step ashore first
await dent(70);
await ev(`TLXV.swapTo(${boatsS}[0].uid); FOOT.on = false; FOOT.g.visible = false; true`); await sleep(700);
ok(await ev(`!!(VEH.cur && VEH.cur.pin === "boat") && !FOOT.on`), "aboard the skiff at her berth");
t = await app();
ok(/AT THE SLIP/.test(t) && /Step ashore first/.test(t) && await ev(`document.querySelector("#tabV [data-act^='bry:']").classList.contains("blocked")`), "aboard, the card says to step ashore first and the button is blocked");
await clearToasts(); await clickAct("bry"); await sleep(300);
ok((await toasts()).some(x => /Step ashore first/.test(x)) && (await cond()) === 70, "pressing it aboard is refused, nothing charged");
await appOff();

// ---- 8b. the skiff can't run through the yard: set inside the shed, the slip's head and the walk, she is pushed out
for (const [nm, i] of [["the shed", 0], ["the head of the slip", 1], ["the walk across", 2]]) {
  await ev(`(() => { const y = TLXB.yard(), D = TLXB.DOCKS[0], r = y.rects[${i}], u = (r.u0 + r.u1) / 2, v = (r.v0 + r.v1) / 2, fx = Math.sin(D.yaw), fz = Math.cos(D.yaw); P.x = D.x + fz * v + fx * u; P.z = D.z - fx * v + fz * u; P.vx = P.vz = 0; return 1; })()`); await sleep(500);
  const k = await J(`(() => { const y = TLXB.yard(), D = TLXB.DOCKS[0], r = y.rects[${i}], fx = Math.sin(D.yaw), fz = Math.cos(D.yaw), dx = P.x - D.x, dz = P.z - D.z, v = dx * fz - dz * fx, u = dx * fx + dz * fz; return { in: u > r.u0 && u < r.u1 && v > r.v0 && v < r.v1, sea: isSea(P.x, P.z) }; })()`);
  ok(!k.in, `set down inside ${nm}, the skiff is pushed out of it`);
}
await ev(`(() => { const b = TLXB.berthPose(TLXB.DOCKS[0], 1); P.x = b.x; P.z = b.z; P.yaw = b.yaw; P.vx = P.vz = 0; return 1; })()`); await sleep(700);
ok(await ev(`(() => { const b = TLXB.berthPose(TLXB.DOCKS[0], 1); return Math.hypot(P.x - b.x, P.z - b.z) < 0.4; })()`), "back on her berth she lies still: the yard does not push a berthed boat");

// ---- 9. away at another jetty: where to bring her
await ev(`TLXV.swapTo(null); FOOT.on = false; true`); await sleep(600);
await ev(`(() => { const r = ${boatsS}[0], b = TLXB.berthPose(TLXB.DOCKS[1], 1); r.x = b.x; r.z = b.z; r.yaw = b.yaw; return 1; })()`); await sleep(300);
ok(!(await ev(`TLXB.atYard(${boatsS}[0])`)), "moored at the next jetty she is out of the yard's reach");
t = await app();
ok(/NOT HERE/.test(t) && /Bring her to the quay jetty/.test(t) && await ev(`document.querySelector("#tabV [data-act^='bry:']").classList.contains("blocked")`), "the card says NOT HERE and to bring her to the quay jetty");
const c0 = await ev(`GS.cash`); await clearToasts(); await clickAct("bry"); await sleep(300);
ok((await toasts()).some(x => /Bring her to the quay jetty first/.test(x)) && (await cond()) === 70 && (await ev(`GS.cash`)) === c0, "REPAIR HULL from afar is refused");
await appOff(); await atDoor();
s = await use(); ok(s.use === "BOATYARD", "at the door with her away, it reads BOATYARD");
await clearToasts(); await tap("KeyE"); await sleep(400);
ok((await toasts()).some(x => /bring her round to the quay jetty/.test(x) && x.includes("$240")), "and the yard says to bring her round, and about what it will cost ($240)");
await ev(`(() => { if (FISH.panelOpen()) FISH.back(); return 1; })()`); await sleep(250);

// ---- 10. a reload keeps the dent, and the yard stands where it stood
const y0 = await J(`(() => { const y = TLXB.yard(); return [y.x, y.z, y.floor]; })()`);
await ev(`FOOT.on = false; save(); true`); await reload(); await sleep(800);
const y1 = await J(`(() => { const y = TLXB.yard(); return y ? [y.x, y.z, y.floor] : null; })()`);
ok(!!y1 && Math.hypot(y1[0] - y0[0], y1[1] - y0[1]) < 0.01 && Math.abs(y1[2] - y0[2]) < 0.01, "after a reload the yard stands exactly where it stood");
ok((await cond()) === 70, "and the dent is still there (70%)");

// ---- 11. the lamp and the window by day and by night
await ev(`WX.at = () => 0; GS.storm = 0; true`);
const glowAt = async h => { await ev(`GS.hour = ${h}; true`); await sleep(1500); return J(`(() => { let e = null; TLXB.yard().mesh.traverse(m => { if (m.material && m.material.emissiveIntensity !== undefined && m.material.emissive && m.material.emissive.r > 0.5) e = m.material.emissiveIntensity; }); return { e, day: dayFactor() }; })()`); };
await atDoor(); await ycam(-3, 13, 2.6, 0, 3, 1.2);
const gDay = await glowAt(36), gNight = await glowAt(48);
console.log("glow", JSON.stringify({ gDay, gNight }));
ok(gNight.e > gDay.e + 0.2 || (gDay.day < 0.3 && gNight.e > 1), `the window and lamp burn brighter in the dark (${gDay.e.toFixed(2)} at noon, ${gNight.e.toFixed(2)} at midnight)`);
await still("y7_night_door");
await ycam(26, -9, 4.5, 6, 0, 0.5); await still("y8_night_from_sea");
await camOff();

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
await done(fails ? 1 : 0);

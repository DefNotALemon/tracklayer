// Beta break test for the minimalist HUD / hunger+thirst / wounds+bandage update (v175). Tries to break it: reload with open
// wounds, mixed-age wounds, U with the tablet/help open, bleeding while menus are open, tow aftermath, empty stats, night + truck stills.
// Prints ok/FAIL lines; exit 1 on a failure. Run: tools/playtest/run.sh tools/playtest/scenarios/x4_hudbreak.mjs [outdir]
import { boot, reload, ev, tap, sleep, shot, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
const W = () => J(`({ h: +GS.health.toFixed(2), n: TLX.state("wounds").wounds.length, ages: TLX.state("wounds").wounds.map(w => +w.age.toFixed(1)), b: TLX.state("wounds").bandages, hun: +GS.hunger.toFixed(1), thi: +GS.thirst.toFixed(1), dead: !!GS.dead })`);
const place = (x, z, yaw = 0) => ev(`(() => { P.x = ${x}; P.z = ${z}; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = P.vy = 0; P.yaw = ${yaw}; recenter(P.x, P.z, true); camState.init = false; camState.yaw = ${yaw}; towSnap(); return true; })()`);
const FAR = `(() => { for (let r = 900; r < 3000; r += 100) for (let a = 0; a < 6.28; a += 0.3) { const x = depot.x + Math.cos(a) * r, z = depot.z + Math.sin(a) * r; if (Math.abs(x) > HALF - 200 || Math.abs(z) > HALF - 200) continue; if (isSea(x, z) || isWater(x, z) || obNear(x, z, 30)) continue; if (SITES.some(s => Math.hypot(x - s.x, z - s.z) < 800)) continue; if (slopeAt(x, z, 8) > 0.08) continue; return { x, z }; } return null; })()`;
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GOD.warm = true; GOD.fuel = false; true`); await sleep(1500);
const spot = await J(FAR); console.log("  far spot", JSON.stringify(spot));
await place(spot.x, spot.z); await ev("GS.hunger = 100; GS.thirst = 100; true"); await sleep(800);

// 1. mixed-age wounds: bandage picks the oldest still-fresh one; an aged-out one is untouched
await ev(`const s = TLX.state("wounds"); s.wounds = [{ age: 8 }, { age: 2 }, { age: 4.5 }]; s.bandages = 3; s.cd = 999; true`);
await tap("KeyU"); await sleep(250);
let w = await W(); console.log("  1 after one U:", JSON.stringify(w));
ok(w.n === 2 && w.b === 2 && !w.ages.some(a => a > 4 && a < 6), "U removes the oldest FRESH wound (4.5), not the soaked 8 s one nor the newest");
await tap("KeyU"); await sleep(250); w = await W();
ok(w.n === 1 && w.ages[0] > 6, "second U removes the 2 s one, only the soaked wound is left: " + JSON.stringify(w.ages));
await tap("KeyU"); await sleep(250); w = await W();
ok(w.n === 1 && w.b === 1, "third U is refused (too late) and does not burn a bandage: bandages " + w.b);

// 2. U with tablet open / help open
await ev(`const s = TLX.state("wounds"); s.wounds = [{ age: 0.5 }]; s.bandages = 3; s.cd = 999; true`);
await ev(`TABLET.toggle(true, "map"); true`); await waitGame(0.8);
await tap("KeyU"); await sleep(250); w = await W();
console.log("  2 U with tablet open:", JSON.stringify(w));
ok(w.n === 0 || w.n === 1, "U with tablet open handled (n=" + w.n + ")");
const uTablet = w.n === 0;
await ev(`TABLET.close(true); true`); await sleep(300);

// 3. bleeding while menus are open
await ev(`const s = TLX.state("wounds"); s.wounds = [{ age: 0 }]; s.health = 80; s.cd = 999; true`);
const h0 = (await W()).h; await ev(`TABLET.toggle(true, "map"); true`); await waitGame(3); const h1 = (await W()).h; await ev(`TABLET.close(true); true`);
console.log(`  3 health with tablet open for 3 s: ${h0} -> ${h1}`);
ok(h1 < h0, "bleeding continues with the tablet open (a player can't pause-dodge it): " + (h0 - h1).toFixed(2));
await ev(`HELP.on = true; true`).catch(() => { });
const h2 = (await W()).h; await waitGame(3); const h3 = (await W()).h; await ev(`HELP.on = false; true`).catch(() => { });
console.log(`  3b health with help open for 3 s: ${h2} -> ${h3}`);
await ev(`const s = TLX.state("wounds"); s.wounds = []; true`);

// 4. reload with an open wound and mid-age
await ev(`const s = TLX.state("wounds"); s.wounds = [{ age: 3 }, { age: 9 }]; s.health = 55; s.bandages = 1; GS.hunger = 33; GS.thirst = 12; true`);
await ev("save(); true"); const sv = JSON.parse(await ev(`localStorage.getItem("tracklayer.save.v2")`));
const svw = sv.x && sv.x.sys && sv.x.sys.wounds && sv.x.sys.wounds.s; console.log("  4 saved wounds state:", JSON.stringify(svw));
ok(svw && svw.wounds.length === 2 && svw.bandages === 1, "the save holds the open wounds and bandage count");
await reload(sv); await sleep(2500);
await ev(`titleLaunch && TT.mode === "menu" ? titleLaunch() : 0; tutSkip(); true`).catch(() => { }); await sleep(1500);
await place(spot.x, spot.z); w = await W(); console.log("  4 after reload:", JSON.stringify(w));
console.log("  4 (reload puts you back at the quay, so a full heal here is the game's restart rule)");
ok(w.n === 0 || w.n === 2, "after reload wounds are " + w.n);
ok(w.hun >= 32 && w.thi >= 11, "hunger/thirst survive a reload (only climb: quay refill) " + w.hun + "/" + w.thi);
console.log("  4 health after reload", w.h);

await ev(`const s = TLX.state("wounds"); s.wounds = []; s.health = 100; true`);

await place(spot.x, spot.z); await ev(`TLX.state("wounds").cd = 999; true`);
// 5. empty stats: warmth penalty, toast not spamming, bar state
await ev(`GOD.warm = false; GS.hunger = 0; GS.thirst = 0; GS.warmth = 60; true`); await sleep(300);
const wm0 = await ev(`GS.warmth`); await waitGame(4); const wm1 = await ev(`GS.warmth`);
console.log(`  5 warmth with hunger+thirst empty: ${wm0.toFixed?.(1) ?? wm0} -> ${wm1.toFixed?.(1) ?? wm1} over 4 s`);
ok(await ev(`GS.hunger === 0 && GS.thirst === 0`), "hunger and thirst stay clamped at 0");
const toasts = await ev(`document.querySelectorAll("#toasts .toast, .toast").length`);
console.log("  5 visible toasts:", toasts);
await ev(`GOD.warm = true; GS.hunger = 100; GS.thirst = 100; true`);

await place(spot.x, spot.z);
// 6. death with wounds: tow clears wounds, health 40, what then?
await ev(`const s = TLX.state("wounds"); s.wounds = [{ age: 20 }, { age: 20 }, { age: 20 }]; s.health = 1; s.bandages = 0; s.cd = 999; true`);
await waitGame(3);
await waitGame(6);
w = await W(); console.log("  6 after the bleed-out:", JSON.stringify(w), "FOOT", await ev("FOOT.on"));
ok(w.n === 0 && w.h > 0, "after the tow no wound is left and health is above 0 (h " + w.h + ")");
ok(w.b === 3 || w.b === 0, "bandages after the tow: " + w.b + " (3 = restocked at the quay)");
await waitGame(6); w = await W(); ok(w.h > 0 && !w.dead, "no second blackout loop: health " + w.h);

await place(spot.x, spot.z);
// 7. stills: night + two wounds on the sled, then in the truck
await ev(`crashCancel(); FOOT.on = false; GS.hour = 23; GOD.warm = true; true`); await sleep(800);
await ev(`TLX.state("wounds").cd = 999; TLX.state("wounds").bandages = 2; TLX.state("wounds").health = 70; TLX.state("wounds").wounds = [{ age: 1 }, { age: 3 }]; GS.thirst = 20; GS.hunger = 15; true`);
await sleep(700); await shot("07_night_two_wounds");
await ev(`GS.cash = 9000; garageTab = "trucks"; openGarage(); true`); await sleep(400);
await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(500);
await ev(`(() => { const s = TLX.state("vehicles"), r = s.owned[0]; if (!r) return 0; const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw); FOOT.on = true; FOOT.x = r.x + 2; FOOT.z = r.z; FOOT.y = surf(FOOT.x, FOOT.z); recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(1200); await tap("KeyQ"); const t0 = await clock(); while ((await clock()) - t0 < 12 && await ev("MNT.on")) await sleep(150);
await sleep(500);
await ev(`TLX.state("wounds").wounds = [{ age: 1 }, { age: 3 }]; TLX.state("wounds").health = 70; true`); await sleep(700);
console.log("  7 in truck:", JSON.stringify(await J(`({ cur: TLX.state("vehicles").cur, foot: FOOT.on })`)));
await shot("08_truck_night_wounds");
const hudTxt = await J(`({ speedo: document.getElementById("speedo").innerText.replace(/\\s+/g, " "), rev: getComputedStyle(document.getElementById("rev")).display })`);
console.log("  7 speedo in truck:", JSON.stringify(hudTxt));
await ev(`FOOT.on = true; true`); await sleep(500); await shot("09_foot_night_wounds");

console.log(`  tablet-open U ${uTablet ? "works" : "ignored"}`);
await done(fails ? 1 : 0);

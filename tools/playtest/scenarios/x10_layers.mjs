// Slice 10.1 (G4): clothing layers that matter (tlx-gear.js), sold at Nordkinn Fisk & Friluft. Asserts, exit 1 on a failure.
//  A. a new game wears the free cotton tee + no mid layer: no extra warmth, cold rate unchanged (a player who never
//     shops plays today's game).
//  B. at the shop (E / SHOP) the panel reads "Tackle & outdoor" with Base layers / Mid layers tabs beside the tackle;
//     without cash the buy buttons say so; with cash a merino top and a down jacket are bought and worn (cash down,
//     ST.warm up by their warmth), owned layers swap back free, the tackle tabs still work, Esc closes.
//  C. wading powder on foot (held W) wets the base layer at the planned rate; standing still doesn't.
//  D. damp layers chill: on the sled out on the fell at night the warmth drain with a damp cotton tee is coldK times the
//     dry drain; cotton + down damp is colder than merino + fleece damp; the soaked toast fires once.
//  E. indoors (the quay) dries you fast; through the ice (HELP sea) soaks you.
//  F. saved: bought + worn layers survive a reload; an old save without the system starts in cotton, dry.
import { boot, ev, raw, tap, hold, sleep, done, shot, park, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(80); }
const toasts = () => J(`(TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))`);
const G = () => J(`({ base: TLXG.state().base, mid: TLXG.state().mid, wet: TLXG.state().wet, warm: ST.warm, lw: TLXG.warm(), k: TLXG.coldK(), cash: GS.cash, own: TLXG.state().own })`);

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(500);
// A
let a = await G(), kit = await ev(`GEAR_ORDER.reduce((a, s) => a + gearDef(s, GS.own.gear[s]).warm, 0) + stats().cold`);
console.log("A", JSON.stringify(a), "kit+sled", kit);
ok(a.base === "cotton" && a.mid === "none" && a.wet === 0, "A: new game in the cotton tee, no mid layer, dry");
ok(a.lw === 0 && Math.abs(a.warm - kit) < 1e-9 && a.k === 1, "A: layers add no warmth and leave the cold rate alone (ST.warm " + a.warm + ")");

// B: the shop
await ev(`(() => { FOOT.on = true; FOOT.x = FISHSITES.shop.x; FOOT.z = FISHSITES.shop.z; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = FOOT.fwd = 0; GS.cash = 0; return true; })()`); await sleep(400);
let b = await J(`({ lbl: FISH.ctxLabel(), hint: FISH.hint() })`);
ok(b.lbl === "SHOP" && /outdoor/.test(b.hint), "B: by the shop the use control reads SHOP, hint: " + b.hint);
await ev(`FISH.ctx(); true`); await sleep(300);
const panel = () => J(`({ open: !$("ifShop").hidden, h2: $("ifShop").querySelector("h2").textContent, tabs: [...$("ifShopTabs").children].map(t => t.dataset.t + "=" + t.textContent),
  lay: [...$("ifShop").querySelectorAll("button[data-layer]")].map(x => x.dataset.layer + "|" + x.disabled + "|" + x.textContent), buy: $("ifShop").querySelectorAll("button[data-buy]").length })`);
const tab = t => ev(`$("ifShopTabs").querySelector('[data-t="${t}"]').click(); true`);
const press = id => ev(`$("ifShop").querySelector('button[data-layer="${id}"]').click(); true`);
let p = await panel();
ok(p.open && p.h2 === "Tackle & outdoor" && p.tabs.includes("lay_base=Base layers") && p.tabs.includes("lay_mid=Mid layers") && p.tabs.some(t => t.startsWith("rods=")), "B: shop open, " + p.h2 + ", tabs " + p.tabs.join(", "));
await tab("lay_base"); await sleep(150); p = await panel(); console.log("B base, no cash", p.lay.join(" ; "));
ok(p.lay.length === 3 && /cotton\|true\|Wearing/.test(p.lay[0]) && /merino\|true\|.*not enough cash/.test(p.lay[1]), "B: broke: cotton worn, merino says not enough cash");
await shot("x10_shop_base");
await ev(`GS.cash = 500; true`); await tab("lay_base"); await sleep(100);
const w0 = (await G()).warm;
await press("base:merino"); await sleep(150); a = await G();
ok(a.base === "merino" && a.cash === 415 && Math.abs(a.warm - w0 - 0.5) < 1e-6, `B: merino bought and worn ($500 -> $${a.cash}, warmth ${w0} -> ${a.warm})`);
await tab("lay_mid"); await sleep(100); await press("mid:down"); await sleep(150); a = await G();
ok(a.mid === "down" && a.cash === 175 && Math.abs(a.warm - w0 - 2.9) < 1e-6, `B: down jacket bought and worn ($${a.cash}, warmth ${a.warm})`);
await shot("x10_shop_mid");
await tab("lay_base"); await sleep(100); await press("base:cotton"); await sleep(100); a = await G();
ok(a.base === "cotton" && a.cash === 175, "B: back into the cotton tee, free");
p = await panel(); ok(/merino\|false\|Wear this/.test(p.lay[1]), "B: the merino now offers 'Wear this': " + p.lay[1]);
await press("base:merino"); await sleep(100); a = await G();
ok(a.base === "merino" && a.cash === 175, "B: merino back on, no second charge ($" + a.cash + ")");
await tab("rods"); await sleep(100); p = await panel();
ok(p.buy > 0 && p.lay.length === 0, "B: the Rods tab still lists tackle (" + p.buy + " buy buttons)");
await tap("Escape"); await sleep(300);
ok(await ev(`$("ifShop").hidden`), "B: Esc closes the shop");

// C: sweat from wading powder
const spot = await park(); console.log("park", JSON.stringify(spot));
await ev(`(() => { FOOT.on = true; FOOT.x = P.x + 3; FOOT.z = P.z; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = FOOT.fwd = 0; FOOT.yaw = 0; TLXG.state().wet = 0; TLXG.state().warned = false; GS.warmth = 100; return true; })()`); await sleep(400);
let c0 = await J(`({ wet: TLXG.state().wet, near: !!GS.near, t: gameClock })`);
await waitGame(4); let c1 = await J(`({ wet: TLXG.state().wet, e: TLXG.exertion(), t: gameClock })`);
ok(c1.wet === 0 && c1.e === 0 && !c0.near, "C: standing still out on the fell: no sweat (wet " + c1.wet + ")");
await ev(`window.__ex = []; window.__exT = setInterval(() => window.__ex.push(window.__tl("TLXG.exertion()")), 100); true`);
const t0 = await clock(); await hold(["KeyW"], 9000); const t1 = await clock();
let c2 = await J(`({ wet: TLXG.state().wet, ex: (() => { clearInterval(window.__exT); const a = window.__ex.filter(v => v > 0); return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0; })(), d: Math.hypot(FOOT.x - P.x, FOOT.z - P.z), fresh: freshAt(Math.floor((FOOT.x + HALF) / CELL), Math.floor((FOOT.z + HALF) / CELL)) })`);
const want = (t1 - t0) * c2.ex * (1 / 150) * 2;   // merino + down: x (1 + 1)
console.log("C", JSON.stringify(c2), "game s", (t1 - t0).toFixed(1), "want ~", want.toFixed(3));
ok(c2.ex > 0.3, "C: wading powder is hard work (mean exertion " + c2.ex.toFixed(2) + ")");
ok(c2.wet > 0.03 && c2.wet > want * 0.6 && c2.wet < want * 1.4, `C: wading ${(t1 - t0).toFixed(1)} game s in merino + down wet the base to ${c2.wet.toFixed(3)} (plan ${want.toFixed(3)})`);

// D: damp layers chill on the sled
await ev(`(() => { FOOT.on = false; if (FOOT.g) FOOT.g.visible = false; P.vx = P.vz = 0; GS.hour = 46; return true; })()`); await sleep(400);
const drain = async (base, mid, wet, secs = 6) => {
  await ev(`(() => { const s = TLXG.state(); s.base = "${base}"; s.mid = "${mid}"; s.own["base:${base}"] = 1; s.own["mid:${mid}"] = 1; restat(); s.wet = ${wet}; s.warned = true; GS.warmth = 90; return true; })()`);
  const w0 = await ev("GS.warmth"), c0 = await clock(); await waitGame(secs);
  const r = await J(`({ w: GS.warmth, t: gameClock, k: TLXG.coldK(), wet: TLXG.state().wet, near: !!GS.near })`);
  return { rate: (w0 - r.w) / (r.t - c0), k: r.k, wet: r.wet, near: r.near };
};
const dry = await drain("cotton", "none", 0), damp = await drain("cotton", "none", 0.8);
console.log("D dry", JSON.stringify(dry), "damp", JSON.stringify(damp));
ok(!dry.near && dry.rate > 0, "D: out on the fell at night the cold drains warmth (" + dry.rate.toFixed(3) + "/s)");
ok(damp.k > 1.3 && Math.abs(damp.rate / dry.rate - damp.k) < 0.12 * damp.k, `D: a damp cotton tee drains ${(damp.rate / dry.rate).toFixed(2)}x as fast (coldK ${damp.k.toFixed(2)})`);
const kk = await J(`(() => { const s = TLXG.state(), out = {}; for (const [b, m] of [["cotton", "down"], ["merino", "fleece"], ["wool", "none"], ["merino", "down"]]) { s.base = b; s.mid = m; restat(); s.wet = 0.8; out[b + "+" + m] = TLXG.coldK(); } return out; })()`);
console.log("D coldK at wet 0.8", JSON.stringify(kk));
ok(kk["cotton+down"] > kk["merino+down"] && kk["merino+down"] > kk["merino+fleece"] && kk["merino+fleece"] > 1 && kk["wool+none"] < 1.15, "D: damp cotton+down coldest, merino+fleece shrugs it off");
await ev(`(() => { const s = TLXG.state(); s.base = "cotton"; s.mid = "none"; restat(); s.wet = 0.5; s.warned = false; return true; })()`); await waitGame(1.5);
let tl = await toasts(); const soakT = tl.filter(t => /soaked with sweat/.test(t));
ok(soakT.length === 1, "D: one soaked toast: " + (soakT[0] || "none"));
await shot("x10_soaked");

// E: drying indoors, soaking through the ice
await ev(`(() => { P.x = depot.x + 4; P.z = depot.z + 4; P.y = surf(P.x, P.z) + 0.3; recenter(P.x, P.z, true); TLXG.state().wet = 0.8; return true; })()`);
await waitGame(5); let e = await J(`({ wet: TLXG.state().wet, near: GS.near && GS.near.name })`);
ok(e.near && e.wet < 0.7, `E: at ${e.near} the stove dries you (0.8 -> ${e.wet.toFixed(2)} in 5 s)`);
e = await J(`(() => { const s = TLXG.state(); s.wet = 0; const d = TLX.systems.find(x => x.id === "gear"); HELP.on = true; HELP.kind = "sea"; d.tick(1); HELP.on = false; HELP.kind = ""; return { wet: s.wet }; })()`);
ok(e.wet >= 0.49, "E: a second in the fjord soaks you (" + e.wet + ")");

// F: saved
await ev(`(() => { const s = TLXG.state(); s.base = "merino"; s.mid = "down"; s.wet = 0.2; restat(); save(); return true; })()`);
await reload(); await sleep(500);
let f = await G(); console.log("F", JSON.stringify(f));
ok(f.base === "merino" && f.mid === "down" && f.own["base:merino"] && f.own["mid:down"] && f.wet <= 0.2001 && Math.abs(f.lw - 2.9) < 1e-6, "F: layers bought and worn survive a reload");
const old = await J(`(() => { const s = JSON.parse(localStorage.getItem("tracklayer.save.v2")); if (s.x && s.x.sys) delete s.x.sys.gear; return s; })()`);
await reload(old); await sleep(500);
f = await G(); kit = await ev(`GEAR_ORDER.reduce((a, s) => a + gearDef(s, GS.own.gear[s]).warm, 0) + stats().cold`);
ok(f.base === "cotton" && f.mid === "none" && f.wet === 0 && Math.abs(f.warm - kit) < 1e-9, "F: an old save without the system starts in cotton, dry, warmth unchanged");
await done(fails ? 1 : 0);

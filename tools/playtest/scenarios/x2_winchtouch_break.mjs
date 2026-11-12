// Beta break test for slice 2.1b: winch verbs on TOUCH, each winch's line length at the range edge, reel then reload. Exit 1 on a failure.
import { boot, ev, tap, sleep, done, park, reload, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const S = async () => JSON.parse(await ev(`JSON.stringify({ foot: FOOT.on, use: footUse(), hint: $("wnHint").textContent, wn: WN.state, bog: BOG.on,
  tc: $("tcUse").hidden ? null : $("tcUse").textContent, len: (winchDef() || {}).len || 0, toast: [...document.querySelectorAll("#toasts *")].map(e => e.textContent).slice(-2) })`));
const fire = `(() => { const b = $("tcUse"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return true; })()`;
await boot();
await ev(`tutSkip(); true`); await sleep(500);
await ev(`crashCancel(); FOOT.on = false; GS.own.parts.winch = "elec"; restat(); true`);
await park(); await sleep(1200);
const found = JSON.parse(await ev(`(() => { for (const arr of obGrid.values()) for (const o of arr) { if (o.tree === undefined || o.log || o.down || o.top === -Infinity) continue; if (isSea(o.x, o.z) || isWater(o.x, o.z) || Math.hypot(o.x, o.z) < 300) continue; if (anchorsNear(o.x, o.z, 5).length !== 1) continue; return JSON.stringify({ x: o.x, z: o.z }); } return "null"; })()`));
ok(!!found, "found a tree anchor");
if (found) {
  await ev(`P.x = ${found.x} + 8; P.z = ${found.z}; P.vx = 0; P.vz = 0; true`); await sleep(1500);
  await tap("KeyQ"); for (let i = 0; i < 30 && !(await S()).foot; i++) await sleep(300);
  for (let i = 0; i < 30 && await ev(`!!DMT.on`); i++) await sleep(300); await sleep(500);
  await ev(`BOG.on = true; BOG.dig = 0; WN.state = "out"; WN.snapT = 0; SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(600);
  for (const w of ["hand", "elec", "heavy"]) {
    await ev(`GS.own.parts.winch = "${w}"; GS.own.partsOwned[ownKey("winch", "${w}")] = true; restat(); WN.state = "out"; true`);
    const len = (await S()).len; console.log("winch", w, "len", len);
    // in reach edge vs just beyond, measured fairlead to tree (sled at len-1 and len+1.5 from the tree)
    for (const [tag, d, want] of [["in", len - 1.5, true], ["out", len + 1.5, false]]) {
      await ev(`(() => { const a = ${JSON.stringify(found)}; P.x = a.x + ${d}; P.z = a.z; P.yaw = -Math.PI / 2; FOOT.x = a.x + 1.2; FOOT.z = a.z; WN.state = "out"; true; })()`); await sleep(500);
      const s = await S(); console.log(w, tag, JSON.stringify(s));
      if (want) {
        ok(s.use === "HOOK" && s.tc === "HOOK", `${w} in reach: label+touch button HOOK (${s.use}/${s.tc})`);
        await ev(fire); await sleep(500); const t = await S();
        ok(t.wn === "hooked" && t.tc === "UNHOOK", `${w} touch tap hooks, button reads UNHOOK (${t.wn}/${t.tc})`);
        ok(/tap/i.test(t.hint) && !/Space|E:/.test(t.hint), `${w} hooked hint is touch wording: "${t.hint}"`);
        await ev(fire); await sleep(500); const u = await S();
        ok(u.wn !== "hooked", `${w} second tap unhooks (${u.wn})`);
      } else {
        ok(s.use === null || s.use !== "HOOK", `${w} beyond line: no HOOK promised (use=${s.use} tc=${s.tc})`);
      }
    }
  }
  // reel then reload mid-reel
  await ev(`GS.own.parts.winch = "elec"; restat(); (() => { const a = ${JSON.stringify(found)}; P.x = a.x + 12; P.z = a.z; FOOT.x = a.x + 1.2; FOOT.z = a.z; WN.state = "out"; true; })()`); await sleep(500);
  await ev(fire); await sleep(400);
  const h = await S(); ok(h.wn === "hooked", "hooked before reload");
  await shot("x2_winchtouch_hooked");
  await reload(); await sleep(1500); await ev(`tutSkip(); true`); await sleep(500);
  const r = await S(); console.log("after reload", JSON.stringify(r));
  ok(r.wn !== "hooked", "reload: no stale hook (" + r.wn + ")");
}
console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);

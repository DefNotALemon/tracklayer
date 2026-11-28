// 2.2 beta break: a three-machine fleet (sled + pickup + tractor) with distinct fuel/cond/parcels, swaps, reload while seated in each, reload on foot, old save with no vehicles state.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const fleet = () => J(`TLX.state("vehicles").owned.map(r => ({ id: r.id, uid: r.uid, fuel: +(+r.fuel).toFixed(1), cond: r.cond, load: (r.load || []).length, x: +r.x.toFixed(0), z: +r.z.toFixed(0) }))`);
const cur = () => J(`({ cur: TLX.state("vehicles").cur, id: VEH.cur ? TLXV.rt().def.id : "sled", foot: FOOT.on, fuel: +GS.fuel.toFixed(1), load: (GS.load || []).length, px: +P.x.toFixed(0), pz: +P.z.toFixed(0), ok: Number.isFinite(P.x) && Number.isFinite(P.y) && Number.isFinite(GS.fuel) })`);
await boot(); await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.hour = 22; WX.at = () => 0; GS.storm = 0; GS.cash = 80000; GS.lic.freight = true; true`);
await ev(`TLXV.buy("pickup"); TLXV.buy("tractor"); true`); await sleep(700);
let f = await fleet(); console.log("fleet", JSON.stringify(f));
ok(f.length === 2, "two vehicles owned");
const pk = f.find(r => r.id === "pickup"), tr = f.find(r => r.id === "tractor");
// distinct state per machine
await ev(`(() => { const o = TLX.state("vehicles").owned; o.find(r => r.id === "pickup").fuel = 33; o.find(r => r.id === "pickup").cond = 0.8; o.find(r => r.id === "tractor").fuel = 111; o.find(r => r.id === "tractor").cond = 0.55; GS.fuel = 7.5; return 1; })()`);
for (const uid of [pk.uid, tr.uid]) { await ev(`TLXV.swapTo("${uid}"); true`); await sleep(500); }
f = await fleet(); console.log("after swaps", JSON.stringify(f), JSON.stringify(await cur()));
const tp = f.find(r => r.id === "pickup"), tt = f.find(r => r.id === "tractor");
ok(tp.fuel === 33 && tp.cond === 0.8, "pickup record kept fuel 33 / cond 0.8: " + tp.fuel + "/" + tp.cond);
ok(tt.fuel === 111 || (await cur()).fuel === 111, "tractor fuel 111 survives");
// reload seated in tractor
const save = async lbl => { await sleep(300); };
await reload(); await sleep(1500);
let c = await cur(); f = await fleet(); console.log("reload1", JSON.stringify(c), JSON.stringify(f));
ok(c.ok && f.length === 2, "reload while seated in tractor: fleet intact, finite");
ok(c.id === "tractor" && !c.foot, "returns to the tractor seat (" + c.id + " foot " + c.foot + ")");
ok(Math.abs(c.fuel - 111) < 3, "tractor fuel after reload " + c.fuel);
const pf = f.find(r => r.id === "pickup"); ok(pf.fuel === 33, "pickup parked fuel after reload " + pf.fuel);
// get out, walk away, reload on foot
await ev(`(() => { dismount(); return 1; })()`); await sleep(4000);
c = await cur(); console.log("dismounted", JSON.stringify(c));
await reload(); await sleep(1500);
c = await cur(); f = await fleet(); console.log("reload2", JSON.stringify(c), JSON.stringify(f));
ok(c.ok, "reload on foot finite");
ok(f.length === 2 && f.every(r => Number.isFinite(r.x) && Number.isFinite(r.z)), "fleet positions finite");
// swap to sled (nearest-to-foot logic): teleport the walker next to the parked pickup
await ev(`(() => { const r = TLX.state("vehicles").owned.find(r => r.id === "pickup"); FOOT.on = true; FOOT.x = r.x + 3; FOOT.z = r.z; FOOT.y = surf(FOOT.x, FOOT.z); recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(1200);
c = await cur(); console.log("near pickup", JSON.stringify(c));
ok(c.cur === pk.uid || c.id === "pickup", "walker beside pickup makes it P (" + c.id + ")");
// damaged/old records: plant the save with fields stripped from the owned records
await ev(`save && save(); true`);
const raw0 = await ev(`localStorage.getItem("tracklayer.save.v2")`);
const sv = JSON.parse(raw0); const o = sv.x && sv.x.sys && sv.x.sys.vehicles && sv.x.sys.vehicles.owned;
console.log("planted owned", o && o.length);
if (o) { for (const r of o) { delete r.cond; delete r.load; delete r.fuel; } sv.x.sys.vehicles.cur = "nonexistent"; }
await reload(sv); await sleep(1500);
c = await cur(); f = await fleet(); console.log("stripped", JSON.stringify(c), JSON.stringify(f));
ok(c.ok, "stripped records + dangling cur: loads finite");
// vehicles state gone entirely (a pre-2.2 save)
if (sv.x && sv.x.sys) delete sv.x.sys.vehicles;
await reload(sv); await sleep(1500);
c = await cur(); console.log("pre-2.2", JSON.stringify(c));
ok(c.ok && c.id === "sled", "pre-2.2 save: sled, finite");
await done(fails ? 1 : 0);

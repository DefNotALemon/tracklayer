// RD1b look: junction close-ups and edge views of the road kit, winter noon by default (ENV: TOD=hour, DATE=m for month)
//   tools/playtest/run.sh <this> <outdir>      ONLY='regex' limits the shots
import { boot, ev, shot, sleep, done } from "/Users/lemon/Documents/GitHub/tracklayer-streets/tools/playtest/lib.mjs";
const only = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
const TOD = +(process.env.TOD || 12), MON = +(process.env.MON || 2);
await boot();
await ev("tutSkip(); crashCancel(); FOOT.on = false; VEH.cur = null; WX.at = () => 0; GS.storm = 0; QG.on = false; QG.apply && QG.apply(0); renderer.setPixelRatio(1.5); true");
await sleep(800);
await ev(`(() => { if (!window.__camHk) { window.__camHk = 1; const rr = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv && s === scene) window.camOv(c); rr(s, c); }; } return true; })()`);
await ev(`(() => { const D = Math.round((Date.UTC(2027, ${MON}, 1) - CAL_EPOCH) / 864e5); const k = Math.floor(GS.hour / 24); GS.hour = k * 24 + ${TOD}; CAL.off = (D - k) * 24; CAL.dc = null; CAL.lastDay = CAL.dayIndex(); meltBoot(); if (TLX.seasons) TLX.seasons.dress(TLX.seasons.look()); return true; })()`);
await sleep(2500);
const nodes = JSON.parse(await ev(`JSON.stringify(TLXRK.nodes.filter(n => !n.dead && !n.bad && n.pc).map(n => ({ x: n.x, z: n.z, arms: n.arms.length, id: n.arms[0].road.id })))`));
console.log("nodes", nodes.length);
const stand = async (x, z) => { await ev(`(() => { crashCancel(); FOOT.on = false; VEH.cur = null; P.x = ${x}; P.z = ${z}; P.y = surf(${x}, ${z}); P.vx = P.vz = 0; window.camOv = null; camMode = 0; camState.init = false; return true; })()`); await sleep(900); await ev("TLXRK.fillAll(); true"); await sleep(700); await ev("TLXRK.fillAll(); true"); };
const cam = (x, z, ex, ez, up, ly = 0) => ev(`window.camOv = c => { const px = ${x + ex}, pz = ${z + ez}; c.position.set(px, surf(px, pz) + ${up}, pz); c.lookAt(${x}, surf(${x}, ${z}) + ${ly}, ${z}); }; true`);
const views = JSON.parse(process.env.VIEWS || "null") || [
  // name, node picker (arms count, index), eye (ex, ez, up)
  ["x4_over", { arms: 4, k: 0 }, [0.01, 22, 26]], ["x4_obl", { arms: 4, k: 0 }, [-17, 17, 7]], ["x4_low", { arms: 4, k: 0 }, [-9, 9, 2.2]],
  ["t3_over", { arms: 3, k: 0 }, [0.01, 22, 26]], ["t3_obl", { arms: 3, k: 0 }, [-17, 17, 7]], ["t3_low", { arms: 3, k: 1 }, [-9, 9, 2.2]],
  ["x4b_over", { arms: 4, k: 2 }, [0.01, 22, 26]],
];
for (const [name, pick, eye] of views) {
  if (only && !only.test(name)) continue;
  const cand = nodes.filter(n => n.arms === pick.arms); const n = cand[Math.min(pick.k, cand.length - 1)]; if (!n) { console.log("no node for", name); continue; }
  await stand(n.x, n.z + 14); await cam(n.x, n.z, eye[0], eye[1], eye[2]); await sleep(900); await shot(name); console.log(name, Math.round(n.x), Math.round(n.z), n.id);
}
await ev("window.camOv = null; true");
await done();

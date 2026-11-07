// interiors: in every room, the way-out ring and the spawn point must be clear of furniture colliders (else you can't leave)
import { boot, ev, done } from "../lib.mjs";
await boot();
console.log((await ev(`(() => { intMats(); const out = [];
  GS.re = GS.re || { own: {}, arrears: 0, last: [] };
  for (const cab of [...RE_CABINS, { id: "sauna", name: "sauna" }]) {
    if (cab.x === undefined && cab.id !== "sauna") continue;
    const R = intBuildRoom(cab), lim = 0.34, hits = [];
    const pts = { exit: [R.exit.x, R.exit.z], spawn: [R.exit.x, R.exit.z + 0.95], mid: [R.exit.x, R.exit.z + 0.47] };
    for (const k in pts) { const [x, z] = pts[k];
      for (const c of R.cols) if (x > c.x0 - lim && x < c.x1 + lim && z > c.z0 - lim && z < c.z1 + lim) hits.push(k + ":" + [c.x0, c.x1, c.z0, c.z1].map(v => v.toFixed(2)).join(","));
      if (Math.abs(x) > R.hx - lim || Math.abs(z) > R.hz - lim) hits.push(k + ":wall"); }
    out.push(cab.id + " exit=" + R.exit.x.toFixed(2) + "," + R.exit.z.toFixed(2) + " " + (hits.length ? "BLOCKED " + hits.join(" | ") : "clear"));
    INT.scene.remove(R.g);
  }
  return out.join(" ## "); })()`)).split(" ## ").join("\n"));
await done();

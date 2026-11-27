// Writes the SteamPipe build scripts for Tracklayer.
//   node steam/steampipe/make.mjs <AppID> [winDepotID] [macDepotID]
// Depot ids default to AppID+1 (Windows) and AppID+2 (macOS): check them on the app's SteamPipe > Depots page.
// Out: steam/dist/steampipe/app_local.vdf   (content goes to the local content server, nothing uploaded)
//      steam/dist/steampipe/app_upload.vdf  (content uploaded to Steam, not set live on any branch)
// Run one with:  <sdk>/tools/ContentBuilder/builder_osx/steamcmd.sh +login <build account> +run_app_build <file> +quit
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(here, "..", "dist");
const app = Number(process.argv[2]);
if (!Number.isInteger(app) || app <= 0) {
  console.error("usage: node steam/steampipe/make.mjs <AppID> [winDepotID] [macDepotID]");
  process.exit(1);
}
const win = Number(process.argv[3]) || app + 1;
const mac = Number(process.argv[4]) || app + 2;
const htdocs = process.env.TL_LCS_HTDOCS || path.join(process.env.HOME, "Downloads/sdk/tools/ContentServer/htdocs");

const builds = [
  { id: win, dir: path.join(dist, "win-unpacked"), need: "Tracklayer.exe", make: "npm run dist:win" },
  { id: mac, dir: path.join(dist, "mac-arm64"), need: "Tracklayer.app", make: "npm run dist:mac" },
].filter(b => {
  const ok = fs.existsSync(path.join(b.dir, b.need));
  if (!ok) console.warn(`skipping depot ${b.id}: ${b.need} not built (${b.make})`);
  return ok;
});
if (!builds.length) { console.error("nothing built: run npm run dist:win and/or dist:mac in steam/ first"); process.exit(1); }

const q = s => `"${String(s).replace(/\\/g, "\\\\")}"`;
const depot = b => `\t\t${q(b.id)}\n\t\t{\n\t\t\t"ContentRoot" ${q(b.dir)}\n\t\t\t"FileMapping"\n\t\t\t{\n` +
  `\t\t\t\t"LocalPath" "*"\n\t\t\t\t"DepotPath" "."\n\t\t\t\t"recursive" "1"\n\t\t\t}\n\t\t}\n`;
const script = (desc, extra) => `"AppBuild"\n{\n\t"AppID" ${q(app)}\n\t"Desc" ${q(desc)}\n${extra}` +
  `\t"ContentRoot" ${q(dist)}\n\t"BuildOutput" ${q(path.join(dist, "steampipe", "output"))}\n\t"Depots"\n\t{\n` +
  builds.map(depot).join("") + `\t}\n}\n`;

const out = path.join(dist, "steampipe");
fs.mkdirSync(path.join(out, "output"), { recursive: true });
const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
fs.writeFileSync(path.join(out, "app_local.vdf"), script(`Tracklayer local ${stamp}`, `\t"Local" ${q(htdocs)}\n`));
fs.writeFileSync(path.join(out, "app_upload.vdf"), script(`Tracklayer ${stamp}`, ""));
console.log(`wrote ${out}/app_local.vdf and app_upload.vdf for app ${app}, depots ${builds.map(b => b.id).join(", ")}`);

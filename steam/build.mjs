// Stage steam/app/ from the repo root: the game exactly as the website serves it, but offline.
//   node build.mjs [outDir]
// Copies index.html, every top-level .js, icons, manifest and steam/vendor/. Rewrites the three.js CDN tag to
// vendor/three.min.js and the Google Fonts <link> lines to one link to vendor/fonts.css. The repo's own index.html
// is never touched. Exits 1 (with a message) if the staged index.html still loads anything over http(s) or names a
// local file that is not staged. Never adds the test hook: that is main.js's job when TL_TEST=1.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(process.env.TL_BUILD_REPO || path.join(here, ".."));   // TL_BUILD_REPO: used by the test to feed a bad page
const out = path.resolve(process.argv[2] || path.join(here, "app"));
const THREE_TAG = /<script\s+src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/three\.js\/r128\/three\.min\.js"><\/script>/;
const FONT_LINE = /^[ \t]*<link\b[^>]*\bhref="https:\/\/fonts\.(googleapis|gstatic)\.com[^"]*"[^>]*>[ \t]*\r?\n?/gm;
const fails = [];
const fail = m => fails.push(m);

export function rewriteIndex(html) {
  if (!THREE_TAG.test(html)) fail("index.html: the three.js r128 CDN <script> tag was not found (changed?): update THREE_TAG in build.mjs");
  html = html.replace(THREE_TAG, '<script src="vendor/three.min.js"></script>');
  let n = 0;
  html = html.replace(FONT_LINE, () => (n++ === 0 ? '<link rel="stylesheet" href="vendor/fonts.css">\n' : ""));
  if (n === 0) fail("index.html: no Google Fonts <link> lines found (changed?): update FONT_LINE in build.mjs");
  return html;
}

// every src= / href= the page would load; <a href> is navigation, not a load
export function externalRefs(html) {
  const bad = [];
  for (const m of html.matchAll(/<(script|link|img|iframe|source|audio|video|embed|object|track|input)\b[^>]*>/gi)) {
    for (const a of m[0].matchAll(/\b(src|href|data|poster)\s*=\s*("([^"]*)"|'([^']*)')/gi)) {
      const v = (a[3] ?? a[4] ?? "").trim();
      if (/^(https?:)?\/\//i.test(v)) bad.push(`${m[1]} ${a[1]}="${v}"`);
    }
  }
  return bad;
}
export function localRefs(html) {
  const refs = [];
  for (const m of html.matchAll(/<(script|link|img|source|audio|video)\b[^>]*>/gi)) {
    for (const a of m[0].matchAll(/\b(src|href)\s*=\s*"([^"]*)"/gi)) {
      const v = a[2].trim();
      if (!v || /^(#|data:|blob:|javascript:|mailto:|(https?:)?\/\/)/i.test(v)) continue;
      refs.push(v.replace(/[?#].*$/, ""));
    }
  }
  return refs;
}

function main() {
  if (!fs.existsSync(path.join(here, "vendor", "three.min.js")) || !fs.existsSync(path.join(here, "vendor", "fonts.css"))) {
    console.error("build: steam/vendor/three.min.js or fonts.css is missing"); process.exit(1);
  }
  if (out === repo || out === here || out === path.parse(out).root || out === path.dirname(repo)) { console.error("build: refusing to wipe " + out); process.exit(1); }
  fs.rmSync(out, { recursive: true, force: true });       // generated folder only
  fs.mkdirSync(out, { recursive: true });
  const tops = fs.readdirSync(repo).filter(f => f.endsWith(".js"));
  for (const f of tops) fs.copyFileSync(path.join(repo, f), path.join(out, f));
  for (const f of ["manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"]) {
    if (fs.existsSync(path.join(repo, f))) fs.copyFileSync(path.join(repo, f), path.join(out, f)); else fail("missing in repo root: " + f);
  }
  fs.cpSync(path.join(here, "vendor"), path.join(out, "vendor"), {
    recursive: true,
    filter: s => !/\.(py|txt)$/.test(s) || /(LICENSE|OFL)[^/]*\.txt$/.test(s),   // keep the licence texts, drop the helper script
  });
  const html = rewriteIndex(fs.readFileSync(path.join(repo, "index.html"), "utf8"));
  fs.writeFileSync(path.join(out, "index.html"), html);

  for (const b of externalRefs(html)) fail("staged index.html still loads over the network: " + b);
  for (const r of localRefs(html)) if (!fs.existsSync(path.join(out, r))) fail(`staged index.html names ${r} but it is not staged`);
  // the fonts css must only point at staged files
  const css = fs.readFileSync(path.join(out, "vendor", "fonts.css"), "utf8");
  for (const m of css.matchAll(/url\(([^)]+)\)/g)) {
    const u = m[1].replace(/['"]/g, "");
    if (/^(https?:)?\/\//.test(u)) fail("fonts.css loads over the network: " + u);
    else if (!fs.existsSync(path.join(out, "vendor", u))) fail("fonts.css names " + u + " but it is not staged");
  }
  if (fs.existsSync(path.join(out, "tracklayer.js")) && /window\.__tl\s*=/.test(fs.readFileSync(path.join(out, "tracklayer.js"), "utf8"))) fail("tracklayer.js carries the test hook window.__tl");

  if (fails.length) {
    console.error("build FAILED:\n  - " + fails.join("\n  - "));
    process.exit(1);
  }
  const bytes = fs.readdirSync(out, { recursive: true }).reduce((n, f) => { const p = path.join(out, f); return n + (fs.statSync(p).isFile() ? fs.statSync(p).size : 0); }, 0);
  console.log(`staged ${tops.length} scripts + index.html into ${out} (${(bytes / 1048576).toFixed(1)} MB)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

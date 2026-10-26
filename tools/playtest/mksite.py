#!/usr/bin/env python3
"""Build a Tracklayer test copy with the window.__tl eval hook.

Usage: mksite.py <source checkout or worktree> <site dir>
Copies index.html, icefish.js and vendor/ (if present) into <site dir> (created if missing,
never deleted) and writes tracklayer.js with `window.__tl = e => eval(e);` inserted before the
final `})();` so a CDP driver can reach the IIFE's internals. Serve it with
`python3 -m http.server <port>` from <site dir>.
"""
import os, shutil, sys

src, dst = (os.path.expanduser(a) for a in sys.argv[1:3])
os.makedirs(dst, exist_ok=True)
for f in ("index.html", "icefish.js"):
    shutil.copy(os.path.join(src, f), dst)
if os.path.isdir(os.path.join(src, "vendor")):
    shutil.copytree(os.path.join(src, "vendor"), os.path.join(dst, "vendor"), dirs_exist_ok=True)
s = open(os.path.join(src, "tracklayer.js")).read()
i = s.rstrip().rfind("})();")
if i < 0:
    sys.exit("no closing })(); in tracklayer.js")
open(os.path.join(dst, "tracklayer.js"), "w").write(s[:i] + "window.__tl = e => eval(e);\n" + s[i:])
print(dst)

#!/usr/bin/env python3
"""One-off: turn the downloaded Google Fonts css (gf.css) into local woff2 files + fonts.css. Kept for provenance."""
import os, re, urllib.request
here = os.path.dirname(os.path.abspath(__file__))
css = open(os.path.join(here, "gf.css")).read()
os.makedirs(os.path.join(here, "fonts"), exist_ok=True)
def fix(m):
    url = m.group(1)
    name = re.sub(r"[^A-Za-z0-9._-]", "_", url.split("/s/")[1])
    path = os.path.join(here, "fonts", name)
    if not os.path.exists(path):
        urllib.request.urlretrieve(url, path)
    return "url(fonts/%s)" % name
out = re.sub(r"url\((https://fonts\.gstatic\.com/[^)]+)\)", fix, css)
open(os.path.join(here, "fonts.css"), "w").write(out)
print(len(os.listdir(os.path.join(here, "fonts"))), "font files")

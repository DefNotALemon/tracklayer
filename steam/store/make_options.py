#!/usr/bin/env python3
"""Builds steam/store/options.html (mock Steam pages to compare; plain HTML and CSS, no script, so it shows in any viewer) and options.md (the text to paste) from OPTIONS below.
   python3 steam/store/make_options.py      Stills come from steam/store/src/ (untouched game frames, 1920x1080)."""
import base64, io, json, os, re
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src")
VENDOR = os.path.join(HERE, "..", "vendor")

OPTIONS = [
  dict(id="A", name="The snow remembers", angle="The snow is the game",
    who="Sim and physics players: SnowRunner, Lonely Mountains, anyone who stops to watch a tech clip.",
    cap="night_a50_h23_y270_lowside", capx=50, capy=88, logo="track", pos="tl", sub="",
    shots=["noon_side_l", "night_a50_h23_y180_rearleft", "noon_high_rear", "storm_rear"],
    short="A snowmobile courier game where every track you cut stays in the snow. Pack your own trails across Norway's far north, keep them open against the weather, and haul freight where no road goes.",
    about=["Every metre of snow in Tracklayer is real: a height field you press down, carve into berms and crater on a hard landing. Fresh powder drags on the sled and drinks fuel. Snow you have already packed is fast and cheap to ride.",
           "So the routes you keep open are the strategy. Calm weather fills a trail back in slowly. A storm takes it in under a minute."],
    bullets=["Deformable snow at 25 cm resolution, across eight kilometres of plateau, frozen lakes and birch valleys",
             "Your trails persist: ride them again faster, or lose them to the next snowfall",
             "Freight, rescue, aurora tours and plowing work, each with its own load and its own risk",
             "Sleds, engines and bolt-on parts that change how the machine sits in the snow",
             "Keyboard, any gamepad or touch, with prompts that match what you are holding"],
    tags=["Simulation", "Physics", "Driving", "Open World", "Snow"],
    strong="The one thing no other game on the store has. Easy to show in a ten-second clip.",
    weak="Sells a mechanic, not a fantasy. Needs a trailer that shows a trail being cut and ridden again."),
  dict(id="B", name="Last courier north", angle="A working life on a sled",
    who="Job-sim players: SnowRunner, Euro Truck Simulator, Death Stranding's delivery crowd.",
    cap="night_a50_h23_y270_lowrear", capx=50, capy=80, logo="stamp", pos="", sub="Arctic courier",
    shots=["noon_rear_trail", "night_a50_h23_y0_lowfront", "noon_town_over", "noon_fp_hud"],
    short="Run freight off the coastal ferry and out across the Nordkinn plateau by snowmobile. Start with one small sled and a parcel. Work up to trucks, trailers, plow contracts and drivers of your own.",
    about=["The ferry lands the freight at Kjøllefjord quay. Getting it to the villages, the herders' cabins, the wind farm and the lighthouse is your job, across snow that no road crosses.",
           "Pay buys a better sled, then a pickup, then a lorry. The harder the country you can cross, the better the work you are offered."],
    bullets=["Deliveries, heavy haulage, search and rescue, aurora tours and armed courier runs",
             "A garage of sleds, engines and parts, plus a used market for the ones you can't afford new",
             "Pickups, a sled trailer, a lorry with semitrailers and a plow truck with a gritter",
             "Road contracts from the kommune, and staff who drive your trucks while you ride",
             "Fuel, cold, hunger and weather decide which jobs are worth taking today"],
    tags=["Simulation", "Driving", "Open World", "Automobile Sim", "Singleplayer"],
    strong="A proven audience that buys exactly this kind of game, and it describes most of what is already built.",
    weak="Invites comparison with SnowRunner's graphics. The page has to lead with the snow, not the trucks."),
  dict(id="F", name="From one sled to a company", angle="Build a winter haulage business",
    who="Tycoon and management players who want to drive the trucks themselves.",
    cap="night_town_street_up", capx=50, capy=70, logo="stamp", pos="tl", sub="Nordkinn Transport",
    shots=["noon_town_over", "night_town_house0_up", "noon_rear_trail", "noon_street"],
    short="Start as a courier with one snowmobile. End up running the trucks, the plow contracts and the drivers that keep a peninsula in the Arctic supplied through winter. Every job can be done by you or by your staff.",
    about=["The roads need opening after every storm. The villages need freight. Households need their driveways cut without the snow ending up against the neighbour's door.",
           "Sign for the work, buy the machines, hire the drivers. When one of them bogs a truck in a drift at night, go and tow them out yourself."],
    bullets=["Road, driveway and car-park plowing contracts with real snow to move and somewhere to put it",
             "Staff who drive your trucks on the actual roads, get stuck, and can be hailed or rescued",
             "A fleet: sleds, pickups, a lorry, semitrailers, a plow truck, boats",
             "Licences, upkeep, fuel and wear to pay for",
             "Flats, landlords and property in town"],
    tags=["Simulation", "Management", "Driving", "Open World", "Economy"],
    strong="Describes the deepest systems in the game (plowing and staff) honestly.",
    weak="The business side has no balance pass yet, and tycoon players punish a loose economy."),
]

def font(weight, fam="Barlow Semi Condensed", italic=False):
    css = open(os.path.join(VENDOR, "fonts.css")).read()
    for blk in re.findall(r"@font-face\s*{(.*?)}", css, re.S):
        if fam in blk and f"font-weight: {weight}" in blk and ("italic" in blk) == italic and "U+0000-00FF" in blk:
            f = re.search(r"url\((.*?)\)", blk).group(1)
            return base64.b64encode(open(os.path.join(VENDOR, f), "rb").read()).decode()
    raise SystemExit(f"font {fam} {weight} not found")

def img(name, w, h, fx=50, fy=50, q=80):
    im = Image.open(os.path.join(SRC, name + ".jpg")).convert("RGB")
    W, H = im.size; r = w / h
    cw, ch = (W, int(W / r)) if W / H < r else (int(H * r), H)
    x = int((W - cw) * fx / 100); y = int((H - ch) * fy / 100)
    im = im.crop((x, y, x + cw, y + ch)).resize((w, h), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, "JPEG", quality=q); return "data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode()

from html import escape as E
stills = sorted({o["cap"] for o in OPTIONS} | {s for o in OPTIONS for s in o["shots"]})
imgcss = "\n".join(f".i-{s}{{background-image:url({img(s, 720, 405, q=70)})}}" for s in stills)
ids = [o["id"] for o in OPTIONS]
tabcss = ",".join(f"#r{i}:checked~.tabs label[for=r{i}]" for i in ids) + \
    "{border-color:var(--accent,#6cf);background:color-mix(in srgb,var(--accent,#6cf) 14%,transparent)}\n" + \
    ",".join(f"#r{i}:checked~.pages .p{i}" for i in ids) + "{display:block}"
def cap(o, extra=""):
    sub = f"<small>{E(o['sub'])}</small>" if o["sub"] else ""
    logo = (sub + "Tracklayer") if o["logo"] == "thin" else ("Tracklayer" + sub)
    return (f'<div class="cap l-{o["logo"]}{" at-" + o["pos"] if o["pos"] else ""}{extra}"><div class="im i-{o["cap"]}" style="background-position:{o["capx"]}% {o["capy"]}%"></div>'
            f'<div class="scrim"></div><div class="logo">{logo}</div></div>')
def page(o):
    assert len(o["short"]) <= 300, (o["id"], len(o["short"]))
    return f"""<div class="page p{o['id']}">
<div class="steam"><h2>Tracklayer</h2><div class="top">
<div><div class="main im i-{o['shots'][0]}"></div><div class="thumbs">{''.join(f'<div class="im i-{s}"></div>' for s in o['shots'][1:])}</div></div>
<div>{cap(o)}<p class="short">{E(o['short'])}</p>
<div class="meta">Popular user-defined tags for this product</div><div class="tags">{''.join(f'<span>{E(t)}</span>' for t in o['tags'])}</div>
<div class="meta">The capsule at the sizes Steam shrinks it to</div><div class="small">{cap(o)}{cap(o, ' s2')}</div></div></div>
<div class="about"><h3>About this game</h3>{''.join(f'<p>{E(p)}</p>' for p in o['about'])}<ul>{''.join(f'<li>{E(b)}</li>' for b in o['bullets'])}</ul></div></div>
<div class="notes"><div><h4>Who it is for</h4><p>{E(o['who'])}</p></div><div><h4>For it</h4><p>{E(o['strong'])}</p></div><div><h4>Against it</h4><p>{E(o['weak'])}</p></div></div>
<button class="pick" data-hermes-send="Go with Steam store page option {o['id']} ({E(o['name'])}) for Tracklayer.">Go with {o['id']}: {E(o['name'])}</button>
</div>"""
body = "".join(f'<input class="rd" type="radio" name="opt" id="r{i}"{" checked" if k == 0 else ""}>' for k, i in enumerate(ids)) + \
    '\n<div class="tabs">' + "".join(f'<label for="r{o["id"]}"><b>{o["id"]}</b>{E(o["name"])}</label>' for o in OPTIONS) + '</div>\n<div class="pages">\n' + \
    "\n".join(page(o) for o in OPTIONS) + "\n</div>"

html = open(os.path.join(HERE, "options.tmpl.html")).read()
html = html.replace("/*FONT800*/", font(800)).replace("/*FONT600*/", font(600)).replace("/*FONT400*/", font(400))
html = html.replace("/*CAVEAT*/", font(600, "Caveat")).replace("/*TABCSS*/", tabcss).replace("/*IMGCSS*/", imgcss).replace("<!--BODY-->", body)
assert "<script" not in html
open(os.path.join(HERE, "options.html"), "w").write(html)

md = ["# Tracklayer: store page options", "",
      "Lemon's shortlist of 27 Nov: A, B and F (C winter town, D survival and E 71 North dropped), each now with a night capsule teasing the aurora.",
      "Pick one (or a mix); the final assets (S3) are made for the pick.",
      "Every line below describes something that is in the game today. Open `options.html` to see them as pages.", ""]
for o in OPTIONS:
    md += [f"## {o['id']}. {o['name']}", f"*{o['angle']}.* For: {o['who']}", "",
           f"**Short description** ({len(o['short'])}/300): {o['short']}", "", "**About this game**", ""] + \
          [p + "\n" for p in o["about"]] + [f"- {b}" for b in o["bullets"]] + \
          ["", "**Tags to lead with:** " + ", ".join(o["tags"]), f"**For it:** {o['strong']}", f"**Against it:** {o['weak']}", ""]
open(os.path.join(HERE, "options.md"), "w").write("\n".join(md))
print("wrote options.html", round(len(html) / 1e6, 2), "MB, options.md,", len(OPTIONS), "options")

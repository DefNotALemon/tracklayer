#!/usr/bin/env python3
"""Builds steam/store/options.html (mock Steam pages to compare) and options.md (the text to paste) from OPTIONS below.
   python3 steam/store/make_options.py      Stills come from steam/store/src/ (untouched game frames, 1920x1080)."""
import base64, io, json, os, re
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src")
VENDOR = os.path.join(HERE, "..", "vendor")

OPTIONS = [
  dict(id="A", name="The snow remembers", angle="The snow is the game",
    who="Sim and physics players: SnowRunner, Lonely Mountains, anyone who stops to watch a tech clip.",
    cap="noon_rear_trail", capx=50, capy=62, logo="track", sub="",
    shots=["noon_side_l", "noon_high_rear", "storm_rear", "noon_fp_hud"],
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
    cap="noon_side_l", capx=46, capy=55, logo="stamp", sub="Arctic courier",
    shots=["noon_rear_trail", "noon_town_over", "noon_fp_hud", "storm_front"],
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
  dict(id="C", name="A winter town that knows you", angle="Life in a small Arctic town",
    who="Cosy and life-sim players: Stardew Valley, Lake, A Short Hike.",
    cap="n_house0", capx=50, capy=48, logo="hand", sub="A life in Finnmark",
    shots=["n_street", "n_house3", "noon_street", "n_town_over"],
    short="Move to a fishing village at the top of Norway and make a life there. Deliver the post by snowmobile, fish through the ice, rent a flat, and get to know the families behind every lit window.",
    about=["Kjøllefjord is a real place, and in Tracklayer every house in it holds a family: named people with trades, routines and opinions, who ski the trails, post on the local feed and ring in to Radio Nordkinn.",
           "The work is delivering what the ferry brings. The rest is yours: ice fishing, cross-country skiing, a boat for summer, a flat with a landlord who may or may not fix the heating."],
    bullets=["Households in every village, each with its own surnames, trades and habits",
             "Gram, a local feed the town fills with pictures of what really happened that day",
             "Six radio stations, call-ins included",
             "Ice fishing, sea fishing, cross-country ski trails and a boat of your own",
             "Polar night, the midnight sun and four seasons that change what the country lets you do"],
    tags=["Life Sim", "Relaxing", "Open World", "Exploration", "Atmospheric"],
    strong="The biggest audience of the six, and the direction you are building toward.",
    weak="Promises warmth the game only partly has yet: no romance or family yet. Risky before those land."),
  dict(id="D", name="Out in the polar night", angle="Survive the fell",
    who="Survival players: The Long Dark above all.",
    cap="n_aurora_side_l", capx=50, capy=45, logo="wide", sub="",
    shots=["n_aurora_rear_trail", "storm_rear", "n_aurora_side_l", "noon_fp_hud"],
    short="Two months without a sunrise, a sled, and a tank of fuel. Cross the Arctic plateau with a load on the back while the cold, the storms and the snow itself try to stop you. Nobody is coming unless you call.",
    about=["A new game starts in polar night. Out on the fell the wind fills your trail behind you, the visor frosts over and the fuel needle is the only clock that matters.",
           "Go through the ice, bog the sled in powder or come off at speed and you will be on foot, bleeding, a long way from a light."],
    bullets=["Warmth, hunger, fuel and wounds to manage, with clothing layers that matter",
             "Storms that bury a packed trail in under a minute",
             "Crashes with a body that tumbles, gets hurt and has to walk back",
             "A winch, a tether and a rescue sled for when it goes wrong",
             "Reindeer, moose, foxes and the occasional bear that is not pleased to see you"],
    tags=["Survival", "Open World Survival Craft", "Atmospheric", "Simulation", "Difficult"],
    strong="Strong mood, and the night and storm frames already look the part.",
    weak="Survival fans expect crafting, shelter and permadeath. The game is gentler than this page suggests."),
  dict(id="E", name="71° North", angle="A real place, under the aurora",
    who="Exploration and photo-mode players: Firewatch, Alto, people who buy a game for where it takes them.",
    cap="n_street", capx=50, capy=40, logo="thin", sub="71° North",
    shots=["n_house0", "n_aurora_side_l", "noon_vista", "n_town_over"],
    short="The Nordkinn peninsula, mainland Europe's northern edge, rebuilt for you to cross by snowmobile. Fjords that never freeze, a lighthouse at the end of the land, and the northern lights overhead.",
    about=["Kjøllefjord, Mehamn, Gamvik, the lighthouse at Slettnes: the villages are where they are on the map, and the plateau between them is as empty as the real one.",
           "There is work if you want it. There is also a camera, a long night and nobody asking you to hurry."],
    bullets=["A real stretch of Finnmark with its villages, fjords, wind farm and lighthouse",
             "Aurora that comes and goes by the night, and tourists who pay to be taken under it",
             "A calendar with polar night, midnight sun and weather fronts you can read on a radar",
             "A camera for your own pictures, and first-person riding with a working dash tablet",
             "Ride, ski, walk or take a boat"],
    tags=["Exploration", "Atmospheric", "Open World", "Relaxing", "Simulation"],
    strong="Suits the aurora frames, which are the best-looking pictures the game makes today.",
    weak="Sells on looks, and looks are where the game is weakest in daylight. Leans on the realism work landing first."),
  dict(id="F", name="From one sled to a company", angle="Build a winter haulage business",
    who="Tycoon and management players who want to drive the trucks themselves.",
    cap="noon_town_over", capx=50, capy=50, logo="stamp", sub="Nordkinn Transport",
    shots=["noon_side_l", "noon_rear_trail", "noon_street", "storm_front"],
    short="Start as a courier with one snowmobile. End up running the trucks, the plow contracts and the drivers that keep a peninsula in the Arctic supplied through winter. Every job can be done by you or by your staff.",
    about=["The kommune needs its roads opened after every storm. The villages need freight. Households need their driveways cut without the snow ending up against the neighbour's door.",
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

data = []
for o in OPTIONS:
    d = {k: o[k] for k in ("id", "name", "angle", "who", "logo", "sub", "short", "about", "bullets", "tags", "strong", "weak")}
    d["cap"] = img(o["cap"], 920, 430, o["capx"], o["capy"], 84)
    d["shots"] = [img(s, 960, 540, q=78) for s in o["shots"]]
    assert len(o["short"]) <= 300, (o["id"], len(o["short"]))
    data.append(d)

html = open(os.path.join(HERE, "options.tmpl.html")).read()
html = html.replace("/*FONT800*/", font(800)).replace("/*FONT600*/", font(600)).replace("/*FONT400*/", font(400))
html = html.replace("/*CAVEAT*/", font(600, "Caveat")).replace("/*DATA*/", json.dumps(data))
open(os.path.join(HERE, "options.html"), "w").write(html)

md = ["# Tracklayer: store page options", "",
      "Six ways to pitch the same game. Pick one (or a mix); the final assets (S3) are made for the pick.",
      "Every line below describes something that is in the game today. Open `options.html` to see them as pages.", ""]
for o in OPTIONS:
    md += [f"## {o['id']}. {o['name']}", f"*{o['angle']}.* For: {o['who']}", "",
           f"**Short description** ({len(o['short'])}/300): {o['short']}", "", "**About this game**", ""] + \
          [p + "\n" for p in o["about"]] + [f"- {b}" for b in o["bullets"]] + \
          ["", "**Tags to lead with:** " + ", ".join(o["tags"]), f"**For it:** {o['strong']}", f"**Against it:** {o['weak']}", ""]
open(os.path.join(HERE, "options.md"), "w").write("\n".join(md))
print("wrote options.html", round(len(html) / 1e6, 2), "MB, options.md,", len(OPTIONS), "options")

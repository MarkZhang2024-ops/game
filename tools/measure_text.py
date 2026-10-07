import os
from PIL import Image

root = r"D:\work\learn\Cluedoku"
design = Image.open(os.path.join(root, "design", "level.png")).convert("RGBA")
px = design.load()

# Card text band
x0, y0, x1, y1 = 76, 489, 76 + 915, 489 + 450
brown = []
pink = []
for y in range(y0, y1):
    for x in range(x0, x1):
        r, g, b, a = px[x, y]
        if r > 90 and r < 180 and g < 90 and b < 70 and r > g + 40:
            brown.append((x, y))
        # hot pink glyphs
        if r > 200 and g < 120 and b > 80 and b < 190 and r > g + 80:
            pink.append((x, y))

def bounds(pts, name):
    if not pts:
        print(name, "none")
        return
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    print(name, "n", len(pts), "x", min(xs), max(xs), "y", min(ys), max(ys), "size", max(xs) - min(xs) + 1, max(ys) - min(ys) + 1)

bounds(brown, "brown")
bounds(pink, "pink")

# split brown into two rows by y gap
ys = sorted(set(p[1] for p in brown))
print("brown y span sample", ys[0], ys[-1], "unique rows", len(ys))

# row clusters
rows = []
current = [ys[0]]
for y in ys[1:]:
    if y - current[-1] > 8:
        rows.append(current)
        current = [y]
    else:
        current.append(y)
rows.append(current)
print("brown row clusters", [(c[0], c[-1]) for c in rows])

def cluster_bounds(pts, y0, y1, name):
    sel = [p for p in pts if y0 <= p[1] <= y1]
    bounds(sel, name)

if len(rows) >= 2:
    cluster_bounds(brown, rows[0][0], rows[0][-1], "number caption")
    cluster_bounds(brown, rows[1][0], rows[1][-1], "scene caption")

pys = sorted(set(p[1] for p in pink))
print("pink y", pys[0] if pys else None, pys[-1] if pys else None, "rows", len(pys))
prows = []
if pys:
    current = [pys[0]]
    for y in pys[1:]:
        if y - current[-1] > 8:
            prows.append(current)
            current = [y]
        else:
            current.append(y)
    prows.append(current)
    print("pink row clusters", [(c[0], c[-1]) for c in prows])
    for i, c in enumerate(prows):
        cluster_bounds(pink, c[0], c[-1], f"pink{i}")

# avatar gold ring: yellow pixels in top-left
golds = []
for y in range(0, 320):
    for x in range(0, 400):
        r, g, b, a = px[x, y]
        if r > 210 and g > 160 and b < 80 and r > b + 100:
            golds.append((x, y))
bounds(golds, "gold avatar")

# name plate peach in top area, excluding avatar
peachs = []
for y in range(40, 280):
    for x in range(120, 750):
        r, g, b, a = px[x, y]
        if r > 230 and 180 < g < 220 and 140 < b < 190 and abs(r - g) < 50:
            peachs.append((x, y))
bounds(peachs, "peach plate")

# button white text
whites = []
for y in range(1749, 2011):
    for x in range(223, 853):
        r, g, b, a = px[x, y]
        if r > 240 and g > 240 and b > 240:
            whites.append((x, y))
bounds(whites, "button white")

# avatar asset corner alpha
for rel in [
    r"assets\prefabs\cutpicture\level\图层 7.png",
    r"assets\prefabs\cutpicture\head\图层 3 拷贝.png",
    r"assets\prefabs\cutpicture\level\图层 2.png",
    r"assets\prefabs\cutpicture\head\图层 7 拷贝.png",
]:
    im = Image.open(os.path.join(root, rel)).convert("RGBA")
    w, h = im.size
    p = im.load()
    corners = [p[0, 0], p[w - 1, 0], p[0, h - 1], p[w // 2, 2], p[2, h // 2]]
    print(os.path.basename(rel), im.size, "samples", corners)

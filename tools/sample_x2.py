from PIL import Image
im = Image.open(r"D:\work\learn\Cluedoku\assets\prefabs\cutpicture\game\x.png").convert("RGBA")
w, h = im.size
px = im.load()
minx, miny, maxx, maxy = w, h, 0, 0
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a > 40:
            minx = min(minx, x)
            miny = min(miny, y)
            maxx = max(maxx, x)
            maxy = max(maxy, y)
print("opaque bounds", minx, miny, maxx, maxy, "span", maxx - minx, maxy - miny)
# sample a cross through center
print("row", h // 2, [px[x, h // 2][3] for x in range(0, w, 8)])
print("col", w // 2, [px[w // 2, y][3] for y in range(0, h, 8)])

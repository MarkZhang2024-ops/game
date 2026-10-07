from PIL import Image
im = Image.open(r"D:\work\learn\Cluedoku\assets\prefabs\cutpicture\game\x.png").convert("RGBA")
w, h = im.size
px = im.load()
print("size", w, h)
for name, x, y in (("c", w // 2, h // 2), ("tl", 8, 8), ("xarm", w // 2, 20), ("midleft", 20, h // 2)):
    print(name, px[x, y])
# count near-white opaque vs purple vs transparent
white = purple = clear = other = 0
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a < 20:
            clear += 1
        elif r > 220 and g > 220 and b > 220:
            white += 1
        elif r > 80 and b > 80 and r < 180 and b > g:
            purple += 1
        else:
            other += 1
print("white", white, "purple", purple, "clear", clear, "other", other)

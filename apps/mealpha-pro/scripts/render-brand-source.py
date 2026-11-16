#!/usr/bin/env python3
"""Render the approved MeAlpha Pro violet-and-gold brand mark for desktop/mobile icons."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "public" / "mealpha-original.png"
SIZE = 1024
SCALE = SIZE / 512

def p(points):
    # Pillow drawing primitives accept either a flat bounding box or a list of points.
    if len(points) == 4 and all(isinstance(v, (int, float)) for v in points):
        return tuple(round(v * SCALE) for v in points)
    return [(round(x * SCALE), round(y * SCALE)) for x, y in points]

image = Image.new("RGBA", (SIZE, SIZE), (8, 13, 39, 255))
glow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
gd.ellipse(p((80, 48, 450, 470)), fill=(83, 38, 190, 105))
glow = glow.filter(ImageFilter.GaussianBlur(105))
image = Image.alpha_composite(image, glow)
draw = ImageDraw.Draw(image)
draw.rounded_rectangle((24, 24, SIZE - 24, SIZE - 24), radius=224, fill=(10, 15, 43, 255), outline=(117, 83, 255, 230), width=10)

m = [(82, 363), (82, 174), (128, 157), (256, 300), (384, 157), (430, 174), (430, 363)]
for a, b in zip(m, m[1:]):
    draw.line(p((a, b)), fill=(80, 34, 178, 255), width=116)
    draw.line(p((a, b)), fill=(151, 75, 247, 255), width=94)
for x, y in m:
    r = 47
    draw.ellipse((int((x-r)*SCALE), int((y-r)*SCALE), int((x+r)*SCALE), int((y+r)*SCALE)), fill=(145, 72, 242, 255))

gold = (255, 204, 91, 255)
trajectory = [(72, 355), (154, 365), (233, 305), (311, 222), (405, 122)]
draw.line(p(trajectory), fill=(106, 52, 179, 255), width=58, joint="curve")
draw.line(p(trajectory), fill=gold, width=42, joint="curve")
draw.polygon(p([(365, 120), (432, 104), (415, 172), (400, 143)]), fill=(255, 222, 137, 255))
for x, y, h in [(278, 329, 43), (324, 302, 70), (370, 269, 103)]:
    draw.rounded_rectangle((int(x*SCALE), int(y*SCALE), int((x+32)*SCALE), int((y+h)*SCALE)), radius=14, fill=gold)
draw.line(p([(60, 420), (452, 420)]), fill=(108, 90, 255, 90), width=4)
TARGET.parent.mkdir(parents=True, exist_ok=True)
image.save(TARGET, "PNG", optimize=True)
print(f"Rendered approved MeAlpha brand source: {TARGET}")

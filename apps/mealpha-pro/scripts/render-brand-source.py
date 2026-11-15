#!/usr/bin/env python3
"""Render the MeAlpha Pro SVG brand concept to a PNG using Pillow only.

Pillow is installed by the existing Android icon workflow and has no native
Cairo dependency, so this renderer works on both Windows GitHub runners.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
target = ROOT / "public" / "mealpha-original.png"
SIZE = 1024

# Rounded-square navy canvas with a subtle violet glow.
base = Image.new("RGBA", (SIZE, SIZE), (8, 13, 39, 255))
glow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
gd.ellipse((180, 120, 900, 900), fill=(86, 35, 190, 110))
glow = glow.filter(ImageFilter.GaussianBlur(150))
base = Image.alpha_composite(base, glow)

mask = Image.new("L", (SIZE, SIZE), 0)
ImageDraw.Draw(mask).rounded_rectangle((24, 24, SIZE - 24, SIZE - 24), radius=220, fill=255)
base.putalpha(mask)
draw = ImageDraw.Draw(base)

# Subtle violet border.
draw.rounded_rectangle((25, 25, SIZE - 25, SIZE - 25), radius=218,
                       outline=(117, 83, 255, 210), width=10)

# Draw thick, rounded M strokes with a violet gradient.
m_points = [(164, 716), (164, 350), (252, 260), (512, 560),
            (772, 260), (860, 350), (860, 716)]
for i in range(len(m_points) - 1):
    t = i / (len(m_points) - 2)
    color = (int(155 - 60*t), int(82 - 35*t), 255, 255)
    draw.line([m_points[i], m_points[i+1]], fill=(52, 25, 145, 255), width=112)
    draw.line([m_points[i], m_points[i+1]], fill=color, width=82)
for x, y in m_points:
    draw.ellipse((x-41, y-41, x+41, y+41), fill=(128, 67, 244, 255))

# Gold rising performance line and arrow head.
gold = (255, 202, 83, 255)
draw.line([(140, 730), (320, 675), (475, 560), (620, 410), (820, 205)],
          fill=(125, 69, 18, 255), width=54, joint="curve")
draw.line([(140, 730), (320, 675), (475, 560), (620, 410), (820, 205)],
          fill=gold, width=34, joint="curve")
draw.polygon([(770, 210), (884, 148), (850, 278)], fill=(255, 218, 122, 255))

# Three compact gold analytics bars.
for x, top in [(585, 650), (680, 585), (775, 500)]:
    draw.rounded_rectangle((x, top, x+58, 790), radius=18, fill=gold)

# Fine highlight along the bottom edge.
draw.line([(130, 890), (894, 890)], fill=(111, 91, 255, 95), width=4)

target.parent.mkdir(parents=True, exist_ok=True)
base.save(target, format="PNG", optimize=True)
print(f"Rendered {target}")

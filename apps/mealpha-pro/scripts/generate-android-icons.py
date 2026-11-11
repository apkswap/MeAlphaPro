#!/usr/bin/env python3
"""Generate Android launcher icon resources from the approved MeAlpha source mark."""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "build" / "mealpha.ico"
RES = ROOT / "android" / "app" / "src" / "main" / "res"
if not SOURCE.is_file():
    raise SystemExit(f"Missing approved icon source: {SOURCE}")

logo = Image.open(SOURCE).convert("RGBA")
# Keep the mark centered and comfortably inset for Android launcher masks.
def render(size: int, padding: float = 0.18) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (12, 19, 42, 255))
    max_side = int(size * (1 - 2 * padding))
    mark = ImageOps.contain(logo, (max_side, max_side), Image.Resampling.LANCZOS)
    x = (size - mark.width) // 2
    y = (size - mark.height) // 2
    canvas.alpha_composite(mark, (x, y))
    return canvas

# Legacy launcher icons for all common Android density buckets.
for density, size in {"mdpi":48, "hdpi":72, "xhdpi":96, "xxhdpi":144, "xxxhdpi":192}.items():
    folder = RES / f"mipmap-{density}"
    folder.mkdir(parents=True, exist_ok=True)
    render(size, 0.12).save(folder / "ic_launcher.png", optimize=True)

# Adaptive icon foreground uses the same source artwork and background color.
foreground = render(432, 0.25)
folder = RES / "mipmap-xxxhdpi"
foreground.save(folder / "ic_launcher_foreground.png", optimize=True)
drawable = RES / "drawable"
drawable.mkdir(parents=True, exist_ok=True)
Image.new("RGB", (1, 1), (12, 19, 42)).save(drawable / "ic_launcher_background.png")
adaptive = RES / "mipmap-anydpi-v26"
adaptive.mkdir(parents=True, exist_ok=True)
(adaptive / "ic_launcher.xml").write_text(
    '<?xml version="1.0" encoding="utf-8"?>\n'
    '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
    '    <background android:drawable="@drawable/ic_launcher_background" />\n'
    '    <foreground android:drawable="@mipmap/ic_launcher_foreground" />\n'
    '</adaptive-icon>\n',
    encoding="utf-8",
)
print("Generated Android launcher icons from mealpha-original.png")

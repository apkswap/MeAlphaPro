#!/usr/bin/env python3
"""Generate crisp, full-bleed Android launcher icons from the approved app artwork."""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "mealpha-purple-gold.jpg"
RES = ROOT / "android" / "app" / "src" / "main" / "res"
if not SOURCE.is_file():
    raise SystemExit(f"Missing approved icon source: {SOURCE}")

logo = Image.open(SOURCE).convert("RGBA")


def render(size: int) -> Image.Image:
    # The source is already a complete square app icon. Fit it edge-to-edge:
    # do not add a second background or an artificial inset around the artwork.
    return ImageOps.fit(
        logo,
        (size, size),
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    )


# Legacy launcher icons at every common Android density.
for density, size in {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}.items():
    folder = RES / f"mipmap-{density}"
    folder.mkdir(parents=True, exist_ok=True)
    render(size).save(folder / "ic_launcher.png", optimize=True)

# Keep the adaptive foreground edge-to-edge; Android applies the launcher mask.
foreground = render(432)
folder = RES / "mipmap-xxxhdpi"
foreground.save(folder / "ic_launcher_foreground.png", optimize=True)
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
print("Generated full-bleed Android launcher icons from public/mealpha-purple-gold.jpg")

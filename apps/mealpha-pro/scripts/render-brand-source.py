#!/usr/bin/env python3
"""Render the canonical MeAlpha Pro SVG mark to a high-resolution transparent PNG."""
from pathlib import Path
import cairosvg

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / "public" / "mealpha.svg"
target = ROOT / "public" / "mealpha-original.png"
cairosvg.svg2png(url=str(source), write_to=str(target), output_width=1024, output_height=1024)
print(f"Rendered {target}")

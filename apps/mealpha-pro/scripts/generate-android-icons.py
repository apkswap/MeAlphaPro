#!/usr/bin/env python3
"""Compatibility wrapper for the shared vector-based Android icon generator."""
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
GENERATOR = ROOT / "scripts" / "generate-brand-assets.mjs"
subprocess.run(["node", str(GENERATOR), "--android"], cwd=ROOT, check=True)

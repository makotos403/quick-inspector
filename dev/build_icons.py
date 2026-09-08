"""Resize the icon master to the four toolbar/store sizes.

Master: dev/icon_src.png (transparent, >=512px) — produced by Gemini per
CONVENTIONS.md §10.3.2. Same art at every size; avoid thin strokes that
collapse at 16px (see spec.md §9).

Run: python dev/build_icons.py
"""

import os

from PIL import Image

DEV = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(DEV)

master = Image.open(os.path.join(DEV, "icon_src.png")).convert("RGBA")
os.makedirs(os.path.join(ROOT, "icons"), exist_ok=True)
for px in (128, 48, 32, 16):
    master.resize((px, px), Image.LANCZOS).save(
        os.path.join(ROOT, "icons", f"icon{px}.png")
    )
print("wrote icons/icon{16,32,48,128}.png")

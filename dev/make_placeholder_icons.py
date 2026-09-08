"""Throwaway placeholder icons so the unpacked extension has a toolbar glyph
during development. Replace with the real Gemini art via build_icons.py before
any store submission (see spec.md §9).

Run: python dev/make_placeholder_icons.py
"""

import os

from PIL import Image, ImageDraw

DEV = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(DEV)
ACCENT = (37, 99, 235, 255)  # #2563eb
WHITE = (255, 255, 255, 255)

S = 512
img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.rounded_rectangle([24, 24, S - 24, S - 24], radius=112, fill=ACCENT)

# Magnifier: ring + handle.
cx, cy, r = 232, 232, 118
d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=WHITE, width=44)
d.line([cx + 78, cy + 78, cx + 168, cy + 168], fill=WHITE, width=52)

# Corner ticks — the "inspect a box" hint.
for x, y in [(96, 96)]:
    d.line([x, y + 60, x, y], fill=WHITE, width=20)
    d.line([x, y, x + 60, y], fill=WHITE, width=20)

os.makedirs(os.path.join(ROOT, "icons"), exist_ok=True)
for px in (128, 48, 32, 16):
    img.resize((px, px), Image.LANCZOS).save(
        os.path.join(ROOT, "icons", f"icon{px}.png")
    )
print("wrote placeholder icons/icon{16,32,48,128}.png")

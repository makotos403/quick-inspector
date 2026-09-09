"""Build the Chrome Web Store small promo tile (440x280) as a lockup:
solid off-white ground, the finished icon on the left, the English wordmark
"Quick Inspector" on the right.

House format: CONVENTIONS.md §10.3.2 (cf. tomato-pop / claude-bubble-color).
The tile can't be localized, so it's English-only and global.

We composite it here rather than have Gemini render the wordmark, so the
spelling and kerning are exact and it always matches the shipped icon. Gemini
prompt for an art-only alternative lives in dev/asset-prompts.md.

Run:  python dev/make_promo.py   (needs icons/icon128.png built first)
"""

import os

from PIL import Image, ImageDraw, ImageFont

DEV = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(DEV)
ICON = os.path.join(ROOT, "dev", "icon_src.png")
OUT = os.path.join(DEV, "store", "promo-small.png")

W, H = 440, 280
GROUND = (238, 243, 252)  # #EEF3FC
INK = (30, 58, 138)  # #1E3A8A
FONT = r"C:\Windows\Fonts\segoeuib.ttf"


def main():
    tile = Image.new("RGB", (W, H), GROUND)

    icon = Image.open(ICON).convert("RGBA")
    box = 150
    icon = icon.resize((box, box), Image.LANCZOS)
    ix = 34
    tile.paste(icon, (ix, (H - box) // 2), icon)

    d = ImageDraw.Draw(tile)
    lines = ["Quick", "Inspector"]
    tx = ix + box + 28
    avail = W - tx - 22

    size = 60
    while size > 20:
        f = ImageFont.truetype(FONT, size)
        if max(d.textlength(ln, font=f) for ln in lines) <= avail:
            break
        size -= 2
    line_h = round(size * 1.08)
    ty = (H - line_h * len(lines)) // 2
    for i, line in enumerate(lines):
        d.text((tx, ty + i * line_h), line, font=f, fill=INK)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    tile.save(OUT)
    print("wrote", OUT, tile.size)


if __name__ == "__main__":
    main()

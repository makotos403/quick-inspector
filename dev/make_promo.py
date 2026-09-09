"""Fit the Gemini promo tile to the Chrome Web Store small promo tile spec.

House format (CONVENTIONS.md §10.3.2, cf. tomato-pop / claude-bubble-color):
solid off-white ground, icon-style symbol on the left, English wordmark on the
right, single global image. Gemini renders the whole lockup including the
"Quick Inspector" wordmark; this script only makes it meet spec: center-crop to
11:7, resize to exactly 440x280, save as 24-bit PNG (no alpha).

If a Gemini pass can't render clean text, fall back to art-only + a
PIL-composited wordmark (Segoe UI Bold / Yu Gothic Bold, #1E3A8A).

Run:  python dev/make_promo.py
"""

import os

from PIL import Image

DEV = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(DEV, "store", "raw", "promo_src.png")
OUT = os.path.join(DEV, "store", "promo-small.png")
W, H = 440, 280


def main():
    im = Image.open(SRC).convert("RGB")
    target = W / H
    cw, ch = im.width, round(im.width / target)
    if ch > im.height:
        ch, cw = im.height, round(im.height * target)
    cx, cy = (im.width - cw) // 2, (im.height - ch) // 2
    im = im.crop((cx, cy, cx + cw, cy + ch)).resize((W, H), Image.LANCZOS)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    im.save(OUT)
    print("wrote", OUT, im.size)


if __name__ == "__main__":
    main()

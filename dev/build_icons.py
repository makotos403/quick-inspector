"""Turn the Gemini icon render into the toolbar/store icons.

Input : dev/store/raw/icon_src_bracket-arrow.jpg  (Gemini, JPEG, motif on a
        baked-in transparency checkerboard — see dev/asset-prompts.md)
Output: dev/icon_src.png            (512, transparent master)
        icons/icon{16,32,48,128}.png

Pipeline: find the blue rounded square, crop to it, re-mask to a clean rounded
rectangle (radius 22%) at 4x supersample — this drops Gemini's stray drop
shadow and gives crisp transparent corners — then downscale.

Run: python dev/build_icons.py
"""

import os

from PIL import Image, ImageDraw

DEV = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(DEV)
SRC = os.path.join(DEV, "store", "raw", "icon_src_bracket-arrow.jpg")
MASTER = os.path.join(DEV, "icon_src.png")
ICONS = os.path.join(ROOT, "icons")
RADIUS_FRAC = 0.22
SS = 4


def blue_bbox(im):
    px = im.load()
    w, h = im.size
    x0, y0, x1, y1 = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if b > r + 25 and b > 120 and g < b:
                x0, y0 = min(x0, x), min(y0, y)
                x1, y1 = max(x1, x), max(y1, y)
    return x0, y0, x1 + 1, y1 + 1


def build_master():
    src = Image.open(SRC).convert("RGB")
    sq = src.crop(blue_bbox(src))
    side = max(sq.size)
    canvas = Image.new("RGB", (side, side), (255, 255, 255))
    canvas.paste(sq, ((side - sq.width) // 2, (side - sq.height) // 2))

    big = canvas.resize((side * SS, side * SS), Image.LANCZOS)
    mask = Image.new("L", big.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, big.size[0] - 1, big.size[1] - 1],
        radius=int(big.size[0] * RADIUS_FRAC),
        fill=255,
    )
    big.putalpha(mask)
    return big.resize((512, 512), Image.LANCZOS)


def main():
    os.makedirs(ICONS, exist_ok=True)
    master = build_master()
    master.save(MASTER)
    print("wrote", MASTER)
    for px in (128, 48, 32, 16):
        master.resize((px, px), Image.LANCZOS).save(os.path.join(ICONS, f"icon{px}.png"))
    print("wrote icons/icon{16,32,48,128}.png")

    # Opaque 128 for the Web Store listing (CONVENTIONS §10.3: 不透明).
    store = Image.new("RGB", (128, 128), (238, 243, 252))
    m128 = master.resize((128, 128), Image.LANCZOS)
    store.paste(m128, (0, 0), m128)
    store_dir = os.path.join(DEV, "store")
    os.makedirs(store_dir, exist_ok=True)
    store.save(os.path.join(store_dir, "icon-store-128.png"))
    print("wrote dev/store/icon-store-128.png")


if __name__ == "__main__":
    main()

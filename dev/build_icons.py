"""Draw the toolbar / store icons: a bold white ``</>`` on a blue rounded
square. Code-drawn (no Gemini dependency) so the stroke weight stays legible
at 16px and every size is reproducible.

Outputs:
    dev/icon_src.png            512, transparent master
    icons/icon{16,32,48,128}.png
    dev/store/icon-store-128.png   opaque, for the Web Store listing (§10.3)

Run: python dev/build_icons.py
"""

import os

from PIL import Image, ImageDraw

DEV = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(DEV)
ICONS = os.path.join(ROOT, "icons")
MASTER = os.path.join(DEV, "icon_src.png")
STORE_128 = os.path.join(DEV, "store", "icon-store-128.png")

BLUE = (37, 99, 235, 255)  # #2563eb
WHITE = (248, 250, 255, 255)  # #F8FAFF
GROUND = (238, 243, 252)  # #EEF3FC (store tile behind the opaque 128)
SS = 8  # supersample


def draw_master():
    n = 128 * SS
    im = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle(
        [9 * SS, 9 * SS, n - 9 * SS, n - 9 * SS], radius=int(n * 0.22), fill=BLUE
    )

    cx = cy = n // 2
    w = int(n * 0.115)  # stroke width
    ax, ay = int(n * 0.175), int(n * 0.165)  # chevron half-spread
    tip = int(n * 0.135)  # chevron point overshoot
    sx, sy = int(n * 0.055), int(n * 0.215)  # slash half-extents

    d.line([(cx - ax, cy - ay), (cx - ax - tip, cy), (cx - ax, cy + ay)],
           fill=WHITE, width=w, joint="curve")
    d.line([(cx + ax, cy - ay), (cx + ax + tip, cy), (cx + ax, cy + ay)],
           fill=WHITE, width=w, joint="curve")
    d.line([(cx + sx, cy - sy), (cx - sx, cy + sy)], fill=WHITE, width=w)

    for p in [
        (cx - ax, cy - ay), (cx - ax, cy + ay), (cx - ax - tip, cy),
        (cx + ax, cy - ay), (cx + ax, cy + ay), (cx + ax + tip, cy),
        (cx + sx, cy - sy), (cx - sx, cy + sy),
    ]:
        d.ellipse([p[0] - w // 2, p[1] - w // 2, p[0] + w // 2, p[1] + w // 2], fill=WHITE)

    return im.resize((512, 512), Image.LANCZOS)


def main():
    os.makedirs(ICONS, exist_ok=True)
    os.makedirs(os.path.dirname(STORE_128), exist_ok=True)

    master = draw_master()
    master.save(MASTER)
    print("wrote", MASTER)

    for px in (128, 48, 32, 16):
        master.resize((px, px), Image.LANCZOS).save(os.path.join(ICONS, f"icon{px}.png"))
    print("wrote icons/icon{16,32,48,128}.png")

    store = Image.new("RGB", (128, 128), GROUND)
    m128 = master.resize((128, 128), Image.LANCZOS)
    store.paste(m128, (0, 0), m128)
    store.save(STORE_128)
    print("wrote", STORE_128)


if __name__ == "__main__":
    main()

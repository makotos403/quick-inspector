"""Burn a full-width caption band into each store screenshot.

Raws (dev/store/raw/ss<NN>_<lang>.png) are already 1280x800; output keeps that
size and drops any alpha (Web Store wants 24-bit, no alpha).

Run: python dev/caption_shots.py
"""

import os

from PIL import Image, ImageDraw, ImageFont

DEV = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(DEV, "store", "raw")
OUT = os.path.join(DEV, "store")
FONT_JA = r"C:\Windows\Fonts\YuGothB.ttc"
FONT_EN = r"C:\Windows\Fonts\segoeuib.ttf"

INK = (30, 58, 138)  # #1E3A8A band
ACCENT = (37, 99, 235)  # #2563eb accent line
TEXT = (248, 250, 255)  # #F8FAFF

BAND_H = 104

SHOTS = [
    ("ss01", "1-panel",
     "DevTools を開かず、要素をその場で検証",
     "Inspect any element on the spot — no DevTools"),
    ("ss02", "2-pip",
     "最前面に浮くウィンドウに切り出し",
     "Pop it out into an always-on-top window"),
    ("ss03", "3-copy",
     "色・box model・CSS をワンクリックでコピー",
     "Copy colors, the box model, and CSS in one click"),
    ("ss04", "4-media",
     "画像・サムネイルを 開く / 保存 / URL コピー",
     "Open, save, or copy an image or thumbnail"),
    ("ss05", "5-handle",
     "使わないときは小さくたたむ",
     "Fold it away to a small handle"),
]


def add_band(img, text, font_path):
    w, h = img.size
    d = ImageDraw.Draw(img)
    top = h - BAND_H
    d.rectangle([0, top, w, h], fill=INK)
    d.rectangle([0, top, w, top + 3], fill=ACCENT)

    font = ImageFont.truetype(font_path, 26, index=0)
    bbox = d.textbbox((0, 0), text, font=font)
    ty = top + (BAND_H - (bbox[3] - bbox[1])) // 2 - bbox[1] + 2
    d.text((52 - bbox[0], ty), text, font=font, fill=TEXT)
    return img


def main():
    for raw, name, ja, en in SHOTS:
        for lang, cap, font in (("ja", ja, FONT_JA), ("en", en, FONT_EN)):
            src = os.path.join(SRC, f"{raw}_{lang}.png")
            im = add_band(Image.open(src).convert("RGB"), cap, font)
            im.save(os.path.join(OUT, f"{name}-{lang}.png"))
            print(f"{raw}_{lang}  ->  dev/store/{name}-{lang}.png")


if __name__ == "__main__":
    main()

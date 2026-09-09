# Assets — icon & store images

Artwork for Quick Inspector. Follows [CONVENTIONS.md](../../CONVENTIONS.md)
§4, §9, §10.3.

## Brand palette

| Token | Hex | Use |
|---|---|---|
| Accent | `#2563eb` | icon ground, UI accent (`sections.css`) |
| Accent dark | `#1E3A8A` | promo-tile wordmark |
| Light ground | `#EEF3FC` | promo-tile background, opaque store-128 backing |
| Symbol light | `#F8FAFF` | the `</>` glyph |

**Motif**: a bold white `</>` on a blue rounded square. Chosen for 16px
legibility — a magnifier's thin ring and a thin bracket frame both turned to
mush at 16px (CONVENTIONS §4). Rejected Gemini attempts, for reference, are in
git history (commits around 2026-09-09): magnifier + `</>` + arrow, and a
corner-bracket + cursor frame.

---

## 1. Toolbar icon — DONE (code-drawn)

`dev/build_icons.py` draws the `</>` mark directly with PIL (supersampled),
so stroke weight is tunable per size and nothing depends on an image file:

```
python dev/build_icons.py
# → dev/icon_src.png (512, transparent master)
#   icons/icon{16,32,48,128}.png
#   dev/store/icon-store-128.png  (opaque, for the Web Store listing)
```

If the mark ever needs a redraw, edit the geometry constants in `draw_master()`
(`w` stroke, `ax/ay` chevron spread, `tip`, `sx/sy` slash).

---

## 2. Store promo tile (small, 440×280) — DONE (composited)

`dev/make_promo.py` composites the tile so spelling and the icon always match:
`#EEF3FC` ground, `dev/icon_src.png` on the left, "Quick Inspector" in
Segoe UI Bold `#1E3A8A` (auto-fit, two lines) on the right.

```
python dev/build_icons.py   # icon first
python dev/make_promo.py     # → dev/store/promo-small.png (440x280, 24-bit)
```

---

## 3. Screenshots (§10.3) — 申請時にまとめて

`dev/store/raw/ss<NN>_<lang>.png` で撮影 → `dev/caption_shots.py` で帯を焼く →
`dev/store/<n>-<slug>-<lang>.png`。候補:

1. パネル展開＋要素ハイライト＋セレクタ / box model（ヒーロー）
2. 📌 で PiP ウィンドウに切り出し（差別化機能）
3. 色スウォッチ / CSS ルールとしてコピー
4. 折りたたみハンドル

背景ページは中立なもの（例: Wikipedia）。他社ロゴを大きく写さない（§10.3）。
キャプション帯: 濃色 `#1E3A8A` / アクセント線 `#2563eb` / 文字 `#F8FAFF`。

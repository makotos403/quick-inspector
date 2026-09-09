# Assets — icon & store images

Original artwork for Quick Inspector. Follows [CONVENTIONS.md](../../CONVENTIONS.md)
§4, §9, §10.3.

## Brand palette

| Token | Hex | Use |
|---|---|---|
| Accent | `#2563eb` | UI accent (`sections.css`). Gemini's icon blue is close (~`#2c6bdf`) — kept |
| Accent dark | `#1E3A8A` | promo-tile wordmark |
| Light ground | `#EEF3FC` | promo-tile background |
| Symbol light | `#F8FAFF` | the bracket / cursor shape |

**Chosen motif**: a corner-bracket frame with a diagonal arrow cursor breaking
out to the top-right — "inspect an element, pop it out to a window". Solid,
chunky shapes; it survives 16px (a magnifier's thin ring does not — CONVENTIONS §4).

---

## 1. Toolbar icon — DONE

- Source: Gemini `dev/store/raw/icon_src_bracket-arrow.jpg` (prompt below).
- `dev/build_icons.py` keys out the JPEG checkerboard, masks to a rounded
  square (radius 22%, kills Gemini's stray drop-shadow), writes
  `dev/icon_src.png` (512, transparent) and `icons/icon{16,32,48,128}.png`.
- Rejected alt kept for reference: `dev/store/raw/icon_alt_magnifier.jpg`
  (magnifier + `</>` + arrow — nicer big, mush at 16px).

### Gemini prompt (icon)

```
Chrome拡張機能のツールバーアイコンを1枚作ってください。

【キャンバス】正方形・透過PNG・長辺512px以上。

【figure】角丸の正方形タイル（半径は辺の約22%）をブランド青 #2563eb で塗る。
その上に、白 #F8FAFF で「要素を検証する」モチーフ：太いコーナーブラケットで
四角い枠の左上と右下だけを描き（枠線は太め・角丸）、その枠の中心から右上へ
伸びる矢印カーソルを1つ。DevToolsの「inspect」アイコンのイメージ。

【スタイル】フラット・ミニマル・やわらかい角丸。グラデ・影なし。16pxでも潰れない太さ。

【厳守】
- 1画像＝1デザイン。グリッド・複数案・分割禁止
- 文字・数字を入れない
- 透過背景
- 長辺1024px以上のPNG

今回は1案だけ生成してください。
```

---

## 2. Store promo tile (small, 440×280) — DONE

We composite it ourselves (`dev/make_promo.py`) rather than have Gemini render
the wordmark, so spelling/kerning are exact and it always matches the shipped
icon: `#EEF3FC` ground, `dev/icon_src.png` on the left, "Quick Inspector" in
Segoe UI Bold `#1E3A8A` on two lines, right. Output `dev/store/promo-small.png`.

```
python dev/build_icons.py     # icon first
python dev/make_promo.py      # then the tile
```

### Gemini fallback (art-only, if we ever want a richer tile)

```
Chrome拡張機能のストア用プロモーションタイルの「左シンボルのみ」を1枚。
文字は入れない（ワードマークは後で合成する）。

【キャンバス】440×280 のうち左半分に収まる正方形シンボル。長辺1500px以上のPNG。
【背景】単色オフホワイト #EEF3FC で全面。
【シンボル】ブランド青 #2563eb の角丸タイルに、白 #F8FAFF の太いコーナーブラケット枠
＋中心から右上へ伸びる矢印カーソル（ツールバーアイコンと同一モチーフ）。
フラット・ミニマル・影なし・グラデなし。

【厳守】文字・URL を入れない / drop shadow なし / 1画像1デザイン / 透過なし
```

Then drop the render at `dev/store/raw/promo_src.png` and switch
`make_promo.py` back to the crop-and-fit path (git history has it).

---

## 3. Screenshots (§10.3) — 申請時にまとめて

`dev/store/raw/ss<NN>_<lang>.png` で撮影 → `dev/caption_shots.py` で帯を焼く →
`dev/store/<n>-<slug>-<lang>.png`。候補:

1. パネル展開＋要素ハイライト＋セレクタ/box model（ヒーロー）
2. 📌 で PiP ウィンドウに切り出し（差別化機能）
3. 色スウォッチ / CSS ルールとしてコピー
4. 折りたたみハンドル

背景ページは中立なもの（例: Wikipedia）。他社ロゴを大きく写さない（§10.3）。
キャプション帯の色（`caption_shots.py`）: 濃色 `#1E3A8A` / アクセント線 `#2563eb` /
文字 `#F8FAFF`。

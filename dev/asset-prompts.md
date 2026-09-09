# Asset generation — Gemini prompts & workflow

Original artwork for Quick Inspector: the toolbar icon and the Chrome Web Store
small promo tile. Follows [CONVENTIONS.md](../../CONVENTIONS.md) §4, §9, §10.3.

## Brand palette

| Token | Hex | Use |
|---|---|---|
| Accent | `#2563eb` | icon ground, UI accent (already in `sections.css`) |
| Accent dark | `#1E3A8A` | promo-tile wordmark |
| Light ground | `#EEF3FC` | promo-tile background (pale blue-tinted off-white) |
| Symbol light | `#F8FAFF` | the magnifier / bracket shape |

Motif: a **magnifier** framing an **element corner-bracket** (the "inspect"
gesture). Keep it solid and chunky — thin rings/lines vanish at 16px
(CONVENTIONS §4). The magnifier ring must be a thick stroke or a filled lens.

---

## 1. Toolbar icon → `dev/icon_src.png`

Generate at 512px+ transparent PNG, save as `dev/icon_src.png`, then:

```
python dev/build_icons.py     # writes icons/icon{16,32,48,128}.png
```

### Prompt A — magnifier-forward (recommended)

```
Chrome拡張機能のツールバーアイコンを1枚作ってください。

【キャンバス】正方形・透過PNG・長辺512px以上。余白は上下左右に均等に少し。

【figure】角丸の正方形タイル（半径は辺の約22%）をブランド青 #2563eb で塗る。
その上に、白 #F8FAFF の虫めがねをシンプルに置く：レンズは「太いリング」
（線幅はレンズ直径の約28%）、持ち手は短く太い角丸バー、右下向き45度。
レンズの中に、要素選択を示す小さなコーナーブラケット「⌐」を淡い白で1つ。

【スタイル】フラット・ミニマル・やわらかい角丸。グラデーション不可。影不可
（drop shadow なし）。アウトライン文字なし。16pxでも潰れない太さで。

【厳守】
- 1画像＝1デザイン。グリッド・複数案・分割・コラージュ禁止
- 文字・数字・URLを入れない
- 透過背景（タイル以外は透明）
- 長辺1024px以上のPNG（.png）

別案が欲しいときはこちらで再実行します。今回は1案だけ生成してください。
```

### Prompt B — bracket + cursor-forward (alternative)

```
Chrome拡張機能のツールバーアイコンを1枚作ってください。

【キャンバス】正方形・透過PNG・長辺512px以上。

【figure】角丸の正方形タイル（半径は辺の約22%）をブランド青 #2563eb で塗る。
その上に、白 #F8FAFF で「要素を検証する」モチーフ：太いコーナーブラケットで
四角い枠の左上と右下だけを描き（枠線は太め・角丸）、その枠の中心に
シンプルな矢印カーソルを1つ。DevToolsの「inspect」アイコンのイメージ。

【スタイル】フラット・ミニマル・やわらかい角丸。グラデ・影なし。16pxでも潰れない太さ。

【厳守】
- 1画像＝1デザイン。グリッド・複数案・分割禁止
- 文字・数字を入れない
- 透過背景
- 長辺1024px以上のPNG

今回は1案だけ生成してください。
```

**Gemini に添付**: なし（新規モチーフ）。生成後、512×512 にして `dev/icon_src.png`。
16px で確認 — レンズのリングやブラケットが潰れるなら太くして再生成。

---

## 2. Store promo tile (small, 440×280) → `dev/store/promo-small.png`

House format is fixed in [CONVENTIONS.md](../../CONVENTIONS.md) §10.3.2
(cf. [tomato-pop](../../tomato-pop/dev/store/promo-tile.png),
[claude-bubble-color](../../claude-bubble-color/dev/store/promo-small.png)):
solid off-white ground, icon-style symbol on the left, English wordmark on the
right, single global image (not localized).

### Gemini prompt (§10.3.2 template, filled)

```
Chrome拡張機能のストア用プロモーションタイルを1枚作ってください。

【レイアウト】横長 440×280px（約1.57:1）の横並びロックアップ。
左にシンボル、右に英語タイトルを大きめに。左右のバランスを取る。

【背景】単色（グラデーション不可）。白寄りのオフホワイト #EEF3FC でキャンバス全面。

【左：シンボル】アイコンとほぼ同じモチーフを1つ：ブランド青 #2563eb の角丸タイルに、
白 #F8FAFF の太リングの虫めがね（持ち手は短く太い、右下45度）。レンズの中に
淡い白のコーナーブラケット「⌐」。フラット・やわらかい角丸・ミニマル・ライトなトーン。
影は付けない。

【右：タイトル】「Quick Inspector」を丸みのある太字ゴシックで、雰囲気に合った書体で。
色はブランド濃色 #1E3A8A。2行に折り返してよい（Quick / Inspector）。スペルを正確に。

【厳守】
- タイトル以外の文字・段落・URL は入れない
- シンボルに drop shadow を付けない
- 1画像＝1デザイン。グリッド・コラージュ・複数案・分割禁止
- 透過なし・背景は指定の単色で全面塗り
- 横長1枚・長辺1500px以上の PNG（.png）

別案が欲しいときはこちらで再実行します。今回は1案だけ生成してください。
```

**Gemini に添付**: 完成した `icons/icon128.png`（配色・シンボルの基準）＋
UI 実物スクショ1枚（`dev/store/raw/ss01_en.png`・帯なし原本）。

### 仕上げ

Gemini 出力（比率・形式がまちまち）を保存 → 440×280 ちょうどに整える:

```
# 出力を dev/store/raw/promo_src.png に置いてから
python dev/make_promo.py     # → dev/store/promo-small.png (440x280, 24-bit, no alpha)
```

文字が崩れたら「文字なしの左シンボルのみ」で描き直し、ワードマークは
`dev/make_promo.py` の PIL 側で組む（`segoeuib.ttf` / `YuGothB.ttc`・`#1E3A8A`）。

---

## 3. Screenshots (§10.3) — 申請時にまとめて

`dev/store/raw/ss<NN>_<lang>.png` で撮影 → `dev/caption_shots.py` で帯を焼く →
`dev/store/<n>-<slug>-<lang>.png`。撮る画面の候補:

1. パネル展開＋要素ハイライト＋セレクタ/box model（ヒーロー）
2. 📌 で PiP ウィンドウに切り出し（差別化機能）
3. 色スウォッチ / CSS ルールとしてコピー
4. 折りたたみハンドル

背景ページは中立なもの（例: Wikipedia）。他社ロゴを大きく写さない（§10.3）。
```

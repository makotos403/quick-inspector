# Chrome ウェブストア 掲載情報（下書き）

そのまま Developer Dashboard に貼れるようにまとめたもの。`dev/` 配下なのでストア zip には含まれない。

- **公開レベル**: Public
- **カテゴリ**: Developer Tools
- **言語**: English / 日本語（既定ロケール: `en`）
- **バージョン**: `1.0.0`
- **ストアアイコン**: `icons/icon128.png`（manifest と同一・透過のまま。ライト/ダーク両カードに馴染む）
- **プライバシーポリシー URL**: `https://github.com/makotos403/quick-inspector/blob/main/PRIVACY.md`
- 開発者アカウント: `hanpen403@gmail.com`（登録済み・追加費用なし。CONVENTIONS §10）

---

## 1. 名前

- EN: `Quick Inspector`
- JA: `お手軽検証ツール`

（manifest の `__MSG_appName__` から。`short_name` は未設定 — 両方とも十分短い）

---

## 2. 概要 / Summary（132字以内・`_locales/*/messages.json` の `appDesc` と同一）

**EN**
> Inspect elements without DevTools — selectors, box model, styles, colors, thumbnails — in a panel that can float on top. EN & JA.

**JA**
> DevTools を開かず、浮くパネルで要素のセレクタ・box model・スタイル・色・サムネイルを確認。最前面ウィンドウ化も可能。日英対応。

### GitHub リポジトリ Description（英語1行・CONVENTIONS §9）
> Inspect any element — selectors, box model, key styles — from a floating overlay, no DevTools needed.

### GitHub Topics
> chrome-extension  manifest-v3  browser-extension  devtools  web-development  css-selector  xpath  element-picker  inspector  frontend

---

## 3. 詳細な説明 / Detailed description

**JA**

```
お手軽検証ツール（Quick Inspector）は、DevTools を開かずにページの要素をその場で調べる Chrome 拡張機能です。

■ DevTools を開かない
DevTools を開くとブラウザの表示領域が狭くなります。この拡張は、画面の隅に小さく浮くパネルだけで完結します。ページのレイアウトは 1px もずれません。

■ 使い方
ツールバーのアイコンをクリック → パネルの「検証」ボタン → 要素にカーソルを合わせてクリック。選んだ要素の情報がパネルに表示されます。

■ 分かること
・CSS セレクタ と XPath（クリックでコピー）
・box model（margin / border / padding / content の実測値）
・主要な計算済みスタイル（約20項目）＋「CSS ルールとしてコピー」
・色（文字色・背景色・枠線色）を色見本つきで、クリックで HEX コピー
・構造（table の行×列、リストの件数、繰り返し要素、ネスト深さ）
・画像・サムネイル：<img>、<video> のポスター、background-image、YouTube 埋め込みのサムネイルを、新しいタブで開く / 保存 / URL コピー

■ 最前面ウィンドウに切り出し
パネルの 📌 ボタンで、内容を常に最前面に浮くウィンドウ（Picture-in-Picture）に移せます。ページを一切覆わずに検証できます（HTTPS ページのみ）。

■ 権限とプライバシー
外部との通信は一切ありません。読み取った内容は表示のためだけに使い、収集も送信もしません。アイコンをクリックしたタブでのみ動作します。「保存」を押したときだけ、選んだ画像の URL をブラウザのダウンロードに渡します。
```

**EN**

```
Quick Inspector inspects a page element on the spot — without opening DevTools.

NO DEVTOOLS
Opening DevTools shrinks your view of the page. This extension works entirely from a small panel that floats in the corner. The page layout never shifts.

HOW TO USE
Click the toolbar icon, press Inspect in the panel, then hover an element and click. The panel fills in with what it found.

WHAT IT SHOWS
- CSS selector and XPath (click to copy)
- Box model — measured margin / border / padding / content
- ~20 key computed styles, plus "Copy as CSS rule"
- Colors (text, background, border) with swatches; click to copy the hex
- Structure — table rows x cols, list item counts, repeated children, nesting depth
- Image / thumbnail — for an <img>, a <video> poster, a CSS background-image, or a YouTube embed: open the image in a new tab, save it, or copy its URL

FLOAT IT ON TOP
The panel's pin button moves the results into an always-on-top window (Picture-in-Picture) that never covers the page. HTTPS pages only.

PERMISSIONS & PRIVACY
No external connections at all. What it reads is used only to display it — nothing is collected or sent. It runs only on the tab whose icon you clicked. Only when you press Save does it hand the image URL you chose to the browser's downloader.
```

---

## 4. 単一用途の説明 / Single purpose

**EN（審査は英語）**
> Quick Inspector inspects one web element that the user points at on the current page. It reports the element's CSS selector, XPath, box model, key computed styles, colors, and simple structure counts, and — when the element references an image (an <img>, a <video> poster, a CSS background-image, or a YouTube embed) — lets the user open, copy, or save that image. Everything happens locally in the browser.

**JA（参考）**
> ユーザーが指し示したページ上の要素を1つ調べるツール。セレクタ・XPath・box model・主要スタイル・色・構造の件数を表示し、その要素に紐づく画像があれば開く・コピー・保存できる。処理はすべてブラウザ内で完結。

---

## 5. 権限の理由 / Permission justifications

Dashboard「プライバシー」タブで各権限に入力（英語）。

| 権限 | 理由文（そのまま貼れる） |
|---|---|
| `activeTab` | Grants temporary access to the one tab where the user clicked the toolbar icon, so the inspector panel can be injected there and nowhere else. No host permission is requested. |
| `scripting` | Injects the inspector's script into that active tab. Required together with "activeTab" — activeTab alone does not permit scripting.executeScript. It is used only to add the panel; no page content is read for any other purpose or sent anywhere. |
| `downloads` | When the user presses "Save" on an image or video thumbnail found on the selected element, the extension downloads that single URL. It is used for nothing else. Content scripts cannot call chrome.downloads directly, so the panel sends the URL to the service worker, which performs the download. |

**広い host 権限**: なし（`optional_host_permissions` も未使用）。

---

## 6. データ利用の申告 / Data usage

- 収集・使用するユーザーデータ: **なし**（全カテゴリで「収集しない」）
- 認証（3つともチェック）:
  - [x] データを第三者に販売しない
  - [x] 単一用途と無関係な目的に使わない
  - [x] 与信・融資目的に使わない・転送しない

---

## 7. リモートコード / Remote code

**使用していません。** すべての JavaScript はパッケージに同梱。`content.js` は
`bootstrap.js` からの動的 `import()` で読み込まれるが、対象は同梱ファイルであり
リモート取得ではない。外部スクリプトの読み込み・`eval` の類は一切なし。

---

## 8. スクリーンショット（1280×800 PNG・24bit・アルファなし・日英別セット）— 撮影済み

撮影原本 → `dev/store/raw/ss0[1-5]_{ja,en}.png` ／ アップロード用 →
`dev/store/[1-5]-<slug>-{ja,en}.png`（`dev/caption_shots.py` が帯を焼く。
帯 `#1E3A8A` ／ アクセント線 `#2563eb` ／ 文字 `#F8FAFF`）。

背景は **Wikimedia Commons メインページ**（`commons.wikimedia.org` / 日本語表示）で統一。
中立・メディア主題・他社サービスロゴなし。ブラウザ最大化・ネイティブ 1280×800。
日本語版は拡張 UI が日本語、英語版は英語。

| # | slug | 画面 | キャプション JA / EN |
|---|---|---|---|
| 1 | `panel` | パネル展開＋見出しをハイライト＋セレクタ／box model／主要スタイル | DevTools を開かず、要素をその場で検証 / Inspect any element on the spot — no DevTools |
| 2 | `pip` | 📌 で切り出した PiP ウィンドウ＋ページ側は小ハンドル | 最前面に浮くウィンドウに切り出し / Pop it out into an always-on-top window |
| 3 | `copy` | 色スウォッチ＋構造＋「CSS ルールとしてコピー」 | 色・box model・CSS をワンクリックでコピー / Copy colors, the box model, and CSS in one click |
| 4 | `media` | 画像を選択 → プレビュー＋開く／保存／URL コピー | 画像・サムネイルを 開く / 保存 / URL コピー / Open, save, or copy an image or thumbnail |
| 5 | `handle` | 折りたたみハンドルだけが右上に（赤枠で強調） | 使わないときは小さくたたむ / Fold it away to a small handle |

- プロモタイル（小・440×280）: `dev/store/promo-small.png`（全言語共通）。
- マーキータイル（1400×560）: 未作成。不要なら省略。
- 差し込み用の YouTube サムネ再構築カットは任意（自分のブログの埋め込みで撮れる）。

---

## 9. 提出用 zip

Windows には `zip` が無いので **`dev/pack.ps1`** を使う（`git ls-files` から
`dev/` ・`*.md` ・`LICENSE` ・dotfiles を除外して `../quick-inspector-v<version>.zip` を生成）:

```
powershell -ExecutionPolicy Bypass -File dev/pack.ps1
```

含まれるもの（17ファイル）: `manifest.json` / `background.js` / `bootstrap.js` /
`content.js` / `render.js` / `selectors.js` / `inspect.js` / `cssrule.js` /
`content.css` / `sections.css` / `pip.css` / `icons/icon{16,32,48,128}.png` /
`_locales/{en,ja}/messages.json`

---

## 10. 申請フロー（CONVENTIONS §10.5）

1. 実機で最終動作確認（HTTPS ページで PiP、`<img>`／YouTube で画像セクション、日英切替）
2. zip 作成 → Dashboard「新しいアイテム」でアップロード
3. 「ストアの掲載情報」「プライバシー」「配布」タブを本ファイルからコピペ
   - プライバシーポリシー URL は上記（`main` とファイル名は変えない）
4. スクリーンショット（§8）とストアアイコン（`icons/icon128.png`・透過のまま可）とプロモタイルをアップロード
5. 「審査用に送信」→ 結果はメール。MV3・host 権限なしなので 1〜3 日の見込み

### 既知の制約（v1.1 で対応）

- ページによっては一部の要素がピッカーで選択できないことがある
  （`pointer-events: none` を持つ要素、疑似要素、非常に小さい要素など）。

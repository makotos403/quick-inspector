# Quick Inspector / お手軽検証ツール

> Inspect any page element from a small floating overlay — selectors, box model,
> key computed styles, colors, structure counts — without opening DevTools and
> without shrinking the page. Chrome extension (Manifest V3). English & Japanese.
>
> DevTools を開かず、ページも縮めずに、画面に浮く小さなオーバーレイから要素の
> セレクタ・box model・主要スタイル・色・構造の件数を確認する Chrome 拡張機能
> （Manifest V3）。日本語・英語対応。

---

## Features / 特長

- Click the toolbar icon → a small draggable panel appears; click again to exit
- One `Inspect` toggle in the panel header — hover to highlight, click to inspect
- `📌` promotes the panel to an always-on-top floating window (Document
  Picture-in-Picture) that never covers the page — on HTTPS pages
- The panel collapses to a handle; the page never reflows (overlay only)
- **Selectors**: shortest-unique CSS selector + absolute XPath, click to copy
- **Box model**: measured margin / border / padding / content
- **Key styles**: ~20 curated computed properties, plus "Copy as CSS rule"
- **Colors**: `color` / `background` / `border-color` swatches, click to copy hex
- **Structure**: table rows × cols, list item counts, repeated children, nesting depth
- `activeTab` + `scripting` only — no host permission, no network
  ([PRIVACY.md](PRIVACY.md))

---

- ツールバーアイコンをクリック → 小さなパネルが出る。もう一度クリックで終了
- パネルヘッダーの `検証` トグル1つ。ホバーでハイライト、クリックで調査
- `📌` でパネルを常に最前面の別ウィンドウ（Document Picture-in-Picture）に昇格。
  ページを一切覆わない（HTTPS ページのみ）
- パネルはハンドルに折りたためる。ページはリフローしない（浮くだけ）
- **セレクタ**: 最短ユニーク CSS ＋ 絶対 XPath、クリックでコピー
- **box model**: margin / border / padding / content の実測値
- **主要スタイル**: 計算済みプロパティ約20項目、「CSS ルールとしてコピー」つき
- **色**: `color` / `background` / `border-color` の色見本、クリックで HEX コピー
- **構造**: table の行×列、リストの件数、繰り返し子要素、ネスト深さ
- 権限は `activeTab` ＋ `scripting` のみ。host 権限なし・外部通信なし

## Install (development) / インストール（開発版）

1. Clone or download this folder / このフォルダを clone またはダウンロード
2. Open `chrome://extensions`, enable Developer mode / 「デベロッパーモード」を ON
3. "Load unpacked" → select this folder / 「パッケージ化されていない拡張機能を読み込む」

## Layout / 構成

[../CONVENTIONS.md](../CONVENTIONS.md) に従ったフラット構成。

| File | Role |
|---|---|
| `manifest.json` | MV3 manifest. Permissions: `activeTab` + `scripting` only |
| `background.js` | Service worker. On toolbar click, inject `bootstrap.js` |
| `bootstrap.js` | Tiny classic script; dynamic-imports `content.js` as a module |
| `content.js` | In-page UI: the unified panel, the picker, PiP promotion, closed shadow DOM |
| `content.css` / `sections.css` / `pip.css` | Shadow-panel shell / shared section styling / PiP-window layout (all fetched and injected) |
| `render.js` | Builds the panel body from a plain model — no logic deps, document-portable |
| `selectors.js` | `buildCssSelector` / `buildXPath` — pure |
| `inspect.js` | `inspect` / `countStructure` — pure |
| `cssrule.js` | `toCssRule` — pure |
| `_locales/{en,ja}/messages.json` | Store name / description + UI strings (`chrome.i18n`) |
| `dev/` | Not shipped: spec, tests, icon master. Excluded from the store zip |

## Development / 開発

```
node dev/selectors.test.mjs
node dev/inspect.test.mjs
node dev/cssrule.test.mjs
```

Design notes and scope: [dev/spec.md](dev/spec.md).

## Permissions / 権限

| Permission | Purpose |
|---|---|
| `activeTab` | Act only on the tab whose toolbar icon you clicked |
| `scripting` | Inject the overlay into that tab (required alongside `activeTab`; no permission warning on its own) |

No host permission. No data leaves the browser. / host 権限なし。データは一切外部に出ません。

## License / ライセンス

MIT — [LICENSE](LICENSE)

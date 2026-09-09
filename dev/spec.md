# Quick Inspector / お手軽検証ツール — 仕様書（MVP）

> DevTools を開かずに「要素を調べる」フローだけを取り出す MV3 拡張。
> DevTools を開くとブラウザの表示領域が狭まるのが動機。ドッキングもページの
> リフローもさせず、画面に浮くオーバーレイで完結させる。

- **表示名**: `Quick Inspector`（EN） / `お手軽検証ツール`（JA）
- **フォルダ / リポジトリ**: `quick-inspector`（`github.com/makotos403/quick-inspector`, Public, `main`）
- **形態**: Chrome 拡張（Manifest V3）
- **状態**: Phase 1（統合パネル）実装済み（2026-09-08）。`chrome://extensions` で読み込み可能。
  次は実機確認 → Phase 2（独立ウィンドウ切り出し）→ アイコン本番化 → 公開
- 元アイデア: [../../IDEAS.md](../../IDEAS.md) 「ページ解剖ピッカー拡張」
- 構成規約: [../../CONVENTIONS.md](../../CONVENTIONS.md)

### UI の変遷

- 当初: 画面隅の1行バー ＋ 選択時に別ポップオーバー（案 A）。
- **現行（Phase 1）**: バーとポップオーバーを**1つの折りたたみ式縦パネル**に統合。
  検証トグルはパネルヘッダーの1箇所だけ。描画は `render.js` に分離。
- **Phase 2**: パネルを `chrome.windows.create` で**ブラウザ外の独立ウィンドウ**に
  切り出せるようにする（IDEAS 案 C）。切り出し中はページ側に小ハンドルだけ残す。

---

## 1. スコープ

### MVP に入れる

| 機能 | 内容 |
|---|---|
| 起動 | ツールバーアイコンのクリックで注入。展開＋検証 ON で出る。もう一度クリックで終了 |
| 統合パネル | 画面隅に浮く1枚の縦パネル。ドラッグ移動可・折りたたみ（ハンドル化）可・✕ で終了 |
| ピッカー | ホバーでハイライト＋タグ名ラベル、クリックで選択。ヘッダーの `[検証]` トグルで開始/停止 |
| セレクタ | CSS（自前・§4.2）＋ XPath（自前）。行クリックでコピー |
| 要素情報 | タグ / `#id` / `.class` / 実寸 `W×H px` |
| box model 図 | margin / border / padding / content の実測値を入れ子図で |
| 主要プロパティ抜粋 | 計算済みスタイルから約20項目をキュレートして表示（全 computed は出さない） |
| CSS ルールとしてコピー | 見た目を再現する `selector { ... }` ブロックを生成してコピー |
| 色スウォッチ | `color` / `background-color` / `border-color` を色見本つきで、クリックで HEX コピー |
| 構造・件数 | table は N行×M列、リストは件数、同種の直下子要素の数、ネスト深さ |
| 終了 | ESC、× ボタン、アイコン再クリック |

### MVP に入れない（v2 以降）

- 画像 / サムネ取得・ダウンロード（`downloads` / `contextMenus` 権限が必要になる）
- 別ドメイン iframe プレーヤーの URL 再構築（YouTube 等）
- 右クリックメニューからの起動
- full-path セレクタ / XPath⇔CSS 切替 / 選択履歴 / 複数選択の比較
- options ページ、UI 言語の手動切替
- アクセシビリティ情報、フォント詳細、z-index/stacking、全属性一覧

### やらないこと（恒久）

- ライブ編集・Network・Console・パフォーマンス計測。DevTools の代替は狙わない。

---

## 2. アーキテクチャ

### 2.1 起動フロー

1. ユーザーがツールバーアイコンをクリック（`chrome.action.onClicked`）。
2. `background.js`（service worker・classic）が
   `chrome.scripting.executeScript({ files: ["bootstrap.js"] })` を実行。
   - 必要な権限は `activeTab` ＋ `scripting`（両方セットで初めて、ユーザー操作した
     アクティブタブに host 権限なしで注入できる）。`scripting` 単体はユーザー向けの
     権限警告を出さない（host 権限が付かないため）。
3. `bootstrap.js`（classic・極小）が動的 `import(chrome.runtime.getURL("content.js"))` を実行。
   - これで `content.js` 以下を **ES モジュールとして**読み込める（`export` / `import` が使える）。
   - `content.js` / `render.js` / `selectors.js` / `inspect.js` / `cssrule.js` / `content.css` は
     `web_accessible_resources` に登録。
4. `content.js` は二重ロードをガード（`window.__quickInspector`）。
   - 未ロード → UI を構築してピッカー開始。
   - ロード済み → トグルして終了（`teardown()`）。
5. タブごとの ON/OFF は `content.js` 側のフラグで判定。SW に状態を持たせない
   （[CONVENTIONS.md](../../CONVENTIONS.md) §7 MV3 の注意）。

> **`background.js` に `"type": "module"` は付けない。** background は `executeScript` を
> 呼ぶだけで他ファイルを `import` しないため。ES モジュール化が要るのは
> ページ側（`content.js` 以下）で、そちらは §2.1-3 の動的 `import()` で解決する。

### 2.2 UI の隔離

- ホスト要素を `document.documentElement` 直下に1つ追加し `attachShadow({ mode: 'closed' })`。
- すべての UI は shadow root 内。ページの CSS は侵入せず、こちらの CSS も漏れない。
- CSS は実ファイル `content.css` に置き、`chrome.runtime.getURL('content.css')` を
  `fetch` して shadow root 内の `<style>` に流し込む
  （`web_accessible_resources` に `content.css` を登録）。
- 最前面: ホスト要素に `z-index: 2147483647`。オーバーレイ類は `pointer-events: none`。
- ヒットテスト時、`event.composedPath()` に自ホストが含まれる場合は無視。

### 2.3 ページを一切リフローさせない

- パネル・ハイライト・ラベルはすべて `position: fixed`。
- ページの DOM には**ホスト要素1個だけ**を足す（レイアウトに影響しない配置）。
- 終了時にホスト要素とイベントリスナを完全撤去。痕跡を残さない。

### 2.4 描画ロジックの分離（`render.js`）

- パネル本体（title / セレクタ / box model / スタイル / 色 / 構造）の DOM 生成は
  `render.js` に隔離。**プレーンな `model` オブジェクトだけ**を受け取り、
  `selectors.js` / `inspect.js` / `cssrule.js` に一切依存しない。
- `content.js` が `buildModel(el)` で `inspect()` ＋ セレクタ ＋ `toCssRule()` を
  1つの `model` にまとめ、`render.js` に渡す。
- 狙い: Phase 2 の独立ウィンドウ（`panel.js`）が、messaging で受け取った `model` を
  同じ `render.js` でそのまま描ける。

---

## 3. コンポーネント仕様

### 3.1 統合パネル

- `position: fixed`、既定は右上。ヘッダーをドラッグで移動（座標は保持しない）。
- **展開時**のヘッダー: `[🔍]` `[検証 / 停止]` … `[– 折りたたみ]` `[✕]`
  - 検証トグル: ピッカーの開始 / 停止。起動中はラベル「停止」＋青くアクティブ表示。
    文言キー `barInspect` / `barStop`（「ピック」ではなくツール名と揃えて「検証」）。
  - `–`: パネルを折りたたむ（→ ハンドル化）。折りたたむと検証も停止。
  - `✕`: `teardown()`。
- **折りたたみ時**: `[🔍 検証]` の小ハンドルのみ（`cursor: grab`・つかむ余白あり）。
  - 押してすぐ離す → 展開。
  - 押して 4px 以上動かす → ドラッグ移動（展開しない）。
  - 展開時のヘッダードラッグも同じ 4px しきい値で「クリック」と「ドラッグ」を判定。
- **本体**（展開時のみ）:
  - 未選択 → ヒント文（`hintPicking` / `hintIdle` を状態で出し分け）。
  - 選択済み → `render.js` が §3.3 のセクションを描画。
- 幅は展開 324px / 折りたたみは内容なり。`max-height: 82vh`、本体はスクロール。
- 起動直後は **展開＋検証 ON**（ヒント文を表示した状態でピッカー稼働）。

### 3.2 ピッカー

- `mousemove`（capture, rAF スロットル）→ `document.elementFromPoint` でヒット要素を取得。
  自ホスト（`composedPath` に含まれる場合）・`documentElement` は無視。
- ハイライト: 対象の bounding rect に沿ったアウトライン枠（`fixed`）＋薄い塗り。
  スクロール・リサイズで追従。
- カーソル近傍に小ラベル: `tag#id.class`（省略表示）と `W×H`。
- `click`（capture, `preventDefault` + `stopPropagation`）→ 選択確定・ホバー停止・
  本体に結果描画。折りたたみ中なら展開する。
- キー（ESC）:
  - ピッカー中 → 停止。
  - 選択結果あり → 結果をクリアしてヒントに戻す。
  - どちらでもない → `teardown()`。
- スコープ: トップドキュメントのみ。クロスオリジン iframe には入らない（制約として明記）。

### 3.3 パネル本体のセクション（`render.js`）

`model`（§2.4）から生成。コピーはすべて `content.js` の `copy()` にコールバック。

  1. **title 行**: `tag#id.class`（省略）＋ `W × H`。
  2. **セレクタ**: CSS（自前・§4.2）／ XPath（自前）。行クリックでコピー。
  3. **box model 図**: CSS で描く入れ子ボックス。margin / border / padding は
     4辺の px、content は `w × h`。0 の辺は淡色表示。
  4. **主要スタイル**（計算済み・§4.3 の固定リスト）: `key: value` の表。
     `[CSS ルールとしてコピー]` ボタン → `model.cssRule`（§4.4）をコピー。
  5. **色**: `color` / `background-color` / `border-color` の色見本チップ＋
     HEX（アルファがあれば `#RRGGBBAA` / それ以外 `#RRGGBB`）。チップクリックで HEX コピー。
     透明・none はチップをグレーアウト。
  6. **構造・件数**（§4.5）: 該当するものだけ。
     - `<table>` → `N 行 × M 列`（全 `tr` / 最大セル数）
     - `<ul>` / `<ol>` → `N 項目`（直下 `<li>` 数）
     - 直下に同一タグの子が3個以上 → `N × <tag>`
     - `ネスト深さ D`（選択要素を根とした最大子孫深さ）
- コピー時トースト: `コピーしました` / `Copied`（言語で出し分け）。

---

## 4. ロジック（純粋関数・テスト対象）

`chrome.*` から切り離す（[CONVENTIONS.md](../../CONVENTIONS.md) §7）。

### 4.1 セレクタライブラリ

- 当初は `@medv/finder` の同梱を予定していたが、**MVP は `selectors.js` に自前の
  最短ユニーク実装を持つ**方針に変更（オフラインでベンダを正確に取り込めないため）。
  `buildCssSelector` は差し替え可能な単一関数なので、後から `@medv/finder` に
  置き換えるのは容易（v2 候補）。
- `finder.js` は作らない（作成物一覧からも除外）。

### 4.2 `selectors.js`

- `buildCssSelector(el, doc) -> string`
  - 自前アルゴリズム: `#id`（一意なら）→ 対象から親へ辿り、各段で
    `tag` ＋ 安定クラス（最大2個）＋ 必要なら `:nth-of-type(n)` の複合セレクタを組み、
    パスが一意になった時点で確定。
  - 動的クラス名フィルタ: `css-xxxx`（emotion）/ `Btn_root__a1b2`（CSS Modules）/
    数字混じりのハッシュ様 / `--` を含む状態修飾を候補から除外。
- `buildXPath(el, doc) -> string`
  - `el.id` がありドキュメント内で一意 → `//*[@id="…"]`。
  - それ以外 → 祖先を辿り `tag[n]`（同名兄弟が複数なら 1-based index、単独なら index 省略）を
    `/html/body/…` の形で連結。
- どちらも生成後に `doc.querySelector` / `doc.evaluate` で**検証**し、単一要素に
  解決しなければフォールバック（CSS: full path、XPath: 絶対パス）。

### 4.3 `inspect.js`

- `inspect(el, win) -> { header, dims, boxModel, keyStyles, colors, counts, }`
- `keyStyles` の固定リスト（約20）:
  `display, position, (top/right/bottom/left は position≠static のときのみ),
  box-sizing, width, height, margin, padding, border,
  font-family, font-size, font-weight, line-height,
  color, background-color, background-image,
  flex/grid の要約, z-index, opacity, overflow`
  - `getComputedStyle` の値をそのまま。`background-image: none` 等は出さない。
  - flex 要約: 親が flex/grid なら `flex: … / grid-area: …` を1行に圧縮。
- `boxModel`: `getComputedStyle` の margin/border/padding 各辺 px ＋ `getBoundingClientRect`。

### 4.4 `cssrule.js`

- `toCssRule(selector, keyStyles) -> string`
- 既定値・無意味な宣言（`margin: 0px` 等の 0、`background-image: none`）は落とし、
  意味のある宣言だけを:
  ```
  selector {
    display: flex;
    padding: 12px 16px;
    …
  }
  ```
  形式で返す。インデント2スペース。

### 4.5 構造カウント（`inspect.js` 内）

- `countStructure(el) -> { kind, rows?, cols?, items?, repeat?, depth }`
- `depth`: 幅優先で最大子孫深さ（上限 50 でカット）。

### 4.6 `render.js`（描画・ロジック依存なし）

- `h(tag, props, ...kids)`: 共有 hyperscript ヘルパー（`content.js` からも import）。
- `renderModel(container, model, onCopy)`: §3.3 のセクションを `container` に生成。
- `renderMessage(container, text)`: ヒント1行だけ表示。
- `model` の形（シリアライズ可能・messaging で送れる）:
  ```
  { header:{tag,id,classes[],text}, dims:{width,height},
    selectors:{css,xpath}, boxModel:{margin,border,padding:{top,right,bottom,left},
    content:{width,height}}, keyStyles:[{prop,value}],
    colors:{color,backgroundColor,borderColor:{value,hex,transparent}},
    counts:{kind,rows?,cols?,items?,repeat?,depth}, cssRule:string }
  ```
- `render.js` は `chrome.i18n` のみ使用。`selectors/inspect/cssrule` は import しない。

---

## 5. manifest.json

キー順は [CONVENTIONS.md](../../CONVENTIONS.md) §5 に従う。

```jsonc
{
  "manifest_version": 3,
  "name": "__MSG_appName__",
  "version": "0.1.0",
  "description": "__MSG_appDesc__",
  "default_locale": "en",
  "icons": { "16": "...", "32": "...", "48": "...", "128": "..." },
  "action": { "default_title": "__MSG_actionTitle__" },
  "background": { "service_worker": "background.js" },
  "permissions": ["activeTab", "scripting"],
  "web_accessible_resources": [
    {
      "resources": [
        "content.js", "render.js", "selectors.js", "inspect.js",
        "cssrule.js", "content.css"
      ],
      "matches": ["<all_urls>"]
    }
  ]
}
```

- `permissions` は `activeTab` ＋ `scripting` のみ。host 権限 / `downloads` / `contextMenus` は入れない。
  （`activeTab` だけでは `scripting.executeScript` を呼べないため両方必要。`scripting` 単体は
  権限警告なし。）
- クリップボード書き込みはユーザー操作起点の `navigator.clipboard.writeText` で権限不要。
- `background` に `"type": "module"` は**付けない**。background は `executeScript` を呼ぶだけで
  他ファイルを `import` しない。ES モジュールが要るのはページ側で、`bootstrap.js` の
  動的 `import()` で読み込む（§2.1）。

---

## 6. i18n

- 2言語: `en` / `ja`（[CONVENTIONS.md](../../CONVENTIONS.md) §6、ストア公開想定）。
- manifest: `_locales/{en,ja}/messages.json`（`chrome.i18n`）。
- 拡張内 UI: **手動切替なし**なので `chrome.i18n.getMessage` で統一
  （`strings.<lang>.json` + 自作ローダは使わない）。content script でも `chrome.i18n` は使える。
- 文言キー: `appName`, `appDesc`, `actionTitle`, `barInspect`, `barStop`,
  `panelCollapse`, `panelClose`, `hintPicking`, `hintIdle`,
  `secSelector`, `secBox`, `secStyles`, `secColors`, `secStructure`,
  `copyRule`, `copied`, `labelCss`, `labelXpath`,
  `structTable`, `structItems`, `structRepeat`, `structDepth`

---

## 7. ファイル構成

```
quick-inspector/
├── manifest.json
├── background.js          # action.onClicked → bootstrap.js を注入（classic）
├── bootstrap.js           # 極小・classic。import(content.js) するだけ
├── content.js             # 統合パネル・ピッカー・shadow DOM UI（ESM）
├── content.css            # shadow root に流し込む UI スタイル
├── render.js              # パネル本体の DOM 生成（model → DOM。ロジック依存なし）
├── selectors.js           # buildCssSelector / buildXPath（純粋）
├── inspect.js             # inspect / countStructure / rgbToHex / collapseBox（純粋）
├── cssrule.js             # toCssRule（純粋）
├── icons/ icon16.png icon32.png icon48.png icon128.png   # ※現状はプレースホルダ
├── _locales/
│   ├── en/messages.json
│   └── ja/messages.json
├── README.md              # EN → JA 併記
├── PRIVACY.md             # 「すべてブラウザ内で完結」
├── LICENSE                # MIT (c) makotos403
├── .gitignore  .gitattributes
└── dev/
    ├── spec.md            # 本ファイル
    ├── minidom.mjs        # テスト用の最小 DOM（jsdom 不使用）
    ├── build_icons.py     # Gemini マスター（dev/icon_src.png）→ 4サイズ
    ├── make_placeholder_icons.py  # 開発用の仮アイコン生成（提出前に差し替え）
    ├── selectors.test.mjs
    ├── inspect.test.mjs
    └── cssrule.test.mjs
```

- 共有モジュール4個（`render` `selectors` `inspect` `cssrule`）→ フラット維持（§3: 5個以上で `lib/`）。
  Phase 2 で `panel.*` が増えると 5 個目。そこで `lib/` 化を検討。
- `content.css` は shadow DOM 注入用。実ファイルにして `fetch` で読む。
- `web_accessible_resources`: `bootstrap.js` は不要（`executeScript` で注入するため）。
  `content.js` `render.js` `selectors.js` `inspect.js` `cssrule.js` `content.css` を登録。
- テスト実行: `node --test "dev/*.test.mjs"`（Node 24 / 全15ケース green）。

---

## 8. プライバシー / セキュリティ

- 外部通信ゼロ。ページ内容の保存・送信なし。`chrome.storage` も未使用。
- `activeTab` のみ・ユーザーがアイコンをクリックしたタブ・その回だけ動作。
- ページの DOM 変更はホスト要素1個の追加のみ。終了で撤去。
- PRIVACY.md にデータ収集なしを明記。

---

## 9. アイコン

- **現状は `dev/make_placeholder_icons.py` が生成した仮アイコン**（青の角丸＋白い虫めがね）。
  提出前に差し替える。
- 本番は Gemini に生成依頼（[CONVENTIONS.md](../../CONVENTIONS.md) §4・§10.3.2）。
- モチーフ案: 虫めがね＋要素の角枠（DevTools の「inspect」矢印＋ボックス）を
  ミニマルに。細いリング意匠は 16px で潰れるので避ける。ブランド色 `#2563eb`。
- `dev/icon_src.png`（512px 透過）→ `dev/build_icons.py` で 16/32/48/128 生成。

---

## 10. テスト

- `dev/*.test.mjs`（ESM・`node:assert` ＋ `node:test` のみ、[CONVENTIONS.md](../../CONVENTIONS.md) §4）。
- `dev/minidom.mjs`: jsdom 不使用の最小 DOM（要素ツリー・`matches`・`querySelectorAll`・
  `//*[@id]` 限定の `evaluate`）。
- `selectors.test.mjs`: 生成セレクタが元の要素に丸取り（round-trip）で解決するか、
  id 優先、動的クラス除外、XPath の形。
- `inspect.test.mjs`: `rgbToHex` / `collapseBox` / `countStructure`（table / list / repeat / depth）。
- `cssrule.test.mjs`: 既定値・ノイズ宣言の除去、フォーマット。
- 実行: `node --test "dev/*.test.mjs"`（全15ケース green）。
- **未カバー（実機確認）**: shadow DOM UI、ピッカーのヒットテスト、ドラッグ、
  クリップボードコピー、`getComputedStyle` 依存の `inspect()` 本体。

---

## 11. Phase 2 — 独立ウィンドウ切り出し

パネルヘッダーに `[↗]` を追加し、`chrome.windows.create({ type: "popup" })` で
`panel.html` を開く。対象ページを1pxも覆わなくなる（当初の動機に一番忠実）。

- **新規ファイル**: `panel.html` / `panel.js` / `panel.css`。
- **描画**: `panel.js` は `render.js` をそのまま使う（§2.4 の狙い）。
- **messaging**: `content.js`（ピッカー・`model` 生成）↔ `background.js`（tabId 中継）↔
  `panel.js`。ポップアップは開いた元タブに束縛。
  - `panel.js` の `[検証]` → content.js に「ピッカー開始」を送る。
  - content.js が select したら `model` を panel.js へ送って描画。
- **ページ側**: 切り出し中はパネルを小ハンドルだけに（クリックでウィンドウを前面へ、
  再度でページ内表示に戻す）。
- **状態遷移**: ポップアップを閉じる / 元タブを閉じる・遷移する → ページ内パネルに戻る。
- 追加権限は不要（`chrome.windows` はパーミッション不要、`panel.html` は同梱ページ）。
- テスト: `render.js` の描画は `panel.js` 経由でも同じなので追加ユニットテストは
  `render` のスナップショット程度。messaging 配線は実機確認。

---

## 12. リリース計画

- `v0.1.0`: Phase 1（統合パネル）。内部動作確認（未公開）。
- `v0.2.0`: Phase 2（独立ウィンドウ）。
- `v1.0.0`: ストア申請（[CONVENTIONS.md](../../CONVENTIONS.md) §10）。カテゴリ =
  Developer Tools、公開レベルは申請時に決定。
- 以降の候補は §1「MVP に入れない」を参照。

---

## 13. GitHub リポジトリ

[CONVENTIONS.md](../../CONVENTIONS.md) §9 に従う（Description / Topics は英語のみ・1行）。

- **リポジトリ名**: `quick-inspector`
- **URL**: `https://github.com/makotos403/quick-inspector`（Public・ブランチ `main`）
- **Description**（英語1行・README 冒頭の引用と同トーン）:

  > Inspect any element — selectors, box model, key styles — from a floating overlay, no DevTools needed.

- **Topics**:

  ```
  chrome-extension  manifest-v3  browser-extension  devtools  web-development
  css-selector  xpath  element-picker  inspector  frontend
  ```

- **About（GitHub の website 欄）**: 空でよい（ストア公開後に URL を入れる）。
- **`.gitattributes`**:

  ```
  * text=auto eol=lf
  *.png binary
  ```

- **`.gitignore`**（[CONVENTIONS.md](../../CONVENTIONS.md) §8）:

  ```
  # store submission packages
  *.zip
  # OS cruft
  .DS_Store
  Thumbs.db
  # node
  node_modules/
  ```

- **初回コミットメッセージ**:

  ```
  Initial commit: Quick Inspector v0.1.0

  MV3 extension that inspects a page element from a floating overlay
  without opening DevTools: element picker, CSS/XPath selectors, box
  model, key computed styles, "copy as CSS rule", color swatches, and
  structure counts. activeTab only, no host permissions, no network.
  ```

- 公開手順は [CONVENTIONS.md](../../CONVENTIONS.md) §9 の「新規リポジトリの公開手順」
  （GitHub Desktop で Publish、または空リポジトリ作成 → `git remote add` → `git push`）。

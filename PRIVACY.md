# Privacy Policy — Quick Inspector / プライバシーポリシー — お手軽検証ツール

**Last updated / 最終更新日: 2026-09-08**

---

## EN

### 1. Data collection

**Quick Inspector does not send, collect, or store any data anywhere.**

- It makes no network requests of any kind.
- No analytics, cookies, or tracking.
- Neither the developer nor any third party can see anything you inspect.

### 2. What it stores

Nothing. The extension keeps no settings and uses no `chrome.storage`.

### 3. Page access

When you click the toolbar icon, the extension injects an overlay into **that
one tab** using the `activeTab` + `scripting` permissions. It reads the page's
DOM and computed styles **locally, in your browser**, only to display them in
the overlay. It does not transmit page content anywhere. When you close the
tool (Esc, the ✕ button, or clicking the icon again) the overlay is fully
removed.

### 4. Permissions

| Permission | Purpose |
|---|---|
| `activeTab` | Limit all activity to the tab whose icon you clicked |
| `scripting` | Inject the inspector overlay into that tab (required alongside `activeTab`) |
| `downloads` | Save an image to your computer when you press **Save** on a thumbnail. Only the URL you chose is downloaded; nothing else. |

No host permissions are requested. The extension is used for a single purpose —
inspecting an element on the current page — and its permissions are not used for
anything else.

### 5. Contact

**hanpen403@gmail.com**

---

## JA / 日本語

### 1. 収集するデータ

**本拡張機能は、いかなるデータも外部に送信・収集・保存しません。**

- 外部サーバーとの通信を一切行いません。
- アクセス解析・Cookie・トラッキングの類を使用しません。
- 開発者を含む第三者が、調査した内容を閲覧・取得することはできません。

### 2. ブラウザ内に保存する情報

ありません。設定を持たず、`chrome.storage` も使用しません。

### 3. ページへのアクセス

ツールバーアイコンをクリックすると、`activeTab` ＋ `scripting` 権限で**そのタブ
1つ**にオーバーレイを注入します。ページの DOM と計算済みスタイルを**お使いの
ブラウザ内でローカルに**読み取り、オーバーレイに表示するためだけに使用します。
ページの内容を外部に送信することはありません。ツールを終了（Esc・✕ ボタン・
アイコン再クリック）するとオーバーレイは完全に撤去されます。

### 4. 権限の利用目的

| 権限 | 目的 |
|---|---|
| `activeTab` | 操作をアイコンをクリックしたタブだけに限定するため |
| `scripting` | そのタブに検証オーバーレイを注入するため（`activeTab` と対で必要） |
| `downloads` | サムネイルの「保存」を押したとき、その画像を端末に保存するため。ダウンロードするのは選んだ URL のみです。 |

host（ホスト）権限は要求しません。本拡張機能は「現在のページの要素を調べる」
という単一目的にのみ権限を使用します。

### 5. お問い合わせ

**hanpen403@gmail.com**

---

## Changes / 本ポリシーの変更

Any change is reflected on this page and with a version bump of the extension. /
内容を変更する場合は、本ページおよび拡張機能のバージョン更新時に反映します。

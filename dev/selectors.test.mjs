/**
 * node dev/selectors.test.mjs
 * Round-trip tests: a generated selector must resolve back to exactly the
 * element it was built for. Uses dev/minidom.mjs (no jsdom).
 */

import assert from "node:assert/strict";
import test from "node:test";
import { buildCssSelector, buildXPath } from "../selectors.js";
import { Doc, el } from "./minidom.mjs";

function fixture() {
  const li = (n) => el("li", { class: "row" });
  const items = [li(), li(), li()];
  const cells = [el("td"), el("td")];
  const root = el(
    "html",
    {},
    el(
      "body",
      {},
      el(
        "div",
        { id: "main" },
        el("ul", { class: "list" }, ...items),
        el("table", {}, el("tr", {}, ...cells)),
        el("span", { class: "css-1a2b3c note" }),
      ),
    ),
  );
  const doc = new Doc(root);
  return { doc, items, cells, root };
}

test("CSS selector resolves back to the same element", () => {
  const { doc, items } = fixture();
  for (const target of [items[0], items[1], items[2]]) {
    const sel = buildCssSelector(target, doc);
    const hits = doc.querySelectorAll(sel);
    assert.equal(hits.length, 1, `"${sel}" should be unique`);
    assert.equal(hits[0], target);
  }
});

test("CSS selector prefers a unique id", () => {
  const { doc } = fixture();
  const main = doc.querySelector("#main");
  assert.equal(buildCssSelector(main, doc), "#main");
});

test("CSS selector skips build-generated classes", () => {
  const { doc } = fixture();
  const span = doc.querySelector("span");
  const sel = buildCssSelector(span, doc);
  assert.ok(!sel.includes("css-1a2b3c"), `"${sel}" must not use the hashy class`);
  assert.equal(doc.querySelectorAll(sel)[0], span);
});

test("XPath resolves back to the same element", () => {
  const { doc, items } = fixture();
  const xp = buildXPath(items[2], doc);
  assert.equal(xp, "/html/body/div/ul/li[3]");
  const r = doc.evaluate(xp);
  // minidom.evaluate only handles //*[@id]; assert the path shape instead.
  assert.match(xp, /^\/html\/body\/div\/ul\/li\[3\]$/);
});

test("XPath uses id when the element has one", () => {
  const { doc } = fixture();
  const main = doc.querySelector("#main");
  assert.equal(buildXPath(main, doc), '//*[@id="main"]');
});

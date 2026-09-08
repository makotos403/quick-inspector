/**
 * node dev/inspect.test.mjs
 * Covers the DOM-independent helpers plus countStructure via minidom.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { countStructure, rgbToHex, collapseBox } from "../inspect.js";
import { Doc, el } from "./minidom.mjs";

test("rgbToHex handles rgb and rgba", () => {
  assert.equal(rgbToHex("rgb(255, 0, 128)"), "#ff0080");
  assert.equal(rgbToHex("rgb(37, 99, 235)"), "#2563eb");
  assert.equal(rgbToHex("rgba(0, 0, 0, 0.5)"), "#00000080");
  assert.equal(rgbToHex("rgba(1, 2, 3, 1)"), "#010203");
  assert.equal(rgbToHex("not a color"), "");
});

test("collapseBox mirrors the CSS shorthand rules", () => {
  assert.equal(collapseBox("4px", "4px", "4px", "4px"), "4px");
  assert.equal(collapseBox("1px", "2px", "1px", "2px"), "1px 2px");
  assert.equal(collapseBox("1px", "2px", "3px", "4px"), "1px 2px 3px 4px");
});

test("countStructure: table rows and columns", () => {
  const root = el(
    "html",
    {},
    el(
      "table",
      {},
      el("tr", {}, el("td"), el("td"), el("td")),
      el("tr", {}, el("td"), el("td")),
    ),
  );
  new Doc(root);
  const c = countStructure(root.children[0]);
  assert.equal(c.kind, "table");
  assert.equal(c.rows, 2);
  assert.equal(c.cols, 3);
});

test("countStructure: list item count", () => {
  const root = el("html", {}, el("ul", {}, el("li"), el("li"), el("li"), el("li")));
  new Doc(root);
  const c = countStructure(root.children[0]);
  assert.equal(c.kind, "list");
  assert.equal(c.items, 4);
});

test("countStructure: repeated children", () => {
  const root = el(
    "html",
    {},
    el("div", {}, el("article"), el("article"), el("article"), el("aside")),
  );
  new Doc(root);
  const c = countStructure(root.children[0]);
  assert.equal(c.kind, "repeat");
  assert.deepEqual(c.repeat, { tag: "article", count: 3 });
});

test("countStructure: nesting depth", () => {
  const root = el("html", {}, el("div", {}, el("div", {}, el("div", {}, el("span")))));
  new Doc(root);
  const c = countStructure(root.children[0]);
  assert.equal(c.depth, 3);
});

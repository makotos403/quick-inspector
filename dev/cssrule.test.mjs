/**
 * node dev/cssrule.test.mjs
 */

import assert from "node:assert/strict";
import test from "node:test";
import { toCssRule } from "../cssrule.js";

test("keeps meaningful declarations, drops noise", () => {
  const out = toCssRule(".card", [
    { prop: "display", value: "flex" },
    { prop: "position", value: "static" },
    { prop: "margin", value: "0px" },
    { prop: "padding", value: "8px 12px" },
    { prop: "background-image", value: "none" },
    { prop: "color", value: "rgb(15, 23, 42)" },
  ]);
  assert.equal(
    out,
    ".card {\n  display: flex;\n  padding: 8px 12px;\n  color: rgb(15, 23, 42);\n}",
  );
});

test("drops zero-only box shorthands", () => {
  const out = toCssRule("div", [
    { prop: "padding", value: "0px 0px" },
    { prop: "margin", value: "0" },
    { prop: "width", value: "200px" },
  ]);
  assert.equal(out, "div {\n  width: 200px;\n}");
});

test("empty rule when everything is noise", () => {
  const out = toCssRule("span", [
    { prop: "display", value: "inline" },
    { prop: "background-color", value: "rgba(0, 0, 0, 0)" },
  ]);
  assert.equal(out, "span {\n  display: inline;\n}");
});

test("falls back to * with no selector", () => {
  assert.equal(toCssRule("", []), "* {\n}");
});

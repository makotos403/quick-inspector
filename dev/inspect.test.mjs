/**
 * node dev/inspect.test.mjs
 * Covers the DOM-independent helpers plus countStructure via minidom.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  countStructure,
  rgbToHex,
  collapseBox,
  youTubeThumb,
  bgImageUrl,
  pickImgSrc,
  findMedia,
} from "../inspect.js";
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

test("youTubeThumb parses every embed/watch/short form", () => {
  const id = "dQw4w9WgXcQ";
  for (const url of [
    `https://www.youtube.com/embed/${id}?autoplay=1`,
    `https://www.youtube-nocookie.com/embed/${id}`,
    `https://youtu.be/${id}`,
    `https://www.youtube.com/watch?v=${id}`,
    `https://www.youtube.com/watch?list=x&v=${id}`,
    `https://www.youtube.com/shorts/${id}`,
  ]) {
    const t = youTubeThumb(url);
    assert.equal(t.kind, "youtube", url);
    assert.equal(t.url, `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`);
    assert.equal(t.filename, `${id}.jpg`);
  }
  assert.equal(youTubeThumb("https://vimeo.com/12345"), null);
  assert.equal(youTubeThumb(""), null);
});

test("bgImageUrl pulls the first url()", () => {
  assert.equal(bgImageUrl('url("https://x.test/a.png")'), "https://x.test/a.png");
  assert.equal(bgImageUrl("url(https://x.test/b.jpg), linear-gradient(#fff, #000)"), "https://x.test/b.jpg");
  assert.equal(bgImageUrl("none"), null);
  assert.equal(bgImageUrl("linear-gradient(#fff, #000)"), null);
});

test("pickImgSrc prefers currentSrc, then widest srcset, then src", () => {
  assert.equal(pickImgSrc({ currentSrc: "cur.jpg", getAttribute: () => null }), "cur.jpg");
  const withSet = { getAttribute: (n) => (n === "srcset" ? "a.jpg 320w, b.jpg 1280w, c.jpg 640w" : null) };
  assert.equal(pickImgSrc(withSet), "b.jpg");
  assert.equal(pickImgSrc({ getAttribute: (n) => (n === "src" ? "plain.jpg" : null) }), "plain.jpg");
});

test("findMedia: direct <img>", () => {
  const root = el("html", {}, el("body", {}, el("img", { src: "https://x.test/p.png" })));
  new Doc(root);
  const m = findMedia(root.children[0].children[0]);
  assert.equal(m.kind, "img");
  assert.equal(m.url, "https://x.test/p.png");
  assert.equal(m.filename, "p.png");
});

test("findMedia: <video poster>", () => {
  const root = el("html", {}, el("video", { poster: "https://x.test/thumb.jpg" }));
  new Doc(root);
  assert.equal(findMedia(root.children[0]).kind, "poster");
});

test("findMedia: YouTube iframe (self and descendant)", () => {
  const id = "abcdef12345";
  const root = el(
    "html",
    {},
    el("div", { class: "player" }, el("iframe", { src: `https://www.youtube.com/embed/${id}` })),
  );
  new Doc(root);
  assert.equal(findMedia(root.children[0]).url, `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`);
  assert.equal(findMedia(root.children[0].children[0]).kind, "youtube");
});

test("findMedia: figure > img", () => {
  const root = el("html", {}, el("figure", {}, el("img", { src: "https://x.test/f.webp" }), el("figcaption", {})));
  new Doc(root);
  assert.equal(findMedia(root.children[0]).url, "https://x.test/f.webp");
});

test("findMedia: nothing for a plain div", () => {
  const root = el("html", {}, el("div", {}, el("p", {})));
  new Doc(root);
  assert.equal(findMedia(root.children[0]), null);
});

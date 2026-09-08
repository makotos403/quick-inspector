/**
 * bootstrap.js — tiny classic script injected by background.js.
 *
 * Why it exists: scripts injected via `scripting.executeScript({ files })` run
 * as classic scripts and cannot use `import`. This file does the one thing a
 * classic script still can — a dynamic `import()` — to pull in `content.js` as
 * a real ES module. `content.js` and its imports must be listed in
 * `web_accessible_resources`.
 *
 * Re-invocation: `import()` of the same URL returns the cached module without
 * re-running it, so `content.js` keeps its state and `toggle()` flips the UI
 * on and off across clicks.
 */

(async () => {
  try {
    const mod = await import(chrome.runtime.getURL("content.js"));
    mod.toggle();
  } catch (err) {
    console.error("[Quick Inspector] failed to load content.js:", err);
  }
})();

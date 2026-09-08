/**
 * background.js — service worker (classic script).
 *
 * Sole job: when the toolbar icon is clicked, inject `bootstrap.js` into the
 * active tab. `bootstrap.js` then loads `content.js` as an ES module, which
 * builds the UI (or tears it down if already present).
 *
 * Permissions: "activeTab" + "scripting". The pair is required — "activeTab"
 * alone does not allow `scripting.executeScript`. No host permission is needed
 * because injection only happens on the tab the user explicitly acted on.
 *
 * No state is kept here (MV3 workers are short-lived; see CONVENTIONS.md §7).
 * The on/off toggle lives in `content.js`.
 */

const INJECTABLE = /^(https?|file):/i;

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !INJECTABLE.test(tab.url || "")) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["bootstrap.js"],
    });
  } catch (err) {
    console.error("[Quick Inspector] injection failed:", err);
  }
});

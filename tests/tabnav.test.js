// Regression tests for tmux-style tab navigation (the ( / ) bindings).
//
// These load the *real* unpacked extension into Chromium and exercise the
// actual shipping chain — popup.js keydown -> chrome.runtime.sendMessage ->
// background.js -> chrome.tabs.update — plus the wrap-around index math in
// background.js's walkTab().
//
// Requires a Chromium that supports extensions in headless mode, which needs
// Playwright's `channel: 'chromium'`. Install it once with `npm run test:setup`.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");

const EXT = path.resolve(__dirname, "..");

let ctx, sw, extId, profileDir, popup;
let pages = {}; // query-string -> Page, e.g. { a, b, c }

// Snapshot the tab strip from the service worker's point of view.
const tabsInfo = () =>
  sw.evaluate(async () => {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    return tabs.map((t) => ({ id: t.id, url: t.url, active: t.active }));
  });

const activeUrl = async () => (await tabsInfo()).find((t) => t.active)?.url;

async function waitFor(fn, { timeout = 5000, interval = 50 } = {}) {
  const end = Date.now() + timeout;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) throw new Error("waitFor: timed out");
    await new Promise((r) => setTimeout(r, interval));
  }
}

before(async () => {
  profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "cbg-prof-"));
  ctx = await chromium.launchPersistentContext(profileDir, {
    headless: true,
    channel: "chromium", // new headless mode — required for extensions to load
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  });

  sw =
    ctx.serviceWorkers()[0] ||
    (await ctx.waitForEvent("serviceworker", { timeout: 15000 }));
  extId = new URL(sw.url()).host;

  // Three content tabs, in a known left-to-right order: a, b, c.
  const first = ctx.pages()[0] || (await ctx.newPage());
  await first.goto("https://example.com/?a");
  pages.a = first;
  for (const q of ["b", "c"]) {
    const p = await ctx.newPage();
    await p.goto("https://example.com/?" + q);
    pages[q] = p;
  }

  // The popup, loaded as a normal page so we can dispatch real keypresses into
  // it. It sits to the right of the content tabs (last in the strip).
  popup = await ctx.newPage();
  await popup.goto(`chrome-extension://${extId}/popup.html`);
});

after(async () => {
  await ctx?.close();
  if (profileDir) fs.rmSync(profileDir, { recursive: true, force: true });
});

test("service worker registers and openPopup() is available", async () => {
  assert.equal(typeof extId, "string");
  assert.ok(extId.length > 0, "extension id should be present");

  const hasOpenPopup = await sw.evaluate(
    () =>
      typeof chrome?.action?.openPopup === "function"
  );
  assert.ok(
    hasOpenPopup,
    "chrome.action.openPopup must exist (needs Chrome 127+) for the popup to re-open after each hop"
  );
});

test("end-to-end: ) in the popup advances to the next tab (wraps last->first)", async () => {
  // Focus the popup so it receives the keypress; it's the last tab, so 'next'
  // must wrap around to the first tab.
  await popup.bringToFront();
  const before = await tabsInfo();
  const startActive = before.find((t) => t.active).id;
  const firstId = before[0].id;

  await popup.keyboard.press(")");
  await waitFor(async () => (await tabsInfo()).find((t) => t.active).id !== startActive);

  const after = await tabsInfo();
  assert.equal(
    after.find((t) => t.active).id,
    firstId,
    "next-from-last should wrap to the first tab"
  );
});

test("end-to-end: ( in the popup goes to the previous tab", async () => {
  await popup.bringToFront();
  const before = await tabsInfo();
  const startActive = before.find((t) => t.active).id;
  const prevId = before[before.length - 2].id; // popup is last; prev is the one before it

  await popup.keyboard.press("(");
  await waitFor(async () => (await tabsInfo()).find((t) => t.active).id !== startActive);

  const after = await tabsInfo();
  assert.equal(
    after.find((t) => t.active).id,
    prevId,
    "previous-from-last should land on the tab immediately to the left"
  );
});

test("walkTab() covers the full wrap-around matrix on a clean 3-tab strip", async () => {
  // Drop the popup tab so the strip is exactly [a, b, c] and the math is easy
  // to reason about. walkTab is called directly with a known active tab.
  await popup.close();
  await waitFor(async () => (await tabsInfo()).length === 3);

  const setActive = async (q) => {
    await pages[q].bringToFront();
    await waitFor(async () => (await activeUrl())?.endsWith("?" + q));
  };
  const walk = (dir) => sw.evaluate((d) => walkTab(d), dir);

  // forward through the middle
  await setActive("a");
  await walk(1);
  assert.ok((await activeUrl()).endsWith("?b"), "a +1 -> b");

  // forward wrap: last -> first
  await setActive("c");
  await walk(1);
  assert.ok((await activeUrl()).endsWith("?a"), "c +1 -> a (wrap)");

  // backward through the middle
  await setActive("c");
  await walk(-1);
  assert.ok((await activeUrl()).endsWith("?b"), "c -1 -> b");

  // backward wrap: first -> last
  await setActive("a");
  await walk(-1);
  assert.ok((await activeUrl()).endsWith("?c"), "a -1 -> c (wrap)");
});

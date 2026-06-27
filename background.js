// Tab-walking, tmux-style. The picker popup acts like a tmux prefix you can
// keep "held": press Alt+W once, then tap ( / ) to move to the previous/next
// tab without re-pressing the prefix.
//
// Chrome closes the action popup whenever the active tab changes, so we can't
// just switch tabs from the popup and stay open. Instead the popup forwards
// each hop here; we activate the neighbouring tab and immediately re-open the
// popup on it, so the user lands back in the picker ready for the next tap.
chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || !msg.type) return;
  if (msg.type === "walk-tab") walkTab(msg.dir);
  else if (msg.type === "close-tab") closeTab();
  else if (msg.type === "new-tab") newTab();
});

// Re-open the picker on the freshly activated tab. Needs Chrome 127+ and a
// focused window; if it's unavailable the action still happened, the popup just
// won't re-open and the user re-presses Alt+W.
async function reopenPicker() {
  try {
    await chrome.action.openPopup();
  } catch (e) {
    // No-op: the tab action already succeeded.
  }
}

async function walkTab(dir) {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  if (tabs.length < 2) return;

  // Wrap around at the ends, like tmux next-window / previous-window.
  const i = tabs.findIndex((t) => t.active);
  const next = tabs[(i + dir + tabs.length) % tabs.length];
  await chrome.tabs.update(next.id, { active: true });

  await reopenPicker();
}

// q — close the active tab, tmux kill-pane style. Chrome activates a
// neighbour automatically; re-open the picker on it so you can keep closing.
// Closing the last tab closes the window (the truer kill-pane analog); there's
// then no tab to re-open on and reopenPicker()'s catch absorbs that.
async function closeTab() {
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!active) return;
  await chrome.tabs.remove(active.id);
  await reopenPicker();
}

// c — open a fresh tab (becomes active), tmux new-window style.
async function newTab() {
  await chrome.tabs.create({}); // active: true is the default
  await reopenPicker();
}

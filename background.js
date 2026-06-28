// Tab-walking, tmux-style. The picker popup acts like a tmux prefix. Some
// commands are *repeatable* (tmux's `bind -r`): press Alt+W once, then tap ( / )
// to move to the previous/next tab without re-pressing the prefix. Others are
// one-shot: they run and the popup closes.
//
// Chrome closes the action popup whenever the active tab changes, so we can't
// just act from the popup and stay open. Instead the popup forwards each command
// here; we perform it, and *for repeatable commands only* re-open the popup on
// the resulting active tab, so the user lands back in the picker ready to tap again.
const COMMANDS = {
  "walk-tab": (msg) => walkTab(msg.dir),
  "close-tab": closeTab,
  "new-tab": newTab,
};

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || !msg.type) return;
  const run = COMMANDS[msg.type];
  if (!run) return;
  // Perform the action first, then re-open the picker only if the command opted
  // into repeating. The popup tags each message with `repeat` (see popup.js).
  Promise.resolve(run(msg)).then(() => {
    if (msg.repeat) reopenPicker();
  });
});

// Re-open the picker on the freshly activated tab, so a repeatable command can
// be tapped again. Needs Chrome 127+ and a focused window; if it's unavailable
// the action still happened, the popup just won't re-open and the user re-presses
// Alt+W.
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
}

// q — close the active tab, tmux kill-pane style. One-shot: Chrome activates a
// neighbour automatically and the popup closes with the tab change. Closing the
// last tab closes the window (the truer kill-pane analog).
async function closeTab() {
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!active) return;
  await chrome.tabs.remove(active.id);
}

// c — open a fresh tab (becomes active), tmux new-window style. One-shot.
async function newTab() {
  await chrome.tabs.create({}); // active: true is the default
}

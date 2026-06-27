# Colored Background

A small Chrome (Manifest V3) extension that recolors the current page's
foreground/background like a tmux pane. Inspired by these tmux bindings:

```
# Colored panes
bind 0 select-pane -P "default"
bind 1 select-pane -P "bg=color1,fg=color15"
bind 2 select-pane -P "bg=color10,fg=color0"
bind 3 select-pane -P "bg=color11,fg=color0"
bind 4 select-pane -P "bg=color4,fg=color15"
bind 5 select-pane -P "bg=color5,fg=color15"
bind 6 select-pane -P "bg=color6,fg=color15"
bind 7 select-pane -P "bg=color15,fg=color0"
bind 8 select-pane -P "bg=color0,fg=color15"
```

## Usage

1. Open the picker — click the toolbar icon, or press **Alt+W**
   (the tmux-style "prefix").
2. Then press a key:
   - **1**–**8** (or click a swatch) to apply a color; **0** resets.
   - **)** / **(** to move to the next / previous tab.

### Recolor the page

| Key | Colors                 |
|-----|------------------------|
| 0   | default (reset)        |
| 1   | red bg / white fg      |
| 2   | green bg / black fg    |
| 3   | yellow bg / black fg   |
| 4   | blue bg / white fg     |
| 5   | magenta bg / white fg  |
| 6   | cyan bg / white fg     |
| 7   | light: white bg / black fg |
| 8   | dark: black bg / white fg  |

The choice is saved **per-origin** and re-applied on reload/navigation
(handled by `content.js` via `chrome.storage`).

### Move between tabs

| Key | Action            |
|-----|-------------------|
| )   | next tab          |
| (   | previous tab      |

Navigation wraps around at the ends, like tmux's `next-window` /
`previous-window`. After each hop the picker re-opens on the new tab, so you
can keep tapping **)** / **(** to walk across tabs without re-pressing **Alt+W**
(handled by `background.js`).

## Install (unpacked)

1. Visit `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select this directory.
4. (Optional) Set/confirm the shortcut at `chrome://extensions/shortcuts`.

> Note: tabs already open before installing won't have the content script;
> the popup still applies colors instantly to them, but reload them once for
> persistence to kick in. The extension cannot touch restricted pages
> (`chrome://`, the Web Store, etc.).

## Files

- `manifest.json` — MV3 manifest, command, content script.
- `schemes.js` — color palette + CSS builder (shared by popup & content).
- `content.js` — re-applies the saved scheme on page load.
- `popup.js` / `popup.html` / `popup.css` — the 1–8 picker UI; 0 resets.
- `background.js` — service worker for the `(` / `)` tab-navigation bindings.

## Tests

Regression tests for the tab-navigation bindings live in `tests/`. They load
the real unpacked extension into headless Chromium (via Playwright) and drive
the actual `popup.js → background.js → chrome.tabs` chain, plus the wrap-around
math in `walkTab()`.

**Requirements:** Node 18+ and `npm`.

```sh
npm install         # one-time: install dev dependencies (Playwright)
npm run test:setup  # one-time: download the extension-capable Chromium build
npm test            # run the suite
```

Expected output — four passing tests:

```
✔ service worker registers and openPopup() is available
✔ end-to-end: ) in the popup advances to the next tab (wraps last->first)
✔ end-to-end: ( in the popup goes to the previous tab
✔ walkTab() covers the full wrap-around matrix on a clean 3-tab strip
```

> Note: extensions only load in *headless* Chromium through Playwright's
> `channel: "chromium"` build, which is what `npm run test:setup` downloads.
> A regular `npm install` alone is not enough to run the suite headless.

## Customizing colors

Edit the `SCHEMES` map in `schemes.js`. Each entry is `{ name, bg, fg }`
with hex colors; index `0` is `null` (reset).

## Escape hatch (for sites you control)

The themer flattens almost everything to one background + one foreground.
On a site whose HTML you own, you can control theming with:

- `data-colored-bg="off"` — disables theming for this element and its subtree
- `data-colored-bg="on"` — re-enables theming for this element and its subtree

Example:

```html
<body data-colored-bg="off">
  <div class="container" data-colored-bg="on">
    <!-- this container will be themed even though body is off -->
  </div>
</body>
```

This lets you keep the page body in its original colors while theming specific
sections, or vice versa.

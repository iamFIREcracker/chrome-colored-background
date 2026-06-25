# Colored Background

A small Chrome (Manifest V3) extension that recolors the current page's
foreground/background like a tmux pane. Inspired by these tmux bindings:

```
bind 0 select-pane -P "bg=default,fg=default"
bind 1 select-pane -P "bg=color1,fg=color15"
...
```

## Usage

1. Open the picker — click the toolbar icon, or press **Alt+W**
   (the tmux-style "prefix").
2. Press **0**–**7** (or click a swatch) to apply a color.

| Key | Colors                 |
|-----|------------------------|
| 0   | default (reset)        |
| 1   | red bg / white fg      |
| 2   | green bg / black fg    |
| 3   | yellow bg / black fg   |
| 4   | blue bg / white fg     |
| 5   | magenta bg / white fg  |
| 6   | cyan bg / white fg     |
| 7   | reverse OS theme       |

Option **7** follows the OS theme and applies the reverse:
dark OS theme becomes black text on white background; light OS theme becomes
white text on black background.

The choice is saved **per-origin** and re-applied on reload/navigation
(handled by `content.js` via `chrome.storage`).

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
- `popup.js` / `popup.html` / `popup.css` — the 0–6 picker UI.

## Customizing colors

Edit the `SCHEMES` map in `schemes.js`. Each entry is `{ name, bg, fg }`
with hex colors; index `0` is `null` (reset).

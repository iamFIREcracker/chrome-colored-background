// Color schemes mapped from the user's tmux pane bindings + Alacritty palette.
//
//   bind 0 -> bg=default,fg=default          (reset)
//   bind 1 -> bg=color1  fg=color15          red       / bright white
//   bind 2 -> bg=color10 fg=color0           br-green  / black
//   bind 3 -> bg=color11 fg=color0           br-yellow / black
//   bind 4 -> bg=color4  fg=color15          blue      / bright white
//   bind 5 -> bg=color5  fg=color15          magenta   / bright white
//   bind 6 -> bg=color6  fg=color15          cyan      / bright white
//   bind 7 -> bg=color15 fg=color0           light     / black
//   bind 8 -> bg=color0  fg=color15          dark      / bright white
//
// Palette (256-color names -> hex):
//   color0  black         #020202
//   color1  red           #ab0000
//   color4  blue          #3344dd
//   color5  magenta       #8a148a
//   color6  cyan          #008a8a
//   color10 bright green  #3ad63a
//   color11 bright yellow #a7964d
//   color15 bright white  #f4f4f4
(function () {
  const SCHEMES = {
    0: null, // reset to the page's own colors
    1: { name: "red", bg: "#ab0000", fg: "#f4f4f4" },
    2: { name: "green", bg: "#3ad63a", fg: "#020202" },
    3: { name: "yellow", bg: "#a7964d", fg: "#020202" },
    4: { name: "blue", bg: "#3344dd", fg: "#f4f4f4" },
    5: { name: "magenta", bg: "#8a148a", fg: "#f4f4f4" },
    6: { name: "cyan", bg: "#008a8a", fg: "#f4f4f4" },
    7: { name: "light", bg: "#f4f4f4", fg: "#020202" },
    8: { name: "dark", bg: "#020202", fg: "#f4f4f4" },
  };

  const STYLE_ID = "__colored_background_style__";

  // Escape hatch:
  //   data-colored-bg="off" disables theming for this element and its subtree.
  //   data-colored-bg="on" re-enables theming for this element and its subtree.
  //
  // Example:
  //   <body data-colored-bg="off">
  //     <div class="container" data-colored-bg="on">
  const OFF_SELECTOR = `[data-colored-bg="off"]`;
  const ON_SELECTOR = `[data-colored-bg="on"]`;

  const unthemeableElementClauses =
    `:not(html):not(body):not(img):not(video):not(picture):not(canvas):not(iframe):not(svg)`;

  // Build the CSS that paints the page like a terminal pane: one background
  // showing through everywhere, one foreground color for all text.
  function buildCss(scheme) {
    if (!scheme) return "";
    const { bg, fg } = scheme;
    const baseElementSelector = `*${unthemeableElementClauses}`;

    // Normal page theming: active under body, except inside an "off" subtree.
    const bodyElementSelector =
      `${baseElementSelector}:not(${OFF_SELECTOR}):not(${OFF_SELECTOR} *)`;

    // Explicit re-enable: active under an "on" subtree, even if an ancestor is "off".
    const onElementSelector = `${ON_SELECTOR} ${baseElementSelector}`;

    return [
      `body:not(${OFF_SELECTOR}),`,
      `${ON_SELECTOR} {`,
      `  min-height: 100% !important;`,
      `  background: ${bg} !important;`,
      `  color: ${fg} !important;`,
      `}`,
      // Let the page-level background show through every element (terminal-style).
      `body:not(${OFF_SELECTOR}) ${bodyElementSelector},`,
      `body:not(${OFF_SELECTOR}) ${bodyElementSelector}::before,`,
      `body:not(${OFF_SELECTOR}) ${bodyElementSelector}::after,`,
      `${onElementSelector},`,
      `${onElementSelector}::before,`,
      `${onElementSelector}::after {`,
      `  background: transparent !important;`,
      `}`,
      // Force a single foreground color, including links.
      `body:not(${OFF_SELECTOR}) ${bodyElementSelector},`,
      `${ON_SELECTOR},`,
      `${onElementSelector} {`,
      `  color: ${fg} !important;`,
      `}`,
      // Keep form controls readable against the new background.
      `body:not(${OFF_SELECTOR}) ${bodyElementSelector}:is(input, textarea, select, button),`,
      `${ON_SELECTOR}:is(input, textarea, select, button),`,
      `${onElementSelector}:is(input, textarea, select, button) {`,
      `  background-color: rgba(127, 127, 127, 0.2) !important;`,
      `  border-color: ${fg} !important;`,
      `}`,
    ].join("\n");
  }

  const api = { SCHEMES, STYLE_ID, buildCss };
  if (typeof self !== "undefined") self.COLORED_BG = api;
  if (typeof window !== "undefined") window.COLORED_BG = api;
})();

// Re-apply the saved color scheme for this origin on every page load, so the
// chosen color survives reloads and navigation (matching tmux, where a pane
// keeps its color). Runs at document_start in every frame.
(function () {
  const { SCHEMES, STYLE_ID, buildCss } = self.COLORED_BG;

  function setStyle(css) {
    let el = document.getElementById(STYLE_ID);
    if (!css) {
      if (el) el.remove();
      return;
    }
    if (!el) {
      el = document.createElement("style");
      el.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(el);
    }
    el.textContent = css;
  }

  const key = "scheme:" + location.origin;
  let activeIdx = null;

  function applyScheme(idx) {
    activeIdx = idx;
    const scheme = idx == null ? null : SCHEMES[idx];
    setStyle(buildCss(scheme));
  }

  chrome.storage.local.get(key, (data) => {
    const idx = data[key];
    if (idx === undefined || idx === null) return;
    applyScheme(idx);
  });

  // React live if the popup changes the scheme for this origin.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !(key in changes)) return;
    applyScheme(changes[key].newValue);
  });

  // If option 7 is active, re-resolve it when the OS theme changes.
  if (typeof matchMedia === "function") {
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (Number(activeIdx) === 7) applyScheme(activeIdx);
    });
  }
})();

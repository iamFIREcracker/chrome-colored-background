// Re-apply the saved color scheme for this origin on every page load, so the
// chosen color survives reloads and navigation (matching tmux, where a pane
// keeps its color). Runs at document_start in every frame.
(function () {
  const { STYLE_ID, buildCss } = self.COLORED_BG;

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
  chrome.storage.local.get(key, (data) => {
    const idx = data[key];
    if (idx === undefined || idx === null) return;
    const scheme = self.COLORED_BG.SCHEMES[idx];
    if (scheme) setStyle(buildCss(scheme));
  });

  // React live if the popup changes the scheme for this origin.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !(key in changes)) return;
    const idx = changes[key].newValue;
    const scheme = idx == null ? null : self.COLORED_BG.SCHEMES[idx];
    setStyle(buildCss(scheme));
  });
})();

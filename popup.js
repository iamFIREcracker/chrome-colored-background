// Popup: a tmux-style picker. Open it (toolbar click or Alt+W), then
// press 0-6 (or click a swatch) to recolor the current page.
(function () {
  const { SCHEMES, STYLE_ID, buildCss } = window.COLORED_BG;

  let tab = null;
  let originKey = null;

  // Injected into the page world to add/update/remove the <style> element.
  function setPageStyle(css, id) {
    let el = document.getElementById(id);
    if (!css) {
      if (el) el.remove();
      return;
    }
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      (document.head || document.documentElement).appendChild(el);
    }
    el.textContent = css;
  }

  async function getActiveTab() {
    const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
    return t;
  }

  async function apply(idx) {
    const scheme = SCHEMES[idx];
    const css = buildCss(scheme);

    // Instant apply to the active tab (covers tabs loaded before install).
    if (!tab) {
      setStatus("No active tab.", true);
    } else if (/^(chrome|edge|about|chrome-extension|devtools):/.test(tab.url || "")) {
      setStatus("Can't recolor this page (browser/internal URL).", true);
    } else {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          func: setPageStyle,
          args: [css, STYLE_ID],
        });
        setStatus("");
      } catch (e) {
        const msg = String(e && e.message ? e.message : e);
        if (/file/i.test(tab.url || "")) {
          setStatus(
            "Blocked. For file:// pages, enable “Allow access to file URLs” " +
              "on chrome://extensions, then reload the page.",
            true
          );
        } else {
          setStatus("Couldn't apply: " + msg, true);
        }
        return;
      }
    }

    // Persist per-origin so it survives reloads (content.js re-applies).
    if (originKey) {
      await chrome.storage.local.set({ [originKey]: idx === 0 ? null : idx });
    }

    markActive(idx);
  }

  function setStatus(msg, isError) {
    const el = document.getElementById("status");
    el.textContent = msg || "";
    el.classList.toggle("error", !!isError);
  }

  function markActive(idx) {
    document.querySelectorAll(".swatch").forEach((el) => {
      el.classList.toggle("active", Number(el.dataset.idx) === Number(idx));
    });
  }

  function buildGrid() {
    const grid = document.getElementById("grid");
    for (let i = 0; i <= 6; i++) {
      const scheme = SCHEMES[i];
      const el = document.createElement("div");
      el.className = "swatch";
      el.dataset.idx = i;
      el.style.background = scheme ? scheme.bg : "#2b2b2b";
      el.style.color = scheme ? scheme.fg : "#f4f4f4";
      el.innerHTML =
        `<span class="num">${i}</span>` +
        `<span class="label">${scheme ? scheme.name : "default"}</span>`;
      el.addEventListener("click", () => apply(i));
      grid.appendChild(el);
    }
  }

  document.addEventListener("keydown", (e) => {
    if (e.key >= "0" && e.key <= "6") {
      e.preventDefault();
      apply(Number(e.key));
    }
  });

  (async function init() {
    buildGrid();
    tab = await getActiveTab();
    try {
      originKey = "scheme:" + new URL(tab.url).origin;
      const data = await chrome.storage.local.get(originKey);
      markActive(data[originKey] ?? 0);
    } catch (e) {
      // tab.url may be unavailable on restricted pages.
    }
  })();
})();

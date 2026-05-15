(() => {
  const storageKey = "mirealyo:color-mode";
  const root = document.documentElement;
  const body = document.body;
  const toggle = document.querySelector("[data-theme-toggle]");
  const label = document.querySelector("[data-theme-toggle-label]");
  const icon = document.querySelector("[data-theme-toggle-icon]");
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const defaultMode = body?.dataset?.defaultColorMode === "dark" ? "dark" : "light";

  const getStoredMode = () => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      return stored === "dark" || stored === "light" ? stored : null;
    } catch (_error) {
      return null;
    }
  };

  const applyMode = (mode) => {
    const resolved = mode === "dark" ? "dark" : "light";
    root.setAttribute("data-color-mode", resolved);

    if (themeMeta) {
      themeMeta.setAttribute("content", resolved === "dark" ? "#0b1320" : "#f5fbff");
    }

    if (toggle) {
      toggle.setAttribute("aria-pressed", String(resolved === "dark"));
    }

    if (label) {
      label.textContent = resolved === "dark" ? "Oscuro" : "Claro";
    }

    if (icon) {
      icon.textContent = resolved === "dark" ? "🌙" : "☀";
    }
  };

  const persistMode = (mode) => {
    try {
      window.localStorage.setItem(storageKey, mode);
    } catch (_error) {
      // Ignore storage write failures.
    }
  };

  const currentMode = getStoredMode() ?? defaultMode;
  applyMode(currentMode);

  if (!toggle) {
    return;
  }

  toggle.addEventListener("click", () => {
    const nextMode = root.getAttribute("data-color-mode") === "dark" ? "light" : "dark";
    applyMode(nextMode);
    persistMode(nextMode);
  });
})();

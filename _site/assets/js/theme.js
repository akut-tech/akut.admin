/* Akut Admin — light/dark theme toggle.
 * Loaded synchronously in <head> so the saved theme is applied before first
 * paint (no flash). Persists the choice in localStorage. */
(function () {
  "use strict";

  var KEY = "akut.theme";

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  // "light" is opt-in; anything else (incl. null) stays on the default dark theme.
  function get() { return stored() === "light" ? "light" : "dark"; }

  function apply(theme) {
    var root = document.documentElement;
    if (theme === "light") root.setAttribute("data-theme", "light");
    else root.removeAttribute("data-theme");
  }

  function label(key, fallback) {
    return window.t ? window.t(key) : fallback;
  }

  function updateButtons() {
    var light = get() === "light";
    var btns = document.querySelectorAll("[data-theme-toggle]");
    for (var i = 0; i < btns.length; i++) {
      var btn = btns[i];
      btn.setAttribute("aria-pressed", String(light));
      // Show the action the click performs (switch to the *other* theme).
      var icon = btn.querySelector(".theme-icon");
      if (icon) icon.textContent = light ? "🌙" : "☀️";
      var text = btn.querySelector(".theme-label");
      if (text) {
        text.textContent = light
          ? label("theme.dark", "Dark")
          : label("theme.light", "Light");
      }
    }
  }

  function set(theme) {
    try { localStorage.setItem(KEY, theme); } catch (e) { /* ignore */ }
    apply(theme);
    updateButtons();
  }

  function toggle() { set(get() === "light" ? "dark" : "light"); }

  // Apply immediately at parse time to avoid a flash of the wrong theme.
  apply(get());

  document.addEventListener("DOMContentLoaded", function () {
    updateButtons();
    var btns = document.querySelectorAll("[data-theme-toggle]");
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", toggle);
    }
  });

  // Keep labels in sync if the language changes after load.
  document.addEventListener("akut:langchange", updateButtons);

  window.AkutTheme = { get: get, set: set, toggle: toggle };
})();

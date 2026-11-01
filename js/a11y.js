/*
  Accessibility version (A-08). Load in <head> without defer so the saved mode applies before first paint.
  State lives on <html>: class "a11y" + data-a11y-size (1|2|3), data-a11y-scheme (white|black|blue),
  data-a11y-images (on|off). tokens.css turns these into font sizes and colors.
  Controls (rendered by js/layout.js, any page may add more):
    [data-a11y-toggle]                                   switch the mode on/off
    [data-a11y-option="size|scheme|images"][data-a11y-value="…"]  change one setting
  JS API: Sihat.a11y.enable(), .disable(), .toggle(), .set(option, value), .state()
  Saved in localStorage per browser (a convenience; the page works without it).
*/
(function () {
  "use strict";

  var KEY = "sihat-a11y";
  var root = document.documentElement;
  var DEFAULTS = { on: false, size: "1", scheme: "white", images: "on" };
  var state = load();

  function load() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { s = {}; }
    var out = {};
    for (var k in DEFAULTS) out[k] = s[k] !== undefined ? s[k] : DEFAULTS[k];
    return out;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage blocked: mode still works */ }
  }

  function apply() {
    root.classList.toggle("a11y", !!state.on);
    if (state.on) {
      root.setAttribute("data-a11y-size", state.size);
      root.setAttribute("data-a11y-scheme", state.scheme);
      root.setAttribute("data-a11y-images", state.images);
    } else {
      root.removeAttribute("data-a11y-size");
      root.removeAttribute("data-a11y-scheme");
      root.removeAttribute("data-a11y-images");
    }
    sync();
  }

  function sync() {
    if (!document.body) return;
    Array.prototype.forEach.call(document.querySelectorAll("[data-a11y-toggle][aria-pressed]"), function (b) {
      b.setAttribute("aria-pressed", String(!!state.on));
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-a11y-option]"), function (b) {
      var opt = b.getAttribute("data-a11y-option");
      b.setAttribute("aria-pressed", String(state[opt] === b.getAttribute("data-a11y-value")));
    });
  }

  var api = {
    state: function () { return JSON.parse(JSON.stringify(state)); },
    enable: function () { state.on = true; save(); apply(); },
    disable: function () { state.on = false; save(); apply(); },
    toggle: function () { state.on ? api.disable() : api.enable(); },
    set: function (option, value) {
      if (!(option in DEFAULTS) || option === "on") return;
      state[option] = String(value);
      save();
      apply();
    }
  };

  window.Sihat = window.Sihat || {};
  window.Sihat.a11y = api;
  apply();

  document.addEventListener("click", function (e) {
    var toggle = e.target.closest("[data-a11y-toggle]");
    if (toggle) {
      var wasOn = state.on;
      // Leave the mobile menu so the panel (or the normal page) is visible.
      var dialog = toggle.closest("dialog[open]");
      if (dialog) dialog.close();
      api.toggle();
      var panel = document.getElementById("a11y-panel");
      if (!wasOn && panel) {
        window.scrollTo(0, 0);
        panel.focus();
      }
      return;
    }
    var opt = e.target.closest("[data-a11y-option]");
    if (opt) api.set(opt.getAttribute("data-a11y-option"), opt.getAttribute("data-a11y-value"));
  });

  // Controls are rendered after this file runs; sync their pressed state once they exist.
  document.addEventListener("sihat:layout", sync);
  document.addEventListener("DOMContentLoaded", sync);
})();

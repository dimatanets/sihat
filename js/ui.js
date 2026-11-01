/*
  UI behaviour: modal / bottom sheet, mobile menu, anchor navigation.
  Everything uses event delegation, so markup rendered later (js/layout.js) works too.

  Modal / bottom sheet (native <dialog class="modal">; on screens below 768px CSS turns it into a bottom sheet):
    open:  <button data-modal-open="modal-id">   or  Sihat.modal.open("modal-id" | element, openerElement)
    close: <button data-modal-close>              or  Sihat.modal.close("modal-id" | element), Esc, click on the backdrop
    Focus returns to the opener. Events on the dialog: "modal:open", "modal:close".
  Mobile menu: <dialog class="mnav" id="site-menu">, opened by [data-menu-open]; closes itself on desktop widths.
  Anchor navigation: <nav data-anchor-nav> with links to #ids; the link of the section in view gets aria-current="true".
  Accordion: native <details>/<summary>, no JS.
*/
(function () {
  "use strict";

  window.Sihat = window.Sihat || {};

  function resolve(target) {
    return typeof target === "string" ? document.getElementById(target) : target;
  }

  var modal = {
    open: function (target, opener) {
      var dialog = resolve(target);
      if (!dialog || dialog.open) return;
      // Only one dialog at a time: opening from the mobile menu closes the menu first.
      var openDialog = document.querySelector("dialog[open]");
      if (openDialog) {
        opener = openDialog._opener || opener;
        openDialog.close();
      }
      dialog._opener = opener || document.activeElement;
      dialog.showModal();
      dialog.dispatchEvent(new CustomEvent("modal:open", { bubbles: true }));
    },
    close: function (target) {
      var dialog = resolve(target);
      if (dialog && dialog.open) dialog.close();
    }
  };
  window.Sihat.modal = modal;

  document.addEventListener("click", function (e) {
    var opener = e.target.closest("[data-modal-open]");
    if (opener) {
      e.preventDefault();
      modal.open(opener.getAttribute("data-modal-open"), opener);
      return;
    }
    var menuBtn = e.target.closest("[data-menu-open]");
    if (menuBtn) {
      modal.open(menuBtn.getAttribute("aria-controls") || "site-menu", menuBtn);
      menuBtn.setAttribute("aria-expanded", "true");
      return;
    }
    var closer = e.target.closest("[data-modal-close]");
    if (closer) {
      modal.close(closer.closest("dialog"));
      return;
    }
    // Click on the backdrop of a .modal (the dialog element itself, outside its box).
    if (e.target.matches && e.target.matches("dialog.modal[open]")) {
      var r = e.target.getBoundingClientRect();
      var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) modal.close(e.target);
    }
  });

  // Restore focus and state on every close (button, Esc or backdrop).
  document.addEventListener("close", function (e) {
    var dialog = e.target;
    if (!dialog || dialog.tagName !== "DIALOG") return;
    Array.prototype.forEach.call(document.querySelectorAll('[data-menu-open][aria-controls="' + dialog.id + '"]'), function (b) {
      b.setAttribute("aria-expanded", "false");
    });
    var opener = dialog._opener;
    dialog._opener = null;
    if (opener && document.contains(opener) && opener.offsetParent !== null) opener.focus();
    dialog.dispatchEvent(new CustomEvent("modal:close", { bubbles: true }));
  }, true);

  // The mobile menu has no meaning on desktop widths.
  var desktop = window.matchMedia("(min-width: 1100px)");
  function closeMenuOnDesktop() {
    if (desktop.matches) modal.close("site-menu");
  }
  if (desktop.addEventListener) desktop.addEventListener("change", closeMenuOnDesktop);

  // ---- Anchor navigation ----
  function initAnchorNav(nav) {
    if (nav._anchorNav) return;
    nav._anchorNav = true;
    var list = nav.querySelector(".anchor-nav__list") || nav;
    var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
    var map = new Map();
    links.forEach(function (a) {
      var section = document.getElementById(decodeURIComponent(a.getAttribute("href").slice(1)));
      if (section) map.set(section, a);
    });
    if (!map.size || !("IntersectionObserver" in window)) return;

    function setCurrent(link) {
      links.forEach(function (a) { a.removeAttribute("aria-current"); });
      if (!link) return;
      link.setAttribute("aria-current", "true");
      // Keep the active pill visible in the horizontal list without moving the page.
      var left = link.offsetLeft - list.clientWidth / 2 + link.clientWidth / 2;
      list.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
    }

    var visible = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) visible.add(en.target); else visible.delete(en.target);
      });
      // The first section (in document order) that is in the reading zone wins.
      var first = null;
      map.forEach(function (link, section) {
        if (!first && visible.has(section)) first = link;
      });
      if (first) setCurrent(first);
    }, { rootMargin: "-20% 0px -60% 0px" });
    map.forEach(function (link, section) { io.observe(section); });
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-anchor-nav]"), initAnchorNav);
  }
  window.Sihat.anchorNav = { init: init };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

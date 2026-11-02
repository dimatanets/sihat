/*
  UI behaviour: mobile menu, in-page links, anchor navigation.
  Everything uses event delegation, so markup rendered later (js/layout.js) works too.

  Mobile menu: <dialog class="mnav" id="site-menu">, opened by [data-menu-open], closed by [data-modal-close] and Esc;
    closes itself on desktop widths and when a link inside it leads to a part of this page. Focus returns to the opener.
  Links that do nothing yet: <a href="#" data-inert> (A-08).
  Anchor navigation: <nav data-anchor-nav> with links to #ids; the link of the section in view gets aria-current="true".
  Accordion: native <details>/<summary>, no JS.
  Scroller (horizontal card row): <div class="scroller__track" id="track-id" data-scroller tabindex="0" role="region"
    aria-label="…"><ul class="scroller__list">…</ul></div> with buttons anywhere on the page:
    <button data-scroller-prev="track-id"> / <button data-scroller-next="track-id">. Buttons scroll by one view and
    get aria-disabled="true" at the ends. Swipe, trackpad and arrow keys (track is focusable) work natively.
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
      dialog._opener = opener || document.activeElement;
      dialog.showModal();
    },
    close: function (target) {
      var dialog = resolve(target);
      if (dialog && dialog.open) dialog.close();
    }
  };
  window.Sihat.modal = modal;

  document.addEventListener("click", function (e) {
    var inert = e.target.closest("[data-inert]");
    if (inert) {
      e.preventDefault();
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
    // «Записаться» in the menu: close it, the browser then scrolls to the form. Focus must not jump back to the menu button.
    var inPage = e.target.closest('dialog a[href^="#"]:not([href="#"])');
    if (inPage) {
      var dialog = inPage.closest("dialog");
      dialog._opener = null;
      dialog.close();
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
      list.scrollTo({ left: Math.max(0, left), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
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

  // ---- Scroller ----
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  function initScroller(track) {
    if (track._scroller || !track.id) return;
    track._scroller = true;
    var prev = document.querySelectorAll('[data-scroller-prev="' + track.id + '"]');
    var next = document.querySelectorAll('[data-scroller-next="' + track.id + '"]');
    function set(btns, off) {
      Array.prototype.forEach.call(btns, function (b) {
        if (off) b.setAttribute("aria-disabled", "true"); else b.removeAttribute("aria-disabled");
      });
    }
    function update() {
      var max = track.scrollWidth - track.clientWidth;
      set(prev, track.scrollLeft <= 1);
      set(next, track.scrollLeft >= max - 1);
    }
    function go(dir) {
      track.scrollBy({ left: dir * track.clientWidth, behavior: reduceMotion.matches ? "auto" : "smooth" });
    }
    Array.prototype.forEach.call(prev, function (b) { b.setAttribute("aria-controls", track.id); b.addEventListener("click", function () { go(-1); }); });
    Array.prototype.forEach.call(next, function (b) { b.setAttribute("aria-controls", track.id); b.addEventListener("click", function () { go(1); }); });
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-anchor-nav]"), initAnchorNav);
    Array.prototype.forEach.call(document.querySelectorAll("[data-scroller]"), initScroller);
  }
  window.Sihat.anchorNav = { init: init };
  window.Sihat.scroller = { init: initScroller };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

/*
  Direction page (direction.html): fills the [data-dir-…] slots from data/direction-pages.js.
  Stage 1 has one direction, «Чек-ап программы» (A-02, A-27).
  Load after js/render.js (the doctor cards are rendered with Sihat.render) and before js/ui.js (scroller, anchor nav).

  Services list (data/services.js, filtered by direction): a plain .service-list. The long list of A-28 (search, chips,
  groups) stays as a component on kit.html; its behaviour was removed with «Анализы», see js/direction.js at tag answers-1.
  Row button: «Записаться» leads to the contact form at the end of the page (round 1).
  JS: Sihat.direction.page (the current entry), Sihat.direction.serviceRow(service, heading).
*/
(function () {
  "use strict";

  var PAGES = window.SIHAT_DIRECTION_PAGES || {};
  var SERVICES = window.SIHAT_SERVICES || [];
  var root = document.querySelector("main.direction");
  if (!root) return;

  var P = PAGES.checkup; // A-27
  var services = SERVICES.filter(function (s) { return s.direction === P.direction; });

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function icon(name, extra) {
    return '<span class="icon icon--' + name + (extra ? " " + extra : "") + '" aria-hidden="true"></span>';
  }
  function rub(n) { return Number(n).toLocaleString("ru-RU") + " ₽"; }
  function slot(name) { return root.querySelector("[data-dir-" + name + "]"); }

  /* ---- texts ---- */
  document.title = P.title + " — Сихат РКБ (макет)";
  Array.prototype.forEach.call(root.querySelectorAll("[data-dir-text]"), function (el) {
    var v = P[el.getAttribute("data-dir-text")];
    if (v) el.textContent = v; else if (el.tagName === "P") el.hidden = true;
  });

  slot("facts").innerHTML = P.facts.map(function (f) { return '<li class="badge badge--outline">' + esc(f) + "</li>"; }).join("");
  // A-07: decorative image, the title is next to it
  var headMedia = slot("media");
  if (P.image) {
    headMedia.classList.remove("media--placeholder");
    headMedia.removeAttribute("role");
    headMedia.removeAttribute("aria-label");
    headMedia.innerHTML = '<img src="' + esc(P.image) + '" alt="">';
  } else {
    headMedia.innerHTML = icon(P.icon);
  }

  slot("about").innerHTML = P.about.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
  var inc = slot("includes");
  if (P.includes && P.includes.length) {
    inc.innerHTML = '<h3 class="about__aside-title" id="about-includes-title">' + esc(P.includesTitle) + "</h3>" +
      '<ul class="checklist checklist--1col">' + P.includes.map(function (t) {
        return '<li class="checklist__item"><span class="checklist__icon">' + icon("check") + "</span><span>" + esc(t) + "</span></li>";
      }).join("") + "</ul>";
  } else {
    inc.remove();
    root.querySelector(".about").classList.add("about--single");
  }
  var FEATURE_ICONS = ["certificate", "user", "clock"];
  slot("features").innerHTML = P.features.map(function (f, i) {
    return '<li class="feature"><span class="feature__icon">' + icon(FEATURE_ICONS[i % 3]) + "</span>" +
      '<h3 class="feature__title">' + esc(f.title) + '</h3><p class="feature__text">' + esc(f.text) + "</p></li>";
  }).join("");

  slot("steps").innerHTML = P.steps.map(function (s) {
    return '<li class="steps__item"><h3 class="steps__title">' + esc(s.title) + '</h3><p class="steps__text">' + esc(s.text) + "</p></li>";
  }).join("");

  var pl = slot("pricelist");
  pl.href = P.priceList.href;
  root.querySelector("[data-dir-pricelist-label]").textContent = "Скачать полный прайс-лист (" + P.priceList.meta + ")";

  slot("documents").innerHTML = P.documents.map(function (d) {
    return '<li class="doc-row"><span class="doc-row__icon">' + icon("file-type-" + d.type) + "</span>" +
      '<div class="doc-row__body"><a class="doc-row__link" href="' + esc(d.href) + '" download>' + esc(d.title) + "</a>" +
      '<p class="doc-row__meta">' + esc(d.meta) + "</p></div>" +
      '<span class="doc-row__action" aria-hidden="true">' + icon("download") + '<span class="doc-row__action-text">Скачать</span></span></li>';
  }).join("");

  slot("bring").innerHTML = P.bring.map(function (b) {
    return '<li class="checklist__item"><span class="checklist__icon">' + icon("check") + "</span><span>" + esc(b.text) +
      (b.note ? '<span class="checklist__note">' + esc(b.note) + "</span>" : "") + "</span></li>";
  }).join("");

  // A-48: the shared contact form opens with the direction of this page.
  var option = Array.prototype.filter.call(document.querySelectorAll("#cf-direction option"), function (o) { return o.textContent === P.title; })[0];
  if (option) option.defaultSelected = option.selected = true;

  /* ---- doctors ---- */
  var docs = slot("doctors");
  docs.setAttribute("data-render", "doctors");
  docs.setAttribute("data-filter", "direction:" + P.direction);
  if (window.Sihat && window.Sihat.render) window.Sihat.render.all(root);

  /* ---- services ---- */
  function serviceRow(s, h) {
    return (
      '<li><article class="service-row">' +
      '<div class="service-row__main">' +
      "<" + h + ' class="service-row__title">' + esc(s.title) + "</" + h + ">" +
      (s.text ? '<p class="service-row__text">' + esc(s.text) + "</p>" : "") +
      '<p class="service-row__code">Код услуги ' + esc(s.code) + "</p></div>" +
      '<p class="service-row__price"><span class="visually-hidden">Цена: </span>' + rub(s.price) + "</p>" +
      '<div class="service-row__actions">' +
      '<a class="btn btn--primary btn--s" href="#booking">Записаться<span class="visually-hidden">: ' + esc(s.title) + "</span></a>" +
      "</div></article></li>"
    );
  }

  slot("services").innerHTML = '<ul class="service-list">' + services.map(function (s) { return serviceRow(s, "h3"); }).join("") + "</ul>";

  window.Sihat = window.Sihat || {};
  window.Sihat.direction = { page: P, serviceRow: serviceRow };
})();

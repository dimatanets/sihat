/*
  Direction page (direction.html): fills the [data-dir-…] slots from data/direction-pages.js.
  The direction is picked by ?d=checkup | ?d=analyses; an unknown or missing value shows «Чек-ап программы» (A-27).
  Load after js/render.js (the doctor cards are rendered with Sihat.render) and before js/ui.js (scroller, anchor nav).

  Services list (data/services.js, filtered by direction):
    up to SHORT_LIST services: a plain .service-list;
    longer lists (A-28): search by name, code and description, filter chips by group, grouped rows
    (.service-group + .service-row--compact), the first GROUP_LIMIT rows of each group with «Показать все».
  Row buttons: «Записаться» = [data-book data-service], «Оплатить» = [data-pay] (js/booking.js).
  JS: Sihat.direction.page (the current entry), Sihat.direction.serviceRow(service, heading, compact).
*/
(function () {
  "use strict";

  var PAGES = window.SIHAT_DIRECTION_PAGES || {};
  var SERVICES = window.SIHAT_SERVICES || [];
  var root = document.querySelector("main.direction");
  if (!root) return;

  var SHORT_LIST = 8;
  var GROUP_LIMIT = 6;

  var key = new URLSearchParams(location.search).get("d");
  if (!PAGES[key]) key = "checkup"; // A-27
  var P = PAGES[key];
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
  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }
  function services_(n) { return n + " " + plural(n, "услуга", "услуги", "услуг"); }
  function norm(s) { return String(s).toLowerCase().replace(/ё/g, "е"); }
  function slot(name) { return root.querySelector("[data-dir-" + name + "]"); }

  /* ---- texts ---- */
  document.title = P.title + " — Сихат РКБ (макет)";
  Array.prototype.forEach.call(root.querySelectorAll("[data-dir-text]"), function (el) {
    var v = P[el.getAttribute("data-dir-text")];
    if (v) el.textContent = v; else if (el.tagName === "P") el.hidden = true;
  });

  slot("facts").innerHTML = P.facts.map(function (f) { return '<li class="badge badge--outline">' + esc(f) + "</li>"; }).join("");
  slot("media").innerHTML = icon(P.icon);
  slot("book").setAttribute("data-direction", P.direction);

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

  slot("service-options").insertAdjacentHTML("beforeend", services.map(function (s) {
    return '<option value="' + s.id + '">' + esc(s.title) + "</option>";
  }).join(""));

  /* ---- doctors ---- */
  var docs = slot("doctors");
  docs.setAttribute("data-render", "doctors");
  docs.setAttribute("data-filter", "direction:" + P.direction);
  if (window.Sihat && window.Sihat.render) window.Sihat.render.all(root);

  /* ---- services ---- */
  function serviceRow(s, h, compact) {
    return (
      '<li><article class="service-row' + (compact ? " service-row--compact" : "") + '">' +
      '<div class="service-row__main">' +
      "<" + h + ' class="service-row__title">' + esc(s.title) + "</" + h + ">" +
      (s.text ? '<p class="service-row__text">' + esc(s.text) + "</p>" : "") +
      '<p class="service-row__code">Код услуги ' + esc(s.code) + "</p></div>" +
      '<p class="service-row__price"><span class="visually-hidden">Цена: </span>' + rub(s.price) + "</p>" +
      '<div class="service-row__actions">' +
      '<button class="btn btn--primary btn--s" type="button" data-book data-service="' + s.id + '">Записаться<span class="visually-hidden">: ' + esc(s.title) + "</span></button>" +
      '<button class="btn btn--secondary btn--s" type="button" data-pay="' + s.id + '">' + icon("credit-card") + "Оплатить" +
      '<span class="visually-hidden">: ' + esc(s.title) + "</span></button>" +
      "</div></article></li>"
    );
  }

  var box = slot("services");
  if (services.length <= SHORT_LIST) {
    box.innerHTML = '<ul class="service-list">' + services.map(function (s) { return serviceRow(s, "h3", false); }).join("") + "</ul>";
  } else {
    renderLong();
  }

  function renderLong() {
    var groups = [];
    services.forEach(function (s) { if (groups.indexOf(s.group) === -1) groups.push(s.group); });
    function inGroup(g) { return services.filter(function (s) { return s.group === g; }); }

    box.innerHTML =
      '<div class="services__tools">' +
      '<div class="field services__search"><label class="field__label" for="svc-search">Поиск по услугам</label>' +
      '<div class="search">' + icon("search") +
      '<input class="field__control" id="svc-search" type="search" placeholder="Название или код услуги" autocomplete="off" aria-describedby="svc-status"></div></div>' +
      '<fieldset class="filter-chips"><legend class="visually-hidden">Группа услуг</legend><div class="filter-chips__list">' +
      chip("all", "Все", services.length, true) +
      groups.map(function (g, i) { return chip("g" + i, g, inGroup(g).length, false); }).join("") +
      "</div></fieldset>" +
      '<p class="service-list__status" id="svc-status" role="status" aria-live="polite"></p>' +
      "</div>" +
      groups.map(function (g, i) {
        var list = inGroup(g);
        return '<section class="service-group" data-group="g' + i + '" aria-labelledby="svc-g' + i + '">' +
          '<div class="service-group__head"><h3 class="service-group__title" id="svc-g' + i + '">' + esc(g) + "</h3>" +
          '<span class="service-group__count" data-group-count></span></div>' +
          '<ul class="service-list" id="svc-list-g' + i + '">' + list.map(function (s) { return serviceRow(s, "h4", true); }).join("") + "</ul>" +
          (list.length > GROUP_LIMIT
            ? '<div class="service-group__more"><button class="btn btn--ghost btn--s" type="button" data-group-more aria-expanded="false" aria-controls="svc-list-g' + i + '"></button></div>'
            : "") +
          "</section>";
      }).join("") +
      '<div class="empty" data-services-empty hidden><p class="empty__title">Ничего не нашли</p>' +
      '<p class="empty__text">Проверьте написание или поищите по коду услуги. Администратор подскажет по телефону <a class="nowrap" href="tel:+78432312090">+7 (843) 231-20-90</a>.</p>' +
      '<button class="btn btn--secondary btn--s" type="button" data-services-reset>Сбросить поиск</button></div>';

    function chip(value, label, n, checked) {
      var id = "svc-f-" + value;
      return '<label class="slot" for="' + id + '"><input class="slot__input" type="radio" id="' + id + '" name="svc-group" value="' + value + '"' +
        (checked ? " checked" : "") + '><span class="slot__text">' + esc(label) + ' <span class="filter-chips__count">' + n + "</span></span></label>";
    }

    // Index rows once: text to search in.
    var rows = Array.prototype.map.call(box.querySelectorAll(".service-group"), function (sec) {
      var g = groups[+sec.getAttribute("data-group").slice(1)];
      return {
        sec: sec,
        items: Array.prototype.map.call(sec.querySelectorAll(".service-list > li"), function (li, n) {
          var s = inGroup(g)[n];
          return { li: li, text: norm(s.title + " " + s.code + " " + s.text) };
        }),
        more: sec.querySelector("[data-group-more]"),
        count: sec.querySelector("[data-group-count]"),
        open: false
      };
    });
    var search = box.querySelector("#svc-search");
    var status = box.querySelector("#svc-status");
    var empty = box.querySelector("[data-services-empty]");

    function apply() {
      var q = norm(search.value.trim());
      var words = q ? q.split(/\s+/) : [];
      var g = (box.querySelector('input[name="svc-group"]:checked') || {}).value || "all";
      var total = 0;
      rows.forEach(function (r) {
        var groupOn = g === "all" || r.sec.getAttribute("data-group") === g;
        var matched = r.items.filter(function (it) {
          return words.every(function (w) { return it.text.indexOf(w) !== -1; });
        });
        // Collapse long groups only in the default view (all groups, no search).
        var limit = !q && g === "all" && !r.open ? GROUP_LIMIT : Infinity;
        r.items.forEach(function (it) { it.li.hidden = true; });
        matched.forEach(function (it, n) { it.li.hidden = n >= limit; });
        r.sec.hidden = !groupOn || !matched.length;
        r.count.textContent = services_(matched.length);
        if (r.more) {
          var hiddenN = matched.length - Math.min(matched.length, limit);
          r.more.parentNode.hidden = r.sec.hidden || (!r.open && hiddenN <= 0) || !!q || g !== "all";
          r.more.textContent = r.open ? "Свернуть" : "Показать все " + services_(matched.length);
          r.more.setAttribute("aria-expanded", r.open ? "true" : "false");
        }
        if (groupOn) total += matched.length;
      });
      empty.hidden = total > 0;
      status.textContent = q || g !== "all" ? (total ? "Найдено: " + services_(total) : "Ничего не найдено") : "Всего " + services_(total);
    }

    search.addEventListener("input", apply);
    box.addEventListener("change", function (e) {
      if (e.target.name !== "svc-group") return;
      apply();
      // Keep the chosen chip visible in the sideways row on phones.
      e.target.closest(".slot").scrollIntoView({ block: "nearest", inline: "nearest" });
    });
    box.addEventListener("click", function (e) {
      var more = e.target.closest("[data-group-more]");
      if (more) {
        var r = rows.filter(function (x) { return x.more === more; })[0];
        r.open = !r.open;
        apply();
        // After collapsing, keep the group heading in view.
        if (!r.open) r.sec.scrollIntoView({ block: "nearest" });
        return;
      }
      if (e.target.closest("[data-services-reset]")) {
        search.value = "";
        box.querySelector("#svc-f-all").checked = true;
        apply();
        search.focus();
      }
    });
    apply();
  }

  window.Sihat = window.Sihat || {};
  window.Sihat.direction = { page: P, key: key, serviceRow: serviceRow };
})();

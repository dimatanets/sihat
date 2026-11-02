/*
  Renders lists from mock data (data/directions.js, data/doctors.js, data/site.js) into placeholders.
  Plain JS, no network requests. In Bitrix these become component templates (news.list etc.);
  the markup of each card is exactly the one shown on kit.html.

  Placeholders (attributes on the list element):
    <ul data-render="directions" data-filter="home|all" [data-heading="h3"] [data-limit="6"] [data-card-mod="dcard--compact-m"]>
        Direction cards (.dcard); data-card-mod adds modifier classes to each card. "home" = directions with a priority, in priority order (A-21).
    <ul data-render="doctors" data-filter="home|all|direction:<id>" [data-heading="h3"] [data-limit="8"]>
        Doctor cards (.doctor-card). "home" = doctors with a home position, in that order (A-22).
    <select data-render="direction-options">
        Appends one <option> per direction from SIHAT_DATA.directions (the full list of the current site).
  Must load after the data files and before js/ui.js (ui.js sets up scrollers around rendered cards).
  JS: Sihat.render.directionCard(d, heading, mod), Sihat.render.doctorCard(d, heading, mod), Sihat.render.all(root).
*/
(function () {
  "use strict";

  window.Sihat = window.Sihat || {};

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function icon(name, extra) {
    return '<span class="icon icon--' + name + (extra ? " " + extra : "") + '" aria-hidden="true"></span>';
  }
  // A-07: photo if there is one, otherwise a tinted placeholder with an icon.
  function media(cls, image, iconName, alt) {
    if (image) return '<div class="' + cls + ' media"><img src="' + esc(image) + '" alt="' + esc(alt || "") + '" loading="lazy"></div>';
    return '<div class="' + cls + ' media media--placeholder">' + icon(iconName) + "</div>";
  }

  function directionCard(d, h, mod) {
    h = h || "h3";
    return (
      '<article class="dcard' + (mod ? " " + esc(mod) : "") + '">' +
      media("dcard__media", d.image, d.icon || "stethoscope") +
      '<div class="dcard__body">' +
      "<" + h + ' class="dcard__title"><a class="dcard__link" href="' + esc(d.href) + '">' + esc(d.title) + "</a></" + h + ">" +
      '<p class="dcard__text">' + esc(d.text) + "</p>" +
      '<div class="dcard__foot"><span class="dcard__arrow">' + icon("arrow-up-right") + "</span></div>" +
      "</div></article>"
    );
  }

  // R-3, A-37: nearest free date from data/schedule.js and the price of the primary visit from data/services.js.
  function doctorNext(d) {
    var schedule = window.SIHAT_SCHEDULE;
    if (!schedule) return "";
    var near = schedule.nearest(d.id);
    var visit = (window.SIHAT_SERVICES || []).filter(function (s) { return s.booking === "doctor" && s.spec === d.spec; })[0];
    return (
      '<p class="doctor-card__next"><span class="doctor-card__next-date">' + icon("calendar") + "<span>" +
      (near ? "Ближайшая запись: <strong>" + esc(schedule.shortLabel(near)) + "</strong>" : "Запись через администратора") + "</span></span>" +
      (visit ? '<span class="doctor-card__price"><span class="visually-hidden">Цена приёма: </span>' + Number(visit.price).toLocaleString("ru-RU") + " ₽</span>" : "") +
      "</p>"
    );
  }

  function doctorCard(d, h, mod) {
    h = h || "h3";
    return (
      '<article class="doctor-card' + (mod ? " " + esc(mod) : "") + '">' +
      media("doctor-card__media", d.photo, "user", d.name + ", " + d.spec.toLowerCase()) +
      '<div class="doctor-card__body">' +
      '<p class="doctor-card__spec">' + esc(d.spec) + "</p>" +
      "<" + h + ' class="doctor-card__name"><a href="' + esc(d.href) + '">' + esc(d.name) + "</a></" + h + ">" +
      (d.role ? '<p class="doctor-card__role">' + esc(d.role) + "</p>" : "") +
      (d.regalia && d.regalia.length
        ? '<ul class="doctor-card__facts" aria-label="Квалификация">' +
          d.regalia.map(function (r) { return '<li class="badge">' + esc(r) + "</li>"; }).join("") + "</ul>"
        : "") +
      "</div>" +
      doctorNext(d) +
      // Booking with this doctor preselected: js/booking.js starts at the date and time step (A-03).
      '<div class="doctor-card__actions"><button class="btn btn--primary btn--s btn--block" type="button" data-book data-doctor="' + esc(d.id) + '">' +
      'Записаться<span class="visually-hidden"> к врачу: ' + esc(d.name) + "</span></button></div>" +
      "</article>"
    );
  }

  function pick(list, filter, key) {
    filter = filter || "all";
    var out;
    if (filter === "home") {
      out = list.filter(function (x) { return x[key] != null; }).sort(function (a, b) { return a[key] - b[key]; });
    } else if (filter.indexOf("direction:") === 0) {
      var id = filter.slice(10);
      out = list.filter(function (x) { return (x.directions || []).indexOf(id) !== -1; });
    } else {
      out = list.slice();
    }
    return out;
  }

  function fill(el, items, card) {
    var limit = parseInt(el.getAttribute("data-limit"), 10);
    if (limit) items = items.slice(0, limit);
    var h = el.getAttribute("data-heading") || "h3";
    var mod = el.getAttribute("data-card-mod");
    el.innerHTML = items.map(function (x) {
      return "<li>" + card(x, h, mod) + "</li>";
    }).join("");
  }

  var renderers = {
    directions: function (el) {
      fill(el, pick(window.SIHAT_DIRECTIONS || [], el.getAttribute("data-filter"), "priority"), directionCard);
    },
    doctors: function (el) {
      fill(el, pick(window.SIHAT_DOCTORS || [], el.getAttribute("data-filter"), "home"), doctorCard);
    },
    "direction-options": function (el) {
      var names = (window.SIHAT_DATA && window.SIHAT_DATA.directions) || [];
      el.insertAdjacentHTML("beforeend", names.map(function (n) { return "<option>" + esc(n) + "</option>"; }).join(""));
    }
  };

  function all(root) {
    Array.prototype.forEach.call((root || document).querySelectorAll("[data-render]"), function (el) {
      var r = renderers[el.getAttribute("data-render")];
      if (r && !el.hasAttribute("data-rendered")) {
        r(el);
        el.setAttribute("data-rendered", "");
      }
    });
  }

  window.Sihat.render = { directionCard: directionCard, doctorCard: doctorCard, all: all };
  all(document);
})();

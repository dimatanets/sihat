/*
  Renders lists from mock data (data/directions.js, data/doctors.js, data/site.js) into placeholders.
  Plain JS, no network requests. In Bitrix these become component templates (news.list etc.);
  the markup of each card is exactly the one shown on kit.html.

  Placeholders (attributes on the list element):
    <ul data-render="directions" data-filter="home|all" [data-heading="h3"] [data-limit="6"]>
        Direction cards (.dcard); "home" = directions with a priority, in priority order (A-21).
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

  // A-46: photo with a gradient, text on the photo; the arrow is visible on hover and focus only.
  function directionCard(d, h, mod) {
    h = h || "h3";
    return (
      '<article class="dcard dcard--' + esc(d.id) + (mod ? " " + esc(mod) : "") + '">' +
      media("dcard__media dcard__media--" + d.id, d.image, d.icon || "stethoscope") +
      '<div class="dcard__body">' +
      "<" + h + ' class="dcard__title"><a class="dcard__link dcard__link--' + esc(d.id) + '" href="' + esc(d.href) + '">' + esc(d.title) + "</a></" + h + ">" +
      '<p class="dcard__text">' + esc(d.text) + "</p>" +
      "</div>" +
      '<span class="dcard__arrow">' + icon("arrow-up-right") + "</span>" +
      "</article>"
    );
  }

  // A-37: price of the primary visit from data/services.js.
  function doctorPrice(d) {
    var visit = (window.SIHAT_SERVICES || []).filter(function (s) { return s.spec === d.spec; })[0];
    if (!visit) return "";
    return '<p class="doctor-card__price"><span class="visually-hidden">Цена приёма: </span>' + Number(visit.price).toLocaleString("ru-RU") + " ₽</p>";
  }

  // A-67: five filled stars, a numeric value and an optional count, following the reference.
  var ratingSeq = 0;
  // A-69: measure the partial star itself, excluding the empty space between stars.
  var starPoints = [[12, 1.75], [15.09, 8.01], [22, 9.01], [17, 13.89], [18.18, 20.78], [12, 17.53], [5.82, 20.78], [7, 13.89], [2, 9.01], [8.91, 8.01]];
  function polygonArea(points) {
    return Math.abs(points.reduce(function (sum, p, i) {
      var next = points[(i + 1) % points.length];
      return sum + p[0] * next[1] - next[0] * p[1];
    }, 0)) / 2;
  }
  function partialStarWidth(fraction) {
    if (fraction <= 0) return 0;
    if (fraction >= 1) return 24;
    var low = 2, high = 22;
    var targetArea = polygonArea(starPoints) * fraction;
    for (var step = 0; step < 16; step++) {
      var cut = (low + high) / 2;
      var clipped = [];
      starPoints.forEach(function (point, i) {
        var previous = starPoints[(i + starPoints.length - 1) % starPoints.length];
        if ((point[0] <= cut) !== (previous[0] <= cut)) {
          clipped.push([cut, previous[1] + (point[1] - previous[1]) * (cut - previous[0]) / (point[0] - previous[0])]);
        }
        if (point[0] <= cut) clipped.push(point);
      });
      if (polygonArea(clipped) < targetArea) low = cut; else high = cut;
    }
    return (low + high) / 2;
  }
  function ratingMarkup(score, count) {
    var value = Math.max(0, Math.min(5, parseFloat(String(score).replace(",", ".")) || 0));
    var label = value.toFixed(1).replace(".", ",");
    var clip = "rating-clip-" + (++ratingSeq);
    // Fractional scores fill the corresponding area of the last star, rather than almost all of its bounding box.
    var path = "M12 1.75l3.09 6.26L22 9.01l-5 4.88 1.18 6.89L12 17.53l-6.18 3.25L7 13.89 2 9.01l6.91-1z";
    var clipWidth = Math.floor(value) * 24 + partialStarWidth(value % 1);
    var stars = [0, 24, 48, 72, 96].map(function (x) { return '<path d="' + path + '" transform="translate(' + x + ')"></path>'; }).join("");
    var countText = "";
    if (count != null) {
      var n = count % 100;
      var word = n >= 11 && n <= 14 ? "оценок" : n % 10 === 1 ? "оценка" : n % 10 >= 2 && n % 10 <= 4 ? "оценки" : "оценок";
      countText = count + " " + word;
    }
    return '<span class="rating" role="img" aria-label="Рейтинг ' + label + ' из 5' + (countText ? ', ' + countText : '') + '"><span class="rating__score"><svg class="rating__stars" viewBox="0 0 120 24" aria-hidden="true" focusable="false"><defs><clipPath id="' + clip + '"><rect width="' + clipWidth + '" height="24"></rect></clipPath></defs><g class="rating__track">' + stars + '</g><g class="rating__fill" clip-path="url(#' + clip + ')">' + stars + '</g></svg><span class="rating__value">' + label + '</span></span>' + (countText ? '<span class="rating__count">' + countText + '</span>' : '') + '</span>';
  }

  // A-61, A-68: prototype figures; implementation notes belong in project docs, not in the design.
  function rating(d) {
    var r = window.SIHAT_HOME && window.SIHAT_HOME.ratings[d.id];
    if (!r) return "";
    return '<p class="doctor-card__rating">' + ratingMarkup(r.score, r.count) + '</p>';
  }

  function doctorCard(d, h, mod) {
    h = h || "h3";
    return (
      '<article class="doctor-card' + (mod ? " " + esc(mod) : "") + '">' +
      media("doctor-card__media", d.photo, "user", d.name + ", " + d.spec.toLowerCase()) +
      '<div class="doctor-card__body">' + rating(d) +
      "<" + h + ' class="doctor-card__name"><a href="' + esc(d.href) + '">' + esc(d.name) + "</a></" + h + ">" +
      (d.role ? '<p class="doctor-card__role">' + esc(d.role) + "</p>" : "") +
      "</div>" +
      '<div class="doctor-card__foot">' + doctorPrice(d) +
      // «Записаться» leads to the contact form of this page (round 1).
      '<a class="btn btn--primary btn--s" href="#booking">Записаться<span class="visually-hidden"> к врачу: ' + esc(d.name) + "</span></a></div>" +
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

  window.Sihat.render = { directionCard: directionCard, doctorCard: doctorCard, rating: ratingMarkup, all: all };
  all(document);
  Array.prototype.forEach.call(document.querySelectorAll("[data-rating-example]"), function (el) {
    el.innerHTML = ratingMarkup(el.getAttribute("data-rating-example"));
  });
})();

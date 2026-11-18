/* A-60…A-71: home content, patient information and a local map screenshot. */
(function () {
  "use strict";
  var D = window.SIHAT_HOME;
  var R = window.Sihat && window.Sihat.render;
  if (!D || !R || document.body.getAttribute("data-page") !== "home") return;
  function esc(s) { return String(s).replace(/[&<>\"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function icon(name) { return '<span class="icon icon--' + name + '" aria-hidden="true"></span>'; }
  // Same Tabler paths as assets/icons; inline SVG keeps the stroke fixed when resized.
  var patientIconPaths = {
    "file-type-doc": '<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4"/><path d="M5 15v6h1a2 2 0 0 0 2 -2v-2a2 2 0 0 0 -2 -2h-1"/><path d="M20 16.5a1.5 1.5 0 0 0 -3 0v3a1.5 1.5 0 0 0 3 0"/><path d="M12.5 15a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1 -3 0v-3a1.5 1.5 0 0 1 1.5 -1.5"/>',
    "baby-carriage": '<path d="M8 19m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M18 19m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M2 5h2.5l1.632 4.897a6 6 0 0 0 5.693 4.103h2.675a5.5 5.5 0 0 0 0 -11h-.5v6"/><path d="M6 9h14"/><path d="M9 17l1 -3"/><path d="M16 14l1 3"/>',
    "certificate": '<path d="M12 15a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M13 17.5v4.5l2 -1.5l2 1.5v-4.5"/><path d="M10 19h-5a2 2 0 0 1 -2 -2v-10c0 -1.1 .9 -2 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -1 1.73"/><path d="M6 9l12 0"/><path d="M6 12l3 0"/><path d="M6 15l2 0"/>',
    "first-aid-kit": '<path d="M8 8v-2a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v2"/><path d="M4 8m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z"/><path d="M10 14h4"/><path d="M12 12v4"/>'
  };
  function patientIcon(name) { return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + patientIconPaths[name] + '</svg>'; }
  document.querySelector('[data-home="patients"]').innerHTML = D.patients.map(function (p) {
    return '<li><a class="patient-card" href="patients.html#' + p.detail + '">' + patientIcon(p.icon) + '<span class="patient-card__body"><span class="patient-card__title">' + esc(p.title) + '</span><span class="patient-card__text">' + esc(p.text) + '</span></span></a></li>';
  }).join("");
  // Side copies keep neighboring fragments visible across the existing cyclic row.
  // Render each rating afresh so its SVG clip ID stays unique; copies are hidden from assistive technology.
  document.querySelector('[data-home="reviews"]').innerHTML = [true, false, true].map(function (copy) {
    return D.reviews.map(function (r, i) {
      var doctor = window.SIHAT_DOCTORS.filter(function (d) { return d.id === r.doctor; })[0];
      return '<li data-review-index="' + i + '"' + (copy ? ' data-scroller-copy aria-hidden="true" inert' : '') + '><article class="review-card"><div class="review-card__top"><div class="review-card__author"><h3 class="review-card__name">' + esc(r.name) + '</h3>' + R.rating(r.score) + '<p class="review-card__date">' + esc(r.date) + '</p></div></div><p class="review-card__quote">«' + esc(r.text) + '»</p><div class="review-card__doctor"><img src="' + doctor.photo + '" alt="" width="48" height="48" loading="lazy"><div><p class="review-card__caption">Лечащий врач</p><p class="review-card__doctor-name">' + esc(doctor.name) + '</p></div></div></article></li>';
    }).join("");
  }).join("");
  document.querySelector('[data-home="documents"]').innerHTML = D.documents.map(function (d) {
    return '<li class="clinic-document"><span class="clinic-document__icon">' + icon("file-type-" + d.type) + '</span><div class="clinic-document__body"><h3 class="clinic-document__title">' + (d.href ? '<a href="' + esc(d.href) + '" target="_blank" rel="noopener">' + esc(d.title) + '</a>' : '<span>' + esc(d.title) + '</span>') + '</h3><p class="clinic-document__meta">PDF</p></div>' + (d.href ? '<a class="btn btn--ghost btn--s btn--icon" href="' + esc(d.href) + '" target="_blank" rel="noopener" aria-label="Открыть PDF: ' + esc(d.title) + '">' + icon("download") + '</a>' : '<span class="btn btn--ghost btn--s btn--icon" aria-hidden="true">' + icon("download") + '</span>') + '</li>';
  }).join("");
})();

/* A-63: local destinations for the four patient tiles, awaiting the clinic's full copy. */
(function () {
  "use strict";
  var root = document.querySelector("[data-patient-articles]");
  if (!root) return;
  root.innerHTML = window.SIHAT_HOME.patients.map(function (p) {
    return '<article class="patient-article" id="' + p.detail + '"><span class="icon icon--' + p.icon + '" aria-hidden="true"></span><h2>' + p.title + '</h2><p>' + p.body + '</p><a class="link-arrow" href="#booking">Задать вопрос<span class="icon icon--arrow-right" aria-hidden="true"></span></a></article>';
  }).join("");
  var target = document.getElementById(location.hash.slice(1));
  if (target) target.scrollIntoView();
})();

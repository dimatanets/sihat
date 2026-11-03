/*
  Shared layout: header, mobile menu, contact form and footer.
  Every «Записаться» here is a link to the contact form on the same page, #booking (round 1, A-16).
  A-11: one source for every page without network requests. Each page has placeholders:
    <div data-include="header"><noscript>…fallback…</noscript></div>
    <div data-include="contact"></div>
    <div data-include="footer"><noscript>…fallback…</noscript></div>
  and loads, at the end of <body>: data/site.js, data/directions.js, data/doctors.js, data/services.js, js/layout.js,
  js/render.js, js/ui.js, js/forms.js.
  The placeholder is replaced by the markup below. The current page is marked from <body data-page="…">.
  For Bitrix: each function below returns the exact HTML of one template part (header.php / footer.php, the form component).
*/
(function () {
  "use strict";

  var D = window.SIHAT_DATA;
  if (!D) return;
  var page = document.body.getAttribute("data-page") || "";

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function icon(name, extra) {
    return '<span class="icon icon--' + name + (extra ? " " + extra : "") + '" aria-hidden="true"></span>';
  }
  function current(link) {
    if (!link.page || link.page !== page) return "";
    return ' aria-current="page"';
  }
  var mainPhone = D.phones[0];

  // Answer 1: the original logo from the header of rkb-sihat.ru (same as assets/img/logo-sihat.svg), inline so that
  // its two colors come from tokens: inverse on the blue menu.
  var LOGO =
    '<svg class="logo__svg" viewBox="0 0 161 58" aria-hidden="true" focusable="false"><g class="logo__main">' +
    '<path d="M0.34375 24.709V54.254C0.34375 55.9201 1.47226 57.2755 2.86551 57.2755H41.5183V51.1909H5.44343V27.6535H41.5183V21.6875H2.86551C1.47226 21.6875 0.34375 23.0396 0.34375 24.709Z"/>' +
    '<path d="M48.582 33.7578V57.2407H53.4223L63.5869 42.7261V57.2407H68.2641V33.7578H63.5869L53.6657 47.6989V33.7578H48.582Z"/>' +
    '<path d="M73.4219 33.7578L90.1382 57.2407H96.2354L79.3532 33.7578H73.4219Z"/>' +
    '<path d="M96.2354 33.7578L79.519 57.2407H73.4219L90.304 33.7578H96.2354Z"/>' +
    '<path d="M128.271 48.8171L123.19 52.0372H104.829V38.5704H122.759L128.271 42.0821V48.8171ZM128.271 33.7578V36.4781L123.045 33.7578H103.291C101.791 33.7578 100.574 35.2157 100.574 37.01V53.9597C100.574 55.7572 101.791 57.2407 103.291 57.2407H123.19L128.271 54.1295V57.2407H133.202V33.7578H128.271Z"/>' +
    '<path d="M137.297 33.7578H160.215V39.4803H150.975V57.2407H146.25V39.4803H137.297V33.7578Z"/>' +
    '</g><g class="logo__accent">' +
    '<path d="M114.234 8.90421H107.164V3.72958H114.234V8.90421ZM103.754 0V20.5319H107.19V12.9446H114.739C116.24 12.9446 117.454 11.4867 117.454 9.68921V3.25537C117.454 1.45787 116.24 0 114.739 0H103.754Z"/>' +
    '<path d="M141.324 12.9798H157.083V16.7799H141.324V12.9798ZM160.343 3.72958V0H137.992V20.5319H157.626C159.126 20.5319 160.343 19.0772 160.343 17.2797V12.3166C160.343 10.5191 159.126 9.06121 157.626 9.06121H141.324V3.72958H160.343Z"/>' +
    '<path d="M121.148 0V20.5319H124.545V14.5723L126.09 12.4832L131.072 20.5319H135.29L128.425 9.64756L135.29 0H132.613C131.861 0 131.142 0.37488 130.628 1.03493L124.545 8.84013V1.62769C124.545 0.730536 123.938 0 123.186 0H121.148Z"/>' +
    "</g></svg>";

  function logo(inverse) {
    return (
      '<a class="logo' + (inverse ? " logo--inverse" : "") + '" href="index.html" aria-label="' +
      esc(D.brand.name + ", " + D.brand.sub.toLowerCase() + ". На главную") + '">' + LOGO + "</a>"
    );
  }

  function lang(inverse) {
    return (
      '<ul class="lang' + (inverse ? " lang--inverse" : "") + '" aria-label="Язык сайта">' +
      D.languages.map(function (l) {
        return '<li><a class="lang__link" href="#" lang="' + l.code + '" aria-label="' + esc(l.name) + '"' +
          (l.current ? ' aria-current="true"' : "") + ">" + esc(l.label) + "</a></li>";
      }).join("") + "</ul>"
    );
  }

  function socialLinks(list, mod) {
    return (
      '<ul class="social-links' + (mod ? " " + mod : "") + '">' +
      list.map(function (s) {
        return '<li><a class="social-link" href="' + s.href + '" aria-label="' + esc(s.name) + '" title="' +
          esc(s.name) + '"><img class="social-link__img" src="assets/icons/brand/' + s.logo + '" alt="" width="40" height="40"></a></li>';
      }).join("") + "</ul>"
    );
  }

  function phoneLink(p, opts) {
    opts = opts || {};
    return (
      '<a class="phone-link' + (opts.inverse ? " phone-link--inverse" : "") + (opts.cls ? " " + opts.cls : "") +
      '" href="' + p.href + '">' +
      (opts.noIcon ? "" : '<span class="phone-link__icon">' + icon("phone", "icon--s") + "</span>") +
      '<span class="phone-link__body">' +
      (opts.label ? '<span class="phone-link__label">' + esc(p.label) + "</span>" : "") +
      '<span class="phone-link__number">' + esc(p.number) + "</span>" +
      (opts.hours ? '<span class="phone-link__hours">' + esc(D.hours) + "</span>" : "") +
      "</span></a>"
    );
  }

  // A-08: required by law, does nothing yet.
  function a11yLink() {
    return '<a class="a11y-link" href="#" data-inert>' + icon("eye") + "Версия для слабовидящих</a>";
  }

  // Answer: «Записаться» leads to the contact form of this page (round 1, A-16).
  function bookLink(cls, text) {
    return '<a class="btn ' + cls + '" href="#booking">' + esc(text) + "</a>";
  }

  function header() {
    return (
      '<div class="site-top"><div class="site-top__inner container">' +
      '<p class="site-top__item">' + icon("map-pin", "icon--s") + esc(D.address.city + ", " + D.address.street) + "</p>" +
      '<div class="site-top__end">' +
      socialLinks(D.messengers) +
      '<span class="site-top__sep" aria-hidden="true"></span>' +
      lang(false) +
      '<span class="site-top__sep" aria-hidden="true"></span>' +
      a11yLink() +
      "</div></div></div>" +
      '<header class="site-header"><div class="site-header__inner container">' +
      logo(false) +
      '<nav class="site-nav" aria-label="Основное меню"><ul class="site-nav__list">' +
      D.nav.header.map(function (l) {
        return '<li><a class="site-nav__link" href="' + l.href + '"' + current(l) + ">" + esc(l.label) + "</a></li>";
      }).join("") +
      "</ul></nav>" +
      phoneLink(mainPhone, { hours: true, cls: "site-header__phone" }) +
      '<div class="site-header__actions">' +
      '<a class="btn btn--tint btn--xs btn--icon site-header__call" href="' + mainPhone.href +
      '" aria-label="Позвонить: ' + esc(mainPhone.number) + '">' + icon("phone") + "</a>" +
      bookLink("btn--primary btn--xs btn--book", "Записаться") +
      '<button class="btn btn--tint btn--xs site-header__menu" type="button" data-menu-open aria-label="Меню" aria-haspopup="dialog" aria-expanded="false" aria-controls="site-menu">' +
      icon("menu-2") + '<span class="site-header__menu-text">Меню</span></button>' +
      "</div></div></header>" +
      mobileMenu()
    );
  }

  // Full-screen mobile menu. A native <dialog>, see js/ui.js.
  function mobileMenu() {
    return (
      '<dialog class="mnav" id="site-menu" aria-label="Меню сайта">' +
      '<div class="mnav__bar">' + logo(true) +
      '<button class="btn btn--inverse-outline btn--xs mnav__close" type="button" data-modal-close autofocus>' +
      icon("x") + "Закрыть</button></div>" +
      '<div class="mnav__body">' +
      '<div class="mnav__phones">' +
      D.phones.map(function (p) { return phoneLink(p, { inverse: true, label: true }); }).join("") +
      '<p class="mnav__text">' + esc(D.hours) + "</p>" +
      "</div>" +
      bookLink("btn--inverse btn--block", "Записаться на приём") +
      '<nav aria-label="Меню сайта">' +
      D.nav.groups.map(function (g) {
        return '<div class="mnav__group"><p class="mnav__label">' + esc(g.title) + '</p><ul class="mnav__list">' +
          g.links.map(function (l) {
            return '<li><a class="mnav__link" href="' + l.href + '"' + current(l) + ">" + esc(l.label) + "</a></li>";
          }).join("") + "</ul></div>";
      }).join("") +
      "</nav>" +
      '<div class="mnav__card">' +
      '<p class="mnav__label">Как нас найти</p>' +
      '<p>' + esc(D.address.full) + "</p>" +
      '<ul class="mnav__text">' + D.address.buildings.map(function (b) {
        return "<li>" + esc(b.name) + ": " + esc(b.place) + "</li>";
      }).join("") + "</ul>" +
      '<p class="mnav__label">Мессенджеры и соцсети</p>' +
      socialLinks(D.messengers.concat(D.socials), "social-links--inverse") +
      "</div>" +
      '<div class="mnav__tiles">' +
      '<a class="mnav__tile" href="#" data-inert>' +
      '<span class="mnav__tile-icon">' + icon("eye") + "</span>Версия для слабовидящих</a>" +
      "</div>" +
      lang(true) +
      "</div></dialog>"
    );
  }

  /*
    A-48: the one contact form of the site, on both pages. id="booking" is the target of every «Записаться».
    Fields: A-24. The direction list is filled by js/render.js; js/direction.js preselects the direction of its page.
  */
  function contact() {
    return (
      '<div class="form-panel" id="booking">' +
      '<div class="form-panel__text">' +
      '<h2 class="form-panel__title" id="booking-title">Остались вопросы?<br>Свяжитесь с&nbsp;нами</h2>' +
      '<p class="form-panel__lead">Мы всегда готовы помочь разобраться в услугах клиники. Свяжитесь с нами, и мы подскажем, к какому врачу лучше обратиться и как быстро записаться на приём.</p>' +
      "</div>" +
      '<div class="form-panel__form">' +
      '<form class="form" data-validate novalidate aria-labelledby="booking-title">' +
      '<div class="field"><label class="field__label" for="cf-name">Имя <span class="field__req" aria-hidden="true">*</span></label>' +
      '<input class="field__control" id="cf-name" name="name" type="text" autocomplete="name" required data-msg-required="Напишите, как к вам обращаться">' +
      '<p class="field__msg" id="cf-name-msg" aria-live="polite"></p></div>' +
      '<div class="field"><label class="field__label" for="cf-phone">Телефон <span class="field__req" aria-hidden="true">*</span></label>' +
      '<input class="field__control" id="cf-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 (___) ___-__-__" data-phone-mask required data-msg-required="Укажите телефон, чтобы мы могли связаться">' +
      '<p class="field__msg" id="cf-phone-msg" aria-live="polite"></p></div>' +
      '<div class="field"><label class="field__label" for="cf-direction">Направление</label>' +
      '<div class="field__wrap"><select class="field__control" id="cf-direction" name="direction" data-render="direction-options"><option value="">Пока не знаю</option></select>' +
      icon("chevron-down", "field__icon") + "</div></div>" +
      '<div class="field"><label class="field__label" for="cf-contact">Удобный способ связи</label>' +
      '<div class="field__wrap"><select class="field__control" id="cf-contact" name="contact">' +
      '<option value="call">Звонок</option><option value="sms">SMS</option><option value="telegram">Telegram</option><option value="whatsapp">WhatsApp</option><option value="max">MAX</option>' +
      "</select>" + icon("chevron-down", "field__icon") + "</div></div>" +
      '<div class="field"><label class="check" for="cf-consent"><input class="check__input" id="cf-consent" name="consent" type="checkbox" required data-msg-required="Без согласия мы не сможем обработать заявку">' +
      '<span class="check__text">Согласен на <a href="#">обработку персональных данных</a> и принимаю <a href="#">политику конфиденциальности</a></span></label>' +
      '<p class="field__msg" id="cf-consent-msg" aria-live="polite"></p></div>' +
      '<button class="btn btn--inverse form__submit" type="submit">Отправить</button>' +
      "</form>" +
      '<div class="alert alert--success" role="status" tabindex="-1" data-form-success hidden>' + icon("circle-check") +
      '<div><p class="alert__title">Заявка отправлена</p>' +
      "<p>Запись ещё не подтверждена. Администратор свяжется с вами выбранным способом в рабочее время (" + esc(D.hours) + ") и подтвердит её. Это макет: данные никуда не отправляются.</p>" +
      '<p><button class="btn btn--ghost btn--s" type="button" data-form-again>Отправить ещё одну заявку</button></p></div></div>' +
      "</div></div>"
    );
  }

  // A-47: the compact footer. Rows: contacts, sections and documents; socials and payments; legal text.
  function footer() {
    var L = D.legal;
    return (
      '<footer class="site-footer"><div class="site-footer__inner container">' +
      '<div class="site-footer__main">' +
      '<div class="site-footer__contacts">' + logo(false) +
      '<div class="footer-phones">' + D.phones.map(function (p) { return '<a class="footer-phone" href="' + p.href + '">' + esc(p.number) + "</a>"; }).join("") + "</div>" +
      '<p class="footer-text">' + esc(D.hours) + "</p>" +
      '<p class="footer-text">' + esc(D.address.full) + "</p>" +
      "</div>" +
      '<nav class="site-footer__nav" aria-label="Разделы сайта">' +
      D.nav.groups.map(function (g) {
        return '<div><p class="footer-title">' + esc(g.title) + '</p><ul class="footer-list">' +
          g.links.map(function (l) {
            return '<li><a class="footer-link" href="' + l.href + '"' + current(l) + ">" + esc(l.label) + "</a></li>";
          }).join("") + "</ul></div>";
      }).join("") +
      "</nav>" +
      '<div class="site-footer__docs"><p class="footer-title">Документы</p><ul class="footer-list">' +
      '<li><a class="footer-link" href="' + L.licence.href + '">' + esc(L.licence.label) + "</a></li>" +
      L.docs.map(function (d) { return '<li><a class="footer-link" href="' + d.href + '">' + esc(d.label) + "</a></li>"; }).join("") +
      "</ul></div>" +
      "</div>" +
      '<div class="site-footer__strip">' +
      socialLinks(D.messengers.concat(D.socials), "social-links--s") +
      '<div class="payments"><p class="payments__title">Принимаем к оплате</p><ul class="payments__list">' +
      D.payments.map(function (p) {
        return '<li class="payments__item"><img class="payments__logo" src="assets/img/pay/' + p.logo + '.svg" alt="' + esc(p.name) + '"></li>';
      }).join("") +
      "</ul></div></div>" +
      '<div class="site-footer__legal">' +
      '<p class="site-footer__warning">' + esc(L.warning) + "</p>" +
      "<p>" + esc(L.org) + "</p>" +
      "<p>" + L.requisites.map(esc).join(". ") + "</p>" +
      "<p>© " + new Date().getFullYear() + " " + esc(L.short) + ". " + esc(L.priceNote) + "</p>" +
      "</div>" +
      "</div></footer>"
    );
  }

  var parts = { header: header, contact: contact, footer: footer };
  Array.prototype.forEach.call(document.querySelectorAll("[data-include]"), function (slot) {
    var render = parts[slot.getAttribute("data-include")];
    if (render) slot.outerHTML = render();
  });

  document.dispatchEvent(new CustomEvent("sihat:layout"));
})();

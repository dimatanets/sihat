/*
  Shared layout: header (with accessibility panel), mobile menu, quick booking modal and footer.
  A-11: one source for every page without network requests. Each page has placeholders:
    <div data-include="header"><noscript>…fallback…</noscript></div>
    <div data-include="footer"><noscript>…fallback…</noscript></div>
  and loads, at the end of <body>: data/site.js, js/layout.js, js/ui.js, js/forms.js.
  The placeholder is replaced by the markup below. The current page is marked from <body data-page="…">.
  For Bitrix: each function below returns the exact HTML of one template part (header.php / footer.php).
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
    return link.page && link.page === page ? ' aria-current="page"' : "";
  }
  var mainPhone = D.phones[0];

  function logo(inverse) {
    return (
      '<a class="logo' + (inverse ? " logo--inverse" : "") + '" href="index.html" aria-label="' +
      esc(D.brand.name + ", " + D.brand.sub.toLowerCase() + ". На главную") + '">' +
      '<span class="logo__mark" aria-hidden="true"></span>' +
      '<span class="logo__text" aria-hidden="true"><span class="logo__name">' + esc(D.brand.name) +
      '</span><span class="logo__sub">' + esc(D.brand.sub) + "</span></span></a>"
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
          esc(s.name) + '">' + icon(s.icon) + "</a></li>";
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

  function a11yToggle(extraClass) {
    return (
      '<button class="a11y-toggle' + (extraClass ? " " + extraClass : "") +
      '" type="button" data-a11y-toggle aria-pressed="false">' + icon("eye") +
      '<span class="a11y-toggle__off">Версия для слабовидящих</span>' +
      '<span class="a11y-toggle__on">Обычная версия</span></button>'
    );
  }

  // Accessibility panel (A-08): visible only when <html> has the class "a11y".
  function a11yPanel() {
    function opt(option, value, label, cls, aria) {
      return '<button class="a11y-panel__btn ' + cls + '" type="button" data-a11y-option="' + option +
        '" data-a11y-value="' + value + '" aria-pressed="false"' + (aria ? ' aria-label="' + aria + '"' : "") +
        ">" + label + "</button>";
    }
    return (
      '<section class="a11y-panel" aria-label="Настройки версии для слабовидящих" id="a11y-panel" tabindex="-1">' +
      '<div class="a11y-panel__inner container">' +
      '<div class="a11y-panel__group" role="group" aria-labelledby="a11y-size-label">' +
      '<span class="a11y-panel__label" id="a11y-size-label">Размер шрифта</span>' +
      opt("size", "1", "А", "a11y-panel__btn--size-1", "Крупный шрифт") +
      opt("size", "2", "А+", "a11y-panel__btn--size-2", "Очень крупный шрифт") +
      opt("size", "3", "А++", "a11y-panel__btn--size-3", "Самый крупный шрифт") +
      "</div>" +
      '<div class="a11y-panel__group" role="group" aria-labelledby="a11y-scheme-label">' +
      '<span class="a11y-panel__label" id="a11y-scheme-label">Цвет</span>' +
      opt("scheme", "white", "Ц", "a11y-panel__btn--white", "Чёрным по белому") +
      opt("scheme", "black", "Ц", "a11y-panel__btn--black", "Белым по чёрному") +
      opt("scheme", "blue", "Ц", "a11y-panel__btn--blue", "Тёмно-синим по голубому") +
      "</div>" +
      '<div class="a11y-panel__group" role="group" aria-labelledby="a11y-img-label">' +
      '<span class="a11y-panel__label" id="a11y-img-label">Изображения</span>' +
      opt("images", "on", "Показать", "") +
      opt("images", "off", "Скрыть", "") +
      "</div>" +
      '<button class="btn btn--secondary btn--s a11y-panel__exit" type="button" data-a11y-toggle>' +
      icon("eye-off") + "Обычная версия</button>" +
      "</div></section>"
    );
  }

  function header() {
    return (
      a11yPanel() +
      '<div class="site-top"><div class="site-top__inner container">' +
      '<p class="site-top__item">' + icon("map-pin", "icon--s") + esc(D.address.city + ", " + D.address.street) + "</p>" +
      '<div class="site-top__end">' +
      socialLinks(D.messengers, "social-links--s") +
      '<span class="site-top__sep" aria-hidden="true"></span>' +
      lang(false) +
      '<span class="site-top__sep" aria-hidden="true"></span>' +
      a11yToggle() +
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
      // A-16: «Записаться» opens the quick request modal; the full booking flow comes in P4.
      '<button class="btn btn--primary btn--book" type="button" data-modal-open="modal-booking">Записаться</button>' +
      '<button class="btn btn--tint btn--xs site-header__menu" type="button" data-menu-open aria-haspopup="dialog" aria-expanded="false" aria-controls="site-menu">' +
      icon("menu-2") + '<span class="site-header__menu-text">Меню</span></button>' +
      "</div></div></header>" +
      mobileMenu() +
      bookingModal()
    );
  }

  // Full-screen mobile menu, like РКБ 2.0 node 190:4425. A native <dialog>, see js/ui.js.
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
      '<button class="btn btn--inverse btn--block" type="button" data-modal-open="modal-booking">Записаться на приём</button>' +
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
      '<button class="mnav__tile" type="button" data-a11y-toggle aria-pressed="false">' +
      '<span class="mnav__tile-icon">' + icon("eye") + "</span>" +
      '<span><span class="a11y-toggle__off">Версия для слабовидящих</span><span class="a11y-toggle__on">Обычная версия</span></span></button>' +
      "</div>" +
      lang(true) +
      "</div></dialog>"
    );
  }

  // Quick request: name, phone, direction, consent (A-16). Validation: js/forms.js.
  function bookingModal() {
    return (
      '<dialog class="modal" id="modal-booking" aria-labelledby="modal-booking-title">' +
      '<div class="modal__handle" aria-hidden="true"></div>' +
      '<div class="modal__head"><div><h2 class="modal__title" id="modal-booking-title">Записаться на приём</h2>' +
      '<p class="modal__lead">Оставьте телефон: администратор перезвонит в рабочее время, подберёт врача и время приёма.</p></div>' +
      '<button class="btn btn--tint btn--s btn--icon" type="button" data-modal-close aria-label="Закрыть">' + icon("x") + "</button></div>" +
      '<div class="modal__body">' +
      '<form class="form" data-validate novalidate>' +
      field("mb-name", "Имя", '<input class="field__control" id="mb-name" name="name" type="text" autocomplete="name" required>') +
      field("mb-phone", "Телефон", '<input class="field__control" id="mb-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="+7 (___) ___-__-__" data-phone-mask required>') +
      field("mb-direction", "Направление", '<div class="field__wrap"><select class="field__control" id="mb-direction" name="direction">' +
        '<option value="">Не знаю, нужна консультация</option>' +
        D.directions.map(function (d) { return "<option>" + esc(d) + "</option>"; }).join("") +
        "</select>" + icon("chevron-down", "field__icon") + "</div>", true) +
      consent("mb-consent") +
      '<button class="btn btn--primary btn--block" type="submit">Отправить заявку</button>' +
      '<p class="form__note">Или позвоните: <a href="' + mainPhone.href + '">' + esc(mainPhone.number) + "</a>, " + esc(D.hours) + ".</p>" +
      "</form>" +
      '<div class="alert alert--success" role="status" tabindex="-1" data-form-success hidden>' + icon("circle-check") +
      '<div><p class="alert__title">Заявка отправлена</p><p>Администратор перезвонит вам в рабочее время. Это макет: данные никуда не отправляются.</p></div></div>' +
      "</div></dialog>"
    );
  }

  function field(id, label, control, optional) {
    return (
      '<div class="field"><label class="field__label" for="' + id + '">' + esc(label) +
      (optional ? "" : ' <span class="field__req" aria-hidden="true">*</span>') + "</label>" +
      control + '<p class="field__msg" id="' + id + '-msg" aria-live="polite"></p></div>'
    );
  }

  function consent(id) {
    var docs = D.legal.docs;
    return (
      '<div class="field"><label class="check" for="' + id + '">' +
      '<input class="check__input" id="' + id + '" name="consent" type="checkbox" required data-msg-required="Без согласия мы не сможем обработать заявку">' +
      '<span class="check__text">Согласен на <a href="' + docs[1].href + '">обработку персональных данных</a> и принимаю ' +
      '<a href="' + docs[0].href + '">политику конфиденциальности</a></span></label>' +
      '<p class="field__msg" id="' + id + '-msg" aria-live="polite"></p></div>'
    );
  }

  function footer() {
    var L = D.legal;
    return (
      '<footer class="site-footer"><div class="site-footer__inner container">' +
      '<div class="site-footer__main">' +
      '<div class="site-footer__brand">' + logo(false) +
      '<p class="site-footer__about">' + esc(D.brand.about) + "</p>" +
      '<button class="btn btn--primary btn--s" type="button" data-modal-open="modal-booking">Записаться на приём</button>' +
      "</div>" +
      '<nav class="site-footer__nav" aria-label="Разделы сайта">' +
      D.nav.groups.map(function (g) {
        return '<div><p class="footer-title">' + esc(g.title) + '</p><ul class="footer-list">' +
          g.links.map(function (l) {
            return '<li><a href="' + l.href + '"' + current(l) + ">" + esc(l.label) + "</a></li>";
          }).join("") + "</ul></div>";
      }).join("") +
      "</nav>" +
      '<div class="footer-contacts">' +
      '<p class="footer-title">Контакты</p>' +
      D.phones.map(function (p) { return '<a class="footer-phone" href="' + p.href + '">' + esc(p.number) + "</a>"; }).join("") +
      '<p class="footer-text footer-text--muted">' + esc(D.hours) + "</p>" +
      '<p class="footer-text">' + esc(D.address.full) + "</p>" +
      '<ul class="footer-text footer-text--muted">' + D.address.buildings.map(function (b) {
        return "<li>" + esc(b.name) + ": " + esc(b.place) + "</li>";
      }).join("") + "</ul>" +
      '<p class="footer-title">Мессенджеры и соцсети</p>' +
      socialLinks(D.messengers.concat(D.socials)) +
      "</div>" +
      "</div>" +
      '<div class="site-footer__legal">' +
      "<div>" +
      '<p class="site-footer__org">' + esc(L.org) + "</p>" +
      L.requisites.map(function (r) { return '<p class="site-footer__req">' + esc(r) + "</p>"; }).join("") +
      '<ul class="site-footer__docs">' +
      '<li><a href="' + L.licence.href + '">' + icon("certificate", "icon--s") + esc(L.licence.label) + "</a></li>" +
      L.docs.map(function (d) { return '<li><a href="' + d.href + '">' + esc(d.label) + "</a></li>"; }).join("") +
      "</ul></div>" +
      '<div class="payments"><p class="footer-title">Принимаем к оплате</p><ul class="payments__list">' +
      D.payments.map(function (p) { return '<li class="payments__item">' + esc(p) + "</li>"; }).join("") +
      '</ul><p class="footer-text footer-text--muted">Оплата картой и по QR-коду СБП онлайн на сайте или в клинике.</p></div>' +
      "</div>" +
      '<div class="site-footer__bottom">' +
      '<p class="site-footer__warning">' + esc(L.warning) + "</p>" +
      "<p>© " + new Date().getFullYear() + " " + esc(L.short) + ". " + esc(L.priceNote) + "</p>" +
      a11yToggle() +
      "</div>" +
      "</div></footer>"
    );
  }

  var parts = { header: header, footer: footer };
  Array.prototype.forEach.call(document.querySelectorAll("[data-include]"), function (slot) {
    var render = parts[slot.getAttribute("data-include")];
    if (render) slot.outerHTML = render();
  });

  document.dispatchEvent(new CustomEvent("sihat:layout"));
})();

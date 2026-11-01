/*
  Booking flow (A-03) and payment flow (A-04). Mock only: nothing is sent anywhere, no payment provider.
  Needs data/site.js, data/directions.js, data/doctors.js, data/services.js and js/ui.js, js/forms.js (load after them).

  Opening, from markup (event delegation, works for markup rendered later):
    <button data-book>                              no preset (A-29): choose a consultation, or switch to a request
    <button data-book data-service="cons-kardiolog"> preset service; the flow type comes from service.booking
    <button data-book data-doctor="<doctor id>">     preset doctor: his primary visit, starts at date and time
    <button data-book data-direction="chek-ap">      preset direction: request (check-up) or lab visit (analyses)
    <button data-pay="<service id>">                 payment for one service
  From JS:
    Sihat.booking.open({ service, doctor, direction }, openerElement)
    Sihat.payment.open(serviceId, openerElement, { name, phone })
  Events on document: "booking:done" and "payment:done", detail = the entered data.

  Flows (one <dialog class="modal modal--flow"> each; a centred modal on desktop, a full-screen sheet below 768px):
    slots    consultation: service → doctor (or «Любой врач») → date and time → name, phone, consent → confirmation
             with the summary, «Добавить в календарь» (.ics file made in the browser) and «Оплатить онлайн» (A-30)
    lab      lab test (A-25): test → date and time (weekdays 8:00–12:00) → name, phone, consent → confirmation
    request  check-up, births, surgery: name, phone, comment, preferred contact, consent → «менеджер свяжется»
    payment  service and price, name, phone, email for the receipt, consent to the offer → mock success (A-30)
  «Назад» in the head returns to the previous step with the entered data kept. Closing (cross, Esc, backdrop) asks
  «Закрыть запись?» once anything was entered and the flow is not finished (uses "modal:beforeclose", js/ui.js).
  Each step is its own <form data-validate>, so js/forms.js validates it and fires "form:valid".
*/
(function () {
  "use strict";

  var S = window.Sihat = window.Sihat || {};
  var D = window.SIHAT_DATA || {};
  var SERVICES = window.SIHAT_SERVICES || [];
  var DOCTORS = window.SIHAT_DOCTORS || [];
  var DIRECTIONS = window.SIHAT_DIRECTIONS || [];
  var PHONE = (D.phones && D.phones[0]) || { number: "+7 (843) 231-20-90", href: "tel:+78432312090" };
  var HOURS = D.hours || "пн–пт 8:00–18:00, сб 8:00–16:00";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ------------------------------------------------------------------ helpers */

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function icon(name, extra) {
    return '<span class="icon icon--' + name + (extra ? " " + extra : "") + '" aria-hidden="true"></span>';
  }
  function rub(n) { return Number(n).toLocaleString("ru-RU") + " ₽"; }
  function find(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function service(id) { return find(SERVICES, id); }
  function doctor(id) { return find(DOCTORS, id); }
  function direction(id) { return find(DIRECTIONS, id); }
  function serviceForDoctor(d) {
    return SERVICES.filter(function (s) { return s.booking === "slots" && s.spec === d.spec; })[0] || null;
  }
  function doctorsFor(s) { return DOCTORS.filter(function (d) { return d.spec === s.spec; }); }
  // Small number from a string: varies the mock schedule per doctor.
  function seedOf(str) {
    var n = 0;
    for (var i = 0; i < String(str).length; i++) n += String(str).charCodeAt(i);
    return n % 10;
  }

  var CONTACTS = [
    { value: "call", label: "Звонок", done: "по телефону", icon: "phone" },
    { value: "sms", label: "Сообщение на мобильный", done: "сообщением на мобильный", icon: "device-mobile-message" },
    { value: "telegram", label: "Telegram", done: "в Telegram", icon: "brand-telegram" },
    { value: "whatsapp", label: "WhatsApp", done: "в WhatsApp", icon: "brand-whatsapp" },
    // A-15: MAX has no Tabler icon
    { value: "max", label: "MAX", done: "в MAX", icon: "message-circle" }
  ];

  function field(id, label, control, opts) {
    opts = opts || {};
    return (
      '<div class="field"><label class="field__label" for="' + id + '">' + esc(label) +
      (opts.optional ? "" : ' <span class="field__req" aria-hidden="true">*</span>') + "</label>" +
      control + (opts.hint ? '<p class="field__hint" id="' + id + '-hint">' + esc(opts.hint) + "</p>" : "") +
      '<p class="field__msg" id="' + id + '-msg" aria-live="polite"></p></div>'
    );
  }
  function nameField(p, value) {
    return field(p + "-name", "Имя", '<input class="field__control" id="' + p + '-name" name="name" type="text" autocomplete="name" required data-msg-required="Напишите, как к вам обращаться" value="' + esc(value) + '">');
  }
  function phoneField(p, value) {
    return field(p + "-phone", "Телефон", '<input class="field__control" id="' + p + '-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 (___) ___-__-__" data-phone-mask required data-msg-required="Укажите телефон, чтобы мы могли связаться" value="' + esc(value) + '">');
  }
  function consentField(p, html, checked) {
    return (
      '<div class="field"><label class="check" for="' + p + '-consent"><input class="check__input" id="' + p +
      '-consent" name="consent" type="checkbox" required data-msg-required="Без согласия мы не сможем продолжить"' +
      (checked ? " checked" : "") + '><span class="check__text">' + html + "</span></label>" +
      '<p class="field__msg" id="' + p + '-consent-msg" aria-live="polite"></p></div>'
    );
  }
  function legalHref(i) { return (D.legal && D.legal.docs && D.legal.docs[i] && D.legal.docs[i].href) || "#"; }
  var CONSENT_PD = 'Согласен на <a href="' + legalHref(1) + '">обработку персональных данных</a> и принимаю <a href="' + legalHref(0) + '">политику конфиденциальности</a>';
  var CONSENT_OFFER = 'Принимаю условия <a href="' + legalHref(2) + '">договора-оферты</a> и даю согласие на <a href="' + legalHref(1) + '">обработку персональных данных</a>';

  function summary(rows, compact) {
    return (
      '<dl class="summary' + (compact ? " summary--compact" : "") + '">' +
      rows.filter(function (r) { return r && r[1]; }).map(function (r) {
        return '<div class="summary__row"><dt class="summary__term">' + esc(r[0]) + '</dt><dd class="summary__value">' + r[1] + "</dd></div>";
      }).join("") + "</dl>"
    );
  }

  /* ------------------------------------------------------------------ dialog shell (shared by both flows) */

  // Builds <dialog class="modal modal--flow"> with a head (back, progress, title, close), body, foot and the
  // «Закрыть …?» confirmation layer. isDirty() decides whether closing must be confirmed.
  function shell(id, texts, isDirty) {
    var dlg = document.createElement("dialog");
    dlg.className = "modal modal--flow";
    dlg.id = id;
    dlg.setAttribute("aria-labelledby", id + "-title");
    dlg.innerHTML =
      '<div class="modal__head flow__head" data-flow-part>' +
      '<button class="btn btn--tint btn--s btn--icon" type="button" data-flow-back aria-label="Назад" hidden>' + icon("arrow-left") + "</button>" +
      '<div class="flow__heading"><p class="flow__progress" id="' + id + '-progress"></p>' +
      '<h2 class="modal__title" id="' + id + '-title" tabindex="-1"></h2></div>' +
      '<button class="btn btn--tint btn--s btn--icon" type="button" data-modal-close aria-label="Закрыть">' + icon("x") + "</button></div>" +
      '<div class="flow__bar" aria-hidden="true" data-flow-part><span class="flow__bar-fill"></span></div>' +
      '<div class="modal__body flow__body" data-flow-part></div>' +
      '<div class="modal__foot" data-flow-part></div>' +
      '<div class="modal__confirm" role="alertdialog" aria-modal="true" aria-labelledby="' + id + '-confirm-title" aria-describedby="' + id + '-confirm-text" hidden>' +
      '<div class="modal__confirm-box"><p class="modal__confirm-title" id="' + id + '-confirm-title">' + esc(texts.title) + "</p>" +
      '<p class="modal__confirm-text" id="' + id + '-confirm-text">Введённые данные не сохранятся.</p>' +
      '<div class="modal__confirm-actions"><button class="btn btn--primary btn--s" type="button" data-confirm-stay>' + esc(texts.stay) + "</button>" +
      '<button class="btn btn--secondary btn--s" type="button" data-confirm-close>' + esc(texts.close) + "</button></div></div></div>";
    document.body.appendChild(dlg);

    var sh = {
      dlg: dlg,
      back: dlg.querySelector("[data-flow-back]"),
      progress: dlg.querySelector(".flow__progress"),
      title: dlg.querySelector(".modal__title"),
      bar: dlg.querySelector(".flow__bar"),
      fill: dlg.querySelector(".flow__bar-fill"),
      body: dlg.querySelector(".flow__body"),
      foot: dlg.querySelector(".modal__foot"),
      confirm: dlg.querySelector(".modal__confirm"),
      restoring: false,
      dirty: false,
      setHead: function (title, step, total) {
        sh.title.textContent = title;
        var showProgress = total > 1 && step > 0;
        sh.progress.hidden = !showProgress;
        sh.bar.hidden = !showProgress;
        if (showProgress) {
          sh.progress.textContent = "Шаг " + step + " из " + total;
          sh.fill.style.width = Math.round((step / total) * 100) + "%";
        }
      },
      focusTitle: function () { sh.title.focus(); sh.body.scrollTop = 0; },
      showConfirm: function (on) {
        sh.confirm.hidden = !on;
        Array.prototype.forEach.call(dlg.querySelectorAll("[data-flow-part]"), function (el) {
          if (on) el.setAttribute("inert", ""); else el.removeAttribute("inert");
        });
        if (on) sh.confirm.querySelector("[data-confirm-stay]").focus();
      }
    };

    // Anything typed or chosen counts as entered data.
    function markDirty() { if (!sh.restoring) sh.dirty = true; }
    sh.body.addEventListener("input", markDirty);
    sh.body.addEventListener("change", markDirty);
    sh.body.addEventListener("datepicker:change", markDirty);

    dlg.addEventListener("modal:beforeclose", function (e) {
      if (!sh.confirm.hidden) { e.preventDefault(); sh.showConfirm(false); sh.focusTitle(); return; }
      if (isDirty()) { e.preventDefault(); sh.showConfirm(true); }
    });
    dlg.addEventListener("click", function (e) {
      if (e.target.closest("[data-confirm-stay]")) { sh.showConfirm(false); sh.focusTitle(); }
      else if (e.target.closest("[data-confirm-close]")) { sh.showConfirm(false); S.modal.close(dlg, { force: true }); }
    });
    dlg.addEventListener("modal:close", function () { sh.showConfirm(false); sh.dirty = false; });
    return sh;
  }

  /* ------------------------------------------------------------------ booking */

  var STEPS = {
    slots: ["service", "doctor", "datetime", "contacts", "done"],
    lab: ["service", "datetime", "contacts", "done"],
    request: ["request", "done"]
  };

  var B = null;      // shell
  var st = null;     // state of the current booking

  function fresh() {
    return { mode: "slots", step: "service", service: "", doctor: "", date: null, time: "", name: "", phone: "",
      comment: "", contact: "call", direction: "", from: "" };
  }

  function ensureBooking() {
    if (B) return B;
    B = shell("modal-book", { title: "Закрыть запись?", stay: "Продолжить запись", close: "Закрыть" }, function () {
      return B.dirty && st && st.step !== "done";
    });
    B.back.addEventListener("click", back);
    B.dlg.addEventListener("form:valid", onValid);
    B.dlg.addEventListener("click", function (e) {
      if (e.target.closest("[data-book-request]")) {
        // Switch to a request without a service; «Назад» brings the consultation choice back.
        st.from = "slots"; st.fromService = st.service; st.service = ""; st.mode = "request"; go("request");
      }
      else if (e.target.closest("[data-book-finish]")) S.modal.close(B.dlg, { force: true });
    });
    B.dlg.addEventListener("datepicker:change", function (e) {
      if (B.restoring) return;
      st.date = e.detail.date;
      st.time = "";
      clearMsg(B.body.querySelector(".datepicker"));
      // On phones the slots are below the calendar: bring them into view.
      var slots = B.body.querySelector("[data-slots]");
      if (slots && window.matchMedia("(max-width: 767px)").matches) {
        // After the slots are rendered (right after this event). Scroll only the sheet body:
        // scrollIntoView could also move the locked page behind it.
        setTimeout(function () {
          var delta = slots.getBoundingClientRect().top - B.body.getBoundingClientRect().top - 16;
          B.body.scrollBy({ top: delta, behavior: reduceMotion.matches ? "auto" : "smooth" });
        }, 0);
      }
    });
    B.dlg.addEventListener("modal:close", function () {
      if (B.icsUrl) { URL.revokeObjectURL(B.icsUrl); B.icsUrl = null; }
    });
    return B;
  }

  function clearMsg(el) {
    var f = el && el.closest(".field");
    if (!f) return;
    f.classList.remove("field--error");
    var m = f.querySelector(".field__msg");
    if (m) m.textContent = "";
  }

  function stepTitle(step) {
    var s = service(st.service);
    switch (step) {
      case "service": return st.mode === "lab" ? "Выберите анализ" : "Выберите услугу";
      case "doctor": return "Выберите врача";
      case "datetime": return st.mode === "lab" ? "Дата и время визита" : "Дата и время приёма";
      case "contacts": return "Ваши данные";
      case "request":
        if (s) return "Заявка: " + s.title;
        var dir = direction(st.direction);
        return dir ? "Заявка: " + dir.title : "Оставить заявку";
      case "done": return st.mode === "request" ? "Заявка принята" : "Вы записаны";
    }
    return "";
  }

  function open(opts, opener) {
    ensureBooking();
    opts = opts || {};
    st = fresh();
    var s = opts.service && service(opts.service);
    var d = opts.doctor && doctor(opts.doctor);
    var start = "service";
    if (d && !s) s = serviceForDoctor(d);
    if (s) {
      st.service = s.id;
      st.mode = s.booking;
      start = { slots: d ? "datetime" : "doctor", lab: "datetime", request: "request" }[s.booking];
      if (d && s.booking === "slots") st.doctor = d.id;
    } else if (opts.direction) {
      st.direction = opts.direction;
      var kinds = SERVICES.filter(function (x) { return x.direction === opts.direction; }).map(function (x) { return x.booking; });
      st.mode = kinds.indexOf("slots") !== -1 ? "slots" : kinds.indexOf("lab") !== -1 ? "lab" : "request";
      start = st.mode === "request" ? "request" : "service";
    }
    B.dirty = false;
    render(start);
    S.modal.open(B.dlg, opener);
    B.focusTitle();
  }

  function go(step) { render(step); B.focusTitle(); }

  function back() {
    var steps = STEPS[st.mode];
    var i = steps.indexOf(st.step);
    if (i > 0) go(steps[i - 1]);
    else if (st.from) { st.mode = st.from; st.from = ""; st.service = st.fromService || ""; go("service"); }
  }

  function render(step) {
    st.step = step;
    var steps = STEPS[st.mode];
    var i = steps.indexOf(step);
    var total = steps.length - 1;
    B.setHead(stepTitle(step), step === "done" ? 0 : i + 1, total);
    B.back.hidden = step === "done" || (i === 0 && !st.from);
    B.restoring = true;
    B.body.innerHTML = views[step]();
    B.foot.innerHTML = foot(step);
    if (afterRender[step]) afterRender[step]();
    B.restoring = false;
  }

  function foot(step) {
    if (step === "done") return '<button class="btn btn--primary btn--block" type="button" data-book-finish>Готово</button>';
    var label = { contacts: "Записаться", request: "Отправить заявку" }[step] || "Далее";
    return '<button class="btn btn--primary btn--block" type="submit" form="book-form">' + label +
      (label === "Далее" ? icon("arrow-right") : "") + "</button>";
  }

  // Summary of what is chosen so far, shown at the top of the later steps.
  function chosen(compact) {
    var s = service(st.service);
    var rows = [];
    if (s) rows.push([st.mode === "lab" ? "Анализ" : "Услуга", esc(s.title) + ' <span class="summary__price">' + rub(s.price) + "</span>"]);
    if (st.mode === "slots" && st.doctor && st.step !== "doctor") {
      var d = doctor(st.doctor);
      rows.push(["Врач", d ? esc(d.name) : "Любой врач"]);
    }
    if (st.date && st.time && (st.step === "contacts" || st.step === "done")) rows.push(["Дата и время", esc(S.datepicker.label(st.date)) + ", " + esc(st.time)]);
    return rows.length ? summary(rows, compact) : "";
  }

  var views = {
    service: function () {
      if (st.mode === "lab") {
        var groups = [];
        SERVICES.forEach(function (s) {
          if (s.booking !== "lab") return;
          if (groups.indexOf(s.group) === -1) groups.push(s.group);
        });
        return (
          '<form class="form" id="book-form" data-validate novalidate>' +
          field("bk-lab", "Анализ", '<div class="field__wrap"><select class="field__control" id="bk-lab" name="service" required data-msg-required="Выберите анализ">' +
            '<option value="">Выберите из списка</option>' +
            groups.map(function (g) {
              return '<optgroup label="' + esc(g) + '">' + SERVICES.filter(function (s) { return s.booking === "lab" && s.group === g; }).map(function (s) {
                return '<option value="' + s.id + '"' + (s.id === st.service ? " selected" : "") + ">" + esc(s.title) + " — " + rub(s.price) + "</option>";
              }).join("") + "</optgroup>";
            }).join("") + "</select>" + icon("chevron-down", "field__icon") + "</div>",
            { hint: "Если анализов несколько, выберите любой из них: время визита одно на все." }) +
          '<div class="alert alert--info">' + icon("clock") + "<div><p>Процедурный кабинет работает в будни с 8:00 до 12:00. Некоторые анализы сдают натощак — смотрите памятку на странице «Анализы».</p></div></div>" +
          "</form>"
        );
      }
      var list = SERVICES.filter(function (s) { return s.booking === "slots"; });
      return (
        '<form class="form" id="book-form" data-validate novalidate>' +
        '<fieldset class="field options"><legend class="visually-hidden">Услуга</legend><div class="options__list">' +
        list.map(function (s, n) {
          return option("bk-svc-" + n, "service", s.id, s.id === st.service, n === 0 ? ' required data-msg-required="Выберите услугу"' : "",
            '<span class="option__body"><span class="option__title">' + esc(s.title) + '</span><span class="option__text">' + esc(s.text) + "</span></span>" +
            '<span class="option__aside">' + rub(s.price) + "</span>");
        }).join("") +
        '</div><p class="field__msg" id="bk-svc-msg" aria-live="polite"></p></fieldset>' +
        "</form>" +
        '<div class="flow__aside"><p class="flow__aside-title">Чек-ап, роды или операция?</p>' +
        "<p>Оставьте заявку — менеджер перезвонит, подберёт программу и дату.</p>" +
        '<button class="btn btn--secondary btn--s" type="button" data-book-request>Оставить заявку</button></div>'
      );
    },

    doctor: function () {
      var s = service(st.service);
      var docs = doctorsFor(s);
      var cur = st.doctor || "any";
      return (
        chosen(true) +
        '<form class="form" id="book-form" data-validate novalidate>' +
        '<fieldset class="field options"><legend class="visually-hidden">Врач</legend><div class="options__list">' +
        option("bk-doc-any", "doctor", "any", cur === "any", ' required data-msg-required="Выберите врача"',
          '<span class="option__media media media--placeholder">' + icon("stethoscope") + "</span>" +
          '<span class="option__body"><span class="option__title">Любой врач</span><span class="option__text">Покажем всё свободное время — к кому записаться, подскажет администратор</span></span>') +
        docs.map(function (d, n) {
          return option("bk-doc-" + n, "doctor", d.id, cur === d.id, "",
            '<span class="option__media media' + (d.photo ? "" : " media--placeholder") + '">' + (d.photo ? '<img src="' + esc(d.photo) + '" alt="">' : icon("user")) + "</span>" +
            '<span class="option__body"><span class="option__title">' + esc(d.name) + '</span><span class="option__text">' + esc(d.role) + "</span>" +
            (d.regalia && d.regalia.length ? '<span class="option__tags">' + d.regalia.map(function (r) { return '<span class="badge">' + esc(r) + "</span>"; }).join("") + "</span>" : "") +
            "</span>");
        }).join("") +
        '</div><p class="field__msg" id="bk-doc-msg" aria-live="polite"></p></fieldset></form>'
      );
    },

    datetime: function () {
      var lab = st.mode === "lab";
      var seed = lab ? 7 : seedOf(st.doctor || "any");
      return (
        chosen(true) +
        '<form class="form" id="book-form" data-validate novalidate><div class="flow__datetime">' +
        '<div class="field"><p class="field__label" id="bk-date-label">Дата</p>' +
        '<div class="datepicker" id="bk-date" data-datepicker data-name="date" data-days="45" data-slots-target="bk-time" data-seed="' + seed + '"' +
        (lab ? ' data-closed="0,6"' : "") + ' role="group" aria-labelledby="bk-date-label"></div>' +
        '<p class="field__msg" id="bk-date-msg" aria-live="polite"></p></div>' +
        '<fieldset class="slots field" id="bk-time" data-slots data-name="time" data-required data-seed="' + seed + '"' +
        (lab ? ' data-from="8" data-to="12" data-step="15"' : "") + ">" +
        '<legend class="slots__legend">Время' + (lab ? " визита" : " приёма") + "</legend>" +
        '<div class="slots__list"></div><p class="field__msg" id="bk-time-msg" aria-live="polite"></p></fieldset>' +
        "</div></form>"
      );
    },

    contacts: function () {
      return (
        chosen(true) +
        '<form class="form" id="book-form" data-validate novalidate>' +
        '<div class="form__row">' + nameField("bk", st.name) + phoneField("bk", st.phone) + "</div>" +
        consentField("bk", CONSENT_PD, false) +
        '<p class="form__note">Стоимость оплачивается в клинике в день приёма или онлайн после записи.</p>' +
        "</form>"
      );
    },

    request: function () {
      var s = service(st.service);
      var dir = direction(st.direction);
      var dirs = D.directions || [];
      return (
        (s ? summary([["Услуга", esc(s.title) + ' <span class="summary__price">' + rub(s.price) + "</span>"]], true) : "") +
        '<form class="form" id="book-form" data-validate novalidate>' +
        '<p class="flow__lead">Менеджер свяжется с вами в рабочее время, ответит на вопросы и подберёт удобную дату.</p>' +
        '<div class="form__row">' + nameField("rq", st.name) + phoneField("rq", st.phone) + "</div>" +
        (s ? "" : field("rq-direction", "Направление", '<div class="field__wrap"><select class="field__control" id="rq-direction" name="direction">' +
          '<option value="">Пока не знаю</option>' +
          dirs.map(function (n) { return "<option" + (dir && dir.title === n ? " selected" : "") + ">" + esc(n) + "</option>"; }).join("") +
          "</select>" + icon("chevron-down", "field__icon") + "</div>", { optional: true })) +
        field("rq-comment", "Комментарий", '<textarea class="field__control" id="rq-comment" name="comment" rows="3" placeholder="Например, удобное время для звонка">' + esc(st.comment) + "</textarea>", { optional: true }) +
        '<fieldset class="field choices"><legend class="field__label">Удобный способ связи</legend><div class="choices__list">' +
        CONTACTS.map(function (c) {
          var id = "rq-c-" + c.value;
          return '<label class="slot" for="' + id + '"><input class="slot__input" type="radio" id="' + id + '" name="contact" value="' + c.value + '"' +
            (st.contact === c.value ? " checked" : "") + '><span class="slot__text">' + icon(c.icon) + esc(c.label) + "</span></label>";
        }).join("") + "</div></fieldset>" +
        consentField("rq", CONSENT_PD, false) +
        "</form>"
      );
    },

    done: function () {
      var s = service(st.service);
      if (st.mode === "request") {
        var c = find(CONTACTS.map(function (x) { return { id: x.value, done: x.done }; }), st.contact) || { done: "по телефону" };
        var dir = direction(st.direction);
        return (
          '<div class="result" role="status">' + '<span class="result__icon">' + icon("circle-check", "icon--l") + "</span>" +
          '<p class="result__text">Менеджер свяжется с вами ' + esc(c.done) + " в рабочее время (" + esc(HOURS) + ") и подберёт удобную дату.</p></div>" +
          summary([
            ["Услуга", s ? esc(s.title) : st.directionName ? esc(st.directionName) : dir ? esc(dir.title) : ""],
            ["Имя", esc(st.name)],
            ["Телефон", esc(st.phone)],
            ["Комментарий", esc(st.comment)]
          ]) +
          '<p class="form__note">Это макет: заявка никуда не отправляется.</p>'
        );
      }
      var d = st.mode === "slots" ? doctor(st.doctor) : null;
      var place = D.address ? D.address.street + ", " + D.address.buildings[0].place : "";
      return (
        '<div class="result" role="status">' + '<span class="result__icon">' + icon("circle-check", "icon--l") + "</span>" +
        '<p class="result__text">Ждём вас ' + esc(S.datepicker.label(st.date)) + " в " + esc(st.time) +
        ". Если планы изменятся, позвоните: <a href=\"" + PHONE.href + '" class="nowrap">' + esc(PHONE.number) + "</a>.</p></div>" +
        summary([
          [st.mode === "lab" ? "Анализ" : "Услуга", esc(s.title)],
          st.mode === "slots" ? ["Врач", d ? esc(d.name) : "Любой врач, подтвердит администратор"] : null,
          ["Дата и время", esc(S.datepicker.label(st.date)) + ", " + esc(st.time)],
          // A-25: room of the lab is not known; the outpatient building is shown for both
          ["Где", esc(place) + (st.mode === "lab" ? ", процедурный кабинет" : "")],
          ["Стоимость", rub(s.price)],
          ["Пациент", esc(st.name) + ", " + esc(st.phone)]
        ]) +
        '<div class="flow__actions">' +
        '<a class="btn btn--secondary btn--s" data-book-ics download="sihat-zapis.ics" href="#">' + icon("calendar-plus") + "Добавить в календарь</a>" +
        '<button class="btn btn--secondary btn--s" type="button" data-pay="' + s.id + '">' + icon("credit-card") + "Оплатить онлайн</button>" +
        "</div>" +
        '<p class="form__note">Это макет: запись никуда не отправляется.</p>'
      );
    }
  };

  function option(id, name, value, checked, extra, inner) {
    return '<label class="option" for="' + id + '"><input class="option__input" type="radio" id="' + id + '" name="' + name +
      '" value="' + esc(value) + '"' + (checked ? " checked" : "") + extra + '><span class="option__box">' + inner +
      '<span class="option__mark" aria-hidden="true"></span></span></label>';
  }

  var afterRender = {
    datetime: function () {
      var el = B.body.querySelector("[data-datepicker]");
      var fs = B.body.querySelector("[data-slots]");
      var dp = S.datepicker.init(el);
      S.slots.render(fs, null);
      if (st.date && dp.isOpen(st.date)) {
        dp.view = new Date(st.date.getFullYear(), st.date.getMonth(), 1);
        var time = st.time;
        dp.select(st.date, false);
        st.time = time;
        var r = fs.querySelector('input[value="' + time + '"]:not(:disabled)');
        if (r) r.checked = true; else st.time = "";
      }
    },
    done: function () {
      var a = B.body.querySelector("[data-book-ics]");
      if (!a || !window.Blob || !URL.createObjectURL) { if (a) a.hidden = true; return; }
      if (B.icsUrl) URL.revokeObjectURL(B.icsUrl);
      B.icsUrl = URL.createObjectURL(new Blob([ics()], { type: "text/calendar;charset=utf-8" }));
      a.href = B.icsUrl;
    }
  };

  // Calendar file for «Добавить в календарь»: local (floating) time, 30 minutes.
  function ics() {
    var s = service(st.service);
    var d = st.mode === "slots" ? doctor(st.doctor) : null;
    var p = st.time.split(":");
    var start = new Date(st.date.getFullYear(), st.date.getMonth(), st.date.getDate(), +p[0], +p[1]);
    var end = new Date(start.getTime() + 30 * 60000);
    function f(x) {
      return x.getFullYear() + String(x.getMonth() + 1).padStart(2, "0") + String(x.getDate()).padStart(2, "0") + "T" +
        String(x.getHours()).padStart(2, "0") + String(x.getMinutes()).padStart(2, "0") + "00";
    }
    function t(x) { return String(x).replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n"); }
    var now = new Date();
    return [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Sihat RKB//Prototype//RU", "BEGIN:VEVENT",
      "UID:" + now.getTime() + "@sihat-prototype",
      "DTSTAMP:" + now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, ""),
      "DTSTART:" + f(start), "DTEND:" + f(end),
      "SUMMARY:" + t(s.title + " — Сихат РКБ"),
      "LOCATION:" + t(D.address ? D.address.full + ", " + D.address.buildings[0].place : ""),
      "DESCRIPTION:" + t((d ? "Врач: " + d.name + ". " : "") + "Телефон: " + PHONE.number),
      "END:VEVENT", "END:VCALENDAR", ""
    ].join("\r\n");
  }

  function onValid(e) {
    var form = e.target;
    if (form.id !== "book-form") return;
    var fd = new FormData(form);
    switch (st.step) {
      case "service": {
        var id = fd.get("service");
        if (id !== st.service) { st.service = id; st.doctor = ""; st.date = null; st.time = ""; }
        return go(st.mode === "lab" ? "datetime" : "doctor");
      }
      case "doctor": {
        var doc = fd.get("doctor");
        if (doc !== st.doctor) { st.doctor = doc; st.date = null; st.time = ""; }
        return go("datetime");
      }
      case "datetime": {
        if (!st.date) {
          var dp = B.body.querySelector(".datepicker");
          var f = dp.closest(".field");
          f.classList.add("field--error");
          f.querySelector(".field__msg").innerHTML = icon("alert-circle") + "<span>Выберите дату</span>";
          var btn = dp.querySelector('.datepicker__day[tabindex="0"]');
          if (btn) btn.focus();
          return;
        }
        st.time = fd.get("time");
        return go("contacts");
      }
      case "contacts":
        st.name = String(fd.get("name")).trim();
        st.phone = String(fd.get("phone")).trim();
        return finish();
      case "request":
        st.name = String(fd.get("name")).trim();
        st.phone = String(fd.get("phone")).trim();
        st.comment = String(fd.get("comment") || "").trim();
        st.contact = fd.get("contact") || "call";
        st.directionName = fd.get("direction") || "";
        return finish();
    }
  }

  function finish() {
    go("done");
    document.dispatchEvent(new CustomEvent("booking:done", { detail: JSON.parse(JSON.stringify(st)) }));
  }

  // Keep the chosen time in the state as soon as it is picked (so «Назад» keeps it).
  document.addEventListener("change", function (e) {
    if (!B || !st || st.step !== "datetime" || !B.dlg.contains(e.target)) return;
    if (e.target.name === "time") st.time = e.target.value;
  });

  S.booking = { open: open };

  /* ------------------------------------------------------------------ payment */

  var P = null;
  var pay = null;

  function ensurePayment() {
    if (P) return P;
    P = shell("modal-pay", { title: "Отменить оплату?", stay: "Продолжить оплату", close: "Отменить" }, function () {
      return P.dirty && pay && pay.step !== "done";
    });
    P.dlg.addEventListener("form:valid", function (e) {
      if (e.target.id !== "pay-form" || pay.busy) return;
      var fd = new FormData(e.target);
      pay.name = String(fd.get("name")).trim();
      pay.phone = String(fd.get("phone")).trim();
      pay.email = String(fd.get("email")).trim();
      pay.busy = true;
      var btn = P.foot.querySelector("button");
      btn.disabled = true;
      btn.textContent = "Переходим к оплате…";
      setTimeout(function () {
        pay.busy = false;
        pay.order = "СХ-" + String(Date.now()).slice(-6);
        renderPay("done");
        P.focusTitle();
        document.dispatchEvent(new CustomEvent("payment:done", { detail: JSON.parse(JSON.stringify(pay)) }));
      }, reduceMotion.matches ? 0 : 900);
    });
    P.dlg.addEventListener("click", function (e) {
      if (e.target.closest("[data-pay-finish]")) S.modal.close(P.dlg, { force: true });
    });
    return P;
  }

  function renderPay(step) {
    pay.step = step;
    var s = service(pay.service);
    P.setHead(step === "done" ? "Оплата прошла" : "Оплата услуги", 0, 1);
    P.back.hidden = true;
    P.restoring = true;
    if (step === "form") {
      P.body.innerHTML =
        '<div class="pay-total"><p class="pay-total__title">' + esc(s.title) + "</p>" +
        '<p class="pay-total__code">Код услуги ' + esc(s.code) + "</p>" +
        '<p class="pay-total__price"><span class="visually-hidden">К оплате: </span>' + rub(s.price) + "</p></div>" +
        '<form class="form" id="pay-form" data-validate novalidate>' +
        '<div class="form__row">' + nameField("pay", pay.name) + phoneField("pay", pay.phone) + "</div>" +
        field("pay-email", "Почта для чека", '<input class="field__control" id="pay-email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="name@mail.ru" required data-msg-required="Укажите почту — на неё придёт чек" aria-describedby="pay-email-hint">',
          { hint: "Пришлём кассовый чек по закону 54-ФЗ" }) +
        consentField("pay", CONSENT_OFFER, false) +
        '<div class="alert alert--info">' + icon("lock") + "<div><p>Дальше откроется страница банка для оплаты картой или по СБП. Это макет: оплата не проводится, данные карты не запрашиваются.</p></div></div>" +
        "</form>";
      P.foot.innerHTML = '<button class="btn btn--primary btn--block" type="submit" form="pay-form">' + icon("credit-card") + "Оплатить " + rub(s.price) + "</button>";
    } else {
      P.body.innerHTML =
        '<div class="result" role="status"><span class="result__icon">' + icon("circle-check", "icon--l") + "</span>" +
        '<p class="result__text">Чек отправили на ' + esc(pay.email) + ". Сохраните номер заказа — он пригодится в клинике.</p></div>" +
        summary([
          ["Заказ", "№ " + esc(pay.order)],
          ["Услуга", esc(s.title)],
          ["Оплачено", rub(s.price)],
          ["Плательщик", esc(pay.name) + ", " + esc(pay.phone)]
        ]) +
        (s.booking !== "request" && !pay.fromBooking
          ? '<div class="flow__actions"><button class="btn btn--secondary btn--s" type="button" data-book data-service="' + s.id + '">' + icon("calendar") + "Записаться на приём</button></div>"
          : "") +
        '<p class="form__note">Это макет: деньги не списывались.</p>';
      P.foot.innerHTML = '<button class="btn btn--primary btn--block" type="button" data-pay-finish>Готово</button>';
    }
    P.restoring = false;
  }

  function openPayment(id, opener, prefill) {
    var s = service(id);
    if (!s) return;
    ensurePayment();
    prefill = prefill || {};
    pay = { service: s.id, step: "form", name: prefill.name || "", phone: prefill.phone || "", email: "", busy: false, fromBooking: !!prefill.fromBooking };
    P.dirty = false;
    renderPay("form");
    S.modal.open(P.dlg, opener);
    P.focusTitle();
  }

  S.payment = { open: openPayment };

  /* ------------------------------------------------------------------ openers */

  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-book]");
    if (b) {
      e.preventDefault();
      open({
        service: b.getAttribute("data-service") || "",
        doctor: b.getAttribute("data-doctor") || "",
        direction: b.getAttribute("data-direction") || ""
      }, b);
      return;
    }
    var p = e.target.closest && e.target.closest("[data-pay]");
    if (p) {
      e.preventDefault();
      // From the booking confirmation: carry the name and phone over.
      var fromBooking = B && B.dlg.contains(p) && st;
      openPayment(p.getAttribute("data-pay"), p, fromBooking ? { name: st.name, phone: st.phone, fromBooking: true } : null);
    }
  });
})();

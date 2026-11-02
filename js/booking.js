/*
  Booking flow (answers 3, 4 and 5 of the client, A-03, A-04). Mock only: nothing is sent anywhere, no payment provider.
  Needs data/site.js, data/directions.js, data/doctors.js, data/services.js, data/schedule.js and js/ui.js, js/forms.js
  (load after them).

  Opening, from markup (event delegation, works for markup rendered later):
    <button data-book>                               no preset: choose one of the two scenarios (R-1)
    <button data-book data-service="cons-kardiolog"> preset service; the scenario comes from service.booking
    <button data-book data-doctor="<doctor id>">     preset doctor: scenario «doctor», starts at date and time
    <button data-book data-direction="chek-ap">      preset direction: the scenario of its services
  From JS: Sihat.booking.open({ service, doctor, direction }, openerElement)
  Event on document: "booking:done", detail = the entered data.

  Both scenarios end with «администратор подтвердит»; nothing reads as a final booking.
    request  a service without an exact time: name, phone, comment, contact method, consent → the administrator calls back
    doctor   doctor → date and time → name, phone, consent → «Оплатить сейчас» / «Оплатить в клинике» → awaiting confirmation
             A-36: states of a frequently updated schedule: no free time on the chosen day, the nearest free date,
             no open schedule, «Оставить заявку без времени» (switches to request, the doctor is kept).
             A-38: payment is a step of this scenario only, full price, only when the price is fixed (service.fixed).

  One <dialog class="modal modal--flow">: a centred modal on desktop, a full-screen sheet below 768px.
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
  var SCHEDULE = window.SIHAT_SCHEDULE;
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
  function rub(n) { return Number(n).toLocaleString("ru-RU") + " ₽"; }
  function find(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function service(id) { return find(SERVICES, id); }
  function doctor(id) { return find(DOCTORS, id); }
  function direction(id) { return find(DIRECTIONS, id); }
  function serviceForDoctor(d) {
    return SERVICES.filter(function (s) { return s.booking === "doctor" && s.spec === d.spec; })[0] || null;
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
  function consentField(p, html, checked, name) {
    return (
      '<div class="field"><label class="check" for="' + p + '-consent"><input class="check__input" id="' + p +
      '-consent" name="' + (name || "consent") + '" type="checkbox" required data-msg-required="Без согласия мы не сможем продолжить"' +
      (checked ? " checked" : "") + '><span class="check__text">' + html + "</span></label>" +
      '<p class="field__msg" id="' + p + '-consent-msg" aria-live="polite"></p></div>'
    );
  }
  function legalHref(i) { return (D.legal && D.legal.docs && D.legal.docs[i] && D.legal.docs[i].href) || "#"; }
  var CONSENT_PD = 'Согласен на <a href="' + legalHref(1) + '">обработку персональных данных</a> и принимаю <a href="' + legalHref(0) + '">политику конфиденциальности</a>';
  var CONSENT_OFFER = 'Принимаю условия <a href="' + legalHref(2) + '">договора-оферты</a>';

  function summary(rows, compact) {
    return (
      '<dl class="summary' + (compact ? " summary--compact" : "") + '">' +
      rows.filter(function (r) { return r && r[1]; }).map(function (r) {
        return '<div class="summary__row"><dt class="summary__term">' + esc(r[0]) + '</dt><dd class="summary__value">' + r[1] + "</dd></div>";
      }).join("") + "</dl>"
    );
  }

  /* ------------------------------------------------------------------ dialog shell */

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

  /* ------------------------------------------------------------------ state */

  var B = null;      // shell
  var st = null;     // state of the current booking

  function fresh() {
    return { mode: "choose", step: "choose", service: "", doctor: "", date: null, time: "", name: "", phone: "", consent: false,
      comment: "", contact: "call", direction: "", directionName: "", spec: "all", pay: "clinic", email: "", offer: false,
      order: "", busy: false, returns: [] };
  }

  // A-38: the price must be fixed; every doctor visit in the mock data is, so this is the rule for real data.
  // Before a doctor is chosen the visit is unknown: count the payment step, it is the usual case.
  function payable() { var s = service(st.service); return !s || s.fixed !== false; }

  function stepsOf() {
    if (st.mode === "choose") return ["choose"];
    if (st.mode === "request") return ["request", "done"];
    return ["doctor", "datetime", "contacts"].concat(payable() ? ["payment"] : []).concat(["done"]);
  }

  function ensureBooking() {
    if (B) return B;
    B = shell("modal-book", { title: "Закрыть запись?", stay: "Продолжить запись", close: "Закрыть" }, function () {
      return B.dirty && st && st.step !== "done";
    });
    B.back.addEventListener("click", back);
    B.dlg.addEventListener("form:valid", onValid);
    B.dlg.addEventListener("click", function (e) {
      var choose = e.target.closest("[data-book-choose]");
      if (choose) {
        st.returns.push({ mode: "choose", step: "choose" });
        st.mode = choose.getAttribute("data-book-choose");
        go(st.mode === "request" ? "request" : "doctor");
      }
      else if (e.target.closest("[data-book-request]")) {
        // «Оставить заявку без времени»: «Назад» returns here; the doctor stays in the request.
        st.returns.push({ mode: st.mode, step: st.step });
        st.mode = "request";
        go("request");
      }
      else if (e.target.closest("[data-book-finish]")) S.modal.close(B.dlg, { force: true });
    });
    B.dlg.addEventListener("datepicker:change", function (e) {
      if (B.restoring) return;
      st.date = e.detail.date;
      st.time = "";
      clearMsg(B.body.querySelector("#bk-time-msg"));
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
    B.dlg.addEventListener("change", function (e) {
      if (e.target.name === "time") { st.time = e.target.value; clearMsg(e.target); }
      else if (e.target.name === "pay") { st.pay = e.target.value; syncPayment(); }
      else if (e.target.name === "spec") { st.spec = e.target.value; filterDoctors(); }
    });
    B.dlg.addEventListener("input", function (e) {
      if (e.target.id === "bk-doc-search") filterDoctors();
    });
    B.dlg.addEventListener("keydown", function (e) {
      // Enter in the search field must not submit the step.
      if (e.key === "Enter" && e.target.id === "bk-doc-search") e.preventDefault();
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
      case "choose": return "Как вы хотите записаться?";
      case "doctor": return "Выберите врача";
      case "datetime": return "Дата и время приёма";
      case "contacts": return "Ваши данные";
      case "payment": return "Оплата приёма";
      case "request":
        if (st.doctor) return "Заявка без времени";
        if (s) return "Заявка: " + s.title;
        var dir = direction(st.direction);
        return dir ? "Заявка: " + dir.title : "Оставить заявку";
      case "done": return st.mode === "request" ? "Заявка отправлена" : "Заявка на приём отправлена";
    }
    return "";
  }

  function open(opts, opener) {
    ensureBooking();
    opts = opts || {};
    st = fresh();
    var s = opts.service && service(opts.service);
    var d = opts.doctor && doctor(opts.doctor);
    var start = "choose";
    if (d) {
      st.mode = "doctor";
      st.doctor = d.id;
      s = serviceForDoctor(d);
      st.service = s ? s.id : "";
      start = "datetime";
    } else if (s) {
      st.mode = s.booking;
      if (s.booking === "doctor") { st.spec = s.spec; start = "doctor"; }
      else { st.service = s.id; start = "request"; }
    } else if (opts.direction) {
      st.direction = opts.direction;
      var kinds = SERVICES.filter(function (x) { return x.direction === opts.direction; }).map(function (x) { return x.booking; });
      st.mode = kinds.indexOf("doctor") !== -1 ? "doctor" : "request";
      start = st.mode;
    }
    B.dirty = false;
    render(start);
    S.modal.open(B.dlg, opener);
    B.focusTitle();
  }

  function go(step) { render(step); B.focusTitle(); }

  function back() {
    var steps = stepsOf();
    var i = steps.indexOf(st.step);
    if (i > 0) return go(steps[i - 1]);
    var r = st.returns.pop();
    if (r) { st.mode = r.mode; go(r.step); }
  }

  function render(step) {
    st.step = step;
    var steps = stepsOf();
    var i = steps.indexOf(step);
    B.setHead(stepTitle(step), step === "done" ? 0 : i + 1, steps.length - 1);
    B.back.hidden = step === "done" || (i <= 0 && !st.returns.length);
    B.restoring = true;
    B.body.innerHTML = views[step]();
    B.foot.innerHTML = foot(step);
    if (afterRender[step]) afterRender[step]();
    B.restoring = false;
  }

  function foot(step) {
    if (step === "choose") return "";
    if (step === "done") return '<button class="btn btn--primary btn--block" type="button" data-book-finish>Готово</button>';
    if (step === "datetime" && !SCHEDULE.isPublished(st.doctor)) {
      return '<button class="btn btn--primary btn--block" type="button" data-book-request>Оставить заявку без времени</button>';
    }
    var submit = step === "request" || step === "payment" || (step === "contacts" && !payable());
    var label = submit ? "Отправить заявку" : "Далее";
    return '<button class="btn btn--primary btn--block" type="submit" form="book-form">' + esc(label) +
      (submit ? "" : icon("arrow-right")) + "</button>";
  }

  function whenText() { return esc(S.datepicker.label(st.date)) + ", " + esc(st.time); }

  // Summary of what is chosen so far, shown at the top of the later steps.
  function chosen(compact) {
    var s = service(st.service);
    var d = doctor(st.doctor);
    var rows = [];
    if (d) rows.push(["Врач", esc(d.name)]);
    if (s) rows.push([st.mode === "request" && !d ? "Услуга" : "Приём", esc(s.title) + ' <span class="summary__price">' + rub(s.price) + "</span>"]);
    if (st.date && st.time && st.mode === "doctor" && st.step !== "datetime") rows.push(["Желаемое время", whenText()]);
    return rows.length ? summary(rows, compact) : "";
  }

  function option(id, name, value, checked, extra, inner) {
    return '<label class="option" for="' + id + '"><input class="option__input" type="radio" id="' + id + '" name="' + name +
      '" value="' + esc(value) + '"' + (checked ? " checked" : "") + extra + '><span class="option__box">' + inner +
      '<span class="option__mark" aria-hidden="true"></span></span></label>';
  }

  function nearestText(d) {
    var near = SCHEDULE.nearest(d.id);
    return near ? "Ближайшая запись: <strong>" + esc(SCHEDULE.shortLabel(near)) + "</strong>" : "Расписание пока не открыто";
  }

  var views = {
    // R-1: the two scenarios of answer 4 and a phone for those who are not sure.
    choose: function () {
      function card(mode, ic, title, text, go) {
        return '<button class="scenario" type="button" data-book-choose="' + mode + '"><span class="scenario__icon">' + icon(ic) + "</span>" +
          '<span class="scenario__title">' + title + '</span><span class="scenario__text">' + text + "</span>" +
          '<span class="scenario__go">' + go + icon("arrow-right") + "</span></button>";
      }
      return (
        '<div class="scenarios">' +
        card("doctor", "stethoscope", "К врачу, на дату и время", "Выберите врача, свободный день и время. Оплатить можно сразу или в клинике.", "Выбрать врача") +
        card("request", "clipboard-heart", "На услугу или программу", "Чек-ап, роды, операция, анализы. Оставьте заявку, точное время не нужно.", "Оставить заявку") +
        "</div>" +
        '<p class="flow__lead">В обоих случаях запись подтверждает администратор. Не знаете, что выбрать? Позвоните: <a class="nowrap" href="' + PHONE.href + '">' + esc(PHONE.number) + "</a>.</p>"
      );
    },

    // R-2, R-3: search, specialty chips, nearest date and price on each doctor.
    doctor: function () {
      var specs = [];
      DOCTORS.forEach(function (d) { if (specs.indexOf(d.spec) === -1) specs.push(d.spec); });
      specs.sort();
      function chip(value, label, n) {
        var id = "bk-spec-" + n;
        return '<label class="slot" for="' + id + '"><input class="slot__input" type="radio" id="' + id + '" name="spec" value="' + esc(value) + '"' +
          (st.spec === value ? " checked" : "") + '><span class="slot__text">' + esc(label) + "</span></label>";
      }
      return (
        '<form class="form" id="book-form" data-validate novalidate>' +
        '<div class="field"><label class="field__label" for="bk-doc-search">Поиск врача</label><div class="search">' + icon("search") +
        '<input class="field__control" id="bk-doc-search" type="search" placeholder="ФИО или специальность" autocomplete="off"></div></div>' +
        '<fieldset class="filter-chips"><legend class="visually-hidden">Специальность</legend><div class="filter-chips__list">' +
        chip("all", "Все", "all") + specs.map(function (x, n) { return chip(x, x, n); }).join("") + "</div></fieldset>" +
        '<fieldset class="field options"><legend class="visually-hidden">Врач</legend><div class="options__list">' +
        DOCTORS.map(function (d, n) {
          var s = serviceForDoctor(d);
          return option("bk-doc-" + n, "doctor", d.id, st.doctor === d.id, n === 0 ? ' required data-msg-required="Выберите врача"' : "",
            '<span class="option__media media' + (d.photo ? "" : " media--placeholder") + '">' + (d.photo ? '<img src="' + esc(d.photo) + '" alt="">' : icon("user")) + "</span>" +
            '<span class="option__body"><span class="option__title">' + esc(d.name) + "</span>" +
            '<span class="option__text">' + esc(d.spec) + ". " + esc(d.role) + "</span>" +
            '<span class="option__meta"><span>' + nearestText(d) + "</span>" + (s ? "<strong>" + rub(s.price) + "</strong>" : "") + "</span></span>");
        }).join("") +
        '</div><p class="field__msg" id="bk-doc-msg" aria-live="polite"></p></fieldset>' +
        '<div class="empty" data-doc-empty hidden><p class="empty__title">Никого не нашли</p><p class="empty__text">Проверьте написание или выберите другую специальность.</p></div>' +
        "</form>" +
        '<div class="flow__aside"><p class="flow__aside-title">Не знаете, к кому записаться?</p>' +
        "<p>Оставьте заявку без времени: администратор перезвонит и подскажет врача.</p>" +
        '<button class="btn btn--secondary btn--s" type="button" data-book-request>Оставить заявку</button></div>'
      );
    },

    datetime: function () {
      var key = st.doctor;
      if (!SCHEDULE.isPublished(key)) {
        return (
          chosen(true) +
          '<div class="alert alert--info">' + icon("calendar") + '<div><p class="alert__title">Расписание этого врача пока не открыто</p>' +
          "<p>Оставьте заявку без времени: администратор перезвонит и предложит свободный день.</p></div></div>"
        );
      }
      var near = SCHEDULE.nearest(key);
      return (
        chosen(true) +
        '<p class="flow__lead">Расписание меняется часто, поэтому выбранное время подтвердит администратор.</p>' +
        '<form class="form" id="book-form" data-validate novalidate>' +
        (near
          ? '<p class="flow__nearest">Ближайшая свободная дата: <button class="btn btn--ghost btn--xs" type="button" data-slots-nearest="' + S.datepicker.iso(near) + '" data-slots-for="bk-time">' + esc(S.datepicker.label(near)) + "</button></p>"
          : "") +
        '<div class="flow__datetime">' +
        '<div class="field"><p class="field__label" id="bk-date-label">Дата</p>' +
        '<div class="datepicker" id="bk-date" data-datepicker data-name="date" data-days="' + SCHEDULE.horizon + '" data-slots-target="bk-time" data-schedule="' + esc(key) + '" role="group" aria-labelledby="bk-date-label"></div></div>' +
        '<fieldset class="slots field" id="bk-time" data-slots data-name="time" data-required data-schedule="' + esc(key) + '">' +
        '<legend class="slots__legend">Время приёма</legend>' +
        '<div class="slots__list"></div><p class="field__msg" id="bk-time-msg" aria-live="polite"></p></fieldset>' +
        "</div></form>" +
        // A-36: always available, whatever the schedule shows
        '<div class="flow__aside"><p class="flow__aside-title">Нет подходящего времени?</p>' +
        "<p>Администратор перезвонит и предложит другие варианты.</p>" +
        '<button class="btn btn--secondary btn--s" type="button" data-book-request>Оставить заявку без времени</button></div>'
      );
    },

    contacts: function () {
      return (
        chosen(true) +
        '<form class="form" id="book-form" data-validate novalidate>' +
        '<div class="form__row">' + nameField("bk", st.name) + phoneField("bk", st.phone) + "</div>" +
        consentField("bk", CONSENT_PD, st.consent) +
        "</form>"
      );
    },

    // A-38: «Оплатить сейчас» / «Оплатить в клинике», after the time is chosen. «В клинике» is the default.
    payment: function () {
      var s = service(st.service);
      return (
        chosen(true) +
        '<form class="form" id="book-form" data-validate novalidate>' +
        '<fieldset class="field options"><legend class="field__label">Как удобнее оплатить</legend><div class="options__list">' +
        option("bk-pay-clinic", "pay", "clinic", st.pay === "clinic", "",
          '<span class="option__body"><span class="option__title">Оплатить в клинике</span><span class="option__text">В день приёма, картой или наличными</span></span>' +
          '<span class="option__aside">' + rub(s.price) + "</span>") +
        option("bk-pay-now", "pay", "now", st.pay === "now", "",
          '<span class="option__body"><span class="option__title">Оплатить сейчас</span><span class="option__text">Полная стоимость приёма, картой или по СБП</span></span>' +
          '<span class="option__aside">' + rub(s.price) + "</span>") +
        "</div></fieldset>" +
        '<div class="form" data-pay-now hidden>' +
        field("bk-email", "Почта для чека", '<input class="field__control" id="bk-email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="name@mail.ru" required data-msg-required="Укажите почту: на неё придёт чек" aria-describedby="bk-email-hint" value="' + esc(st.email) + '">',
          { hint: "Пришлём кассовый чек по закону 54-ФЗ" }) +
        consentField("bk-offer", CONSENT_OFFER, st.offer, "offer") +
        '<div class="alert alert--info">' + icon("lock") + "<div><p>Дальше откроется страница банка. Это макет: оплата не проводится, данные карты не запрашиваются.</p></div></div>" +
        "</div>" +
        '<p class="flow__lead" data-pay-note></p>' +
        "</form>"
      );
    },

    request: function () {
      var s = service(st.service);
      var d = doctor(st.doctor);
      var dir = direction(st.direction);
      var dirs = D.directions || [];
      return (
        chosen(true) +
        '<form class="form" id="book-form" data-validate novalidate>' +
        '<p class="flow__lead">Точное время выбирать не нужно: администратор перезвонит в рабочее время, ответит на вопросы, подберёт дату и подтвердит запись.</p>' +
        '<div class="form__row">' + nameField("rq", st.name) + phoneField("rq", st.phone) + "</div>" +
        (s || d ? "" : field("rq-direction", "Направление", '<div class="field__wrap"><select class="field__control" id="rq-direction" name="direction">' +
          '<option value="">Пока не знаю</option>' +
          dirs.map(function (n) { return "<option" + (dir && dir.title === n ? " selected" : st.directionName === n ? " selected" : "") + ">" + esc(n) + "</option>"; }).join("") +
          "</select>" + icon("chevron-down", "field__icon") + "</div>", { optional: true })) +
        field("rq-comment", "Комментарий", '<textarea class="field__control" id="rq-comment" name="comment" rows="3" placeholder="Например, удобное время для звонка">' + esc(st.comment) + "</textarea>", { optional: true }) +
        '<fieldset class="field choices"><legend class="field__label">Удобный способ связи</legend><div class="choices__list">' +
        CONTACTS.map(function (c) {
          var id = "rq-c-" + c.value;
          return '<label class="slot" for="' + id + '"><input class="slot__input" type="radio" id="' + id + '" name="contact" value="' + c.value + '"' +
            (st.contact === c.value ? " checked" : "") + '><span class="slot__text">' + icon(c.icon) + esc(c.label) + "</span></label>";
        }).join("") + "</div></fieldset>" +
        consentField("rq", CONSENT_PD, st.consent) +
        "</form>"
      );
    },

    done: function () {
      var s = service(st.service);
      var d = doctor(st.doctor);
      var STATUS = ["Статус", "Ждёт подтверждения администратора"];
      function result(title, text) {
        return '<div class="result" role="status"><span class="result__icon result__icon--pending">' + icon("clock", "icon--l") + "</span>" +
          '<p class="result__title">' + title + '</p><p class="result__text">' + text + "</p></div>";
      }
      if (st.mode === "request") {
        var c = CONTACTS.filter(function (x) { return x.value === st.contact; })[0] || CONTACTS[0];
        var dir = direction(st.direction);
        return (
          result("Запись ещё не подтверждена",
            "Администратор свяжется с вами " + esc(c.done) + " в рабочее время (" + esc(HOURS) + "), уточнит детали и подтвердит запись.") +
          summary([
            STATUS,
            d ? ["Врач", esc(d.name)] : null,
            ["Услуга", s ? esc(s.title) : st.directionName ? esc(st.directionName) : dir ? esc(dir.title) : ""],
            ["Имя", esc(st.name)],
            ["Телефон", esc(st.phone)],
            ["Комментарий", esc(st.comment)]
          ]) +
          '<p class="form__note">Это макет: заявка никуда не отправляется.</p>'
        );
      }
      var place = D.address ? D.address.street + ", " + D.address.buildings[0].place : "";
      var paid = st.pay === "now";
      return (
        result("Приём ещё не подтверждён",
          "Администратор свяжется с вами в рабочее время (" + esc(HOURS) + ") и подтвердит приём. " +
          (paid
            // A-38: to be confirmed with the client (question 21)
            ? "Если выбранное время окажется занято, предложит другое или оформит возврат оплаты."
            : "Если выбранное время окажется занято, предложит другое.")) +
        summary([
          STATUS,
          ["Врач", esc(d.name)],
          ["Приём", esc(s.title)],
          ["Желаемое время", whenText()],
          ["Где", esc(place)],
          ["Стоимость", rub(s.price)],
          ["Оплата", paid ? "Оплачено онлайн, заказ № " + esc(st.order) + ". Чек отправили на " + esc(st.email) : "В клинике, в день приёма"],
          ["Пациент", esc(st.name) + ", " + esc(st.phone)]
        ]) +
        '<p class="form__note">Изменились планы? Позвоните: <a class="nowrap" href="' + PHONE.href + '">' + esc(PHONE.number) + "</a>. Это макет: заявка никуда не отправляется, деньги не списываются.</p>"
      );
    }
  };

  // Search and specialty chips of the doctor step: rows stay in the DOM, so the choice and focus survive.
  function norm(s) { return String(s).toLowerCase().replace(/ё/g, "е"); }
  function filterDoctors() {
    var search = B.body.querySelector("#bk-doc-search");
    if (!search) return;
    var words = norm(search.value.trim()).split(/\s+/).filter(Boolean);
    var any = false;
    Array.prototype.forEach.call(B.body.querySelectorAll('input[name="doctor"]'), function (input) {
      var d = doctor(input.value);
      var text = norm(d.name + " " + d.spec + " " + d.role);
      var on = (st.spec === "all" || d.spec === st.spec) && words.every(function (w) { return text.indexOf(w) !== -1; });
      input.closest(".option").hidden = !on;
      if (on) any = true;
      else if (input.checked) input.checked = false;
    });
    B.body.querySelector("[data-doc-empty]").hidden = any;
  }

  function syncPayment() {
    var now = st.pay === "now";
    var box = B.body.querySelector("[data-pay-now]");
    if (!box) return;
    box.hidden = !now;
    // Disabled fields are skipped by the validation in js/forms.js.
    Array.prototype.forEach.call(box.querySelectorAll("input"), function (i) { i.disabled = !now; });
    var s = service(st.service);
    var btn = B.foot.querySelector("button");
    btn.textContent = now ? "Оплатить " + rub(s.price) : "Отправить заявку";
    B.body.querySelector("[data-pay-note]").textContent = now
      ? "После оплаты администратор свяжется с вами и подтвердит приём."
      : "После отправки администратор свяжется с вами и подтвердит приём.";
  }

  var afterRender = {
    doctor: filterDoctors,
    payment: syncPayment,
    datetime: function () {
      var el = B.body.querySelector("[data-datepicker]");
      if (!el) return;
      var fs = B.body.querySelector("[data-slots]");
      var dp = S.datepicker.init(el);
      S.slots.render(fs, null);
      // R-4: open on the nearest free date at once, or on the date chosen before «Назад».
      var date = st.date || SCHEDULE.nearest(st.doctor);
      if (!date || !dp.isOpen(date)) return;
      var time = st.time;
      dp.goTo(date, false);
      st.date = date;
      var r = time && fs.querySelector('input[value="' + time + '"]:not(:disabled)');
      if (r) { r.checked = true; st.time = time; } else st.time = "";
    }
  };

  function onValid(e) {
    var form = e.target;
    if (form.id !== "book-form" || st.busy) return;
    var fd = new FormData(form);
    switch (st.step) {
      case "doctor": {
        var id = fd.get("doctor");
        if (id !== st.doctor) { st.doctor = id; st.date = null; st.time = ""; }
        var s = serviceForDoctor(doctor(id));
        st.service = s ? s.id : "";
        return go("datetime");
      }
      case "datetime": {
        // A day without free time has no radios to validate.
        st.time = fd.get("time") || "";
        if (!st.time) {
          var f = B.body.querySelector("#bk-time");
          f.classList.add("field--error");
          f.querySelector(".field__msg").innerHTML = icon("alert-circle") + "<span>Выберите день со свободным временем или оставьте заявку без времени</span>";
          return;
        }
        return go("contacts");
      }
      case "contacts":
        st.name = String(fd.get("name")).trim();
        st.phone = String(fd.get("phone")).trim();
        st.consent = true;
        return payable() ? go("payment") : finish();
      case "payment":
        if (st.pay !== "now") return finish();
        st.email = String(fd.get("email")).trim();
        st.offer = true;
        st.busy = true;
        var btn = B.foot.querySelector("button");
        btn.disabled = true;
        btn.textContent = "Переходим к оплате…";
        var current = st;
        setTimeout(function () {
          current.busy = false;
          if (st !== current || !B.dlg.open) return;
          st.order = "СХ-" + String(Date.now()).slice(-6);
          finish();
        }, reduceMotion.matches ? 0 : 900);
        return;
      case "request":
        st.name = String(fd.get("name")).trim();
        st.phone = String(fd.get("phone")).trim();
        st.comment = String(fd.get("comment") || "").trim();
        st.contact = fd.get("contact") || "call";
        st.directionName = fd.get("direction") || "";
        st.consent = true;
        return finish();
    }
  }

  function finish() {
    go("done");
    document.dispatchEvent(new CustomEvent("booking:done", { detail: JSON.parse(JSON.stringify(st)) }));
  }

  S.booking = { open: open };

  /* ------------------------------------------------------------------ openers */

  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-book]");
    if (!b) return;
    e.preventDefault();
    open({
      service: b.getAttribute("data-service") || "",
      doctor: b.getAttribute("data-doctor") || "",
      direction: b.getAttribute("data-direction") || ""
    }, b);
  });
})();

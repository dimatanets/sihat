/*
  Forms: validation, phone mask, date picker, time slots. No data is sent anywhere (static prototype).

  Validation — <form data-validate novalidate>:
    Each control sits in .field with an empty <p class="field__msg" id="…-msg" aria-live="polite">.
    Rules: [required] (text, select, checkbox), [data-phone-mask] (11 digits), type="email".
    Custom texts: data-msg-required="…", data-msg-invalid="…".
    On error: .field--error, aria-invalid="true", aria-describedby → message; focus goes to the first error.
    On success: the form is hidden and the next [data-form-success] sibling is shown and focused.
    A [data-form-again] button inside the success element brings back the empty form.
    After the first submit, fields re-validate as the user types. JS: Sihat.forms.validate(form) → boolean,
    Sihat.forms.reset(form).

  Phone mask — <input type="tel" data-phone-mask>: formats to +7 (XXX) XXX-XX-XX.

  Date picker — <div class="datepicker" data-datepicker data-name="date" data-days="60" data-slots-target="slots-id">
    Renders a month grid (keyboard: arrows, Home/End, PageUp/PageDown). Sundays and some mock days are
    unavailable. Writes ISO date to a hidden input, fires "datepicker:change" {detail: {date, iso, label}}.
    JS: Sihat.datepicker.init(el).

  Time slots — <fieldset class="slots" id="slots-id" data-slots data-name="time"><legend class="slots__legend">…
    <div class="slots__list"></div></fieldset>. Radio chips; arrow keys work natively.
    JS: Sihat.slots.render(fieldset, date) fills mock slots for that date (or a hint when date is null).
*/
(function () {
  "use strict";

  window.Sihat = window.Sihat || {};

  /* ------------------------------------------------------------------ phone mask */

  // The 10 digits after +7. Accepts "+7 (…", "8 927 …", "7927…" and pasted numbers.
  function phoneDigits(value) {
    var s = String(value).trim();
    var d;
    if (s.indexOf("+7") === 0) {
      d = s.slice(2).replace(/\D/g, "");
      if (d.length > 10 && (d.charAt(0) === "8" || d.charAt(0) === "7")) d = d.slice(1);
    } else {
      d = s.replace(/\D/g, "");
      if (d.length > 10 || (d.length && (d.charAt(0) === "8" || d.charAt(0) === "7") && d.length === 11)) d = d.slice(1);
    }
    return d.slice(0, 10);
  }
  function formatPhone(d) {
    if (!d) return "";
    var out = "+7 (" + d.slice(0, 3);
    if (d.length >= 3) out += ") " + d.slice(3, 6);
    if (d.length >= 6) out += "-" + d.slice(6, 8);
    if (d.length >= 8) out += "-" + d.slice(8, 10);
    return out;
  }

  document.addEventListener("input", function (e) {
    var input = e.target;
    if (!input.matches || !input.matches("[data-phone-mask]")) return;
    var prev = input._digits || "";
    var digits = phoneDigits(input.value);
    // Backspace over a bracket, space or dash: remove the digit before it.
    if (e.inputType === "deleteContentBackward" && digits === prev) digits = digits.slice(0, -1);
    input._digits = digits;
    input.value = formatPhone(digits);
  });
  document.addEventListener("focusin", function (e) {
    var input = e.target;
    if (input.matches && input.matches("[data-phone-mask]") && !input.value) {
      input.value = "+7 (";
      input._digits = "";
    }
  });
  document.addEventListener("focusout", function (e) {
    var input = e.target;
    if (input.matches && input.matches("[data-phone-mask]") && !phoneDigits(input.value)) input.value = "";
  });

  /* ------------------------------------------------------------------ validation */

  var MSG = {
    required: "Заполните это поле",
    select: "Выберите вариант из списка",
    checkbox: "Отметьте, чтобы продолжить",
    phone: "Введите номер полностью: +7 (XXX) XXX-XX-XX",
    email: "Проверьте адрес почты: например, name@mail.ru"
  };

  function controlsOf(form) {
    return Array.prototype.filter.call(form.elements, function (el) {
      return el.closest(".field") && !el.disabled && el.type !== "hidden" && el.type !== "submit" && el.tagName !== "BUTTON" && el.tagName !== "FIELDSET";
    });
  }

  function check(el) {
    var v = (el.value || "").trim();
    if (el.type === "checkbox") {
      if (el.required && !el.checked) return el.getAttribute("data-msg-required") || MSG.checkbox;
      return "";
    }
    if (el.type === "radio") {
      var group = el.form ? el.form.querySelectorAll('input[name="' + el.name + '"]') : [el];
      var any = Array.prototype.some.call(group, function (r) { return r.checked; });
      if (el.required && !any) return el.getAttribute("data-msg-required") || MSG.select;
      return "";
    }
    if (el.hasAttribute("data-phone-mask")) {
      var d = phoneDigits(v);
      if (!d) return el.required ? el.getAttribute("data-msg-required") || MSG.required : "";
      return d.length === 10 ? "" : el.getAttribute("data-msg-invalid") || MSG.phone;
    }
    if (!v) {
      if (!el.required) return "";
      return el.getAttribute("data-msg-required") || (el.tagName === "SELECT" ? MSG.select : MSG.required);
    }
    if (el.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return el.getAttribute("data-msg-invalid") || MSG.email;
    return "";
  }

  function show(el, message) {
    var field = el.closest(".field");
    if (!field) return;
    var msg = field.querySelector(".field__msg");
    if (!msg) {
      msg = document.createElement("p");
      msg.className = "field__msg";
      msg.setAttribute("aria-live", "polite");
      field.appendChild(msg);
    }
    if (!msg.id) msg.id = (el.id || el.name) + "-msg";
    var described = (el.getAttribute("aria-describedby") || "").split(" ").filter(Boolean);
    if (described.indexOf(msg.id) === -1) described.push(msg.id);
    el.setAttribute("aria-describedby", described.join(" "));

    field.classList.toggle("field--error", !!message);
    if (message) {
      el.setAttribute("aria-invalid", "true");
      msg.innerHTML = '<span class="icon icon--alert-circle" aria-hidden="true"></span><span></span>';
      msg.lastChild.textContent = message;
    } else {
      el.removeAttribute("aria-invalid");
      msg.textContent = "";
    }
  }

  function validate(form) {
    var firstBad = null;
    var seenRadio = {};
    controlsOf(form).forEach(function (el) {
      if (el.type === "radio") {
        if (seenRadio[el.name]) return;
        seenRadio[el.name] = true;
      }
      var m = check(el);
      show(el, m);
      if (m && !firstBad) firstBad = el;
    });
    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  function reset(form) {
    form.reset();
    form.removeAttribute("data-touched");
    controlsOf(form).forEach(function (el) { show(el, ""); });
    form.hidden = false;
    var ok = successOf(form);
    if (ok) ok.hidden = true;
  }

  function successOf(form) {
    var n = form.nextElementSibling;
    while (n && !n.hasAttribute("data-form-success")) n = n.nextElementSibling;
    return n;
  }

  document.addEventListener("submit", function (e) {
    var form = e.target;
    if (!form.matches("form[data-validate]")) return;
    e.preventDefault();
    form.setAttribute("data-touched", "");
    if (!validate(form)) return;
    var ok = successOf(form);
    if (ok) {
      form.hidden = true;
      ok.hidden = false;
      ok.focus();
    }
    form.dispatchEvent(new CustomEvent("form:valid", { bubbles: true }));
  });

  function liveCheck(e) {
    var el = e.target;
    var form = el.form;
    if (!form || !form.hasAttribute("data-touched") || !form.matches("[data-validate]")) return;
    if (!el.closest(".field")) return;
    show(el, check(el));
  }
  document.addEventListener("input", liveCheck);
  document.addEventListener("change", liveCheck);

  // "Send another request" inside a success message: show the empty form again.
  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("[data-form-again]");
    if (!btn) return;
    var ok = btn.closest("[data-form-success]");
    var form = ok && ok.previousElementSibling;
    while (form && !form.matches("form[data-validate]")) form = form.previousElementSibling;
    if (!form) return;
    reset(form);
    var first = controlsOf(form)[0];
    if (first) first.focus();
  });

  // A modal form starts clean every time it is opened.
  document.addEventListener("modal:open", function (e) {
    Array.prototype.forEach.call(e.target.querySelectorAll("form[data-validate]"), reset);
  });

  window.Sihat.forms = { validate: validate, reset: reset, formatPhone: function (v) { return formatPhone(phoneDigits(v)); } };

  /* ------------------------------------------------------------------ date picker */

  var MONTHS = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
  var MONTHS_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  var DAYS = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
  var DAYS_SHORT = [["Пн", "понедельник"], ["Вт", "вторник"], ["Ср", "среда"], ["Чт", "четверг"], ["Пт", "пятница"], ["Сб", "суббота"], ["Вс", "воскресенье"]];

  function day(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function same(a, b) { return a && b && a.getTime() === b.getTime(); }
  function iso(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function label(d) { return d.getDate() + " " + MONTHS_GEN[d.getMonth()] + ", " + DAYS[d.getDay()]; }

  // Mock schedule: no work on Sundays, a few fully booked days.
  function available(d) {
    return d.getDay() !== 0 && (d.getDate() * 7 + d.getMonth()) % 11 !== 0;
  }

  function Datepicker(el) {
    this.el = el;
    this.today = day(new Date());
    this.min = this.today;
    this.max = addDays(this.today, parseInt(el.getAttribute("data-days"), 10) || 60);
    this.selected = null;
    this.input = el.querySelector('input[type="hidden"]');
    if (!this.input) {
      this.input = document.createElement("input");
      this.input.type = "hidden";
      this.input.name = el.getAttribute("data-name") || "date";
      el.appendChild(this.input);
    }
    this.focusDate = this.firstAvailable(this.min, 1);
    this.view = new Date(this.focusDate.getFullYear(), this.focusDate.getMonth(), 1);
    this.box = document.createElement("div");
    el.insertBefore(this.box, this.input);
    var self = this;
    el.addEventListener("click", function (e) { self.onClick(e); });
    el.addEventListener("keydown", function (e) { self.onKey(e); });
    this.render(false);
  }

  Datepicker.prototype.isOpen = function (d) { return d >= this.min && d <= this.max && available(d); };
  Datepicker.prototype.firstAvailable = function (from, step) {
    var d = from;
    for (var i = 0; i < 400; i++) {
      if (this.isOpen(d)) return d;
      d = addDays(d, step);
      if (d < this.min || d > this.max) break;
    }
    return from < this.min ? this.min : from > this.max ? this.max : from;
  };

  Datepicker.prototype.render = function (keepFocus) {
    var y = this.view.getFullYear(), m = this.view.getMonth();
    var first = new Date(y, m, 1);
    var offset = (first.getDay() + 6) % 7;
    var daysIn = new Date(y, m + 1, 0).getDate();
    var prevOk = new Date(y, m, 0) >= this.min;
    var nextOk = new Date(y, m + 1, 1) <= this.max;
    var id = this.el.id || (this.el.id = "dp-" + Math.random().toString(36).slice(2, 8));

    var h = '<div class="datepicker__head">' +
      '<button class="btn btn--tint btn--xs btn--icon" type="button" data-dp-nav="-1" aria-label="Предыдущий месяц"' + (prevOk ? "" : " disabled") + '><span class="icon icon--chevron-left" aria-hidden="true"></span></button>' +
      '<p class="datepicker__title" id="' + id + '-title" aria-live="polite">' + MONTHS[m] + " " + y + "</p>" +
      '<button class="btn btn--tint btn--xs btn--icon" type="button" data-dp-nav="1" aria-label="Следующий месяц"' + (nextOk ? "" : " disabled") + '><span class="icon icon--chevron-right" aria-hidden="true"></span></button>' +
      "</div>" +
      '<table class="datepicker__grid" aria-labelledby="' + id + '-title"><thead><tr>' +
      DAYS_SHORT.map(function (d) { return '<th scope="col"><abbr title="' + d[1] + '">' + d[0] + "</abbr></th>"; }).join("") +
      "</tr></thead><tbody><tr>";
    for (var i = 0; i < offset; i++) h += "<td></td>";
    for (var dnum = 1; dnum <= daysIn; dnum++) {
      var d = new Date(y, m, dnum);
      var open = this.isOpen(d);
      var focusable = same(d, this.focusDate);
      h += '<td><button class="datepicker__day" type="button" data-dp-date="' + iso(d) + '"' +
        ' tabindex="' + (focusable ? "0" : "-1") + '"' +
        ' aria-label="' + label(d) + (open ? "" : ", записи нет") + '"' +
        ' aria-pressed="' + (same(d, this.selected) ? "true" : "false") + '"' +
        (same(d, this.today) ? ' aria-current="date"' : "") +
        (open ? "" : " disabled") + ">" + dnum + "</button></td>";
      if ((offset + dnum) % 7 === 0 && dnum !== daysIn) h += "</tr><tr>";
    }
    h += "</tr></tbody></table>" +
      '<p class="datepicker__legend">Зачёркнуты дни без свободного времени. Выходной: воскресенье.</p>';
    this.box.innerHTML = h;
    // If the focus date is not in this month, let the first open day take the tab stop.
    if (!this.box.querySelector('.datepicker__day[tabindex="0"]')) {
      var btn = this.box.querySelector(".datepicker__day:not([disabled])");
      if (btn) btn.setAttribute("tabindex", "0");
    }
    if (keepFocus) {
      var f = this.box.querySelector('.datepicker__day[tabindex="0"]');
      if (f) f.focus();
    }
  };

  Datepicker.prototype.parse = function (s) {
    var p = s.split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]);
  };

  Datepicker.prototype.onClick = function (e) {
    var nav = e.target.closest("[data-dp-nav]");
    if (nav) {
      var dir = +nav.getAttribute("data-dp-nav");
      this.view = new Date(this.view.getFullYear(), this.view.getMonth() + dir, 1);
      var start = dir > 0 ? this.view : new Date(this.view.getFullYear(), this.view.getMonth() + 1, 0);
      this.focusDate = this.firstAvailable(start < this.min ? this.min : start, dir > 0 ? 1 : -1);
      this.render(false);
      return;
    }
    var btn = e.target.closest("[data-dp-date]");
    if (btn && !btn.disabled) this.select(this.parse(btn.getAttribute("data-dp-date")), true);
  };

  Datepicker.prototype.select = function (d, keepFocus) {
    this.selected = d;
    this.focusDate = d;
    this.input.value = iso(d);
    this.render(keepFocus);
    var detail = { date: d, iso: iso(d), label: label(d) };
    this.el.dispatchEvent(new CustomEvent("datepicker:change", { bubbles: true, detail: detail }));
    var target = this.el.getAttribute("data-slots-target");
    if (target && window.Sihat.slots) window.Sihat.slots.render(document.getElementById(target), d);
  };

  Datepicker.prototype.onKey = function (e) {
    var btn = e.target.closest("[data-dp-date]");
    if (!btn) return;
    var cur = this.parse(btn.getAttribute("data-dp-date"));
    var step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    var next = null;
    if (step) next = addDays(cur, step);
    else if (e.key === "Home") next = addDays(cur, -((cur.getDay() + 6) % 7));
    else if (e.key === "End") next = addDays(cur, 6 - ((cur.getDay() + 6) % 7));
    else if (e.key === "PageUp") next = new Date(cur.getFullYear(), cur.getMonth() - 1, cur.getDate());
    else if (e.key === "PageDown") next = new Date(cur.getFullYear(), cur.getMonth() + 1, cur.getDate());
    if (!next) return;
    e.preventDefault();
    var dir = next >= cur ? 1 : -1;
    if (next < this.min) next = this.min;
    if (next > this.max) next = this.max;
    next = this.firstAvailable(next, dir);
    this.focusDate = next;
    this.view = new Date(next.getFullYear(), next.getMonth(), 1);
    this.render(true);
  };

  window.Sihat.datepicker = {
    init: function (el) { if (!el._dp) el._dp = new Datepicker(el); return el._dp; }
  };

  /* ------------------------------------------------------------------ time slots */

  window.Sihat.slots = {
    render: function (fieldset, date) {
      if (!fieldset) return;
      var list = fieldset.querySelector(".slots__list");
      var name = fieldset.getAttribute("data-name") || "time";
      if (!date) {
        list.innerHTML = '<p class="slots__empty">Сначала выберите дату</p>';
        return;
      }
      var end = date.getDay() === 6 ? 15 : 17; // Saturday until 16:00
      var h = "";
      var i = 0;
      for (var hour = 8; hour <= end; hour++) {
        for (var min = 0; min < 60; min += 30) {
          var t = hour + ":" + (min ? "30" : "00");
          var busy = (date.getDate() * 13 + i * 7) % 10 < 3; // about 30% booked
          var id = fieldset.id + "-" + i;
          h += '<label class="slot" for="' + id + '"><input class="slot__input" type="radio" id="' + id + '" name="' + name +
            '" value="' + t + '"' + (busy ? " disabled" : "") + '><span class="slot__text">' + t +
            (busy ? '<span class="visually-hidden">, занято</span>' : "") + "</span></label>";
          i++;
        }
      }
      list.innerHTML = h;
    }
  };

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-datepicker]"), window.Sihat.datepicker.init);
    Array.prototype.forEach.call(document.querySelectorAll("[data-slots]"), function (fs) {
      var list = fs.querySelector(".slots__list");
      if (list && !list.children.length) window.Sihat.slots.render(fs, null);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

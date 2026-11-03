/*
  Forms: validation, phone mask. No data is sent anywhere (static prototype).

  Validation — <form data-validate novalidate>:
    Each control sits in .field with an empty <p class="field__msg" id="…-msg" aria-live="polite">.
    Rules: [required] (text, select, checkbox), [data-phone-mask] (11 digits), type="email".
    Custom texts: data-msg-required="…", data-msg-invalid="…".
    On error: .field--error, aria-invalid="true", aria-describedby → message; focus goes to the first error.
    On success: the form is hidden and the next [data-form-success] sibling is shown and focused.
    A [data-form-again] button inside the success element brings back the empty form.
    After the first submit, fields re-validate as the user types. JS: Sihat.forms.validate(form) → boolean,
    Sihat.forms.reset(form).

  Phone mask — <input type="tel" data-phone-mask>: the whole mask +7 (XXX) XXX-XX-XX stays visible and fills in as the user types.
*/
(function () {
  "use strict";

  window.Sihat = window.Sihat || {};

  /* ------------------------------------------------------------------ phone mask */

  // Parses a typed, pasted or autofilled value: the 10 digits after +7 (accepts "+7 (…", "8 927 …", "7927…")
  // and how many leading raw digits were dropped (the +7 / 8 / 7 country part), to map the caret.
  function parsePhone(value) {
    var s = String(value).trim();
    var d, skip = 0;
    if (s.indexOf("+7") === 0) {
      d = s.slice(2).replace(/\D/g, "");
      if (d.length > 10 && (d.charAt(0) === "8" || d.charAt(0) === "7")) { d = d.slice(1); skip = 1; }
    } else {
      d = s.replace(/\D/g, "");
      if (d.length > 10 || (d.length && (d.charAt(0) === "8" || d.charAt(0) === "7") && d.length === 11)) { d = d.slice(1); skip = 1; }
    }
    return { d: d.slice(0, 10), skip: skip };
  }
  function phoneDigits(value) { return parsePhone(value).d; }

  // The whole mask stays in the field while typing: +7 (9__) ___-__-__
  function formatPhone(d) {
    if (!d) return "";
    var p = (d + "__________").slice(0, 10);
    return "+7 (" + p.slice(0, 3) + ") " + p.slice(3, 6) + "-" + p.slice(6, 8) + "-" + p.slice(8, 10);
  }

  // How many of the entered digits stand before the caret position.
  function digitsBefore(raw, pos) {
    var head = raw.slice(0, pos);
    var n = (head.indexOf("+7") === 0 ? head.slice(2) : head).replace(/\D/g, "").length;
    return Math.max(0, Math.min(n - parsePhone(raw).skip, 10));
  }

  // Caret position after k digits of a formatted value; skips the brackets, space and dashes that follow.
  function caretAfter(formatted, k) {
    var i = 4, seen = 0;
    if (k > 0) {
      for (i = 2; i < formatted.length && seen < k; i++) if (/\d/.test(formatted.charAt(i))) seen++;
    }
    while (i < formatted.length && !/[\d_]/.test(formatted.charAt(i))) i++;
    return i;
  }

  var EMPTY_MASK = "+7 (___) ___-__-__";

  function setPhone(input, digits, caretDigits) {
    input._digits = digits;
    // While the field is focused the empty mask stays in it too.
    input.value = formatPhone(digits) || (document.activeElement === input ? EMPTY_MASK : "");
    input._shown = input.value;
    if (document.activeElement === input) {
      var pos = caretAfter(input.value, caretDigits);
      input.setSelectionRange(pos, pos);
    }
  }

  document.addEventListener("input", function (e) {
    var input = e.target;
    if (!input.matches || !input.matches("[data-phone-mask]")) return;
    var prev = input._digits || "";
    var digits = phoneDigits(input.value);
    var caret = digitsBefore(input.value, input.selectionStart == null ? input.value.length : input.selectionStart);
    // Backspace or Delete over a bracket, space, dash or underscore: remove the neighbouring digit instead.
    // The fixed start «+7 (» is only restored.
    var cut = input.selectionStart == null ? 0 : input.selectionStart;
    if (digits === prev && digits && !(input._shown && cut < 4)) {
      if (e.inputType === "deleteContentBackward" && caret > 0) {
        digits = digits.slice(0, caret - 1) + digits.slice(caret);
        caret--;
      } else if (e.inputType === "deleteContentForward") {
        digits = digits.slice(0, caret) + digits.slice(caret + 1);
      }
    }
    setPhone(input, digits, Math.min(caret, digits.length));
  });
  // Paste: the pasted number replaces the selection, 8… and +7… are understood.
  document.addEventListener("paste", function (e) {
    var input = e.target;
    if (!input.matches || !input.matches("[data-phone-mask]")) return;
    var text = (e.clipboardData || window.clipboardData).getData("text");
    e.preventDefault();
    var raw = input.value;
    var digits = phoneDigits(raw);
    var a = digitsBefore(raw, input.selectionStart);
    var b = digitsBefore(raw, input.selectionEnd);
    var pasted = phoneDigits(text);
    var next = (digits.slice(0, a) + pasted + digits.slice(b)).slice(0, 10);
    setPhone(input, next, Math.min(a + pasted.length, next.length));
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  document.addEventListener("focusin", function (e) {
    var input = e.target;
    if (input.matches && input.matches("[data-phone-mask]") && !phoneDigits(input.value)) {
      input.value = input._shown = EMPTY_MASK;
      input._digits = "";
      var pos = caretAfter(input.value, 0);
      // After the focusing click has placed the caret.
      setTimeout(function () { if (document.activeElement === input) input.setSelectionRange(pos, pos); }, 0);
    }
  });
  // A click on the fixed part of the mask or on the empty tail moves the caret to the next free digit.
  document.addEventListener("click", function (e) {
    var input = e.target;
    if (!input.matches || !input.matches("[data-phone-mask]") || input.selectionStart !== input.selectionEnd) return;
    var end = caretAfter(input.value, phoneDigits(input.value).length);
    var pos = input.selectionStart;
    if (pos < 4 || pos > end) input.setSelectionRange(Math.min(Math.max(pos, 4), end), Math.min(Math.max(pos, 4), end));
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

  window.Sihat.forms = { validate: validate, reset: reset, formatPhone: function (v) { return formatPhone(phoneDigits(v)); } };

})();

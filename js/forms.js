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

  Phone mask — <input type="tel" data-phone-mask>: formats to +7 (XXX) XXX-XX-XX.
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

  window.Sihat.forms = { validate: validate, reset: reset, formatPhone: function (v) { return formatPhone(phoneDigits(v)); } };

})();

/*
  Layout debug overlay: open any page with ?debug=layout. Does nothing without the parameter.
  Paints margins, paddings and gaps of sections and components with their values and spacing tokens, so a screenshot
  is enough to say exactly what to change. Off-scale values are marked. Also works over the booking flow and the
  mobile menu: the layer moves into the open dialog, because the rest of the page is inert then.
  Colors and sizes: css/debug-layout.css and the --debug-* tokens.
*/
(function () {
  "use strict";

  if (new URLSearchParams(location.search).get("debug") !== "layout") return;

  var TOKENS = ["--space-0", "--space-1", "--space-2", "--space-3", "--space-4", "--space-5", "--space-6", "--space-7", "--space-8", "--space-9", "--space-section", "--page-gutter", "--content-gutter", "--grid-gap", "--hero-padding"];
  var SECTIONS = "main > *, main section, .section-head, .site-header__inner, .site-footer__inner, .site-top__inner, .modal__head, .flow__bar, .modal__body, .modal__foot, .mnav__bar, .mnav__body";
  var SKIP = "script,style,link,noscript,svg,svg *,.icon,.visually-hidden,.skip-link,.dbg,.dbg *";
  var LONGHANDS = {
    "margin-top": [["margin-top", 0, 1], ["margin-block-start", 0, 1], ["margin-block", 0, 2], ["margin", 0, 4]],
    "margin-right": [["margin-right", 0, 1], ["margin-inline-end", 0, 1], ["margin-inline", 1, 2], ["margin", 1, 4]],
    "margin-bottom": [["margin-bottom", 0, 1], ["margin-block-end", 0, 1], ["margin-block", 1, 2], ["margin", 2, 4]],
    "margin-left": [["margin-left", 0, 1], ["margin-inline-start", 0, 1], ["margin-inline", 0, 2], ["margin", 3, 4]],
    "padding-top": [["padding-top", 0, 1], ["padding-block-start", 0, 1], ["padding-block", 0, 2], ["padding", 0, 4]],
    "padding-right": [["padding-right", 0, 1], ["padding-inline-end", 0, 1], ["padding-inline", 1, 2], ["padding", 1, 4]],
    "padding-bottom": [["padding-bottom", 0, 1], ["padding-block-end", 0, 1], ["padding-block", 1, 2], ["padding", 2, 4]],
    "padding-left": [["padding-left", 0, 1], ["padding-inline-start", 0, 1], ["padding-inline", 0, 2], ["padding", 3, 4]],
    "row-gap": [["row-gap", 0, 1], ["gap", 0, 2]],
    "column-gap": [["column-gap", 0, 1], ["gap", 1, 2]]
  };

  var options = { margin: true, padding: true, gap: true, labels: true, sectionsOnly: false };
  var values = {};        // token → px at this width
  var matched = new WeakMap();
  var rules = [];
  var layer, boxes, panel, info, tokensBox;
  var frame = 0;

  function loadStyles(done) {
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = (document.querySelector('link[href*="css/tokens.css"]').getAttribute("href") || "").replace("tokens.css", "debug-layout.css");
    link.onload = done;
    document.head.appendChild(link);
  }

  /* ---- tokens and declared values ---- */

  function readTokens() {
    var probe = document.createElement("div");
    probe.style.cssText = "position:absolute;visibility:hidden;transition-property:none"; // reduced motion gives every property a transition
    document.body.appendChild(probe);
    values = {};
    TOKENS.forEach(function (name) {
      probe.style.width = "var(" + name + ")";
      values[name] = parseFloat(getComputedStyle(probe).width);
    });
    probe.remove();
  }

  function collectRules() {
    rules = [];
    function walk(list) {
      Array.prototype.forEach.call(list, function (r) {
        if (r.type === CSSRule.STYLE_RULE) rules.push(r);
        else if (r.type === CSSRule.MEDIA_RULE && matchMedia(r.conditionText).matches) walk(r.cssRules);
      });
    }
    Array.prototype.forEach.call(document.styleSheets, function (sheet) {
      if (sheet.href && /debug-layout/.test(sheet.href)) return;
      walk(sheet.cssRules);
    });
    matched = new WeakMap();
  }

  function rulesOf(el) {
    var list = matched.get(el);
    if (list) return list;
    list = rules.filter(function (r) {
      try { return el.matches(r.selectorText); } catch (e) { return false; }
    });
    matched.set(el, list);
    return list;
  }

  function splitValue(text) {
    var parts = [], depth = 0, cur = "";
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (c === "(") depth++;
      if (c === ")") depth--;
      if (c === " " && !depth) { if (cur) parts.push(cur); cur = ""; } else cur += c;
    }
    if (cur) parts.push(cur);
    return parts;
  }

  function pick(parts, index, size) {
    if (size === 4) {
      if (parts.length === 1) return parts[0];
      if (parts.length === 2) return parts[index % 2];
      if (parts.length === 3) return parts[index === 3 ? 1 : index];
      return parts[index];
    }
    if (size === 2) return parts[index] || parts[0];
    return parts[0];
  }

  // Token by what the rule says, checked against the measured value; otherwise by the value alone.
  function tokenOf(el, prop, value) {
    var abs = Math.abs(value);
    var list = rulesOf(el);
    for (var i = list.length - 1; i >= 0; i--) {
      var hands = LONGHANDS[prop];
      for (var h = 0; h < hands.length; h++) {
        var declared = list[i].style.getPropertyValue(hands[h][0]);
        if (!declared) continue;
        var part = pick(splitValue(declared), hands[h][1], hands[h][2]);
        var m = /var\((--[\w-]+)\)/.exec(part || "");
        if (m && values[m[1]] === abs) return m[1];
        i = -1;
        break;
      }
    }
    var names = TOKENS.filter(function (n) { return values[n] === abs; });
    return names.length ? names.join(" / ") : "";
  }

  /* ---- drawing ---- */

  function short(token) { return token.replace(/--/g, ""); }

  function strip(kind, x, y, w, h, value, token, priority, out) {
    if (w <= 0 || h <= 0) return;
    if (x > innerWidth || y > innerHeight || x + w < 0 || y + h < 0) return;
    out.push({ kind: kind, x: x, y: y, w: w, h: h, value: value, token: token, priority: priority });
  }

  function candidates(root) {
    var list = [];
    Array.prototype.forEach.call(root.querySelectorAll("*"), function (el) {
      if (el.matches(SKIP) || el.closest("dialog:not([open])")) return;
      if (!el.classList.length && !el.matches("main, section")) return;
      if (options.sectionsOnly && !el.matches(SECTIONS)) return;
      var box = el.getBoundingClientRect();
      if (!box.width || !box.height || box.bottom < -200 || box.top > innerHeight + 200) return;
      var cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") return;
      list.push({ el: el, box: box, cs: cs, section: el.matches(SECTIONS) });
    });
    return list;
  }

  function gapStrips(item, out) {
    var cs = item.cs;
    if (!/flex|grid/.test(cs.display)) return;
    var rowGap = parseFloat(cs.rowGap) || 0, colGap = parseFloat(cs.columnGap) || 0;
    if (!rowGap && !colGap) return;
    var kids = Array.prototype.filter.call(item.el.children, function (c) {
      return c.getBoundingClientRect().width && getComputedStyle(c).position !== "absolute";
    });
    for (var i = 1; i < kids.length; i++) {
      var a = kids[i - 1].getBoundingClientRect(), b = kids[i].getBoundingClientRect();
      if (colGap && Math.abs(b.left - a.right - colGap) < 1) {
        var top = Math.max(a.top, b.top), bottom = Math.min(a.bottom, b.bottom);
        strip("gap", a.right, top, colGap, bottom - top, colGap, tokenOf(item.el, "column-gap", colGap), item.section, out);
      } else if (rowGap && Math.abs(b.top - a.bottom - rowGap) < 1) {
        var left = Math.max(a.left, b.left), right = Math.min(a.right, b.right);
        strip("gap", left, a.bottom, right - left, rowGap, rowGap, tokenOf(item.el, "row-gap", rowGap), item.section, out);
      }
    }
  }

  function spacingStrips(item, out) {
    var b = item.box, cs = item.cs, el = item.el, map = el.computedStyleMap();
    function get(prop) {
      if (map.get(prop) instanceof CSSKeywordValue) return 0; // auto
      return parseFloat(cs.getPropertyValue(prop)) || 0;
    }
    if (options.padding) {
      var bt = parseFloat(cs.borderTopWidth) || 0, br = parseFloat(cs.borderRightWidth) || 0, bb = parseFloat(cs.borderBottomWidth) || 0, bl = parseFloat(cs.borderLeftWidth) || 0;
      var pt = get("padding-top"), pr = get("padding-right"), pb = get("padding-bottom"), pl = get("padding-left");
      if (pt) strip("padding", b.left + bl, b.top + bt, b.width - bl - br, pt, pt, tokenOf(el, "padding-top", pt), item.section, out);
      if (pb) strip("padding", b.left + bl, b.bottom - bb - pb, b.width - bl - br, pb, pb, tokenOf(el, "padding-bottom", pb), item.section, out);
      if (pl) strip("padding", b.left + bl, b.top + bt + pt, pl, b.height - bt - bb - pt - pb, pl, tokenOf(el, "padding-left", pl), item.section, out);
      if (pr) strip("padding", b.right - br - pr, b.top + bt + pt, pr, b.height - bt - bb - pt - pb, pr, tokenOf(el, "padding-right", pr), item.section, out);
    }
    if (options.margin) {
      var mt = get("margin-top"), mr = get("margin-right"), mb = get("margin-bottom"), ml = get("margin-left");
      if (mt > 0) strip("margin", b.left, b.top - mt, b.width, mt, mt, tokenOf(el, "margin-top", mt), item.section, out);
      if (mb > 0) strip("margin", b.left, b.bottom, b.width, mb, mb, tokenOf(el, "margin-bottom", mb), item.section, out);
      if (ml > 0) strip("margin", b.left - ml, b.top, ml, b.height, ml, tokenOf(el, "margin-left", ml), item.section, out);
      if (mr > 0) strip("margin", b.right, b.top, mr, b.height, mr, tokenOf(el, "margin-right", mr), item.section, out);
    }
    if (options.gap) gapStrips(item, out);
  }

  function draw() {
    frame = 0;
    var open = openDialog();
    var root = open || document.body;
    placeLayer(open);
    var strips = [];
    candidates(root).forEach(function (item) { spacingStrips(item, strips); });

    var html = "";
    var used = [];
    // Larger boxes and sections get their label first; a label that does not fit is left for the hover panel.
    strips.sort(function (a, b) { return (b.priority ? 1 : 0) - (a.priority ? 1 : 0) || b.w * b.h - a.w * a.h; });
    var labelHtml = "";
    strips.forEach(function (s) {
      var off = !s.token;
      html += '<div class="dbg__strip dbg__strip--' + s.kind + (off ? " dbg__strip--off" : "") + '" style="left:' + s.x + "px;top:" + s.y + "px;width:" + s.w + "px;height:" + s.h + 'px"></div>';
      if (!options.labels) return;
      var text = Math.round(s.value * 100) / 100 + (off ? " вне шкалы" : " " + short(s.token));
      var lw = text.length * 7 + 8, lh = 16;
      var lx = Math.max(0, Math.min(innerWidth - lw, s.x + s.w / 2 - lw / 2));
      var ly = Math.max(0, Math.min(innerHeight - lh, s.y + s.h / 2 - lh / 2));
      for (var i = 0; i < used.length; i++) {
        var u = used[i];
        if (lx < u.x + u.w && lx + lw > u.x && ly < u.y + u.h && ly + lh > u.y) return;
      }
      used.push({ x: lx, y: ly, w: lw, h: lh });
      labelHtml += '<span class="dbg__label dbg__label--' + s.kind + (off ? " dbg__label--off" : "") + '" style="left:' + lx + "px;top:" + ly + 'px">' + text + "</span>";
    });
    boxes.innerHTML = html + labelHtml;
  }

  function schedule() { if (!frame) frame = requestAnimationFrame(draw); }

  /* ---- layer and panel ---- */

  function openDialog() {
    var list = document.querySelectorAll("dialog[open]");
    return list.length ? list[list.length - 1] : null;
  }

  // A modal dialog makes the rest of the page inert, so the layer lives inside it while it is open.
  function placeLayer(dialog) {
    var parent = dialog || document.body;
    if (layer.parentElement === parent && layer.matches(":popover-open")) return;
    if (layer.matches(":popover-open")) layer.hidePopover();
    parent.appendChild(layer);
    layer.showPopover();
  }

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  function renderTokens() {
    var w = innerWidth;
    var step = w >= 1100 ? "десктоп, от 1100" : w >= 768 ? "планшет, 768–1099" : "телефон, до 767";
    tokensBox.innerHTML = '<p class="dbg__meta">Ширина ' + w + " px, " + step + "</p>" +
      '<ul class="dbg__tokens">' + TOKENS.map(function (n) { return "<li><span>" + short(n) + "</span><b>" + values[n] + "</b></li>"; }).join("") + "</ul>";
  }

  function describe(el) {
    var cs = getComputedStyle(el);
    var name = el.classList.length ? "." + Array.prototype.join.call(el.classList, ".") : el.tagName.toLowerCase();
    var rows = Object.keys(LONGHANDS).map(function (prop) {
      var raw = cs.getPropertyValue(prop);
      var v = parseFloat(raw);
      if (!v || raw === "normal") return "";
      if (el.computedStyleMap().get(prop) instanceof CSSKeywordValue) return "";
      var token = tokenOf(el, prop, v);
      return "<li><span>" + prop + "</span><b>" + Math.round(v * 100) / 100 + "</b> " + (token ? short(token) : '<em class="dbg__bad">вне шкалы</em>') + "</li>";
    }).filter(Boolean).join("");
    info.innerHTML = '<p class="dbg__name">' + esc(name) + "</p>" + (rows ? '<ul class="dbg__values">' + rows + "</ul>" : '<p class="dbg__meta">Отступов нет</p>');
  }

  function check(key, label) {
    return '<label class="dbg__check dbg__check--' + key + '"><input type="checkbox" data-dbg="' + key + '"' + (options[key] ? " checked" : "") + "> " + label + "</label>";
  }

  function build() {
    layer = document.createElement("div");
    layer.className = "dbg";
    layer.setAttribute("popover", "manual");
    layer.innerHTML =
      '<div class="dbg__boxes" aria-hidden="true"></div>' +
      '<section class="dbg__panel" aria-label="Отладка отступов">' +
      '<div class="dbg__head"><h2 class="dbg__title">Отступы</h2><button class="dbg__toggle" type="button" data-dbg-fold aria-expanded="true">Свернуть</button></div>' +
      '<div class="dbg__body">' +
      '<div class="dbg__checks">' +
      check("margin", "margin") + check("padding", "padding") + check("gap", "gap") + check("labels", "подписи") + check("sectionsOnly", "только секции") +
      "</div>" +
      '<div class="dbg__info" data-dbg-info><p class="dbg__meta">Наведите на элемент, чтобы увидеть все его отступы и токены.</p></div>' +
      '<div data-dbg-tokens></div>' +
      "</div></section>";
    document.body.appendChild(layer);
    boxes = layer.querySelector(".dbg__boxes");
    panel = layer.querySelector(".dbg__panel");
    info = layer.querySelector("[data-dbg-info]");
    tokensBox = layer.querySelector("[data-dbg-tokens]");

    panel.addEventListener("change", function (e) {
      var key = e.target.getAttribute("data-dbg");
      if (key) { options[key] = e.target.checked; schedule(); }
    });
    panel.addEventListener("click", function (e) {
      var fold = e.target.closest("[data-dbg-fold]");
      if (!fold) return;
      var folded = panel.classList.toggle("dbg__panel--folded");
      fold.textContent = folded ? "Развернуть" : "Свернуть";
      fold.setAttribute("aria-expanded", folded ? "false" : "true");
    });
    document.addEventListener("mousemove", function (e) {
      if (panel.contains(e.target) || e.target.closest(".dbg")) return;
      describe(e.target);
    });
    if (innerWidth < 768) panel.querySelector("[data-dbg-fold]").click();
    window.addEventListener("scroll", schedule, { passive: true, capture: true });
    window.addEventListener("resize", function () {
      readTokens();
      collectRules();
      renderTokens();
      schedule();
    });
    new MutationObserver(function (records) {
      var own = records.every(function (r) { return layer.contains(r.target) || r.target === layer; });
      if (!own) schedule();
    }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["open", "hidden", "class"] });
    window.addEventListener("load", schedule);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  }

  function start() {
    readTokens();
    collectRules();
    build();
    renderTokens();
    draw();
  }

  loadStyles(start);
})();

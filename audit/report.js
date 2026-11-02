/*
  Behaviour of audit/report.html: the numbered list of issues and the screenshots with the issues outlined.
  Data: the JSON in the page, written by tools/audit-layout.mjs. No network requests except the screenshots themselves.
*/
(function () {
  "use strict";

  var DATA = JSON.parse(document.getElementById("audit-data").textContent);
  var root = document.querySelector("[data-root]");
  var RULES = DATA.rules, STATUS = DATA.status;
  var pageIds = [];
  var pageNames = {};
  DATA.scenes.forEach(function (s) {
    if (pageIds.indexOf(s.id) === -1) { pageIds.push(s.id); pageNames[s.id] = s.page; }
  });

  var anyOpen = DATA.issues.some(function (it) { return it.status === "decide" || it.status === "fresh"; });
  var state = { status: anyOpen ? "open" : "all", rule: "all", page: "all", scene: pageIds[0], width: DATA.widths[0], version: anyOpen ? "after" : "before", selected: null };

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function isDone(it) { return it.status === "fixed" || it.status === "resolved"; }
  function isOpen(it) { return !isDone(it); }
  function statusMod(it) { return isDone(it) ? "fixed" : it.status === "fresh" ? "fresh" : "decide"; }

  function filtered() {
    return DATA.issues.filter(function (it) {
      if (state.status === "open" && !isOpen(it)) return false;
      if (state.status !== "open" && state.status !== "all" && it.status !== state.status) return false;
      if (state.rule !== "all" && String(it.rule) !== state.rule) return false;
      if (state.page !== "all" && it.pages.indexOf(pageNames[state.page]) === -1) return false;
      return true;
    });
  }

  function option(value, label, current) {
    return '<option value="' + esc(value) + '"' + (value === current ? " selected" : "") + ">" + esc(label) + "</option>";
  }
  function select(id, label, name, options) {
    return '<div class="field"><label class="field__label" for="' + id + '">' + label + '</label><div class="field__wrap"><select class="field__control" id="' + id + '" data-filter="' + name + '">' + options + '</select><span class="icon icon--chevron-down field__icon" aria-hidden="true"></span></div></div>';
  }

  function renderSummary() {
    var m = DATA.meta;
    var rows = Object.keys(RULES).map(function (n) {
      var inRule = DATA.issues.filter(function (i) { return String(i.rule) === n; });
      var fixed = inRule.filter(function (i) { return i.status === "fixed"; }).length;
      var resolved = inRule.filter(function (i) { return i.status === "resolved"; }).length;
      var decide = inRule.filter(function (i) { return i.status === "decide"; }).length;
      var fresh = inRule.filter(function (i) { return i.status === "fresh"; }).length;
      return "<tr><th scope=\"row\">" + n + ". " + esc(RULES[n]) + "</th><td>" + (fixed + resolved + decide) + "</td><td>" + fixed + "</td><td>" + resolved + "</td><td>" + decide + "</td><td>" + fresh + "</td></tr>";
    }).join("");
    return (
      '<header class="report__head">' +
      '<p class="section-head__eyebrow">Этап 1: главная и «Чек-ап программы»</p>' +
      "<h1>Аудит отступов и размеров</h1>" +
      '<p class="report__lead">' + m.scenes + " экранов на ширинах " + DATA.widths.join(", ") + ", " + m.measurements.toLocaleString("ru-RU") + " измерений. Проверено " + esc(m.date) + ". Одно нарушение на нескольких ширинах и страницах считается одним номером.</p>" +
      '<p class="report__links"><a class="link-arrow" href="../kit.html">Компоненты<span class="icon icon--arrow-right" aria-hidden="true"></span></a> <a class="link-arrow" href="../docs/audit/layout-audit.md">Этот список текстом<span class="icon icon--arrow-right" aria-hidden="true"></span></a> <a class="link-arrow" href="../index.html?debug=layout">Отступы поверх страницы<span class="icon icon--arrow-right" aria-hidden="true"></span></a></p>' +
      "</header>" +
      '<ul class="report__stats">' +
      stat(m.before.total, "было до правок", "") +
      stat(m.fixed, "исправлено автоматически", "fixed") +
      stat(m.resolved, "исправлено по решению", "fixed") +
      stat(m.decide, "нужно решение", "decide") +
      stat(m.fresh, "новых нарушений", m.fresh ? "fresh" : "") +
      "</ul>" +
      '<div class="report__table-wrap" tabindex="0" role="region" aria-label="Итог по правилам"><table class="report__table"><thead><tr><th scope="col">Правило</th><th scope="col">Было</th><th scope="col">Автоматически</th><th scope="col">По решению</th><th scope="col">Нужно решение</th><th scope="col">Новых</th></tr></thead><tbody>' + rows + "</tbody></table></div>"
    );
  }
  function stat(value, label, mod) {
    return '<li class="report__stat' + (mod ? " report__stat--" + mod : "") + '"><span class="report__stat-value">' + value + '</span><span class="report__stat-label">' + esc(label) + "</span></li>";
  }

  function renderFilters() {
    var statuses = option("open", "Открытые", state.status) + option("all", "Все", state.status) + option("fixed", STATUS.fixed, state.status) + option("resolved", STATUS.resolved, state.status) + option("decide", STATUS.decide, state.status) + option("fresh", STATUS.fresh, state.status);
    var rules = option("all", "Все правила", state.rule) + Object.keys(RULES).map(function (n) { return option(n, n + ". " + RULES[n], state.rule); }).join("");
    var pages = option("all", "Все страницы", state.page) + pageIds.map(function (id) { return option(id, pageNames[id], state.page); }).join("");
    return '<form class="report__filters" onsubmit="return false">' + select("f-status", "Статус", "status", statuses) + select("f-rule", "Правило", "rule", rules) + select("f-page", "Страница", "page", pages) + "</form>";
  }

  function renderIssue(it) {
    var selected = state.selected === it.num;
    var fields = [
      ["Страница", it.pages.join(", ")],
      ["Ширина", it.widths.join(", ")],
      ["Элемент", "<code>" + esc(it.sel) + "</code>" + (it.name && it.name !== "CSS" ? ", «" + esc(it.name) + "»" : "") + (it.count > 1 ? ", мест: " + it.count : "")],
      it.code ? ["Строка", "<code>" + esc(it.code) + "</code>"] : null,
      ["Измерено", esc(it.measured)],
      ["Ожидается", esc(it.expected)],
      ["Правило", it.rule + ". " + esc(RULES[it.rule])]
    ].filter(function (f) { return f && f[1]; });
    return (
      '<li class="report-issue' + (selected ? " report-issue--selected" : "") + '" id="issue-' + it.num + '">' +
      '<div class="report-issue__head"><span class="report-issue__num report-issue__num--' + statusMod(it) + '">' + it.num + "</span>" +
      '<h3 class="report-issue__title">' + esc(it.title) + "</h3></div>" +
      '<span class="badge report-issue__status report-issue__status--' + statusMod(it) + '">' + esc(STATUS[it.status]) + "</span>" +
      '<dl class="report-issue__fields">' + fields.map(function (f) { return "<div><dt>" + f[0] + "</dt><dd>" + f[1] + "</dd></div>"; }).join("") + "</dl>" +
      (it.fix ? '<p class="report-issue__note"><b>Что сделано.</b> ' + esc(it.fix) + "</p>" : "") +
      (it.proposal ? '<p class="report-issue__note report-issue__note--proposal"><b>Предложение.</b> ' + esc(it.proposal) + "</p>" : "") +
      (it.occ.length ? '<button class="btn btn--secondary btn--xs" type="button" data-show="' + it.num + '">Показать на скриншоте</button>' : "") +
      "</li>"
    );
  }

  function currentScene() {
    return DATA.scenes.filter(function (s) { return s.id === state.scene && s.width === state.width; })[0] ||
      DATA.scenes.filter(function (s) { return s.id === state.scene; })[0];
  }

  function outlines(scene, shot) {
    var list = filtered().filter(function (it) {
      return state.version === "before" ? true : isOpen(it);
    });
    var html = "";
    var nums = [];
    list.forEach(function (it) {
      var seen = 0;
      it.occ.forEach(function (o) {
        if (o[0] !== scene.id || o[1] !== scene.width || seen >= 12) return;
        seen++;
        var left = o[2] / shot.imgW * 100, top = o[3] / shot.imgH * 100, w = Math.max(o[4], 8) / shot.imgW * 100, h = Math.max(o[5], 8) / shot.imgH * 100;
        html += '<button class="report-box report-box--' + statusMod(it) + (state.selected === it.num ? " report-box--selected" : "") + '" type="button" data-pick="' + it.num + '" style="left:' + left + "%;top:" + top + "%;width:" + w + "%;height:" + h + '%" aria-label="Нарушение ' + it.num + ": " + esc(o[6]) + '"><span class="report-box__num">' + it.num + "</span></button>";
      });
      if (seen) nums.push(it);
    });
    return { html: html, nums: nums };
  }

  function renderViewer() {
    var scene = currentScene();
    if (!scene) return "";
    state.width = scene.width;
    var widths = DATA.scenes.filter(function (s) { return s.id === state.scene; }).map(function (s) { return s.width; });
    var useBefore = state.version === "before" && scene.before;
    var shot = useBefore ? scene.before : scene;
    var src = "shots/" + (useBefore ? "before" : "after") + "/" + shot.shot;
    var marks = outlines(scene, shot);
    return (
      '<div class="report-viewer__bar">' +
      select("v-page", "Экран", "scene", pageIds.map(function (id) { return option(id, pageNames[id], state.scene); }).join("")) +
      '<fieldset class="report-viewer__group"><legend class="field__label">Ширина</legend><div class="choices__list">' +
      widths.map(function (w) { return '<button class="btn btn--xs ' + (w === scene.width ? "btn--tint" : "btn--secondary") + '" type="button" data-width="' + w + '" aria-pressed="' + (w === scene.width) + '">' + w + "</button>"; }).join("") +
      "</div></fieldset>" +
      '<fieldset class="report-viewer__group"><legend class="field__label">Версия</legend><div class="choices__list">' +
      '<button class="btn btn--xs ' + (state.version === "after" ? "btn--tint" : "btn--secondary") + '" type="button" data-version="after" aria-pressed="' + (state.version === "after") + '">После правок</button>' +
      '<button class="btn btn--xs ' + (state.version === "before" ? "btn--tint" : "btn--secondary") + '" type="button" data-version="before" aria-pressed="' + (state.version === "before") + '"' + (scene.before ? "" : " disabled") + ">До правок</button>" +
      "</div></fieldset>" +
      "</div>" +
      '<p class="report-viewer__summary">' + (marks.nums.length ? "На этом экране: " + marks.nums.map(function (it) { return '<a href="#issue-' + it.num + '">№ ' + it.num + "</a>"; }).join(", ") : "На этом экране нарушений с выбранными фильтрами нет") + ".</p>" +
      '<div class="report-shot"><img class="report-shot__img" src="' + src + '" width="' + shot.imgW + '" height="' + shot.imgH + '" alt="' + esc(scene.page) + ", ширина " + scene.width + ' px">' + marks.html + "</div>"
    );
  }

  function renderList() {
    var list = filtered();
    return list.length
      ? '<ol class="report-list">' + list.map(renderIssue).join("") + "</ol>"
      : '<div class="empty"><p class="empty__title">Ничего не нашлось</p><p class="empty__text">С такими фильтрами нарушений нет.</p></div>';
  }

  function render() {
    root.innerHTML =
      renderSummary() +
      '<div class="report__grid">' +
      '<section class="report__issues" aria-labelledby="r-issues"><h2 id="r-issues" class="report__h2">Нарушения</h2>' + renderFilters() + '<div data-list aria-live="polite">' + renderList() + "</div></section>" +
      '<section class="report__viewer" aria-labelledby="r-viewer"><h2 id="r-viewer" class="report__h2">Скриншоты</h2><div class="report-viewer" data-viewer>' + renderViewer() + "</div></section>" +
      "</div>";
  }
  function refresh(listToo) {
    root.querySelector("[data-viewer]").innerHTML = renderViewer();
    if (listToo) root.querySelector("[data-list]").innerHTML = renderList();
  }

  function showIssue(num, scrollToViewer) {
    var it = DATA.issues.filter(function (x) { return x.num === num; })[0];
    if (!it) return;
    state.selected = num;
    if (isDone(it)) state.version = "before";
    else if (state.version === "before") state.version = "after";
    var here = it.occ.filter(function (o) { return o[0] === state.scene && o[1] === state.width; })[0];
    var first = here || it.occ.filter(function (o) { return o[0] === state.scene; })[0] || it.occ[0];
    if (first) { state.scene = first[0]; state.width = first[1]; }
    // A fixed issue is only visible with its filter on.
    if (isDone(it) && state.status === "open") state.status = "all";
    render();
    var box = root.querySelector(".report-box--selected");
    if (scrollToViewer && box) box.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  root.addEventListener("change", function (e) {
    var key = e.target.getAttribute("data-filter");
    if (!key) return;
    state[key] = e.target.value;
    if (key === "scene") refresh(false);
    else refresh(true);
  });
  root.addEventListener("click", function (e) {
    var show = e.target.closest("[data-show]");
    if (show) { showIssue(Number(show.getAttribute("data-show")), true); return; }
    var pick = e.target.closest("[data-pick]");
    if (pick) {
      var num = Number(pick.getAttribute("data-pick"));
      state.selected = num;
      render();
      var li = document.getElementById("issue-" + num);
      if (li) li.scrollIntoView({ block: "nearest" });
      return;
    }
    var width = e.target.closest("[data-width]");
    if (width) { state.width = Number(width.getAttribute("data-width")); refresh(false); return; }
    var version = e.target.closest("[data-version]");
    if (version) { state.version = version.getAttribute("data-version"); refresh(false); }
  });

  render();
})();

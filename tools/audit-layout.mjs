#!/usr/bin/env node
/*
  Layout audit: loads the pages over a local server, measures computed styles and checks them against css/tokens.css.

    node tools/audit-layout.mjs              measure, compare with the baseline, write the reports and screenshots; exit 1 on new violations
    node tools/audit-layout.mjs --check      the same check without touching any file (use it after every visual change)
    node tools/audit-layout.mjs --baseline   store the current state as «before» (audit/data/before.json, audit/shots/before)

  Output: docs/audit/layout-audit.md, audit/report.html, audit/shots/.
  Proposals for issues that need a decision and intentional exceptions: tools/audit-decisions.mjs.
  Browser: the Chrome or Edge installed on the machine, otherwise the Playwright one (npx playwright install chromium).
*/
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { PROPOSALS, EXCEPTIONS } from "./audit-decisions.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WIDTHS = [1440, 1280, 1024, 768, 390, 360];
const BASE_HEIGHT = 900;
const BASELINE = process.argv.includes("--baseline");
const CHECK = process.argv.includes("--check");
const FIXED_NOW = new Date("2026-11-02T09:00:00"); // the year in the footer depends on today

const RULES = {
  1: "Шкала отступов",
  2: "Ритм секций",
  3: "Единообразие компонентов",
  4: "Размеры",
  5: "Выравнивание",
  6: "Типографика",
  7: "Значения вне токенов"
};

// Human names for the report: class → [name, ordinal ending].
const NAMES = {
  "btn": ["кнопка", "я"], "field__control": ["поле ввода", "е"], "field__label": ["подпись поля", "я"], "field": ["поле формы", "е"],
  "slot__text": ["чип", "й"], "slot": ["чип", "й"], "slots__legend": ["подпись времени приёма", "я"], "check": ["согласие", "е"], "check__input": ["флажок", "й"],
  "dcard": ["карточка направления", "я"], "dcard__title": ["заголовок карточки направления", "й"], "dcard__media": ["фото направления", "е"],
  "dcard__body": ["текст карточки направления", "й"], "dcard__arrow": ["стрелка карточки направления", "я"], "dcard__link": ["ссылка карточки направления", "я"],
  "doctor-card": ["карточка врача", "я"], "doctor-card__media": ["фото врача", "е"], "doctor-card__name": ["ФИО врача", "е"], "doctor-card__role": ["должность врача", "я"],
  "doctor-card__spec": ["специальность врача", "я"], "doctor-card__next": ["ближайшая запись", "я"], "doctor-card__actions": ["кнопка врача", "я"], "doctor-card__body": ["текст карточки врача", "й"],
  "service-row": ["строка услуги", "я"], "service-row__title": ["название услуги", "е"], "service-row__text": ["описание услуги", "е"], "service-row__price": ["цена услуги", "я"], "service-row__code": ["код услуги", "й"],
  "doc-row": ["строка документа", "я"], "doc-row__action": ["«Скачать» в документе", "е"], "doc-row__link": ["название документа", "е"], "doc-row__icon": ["значок документа", "й"], "doc-row__meta": ["размер документа", "й"],
  "steps__item": ["этап", "й"], "steps__title": ["заголовок этапа", "й"], "steps__text": ["текст этапа", "й"], "feature": ["карточка преимущества", "я"], "feature__title": ["заголовок преимущества", "й"], "feature__text": ["текст преимущества", "й"],
  "checklist__item": ["пункт списка", "й"], "checklist__icon": ["галочка", "я"], "checklist__note": ["примечание пункта", "е"],
  "section-head": ["заголовок секции", "й"], "section-head__lead": ["подзаголовок секции", "й"], "section-head__eyebrow": ["надзаголовок секции", "й"],
  "hero": ["первый экран", "й"], "hero__main": ["синяя карточка первого экрана", "я"], "hero__aside": ["фото первого экрана", "е"], "hero__lead": ["текст первого экрана", "й"], "hero__hours": ["часы работы", "е"],
  "page-head": ["шапка страницы", "я"], "page-head__main": ["карточка шапки страницы", "я"], "page-head__media": ["фото шапки страницы", "е"], "page-head__lead": ["текст шапки страницы", "й"],
  "form-panel": ["синий блок формы", "й"], "form-panel__card": ["белая карточка формы", "я"], "form-panel__lead": ["текст блока формы", "й"], "about__text": ["текст описания", "й"], "about__aside": ["блок «Программа включает»", "й"],
  "anchor-nav__link": ["пункт якорного меню", "й"], "anchor-nav": ["якорное меню", "е"], "breadcrumbs__item": ["хлебная крошка", "я"], "badge": ["плашка", "я"], "link-arrow": ["ссылка со стрелкой", "я"],
  "site-header": ["шапка сайта", "я"], "site-nav__link": ["пункт меню", "й"], "site-top__item": ["служебная строка", "я"], "a11y-toggle": ["кнопка версии для слабовидящих", "я"], "lang__link": ["переключатель языка", "й"],
  "social-link": ["значок соцсети", "й"], "phone-link": ["телефон", "й"], "phone-link__icon": ["значок телефона", "й"], "phone-link__number": ["номер телефона", "й"], "phone-link__label": ["подпись телефона", "я"], "phone-link__hours": ["часы у телефона", "е"],
  "site-footer": ["подвал", "й"], "footer-list": ["список ссылок подвала", "й"], "footer-title": ["заголовок в подвале", "й"], "footer-phone": ["телефон в подвале", "й"], "footer-text": ["текст в подвале", "й"], "site-footer__org": ["наименование в подвале", "е"], "site-footer__req": ["реквизиты", "е"], "site-footer__warning": ["предупреждение в подвале", "е"], "site-footer__about": ["о клинике в подвале", "й"], "payments__item": ["платёжная система", "я"],
  "logo": ["логотип", "й"], "icon": ["иконка", "я"], "mnav__link": ["пункт мобильного меню", "й"], "mnav__label": ["подпись в мобильном меню", "я"], "mnav__tile": ["плитка мобильного меню", "я"], "mnav__card": ["карточка мобильного меню", "я"], "mnav__text": ["текст мобильного меню", "й"],
  "modal": ["окно записи", "е"], "modal__head": ["шапка окна записи", "я"], "modal__body": ["содержимое окна записи", "е"], "modal__foot": ["низ окна записи", "й"], "flow__progress": ["шаг записи", "й"], "flow__lead": ["пояснение в записи", "е"], "flow__aside": ["блок «Нет подходящего времени?»", "й"], "flow__aside-title": ["заголовок блока в записи", "й"],
  "scenario": ["карточка сценария", "я"], "scenario__title": ["заголовок сценария", "й"], "scenario__text": ["текст сценария", "й"], "scenario__go": ["действие сценария", "е"], "option": ["вариант выбора", "й"], "option__box": ["вариант выбора", "й"], "option__media": ["фото в варианте", "е"], "option__title": ["заголовок варианта", "й"], "option__text": ["текст варианта", "й"], "option__meta": ["запись и цена в варианте", "я"], "option__aside": ["цена в варианте", "я"],
  "summary": ["сводка", "я"], "summary__row": ["строка сводки", "я"], "result__title": ["заголовок результата", "й"], "result__text": ["текст результата", "й"], "datepicker": ["календарь", "й"], "datepicker__day": ["день календаря", "й"], "datepicker__title": ["месяц календаря", "й"], "alert": ["сообщение", "е"], "search": ["поиск", "й"], "form__note": ["примечание формы", "е"]
};

/* ------------------------------------------------------------------ local server */

const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png", ".woff2": "font/woff2", ".json": "application/json" };
function startServer() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p.endsWith("/")) p += "index.html";
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end("Not found"); return; }
      res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
      res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

async function launch() {
  for (const channel of ["chrome", "msedge", undefined]) {
    try { return await chromium.launch(channel ? { channel } : {}); } catch (e) { if (!channel) throw e; }
  }
}

/* ------------------------------------------------------------------ tokens */

function readTokenNames() {
  const css = fs.readFileSync(path.join(ROOT, "css/tokens.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const root = css.slice(css.indexOf(":root {"));
  const names = [...new Set([...root.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]))];
  return {
    space: names.filter((n) => /^--space-/.test(n)).concat(["--page-gutter", "--content-gutter", "--content-edge", "--grid-gap", "--hero-padding"]),
    text: [...new Set(names.filter((n) => /^--text-[\w-]+-size$/.test(n)).map((n) => n.replace(/^--text-|-size$/g, "")))],
    control: ["--control-height", "--control-height-s", "--control-height-xs"],
    icon: names.filter((n) => /^--icon-size/.test(n))
  };
}

/* ------------------------------------------------------------------ measuring, runs in the page */

function collect({ scope, tokenNames, nameKeys }) {
  const root = scope ? document.querySelector(scope) : document.body;
  const W = document.documentElement.clientWidth;
  const round = (n) => Math.round(n * 100) / 100;

  /* tokens at this width */
  const probe = document.createElement("div");
  probe.style.cssText = "position:absolute;visibility:hidden;transition-property:none"; // reduced motion gives every property a short transition
  document.body.appendChild(probe);
  const px = (name) => {
    probe.style.width = "";
    probe.style.width = "var(" + name + ")";
    return parseFloat(getComputedStyle(probe).width);
  };
  const tokens = {
    space: Object.fromEntries(tokenNames.space.map((n) => [n, px(n)])),
    control: Object.fromEntries(tokenNames.control.map((n) => [n, px(n)])),
    icon: Object.fromEntries(tokenNames.icon.map((n) => [n, px(n)])),
    tap: px("--tap-target"),
    gutter: px("--page-gutter"),
    contentGutter: px("--content-gutter"),
    section: px("--space-section"),
    measure: px("--text-measure"),
    text: tokenNames.text.map((t) => {
      const hasLine = getComputedStyle(document.documentElement).getPropertyValue("--text-" + t + "-line").trim();
      return { name: t, size: px("--text-" + t + "-size"), line: hasLine ? px("--text-" + t + "-line") : null };
    })
  };
  probe.remove();

  const SKIP = "script,style,noscript,link,meta,br,option,optgroup,svg *,.visually-hidden,.visually-hidden *,.skip-link";
  const INTERACTIVE = 'a[href],button,input:not([type="hidden"]),select,textarea,summary,[role="button"],[tabindex="0"]';
  const MEDIA = ["dcard__media", "doctor-card__media", "option__media", "hero__aside", "page-head__media"];
  const SPACING = [["marginTop", "margin-top"], ["marginRight", "margin-right"], ["marginBottom", "margin-bottom"], ["marginLeft", "margin-left"],
    ["paddingTop", "padding-top"], ["paddingRight", "padding-right"], ["paddingBottom", "padding-bottom"], ["paddingLeft", "padding-left"]];
  const nameSet = new Set(nameKeys);

  function ownTextNodes(el) { return [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()); }
  function textBox(el) {
    let l = Infinity, r = -Infinity, t = Infinity, b = -Infinity;
    for (const node of ownTextNodes(el)) {
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const q of range.getClientRects()) {
        if (!q.width) continue;
        l = Math.min(l, q.left); r = Math.max(r, q.right); t = Math.min(t, q.top); b = Math.max(b, q.bottom);
      }
    }
    return l === Infinity ? null : [round(l), round(r), round(t), round(b)];
  }
  // Longest line of a text block, in characters.
  function maxLine(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const lines = new Map();
    let n;
    while ((n = walker.nextNode())) {
      for (let i = 0; i < n.length; i++) {
        const range = document.createRange();
        range.setStart(n, i); range.setEnd(n, i + 1);
        const q = range.getClientRects()[0];
        if (!q || !q.width) continue;
        const key = Math.round(q.top / 4);
        lines.set(key, (lines.get(key) || 0) + 1);
      }
    }
    return Math.max(0, ...lines.values());
  }
  function hasBlockChild(el) {
    return [...el.children].some((c) => { const d = getComputedStyle(c).display; return d !== "inline" && d !== "inline-block" && d !== "none"; });
  }
  function isSurface(cs) {
    const bg = cs.backgroundColor;
    const painted = bg && bg !== "transparent" && !/rgba\(\d+, \d+, \d+, 0\)/.test(bg);
    const boxed = parseFloat(cs.borderTopWidth) > 0 && parseFloat(cs.borderLeftWidth) > 0 && parseFloat(cs.borderRightWidth) > 0 && cs.borderTopStyle !== "none" && cs.borderLeftStyle !== "none";
    return painted || boxed;
  }
  // Part of a sideways scroller: its overflow is intended.
  function inScroller(el) {
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const o = getComputedStyle(a).overflowX;
      if ((o === "auto" || o === "scroll") && a.scrollWidth > a.clientWidth + 1) return a;
    }
    return null;
  }
  function selectorOf(el, classes) {
    let prefix = "";
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      if (a.id) { prefix = "#" + a.id + " "; break; }
    }
    if (classes.length) return prefix + "." + classes.join(".");
    const parent = el.parentElement ? [...el.parentElement.classList][0] : "";
    return prefix + (parent ? "." + parent + " " : "") + el.tagName.toLowerCase();
  }

  const counts = {};
  const els = [];
  for (const el of [root, ...root.querySelectorAll("*")]) {
    if (el === document.body || el.matches(SKIP)) continue;
    if (el.closest("dialog:not([open])")) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const box = el.getBoundingClientRect();
    if (!box.width || !box.height) continue;

    const classes = [...el.classList].filter((c) => !/^is-/.test(c));
    const first = classes.find((c) => nameSet.has(c)) || classes[0] || el.tagName.toLowerCase();
    counts[first] = (counts[first] || 0) + 1;
    const sel = selectorOf(el, classes);
    const parentClass = el.parentElement ? [...el.parentElement.classList][0] : "";
    const rec = {
      tag: el.tagName.toLowerCase(),
      classes, first, n: counts[first], sel,
      sig: classes.length ? "." + classes.join(".") : (parentClass ? "." + parentClass + " " : "") + el.tagName.toLowerCase(),
      rect: [round(box.left + scrollX), round(box.top + scrollY), round(box.width), round(box.height)]
    };

    /* spacing */
    const map = el.computedStyleMap();
    const sp = {};
    for (const [prop, css] of SPACING) {
      const typed = map.get(css);
      if (typed instanceof CSSKeywordValue) continue; // auto
      const v = parseFloat(cs[prop]);
      if (v) sp[css] = round(v);
    }
    if (cs.display.includes("flex") || cs.display.includes("grid")) {
      if (cs.rowGap !== "normal" && parseFloat(cs.rowGap)) sp["row-gap"] = round(parseFloat(cs.rowGap));
      if (cs.columnGap !== "normal" && parseFloat(cs.columnGap)) sp["column-gap"] = round(parseFloat(cs.columnGap));
    }
    rec.sp = sp;

    /* component values */
    rec.comp = {
      padding: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].join(" "),
      gap: cs.display.includes("flex") || cs.display.includes("grid") ? cs.rowGap + " / " + cs.columnGap : "",
      radius: cs.borderRadius,
      "min-height": cs.minHeight === "auto" || cs.minHeight === "0px" ? "0" : cs.minHeight
    };
    rec.h = round(box.height);

    /* type */
    const isField = ["input", "select", "textarea"].includes(rec.tag) && !["radio", "checkbox"].includes(el.type);
    const own = ownTextNodes(el);
    if (own.length || isField) {
      rec.type = { fs: parseFloat(cs.fontSize), lh: cs.lineHeight === "normal" ? null : parseFloat(cs.lineHeight) };
      rec.comp["font-size"] = cs.fontSize;
      rec.comp["line-height"] = cs.lineHeight;
      rec.text = textBox(el);
      if (!/^h[1-6]$/.test(rec.tag) && parseFloat(cs.fontSize) <= tokens.text.find((t) => t.name === "lead").size && el.textContent.trim().length > 75 && !hasBlockChild(el) && cs.display !== "inline") {
        rec.chars = maxLine(el);
      }
    }
    for (const pos of ["::before", "::after"]) {
      const ps = getComputedStyle(el, pos);
      if (ps.content && ps.content !== "none" && ps.content !== '""' && ps.content !== "normal" && !ps.content.startsWith("url")) {
        rec.pseudo = { pos, fs: parseFloat(ps.fontSize), lh: ps.lineHeight === "normal" ? null : parseFloat(ps.lineHeight), content: ps.content };
      }
    }

    /* sizes */
    if (el.classList.contains("icon")) rec.icon = [round(box.width), round(box.height)];
    if (el.classList.contains("btn") || (el.classList.contains("field__control") && rec.tag !== "textarea")) {
      rec.control = el.classList.contains("btn--xs") ? "--control-height-xs" : el.classList.contains("btn--s") || el.classList.contains("field__control") ? "--control-height-s" : el.classList.contains("btn--book") ? "any" : "--control-height";
    }
    if (el.matches(INTERACTIVE)) {
      let target = box;
      const label = ["radio", "checkbox"].includes(el.type) ? el.closest("label") : null;
      if (label) target = label.getBoundingClientRect();
      const after = getComputedStyle(el, "::after");
      if (after.position === "absolute" && after.content !== "none" && el.offsetParent) target = el.offsetParent.getBoundingClientRect();
      const inline = cs.display === "inline" && el.parentElement.textContent.trim().length > el.textContent.trim().length;
      rec.tap = { w: round(target.width), h: round(target.height), inline };
    }
    if (MEDIA.some((m) => el.classList.contains(m))) rec.ratio = round(box.width / box.height);

    /* edges */
    const scroller = inScroller(el);
    rec.scroller = !!scroller;
    const surface = isSurface(cs);
    rec.surface = surface;
    rec.content = !!(rec.text || rec.icon || ["img", "input", "select", "textarea", "button"].includes(rec.tag) || surface) && !(["radio", "checkbox"].includes(el.type)) && box.width > 1;
    els.push(rec);
  }

  /* cards in a row */
  const CARDS = [
    { card: ".dcard", top: [".dcard__media", ".dcard__title"], bottom: [".dcard__foot"] },
    { card: ".doctor-card", top: [".doctor-card__media", ".doctor-card__spec", ".doctor-card__name", ".doctor-card__role"], bottom: [".doctor-card__next", ".doctor-card__actions"] },
    { card: ".feature", top: [".feature__icon", ".feature__title", ".feature__text"], bottom: [] },
    { card: ".steps__item", top: [".steps__title", ".steps__text"], bottom: [] },
    { card: ".scenario", top: [".scenario__icon", ".scenario__title", ".scenario__text"], bottom: [".scenario__go"] }
  ];
  const rows = [];
  for (const cfg of CARDS) {
    const groups = new Map();
    for (const card of root.querySelectorAll(cfg.card)) {
      const b = card.getBoundingClientRect();
      if (!b.width) continue;
      const li = card.closest("li") || card;
      const key = li.parentElement;
      if (!groups.has(key)) groups.set(key, new Map());
      const byTop = groups.get(key);
      const top = Math.round(b.top);
      if (!byTop.has(top)) byTop.set(top, []);
      byTop.get(top).push(card);
    }
    for (const byTop of groups.values()) for (const cards of byTop.values()) {
      if (cards.length < 2) continue;
      const boxes = cards.map((c) => c.getBoundingClientRect());
      const row = { card: cfg.card, count: cards.length, heights: boxes.map((b) => round(b.height)), inner: [], rects: boxes.map((b) => [round(b.left + scrollX), round(b.top + scrollY), round(b.width), round(b.height)]) };
      const part = (sel, side) => {
        const vals = cards.map((c, i) => {
          const child = c.querySelector(sel);
          if (!child || !child.getBoundingClientRect().width) return null;
          const q = child.getBoundingClientRect();
          return side === "top" ? round(q.top - boxes[i].top) : round(boxes[i].bottom - q.bottom);
        });
        row.inner.push({ sel, side, vals });
      };
      cfg.top.forEach((s) => part(s, "top"));
      cfg.bottom.forEach((s) => part(s, "bottom"));
      rows.push(row);
    }
  }

  /* page structure */
  const page = {};
  const main = document.querySelector("main");
  if (!scope && main) {
    const mainBox = main.getBoundingClientRect();
    const cs = getComputedStyle(main);
    const inner = [round(mainBox.left + parseFloat(cs.paddingLeft)), round(mainBox.right - parseFloat(cs.paddingRight))];
    const flat = [];
    for (const c of main.children) {
      // A-55: the navigation column and the sections next to it count as blocks of the page.
      if (c.classList.contains("direction-layout")) {
        for (const l of c.children) { if (l.classList.contains("direction-content")) flat.push(...l.children); else flat.push(l); }
      } else flat.push(c);
    }
    const blocks = flat.filter((c) => c.getBoundingClientRect().height).map((c) => {
      const q = c.getBoundingClientRect();
      const list = c.lastElementChild && c.lastElementChild.matches(".scroller__track") && c.querySelector(":scope > .scroller__track > .scroller__list");
      const bottom = list ? list.getBoundingClientRect().bottom : q.bottom;
      return { sel: selectorOf(c, [...c.classList]) + (c.id ? "#" + c.id : ""), isNav: c.tagName === "NAV", top: round(q.top + scrollY), bottom: round(bottom + scrollY), left: round(q.left), right: round(q.right) };
    });
    const footer = document.querySelector(".site-footer");
    const f = footer.getBoundingClientRect();
    blocks.push({ sel: ".site-footer", isNav: false, isFooter: true, top: round(f.top + scrollY), bottom: round(f.bottom + scrollY), left: round(f.left), right: round(f.right) });

    const heads = [];
    const align = [];
    for (const sec of main.querySelectorAll("section")) {
      const head = sec.querySelector(":scope > .section-head");
      const h2 = sec.querySelector("h2");
      const secBox = sec.getBoundingClientRect();
      // A-55: sections next to the navigation column start at the edge of that column.
      const inColumn = sec.parentElement.classList.contains("direction-content");
      const startX = inColumn ? round(secBox.left) : inner[0];
      const headText = head && h2 ? h2.getBoundingClientRect().left : null;
      if (head) {
        const hb = head.getBoundingClientRect();
        let next = head.nextElementSibling;
        // The scroller track has focus room around the list, measure to the list itself.
        if (next && next.querySelector(":scope > .scroller__list")) next = next.querySelector(":scope > .scroller__list");
        if (next) {
          const nb = next.getBoundingClientRect();
          heads.push({ sec: "#" + (sec.id || sec.className), sel: "#" + sec.id + " .section-head", gap: round(nb.top - hb.bottom), rect: [round(hb.left + scrollX), round(hb.bottom + scrollY), round(hb.width), round(nb.top - hb.bottom)] });
        }
      }
      // Where the content of the section starts: its text if it sits on the page, its card if it sits on a surface.
      for (const child of sec.children) {
        if (child === head || !child.getBoundingClientRect().height) continue;
        // The second column of a row does not start at the edge.
        const cb = child.getBoundingClientRect();
        const secondInRow = [...sec.children].some((o) => {
          if (o === child || o === head) return false;
          const ob = o.getBoundingClientRect();
          return ob.height && ob.right <= cb.left + 1 && ob.top < cb.bottom - 1 && ob.bottom > cb.top + 1;
        });
        if (secondInRow) continue;
        const best = { x: Infinity };
        const walk = (node, inSurface) => {
          for (const c of node.children) {
            const ccs = getComputedStyle(c);
            if (ccs.display === "none" || c.matches(".visually-hidden") || !c.getBoundingClientRect().width) continue;
            const cq = c.getBoundingClientRect();
            // A small painted box (an icon in a circle) is content, a large one is a card.
            if (isSurface(ccs) && cq.width > 64) {
              if (cq.left < best.x) { best.x = cq.left; best.kind = "surface"; best.el = c; }
              continue;
            }
            const before = getComputedStyle(c, "::before");
            const hasNumber = before.content && !["none", "normal", '""'].includes(before.content) && !before.content.startsWith("url");
            const t = textBox(c);
            const isLeaf = t || hasNumber || c.classList.contains("icon") || c.tagName === "IMG" || isSurface(ccs);
            if (isLeaf) {
              const x = hasNumber ? cq.left + parseFloat(ccs.paddingLeft) : t ? t[0] : cq.left;
              if (x < best.x) { best.x = x; best.kind = "text"; best.el = c; }
            }
            if (!isSurface(ccs)) walk(c, inSurface);
          }
        };
        if (isSurface(getComputedStyle(child))) {
          const q = child.getBoundingClientRect();
          best.x = q.left; best.kind = "surface"; best.el = child;
        } else walk(child, false);
        if (best.x === Infinity) continue;
        const q = best.el.getBoundingClientRect();
        const cls = [...best.el.classList];
        align.push({
          sec: sec.id ? "#" + sec.id : "." + sec.className.split(" ")[0],
          child: selectorOf(best.el, cls),
          first: cls.find((c) => nameSet.has(c)) || cls[0] || best.el.tagName.toLowerCase(),
          kind: best.kind,
          x: round(best.x),
          expected: best.kind === "surface" || headText === null ? startX : round(headText),
          rect: [round(q.left + scrollX), round(q.top + scrollY), round(q.width), round(q.height)]
        });
      }
    }
    const logo = document.querySelector(".site-header .logo");
    const footMain = document.querySelector(".site-footer__main");
    page.inner = inner;
    page.blocks = blocks;
    page.heads = heads;
    page.align = align;
    page.edges = { logo: logo ? round(logo.getBoundingClientRect().left) : null, footer: footMain ? round(footMain.getBoundingClientRect().left) : null, h2: main.querySelector(".section-head h2") ? inner[0] : null }; // A-51: the logo and the footer stand on the container edge, A-55: headings may be in the column next to the navigation
  }

  /* inner edges of the booking dialog and the mobile menu */
  const modal = {};
  if (scope && root.matches(".modal")) {
    const lefts = [];
    const rights = [];
    const add = (name, el) => {
      if (!el || !el.getBoundingClientRect().width) return;
      const q = el.getBoundingClientRect();
      lefts.push({ name, x: round(q.left) });
      rights.push({ name, x: round(q.right) });
    };
    const body = root.querySelector(".flow__body");
    add("шапка окна", root.querySelector(".modal__head > :not([hidden])"));
    add("полоса шага", root.querySelector(".flow__bar:not([hidden])"));
    if (body) add("содержимое", [...body.children].find((c) => !c.hidden && c.getBoundingClientRect().width));
    modal.lefts = lefts;
    modal.rights = rights;
    const close = root.querySelector("[data-modal-close]");
    const foot = root.querySelector(".modal__foot .btn");
    const edgeR = [["кнопка закрытия", close], ["кнопка внизу", foot]].filter(([, e]) => e && e.getBoundingClientRect().width).map(([name, e]) => ({ name, x: round(e.getBoundingClientRect().right) }));
    modal.rights = rights.filter((r) => r.name !== "шапка окна").concat(edgeR);
  }

  const de = document.documentElement;
  const hscroll = scope ? Math.max(0, root.scrollWidth - root.clientWidth) : Math.max(0, de.scrollWidth - de.clientWidth);

  return {
    W, height: Math.max(de.scrollHeight, document.body.scrollHeight), tokens, els, rows, page, modal, hscroll
  };
}

/* ------------------------------------------------------------------ driving the scenes */

const SHOT_DIR = path.join(ROOT, "audit/shots", BASELINE ? "before" : "after");

async function settle(page) {
  await page.evaluate(async () => {
    document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = "eager"; });
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => (i.decode ? i.decode().catch(() => {}) : null)));
  });
  await page.waitForTimeout(60);
}

async function scene(page, def, width, tokenNames, scenes) {
  const scope = def.scope || null;
  let fitted = false;
  if (scope) {
    const need = await page.evaluate((sel) => {
      const d = document.querySelector(sel);
      const b = d.querySelector(".modal__body") || d;
      return d.offsetHeight + (b.scrollHeight - b.clientHeight);
    }, scope);
    const h = Math.max(BASE_HEIGHT, width < 768 ? need : Math.ceil(need / 0.9) + 2);
    if (h !== BASE_HEIGHT) { await page.setViewportSize({ width, height: h }); fitted = true; }
    await page.waitForTimeout(40);
  }
  await settle(page);
  const data = await page.evaluate(collect, { scope, tokenNames, nameKeys: Object.keys(NAMES) });
  const file = def.id + "-" + width + ".jpg";
  if (!CHECK) {
    fs.mkdirSync(SHOT_DIR, { recursive: true });
    await page.screenshot({ path: path.join(SHOT_DIR, file), type: "jpeg", quality: 60, fullPage: !scope });
  }
  const viewport = page.viewportSize();
  const out = { id: def.id, page: def.page, width, shot: file, imgW: viewport.width, imgH: scope ? viewport.height : data.height, data };
  scenes.push(out);
  if (fitted) await page.setViewportSize({ width, height: BASE_HEIGHT });
  await page.waitForTimeout(20);
  return out;
}

async function runWidth(browser, base, width, tokenNames, scenes, problems) {
  const context = await browser.newContext({ viewport: { width, height: BASE_HEIGHT }, reducedMotion: "reduce", deviceScaleFactor: 1, locale: "ru-RU" });
  await context.clock.setFixedTime(FIXED_NOW);
  const page = await context.newPage();
  page.on("pageerror", (e) => problems.push(width + ": " + e.message));
  page.on("console", (m) => { if (m.type() === "error") problems.push(width + ": " + m.text()); });
  page.on("request", (r) => { if (!r.url().startsWith(base) && !r.url().startsWith("data:")) problems.push(width + ": внешний запрос " + r.url()); });
  page.on("response", (r) => { if (r.status() >= 400) problems.push(width + ": " + r.status() + " " + r.url()); });
  const open = async (file) => { await page.goto(base + file, { waitUntil: "load" }); await settle(page); };

  await open("index.html");
  await scene(page, { id: "home", page: "Главная" }, width, tokenNames, scenes);
  if (width < 1100) {
    await page.click(".site-header__menu");
    await page.waitForSelector("#site-menu[open]");
    await scene(page, { id: "menu", page: "Мобильное меню", scope: "#site-menu" }, width, tokenNames, scenes);
    await page.click("#site-menu [data-modal-close]");
  }

  await open("direction.html");
  await scene(page, { id: "direction", page: "Чек-ап программы" }, width, tokenNames, scenes);

  await context.close();
}

/* ------------------------------------------------------------------ rules */

class Issues {
  constructor() { this.map = new Map(); }
  add(key, fields, occurrence) {
    let it = this.map.get(key);
    if (!it) { it = { key, ...fields, occurrences: [] }; this.map.set(key, it); }
    if (occurrence) it.occurrences.push(occurrence);
    return it;
  }
}

function humanName(rec) {
  const entry = NAMES[rec.first];
  return entry ? entry[0] + ", " + rec.n + "-" + entry[1] : "." + rec.first + ", " + rec.n + "-й";
}
function occ(s, rec, measured) {
  return { scene: s.id, page: s.page, width: s.width, rect: rec.rect, name: humanName(rec), sel: rec.sel, measured };
}
const fmt = (n) => (Number.isInteger(n) ? n : Math.round(n * 100) / 100) + " px";
function nearestToken(map, value) {
  let best = null;
  for (const [name, v] of Object.entries(map)) {
    if (!best || Math.abs(v - Math.abs(value)) < Math.abs(best.v - Math.abs(value))) best = { name, v };
  }
  const names = Object.entries(map).filter(([, v]) => v === best.v).map(([n]) => n);
  return { v: best.v, names: names.slice(0, 2).join(" / ") };
}
function isExcepted(rule, sig, prop) {
  return EXCEPTIONS.find((e) => e.rule === rule && (e.sig instanceof RegExp ? e.sig.test(sig) : e.sig === sig) && (!e.prop || e.prop === prop));
}

function analyzeScene(s, issues) {
  const { els, rows, tokens, page, modal, hscroll } = s.data;
  const W = s.width;
  const spaceValues = new Set(Object.values(tokens.space));
  const lines = new Set(tokens.text.map((t) => t.line).filter((v) => v != null));
  const sizes = new Set(tokens.text.map((t) => t.size));
  const pairs = new Set(tokens.text.filter((t) => t.line != null).map((t) => t.size + "/" + t.line));

  for (const rec of els) {
    /* 1. spacing scale */
    for (const [prop, value] of Object.entries(rec.sp)) {
      if (spaceValues.has(Math.abs(value))) continue;
      if (isExcepted(1, rec.sig, prop)) continue;
      const near = nearestToken(tokens.space, value);
      const it = issues.add("1|" + rec.sig + "|" + Math.abs(value), {
        rule: 1, sig: rec.sig, title: "Отступ вне шкалы", measured: fmt(Math.abs(value)), expected: fmt(near.v) + " (" + near.names + ")", props: new Set(), diff: Math.abs(Math.abs(value) - near.v)
      }, occ(s, rec, prop + ": " + fmt(value)));
      it.props.add(prop);
    }

    /* 4. sizes: controls */
    if (rec.control && !isExcepted(4, rec.sig, "height")) {
      const steps = Object.values(tokens.control);
      const expected = rec.control === "any" ? null : tokens.control[rec.control];
      const ok = expected == null ? steps.includes(Math.round(rec.h)) : Math.abs(rec.h - expected) < 0.51;
      if (!ok) {
        const exp = expected == null ? nearestToken(tokens.control, rec.h).v : expected;
        issues.add("4|control|" + rec.sig + "|" + fmt(rec.h), {
          rule: 4, sig: rec.sig, title: "Высота вне шага размеров", measured: fmt(rec.h), expected: fmt(exp) + " (" + (rec.control === "any" ? "шаг" : rec.control) + ")", props: new Set(["height"])
        }, occ(s, rec, "высота " + fmt(rec.h)));
      }
    }
    /* 4. sizes: icons */
    if (rec.icon) {
      const scale = Object.values(tokens.icon);
      if (!scale.includes(rec.icon[0]) || !scale.includes(rec.icon[1])) {
        issues.add("4|icon|" + rec.sig + "|" + rec.icon.join("x"), {
          rule: 4, sig: rec.sig, title: "Иконка вне шкалы", measured: rec.icon.join("×") + " px", expected: scale.sort((a, b) => a - b).join(", ") + " px", props: new Set(["size"])
        }, occ(s, rec, rec.icon.join("×") + " px"));
      }
    }
    /* 4. sizes: tap targets at 768 and below */
    if (rec.tap && W <= 768 && (rec.tap.w < tokens.tap - 0.5 || rec.tap.h < tokens.tap - 0.5) && !isExcepted(4, rec.sig, "tap")) {
      const it = issues.add("4|tap|" + rec.sig + "|" + (rec.tap.inline ? "inline" : "box"), {
        rule: 4, sig: rec.sig, title: rec.tap.inline ? "Ссылка в тексте меньше области нажатия" : "Область нажатия меньше минимума", measured: "", expected: "от " + fmt(tokens.tap) + " (--tap-target)", props: new Set(["tap-target"]), minSide: Infinity
      }, occ(s, rec, Math.round(rec.tap.w) + "×" + Math.round(rec.tap.h) + " px"));
      const side = Math.min(rec.tap.w, rec.tap.h);
      if (side < it.minSide) { it.minSide = side; it.measured = Math.round(rec.tap.w) + "×" + Math.round(rec.tap.h) + " px"; }
    }

    /* 5. gutter */
    if (rec.content && !rec.scroller && rec.rect[2] < W - 0.5) {
      const left = rec.text ? rec.text[0] : rec.rect[0];
      const right = rec.text ? rec.text[1] : rec.rect[0] + rec.rect[2];
      if (left < tokens.gutter - 0.5 || right > W - tokens.gutter + 0.5) {
        const edge = left < tokens.gutter - 0.5 ? "слева " + fmt(left) : "справа " + fmt(W - right);
        issues.add("5|gutter|" + rec.sig, {
          rule: 5, sig: rec.sig, title: "Ближе к краю экрана, чем поле страницы", measured: edge, expected: "не меньше " + fmt(tokens.gutter) + " (--page-gutter)", props: new Set(["edge"])
        }, occ(s, rec, edge));
      }
    }

    /* 6. type */
    const checkType = (t, sig, where) => {
      if (isExcepted(6, sig, "type")) return;
      const label = t.fs + "/" + (t.lh == null ? "normal" : t.lh);
      if (!sizes.has(t.fs)) {
        const near = [...sizes].sort((a, b) => Math.abs(a - t.fs) - Math.abs(b - t.fs))[0];
        issues.add("6|size|" + sig + "|" + t.fs, { rule: 6, sig, title: "Размер шрифта вне шкалы", measured: fmt(t.fs), expected: fmt(near), props: new Set(["font-size"]) }, where(label));
      } else if (t.lh == null || !lines.has(t.lh)) {
        const pair = tokens.text.find((p) => p.size === t.fs && p.line != null);
        issues.add("6|line|" + sig + "|" + label, { rule: 6, sig, title: "Высота строки вне шкалы", measured: label + " px", expected: pair ? t.fs + "/" + pair.line + " px" : "токен высоты строки для " + fmt(t.fs), props: new Set(["line-height"]) }, where(label));
      } else if (!pairs.has(t.fs + "/" + t.lh)) {
        const pair = tokens.text.find((p) => p.size === t.fs && p.line != null);
        issues.add("6|pair|" + sig + "|" + label, { rule: 6, sig, title: "Пара размер/строка не из шкалы", measured: label + " px", expected: pair ? t.fs + "/" + pair.line + " px" : "токен высоты строки для " + fmt(t.fs), props: new Set(["font-size", "line-height"]) }, where(label));
      }
    };
    if (rec.type && rec.classes.indexOf("a11y-panel__btn") === -1) checkType(rec.type, rec.sig, (l) => occ(s, rec, l));
    if (rec.pseudo) checkType(rec.pseudo, rec.sig + rec.pseudo.pos, (l) => occ(s, rec, rec.pseudo.pos + " " + l));

    /* 6. line length */
    if (rec.chars > 80) { // A-42: «about 75» allows a few characters more
      const it = issues.add("6|chars|" + rec.sig, { rule: 6, sig: rec.sig, title: "Строка текста длиннее 75 знаков", measured: "", expected: "до 75 знаков", props: new Set(["ширина"]), maxChars: 0 }, occ(s, rec, rec.chars + " знаков"));
      if (rec.chars > it.maxChars) { it.maxChars = rec.chars; it.measured = rec.chars + " знаков"; }
    }
  }

  /* 3. cards in a row */
  for (const row of rows) {
    const minH = Math.min(...row.heights), maxH = Math.max(...row.heights);
    if (maxH - minH > 0.51) {
      issues.add("3|row-height|" + row.card, { rule: 3, sig: row.card, title: "Карточки в ряду разной высоты", measured: fmt(minH) + "–" + fmt(maxH), expected: "одна высота", props: new Set(["height"]) },
        ...row.rects.map((r, i) => ({ scene: s.id, page: s.page, width: W, rect: r, name: cardName(row.card, i), sel: row.card, measured: fmt(row.heights[i]) })).slice(0, 1));
    }
    for (const part of row.inner) {
      const vals = part.vals.filter((v) => v != null);
      if (vals.length < 2) continue;
      const lo = Math.min(...vals), hi = Math.max(...vals);
      if (hi - lo > 1) {
        const it = issues.add("3|row-inner|" + part.sel, { rule: 3, sig: part.sel, title: "Содержимое карточек в ряду не на одной линии", measured: "", expected: "разница 0 px", props: new Set([part.side === "top" ? "отступ от верха" : "отступ от низа"]), maxDiff: 0 });
        const diff = hi - lo;
        if (diff > it.maxDiff) { it.maxDiff = diff; it.measured = "разница до " + fmt(diff); }
        it.occurrences.push({ scene: s.id, page: s.page, width: W, rect: row.rects[part.vals.indexOf(hi)], name: cardName(row.card, part.vals.indexOf(hi)), sel: part.sel, measured: "разница " + fmt(diff) });
      }
    }
  }

  /* 5. horizontal scroll */
  if (hscroll > 0.5) {
    issues.add("5|hscroll|" + s.id, { rule: 5, sig: s.id, title: "Горизонтальная прокрутка", measured: "лишние " + fmt(hscroll), expected: "0 px", props: new Set(["scroll"]) },
      { scene: s.id, page: s.page, width: W, rect: [0, 0, W, 40], name: s.page, sel: "html", measured: fmt(hscroll) });
  }

  /* 5. section edges */
  if (page.align) {
    for (const a of page.align) {
      if (isExcepted(5, a.child, "align") || isExcepted(5, a.sec, "align")) continue;
      if (Math.abs(a.x - a.expected) > 0.51) {
        const label = a.kind === "surface" ? "край карточки " : "начало текста ";
        const entry = NAMES[a.first];
        issues.add("5|align|" + a.sec + "|" + a.child, {
          rule: 5, sig: a.child, title: a.kind === "surface" ? "Край блока не совпадает с контейнером" : "Содержимое секции не на линии заголовка", measured: "", expected: a.kind === "surface" ? "край контейнера" : "линия заголовка секции", props: new Set(["left"]), byWidth: true
        }, { scene: s.id, page: s.page, width: W, rect: a.rect, name: (entry ? entry[0] : a.first) + " в " + a.sec, sel: a.child, measured: label + fmt(a.x) + " при " + fmt(a.expected) });
      }
    }
    for (const b of page.blocks) {
      if (b.isFooter) continue;
      const inColumn = b.left !== page.inner[0] && b.right === page.inner[1] && W >= 1100;
      if (Math.abs(b.left - page.inner[0]) > 0.51 && !inColumn) {
        issues.add("5|block|" + b.sel, { rule: 5, sig: b.sel, title: "Край секции не совпадает с контейнером", measured: fmt(b.left), expected: fmt(page.inner[0]), props: new Set(["left"]) },
          { scene: s.id, page: s.page, width: W, rect: [b.left, b.top, b.right - b.left, b.bottom - b.top], name: b.sel, sel: b.sel, measured: fmt(b.left) });
      }
    }
    const e = page.edges;
    if (e.logo != null && e.h2 != null && Math.abs(e.logo - e.h2) > 0.51) {
      issues.add("5|edge-logo", { rule: 5, sig: ".logo", title: "Логотип не на линии заголовков", measured: "", expected: "линия заголовков секций", props: new Set(["left"]), byWidth: true },
        { scene: s.id, page: s.page, width: W, rect: logoRect(s), name: "логотип, 1-й", sel: ".site-header .logo", measured: fmt(e.logo) + " при " + fmt(e.h2) });
    }
    if (e.footer != null && e.h2 != null && Math.abs(e.footer - e.h2) > 0.51) {
      issues.add("5|edge-footer", { rule: 5, sig: ".site-footer__main", title: "Подвал не на линии заголовков", measured: "", expected: "линия заголовков секций", props: new Set(["left"]), byWidth: true },
        { scene: s.id, page: s.page, width: W, rect: footerRect(s), name: "подвал, 1-й", sel: ".site-footer__main", measured: fmt(e.footer) + " при " + fmt(e.h2) });
    }
  }

  /* 5. inner edges of the booking dialog */
  if (modal.lefts && modal.lefts.length) {
    for (const [side, list] of [["left", modal.lefts], ["right", modal.rights]]) {
      const xs = list.map((l) => l.x);
      const major = mode(xs);
      for (const l of list) {
        if (Math.abs(l.x - major) > 0.51) {
          issues.add("5|modal|" + l.name + "|" + side, { rule: 5, sig: ".modal " + l.name, title: "Край в окне записи не на общей линии", measured: fmt(l.x), expected: fmt(major), props: new Set([side]) },
            { scene: s.id, page: s.page, width: W, rect: [l.x, 40, 24, 24], name: l.name, sel: ".modal", measured: fmt(l.x) + " при " + fmt(major) });
        }
      }
    }
  }
}

function logoRect(s) { const r = s.data.els.find((x) => x.classes.includes("logo")); return r ? r.rect : [0, 0, 60, 40]; }
function footerRect(s) { const r = s.data.els.find((x) => x.classes.includes("site-footer__main")); return r ? r.rect : [0, s.imgH - 60, 60, 40]; }
function cardName(card, i) {
  const entry = NAMES[card.replace(".", "")];
  return entry ? entry[0] + ", " + (i + 1) + "-" + entry[1] : card + ", " + (i + 1);
}
function mode(list) {
  const counts = new Map();
  list.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

/* 2. rhythm between sections, per page, per width and between the pages */
function analyzeRhythm(scenes, issues) {
  const pages = scenes.filter((s) => s.data.page.blocks);
  const groupsHead = new Map();
  for (const s of pages) {
    const tokens = s.data.tokens;
    const blocks = s.data.page.blocks;
    const gaps = [];
    // Blocks side by side (the navigation column and its sections) count once; the navigation button belongs to the page head.
    const seq = [];
    for (const b of blocks) {
      const prev = seq[seq.length - 1];
      if (prev && b.top < prev.bottom - 1) { prev.bottom = Math.max(prev.bottom, b.bottom); continue; }
      seq.push({ ...b });
    }
    for (let i = 1; i < seq.length; i++) {
      if (seq[i].isNav) continue;
      gaps.push({ from: seq[i - 1].sel, to: seq[i].sel, gap: Math.round((seq[i].top - seq[i - 1].bottom) * 100) / 100, y: seq[i - 1].bottom, x: seq[i].left, w: seq[i].right - seq[i].left });
    }
    for (const g of gaps) {
      if (Math.abs(g.gap - tokens.section) > 0.51) {
        issues.add("2|section|" + g.from + "→" + g.to + "|" + g.gap, {
          rule: 2, sig: g.from + " → " + g.to, title: "Расстояние между секциями не равно ритму", measured: fmt(g.gap), expected: fmt(tokens.section) + " (--space-section)", props: new Set(["расстояние"])
        }, { scene: s.id, page: s.page, width: s.width, rect: [g.x, g.y, g.w, Math.max(g.gap, 4)], name: g.from + " → " + g.to, sel: g.to, measured: fmt(g.gap) });
      }
    }
    for (const h of s.data.page.heads) {
      if (!groupsHead.has(s.width)) groupsHead.set(s.width, []);
      groupsHead.get(s.width).push({ s, h });
    }
  }
  for (const [width, list] of groupsHead) {
    const major = mode(list.map((x) => x.h.gap));
    for (const { s, h } of list) {
      if (Math.abs(h.gap - major) > 0.51) {
        issues.add("2|head|" + h.sel + "|" + h.gap, {
          rule: 2, sig: h.sel, title: "Заголовок секции и содержимое: другое расстояние", measured: fmt(h.gap), expected: fmt(major) + " (как у остальных секций)", props: new Set(["расстояние"])
        }, { scene: s.id, page: s.page, width, rect: h.rect, name: "заголовок секции " + h.sec, sel: h.sel, measured: fmt(h.gap) });
      }
    }
  }
}

/* 3. instances of one component across all pages at one width; 4. photos of one kind */
function analyzeComponents(scenes, issues) {
  const HEIGHT_SAME = /(^|\.)(btn|field__control|slot__text|badge|anchor-nav__link|lang__link|site-nav__link|social-link|payments__item|a11y-toggle|datepicker__day)(\.|$)/;
  for (const width of WIDTHS) {
    const groups = new Map();
    const media = new Map();
    for (const s of scenes.filter((x) => x.width === width)) {
      for (const rec of s.data.els) {
        if (rec.ratio) {
          if (!media.has(rec.classes[0])) media.set(rec.classes[0], []);
          media.get(rec.classes[0]).push({ s, rec });
        }
        if (!rec.classes.length) continue;
        if (!groups.has(rec.sig)) groups.set(rec.sig, []);
        groups.get(rec.sig).push({ s, rec });
      }
    }
    for (const [sig, list] of groups) {
      // The same instance appears in several scenes (header, footer, the page under the dialog): count unique ones only.
      const props = ["padding", "gap", "radius", "font-size", "line-height", "min-height"];
      if (HEIGHT_SAME.test(sig) && !sig.includes("textarea")) props.push("height");
      for (const prop of props) {
        const values = new Map();
        for (const item of list) {
          const v = prop === "height" ? fmt(item.rec.h) : item.rec.comp[prop];
          if (item.rec.tag === "textarea" && (prop === "min-height" || prop === "height")) continue;
          if (v === "" || v == null) continue;
          if (!values.has(v)) values.set(v, []);
          values.get(v).push(item);
        }
        if (values.size < 2) continue;
        const sorted = [...values.entries()].sort((a, b) => b[1].length - a[1].length);
        const [majorValue, majorItems] = sorted[0];
        const total = [...values.values()].reduce((sum, x) => sum + x.length, 0);
        for (const [value, items] of sorted.slice(1)) {
          if (isExcepted(3, sig, prop)) continue;
          const it = issues.add("3|" + sig + "|" + prop + "|" + value + "|" + majorValue, {
            rule: 3, sig, title: "Экземпляр отличается от остальных: " + prop, measured: value, expected: majorValue + " (у " + majorItems.length + " из " + total + ")", props: new Set([prop])
          });
          for (const x of items) it.occurrences.push(occ(x.s, x.rec, prop + ": " + value));
        }
      }
    }
    for (const [cls, list] of media) {
      const ratios = new Map();
      list.forEach((x) => { const k = x.rec.ratio.toFixed(2); if (!ratios.has(k)) ratios.set(k, []); ratios.get(k).push(x); });
      if (ratios.size < 2) continue;
      const sorted = [...ratios.entries()].sort((a, b) => b[1].length - a[1].length);
      for (const [k, items] of sorted.slice(1)) {
        const it = issues.add("4|ratio|" + cls + "|" + k, { rule: 4, sig: "." + cls, title: "Фото одного вида с разной пропорцией", measured: k, expected: sorted[0][0], props: new Set(["aspect-ratio"]) });
        for (const x of items) it.occurrences.push(occ(x.s, x.rec, "пропорция " + k));
      }
    }
  }
}

/* 7. hardcoded values in the CSS and inline styles */
function analyzeHardcoded(issues) {
  const files = ["css/base.css", "css/icons.css", "css/components.css", ...fs.readdirSync(path.join(ROOT, "css/pages")).filter((f) => f.endsWith(".css")).map((f) => "css/pages/" + f)];
  if (fs.existsSync(path.join(ROOT, "css/debug-layout.css"))) files.push("css/debug-layout.css");
  const unit = /(?<![\w#.-])-?\d*\.?\d+(?:px|rem|em|vh|vw)\b/g;
  for (const file of files) {
    const lines = fs.readFileSync(path.join(ROOT, file), "utf8").split(/\r?\n/);
    let comment = false;
    lines.forEach((raw, i) => {
      let line = raw;
      if (comment) { const end = line.indexOf("*/"); if (end === -1) return; line = line.slice(end + 2); comment = false; }
      line = line.replace(/\/\*.*?\*\//g, "");
      const open = line.indexOf("/*");
      if (open !== -1) { line = line.slice(0, open); comment = true; }
      if (/^\s*@media/.test(line)) return; // media queries cannot read custom properties
      const stripped = line.replace(/@media[^{]*\{/, "");
      const m = stripped.match(unit);
      if (!m) return;
      const sel = (stripped.split("{")[0] || "").trim().slice(0, 70);
      if (isExcepted(7, sel)) return;
      issues.add("7|" + file + "|" + sel + "|" + m.join(","), {
        rule: 7, sig: file + ":" + (i + 1), title: "Значение в CSS вне tokens.css", measured: m.join(", "), expected: "токен из css/tokens.css", props: new Set(["css"]), file, line: i + 1, code: stripped.trim().slice(0, 140)
      });
    });
  }
  for (const file of ["index.html", "direction.html", "kit.html"]) {
    const text = fs.readFileSync(path.join(ROOT, file), "utf8");
    for (const m of text.matchAll(/style="[^"]*\d(?:px|rem|em)[^"]*"/g)) {
      issues.add("7|" + file + "|" + m[0], { rule: 7, sig: file, title: "Значение в style= вне tokens.css", measured: m[0], expected: "класс и токен", props: new Set(["html"]), file, code: m[0] });
    }
  }
}

/* ------------------------------------------------------------------ baseline and status */

const DATA_DIR = path.join(ROOT, "audit/data");
const BEFORE_FILE = path.join(DATA_DIR, "before.json");

function serialize(it) {
  const { props, ...rest } = it;
  // The value differs by width: «24 px при 36 px на 1440, 1280».
  if (rest.byWidth) {
    const groups = new Map();
    for (const o of rest.occurrences) {
      if (!groups.has(o.measured)) groups.set(o.measured, new Set());
      groups.get(o.measured).add(o.width);
    }
    rest.measured = [...groups.entries()].map(([m, w]) => m + " на " + [...w].sort((a, b) => b - a).join(", ")).join("; ");
  }
  return { ...rest, props: [...(props || [])] };
}

function sortIssues(list) {
  return list.sort((a, b) => a.rule - b.rule || String(a.sig).localeCompare(String(b.sig)) || String(a.measured).localeCompare(String(b.measured)));
}

function proposalFor(it) {
  const p = PROPOSALS.find((x) => {
    if (x.rule && x.rule !== it.rule) return false;
    if (x.key instanceof RegExp) return x.key.test(it.key);
    return x.key === it.key;
  });
  return p ? p.text : "";
}

function summarize(list) {
  const out = { total: list.length, byRule: {} };
  for (const n of Object.keys(RULES)) out.byRule[n] = list.filter((i) => String(i.rule) === n).length;
  return out;
}

/* ------------------------------------------------------------------ reports */

const STATUS = { fixed: "исправлено автоматически", resolved: "исправлено по решению", decide: "нужно решение", fresh: "новое нарушение" };

function pagesOf(it) { return [...new Set(it.occurrences.map((o) => o.page))]; }
function widthsOf(it) { return [...new Set(it.occurrences.map((o) => o.width))].sort((a, b) => b - a); }
function elementOf(it) {
  const o = it.occurrences[0];
  if (!o) return { sel: it.file ? it.file + (it.line ? ":" + it.line : "") : it.sig, name: "CSS" };
  return { sel: o.sel, name: o.name };
}

function writeMarkdown(meta, issues) {
  const L = [];
  L.push("# Аудит отступов и размеров", "");
  L.push("Создано скриптом `tools/audit-layout.mjs`, вручную не править. Наглядная версия со скриншотами: [audit/report.html](../../audit/report.html).", "");
  L.push("Проверено: главная, «Чек-ап программы», все шаги записи обоих сценариев, оплата, открытое мобильное меню. Ширины: " + WIDTHS.join(", ") + ". Одно нарушение на нескольких ширинах и страницах считается одним номером.", "");
  L.push("## Итог", "");
  L.push("| | Было до правок | Исправлено автоматически | Исправлено по решению | Осталось: нужно решение | Новых |", "|---|---|---|---|---|---|");
  for (const [n, name] of Object.entries(RULES)) {
    const inRule = issues.filter((i) => String(i.rule) === n);
    const fixed = inRule.filter((i) => i.status === "fixed").length;
    const resolved = inRule.filter((i) => i.status === "resolved").length;
    const decide = inRule.filter((i) => i.status === "decide").length;
    const fresh = inRule.filter((i) => i.status === "fresh").length;
    L.push(`| ${n}. ${name} | ${fixed + resolved + decide} | ${fixed} | ${resolved} | ${decide} | ${fresh} |`);
  }
  const fx = issues.filter((i) => i.status === "fixed").length, rs = issues.filter((i) => i.status === "resolved").length, dc = issues.filter((i) => i.status === "decide").length, fr = issues.filter((i) => i.status === "fresh").length;
  L.push(`| **Всего** | **${fx + rs + dc}** | **${fx}** | **${rs}** | **${dc}** | **${fr}** |`, "");
  L.push(`Измерений отступов, размеров и шрифтов: ${meta.measurements}. Экранов: ${meta.scenes}. Внешние запросы и ошибки в консоли: ${meta.problems.length ? meta.problems.length + " (см. ниже)" : "нет"}.`, "");
  if (meta.problems.length) L.push(...meta.problems.slice(0, 20).map((p) => "- " + p), "");
  L.push("## Нарушения", "");
  for (const it of issues) {
    const el = elementOf(it);
    L.push(`### ${it.num}. ${it.title}`, "");
    L.push(`- **Статус:** ${STATUS[it.status]}`);
    L.push(`- **Правило:** ${it.rule}. ${RULES[it.rule]}`);
    if (it.occurrences.length) {
      L.push(`- **Страница:** ${pagesOf(it).join(", ")}`);
      L.push(`- **Ширина:** ${widthsOf(it).join(", ")}`);
    }
    L.push(`- **Элемент:** \`${el.sel}\`${el.name !== "CSS" ? ` — «${el.name}»` : ""}${it.occurrences.length > 1 ? `, всего мест: ${it.occurrences.length}` : ""}`);
    if (it.code) L.push(`- **Строка:** \`${it.code.replace(/`/g, "'")}\``);
    if (it.props && it.props.length) L.push(`- **Свойство:** ${it.props.join(", ")}`);
    L.push(`- **Измерено:** ${it.measured}`);
    L.push(`- **Ожидается:** ${it.expected}`);
    if (it.fix) L.push(`- **Что сделано:** ${it.fix}`);
    if (it.proposal) L.push(`- **Предложение:** ${it.proposal}`);
    L.push("");
  }
  if (EXCEPTIONS.length) {
    L.push("## Намеренные исключения", "", "Эти значения скрипт не считает нарушениями:", "");
    for (const e of EXCEPTIONS) L.push(`- Правило ${e.rule}, \`${e.sig}\`${e.prop ? ", " + e.prop : ""}: ${e.why}`);
    L.push("");
  }
  fs.mkdirSync(path.join(ROOT, "docs/audit"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "docs/audit/layout-audit.md"), L.join("\n"));
}

function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

function writeReport(meta, issues, scenesMeta) {
  const payload = {
    rules: RULES, status: STATUS, widths: WIDTHS, meta, scenes: scenesMeta,
    issues: issues.map((it) => ({
      num: it.num, rule: it.rule, title: it.title, status: it.status, sel: elementOf(it).sel, name: elementOf(it).name, code: it.code || "", props: it.props || [],
      measured: it.measured, expected: it.expected, proposal: it.proposal || "", fix: it.fix || "", pages: pagesOf(it), widths: widthsOf(it), count: it.occurrences.length,
      occ: it.occurrences.map((o) => [o.scene, o.width, ...o.rect.map((v) => Math.round(v)), o.name])
    }))
  };
  const json = JSON.stringify(payload).replace(/</g, "\\u003c");
  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Аудит отступов и размеров — Сихат РКБ (макет)</title>
  <meta name="description" content="Отчёт о проверке отступов, размеров и типографики макета. Создан скриптом tools/audit-layout.mjs.">
  <link rel="icon" href="../assets/img/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="../css/tokens.css">
  <link rel="stylesheet" href="../css/base.css">
  <link rel="stylesheet" href="../css/icons.css">
  <link rel="stylesheet" href="../css/components.css">
  <link rel="stylesheet" href="../css/pages/report.css">
</head>
<body>
  <!-- Generated by tools/audit-layout.mjs, do not edit by hand. Behaviour: audit/report.js. -->
  <main class="report container" id="report" data-root>
    <noscript><p>Для отчёта нужен JavaScript. Тот же список текстом: <a href="../docs/audit/layout-audit.md">docs/audit/layout-audit.md</a>.</p></noscript>
    <p class="report__status">${esc(meta.date)}</p>
  </main>
  <script type="application/json" id="audit-data">${json}</script>
  <script src="report.js"></script>
</body>
</html>
`;
  fs.writeFileSync(path.join(ROOT, "audit/report.html"), html);
}

/* ------------------------------------------------------------------ main */

async function main() {
  const server = await startServer();
  const base = "http://127.0.0.1:" + server.address().port + "/";
  const browser = await launch();
  const tokenNames = readTokenNames();
  const scenes = [];
  const problems = [];
  if (!CHECK) fs.rmSync(SHOT_DIR, { recursive: true, force: true });
  try {
    for (const width of WIDTHS) {
      process.stdout.write("  " + width + "… ");
      await runWidth(browser, base, width, tokenNames, scenes, problems);
      console.log("готово");
    }
  } finally {
    await browser.close();
    server.close();
  }

  const issues = new Issues();
  for (const s of scenes) analyzeScene(s, issues);
  analyzeRhythm(scenes, issues);
  analyzeComponents(scenes, issues);
  analyzeHardcoded(issues);
  const current = sortIssues([...issues.map.values()].map(serialize));

  let measurements = 0;
  for (const s of scenes) for (const r of s.data.els) measurements += Object.keys(r.sp).length + (r.type ? 2 : 0) + (r.tap ? 1 : 0) + (r.icon ? 1 : 0) + (r.control ? 1 : 0);
  const scenesMeta = scenes.map((s) => ({ id: s.id, page: s.page, width: s.width, shot: s.shot, imgW: s.imgW, imgH: s.imgH }));

  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (BASELINE) {
    current.forEach((it, i) => { it.num = i + 1; });
    fs.writeFileSync(BEFORE_FILE, JSON.stringify({ date: new Date().toISOString(), scenes: scenesMeta, issues: current, summary: summarize(current) }));
    console.log("Базовое состояние записано: " + current.length + " нарушений.");
    printSummary(current);
    return;
  }

  /* compare with the baseline */
  const before = fs.existsSync(BEFORE_FILE) ? JSON.parse(fs.readFileSync(BEFORE_FILE, "utf8")) : { issues: [], scenes: [] };
  const byKey = new Map(current.map((i) => [i.key, i]));
  const merged = [];
  let maxNum = before.issues.reduce((m, i) => Math.max(m, i.num), 0);
  for (const old of before.issues) {
    const now = byKey.get(old.key);
    if (now) { now.num = old.num; now.status = "decide"; now.proposal = proposalFor(now); merged.push(now); byKey.delete(old.key); }
    else {
      const info = PROPOSALS.find((x) => (x.fixed || x.resolved) && (x.key instanceof RegExp ? x.key.test(old.key) : x.key === old.key));
      merged.push({ ...old, status: info && info.resolved ? "resolved" : "fixed", fix: info ? info.fixed || info.resolved : "", was: true });
    }
  }
  for (const it of byKey.values()) { it.num = ++maxNum; it.status = "fresh"; it.proposal = proposalFor(it); merged.push(it); }
  merged.sort((a, b) => a.num - b.num);

  const meta = {
    date: new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeStyle: "short" }).format(new Date()),
    measurements, scenes: scenes.length, problems,
    before: { total: before.issues.length, byRule: summarize(before.issues).byRule },
    after: { total: current.length, byRule: summarize(current).byRule },
    fixed: merged.filter((i) => i.status === "fixed").length,
    resolved: merged.filter((i) => i.status === "resolved").length,
    decide: merged.filter((i) => i.status === "decide").length,
    fresh: merged.filter((i) => i.status === "fresh").length
  };
  const beforeShots = fs.existsSync(path.join(ROOT, "audit/shots/before")) ? new Set(fs.readdirSync(path.join(ROOT, "audit/shots/before"))) : new Set();
  const withBefore = scenesMeta.map((s) => {
    const old = before.scenes.find((b) => b.id === s.id && b.width === s.width);
    return { ...s, before: old && beforeShots.has(old.shot) ? { shot: old.shot, imgW: old.imgW, imgH: old.imgH } : null };
  });
  if (!CHECK) {
    writeMarkdown(meta, merged);
    writeReport(meta, merged, withBefore);
  }
  printSummary(current);
  console.log(`\nБыло ${meta.before.total}, исправлено автоматически ${meta.fixed}, по решению ${meta.resolved}, нужно решение ${meta.decide}, новых ${meta.fresh}.`);
  if (problems.length) console.log("Ошибки страниц:\n" + [...new Set(problems)].slice(0, 20).join("\n"));
  if (meta.fresh) {
    console.log("\nНОВЫЕ НАРУШЕНИЯ:");
    for (const it of merged.filter((i) => i.status === "fresh")) console.log(`  ${it.num}. [${it.rule}] ${it.title}: ${it.sig}, ${it.measured}, ожидается ${it.expected}`);
    process.exitCode = 1;
  }
}

function printSummary(list) {
  for (const [n, name] of Object.entries(RULES)) console.log(`  ${n}. ${name}: ${list.filter((i) => String(i.rule) === n).length}`);
}

main().catch((e) => { console.error(e); process.exit(2); });

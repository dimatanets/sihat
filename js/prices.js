/* A-65: price list, client-side categories and search. Prices are prototype data, not a clinic quotation. */
(function () {
  "use strict";
  var list = window.SIHAT_SERVICES || [];
  var categories = [{ id: "chek-ap", title: "Чек-ап программы" }, { id: "konsultacii", title: "Консультации врачей" }, { id: "analizy", title: "Анализы" }];
  var root = document.querySelector("[data-price-results]");
  var search = document.querySelector("[data-price-search]");
  var category = document.querySelector("[data-price-category]");
  if (!root) return;
  function esc(s) { return String(s).replace(/[&<>\"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function normalize(s) { return s.toLocaleLowerCase("ru").replace(/ё/g, "е").trim(); }
  function render() {
    var q = normalize(search.value);
    var terms = q.split(/\s+/).filter(Boolean);
    var found = 0;
    root.innerHTML = categories.filter(function (c) { return !category.value || category.value === c.id; }).map(function (c) {
      var rows = list.filter(function (s) { var text = normalize(s.title + " " + s.code + " " + s.text + " " + c.title); return s.direction === c.id && terms.every(function (term) { return text.indexOf(term) !== -1; }); });
      found += rows.length;
      if (!rows.length) return "";
      return '<details class="price-group" open><summary><h2>' + c.title + '</h2><span class="price-group__count">' + rows.length + '</span><span class="icon icon--chevron-down" aria-hidden="true"></span></summary><ul>' + rows.map(function (s) {
        return '<li class="price-item"><div><h3 class="price-item__title">' + esc(s.title) + '</h3><p class="price-item__code">Код услуги ' + esc(s.code) + '</p></div><p class="price-item__amount">' + s.price.toLocaleString("ru-RU") + ' ₽</p><a class="btn btn--primary btn--s" href="#">Записаться<span class="visually-hidden">: ' + esc(s.title) + '</span></a></li>';
      }).join("") + '</ul></details>';
    }).join("");
    document.querySelector("[data-price-count]").textContent = "Найдено услуг: " + found;
    document.querySelector("[data-price-empty]").hidden = found !== 0;
  }
  search.addEventListener("input", render);
  category.addEventListener("change", render);
  document.querySelector("[data-price-reset]").addEventListener("click", function () { search.value = ""; category.value = ""; render(); search.focus(); });
  var initial = new URLSearchParams(location.search).get("category");
  if (categories.some(function (c) { return c.id === initial; })) category.value = initial;
  render();
})();

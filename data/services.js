/*
  Mock services: the rows of the direction page and the price on the doctor cards.
  A-06, A-31: names and short descriptions of the check-ups are real (rkb-sihat.ru); the current
  site shows no prices, so every price except the gynaecologist visit (4 400 ₽, /price/) is a placeholder.
  Codes are from the nomenclature of medical services (приказ Минздрава № 804н), matched by name; they must be
  checked by the clinic (A-31).

  Fields:
    id         string   unique key
    title      string   name of the service
    text       string   short description (optional)
    code       string   code by the nomenclature of medical services
    price      number   rubles
    direction  string   id from data/directions.js
    spec       string   doctor visits: the doctor specialty (= spec in data/doctors.js)
*/
window.SIHAT_SERVICES = (function () {
  var list = [];
  function add(direction, rows) {
    rows.forEach(function (r) {
      list.push({
        id: r[0], title: r[1], code: r[2], price: r[3], text: r[4] || "", spec: r[5] || "",
        direction: direction
      });
    });
  }

  // ---- Чек-ап программы: real names and texts, placeholder codes and prices (A-06) ----
  add("chek-ap", [
    ["checkup-male", "Чек-ап программа «Мужское здоровье»", "B04.047.002", 32500, "Комплексная диагностика мужского организма"],
    ["checkup-female", "Чек-ап программа «Женское здоровье»", "B04.001.002", 34900, "Комплексная диагностика для оценки состояния репродуктивного, гормонального состояния организма женщины и профилактики заболеваний"]
  ]);

  // ---- Консультации врачей: one primary visit per specialty of the doctors in data/doctors.js ----
  add("konsultacii", [
    ["cons-akusher", "Приём врача-акушера-гинеколога первичный", "B01.001.001", 4400, "Осмотр, консультация, план обследования", "Акушер-гинеколог"],
    ["cons-khirurg", "Приём врача-хирурга первичный", "B01.057.001", 3500, "Осмотр, консультация, решение о необходимости операции", "Хирург"],
    ["cons-kardiolog", "Приём врача-кардиолога первичный", "B01.015.001", 3800, "Осмотр, консультация, расшифровка ЭКГ", "Кардиолог"],
    ["cons-allergolog", "Приём врача-аллерголога-иммунолога первичный", "B01.002.001", 3800, "Осмотр, консультация, план аллергообследования", "Аллерголог-иммунолог"],
    ["cons-travmatolog", "Приём врача-травматолога-ортопеда первичный", "B01.050.001", 3500, "Осмотр, консультация, план лечения", "Травматолог-ортопед"],
    ["cons-nevrolog", "Приём врача-невролога первичный", "B01.023.001", 3800, "Осмотр, неврологический статус, план лечения", "Невролог"],
    ["cons-genetik", "Приём врача-генетика первичный", "B01.006.001", 4200, "Консультация, оценка наследственных рисков", "Генетик"],
    ["cons-gematolog", "Приём врача-гематолога первичный", "B01.005.001", 3800, "Осмотр, консультация, разбор анализов крови", "Гематолог"]
  ]);

  return list;
})();

/*
  Mock services: the rows of the direction page, the booking flow and the payment flow (js/booking.js).
  A-06, A-31: names and short descriptions of the check-ups and the allergen tests are real (rkb-sihat.ru); the current
  site shows no prices, so every price except the gynaecologist visit (4 400 ₽, /price/) is a placeholder.
  Codes are from the nomenclature of medical services (приказ Минздрава № 804н); only B03.016.002 and A09.05.118
  were seen on the current site, the rest were matched by name and must be checked by the clinic (A-20).
  The texts of the lab tests (biomaterial and turnaround) are placeholders (A-06).

  Fields:
    id         string   unique key, used by [data-service] / [data-pay] buttons
    title      string   name of the service
    text       string   short description (optional)
    code       string   code by the nomenclature of medical services
    price      number   rubles, fixed (A-04)
    direction  string   id from data/directions.js
    group      string   group inside the direction (optional; the long list is grouped by it)
    booking    string   which flow «Записаться» opens (A-03, A-25):
                          "slots"   consultation: service → doctor → date and time → contacts → confirmation
                          "lab"     lab test: date and time of the visit (weekdays 8:00–12:00) → contacts → confirmation
                          "request" check-up, births, surgery: short request, a manager calls back
    spec       string   for "slots": the doctor specialty (= spec in data/doctors.js)
*/
window.SIHAT_SERVICES = (function () {
  var list = [];
  function add(direction, group, booking, rows) {
    rows.forEach(function (r) {
      list.push({
        id: r[0], title: r[1], code: r[2], price: r[3], text: r[4] || "", spec: r[5] || "",
        direction: direction, group: group, booking: booking
      });
    });
  }

  // ---- Чек-ап программы: real names and texts, placeholder codes and prices (A-06) ----
  add("chek-ap", "", "request", [
    ["checkup-male", "Чек-ап программа «Мужское здоровье»", "B04.047.002", 32500, "Комплексная диагностика мужского организма"],
    ["checkup-female", "Чек-ап программа «Женское здоровье»", "B04.001.002", 34900, "Комплексная диагностика для оценки состояния репродуктивного, гормонального состояния организма женщины и профилактики заболеваний"]
  ]);

  // ---- Консультации врачей: one primary visit per specialty of the doctors in data/doctors.js ----
  add("konsultacii", "", "slots", [
    ["cons-akusher", "Приём врача-акушера-гинеколога первичный", "B01.001.001", 4400, "Осмотр, консультация, план обследования", "Акушер-гинеколог"],
    ["cons-khirurg", "Приём врача-хирурга первичный", "B01.057.001", 3500, "Осмотр, консультация, решение о необходимости операции", "Хирург"],
    ["cons-kardiolog", "Приём врача-кардиолога первичный", "B01.015.001", 3800, "Осмотр, консультация, расшифровка ЭКГ", "Кардиолог"],
    ["cons-allergolog", "Приём врача-аллерголога-иммунолога первичный", "B01.002.001", 3800, "Осмотр, консультация, план аллергообследования", "Аллерголог-иммунолог"],
    ["cons-travmatolog", "Приём врача-травматолога-ортопеда первичный", "B01.050.001", 3500, "Осмотр, консультация, план лечения", "Травматолог-ортопед"],
    ["cons-nevrolog", "Приём врача-невролога первичный", "B01.023.001", 3800, "Осмотр, неврологический статус, план лечения", "Невролог"],
    ["cons-genetik", "Приём врача-генетика первичный", "B01.006.001", 4200, "Консультация, оценка наследственных рисков", "Генетик"],
    ["cons-gematolog", "Приём врача-гематолога первичный", "B01.005.001", 3800, "Осмотр, консультация, разбор анализов крови", "Гематолог"]
  ]);

  // ---- Анализы: 43 tests in 7 groups (A-02). Text = biomaterial and turnaround, placeholder (A-06) ----
  var BLOOD = "Кровь из вены · результат через 1 рабочий день";
  var BLOOD2 = "Кровь из вены · результат через 2–3 рабочих дня";
  var BLOOD5 = "Кровь из вены · результат через 5–7 рабочих дней";
  add("analizy", "Общеклинические", "lab", [
    ["lab-oak", "Общий анализ крови развернутый", "B03.016.002", 450, "Общий (клинический) анализ крови, с лейкоцитарной формулой · результат через 1 рабочий день"],
    ["lab-oam", "Общий анализ мочи", "B03.016.006", 350, "Утренняя порция мочи · результат через 1 рабочий день"],
    ["lab-soe", "Скорость оседания эритроцитов (СОЭ)", "A12.05.001", 200, BLOOD],
    ["lab-retik", "Ретикулоциты", "A08.05.008", 250, BLOOD],
    ["lab-nechiporenko", "Анализ мочи по Нечипоренко", "B03.016.014", 350, "Средняя порция утренней мочи · результат через 1 рабочий день"],
    ["lab-koprogramma", "Копрограмма", "B03.016.010", 500, "Кал · результат через 2 рабочих дня"]
  ]);
  add("analizy", "Биохимические", "lab", [
    ["lab-glukoza", "Глюкоза в крови", "A09.05.023", 250, "Кровь из вены, натощак · результат через 1 рабочий день"],
    ["lab-hba1c", "Гликированный гемоглобин (HbA1c)", "A09.05.083", 650, BLOOD],
    ["lab-kreatinin", "Креатинин", "A09.05.020", 250, BLOOD],
    ["lab-mochevina", "Мочевина", "A09.05.017", 250, BLOOD],
    ["lab-bilirubin", "Билирубин общий", "A09.05.021", 250, BLOOD],
    ["lab-alt", "Аланинаминотрансфераза (АЛТ)", "A09.05.042", 250, BLOOD],
    ["lab-ast", "Аспартатаминотрансфераза (АСТ)", "A09.05.041", 250, BLOOD],
    ["lab-kholesterin", "Холестерин общий", "A09.05.026", 250, "Кровь из вены, натощак · результат через 1 рабочий день"],
    ["lab-lipidy", "Липидный профиль", "B03.016.005", 1100, "Холестерин, ЛПВП, ЛПНП, триглицериды, индекс атерогенности · натощак"],
    ["lab-ferritin", "Ферритин", "A09.05.076", 650, BLOOD],
    ["lab-srb", "С-реактивный белок", "A09.05.009", 450, BLOOD]
  ]);
  add("analizy", "Гемостаз", "lab", [
    ["lab-fibrinogen", "Фибриноген", "A09.05.050", 300, BLOOD],
    ["lab-achtv", "Активированное частичное тромбопластиновое время (АЧТВ)", "A12.05.039", 300, BLOOD],
    ["lab-mno", "Протромбиновое время и МНО", "A12.05.027", 350, BLOOD]
  ]);
  add("analizy", "Гормоны", "lab", [
    ["lab-ttg", "Тиреотропный гормон (ТТГ)", "A09.05.065", 500, BLOOD],
    ["lab-t4", "Тироксин свободный (Т4 св.)", "A09.05.063", 500, BLOOD],
    ["lab-t3", "Трийодтиронин свободный (Т3 св.)", "A09.05.060", 500, BLOOD],
    ["lab-atpo", "Антитела к тиреопероксидазе (анти-ТПО)", "A12.06.045", 650, BLOOD2],
    ["lab-prolaktin", "Пролактин", "A09.05.087", 550, BLOOD],
    ["lab-testosteron", "Тестостерон общий", "A09.05.078", 600, BLOOD],
    ["lab-insulin", "Инсулин", "A09.05.056", 650, "Кровь из вены, натощак · результат через 1 рабочий день"],
    ["lab-kortizol", "Кортизол", "A09.05.135", 600, "Кровь из вены, утром до 10:00 · результат через 1 рабочий день"]
  ]);
  add("analizy", "Инфекции", "lab", [
    ["lab-hbsag", "Гепатит B: антиген HBsAg", "A26.06.036", 450, BLOOD],
    ["lab-hcv", "Гепатит C: антитела (анти-HCV)", "A26.06.041", 500, BLOOD],
    ["lab-vich", "ВИЧ: антитела и антиген p24", "A26.06.049", 450, BLOOD],
    ["lab-sifilis", "Сифилис: антитела к Treponema pallidum", "A26.06.082", 450, BLOOD]
  ]);
  // Real names and code from the current site (/napravleniya/laboratornye-issledovaniya/).
  add("analizy", "Аллергены", "lab", [
    ["lab-ige", "Ig E общий", "A09.05.054", 600, "Исследование уровня общего иммуноглобулина E в крови · " + "результат через 2–3 рабочих дня"],
    ["lab-ige-lateks", "Ig E специфический к латексу (каучуку)", "A09.05.118", 900, BLOOD5],
    ["lab-ige-penicillin", "Ig E специфический к пенициллину", "A09.05.118", 900, BLOOD5],
    ["lab-ige-ampicillin", "Ig E специфический к ампициллину", "A09.05.118", 900, BLOOD5],
    ["lab-ige-lidokain", "Ig E специфический к лидокаину, асилокаину", "A09.05.118", 900, BLOOD5],
    ["lab-ige-derevya", "Ig E специфический к пыльце деревьев", "A09.05.118", 900, BLOOD5],
    ["lab-ige-travy", "Ig E специфический к луговым травам", "A09.05.118", 900, BLOOD5],
    ["lab-ige-pchela", "Ig E специфический к яду пчелы медоносной", "A09.05.118", 900, BLOOD5]
  ]);
  add("analizy", "Бактериологические", "lab", [
    ["lab-posev-mocha", "Посев мочи с определением чувствительности к антибиотикам", "A26.28.003", 1200, "Средняя порция утренней мочи в стерильном контейнере · результат через 5 рабочих дней"],
    ["lab-posev-zev", "Посев из зева и носа на золотистый стафилококк", "A26.08.005", 1100, "Мазок · результат через 5 рабочих дней"],
    ["lab-posev-kal", "Посев кала на кишечную группу", "A26.19.001", 1300, "Кал · результат через 5 рабочих дней"]
  ]);

  return list;
})();

/* A-60…A-68: client revision, 18 November. Review statistics and quotes are prototype data. */
window.SIHAT_HOME = {
  ratings: {},
  reviews: [
    { doctor: "sagdiev-azat-ildusovich", name: "Анна", date: "12 ноября 2026", score: 5, text: "На консультации всё подробно объяснили: какие обследования нужны и как будет проходить лечение. После приёма стало спокойнее — появился понятный план действий." },
    { doctor: "kunst-mikhail-aleksandrovich", name: "Михаил", date: "9 ноября 2026", score: 5, text: "Врач внимательно изучил результаты анализов, ответил на вопросы и объяснил дальнейшие шаги простым языком. Спасибо за внимательное отношение." },
    { doctor: "luntsov-aleksey-vladimirovich", name: "Елена", date: "5 ноября 2026", score: 5, text: "Пришла с вопросами по обследованию. Получила подробные рекомендации и ответы на всё, что меня беспокоило. Очень спокойный и внимательный приём." }
  ],
  patients: [
    { title: "Налоговый вычет", text: "Как вернуть часть расходов на лечение", icon: "file-type-doc", detail: "tax", body: "Для оформления вычета понадобится справка об оплате медицинских услуг. Уточните у администратора, как заказать справку и какие данные подготовить." },
    { title: "Будущим родителям", text: "Беременность, подготовка и рождение малыша", icon: "baby-carriage", detail: "parents", body: "Администратор расскажет о наблюдении беременности, программах родов и выборе врача в Перинатальном центре РКБ." },
    { title: "Льготы", text: "Условия и документы для получения льгот", icon: "certificate", detail: "benefits", body: "Условия предоставления льгот и список подтверждающих документов уточняйте в платном отделении перед записью." },
    { title: "О клинике", text: "Медицинская помощь на базе РКБ Татарстана", icon: "first-aid-kit", detail: "clinic", body: "«Сихат» — платное отделение Республиканской клинической больницы Татарстана. Консультации, диагностика, хирургическая помощь и роды на базе многопрофильной больницы." }
  ],
  documents: [
    { title: "Лицензия на медицинскую деятельность", type: "pdf", href: "" },
    { title: "Устав учреждения", type: "pdf", href: "" },
    { title: "Выписка из реестра лицензий", type: "pdf", href: "" },
    { title: "Сертификаты клиники", type: "pdf", href: "" },
    { title: "Согласие на обработку персональных данных", type: "pdf", href: "https://rkb-sihat.ru/upload/documents/Soglasie_na_obrabotku_PDn_Sihat_RKB.pdf" },
    { title: "Условия работы сайта", type: "pdf", href: "https://rkb-sihat.ru/upload/documents/Site_Terms.pdf" }
  ]
};
// A-61: mock statistics for every doctor, shared by the home and direction pages.
(window.SIHAT_DOCTORS || []).forEach(function (doctor, i) {
  window.SIHAT_HOME.ratings[doctor.id] = { score: i % 3 === 0 ? "5,0" : "4,9", count: [38, 24, 56, 31, 42, 19, 47, 28, 17, 35, 22][i] || 20 };
});

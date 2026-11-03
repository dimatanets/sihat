/*
  Content of the direction page (direction.html). Stage 1 has one direction, «Чек-ап программы» (A-02, A-27).
  Rendered by js/direction.js; services come from data/services.js (direction id), doctors from data/doctors.js.
  In Bitrix every key below is a field (or a linked element list) of the direction info block.

  A-06: texts of «Чек-ап программы» (lead, about, includes, features, steps) are real, from rkb-sihat.ru. Marked "placeholder" below: written for the prototype, to be replaced by the clinic.

  Fields:
    direction   id from data/directions.js (services and doctors are filtered by it)
    title, lead, icon
    image       image of the page head; decorative, the title is next to it (A-07)
    facts       short badges in the page head
    about       paragraphs of the description
    includesTitle / includes   bullet list next to the description (optional)
    features    three cards { title, text }
    stepsLead / steps   { title, text }
    servicesLead, priceList { label, meta, href }
    doctorsLead
    documents   { title, meta, type: pdf|doc|xls, href }
    bring       { text, note }
*/
window.SIHAT_DIRECTION_PAGES = {
  checkup: {
    direction: "chek-ap",
    title: "Чек-ап программы",
    lead: "Check-up — это программа ранней диагностики заболеваний, включающая в себя полный набор анализов и исследований, консультации специалистов, который позволит в короткий срок ответить на вопрос: всё ли в порядке с вашим здоровьем.",
    icon: "clipboard-heart",
    image: "assets/img/directions/card-chek-ap.jpg",
    facts: ["Обследование в стационаре РКБ", "Персональный администратор"],
    about: [
      "Комплексное обследование проходит в условиях стационара РКБ. По результатам прохождения программы вы получите полную информацию о состоянии вашего здоровья с подробным описанием всех выявленных проблем и рекомендациями по дальнейшему лечению и профилактике заболеваний.",
      "Для вашего удобства мы разработали пакеты комплексных услуг в базовом и расширенном наполнении."
    ],
    includesTitle: "Программа включает в себя",
    includes: ["Курацию врачом-терапевтом", "Консультации узких специалистов", "Инструментальную диагностику", "Лабораторные анализы"],
    features: [
      { title: "Врачи экспертного уровня", text: "Многие специалисты занимаются научной работой, являются кандидатами и докторами медицинских наук и ежегодно публикуют результаты работы в рецензируемых научных изданиях." },
      { title: "Индивидуальный подход", text: "Это не просто список анализов и исследований, а обследование каждого пациента с учётом наследственной предрасположенности, перенесённых заболеваний и опасений." },
      { title: "Персональное сопровождение", text: "На каждом этапе обследования по программе вас сопровождает персональный администратор." }
    ],
    stepsLead: "Оставьте заявку на чек-ап, администратор свяжется с вами, подберёт удобную дату для обследования и подтвердит запись.",
    steps: [
      { title: "Заявка", text: "Оставьте заявку на сайте или позвоните по телефону платного отделения." },
      { title: "Звонок администратора", text: "Администратор уточнит детали, поможет выбрать программу, подберёт удобную дату и подтвердит запись." },
      { title: "Обследование", text: "Комплексное обследование в стационаре РКБ с персональным администратором." },
      { title: "Результаты", text: "Заключение с описанием выявленных проблем и рекомендациями по лечению и профилактике." }
    ],
    // A-39 (R-10): the note about prices comes from the price page of the current site
    servicesLead: "Состав программы и подготовку администратор расскажет по телефону. Цены справочные, точную стоимость подтвердит администратор.",
    priceList: { label: "Полный прайс платных медицинских услуг", meta: "XLS, от 01.11.2026", href: "#" },
    doctorsLead: "Врачи, которые ведут программы чек-апа: терапевт-куратор и узкие специалисты.",
    // placeholder (A-06): no documents on the current direction page except the legal ones
    documents: [
      { title: "Памятка: как подготовиться к чек-апу", meta: "PDF, 245 КБ", type: "pdf", href: "#" },
      { title: "Договор-оферта на оказание платных медицинских услуг", meta: "DOC, 1,2 МБ", type: "doc", href: "#" },
      { title: "Согласие на обработку персональных данных", meta: "PDF, 120 КБ", type: "pdf", href: "#" },
      { title: "Прейскурант платных медицинских услуг от 01.11.2026", meta: "XLS, 380 КБ", type: "xls", href: "#" }
    ],
    // placeholder (A-06): «что взять с собой» is not on the current site
    bring: [
      { text: "Паспорт" },
      { text: "Результаты прошлых обследований", note: "Выписки, анализы, снимки за последний год, если есть" },
      { text: "Список лекарств, которые принимаете" },
      { text: "Удобную одежду, сменную обувь и средства гигиены", note: "Обследование проходит в стационаре" },
      { text: "Прийти натощак", note: "Не есть 8–12 часов, можно пить воду" }
    ]
  }
};

/*
  Mock site data shared by the header, mobile menu and footer (js/layout.js).
  Plain JS instead of JSON so pages make no network requests (A-11).
  Sources: docs/research.md (current rkb-sihat.ru).
  A-13: pages that are not in the prototype yet and messengers without a known address link to "#". VK and RuTube are the real accounts from the current site.
  A-14: tax and licence numbers were not found; zeros are placeholders until the client sends them.
*/
window.SIHAT_DATA = {
  brand: {
    name: "Сихат",
    sub: "Платное отделение РКБ",
    about: "Платные медицинские услуги Республиканской клинической больницы: консультации врачей, чек-апы, диагностика, хирургия и роды."
  },

  // Main phone first: it is the one shown in the header.
  phones: [
    { label: "Платные услуги", number: "+7 (843) 231-20-90", href: "tel:+78432312090" },
    { label: "Платные услуги, мобильный", number: "+7 (927) 045-79-74", href: "tel:+79270457974" }
  ],
  // A-10: the current site says «с 08:00 до 17.00» without days; to be confirmed (question 22).
  hours: "пн–пт 8:00–18:00, сб 8:00–16:00",
  hoursShort: "пн–пт 8–18, сб 8–16",

  address: {
    city: "Казань",
    street: "Оренбургский тракт, 138",
    full: "420064, г. Казань, Оренбургский тракт, 138",
    buildings: [
      { name: "Амбулаторный консультативный приём", place: "корпус В, 1 этаж" },
      { name: "Перинатальный центр", place: "корпус Д, терминал 6" },
      { name: "Стационар", place: "корпус А, 2 этаж" }
    ]
  },

  messengers: [
    { name: "MAX", logo: "max.png", href: "#" },
    { name: "Telegram", logo: "telegram.svg", href: "#" },
    { name: "WhatsApp", logo: "whatsapp.svg", href: "#" }
  ],
  socials: [
    { name: "ВКонтакте", logo: "vk.svg", href: "https://vk.com/public211630542" },
    { name: "RuTube", logo: "rutube.svg", href: "https://rutube.ru/channel/40995908/" }
  ],

  languages: [
    { code: "ru", label: "RU", name: "Русский", current: true },
    { code: "en", label: "EN", name: "English" },
    { code: "tt", label: "TAT", name: "Татарча" }
  ],

  // A-05: header shows Услуги, Врачи, Пациентам, Контакты. "page" matches <body data-page>.
  nav: {
    header: [
      { label: "Услуги", href: "#", page: "services" },
      { label: "Врачи", href: "#", page: "doctors" },
      { label: "Пациентам", href: "#", page: "patients" },
      { label: "Контакты", href: "#", page: "contacts" }
    ],
    // Mobile menu and footer list every section from SPEC.md.
    groups: [
      {
        title: "Услуги",
        links: [
          { label: "Направления", href: "#", page: "services" },
          { label: "Чек-ап программы", href: "direction.html", page: "direction" },
          { label: "Анализы", href: "#" }, // A-41: the item stays, the page is not in stage 1
          { label: "Цены", href: "#", page: "prices" },
          { label: "Врачи", href: "#", page: "doctors" }
        ]
      },
      {
        title: "О клинике",
        links: [
          { label: "Пациентам", href: "#", page: "patients" },
          { label: "О нас", href: "#", page: "about" },
          { label: "Новости", href: "#", page: "news" },
          { label: "Документы", href: "#", page: "documents" },
          { label: "Контакты", href: "#", page: "contacts" }
        ]
      }
    ]
  },

  legal: {
    org: "Государственное автономное учреждение здравоохранения «Республиканская клиническая больница Министерства здравоохранения Республики Татарстан» (ГАУЗ «РКБ МЗ РТ»)",
    short: "ГАУЗ «РКБ МЗ РТ»",
    requisites: [
      "Юридический адрес: 420064, г. Казань, Оренбургский тракт, 138",
      "ИНН 0000000000, КПП 000000000, ОГРН 0000000000000"
    ],
    licence: { label: "Лицензия № Л041-00000-16/00000000", href: "#" },
    docs: [
      { label: "Политика обработки персональных данных", href: "#" },
      { label: "Согласие на обработку персональных данных", href: "#" },
      { label: "Договор-оферта на платные медицинские услуги", href: "#" },
      { label: "Пользовательское соглашение", href: "#" }
    ],
    priceNote: "Цены на сайте справочные и не являются публичной офертой.",
    // A-18: warning required for medical services advertising in Russia.
    warning: "Имеются противопоказания, необходима консультация специалиста"
  },

  // Round 1: logos, sources in docs/research.md.
  payments: [
    { name: "Мир", logo: "mir" },
    { name: "СБП", logo: "sbp" },
    { name: "Visa", logo: "visa" },
    { name: "Mastercard", logo: "mastercard" }
  ],

  // Full list from the booking form of the current site (docs/research.md).
  directions: [
    "Абдоминальная хирургия", "Анализы", "Аритмология", "Бариатрическая хирургия", "Гастроэнтерология",
    "Гематология", "Генетика", "Гинекология", "Гнойная хирургия", "Дерматовенерология", "Диагностика",
    "Инфекционные заболевания", "Кардиология", "Колопроктология", "Консультации врачей",
    "Лечение хронической боли", "Неврология", "Нейрохирургия", "Нефрология", "Обучение", "Отоларингология",
    "Пластическая хирургия", "Пульмонология", "Ревматология", "Роды", "Сердечно-сосудистая хирургия",
    "Сурдология", "Терапия", "Торакальная хирургия", "Травматология и ортопедия", "Ультразвуковая диагностика",
    "Урология", "Физиотерапия", "Хирургия", "Хирургия кисти", "Центр аллергологии", "Чек-ап программы",
    "Челюстно-лицевая хирургия", "Эндокринология", "Эндоскопия"
  ]
};

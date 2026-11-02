/*
  Mock directions (the cards of https://rkb-sihat.ru/napravleniya/). Titles and texts are real, copied from
  the current site; slugs are the current URLs.
  Rendered by js/render.js into [data-render="directions"].

  Fields:
    id        string   unique key, also used in data/doctors.js → directions
    title     string   card title
    text      string   short description (current site)
    slug      string   path segment on the current site (/napravleniya/<slug>/)
    href      string   link in the prototype; "#" for pages that are not built yet (A-13). The two built directions
                     open the one template direction.html with ?d=checkup / ?d=analyses (A-02)
    icon      string   Tabler icon name for the photo placeholder (A-07)
    image     string|null  image path, a local copy of the illustration on the current site (A-07); null = placeholder
    priority  number|null  position on the home page; null = not on the home page (answer 6, A-21)
*/
window.SIHAT_DIRECTIONS = [
  {
    id: "rody",
    title: "Роды",
    text: "Комфортные роды с возможностью выбора врача",
    slug: "vedenie-beremennosti-i-rody",
    href: "#",
    icon: "baby-carriage",
    image: "assets/img/directions/rody.jpg",
    priority: 2
  },
  {
    id: "chek-ap",
    title: "Чек-ап программы",
    text: "Комплексная проверка здоровья за несколько дней: консультации специалистов, диагностика и лабораторные исследования.",
    slug: "chek-ap-programmy",
    href: "direction.html?d=checkup",
    icon: "clipboard-heart",
    image: "assets/img/directions/chek-ap.jpg",
    priority: 1
  },
  {
    id: "khirurgiya",
    title: "Хирургия",
    text: "Плановые и сложные операции различного профиля с применением малоинвазивных технологий",
    slug: "obshchaya-khirurgiya",
    href: "#",
    icon: "first-aid-kit",
    image: "assets/img/directions/khirurgiya.jpg",
    priority: 3
  },
  {
    id: "konsultacii",
    title: "Консультации врачей",
    text: "Специалисты экспертного уровня и узкого профиля",
    slug: "konsultativnyy-priem",
    href: "#",
    icon: "stethoscope",
    image: null,
    priority: null
  },
  {
    id: "diagnostika",
    title: "Диагностика",
    text: "МРТ, КТ, УЗИ, ЭКГ, тредмил-тест, эндоскопия и другие высокоточные исследования",
    slug: "diagnostika",
    href: "#",
    icon: "heart-rate-monitor",
    image: null,
    priority: null
  },
  {
    id: "analizy",
    title: "Анализы",
    text: "Общеклинические, биохимические, гормональные, бактериологические, аллергены и другие виды анализов",
    slug: "laboratornye-issledovaniya",
    href: "direction.html?d=analyses",
    icon: "test-pipe",
    image: "assets/img/directions/analizy.jpg",
    priority: null
  },
  {
    id: "bariatriya",
    title: "Бариатрическая хирургия",
    text: "Хирургия лишнего веса: резекция желудка с применением современных малоинвазивных методик",
    slug: "bariatricheskaya-khirurgiya",
    href: "#",
    icon: "first-aid-kit",
    image: null,
    priority: null
  },
  {
    id: "endoskopiya",
    title: "Эндоскопия",
    text: "Гастроскопия, колоноскопия и другие высокоточные исследования с возможностью комфортного проведения под седацией",
    slug: "endoskopiya",
    href: "#",
    icon: "heart-rate-monitor",
    image: null,
    priority: null
  },
  {
    id: "bol",
    title: "Лечение хронической боли",
    text: "Высокотехнологичное лечение хронической боли любой локализации",
    slug: "lechenie-khronicheskoy-boli",
    href: "#",
    icon: "stethoscope",
    image: null,
    priority: null
  },
  {
    id: "abdominalnaya",
    title: "Абдоминальная хирургия",
    text: "Хирургическое лечение заболеваний органов брюшной полости, включая сложные и малоинвазивные операции",
    slug: "abdominalnaya-khirurgiya",
    href: "#",
    icon: "first-aid-kit",
    image: null,
    priority: null
  },
  {
    id: "allergologiya",
    title: "Центр аллергологии",
    text: "Диагностика и лечение аллергических заболеваний, выявление аллергенов и подбор индивидуальной терапии",
    slug: "tsentr-allergologii",
    href: "#",
    icon: "stethoscope",
    image: null,
    priority: null
  },
  {
    id: "aritmologiya",
    title: "Аритмология",
    text: "Диагностика и лечение нарушений ритма сердца для вашего комфорта и долголетия",
    slug: "aritmologiya",
    href: "#",
    icon: "heart-rate-monitor",
    image: null,
    priority: null
  }
];

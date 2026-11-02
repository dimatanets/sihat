/*
  Mock directions: the three priority ones of the home page (answer 6) and the one the doctor visits belong to.
  Titles and texts are real, copied from https://rkb-sihat.ru/napravleniya/; slugs are the current URLs.
  The other directions of the current site are listed in docs/research.md.
  Rendered by js/render.js into [data-render="directions"].

  Fields:
    id        string   unique key, also used in data/doctors.js → directions
    title     string   card title
    text      string   short description (current site)
    slug      string   path segment on the current site (/napravleniya/<slug>/)
    href      string   link in the prototype; "#" for pages that are not built yet (A-13). Only «Чек-ап программы» is built (A-02)
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
    href: "direction.html",
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
  }
];

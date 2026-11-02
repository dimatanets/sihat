/*
  Mock directions: the three priority ones of the home page (answer 6) and the one the doctor visits belong to.
  Titles are real, from https://rkb-sihat.ru/napravleniya/; slugs are the current URLs. Texts of the three cards are shortened to the same length (A-46).
  The other directions of the current site are listed in docs/research.md.
  Rendered by js/render.js into [data-render="directions"].

  Fields:
    id        string   unique key, also used in data/doctors.js → directions
    title     string   card title
    text      string   short description (current site)
    slug      string   path segment on the current site (/napravleniya/<slug>/)
    href      string   link in the prototype; "#" for pages that are not built yet (A-13). Only «Чек-ап программы» is built (A-02)
    icon      string   Tabler icon name for the photo placeholder (A-07)
    image     string|null  card photo from pexels.com, pages are listed in docs/research.md (A-46); null = placeholder
    priority  number|null  position on the home page; null = not on the home page (answer 6, A-21)
*/
window.SIHAT_DIRECTIONS = [
  {
    id: "rody",
    title: "Роды",
    text: "Комфортные роды в Перинатальном центре РКБ с возможностью выбора врача",
    slug: "vedenie-beremennosti-i-rody",
    href: "#",
    icon: "baby-carriage",
    image: "assets/img/directions/card-rody.jpg",
    priority: 2
  },
  {
    id: "chek-ap",
    title: "Чек-ап программы",
    text: "Комплексная проверка здоровья за несколько дней: врачи, диагностика и анализы",
    slug: "chek-ap-programmy",
    href: "direction.html",
    icon: "clipboard-heart",
    image: "assets/img/directions/card-chek-ap.jpg",
    priority: 1
  },
  {
    id: "khirurgiya",
    title: "Хирургия",
    text: "Плановые и сложные операции разного профиля, малоинвазивные технологии",
    slug: "obshchaya-khirurgiya",
    href: "#",
    icon: "first-aid-kit",
    image: "assets/img/directions/card-khirurgiya.jpg",
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

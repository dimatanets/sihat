/*
  Mock doctors. Names, positions and regalia are real, copied from https://rkb-sihat.ru/doctor/ (A-06).
  The current site gives no work experience, so the card shows none. Photos are placeholders (A-07).
  Rendered by js/render.js into [data-render="doctors"].

  Fields:
    id          string   unique key (= slug on the current site, /doctor/<id>/)
    name        string   full name
    spec        string   specialty, the short blue label on the card
    role        string   position (head of department etc.), shortened from the current site
    position    string   full position and qualification text as on the current site
    regalia     string[] badges on the card: category, degree, honorary title
    directions  string[] ids from data/directions.js
    href        string   doctor page; "#" until it is built (A-13)
    photo       string|null  photo path; null until photos arrive (A-07)
    home        number|null  position on the home page; null = not on the home page (A-22)
*/
window.SIHAT_DOCTORS = [
  {
    id: "nigmatulina-nigina-amonovna",
    name: "Нигматулина Нигина Амоновна",
    spec: "Акушер-гинеколог",
    role: "Руководитель Перинатального центра РКБ",
    position: "Руководитель Перинатального центра РКБ, заместитель главного врача по акушерско-гинекологической помощи, врач-акушер-гинеколог, кандидат медицинских наук",
    regalia: ["к.м.н."],
    directions: ["rody", "konsultacii"],
    href: "#",
    photo: null,
    home: 1
  },
  {
    id: "sagdiev-azat-ildusovich",
    name: "Сагьдиев Азат Ильдусович",
    spec: "Хирург",
    role: "Заведующий хирургическим отделением № 1",
    position: "Заведующий хирургическим отделением № 1. Врач-хирург",
    regalia: [],
    directions: ["khirurgiya", "abdominalnaya", "konsultacii"],
    href: "#",
    photo: null,
    home: 2
  },
  {
    id: "gilmanov-albert-anasovich",
    name: "Гильманов Альберт Анасович",
    spec: "Кардиолог",
    role: "Заведующий кардиологическим отделением",
    position: "Заведующий кардиологическим отделением, Заслуженный врач РТ, врач-кардиолог высшей категории",
    regalia: ["Высшая категория", "Заслуженный врач РТ"],
    directions: ["konsultacii", "chek-ap"],
    href: "#",
    photo: null,
    home: 3
  },
  {
    id: "luntsov-aleksey-vladimirovich",
    name: "Лунцов Алексей Владимирович",
    spec: "Аллерголог-иммунолог",
    role: "Руководитель Центра клинической иммунологии",
    position: "Руководитель Центра клинической иммунологии, врач аллерголог-иммунолог высшей категории, кандидат медицинских наук, член Российской Ассоциации аллергологов и клинических иммунологов, член Европейской академии аллергологии и клинической иммунологии",
    regalia: ["Высшая категория", "к.м.н."],
    directions: ["allergologiya", "konsultacii"],
    href: "#",
    photo: null,
    home: 4
  },
  {
    id: "garifullov-gamil-gakilevich",
    name: "Гарифуллов Гамиль Гакилевич",
    spec: "Травматолог-ортопед",
    role: "Заведующий отделением травматологии № 1",
    position: "Заведующий отделением травматологии № 1, врач-травматолог-ортопед высшей категории, кандидат медицинских наук",
    regalia: ["Высшая категория", "к.м.н."],
    directions: ["khirurgiya", "konsultacii"],
    href: "#",
    photo: null,
    home: 5
  },
  {
    id: "khayrullov-marat-abdulkhaevich",
    name: "Хайруллов Марат Абдулхаевич",
    spec: "Невролог",
    role: "Заведующий отделением неврологии № 1",
    position: "Заведующий отделением неврологии № 1, врач-невролог высшей категории, Заслуженный врач РТ",
    regalia: ["Высшая категория", "Заслуженный врач РТ"],
    directions: ["konsultacii"],
    href: "#",
    photo: null,
    home: 6
  },
  {
    id: "bochkareva-nataliya-mikhaylovna",
    name: "Бочкарева Наталия Михайловна",
    spec: "Акушер-гинеколог",
    role: "Заведующая акушерским отделением Перинатального центра",
    position: "Заведующая акушерским отделением, врач-акушер-гинеколог высшей категории Перинатального центра",
    regalia: ["Высшая категория"],
    directions: ["rody", "konsultacii"],
    href: "#",
    photo: null,
    home: 7
  },
  {
    id: "vafina-zulfiya-ilsurovna",
    name: "Вафина Зульфия Ильсуровна",
    spec: "Генетик",
    role: "Заведующая медико-генетической консультацией",
    position: "Заведующая медико-генетической консультацией, врач-генетик высшей категории, Заслуженный врач РТ",
    regalia: ["Высшая категория", "Заслуженный врач РТ"],
    directions: ["konsultacii"],
    href: "#",
    photo: null,
    home: 8
  },
  {
    id: "kunst-mikhail-aleksandrovich",
    name: "Кунст Михаил Александрович",
    spec: "Гематолог",
    role: "Заведующий отделением гематологии",
    position: "Заведующий отделением гематологии, врач-гематолог",
    regalia: [],
    directions: ["konsultacii"],
    href: "#",
    photo: null,
    home: null
  },
  {
    id: "davletshina-rezeda-ilsurovna",
    name: "Давлетшина Резеда Ильсуровна",
    spec: "Невролог",
    role: "Врач-невролог",
    position: "Врач-невролог высшей категории, кандидат медицинских наук",
    regalia: ["Высшая категория", "к.м.н."],
    directions: ["konsultacii"],
    href: "#",
    photo: null,
    home: null
  }
];

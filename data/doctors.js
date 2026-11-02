/*
  Mock doctors. Names, positions, regalia and photos are real, from https://rkb-sihat.ru/doctor/ (A-06, A-07).
  The current site gives no work experience, so the card shows none. Photos are local copies in assets/img/doctors.
  Answer 7: the home page shows the first doctors of that catalogue, in its order (A-22).
  Rendered by js/render.js into [data-render="doctors"].

  Fields:
    id          string   unique key (= slug on the current site, /doctor/<id>/)
    name        string   full name
    spec        string   specialty, the short label on the card; links the doctor to his visit in data/services.js
    role        string   position (head of department etc.), shortened from the current site
    position    string   full position and qualification text as on the current site
    regalia     string[] badges on the card: category, degree, honorary title
    directions  string[] ids from data/directions.js (A-26: who is shown on a direction page)
    href        string   doctor page; "#" until it is built (A-13)
    photo       string|null  photo path
    home        number|null  position on the home page; null = not on the home page (A-22)
*/
window.SIHAT_DOCTORS = [
  {
    id: "sagdiev-azat-ildusovich",
    name: "Сагьдиев Азат Ильдусович",
    spec: "Хирург",
    role: "Заведующий хирургическим отделением № 1",
    position: "Заведующий хирургическим отделением № 1. Врач-хирург",
    regalia: [],
    directions: ["khirurgiya", "konsultacii"],
    href: "#",
    photo: "assets/img/doctors/sagdiev-azat-ildusovich.jpg",
    home: 1
  },
  {
    id: "kunst-mikhail-aleksandrovich",
    name: "Кунст Михаил Александрович",
    spec: "Гематолог",
    role: "Заведующий отделением гематологии",
    position: "Заведующий отделением гематологии, врач-гематолог",
    regalia: [],
    directions: ["konsultacii", "chek-ap"],
    href: "#",
    photo: "assets/img/doctors/kunst-mikhail-aleksandrovich.jpg",
    home: 2
  },
  {
    id: "luntsov-aleksey-vladimirovich",
    name: "Лунцов Алексей Владимирович",
    spec: "Аллерголог-иммунолог",
    role: "Руководитель Центра клинической иммунологии",
    position: "Руководитель Центра клинической иммунологии, врач аллерголог-иммунолог высшей категории, кандидат медицинских наук, член Российской Ассоциации аллергологов и клинических иммунологов, член Европейской академии аллергологии и клинической иммунологии",
    regalia: ["Высшая категория", "к.м.н."],
    directions: ["konsultacii"],
    href: "#",
    photo: "assets/img/doctors/luntsov-aleksey-vladimirovich.jpg",
    home: 3
  },
  {
    id: "fasakhov-rustem-rinatovich",
    name: "Фасахов Рустем Ринатович",
    spec: "Травматолог-ортопед",
    role: "Заведующий отделением травматологии № 2",
    position: "Заведующий отделением травматологии № 2, врач травматолог-ортопед высшей категории, микрохирург, пластический хирург и эстетический хирург",
    regalia: ["Высшая категория"],
    directions: ["khirurgiya", "konsultacii"],
    href: "#",
    photo: "assets/img/doctors/fasakhov-rustem-rinatovich.jpg",
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
    photo: "assets/img/doctors/garifullov-gamil-gakilevich.jpg",
    home: 5
  },
  {
    id: "khayrullov-marat-abdulkhaevich",
    name: "Хайруллов Марат Абдулхаевич",
    spec: "Невролог",
    role: "Заведующий отделением неврологии № 1",
    position: "Заведующий отделением неврологии № 1, врач-невролог высшей категории, Заслуженный врач РТ",
    regalia: ["Высшая категория", "Заслуженный врач РТ"],
    directions: ["konsultacii", "chek-ap"],
    href: "#",
    photo: "assets/img/doctors/khayrullov-marat-abdulkhaevich.jpg",
    home: 6
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
    photo: "assets/img/doctors/gilmanov-albert-anasovich.jpg",
    home: 7
  },
  {
    id: "nigmatulina-nigina-amonovna",
    name: "Нигматулина Нигина Амоновна",
    spec: "Акушер-гинеколог",
    role: "Руководитель Перинатального центра РКБ",
    position: "Руководитель Перинатального центра РКБ, заместитель главного врача по акушерско-гинекологической помощи, врач-акушер-гинеколог, кандидат медицинских наук",
    regalia: ["к.м.н."],
    directions: ["rody", "konsultacii"],
    href: "#",
    photo: "assets/img/doctors/nigmatulina-nigina-amonovna.jpg",
    home: 8
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
    photo: "assets/img/doctors/vafina-zulfiya-ilsurovna.jpg",
    home: null
  },
  {
    id: "bochkareva-nataliya-mikhaylovna",
    name: "Бочкарева Наталия Михайловна",
    spec: "Акушер-гинеколог",
    role: "Заведующая акушерским отделением Перинатального центра",
    position: "Заведующая акушерским отделением, врач-акушер-гинеколог высшей категории Перинатального центра",
    regalia: ["Высшая категория"],
    directions: ["rody", "konsultacii", "chek-ap"],
    href: "#",
    photo: "assets/img/doctors/bochkareva-nataliya-mikhaylovna.jpg",
    home: null
  },
  {
    id: "davletshina-rezeda-ilsurovna",
    name: "Давлетшина Резеда Ильсуровна",
    spec: "Невролог",
    role: "Врач-невролог",
    position: "Врач-невролог высшей категории, кандидат медицинских наук",
    regalia: ["Высшая категория", "к.м.н."],
    directions: ["konsultacii", "chek-ap"],
    href: "#",
    photo: "assets/img/doctors/davletshina-rezeda-ilsurovna.jpg",
    home: null
  }
];

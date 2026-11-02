/*
  Knowledge the audit cannot measure (tools/audit-layout.mjs).
  PROPOSALS: for an issue key (string or RegExp), what we propose (text) or what was done (fixed).
  EXCEPTIONS: values that are intended and are not violations; every one has a reason (A-42).
  Texts in Russian: they go to the report as they are.
*/
const MEASURE_S = "Новый токен --text-measure-s: 600 px для текста 14 px и 520 px для текста 12 px, поставить max-width на этот блок. Значение менять только в tokens.css.";
const ROW_ALIGN = "Сделать внутренний отступ строки равным --content-gutter и убрать обнуление на телефоне: содержимое встанет на линию заголовка (36 px на десктопе, 24 px на телефоне), линии-разделители останутся от края до края контейнера.";
const INLINE_LINK = "Оставить как есть и записать в исключения: WCAG 2.5.8 не требует 44 px для ссылок внутри текста. Иначе пришлось бы раздвигать строки абзаца.";
const ONE_PX = "Оставить 1 px: это стандартный приём скрытия текста для экранных дикторов, а не значение дизайна. Записать в исключения, а строку в шапке заменить классом .visually-hidden, чтобы приём был описан в одном месте.";
const STEP_LINE = "Номер этапа задан с line-height: 1, токена для него нет. Добавить --text-step-number-line, равный размеру: 32 px на десктопе и 24 px на телефоне. Вид не изменится.";

export const PROPOSALS = [
  // Fixed automatically
  { key: "1|.a11y-toggle|1", fixed: "Убран отступ браузера 1 px: в компоненте padding: 0 var(--space-3). Высота та же, её задаёт min-height." },
  { key: "1|.check|11", fixed: "Отступ 11 px заменён на --space-3 (12 px). Строка согласия стала 46 px вместо 44 px." },
  { key: "1|.datepicker__grid th|1", fixed: "Убран отступ браузера 1 px у заголовков дней: padding: 0 0 var(--space-2)." },
  { key: /^3\|\.slot__text\|padding\|/, fixed: "У чипов времени был отступ 12 px, у остальных чипов 16 px. Отступ --space-4 теперь в самом компоненте .slot__text, дубли в .choices и .filter-chips удалены. Внешний вид времени не меняется: ширину задаёт сетка." },
  { key: /^3\|\.slot__text\|gap\|/, fixed: "Зазор --space-2 теперь в самом компоненте .slot__text, дубли в .choices и .filter-chips удалены." },
  { key: "4|control|.field__control|50 px", fixed: "Поле было 50 px из-за отступов 12 + строка 24 + рамка. Отступ в компоненте --space-2, поле теперь 48 px, как кнопка того же размера. У textarea отступ 12 px оставлен." },
  { key: /^6\|pair\|\.doc-row__action-text/, fixed: "У «Скачать» в строке документа не было своей высоты строки: добавлен --text-button-s-line." },
  { key: /^6\|chars\|\.form-panel__lead/, fixed: "Ширина ограничена существующим --text-measure, как у остальных вводных текстов. Меняется только 768–1099." },

  // Needs a decision
  { key: "3|row-inner|.doctor-card__role", text: "ФИО занимает 1 или 2 строки, поэтому должность начинается на разной высоте. Зарезервировать под ФИО 2 строки (min-height от --text-h5-line), все карточки станут чуть выше. Или оставить: низ карточек и так выровнен." },
  { key: "3|row-inner|.feature__text", text: "На 1024 один заголовок преимущества занимает 2 строки. Зарезервировать 2 строки на этой ширине или оставить: разница заметна только здесь." },
  { key: /^3\|\.slot__text\|height\|46 px/, text: "На 360 чип «Сообщение на мобильный» переносится в 2 строки и становится 46 px. Сократить подпись до «SMS». Меняет текст, поэтому не правил." },
  { key: /^4\|tap\|\.check__text a/, text: INLINE_LINK },
  { key: /^4\|tap\|\.nowrap/, text: INLINE_LINK },
  { key: /^4\|tap\|\.doctor-card__name a/, text: "Ссылка на ФИО ниже 44 px, когда имя в одну строку. Сделать ссылку блоком с min-height: var(--tap-target), карточка станет выше на 20 px. Или оставить, пока нет страницы врача: ссылка сейчас ведёт на «#», а главное действие на карточке, кнопка «Записаться», 48 px." },
  { key: "5|edge-logo", text: "Логотип стоит левее заголовков секций. Поставить в шапке отступ calc(--page-gutter + --content-gutter): логотип встанет на линию заголовков (36 px на десктопе, 24 px на телефоне)." },
  { key: "5|edge-footer", text: "То же в подвале: отступ calc(--page-gutter + --content-gutter), содержимое подвала встанет на линию заголовков." },
  { key: /^5\|align\|#services/, text: ROW_ALIGN },
  { key: /^5\|align\|#documents/, text: ROW_ALIGN },
  { key: /^5\|align\|#steps/, text: "На телефоне этапы без фона, поэтому их номера стоят на 12 px левее заголовка. Дать списку этапов на телефоне отступ --content-gutter." },
  { key: /^6\|chars\|\.flow__lead/, text: MEASURE_S },
  { key: /^6\|chars\|\.form__note/, text: MEASURE_S },
  { key: /^6\|chars\|\.service-row__text/, text: MEASURE_S },
  { key: /^6\|chars\|\.site-footer__bottom p/, text: MEASURE_S },
  { key: /^6\|chars\|\.site-footer__org/, text: MEASURE_S },
  { key: /^6\|pair\|\.steps__item::before/, text: STEP_LINE },
  { key: /^6\|line\|\.steps__item::before/, text: STEP_LINE },
  { key: /^7\|/, text: ONE_PX }
];

export const EXCEPTIONS = [
  { rule: 3, sig: ".field__control", prop: "padding", why: "поле с иконкой внутри (поиск, выпадающий список): больше отступ под иконку" },
  { rule: 3, sig: ".a11y-toggle__off", prop: "font-size", why: "тот же текст внутри плитки мобильного меню, размер задаёт плитка" },
  { rule: 3, sig: ".a11y-toggle__off", prop: "line-height", why: "тот же текст внутри плитки мобильного меню" },
  { rule: 3, sig: ".nowrap", prop: "font-size", why: "служебный класс, размер наследуется от текста вокруг" },
  { rule: 3, sig: ".nowrap", prop: "line-height", why: "служебный класс, строка наследуется от текста вокруг" },
  { rule: 3, sig: ".social-link", prop: "height", why: "модификатор списка .social-links--s в служебной строке шапки" },
  { rule: 3, sig: ".summary__row", prop: "padding", why: "модификатор .summary--compact над шагами записи" }
];

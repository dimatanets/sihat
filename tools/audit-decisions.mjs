/*
  Knowledge the audit cannot measure (tools/audit-layout.mjs).
  PROPOSALS: for an issue key (string or RegExp): text = what we propose, fixed = what was done automatically,
  resolved = what was done by the decision of the user.
  EXCEPTIONS: values that are intended and are not violations; every one has a reason (A-42, A-43).
  Texts in Russian: they go to the report as they are.
*/
const MEASURE_S = "Новый токен --text-measure-s (600 px для текста 14 px), max-width на этом блоке.";
const MEASURE_XS = "Новый токен --text-measure-xs (520 px для текста 12 px), max-width на этом блоке.";
const ROW_ALIGN = "Внутренний отступ строки теперь --content-gutter, обнуление на телефоне убрано: содержимое на линии заголовка, разделители от края до края контейнера.";
const INLINE_LINK = "Оставлено как есть и записано в исключения: WCAG 2.5.8 не требует 44 px для ссылок внутри текста.";
const ONE_PX = "Оставлено 1 px и записано в исключения: стандартный приём скрытия текста для экранных дикторов, а не значение дизайна.";
const STEP_LINE = "Добавлен --text-step-number-line, равный размеру: 32 px на десктопе и 24 px на телефоне. Вид не изменился.";

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

  // Applied by the decision of the user (A-43)
  { key: "3|row-inner|.doctor-card__role", resolved: "Под ФИО зарезервированы 2 строки: min-height от --text-h5-line. Карточки врача стали чуть выше." },
  { key: "3|row-inner|.feature__text", resolved: "На 768–1099 под заголовок преимущества зарезервированы 2 строки." },
  { key: /^3\|\.slot__text\|height\|46 px/, resolved: "Подпись чипа сокращена до «SMS», на главной, на странице чек-апа, в записи и в kit.html." },
  { key: /^4\|tap\|\.check__text a/, resolved: INLINE_LINK },
  { key: /^4\|tap\|\.nowrap/, resolved: INLINE_LINK },
  { key: /^4\|tap\|\.doctor-card__name a/, resolved: "Ссылка на ФИО теперь блок с min-height: var(--tap-target). Карточка не выросла ещё раз: место уже зарезервировано под 2 строки." },
  { key: "5|edge-logo", resolved: "Новый токен --content-edge (--page-gutter + --content-gutter) в шапке, служебной строке и мобильном меню: логотип на линии заголовков. На 360 логотип уменьшен до 88 px и у «Записаться» отступ 12 px, иначе шапка не помещалась." },
  { key: "5|edge-footer", resolved: "Токен --content-edge в подвале: содержимое на линии заголовков." },
  { key: /^5\|align\|#services/, resolved: ROW_ALIGN },
  { key: /^5\|align\|#documents/, resolved: ROW_ALIGN },
  { key: /^5\|align\|#steps/, resolved: "На телефоне у списка этапов отступ --content-gutter: номера на линии заголовка." },
  { key: /^6\|chars\|\.flow__lead/, resolved: MEASURE_S },
  { key: /^6\|chars\|\.form__note/, resolved: MEASURE_XS },
  { key: /^6\|chars\|\.service-row__text/, resolved: MEASURE_S },
  { key: /^6\|chars\|\.site-footer__bottom p/, resolved: MEASURE_XS + " Блоку копирайта добавлен класс .site-footer__copy." },
  { key: /^6\|chars\|\.site-footer__org/, resolved: MEASURE_S },
  { key: /^6\|pair\|\.steps__item::before/, resolved: STEP_LINE },
  { key: /^6\|line\|\.steps__item::before/, resolved: STEP_LINE },
  { key: /^7\|css\/base\.css/, resolved: ONE_PX },
  { key: /^7\|css\/components\.css/, resolved: "Второй копии приёма больше нет. Класс .visually-hidden здесь не подошёл: на планшете подпись «Меню» видна, скрыта она только на телефоне. Поэтому на телефоне display: none, а имя кнопки для экранных дикторов задаёт aria-label." }
];

export const EXCEPTIONS = [
  { rule: 3, sig: ".field__control", prop: "padding", why: "поле с иконкой внутри (поиск, выпадающий список): больше отступ под иконку" },
  { rule: 3, sig: ".a11y-toggle__off", prop: "font-size", why: "тот же текст внутри плитки мобильного меню, размер задаёт плитка" },
  { rule: 3, sig: ".a11y-toggle__off", prop: "line-height", why: "тот же текст внутри плитки мобильного меню" },
  { rule: 3, sig: ".nowrap", prop: "font-size", why: "служебный класс, размер наследуется от текста вокруг" },
  { rule: 3, sig: ".nowrap", prop: "line-height", why: "служебный класс, строка наследуется от текста вокруг" },
  { rule: 3, sig: ".social-link", prop: "height", why: "модификатор списка .social-links--s в служебной строке шапки" },
  { rule: 3, sig: ".summary__row", prop: "padding", why: "модификатор .summary--compact над шагами записи" },
  { rule: 4, sig: ".check__text a", prop: "tap", why: "ссылка внутри текста: WCAG 2.5.8 не требует для неё 44 px" },
  { rule: 4, sig: ".nowrap", prop: "tap", why: "телефон внутри текста: WCAG 2.5.8 не требует для него 44 px" },
  { rule: 7, sig: /^(width: 1px; height: 1px;|margin: -1px; padding: 0;)$/, why: "приём скрытия текста для экранных дикторов в .visually-hidden, не значение дизайна" }
];

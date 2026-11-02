/*
  Mock schedule. A-36: in production the slots come from the admin panel; the schedule changes often and today it is
  kept by hand in another system (client answer 3). Only this file changes then: the calendar, the slots and the doctor
  cards read the schedule through these functions, so the backend only has to return free times per doctor and day.

  key is a doctor id from data/doctors.js ("demo" on kit.html).
  JS: SIHAT_SCHEDULE.isClosed(date)             clinic closed: Sunday (A-10)
      SIHAT_SCHEDULE.isPublished(key)           false: this doctor has no open schedule yet
      SIHAT_SCHEDULE.times(key, date)           [{ time: "9:30", free: true|false, past: true|false }]
      SIHAT_SCHEDULE.freeCount(key, date)       number of free times on that day
      SIHAT_SCHEDULE.nearest(key, from)         first date with free time from that day on, or null
      SIHAT_SCHEDULE.shortLabel(date)           "сегодня", "завтра", "4 ноября"
      SIHAT_SCHEDULE.horizon                    how many days ahead the schedule is open
*/
window.SIHAT_SCHEDULE = (function () {
  var HORIZON = 45;
  var FROM = 8, TO = 18, TO_SATURDAY = 16, STEP = 30; // minutes
  var MONTHS_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  // Demo of the state «расписание пока не открыто» (A-36).
  var NOT_PUBLISHED = ["davletshina-rezeda-ilsurovna"];

  function seedOf(key) {
    var n = 0;
    for (var i = 0; i < String(key).length; i++) n += String(key).charCodeAt(i);
    return n % 10;
  }
  function day(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function isClosed(d) { return d.getDay() === 0; }
  function isPublished(key) { return NOT_PUBLISHED.indexOf(key) === -1; }
  // About one working day in six is fully booked (A-36).
  function isBookedOut(seed, d) { return (d.getDate() * 7 + d.getMonth() + seed) % 6 === 0; }

  function times(key, date) {
    if (isClosed(date) || !isPublished(key)) return [];
    var seed = seedOf(key);
    var out = [];
    var end = (date.getDay() === 6 ? TO_SATURDAY : TO) * 60;
    var now = new Date();
    var isToday = day(now).getTime() === day(date).getTime();
    var nowMin = now.getHours() * 60 + now.getMinutes();
    var bookedOut = isBookedOut(seed, date);
    for (var m = FROM * 60, i = 0; m < end; m += STEP, i++) {
      // A-34: on today the times that have already passed cannot be chosen
      var past = isToday && m <= nowMin;
      var busy = bookedOut || (date.getDate() * 13 + i * 7 + seed) % 10 < 3; // about 30% booked
      out.push({ time: Math.floor(m / 60) + ":" + String(m % 60).padStart(2, "0"), free: !past && !busy, past: past });
    }
    return out;
  }
  function freeCount(key, date) {
    return times(key, date).filter(function (t) { return t.free; }).length;
  }
  function nearest(key, from) {
    if (!isPublished(key)) return null;
    var today = day(new Date());
    var start = from && from > today ? day(from) : today;
    for (var i = 0; i <= HORIZON; i++) {
      var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      if ((d - today) / 864e5 > HORIZON) break;
      if (freeCount(key, d)) return d;
    }
    return null;
  }
  function shortLabel(d) {
    var diff = Math.round((day(d) - day(new Date())) / 864e5);
    if (diff === 0) return "сегодня";
    if (diff === 1) return "завтра";
    return d.getDate() + " " + MONTHS_GEN[d.getMonth()];
  }

  return { isClosed: isClosed, isPublished: isPublished, times: times, freeCount: freeCount, nearest: nearest, shortLabel: shortLabel, horizon: HORIZON };
})();

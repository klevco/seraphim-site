/*
 * «Разбор дня» — расчёт.
 *
 * Чистая функция analyzeDay(input): без сети, без хранилищ, без DOM.
 * Всё считается на устройстве; функция ничего никуда не отправляет.
 *
 * Нормы — ТОЛЬКО из проверенной базы
 *   routine_gomeopat/статистика Серафим/_продукт 13.10 бот-консультант/подготовка/norms.json (+ norms.md,
 *   правки скептика norms-skeptic.md), проверено 13.10.2026.
 * У каждой цифры ниже в комментарии стоит id нормы из этой базы.
 * Перепроверить базу: середина декабря 2026 и середина февраля 2027 (сроки СанПиН — norms.md, «Расхождения», п. 10).
 */
(function (root) {
  'use strict';

  var H = 60;

  // ---------------------------------------------------------------------------
  // Источники (ссылки — ровно те, что в norms.json)
  // ---------------------------------------------------------------------------
  var MR_URL = 'https://legalacts.ru/doc/mr-240331-23-24-gigiena-detei-i-podrostkov-metodicheskie-rekomendatsii/';

  var SOURCES = {
    sanpin66: { label: 'СанПиН 1.2.3685-21, табл. 6.6', url: 'http://publication.pravo.gov.ru/document/0001202505200002' },
    sanpin67: { label: 'СанПиН 1.2.3685-21, табл. 6.7', url: 'https://faolex.fao.org/docs/pdf/rus215586.pdf' },
    mr46: { label: 'МР 2.4.0331-23, п. 4.6', url: MR_URL },
    mr410: { label: 'МР 2.4.0331-23, п. 4.10', url: MR_URL },
    mr410_59: { label: 'МР 2.4.0331-23, пп. 4.10 и 5.9', url: MR_URL },
    mr411: { label: 'МР 2.4.0331-23, пп. 4.10 и 4.11', url: MR_URL },
    pr115: { label: 'Приказ Минпросвещения № 115, п. 24', url: 'https://legalacts.ru/doc/prikaz-minprosveshchenija-rossii-ot-22032021-n-115-ob-utverzhdenii/' },
    sp27: { label: 'СП 2.4.2.4283-26, п. 27', url: 'http://publication.pravo.gov.ru/document/0001202606020083' },
    sp29: { label: 'СП 2.4.2.4283-26, п. 29', url: 'http://publication.pravo.gov.ru/document/0001202606020083' },
    aasm: { label: 'AASM, 2016', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4877308/' },
    aasmHabits: { label: 'AASM, Healthy Sleep Habits', url: 'https://sleepeducation.org/healthy-sleep/healthy-sleep-habits/' }
  };

  // ---------------------------------------------------------------------------
  // Нормы. Каждая цифра — с id из norms.json.
  // ---------------------------------------------------------------------------
  var NORMS = {
    // Домашние задания в будни, не более (минуты)
    hwMaxMin: {
      1: 0,   // hw.g1.none — приказ № 115 п. 24: в 1 классе обучение без домашних заданий (ФОП НОО в ред. приказа № 729; письмо № 03-320)
      2: 90,  // hw.g2-3 — СанПиН 1.2.3685-21, табл. 6.6, стр. 19: 2 и 3 классы — 1,5 ч
      3: 90,  // hw.g2-3
      4: 120, // hw.g4-5 — там же: 4 и 5 классы — 2,0 ч
      5: 120, // hw.g4-5
      6: 150, // hw.g6-7 — там же: 6–8 классы — 2,5 ч
      7: 150  // hw.g6-7
    },
    // hw.g1.sanpin — СанПиН табл. 6.6: 1 класс — 1,0 ч. Не ориентир (в 1 классе ДЗ нет), а потолок
    // для порога «уроки больше двух норм» в 1 классе: 2 × 60 мин (norms.md, «Что брать калькулятору»).
    hwG1CeilingMin: 60,
    hwWindowFrom: 16 * H, // hw.start.window — МР 2.4.0331-23 п. 4.10: подъём работоспособности 16:00–18:00
    hwWindowTo: 18 * H,   // hw.start.window
    hwNotBefore: 15 * H,  // hw.start.not_before — МР п. 5.9 (глава о группах продлённого дня): не ранее 15:00
    hwRestFromMin: 90,    // hw.start.rest — МР п. 4.10: после обеда и 1,5–2 ч отдыха
    hwRestToMin: 120,     // hw.start.rest
    hwBlockFromMin: 35,   // hw.block — МР п. 4.10: 35–45 мин работы, затем перерыв не менее 10 мин
    hwBlockToMin: 45,     // hw.block
    hwBreakMin: 10,       // hw.block
    // shift2.hw_morning — МР п. 4.10: во вторую смену ДЗ «в первой половине дня после утреннего завтрака».
    // «Первая половина дня» = до 12:00 — наше буквальное прочтение, отдельной цифры в документе нет.
    shift2HwBefore: 12 * H,
    // Отбой, не позднее
    bedtimeLatest: {
      1: 21 * H, 2: 21 * H, 3: 21 * H, 4: 21 * H, // bedtime.g1-4 — МР п. 4.6: 1–4 классы — не позднее 21:00
      5: 22 * H, 6: 22 * H, 7: 22 * H             // bedtime.g5-7 — МР п. 4.6: 5–9 классы — не позднее 22:00
    },
    screenFreeBeforeSleepMin: 60, // screen.before_sleep.mr — МР п. 4.6: без экранов не менее чем за 1 ч до сна
    screenFreeAasmMin: 30,        // screen.before_sleep.aasm — AASM: за 30 мин (показываем рядом)
    clubEndUnder7: 19 * H + 30,   // clubs.end.sanpin.under7 — СанПиН табл. 6.6, стр. 2: до 7 лет — не позднее 19:30
    clubEnd: 20 * H,              // clubs.end.sanpin.8-15 (СанПиН: 8–15 лет — 20:00) + clubs.end.sp (СП п. 29: до 20:00; ровно 7 лет — по СП)
    firstShiftOnlyGrades: [1, 5]  // school.first_shift_only — СП п. 27 пп. 15: 1 и 5 классы учатся в первую смену
  };

  // Сон по возрасту: российский ориентир (СанПиН/МР — строже AASM) и AASM рядом, без оценки.
  // ids и sources — только нормы, которые применяются к этому возрасту (applies_to.ages в norms.json).
  function sleepNorm(age) {
    var ruMrAasm = [SOURCES.sanpin67, SOURCES.mr46, SOURCES.aasm];
    if (age <= 6) {
      // sleep.min.age7 — СанПиН табл. 6.7: 4–7 лет — не менее 11 ч (строка покрывает и 6 лет — norms-skeptic.md).
      // МР п. 4.6 (sleep.mr.age7-10) написаны для 7–10 лет — к шестилетним не относятся, поэтому их здесь нет.
      // sleep.aasm.age6-12 — AASM: 6–12 лет — 9–12 ч
      return { min: 660, max: null, text: 'не менее 11 ч', aasm: '9–12 ч',
        ids: ['sleep.min.age7', 'sleep.aasm.age6-12'], sources: [SOURCES.sanpin67, SOURCES.aasm] };
    }
    if (age === 7) {
      // sleep.min.age7 — СанПиН табл. 6.7: 4–7 лет — не менее 11 ч (строже МР 7–10 лет: 10–11 ч, sleep.mr.age7-10)
      // sleep.aasm.age6-12 — AASM: 6–12 лет — 9–12 ч
      // alt — второй российский ориентир для 7 лет: МР п. 4.6 — 10–11 ч (sleep.mr.age7-10). Берём строгий,
      // но честно пишем, что нормы расходятся (norms.md, «Расхождения», п. 4).
      return { min: 660, max: null, text: 'не менее 11 ч', aasm: '9–12 ч',
        ids: ['sleep.min.age7', 'sleep.mr.age7-10', 'sleep.aasm.age6-12'], sources: ruMrAasm,
        alt: { min: 600, text: '10–11 ч' } }; // sleep.mr.age7-10
    }
    if (age <= 10) {
      // sleep.min.age8-10 — СанПиН: не менее 10 ч; sleep.mr.age7-10 — МР п. 4.6: 10–11 ч
      return { min: 600, max: 660, text: '10–11 ч', aasm: '9–12 ч',
        ids: ['sleep.min.age8-10', 'sleep.mr.age7-10', 'sleep.aasm.age6-12'], sources: ruMrAasm };
    }
    if (age <= 12) {
      // sleep.min.age11-14 — СанПиН: не менее 9 ч; sleep.mr.age11-14 — МР: 9–10 ч
      return { min: 540, max: 600, text: '9–10 ч', aasm: '9–12 ч',
        ids: ['sleep.min.age11-14', 'sleep.mr.age11-14', 'sleep.aasm.age6-12'], sources: ruMrAasm };
    }
    // sleep.aasm.age13-14 — AASM: 13–18 лет — 8–10 ч
    return { min: 540, max: 600, text: '9–10 ч', aasm: '8–10 ч',
      ids: ['sleep.min.age11-14', 'sleep.mr.age11-14', 'sleep.aasm.age13-14'], sources: ruMrAasm };
  }

  // Время уроков мама называет «сели — закончили», то есть вместе с перерывами. СанПиН (hw.g*) задаёт время
  // самой работы, а МР п. 4.10 (hw.block) — перерыв не менее 10 мин после каждых 35–45 мин. Поэтому к норме
  // прибавляем рекомендованные перерывы: работа делится на отрезки по 45 мин (верхняя граница hw.block),
  // между отрезками — по 10 мин. 2–3 кл.: 90 + 10 = 100 мин; 4–5 кл.: 120 + 20 = 140; 6–7 кл.: 150 + 30 = 180.
  // Новых цифр нет — только hw.g* и hw.block.
  function withBreaks(workMin) {
    if (workMin <= 0) return 0;
    return workMin + NORMS.hwBreakMin * (Math.ceil(workMin / NORMS.hwBlockToMin) - 1);
  }

  function withSource(list, s) {
    return list.indexOf(s) >= 0 ? list.slice() : list.concat([s]);
  }

  // Допуск калькулятора — НЕ норма. Ответы о времени примерные («уснул» позже, чем «лёг»),
  // поэтому расхождение до 15 минут сбоем не считаем. Так в README и на странице.
  var TOLERANCE_MIN = 15;

  var GUILT_LINE = 'Дело не в вас и не в характере ребёнка — так не сходятся часы.';
  var ALL_GOOD_LINE = 'По часам у вас всё сходится.';

  // ---------------------------------------------------------------------------
  // Время
  // ---------------------------------------------------------------------------
  function parseTime(s) {
    if (typeof s !== 'string') return null;
    var m = /^\s*([01]?\d|2[0-3])[:.]([0-5]\d)\s*$/.exec(s);
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  }

  function fmtTime(min) {
    var m = ((Math.round(min) % 1440) + 1440) % 1440;
    var h = Math.floor(m / 60);
    var mm = m % 60;
    // ночные часы 0–5 — с нулём («00:30», «01:00»), дневные — как привычно в тексте («7:00», «21:00»)
    return (h < 6 ? '0' + h : String(h)) + ':' + (mm < 10 ? '0' : '') + mm;
  }

  function fmtDur(min) {
    min = Math.round(min);
    var h = Math.floor(min / 60);
    var m = min % 60;
    // неразрывные пробелы: «6 ч 30 мин» не разъезжается по строкам на телефоне
    if (h && m) return h + '\u00a0ч\u00a0' + m + '\u00a0мин';
    if (h) return h + '\u00a0ч';
    return m + '\u00a0мин';
  }

  function toInt(x) {
    if (typeof x === 'string' && x.trim() !== '') x = Number(x);
    if (typeof x !== 'number' || !isFinite(x) || Math.floor(x) !== x) return null;
    return x;
  }

  function hwBand(grade) {
    if (grade === 1) return '1 класса';
    if (grade <= 3) return '2–3 класса';
    if (grade <= 5) return '4–5 класса';
    return '6–7 класса';
  }

  function bedtimeBand(grade) {
    return grade <= 4 ? '1–4 класса' : '5–9 класса';
  }

  function isEmpty(x) {
    return x === undefined || x === null || x === '';
  }

  // ---------------------------------------------------------------------------
  // Проверка ввода
  // ---------------------------------------------------------------------------
  function validate(input) {
    var errors = [];
    function err(field, message) { errors.push({ field: field, message: message }); }

    if (!input || typeof input !== 'object') {
      return { ok: false, errors: [{ field: 'form', message: 'Ответов нет — начните с первого шага.' }] };
    }

    var grade = toInt(input.grade);
    var shift = toInt(input.shift);
    var age = toInt(input.age);

    if (grade === null || grade < 1 || grade > 7) { err('grade', 'Выберите класс — от 1 до 7.'); grade = null; }
    if (shift !== 1 && shift !== 2) { err('shift', 'Выберите смену — первую или вторую.'); shift = null; }
    if (age === null || age < 6 || age > 14) { err('age', 'Укажите полные годы — разбор рассчитан на 6–14 лет.'); age = null; }
    if (grade !== null && age !== null && (age < grade + 4 || age > grade + 9)) {
      err('age', 'Проверьте класс и возраст — кажется, где-то опечатка.');
    }

    var homework = input.homework !== false;
    var hwStart = null;
    var hwEnd = null;
    if (homework) {
      if (isEmpty(input.hwStart)) err('hwStart', 'Во сколько сели за уроки? Или отметьте «Уроков вчера не было».');
      else if ((hwStart = parseTime(input.hwStart)) === null) err('hwStart', 'Время начала уроков — в виде 16:30.');
      if (isEmpty(input.hwEnd)) err('hwEnd', 'Во сколько закончили уроки?');
      else if ((hwEnd = parseTime(input.hwEnd)) === null) err('hwEnd', 'Время конца уроков — в виде 18:00.');
    }

    var sleepAt = null;
    if (isEmpty(input.sleepAt)) err('sleepAt', 'Во сколько ребёнок уснул?');
    else if ((sleepAt = parseTime(input.sleepAt)) === null) err('sleepAt', 'Время, когда ребёнок уснул, — в виде 21:30.');
    else if (sleepAt >= 6 * H && sleepAt < 18 * H) {
      err('sleepAt', 'Время засыпания похоже на дневное. Если ребёнок уснул после полуночи — укажите, например, 00:30.');
      sleepAt = null;
    }

    var wakeAt = null;
    if (isEmpty(input.wakeAt)) err('wakeAt', 'Во сколько ребёнок встаёт в будни?');
    else if ((wakeAt = parseTime(input.wakeAt)) === null) err('wakeAt', 'Время подъёма — в виде 7:00.');
    else if (wakeAt < 4 * H || wakeAt > 12 * H) {
      err('wakeAt', 'Время подъёма похоже на опечатку — укажите утреннее, например 7:00.');
      wakeAt = null;
    }

    var gadget = input.gadget === true ? true : (input.gadget === false ? false : null);

    var club = isEmpty(input.club) ? null : input.club;
    if (club !== null && club !== 'none' && club !== 'before18' && club !== 'after18') {
      err('club', 'Выберите вариант про секцию.');
      club = null;
    }
    var clubEnd = null;
    if (club === 'after18' && !isEmpty(input.clubEnd)) {
      clubEnd = parseTime(input.clubEnd);
      if (clubEnd === null) err('clubEnd', 'Время окончания секции — в виде 19:30.');
      else if (clubEnd < 18 * H) {
        err('clubEnd', 'Вы отметили «после 18:00» — укажите вечернее время окончания, например 19:30.');
        clubEnd = null;
      }
    }

    if (errors.length) return { ok: false, errors: errors };

    // Переход через полночь: всё, что до полудня, для засыпания — это «следующие сутки».
    var sleepAbs = sleepAt < 12 * H ? sleepAt + 1440 : sleepAt;
    var wakeAbs = wakeAt + 1440;
    var sleepMin = wakeAbs - sleepAbs;
    if (sleepMin < 3 * H || sleepMin > 15 * H) {
      err('sleepAt', 'Проверьте время сна и подъёма: по ним выходит ' + (sleepMin > 0 ? fmtDur(sleepMin) : 'отрицательный сон') + ' — похоже на опечатку.');
    }

    var hwMin = 0;
    var hwStartAbs = null;
    var hwEndAbs = null;
    if (homework) {
      hwMin = ((hwEnd - hwStart) % 1440 + 1440) % 1440; // через полночь: 20:00 → 00:30 = 4 ч 30 мин
      if (hwMin === 0) err('hwEnd', 'Начало и конец уроков совпадают — проверьте время.');
      else if (hwMin > 12 * H) err('hwEnd', 'Похоже, начало и конец уроков перепутаны — проверьте время.');
      hwStartAbs = hwStart < 5 * H ? hwStart + 1440 : hwStart;
      hwEndAbs = hwStartAbs + hwMin;
      if (!errors.length && hwEndAbs > sleepAbs + TOLERANCE_MIN) {
        err('hwEnd', 'Уроки закончились позже, чем ребёнок уснул, — проверьте время.');
      }
    }

    if (errors.length) return { ok: false, errors: errors };

    return {
      ok: true,
      data: {
        grade: grade, shift: shift, age: age,
        homework: homework, hwStart: hwStart, hwEnd: hwEnd, hwMin: hwMin, hwStartAbs: hwStartAbs, hwEndAbs: hwEndAbs,
        sleepAt: sleepAt, sleepAbs: sleepAbs, wakeAt: wakeAt, wakeAbs: wakeAbs, sleepMin: sleepMin,
        gadget: gadget, club: club, clubEnd: clubEnd
      }
    };
  }

  // ---------------------------------------------------------------------------
  // Разбор
  // ---------------------------------------------------------------------------
  function analyzeDay(input) {
    var v = validate(input);
    if (!v.ok) return { ok: false, errors: v.errors };
    var d = v.data;
    var T = TOLERANCE_MIN;

    var checks = [];   // всё, что сверили (для блока «Что сверили»)
    var issues = [];   // расхождения (для «Где сбой»)
    var notices = [];  // замечания к вводу, не сбои
    var teacher = false;

    var sn = sleepNorm(d.age);
    var latest = NORMS.bedtimeLatest[d.grade];
    var latestAbs = latest; // вечер тех же суток
    // Когда уснуть, чтобы сошлись и отбой, и сон по возрасту
    var targetSleepAbs = Math.min(latestAbs, d.wakeAbs - sn.min);

    var clubEvening = d.club === 'after18';

    // --- 0. Замечания к вводу ---
    if (d.shift === 2 && NORMS.firstShiftOnlyGrades.indexOf(d.grade) >= 0) {
      // school.first_shift_only — СП 2.4.2.4283-26 п. 27 пп. 15
      notices.push('По санитарным правилам ' + d.grade + ' класс учится только в первую смену (СП 2.4.2.4283-26, п. 27). ' +
        'Проверьте ответ. Если смена правда вторая — домашним расписанием это не поправить, можно уточнить в школе. Остальное посчитано.');
    }

    // --- 1. Уроки: сколько ---
    var hwMax = NORMS.hwMaxMin[d.grade];
    var hwAllowed = withBreaks(hwMax); // hw.g* + перерывы hw.block
    var hwWas = d.homework ? ('с ' + fmtTime(d.hwStart) + ' до ' + fmtTime(d.hwEnd) + ' — ' + fmtDur(d.hwMin) + ' вместе с перерывами') : '';
    if (!d.homework) {
      checks.push({ id: 'hw_amount', label: 'Уроки дома', value: 'вчера не делали',
        target: d.grade === 1 ? 'в 1 классе — без домашних заданий' : 'не более ' + fmtDur(hwAllowed) + ' с перерывами',
        status: d.grade === 1 ? 'ok' : 'skip' });
    } else if (d.grade === 1) {
      var g1Off = d.hwMin > T;
      var g1Teacher = d.hwMin > 2 * NORMS.hwG1CeilingMin; // hw.g1.sanpin × 2 = 2 ч (norms.md: «отсев с 2 ч»)
      checks.push({ id: 'hw_amount', label: 'Уроки дома', value: fmtDur(d.hwMin),
        target: 'в 1 классе — без домашних заданий', status: g1Off ? 'off' : 'ok' });
      if (g1Off) {
        if (g1Teacher) teacher = true;
        issues.push({
          id: 'hw_g1',
          title: g1Teacher ? 'Уроки больше двух часов — а в 1 классе их не задают' : 'В 1 классе уроки на дом не задают',
          was: 'уроки ' + hwWas,
          target: 'в 1 классе обучение идёт без домашних заданий',
          sources: [SOURCES.pr115],
          normIds: ['hw.g1.none'].concat(g1Teacher ? ['hw.g1.sanpin'] : []),
          teacher: g1Teacher,
          severity: g1Teacher ? 400 + d.hwMin : Math.min(d.hwMin, 120)
        });
      }
    } else {
      var hwId = d.grade <= 3 ? 'hw.g2-3' : (d.grade <= 5 ? 'hw.g4-5' : 'hw.g6-7');
      var excess = d.hwMin - hwAllowed;
      var hwOff = excess > T;
      // «Больше чем вдвое»: две нормы работы (2 × hw.g*) и перерывы к ним по hw.block.
      // 2–3 кл. — больше 3 ч 30 мин; 4–5 кл. — больше 4 ч 50 мин; 6–7 кл. — больше 6 ч.
      var hwTeacher = d.hwMin > withBreaks(2 * hwMax);
      checks.push({ id: 'hw_amount', label: 'Уроки по времени', value: fmtDur(d.hwMin),
        target: 'не более ' + fmtDur(hwAllowed) + ' с перерывами', status: hwOff ? 'off' : 'ok' });
      if (hwOff) {
        if (hwTeacher) teacher = true;
        issues.push({
          id: 'hw_long',
          title: hwTeacher ? 'На уроки уходит в два с лишним раза больше ориентира' : 'Уроки дольше ориентира',
          was: hwWas,
          target: 'для ' + hwBand(d.grade) + ' — не более ' + fmtDur(hwMax) + ' работы в день, с перерывами — до ' + fmtDur(hwAllowed),
          sources: [SOURCES.sanpin66, SOURCES.mr410],
          normIds: [hwId, 'hw.block'],
          teacher: hwTeacher,
          severity: hwTeacher ? 400 + excess : excess
        });
      }
    }

    // --- 2. Уроки: когда (со 2 класса; в 1 классе ДЗ нет — время не сверяем) ---
    if (d.homework && d.grade >= 2) {
      if (d.shift === 1) {
        var startLate = d.hwStartAbs - NORMS.hwWindowTo;
        var startEarly = NORMS.hwNotBefore - d.hwStartAbs;
        var timingStatus = 'ok';
        if (startLate > T) {
          timingStatus = 'off';
          issues.push({
            id: 'hw_late_start',
            title: 'За уроки садятся поздно',
            was: 'сели за уроки в ' + fmtTime(d.hwStart),
            target: 'после обеда и 1,5–2 ч отдыха, лучше всего в 16:00–18:00',
            note: clubEvening ? 'Вечерняя секция сдвигает уроки ближе к ночи.' : null,
            sources: [SOURCES.mr410],
            normIds: ['hw.start.window', 'hw.start.rest'],
            severity: Math.min(150, 20 + startLate * 0.75)
          });
        } else if (startEarly > T) {
          timingStatus = 'off';
          issues.push({
            id: 'hw_early_start',
            title: 'Уроки начинаются раньше ориентира',
            was: 'сели за уроки в ' + fmtTime(d.hwStart),
            target: 'после обеда и 1,5–2 ч отдыха: не раньше 15:00, лучше в 16:00–18:00',
            sources: [SOURCES.mr410_59],
            normIds: ['hw.start.rest', 'hw.start.not_before', 'hw.start.window'],
            severity: Math.min(60, startEarly * 0.5)
          });
        }
        checks.push({ id: 'hw_time', label: 'Когда садятся за уроки', value: fmtTime(d.hwStart),
          target: '16:00–18:00, не раньше 15:00', status: timingStatus });
      } else {
        // shift2.hw_morning: «в первой половине дня» = до 12:00; допуск 15 мин — как у остальных границ (12:15 ещё утро)
        var morning = d.hwStartAbs >= 5 * H && d.hwStartAbs <= NORMS.shift2HwBefore + T;
        checks.push({ id: 'hw_time', label: 'Когда делают уроки', value: fmtTime(d.hwStart),
          target: 'вторая смена — утром, после завтрака', status: morning ? 'ok' : 'off' });
        if (!morning) {
          issues.push({
            id: 'shift2_evening',
            title: 'Во вторую смену уроки делают не утром',
            was: 'уроки ' + hwWas,
            target: 'во вторую смену — утром, после завтрака, до школы',
            sources: [SOURCES.mr411],
            normIds: ['shift2.hw_morning', 'shift2.routine'],
            severity: 70
          });
        }
      }
    }

    // --- 3. Сон и отбой ---
    var shortfall = sn.min - d.sleepMin;
    var sleepShort = shortfall > T;
    var lateness = d.sleepAbs - latestAbs;
    var bedLate = lateness > T;
    var bedId = d.grade <= 4 ? 'bedtime.g1-4' : 'bedtime.g5-7';
    var sleepTargetText = sn.text + ' (американские рекомендации AASM: ' + sn.aasm + ')';

    checks.push({ id: 'sleep_len', label: 'Сон по часам', value: fmtDur(d.sleepMin),
      target: sn.text, status: sleepShort ? 'off' : 'ok' });
    checks.push({ id: 'bedtime', label: 'Засыпание', value: fmtTime(d.sleepAt),
      target: 'отбой не позднее ' + fmtTime(latest), status: bedLate ? 'off' : 'ok' });

    if (sleepShort || bedLate) {
      var sleepWas = 'сон с ' + fmtTime(d.sleepAt) + ' до ' + fmtTime(d.wakeAt) + ' — по часам выходит ' + fmtDur(d.sleepMin);
      var sleepNotes = [];
      var sleepIssue;
      if (sleepShort && bedLate) {
        sleepIssue = {
          title: 'Поздний отбой — и сна по часам меньше ориентира',
          was: sleepWas,
          target: 'сон ' + sleepTargetText + '; отбой для ' + bedtimeBand(d.grade) + ' — не позднее ' + fmtTime(latest),
          sources: withSource(sn.sources, SOURCES.mr46),
          normIds: sn.ids.concat([bedId])
        };
      } else if (sleepShort) {
        // Отбой в пределах ориентира — значит, сон короче из-за часа подъёма. Сам подъём не оцениваем (wake.not_before —
        // норма для лагерей и интернатов), только считаем: подъём минус норма сна.
        sleepNotes.push('Отбой в пределах ориентира, но при подъёме в ' + fmtTime(d.wakeAt) + ' для ' + fmtDur(sn.min) +
          ' сна уснуть нужно к ' + fmtTime(targetSleepAbs) + '.');
        sleepIssue = {
          title: 'Сна по часам меньше ориентира',
          was: sleepWas,
          target: 'сон ' + sleepTargetText,
          sources: sn.sources.slice(),
          normIds: sn.ids
        };
      } else {
        sleepIssue = {
          title: 'Отбой позже ориентира',
          was: 'ребёнок уснул в ' + fmtTime(d.sleepAt),
          target: 'для ' + bedtimeBand(d.grade) + ' — не позднее ' + fmtTime(latest),
          sources: [SOURCES.mr46],
          normIds: [bedId]
        };
      }
      if (sleepShort && sn.alt && d.sleepMin >= sn.alt.min) {
        // 7 лет: СанПиН (sleep.min.age7) — не менее 11 ч, МР (sleep.mr.age7-10) — 10–11 ч. Сверяем по строгой и говорим об этом.
        sleepNotes.push('Для 7 лет нормы расходятся: СанПиН — ' + sn.text + ', МР Роспотребнадзора — ' + sn.alt.text +
          '. Сверили по более строгой.');
      }
      sleepIssue.note = sleepNotes.length ? sleepNotes.join(' ') : null;
      sleepIssue.id = 'sleep';
      sleepIssue.severity = Math.max(sleepShort ? shortfall * 1.5 : 0, bedLate ? lateness : 0) + (sleepShort && bedLate ? 10 : 0);
      issues.push(sleepIssue);
    }

    // --- 4. Экран перед сном ---
    if (d.gadget !== null) {
      checks.push({ id: 'screen', label: 'Экран в последний час перед сном', value: d.gadget ? 'был' : 'не было',
        target: 'без экранов за 1 ч до сна', status: d.gadget ? 'off' : 'ok' });
      if (d.gadget) {
        issues.push({
          id: 'screen',
          title: 'Экран в последний час перед сном',
          was: 'телефон, планшет или телевизор — в последний час перед сном',
          target: 'без экранов не менее чем за 1 ч до сна (американские рекомендации AASM: за 30 мин)',
          sources: [SOURCES.mr46, SOURCES.aasmHabits],
          normIds: ['screen.before_sleep.mr', 'screen.before_sleep.aasm'],
          severity: 45
        });
      }
    }

    // --- 5. Секция ---
    // До 7 лет — СанПиН табл. 6.6 (clubs.end.sanpin.under7, 19:30). Ровно 7 лет СанПиН пропускает — по СП п. 29
    // (clubs.end.sp, 20:00). С 8 лет — СанПиН (clubs.end.sanpin.8-15) и СП п. 29, оба 20:00.
    var clubLimit = d.age < 7 ? NORMS.clubEndUnder7 : NORMS.clubEnd;
    var clubLimitText = 'не позднее ' + fmtTime(clubLimit);
    var clubIds, clubSources;
    if (d.age < 7) { clubIds = ['clubs.end.sanpin.under7']; clubSources = [SOURCES.sanpin66]; }
    else if (d.age === 7) { clubIds = ['clubs.end.sp']; clubSources = [SOURCES.sp29]; }
    else { clubIds = ['clubs.end.sanpin.8-15', 'clubs.end.sp']; clubSources = [SOURCES.sanpin66, SOURCES.sp29]; }
    if (d.club === 'none') {
      checks.push({ id: 'club', label: 'Секция в будни', value: 'нет', target: '', status: 'info' });
    } else if (d.club === 'before18') {
      checks.push({ id: 'club', label: 'Секция', value: 'заканчивается до 18:00', target: clubLimitText, status: 'ok' });
    } else if (d.club === 'after18') {
      if (d.clubEnd === null) {
        checks.push({ id: 'club', label: 'Секция', value: 'заканчивается после 18:00', target: clubLimitText, status: 'info' });
      } else {
        var clubLate = d.clubEnd - clubLimit;
        var clubOff = clubLate > T;
        checks.push({ id: 'club', label: 'Секция заканчивается', value: fmtTime(d.clubEnd), target: clubLimitText,
          status: clubOff ? 'off' : 'ok' });
        if (clubOff) {
          issues.push({
            id: 'club_late',
            title: 'Секция заканчивается позже ориентира',
            was: 'заканчивается в ' + fmtTime(d.clubEnd),
            target: d.age < 7 ? 'до 7 лет — не позднее 19:30' : 'не позднее 20:00',
            sources: clubSources,
            normIds: clubIds,
            severity: 30 + clubLate
          });
        }
      }
    }

    // --- Сортировка по силе, не больше трёх ---
    issues.sort(function (a, b) { return b.severity - a.severity; });
    var shown = issues.slice(0, 3);
    var allGood = issues.length === 0;

    // --- Одно действие на сегодня: самое простое из показанных ---
    var action = pickAction(shown, d, {
      teacher: teacher, sn: sn, latest: latest, targetSleepAbs: targetSleepAbs, bedLate: bedLate, bedId: bedId,
      clubEvening: clubEvening, clubLimit: clubLimit, clubIds: clubIds
    });

    var teacherNote = null;
    if (teacher) {
      teacherNote = d.grade === 1
        ? 'Расписанием это не решить — поговорите с учителем спокойно: какие задания обязательны и сколько времени на них рассчитано. Цифры для разговора у вас уже есть.'
        : 'Расписанием это не решить — поговорите с учителем: сколько времени задания должны занимать по задумке. Цифры для разговора у вас уже есть.';
    }

    var facts = [];
    facts.push(d.homework ? 'уроки ' + fmtTime(d.hwStart) + '–' + fmtTime(d.hwEnd) + ' (' + fmtDur(d.hwMin) + ')' : 'уроков не было');
    facts.push('сон с ' + fmtTime(d.sleepAt) + ' до ' + fmtTime(d.wakeAt));
    facts.push('сна по часам ' + fmtDur(d.sleepMin));

    return {
      ok: true,
      profile: d.grade + ' класс · ' + d.age + ' ' + yearsWord(d.age) + ' · ' + (d.shift === 1 ? 'первая' : 'вторая') + ' смена',
      facts: facts,
      issues: shown,
      moreIssues: issues.length - shown.length,
      allIssueIds: issues.map(function (i) { return i.id; }),
      checks: checks,
      allGood: allGood,
      headline: allGood ? ALL_GOOD_LINE : null,
      guiltLine: allGood ? null : GUILT_LINE,
      teacher: teacher,
      teacherNote: teacherNote,
      action: action,
      notices: notices,
      targetSleep: fmtTime(targetSleepAbs),
      numbers: {
        hwMin: d.hwMin, hwMaxMin: hwMax, hwAllowedMin: hwAllowed, sleepMin: d.sleepMin, sleepNormMin: sn.min,
        sleepAt: fmtTime(d.sleepAt), bedtimeLatest: fmtTime(latest), wakeAt: fmtTime(d.wakeAt)
      }
    };
  }

  function pickAction(shown, d, ctx) {
    var ids = shown.map(function (i) { return i.id; });
    function has(id) { return ids.indexOf(id) >= 0; }

    var target = fmtTime(ctx.targetSleepAbs);
    // Цель упирается в ориентир отбоя (а не в час подъёма)
    var bindsBedtime = ctx.targetSleepAbs === ctx.latest;
    // Уроки упираются в отбой: тогда «уснуть к …» сегодня нереально — сначала уроки.
    var hwBlocksSleep = ctx.teacher || (d.homework && d.hwEndAbs !== null && d.hwEndAbs >= ctx.targetSleepAbs);

    if (has('screen')) {
      // Час до сна считаем от более раннего из двух: вчерашнего засыпания и ориентира отбоя — поздний отбой не закрепляем.
      var bed = Math.min(d.sleepAbs, ctx.latest);
      return { id: 'screen', normIds: ['screen.before_sleep.mr'].concat(d.sleepAbs >= ctx.latest ? [ctx.bedId] : []),
        text: 'Сегодня уберите телефон, планшет и телевизор за час до сна: при отбое в ' + fmtTime(bed) +
          ' экраны выключить в ' + fmtTime(bed - NORMS.screenFreeBeforeSleepMin) + '.' };
    }
    if (has('hw_late_start')) {
      return { id: 'hw_late_start', normIds: ['hw.start.window', 'hw.start.rest'],
        text: ctx.clubEvening
          ? 'Сегодня попробуйте сесть за уроки до секции — между 16:00 и 18:00, после обеда и отдыха.'
          : 'Сегодня сядьте за уроки между 16:00 и 18:00, после обеда и полутора-двух часов отдыха. Вечер останется на ужин, прогулку и сон.' };
    }
    if (has('shift2_evening')) {
      return { id: 'shift2_evening', normIds: ['shift2.hw_morning', 'shift2.routine'],
        text: 'Перенесите уроки на утро: после завтрака, до школы. А вечер после второй смены оставьте на ужин, прогулку и сон.' };
    }
    if (has('sleep') && !hwBlocksSleep) {
      var avail = d.wakeAbs - ctx.targetSleepAbs;
      var sleepIds = ctx.sn.ids.concat(bindsBedtime || ctx.bedLate ? [ctx.bedId] : []);
      if (bindsBedtime) {
        // bedtime.g1-4 / g5-7 — МР п. 4.6: «ложиться спать не позднее»
        return { id: 'sleep', normIds: sleepIds,
          text: 'Сегодня цель — лечь спать к ' + target + ': это ориентир для ' + bedtimeBand(d.grade) + ', и до подъёма в ' +
            fmtTime(d.wakeAt) + ' выходит ' + fmtDur(avail) + '. Если сразу не получается, сдвигайте отбой к этому времени понемногу, вечер за вечером.' };
      }
      // Цель раньше ориентира отбоя — сна не хватает из-за часа подъёма. Нижнего порога для отбоя в базе нет,
      // поэтому называем оба рычага: отбой раньше или подъём позже (norms.md: «Подъём: отбой + норма сна»).
      var bedAbs = Math.min(d.sleepAbs, ctx.latest);
      return { id: 'sleep', normIds: sleepIds,
        text: 'Сегодня цель — уснуть к ' + target + ': при подъёме в ' + fmtTime(d.wakeAt) + ' так выходит ' + fmtDur(avail) +
          ' сна, как в ориентире. Второй рычаг — утро: если можно вставать позже, то при засыпании в ' + fmtTime(bedAbs) +
          ' для ' + fmtDur(ctx.sn.min) + ' сна подъём выходит в ' + fmtTime(bedAbs + ctx.sn.min) + '.' };
    }
    if (has('hw_early_start')) {
      return { id: 'hw_early_start', normIds: ['hw.start.rest', 'hw.start.window'],
        text: 'Сегодня после школы сначала обед и полтора-два часа отдыха, а за уроки — между 16:00 и 18:00.' };
    }
    if (has('hw_long') && !ctx.teacher) {
      return { id: 'hw_long', normIds: ['hw.block'],
        text: 'Сегодня разделите уроки на отрезки по 35–45 минут, а между ними — перерыв не меньше 10 минут.' };
    }
    if (has('hw_g1') && !ctx.teacher) {
      return { id: 'hw_g1', normIds: ['hw.g1.none'],
        text: 'Сегодня спокойно уточните у учителя, какие задания обязательны, а какие — по желанию.' };
    }
    if (has('club_late')) {
      return { id: 'club_late', normIds: ctx.clubIds.slice(),
        text: 'Сегодня загляните в расписание секции: нет ли группы, которая заканчивается до ' + fmtTime(ctx.clubLimit) + '.' };
    }
    if (ctx.teacher) {
      return { id: 'teacher', normIds: [],
        text: 'Сегодня просто запишите, сколько минут уходит на каждый предмет. С таким списком разговор с учителем пойдёт спокойно и по делу.' };
    }
    if (has('sleep')) {
      return { id: 'sleep', normIds: ctx.sn.ids.concat(bindsBedtime || ctx.bedLate ? [ctx.bedId] : []),
        text: 'Сегодня цель — ' + (bindsBedtime ? 'лечь спать к ' : 'уснуть к ') + target +
          '. Если уроки не дают, начните с того, чтобы садиться за них раньше.' };
    }
    return { id: 'keep', normIds: ['sleep.regular'],
      text: 'Держите те же часы и в выходные: ложиться и вставать в одно время. Так советуют методические рекомендации Роспотребнадзора.' };
  }

  function yearsWord(n) {
    var n10 = n % 10, n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return 'год';
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return 'года';
    return 'лет';
  }

  var api = {
    analyzeDay: analyzeDay,
    NORMS: NORMS,
    SOURCES: SOURCES,
    TOLERANCE_MIN: TOLERANCE_MIN,
    GUILT_LINE: GUILT_LINE,
    ALL_GOOD_LINE: ALL_GOOD_LINE,
    sleepNorm: sleepNorm,
    withBreaks: withBreaks,
    parseTime: parseTime,
    fmtTime: fmtTime,
    fmtDur: fmtDur
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else if (root) {
    root.Razbor = api;
    root.analyzeDay = analyzeDay;
  }
})(typeof window !== 'undefined' ? window : this);

(function () {
  "use strict";
  const T = window.TimeKit;
  const $ = function (selector, root) { return (root || document).querySelector(selector); };
  const $$ = function (selector, root) { return Array.from((root || document).querySelectorAll(selector)); };

  function setStatus(element, message, tone) {
    if (!element) return;
    element.textContent = message;
    if (tone) element.dataset.tone = tone;
    else delete element.dataset.tone;
  }

  function formatTimer(seconds) {
    const safe = Math.max(0, Math.ceil(seconds));
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const remaining = safe % 60;
    if (hours > 0) return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
    return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
  }

  function createTimer(initialSeconds, onTick, onComplete) {
    let remaining = Math.max(0, Number(initialSeconds) || 0);
    let endAt = 0;
    let interval = null;
    const paint = function () { onTick(remaining); };
    const tick = function () {
      remaining = Math.max(0, (endAt - Date.now()) / 1000);
      paint();
      if (remaining <= 0) {
        clearInterval(interval);
        interval = null;
        onComplete();
      }
    };
    return {
      get running() { return interval !== null; },
      get remaining() { return remaining; },
      set remaining(value) { remaining = Math.max(0, Number(value) || 0); paint(); },
      start: function () {
        if (remaining <= 0) return;
        endAt = Date.now() + remaining * 1000;
        clearInterval(interval);
        interval = window.setInterval(tick, 180);
        paint();
      },
      pause: function () {
        if (interval === null) return;
        tick();
        clearInterval(interval);
        interval = null;
        paint();
      },
      reset: function (seconds) {
        clearInterval(interval);
        interval = null;
        remaining = Math.max(0, Number(seconds) || 0);
        paint();
      }
    };
  }

  function initClockPage() {
    const display = $("[data-clock-display]");
    const date = $("[data-clock-date]");
    const weekday = $("[data-clock-weekday]");
    const formatButton = $("[data-clock-format]");
    let hour12 = localStorage.getItem("timekit-clock-format") === "12";
    const paint = function () {
      const now = new Date();
      if (display) display.textContent = T.formatTime(now, T.tehranZone, hour12);
      if (date) date.textContent = T.formatPersianDate(now, { year: "numeric", month: "long", day: "numeric" });
      if (weekday) weekday.textContent = new Intl.DateTimeFormat("fa-IR", { timeZone: T.tehranZone, weekday: "long" }).format(now);
      if (formatButton) formatButton.textContent = hour12 ? "نمایش ۲۴ ساعته" : "نمایش ۱۲ ساعته";
    };
    if (formatButton) formatButton.addEventListener("click", function () { hour12 = !hour12; localStorage.setItem("timekit-clock-format", hour12 ? "12" : "24"); paint(); });
    const copyButton = $("[data-copy-clock]");
    if (copyButton) copyButton.addEventListener("click", function () { T.copyText(display ? display.textContent : "", "زمان کپی شد"); });
    paint();
    window.setInterval(paint, 1000);
  }

  function initTodayPage() {
    const now = new Date();
    const jalali = $("[data-today-jalali]");
    const gregorian = $("[data-today-gregorian]");
    const weekday = $("[data-today-weekday]");
    const dayOfYear = $("[data-day-of-year]");
    if (jalali) jalali.textContent = T.formatPersianDate(now, { year: "numeric", month: "long", day: "numeric" });
    if (gregorian) gregorian.textContent = T.formatGregorianDate(now, { year: "numeric", month: "long", day: "numeric" });
    if (weekday) weekday.textContent = new Intl.DateTimeFormat("fa-IR", { timeZone: T.tehranZone, weekday: "long" }).format(now);
    if (dayOfYear) {
      const start = Date.UTC(now.getUTCFullYear(), 0, 1);
      dayOfYear.textContent = T.formatNumber(Math.floor((Date.now() - start) / 86400000) + 1);
    }
    const copyJalali = $("[data-copy-today-jalali]");
    const copyGregorian = $("[data-copy-today-gregorian]");
    if (copyJalali) copyJalali.addEventListener("click", function () { T.copyText(jalali.textContent, "تاریخ شمسی کپی شد"); });
    if (copyGregorian) copyGregorian.addEventListener("click", function () { T.copyText(gregorian.textContent, "تاریخ میلادی کپی شد"); });
  }

  function initConverterPage() {
    const form = $("[data-converter-form]");
    if (!form) return;
    const directionInputs = $$('input[name="converter-direction"]', form);
    const jalaliFields = $("[data-jalali-fields]", form);
    const gregorianFields = $("[data-gregorian-fields]", form);
    const result = $("[data-converter-result]");
    const resultDetail = $("[data-converter-detail]");
    const gregorianInput = $("[name=gregorian]", form);
    if (gregorianInput && !gregorianInput.value) gregorianInput.value = T.localDateISO(new Date());
    const toggle = function () {
      const jalaliToGregorian = $("input[name=converter-direction]:checked", form).value === "jalali-to-gregorian";
      jalaliFields.hidden = !jalaliToGregorian;
      gregorianFields.hidden = jalaliToGregorian;
    };
    directionInputs.forEach(function (input) { input.addEventListener("change", toggle); });
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      try {
        const jalaliToGregorian = $("input[name=converter-direction]:checked", form).value === "jalali-to-gregorian";
        let output;
        let date;
        if (jalaliToGregorian) {
          const y = Number($("[name=jy]", form).value);
          const m = Number($("[name=jm]", form).value);
          const d = Number($("[name=jd]", form).value);
          const g = T.toGregorian(y, m, d);
          output = `${g.year}/${String(g.month).padStart(2, "0")}/${String(g.day).padStart(2, "0")}`;
          date = new Date(Date.UTC(g.year, g.month - 1, g.day));
          resultDetail.textContent = `${T.weekdayForUTCDate(date)} · ${T.formatGregorianDate(date, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })}`;
        } else {
          const dateInput = $("[name=gregorian]", form).value;
          date = T.parseDateInput(dateInput);
          if (!date) throw new RangeError("تاریخ میلادی معتبر نیست");
          const j = T.toJalali(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
          output = T.jalaliLabel(j.year, j.month, j.day);
          resultDetail.textContent = `${T.weekdayForUTCDate(date)} · ${dateInput}`;
        }
        result.textContent = output;
        setStatus($("[data-converter-status]"), "تبدیل با موفقیت انجام شد", "success");
      } catch (error) {
        result.textContent = "—";
        setStatus($("[data-converter-status]"), error.message || "تاریخ واردشده معتبر نیست", "danger");
      }
    });
    const copy = $("[data-copy-converter]");
    if (copy) copy.addEventListener("click", function () { T.copyText(result.textContent, "نتیجه کپی شد"); });
    toggle();
  }

  function initTimerPage() {
    const display = $("[data-timer-display]");
    const minutes = $("[name=timer-minutes]");
    const seconds = $("[name=timer-seconds]");
    const start = $("[data-timer-start]");
    const reset = $("[data-timer-reset]");
    const status = $("[data-timer-status]");
    if (!display || !start) return;
    const readInput = function () {
      const min = Math.max(0, Math.min(999, Number(minutes && minutes.value) || 0));
      const sec = Math.max(0, Math.min(59, Number(seconds && seconds.value) || 0));
      return min * 60 + sec;
    };
    const timer = createTimer(readInput() || 1500, function (remaining) { display.textContent = formatTimer(remaining); }, function () {
      start.textContent = "شروع";
      setStatus(status, "زمان به پایان رسید", "success");
      if (navigator.vibrate) navigator.vibrate([140, 80, 140]);
      try {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (Context) { const context = new Context(); const oscillator = context.createOscillator(); const gain = context.createGain(); oscillator.frequency.value = 740; gain.gain.value = .08; oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + .22); oscillator.onended = function () { context.close(); }; }
      } catch (error) { /* Audio can be blocked until a user gesture. */ }
    });
    const resetTimer = function () { timer.reset(readInput() || 1500); start.textContent = "شروع"; setStatus(status, "آماده شروع", "info"); };
    start.addEventListener("click", function () {
      if (timer.running) { timer.pause(); start.textContent = "ادامه"; setStatus(status, "تایمر متوقف شده", "info"); }
      else { if (timer.remaining <= 0) timer.reset(readInput() || 1500); timer.start(); start.textContent = "توقف"; setStatus(status, "تایمر در حال اجراست", "info"); }
    });
    if (reset) reset.addEventListener("click", resetTimer);
    [minutes, seconds].filter(Boolean).forEach(function (input) { input.addEventListener("change", function () { if (!timer.running) resetTimer(); }); });
    $$('[data-timer-preset]').forEach(function (button) {
      button.addEventListener("click", function () {
        const value = Number(button.dataset.timerPreset);
        if (minutes) minutes.value = Math.floor(value / 60);
        if (seconds) seconds.value = value % 60;
        resetTimer();
      });
    });
    resetTimer();
  }

  function initStopwatchPage() {
    const display = $("[data-stopwatch-display]");
    const start = $("[data-stopwatch-start]");
    const lap = $("[data-stopwatch-lap]");
    const reset = $("[data-stopwatch-reset]");
    const list = $("[data-lap-list]");
    if (!display || !start) return;
    let elapsed = 0;
    let startedAt = 0;
    let interval = null;
    let lapCount = 0;
    const getElapsed = function () { return elapsed + (interval ? performance.now() - startedAt : 0); };
    const format = function (ms) { const centiseconds = Math.floor(ms / 10) % 100; const seconds = Math.floor(ms / 1000) % 60; const minutes = Math.floor(ms / 60000); return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`; };
    const paint = function () { display.textContent = format(getElapsed()); };
    start.addEventListener("click", function () {
      if (interval) {
        elapsed = getElapsed(); clearInterval(interval); interval = null; start.textContent = "ادامه"; if (lap) lap.disabled = true;
      } else {
        startedAt = performance.now(); interval = window.setInterval(paint, 40); start.textContent = "توقف"; if (lap) lap.disabled = false;
      }
      paint();
    });
    if (lap) lap.addEventListener("click", function () {
      if (!interval || !list) return;
      lapCount += 1;
      const row = document.createElement("tr");
      const number = document.createElement("td");
      const value = document.createElement("td");
      number.textContent = T.formatNumber(lapCount);
      value.textContent = format(getElapsed());
      row.append(number, value);
      list.prepend(row);
    });
    if (reset) reset.addEventListener("click", function () { clearInterval(interval); interval = null; elapsed = 0; lapCount = 0; start.textContent = "شروع"; if (lap) lap.disabled = true; if (list) list.replaceChildren(); paint(); });
    const copy = $("[data-copy-stopwatch]");
    if (copy) copy.addEventListener("click", function () { T.copyText(display.textContent, "زمان کرنومتر کپی شد"); });
    paint();
  }

  function initNowruzPage() {
    const display = $("[data-nowruz-display]");
    const label = $("[data-nowruz-label-page]");
    const moment = $("[data-nowruz-moment]");
    const date = $("[data-nowruz-date]");
    const update = function () {
      const target = T.getNextNowruz(new Date());
      const parts = T.formatDuration((target.date.getTime() - Date.now()) / 1000);
      ["days", "hours", "minutes", "seconds"].forEach(function (key) {
        const el = $("[data-nowruz-" + key + "]");
        if (el) el.textContent = T.formatNumber(parts[key]);
      });
      if (display) display.dataset.target = target.iso;
      if (label) label.textContent = target.label;
      if (moment) moment.textContent = `${T.formatGregorianDate(target.date, { timeZone: T.tehranZone, weekday: "long", year: "numeric", month: "long", day: "numeric" })} · ${T.formatTime(target.date, T.tehranZone, false)} به وقت تهران`;
      if (date) date.textContent = T.formatPersianDate(target.date, { timeZone: T.tehranZone, year: "numeric", month: "long", day: "numeric" });
    };
    update();
    window.setInterval(update, 1000);
  }

  function initCustomCountdownPage() {
    const form = $("[data-countdown-form]");
    const display = $("[data-countdown-display]");
    const eventLabel = $("[data-countdown-event]");
    const status = $("[data-countdown-status]");
    const storageKey = "timekit-countdown-event";
    if (!form || !display) return;
    let target = null;
    const eventNameInput = $("[name=event-name]", form);
    const dateInput = $("[name=event-date]", form);
    const save = function () {
      if (!eventNameInput.value.trim() || !dateInput.value) return;
      const data = { name: eventNameInput.value.trim(), date: dateInput.value };
      localStorage.setItem(storageKey, JSON.stringify(data));
      target = new Date(data.date);
      eventLabel.textContent = data.name;
      setStatus(status, "شمارش معکوس ذخیره شد", "success");
    };
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try { const data = JSON.parse(saved); eventNameInput.value = data.name || ""; dateInput.value = data.date || ""; target = new Date(data.date); eventLabel.textContent = data.name || "رویداد شما"; } catch (error) { /* Ignore malformed local data. */ }
    }
    const hash = location.hash.startsWith("#event=") ? location.hash.slice(7) : "";
    if (hash) {
      try { const data = JSON.parse(decodeURIComponent(atob(hash))); eventNameInput.value = data.name || ""; dateInput.value = data.date || ""; target = new Date(data.date); eventLabel.textContent = data.name || "رویداد شما"; } catch (error) { /* Ignore an invalid shared link. */ }
    }
    form.addEventListener("submit", function (event) { event.preventDefault(); if (!eventNameInput.value.trim() || !dateInput.value || Number.isNaN(new Date(dateInput.value).getTime())) { setStatus(status, "نام رویداد و تاریخ را کامل کنید", "danger"); return; } save(); });
    const share = $("[data-countdown-share]");
    if (share) share.addEventListener("click", function () { if (!target) { setStatus(status, "ابتدا رویداد را ذخیره کنید", "danger"); return; } const data = { name: eventNameInput.value.trim(), date: dateInput.value }; const link = location.href.split("#")[0] + "#event=" + btoa(encodeURIComponent(JSON.stringify(data))); T.copyText(link, "لینک اشتراک‌گذاری کپی شد"); });
    const reset = $("[data-countdown-reset]");
    if (reset) reset.addEventListener("click", function () { localStorage.removeItem(storageKey); form.reset(); target = null; eventLabel.textContent = "رویداد شما"; ["days", "hours", "minutes", "seconds"].forEach(function (key) { const el = $("[data-countdown-" + key + "]"); if (el) el.textContent = "—"; }); setStatus(status, "رویداد پاک شد", "info"); });
    const update = function () {
      if (!target || Number.isNaN(target.getTime())) return;
      const parts = T.formatDuration((target.getTime() - Date.now()) / 1000);
      ["days", "hours", "minutes", "seconds"].forEach(function (key) { const el = $("[data-countdown-" + key + "]"); if (el) el.textContent = T.formatNumber(parts[key]); });
      setStatus(status, target.getTime() > Date.now() ? "در حال شمارش تا زمان رویداد" : "این رویداد به پایان رسیده است", target.getTime() > Date.now() ? "info" : "success");
    };
    update();
    window.setInterval(update, 1000);
  }

  function readCalendarDate(form, prefix, calendar) {
    if (calendar === "jalali") {
      const year = Number($("[name=" + prefix + "-year]", form).value);
      const month = Number($("[name=" + prefix + "-month]", form).value);
      const day = Number($("[name=" + prefix + "-day]", form).value);
      if (!T.isValidJalaliDate(year, month, day)) throw new RangeError("تاریخ شمسی معتبر نیست");
      const g = T.toGregorian(year, month, day);
      return { calendar, year, month, day, date: new Date(Date.UTC(g.year, g.month - 1, g.day)) };
    }
    const input = $("[name=" + prefix + "-date]", form).value;
    const date = T.parseDateInput(input);
    if (!date) throw new RangeError("تاریخ میلادی معتبر نیست");
    return { calendar, year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate(), date };
  }

  function compareParts(a, b) {
    if (a.year !== b.year) return a.year - b.year;
    if (a.month !== b.month) return a.month - b.month;
    return a.day - b.day;
  }

  function addPart(part, calendar, unit) {
    let year = part.year;
    let month = part.month;
    let day = part.day;
    if (unit === "year") { year += 1; }
    if (unit === "month") { month += 1; if (month > 12) { month = 1; year += 1; } }
    if (calendar === "jalali") day = Math.min(day, T.jalaliMonthLength(year, month));
    else {
      const max = new Date(Date.UTC(year, month, 0)).getUTCDate();
      day = Math.min(day, max);
    }
    return { year, month, day, date: calendar === "jalali" ? (() => { const g = T.toGregorian(year, month, day); return new Date(Date.UTC(g.year, g.month - 1, g.day)); })() : new Date(Date.UTC(year, month - 1, day)) };
  }

  function initDateDifferencePage() {
    const form = $("[data-difference-form]");
    if (!form) return;
    const calendar = $("[name=difference-calendar]", form);
    const groups = $$('[data-calendar-fields]', form);
    const toggle = function () { groups.forEach(function (group) { group.hidden = group.dataset.calendarFields !== calendar.value; }); };
    calendar.addEventListener("change", toggle);
    const result = $("[data-difference-result]");
    const detail = $("[data-difference-detail]");
    const fromInput = $("[name=from-date]", form);
    const toInput = $("[name=to-date]", form);
    if (fromInput && !fromInput.value) fromInput.value = T.localDateISO(new Date());
    if (toInput && !toInput.value) {
      const future = new Date();
      future.setDate(future.getDate() + 30);
      toInput.value = T.localDateISO(future);
    }
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      try {
        const from = readCalendarDate(form, "from", calendar.value);
        const to = readCalendarDate(form, "to", calendar.value);
        let start = from;
        let end = to;
        if (compareParts(start, end) > 0) { start = to; end = from; }
        const days = Math.round((end.date - start.date) / 86400000);
        let cursor = { year: start.year, month: start.month, day: start.day, date: start.date };
        let years = 0;
        while (compareParts(addPart(cursor, calendar.value, "year"), end) <= 0) { cursor = addPart(cursor, calendar.value, "year"); years += 1; }
        let months = 0;
        while (compareParts(addPart(cursor, calendar.value, "month"), end) <= 0) { cursor = addPart(cursor, calendar.value, "month"); months += 1; }
        const remainder = Math.round((end.date - cursor.date) / 86400000);
        result.textContent = `${T.formatNumber(days)} روز`;
        detail.textContent = `${T.formatNumber(years)} سال، ${T.formatNumber(months)} ماه و ${T.formatNumber(remainder)} روز · ${T.formatNumber((days / 7).toFixed(2))} هفته`;
        setStatus($("[data-difference-status]"), "فاصله با موفقیت محاسبه شد", "success");
      } catch (error) {
        result.textContent = "—";
        detail.textContent = "";
        setStatus($("[data-difference-status]"), error.message || "ورودی‌ها را بررسی کنید", "danger");
      }
    });
    toggle();
  }

  function initDateAddPage() {
    const form = $("[data-date-add-form]");
    if (!form) return;
    const calendar = $("[name=add-calendar]", form);
    const fields = $$('[data-add-calendar-fields]', form);
    const toggle = function () { fields.forEach(function (field) { field.hidden = field.dataset.addCalendarFields !== calendar.value; }); };
    calendar.addEventListener("change", toggle);
    const result = $("[data-date-add-result]");
    const detail = $("[data-date-add-detail]");
    const addDate = $("[name=add-date]", form);
    if (addDate && !addDate.value) addDate.value = T.localDateISO(new Date());
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      try {
        let source;
        if (calendar.value === "jalali") {
          const year = Number($("[name=add-year]", form).value);
          const month = Number($("[name=add-month]", form).value);
          const day = Number($("[name=add-day]", form).value);
          if (!T.isValidJalaliDate(year, month, day)) throw new RangeError("تاریخ شمسی معتبر نیست");
          const g = T.toGregorian(year, month, day);
          source = { year, month, day, date: new Date(Date.UTC(g.year, g.month - 1, g.day)) };
        } else {
          const date = T.parseDateInput($("[name=add-date]", form).value);
          if (!date) throw new RangeError("تاریخ میلادی معتبر نیست");
          source = { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate(), date };
        }
        const amount = Math.min(1000000, Math.max(0, Number($("[name=add-days]", form).value) || 0));
        const sign = $("[name=add-operation]:checked", form).value === "subtract" ? -1 : 1;
        const finalDate = new Date(source.date.getTime() + sign * amount * 86400000);
        if (calendar.value === "jalali") {
          const j = T.toJalali(finalDate.getUTCFullYear(), finalDate.getUTCMonth() + 1, finalDate.getUTCDate());
          result.textContent = T.jalaliLabel(j.year, j.month, j.day);
        } else {
          result.textContent = `${finalDate.getUTCFullYear()}/${String(finalDate.getUTCMonth() + 1).padStart(2, "0")}/${String(finalDate.getUTCDate()).padStart(2, "0")}`;
        }
        const other = T.toJalali(finalDate.getUTCFullYear(), finalDate.getUTCMonth() + 1, finalDate.getUTCDate());
        detail.textContent = `${T.jalaliLabel(other.year, other.month, other.day)} · ${T.formatGregorianDate(finalDate, { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" })}`;
        setStatus($("[data-date-add-status]"), "تاریخ نهایی محاسبه شد", "success");
      } catch (error) {
        result.textContent = "—";
        detail.textContent = "";
        setStatus($("[data-date-add-status]"), error.message || "ورودی‌ها را بررسی کنید", "danger");
      }
    });
    toggle();
  }

  const worldCities = [
    { id: "tehran", name: "تهران", flag: "🇮🇷", zone: "Asia/Tehran" },
    { id: "london", name: "لندن", flag: "🇬🇧", zone: "Europe/London" },
    { id: "new-york", name: "نیویورک", flag: "🇺🇸", zone: "America/New_York" },
    { id: "tokyo", name: "توکیو", flag: "🇯🇵", zone: "Asia/Tokyo" },
    { id: "berlin", name: "برلین", flag: "🇩🇪", zone: "Europe/Berlin" },
    { id: "dubai", name: "دبی", flag: "🇦🇪", zone: "Asia/Dubai" },
    { id: "sydney", name: "سیدنی", flag: "🇦🇺", zone: "Australia/Sydney" },
    { id: "singapore", name: "سنگاپور", flag: "🇸🇬", zone: "Asia/Singapore" }
  ];

  function initWorldClockPage() {
    const grid = $("[data-city-grid]");
    if (!grid) return;
    const select = $("[data-city-select]");
    worldCities.forEach(function (city) {
      if (select) { const option = document.createElement("option"); option.value = city.id; option.textContent = city.name; select.append(option); }
    });
    const selected = new Set(["tehran", "london", "new-york", "tokyo"]);
    const render = function () {
      grid.replaceChildren();
      worldCities.filter(function (city) { return selected.has(city.id); }).forEach(function (city) {
        const article = document.createElement("article"); article.className = "city-card";
        const name = document.createElement("strong"); name.textContent = city.flag + " " + city.name;
        const time = document.createElement("div"); time.className = "city-time"; time.dataset.cityZone = city.zone;
        const date = document.createElement("small"); date.dataset.cityDateZone = city.zone;
        const offset = document.createElement("span"); offset.className = "zone-offset"; offset.dataset.cityOffset = city.zone;
        article.append(name, time, date, offset); grid.append(article);
      });
    };
    if (select) select.addEventListener("change", function () { if (selected.has(select.value)) return; selected.add(select.value); render(); });
    const paint = function () {
      const now = new Date();
      $$('[data-city-zone]', grid).forEach(function (el) { el.textContent = T.formatTime(now, el.dataset.cityZone, false); });
      $$('[data-city-date-zone]', grid).forEach(function (el) { el.textContent = new Intl.DateTimeFormat("fa-IR-u-ca-gregory", { timeZone: el.dataset.cityDateZone, weekday: "short", month: "short", day: "numeric" }).format(now); });
      $$('[data-city-offset]', grid).forEach(function (el) { const value = new Intl.DateTimeFormat("en-US", { timeZone: el.dataset.cityOffset, timeZoneName: "shortOffset", hour: "2-digit" }).formatToParts(now).find(function (part) { return part.type === "timeZoneName"; }); el.textContent = value ? value.value.replace("GMT", "UTC") : ""; });
    };
    render(); paint(); window.setInterval(paint, 1000);
  }

  function initPomodoroPage() {
    const display = $("[data-pomodoro-display]");
    const phaseLabel = $("[data-pomodoro-phase]");
    const start = $("[data-pomodoro-start]");
    const reset = $("[data-pomodoro-reset]");
    const status = $("[data-pomodoro-status]");
    if (!display || !start) return;
    const focusInput = $("[name=focus-minutes]");
    const shortInput = $("[name=short-minutes]");
    const longInput = $("[name=long-minutes]");
    let phase = "focus";
    let completed = Number(localStorage.getItem("timekit-pomodoro-completed") || 0);
    let timer;
    const phaseMinutes = function (name) { if (name === "short") return Math.max(1, Number(shortInput.value) || 5); if (name === "long") return Math.max(1, Number(longInput.value) || 15); return Math.max(1, Number(focusInput.value) || 25); };
    const phaseName = function (name) { return name === "focus" ? "تمرکز" : name === "short" ? "استراحت کوتاه" : "استراحت بلند"; };
    const nextPhase = function () { if (phase === "focus") { completed += 1; localStorage.setItem("timekit-pomodoro-completed", String(completed)); phase = completed % 4 === 0 ? "long" : "short"; } else phase = "focus"; };
    const paint = function (remaining) { display.textContent = formatTimer(remaining); phaseLabel.textContent = phaseName(phase); const count = $("[data-pomodoro-count]"); if (count) count.textContent = T.formatNumber(completed); };
    const completedPhase = function () { nextPhase(); timer.reset(phaseMinutes(phase) * 60); start.textContent = "شروع"; setStatus(status, `مرحله بعدی: ${phaseName(phase)}`, "success"); };
    timer = createTimer(phaseMinutes(phase) * 60, paint, completedPhase);
    start.addEventListener("click", function () { if (timer.running) { timer.pause(); start.textContent = "ادامه"; setStatus(status, "مرحله متوقف شده", "info"); } else { if (timer.remaining <= 0) timer.reset(phaseMinutes(phase) * 60); timer.start(); start.textContent = "توقف"; setStatus(status, `در حال ${phaseName(phase)}`, "info"); } });
    if (reset) reset.addEventListener("click", function () { phase = "focus"; timer.reset(phaseMinutes(phase) * 60); start.textContent = "شروع"; setStatus(status, "آماده شروع", "info"); });
    [focusInput, shortInput, longInput].filter(Boolean).forEach(function (input) { input.addEventListener("change", function () { if (!timer.running) timer.reset(phaseMinutes(phase) * 60); }); });
    paint(timer.remaining);
  }

  const handlers = {
    "tehran-clock": initClockPage,
    today: initTodayPage,
    "date-converter": initConverterPage,
    timer: initTimerPage,
    stopwatch: initStopwatchPage,
    nowruz: initNowruzPage,
    countdown: initCustomCountdownPage,
    "date-difference": initDateDifferencePage,
    "date-add": initDateAddPage,
    "world-clock": initWorldClockPage,
    pomodoro: initPomodoroPage
  };

  document.addEventListener("DOMContentLoaded", function () {
    const handler = handlers[document.body.dataset.toolPage];
    if (handler) handler();
  });
}());

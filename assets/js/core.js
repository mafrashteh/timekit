(function () {
  "use strict";

  const monthNames = [
    "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
  ];
  const weekNames = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه"];
  const persianNumber = new Intl.NumberFormat("fa-IR");
  const gregorianNumber = new Intl.NumberFormat("en-US");
  const tehranZone = "Asia/Tehran";
  const storageKey = "timekit-theme";

  function mod(a, b) {
    return a - div(a, b) * b;
  }

  function div(a, b) {
    return Math.trunc(a / b);
  }

  // The algorithm is the well-known astronomical Jalali conversion used by jalaali-js.
  const jalaliBreaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

  function jalaliCalendar(jy) {
    const breaks = jalaliBreaks;
    const bl = breaks.length;
    const gy = jy + 621;
    let leapJ = -14;
    let jp = breaks[0];
    let jm = 0;
    let jump = 0;
    let leap = 0;
    let n = 0;

    if (jy < jp || jy >= breaks[bl - 1]) {
      throw new RangeError("Jalali year is outside the supported range");
    }
    for (let i = 1; i < bl; i += 1) {
      jm = breaks[i];
      jump = jm - jp;
      if (jy < jm) break;
      leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4);
      jp = jm;
    }
    n = jy - jp;
    leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
    if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

    const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
    const march = 20 + leapJ - leapG;
    if (jump - n < 6) n -= jump + div(jump + 4, 33) * 33;
    leap = mod(mod(n + 1, 33) - 1, 4);
    if (leap === -1) leap = 4;
    return { leap, gy, march };
  }

  function gregorianToJdn(gy, gm, gd) {
    let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4);
    d += div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
    d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
    return d;
  }

  function jdnToGregorian(jdn) {
    let j = 4 * jdn + 139361631;
    j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
    const i = div(mod(j, 1461), 4) * 5 + 308;
    const gd = div(mod(i, 153), 5) + 1;
    const gm = mod(div(i, 153), 12) + 1;
    const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
    return { gy, gm, gd };
  }

  function jalaliToJdn(jy, jm, jd) {
    const r = jalaliCalendar(jy);
    return gregorianToJdn(r.gy, 3, r.march) + (jm <= 7 ? (jm - 1) * 31 : (jm - 1) * 30 + 6) + jd - 1;
  }

  function jdnToJalali(jdn) {
    const g = jdnToGregorian(jdn);
    let jy = g.gy - 621;
    const r = jalaliCalendar(jy);
    const jdn1f = gregorianToJdn(g.gy, 3, r.march);
    let k = jdn - jdn1f;
    let jm;
    let jd;

    if (k >= 0) {
      if (k <= 185) {
        jm = 1 + div(k, 31);
        jd = mod(k, 31) + 1;
      } else {
        k -= 186;
        jm = 7 + div(k, 30);
        jd = mod(k, 30) + 1;
      }
      return { jy, jm, jd };
    }

    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
    jm = 7 + div(k, 30);
    jd = mod(k, 30) + 1;
    return { jy, jm, jd };
  }

  function isLeapJalali(jy) {
    return jalaliCalendar(jy).leap === 0;
  }

  function jalaliMonthLength(jy, jm) {
    if (jm < 1 || jm > 12) return 0;
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    return isLeapJalali(jy) ? 30 : 29;
  }

  function isValidJalaliDate(jy, jm, jd) {
    return Number.isInteger(jy) && Number.isInteger(jm) && Number.isInteger(jd) && jm >= 1 && jm <= 12 && jd >= 1 && jd <= jalaliMonthLength(jy, jm);
  }

  function toGregorian(jy, jm, jd) {
    if (!isValidJalaliDate(jy, jm, jd)) throw new RangeError("Invalid Jalali date");
    const g = jdnToGregorian(jalaliToJdn(jy, jm, jd));
    return { year: g.gy, month: g.gm, day: g.gd };
  }

  function toJalali(gy, gm, gd) {
    const j = jdnToJalali(gregorianToJdn(gy, gm, gd));
    return { year: j.jy, month: j.jm, day: j.jd };
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function formatNumber(value) {
    return persianNumber.format(value);
  }

  function formatGregorianDate(date, options) {
    return new Intl.DateTimeFormat("fa-IR-u-ca-gregory", Object.assign({ timeZone: tehranZone }, options || {})).format(date);
  }

  function formatPersianDate(date, options) {
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", Object.assign({ timeZone: tehranZone }, options || {})).format(date);
  }

  function formatTime(date, timeZone, hour12) {
    return new Intl.DateTimeFormat("fa-IR", {
      timeZone: timeZone || tehranZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: hour12 ? undefined : "h23",
      hour12: Boolean(hour12)
    }).format(date);
  }

  function formatTimeShort(date, timeZone) {
    return new Intl.DateTimeFormat("fa-IR", { timeZone: timeZone || tehranZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
  }

  function formatDateInput(date) {
    return date.getUTCFullYear() + "-" + pad(date.getUTCMonth() + 1) + "-" + pad(date.getUTCDate());
  }

  function parseDateInput(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return date;
  }

  function dateToJalaliLabel(date) {
    const j = toJalali(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
    return `${formatNumber(j.year)} ${monthNames[j.month - 1]} ${formatNumber(j.day)}`;
  }

  function jalaliLabel(year, month, day) {
    return `${formatNumber(year)} ${monthNames[month - 1]} ${formatNumber(day)}`;
  }

  function weekdayForUTCDate(date) {
    return weekNames[date.getUTCDay()];
  }

  function formatDuration(totalSeconds) {
    const safe = Math.max(0, Math.floor(totalSeconds));
    const days = Math.floor(safe / 86400);
    const hours = Math.floor((safe % 86400) / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const seconds = safe % 60;
    return { days, hours, minutes, seconds };
  }

  function localDateISO(date) {
    return formatDateInput(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())));
  }

  function copyText(text, successMessage) {
    const done = function () {
      showToast(successMessage || "در کلیپ‌بورد کپی شد");
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try { document.execCommand("copy"); } catch (error) { /* Clipboard permissions can fail on local previews. */ }
    area.remove();
    done();
  }

  let toastTimer;
  function showToast(message) {
    let toast = document.querySelector(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      toast.setAttribute("role", "status");
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("is-visible"); }, 2400);
  }

  function initTheme() {
    const saved = localStorage.getItem(storageKey);
    const preferred = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    document.documentElement.dataset.theme = saved || preferred;
    const themeButton = document.querySelector("[data-theme-toggle]");
    if (!themeButton) return;
    const updateLabel = function () {
      const light = document.documentElement.dataset.theme === "light";
      themeButton.setAttribute("aria-label", light ? "فعال کردن حالت تاریک" : "فعال کردن حالت روشن");
      themeButton.textContent = light ? "☾" : "☼";
    };
    updateLabel();
    themeButton.addEventListener("click", function () {
      const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      localStorage.setItem(storageKey, next);
      updateLabel();
    });
  }

  function initNavigation() {
    const menuButton = document.querySelector("[data-menu-toggle]");
    const nav = document.querySelector(".main-nav");
    if (!menuButton || !nav) return;
    menuButton.addEventListener("click", function () {
      const open = nav.classList.toggle("is-open");
      document.body.classList.toggle("is-menu-open", open);
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.textContent = open ? "×" : "☰";
    });
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("is-open");
        document.body.classList.remove("is-menu-open");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.textContent = "☰";
      });
    });
  }

  function initShared() {
    initTheme();
    initNavigation();
    document.querySelectorAll("[data-copy-value]").forEach(function (button) {
      button.addEventListener("click", function () { copyText(button.dataset.copyValue, button.dataset.copyMessage); });
    });
    document.querySelectorAll("[data-fullscreen]").forEach(function (button) {
      button.addEventListener("click", function () {
        const target = document.querySelector(button.dataset.fullscreen);
        if (!target) return;
        target.classList.toggle("fullscreen-active");
        button.textContent = target.classList.contains("fullscreen-active") ? "خروج از تمام‌صفحه" : "تمام‌صفحه";
      });
    });
  }

  // Astronomical equinox moments in Tehran local time, sourced from Persian Calendar.
  const nowruzMoments = [
    { year: 1406, iso: "2027-03-20T20:24:41Z", label: "نوروز ۱۴۰۶" },
    { year: 1407, iso: "2028-03-20T02:17:08Z", label: "نوروز ۱۴۰۷" },
    { year: 1408, iso: "2029-03-20T08:01:59Z", label: "نوروز ۱۴۰۸" },
    { year: 1409, iso: "2030-03-20T13:52:06Z", label: "نوروز ۱۴۰۹" }
  ];

  function getNextNowruz(now) {
    const current = now || new Date();
    let next = nowruzMoments.find(function (item) { return new Date(item.iso) > current; });
    if (!next) {
      // The static table is intentionally finite. Fall back to the next Persian New Year at midnight
      // only after the published table has ended, so the countdown remains functional.
      const year = toJalali(current.getUTCFullYear(), current.getUTCMonth() + 1, current.getUTCDate()).year + 1;
      const g = toGregorian(year, 1, 1);
      next = { year, iso: new Date(Date.UTC(g.year, g.month - 1, g.day, 20, 30)).toISOString(), label: `نوروز ${formatNumber(year)}` };
    }
    return Object.assign({}, next, { date: new Date(next.iso) });
  }

  window.TimeKit = {
    monthNames,
    weekNames,
    tehranZone,
    nowruzMoments,
    getNextNowruz,
    toGregorian,
    toJalali,
    isValidJalaliDate,
    jalaliMonthLength,
    isLeapJalali,
    formatNumber,
    formatGregorianDate,
    formatPersianDate,
    formatTime,
    formatTimeShort,
    formatDateInput,
    parseDateInput,
    dateToJalaliLabel,
    jalaliLabel,
    weekdayForUTCDate,
    formatDuration,
    localDateISO,
    copyText,
    showToast,
    initShared,
    pad,
    gregorianNumber
  };

  document.addEventListener("DOMContentLoaded", initShared);
}());

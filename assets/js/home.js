(function () {
  "use strict";
  const T = window.TimeKit;
  const $ = function (selector) { return document.querySelector(selector); };

  function updateHomeClock() {
    const now = new Date();
    const hour12 = document.documentElement.dataset.clockFormat === "12";
    const time = T.formatTime(now, T.tehranZone, hour12);
    document.querySelectorAll("[data-live-clock]").forEach(function (element) { element.textContent = time; });
    document.querySelectorAll("[data-live-persian-date]").forEach(function (element) { element.textContent = T.formatPersianDate(now, { weekday: "long", year: "numeric", month: "long", day: "numeric" }); });
    document.querySelectorAll("[data-live-gregorian-date]").forEach(function (element) { element.textContent = T.formatGregorianDate(now, { year: "numeric", month: "long", day: "numeric" }); });
    document.querySelectorAll("[data-live-weekday]").forEach(function (element) { element.textContent = new Intl.DateTimeFormat("fa-IR", { timeZone: T.tehranZone, weekday: "long" }).format(now); });
    document.querySelectorAll("[data-zone-clock]").forEach(function (element) {
      element.textContent = T.formatTime(now, element.dataset.zoneClock, false);
    });
    document.querySelectorAll("[data-zone-date]").forEach(function (element) {
      element.textContent = new Intl.DateTimeFormat("fa-IR-u-ca-gregory", { timeZone: element.dataset.zoneDate, weekday: "short", month: "short", day: "numeric" }).format(now);
    });
  }

  function updateNowruz() {
    const target = T.getNextNowruz(new Date());
    const parts = T.formatDuration((target.date.getTime() - Date.now()) / 1000);
    [
      ["days", parts.days], ["hours", parts.hours], ["minutes", parts.minutes], ["seconds", parts.seconds]
    ].forEach(function (item) {
      const element = $("[data-nowruz-" + item[0] + "]");
      if (element) element.textContent = T.formatNumber(item[1]);
    });
    const label = $("[data-nowruz-label]");
    if (label) label.textContent = target.label + " · " + T.formatTime(target.date, T.tehranZone, false) + " به وقت تهران";
  }

  function initClockFormat() {
    const button = $("[data-clock-format-toggle]");
    if (!button) return;
    const saved = localStorage.getItem("timekit-clock-format") || "24";
    document.documentElement.dataset.clockFormat = saved;
    const paint = function () {
      const twelve = document.documentElement.dataset.clockFormat === "12";
      button.textContent = twelve ? "۲۴ ساعته" : "۱۲ ساعته";
      button.setAttribute("aria-label", twelve ? "نمایش ساعت ۲۴ ساعته" : "نمایش ساعت ۱۲ ساعته");
    };
    paint();
    button.addEventListener("click", function () {
      document.documentElement.dataset.clockFormat = document.documentElement.dataset.clockFormat === "12" ? "24" : "12";
      localStorage.setItem("timekit-clock-format", document.documentElement.dataset.clockFormat);
      paint();
      updateHomeClock();
    });
  }

  function initSearch() {
    const input = $("[data-tool-search]");
    const empty = $("[data-search-empty]");
    if (!input) return;
    input.addEventListener("input", function () {
      const query = input.value.trim().toLocaleLowerCase("fa-IR");
      let visible = 0;
      document.querySelectorAll("[data-tool-card]").forEach(function (card) {
        const match = !query || card.textContent.toLocaleLowerCase("fa-IR").includes(query);
        card.hidden = !match;
        if (match) visible += 1;
      });
      if (empty) empty.hidden = visible !== 0;
    });
  }

  function init() {
    initClockFormat();
    initSearch();
    updateHomeClock();
    updateNowruz();
    window.setInterval(function () { updateHomeClock(); updateNowruz(); }, 1000);
  }

  document.addEventListener("DOMContentLoaded", init);
}());

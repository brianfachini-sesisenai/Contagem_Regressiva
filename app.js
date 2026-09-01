/**
 * ==========================================================================
 * DIAS LETIVOS - SINGLE PAGE APP JAVASCRIPT ENGINE
 * ==========================================================================
 */

// Base de feriados nacionais brasileiros
function getDefaultHolidays(year) {
  return [
    { id: `h-${year}-1`, name: "Confraternização Universal", startDate: `${year}-01-01`, endDate: `${year}-01-01` },
    { id: `h-${year}-2`, name: "Carnaval", startDate: `${year}-02-16`, endDate: `${year}-02-17` },
    { id: `h-${year}-3`, name: "Sexta-feira Santa", startDate: `${year}-04-03`, endDate: `${year}-04-03` },
    { id: `h-${year}-4`, name: "Tiradentes", startDate: `${year}-04-21`, endDate: `${year}-04-21` },
    { id: `h-${year}-5`, name: "Dia do Trabalhador", startDate: `${year}-05-01`, endDate: `${year}-05-01` },
    { id: `h-${year}-6`, name: "Corpus Christi", startDate: `${year}-06-04`, endDate: `${year}-06-04` },
    { id: `h-${year}-7`, name: "Recesso Escolar de Julho", startDate: `${year}-07-13`, endDate: `${year}-07-24` },
    { id: `h-${year}-8`, name: "Independência do Brasil", startDate: `${year}-09-07`, endDate: `${year}-09-07` },
    { id: `h-${year}-9`, name: "Nossa Senhora Aparecida", startDate: `${year}-10-12`, endDate: `${year}-10-12` },
    { id: `h-${year}-10`, name: "Finados", startDate: `${year}-11-02`, endDate: `${year}-11-02` },
    { id: `h-${year}-11`, name: "Proclamação da República", startDate: `${year}-11-15`, endDate: `${year}-11-15` },
    { id: `h-${year}-12`, name: "Dia da Consciência Negra", startDate: `${year}-11-20`, endDate: `${year}-11-20` },
    { id: `h-${year}-13`, name: "Natal", startDate: `${year}-12-25`, endDate: `${year}-12-25` }
  ];
}

class SimpleSchoolCountdown {
  constructor() {
    this.currentDate = new Date();
    this.calendarDate = new Date();
    this.audioCtx = null;

    this.loadState();
    this.cacheDOM();
    this.bindEvents();

    this.applyTheme(this.state.theme || "aurora-dark");
    this.updateClock();
    this.render();

    setInterval(() => this.updateClock(), 1000);

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // --- Estado Inicial ---
  getDefaultState() {
    const currentYear = this.currentDate.getFullYear();
    return {
      title: "Dias Letivos do Curso",
      startDate: `${currentYear}-02-05`,
      endDate: `${currentYear}-12-18`,
      dailyHours: 4,
      activeDays: [1, 2, 3, 4, 5], // Seg a Sex
      soundEnabled: true,
      theme: "aurora-dark",
      holidays: getDefaultHolidays(currentYear),
      customOverrides: {} // { 'YYYY-MM-DD': 'school' | 'off' }
    };
  }

  loadState() {
    const saved = localStorage.getItem("dias_letivos_single_state");
    if (saved) {
      try {
        this.state = JSON.parse(saved);
        if (!this.state.customOverrides) this.state.customOverrides = {};
        if (!this.state.activeDays) this.state.activeDays = [1, 2, 3, 4, 5];
        if (!this.state.holidays) this.state.holidays = getDefaultHolidays(this.currentDate.getFullYear());
      } catch (e) {
        this.state = this.getDefaultState();
      }
    } else {
      this.state = this.getDefaultState();
    }
  }

  saveState() {
    localStorage.setItem("dias_letivos_single_state", JSON.stringify(this.state));
    this.render();
  }

  // --- Elementos DOM ---
  cacheDOM() {
    // Header & Floating
    this.todayStatusPill = document.getElementById("today-status-pill");
    this.todayStatusText = document.getElementById("today-status-text");
    this.btnSoundToggle = document.getElementById("btn-sound-toggle");
    this.btnThemeModal = document.getElementById("btn-theme-modal");
    this.btnOpenSettings = document.getElementById("btn-open-settings");
    this.liveClock = document.getElementById("live-clock");
    this.toastContainer = document.getElementById("toast-container");

    // Hero Section
    this.periodBadge = document.getElementById("period-badge");
    this.courseTitleText = document.getElementById("course-title-text");
    this.periodDateRange = document.getElementById("period-date-range");
    this.hugeDaysNumber = document.getElementById("huge-days-number");
    this.countdownSubText = document.getElementById("countdown-sub-text");
    this.progressPercent = document.getElementById("progress-percent");
    this.progressBarFill = document.getElementById("progress-bar-fill");
    this.statDaysDone = document.getElementById("stat-days-done");
    this.statDaysTotal = document.getElementById("stat-days-total");
    this.statWeeksLeft = document.getElementById("stat-weeks-left");
    this.statHoursLeft = document.getElementById("stat-hours-left");
    this.statCalendarDays = document.getElementById("stat-calendar-days");

    // Calendar Section
    this.calPrev = document.getElementById("cal-prev");
    this.calNext = document.getElementById("cal-next");
    this.calToday = document.getElementById("cal-today");
    this.calMonthName = document.getElementById("cal-month-name");
    this.daysMatrix = document.getElementById("days-matrix");
    this.monthSummaryText = document.getElementById("month-summary-text");
    this.holidaysListContainer = document.getElementById("holidays-list-container");
    this.btnAddHoliday = document.getElementById("btn-add-holiday");

    // Modals
    this.modalSettings = document.getElementById("modal-settings");
    this.settingsForm = document.getElementById("settings-form");
    this.inputCourseTitle = document.getElementById("input-course-title");
    this.inputStartDate = document.getElementById("input-start-date");
    this.inputEndDate = document.getElementById("input-end-date");
    this.inputDailyHours = document.getElementById("input-daily-hours");

    this.modalHoliday = document.getElementById("modal-holiday");
    this.formHoliday = document.getElementById("form-holiday");
    this.holidayModalTitle = document.getElementById("holiday-modal-title");
    this.holidayIdInput = document.getElementById("holiday-id");
    this.holidayNameInput = document.getElementById("holiday-name");
    this.holidayStartInput = document.getElementById("holiday-start");
    this.holidayEndInput = document.getElementById("holiday-end");

    this.modalTheme = document.getElementById("modal-theme");
  }

  // --- Efeitos Sonoros ---
  playSound(type = "click") {
    if (!this.state.soundEnabled) return;
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = this.audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;

      if (type === "click") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.06);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
      } else if (type === "success") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        osc.frequency.setValueAtTime(783.99, now + 0.16);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === "toggle") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.05);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      }
    } catch (e) {}
  }

  // --- Eventos ---
  bindEvents() {
    // Open Settings Modal
    this.btnOpenSettings.addEventListener("click", () => this.openSettingsModal());
    this.periodBadge.addEventListener("click", () => this.openSettingsModal());

    // Settings Submit
    this.settingsForm.addEventListener("submit", (e) => this.handleSaveSettings(e));

    // Sound toggle
    this.btnSoundToggle.addEventListener("click", () => {
      this.state.soundEnabled = !this.state.soundEnabled;
      this.updateSoundButton();
      this.saveState();
      this.showToast(this.state.soundEnabled ? "Sons ativados 🔊" : "Sons desativados 🔇", "info");
      if (this.state.soundEnabled) this.playSound("success");
    });

    // Theme Modal & Switcher
    this.btnThemeModal.addEventListener("click", () => {
      this.modalTheme.classList.add("active");
      this.playSound("click");
    });

    document.querySelectorAll("[data-theme-id]").forEach(btn => {
      btn.addEventListener("click", () => {
        const themeId = btn.dataset.themeId;
        this.applyTheme(themeId);
        document.querySelectorAll("[data-theme-id]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.state.theme = themeId;
        this.saveState();
        this.modalTheme.classList.remove("active");
        this.showToast(`Tema alterado para ${btn.querySelector("h4").innerText}!`, "info");
      });
    });

    // Calendar Navigation
    this.calPrev.addEventListener("click", () => {
      this.calendarDate.setMonth(this.calendarDate.getMonth() - 1);
      this.renderCalendar();
      this.playSound("click");
    });

    this.calNext.addEventListener("click", () => {
      this.calendarDate.setMonth(this.calendarDate.getMonth() + 1);
      this.renderCalendar();
      this.playSound("click");
    });

    this.calToday.addEventListener("click", () => {
      this.calendarDate = new Date();
      this.renderCalendar();
      this.playSound("click");
    });

    // Add Holiday
    this.btnAddHoliday.addEventListener("click", () => this.openHolidayModal());
    this.formHoliday.addEventListener("submit", (e) => this.handleSaveHoliday(e));

    // Close Modals
    document.querySelectorAll(".modal-close, .modal-overlay").forEach(el => {
      el.addEventListener("click", (e) => {
        if (e.target === el || el.classList.contains("modal-close")) {
          document.querySelectorAll(".modal-overlay").forEach(m => m.classList.remove("active"));
        }
      });
    });
  }

  // --- Temas ---
  applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.querySelectorAll("[data-theme-id]").forEach(b => {
      b.classList.toggle("active", b.dataset.themeId === theme);
    });
  }

  updateSoundButton() {
    if (this.state.soundEnabled) {
      this.btnSoundToggle.innerHTML = '<i data-lucide="volume-2"></i>';
      this.btnSoundToggle.title = "Sons ativados (Clique para silenciar)";
    } else {
      this.btnSoundToggle.innerHTML = '<i data-lucide="volume-x"></i>';
      this.btnSoundToggle.title = "Sons silenciados (Clique para ativar)";
    }
    if (window.lucide) window.lucide.createIcons();
  }

  // --- Relógio ---
  updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    if (this.liveClock) this.liveClock.innerText = timeStr;
  }

  // --- Auxiliares de Data ---
  parseDate(str) {
    if (!str) return null;
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }

  formatDate(dateObj) {
    if (!dateObj) return "--/--/----";
    const d = String(dateObj.getDate()).padStart(2, "0");
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const y = dateObj.getFullYear();
    return `${d}/${m}/${y}`;
  }

  formatDateShort(dateObj) {
    if (!dateObj) return "--/--";
    const d = String(dateObj.getDate()).padStart(2, "0");
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    return `${d}/${m}`;
  }

  getDateString(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // --- Verificação de Dia Letivo / Feriado ---
  getHolidayForDate(dateObj) {
    const dateStr = this.getDateString(dateObj);
    return this.state.holidays.find(h => {
      const start = h.startDate;
      const end = h.endDate || h.startDate;
      return dateStr >= start && dateStr <= end;
    });
  }

  isSchoolDay(dateObj) {
    const dateStr = this.getDateString(dateObj);
    
    // Override manual
    if (this.state.customOverrides[dateStr]) {
      return this.state.customOverrides[dateStr] === "school";
    }

    // Dia da semana
    const day = dateObj.getDay();
    if (!this.state.activeDays.includes(day)) return false;

    // Feriado ou recesso
    if (this.getHolidayForDate(dateObj)) return false;

    return true;
  }

  // --- Cálculo Completo da Contagem ---
  calculateStats() {
    const today = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), this.currentDate.getDate(), 12, 0, 0);
    const start = this.parseDate(this.state.startDate) || today;
    const end = this.parseDate(this.state.endDate) || today;

    let totalDays = 0;
    let doneDays = 0;
    let leftDays = 0;

    let temp = new Date(start);
    while (temp <= end) {
      if (this.isSchoolDay(temp)) {
        totalDays++;
        if (temp < today) {
          doneDays++;
        } else {
          leftDays++;
        }
      }
      temp.setDate(temp.getDate() + 1);
    }

    const progressPct = totalDays > 0 ? Math.min(100, Math.round((doneDays / totalDays) * 100)) : 0;
    const activeDaysPerWeek = this.state.activeDays.length || 5;
    const weeksLeft = Math.ceil(leftDays / activeDaysPerWeek);
    const hoursLeft = leftDays * (parseFloat(this.state.dailyHours) || 4);

    const diffMs = end - today;
    const calendarDaysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    const isTodaySchool = this.isSchoolDay(today);
    const todayHoliday = this.getHolidayForDate(today);

    return {
      start,
      end,
      totalDays,
      doneDays,
      leftDays,
      progressPct,
      weeksLeft,
      hoursLeft,
      calendarDaysLeft,
      isTodaySchool,
      todayHoliday
    };
  }

  // --- Renderização Geral ---
  render() {
    const stats = this.calculateStats();

    // Top Status Pill
    const dot = this.todayStatusPill.querySelector(".status-dot");
    if (stats.isTodaySchool) {
      dot.className = "status-dot";
      this.todayStatusText.innerText = "Hoje é dia letivo 🎓";
    } else {
      dot.className = "status-dot off";
      if (stats.todayHoliday) {
        this.todayStatusText.innerText = `Hoje: ${stats.todayHoliday.name} 🌴`;
      } else {
        const day = this.currentDate.getDay();
        const isWeekend = (day === 0 || day === 6);
        this.todayStatusText.innerText = isWeekend ? "Hoje é final de semana ✨" : "Hoje é dia de descanso 🌴";
      }
    }

    // Hero Badge & Numbers
    this.courseTitleText.innerText = this.state.title || "Dias Letivos";
    this.periodDateRange.innerText = `${this.formatDate(stats.start)} até ${this.formatDate(stats.end)}`;
    this.hugeDaysNumber.innerText = stats.leftDays;
    this.countdownSubText.innerText = `descontando fins de semana e feriados até ${this.formatDate(stats.end)}`;

    // Progress Bar
    this.progressPercent.innerText = `${stats.progressPct}%`;
    this.progressBarFill.style.width = `${stats.progressPct}%`;
    this.statDaysDone.innerText = stats.doneDays;
    this.statDaysTotal.innerText = stats.totalDays;

    // Stat Pills
    this.statWeeksLeft.innerText = stats.weeksLeft;
    this.statHoursLeft.innerText = `${stats.hoursLeft}h`;
    this.statCalendarDays.innerText = stats.calendarDaysLeft;

    // Trigger confetti if reached 100%
    if (stats.progressPct === 100 && stats.totalDays > 0) {
      if (window.confetti) {
        window.confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    }

    this.renderCalendar();
    this.renderHolidaysList();
    this.updateSoundButton();

    if (window.lucide) window.lucide.createIcons();
  }

  // --- Renderização do Calendário ---
  renderCalendar() {
    const year = this.calendarDate.getFullYear();
    const month = this.calendarDate.getMonth();

    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    this.calMonthName.innerText = `${monthNames[month]} ${year}`;
    this.daysMatrix.innerHTML = "";

    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const prevLastDate = new Date(year, month, 0).getDate();

    const todayStr = this.getDateString(this.currentDate);
    let monthSchoolCount = 0;

    // Dias do mês anterior
    for (let x = firstDayIndex; x > 0; x--) {
      const cell = document.createElement("div");
      cell.className = "day-cell other-month";
      cell.innerHTML = `<span class="day-num">${prevLastDate - x + 1}</span>`;
      this.daysMatrix.appendChild(cell);
    }

    // Dias do mês atual
    for (let i = 1; i <= lastDate; i++) {
      const dateObj = new Date(year, month, i, 12, 0, 0);
      const dateStr = this.getDateString(dateObj);
      const isToday = (dateStr === todayStr);
      const isPast = (dateStr < todayStr);
      const isSchool = this.isSchoolDay(dateObj);
      const holiday = this.getHolidayForDate(dateObj);
      const dayOfWeek = dateObj.getDay();
      const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

      let classes = ["day-cell"];
      if (isToday) classes.push("is-today");
      if (isPast) classes.push("is-past");
      if (holiday) {
        classes.push("is-holiday");
      } else if (isSchool) {
        classes.push("is-school-day");
        monthSchoolCount++;
      } else if (isWeekend) {
        classes.push("is-weekend");
      }

      const cell = document.createElement("div");
      cell.className = classes.join(" ");
      cell.title = holiday ? holiday.name : (isSchool ? `Dia letivo • Clique para marcar folga` : `Não letivo • Clique para marcar letivo`);

      cell.innerHTML = `
        <div class="day-num">
          <span>${i}</span>
          ${isToday ? '<span class="today-text-badge">HOJE</span>' : ''}
        </div>
        ${holiday ? `<span class="holiday-pill-tag" title="${holiday.name}">${holiday.name}</span>` : ''}
      `;

      // 1-Click Toggle
      cell.addEventListener("click", () => {
        this.toggleDayOverride(dateStr, isSchool);
      });

      this.daysMatrix.appendChild(cell);
    }

    this.monthSummaryText.innerText = `${monthSchoolCount} dias letivos em ${monthNames[month]}`;
  }

  toggleDayOverride(dateStr, currentlySchool) {
    if (this.state.customOverrides[dateStr]) {
      delete this.state.customOverrides[dateStr];
      this.showToast(`Restaurado padrão para o dia ${dateStr}`, "info");
    } else {
      this.state.customOverrides[dateStr] = currentlySchool ? "off" : "school";
      this.showToast(currentlySchool ? `Marcado como Folga: ${dateStr}` : `Marcado como Dia Letivo: ${dateStr}`, "success");
    }
    this.playSound("toggle");
    this.saveState();
  }

  // --- Lista Lateral de Feriados ---
  renderHolidaysList() {
    this.holidaysListContainer.innerHTML = "";

    const sorted = [...this.state.holidays].sort((a, b) => a.startDate.localeCompare(b.startDate));

    if (sorted.length === 0) {
      this.holidaysListContainer.innerHTML = `
        <div style="text-align: center; padding: 1.5rem; color: var(--text-muted); font-size: 0.85rem;">
          Nenhum feriado cadastrado.
        </div>
      `;
      return;
    }

    sorted.forEach(h => {
      const start = this.parseDate(h.startDate);
      const end = this.parseDate(h.endDate || h.startDate);
      const isRange = h.endDate && h.endDate !== h.startDate;

      const item = document.createElement("div");
      item.className = "holiday-mini-item";
      item.innerHTML = `
        <div class="holiday-mini-info">
          <strong>${h.name}</strong>
          <span>${isRange ? `${this.formatDateShort(start)} a ${this.formatDateShort(end)}` : this.formatDateShort(start)}</span>
        </div>
        <div class="holiday-item-actions">
          <button class="btn-del-holiday" title="Excluir Recesso" onclick="app.deleteHoliday('${h.id}')">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      `;
      this.holidaysListContainer.appendChild(item);
    });
  }

  deleteHoliday(id) {
    if (confirm("Deseja remover este feriado/recesso?")) {
      this.state.holidays = this.state.holidays.filter(h => h.id !== id);
      this.saveState();
      this.showToast("Recesso removido!", "info");
    }
  }

  // --- Modal Configurações do Curso ---
  openSettingsModal() {
    this.inputCourseTitle.value = this.state.title || "";
    this.inputStartDate.value = this.state.startDate || "";
    this.inputEndDate.value = this.state.endDate || "";
    this.inputDailyHours.value = this.state.dailyHours || 4;

    const days = [1, 2, 3, 4, 5, 6];
    const ids = ["chk-mon", "chk-tue", "chk-wed", "chk-thu", "chk-fri", "chk-sat"];
    days.forEach((d, i) => {
      const el = document.getElementById(ids[i]);
      if (el) el.checked = this.state.activeDays.includes(d);
    });

    this.modalSettings.classList.add("active");
    this.playSound("click");
  }

  handleSaveSettings(e) {
    e.preventDefault();
    this.state.title = this.inputCourseTitle.value.trim() || "Dias Letivos";
    this.state.startDate = this.inputStartDate.value;
    this.state.endDate = this.inputEndDate.value;
    this.state.dailyHours = parseFloat(this.inputDailyHours.value) || 4;

    const active = [];
    const days = [1, 2, 3, 4, 5, 6];
    const ids = ["chk-mon", "chk-tue", "chk-wed", "chk-thu", "chk-fri", "chk-sat"];
    days.forEach((d, i) => {
      const el = document.getElementById(ids[i]);
      if (el && el.checked) active.push(d);
    });
    this.state.activeDays = active;

    this.modalSettings.classList.remove("active");
    this.saveState();
    this.playSound("success");
    this.showToast("Configurações atualizadas!", "success");
  }

  // --- Modal Adicionar Feriado ---
  openHolidayModal() {
    this.holidayIdInput.value = "";
    this.holidayNameInput.value = "";
    this.holidayStartInput.value = this.getDateString(this.currentDate);
    this.holidayEndInput.value = "";
    this.modalHoliday.classList.add("active");
    this.playSound("click");
  }

  handleSaveHoliday(e) {
    e.preventDefault();
    const name = this.holidayNameInput.value.trim();
    const startDate = this.holidayStartInput.value;
    const endDate = this.holidayEndInput.value || startDate;

    if (startDate > endDate) {
      alert("A data de início não pode ser posterior à data de término!");
      return;
    }

    const newH = {
      id: `h-${Date.now()}`,
      name,
      startDate,
      endDate
    };
    this.state.holidays.push(newH);

    this.modalHoliday.classList.remove("active");
    this.saveState();
    this.playSound("success");
    this.showToast("Novo recesso/feriado adicionado!", "success");
  }

  // --- Toast ---
  showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    let icon = "info";
    if (type === "success") icon = "check-circle";

    toast.innerHTML = `<i data-lucide="${icon}"></i> <span>${message}</span>`;
    this.toastContainer.appendChild(toast);

    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
      toast.style.animation = "slideToast 0.3s reverse forwards";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Inicialização
let app;
document.addEventListener("DOMContentLoaded", () => {
  app = new SimpleSchoolCountdown();
});

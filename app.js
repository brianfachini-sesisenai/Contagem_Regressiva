/**
 * ==========================================================================
 * DIAS LETIVOS - SINGLE PAGE APP JAVASCRIPT ENGINE
 * Sincronização em Nuvem em Tempo Real com Supabase + Cálculos Dinâmicos
 * ==========================================================================
 */

// Configuração do Supabase (Novo Projeto: Contagem_Regressiva)
const SUPABASE_URL = "https://azrcngbzhwoxgwubcjvm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6cmNuZ2J6aHdveGd3dWJjanZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNTA2MTksImV4cCI6MjEwMzkyNjYxOX0.szZWzrZwfuaxrAq41FLBOhMvmk4XFxMxoFUsRcsnyHg";

// Base de feriados nacionais brasileiros padrão
function getDefaultHolidays(year = 2026) {
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
    this.isReceivingRemoteUpdate = false;
    this.syncDebounceTimer = null;
    this.broadcastChannel = null;
    this.supabase = null;

    this.loadState();
    this.cacheDOM();
    this.bindEvents();

    this.applyTheme(this.state.theme || "aurora-dark");
    this.updateClock();
    this.render();

    // Iniciar Sincronização em Nuvem (Supabase + Multi-usuários em Tempo Real)
    this.initCloudSync();

    setInterval(() => this.updateClock(), 1000);

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // --- Estado Inicial Padrão ---
  getDefaultState() {
    return {
      title: "Dias Letivos do Curso",
      startDate: "2026-02-05",
      endDate: "2026-12-18",
      dailyHours: 4,
      activeDays: [1, 2, 3, 4, 5], // Seg a Sex
      soundEnabled: true,
      theme: "aurora-dark",
      holidays: getDefaultHolidays(2026),
      customOverrides: {},
      lastUpdated: Date.now()
    };
  }

  loadState() {
    const saved = localStorage.getItem("dias_letivos_single_state");
    if (saved) {
      try {
        this.state = JSON.parse(saved);
        if (!this.state.customOverrides) this.state.customOverrides = {};
        if (!this.state.activeDays) this.state.activeDays = [1, 2, 3, 4, 5];
        if (!this.state.holidays || !this.state.holidays.length) {
          this.state.holidays = getDefaultHolidays(2026);
        }
        if (!this.state.startDate) this.state.startDate = "2026-02-05";
        if (!this.state.dailyHours) this.state.dailyHours = 4;
      } catch (e) {
        this.state = this.getDefaultState();
      }
    } else {
      this.state = this.getDefaultState();
    }
  }

  saveState(broadcastToCloud = true) {
    this.state.lastUpdated = Date.now();
    localStorage.setItem("dias_letivos_single_state", JSON.stringify(this.state));
    this.render();

    if (broadcastToCloud && !this.isReceivingRemoteUpdate) {
      this.pushToCloud();
    }
  }

  // --- Elementos DOM ---
  cacheDOM() {
    // Header & Floating
    this.todayStatusPill = document.getElementById("today-status-pill");
    this.todayStatusText = document.getElementById("today-status-text");
    this.cloudSyncPill = document.getElementById("cloud-sync-pill");
    this.cloudDot = document.getElementById("cloud-dot");
    this.cloudSyncText = document.getElementById("cloud-sync-text");
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
    this.statCalendarProgress = document.getElementById("stat-calendar-progress");
    this.statWeeksLeft = document.getElementById("stat-weeks-left");
    this.statHoursLeft = document.getElementById("stat-hours-left");
    this.statCalendarDays = document.getElementById("stat-calendar-days");
    this.statCalendarDaysSub = document.getElementById("stat-calendar-days-sub");

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
    this.modalCloudStatus = document.getElementById("modal-cloud-status");
    this.btnForceSync = document.getElementById("btn-force-sync");
    this.btnResetDefaults = document.getElementById("btn-reset-defaults");

    this.modalHoliday = document.getElementById("modal-holiday");
    this.formHoliday = document.getElementById("form-holiday");
    this.holidayModalTitle = document.getElementById("holiday-modal-title");
    this.holidayIdInput = document.getElementById("holiday-id");
    this.holidayNameInput = document.getElementById("holiday-name");
    this.holidayStartInput = document.getElementById("holiday-start");
    this.holidayEndInput = document.getElementById("holiday-end");

    this.modalTheme = document.getElementById("modal-theme");
  }

  // --- Sincronização em Nuvem (Supabase + BroadcastChannel) ---
  initCloudSync() {
    // 1. Sincronização instantânea entre abas no mesmo navegador
    try {
      if ("BroadcastChannel" in window) {
        this.broadcastChannel = new BroadcastChannel("dias_letivos_channel");
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type === "STATE_UPDATED") {
            this.handleIncomingCloudState(event.data.state, "Aba Local");
          }
        };
      }
    } catch (e) {}

    // 2. Inicializar Cliente Supabase
    try {
      if (window.supabase && typeof window.supabase.createClient === "function") {
        this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      }
    } catch (e) {
      console.warn("Supabase init error:", e);
    }

    // 3. Buscar dados iniciais do Supabase
    this.fetchCloudState();

    // 4. Supabase Realtime Channel (escutar alterações na nuvem ao vivo)
    if (this.supabase) {
      try {
        this.supabase
          .channel("countdown_changes")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "countdown_data" },
            (payload) => {
              if (payload.new) {
                const mappedState = this.mapSupabaseRowToState(payload.new);
                this.handleIncomingCloudState(mappedState, "Supabase Nuvem");
              }
            }
          )
          .subscribe((status) => {
            if (status === "SUBSCRIBED") {
              this.setCloudStatus("connected", "Supabase Conectado");
            }
          });
      } catch (e) {
        console.warn("Supabase Realtime notice:", e);
      }
    }

    // Sincronizar ao reabrir ou focar na aba
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        this.fetchCloudState();
      }
    });

    window.addEventListener("storage", (e) => {
      if (e.key === "dias_letivos_single_state" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          this.handleIncomingCloudState(parsed, "Armazenamento");
        } catch (err) {}
      }
    });
  }

  mapSupabaseRowToState(row) {
    return {
      title: row.title || this.state.title,
      startDate: row.start_date ? String(row.start_date).slice(0, 10) : this.state.startDate,
      endDate: row.end_date ? String(row.end_date).slice(0, 10) : this.state.endDate,
      dailyHours: parseFloat(row.daily_hours) || this.state.dailyHours,
      activeDays: Array.isArray(row.active_days) ? row.active_days : this.state.activeDays,
      theme: row.theme || this.state.theme,
      holidays: Array.isArray(row.holidays) ? row.holidays : this.state.holidays,
      customOverrides: (row.custom_overrides && typeof row.custom_overrides === "object") ? row.custom_overrides : this.state.customOverrides,
      lastUpdated: row.updated_at ? new Date(row.updated_at).getTime() : Date.now()
    };
  }

  async fetchCloudState() {
    this.setCloudStatus("syncing", "Buscando no Supabase...");
    try {
      if (this.supabase) {
        const { data, error } = await this.supabase
          .from("countdown_data")
          .select("*")
          .eq("id", "default")
          .single();

        if (!error && data) {
          const mapped = this.mapSupabaseRowToState(data);
          this.handleIncomingCloudState(mapped, "Supabase Nuvem");
          this.setCloudStatus("connected", "Supabase Sincronizado");
          return;
        }
      }

      // Fallback direto via fetch REST API do Supabase
      const res = await fetch(`${SUPABASE_URL}/rest/v1/countdown_data?id=eq.default&select=*`, {
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      if (res.ok) {
        const items = await res.json();
        if (items && items.length > 0) {
          const mapped = this.mapSupabaseRowToState(items[0]);
          this.handleIncomingCloudState(mapped, "Supabase REST");
          this.setCloudStatus("connected", "Supabase Sincronizado");
        } else {
          this.setCloudStatus("connected", "Supabase Conectado");
        }
      } else {
        this.setCloudStatus("connected", "Salvo Localmente");
      }
    } catch (e) {
      console.warn("Supabase fetch notice:", e);
      this.setCloudStatus("offline", "Modo Offline (Salvo Local)");
    }
  }

  pushToCloud() {
    this.setCloudStatus("syncing", "Salvando no Supabase...");

    // Enviar para BroadcastChannel (outras abas locais)
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: "STATE_UPDATED",
        state: this.state
      });
    }

    // Debounce para salvar no Supabase
    clearTimeout(this.syncDebounceTimer);
    this.syncDebounceTimer = setTimeout(async () => {
      const payload = {
        id: "default",
        title: this.state.title,
        start_date: this.state.startDate,
        end_date: this.state.endDate,
        daily_hours: parseFloat(this.state.dailyHours) || 4,
        active_days: this.state.activeDays || [1, 2, 3, 4, 5],
        theme: this.state.theme || "aurora-dark",
        holidays: this.state.holidays || [],
        custom_overrides: this.state.customOverrides || {},
        updated_at: new Date().toISOString()
      };

      try {
        if (this.supabase) {
          const { error } = await this.supabase
            .from("countdown_data")
            .upsert(payload);

          if (error) throw error;
        } else {
          // REST Fallback
          await fetch(`${SUPABASE_URL}/rest/v1/countdown_data`, {
            method: "POST",
            headers: {
              "apikey": SUPABASE_ANON_KEY,
              "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
              "Content-Type": "application/json",
              "Prefer": "resolution=merge-duplicates"
            },
            body: JSON.stringify(payload)
          });
        }
        this.setCloudStatus("connected", "Supabase Sincronizado");
      } catch (err) {
        console.warn("Erro ao salvar no Supabase:", err);
        this.setCloudStatus("offline", "Salvo Localmente");
      }
    }, 400);
  }

  handleIncomingCloudState(remoteState, source = "Supabase") {
    if (!remoteState || typeof remoteState !== "object") return;

    const currentKey = `${this.state.title}|${this.state.startDate}|${this.state.endDate}|${this.state.dailyHours}|${JSON.stringify(this.state.activeDays)}|${JSON.stringify(this.state.holidays)}|${JSON.stringify(this.state.customOverrides)}`;
    const remoteKey = `${remoteState.title}|${remoteState.startDate}|${remoteState.endDate}|${remoteState.dailyHours}|${JSON.stringify(remoteState.activeDays)}|${JSON.stringify(remoteState.holidays)}|${JSON.stringify(remoteState.customOverrides)}`;

    if (currentKey === remoteKey) {
      this.setCloudStatus("connected", "Supabase Sincronizado");
      return;
    }

    // Aplicar estado remoto
    this.isReceivingRemoteUpdate = true;
    this.state = {
      ...this.state,
      ...remoteState,
      theme: this.state.theme || remoteState.theme || "aurora-dark",
      soundEnabled: this.state.soundEnabled !== undefined ? this.state.soundEnabled : true
    };

    localStorage.setItem("dias_letivos_single_state", JSON.stringify(this.state));
    this.render();
    this.isReceivingRemoteUpdate = false;

    this.setCloudStatus("connected", "Supabase Sincronizado");
    this.showToast(`🔄 Sincronizado via ${source}!`, "info");
    this.playSound("success");
  }

  setCloudStatus(status, text) {
    if (this.cloudDot && this.cloudSyncText) {
      this.cloudDot.className = `cloud-dot ${status}`;
      this.cloudSyncText.innerText = text;
    }
    if (this.modalCloudStatus) {
      this.modalCloudStatus.innerText = status === "connected" ? "Supabase Conectado" : (status === "syncing" ? "Sincronizando..." : "Salvo Localmente");
      this.modalCloudStatus.className = `cloud-status-badge ${status === "connected" ? "active" : ""}`;
    }
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
    // Abrir Modal de Configurações
    this.btnOpenSettings.addEventListener("click", () => this.openSettingsModal());
    this.periodBadge.addEventListener("click", () => this.openSettingsModal());

    // Salvar Configurações
    this.settingsForm.addEventListener("submit", (e) => this.handleSaveSettings(e));

    // Forçar Sincronização
    if (this.btnForceSync) {
      this.btnForceSync.addEventListener("click", async () => {
        this.showToast("Buscando dados no Supabase...", "info");
        await this.fetchCloudState();
        this.showToast("Supabase sincronizado com sucesso!", "success");
        this.playSound("success");
      });
    }

    // Restaurar Padrões
    if (this.btnResetDefaults) {
      this.btnResetDefaults.addEventListener("click", () => {
        if (confirm("Deseja restaurar as datas e horários para o padrão?")) {
          const defaults = this.getDefaultState();
          this.state.title = defaults.title;
          this.state.startDate = defaults.startDate;
          this.state.endDate = defaults.endDate;
          this.state.dailyHours = defaults.dailyHours;
          this.state.activeDays = defaults.activeDays;
          this.state.holidays = defaults.holidays;
          this.state.customOverrides = {};
          this.openSettingsModal();
          this.saveState(true);
          this.showToast("Padrões restaurados e sincronizados no Supabase!", "success");
        }
      });
    }

    // Alternar Som
    this.btnSoundToggle.addEventListener("click", () => {
      this.state.soundEnabled = !this.state.soundEnabled;
      this.updateSoundButton();
      this.saveState(false);
      this.showToast(this.state.soundEnabled ? "Sons ativados 🔊" : "Sons desativados 🔇", "info");
      if (this.state.soundEnabled) this.playSound("success");
    });

    // Seletor de Temas
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
        this.saveState(false);
        this.modalTheme.classList.remove("active");
        this.showToast(`Tema alterado para ${btn.querySelector("h4").innerText}!`, "info");
      });
    });

    // Navegação do Calendário
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

    // Adicionar Feriado
    this.btnAddHoliday.addEventListener("click", () => this.openHolidayModal());
    this.formHoliday.addEventListener("submit", (e) => this.handleSaveHoliday(e));

    // Fechar Modais
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

  // --- Cálculo Completo Dinâmico da Contagem e Dias Corridos ---
  calculateStats() {
    const today = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), this.currentDate.getDate(), 12, 0, 0);
    const start = this.parseDate(this.state.startDate) || today;
    const end = this.parseDate(this.state.endDate) || today;

    // 1. Cálculo Dinâmico de Dias Corridos Totais, Decorridos e Restantes
    const oneDayMs = 1000 * 60 * 60 * 24;
    const totalCalendarDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / oneDayMs) + 1);

    let elapsedCalendarDays = 0;
    if (today < start) {
      elapsedCalendarDays = 0;
    } else if (today > end) {
      elapsedCalendarDays = totalCalendarDays;
    } else {
      elapsedCalendarDays = Math.max(1, Math.round((today.getTime() - start.getTime()) / oneDayMs) + 1);
    }

    let calendarDaysLeft = 0;
    if (today > end) {
      calendarDaysLeft = 0;
    } else if (today < start) {
      calendarDaysLeft = totalCalendarDays;
    } else {
      calendarDaysLeft = Math.max(0, Math.round((end.getTime() - today.getTime()) / oneDayMs) + 1);
    }

    // 2. Cálculo Dinâmico de Dias Letivos (Total, Feitos e Restantes)
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
    const dailyHours = parseFloat(this.state.dailyHours) || 4;
    const hoursLeft = leftDays * dailyHours;
    const totalHours = totalDays * dailyHours;

    const isTodaySchool = this.isSchoolDay(today);
    const todayHoliday = this.getHolidayForDate(today);

    return {
      start,
      end,
      totalDays,
      doneDays,
      leftDays,
      totalCalendarDays,
      elapsedCalendarDays,
      calendarDaysLeft,
      progressPct,
      weeksLeft,
      hoursLeft,
      totalHours,
      dailyHours,
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

    // Progress Bar & Details Dinâmicos
    this.progressPercent.innerText = `${stats.progressPct}%`;
    this.progressBarFill.style.width = `${stats.progressPct}%`;
    this.statDaysDone.innerText = stats.doneDays;
    this.statDaysTotal.innerText = stats.totalDays;
    if (this.statCalendarProgress) {
      this.statCalendarProgress.innerText = `${stats.elapsedCalendarDays} de ${stats.totalCalendarDays} corridos`;
    }

    // Mini Stat Pills Dinâmicas
    this.statWeeksLeft.innerText = stats.weeksLeft;
    this.statHoursLeft.innerText = `${stats.hoursLeft}h`;
    this.statCalendarDays.innerText = stats.calendarDaysLeft;
    if (this.statCalendarDaysSub) {
      this.statCalendarDaysSub.innerText = `dias corridos (${stats.totalCalendarDays} tot.)`;
    }

    // Confetti ao atingir 100%
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
    this.saveState(true);
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
      this.saveState(true);
      this.showToast("Recesso removido e sincronizado no Supabase!", "info");
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
    this.saveState(true);
    this.playSound("success");
    this.showToast("Configurações salvas e sincronizadas no Supabase!", "success");
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
    this.saveState(true);
    this.playSound("success");
    this.showToast("Novo recesso adicionado e sincronizado no Supabase!", "success");
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

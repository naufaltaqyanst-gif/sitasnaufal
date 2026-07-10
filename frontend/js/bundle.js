(() => {
  // js/history.js
  var onNavigateCallback = null;
  function initHistory(callback) {
    onNavigateCallback = callback;
    window.addEventListener("popstate", (e) => {
      const state2 = e.state || { page: "dashboard", params: {} };
      onNavigateCallback(state2.page, state2.params || {}, { fromPopState: true });
    });
  }
  function navigateTo(pageId, params = {}, { replace = false } = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `#${pageId}${query ? `?${query}` : ""}`;
    const state2 = { page: pageId, params };
    if (replace) {
      window.history.replaceState(state2, "", url);
    } else {
      window.history.pushState(state2, "", url);
    }
  }
  function getInitialRoute() {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return { page: "dashboard", params: {} };
    const [page, queryString] = hash.split("?");
    const params = Object.fromEntries(new URLSearchParams(queryString || ""));
    return { page: page || "dashboard", params };
  }

  // js/ui.js
  function announce(message) {
    let liveRegion = document.getElementById("sr-live-region");
    if (!liveRegion) {
      liveRegion = document.createElement("div");
      liveRegion.id = "sr-live-region";
      liveRegion.setAttribute("aria-live", "polite");
      liveRegion.setAttribute("role", "status");
      liveRegion.className = "sr-only";
      document.body.appendChild(liveRegion);
    }
    liveRegion.textContent = "";
    requestAnimationFrame(() => {
      liveRegion.textContent = message;
    });
  }
  function showToast(title, msg, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    const iconMap = { success: "check_circle", error: "error", info: "info" };
    const colorMap = { success: "bg-secondary", error: "bg-error", info: "bg-primary" };
    toast.setAttribute("role", type === "error" ? "alert" : "status");
    toast.className = "toast-in bg-white border border-outline-variant shadow-2xl rounded-xl p-4 flex items-start gap-3 w-80";
    toast.innerHTML = `
    <div class="w-9 h-9 rounded-lg ${colorMap[type]} flex items-center justify-center shrink-0" aria-hidden="true">
      <span class="material-symbols-outlined text-white text-lg">${iconMap[type]}</span>
    </div>
    <div class="flex-1">
      <p class="font-bold text-sm text-primary"></p>
      <p class="text-xs text-outline mt-0.5"></p>
    </div>`;
    toast.querySelector("p.font-bold").textContent = title;
    toast.querySelector("p.text-xs").textContent = msg;
    container.appendChild(toast);
    announce(`${title}. ${msg}`);
    setTimeout(() => {
      toast.classList.remove("toast-in");
      toast.classList.add("toast-out");
      setTimeout(() => toast.remove(), 420);
    }, 3200);
  }
  function setButtonLoading(buttonEl, isLoading, loadingText = "Memproses...") {
    if (!buttonEl) return;
    if (isLoading) {
      buttonEl.dataset.originalHtml = buttonEl.innerHTML;
      buttonEl.disabled = true;
      buttonEl.setAttribute("aria-busy", "true");
      buttonEl.innerHTML = `
      <svg class="animate-spin h-5 w-5 inline" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"></path>
      </svg> ${loadingText}`;
    } else {
      buttonEl.disabled = false;
      buttonEl.removeAttribute("aria-busy");
      if (buttonEl.dataset.originalHtml) buttonEl.innerHTML = buttonEl.dataset.originalHtml;
    }
  }
  function setPageLoading(isLoading, message = "Memuat data...") {
    let overlay = document.getElementById("page-loading-overlay");
    if (isLoading) {
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "page-loading-overlay";
        overlay.setAttribute("role", "status");
        overlay.setAttribute("aria-live", "polite");
        overlay.className = "fixed inset-0 bg-primary/40 backdrop-blur-sm z-[999] flex items-center justify-center";
        overlay.innerHTML = `
        <div class="bg-white rounded-2xl px-8 py-6 flex items-center gap-3 shadow-2xl">
          <svg class="animate-spin h-6 w-6 text-secondary" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"></path>
          </svg>
          <span class="font-semibold text-primary" id="page-loading-text"></span>
        </div>`;
        document.body.appendChild(overlay);
      }
      document.getElementById("page-loading-text").textContent = message;
      overlay.classList.remove("hidden");
    } else if (overlay) {
      overlay.classList.add("hidden");
    }
  }
  function confirmDialog({
    title = "Konfirmasi",
    message = "Apakah Anda yakin?",
    confirmText = "Ya, Lanjutkan",
    cancelText = "Batal",
    danger = false
  } = {}) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "fixed inset-0 bg-primary/50 z-[1000] flex items-center justify-center p-4";
      overlay.setAttribute("role", "presentation");
      const dialog = document.createElement("div");
      dialog.setAttribute("role", "alertdialog");
      dialog.setAttribute("aria-modal", "true");
      dialog.setAttribute("aria-labelledby", "confirm-dialog-title");
      dialog.setAttribute("aria-describedby", "confirm-dialog-message");
      dialog.className = "anim-card bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6";
      dialog.innerHTML = `
      <h2 id="confirm-dialog-title" class="text-lg font-bold text-primary mb-2"></h2>
      <p id="confirm-dialog-message" class="text-sm text-outline mb-6"></p>
      <div class="flex justify-end gap-3">
        <button type="button" data-action="cancel" class="px-4 py-2 rounded-lg font-semibold text-sm text-primary hover:bg-background transition-colors"></button>
        <button type="button" data-action="confirm" class="px-4 py-2 rounded-lg font-semibold text-sm text-white transition-colors ${danger ? "bg-error hover:opacity-90" : "bg-secondary hover:opacity-90"}"></button>
      </div>`;
      dialog.querySelector("#confirm-dialog-title").textContent = title;
      dialog.querySelector("#confirm-dialog-message").textContent = message;
      dialog.querySelector('[data-action="cancel"]').textContent = cancelText;
      dialog.querySelector('[data-action="confirm"]').textContent = confirmText;
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
      const previouslyFocused = document.activeElement;
      const confirmBtn = dialog.querySelector('[data-action="confirm"]');
      const cancelBtn = dialog.querySelector('[data-action="cancel"]');
      cancelBtn.focus();
      function cleanup(result) {
        overlay.remove();
        if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
        resolve(result);
      }
      confirmBtn.addEventListener("click", () => cleanup(true));
      cancelBtn.addEventListener("click", () => cleanup(false));
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) cleanup(false);
      });
      dialog.addEventListener("keydown", (e) => {
        if (e.key === "Escape") cleanup(false);
        if (e.key === "Tab") {
          const focusables = [cancelBtn, confirmBtn];
          const idx = focusables.indexOf(document.activeElement);
          e.preventDefault();
          const next = e.shiftKey ? (idx - 1 + focusables.length) % focusables.length : (idx + 1) % focusables.length;
          focusables[next].focus();
        }
      });
    });
  }
  function showOfflineCacheWarning(show) {
    let banner = document.getElementById("offline-cache-banner");
    if (show) {
      if (banner) return;
      banner = document.createElement("div");
      banner.id = "offline-cache-banner";
      banner.setAttribute("role", "alert");
      banner.className = "fixed top-0 inset-x-0 z-[998] bg-amber-500 text-white text-xs font-semibold text-center py-2 px-4";
      banner.textContent = "Tidak dapat terhubung ke server. Data yang ditampilkan berasal dari cache lokal terakhir dan mungkin tidak terkini.";
      document.body.prepend(banner);
    } else if (banner) {
      banner.remove();
    }
  }

  // js/errors.js
  var ApiError = class extends Error {
    constructor(message, status, details) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.details = details || [];
    }
  };
  function toUserMessage(err) {
    if (err instanceof ApiError) {
      if (err.details && err.details.length) {
        return err.details.map((d) => d.message).join(" ");
      }
      return err.message || "Terjadi kesalahan saat menghubungi server.";
    }
    if (err && err.name === "AbortError") {
      return "Permintaan dibatalkan karena memakan waktu terlalu lama.";
    }
    if (err instanceof TypeError) {
      return "Tidak dapat terhubung ke server. Periksa koneksi internet Anda atau coba lagi nanti.";
    }
    return "Terjadi kesalahan tak terduga. Silakan coba lagi.";
  }
  function logError(context, err) {
    console.error(`[SITAS Sumut] ${context}:`, err);
  }

  // js/constants.js
  var API_BASE_URL = typeof window !== "undefined" && window.SITAS_API_BASE_URL || "http://localhost:4000/api";
  var STORAGE_KEYS = {
    // Hanya dipakai sebagai CACHE OFFLINE sementara, BUKAN sumber kebenaran data.
    // Sumber kebenaran selalu server (database) — lihat js/state.js.
    ACCESS_TOKEN: "sitas_access_token",
    // disimpan di memori (lihat auth.js), bukan localStorage
    REFRESH_TOKEN: "sitas_refresh_token",
    // boleh persist agar "tetap masuk" antar sesi browser
    OFFLINE_CACHE: "sitas_offline_cache_v2",
    LAST_SYNC: "sitas_last_sync"
  };
  var GRADE_CLASS_MAP = {
    "A+": "grade-Aplus",
    A: "grade-A",
    B: "grade-B",
    C: "grade-C",
    D: "grade-D"
  };
  var STATUS_COLOR_MAP = {
    Elite: "bg-secondary text-white",
    Aktif: "bg-secondary/10 text-secondary",
    Cadangan: "bg-amber-100 text-amber-700",
    Ditangguhkan: "bg-error-container text-error"
  };
  var PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  var EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // js/tokenStore.js
  var accessToken = null;
  function getAccessToken() {
    return accessToken;
  }
  function setAccessToken(token) {
    accessToken = token;
  }
  function getRefreshToken() {
    try {
      return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch {
      return null;
    }
  }
  function setRefreshToken(token) {
    try {
      if (token) localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
      else localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch {
    }
  }
  function clearTokens() {
    accessToken = null;
    setRefreshToken(null);
  }

  // js/apiClient.js
  var DEFAULT_TIMEOUT_MS = 15e3;
  var refreshInFlight = null;
  async function refreshAccessToken() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new ApiError("Sesi tidak ditemukan. Silakan masuk kembali.", 401);
    if (!refreshInFlight) {
      refreshInFlight = fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken })
      }).then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new ApiError(data.error || "Gagal memperbarui sesi.", res.status);
        setAccessToken(data.accessToken);
        return data.accessToken;
      }).finally(() => {
        refreshInFlight = null;
      });
    }
    return refreshInFlight;
  }
  async function request(path, options = {}) {
    const { method = "GET", body, auth = true, signal } = options;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    const combinedSignal = signal || controller.signal;
    const doFetch = async () => {
      const headers = { "Content-Type": "application/json" };
      if (auth) {
        const token = getAccessToken();
        if (token) headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        body: body !== void 0 ? JSON.stringify(body) : void 0,
        signal: combinedSignal
      });
      const data = await res.json().catch(() => ({}));
      return { res, data };
    };
    try {
      let { res, data } = await doFetch();
      if (res.status === 401 && data.code === "TOKEN_EXPIRED" && auth) {
        try {
          await refreshAccessToken();
          ({ res, data } = await doFetch());
        } catch (refreshErr) {
          clearTokens();
          throw new ApiError("Sesi Anda telah berakhir. Silakan masuk kembali.", 401);
        }
      }
      if (!res.ok) {
        throw new ApiError(data.error || `Permintaan gagal (${res.status})`, res.status, data.details);
      }
      return data;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      logError(`API ${method} ${path}`, err);
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
  var apiClient = {
    get: (path, options) => request(path, { ...options, method: "GET" }),
    post: (path, body, options) => request(path, { ...options, method: "POST", body }),
    put: (path, body, options) => request(path, { ...options, method: "PUT", body }),
    patch: (path, body, options) => request(path, { ...options, method: "PATCH", body }),
    delete: (path, options) => request(path, { ...options, method: "DELETE" })
  };

  // js/state.js
  var state = {
    athletes: [],
    users: [],
    tournaments: [],
    currentUser: null,
    isOfflineCache: false
  };
  function readOfflineCache() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_CACHE);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  function writeOfflineCache() {
    try {
      localStorage.setItem(
        STORAGE_KEYS.OFFLINE_CACHE,
        JSON.stringify({ athletes: state.athletes, tournaments: state.tournaments })
      );
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, (/* @__PURE__ */ new Date()).toISOString());
    } catch {
    }
  }
  async function loadAthletes({ search, region, sport, minScore } = {}) {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (region) params.set("region", region);
      if (sport) params.set("sport", sport);
      if (minScore) params.set("minScore", minScore);
      const query = params.toString();
      const data = await apiClient.get(`/athletes${query ? `?${query}` : ""}`);
      state.athletes = data.athletes;
      state.isOfflineCache = false;
      showOfflineCacheWarning(false);
      writeOfflineCache();
      return state.athletes;
    } catch (err) {
      if (err instanceof ApiError && err.status && err.status < 500 && err.status !== 0) {
        throw err;
      }
      const cache = readOfflineCache();
      if (cache) {
        state.athletes = cache.athletes || [];
        state.isOfflineCache = true;
        showOfflineCacheWarning(true);
        return state.athletes;
      }
      throw err;
    }
  }
  async function loadTournaments() {
    try {
      const data = await apiClient.get("/tournaments");
      state.tournaments = data.tournaments;
      writeOfflineCache();
      return state.tournaments;
    } catch (err) {
      const cache = readOfflineCache();
      if (cache) {
        state.tournaments = cache.tournaments || [];
        return state.tournaments;
      }
      throw err;
    }
  }
  async function loadUsers() {
    const data = await apiClient.get("/users");
    state.users = data.users;
    return state.users;
  }
  async function createAthlete(payload) {
    const data = await apiClient.post("/athletes", payload);
    state.athletes.unshift(data.athlete);
    writeOfflineCache();
    return data.athlete;
  }
  async function updateAthlete(id, payload) {
    const data = await apiClient.put(`/athletes/${id}`, payload);
    const idx = state.athletes.findIndex((a) => a.id === id);
    if (idx !== -1) state.athletes[idx] = data.athlete;
    writeOfflineCache();
    return data.athlete;
  }
  async function deleteAthleteById(id) {
    await apiClient.delete(`/athletes/${id}`);
    state.athletes = state.athletes.filter((a) => a.id !== id);
    writeOfflineCache();
  }
  function getState() {
    return state;
  }
  function setCurrentUser(user) {
    state.currentUser = user;
  }
  function getAthleteById(id) {
    return state.athletes.find((a) => a.id === Number(id));
  }

  // js/validation.js
  var rules = {
    required: (label) => (v) => v && String(v).trim() !== "" ? null : `${label} wajib diisi.`,
    email: () => (v) => EMAIL_REGEX.test(String(v).trim()) ? null : "Format email tidak valid.",
    password: () => (v) => PASSWORD_REGEX.test(v) ? null : "Password minimal 8 karakter dan mengandung huruf besar, huruf kecil, serta angka.",
    matches: (otherLabel, otherValueGetter) => (v) => v === otherValueGetter() ? null : `Konfirmasi tidak cocok dengan ${otherLabel}.`,
    range: (label, min, max) => (v) => {
      const n = Number(v);
      if (Number.isNaN(n)) return `${label} harus berupa angka.`;
      if (n < min || n > max) return `${label} harus di antara ${min} dan ${max}.`;
      return null;
    },
    maxLength: (label, max) => (v) => String(v || "").length <= max ? null : `${label} maksimal ${max} karakter.`,
    checked: (label) => (v) => v ? null : `${label} harus dicentang.`
  };
  function validateField(value, fieldRules) {
    for (const rule of fieldRules) {
      const message = rule(value);
      if (message) return message;
    }
    return null;
  }
  function validateForm(values, schema) {
    const errors = {};
    for (const field of Object.keys(schema)) {
      const message = validateField(values[field], schema[field]);
      if (message) errors[field] = message;
    }
    return { valid: Object.keys(errors).length === 0, errors };
  }
  function bindRealtimeValidation(inputEl, fieldRules, { on = "blur" } = {}) {
    const errorEl = document.getElementById(`${inputEl.id}-error`);
    function run() {
      const message = validateField(inputEl.value, fieldRules);
      inputEl.setAttribute("aria-invalid", message ? "true" : "false");
      if (errorEl) {
        errorEl.textContent = message || "";
        errorEl.classList.toggle("hidden", !message);
      }
      inputEl.classList.toggle("border-error", Boolean(message));
      inputEl.classList.toggle("border-outline-variant", !message);
      return message;
    }
    inputEl.addEventListener(on, run);
    inputEl.addEventListener("input", () => {
      if (inputEl.dataset.touched === "1") run();
    });
    inputEl.addEventListener("blur", () => {
      inputEl.dataset.touched = "1";
    });
    return run;
  }

  // js/auth.js
  async function login(email, password) {
    const { valid, errors } = validateForm(
      { email, password },
      { email: [rules.required("Email"), rules.email()], password: [rules.required("Password")] }
    );
    if (!valid) return { ok: false, errors };
    try {
      const data = await apiClient.post("/auth/login", { email, password }, { auth: false });
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setCurrentUser(data.user);
      return { ok: true, user: data.user };
    } catch (err) {
      return { ok: false, message: toUserMessage(err) };
    }
  }
  async function register({ name, email, password, passwordConfirm, role, termsAccepted }) {
    const { valid, errors } = validateForm(
      { name, email, password, passwordConfirm, termsAccepted },
      {
        name: [rules.required("Nama lengkap")],
        email: [rules.required("Email"), rules.email()],
        password: [rules.required("Password"), rules.password()],
        passwordConfirm: [rules.matches("password", () => password)],
        termsAccepted: [rules.checked("Ketentuan penggunaan")]
      }
    );
    if (!valid) return { ok: false, errors };
    try {
      const data = await apiClient.post("/auth/register", { name, email, password, role }, { auth: false });
      return { ok: true, user: data.user };
    } catch (err) {
      return { ok: false, message: toUserMessage(err) };
    }
  }
  async function forgotPassword(email) {
    const { valid, errors } = validateForm(
      { email },
      { email: [rules.required("Email"), rules.email()] }
    );
    if (!valid) return { ok: false, errors };
    try {
      const data = await apiClient.post("/auth/forgot-password", { email }, { auth: false });
      return { ok: true, message: data.message, devToken: data.devToken };
    } catch (err) {
      return { ok: false, message: toUserMessage(err) };
    }
  }
  async function logout() {
    try {
      const refreshToken = getRefreshToken();
      await apiClient.post("/auth/logout", { refreshToken });
    } catch (err) {
    } finally {
      clearTokens();
      setCurrentUser(null);
      showToast("Sesi Berakhir", "Anda telah keluar dari sistem.", "info");
    }
  }
  async function restoreSession() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;
    try {
      const refreshData = await apiClient.post("/auth/refresh", { refreshToken }, { auth: false });
      setAccessToken(refreshData.accessToken);
      const meData = await apiClient.get("/auth/me");
      setCurrentUser(meData.user);
      return true;
    } catch {
      clearTokens();
      return false;
    }
  }

  // js/score.js
  var ACHIEVEMENT_WEIGHTS = {
    "Emas Nasional": 30,
    "Perak Nasional": 22,
    "Perunggu Nasional": 16,
    "Emas Daerah": 15,
    "Perak Daerah": 10,
    "Perunggu Daerah": 6,
    Partisipasi: 3
  };
  var GRADE_THRESHOLDS = [
    { min: 85, grade: "A+" },
    { min: 75, grade: "A" },
    { min: 65, grade: "B" },
    { min: 55, grade: "C" },
    { min: 0, grade: "D" }
  ];
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  function calculateScore(athlete) {
    if (!athlete || typeof athlete !== "object") {
      throw new TypeError("calculateScore membutuhkan objek athlete yang valid");
    }
    const { age, physical, training, evaluation, achievements } = athlete;
    const ageScore = clamp((21 - age) / (21 - 15) * 100, 0, 100);
    let achvScore = 0;
    (achievements || []).forEach((x) => {
      achvScore += ACHIEVEMENT_WEIGHTS[x.type] || 0;
    });
    achvScore = Math.min(achvScore, 100);
    const physScore = Math.min(
      100,
      physical.vo2max / 70 * 40 + physical.verticalJump / 80 * 30 + Math.max(0, (5 - physical.run30m) / 2 * 30)
    );
    const trainScore = Math.min(100, training.sessions / 10 * 60 + training.duration / 180 * 40);
    const evalSum = Object.values(evaluation).reduce((s, v) => s + v, 0);
    const evalScore = Math.min(100, evalSum / 50 * 100);
    const total = ageScore * 0.15 + achvScore * 0.3 + physScore * 0.25 + trainScore * 0.1 + evalScore * 0.2;
    return {
      total: Math.round(total),
      ageScore: Math.round(ageScore),
      achvScore: Math.round(achvScore),
      physScore: Math.round(physScore),
      trainScore: Math.round(trainScore),
      evalScore: Math.round(evalScore)
    };
  }
  function getGrade(score) {
    const found = GRADE_THRESHOLDS.find((t) => score >= t.min);
    return found ? found.grade : "D";
  }

  // js/charts.js
  var registry = /* @__PURE__ */ new Map();
  function safeCreateChart(key, canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.warn(`[charts] Elemen canvas #${canvasId} tidak ditemukan; chart "${key}" dilewati.`);
      return null;
    }
    if (typeof Chart === "undefined") {
      console.warn("[charts] Library Chart.js belum dimuat.");
      return null;
    }
    destroyChart(key);
    const instance = new Chart(canvas, config);
    registry.set(key, instance);
    return instance;
  }
  function destroyChart(key) {
    const existing = registry.get(key);
    if (existing) {
      existing.destroy();
      registry.delete(key);
    }
  }

  // js/athletes.js
  function medalEmoji(type) {
    if (type.includes("Emas")) return "\u{1F947}";
    if (type.includes("Perak")) return "\u{1F948}";
    if (type.includes("Perunggu")) return "\u{1F949}";
    return "\u{1F396}\uFE0F";
  }
  function initials(name) {
    return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  }
  function formatDate(d) {
    return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  }
  var currentEval = { discipline: 8, mental: 8, leadership: 8, focus: 8, adaptability: 8 };
  var evalListenersBound = false;
  async function renderAthleteTable() {
    const tbody = document.getElementById("athlete-table-body");
    if (!tbody) return;
    setPageLoading(true, "Memuat data atlet dari server...");
    try {
      const search = document.getElementById("f-search")?.value || "";
      const region = document.getElementById("f-region")?.value || "";
      const sport = document.getElementById("f-sport")?.value || "";
      const minScore = document.getElementById("f-minscore")?.value || "";
      const list = await loadAthletes({ search, region, sport, minScore });
      const countEl = document.getElementById("athlete-count");
      if (countEl) countEl.innerText = list.length;
      tbody.innerHTML = list.map((a, i) => {
        const bestAchv = a.achievements && a.achievements[0] ? a.achievements[0] : null;
        return `<tr class="row-stagger hover:bg-background transition-colors" style="animation-delay:${i * 0.03}s">
        <td class="px-5 py-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm avatar-pulse" aria-hidden="true">${initials(a.name)}</div>
            <div>
              <p class="font-bold text-primary text-sm">${a.name} ${bestAchv ? medalEmoji(bestAchv.type) : ""}</p>
              <p class="text-[11px] text-outline">${a.gender} \xB7 ${a.age} thn</p>
            </div>
          </div>
        </td>
        <td class="px-5 py-3 text-sm text-outline">${a.sport}</td>
        <td class="px-5 py-3 text-sm text-outline">${a.region}</td>
        <td class="px-5 py-3"><span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${STATUS_COLOR_MAP[a.status] || "bg-background text-outline"}">${a.status}</span></td>
        <td class="px-5 py-3 text-center">
          <span class="inline-block min-w-[40px] px-2.5 py-1 rounded-full font-bold text-xs ${GRADE_CLASS_MAP[a.grade]}">${a.grade}</span>
          <p class="text-[10px] text-outline mt-0.5 font-bold">${a.score} pts</p>
        </td>
        <td class="px-5 py-3 text-right">
          <button class="p-1.5 hover:bg-secondary/10 hover:text-secondary rounded-lg transition-all" aria-label="Lihat detail ${a.name}" title="Detail" onclick="SITAS.openDetail(${a.id})"><span class="material-symbols-outlined text-lg" aria-hidden="true">visibility</span></button>
          <button class="p-1.5 hover:bg-background rounded-lg transition-all" aria-label="Edit data ${a.name}" title="Edit" onclick="SITAS.editAthlete(${a.id})"><span class="material-symbols-outlined text-lg" aria-hidden="true">edit</span></button>
          <button class="p-1.5 hover:bg-error-container hover:text-error rounded-lg transition-all" aria-label="Hapus data ${a.name}" title="Hapus" onclick="SITAS.deleteAthlete(${a.id})"><span class="material-symbols-outlined text-lg" aria-hidden="true">delete</span></button>
        </td>
      </tr>`;
      }).join("") || `<tr><td colspan="6" class="px-5 py-10 text-center text-outline">Tidak ada atlet yang cocok dengan filter.</td></tr>`;
    } catch (err) {
      showToast("Gagal Memuat Data", toUserMessage(err), "error");
    } finally {
      setPageLoading(false);
    }
  }
  function globalSearch(val, showPage2) {
    showPage2("athletes");
    const f = document.getElementById("f-search");
    if (f) f.value = val;
    renderAthleteTable();
  }
  async function deleteAthlete(id) {
    const athlete = getAthleteById(id);
    const confirmed = await confirmDialog({
      title: "Hapus Data Atlet?",
      message: `Data "${athlete ? athlete.name : "atlet ini"}" akan dihapus permanen dan tidak dapat dikembalikan.`,
      confirmText: "Ya, Hapus",
      danger: true
    });
    if (!confirmed) return;
    try {
      await deleteAthleteById(id);
      showToast("Data Dihapus", "Data atlet telah dihapus dari sistem.", "error");
      renderAthleteTable();
    } catch (err) {
      showToast("Gagal Menghapus", toUserMessage(err), "error");
    }
  }
  function openDetail(id, showPage2) {
    const a = getAthleteById(id);
    if (!a) {
      showToast("Data Tidak Ditemukan", "Atlet tidak ditemukan di data yang dimuat.", "error");
      return;
    }
    const sc = a.scoreBreakdown || calculateScore(a);
    const grade = a.grade || getGrade(sc.total);
    document.getElementById("detail-content").innerHTML = `
    <aside class="col-span-12 lg:col-span-4 space-y-5">
      <div class="anim-card bg-white border border-outline-variant rounded-2xl p-6 shadow-sm text-center relative overflow-hidden">
        <span class="absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-black uppercase ${a.status === "Elite" ? "bg-secondary text-white" : "bg-background text-outline"}">${a.status}</span>
        <div class="w-32 h-32 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary mb-4 avatar-pulse">${a.photo ? `<img src="${a.photo}" class="w-full h-full object-cover rounded-full" alt="Foto ${a.name}"/>` : initials(a.name)}</div>
        <h1 class="text-xl font-bold text-primary">${a.name}</h1>
        <p class="text-outline text-sm mb-4">${a.sport} \xB7 ${a.region}</p>
        <div class="grid grid-cols-2 gap-3 pt-4 border-t border-outline-variant">
          <div class="p-3 bg-background rounded-lg"><p class="text-[10px] font-bold uppercase text-outline mb-1">Grade</p><span class="inline-block px-4 py-1.5 rounded-lg font-bold text-lg ${GRADE_CLASS_MAP[grade]}">${grade}</span></div>
          <div class="p-3 bg-background rounded-lg flex flex-col items-center justify-center"><p class="text-[10px] font-bold uppercase text-outline mb-1">Skor</p><span class="text-2xl font-extrabold text-secondary">${sc.total}</span></div>
        </div>
      </div>
      <div class="anim-card bg-white border border-outline-variant rounded-2xl p-6 shadow-sm">
        <h3 class="font-bold text-primary mb-4 flex items-center gap-2"><span class="material-symbols-outlined text-secondary" aria-hidden="true">info</span> Informasi Umum</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between py-2 border-b border-outline-variant"><span class="text-outline">Jenis Kelamin</span><span class="font-semibold">${a.gender}</span></div>
          <div class="flex justify-between py-2 border-b border-outline-variant"><span class="text-outline">Usia</span><span class="font-semibold">${a.age} tahun</span></div>
          <div class="flex justify-between py-2 border-b border-outline-variant"><span class="text-outline">Tinggi / Berat</span><span class="font-semibold">${a.height || "-"} cm / ${a.weight || "-"} kg</span></div>
          <div class="flex justify-between py-2"><span class="text-outline">Frekuensi Latihan</span><span class="font-semibold">${a.training.sessions}x/minggu, ${a.training.duration} mnt</span></div>
        </div>
        ${a.medicalNotes ? `<div class="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg"><p class="text-[10px] font-bold uppercase text-amber-700 mb-1">Catatan Medis</p><p class="text-xs text-amber-800">${a.medicalNotes}</p></div>` : ""}
      </div>
    </aside>
    <div class="col-span-12 lg:col-span-8 space-y-5">
      <div class="anim-card bg-white border border-outline-variant rounded-2xl p-6 shadow-sm">
        <h3 class="font-bold text-primary mb-5 flex items-center gap-2"><span class="material-symbols-outlined text-secondary" aria-hidden="true">analytics</span> Kompetensi Atlet</h3>
        <div class="h-72"><canvas id="chart-detail-radar" role="img" aria-label="Grafik radar kompetensi ${a.name}"></canvas></div>
      </div>
      <div class="anim-card bg-white border border-outline-variant rounded-2xl p-6 shadow-sm">
        <h3 class="font-bold text-primary mb-4 flex items-center gap-2"><span class="material-symbols-outlined text-secondary" aria-hidden="true">emoji_events</span> Riwayat Prestasi</h3>
        <div class="space-y-3">
          ${a.achievements && a.achievements.length ? a.achievements.map(
      (ach) => `
            <div class="flex items-center gap-4 p-4 bg-background rounded-xl">
              <div class="text-3xl" aria-hidden="true">${medalEmoji(ach.type)}</div>
              <div class="flex-1"><p class="font-bold text-primary">${ach.title}</p><p class="text-xs text-outline">${ach.type}</p></div>
              <p class="font-bold text-secondary">${ach.year}</p>
            </div>`
    ).join("") : `<p class="text-outline text-sm italic">Belum ada prestasi tercatat.</p>`}
        </div>
      </div>
      <div class="anim-card bg-white border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
        <div class="bg-primary text-white p-5"><h3 class="font-bold flex items-center gap-2"><span class="material-symbols-outlined text-accent" aria-hidden="true">fitness_center</span> Data Fisik &amp; Latihan</h3></div>
        <table class="w-full text-left">
          <caption class="sr-only">Data fisik dan latihan ${a.name}</caption>
          <thead class="bg-background text-[10px] font-bold uppercase text-outline"><tr><th scope="col" class="px-5 py-3">Parameter</th><th scope="col" class="px-5 py-3">Hasil</th><th scope="col" class="px-5 py-3">Kontribusi Skor</th></tr></thead>
          <tbody class="divide-y divide-outline-variant text-sm">
            <tr><td class="px-5 py-3 font-bold">VO2 Max</td><td class="px-5 py-3">${a.physical.vo2max} ml/kg/min</td><td class="px-5 py-3 text-secondary font-bold">Fisik ${sc.physScore}%</td></tr>
            <tr><td class="px-5 py-3 font-bold">Lari 30m</td><td class="px-5 py-3">${a.physical.run30m} detik</td><td class="px-5 py-3">-</td></tr>
            <tr><td class="px-5 py-3 font-bold">Vertical Jump</td><td class="px-5 py-3">${a.physical.verticalJump} cm</td><td class="px-5 py-3">-</td></tr>
            <tr><td class="px-5 py-3 font-bold">Evaluasi Pelatih</td><td class="px-5 py-3">Rata-rata ${(Object.values(a.evaluation).reduce((s, v) => s + v, 0) / 5).toFixed(1)}/10</td><td class="px-5 py-3 text-secondary font-bold">Evaluasi ${sc.evalScore}%</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;
    showPage2("detail");
    safeCreateChart("detailRadar", "chart-detail-radar", {
      type: "radar",
      data: {
        labels: ["Disiplin", "Mental", "Kepemimpinan", "Fokus", "Adaptabilitas"],
        datasets: [
          {
            label: "Evaluasi (skala 10)",
            data: [
              a.evaluation.discipline,
              a.evaluation.mental,
              a.evaluation.leadership,
              a.evaluation.focus,
              a.evaluation.adaptability
            ],
            backgroundColor: "rgba(0,108,73,0.2)",
            borderColor: "#006c49",
            pointBackgroundColor: "#006c49"
          }
        ]
      },
      options: { maintainAspectRatio: false, scales: { r: { min: 0, max: 10, ticks: { stepSize: 2 }, grid: { color: "#eef1f3" } } } }
    });
  }
  function resetEvalSliders() {
    currentEval = { discipline: 8, mental: 8, leadership: 8, focus: 8, adaptability: 8 };
    document.querySelectorAll(".eval-slider input").forEach((inp) => inp.value = 8);
    document.querySelectorAll(".eval-slider span").forEach((s) => s.innerText = 8);
  }
  function onEvalInput(key, val) {
    currentEval[key] = parseInt(val, 10);
    const lbl = document.getElementById("lbl-" + key);
    if (lbl) lbl.innerText = val;
    updateLivePreview();
  }
  function previewImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Validasi Gagal", "File harus berupa gambar.", "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast("Validasi Gagal", "Ukuran foto maksimal 2MB.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.getElementById("photo-preview");
      preview.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover" alt="Pratinjau foto atlet"/>`;
      preview.dataset.photo = e.target.result;
    };
    reader.readAsDataURL(file);
  }
  function bindFormValidation() {
    const nameInput = document.getElementById("fld-name");
    const ageInput = document.getElementById("fld-age");
    if (nameInput) bindRealtimeValidation(nameInput, [rules.required("Nama atlet")]);
    if (ageInput) bindRealtimeValidation(ageInput, [rules.required("Usia"), rules.range("Usia", 10, 40)]);
    if (!evalListenersBound) {
      document.querySelectorAll(".eval-slider input").forEach((inp) => {
        inp.addEventListener("input", () => onEvalInput(inp.closest(".eval-slider").dataset.eval, inp.value));
      });
      ["fld-age", "fld-run30m", "fld-jump", "fld-vo2", "fld-sessions", "fld-duration"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", updateLivePreview);
      });
      evalListenersBound = true;
    }
  }
  function openInputForm(isEdit, showPage2) {
    if (!isEdit) {
      document.getElementById("athlete-form").reset();
      document.getElementById("fld-id").value = "";
      document.getElementById("input-title").innerText = "Input Data Atlet";
      document.getElementById("photo-preview").innerHTML = '<span class="material-symbols-outlined text-outline text-3xl" aria-hidden="true">no_photography</span>';
      document.getElementById("photo-preview").dataset.photo = "";
      resetEvalSliders();
      document.getElementById("fld-medical").value = "";
    }
    bindFormValidation();
    showPage2("input");
    updateLivePreview();
  }
  function editAthlete(id, showPage2) {
    const a = getAthleteById(id);
    if (!a) return;
    document.getElementById("input-title").innerText = "Edit Data Atlet: " + a.name;
    document.getElementById("fld-id").value = a.id;
    document.getElementById("fld-name").value = a.name;
    document.getElementById("fld-gender").value = a.gender;
    document.getElementById("fld-age").value = a.age;
    document.getElementById("fld-sport").value = a.sport;
    document.getElementById("fld-region").value = a.region;
    document.getElementById("fld-status").value = a.status;
    document.getElementById("fld-height").value = a.height || "";
    document.getElementById("fld-weight").value = a.weight || "";
    document.getElementById("fld-run30m").value = a.physical.run30m;
    document.getElementById("fld-jump").value = a.physical.verticalJump;
    document.getElementById("fld-vo2").value = a.physical.vo2max;
    document.getElementById("fld-sessions").value = a.training.sessions;
    document.getElementById("fld-duration").value = a.training.duration;
    document.getElementById("fld-medical").value = a.medicalNotes || "";
    currentEval = { ...a.evaluation };
    Object.keys(currentEval).forEach((k) => {
      const input = document.querySelector(`.eval-slider[data-eval="${k}"] input`);
      if (input) input.value = currentEval[k];
      const lbl = document.getElementById("lbl-" + k);
      if (lbl) lbl.innerText = currentEval[k];
    });
    const preview = document.getElementById("photo-preview");
    if (a.photo) {
      preview.innerHTML = `<img src="${a.photo}" class="w-full h-full object-cover" alt="Foto ${a.name}"/>`;
      preview.dataset.photo = a.photo;
    } else {
      preview.innerHTML = '<span class="material-symbols-outlined text-outline text-3xl" aria-hidden="true">no_photography</span>';
      preview.dataset.photo = "";
    }
    openInputForm(true, showPage2);
  }
  function readAthleteFormValues() {
    return {
      id: document.getElementById("fld-id").value,
      name: document.getElementById("fld-name").value.trim(),
      age: parseInt(document.getElementById("fld-age").value, 10) || 0,
      gender: document.getElementById("fld-gender").value,
      sport: document.getElementById("fld-sport").value,
      region: document.getElementById("fld-region").value,
      status: document.getElementById("fld-status").value,
      height: parseInt(document.getElementById("fld-height").value, 10) || null,
      weight: parseInt(document.getElementById("fld-weight").value, 10) || null,
      photo: document.getElementById("photo-preview").dataset.photo || "",
      medicalNotes: document.getElementById("fld-medical").value.trim(),
      physical: {
        run30m: parseFloat(document.getElementById("fld-run30m").value) || 5,
        verticalJump: parseInt(document.getElementById("fld-jump").value, 10) || 40,
        vo2max: parseInt(document.getElementById("fld-vo2").value, 10) || 40
      },
      training: {
        sessions: parseInt(document.getElementById("fld-sessions").value, 10) || 5,
        duration: parseInt(document.getElementById("fld-duration").value, 10) || 100
      },
      evaluation: { ...currentEval }
    };
  }
  function updateLivePreview() {
    const values = readAthleteFormValues();
    const existing = values.id ? getAthleteById(parseInt(values.id, 10)) : null;
    const tempAthlete = { ...values, achievements: existing ? existing.achievements : [] };
    const sc = calculateScore(tempAthlete);
    const previewScoreEl = document.getElementById("preview-score");
    if (!previewScoreEl) return;
    previewScoreEl.innerText = sc.total;
    document.getElementById("preview-bar").style.width = sc.total + "%";
    const grade = getGrade(sc.total);
    const gEl = document.getElementById("preview-grade");
    gEl.innerText = grade;
    gEl.className = "inline-block px-8 py-3 rounded-full font-black text-3xl " + GRADE_CLASS_MAP[grade];
    const notes = {
      "A+": "Talenta Luar Biasa (High Potential)",
      A: "Potensial Nasional",
      B: "Potensial Daerah",
      C: "Pembinaan Berkelanjutan",
      D: "Perlu Evaluasi Lanjutan"
    };
    document.getElementById("preview-note").innerText = notes[grade];
    document.getElementById("pv-age").innerText = sc.ageScore + "%";
    document.getElementById("pv-achv").innerText = sc.achvScore + "%";
    document.getElementById("pv-phys").innerText = sc.physScore + "%";
    document.getElementById("pv-train").innerText = sc.trainScore + "%";
    document.getElementById("pv-eval").innerText = sc.evalScore + "%";
    safeCreateChart("previewRadar", "chart-preview-radar", {
      type: "radar",
      data: {
        labels: ["Usia", "Prestasi", "Fisik", "Latihan", "Evaluasi"],
        datasets: [
          {
            label: "Skor Talenta",
            data: [sc.ageScore, sc.achvScore, sc.physScore, sc.trainScore, sc.evalScore],
            backgroundColor: "rgba(0,108,73,0.18)",
            borderColor: "#006c49",
            borderWidth: 2,
            pointBackgroundColor: "#006c49",
            pointRadius: 3
          }
        ]
      },
      options: {
        maintainAspectRatio: false,
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: { stepSize: 25, backdropColor: "transparent", font: { size: 9 } },
            grid: { color: "#eef1f3" },
            pointLabels: { font: { size: 10, weight: "bold" } }
          }
        },
        plugins: { legend: { display: false } }
      }
    });
  }
  async function submitAthleteForm(showPage2) {
    const values = readAthleteFormValues();
    const submitBtn = document.getElementById("athlete-submit-btn");
    const { valid, errors } = validateForm(values, {
      name: [rules.required("Nama atlet")],
      age: [rules.required("Usia"), rules.range("Usia", 10, 40)]
    });
    if (!valid) {
      showToast("Validasi Gagal", Object.values(errors)[0], "error");
      return;
    }
    const payload = {
      name: values.name,
      gender: values.gender,
      age: values.age,
      sport: values.sport,
      region: values.region,
      status: values.status,
      height: values.height,
      weight: values.weight,
      photo: values.photo,
      medicalNotes: values.medicalNotes,
      physical: values.physical,
      training: values.training,
      evaluation: values.evaluation
    };
    setButtonLoading(submitBtn, true, values.id ? "Menyimpan Perubahan..." : "Menyimpan...");
    try {
      if (values.id) {
        const existing = getAthleteById(parseInt(values.id, 10));
        payload.achievements = existing ? existing.achievements : [];
        await updateAthlete(parseInt(values.id, 10), payload);
        showToast("Berhasil Diperbarui", `Data ${values.name} telah diperbarui.`);
      } else {
        payload.achievements = [{ title: "Baru Terdaftar", type: "Partisipasi", year: (/* @__PURE__ */ new Date()).getFullYear() }];
        await createAthlete(payload);
        showToast("Berhasil Disimpan", `Atlet ${values.name} telah didaftarkan.`);
      }
      announce("Data atlet berhasil disimpan.");
      showPage2("athletes", false);
      renderAthleteTable();
    } catch (err) {
      showToast("Gagal Menyimpan", toUserMessage(err), "error");
    } finally {
      setButtonLoading(submitBtn, false);
    }
  }

  // js/dashboard.js
  function bestAthleteForSport(sport) {
    const list = getState().athletes.filter((a) => a.sport === sport);
    if (!list.length) return null;
    return [...list].sort((a, b) => b.score - a.score)[0];
  }
  function updateKPIs() {
    const { athletes, users } = getState();
    const totalEl = document.getElementById("kpi-total-athletes");
    const usersEl = document.getElementById("kpi-total-users");
    const eliteEl = document.getElementById("kpi-elite-athletes");
    if (totalEl) totalEl.innerText = athletes.length;
    if (usersEl) usersEl.innerText = users.filter((u) => u.status === "Aktif").length;
    if (eliteEl) eliteEl.innerText = athletes.filter((a) => ["A+", "A"].includes(a.grade)).length;
  }
  async function initDashboardCharts() {
    setPageLoading(true, "Memuat dasbor...");
    try {
      await Promise.all([loadAthletes(), loadTournaments()]);
      const { athletes, tournaments } = getState();
      updateKPIs();
      const regions = [...new Set(athletes.map((a) => a.region))];
      const regionCounts = regions.map((r) => athletes.filter((a) => a.region === r).length);
      safeCreateChart("regionBar", "chart-region-bar", {
        type: "bar",
        data: { labels: regions, datasets: [{ label: "Jumlah Atlet", data: regionCounts, backgroundColor: "#006c49", borderRadius: 10, maxBarThickness: 56 }] },
        options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: "#eef1f3" } }, x: { grid: { display: false } } } }
      });
      const sports = [...new Set(athletes.map((a) => a.sport))];
      const sportCounts = sports.map((s) => athletes.filter((a) => a.sport === s).length);
      safeCreateChart("sportDoughnut", "chart-sport-doughnut", {
        type: "doughnut",
        data: { labels: sports, datasets: [{ data: sportCounts, backgroundColor: ["#091426", "#006c49", "#6ffbbe", "#75777d", "#00875c"], borderWidth: 2, borderColor: "#fff" }] },
        options: { cutout: "68%", maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10 } } } } }
      });
      const dashBody = document.getElementById("dash-tournament-body");
      if (dashBody) {
        dashBody.innerHTML = tournaments.slice(0, 4).map((t, i) => {
          const rec = bestAthleteForSport(t.sport);
          return `<tr class="row-stagger hover:bg-background transition-colors" style="animation-delay:${i * 0.05}s">
        <td class="px-5 py-3"><p class="font-bold text-primary text-sm">${t.name}</p><p class="text-xs text-outline">${t.location}</p></td>
        <td class="px-5 py-3 text-xs text-outline">${formatDate(t.date)}</td>
        <td class="px-5 py-3 text-sm font-semibold">${rec ? rec.name : "-"}</td>
      </tr>`;
        }).join("");
      }
      const top3 = [...athletes].sort((a, b) => b.score - a.score).slice(0, 3);
      const medalColors = ["#D4AF37", "#C0C0C0", "#CD7F32"];
      const top3El = document.getElementById("dash-top3");
      if (top3El) {
        top3El.innerHTML = top3.map(
          (a, i) => `
      <div class="flex items-center gap-3 p-3 rounded-xl ${i === 0 ? "bg-secondary/5 border border-secondary/15" : "hover:bg-background"} transition-all cursor-pointer" onclick="SITAS.openDetail(${a.id})">
        <div class="relative">
          <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary" aria-hidden="true">${initials(a.name)}</div>
          <div class="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 border-white" style="background:${medalColors[i]}" aria-hidden="true">${i + 1}</div>
        </div>
        <div class="flex-1">
          <p class="font-bold text-primary text-sm">${a.name}</p>
          <p class="text-[11px] text-outline">${a.sport}</p>
          <div class="w-full bg-background h-1.5 rounded-full mt-1 overflow-hidden"><div class="bg-secondary h-full score-bar-fill" style="width:${a.score}%"></div></div>
        </div>
        <div class="text-right"><p class="font-bold text-secondary">${a.score}</p></div>
      </div>`
        ).join("");
      }
    } catch (err) {
      showToast("Gagal Memuat Dasbor", toUserMessage(err), "error");
    } finally {
      setPageLoading(false);
    }
  }

  // js/reports.js
  async function initReportCharts() {
    setPageLoading(true, "Menyusun laporan...");
    try {
      await Promise.all([loadAthletes(), loadTournaments()]);
      const { athletes } = getState();
      const totalEl = document.getElementById("r-total-athletes");
      const goldEl = document.getElementById("r-total-gold");
      if (totalEl) totalEl.innerText = athletes.length;
      if (goldEl) {
        goldEl.innerText = athletes.reduce(
          (s, a) => s + a.achievements.filter((x) => x.type.includes("Emas")).length,
          0
        );
      }
      const regions = [...new Set(athletes.map((a) => a.region))];
      const regionAvg = regions.map((r) => {
        const list = athletes.filter((a) => a.region === r);
        return { region: r, avg: list.reduce((s, a) => s + a.score, 0) / list.length };
      }).sort((a, b) => b.avg - a.avg);
      const topRegionEl = document.getElementById("r-top-region");
      const effEl = document.getElementById("r-efficiency");
      if (topRegionEl) topRegionEl.innerText = regionAvg[0] ? regionAvg[0].region : "-";
      if (effEl) {
        effEl.innerText = regionAvg.length ? Math.round(regionAvg.reduce((s, r) => s + r.avg, 0) / regionAvg.length) + "%" : "0%";
      }
      const gradeBuckets = { "A+": 0, A: 0, B: 0, C: 0, D: 0 };
      athletes.forEach((a) => gradeBuckets[a.grade]++);
      safeCreateChart("gradeBar", "chart-grade-bar", {
        type: "bar",
        data: {
          labels: Object.keys(gradeBuckets),
          datasets: [{ data: Object.values(gradeBuckets), backgroundColor: ["#006c49", "#00875c", "#22c55e", "#f59e0b", "#75777d"], borderRadius: 10, maxBarThickness: 48 }]
        },
        options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: "#eef1f3" } }, x: { grid: { display: false } } } }
      });
      const sports = [...new Set(athletes.map((a) => a.sport))];
      const sportCounts = sports.map((s) => athletes.filter((a) => a.sport === s).length);
      safeCreateChart("sportReport", "chart-sport-report", {
        type: "pie",
        data: { labels: sports, datasets: [{ data: sportCounts, backgroundColor: ["#091426", "#006c49", "#6ffbbe", "#75777d", "#00875c"], borderWidth: 2, borderColor: "#fff" }] },
        options: { maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10 } } } } }
      });
      const regionListEl = document.getElementById("region-efficiency-list");
      if (regionListEl) {
        regionListEl.innerHTML = regionAvg.map(
          (r) => `
      <div>
        <div class="flex justify-between mb-1"><span class="font-bold text-primary text-sm">${r.region}</span><span class="font-bold text-secondary">${Math.round(r.avg)}%</span></div>
        <div class="w-full bg-background h-2.5 rounded-full overflow-hidden"><div class="h-full bg-secondary score-bar-fill" style="width:${Math.round(r.avg)}%"></div></div>
      </div>`
        ).join("");
      }
    } catch (err) {
      showToast("Gagal Memuat Laporan", toUserMessage(err), "error");
    } finally {
      setPageLoading(false);
    }
  }
  async function exportCSV(type) {
    const confirmed = await confirmDialog({
      title: "Ekspor Data ke CSV?",
      message: type === "athletes" ? "File CSV berisi seluruh data atlet yang sedang dimuat akan diunduh ke perangkat Anda." : "File CSV berisi jadwal turnamen beserta rekomendasi atlet akan diunduh ke perangkat Anda.",
      confirmText: "Ya, Ekspor"
    });
    if (!confirmed) return;
    const { athletes, tournaments } = getState();
    let csv = "data:text/csv;charset=utf-8,";
    if (type === "athletes") {
      csv += "ID,Nama,JenisKelamin,Usia,CabangOlahraga,Wilayah,Status,Skor,Grade\n";
      athletes.forEach((a) => {
        csv += `${a.id},"${a.name}",${a.gender},${a.age},${a.sport},${a.region},${a.status},${a.score},${a.grade}
`;
      });
    } else {
      csv += "Turnamen,Tanggal,Lokasi,Cabor,AtletRekomendasi\n";
      tournaments.forEach((t) => {
        const rec = athletes.filter((a) => a.sport === t.sport).sort((a, b) => b.score - a.score)[0];
        csv += `"${t.name}",${t.date},"${t.location}",${t.sport},"${rec ? rec.name : "-"}"
`;
      });
    }
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `sitas_sumut_${type}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast("Ekspor Berhasil", "File CSV telah diunduh.");
  }
  function downloadReportPDF() {
    const element = document.getElementById("page-reports");
    if (!element || typeof window.html2pdf === "undefined") {
      showToast("Gagal", "Sistem PDF belum dimuat, coba sesaat lagi.", "error");
      return;
    }
    const opt = {
      margin: 0.5,
      filename: "Laporan_SITAS_Sumut.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "a4", orientation: "landscape" }
    };
    const originalBtn = document.getElementById("btn-print-report");
    const originalBack = document.getElementById("btn-back-report");
    if (originalBtn) originalBtn.style.display = "none";
    if (originalBack) originalBack.style.display = "none";
    showToast("Mencetak", "Laporan PDF sedang diunduh...", "info");
    window.html2pdf().set(opt).from(element).save().then(() => {
      if (originalBtn) originalBtn.style.display = "";
      if (originalBack) originalBack.style.display = "";
      showToast("Sukses", "Laporan PDF berhasil diunduh.", "success");
    });
  }

  // js/users.js
  var STATUS_STYLE = { Aktif: "bg-secondary/10 text-secondary", Offline: "bg-background text-outline", Ditangguhkan: "bg-error-container text-error" };
  var ROLE_STYLE = { "Admin Sistem": "bg-primary text-white", "Koordinator Regional": "bg-accent/30 text-primary", "Scout Lapangan": "bg-secondary/10 text-secondary" };
  async function renderUserTable() {
    setPageLoading(true, "Memuat data pengguna...");
    try {
      const users = await loadUsers();
      const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
      };
      set("u-kpi-total", users.length);
      set("u-kpi-active", users.filter((x) => x.status === "Aktif").length);
      set("u-kpi-offline", users.filter((x) => x.status === "Offline").length);
      set("u-kpi-suspended", users.filter((x) => x.status === "Ditangguhkan").length);
      const tbody = document.getElementById("user-table-body");
      if (tbody) {
        tbody.innerHTML = users.map(
          (usr, i) => `
      <tr class="row-stagger hover:bg-background transition-colors" style="animation-delay:${i * 0.04}s">
        <td class="px-5 py-3">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs" aria-hidden="true">${initials(usr.name)}</div>
            <div><p class="font-bold text-primary text-sm">${usr.name}</p><p class="text-[11px] text-outline">${usr.email}</p></div>
          </div>
        </td>
        <td class="px-5 py-3"><span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${ROLE_STYLE[usr.role] || "bg-background"}">${usr.role}</span></td>
        <td class="px-5 py-3 text-center"><span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${STATUS_STYLE[usr.status]}">${usr.status}</span></td>
        <td class="px-5 py-3 text-right">
          <button class="p-1.5 hover:bg-background rounded-lg transition-all" aria-label="Ubah status ${usr.name}" onclick="SITAS.cycleUserStatus(${usr.id})" title="Ubah Status"><span class="material-symbols-outlined text-lg" aria-hidden="true">sync</span></button>
          <button class="p-1.5 hover:bg-error-container hover:text-error rounded-lg transition-all" aria-label="Hapus pengguna ${usr.name}" onclick="SITAS.deleteUser(${usr.id})" title="Hapus"><span class="material-symbols-outlined text-lg" aria-hidden="true">delete</span></button>
        </td>
      </tr>`
        ).join("");
      }
    } catch (err) {
      showToast("Gagal Memuat Pengguna", toUserMessage(err), "error");
    } finally {
      setPageLoading(false);
    }
  }
  async function cycleUserStatus(id) {
    const cycle = ["Aktif", "Offline", "Ditangguhkan"];
    const user = getState().users.find((u) => u.id === id);
    if (!user) return;
    const nextStatus = cycle[(cycle.indexOf(user.status) + 1) % cycle.length];
    try {
      await apiClient.patch(`/users/${id}/status`, { status: nextStatus });
      showToast("Status Diperbarui", `${user.name} sekarang ${nextStatus}.`);
      renderUserTable();
    } catch (err) {
      showToast("Gagal Memperbarui Status", toUserMessage(err), "error");
    }
  }
  async function deleteUser(id) {
    const user = getState().users.find((u) => u.id === id);
    const confirmed = await confirmDialog({
      title: "Hapus Pengguna?",
      message: `Akun "${user ? user.name : "ini"}" akan dihapus permanen dari sistem.`,
      confirmText: "Ya, Hapus",
      danger: true
    });
    if (!confirmed) return;
    try {
      await apiClient.delete(`/users/${id}`);
      showToast("Pengguna Dihapus", "Data pengguna telah dihapus.", "error");
      renderUserTable();
    } catch (err) {
      showToast("Gagal Menghapus", toUserMessage(err), "error");
    }
  }
  function toggleUserModal(show) {
    const modal = document.getElementById("user-modal");
    if (!modal) return;
    if (show) {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
      modal.setAttribute("aria-hidden", "false");
      document.getElementById("um-name").value = "";
      document.getElementById("um-email").value = "";
      document.getElementById("um-name").focus();
    } else {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
      modal.setAttribute("aria-hidden", "true");
    }
  }
  async function submitNewUser() {
    const name = document.getElementById("um-name").value.trim();
    const email = document.getElementById("um-email").value.trim();
    const role = document.getElementById("um-role").value;
    const { valid, errors } = validateForm(
      { name, email },
      { name: [rules.required("Nama")], email: [rules.required("Email"), rules.email()] }
    );
    if (!valid) {
      showToast("Validasi Gagal", Object.values(errors)[0], "error");
      return;
    }
    try {
      const tempPassword = crypto.randomUUID().slice(0, 12) + "Aa1!";
      await apiClient.post("/auth/register", { name, email, password: tempPassword, role }, { auth: false });
      showToast("Pengguna Ditambahkan", `${name} telah didaftarkan. Minta pengguna melakukan reset password saat login pertama.`);
      toggleUserModal(false);
      renderUserTable();
    } catch (err) {
      showToast("Gagal Menambahkan Pengguna", toUserMessage(err), "error");
    }
  }

  // js/notifications.js
  var notifications = [
    { icon: "emoji_events", color: "bg-secondary", title: "Talenta Baru Grade A+", body: "Ada atlet baru mencapai skor talenta tertinggi minggu ini.", time: "10 menit lalu", unread: true },
    { icon: "event_available", color: "bg-primary", title: "Turnamen Mendatang", body: "Periksa jadwal turnamen terbaru di kalender.", time: "2 jam lalu", unread: true },
    { icon: "person_add", color: "bg-accent", title: "Scout Baru Bergabung", body: "Seorang scout lapangan baru telah mendaftar ke sistem.", time: "Kemarin", unread: true },
    { icon: "medical_information", color: "bg-error", title: "Catatan Medis Diperbarui", body: "Status pemulihan cedera salah satu atlet diperbarui.", time: "2 hari lalu", unread: false },
    { icon: "analytics", color: "bg-secondary-light", title: "Laporan Bulanan Siap", body: "Laporan statistik scouting bulan ini telah tersedia.", time: "3 hari lalu", unread: false }
  ];
  function renderNotifList() {
    const el = document.getElementById("notif-list");
    if (!el) return;
    el.innerHTML = notifications.map(
      (n) => `
    <div class="flex items-start gap-3 px-5 py-3.5 hover:bg-background transition-colors ${n.unread ? "bg-secondary/5" : ""}">
      <div class="w-9 h-9 rounded-lg ${n.color} flex items-center justify-center shrink-0" aria-hidden="true"><span class="material-symbols-outlined text-white text-lg">${n.icon}</span></div>
      <div class="flex-1 min-w-0">
        <p class="font-bold text-primary text-xs">${n.title}</p>
        <p class="text-[11px] text-outline mt-0.5 leading-snug">${n.body}</p>
        <p class="text-[10px] text-outline/70 mt-1 font-semibold">${n.time}</p>
      </div>
      ${n.unread ? '<span class="w-2 h-2 rounded-full bg-error mt-1.5 shrink-0" aria-label="Belum dibaca"></span>' : ""}
    </div>`
    ).join("");
  }
  function toggleNotifPanel(evt) {
    if (evt) evt.stopPropagation();
    document.getElementById("calendar-panel")?.classList.add("hidden");
    const panel = document.getElementById("notif-panel");
    if (!panel) return;
    const willOpen = panel.classList.contains("hidden");
    panel.classList.toggle("hidden");
    panel.setAttribute("aria-hidden", willOpen ? "false" : "true");
    if (willOpen) renderNotifList();
  }
  function markAllNotifRead() {
    notifications.forEach((n) => n.unread = false);
    renderNotifList();
    document.getElementById("notif-dot")?.classList.add("hidden-page");
  }
  var calendarViewDate = /* @__PURE__ */ new Date();
  var CAL_MONTHS_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  function toggleCalendarPanel(evt) {
    if (evt) evt.stopPropagation();
    document.getElementById("notif-panel")?.classList.add("hidden");
    const panel = document.getElementById("calendar-panel");
    if (!panel) return;
    const willOpen = panel.classList.contains("hidden");
    panel.classList.toggle("hidden");
    panel.setAttribute("aria-hidden", willOpen ? "false" : "true");
    if (willOpen) {
      calendarViewDate = /* @__PURE__ */ new Date();
      renderCalendarPanel();
    }
  }
  function shiftCalendarMonth(delta) {
    calendarViewDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + delta, 1);
    renderCalendarPanel();
  }
  function renderCalendarPanel() {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const labelEl = document.getElementById("cal-month-label");
    if (labelEl) labelEl.innerText = `${CAL_MONTHS_ID[month]} ${year}`;
    const today = /* @__PURE__ */ new Date();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const tournaments = getState().tournaments || [];
    const tourDays = tournaments.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() === month;
    }).map((t) => new Date(t.date).getDate());
    let cells = "";
    for (let i = 0; i < firstDay; i++) cells += "<span></span>";
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      const hasEvent = tourDays.includes(d);
      cells += `<span class="relative h-7 w-7 mx-auto flex items-center justify-center rounded-full text-[11px] font-semibold ${isToday ? "bg-primary text-white" : hasEvent ? "bg-secondary/15 text-secondary" : "text-primary hover:bg-background"}">
      ${d}${hasEvent && !isToday ? '<span class="absolute bottom-0.5 w-1 h-1 rounded-full bg-secondary" aria-hidden="true"></span>' : ""}
    </span>`;
    }
    const gridEl = document.getElementById("cal-grid");
    if (gridEl) gridEl.innerHTML = cells;
    const listEl = document.getElementById("cal-tournament-list");
    if (listEl) {
      const monthTournaments = tournaments.filter((t) => {
        const d = new Date(t.date);
        return d.getFullYear() === year && d.getMonth() === month;
      });
      listEl.innerHTML = monthTournaments.length ? monthTournaments.map(
        (t) => `
      <div class="flex items-center gap-2 text-xs">
        <span class="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" aria-hidden="true"></span>
        <span class="font-semibold text-primary truncate">${t.name}</span>
        <span class="text-outline ml-auto shrink-0">${new Date(t.date).getDate()} ${CAL_MONTHS_ID[month].slice(0, 3)}</span>
      </div>`
      ).join("") : `<p class="text-[11px] text-outline italic">Tidak ada turnamen bulan ini.</p>`;
    }
  }
  document.addEventListener("click", (e) => {
    const notifPanel = document.getElementById("notif-panel");
    const calPanel = document.getElementById("calendar-panel");
    if (notifPanel && !notifPanel.classList.contains("hidden") && !notifPanel.parentElement.contains(e.target)) {
      notifPanel.classList.add("hidden");
    }
    if (calPanel && !calPanel.classList.contains("hidden") && !calPanel.parentElement.contains(e.target)) {
      calPanel.classList.add("hidden");
    }
  });

  // js/recommendation.js
  async function renderRecommendationPage() {
    setPageLoading(true, "Menyusun rekomendasi...");
    try {
      await Promise.all([loadAthletes(), loadTournaments()]);
      const { athletes, tournaments } = getState();
      const algoBarsEl = document.getElementById("algo-bars");
      if (algoBarsEl) {
        algoBarsEl.innerHTML = [
          ["Prestasi (Nasional/Provinsi)", 30],
          ["Fisik & Biometrik", 25],
          ["Evaluasi Pelatih", 20],
          ["Usia & Proyeksi", 15],
          ["Frekuensi Latihan", 10]
        ].map(
          ([label, pct]) => `
      <div>
        <div class="flex justify-between mb-1"><span class="text-xs text-outline font-semibold">${label}</span><span class="text-xs font-bold text-secondary">${pct}%</span></div>
        <div class="w-full h-1.5 bg-background rounded-full overflow-hidden"><div class="h-full bg-secondary score-bar-fill" style="width:${pct}%"></div></div>
      </div>`
        ).join("");
      }
      const ranked = [...athletes].sort((a, b) => b.score - a.score);
      const medalBg = ["#D4AF37", "#C0C0C0", "#CD7F32"];
      const rankingBody = document.getElementById("rec-ranking-body");
      if (rankingBody) {
        rankingBody.innerHTML = ranked.map(
          (a, i) => `
      <tr class="row-stagger hover:bg-background transition-colors cursor-pointer" style="animation-delay:${i * 0.02}s" onclick="SITAS.openDetail(${a.id})">
        <td class="px-5 py-3">${i < 3 ? `<div class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style="background:${medalBg[i]}" aria-hidden="true">${i + 1}</div>` : `<span class="text-outline font-bold text-sm pl-2">${i + 1}</span>`}</td>
        <td class="px-5 py-3 font-semibold text-sm">${a.name}</td>
        <td class="px-5 py-3 text-xs text-outline">${a.sport}</td>
        <td class="px-5 py-3"><span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${GRADE_CLASS_MAP[a.grade]}">${a.grade}</span></td>
        <td class="px-5 py-3 text-right font-bold text-secondary">${a.score.toFixed(0)}</td>
      </tr>`
        ).join("");
      }
      const gridEl = document.getElementById("rec-tournament-grid");
      if (gridEl) {
        gridEl.innerHTML = tournaments.map((t, i) => {
          const rec = athletes.filter((a) => a.sport === t.sport).sort((a, b) => b.score - a.score).slice(0, 2);
          return `<div class="anim-card hover-lift bg-white border border-outline-variant rounded-2xl overflow-hidden shadow-sm" style="animation-delay:${i * 0.05}s">
        <div class="h-24 bg-primary relative p-4 flex justify-between items-start">
          <span class="bg-secondary text-white px-2.5 py-1 rounded text-[10px] font-bold">${t.level}</span>
          <span class="text-white text-[11px]">${formatDate(t.date)}</span>
        </div>
        <div class="p-5">
          <h5 class="font-bold text-primary mb-1">${t.name}</h5>
          <p class="text-xs text-outline mb-4">${t.location}</p>
          <p class="text-[10px] font-bold uppercase text-outline mb-2">Rekomendasi Atlet</p>
          ${rec.length ? rec.map((r) => `<div class="flex items-center gap-2 mb-1.5"><div class="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary" aria-hidden="true">${initials(r.name)}</div><span class="text-sm font-semibold">${r.name}</span></div>`).join("") : '<p class="text-xs italic text-outline">Belum ada atlet yang cocok.</p>'}
        </div>
      </div>`;
        }).join("");
      }
    } catch (err) {
      showToast("Gagal Memuat Rekomendasi", toUserMessage(err), "error");
    } finally {
      setPageLoading(false);
    }
  }

  // js/backup.js
  async function exportBackup() {
    try {
      const [athletesRes, tournamentsRes] = await Promise.all([
        apiClient.get("/athletes"),
        apiClient.get("/tournaments")
      ]);
      const backup = {
        exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
        version: 2,
        athletes: athletesRes.athletes,
        tournaments: tournamentsRes.tournaments
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sitas-sumut-backup-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("Backup Berhasil", `${backup.athletes.length} data atlet diekspor ke file JSON.`);
      return backup;
    } catch (err) {
      showToast("Backup Gagal", toUserMessage(err), "error");
      throw err;
    }
  }
  function readBackupFile(file) {
    return new Promise((resolve, reject) => {
      if (!file || file.type !== "application/json") {
        reject(new Error("File harus berformat .json hasil ekspor SITAS Sumut."));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (!Array.isArray(data.athletes)) {
            throw new Error('Struktur file backup tidak valid (field "athletes" tidak ditemukan).');
          }
          resolve(data);
        } catch (err) {
          reject(new Error("Gagal membaca file backup: " + err.message));
        }
      };
      reader.onerror = () => reject(new Error("Gagal membaca file."));
      reader.readAsText(file);
    });
  }
  async function restoreBackup(backupData, { onProgress } = {}) {
    const results = { success: 0, failed: 0, errors: [] };
    const total = backupData.athletes.length;
    for (let i = 0; i < total; i++) {
      const a = backupData.athletes[i];
      try {
        const { score, grade, scoreBreakdown, id, createdAt, updatedAt, ...payload } = a;
        await apiClient.post("/athletes", payload);
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({ name: a.name, message: toUserMessage(err) });
      }
      if (onProgress) onProgress(i + 1, total);
    }
    return results;
  }

  // js/main.js
  var navHistory = ["dashboard"];
  function showPage(pageId, pushHistory = true) {
    document.querySelectorAll("#pages-container > section").forEach((p) => p.classList.add("hidden-page"));
    const el = document.getElementById("page-" + pageId);
    if (!el) return;
    el.classList.remove("hidden-page");
    el.classList.remove("anim-page");
    void el.offsetWidth;
    el.classList.add("anim-page");
    document.querySelectorAll(".nav-item").forEach((btn) => {
      const isActive = btn.dataset.page === pageId;
      btn.classList.toggle("bg-secondary", isActive);
      btn.classList.toggle("text-white", isActive);
      btn.classList.toggle("text-white/70", !isActive);
      btn.setAttribute("aria-current", isActive ? "page" : "false");
    });
    if (pushHistory) {
      if (navHistory[navHistory.length - 1] !== pageId) navHistory.push(pageId);
      navigateTo(pageId);
    }
    if (pageId === "dashboard") initDashboardCharts();
    if (pageId === "reports") initReportCharts();
    if (pageId === "athletes") renderAthleteTable();
    if (pageId === "recommendation") renderRecommendationPage();
    if (pageId === "users") renderUserTable();
    announce(`Halaman ${pageId} dimuat.`);
    window.scrollTo(0, 0);
  }
  function goBack() {
    if (navHistory.length > 1) {
      navHistory.pop();
      showPage(navHistory[navHistory.length - 1], false);
    } else {
      showPage("dashboard", false);
    }
  }
  function goToAuthView(viewId) {
    ["login-view", "register-view", "forgot-view"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (id === viewId) {
        el.classList.remove("hidden-page");
        const main = el.querySelector("main");
        if (main) {
          main.classList.remove("anim-page");
          void main.offsetWidth;
          main.classList.add("anim-page");
        }
      } else {
        el.classList.add("hidden-page");
      }
    });
    window.scrollTo(0, 0);
  }
  function enterApp() {
    document.getElementById("login-view")?.classList.add("hidden-page");
    document.getElementById("register-view")?.classList.add("hidden-page");
    document.getElementById("forgot-view")?.classList.add("hidden-page");
    document.getElementById("app-view").classList.remove("hidden-page");
    document.getElementById("app-view").classList.add("anim-page");
    const { page } = getInitialRoute();
    showPage(page || "dashboard", false);
  }
  async function doLogin() {
    const btn = document.getElementById("login-btn");
    const email = document.getElementById("li-user").value.trim();
    const password = document.getElementById("li-pass").value;
    setButtonLoading(btn, true, "Memverifikasi...");
    const result = await login(email, password);
    setButtonLoading(btn, false);
    if (result.ok) {
      showToast("Selamat Datang", `Berhasil masuk sebagai ${result.user.name}.`);
      enterApp();
    } else if (result.errors) {
      showToast("Validasi Gagal", Object.values(result.errors)[0], "error");
    } else {
      showToast("Gagal Masuk", result.message, "error");
    }
  }
  async function submitRegister() {
    const btn = document.getElementById("register-btn");
    const payload = {
      name: document.getElementById("rg-name").value.trim(),
      email: document.getElementById("rg-email").value.trim(),
      role: document.getElementById("rg-role").value,
      password: document.getElementById("rg-pass").value,
      passwordConfirm: document.getElementById("rg-pass2").value,
      termsAccepted: document.getElementById("rg-terms").checked
    };
    setButtonLoading(btn, true, "Mendaftarkan...");
    const result = await register(payload);
    setButtonLoading(btn, false);
    if (result.ok) {
      document.getElementById("register-form").reset();
      showToast("Registrasi Berhasil", `Akun ${result.user.name} telah dibuat. Silakan masuk.`);
      goToAuthView("login-view");
    } else if (result.errors) {
      showToast("Validasi Gagal", Object.values(result.errors)[0], "error");
    } else {
      showToast("Registrasi Gagal", result.message, "error");
    }
  }
  async function submitForgotPassword() {
    const btn = document.getElementById("forgot-btn");
    const email = document.getElementById("fg-email").value.trim();
    setButtonLoading(btn, true, "Mengirim...");
    const result = await forgotPassword(email);
    setButtonLoading(btn, false);
    if (result.ok) {
      document.getElementById("fg-email").value = "";
      showToast("Tautan Terkirim", result.message);
      goToAuthView("login-view");
    } else if (result.errors) {
      showToast("Validasi Gagal", Object.values(result.errors)[0], "error");
    } else {
      showToast("Gagal Mengirim", result.message, "error");
    }
  }
  async function doLogout() {
    const confirmed = await confirmDialog({
      title: "Keluar dari SITAS Sumut?",
      message: "Anda perlu masuk kembali untuk mengakses sistem.",
      confirmText: "Ya, Keluar"
    });
    if (!confirmed) return;
    await logout();
    document.getElementById("app-view").classList.add("hidden-page");
    goToAuthView("login-view");
  }
  function togglePass() {
    const p = document.getElementById("li-pass");
    const icon = document.getElementById("li-eye");
    const t = p.getAttribute("type") === "password" ? "text" : "password";
    p.setAttribute("type", t);
    icon.innerText = t === "password" ? "visibility" : "visibility_off";
  }
  async function handleImportBackupFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const data = await readBackupFile(file);
      const confirmed = await confirmDialog({
        title: "Pulihkan Data dari Backup?",
        message: `File berisi ${data.athletes.length} data atlet. Data akan ditambahkan sebagai entri baru ke server (bukan menimpa data yang ada).`,
        confirmText: "Ya, Pulihkan"
      });
      if (!confirmed) return;
      const results = await restoreBackup(data);
      showToast(
        "Pemulihan Selesai",
        `${results.success} data berhasil dipulihkan, ${results.failed} gagal.`,
        results.failed ? "error" : "success"
      );
      renderAthleteTable();
    } catch (err) {
      showToast("Gagal Memulihkan Backup", toUserMessage(err), "error");
    } finally {
      event.target.value = "";
    }
  }
  Object.assign(window, {
    // Navigasi
    showPage: (id) => showPage(id, true),
    goBack,
    goToAuthView,
    // Auth
    doLogin,
    submitRegister,
    submitForgotPassword,
    togglePass,
    doLogout,
    // Atlet
    openInputForm: (isEdit) => openInputForm(isEdit, showPage),
    openDetail: (id) => openDetail(id, showPage),
    editAthlete: (id) => editAthlete(id, showPage),
    deleteAthlete: (id) => deleteAthlete(id),
    submitAthleteForm: () => submitAthleteForm(showPage),
    onEvalInput: (key, val) => onEvalInput(key, val),
    previewImage: (evt) => previewImage(evt),
    globalSearch: (val) => globalSearch(val, showPage),
    renderAthleteTable: () => renderAthleteTable(),
    updateLivePreview: () => updateLivePreview(),
    // Users
    cycleUserStatus,
    deleteUser,
    toggleUserModal,
    submitNewUser,
    // Notifikasi & kalender
    toggleNotifPanel,
    markAllNotifRead,
    toggleCalendarPanel,
    shiftCalendarMonth,
    // Laporan / ekspor
    exportCSV,
    downloadReportPDF,
    // Backup (dipakai oleh tombol backup manual di halaman pengaturan)
    exportBackup,
    // showToast dipanggil langsung di beberapa tempat pada markup asli
    showToast
  });
  function bindStaticListeners() {
    document.getElementById("backup-import-input")?.addEventListener("change", handleImportBackupFile);
  }
  initHistory((pageId) => showPage(pageId, false));
  document.addEventListener("DOMContentLoaded", async () => {
    bindStaticListeners();
    const restored = await restoreSession();
    if (restored) {
      enterApp();
    } else {
      goToAuthView("login-view");
    }
  });
})();

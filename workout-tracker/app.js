/* Fitness Ajanım — vanilla JS spor takip uygulaması.
   Tüm veri tarayıcı localStorage'ında saklanır.
*/

// ---------- Sabitler ----------

const STORE_KEY = "fa.workouts.v1";
const PROFILE_KEY = "fa.profile.v1";

const GUNLER = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const AYLAR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

// Bölge → tipik hareketler (otomatik tamamlama için)
const BOLGE_HAREKETLERI = {
  "Ön Bacak": ["Leg Extension", "Squat", "Hack Squat", "Front Squat", "Lunges", "Bulgarian Split Squat"],
  "Arka Bacak": ["Leg Curl", "Romanian Deadlift", "Glute Ham Raise", "Stiff Leg Deadlift"],
  "Bacak": ["Leg Press", "Squat", "Deadlift", "Hip Thrust", "Calf Raise"],
  "Sırt": ["Lat Pulldown", "Row", "Row (Ağır)", "Pull-up", "Seated Cable Row", "Deadlift", "T-Bar Row"],
  "Alt Sırt": ["Low Back", "Back Extension", "Good Morning"],
  "Omuz": ["Lateral Raise", "Shoulder Press", "Front Raise", "Reverse Fly", "Arnold Press", "Face Pull"],
  "Göğüs": ["Pec Fly", "Dumbbell Bench Press", "Chest Press", "Bench Press", "Incline Press", "Push-up", "Cable Crossover"],
  "Ön Kol": ["Biceps Curl", "Hammer Curl", "Preacher Curl", "Concentration Curl"],
  "Arka Kol": ["Triceps Pushdown", "Triceps Extension", "Skull Crusher", "Dips", "Close Grip Bench"],
  "Karın": ["Crunch", "Plank", "Leg Raise", "Russian Twist", "Cable Crunch"],
};

// MET değerleri (kg-cinsinden kalori = MET × kg × saat)
const HAREKET_MET = {
  "default": 5.0,
  "Squat": 6.0, "Deadlift": 6.0, "Bench Press": 5.5,
  "Leg Press": 5.5, "Pull-up": 6.5, "Push-up": 4.5,
  "Plank": 3.5, "Lat Pulldown": 5.0, "Row": 5.0,
};

// Şablonlar
const SABLONLAR = [
  {
    isim: "Push / Çek / Bacak (PPL)",
    aciklama: "Klasik 6 günlük split. Hacim odaklı.",
    program: ["Push: Göğüs, Omuz, Arka Kol", "Pull: Sırt, Ön Kol", "Legs: Bacak, Karın"],
  },
  {
    isim: "Üst / Alt",
    aciklama: "4 günlük split. Toparlanması kolay.",
    program: ["Üst gün: Göğüs, Sırt, Omuz, Kollar", "Alt gün: Bacak, Karın"],
  },
  {
    isim: "Full Body 3 Gün",
    aciklama: "Yeni başlayanlar için ideal.",
    program: ["Pzt: Squat odaklı", "Çar: Bench odaklı", "Cum: Deadlift odaklı"],
  },
  {
    isim: "Bro Split (5 Gün)",
    aciklama: "Klasik kas grubu odaklı program.",
    program: ["Pzt: Göğüs", "Sal: Sırt", "Çar: Omuz", "Per: Kol", "Cum: Bacak"],
  },
];

// İlk veri (kullanıcının paylaştığı tablo)
const SEED_DATA = [
  // 27 Nisan — Pazartesi
  ["2026-04-27", "Pazartesi", "Ön Bacak", "Leg Extension", 32, 3, 10],
  ["2026-04-27", "Pazartesi", "Ön Bacak", "Leg Extension", 39, 3, 8],
  ["2026-04-27", "Pazartesi", "Arka Bacak", "Leg Curl", 45, 3, 10],
  ["2026-04-27", "Pazartesi", "Omuz", "Lateral Raise", 54, 3, 10],
  ["2026-04-27", "Pazartesi", "Göğüs", "Pec Fly", 50, 2, 10],
  ["2026-04-27", "Pazartesi", "Göğüs", "Dumbbell Bench Press", 12, 3, 10],
  ["2026-04-27", "Pazartesi", "Arka Kol", "Triceps Pushdown", 18, 3, 10],
  // 29 Nisan — Çarşamba
  ["2026-04-29", "Çarşamba", "Arka Kol", "Triceps Extension", 13, 3, 12],
  ["2026-04-29", "Çarşamba", "Alt Sırt", "Low Back", 48, 3, 12],
  ["2026-04-29", "Çarşamba", "Ön Kol", "Biceps Curl", 48, 3, 10],
  ["2026-04-29", "Çarşamba", "Omuz", "Shoulder Press", 35, 2, 10],
  ["2026-04-29", "Çarşamba", "Omuz", "Lateral Raise", 54, 3, 10],
  ["2026-04-29", "Çarşamba", "Göğüs", "Pec Fly", 50, 2, 10],
  ["2026-04-29", "Çarşamba", "Sırt", "Lat Pulldown", 39, 3, 10],
  // 2 Mayıs — Cumartesi
  ["2026-05-02", "Cumartesi", "Bacak", "Leg Press", 109, 3, 12],
  ["2026-05-02", "Cumartesi", "Arka Bacak", "Leg Curl", 45, 3, 10],
  ["2026-05-02", "Cumartesi", "Ön Bacak", "Leg Extension", 39, 3, 8],
  ["2026-05-02", "Cumartesi", "Sırt", "Row", 66, 3, 10],
  ["2026-05-02", "Cumartesi", "Sırt", "Lat Pulldown", 32, 3, 12],
  ["2026-05-02", "Cumartesi", "Göğüs", "Dumbbell Bench Press", 12, 3, 10],
  ["2026-05-02", "Cumartesi", "Omuz", "Lateral Raise", 54, 3, 10],
  // 4 Mayıs — Pazar
  ["2026-05-04", "Pazar", "Bacak", "Leg Press", 109, 3, 12],
  ["2026-05-04", "Pazar", "Ön Bacak", "Leg Extension", 39, 3, 12],
  ["2026-05-04", "Pazar", "Arka Bacak", "Leg Curl", 45, 3, 12],
  ["2026-05-04", "Pazar", "Sırt", "Row", 39, 3, 12],
  ["2026-05-04", "Pazar", "Sırt", "Row (Ağır)", 66, 3, 12],
  ["2026-05-04", "Pazar", "Göğüs", "Chest Press", 40, 3, 10],
  ["2026-05-04", "Pazar", "Arka Kol", "Triceps Extension", 19, 3, 10],
];

// ---------- State ----------

let workouts = [];
let profile = {
  name: "",
  gender: "erkek",
  age: 25,
  height: 175,
  weight: 75,
  activity: 1.55,
  goal: "maintain",
};
let charts = {};

// ---------- Storage ----------

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    workouts = raw ? JSON.parse(raw) : [];
  } catch (e) {
    workouts = [];
  }
  if (workouts.length === 0) {
    workouts = SEED_DATA.map(seedToWorkout);
    saveStore();
  }
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) profile = { ...profile, ...JSON.parse(raw) };
  } catch (e) {}
}

function saveStore() {
  localStorage.setItem(STORE_KEY, JSON.stringify(workouts));
}

function saveProfile() {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function seedToWorkout([date, day, region, exercise, weight, sets, reps]) {
  return {
    id: cryptoId(),
    date, day, region, exercise,
    weight: Number(weight),
    sets: Number(sets),
    reps: Number(reps),
    note: "",
    createdAt: Date.now(),
  };
}

function cryptoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---------- Helpers ----------

function dayName(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return GUNLER[d.getDay()];
}

function fmtDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()} ${AYLAR[d.getMonth()]}`;
}

function fmtDateLong(dateStr) {
  if (!dateStr) return "";
  return `${fmtDate(dateStr)} ${dateStr.slice(0, 4)} — ${dayName(dateStr)}`;
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

function totalVolume(w) {
  return w.weight * w.sets * w.reps;
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove("show"), 2200);
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// ---------- Tabs ----------

function initTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
      onTabChange(btn.dataset.tab);
    });
  });
}

function onTabChange(tab) {
  if (tab === "archive") renderArchive();
  if (tab === "suggestions") renderSuggestions();
  if (tab === "calories") renderCalories();
  if (tab === "today") renderToday();
}

// ---------- Form ----------

function initForm() {
  const form = document.getElementById("workout-form");
  const dateInput = document.getElementById("f-date");
  const dayInput = document.getElementById("f-day");
  const regionInput = document.getElementById("f-region");
  const exerciseInput = document.getElementById("f-exercise");

  dateInput.value = todayISO();
  dayInput.value = dayName(dateInput.value);

  dateInput.addEventListener("change", () => {
    dayInput.value = dayName(dateInput.value);
  });

  regionInput.addEventListener("input", () => {
    refreshExerciseDatalist(regionInput.value);
    updateSuggestHint();
  });
  exerciseInput.addEventListener("input", updateSuggestHint);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const w = {
      id: cryptoId(),
      date: dateInput.value,
      day: dayInput.value || dayName(dateInput.value),
      region: regionInput.value.trim(),
      exercise: exerciseInput.value.trim(),
      weight: Number(document.getElementById("f-weight").value),
      sets: Number(document.getElementById("f-sets").value),
      reps: Number(document.getElementById("f-reps").value),
      note: document.getElementById("f-note").value.trim(),
      createdAt: Date.now(),
    };
    if (!w.region || !w.exercise || !w.weight || !w.sets || !w.reps) {
      showToast("Tüm alanları doldur.");
      return;
    }
    workouts.push(w);
    saveStore();
    showToast(`${w.exercise} kaydedildi (${w.weight}kg × ${w.sets}×${w.reps})`);
    document.getElementById("f-note").value = "";
    refreshDatalists();
    renderToday();
    renderFooter();
  });

  document.getElementById("btn-quick-fill").addEventListener("click", () => {
    const reg = regionInput.value.trim();
    const ex = exerciseInput.value.trim();
    const last = lastEntryFor(reg, ex);
    if (!last) {
      showToast("Bu hareket için önceki kayıt yok.");
      return;
    }
    document.getElementById("f-weight").value = last.weight;
    document.getElementById("f-sets").value = last.sets;
    document.getElementById("f-reps").value = last.reps;
    showToast(`Son kayıt yüklendi: ${last.weight}kg × ${last.sets}×${last.reps}`);
  });

  refreshDatalists();
}

function lastEntryFor(region, exercise) {
  const matches = workouts
    .filter(w => (!region || w.region === region) && (!exercise || w.exercise === exercise))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  return matches[0];
}

function refreshDatalists() {
  const regionsList = document.getElementById("regions-list");
  const allRegions = uniq([...Object.keys(BOLGE_HAREKETLERI), ...workouts.map(w => w.region)]).sort();
  regionsList.innerHTML = allRegions.map(r => `<option value="${r}">`).join("");
  refreshExerciseDatalist(document.getElementById("f-region").value);

  const fr = document.getElementById("filter-region");
  fr.innerHTML = '<option value="">Hepsi</option>' + allRegions.map(r => `<option>${r}</option>`).join("");
  const allExercises = uniq(workouts.map(w => w.exercise)).sort();
  document.getElementById("filter-exercise").innerHTML =
    '<option value="">Hepsi</option>' + allExercises.map(e => `<option>${e}</option>`).join("");

  const progSel = document.getElementById("progress-exercise");
  const cur = progSel.value;
  progSel.innerHTML = allExercises.map(e => `<option>${e}</option>`).join("");
  if (cur && allExercises.includes(cur)) progSel.value = cur;
}

function refreshExerciseDatalist(region) {
  const list = document.getElementById("exercises-list");
  let exes = uniq(workouts.map(w => w.exercise));
  if (region && BOLGE_HAREKETLERI[region]) {
    exes = uniq([...BOLGE_HAREKETLERI[region], ...workouts.filter(w => w.region === region).map(w => w.exercise)]);
  }
  exes.sort();
  list.innerHTML = exes.map(e => `<option value="${e}">`).join("");
}

function updateSuggestHint() {
  const reg = document.getElementById("f-region").value.trim();
  const ex = document.getElementById("f-exercise").value.trim();
  const hint = document.getElementById("suggest-hint");
  if (!ex) {
    hint.textContent = "";
    return;
  }
  const last = lastEntryFor(reg, ex);
  if (!last) {
    hint.textContent = `${ex} için önceki kayıt yok. Bugün başlangıç ağırlığını belirle.`;
    return;
  }
  const next = nextTarget(last);
  hint.innerHTML = `Son: <b>${last.weight}kg × ${last.sets}×${last.reps}</b> (${fmtDate(last.date)}) → Hedef: <b style="color:var(--accent-2)">${next.weight}kg × ${next.sets}×${next.reps}</b>`;
}

// ---------- Bugün ----------

function initToday() {
  document.getElementById("today-date-select").addEventListener("change", renderToday);
}

function renderToday() {
  const sel = document.getElementById("today-date-select");
  const dates = uniq(workouts.map(w => w.date)).sort((a, b) => b.localeCompare(a));
  const cur = sel.value || (dates.includes(todayISO()) ? todayISO() : dates[0]);
  sel.innerHTML = dates.map(d => `<option value="${d}" ${d === cur ? "selected" : ""}>${fmtDateLong(d)}</option>`).join("") || `<option>Henüz kayıt yok</option>`;

  const targetDate = sel.value;
  const dayWorkouts = workouts.filter(w => w.date === targetDate);

  const list = document.getElementById("today-list");
  if (dayWorkouts.length === 0) {
    list.innerHTML = '<div class="empty"><div class="ico">🏋️</div>Bu güne ait kayıt yok. Sol formdan ekle.</div>';
  } else {
    list.innerHTML = dayWorkouts
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(renderEntry)
      .join("");
    list.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", () => deleteWorkout(btn.dataset.id));
    });
  }

  // Stats
  const totalSets = dayWorkouts.reduce((s, w) => s + w.sets, 0);
  const totalVol = dayWorkouts.reduce((s, w) => s + totalVolume(w), 0);
  const regions = uniq(dayWorkouts.map(w => w.region));
  document.getElementById("today-summary").innerHTML = `
    <div class="stat-box"><div class="stat-label">Hareket</div><div class="stat-value">${dayWorkouts.length}</div></div>
    <div class="stat-box"><div class="stat-label">Toplam Set</div><div class="stat-value">${totalSets}</div></div>
    <div class="stat-box"><div class="stat-label">Toplam Hacim</div><div class="stat-value">${totalVol.toLocaleString("tr-TR")}</div></div>
    <div class="stat-box"><div class="stat-label">Bölge</div><div class="stat-value">${regions.length}</div></div>
  `;

  renderVolumeChart();
}

function renderEntry(w) {
  return `
    <div class="entry">
      <span class="badge">${w.region}</span>
      <div class="meta">
        <strong>${w.exercise}</strong>
        <small>${fmtDate(w.date)} · ${w.day}</small>
        ${w.note ? `<div class="note">📝 ${escapeHtml(w.note)}</div>` : ""}
      </div>
      <div class="stats">
        <span><b>${w.weight}</b> kg</span>
        <span><b>${w.sets}</b> set</span>
        <span><b>${w.reps}</b> tek</span>
        <button class="delete-btn" data-id="${w.id}" title="Sil">✕</button>
      </div>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function deleteWorkout(id) {
  if (!confirm("Bu kaydı silmek istediğinden emin misin?")) return;
  workouts = workouts.filter(w => w.id !== id);
  saveStore();
  refreshDatalists();
  renderToday();
  renderArchive();
  renderFooter();
  showToast("Kayıt silindi.");
}

function renderVolumeChart() {
  const ctx = document.getElementById("volume-chart");
  if (!ctx) return;
  // Son 14 günün toplam hacmi
  const days = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const vol = workouts.filter(w => w.date === iso).reduce((s, w) => s + totalVolume(w), 0);
    days.push({ iso, label: `${d.getDate()}/${d.getMonth() + 1}`, vol });
  }
  if (charts.volume) charts.volume.destroy();
  charts.volume = new Chart(ctx, {
    type: "bar",
    data: {
      labels: days.map(d => d.label),
      datasets: [{
        label: "Toplam Hacim (kg)",
        data: days.map(d => d.vol),
        backgroundColor: "rgba(255, 87, 34, 0.7)",
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#9aa6b2" } } },
      scales: {
        x: { ticks: { color: "#9aa6b2" }, grid: { color: "rgba(255,255,255,0.05)" } },
        y: { ticks: { color: "#9aa6b2" }, grid: { color: "rgba(255,255,255,0.05)" } },
      },
    },
  });
}

// ---------- Archive ----------

function initArchive() {
  ["filter-from", "filter-to", "filter-region", "filter-exercise"].forEach(id => {
    document.getElementById(id).addEventListener("change", renderArchive);
  });
  document.getElementById("filter-reset").addEventListener("click", () => {
    document.getElementById("filter-from").value = "";
    document.getElementById("filter-to").value = "";
    document.getElementById("filter-region").value = "";
    document.getElementById("filter-exercise").value = "";
    renderArchive();
  });
  document.getElementById("export-json").addEventListener("click", exportJSON);
  document.getElementById("export-csv").addEventListener("click", exportCSV);
  document.getElementById("import-json").addEventListener("change", importJSON);
  document.getElementById("seed-load").addEventListener("click", () => {
    if (!confirm("Mevcut verilerin üzerine örnek veri eklensin mi?")) return;
    SEED_DATA.forEach(s => workouts.push(seedToWorkout(s)));
    saveStore();
    refreshDatalists();
    renderArchive();
    renderToday();
    renderFooter();
    showToast("Örnek veri yüklendi.");
  });
  document.getElementById("data-clear").addEventListener("click", () => {
    if (!confirm("TÜM antrenman verisini silmek istediğine emin misin? Geri alınamaz.")) return;
    workouts = [];
    saveStore();
    refreshDatalists();
    renderArchive();
    renderToday();
    renderFooter();
    showToast("Tüm veriler silindi.");
  });
  document.getElementById("progress-exercise").addEventListener("change", renderProgressChart);
}

function getFiltered() {
  const from = document.getElementById("filter-from").value;
  const to = document.getElementById("filter-to").value;
  const reg = document.getElementById("filter-region").value;
  const ex = document.getElementById("filter-exercise").value;
  return workouts.filter(w => {
    if (from && w.date < from) return false;
    if (to && w.date > to) return false;
    if (reg && w.region !== reg) return false;
    if (ex && w.exercise !== ex) return false;
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

function renderArchive() {
  const filtered = getFiltered();
  const wrap = document.getElementById("archive-table-wrap");

  if (filtered.length === 0) {
    wrap.innerHTML = '<div class="empty"><div class="ico">📂</div>Filtreye uyan kayıt yok.</div>';
  } else {
    // Group by date
    const groups = {};
    filtered.forEach(w => {
      groups[w.date] = groups[w.date] || [];
      groups[w.date].push(w);
    });
    const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    wrap.innerHTML = dates.map(d => `
      <div class="day-group">
        <h3>${fmtDateLong(d)}</h3>
        <div class="entries">${groups[d].map(renderEntry).join("")}</div>
      </div>
    `).join("");
    wrap.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", () => deleteWorkout(btn.dataset.id));
    });
  }

  // Stats
  const totalSets = filtered.reduce((s, w) => s + w.sets, 0);
  const totalVol = filtered.reduce((s, w) => s + totalVolume(w), 0);
  const days = uniq(filtered.map(w => w.date)).length;
  document.getElementById("archive-stats").innerHTML = `
    <div class="stat-box"><div class="stat-label">Antrenman</div><div class="stat-value">${days}</div></div>
    <div class="stat-box"><div class="stat-label">Hareket</div><div class="stat-value">${filtered.length}</div></div>
    <div class="stat-box"><div class="stat-label">Toplam Set</div><div class="stat-value">${totalSets}</div></div>
    <div class="stat-box"><div class="stat-label">Toplam Hacim</div><div class="stat-value">${totalVol.toLocaleString("tr-TR")} kg</div></div>
  `;

  renderProgressChart();
}

function renderProgressChart() {
  const sel = document.getElementById("progress-exercise");
  const exercise = sel.value;
  const ctx = document.getElementById("progress-chart");
  if (!exercise) {
    if (charts.progress) charts.progress.destroy();
    document.getElementById("progress-summary").textContent = "";
    return;
  }
  const data = workouts
    .filter(w => w.exercise === exercise)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);

  // Tarih başına en yüksek ağırlık
  const byDate = {};
  data.forEach(w => {
    if (!byDate[w.date] || w.weight > byDate[w.date].weight) byDate[w.date] = w;
  });
  const points = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));

  if (charts.progress) charts.progress.destroy();
  charts.progress = new Chart(ctx, {
    type: "line",
    data: {
      labels: points.map(p => fmtDate(p.date)),
      datasets: [{
        label: `${exercise} (kg)`,
        data: points.map(p => p.weight),
        borderColor: "#ff8a65",
        backgroundColor: "rgba(255, 138, 101, 0.15)",
        tension: 0.25,
        pointRadius: 5,
        pointBackgroundColor: "#ff5722",
        fill: true,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#9aa6b2" } } },
      scales: {
        x: { ticks: { color: "#9aa6b2" }, grid: { color: "rgba(255,255,255,0.05)" } },
        y: { ticks: { color: "#9aa6b2" }, grid: { color: "rgba(255,255,255,0.05)" } },
      },
    },
  });

  if (points.length >= 2) {
    const first = points[0].weight;
    const last = points[points.length - 1].weight;
    const diff = last - first;
    const pct = first > 0 ? ((diff / first) * 100).toFixed(1) : "0";
    const trend = diff > 0 ? "📈" : diff < 0 ? "📉" : "➡️";
    document.getElementById("progress-summary").innerHTML =
      `${trend} ${exercise}: <b>${first}kg → ${last}kg</b> (${diff > 0 ? "+" : ""}${diff.toFixed(1)}kg, %${pct}) — ${points.length} antrenman.`;
  } else if (points.length === 1) {
    document.getElementById("progress-summary").textContent = `${exercise} sadece 1 kez yapılmış. İlerleme grafiği için en az 2 antrenman gerekir.`;
  } else {
    document.getElementById("progress-summary").textContent = "";
  }
}

// ---------- Suggestions ----------

function nextTarget(last) {
  // Progressive overload: rep en yüksek hedef rep'e ulaştıysa ağırlık artır
  // Basit kural: önce +1 rep dene, max 12 olunca ağırlığı +%2.5 artırıp rep'i sıfırla
  const REP_CAP = 12;
  if (last.reps < REP_CAP) {
    return { weight: last.weight, sets: last.sets, reps: last.reps + 1 };
  }
  const newWeight = Math.round((last.weight * 1.025) * 2) / 2; // 0.5 kg yuvarlama
  return { weight: newWeight, sets: last.sets, reps: 8 };
}

function renderSuggestions() {
  const list = document.getElementById("suggestions-list");
  const targets = document.getElementById("next-targets");
  const sugs = [];

  // Bugün hangi gün?
  const today = todayISO();
  const todayWorkouts = workouts.filter(w => w.date === today);
  if (todayWorkouts.length === 0) {
    sugs.push({ icon: "💡", type: "info", title: "Bugün antrenman yok",
      body: "Bugün için kayıt yok. Hazırsan başla, formdan kaydet." });
  } else {
    sugs.push({ icon: "✅", type: "good", title: "Bugün antrenman yapıldı",
      body: `${todayWorkouts.length} hareket, ${todayWorkouts.reduce((s, w) => s + w.sets, 0)} set kaydedildi.` });
  }

  // Son antrenman tarihi
  const dates = uniq(workouts.map(w => w.date)).sort();
  if (dates.length > 0) {
    const last = dates[dates.length - 1];
    const diffDays = Math.floor((new Date(today) - new Date(last)) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      // bugün
    } else if (diffDays === 1) {
      sugs.push({ icon: "🔥", type: "info", title: "Dün antrenman yapıldı",
        body: "Bugün dinlenme veya farklı bir kas grubu çalış." });
    } else if (diffDays >= 4) {
      sugs.push({ icon: "⚠️", type: "warn", title: `${diffDays} gündür ara verildi`,
        body: "Düzenli antrenman için haftada en az 3 seans hedefle." });
    }
  }

  // Kas grubu frekansı (son 14 gün)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  const recentByRegion = {};
  workouts.forEach(w => {
    if (new Date(w.date) >= cutoff) {
      recentByRegion[w.region] = (recentByRegion[w.region] || 0) + w.sets;
    }
  });

  const buyukKaslar = ["Göğüs", "Sırt", "Bacak", "Omuz"];
  buyukKaslar.forEach(k => {
    const setSayisi = recentByRegion[k] || (k === "Bacak" ? (recentByRegion["Ön Bacak"] || 0) + (recentByRegion["Arka Bacak"] || 0) : 0);
    if (setSayisi < 6) {
      sugs.push({ icon: "🦵", type: "warn", title: `${k} hacmi düşük`,
        body: `Son 14 günde sadece ${setSayisi} set. İdeal: 10+ set / hafta.` });
    } else if (setSayisi > 24) {
      sugs.push({ icon: "🛌", type: "info", title: `${k} hacmi yüksek`,
        body: `Son 14 günde ${setSayisi} set. Toparlanmaya dikkat.` });
    }
  });

  // En iyi PR (kişisel rekor) son 7 günde
  const last7 = new Date();
  last7.setDate(last7.getDate() - 7);
  const recentPRs = [];
  uniq(workouts.map(w => w.exercise)).forEach(ex => {
    const all = workouts.filter(w => w.exercise === ex);
    const maxAll = Math.max(...all.map(w => w.weight));
    const recent = all.filter(w => new Date(w.date) >= last7);
    if (recent.length > 0 && Math.max(...recent.map(w => w.weight)) >= maxAll && all.length > 1) {
      recentPRs.push({ ex, weight: maxAll });
    }
  });
  recentPRs.slice(0, 3).forEach(pr => {
    sugs.push({ icon: "🏆", type: "good", title: `Yeni PR: ${pr.ex}`,
      body: `Son 7 günde maksimum ağırlığa ulaşıldı: ${pr.weight} kg. Devam!` });
  });

  // Render suggestions
  if (sugs.length === 0) {
    list.innerHTML = '<div class="empty">Henüz öneri yok. Birkaç antrenman ekleyince burası dolar.</div>';
  } else {
    list.innerHTML = sugs.map(s => `
      <div class="suggestion ${s.type}">
        <div class="icon">${s.icon}</div>
        <div class="body"><strong>${s.title}</strong><small>${s.body}</small></div>
      </div>
    `).join("");
  }

  // Next targets per exercise
  const exes = uniq(workouts.map(w => w.exercise));
  const targetEntries = exes.map(ex => {
    const last = lastEntryFor(null, ex);
    if (!last) return null;
    const next = nextTarget(last);
    return { ex, last, next };
  }).filter(Boolean).sort((a, b) => b.last.createdAt - a.last.createdAt).slice(0, 12);

  if (targetEntries.length === 0) {
    targets.innerHTML = '<div class="empty">Hedef hesaplaması için kayıt gerekli.</div>';
  } else {
    targets.innerHTML = targetEntries.map(t => `
      <div class="entry">
        <span class="badge">${t.last.region}</span>
        <div class="meta">
          <strong>${t.ex}</strong>
          <small>Son: ${t.last.weight}kg × ${t.last.sets}×${t.last.reps} (${fmtDate(t.last.date)})</small>
        </div>
        <div class="stats">
          <span style="color:var(--accent-2)"><b>${t.next.weight}</b>kg</span>
          <span><b>${t.next.sets}</b>×<b>${t.next.reps}</b></span>
        </div>
      </div>
    `).join("");
  }

  renderFrequencyChart(recentByRegion);
  renderTemplates();
}

function renderFrequencyChart(byRegion) {
  const ctx = document.getElementById("frequency-chart");
  if (!ctx) return;
  const regions = Object.keys(byRegion);
  if (charts.frequency) charts.frequency.destroy();
  if (regions.length === 0) {
    ctx.getContext("2d").clearRect(0, 0, ctx.width, ctx.height);
    return;
  }
  charts.frequency = new Chart(ctx, {
    type: "polarArea",
    data: {
      labels: regions,
      datasets: [{
        data: regions.map(r => byRegion[r]),
        backgroundColor: regions.map((_, i) => `hsla(${(i * 50) % 360}, 70%, 55%, 0.6)`),
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: "#9aa6b2" }, position: "right" },
      },
      scales: {
        r: {
          ticks: { color: "#9aa6b2", backdropColor: "transparent" },
          grid: { color: "rgba(255,255,255,0.1)" },
          angleLines: { color: "rgba(255,255,255,0.1)" },
        },
      },
    },
  });
}

function renderTemplates() {
  const wrap = document.getElementById("templates");
  wrap.innerHTML = SABLONLAR.map(s => `
    <div class="template">
      <h4>${s.isim}</h4>
      <p class="hint">${s.aciklama}</p>
      <ul>${s.program.map(p => `<li>${p}</li>`).join("")}</ul>
    </div>
  `).join("");
}

// ---------- Calorie ----------

function initCalories() {
  document.getElementById("cal-date").value = todayISO();
  document.getElementById("cal-form").addEventListener("submit", (e) => {
    e.preventDefault();
    renderCalorieResult();
  });
}

function calcBMR(p) {
  // Mifflin-St Jeor
  const base = 10 * p.weight + 6.25 * p.height - 5 * p.age;
  return p.gender === "kadin" ? base - 161 : base + 5;
}

function calcTDEE(p) {
  return calcBMR(p) * p.activity;
}

function calcGoalCalories(p) {
  const tdee = calcTDEE(p);
  if (p.goal === "cut") return tdee * 0.8;
  if (p.goal === "bulk") return tdee * 1.15;
  return tdee;
}

function renderCalories() {
  const bmr = calcBMR(profile);
  const tdee = calcTDEE(profile);
  const goal = calcGoalCalories(profile);

  document.getElementById("tdee-result").innerHTML = `
    <div class="metric"><div class="label">BMR</div><div class="value">${Math.round(bmr)}</div><div class="sub">kcal/gün (dinlenme)</div></div>
    <div class="metric"><div class="label">TDEE</div><div class="value">${Math.round(tdee)}</div><div class="sub">kcal/gün (aktif)</div></div>
    <div class="metric"><div class="label">Hedef</div><div class="value">${Math.round(goal)}</div><div class="sub">${profile.goal === "cut" ? "yağ yakımı" : profile.goal === "bulk" ? "kas yapımı" : "korumak"}</div></div>
  `;

  // Macros: 1.8g protein/kg, 0.8g yağ/kg, kalan karbonhidrat
  const protein_g = Math.round(profile.weight * 1.8);
  const fat_g = Math.round(profile.weight * 0.8);
  const protein_cal = protein_g * 4;
  const fat_cal = fat_g * 9;
  const carb_cal = Math.max(0, goal - protein_cal - fat_cal);
  const carb_g = Math.round(carb_cal / 4);

  document.getElementById("macros-result").innerHTML = `
    <div class="macro-pill"><div class="macro-label">Protein</div><div class="macro-value">${protein_g} g</div><small>${Math.round(protein_cal)} kcal</small></div>
    <div class="macro-pill"><div class="macro-label">Yağ</div><div class="macro-value">${fat_g} g</div><small>${Math.round(fat_cal)} kcal</small></div>
    <div class="macro-pill"><div class="macro-label">Karbonhidrat</div><div class="macro-value">${carb_g} g</div><small>${Math.round(carb_cal)} kcal</small></div>
  `;

  renderCalorieResult();
  renderAutoBurn();
}

function renderCalorieResult() {
  const met = Number(document.getElementById("cal-met").value);
  const minutes = Number(document.getElementById("cal-minutes").value) || 0;
  const hours = minutes / 60;
  const burn = met * profile.weight * hours;
  document.getElementById("calorie-result").innerHTML = `
    <div class="metric"><div class="label">Yakılan</div><div class="value">${Math.round(burn)}</div><div class="sub">kcal (${minutes} dk × ${met} MET × ${profile.weight}kg)</div></div>
  `;
}

function renderAutoBurn() {
  const wrap = document.getElementById("auto-burn-list");
  // Group by date
  const byDate = {};
  workouts.forEach(w => {
    byDate[w.date] = byDate[w.date] || [];
    byDate[w.date].push(w);
  });
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a)).slice(0, 10);
  if (dates.length === 0) {
    wrap.innerHTML = '<div class="empty">Önce antrenman ekle.</div>';
    return;
  }
  wrap.innerHTML = dates.map(d => {
    const ws = byDate[d];
    const totalSets = ws.reduce((s, w) => s + w.sets, 0);
    const minutes = totalSets * 1.5;
    const avgMet = ws.reduce((s, w) => s + (HAREKET_MET[w.exercise] || HAREKET_MET.default), 0) / ws.length;
    const burn = avgMet * profile.weight * (minutes / 60);
    const totalVol = ws.reduce((s, w) => s + totalVolume(w), 0);
    return `
      <div class="entry">
        <span class="badge">${fmtDate(d)}</span>
        <div class="meta">
          <strong>${ws.length} hareket · ${totalSets} set</strong>
          <small>~${minutes.toFixed(0)} dk · ortalama ${avgMet.toFixed(1)} MET · hacim ${totalVol.toLocaleString("tr-TR")} kg</small>
        </div>
        <div class="stats">
          <span><b>${Math.round(burn)}</b> kcal</span>
        </div>
      </div>
    `;
  }).join("");
}

// ---------- Profile ----------

function initProfile() {
  const f = document.getElementById("profile-form");
  document.getElementById("p-name").value = profile.name;
  document.getElementById("p-gender").value = profile.gender;
  document.getElementById("p-age").value = profile.age;
  document.getElementById("p-height").value = profile.height;
  document.getElementById("p-weight").value = profile.weight;
  document.getElementById("p-activity").value = profile.activity;
  document.getElementById("p-goal").value = profile.goal;

  f.addEventListener("submit", (e) => {
    e.preventDefault();
    profile = {
      name: document.getElementById("p-name").value,
      gender: document.getElementById("p-gender").value,
      age: Number(document.getElementById("p-age").value),
      height: Number(document.getElementById("p-height").value),
      weight: Number(document.getElementById("p-weight").value),
      activity: Number(document.getElementById("p-activity").value),
      goal: document.getElementById("p-goal").value,
    };
    saveProfile();
    renderProfileSummary();
    renderCalories();
    renderFooter();
    showToast("Profil kaydedildi.");
  });
  renderProfileSummary();
}

function renderProfileSummary() {
  const bmi = profile.weight / Math.pow(profile.height / 100, 2);
  let bmiLabel = "Normal";
  if (bmi < 18.5) bmiLabel = "Zayıf";
  else if (bmi >= 25 && bmi < 30) bmiLabel = "Kilolu";
  else if (bmi >= 30) bmiLabel = "Obez";

  document.getElementById("profile-summary").innerHTML = `
    <div class="metric"><div class="label">BMI</div><div class="value">${bmi.toFixed(1)}</div><div class="sub">${bmiLabel}</div></div>
    <div class="metric"><div class="label">İdeal Protein</div><div class="value">${Math.round(profile.weight * 1.8)} g</div><div class="sub">1.8 g/kg</div></div>
    <div class="metric"><div class="label">Su İhtiyacı</div><div class="value">${(profile.weight * 0.035).toFixed(1)}</div><div class="sub">litre/gün</div></div>
  `;
}

// ---------- Export / Import ----------

function exportJSON() {
  const blob = new Blob([JSON.stringify({ workouts, profile, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
  downloadBlob(blob, `fitness-${todayISO()}.json`);
  showToast("JSON indirildi.");
}

function exportCSV() {
  const rows = [["Tarih", "Gün", "Bölge", "Hareket", "Ağırlık (kg)", "Set", "Tekrar", "Hacim", "Not"]];
  workouts.sort((a, b) => a.date.localeCompare(b.date)).forEach(w => {
    rows.push([w.date, w.day, w.region, w.exercise, w.weight, w.sets, w.reps, totalVolume(w), w.note || ""]);
  });
  const csv = rows.map(r => r.map(c => {
    const s = String(c);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `fitness-${todayISO()}.csv`);
  showToast("CSV indirildi.");
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 200);
}

function importJSON(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (Array.isArray(data.workouts)) {
        if (!confirm(`${data.workouts.length} kayıt yüklenecek. Mevcut veriler silinsin mi?`)) {
          // Append
          workouts = workouts.concat(data.workouts);
        } else {
          workouts = data.workouts;
        }
        if (data.profile) profile = { ...profile, ...data.profile };
        saveStore();
        saveProfile();
        refreshDatalists();
        renderToday();
        renderArchive();
        renderFooter();
        showToast("Veri yüklendi.");
      } else {
        showToast("Geçersiz JSON formatı.");
      }
    } catch (err) {
      showToast("Yükleme hatası: " + err.message);
    }
    e.target.value = "";
  };
  reader.readAsText(file);
}

// ---------- Footer ----------

function renderFooter() {
  const total = workouts.length;
  const days = uniq(workouts.map(w => w.date)).length;
  const totalVol = workouts.reduce((s, w) => s + totalVolume(w), 0);
  document.getElementById("footer-stats").innerHTML =
    `<b>${days}</b> antrenman · <b>${total}</b> hareket · <b>${totalVol.toLocaleString("tr-TR")}</b> kg toplam hacim`;
}

// ---------- Init ----------

function init() {
  loadStore();
  initTabs();
  initForm();
  initToday();
  initArchive();
  initCalories();
  initProfile();
  renderToday();
  renderFooter();
}

document.addEventListener("DOMContentLoaded", init);

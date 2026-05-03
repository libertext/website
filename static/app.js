// Mevzuat — single page UI logic
const els = {
  nav: document.getElementById("tur-nav"),
  list: document.getElementById("list"),
  status: document.getElementById("status"),
  pager: document.getElementById("pager"),
  resultInfo: document.getElementById("result-info"),
  searchForm: document.getElementById("search-form"),
  searchInput: document.getElementById("search-input"),
  limit: document.getElementById("limit"),
  heroTitle: document.getElementById("hero-title"),
  heroSub: document.getElementById("hero-sub"),
};

const state = {
  turler: [],
  aktifTur: "kanun",
  arama: "",
  sayfa: 1,
  limit: 25,
  toplam: 0,
};

const HERO_COPY = {
  kanun: {
    t: "Kanunlar",
    s: "Türkiye Büyük Millet Meclisi tarafından kabul edilen yürürlükteki kanunlar.",
  },
  yonetmelik: {
    t: "Yönetmelikler",
    s: "Bakanlıklar ve kamu kurumlarınca çıkarılmış yönetmelikler.",
  },
  cb_kararnamesi: {
    t: "Cumhurbaşkanlığı Kararnameleri",
    s: "Cumhurbaşkanlığı tarafından yayımlanmış kararname metinleri.",
  },
  khk: { t: "Kanun Hükmünde Kararnameler", s: "Yürürlükteki KHK'lar." },
  tuzuk: { t: "Tüzükler", s: "Bakanlar Kurulu tarafından çıkarılmış tüzükler." },
  teblig: { t: "Tebliğler", s: "Kamu kurumlarının yayımladığı tebliğler." },
};

function setStatus(msg, isError = false) {
  els.status.textContent = msg || "";
  els.status.classList.toggle("error", isError);
}

function syncURL() {
  const params = new URLSearchParams();
  if (state.aktifTur !== "kanun") params.set("tur", state.aktifTur);
  if (state.arama) params.set("q", state.arama);
  if (state.sayfa > 1) params.set("sayfa", state.sayfa);
  if (state.limit !== 25) params.set("limit", state.limit);
  const qs = params.toString();
  history.replaceState(null, "", qs ? "?" + qs : location.pathname);
}

function readURL() {
  const params = new URLSearchParams(location.search);
  state.aktifTur = params.get("tur") || "kanun";
  state.arama = params.get("q") || "";
  state.sayfa = parseInt(params.get("sayfa") || "1", 10);
  state.limit = parseInt(params.get("limit") || "25", 10);
  els.searchInput.value = state.arama;
  els.limit.value = String(state.limit);
}

function renderNav() {
  els.nav.innerHTML = "";
  for (const t of state.turler) {
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = t.ad;
    a.dataset.slug = t.slug;
    if (t.slug === state.aktifTur) a.classList.add("active");
    a.addEventListener("click", (e) => {
      e.preventDefault();
      if (state.aktifTur === t.slug) return;
      state.aktifTur = t.slug;
      state.sayfa = 1;
      renderNav();
      renderHero();
      load();
    });
    els.nav.appendChild(a);
  }
}

function renderHero() {
  const copy = HERO_COPY[state.aktifTur] || {
    t: "Mevzuat",
    s: "T.C. mevzuatı.",
  };
  els.heroTitle.textContent = copy.t;
  els.heroSub.textContent = copy.s;
}

function escapeHTML(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function formatDate(s) {
  if (!s) return "";
  const m = String(s).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}.${m[2]}.${m[1]}`;
  return s;
}

function renderList(items) {
  els.list.innerHTML = "";
  if (!items.length) {
    els.list.innerHTML = `<li class="status">Sonuç bulunamadı.</li>`;
    return;
  }
  for (const it of items) {
    const li = document.createElement("li");
    li.className = "card";
    const tertip = it.tertip || "5";
    const pdf = `https://www.mevzuat.gov.tr/MevzuatMetin/1.${tertip}.${it.no}.pdf`;
    const html = `https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=${encodeURIComponent(it.no)}&MevzuatTertip=${tertip}`;
    li.innerHTML = `
      <div class="no">${escapeHTML(it.no || "—")}</div>
      <div>
        <div class="title">${escapeHTML(it.ad)}</div>
        <div class="meta">${formatDate(it.tarih)}${it.tertip ? " • Tertip " + escapeHTML(it.tertip) : ""}</div>
      </div>
      <div class="actions">
        <a href="${html}" target="_blank" rel="noopener">Oku</a>
        <a href="${pdf}" target="_blank" rel="noopener">PDF</a>
      </div>
    `;
    els.list.appendChild(li);
  }
}

function renderPager() {
  els.pager.innerHTML = "";
  const totalPages = Math.max(1, Math.ceil(state.toplam / state.limit));
  if (totalPages <= 1) return;

  const make = (label, page, opts = {}) => {
    const b = document.createElement("button");
    b.textContent = label;
    if (opts.active) b.classList.add("active");
    if (opts.disabled) b.disabled = true;
    if (!opts.disabled) {
      b.addEventListener("click", () => {
        state.sayfa = page;
        load();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
    return b;
  };

  els.pager.appendChild(make("‹", state.sayfa - 1, { disabled: state.sayfa <= 1 }));

  const window_ = 2;
  const pages = new Set([1, totalPages, state.sayfa]);
  for (let i = 1; i <= window_; i++) {
    pages.add(state.sayfa - i);
    pages.add(state.sayfa + i);
  }
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) {
      const span = document.createElement("button");
      span.textContent = "…"; span.disabled = true;
      els.pager.appendChild(span);
    }
    els.pager.appendChild(make(String(p), p, { active: p === state.sayfa }));
    prev = p;
  }

  els.pager.appendChild(make("›", state.sayfa + 1, { disabled: state.sayfa >= totalPages }));
}

async function load() {
  syncURL();
  setStatus("Yükleniyor…");
  els.list.innerHTML = "";
  els.pager.innerHTML = "";

  try {
    const params = new URLSearchParams({
      sayfa: state.sayfa,
      limit: state.limit,
    });
    if (state.arama) params.set("q", state.arama);
    const r = await fetch(`/api/mevzuat/${state.aktifTur}?${params}`);
    const data = await r.json();
    if (data.error) {
      setStatus("Hata: " + data.error, true);
      return;
    }
    state.toplam = data.toplam || 0;
    setStatus("");
    els.resultInfo.textContent = state.toplam
      ? `${state.toplam.toLocaleString("tr-TR")} sonuç`
      : "";
    renderList(data.items || []);
    renderPager();
  } catch (e) {
    setStatus("Bağlantı hatası: " + e.message, true);
  }
}

async function init() {
  readURL();
  try {
    const r = await fetch("/api/turler");
    state.turler = await r.json();
  } catch {
    state.turler = [
      { slug: "kanun", ad: "Kanun" },
      { slug: "yonetmelik", ad: "Yönetmelik" },
    ];
  }
  renderNav();
  renderHero();

  els.searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    state.arama = els.searchInput.value.trim();
    state.sayfa = 1;
    load();
  });
  els.limit.addEventListener("change", () => {
    state.limit = parseInt(els.limit.value, 10);
    state.sayfa = 1;
    load();
  });

  load();
}

init();

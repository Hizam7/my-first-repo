// رابط الـ API المحلي أثناء التطوير
const API_BASE = "http://localhost:4000/api";

let allAds = [];
let currentUserId = null;

// قراءة حالة تسجيل الدخول (للعرض فقط في الشريط العلوي)
function loadAuthAndShowStatus() {
  const raw = localStorage.getItem("auth");
  const statusEl = document.getElementById("userStatus");
  if (!statusEl) return;

  if (!raw) {
    statusEl.textContent = "غير مسجل دخول";
    currentUserId = null;
    return;
  }
  try {
    const { user } = JSON.parse(raw);
    if (user && user.name) {
      statusEl.textContent = `مسجل دخول كـ ${user.name}`;
      currentUserId = user.id || null;
    } else {
      statusEl.textContent = "غير مسجل دخول";
      currentUserId = null;
    }
  } catch {
    statusEl.textContent = "غير مسجل دخول";
    currentUserId = null;
  }
}

// تحديث الإحصائيات
function updateStats() {
  const countEl = document.getElementById("adsCount");
  const cityEl = document.getElementById("activeCity");
  if (countEl) countEl.textContent = allAds.length.toString();

  const cityFilter = document.getElementById("cityFilter").value.trim();
  if (cityEl) cityEl.textContent = cityFilter || "كل المدن";
}

// تحميل الإعلانات من API
async function fetchAds() {
  const params = new URLSearchParams();
  const cityFilter = document.getElementById("cityFilter").value.trim();
  const categoryFilter = document.getElementById("categoryFilter").value.trim();
  const searchText = document.getElementById("searchText").value.trim();

  if (cityFilter) params.append("city", cityFilter);
  if (categoryFilter) params.append("category", categoryFilter);
  if (searchText) params.append("q", searchText);

  const url = `${API_BASE}/ads?${params.toString()}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("فشل جلب الإعلانات");
    allAds = await res.json();
    renderAds(allAds);
    updateStats();
  } catch (err) {
    console.error(err);
    alert("حدث خطأ أثناء تحميل الإعلانات");
  }
}

function createAdCard(ad) {
  const card = document.createElement("article");
  card.className = "ad-card";

  const imgWrapper = document.createElement("div");
  imgWrapper.className = "ad-image-wrapper";

  const img = document.createElement("img");
  img.alt = ad.title;
  img.loading = "lazy";
  img.src =
    (ad.imageUrl && ad.imageUrl.trim()) ||
    "https://via.placeholder.com/600x400?text=No+Image";
  imgWrapper.appendChild(img);

  const content = document.createElement("div");
  content.className = "ad-content";

  const title = document.createElement("h3");
  title.className = "ad-title";
  title.textContent = ad.title;

  const price = document.createElement("div");
  price.className = "ad-price";
  price.textContent = `${Number(ad.price || 0).toLocaleString("ar-YE")} ريال`;

  const meta = document.createElement("div");
  meta.className = "ad-meta";

  const citySpan = document.createElement("span");
  citySpan.textContent = ad.city;

  const catBadge = document.createElement("span");
  catBadge.className = "ad-category-badge";
  catBadge.textContent = ad.category;

  const sellerLink = document.createElement("a");
  sellerLink.className = "seller-link";
  if (ad.userId) {
    sellerLink.href = `profile.html?user=${encodeURIComponent(ad.userId)}`;
    sellerLink.textContent = "صفحة البائع";
  } else {
    sellerLink.href = "#";
    sellerLink.textContent = "بائع";
  }

  meta.appendChild(citySpan);
  meta.appendChild(catBadge);
  meta.appendChild(sellerLink);

  const description = document.createElement("p");
  description.className = "ad-description";
  description.textContent = ad.description || "";

  const actions = document.createElement("div");
  actions.className = "ad-actions";

  const waLink = document.createElement("a");
  waLink.className = "contact-btn";
  const phone = (ad.whatsapp || "").replace(/\D/g, "");
  const phoneWithCode = phone.startsWith("967") ? phone : `967${phone}`;
  waLink.href = `https://wa.me/${phoneWithCode}`;
  waLink.target = "_blank";
  waLink.rel = "noopener noreferrer";
  waLink.textContent = `تواصل واتساب (${ad.whatsapp})`;

  actions.appendChild(waLink);

  // إذا كان الإعلان يخص المستخدم الحالي، أضف زر تعديل ينقله إلى لوحة البائع مع معرف الإعلان
  if (currentUserId && ad.userId === currentUserId) {
    const editBtn = document.createElement("button");
    editBtn.className = "btn-secondary btn-sm";
    editBtn.style.marginInlineStart = "0.5rem";
    editBtn.textContent = "تعديل الإعلان";
    editBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = `seller.html?edit=${encodeURIComponent(ad.id)}`;
    });
    actions.appendChild(editBtn);
  }

  content.appendChild(title);
  content.appendChild(price);
  content.appendChild(meta);
  if (ad.description) content.appendChild(description);
  content.appendChild(actions);

  card.appendChild(imgWrapper);
  card.appendChild(content);

  return card;
}

function renderAds(ads) {
  const container = document.getElementById("adsContainer");
  const noAdsMessage = document.getElementById("noAdsMessage");
  container.innerHTML = "";

  if (!ads.length) {
    noAdsMessage.hidden = false;
    return;
  }

  noAdsMessage.hidden = true;
  for (const ad of ads) {
    container.appendChild(createAdCard(ad));
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const yearSpan = document.getElementById("year");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  loadAuthAndShowStatus();

  // فلاتر
  document.getElementById("cityFilter").addEventListener("change", fetchAds);
  document.getElementById("categoryFilter").addEventListener("change", fetchAds);
  document.getElementById("searchText").addEventListener("input", () => {
    fetchAds();
  });
  document.getElementById("clearFiltersBtn").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("cityFilter").value = "";
    document.getElementById("categoryFilter").value = "";
    document.getElementById("searchText").value = "";
    fetchAds();
  });

  // أول تحميل
  fetchAds();
});

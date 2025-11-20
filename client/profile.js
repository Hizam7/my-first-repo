const API_BASE = "http://localhost:4000/api";

let currentUserId = null;

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

function formatDate(timestamp) {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  return d.toLocaleDateString("ar-YE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function createAdCardForSeller(ad) {
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

  meta.appendChild(citySpan);
  meta.appendChild(catBadge);

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

  // إذا كنت مالك هذا الإعلان، أضف زر تعديل ينقلك للوحة البائع مباشرة مع معرف الإعلان
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

async function loadSellerPage() {
  const params = new URLSearchParams(window.location.search);
  const sellerId = params.get("user");

  const nameEl = document.getElementById("sellerName");
  const whatsappEl = document.getElementById("sellerWhatsapp");
  const sinceEl = document.getElementById("sellerSince");
  const adsCountEl = document.getElementById("sellerAdsCount");
  const citiesCountEl = document.getElementById("sellerCitiesCount");
  const viewerHintEl = document.getElementById("viewerHint");
  const adsContainer = document.getElementById("sellerAdsContainer");
  const noAdsMsg = document.getElementById("noSellerAdsMessage");

  if (!sellerId) {
    if (nameEl) nameEl.textContent = "لم يتم تحديد البائع";
    if (viewerHintEl)
      viewerHintEl.textContent = "تأكد من أن رابط صفحة البائع يحتوي على معرف صحيح.";
    return;
  }

  try {
    // جلب بيانات البائع
    const userRes = await fetch(`${API_BASE}/users/${encodeURIComponent(sellerId)}`);
    if (!userRes.ok) {
      if (nameEl) nameEl.textContent = "البائع غير موجود";
      return;
    }
    const user = await userRes.json();

    if (nameEl) nameEl.textContent = user.name || "بائع";
    if (whatsappEl)
      whatsappEl.textContent = user.whatsapp
        ? `واتساب: ${user.whatsapp}`
        : "";
    if (sinceEl)
      sinceEl.textContent = user.createdAt
        ? `منضم إلى سوق حارتي منذ ${formatDate(user.createdAt)}`
        : "";

    if (adsCountEl) adsCountEl.textContent = user.stats?.adsCount ?? 0;
    if (citiesCountEl) citiesCountEl.textContent = user.stats?.citiesCount ?? 0;

    if (viewerHintEl) {
      if (currentUserId && currentUserId === user.id) {
        viewerHintEl.textContent =
          "هذه صفحتك العامة. يمكنك تعديل إعلاناتك من لوحة البائع.";
      } else {
        viewerHintEl.textContent =
          "يمكنك التواصل مع البائع عبر الواتساب أو تصفح باقي إعلاناته أدناه.";
      }
    }

    // جلب إعلانات هذا البائع باستخدام userId في /api/ads
    const adsRes = await fetch(
      `${API_BASE}/ads?userId=${encodeURIComponent(sellerId)}`
    );
    if (!adsRes.ok) {
      console.error("Error loading seller ads", adsRes.status);
      return;
    }
    const sellerAds = await adsRes.json();

    adsContainer.innerHTML = "";
    if (!sellerAds.length) {
      if (noAdsMsg) noAdsMsg.hidden = false;
      return;
    }
    if (noAdsMsg) noAdsMsg.hidden = true;

    for (const ad of sellerAds) {
      adsContainer.appendChild(createAdCardForSeller(ad));
    }
  } catch (err) {
    console.error("Error loading seller page", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const yearSpan = document.getElementById("year");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  loadAuthAndShowStatus();
  loadSellerPage();
});

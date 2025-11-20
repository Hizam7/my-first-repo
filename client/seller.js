const API_BASE = "http://localhost:4000/api";

let authToken = null;
let currentUser = null;
let myAds = [];
let pendingEditAdId = null;

function setAuth(token, user) {
  authToken = token || null;
  currentUser = user || null;

  const statusEl = document.getElementById("userStatus");
  const loginStatusEl = document.getElementById("loginStatus");

  if (statusEl) {
    statusEl.textContent = user
      ? `مسجل دخول كـ ${user.name}`
      : "غير مسجل دخول";
  }
  if (loginStatusEl) {
    loginStatusEl.textContent = user ? "" : "لم تقم بتسجيل الدخول بعد.";
  }

  if (token && user) {
    localStorage.setItem("auth", JSON.stringify({ token, user }));
  } else {
    localStorage.removeItem("auth");
  }

  updateProfileInfo();
  updateVisibility();
}

function loadAuthFromStorage() {
  const raw = localStorage.getItem("auth");
  if (!raw) return;
  try {
    const { token, user } = JSON.parse(raw);
    authToken = token;
    currentUser = user;
  } catch {}
}

function updateProfileInfo() {
  const nameEl = document.getElementById("profileName");
  const whatsappEl = document.getElementById("profileWhatsapp");
  if (!currentUser) {
    if (nameEl) nameEl.textContent = "-";
    if (whatsappEl) whatsappEl.textContent = "-";
    return;
  }
  if (nameEl) nameEl.textContent = currentUser.name || "-";
  if (whatsappEl) whatsappEl.textContent = currentUser.whatsapp || "-";
}

// إظهار/إخفاء أقسام الصفحة حسب حالة تسجيل الدخول
function updateVisibility() {
  const authSection = document.getElementById("authSection");
  const profileSection = document.getElementById("profileSection");
  const adFormSection = document.getElementById("adFormSection");
  const myAdsSection = document.getElementById("myAdsSection");

  const loggedIn = !!authToken;

  if (authSection) authSection.style.display = loggedIn ? "none" : "";
  if (profileSection) profileSection.style.display = loggedIn ? "" : "none";
  if (adFormSection) adFormSection.style.display = loggedIn ? "" : "none";
  if (myAdsSection) myAdsSection.style.display = loggedIn ? "" : "none";
}

// لم نعد نستخدم استعلام /api/me، سنعتمد على بيانات المستخدم القادمة من تسجيل الدخول والمحفوظه في localStorage
function fetchProfileFromServer() {
  return; // دالة فارغة لتفادي الأخطاء إن تم استدعاؤها من مكان قديم
}

function createMyAdCard(ad) {
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
  meta.innerHTML = `<span>${ad.city}</span><span class="ad-category-badge">${ad.category}</span>`;

  const description = document.createElement("p");
  description.className = "ad-description";
  description.textContent = ad.description || "";

  const actions = document.createElement("div");
  actions.className = "ad-actions";

  const editBtn = document.createElement("button");
  editBtn.className = "btn-secondary btn-sm";
  editBtn.textContent = "تعديل";
  editBtn.addEventListener("click", () => startEditAd(ad));

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn-secondary btn-sm";
  deleteBtn.style.marginRight = "0.5rem";
  deleteBtn.textContent = "حذف";
  deleteBtn.addEventListener("click", () => deleteAd(ad));

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);

  content.appendChild(title);
  content.appendChild(price);
  content.appendChild(meta);
  if (ad.description) content.appendChild(description);
  content.appendChild(actions);

  card.appendChild(imgWrapper);
  card.appendChild(content);

  return card;
}

function updateDashboardStats() {
  const countEl = document.getElementById("myAdsCount");
  const citiesEl = document.getElementById("myCitiesCount");
  if (!countEl || !citiesEl) return;
  countEl.textContent = myAds.length.toString();
  const cities = new Set(myAds.map((a) => a.city));
  citiesEl.textContent = cities.size.toString();
}

function renderMyAds() {
  const container = document.getElementById("myAdsContainer");
  const noMsg = document.getElementById("noMyAdsMessage");
  container.innerHTML = "";

  if (!myAds.length) {
    if (noMsg) noMsg.hidden = false;
    updateDashboardStats();
    return;
  }

  if (noMsg) noMsg.hidden = true;
  for (const ad of myAds) {
    container.appendChild(createMyAdCard(ad));
  }
  updateDashboardStats();
}

async function fetchMyAds() {
  if (!authToken || !currentUser) return;
  try {
    // نستخدم /api/ads ونقوم بالفلترة في الواجهة على userId
    const res = await fetch(`${API_BASE}/ads`);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Error fetching /ads for my-ads", res.status, text);
      alert(`خطأ أثناء تحميل إعلاناتك (رمز ${res.status})`);
      return;
    }
    const all = await res.json();
    myAds = all.filter((ad) => ad.userId === currentUser.id);
    renderMyAds();

    // إذا وصلنا من رابط فيه ?edit=ID، حاول فتح هذا الإعلان للتعديل بعد تحميل القائمة
    if (pendingEditAdId) {
      const adToEdit = myAds.find((a) => a.id === pendingEditAdId);
      if (adToEdit) {
        startEditAd(adToEdit);
        pendingEditAdId = null;
      }
    }
  } catch (err) {
    console.error("Exception in fetchMyAds", err);
    alert("حدث استثناء أثناء تحميل إعلاناتك");
  }
}

function resetAdForm() {
  document.getElementById("editingAdId").value = "";
  document.getElementById("title").value = "";
  document.getElementById("price").value = "";
  document.getElementById("city").value = "";
  document.getElementById("category").value = "";
  document.getElementById("imageUrl").value = "";
  document.getElementById("description").value = "";
  document.getElementById("whatsapp").value = "";

  const submitBtn = document.getElementById("adSubmitBtn");
  const cancelBtn = document.getElementById("adCancelEditBtn");
  if (submitBtn) submitBtn.textContent = "نشر الإعلان";
  if (cancelBtn) cancelBtn.style.display = "none";
}

function startEditAd(ad) {
  document.getElementById("editingAdId").value = ad.id;
  document.getElementById("title").value = ad.title;
  document.getElementById("price").value = ad.price;
  document.getElementById("city").value = ad.city;
  document.getElementById("category").value = ad.category;
  document.getElementById("imageUrl").value = ad.imageUrl || "";
  document.getElementById("description").value = ad.description || "";
  document.getElementById("whatsapp").value = ad.whatsapp || "";

  const submitBtn = document.getElementById("adSubmitBtn");
  const cancelBtn = document.getElementById("adCancelEditBtn");
  if (submitBtn) submitBtn.textContent = "حفظ التعديلات";
  if (cancelBtn) cancelBtn.style.display = "block";

  const section = document.getElementById("adFormSection");
  if (section) section.scrollIntoView({ behavior: "smooth" });
}

async function deleteAd(ad) {
  if (!authToken) {
    alert("يجب تسجيل الدخول");
    return;
  }
  if (!confirm("هل أنت متأكد من حذف هذا الإعلان؟")) return;

  try {
    const res = await fetch(`${API_BASE}/ads/${ad.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.message || "فشل حذف الإعلان");
      return;
    }
    myAds = myAds.filter((x) => x.id !== ad.id);
    renderMyAds();
  } catch (err) {
    console.error(err);
    alert("خطأ أثناء حذف الإعلان");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const yearSpan = document.getElementById("year");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  loadAuthFromStorage();
  setAuth(authToken, currentUser);

  // قراءة معرف إعلان محتمل من رابط ?edit=ID
  const params = new URLSearchParams(window.location.search);
  pendingEditAdId = params.get("edit") || null;

  if (authToken && currentUser) {
    // لا داعي لاستدعاء /api/me، نستخدم بيانات currentUser مباشرة
    fetchMyAds();

    // تحديث رابط الصفحة العامة للبائع
    const publicLink = document.getElementById("publicProfileLink");
    if (publicLink && currentUser.id) {
      publicLink.href = `profile.html?user=${encodeURIComponent(currentUser.id)}`;
    }
  }

  // تسجيل حساب
  document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("regName").value.trim();
    const whatsapp = document.getElementById("regWhatsapp").value.trim();
    const password = document.getElementById("regPassword").value.trim();

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, whatsapp, password }),
      });
      const data = await res.json();
      alert(data.message || (res.ok ? "تم" : "حدث خطأ"));
    } catch (err) {
      console.error(err);
      alert("فشل إنشاء الحساب");
    }
  });

  // تسجيل الدخول
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const whatsapp = document.getElementById("loginWhatsapp").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "فشل تسجيل الدخول");
        return;
      }
      setAuth(data.token, data.user);
      fetchMyAds();
      const myAdsSection = document.getElementById("myAdsSection");
      if (myAdsSection) myAdsSection.scrollIntoView({ behavior: "smooth" });
      alert("تم تسجيل الدخول");
    } catch (err) {
      console.error(err);
      alert("خطأ أثناء تسجيل الدخول");
    }
  });

  // إلغاء التعديل
  document.getElementById("adCancelEditBtn").addEventListener("click", () => {
    resetAdForm();
  });

  // حفظ / نشر إعلان
  document.getElementById("adForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!authToken) {
      alert("يجب تسجيل الدخول قبل نشر أو تعديل إعلان.");
      return;
    }

    const editingId = document.getElementById("editingAdId").value.trim();
    const title = document.getElementById("title").value.trim();
    const price = Number(document.getElementById("price").value);
    const city = document.getElementById("city").value.trim();
    const category = document.getElementById("category").value.trim();
    const imageUrl = document.getElementById("imageUrl").value.trim();
    const description = document.getElementById("description").value.trim();
    const whatsapp = document.getElementById("whatsapp").value.trim();

    const payload = { title, price, city, category, imageUrl, description, whatsapp };

    try {
      let res;
      if (editingId) {
        // تحديث إعلان
        res = await fetch(`${API_BASE}/ads/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(payload),
        });
      } else {
        // إنشاء جديد
        res = await fetch(`${API_BASE}/ads`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "فشل حفظ الإعلان");
        return;
      }

      resetAdForm();
      fetchMyAds();
      alert(editingId ? "تم حفظ التعديلات" : "تم نشر الإعلان بنجاح");
    } catch (err) {
      console.error(err);
      alert("خطأ أثناء حفظ الإعلان");
    }
  });
});

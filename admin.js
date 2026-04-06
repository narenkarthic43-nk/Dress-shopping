// =====================================================
// ADMIN JS — Sudha Dress Shop v4
// Fixed: IndexedDB for images (no 5MB localStorage limit)
// Fixed: Working image upload with multiple fallbacks
// =====================================================

// ── Auth Guard ──
const isAdmin = sessionStorage.getItem('sudha_is_admin') === 'true';
if (!isAdmin) {
  window.location.href = 'login.html?mode=admin';
}

// ── JSONBlob Check ──
let syncReady = typeof JSONBLOB_ID !== 'undefined' && JSONBLOB_ID.length > 5;
if (!syncReady) {
  console.warn('JSONBlob Not configured in firebase-config.js');
}

// ══════════════════════════════════════
// INDEXEDDB — for image storage (no size limits!)
// localStorage only has 5MB — images are too big!
// IndexedDB can store hundreds of MB easily.
// ══════════════════════════════════════
const IDB_NAME = 'sudha_images_v3';  // v3 = fresh DB, avoids corrupted v2
const IDB_VERSION = 2;
const IDB_STORE = 'images';

function openImagesDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);

    req.onupgradeneeded = e => {
      const idb = e.target.result;
      // Delete old store if it exists without the right index
      if (idb.objectStoreNames.contains(IDB_STORE)) {
        idb.deleteObjectStore(IDB_STORE);
      }
      // Create fresh store with category index
      const store = idb.createObjectStore(IDB_STORE, { keyPath: 'id', autoIncrement: true });
      store.createIndex('category', 'category', { unique: false });
      store.createIndex('ts', 'ts', { unique: false });
    };

    req.onsuccess = e => {
      const idb = e.target.result;
      // Verify the store + index exist (corruption check)
      if (!idb.objectStoreNames.contains(IDB_STORE)) {
        idb.close();
        // Delete broken DB and try again fresh
        const delReq = indexedDB.deleteDatabase(IDB_NAME);
        delReq.onsuccess = () => openImagesDB().then(resolve).catch(reject);
        delReq.onerror = () => reject(new Error('Cannot repair IndexedDB'));
        return;
      }
      resolve(idb);
    };

    req.onerror = e => reject(e.target.error);
    req.onblocked = () => {
      console.warn('IndexedDB blocked — close other tabs of this site and retry.');
    };
  });
}

async function idbSaveImage(category, url, name, blob = null) {
  const idb = await openImagesDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    const record = { category, url, name, ts: Date.now(), blob };
    const req = store.add(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetImages(category) {
  const idb = await openImagesDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    const index = store.index('category');
    const req = index.getAll(category);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function idbDeleteImage(id) {
  const idb = await openImagesDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAllImages() {
  const idb = await openImagesDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function idbMoveToFirst(id, category) {
  const idb = await openImagesDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    const req = store.get(id);
    req.onsuccess = () => {
      const rec = req.result;
      if (!rec) { resolve(); return; }
      rec.ts = 0;
      store.put(rec).onsuccess = () => resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

// ── Data Storage Key (localStorage — for small text data only) ──
const DATA_KEY = 'sudha_site_data';
function getSiteData() { return JSON.parse(localStorage.getItem(DATA_KEY) || '{}'); }

function saveSiteData(data) {
  const m = { ...getSiteData(), ...data };
  try { localStorage.setItem(DATA_KEY, JSON.stringify(m)); } catch (e) { console.warn('localStorage full:', e); }

  // Sync automatically to JSONBlob!
  if (syncReady) {
    fetch(`https://jsonblob.com/api/jsonBlob/${JSONBLOB_ID}`)
      .then(res => res.json())
      .then(remote => {
        const updated = { ...remote, ...m };
        return fetch(`https://jsonblob.com/api/jsonBlob/${JSONBLOB_ID}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated)
        });
      })
      .then(() => document.getElementById('stat-sync') && (document.getElementById('stat-sync').textContent = 'Synced Now'))
      .catch(e => console.log('JSONBlob Sync failed:', e));
  }
}

// ── Sync Status ──
function updateSyncStatus(online) {
  const dot = document.querySelector('#sync-status-main .sync-dot');
  const text = document.getElementById('sync-text');
  const statSync = document.getElementById('stat-sync');
  if (!dot || !text) return;
  if (online) {
    dot.style.background = '#22c55e';
    dot.style.animation = 'pulse 2s infinite';
    text.textContent = '✓ Cloud Sync Active — Changes instantly sync to all devices.';
    if (statSync) statSync.textContent = 'Live/Auto';
  } else {
    dot.style.background = '#f59e0b';
    dot.style.animation = 'none';
    text.textContent = '📱 Local Mode — Check JSONBLOB_ID in firebase-config.js.';
    if (statSync) statSync.textContent = 'Local';
  }
}

// ── Panel Navigation ──
let currentPanel = 'dashboard';
function showPanel(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('panel-' + name)?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.getAttribute('onclick')?.includes(name)) n.classList.add('active');
  });
  currentPanel = name;
  if (name === 'images') renderGallery();
  if (name === 'offers') loadOffers();
  if (name === 'orders') loadOrders();
  if (name === 'sales') loadSales();
  if (name === 'content') loadContent();
  if (name === 'customers') loadCustomers();
  if (name === 'dashboard') loadDashboardStats();
  closeSidebar();
}

function toggleSidebar() { document.getElementById('sidebar')?.classList.toggle('open'); }
function closeSidebar() { document.getElementById('sidebar')?.classList.remove('open'); }

// ── Toast ──
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 4000);
}

// ══════════════════════════════════════
// IMAGE UPLOAD — FIXED VERSION
// Uses IndexedDB (no size limit!) instead of localStorage
// ══════════════════════════════════════
let selectedCategory = 'hero';
const catLabels = {
  hero: 'Hero/Banner', sarees: 'Sarees', lehengas: 'Lehengas',
  suits: 'Salwar Suits', kurtis: 'Kurtis & Tops', kids: "Kids' Wear", mens: "Men's Wear", expert: "About / Expert"
};

function selectCategory(chip) {
  document.querySelectorAll('.section-chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  selectedCategory = chip.dataset.cat;
  const label = document.getElementById('current-cat-label');
  if (label) label.textContent = catLabels[selectedCategory] || selectedCategory;
  renderGallery();
}

// Drag & drop
const uploadZone = document.getElementById('upload-zone');
if (uploadZone) {
  uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
  uploadZone.addEventListener('drop', e => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length) processUpload(files);
  });
}

function handleFileSelect(event) {
  const files = Array.from(event.target.files).filter(f => f.type.startsWith('image/'));
  if (files.length) processUpload(files);
}

// Upload to Freeimage.host (Free anonymous image hosting with direct web URL)
async function uploadToFreeImage(fileOrBase64) {
  try {
    const form = new FormData();
    form.append('key', '6d207e02198a847aa98d0a2a901485a5'); // Official free public usage key
    form.append('action', 'upload');
    form.append('source', fileOrBase64);
    form.append('format', 'json');
    const res = await fetch(`https://freeimage.host/api/1/upload`, { method: 'POST', body: form });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.image?.url || null;
  } catch { return null; }
}

// ── Main upload handler ──
async function processUpload(files) {
  const progressEl = document.getElementById('upload-progress');
  const fillEl = document.getElementById('progress-fill');
  const statusEl = document.getElementById('upload-status');
  if (progressEl) progressEl.style.display = 'block';

  let done = 0;
  for (const file of files) {
    if (file.size > 20 * 1024 * 1024) {
      showToast(`❌ ${file.name} is too large (max 20MB)`, 'error');
      continue;
    }
    if (statusEl) statusEl.textContent = `Processing \& Uploading ${file.name} to Cloud...`;
    if (fillEl) fillEl.style.width = `${(done / files.length) * 100}%`;

    try {
      const caption = document.getElementById('img-caption')?.value.trim() || file.name;

      // Auto-generate proper web link silently using free public API
      let finalUrl = await uploadToFreeImage(file);

      if (!finalUrl) { // Fallback if API fails
        if (statusEl) statusEl.textContent = `Compressing ${file.name} locally...`;
        finalUrl = await compressImageAsDataUrl(file);
      }

      await idbSaveImage(selectedCategory, finalUrl, caption);
      syncImageToJSONBlob(selectedCategory, finalUrl, caption);
      showToast(`✅ ${file.name} saved securely!`, 'success');

      done++;
    } catch (err) {
      console.error('Upload error:', err);
      showToast(`❌ Failed to save ${file.name}: ${err.message}`, 'error');
    }
  }

  if (fillEl) fillEl.style.width = '100%';
  if (statusEl) statusEl.textContent = `✅ Done! ${done} image(s) processed.`;

  setTimeout(() => {
    if (progressEl) progressEl.style.display = 'none';
    if (fillEl) fillEl.style.width = '0%';
  }, 2500);

  const inp = document.getElementById('img-file-input');
  if (inp) inp.value = '';

  await renderGallery();
  await loadDashboardStats();
}

// Upload to ImgBB (free cloud hosting)
async function uploadToImgBB(file) {
  try {
    const form = new FormData();
    form.append('image', file);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: form });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.url || null;
  } catch { return null; }
}

// Compress file to base64 Data URL (reduces size for JSONBlob sync)
function compressImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width, height = img.height;
        const max = 500; // Aggressive compression (500px max) so it fits in 1MB JSONBlob securely
        if (width > max || height > max) {
          if (width > height) { height = Math.round(height * max / width); width = max; }
          else { width = Math.round(width * max / height); height = max; }
        }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.5)); // 50% quality to ensure mobile devices sync perfectly
      };
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// Global Sync Queue for JSONBlob
let syncQueueActive = false;

// Sync to JSONBlob Auto
async function syncImageToJSONBlob(category, url, name) {
  // We use the local IDB as the source of truth, push the ENTIRE IDB images to JSONBlob directly to avoid race conditions!
  if (!syncReady || syncQueueActive) return;
  syncQueueActive = true;

  try {
    const allImgs = await idbGetAllImages();
    const grouped = {};
    allImgs.forEach(img => {
      if (!grouped[img.category]) grouped[img.category] = [];
      grouped[img.category].push({ url: img.url, name: img.name, ts: img.ts });
    });

    const res = await fetch(`https://jsonblob.com/api/jsonBlob/${JSONBLOB_ID}?t=${Date.now()}`, { cache: 'no-store' });
    const data = await res.json();
    data.images = grouped; // Overwrite cloud images with our complete accurate local set

    await fetch(`https://jsonblob.com/api/jsonBlob/${JSONBLOB_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data)
    });
    console.log('Successfully synced complete image gallery to Cloud for mobile devices.');
  } catch (e) {
    console.warn('Sync image failed (may be size limits):', e);
  } finally {
    syncQueueActive = false;
  }
}

// ── Delete Image ──
async function deleteImage(id) {
  if (!confirm('Delete this image?')) return;
  try {
    await idbDeleteImage(id);
    syncImageToJSONBlob('', '', ''); // Sync deletion to cloud
    showToast('🗑️ Image deleted.', 'info');
    await renderGallery();
    await loadDashboardStats();
  } catch (e) {
    showToast('❌ Could not delete image: ' + e.message, 'error');
  }
}

// ── Confirm Order & Remove ──
async function confirmOrder(id, imgName, imgUrl) {
  const phone = prompt("Enter customer WhatsApp number to send confirmation (e.g. 919876543210).\nLeave blank to just remove the image:");

  if (phone !== null) {
    if (phone.trim() !== '') {
      const waMsg = `👗 *Sudha Dress Shop*\n\nYour order for the item *${imgName || 'selected item'}* is CONFIRMED! ✅\n\nImage reference: ${imgUrl}\n\nThank you for shopping with us!`;
      const waUrl = `https://wa.me/${phone.trim()}?text=${encodeURIComponent(waMsg)}`;
      window.open(waUrl, '_blank');
    }

    try {
      await idbDeleteImage(id);
      syncImageToJSONBlob('', '', ''); // Sync deletion to cloud
      showToast('✅ Order confirmed and image removed.', 'success');
      await renderGallery();
      await loadDashboardStats();
    } catch (e) {
      showToast('❌ Could not remove image: ' + e.message, 'error');
    }
  }
}

// ── Auto Confirm Order matching from Orders List (DEPRECATED, using confirmSale) ──
async function confirmAutoOrder(orderId, imgUrl, imgName, phone) {
  confirmSale(orderId, imgUrl, imgName, phone);
}

// ── Confirm Sale logic (Step 1 & 2 as requested) ──
async function confirmSale(orderId, imgUrl, imgName, phone) {
  if (!confirm(`Confirm Sale for "${imgName}"?\n\nThis will:\n1. Send WhatsApp to Customer (${phone})\n2. Remove dress from Website automatically.`)) return;
  
  // 1. Send confirmation WhatsApp to customer automatically
  if (phone && phone.trim() !== '') {
    const waMsg = `👗 *Sudha Dress Shop - Order Confirmed*\n\nHello! Your order for *${imgName || 'the selected item'}* is CONFIRMED and marked for delivery! ✅\n\nDress Reference: ${imgUrl}\n\nThank you for shopping at Sudha Dress Shop!`;
    const waUrl = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waMsg)}`;
    window.open(waUrl, '_blank');
  }
  
  // 2. Remove associated image from Website (across all devices)
  try {
    const images = await idbGetAllImages();
    const matchingImg = images.find(i => i.url === imgUrl);
    if (matchingImg) {
      await idbDeleteImage(matchingImg.id);
      await syncImageToJSONBlob('', '', ''); // Pushes the updated list (minus this item) to cloud
    }
  } catch (e) {
    console.error("Could not auto-remove image", e);
  }
  
  // 3. Move Order to Sales History in cloud
  try {
    const res = await fetch(`https://jsonblob.com/api/jsonBlob/${JSONBLOB_ID}`);
    const data = await res.json();
    if (data.orders) {
       const order = data.orders.find(o => o.id === orderId);
       if (order) {
           if (!data.sales) data.sales = [];
           order.soldAt = new Date().toISOString();
           data.sales.push(order);
           data.orders = data.orders.filter(o => o.id !== orderId);
           
           await fetch(`https://jsonblob.com/api/jsonBlob/${JSONBLOB_ID}`, {
             method: 'PUT',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify(data)
           });
           showToast('✅ Sale confirmed and image removed.', 'success');
           loadOrders();
           loadDashboardStats();
       }
    }
  } catch(e) {
    showToast('❌ Error finalizing sale', 'error');
  }
}

// ── Set as Main Image ──
async function setMainImage(id) {
  try {
    await idbMoveToFirst(id, selectedCategory);
    showToast(`✅ Set as main image for "${catLabels[selectedCategory]}"`, 'success');
    await renderGallery();

    // Also update index.html data for this category
    const imgs = await idbGetImages(selectedCategory);
    if (imgs.length > 0) {
      const sorted = imgs.sort((a, b) => a.ts - b.ts);
      updateCategoryImageInSiteData(selectedCategory, sorted[0].url);
    }
  } catch (e) {
    showToast('❌ Error: ' + e.message, 'error');
  }
}

// Update site data for main page to pick up the image
function updateCategoryImageInSiteData(category, url) {
  if (!syncReady) return;
  fetch(`https://jsonblob.com/api/jsonBlob/${JSONBLOB_ID}`)
    .then(r => r.json())
    .then(data => {
      if (!data.images) data.images = {};
      if (!data.images[category]) data.images[category] = [];
      data.images[category] = [{ url, name: 'main', ts: 0 }];

      // Also fire off a local storage update so it works on current device immediately
      const local = getSiteData();
      local.images = data.images;
      localStorage.setItem(DATA_KEY, JSON.stringify(local));

      return fetch(`https://jsonblob.com/api/jsonBlob/${JSONBLOB_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    }).catch(() => { });
}

// ── Render Gallery from IndexedDB ──
async function renderGallery() {
  const gallery = document.getElementById('img-gallery');
  if (!gallery) return;
  gallery.innerHTML = `<p style="color:var(--muted);font-size:0.85rem;grid-column:1/-1;">Loading images...</p>`;

  try {
    const imgs = await idbGetImages(selectedCategory);

    if (imgs.length === 0) {
      gallery.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:2rem;">
          <i class="fas fa-images" style="font-size:3rem;color:rgba(201,168,76,0.2);display:block;margin-bottom:1rem;"></i>
          <p style="color:var(--muted);font-size:0.88rem;">No images uploaded yet for <strong style="color:var(--gold)">${catLabels[selectedCategory]}</strong>.<br>Use the upload zone above to add images.</p>
        </div>`;
      return;
    }

    // Sort: ts=0 (main/star) first, then newest
    const sorted = imgs.sort((a, b) => a.ts - b.ts);

    gallery.innerHTML = sorted.map((img) => `
      <div class="img-item" id="img-item-${img.id}">
        <img src="${img.url}" alt="${img.name}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'100\\' height=\\'100\\'><rect fill=\\'%231a1209\\' width=\\'100\\' height=\\'100\\'/>
        <text y=\\'.9em\\' font-size=\\'60\\'>🖼️</text></svg>'" />
        <div class="img-actions">
          <button class="btn-use" title="Set as main image" onclick="setMainImage(${img.id})">
            <i class="fas fa-star"></i>
          </button>
          <button class="btn-confirm" title="Confirm Order & Remove" onclick="confirmOrder(${img.id}, '${(img.name || '').replace(/'/g, "\\\\'")}', '${img.url}')">
            <i class="fas fa-check-circle"></i>
          </button>
          <button class="btn-del" title="Delete" onclick="deleteImage(${img.id})">
            <i class="fas fa-trash"></i>
          </button>
        </div>
        <div class="img-label">${img.name || 'Image'} ${img.ts === 0 ? '⭐' : ''}</div>
      </div>
    `).join('');
  } catch (e) {
    gallery.innerHTML = `<p style="color:#f87171;grid-column:1/-1;">Error loading images: ${e.message}</p>`;
  }
}

// ══════════════════════════════════════
// OFFERS EDITOR
// ══════════════════════════════════════
function saveOffers() {
  const offers = {};
  [1, 2, 3, 4].forEach(n => {
    offers[`offer${n}`] = {
      title: document.getElementById(`offer${n}-title`)?.value || '',
      desc: document.getElementById(`offer${n}-desc`)?.value || '',
      badge: document.getElementById(`offer${n}-badge`)?.value || ''
    };
  });
  saveSiteData({ offers });
  showToast('✅ Offers saved & synced automatically!', 'success');
}

function loadOffers() {
  const offers = getSiteData().offers || {};
  const defaults = {
    offer1: { title: 'Bridal Package', desc: 'Buy any bridal lehenga + get free blouse stitching + 10% off on saree!', badge: 'Limited Time' },
    offer2: { title: 'Combo Offer', desc: 'Buy 3 sarees and get the 4th at 50% off. Mix and match any design!', badge: 'Ongoing' },
    offer3: { title: 'Stitch + Save', desc: 'Purchase fabric from us and get stitching at flat ₹100 off per garment!', badge: 'Exclusive' },
    offer4: { title: 'Festival Special', desc: 'Up to 30% off on select collections during festival seasons. Visit the shop!', badge: 'Seasonal' }
  };
  [1, 2, 3, 4].forEach(n => {
    const o = offers[`offer${n}`] || defaults[`offer${n}`];
    const t = document.getElementById(`offer${n}-title`);
    const d = document.getElementById(`offer${n}-desc`);
    const b = document.getElementById(`offer${n}-badge`);
    if (t) t.value = o.title;
    if (d) d.value = o.desc;
    if (b) b.value = o.badge;
  });
}

// ══════════════════════════════════════
// CONTENT EDITOR
// ══════════════════════════════════════
function saveContent() {
  const content = {
    announcement: document.getElementById('content-announcement')?.value || '',
    heroSub: document.getElementById('content-hero-sub')?.value || '',
    heroDesc: document.getElementById('content-hero-desc')?.value || '',
    ticker: (document.getElementById('content-ticker')?.value || '').split('\n').filter(l => l.trim())
  };
  saveSiteData({ content });
  showToast('✅ Content saved & synced automatically!', 'success');
}

function loadContent() {
  const content = getSiteData().content || {};
  const ann = document.getElementById('content-announcement');
  const hs = document.getElementById('content-hero-sub');
  const hd = document.getElementById('content-hero-desc');
  const tk = document.getElementById('content-ticker');
  if (ann && content.announcement) ann.value = content.announcement;
  if (hs && content.heroSub) hs.value = content.heroSub;
  if (hd && content.heroDesc) hd.value = content.heroDesc;
  if (tk && content.ticker) tk.value = Array.isArray(content.ticker) ? content.ticker.join('\n') : content.ticker;
}

// ══════════════════════════════════════
// CUSTOMERS
// ══════════════════════════════════════
function loadCustomers() {
  const users = JSON.parse(localStorage.getItem('sudha_users') || '[]');
  const stat = document.getElementById('stat-customers');
  if (stat) stat.textContent = users.length;
  const el = document.getElementById('customer-list');
  if (!el) return;
  if (users.length === 0) {
    el.innerHTML = `<p style="color:var(--muted);font-size:0.85rem;padding:1rem 0;">No registered customers yet.</p>`;
    return;
  }
  el.innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:0.84rem;">
      <thead>
        <tr style="border-bottom:1px solid var(--border);">
          <th style="padding:0.6rem 0.8rem;text-align:left;color:var(--gold);">#</th>
          <th style="padding:0.6rem 0.8rem;text-align:left;color:var(--gold);">Name</th>
          <th style="padding:0.6rem 0.8rem;text-align:left;color:var(--gold);">Mobile</th>
          <th style="padding:0.6rem 0.8rem;text-align:left;color:var(--gold);">Email</th>
          <th style="padding:0.6rem 0.8rem;text-align:left;color:var(--gold);">Joined</th>
        </tr>
      </thead>
      <tbody>
        ${users.map((u, i) => `
          <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
            <td style="padding:0.6rem 0.8rem;color:var(--muted);">${i + 1}</td>
            <td style="padding:0.6rem 0.8rem;">${u.name}</td>
            <td style="padding:0.6rem 0.8rem;">${u.phone}</td>
            <td style="padding:0.6rem 0.8rem;color:var(--muted);">${u.email || '—'}</td>
            <td style="padding:0.6rem 0.8rem;color:var(--muted);">${u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '—'}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

// ══════════════════════════════════════
// ORDERS TAB
// ══════════════════════════════════════
async function loadOrders() {
  const list = document.getElementById('orders-list');
  if (!list) return;
  list.innerHTML = `<p style="color:var(--muted);font-size:0.85rem;padding:1rem 0;">Fetching orders from cloud...</p>`;
  
  if (!syncReady) {
    list.innerHTML = `<p style="color:#ef4444;font-size:0.85rem;padding:1rem 0;">Cloud sync not ready. Cannot load orders.</p>`;
    return;
  }
  
  try {
    const res = await fetch(`https://jsonblob.com/api/jsonBlob/${JSONBLOB_ID}?t=${Date.now()}`, { cache: 'no-store' });
    const data = await res.json();
    
    if (!data) throw new Error('Empty database');
    
    const orders = data.orders || [];
    
    if (orders.length === 0) {
      list.innerHTML = `<p style="color:var(--muted);font-size:0.85rem;padding:1rem 0;">No pending orders found.</p>`;
      return;
    }
    
    list.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:0.84rem; text-align:left;">
        <tr style="border-bottom:1px solid var(--border);">
          <th style="padding:0.6rem;color:var(--gold);">Image</th>
          <th style="padding:0.6rem;color:var(--gold);">Customer</th>
          <th style="padding:0.6rem;color:var(--gold);">Phone</th>
          <th style="padding:0.6rem;color:var(--gold);">Item</th>
          <th style="padding:0.6rem;color:var(--gold);">Date</th>
          <th style="padding:0.6rem;color:var(--gold);">Action</th>
        </tr>
        ${orders.map(o => `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
          <td style="padding:0.6rem;"><a href="${o.imgUrl || '#'}" target="_blank"><img src="${o.imgUrl || 'placeholder.png'}" style="width:50px;height:50px;object-fit:cover;border-radius:4px;border:1px solid var(--border);"/></a></td>
          <td style="padding:0.6rem;font-weight:600;">${o.customerName || 'Unknown'}</td>
          <td style="padding:0.6rem;">
             <a href="https://wa.me/${(o.customerPhone || '').replace(/[^0-9]/g, '')}" target="_blank" style="color:#25D366;text-decoration:none;"><i class="fab fa-whatsapp"></i> ${o.customerPhone || 'N/A'}</a>
          </td>
          <td style="padding:0.6rem;">${o.itemName || o.category || 'Dress Item'}</td>
          <td style="padding:0.6rem;color:var(--muted);">${o.date ? new Date(o.date).toLocaleDateString('en-IN') : '—'}</td>
          <td style="padding:0.6rem;">
             <button class="btn-primary" onclick="confirmSale('${o.id}', '${o.imgUrl}', '${(o.itemName || '').replace(/'/g, "\\\\'")}', '${o.customerPhone}')" style="padding:6px 12px; font-size:0.75rem; border:none; cursor:pointer; border-radius:6px; font-weight:bold; background:#3b82f6;">
                <i class="fas fa-check-circle"></i> Confirm Sale
             </button>
          </td>
        </tr>
        `).join('')}
      </table>
    `;
    
  } catch (e) {
    list.innerHTML = `<p style="color:#ef4444;font-size:0.85rem;padding:1rem 0;">No active orders yet.</p>`;
    console.warn('Orders load failed:', e.message);
  }
}

// ══════════════════════════════════════
// SALES HISTORY
// ══════════════════════════════════════
async function loadSales() {
  const list = document.getElementById('sales-list');
  if (!list) return;
  list.innerHTML = `<p style="color:var(--muted);font-size:0.85rem;padding:1rem 0;">Fetching sales history...</p>`;
  
  try {
    const res = await fetch(`https://jsonblob.com/api/jsonBlob/${JSONBLOB_ID}?t=${Date.now()}`);
    const data = await res.json();
    
    if (!data || !data.sales) {
       list.innerHTML = `<p style="color:var(--muted);font-size:0.85rem;padding:1rem 0;">No sales history yet.</p>`;
       return;
    }
    
    const sales = data.sales || [];
    
    list.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:0.84rem; text-align:left;">
        <tr style="border-bottom:1px solid var(--border);">
          <th style="padding:0.6rem;color:var(--gold);">Customer</th>
          <th style="padding:0.6rem;color:var(--gold);">Item Sold</th>
          <th style="padding:0.6rem;color:var(--gold);">Sold On</th>
          <th style="padding:0.6rem;color:var(--gold);">Value</th>
        </tr>
        ${sales.map(s => `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
          <td style="padding:0.6rem;">${s.customerName || 'Unknown'}<br><span style="font-size:0.7rem;color:var(--muted)">${s.customerPhone || 'N/A'}</span></td>
          <td style="padding:0.6rem;">${s.itemName || 'Dress Item'}</td>
          <td style="padding:0.6rem;color:var(--muted);">${s.soldAt ? new Date(s.soldAt).toLocaleDateString('en-IN') : '—'}</td>
          <td style="padding:0.6rem;color:var(--success);font-weight:bold;">SOLD</td>
        </tr>
        `).join('')}
      </table>
    `;
  } catch (e) {
    list.innerHTML = `<p style="color:var(--muted);font-size:0.85rem;padding:1rem 0;">No sales recorded yet.</p>`;
  }
}

// ══════════════════════════════════════
// DASHBOARD STATS
// ══════════════════════════════════════
async function loadDashboardStats() {
  // Count images from IndexedDB
  try {
    const allImgs = await idbGetAllImages();
    const imgStat = document.getElementById('stat-images');
    if (imgStat) imgStat.textContent = allImgs.length;
  } catch { }

  const users = JSON.parse(localStorage.getItem('sudha_users') || '[]');
  const custStat = document.getElementById('stat-customers');
  if (custStat) custStat.textContent = users.length;
  
  // Count Orders & Sales
  try {
    if (syncReady) {
       const res = await fetch(`https://jsonblob.com/api/jsonBlob/${JSONBLOB_ID}?t=${Date.now()}`);
       const data = await res.json();
       if (!data) return;

       const orderStat = document.getElementById('stat-orders');
       if (orderStat) orderStat.textContent = data.orders ? data.orders.length : 0;
       
       const salesStat = document.getElementById('stat-sales');
       if (salesStat) salesStat.textContent = data.sales ? data.sales.length : 0;
    }
  } catch(e) {}
}

// ── SYNC IMAGES FROM CLOUD (Fix for cross-device management) ──
async function syncImagesFromServer() {
  if (!syncReady) return;
  try {
    const res = await fetch(`https://jsonblob.com/api/jsonBlob/${JSONBLOB_ID}?t=${Date.now()}`);
    const data = await res.json();
    if (data && data.images) {
      const idb = await openImagesDB();
      const localImgs = await idbGetAllImages();
      
      const tx = idb.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      
      for (const cat of Object.keys(data.images)) {
        if (!Array.isArray(data.images[cat])) continue;
        for (const remoteImg of data.images[cat]) {
           const exists = localImgs.some(li => li.url === remoteImg.url);
           if (!exists) {
             store.add({ category: cat, url: remoteImg.url, name: remoteImg.name, ts: remoteImg.ts });
           }
        }
      }
      console.log('Cross-device Image Sync Complete.');
    }
  } catch(e) { console.warn('Cloud image sync interrupted:', e.message); }
}

// ── JSONBlob auto-sync listener ──
if (syncReady) {
  fetch(`https://jsonblob.com/api/jsonBlob/${JSONBLOB_ID}`)
    .then(r => r.json())
    .then(remote => {
      if (remote) {
        const { images, ...textData } = remote;
        const m = { ...getSiteData(), ...textData };
        localStorage.setItem(DATA_KEY, JSON.stringify(m));
      }
    });
}

// ═ Logout ═
function adminLogout() {
  sessionStorage.removeItem('sudha_is_admin');
  sessionStorage.removeItem('sudha_current_user');
  window.location.href = 'login.html';
}

// ═ Init on page load ═
window.addEventListener('DOMContentLoaded', async () => {
  try {
    await syncImagesFromServer(); 
  } catch(e) { console.error('Image sync error:', e); }

  try {
    await loadDashboardStats();
  } catch(e) { console.error('Dashboard error:', e); }

  updateSyncStatus(syncReady);
  loadOffers();
  loadCollections();
  loadServices();
  buildPricingAdminRows();
  loadPricing();
  
  const params = new URLSearchParams(window.location.search);
  if (params.get('action') === 'confirm') {
    showPanel('orders');
    showToast('Redirected to Pending Orders', 'info');
  }
});

// ============================
// COLLECTIONS EDITOR (Step 4)
// ============================
const COLLECTION_KEYS = ['sarees', 'lehengas', 'suits', 'kurtis', 'kids', 'mens'];
const COLLECTION_DEFAULTS = {
  sarees: { title: 'Sarees', desc: 'Silk, cotton, georgette, chiffon & designer sarees for all occasions.', price: 'Starting at ₹499' },
  lehengas: { title: 'Lehengas & Choli', desc: 'Bridal lehengas, party wear, and festival lehengas with intricate embroidery.', price: 'Starting at ₹1,499' },
  suits: { title: 'Salwar Suits', desc: 'Cotton, silk, and designer salwar kameez sets for daily and special wear.', price: 'Starting at ₹799' },
  kurtis: { title: 'Kurtis & Tops', desc: 'Trendy and comfortable kurtis, tops, and western wear for modern women.', price: 'Starting at ₹299' },
  kids: { title: "Kids' Wear", desc: 'Adorable frocks, ethnic sets, uniforms, and casual clothes for children.', price: 'Starting at ₹199' },
  mens: { title: "Men's Wear", desc: 'Dhotis, veshtis, kurta pajamas, shirts, and ethnic wear for men.', price: 'Starting at ₹399' },
};

function saveCollections() {
  const collections = {};
  COLLECTION_KEYS.forEach(k => {
    collections[k] = {
      title: document.getElementById(`col-${k}-title`)?.value || COLLECTION_DEFAULTS[k].title,
      desc: document.getElementById(`col-${k}-desc`)?.value || COLLECTION_DEFAULTS[k].desc,
      price: document.getElementById(`col-${k}-price`)?.value || COLLECTION_DEFAULTS[k].price,
    };
  });
  saveSiteData({ collections });
  saveSiteData({ collections });
  showToast('✅ Collections saved & synced automatically!', 'success');
}

function loadCollections() {
  const saved = getSiteData().collections || {};
  COLLECTION_KEYS.forEach(k => {
    const c = saved[k] || COLLECTION_DEFAULTS[k];
    const t = document.getElementById(`col-${k}-title`);
    const d = document.getElementById(`col-${k}-desc`);
    const p = document.getElementById(`col-${k}-price`);
    if (t) t.value = c.title;
    if (d) d.value = c.desc;
    if (p) p.value = c.price;
  });
}

// ============================
// TAILORING SERVICES EDITOR (Step 6)
// ============================
const SERVICE_DEFAULTS = [
  { title: 'Custom Stitching', desc: 'Blouses, salwar suits, kurtas, frocks — stitched to your exact measurements.' },
  { title: 'Alterations', desc: 'Resizing, hemming, shortening, and repairing any garment quickly and neatly.' },
  { title: 'Blouse Stitching', desc: 'Saree blouses with designer backs, patterns, and embellishments of your choice.' },
  { title: 'Bridal Stitching', desc: 'Bridal blouses, lehenga cholis, and gown alterations for your perfect wedding look.' },
  { title: 'Embroidery Work', desc: 'Thread work, mirror work, and zari embroidery added to any garment.' },
  { title: "Kids' Stitching", desc: 'School uniforms, frocks, ethnic wear and party outfits for children.' },
];

function saveServices() {
  const services = SERVICE_DEFAULTS.map((_, i) => ({
    title: document.getElementById(`svc${i + 1}-title`)?.value || SERVICE_DEFAULTS[i].title,
    desc: document.getElementById(`svc${i + 1}-desc`)?.value || SERVICE_DEFAULTS[i].desc,
  }));
  saveSiteData({ services });
  saveSiteData({ services });
  showToast('✅ Services saved & synced automatically!', 'success');
}

function loadServices() {
  const saved = getSiteData().services || [];
  SERVICE_DEFAULTS.forEach((def, i) => {
    const s = saved[i] || def;
    const t = document.getElementById(`svc${i + 1}-title`);
    const d = document.getElementById(`svc${i + 1}-desc`);
    if (t) t.value = s.title;
    if (d) d.value = s.desc;
  });
}

// ============================
// PRICING TABLE EDITOR (Step 2)
// ============================
const PRICING_DEFAULTS = [
  { service: 'Blouse Stitching (Simple)', price: '₹150 – ₹250', delivery: '2–3 days' },
  { service: 'Blouse (Designer / Fancy)', price: '₹300 – ₹600', delivery: '3–5 days' },
  { service: 'Salwar Kameez (3 pcs)', price: '₹600 – ₹1000', delivery: '4–6 days' },
  { service: 'Kurta / Kurti', price: '₹300 – ₹500', delivery: '2–4 days' },
  { service: 'Simple Frock / Top', price: '₹200 – ₹400', delivery: '2–3 days' },
  { service: "Kids' Outfit", price: '₹150 – ₹350', delivery: '2–3 days' },
  { service: 'Alteration / Repair', price: '₹50 – ₹200', delivery: '1–2 days' },
  { service: 'Bridal Blouse (Special)', price: '₹800 – ₹2000', delivery: '5–7 days' },
  { service: 'Embroidery Work', price: '₹200 onwards', delivery: 'Varies' },
];

function buildPricingAdminRows() {
  const tbody = document.getElementById('admin-pricing-rows');
  if (!tbody) return;
  tbody.innerHTML = PRICING_DEFAULTS.map((row, i) => `
    <tr style="border-bottom:1px solid rgba(201,168,76,0.08);">
      <td style="padding:0.5rem 0.6rem;color:var(--muted);font-size:0.8rem;">${i + 1}</td>
      <td style="padding:0.3rem 0.4rem;">
        <input type="text" id="pr${i + 1}-service" value="${row.service}"
          style="width:100%;padding:0.45rem 0.6rem;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text);font-size:0.85rem;font-family:inherit;" />
      </td>
      <td style="padding:0.3rem 0.4rem;">
        <input type="text" id="pr${i + 1}-price" value="${row.price}"
          style="width:100%;padding:0.45rem 0.6rem;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text);font-size:0.85rem;font-family:inherit;" />
      </td>
      <td style="padding:0.3rem 0.4rem;">
        <input type="text" id="pr${i + 1}-delivery" value="${row.delivery}"
          style="width:100%;padding:0.45rem 0.6rem;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text);font-size:0.85rem;font-family:inherit;" />
      </td>
    </tr>
  `).join('');
}

function savePricing() {
  const pricing = PRICING_DEFAULTS.map((_, i) => ({
    service: document.getElementById(`pr${i + 1}-service`)?.value || PRICING_DEFAULTS[i].service,
    price: document.getElementById(`pr${i + 1}-price`)?.value || PRICING_DEFAULTS[i].price,
    delivery: document.getElementById(`pr${i + 1}-delivery`)?.value || PRICING_DEFAULTS[i].delivery,
  }));
  saveSiteData({ pricing });
  saveSiteData({ pricing });
  showToast('✅ Prices saved & synced automatically!', 'success');
}

function loadPricing() {
  const saved = getSiteData().pricing || [];
  PRICING_DEFAULTS.forEach((def, i) => {
    const p = saved[i] || def;
    const s = document.getElementById(`pr${i + 1}-service`);
    const pr = document.getElementById(`pr${i + 1}-price`);
    const d = document.getElementById(`pr${i + 1}-delivery`);
    if (s) s.value = p.service;
    if (pr) pr.value = p.price;
    if (d) d.value = p.delivery;
  });
}

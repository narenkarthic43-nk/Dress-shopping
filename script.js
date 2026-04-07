// ============================
// MAIN SCRIPT — Sudha Dress Shop
// ============================

// ── Navbar ──
const navbar = document.getElementById('navbar');
const scrollTopBtn = document.getElementById('scrollTopBtn');

window.addEventListener('scroll', () => {
  const y = window.scrollY;
  if (navbar) navbar.classList.toggle('scrolled', y > 60);
  if (scrollTopBtn) scrollTopBtn.classList.toggle('visible', y > 400);
});

// ── Hamburger ──
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('nav-links');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('open');


    const s = hamburger.querySelectorAll('span');
    const open = navLinks.classList.contains('open');
    s[0].style.transform = open ? 'rotate(45deg) translate(5px,5px)' : '';
    s[1].style.opacity = open ? '0' : '1';
    s[2].style.transform = open ? 'rotate(-45deg) translate(5px,-5px)' : '';
  });
  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    navLinks.classList.remove('open');
    hamburger.querySelectorAll('span').forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
  }));
}

// ── Scroll Reveal ──
const reveals = document.querySelectorAll('.reveal');
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); revealObs.unobserve(e.target); } });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
reveals.forEach(el => revealObs.observe(el));

// ── Stat Counters ──
const statNums = document.querySelectorAll('.stat-num');
let counted = false;
function runCounters() {
  statNums.forEach(el => {
    const raw = el.textContent;
    const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
    const suffix = raw.replace(/[\d.]/g, '');
    if (!num) return;
    let cur = 0;
    const step = num / 80;
    const t = setInterval(() => {
      cur = Math.min(cur + step, num);
      el.textContent = (Number.isInteger(num) ? Math.floor(cur) : cur.toFixed(0)) + suffix;
      if (cur >= num) clearInterval(t);
    }, 16);
  });
}
const heroEl = document.querySelector('.hero');
if (heroEl) {
  new IntersectionObserver((e) => {
    if (e[0].isIntersecting && !counted) { counted = true; runCounters(); }
  }, { threshold: 0.3 }).observe(heroEl);
}

// ── Active Nav Link ──
const sections = document.querySelectorAll('section[id]');
const navAnchors = document.querySelectorAll('.nav-links a');
window.addEventListener('scroll', () => {
  const pos = window.scrollY + 120;
  sections.forEach(sec => {
    if (pos >= sec.offsetTop && pos < sec.offsetTop + sec.offsetHeight) {
      navAnchors.forEach(a => { a.style.color = ''; a.style.background = ''; });
      const active = document.querySelector(`.nav-links a[href="#${sec.id}"]`);
      if (active) { active.style.color = 'var(--gold)'; active.style.background = 'rgba(201,168,76,0.1)'; }
    }
  });
});

// ── Contact Form ──
function handleFormSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-submit-form');
  const success = document.getElementById('form-success');
  if (!btn) return;

  // ── Collect form data ──
  const name = (document.getElementById('cname')?.value || '').trim();
  const phone = (document.getElementById('cphone')?.value || '').trim();
  const service = document.getElementById('cservice')?.value || '';
  const message = (document.getElementById('cmessage')?.value || '').trim();

  // Build a nice WhatsApp message
  let waMsg = `👗 *Sudha Dress Shop Enquiry*\n\n`;
  waMsg += `*Name:* ${name}\n`;
  waMsg += `*Phone:* ${phone}\n`;
  if (service) waMsg += `*Enquiry For:* ${service}\n`;
  if (message) waMsg += `*Message:* ${message}\n`;
  waMsg += `\n_Sent from sudhashop.com_`;

  const waUrl = `https://wa.me/919442261828?text=${encodeURIComponent(waMsg)}`;

  btn.innerHTML = '<i class="fab fa-whatsapp"></i> Opening WhatsApp...';
  btn.disabled = true;

  if (success) {
    success.classList.add('show');
    setTimeout(() => success.classList.remove('show'), 6000);
  }

  // Open WhatsApp after brief delay (so user sees the confirmation)
  setTimeout(() => {
    window.open(waUrl, '_blank');
    e.target.reset();
    btn.innerHTML = '<i class="fab fa-whatsapp"></i> Send via WhatsApp';
    btn.disabled = false;
  }, 800);
}

// ── User / Admin Logout from Front-end ──
function userLogoutFront() {
  sessionStorage.removeItem('sudha_current_user');
  sessionStorage.removeItem('sudha_is_admin');
  location.reload();
}
function adminLogoutFront() {
  sessionStorage.removeItem('sudha_is_admin');
  location.reload();
}


// ── Scroll Top ──
function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

// ── Card Tilt ──
document.querySelectorAll('.tailor-card, .offer-card, .collection-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `translateY(-8px) rotateY(${x * 5}deg) rotateX(${-y * 5}deg)`;
  });
  card.addEventListener('mouseleave', () => { card.style.transform = ''; });
});

// ============================
// DYNAMIC CONTENT LOADER
// Loads admin-saved content from localStorage / Firebase
// ============================

const DATA_KEY = 'sudha_site_data';
function getSiteData() { return JSON.parse(localStorage.getItem(DATA_KEY) || '{}'); }

function applyDynamicContent(data) {
  if (!data) return;

  // ── Offers ──
  const offers = data.offers;
  if (offers) {
    [1, 2, 3, 4].forEach(n => {
      const o = offers[`offer${n}`];
      if (!o) return;
      const t = document.getElementById(`dyn-offer${n}-title`);
      const d = document.getElementById(`dyn-offer${n}-desc`);
      const b = document.getElementById(`dyn-offer${n}-badge`);
      if (t) t.textContent = o.title;
      if (d) d.textContent = o.desc;
      if (b) b.textContent = o.badge;
    });
  }

  // ── Collections Text (Step 4 — owner editable) ──
  const collections = data.collections;
  if (collections) {
    ['sarees', 'lehengas', 'suits', 'kurtis', 'kids', 'mens'].forEach(k => {
      const c = collections[k];
      if (!c) return;
      const card = document.getElementById(`col-${k}`);
      if (!card) return;
      const titleEl = card.querySelector('h3');
      const descEl = card.querySelector('p');
      const priceEl = card.querySelector('.collection-price');
      if (titleEl && c.title) titleEl.textContent = c.title;
      if (descEl && c.desc) descEl.textContent = c.desc;
      if (priceEl && c.price) priceEl.innerHTML = c.price;
    });
  }

  // ── Tailoring Services (Step 6 — owner editable) ──
  const services = data.services;
  if (Array.isArray(services)) {
    services.forEach((s, i) => {
      const n = i + 1;
      const titleEl = document.getElementById(`dyn-svc${n}-title`);
      const descEl = document.getElementById(`dyn-svc${n}-desc`);
      if (titleEl && s.title) titleEl.textContent = s.title;
      if (descEl && s.desc) descEl.textContent = s.desc;
    });
  }

  // ── Pricing Table (Step 2 — owner editable) ──
  const pricing = data.pricing;
  if (Array.isArray(pricing)) {
    pricing.forEach((p, i) => {
      const n = i + 1;
      const svcEl = document.getElementById(`dyn-price${n}-service`);
      const prEl = document.getElementById(`dyn-price${n}-price`);
      const delEl = document.getElementById(`dyn-price${n}-delivery`);
      if (svcEl && p.service) svcEl.textContent = p.service;
      if (prEl && p.price) prEl.textContent = p.price;
      if (delEl && p.delivery) delEl.textContent = p.delivery;
    });
  }

  // ── Announcement ──
  const content = data.content;
  if (content) {
    const ann = document.querySelector('.announcement-bar span');
    if (ann && content.announcement) ann.textContent = content.announcement;

    const heroSub = document.querySelector('.hero-sub-title');
    if (heroSub && content.heroSub) heroSub.textContent = content.heroSub;

    const heroDesc = document.querySelector('.hero-desc');
    if (heroDesc && content.heroDesc) heroDesc.textContent = content.heroDesc;

    // Ticker
    if (content.ticker && Array.isArray(content.ticker)) {
      const scroller = document.querySelector('.advert-scroll');
      if (scroller) {
        const items = [...content.ticker, ...content.ticker]; // duplicate for seamless scroll
        scroller.innerHTML = items.map(t => `<span>${t}</span>`).join('');
      }
    }
  }
} // end applyDynamicContent


// ── Load images from JSONBlob (Auto Sync) or IndexedDB ──
window.SUDHA_CACHED_IMAGES = null;

function loadImagesFromJSONBlobOrIDB() {
  const imgCatMap = {
    sarees: 'img-sarees', lehengas: 'img-lehengas', suits: 'img-suits',
    kurtis: 'img-kurtis', kids: 'img-kids', mens: 'img-mens'
  };

  const displayImages = (imagesArray) => {
    const byCategory = {};
    imagesArray.forEach(r => {
      if (!byCategory[r.category]) byCategory[r.category] = [];
      byCategory[r.category].push(r);
    });
    Object.entries(byCategory).forEach(([cat, imgs]) => {
      if (!imgs.length) return;
      const sorted = imgs.sort((a, b) => a.ts - b.ts); // ts=0 means 'main' starred image
      const main = sorted[0];
      const elId = imgCatMap[cat];
      if (elId) {
        const el = document.getElementById(elId);
        if (el && main.url) el.src = main.url;
      }
    });
  };

  // Local IDB Fallback Function
  const loadFromIDB = () => {
    try {
      const req = indexedDB.open('sudha_images_v3', 2);
      req.onsuccess = e => {
        const idb = e.target.result;
        if (!idb.objectStoreNames.contains('images')) return;
        const tx = idb.transaction('images', 'readonly');
        tx.objectStore('images').getAll().onsuccess = (ev) => {
          if (ev.target.result) displayImages(ev.target.result);
        };
      };
    } catch (e) { console.error('IDB load failed', e); }
  };

  // 1. Fetch from JSONBlob (Global Sync Source) with cache busting for mobile devices
  if (typeof JSONBLOB_ID !== 'undefined' && JSONBLOB_ID) {
    fetch(`https://jsonblob.com/api/jsonBlob/${JSONBLOB_ID}?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (data && data.images) {
          window.SUDHA_CACHED_IMAGES = data.images;
          let remoteImages = [];
          Object.keys(data.images).forEach(cat => {
            data.images[cat].forEach(img => remoteImages.push({ category: cat, ...img }));
          });

          if (remoteImages.length > 0) {
            displayImages(remoteImages);
          } else {
            loadFromIDB();
          }
        } else {
          loadFromIDB();
        }
      }).catch(e => {
        console.log('Image sync blocked or failed, loading local:', e);
        loadFromIDB();
      });
  } else {
    loadFromIDB();
  }
}
// ── Initialize Google Identity Services (One Tap) ──
function initializeGSI() {
  if (typeof google === 'undefined' || typeof GOOGLE_CLIENT_ID === 'undefined' || GOOGLE_CLIENT_ID.includes('YOUR')) {
    return;
  }
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGSICallback,
    auto_select: true
  });
  google.accounts.id.prompt();
}

async function handleGSICallback(response) {
  try {
    const base64Url = response.credential.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    handleGoogleSuccess(JSON.parse(jsonPayload));
  } catch (err) { console.error('GSI Error:', err); }
}

let pendingGoogleUser = null;
async function handleGoogleSuccess(gUser) {
  const users = JSON.parse(localStorage.getItem('sudha_users') || '[]');
  const existing = users.find(u => u.email === gUser.email);
  if (existing) {
    sessionStorage.setItem('sudha_current_user', JSON.stringify({ name: existing.name, email: existing.email, phone: existing.phone, role: 'customer' }));
    location.reload();
  } else {
    pendingGoogleUser = { name: gUser.displayName || gUser.name, email: gUser.email, photo: gUser.photoURL || gUser.picture };
    const modal = document.getElementById('google-profile-modal');
    if (modal) modal.style.display = 'flex';
  }
}

function saveGooglePhoneNumber() {
  const phone = document.getElementById('google-phone').value.trim();
  if (phone.length < 10) { alert('Please enter a valid WhatsApp number.'); return; }
  if (pendingGoogleUser) {
    const newUser = { ...pendingGoogleUser, phone, createdAt: new Date().toISOString(), password: 'GOOGLE_AUTH' };
    const users = JSON.parse(localStorage.getItem('sudha_users') || '[]');
    users.push(newUser);
    localStorage.setItem('sudha_users', JSON.stringify(users));
    sessionStorage.setItem('sudha_current_user', JSON.stringify({ name: newUser.name, phone: newUser.phone, role: 'customer' }));
    location.reload();
  }
}

// ── Load from localStorage on start ──
window.addEventListener('DOMContentLoaded', () => {
  applyDynamicContent(getSiteData());
  loadImagesFromJSONBlobOrIDB();
  updateUserNavbar();
  initializeGSI();

  // ── JSONBlob auto-sync ──
  if (typeof JSONBLOB_ID !== 'undefined' && JSONBLOB_ID) {
    fetch(`https://jsonblob.com/api/jsonBlob/${JSONBLOB_ID}?t=${Date.now()}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(remoteData => {
        if (remoteData) {
          const { images, ...textData } = remoteData;
          if (Object.keys(textData).length > 0) {
            const merged = { ...getSiteData(), ...textData };
            localStorage.setItem(DATA_KEY, JSON.stringify(merged));
            applyDynamicContent(merged);
          }
        }
      }).catch(e => console.warn('JSONBlob Sync error:', e));
  }
});

function updateUserNavbar() {
  const currentUser = JSON.parse(sessionStorage.getItem('sudha_current_user') || 'null');
  const isAdmin = sessionStorage.getItem('sudha_is_admin') === 'true';

  const adminBar = document.getElementById('admin-bar');
  if (adminBar) adminBar.style.display = isAdmin ? 'block' : 'none';

  const navBtn = document.getElementById('btn-login-nav');
  const navInfo = document.getElementById('nav-user-info');
  const myOrdersBtn = document.getElementById('btn-my-orders');

  if (currentUser) {
    if (navBtn) {
      if (isAdmin) {
        navBtn.innerHTML = `<i class="fas fa-user-check"></i> Admin Panel`;
        navBtn.href = 'admin.html';
        navBtn.onclick = null;
      } else {
        navBtn.innerHTML = `<i class="fas fa-sign-out-alt"></i> Logout`;
        navBtn.href = "#";
        navBtn.onclick = function (e) {
          e.preventDefault();
          userLogoutFront();
        };
        if (myOrdersBtn) myOrdersBtn.style.display = 'inline-block';
      }
    }
    if (navInfo) {
      navInfo.textContent = isAdmin ? '👑 Admin' : `Hi, ${(currentUser.name || '').split(' ')[0]}`;
      navInfo.style.display = 'inline';
    }
  } else {
    if (navBtn) {
      navBtn.innerHTML = `<i class="fas fa-user"></i> Login`;
      navBtn.href = 'login.html';
      navBtn.onclick = null;
    }
    if (navInfo) navInfo.style.display = 'none';
    if (myOrdersBtn) myOrdersBtn.style.display = 'none';
  }
}

// ============================
// GALLERY AND ORDER FUNCTIONS
// ============================

function openGallery(catKey, catName) {
  const modal = document.getElementById('gallery-modal');
  const title = document.getElementById('gallery-title');
  const grid = document.getElementById('gallery-grid');

  if (!modal || !grid) return;

  title.textContent = catName;
  grid.innerHTML = '<p style="text-align:center;width:100%;color:var(--gold);">Loading images...</p>';
  modal.style.display = 'flex';

  const renderImages = (imgs) => {
    if (!imgs || imgs.length === 0) {
      grid.innerHTML = '<p style="text-align:center;width:100%;color:var(--text-muted);">No items currently available in this collection.</p>';
      return;
    }

    const sorted = imgs.sort((a, b) => a.ts - b.ts);
    grid.innerHTML = sorted.map(img => {
      // Create preview link url
      const baseUrl = window.location.href.split('/').slice(0, -1).join('/');
      const previewUrl = `${baseUrl}/preview.html?cat=${encodeURIComponent(catName)}&id=${img.ts}`;

      return `
        <div class="gallery-item">
          <img src="${img.url}" alt="${img.name || catName}" loading="lazy" />
          <div class="gallery-item-info">
             <p>${img.name || catName}</p>
             <button onclick="placeOrderSpecific('${catName}', '${previewUrl}', '${img.url}', '${(img.name || catName).replace(/'/g, "\\\\'")}')" class="btn-primary" style="padding: 8px 16px; font-size: 0.8rem; width: 100%; justify-content: center;">
               <i class="fab fa-whatsapp"></i> Order This
             </button>
          </div>
        </div>
      `;
    }).join('');
  };

  if (window.SUDHA_CACHED_IMAGES && window.SUDHA_CACHED_IMAGES[catKey]) {
    renderImages(window.SUDHA_CACHED_IMAGES[catKey]);
    return;
  }

  // Fallback to IndexedDB
  const IDB_NAME = 'sudha_images_v3';
  const IDB_STORE = 'images';
  try {
    const req = indexedDB.open(IDB_NAME, 2);
    req.onsuccess = e => {
      const idb = e.target.result;
      if (!idb.objectStoreNames.contains(IDB_STORE)) {
        renderImages([]);
        return;
      }
      const tx = idb.transaction(IDB_STORE, 'readonly');
      tx.objectStore(IDB_STORE).index('category').getAll(catKey).onsuccess = (ev) => {
        renderImages(ev.target.result || []);
      };
    };
    req.onerror = () => renderImages([]);
  } catch (e) {
    renderImages([]);
  }
}

function closeGallery() {
  const modal = document.getElementById('gallery-modal');
  if (modal) modal.style.display = 'none';
}

let pendingOrderData = null;

function placeOrderSpecific(category, previewUrl, rawImgUrl, imgName) {
  pendingOrderData = { category, previewUrl, rawImgUrl, imgName };
  
  const currentUser = JSON.parse(sessionStorage.getItem('sudha_current_user') || 'null');
  if (currentUser) {
     const nameEl = document.getElementById('order-name');
     const phoneEl = document.getElementById('order-phone');
     if (nameEl) nameEl.value = currentUser.name || '';
     if (phoneEl) phoneEl.value = currentUser.phone || '';
  }
  
  const modal = document.getElementById('order-modal');
  if (modal) modal.style.display = 'flex';
}

function closeOrderModal() {
  const modal = document.getElementById('order-modal');
  if (modal) modal.style.display = 'none';
}

async function submitOrder() {
  const name = document.getElementById('order-name').value.trim();
  const phone = document.getElementById('order-phone').value.trim();
  
  if (!name || !phone) {
    alert('Please enter your name and WhatsApp number.');
    return;
  }
  
  const btn = document.querySelector('#order-modal .btn-primary');
  const oldText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
  btn.disabled = true;

  const { category, previewUrl, rawImgUrl, imgName } = pendingOrderData;
  
  const order = {
    id: Date.now().toString(),
    customerName: name,
    customerPhone: phone,
    category: category,
    itemName: imgName || category,
    imgUrl: rawImgUrl || previewUrl,
    date: new Date().toISOString()
  };
  
  // Save to JSONBlob
  if (typeof JSONBLOB_ID !== 'undefined' && JSONBLOB_ID) {
    try {
      const res = await fetch(`https://jsonblob.com/api/jsonBlob/${JSONBLOB_ID}`);
      const data = await res.json();
      if (!data.orders) data.orders = [];
      data.orders.push(order);
      
      await fetch(`https://jsonblob.com/api/jsonBlob/${JSONBLOB_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch(e) {
      console.error('Error saving order', e);
    }
  }
  
  const waPhone = '919442261828';
  let imgLink = `\n\n*Product Reference ID:* ${previewUrl}`;
  if (rawImgUrl && rawImgUrl.startsWith('http')) {
    imgLink = `\n\n*Product Image Link:* ${rawImgUrl}`;
  }

  // Generate Admin Dashboard Link for the Owner
  const adminPageBase = window.location.href.split('/').slice(0, -1).join('/') + '/admin.html';
  const adminConfirmLink = `\n\n🔑 *Admin Confirmation Link:* \n${adminPageBase}?action=confirm&orderId=${order.id}`;

  const waMsg = `👗 *Sudha Dress Shop Order*\n\nI would like to place an order for ${imgName || category}.${imgLink}${adminConfirmLink}\n\n_Sent from sudhashop.com by ${name}_`;
  const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(waMsg)}`;
  window.open(waUrl, '_blank');
  
  btn.innerHTML = oldText;
  btn.disabled = false;
  
  closeOrderModal();
  closeGallery();
}

// Close modal on click outside
window.onclick = function (event) {
  const modal = document.getElementById('gallery-modal');
  const orderModal = document.getElementById('order-modal');
  if (event.target == modal) {
    modal.style.display = "none";
  }
  if (orderModal && event.target == orderModal) {
    orderModal.style.display = "none";
  }
  const userOrdersModal = document.getElementById('user-orders-modal');
  if (userOrdersModal && event.target == userOrdersModal) {
    userOrdersModal.style.display = "none";
  }
}

// ══════════════════════════════════════
// CUSTOMER PORTAL (My Orders)
// ══════════════════════════════════════
async function showUserOrders() {
  const modal = document.getElementById('user-orders-modal');
  const list = document.getElementById('user-orders-list');
  const phoneText = document.getElementById('portal-user-phone');
  if (!modal || !list) return;

  modal.style.display = 'flex';
  list.innerHTML = `<p style="text-align:center; padding:3rem; color:#c9a84c;"><i class="fas fa-spinner fa-spin"></i> Linking to Cloud Sync...</p>`;

  const currentUser = JSON.parse(sessionStorage.getItem('sudha_current_user') || 'null');
  if (!currentUser || !currentUser.phone) {
    list.innerHTML = `<div style="text-align:center; padding:2rem;"><i class="fas fa-user-lock" style="font-size:2rem; margin-bottom:1rem; opacity:0.3;"></i><p>Please login to your account to view your history.</p></div>`;
    return;
  }

  const userPhone = currentUser.phone.replace(/[^0-9]/g, '');
  if (phoneText) phoneText.textContent = `Logged in as: ${currentUser.phone}`;

  try {
    const res = await fetch(`https://jsonblob.com/api/jsonBlob/${JSONBLOB_ID}?t=${Date.now()}`);
    const data = await res.json();
    
    // Store data globally for switching tabs
    window.SUDHA_PORTAL_DATA = {
        pending: (data.orders || []).filter(o => (o.customerPhone || '').replace(/[^0-9]/g, '') === userPhone),
        sales: (data.sales || []).filter(o => (o.customerPhone || '').replace(/[^0-9]/g, '') === userPhone)
    };

    // Default to pending tab
    switchPortalTab('pending');

  } catch(e) {
    list.innerHTML = `<p style="color:#f87171; text-align:center;">Cloud connection failed. Please try again.</p>`;
    console.error('Portal load failed:', e);
  }
}

function switchPortalTab(type) {
    const list = document.getElementById('user-orders-list');
    const btnP = document.getElementById('tab-pending');
    const btnS = document.getElementById('tab-sales');
    
    // Styling toggles
    if (btnP && btnS) {
        if (type === 'pending') {
            btnP.style.background = '#c9a84c'; btnP.style.color = '#000';
            btnS.style.background = 'transparent'; btnS.style.color = 'rgba(255,255,255,0.5)';
        } else {
            btnS.style.background = '#c9a84c'; btnS.style.color = '#000';
            btnP.style.background = 'transparent'; btnP.style.color = 'rgba(255,255,255,0.5)';
        }
    }

    const items = window.SUDHA_PORTAL_DATA ? window.SUDHA_PORTAL_DATA[type] : [];
    
    if (!items || items.length === 0) {
        list.innerHTML = `<div style="text-align:center; padding:3rem; opacity:0.4;">
            <i class="fas fa-box-open" style="font-size:2.5rem; margin-bottom:1rem; color:#777;"></i>
            <p style="color:#fff;">No ${type === 'pending' ? 'pending orders' : 'sales history'} found.</p>
        </div>`;
        return;
    }

    items.sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));

    list.innerHTML = items.map(o => `
        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(201,168,76,0.15); border-radius:15px; padding:1.2rem; margin-bottom:1rem; display:flex; gap:1.2rem; align-items:center; transition:0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'">
            <div style="position:relative;">
                <img src="${o.imgUrl || 'https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=100'}" style="width:70px; height:70px; object-fit:cover; border-radius:12px; border:1px solid rgba(201,168,76,0.3);" />
                <div style="position:absolute; top:-5px; right:-5px; width:15px; height:15px; border-radius:50%; background:${type === 'pending' ? '#c9a84c' : '#4ade80'}; border:2px solid #1a1209;"></div>
            </div>
            <div style="flex:1;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <h4 style="color:#fff; font-size:1rem; margin-bottom:4px; font-family: Playfair Display, serif;">${o.itemName || 'Dress Order'}</h4>
                    <span style="font-size:0.65rem; color:#c9a84c; opacity:0.8; background:rgba(201,168,76,0.1); padding:2px 8px; border-radius:4px;">#${(o.id || '000').slice(-5)}</span>
                </div>
                <p style="font-size:0.8rem; color:rgba(255,255,255,0.5); margin-bottom:10px;">${type === 'pending' ? 'Verification in progress' : 'Order Confirmed ✅'}</p>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:0.75rem; color:rgba(255,255,255,0.4);"><i class="far fa-calendar-alt"></i> ${new Date(o.date).toLocaleDateString()}</span>
                    <button onclick="window.open('https://wa.me/919442261828?text=Enquiry about my order ${(o.id || '').slice(-5)}', '_blank')" style="background:none; border:none; color:#4ade80; cursor:pointer; font-size:0.75rem; font-weight:600;"><i class="fab fa-whatsapp"></i> Help</button>
                </div>
            </div>
        </div>
    `).join('');
}

function closeUserOrdersModal() {
  const modal = document.getElementById('user-orders-modal');
  if (modal) modal.style.display = 'none';
}


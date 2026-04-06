// =====================================================
// LOGIN JS — Sudha Dress Shop (v3)
// Roles: Customer (localStorage) + Admin (Firebase Auth)
// =====================================================

// ── Initialize Firebase (Smart Detection) ──
let firebaseReady = false;
let auth = null;
let db = null;
let currentSyncMode = 'local';

try {
  const isKeyPlaceholder = !firebaseConfig || firebaseConfig.apiKey.includes('REPLACE_WITH_YOUR_KEY') || firebaseConfig.apiKey === 'AIzaSyABC123';

  if (!isKeyPlaceholder) {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.database();
    firebaseReady = true;
    currentSyncMode = 'cloud';
    console.log('✅ Firebase Cloud services connected');
  } else {
    console.warn('⚠️ Firebase keys are placeholders. Using Local/JSONBlob mode.');
    currentSyncMode = 'local';
  }
} catch (e) {
  console.warn('⚠️ Firebase initialization failed:', e.message);
  currentSyncMode = 'local';
}

// ── Local User Store (Customers) ──
const STORE_KEY = 'sudha_users';
const SESSION_KEY = 'sudha_current_user';

function getUsers() { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); }
function saveUsers(u) { localStorage.setItem(STORE_KEY, JSON.stringify(u)); }
function getCurrentUser() { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); }

// Admin session key
const ADMIN_KEY = 'sudha_is_admin';

// ── Logo click counter for admin reveal (click logo 5 times) ──
let logoClicks = 0;
document.getElementById('login-logo-click')?.addEventListener('click', () => {
  logoClicks++;
  if (logoClicks >= 5) {
    logoClicks = 0;
    switchRole('admin');
  }
});

// ── Role Switching ──
function switchRole(role) {
  const customerSec = document.getElementById('customer-section');
  const adminSec = document.getElementById('admin-section');
  const roleCustomer = document.getElementById('role-customer');
  const roleAdmin = document.getElementById('role-admin');

  if (role === 'admin') {
    customerSec.style.display = 'none';
    adminSec.style.display = 'block';
    roleAdmin.classList.add('active');
    roleCustomer.classList.remove('active');
  } else {
    customerSec.style.display = 'block';
    adminSec.style.display = 'none';
    roleCustomer.classList.add('active');
    roleAdmin.classList.remove('active');
  }
  clearAllMessages();
}

// Check URL param ?mode=admin
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('mode') === 'admin') {
    switchRole('admin');
    document.getElementById('role-pill').style.display = 'none';
  }

  // If already logged in as customer
  const current = getCurrentUser();
  if (current && !sessionStorage.getItem(ADMIN_KEY)) {
    const sucEl = document.getElementById('login-success');
    if (sucEl) {
      sucEl.textContent = `✓ Already logged in as ${current.name}. Redirecting...`;
      sucEl.classList.add('show');
    }
    setTimeout(() => { window.location.href = 'index.html'; }, 1500);
  }

  // If already logged in as admin
  if (sessionStorage.getItem(ADMIN_KEY) === 'true') {
    window.location.href = 'admin.html';
  }
});

// ── Tab Switching (Customer) ──
function switchTab(tab) {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  if (tab === 'login') {
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
  } else {
    registerForm.classList.add('active');
    loginForm.classList.remove('active');
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
  }
  clearAllMessages();
}

// ── Show/Hide Password ──
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  const icon = btn.querySelector('i');
  if (input.type === 'password') { input.type = 'text'; icon.className = 'fas fa-eye-slash'; }
  else { input.type = 'password'; icon.className = 'fas fa-eye'; }
}

// ── Clear all messages ──
function clearAllMessages() {
  ['login-error', 'login-success', 'register-error', 'register-success', 'admin-error', 'admin-success']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.classList.remove('show'); el.textContent = ''; }
    });
}

function showMsg(id, msg, isError = false) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  if (isError) el.style.setProperty('--msg-color', '#f87171');
  else el.style.setProperty('--msg-color', '#4ade80');
}

// ═══════════════════════════════
// ADMIN LOGIN
// ═══════════════════════════════
async function handleAdminLogin(e) {
  e.preventDefault();
  const email = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value;
  const btn = document.getElementById('btn-admin-submit');
  clearAllMessages();
  btn.textContent = 'Verifying...';
  btn.disabled = true;

  // ── Option 1: Firebase Auth (when configured) ──
  if (firebaseReady && auth) {
    try {
      const result = await auth.signInWithEmailAndPassword(email, password);
      const user = result.user;

      // Check if admin email matches
      if (user.email === ADMIN_EMAIL || email.toLowerCase().includes('admin')) {
        sessionStorage.setItem(ADMIN_KEY, 'true');
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ name: 'Admin', email, role: 'admin' }));
        showMsg('admin-success', '✓ Admin authenticated! Opening control panel...');
        setTimeout(() => { window.location.href = 'admin.html'; }, 1200);
      } else {
        await auth.signOut();
        showMsg('admin-error', '✕ This account does not have admin privileges.', true);
        btn.innerHTML = '<i class="fas fa-shield-alt"></i> Access Admin Panel';
        btn.disabled = false;
      }
    } catch (err) {
      let msg = '✕ Login failed. Check your email and password.';
      if (err.code === 'auth/user-not-found') msg = '✕ Admin account not found.';
      if (err.code === 'auth/wrong-password') msg = '✕ Incorrect password.';
      showMsg('admin-error', msg, true);
      btn.innerHTML = '<i class="fas fa-shield-alt"></i> Access Admin Panel';
      btn.disabled = false;
    }
    return;
  }

  // ── Option 2: Offline / local check (uses firebase-config.js credentials) ──
  setTimeout(() => {
    // Read from firebase-config.js
    const correctPass = (typeof ADMIN_OFFLINE_PASS !== 'undefined') ? ADMIN_OFFLINE_PASS : 'Sudha@2026';
    const correctEmail = (typeof ADMIN_EMAIL !== 'undefined') ? ADMIN_EMAIL : 'narenkarthic34@gmail.com';

    // Allow login if email matches admin email OR password is correct
    const emailOk = email.toLowerCase() === correctEmail.toLowerCase();
    const passwordOk = password === correctPass;

    if (passwordOk) {
      sessionStorage.setItem(ADMIN_KEY, 'true');
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ name: 'Admin', email, role: 'admin' }));
      showMsg('admin-success', '✓ Admin verified! Opening control panel...');
      setTimeout(() => { window.location.href = 'admin.html'; }, 1200);
    } else {
      showMsg('admin-error', '✕ Incorrect password. Please try again.', true);
      btn.innerHTML = '<i class="fas fa-shield-alt"></i> Access Admin Panel';
      btn.disabled = false;
    }
  }, 900);
}

// ═══════════════════════════════
// CUSTOMER LOGIN
// ═══════════════════════════════
function handleCustomerLogin(e) {
  e.preventDefault();
  const identifier = document.getElementById('login-phone').value.trim(); // email OR phone
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('btn-login-submit');
  clearAllMessages();
  btn.textContent = 'Logging in...';
  btn.disabled = true;

  // ── Firebase Auth (if configured) — for Gmail/email accounts ──
  if (firebaseReady && auth && identifier.includes('@')) {
    auth.signInWithEmailAndPassword(identifier, password)
      .then(result => {
        const user = result.user;
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
          name: user.displayName || identifier.split('@')[0],
          email: user.email,
          role: 'customer'
        }));
        showMsg('login-success', `✓ Welcome back! Redirecting...`);
        setTimeout(() => { window.location.href = 'index.html'; }, 1500);
      })
      .catch(err => {
        // Fall through to local check on Firebase error
        localLogin(identifier, password, btn);
      });
    return;
  }

  setTimeout(() => localLogin(identifier, password, btn), 800);
}

function localLogin(identifier, password, btn) {
  const users = getUsers();
  // Match by phone OR email
  const user = users.find(u =>
    (u.phone === identifier || (u.email && u.email.toLowerCase() === identifier.toLowerCase()))
    && u.password === password
  );
  if (user) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ name: user.name, phone: user.phone, email: user.email, role: 'customer' }));
    showMsg('login-success', `✓ Welcome back, ${user.name}! Redirecting...`);
    setTimeout(() => { window.location.href = 'index.html'; }, 1500);
  } else {
    showMsg('login-error', '✕ Incorrect mobile/email or password. Please try again.', true);
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
    btn.disabled = false;
  }
}


// ═══════════════════════════════
// CUSTOMER REGISTER
// ═══════════════════════════════
function handleCustomerRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const phone = document.getElementById('reg-phone').value.trim().replace(/\s/g, '');
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm').value;
  const btn = document.getElementById('btn-register-submit');
  clearAllMessages();

  if (phone.length < 10) { showMsg('register-error', '✕ Enter a valid 10-digit mobile number.', true); return; }
  if (password.length < 6) { showMsg('register-error', '✕ Password must be at least 6 characters.', true); return; }
  if (password !== confirm) { showMsg('register-error', '✕ Passwords do not match.', true); return; }

  btn.textContent = 'Creating account...';
  btn.disabled = true;

  setTimeout(() => {
    const users = getUsers();
    if (users.find(u => u.phone === phone)) {
      showMsg('register-error', '✕ This mobile is already registered. Please login.', true);
      btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
      btn.disabled = false;
      return;
    }
    users.push({ name, phone, email, password, createdAt: new Date().toISOString() });
    saveUsers(users);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ name, phone, role: 'customer' }));
    showMsg('register-success', `✓ Account created! Welcome, ${name}! Redirecting...`);
    setTimeout(() => { window.location.href = 'index.html'; }, 1800);
  }, 1000);
}

// ═══════════════════════════════
// GOOGLE LOGIN (For Customers & Owner)
// ═══════════════════════════════
let pendingGoogleUser = null;

/**
 * Handles Google Sign-In for both roles.
 * @param {string} role - 'customer' or 'admin'
 */
async function handleGoogleLogin(role = 'customer') {
  clearAllMessages();
  const errorId = role === 'admin' ? 'admin-error' : 'login-error';
  const successId = role === 'admin' ? 'admin-success' : 'login-success';
  const btnId = role === 'admin' ? 'btn-google-admin' : 'btn-google-login';

  const btn = document.getElementById(btnId);
  if (!btn) return;
  const oldText = btn.innerHTML;

  if (!firebaseReady || !auth) {
    showMsg(errorId, 'ℹ️ Google Auth requires Firebase. Please update firebase-config.js with your keys.', true);
    return;
  }

  try {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting to Google...';
    btn.disabled = true;

    const provider = new firebase.auth.GoogleAuthProvider();
    // Hint: Add custom parameters if needed
    // provider.setCustomParameters({ prompt: 'select_account' });

    const result = await auth.signInWithPopup(provider);
    const gUser = result.user;

    // ── CASE A: Owner Login ──
    if (role === 'admin') {
      const correctEmail = (typeof ADMIN_EMAIL !== 'undefined') ? ADMIN_EMAIL : 'narenkarthic34@gmail.com';
      if (gUser.email.toLowerCase() === correctEmail.toLowerCase()) {
        sessionStorage.setItem(ADMIN_KEY, 'true');
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ name: gUser.displayName || 'Owner', email: gUser.email, role: 'admin' }));
        showMsg(successId, '✓ Admin verified via Google! Opening panel...');
        setTimeout(() => { window.location.href = 'admin.html'; }, 1200);
      } else {
        await auth.signOut();
        showMsg(errorId, '✕ This Google account does not have Admin access.', true);
        btn.innerHTML = oldText;
        btn.disabled = false;
      }
      return;
    }

    // ── CASE B: Customer Login ──
    const localUsers = getUsers();
    const existing = localUsers.find(u => u.email === gUser.email);

    if (existing) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        name: existing.name,
        email: existing.email,
        phone: existing.phone,
        role: 'customer'
      }));
      showMsg(successId, `✓ Welcome, ${existing.name}! Redirecting...`);
      setTimeout(() => { window.location.href = 'index.html'; }, 1500);
    } else {
      // New User - Capture Phone for order tracking
      pendingGoogleUser = {
        name: gUser.displayName,
        email: gUser.email,
        photo: gUser.photoURL
      };
      const modal = document.getElementById('google-profile-modal');
      if (modal) modal.classList.add('active');
      else {
        // Fallback if modal isn't present
        const phone = prompt("Please enter your WhatsApp number to complete registration:");
        if (phone) {
          document.getElementById('google-phone').value = phone;
          saveGooglePhoneNumber();
        }
      }
      btn.innerHTML = oldText;
      btn.disabled = false;
    }
  } catch (err) {
    console.error('Google login error:', err);
    let msg = '✕ Google sign-in failed.';
    if (err.code === 'auth/popup-closed-by-user') msg = '✕ Login cancelled.';
    if (err.code === 'auth/unauthorized-domain') msg = '✕ Domain not authorized in Firebase Console.';
    showMsg(errorId, msg, true);
    btn.innerHTML = oldText;
    btn.disabled = false;
  }
}

// ── Save Phone & Finalize Google Login ──
function saveGooglePhoneNumber() {
  const phone = document.getElementById('google-phone').value.trim();
  if (!phone || phone.length < 10) {
    alert('Please enter a valid WhatsApp number (at least 10 digits).');
    return;
  }

  if (pendingGoogleUser) {
    const newUser = {
      ...pendingGoogleUser,
      phone: phone,
      createdAt: new Date().toISOString(),
      password: 'GOOGLE_AUTH_USER' // indicate this is a Google user
    };

    // Save to local store
    const localUsers = getUsers();
    localUsers.push(newUser);
    saveUsers(localUsers);

    // Set active session
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      role: 'customer'
    }));

    document.getElementById('google-profile-modal').classList.remove('active');
    showMsg('login-success', `✓ Profile complete! Welcome to Sudha Dress Shop.`);
    setTimeout(() => { window.location.href = 'index.html'; }, 1500);
  }
}

// ═══════════════════════════════
// FORGOT PASSWORD OTP LOGIC
// ═══════════════════════════════
let generatedOTP = null;
let forgotUser = null; // Store user being reset

function openForgotModal(e) {
  if (e) e.preventDefault();
  document.getElementById('forgot-modal-overlay').classList.add('active');
  switchForgotStep(1);
  document.getElementById('forgot-mobile').focus();
  clearForgotMsgs();
}

function closeForgotModal() {
  document.getElementById('forgot-modal-overlay').classList.remove('active');
}

function clearForgotMsgs() {
  ['reset-msg-step1', 'reset-msg-step2', 'reset-msg-step3'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.className = 'reset-msg'; el.textContent = ''; }
  });
}

function switchForgotStep(step) {
  document.getElementById('forgot-step-1').style.display = step === 1 ? 'block' : 'none';
  document.getElementById('forgot-step-2').style.display = step === 2 ? 'block' : 'none';
  document.getElementById('forgot-step-3').style.display = step === 3 ? 'block' : 'none';
}

function showForgotMsg(stepId, msg, isError = false) {
  const el = document.getElementById(stepId);
  if (!el) return;
  el.textContent = msg;
  el.className = isError ? 'reset-msg err' : 'reset-msg ok';
}

// ── Step 1: Send OTP ──
function sendOTPRequest() {
  const mobile = document.getElementById('forgot-mobile').value.trim();
  const btn = document.getElementById('btn-send-otp');

  if (mobile.length < 10) {
    showForgotMsg('reset-msg-step1', '✕ Enter a valid 10-digit mobile number.', true);
    return;
  }

  // Find user
  const users = getUsers();
  forgotUser = users.find(u => u.phone === mobile);

  // Check if it's Admin (if mobile matches admin mobile in storage or if admin is hardcoded)
  // For this implementation, we allow reset for customers. For Admin, it uses Firebase usually.
  if (!forgotUser) {
    showForgotMsg('reset-msg-step1', '✕ No account found with this mobile number.', true);
    return;
  }

  btn.innerHTML = '⏳ Sending OTP...';
  btn.disabled = true;

  setTimeout(() => {
    generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[SMS-MOCK] OTP for ${mobile}: ${generatedOTP}`);

    // Show a beautiful mock notification
    showMockSMSNotification(mobile, generatedOTP);

    showForgotMsg('reset-msg-step1', '✓ OTP sent to ' + mobile);
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send OTP';
    btn.disabled = false;

    // Move to step 2 after a short delay
    setTimeout(() => {
      switchForgotStep(2);
      document.getElementById('forgot-otp').focus();
    }, 1500);
  }, 1000);
}

// ── Step 2: Verify OTP ──
function verifyOTPRequest() {
  const otp = document.getElementById('forgot-otp').value.trim();
  if (otp === generatedOTP) {
    showForgotMsg('reset-msg-step2', '✓ OTP Verified!');
    setTimeout(() => {
      switchForgotStep(3);
      document.getElementById('forgot-new-pass').focus();
    }, 1000);
  } else {
    showForgotMsg('reset-msg-step2', '✕ Invalid OTP. Please try again.', true);
  }
}

// ── Step 3: Reset Password ──
function resetPasswordFinal() {
  const newPass = document.getElementById('forgot-new-pass').value;
  const confirmPass = document.getElementById('forgot-confirm-pass').value;

  if (newPass.length < 6) {
    showForgotMsg('reset-msg-step3', '✕ Password must be at least 6 characters.', true);
    return;
  }
  if (newPass !== confirmPass) {
    showForgotMsg('reset-msg-step3', '✕ Passwords do not match.', true);
    return;
  }

  const btn = document.getElementById('btn-reset-final');
  btn.innerHTML = '⏳ Saving...';
  btn.disabled = true;

  setTimeout(() => {
    // Update user in storage
    const users = getUsers();
    const idx = users.findIndex(u => u.phone === forgotUser.phone);
    if (idx !== -1) {
      users[idx].password = newPass;
      saveUsers(users);
      showForgotMsg('reset-msg-step3', '✓ Password changed successfully!');
      setTimeout(() => {
        closeForgotModal();
        // Reset fields
        document.getElementById('forgot-mobile').value = '';
        document.getElementById('forgot-otp').value = '';
        document.getElementById('forgot-new-pass').value = '';
        document.getElementById('forgot-confirm-pass').value = '';
        btn.innerHTML = '<i class="fas fa-save"></i> Change Password';
        btn.disabled = false;
        showMsg('login-success', '✓ Password reset successful. You can now login.');
      }, 2000);
    } else {
      showForgotMsg('reset-msg-step3', '✕ Error updating password.', true);
      btn.innerHTML = '<i class="fas fa-save"></i> Change Password';
      btn.disabled = false;
    }
  }, 1000);
}

// ── Mock SMS Notification UI ──
function showMockSMSNotification(phone, otp) {
  const notify = document.createElement('div');
  notify.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #1a1209;
    color: #fff;
    border: 1px solid #c9a84c;
    border-radius: 12px;
    padding: 15px 20px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    z-index: 99999;
    display: flex;
    flex-direction: column;
    gap: 5px;
    animation: slideInRight 0.5s ease;
    max-width: 300px;
  `;

  notify.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <span style="color:#c9a84c; font-weight:700; font-size:0.8rem; text-transform:uppercase;">New Message</span>
      <span style="font-size:0.7rem; color:rgba(255,255,255,0.5);">Just now</span>
    </div>
    <div style="font-weight:600; font-size:0.95rem;">SMS from Sudha Shop</div>
    <div style="font-size:0.85rem; color:rgba(255,255,255,0.8);">Your OTP for password reset is: <strong style="color:#fff; font-size:1.1rem; letter-spacing:2px;">${otp}</strong>. Do not share this with anyone.</div>
  `;

  document.body.appendChild(notify);

  // Keyframe animation if not exists
  if (!document.getElementById('sms-anim')) {
    const style = document.createElement('style');
    style.id = 'sms-anim';
    style.innerHTML = `
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  setTimeout(() => {
    notify.style.animation = 'slideOutRight 0.5s ease forwards';
    setTimeout(() => notify.remove(), 500);
  }, 10000);
}

// Close modal on overlay click
document.getElementById('forgot-modal-overlay')?.addEventListener('click', function (e) {
  if (e.target === this) closeForgotModal();
});


// ══════════════════════════════════════════════════════════════════
// SUDHA DRESS SHOP — CLOUD & SYNC CONFIGURATION (PERFECT CONFIG)
// ══════════════════════════════════════════════════════════════════

// ── STEP 1: JSONBlob Sync (Primary) ──
// This handles your orders, sales, and text updates across devices.
// It is FREE and requires no setup.
const JSONBLOB_ID = '019d5a1c-d520-78f1-bb62-2818a32a97d5';

// ── STEP 2: ImgBB API Key (REQUIRED) ──
// Why? To show images in WhatsApp messages and the customer portal.
// Get your key in 30 seconds here: https://api.imgbb.com
const IMGBB_API_KEY = 'YOUR_IMGBB_API_KEY_HERE';

// ── STEP 3: Firebase Configuration (REQUIRED FOR GOOGLE LOGIN) ──
// 1. Go to: https://console.firebase.google.com
// 2. Click "Project Settings" (Gear icon) -> "General"
// 3. Scroll down to "Your apps" -> "Web apps" -> Copy your config here:
const firebaseConfig = {
  apiKey: "AIzaSyABC123_REPLACE_WITH_YOUR_KEY",
  authDomain: "sudha-dress-shop.firebaseapp.com",
  databaseURL: "https://sudha-dress-shop-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sudha-dress-shop",
  storageBucket: "sudha-dress-shop.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// ── STEP 4: Admin Credentials ──
const ADMIN_EMAIL = 'narenkarthic34@gmail.com';
const ADMIN_OFFLINE_PASS = 'Sudha@2026';

// ── STEP 5: Sync Mode (Manual Overrides) ──
// set OFFLINE_MODE to 'auto' to let the website detect if Firebase is ready.
const OFFLINE_MODE = 'auto'; // Options: true, false, or 'auto'


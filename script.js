/**
 * Smart Grocery & Budget Safety Tracker - DT2 Full Criteria Compliance
 * Realtime Cloud Firestore (Compat SDK) + LocalStorage Fallback
 * 1. Stepper Kuantitas 44x44px langsung di tiap kartu (Realtime Subtotal & Total)
 * 2. Ambang batas Waspada >= 90% dan Banner Merah Tegas > 100%
 * 3. Metadata storeLocation, shoppingDate, walletLimit tersimpan di LocalStorage & Firestore (onSnapshot)
 * 4. Input numeric mode & Responsif rapi 375px
 */

// ========================================================
// 1. FIREBASE CONFIGURATION
// ========================================================
const firebaseConfig = {
  apiKey: "AIzaSyDoj01n_ywpgtTWxvQuXkgTIt5DCt2wx5A",
  authDomain: "smartgrocery-app-c94ff.firebaseapp.com",
  projectId: "smartgrocery-app-c94ff",
  storageBucket: "smartgrocery-app-c94ff.firebasestorage.app",
  messagingSenderId: "157040421492",
  appId: "1:157040421492:web:960eaad67043b173a8ff21",
  measurementId: "G-MYG7Y4B6P1"
};

// ========================================================
// SHARED FIRESTORE SESSION DOCUMENT (HP & PC Realtime Sync)
// ========================================================
const FIRESTORE_SESSION = {
  COLLECTION: 'sessions',
  DOC_ID: 'rian_main_session'
};

// Date Helpers
const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const month = monthNames[parseInt(parts[1], 10) - 1] || parts[1];
      const day = parseInt(parts[2], 10);
      return `${day} ${month} ${year}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  } catch (e) {}
  return dateStr;
};

// LocalStorage Keys
const STORAGE_KEYS = {
  ITEMS: 'smart_grocery_items_v1',
  BUDGET: 'smart_grocery_budget_cap',
  WALLET_LIMIT: 'smart_grocery_wallet_limit',
  CALC_MODE: 'smart_grocery_calc_mode',
  PRICE_HISTORY: 'smart_grocery_price_history',
  STORE_LOCATION: 'smart_grocery_store_location',
  SHOPPING_DATE: 'smart_grocery_shopping_date',
  SESSION_STORE: 'smart_grocery_session_store',
  SESSION_DATE: 'smart_grocery_session_date',
  THEME: 'smart_grocery_theme',
  SOUND: 'smart_grocery_sound_enabled',
  CUSTOM_LOCATIONS: 'smart_grocery_custom_locations'
};

// Global App State
const APP_STATE = {
  isOnline: navigator.onLine,
  isFirestoreActive: false,
  items: [],
  budgetCap: 400000, // Default Rp 400.000 (F-05 / walletLimit)
  calcMode: 'all', // 'all' or 'boughtOnly'
  activeFilter: 'all', // 'all', 'unbought', 'bought'
  searchQuery: '',
  sortBy: 'newest',
  priceHistory: {}, // { "itemNameLowercase": [ { id, store, price, shoppingDate, timestamp } ] }
  sessionStore: 'Lotte Mart Grocery - Puri Indah', // Default SRS Rian
  sessionDate: getTodayDateString(), // Default hari ini
  theme: 'dark',
  soundEnabled: true,
  customLocations: []
};

// Firebase References
let db = null;
let unsubscribeSnapshot = null;
let unsubscribeConfigSnapshot = null;

// DOM Elements cache
let dom = {};

const initDom = () => {
  dom = {
    // Connection Banner
    connectionBanner: document.getElementById('connectionBanner'),
    connectionText: document.getElementById('connectionText'),
    btnRetrySync: document.getElementById('btnRetrySync'),

    // Sesi Belanja (Header Metadata)
    headerStoreLocation: document.getElementById('headerStoreLocation'),
    headerShoppingDate: document.getElementById('headerShoppingDate'),
    sessionStoreBadge: document.getElementById('sessionStoreBadge'),
    customLocationInputWrapper: document.getElementById('customLocationInputWrapper'),
    customLocationInput: document.getElementById('customLocationInput'),
    btnSaveCustomLocation: document.getElementById('btnSaveCustomLocation'),
    btnCancelCustomLocation: document.getElementById('btnCancelCustomLocation'),
    btnCalTrigger: document.getElementById('btnCalTrigger'),
    btnModalCalTrigger: document.getElementById('btnModalCalTrigger'),

    // Theme & Sound Controls
    btnToggleTheme: document.getElementById('btnToggleTheme'),
    themeIcon: document.getElementById('themeIcon'),
    btnThemeDark: document.getElementById('btnThemeDark'),
    btnThemeLight: document.getElementById('btnThemeLight'),
    btnToggleSound: document.getElementById('btnToggleSound'),
    soundIcon: document.getElementById('soundIcon'),
    soundToggleCheckbox: document.getElementById('soundToggleCheckbox'),
    
    // Safety Cap Card (F-05)
    safetyCapSection: document.getElementById('safetyCapSection'),
    budgetCapLabel: document.getElementById('budgetCapLabel'),
    btnQuickEditBudget: document.getElementById('btnQuickEditBudget'),
    totalExpenseDisplay: document.getElementById('totalExpenseDisplay'),
    remainingBalanceLabel: document.getElementById('remainingBalanceLabel'),
    remainingBalanceDisplay: document.getElementById('remainingBalanceDisplay'),
    percentageDisplay: document.getElementById('percentageDisplay'),
    budgetProgressBar: document.getElementById('budgetProgressBar'),
    safetyAlertBox: document.getElementById('safetyAlertBox'),
    safetyAlertIcon: document.getElementById('safetyAlertIcon'),
    safetyAlertTitle: document.getElementById('safetyAlertTitle'),
    safetyAlertDesc: document.getElementById('safetyAlertDesc'),

    // Quick Stats
    totalSavedDisplay: document.getElementById('totalSavedDisplay'),
    itemCountDisplay: document.getElementById('itemCountDisplay'),

    // Search & Filter
    searchInput: document.getElementById('searchInput'),
    btnClearSearch: document.getElementById('btnClearSearch'),
    filterTabs: document.querySelectorAll('.filter-tab'),
    countAll: document.getElementById('countAll'),
    countUnbought: document.getElementById('countUnbought'),
    countBought: document.getElementById('countBought'),
    sortSelect: document.getElementById('sortSelect'),

    // Grocery List
    groceryList: document.getElementById('groceryList'),
    listBadgeCount: document.getElementById('listBadgeCount'),
    emptyState: document.getElementById('emptyState'),
    btnEmptyAdd: document.getElementById('btnEmptyAdd'),
    btnLoadDemoData: document.getElementById('btnLoadDemoData'),
    btnOpenAddModal: document.getElementById('btnOpenAddModal'),

    // Add/Edit Item Modal
    itemModal: document.getElementById('itemModal'),
    itemForm: document.getElementById('itemForm'),
    modalTitle: document.getElementById('modalTitle'),
    modalSubtitle: document.getElementById('modalSubtitle'),
    modalHeaderIcon: document.getElementById('modalHeaderIcon'),
    btnCloseModal: document.getElementById('btnCloseModal'),
    btnCancelModal: document.getElementById('btnCancelModal'),
    editItemId: document.getElementById('editItemId'),
    inputItemName: document.getElementById('inputItemName'),
    itemListHistory: document.getElementById('itemListHistory'),
    inputStoreName: document.getElementById('inputStoreName'),
    inputShoppingDate: document.getElementById('inputShoppingDate'),
    inputCategory: document.getElementById('inputCategory'),
    inputQuantity: document.getElementById('inputQuantity'),
    inputUnit: document.getElementById('inputUnit'),
    btnQtyMinus: document.getElementById('btnQtyMinus'),
    btnQtyPlus: document.getElementById('btnQtyPlus'),
    inputUnitPrice: document.getElementById('inputUnitPrice'),
    storeChips: document.querySelectorAll('.store-chip'),
    
    // Modal Price Comparator (F-04)
    formPriceCompareBox: document.getElementById('formPriceCompareBox'),
    compareBadgeStatus: document.getElementById('compareBadgeStatus'),
    compareBodyText: document.getElementById('compareBodyText'),

    // Modal Discount (F-03)
    toggleDiscountSection: document.getElementById('toggleDiscountSection'),
    discountStatusBadge: document.getElementById('discountStatusBadge'),
    discountBody: document.getElementById('discountBody'),
    inputDiscount1: document.getElementById('inputDiscount1'),
    inputDiscount2: document.getElementById('inputDiscount2'),
    previewDiscountPrice: document.getElementById('previewDiscountPrice'),
    previewTotalSaved: document.getElementById('previewTotalSaved'),
    presetBtns: document.querySelectorAll('.preset-btn:not(.qc-preset)'),

    // Modal Live Subtotal
    formLiveSubtotal: document.getElementById('formLiveSubtotal'),
    formBudgetImpact: document.getElementById('formBudgetImpact'),
    formBudgetImpactText: document.getElementById('formBudgetImpactText'),
    btnSubmitItem: document.getElementById('btnSubmitItem'),

    // Standalone Quick Discount Modal
    quickCalcModal: document.getElementById('quickCalcModal'),
    btnOpenQuickCalc: document.getElementById('btnOpenQuickCalc'),
    btnCloseQuickCalc: document.getElementById('btnCloseQuickCalc'),
    qcPrice: document.getElementById('qcPrice'),
    qcD1: document.getElementById('qcD1'),
    qcD2: document.getElementById('qcD2'),
    qcQty: document.getElementById('qcQty'),
    qcOriginalTotal: document.getElementById('qcOriginalTotal'),
    qcFinalPrice: document.getElementById('qcFinalPrice'),
    qcSavedAmount: document.getElementById('qcSavedAmount'),
    qcSteps: document.getElementById('qcSteps'),
    qcPresets: document.querySelectorAll('.qc-preset'),

    // Store History Modal (F-04)
    historyModal: document.getElementById('historyModal'),
    btnOpenHistory: document.getElementById('btnOpenHistory'),
    btnCloseHistory: document.getElementById('btnCloseHistory'),
    storeComparisonList: document.getElementById('storeComparisonList'),

    // Settings Modal (F-05)
    settingsModal: document.getElementById('settingsModal'),
    btnOpenSettings: document.getElementById('btnOpenSettings'),
    btnCloseSettings: document.getElementById('btnCloseSettings'),
    inputBudgetCapSetting: document.getElementById('inputBudgetCapSetting'),
    btnSaveBudgetCap: document.getElementById('btnSaveBudgetCap'),
    settingsSyncText: document.getElementById('settingsSyncText'),
    btnForceSync: document.getElementById('btnForceSync'),
    btnClearCheckedItems: document.getElementById('btnClearCheckedItems'),
    btnResetAllData: document.getElementById('btnResetAllData'),

    // Toast
    toastContainer: document.getElementById('toastContainer')
  };
};

// ========================================================
// 3. UTILITIES & FORMATTERS
// ========================================================
const formatRupiah = (number) => {
  const num = Math.round(Number(number) || 0);
  return 'Rp ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// ========================================================
// WEB AUDIO API - Sound Effects (No external files needed)
// ========================================================
let _audioCtx = null;
const getAudioCtx = () => {
  if (!_audioCtx) {
    try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  }
  return _audioCtx;
};

const playSound = (type) => {
  if (!APP_STATE.soundEnabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;

  const now = ctx.currentTime;

  if (type === 'click') {
    // Soft pop / click - for navigation, chips, qty buttons
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.start(now); osc.stop(now + 0.1);

  } else if (type === 'success') {
    // Chime / success - ascending two notes
    [520, 780].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);
      gain.gain.setValueAtTime(0.18, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.18);
      osc.start(now + i * 0.12); osc.stop(now + i * 0.12 + 0.2);
    });

  } else if (type === 'delete') {
    // Swoosh delete sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.start(now); osc.stop(now + 0.22);

  } else if (type === 'warning') {
    // Warning beep
    [440, 440].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + i * 0.18);
      gain.gain.setValueAtTime(0.08, now + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 0.14);
      osc.start(now + i * 0.18); osc.stop(now + i * 0.18 + 0.15);
    });
  }
};

// ========================================================
// THEME & SOUND MANAGERS
// ========================================================
const applyTheme = (theme) => {
  APP_STATE.theme = theme;
  document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
  
  const themeIcon = document.getElementById('themeIcon');
  if (themeIcon) {
    themeIcon.className = theme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
  }
  
  const btnDark = document.getElementById('btnThemeDark');
  const btnLight = document.getElementById('btnThemeLight');
  if (btnDark && btnLight) {
    btnDark.classList.toggle('active', theme === 'dark');
    btnLight.classList.toggle('active', theme === 'light');
  }
  
  try { localStorage.setItem(STORAGE_KEYS.THEME, theme); } catch(e) {}
};

const initTheme = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
    applyTheme(saved);
  } catch(e) {
    applyTheme('dark');
  }
};

const applySoundState = (enabled) => {
  APP_STATE.soundEnabled = enabled;
  const soundIcon = document.getElementById('soundIcon');
  if (soundIcon) {
    soundIcon.className = enabled ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
  }
  const btnToggle = document.getElementById('btnToggleSound');
  if (btnToggle) {
    btnToggle.title = enabled ? 'Efek Suara Aktif (Klik untuk Mute)' : 'Efek Suara Dimatikan (Klik untuk Aktifkan)';
  }
  const chk = document.getElementById('soundToggleCheckbox');
  if (chk) {
    chk.checked = enabled;
  }
  try { localStorage.setItem(STORAGE_KEYS.SOUND, enabled ? 'true' : 'false'); } catch(e) {}
};

const initSound = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SOUND);
    const isEnabled = saved !== 'false';
    applySoundState(isEnabled);
  } catch(e) {
    applySoundState(true);
  }
};

// ========================================================
// CUSTOM LOCATIONS MANAGER
// ========================================================
const loadCustomLocations = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_LOCATIONS);
    if (raw) APP_STATE.customLocations = JSON.parse(raw);
  } catch(e) {}
};

const saveCustomLocations = () => {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_LOCATIONS, JSON.stringify(APP_STATE.customLocations));
  } catch(e) {}
};

const addCustomLocation = (locationName) => {
  if (!locationName || !locationName.trim()) return;
  const name = locationName.trim();
  
  if (APP_STATE.customLocations.includes(name)) {
    showToast(`Lokasi "${name}" sudah ada di daftar!`, 'warning');
    // Still select it
    APP_STATE.sessionStore = name;
    if (dom.headerStoreLocation) dom.headerStoreLocation.value = name;
    const wrapper = document.getElementById('customLocationInputWrapper');
    if (wrapper) wrapper.style.display = 'none';
    return;
  }
  
  APP_STATE.customLocations.push(name);
  saveCustomLocations();
  refreshLocationDropdown();
  refreshStoreChips();
  
  // Set as active session store
  APP_STATE.sessionStore = name;
  try {
    localStorage.setItem(STORAGE_KEYS.STORE_LOCATION, name);
    localStorage.setItem(STORAGE_KEYS.SESSION_STORE, name);
  } catch(e) {}
  if (dom.headerStoreLocation) dom.headerStoreLocation.value = name;
  if (dom.sessionStoreBadge) dom.sessionStoreBadge.textContent = name.length > 20 ? name.substring(0,20) + '...' : name;
  
  // Hide custom input wrapper and clear text
  const wrapper = document.getElementById('customLocationInputWrapper');
  const input = document.getElementById('customLocationInput');
  if (wrapper) wrapper.style.display = 'none';
  if (input) input.value = '';

  // Sync to Firestore (both activeSession and appConfig)
  syncConfigToFirestore({
    activeLocation: name,
    storeLocation: name,
    customLocations: APP_STATE.customLocations
  });
  playSound('success');
  showToast(`Lokasi "${name}" berhasil ditambahkan & dijadikan sesi aktif!`, 'success');
};

const refreshLocationDropdown = () => {
  const select = document.getElementById('headerStoreLocation');
  if (!select) return;
  
  const defaultOptions = [
    'Lotte Mart Grocery - Puri Indah',
    'Superindo', 'Indomaret', 'Alfamart',
    'Pasar Modern', 'Hypermart', 'Transmart'
  ];
  
  // Remove old custom options (before the __custom__ option)
  const existing = Array.from(select.options);
  existing.forEach(opt => {
    if (!defaultOptions.includes(opt.value) && opt.value !== '__custom__') {
      select.removeChild(opt);
    }
  });
  
  // Insert custom locations before the last "__custom__" option
  const customOpt = select.querySelector('option[value="__custom__"]');
  APP_STATE.customLocations.forEach(loc => {
    if (!select.querySelector(`option[value="${loc}"]`)) {
      const opt = document.createElement('option');
      opt.value = loc;
      opt.textContent = loc;
      if (customOpt) select.insertBefore(opt, customOpt);
      else select.appendChild(opt);
    }
  });
  
  // Set value to current session store
  select.value = APP_STATE.sessionStore;
};

const refreshStoreChips = () => {
  const chipsContainer = document.querySelector('.store-quick-chips');
  const datalist = document.getElementById('storeLocationList');

  // Update datalist suggestions in modal
  if (datalist) {
    const defaultDatalist = [
      'Lotte Mart Grocery - Puri Indah',
      'Superindo', 'Indomaret', 'Alfamart',
      'Hypermart', 'Transmart', 'Pasar Modern'
    ];
    datalist.innerHTML = '';
    [...defaultDatalist, ...APP_STATE.customLocations].forEach(loc => {
      const opt = document.createElement('option');
      opt.value = loc;
      datalist.appendChild(opt);
    });
  }

  if (!chipsContainer) return;
  
  // Remove old custom chips
  chipsContainer.querySelectorAll('.store-chip.custom-chip').forEach(el => el.remove());
  
  // Add new custom chips
  APP_STATE.customLocations.forEach(loc => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'store-chip custom-chip';
    btn.dataset.store = loc;
    btn.textContent = loc.length > 18 ? loc.substring(0,18) + '...' : loc;
    btn.title = loc;
    btn.addEventListener('click', () => {
      if (dom.inputStoreName) {
        dom.inputStoreName.value = loc;
        updateModalFormLivePreviews();
        playSound('click');
      }
    });
    chipsContainer.appendChild(btn);
  });
};

const showToast = (message, type = 'success', duration = 3000) => {
  if (!dom.toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'fa-circle-check';
  if (type === 'warning') icon = 'fa-triangle-exclamation';
  if (type === 'danger') icon = 'fa-circle-exclamation';
  
  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>${message}</span>
  `;

  dom.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toast-out 0.3s forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
};

// ========================================================
// 4. F-03: TIERED DISCOUNT CALCULATOR (Diskon Bertingkat)
// ========================================================
const calculateTieredDiscount = (price, d1 = 0, d2 = 0) => {
  const basePrice = Math.max(0, Number(price) || 0);
  const disc1 = Math.min(Math.max(0, Number(d1) || 0), 99);
  const disc2 = Math.min(Math.max(0, Number(d2) || 0), 99);

  // Tahap 1
  const afterDisc1 = basePrice * (1 - disc1 / 100);
  // Tahap 2 (diskon kedua dihitung dari harga setelah diskon pertama)
  const finalUnitPrice = Math.round(afterDisc1 * (1 - disc2 / 100));

  const savedUnitPrice = basePrice - finalUnitPrice;
  const effectivePercentage = basePrice > 0 ? ((savedUnitPrice / basePrice) * 100).toFixed(1) : 0;

  return {
    basePrice,
    disc1,
    disc2,
    finalUnitPrice,
    savedUnitPrice,
    effectivePercentage,
    hasDiscount: disc1 > 0 || disc2 > 0
  };
};

// ========================================================
// 5. F-04: STORE & DATE PRICE COMPARATOR (Riwayat Toko & Tanggal)
// ========================================================
const updatePriceHistoryMap = (items) => {
  const history = {};

  items.forEach(item => {
    if (!item.name || !item.unitPrice) return;
    const cleanName = item.name.trim().toLowerCase();
    const store = (item.storeLocation || item.store || 'Toko').trim();
    const shoppingDate = item.shoppingDate || getTodayDateString();

    if (!history[cleanName]) {
      history[cleanName] = [];
    }

    const record = {
      id: item.id,
      store: store,
      price: Number(item.unitPrice),
      discountedPrice: item.discountedUnitPrice || Number(item.unitPrice),
      shoppingDate: shoppingDate,
      dateTimestamp: new Date(shoppingDate).getTime() || Date.now()
    };

    history[cleanName].push(record);
  });

  APP_STATE.priceHistory = history;
  try {
    localStorage.setItem(STORAGE_KEYS.PRICE_HISTORY, JSON.stringify(history));
  } catch (e) {}
  updateDatalistHistory();
};

const compareStorePrice = (itemName, currentStore, currentPrice, currentDate = null, currentItemId = null) => {
  if (!itemName || !currentPrice) {
    return { status: 'none', message: 'Ketik nama barang dan harga untuk melihat perbandingan riwayat.' };
  }

  const cleanName = itemName.trim().toLowerCase();
  const currentStoreClean = (currentStore || '').trim().toLowerCase();
  const historyList = APP_STATE.priceHistory[cleanName] || [];

  const validHistory = historyList.filter(h => h.id !== currentItemId);

  if (validHistory.length === 0) {
    return {
      status: 'new',
      symbol: '🆕',
      message: `Data perdana untuk "${itemName}". Harga akan disimpan ke database komparator.`
    };
  }

  // 1. CARI RIWAYAT PADA LOKASI TOKO YANG SAMA
  const sameStoreRecords = validHistory.filter(h => (h.store || '').trim().toLowerCase() === currentStoreClean);

  if (sameStoreRecords.length > 0) {
    sameStoreRecords.sort((a, b) => b.dateTimestamp - a.dateTimestamp);
    const prevRecord = sameStoreRecords[0];
    const prevPrice = prevRecord.price;
    const prevDateFormatted = formatDisplayDate(prevRecord.shoppingDate);
    const diff = currentPrice - prevPrice;

    if (diff > 0) {
      // HARGA NAIK (↑ Panah Merah)
      return {
        status: 'expensive',
        symbol: '↑',
        diffAmount: diff,
        comparedStore: prevRecord.store,
        prevDateText: prevDateFormatted,
        badgeText: `↑ Naik ${formatRupiah(diff)} vs ${prevDateFormatted}`,
        message: `↑ Naik ${formatRupiah(diff)} dibanding transaksi ${prevDateFormatted} (${formatRupiah(prevPrice)}) di ${prevRecord.store}`
      };
    } else if (diff < 0) {
      // HARGA TURUN / LEBIH HEMAT (↓ Panah Hijau)
      return {
        status: 'cheaper',
        symbol: '↓',
        diffAmount: Math.abs(diff),
        comparedStore: prevRecord.store,
        prevDateText: prevDateFormatted,
        badgeText: `↓ Turun ${formatRupiah(Math.abs(diff))} vs ${prevDateFormatted}`,
        message: `↓ Turun ${formatRupiah(Math.abs(diff))} dibanding transaksi ${prevDateFormatted} (${formatRupiah(prevPrice)}) di ${prevRecord.store}`
      };
    } else {
      // HARGA SETARA (= Tanda Setara)
      return {
        status: 'stable',
        symbol: '=',
        diffAmount: 0,
        comparedStore: prevRecord.store,
        prevDateText: prevDateFormatted,
        badgeText: `= Setara vs ${prevDateFormatted}`,
        message: `= Setara ${formatRupiah(currentPrice)} dengan transaksi ${prevDateFormatted} di ${prevRecord.store}`
      };
    }
  }

  // 2. JIKA BELUM ADA DI TOKO INI, BANDINGKAN DENGAN TOKO LAIN
  validHistory.sort((a, b) => b.dateTimestamp - a.dateTimestamp);
  const otherRecord = validHistory[0];
  const diffOther = currentPrice - otherRecord.price;
  const otherDateFormatted = formatDisplayDate(otherRecord.shoppingDate);

  if (diffOther > 0) {
    return {
      status: 'expensive',
      symbol: '↑',
      diffAmount: diffOther,
      comparedStore: otherRecord.store,
      prevDateText: otherDateFormatted,
      badgeText: `↑ Lebih mahal ${formatRupiah(diffOther)} vs ${otherRecord.store}`,
      message: `↑ Lebih mahal ${formatRupiah(diffOther)} dibanding di ${otherRecord.store} (${formatRupiah(otherRecord.price)} pada ${otherDateFormatted})`
    };
  } else if (diffOther < 0) {
    return {
      status: 'cheaper',
      symbol: '↓',
      diffAmount: Math.abs(diffOther),
      comparedStore: otherRecord.store,
      prevDateText: otherDateFormatted,
      badgeText: `↓ Lebih hemat ${formatRupiah(Math.abs(diffOther))} vs ${otherRecord.store}`,
      message: `↓ Lebih hemat ${formatRupiah(Math.abs(diffOther))} dibanding di ${otherRecord.store} (${formatRupiah(otherRecord.price)} pada ${otherDateFormatted})`
    };
  } else {
    return {
      status: 'stable',
      symbol: '=',
      diffAmount: 0,
      comparedStore: otherRecord.store,
      prevDateText: otherDateFormatted,
      badgeText: `= Setara harga di ${otherRecord.store}`,
      message: `= Harga setara dengan di ${otherRecord.store} (${formatRupiah(otherRecord.price)})`
    };
  }
};

const updateDatalistHistory = () => {
  if (!dom.itemListHistory) return;
  dom.itemListHistory.innerHTML = '';
  Object.keys(APP_STATE.priceHistory).forEach(nameKey => {
    const opt = document.createElement('option');
    const displayTitle = nameKey.replace(/\b\w/g, l => l.toUpperCase());
    opt.value = displayTitle;
    dom.itemListHistory.appendChild(opt);
  });
};

// ========================================================
// 6. F-05: SAFETY CAP & BUDGET TRACKER LOGIC (DT2 Criterion 2)
// ========================================================
let _lastBudgetAlertTier = 'safe';

const updateBudgetSafetyDisplay = () => {
  const cap = Number(APP_STATE.budgetCap) || 400000;
  
  let totalExpense = 0;
  let totalSavings = 0;

  APP_STATE.items.forEach(item => {
    const subtotal = Number(item.subtotal) || 0;
    const savings = Number(item.totalSaved) || 0;

    if (APP_STATE.calcMode === 'all') {
      totalExpense += subtotal;
      totalSavings += savings;
    } else {
      if (item.isBought) {
        totalExpense += subtotal;
        totalSavings += savings;
      }
    }
  });

  const remaining = cap - totalExpense;
  const percentage = cap > 0 ? (totalExpense / cap) * 100 : 0;
  const clampedPercent = Math.min(percentage, 100);

  if (dom.budgetCapLabel) dom.budgetCapLabel.textContent = formatRupiah(cap);
  if (dom.totalExpenseDisplay) dom.totalExpenseDisplay.textContent = formatRupiah(totalExpense);
  if (dom.percentageDisplay) dom.percentageDisplay.textContent = `${percentage.toFixed(1)}%`;
  if (dom.totalSavedDisplay) dom.totalSavedDisplay.textContent = formatRupiah(totalSavings);
  if (dom.itemCountDisplay) dom.itemCountDisplay.textContent = `${APP_STATE.items.length} Item`;

  if (dom.budgetProgressBar) dom.budgetProgressBar.style.width = `${clampedPercent}%`;

  if (dom.remainingBalanceLabel && dom.remainingBalanceDisplay) {
    if (remaining >= 0) {
      dom.remainingBalanceLabel.textContent = 'Sisa Saldo';
      dom.remainingBalanceDisplay.textContent = formatRupiah(remaining);
    } else {
      dom.remainingBalanceLabel.textContent = 'Defisit (Over)';
      dom.remainingBalanceDisplay.textContent = `-${formatRupiah(Math.abs(remaining))}`;
    }
  }

  if (dom.safetyCapSection && dom.budgetProgressBar && dom.safetyAlertBox && dom.remainingBalanceDisplay) {
    dom.safetyCapSection.classList.remove('safe', 'warning', 'danger');
    dom.budgetProgressBar.classList.remove('safe', 'warning', 'danger');
    dom.safetyAlertBox.classList.remove('safe', 'warning', 'danger');
    dom.remainingBalanceDisplay.classList.remove('balance-safe', 'balance-warn', 'balance-danger');

    // DT2 Kriteria 2:
    // Aman (< 90%)
    // Waspada / Kuning (>= 90% dan <= 100%)
    // Bahaya / Merah Tegas (> 100%) dengan teks exact
    if (percentage < 90) {
      _lastBudgetAlertTier = 'safe';
      dom.safetyCapSection.classList.add('safe');
      dom.budgetProgressBar.classList.add('safe');
      dom.safetyAlertBox.classList.add('safe');
      dom.remainingBalanceDisplay.classList.add('balance-safe');

      if (dom.safetyAlertIcon) dom.safetyAlertIcon.className = 'fa-solid fa-circle-check status-icon';
      if (dom.safetyAlertTitle) dom.safetyAlertTitle.textContent = 'Anggaran Sangat Aman';
      if (dom.safetyAlertDesc) dom.safetyAlertDesc.textContent = `Pengeluaran Anda baru ${percentage.toFixed(1)}% dari limit dompet. Sisa aman: ${formatRupiah(remaining)}.`;

    } else if (percentage >= 90 && percentage <= 100) {
      if (_lastBudgetAlertTier === 'safe') {
        playSound('warning');
      }
      _lastBudgetAlertTier = 'warning';
      dom.safetyCapSection.classList.add('warning');
      dom.budgetProgressBar.classList.add('warning');
      dom.safetyAlertBox.classList.add('warning');
      dom.remainingBalanceDisplay.classList.add('balance-warn');

      if (dom.safetyAlertIcon) dom.safetyAlertIcon.className = 'fa-solid fa-triangle-exclamation status-icon';
      if (dom.safetyAlertTitle) dom.safetyAlertTitle.textContent = '⚠️ Waspada! Mendekati Limit Dompet';
      if (dom.safetyAlertDesc) dom.safetyAlertDesc.textContent = `Perhatian: Total belanja telah mencapai ${percentage.toFixed(1)}% dari batas dompet! Sisa saldo hanya tersisa ${formatRupiah(remaining)}.`;

    } else {
      // > 100%: Banner Merah Tegas
      if (_lastBudgetAlertTier !== 'danger') {
        playSound('warning');
      }
      _lastBudgetAlertTier = 'danger';
      dom.safetyCapSection.classList.add('danger');
      dom.budgetProgressBar.classList.add('danger');
      dom.safetyAlertBox.classList.add('danger');
      dom.remainingBalanceDisplay.classList.add('balance-danger');

      if (dom.safetyAlertIcon) dom.safetyAlertIcon.className = 'fa-solid fa-triangle-exclamation status-icon';
      if (dom.safetyAlertTitle) dom.safetyAlertTitle.textContent = '🚨 OVERBUDGET!';
      // Teks Wajib DT2 Kriteria 2
      if (dom.safetyAlertDesc) dom.safetyAlertDesc.textContent = 'Total belanja melebihi batas saldo dompet! Kurangi kuantitas atau batalkan barang sekunder.';
    }
  }
};

// ========================================================
// 7. GROCERY LIST RENDERING (DT2 Criterion 1: Stepper 44x44px)
// ========================================================
const renderGroceryList = () => {
  if (!dom.groceryList) return;

  let filtered = [...APP_STATE.items];

  if (APP_STATE.activeFilter === 'unbought') {
    filtered = filtered.filter(item => !item.isBought);
  } else if (APP_STATE.activeFilter === 'bought') {
    filtered = filtered.filter(item => item.isBought);
  }

  if (APP_STATE.searchQuery) {
    const q = APP_STATE.searchQuery.toLowerCase();
    filtered = filtered.filter(item => 
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.storeLocation && item.storeLocation.toLowerCase().includes(q)) ||
      (item.store && item.store.toLowerCase().includes(q)) ||
      (item.category && item.category.toLowerCase().includes(q))
    );
  }

  if (APP_STATE.sortBy === 'newest') {
    filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } else if (APP_STATE.sortBy === 'name') {
    filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } else if (APP_STATE.sortBy === 'price-desc') {
    filtered.sort((a, b) => (b.subtotal || 0) - (a.subtotal || 0));
  } else if (APP_STATE.sortBy === 'price-asc') {
    filtered.sort((a, b) => (a.subtotal || 0) - (b.subtotal || 0));
  }

  const totalCount = APP_STATE.items.length;
  const unboughtCount = APP_STATE.items.filter(i => !i.isBought).length;
  const boughtCount = APP_STATE.items.filter(i => i.isBought).length;

  if (dom.countAll) dom.countAll.textContent = totalCount;
  if (dom.countUnbought) dom.countUnbought.textContent = unboughtCount;
  if (dom.countBought) dom.countBought.textContent = boughtCount;
  if (dom.listBadgeCount) dom.listBadgeCount.textContent = filtered.length;

  if (filtered.length === 0) {
    dom.groceryList.innerHTML = '';
    if (dom.emptyState) dom.emptyState.classList.add('show');
    return;
  } else {
    if (dom.emptyState) dom.emptyState.classList.remove('show');
  }

  dom.groceryList.innerHTML = filtered.map(item => {
    const hasDiscount = (item.discount1 > 0 || item.discount2 > 0);
    const unitPriceDisplay = formatRupiah(item.unitPrice);
    const effectiveUnitPriceDisplay = formatRupiah(item.discountedUnitPrice || item.unitPrice);
    const subtotalDisplay = formatRupiah(item.subtotal);
    const totalSavedDisplay = formatRupiah(item.totalSaved || 0);

    const storeDisplayName = item.storeLocation || item.store || 'Toko';
    const dateFormatted = formatDisplayDate(item.shoppingDate || '');

    // F-04: Komparasi harga berdasarkan toko & tanggal transaksi sebelumnya
    const compareRes = compareStorePrice(item.name, storeDisplayName, item.unitPrice, item.shoppingDate, item.id);
    let compareBadgeHtml = '';

    if (compareRes.status === 'cheaper') {
      compareBadgeHtml = `
        <div class="comparator-tag-badge cheaper" title="${escapeHtml(compareRes.message)}">
          <i class="fa-solid fa-arrow-down"></i>
          <span>${escapeHtml(compareRes.badgeText)}</span>
        </div>
      `;
    } else if (compareRes.status === 'expensive') {
      compareBadgeHtml = `
        <div class="comparator-tag-badge expensive" title="${escapeHtml(compareRes.message)}">
          <i class="fa-solid fa-arrow-up"></i>
          <span>${escapeHtml(compareRes.badgeText)}</span>
        </div>
      `;
    } else if (compareRes.status === 'stable') {
      compareBadgeHtml = `
        <div class="comparator-tag-badge stable" title="${escapeHtml(compareRes.message)}">
          <i class="fa-solid fa-equals"></i>
          <span>${escapeHtml(compareRes.badgeText)}</span>
        </div>
      `;
    } else if (compareRes.status === 'new') {
      compareBadgeHtml = `
        <div class="comparator-tag-badge new" title="${escapeHtml(compareRes.message)}">
          <i class="fa-solid fa-sparkles"></i>
          <span>🆕 Data Perdana</span>
        </div>
      `;
    }

    let discountTagHtml = '';
    if (hasDiscount) {
      const discFormula = item.discount2 > 0 
        ? `${item.discount1}% + ${item.discount2}%` 
        : `${item.discount1}%`;
      discountTagHtml = `
        <div class="discount-tag-pill">
          <i class="fa-solid fa-tag"></i>
          <span>Diskon ${discFormula} &bull; Hemat ${totalSavedDisplay}</span>
        </div>
      `;
    }

    return `
      <div class="grocery-item-card ${item.isBought ? 'is-bought' : ''}" data-id="${item.id}">
        <div class="card-row-top">
          <div class="item-checkbox-wrapper">
            <div class="checkbox-custom ${item.isBought ? 'checked' : ''}" data-action="toggle-bought" data-id="${item.id}" title="Tandai sudah dibeli">
              <i class="fa-solid fa-check"></i>
            </div>
          </div>

          <div class="item-main-info">
            <div class="item-badges-row">
              <span class="badge-store">
                <i class="fa-solid fa-shop"></i> ${escapeHtml(storeDisplayName)}
              </span>
              ${dateFormatted ? `
                <span class="badge-date">
                  <i class="fa-regular fa-calendar-days"></i> ${dateFormatted}
                </span>
              ` : ''}
              <span class="badge-category">
                ${escapeHtml(item.category || 'Barang')}
              </span>
            </div>

            <h3 class="item-title">${escapeHtml(item.name)}</h3>

            <div class="item-meta-price">
              <span>${item.quantity} ${escapeHtml(item.unit || 'pcs')} &times; ${hasDiscount ? `<span class="strikethrough">${unitPriceDisplay}</span> <strong class="text-emerald">${effectiveUnitPriceDisplay}</strong>` : `<strong>${unitPriceDisplay}</strong>`}</span>
            </div>
          </div>

          <div class="card-actions-menu">
            <button class="btn-card-action" data-action="edit" data-id="${item.id}" title="Edit item">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn-card-action btn-del" data-action="delete" data-id="${item.id}" title="Hapus item">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>

        ${(hasDiscount || compareBadgeHtml) ? `
          <div class="card-row-details">
            ${discountTagHtml}
            ${compareBadgeHtml}
          </div>
        ` : ''}

        <!-- Card Bottom Row: Inline Stepper 44x44px & Subtotal (DT2 Kriteria 1) -->
        <div class="card-row-bottom">
          <div class="card-qty-stepper" aria-label="Ubah kuantitas barang">
            <button type="button" class="btn-card-qty btn-card-qty-minus" data-action="decrease-qty" data-id="${item.id}" aria-label="Kurangi kuantitas">
              <i class="fa-solid fa-minus"></i>
            </button>
            <span class="card-qty-value">${item.quantity}</span>
            <button type="button" class="btn-card-qty btn-card-qty-plus" data-action="increase-qty" data-id="${item.id}" aria-label="Tambah kuantitas">
              <i class="fa-solid fa-plus"></i>
            </button>
            <span class="card-qty-unit">${escapeHtml(item.unit || 'pcs')}</span>
          </div>

          <div class="card-subtotal-info">
            <span class="subtotal-label">Subtotal</span>
            <span class="subtotal-amount">${subtotalDisplay}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
};

const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// ========================================================
// 8. CRUD & INLINE QUANTITY STEPPER (DT2 Criterion 1 & 3)
// ========================================================
const saveItemsLocally = () => {
  try {
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(APP_STATE.items));
  } catch (e) {}
};

const loadItemsFromLocalStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ITEMS);
    if (raw) {
      APP_STATE.items = JSON.parse(raw);
    }
    const savedCap = localStorage.getItem(STORAGE_KEYS.WALLET_LIMIT) || localStorage.getItem(STORAGE_KEYS.BUDGET);
    if (savedCap) {
      APP_STATE.budgetCap = Number(savedCap);
    }
    const savedMode = localStorage.getItem(STORAGE_KEYS.CALC_MODE);
    if (savedMode) {
      APP_STATE.calcMode = savedMode;
    }
    const savedHist = localStorage.getItem(STORAGE_KEYS.PRICE_HISTORY);
    if (savedHist) {
      APP_STATE.priceHistory = JSON.parse(savedHist);
    }
    const savedStore = localStorage.getItem(STORAGE_KEYS.STORE_LOCATION) || localStorage.getItem(STORAGE_KEYS.SESSION_STORE);
    if (savedStore) {
      APP_STATE.sessionStore = savedStore;
    }
    const savedDate = localStorage.getItem(STORAGE_KEYS.SHOPPING_DATE) || localStorage.getItem(STORAGE_KEYS.SESSION_DATE);
    if (savedDate) {
      APP_STATE.sessionDate = savedDate;
    }
  } catch (err) {
    console.error('Error loading LocalStorage:', err);
  }
};

/**
 * DT2 Kriteria 1: Ubah kuantitas langsung dari kartu item di daftar belanjaan
 * Subtotal dan total belanja ter-update detik itu juga & langsung sync ke Firestore
 */
const updateItemQuantity = async (itemId, delta) => {
  const item = APP_STATE.items.find(i => i.id === itemId);
  if (!item) return;

  const currentQty = Number(item.quantity) || 1;
  const newQty = Math.max(1, currentQty + delta);
  if (newQty === currentQty) return;

  // Hitung ulang subtotal dan diskon per item detik itu juga
  const discCalc = calculateTieredDiscount(item.unitPrice, item.discount1, item.discount2);
  item.quantity = newQty;
  item.discountedUnitPrice = discCalc.finalUnitPrice;
  item.unitSaved = discCalc.savedUnitPrice;
  item.subtotal = discCalc.finalUnitPrice * newQty;
  item.totalSaved = discCalc.savedUnitPrice * newQty;
  item.updatedAt = Date.now();

  // Update tampilan & kalkulasi lokal seketika tanpa jeda
  saveItemsLocally();
  updateBudgetSafetyDisplay();
  renderGroceryList();

  // Sinkronisasi realtime ke dokumen bersama sessions/rian_main_session
  await syncSessionToFirestore();
};

/**
 * Add or Update Grocery Item
 * Menyimpan barang ke dokumen bersama Firestore sessions/rian_main_session
 */
const saveItem = async (itemData) => {
  const isEditing = Boolean(itemData.id);
  const now = Date.now();

  if (isEditing) {
    const index = APP_STATE.items.findIndex(i => i.id === itemData.id);
    if (index >= 0) {
      APP_STATE.items[index] = {
        ...itemData,
        walletLimit: APP_STATE.budgetCap,
        updatedAt: now
      };
    } else {
      APP_STATE.items.unshift({
        ...itemData,
        walletLimit: APP_STATE.budgetCap,
        updatedAt: now
      });
    }
  } else {
    const newItem = {
      ...itemData,
      id: `item_${now}_${Math.random().toString(36).substr(2, 6)}`,
      walletLimit: APP_STATE.budgetCap,
      createdAt: now,
      updatedAt: now
    };
    APP_STATE.items.unshift(newItem);
  }

  saveItemsLocally();
  updatePriceHistoryMap(APP_STATE.items);
  updateBudgetSafetyDisplay();
  renderGroceryList();
  playSound('success');
  showToast(isEditing ? 'Barang berhasil diperbarui!' : 'Barang ditambahkan ke daftar!', 'success');

  // Kirim pembaruan ke Firestore sessions/rian_main_session
  await syncSessionToFirestore();
};

/**
 * Delete Item
 */
const deleteItem = async (itemId) => {
  playSound('delete');
  APP_STATE.items = APP_STATE.items.filter(i => i.id !== itemId);
  saveItemsLocally();
  updatePriceHistoryMap(APP_STATE.items);
  updateBudgetSafetyDisplay();
  renderGroceryList();
  showToast('Barang berhasil dihapus!', 'success');

  // Kirim pembaruan ke Firestore sessions/rian_main_session
  await syncSessionToFirestore();
};

/**
 * Toggle Bought Status
 */
const toggleBoughtStatus = async (itemId) => {
  const item = APP_STATE.items.find(i => i.id === itemId);
  if (!item) return;

  const newStatus = !item.isBought;
  item.isBought = newStatus;
  item.updatedAt = Date.now();

  if (newStatus) {
    playSound('success');
  } else {
    playSound('click');
  }

  saveItemsLocally();
  updateBudgetSafetyDisplay();
  renderGroceryList();

  // Kirim pembaruan ke Firestore sessions/rian_main_session
  await syncSessionToFirestore();
};

// ========================================================
// 9. SHARED FIRESTORE SESSION SYNC & REALTIME LISTENER
// ========================================================
const setConnectionStatus = (status, text) => {
  // status: 'online' | 'connecting' | 'offline'
  if (dom.connectionBanner) {
    dom.connectionBanner.className = `connection-banner ${status}`;
  }
  if (dom.connectionText) {
    dom.connectionText.textContent = text;
  }
  if (dom.settingsSyncText) {
    if (status === 'online') {
      dom.settingsSyncText.textContent = '🟢 Terhubung ke Cloud Firestore';
    } else if (status === 'connecting') {
      dom.settingsSyncText.textContent = '🔵 Menghubungkan ke Cloud Firestore...';
    } else {
      dom.settingsSyncText.textContent = '🟡 Mode Offline / LocalStorage';
    }
  }
  APP_STATE.isFirestoreActive = (status === 'online' || status === 'connecting');
};

/**
 * Sinkronisasi seluruh state sesi belanja ke SATU ID dokumen Firestore bersama:
 * sessions/rian_main_session
 * Memastikan baik HP maupun PC membaca dan menulis ke satu sumber data yang sama persis
 */
const syncSessionToFirestore = async (customPayload = {}) => {
  if (!db) {
    console.warn('[Firestore] db belum aktif, pembaruan disimpan ke LocalStorage.');
    return;
  }
  try {
    const serverTimestamp = (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue)
      ? firebase.firestore.FieldValue.serverTimestamp()
      : Date.now();

    const payload = {
      items: APP_STATE.items,
      walletLimit: APP_STATE.budgetCap,
      budgetCap: APP_STATE.budgetCap,
      storeLocation: APP_STATE.sessionStore,
      activeLocation: APP_STATE.sessionStore,
      shoppingDate: APP_STATE.sessionDate,
      customLocations: APP_STATE.customLocations,
      calcMode: APP_STATE.calcMode,
      updatedAt: serverTimestamp,
      ...customPayload
    };

    const sessionDocRef = db.collection(FIRESTORE_SESSION.COLLECTION).doc(FIRESTORE_SESSION.DOC_ID);
    await sessionDocRef.set(payload, { merge: true });
    setConnectionStatus('online', 'Realtime Cloud Firestore Aktif');
    console.log('[Firestore] Berhasil sinkronisasi (setDoc) ke:', `${FIRESTORE_SESSION.COLLECTION}/${FIRESTORE_SESSION.DOC_ID}`);
  } catch (err) {
    console.error('[Firestore setDoc Error]: Gagal menyimpan ke session Firestore:', err);
    setConnectionStatus('offline', 'Mode Offline (Gagal Sinkronisasi Cloud)');
    if (err && err.code === 'permission-denied') {
      const errorMsg = 'Akses Firestore DITOLAK (permission-denied). Periksa Security Rules di Firebase Console!';
      console.error(errorMsg);
      showToast(errorMsg, 'danger', 6000);
      alert('PERINGATAN FIREBASE:\nAkses ke Cloud Firestore Ditolak (permission-denied).\n\nSolusi: Buka Firebase Console -> Firestore Database -> Rules, lalu ubah menjadi:\nallow read, write: if true;');
    } else {
      showToast(`Gagal sinkronisasi ke Cloud: ${err.message || 'Koneksi terputus'}`, 'warning', 4000);
    }
  }
};

// Alias untuk kompatibilitas pemanggilan sebelumnya
const syncConfigToFirestore = syncSessionToFirestore;

const initFirebaseRealtime = async () => {
  setConnectionStatus('connecting', 'Menghubungkan ke Cloud Firestore...');

  try {
    if (typeof firebase === 'undefined' || !firebase.initializeApp) {
      console.warn('Firebase SDK compat belum termuat. Menjalankan mode LocalStorage.');
      setConnectionStatus('offline', 'Mode Offline (LocalStorage)');
      loadItemsFromLocalStorage();
      updatePriceHistoryMap(APP_STATE.items);
      updateBudgetSafetyDisplay();
      renderGroceryList();
      return;
    }

    if (!firebase.apps || firebase.apps.length === 0) {
      firebase.initializeApp(firebaseConfig);
    }

    db = firebase.firestore();

    // Setup Listener Realtime onSnapshot pada dokumen bersama sessions/rian_main_session
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
    }

    const sessionDocRef = db.collection(FIRESTORE_SESSION.COLLECTION).doc(FIRESTORE_SESSION.DOC_ID);

    unsubscribeSnapshot = sessionDocRef.onSnapshot((docSnap) => {
      if (docSnap.exists) {
        const data = docSnap.data();
        console.log('[Firestore] Data sesi realtime diterima dari Cloud:', data);

        let shouldUpdateUI = false;

        // 1. SINKRONISASI DAFTAR ITEM BELANJAAN (PERBAIKAN RACE CONDITION / DATA HILANG SAAT RELOAD)
        if (Array.isArray(data.items)) {
          if (data.items.length > 0) {
            // Firestore memiliki data valid -> update data lokal
            APP_STATE.items = data.items;
            saveItemsLocally();
            updatePriceHistoryMap(APP_STATE.items);
            shouldUpdateUI = true;
          } else if (data.items.length === 0 && APP_STATE.items.length > 0) {
            // FIX RACE CONDITION: Dokumen di Firestore masih kosong [] padahal lokal memiliki data belanjaan yang sah!
            // JANGAN timpa data lokal dengan []. Sebaliknya, sinkronkan data lokal yang sudah ada ke Firestore.
            console.log('[Firestore] Mempertahankan data lokal dan mengunggah ke sesi Cloud Firestore...');
            syncSessionToFirestore();
          } else if (data.items.length === 0 && APP_STATE.items.length === 0) {
            // Memang kedua sisi kosong
            APP_STATE.items = [];
            saveItemsLocally();
            shouldUpdateUI = true;
          }
        } else if (!data.items && APP_STATE.items.length > 0) {
          // Dokumen ada tapi field items belum ada -> unggah data lokal
          syncSessionToFirestore();
        }

        // 2. Sinkronisasi Limit Anggaran (Safety Cap / walletLimit)
        const remoteLimit = data.walletLimit !== undefined ? data.walletLimit : data.budgetCap;
        if (remoteLimit !== undefined) {
          const newCap = Number(remoteLimit);
          if (!isNaN(newCap) && newCap > 0 && newCap !== APP_STATE.budgetCap) {
            APP_STATE.budgetCap = newCap;
            try {
              localStorage.setItem(STORAGE_KEYS.BUDGET, String(newCap));
              localStorage.setItem(STORAGE_KEYS.WALLET_LIMIT, String(newCap));
            } catch(e) {}
            if (dom.inputBudgetCapSetting) dom.inputBudgetCapSetting.value = newCap;
            shouldUpdateUI = true;
          }
        }

        // 3. Sinkronisasi Lokasi Supermarket Aktif
        const newLoc = data.storeLocation || data.activeLocation;
        if (newLoc && newLoc !== APP_STATE.sessionStore) {
          APP_STATE.sessionStore = newLoc;
          try {
            localStorage.setItem(STORAGE_KEYS.STORE_LOCATION, newLoc);
            localStorage.setItem(STORAGE_KEYS.SESSION_STORE, newLoc);
          } catch(e) {}
          if (dom.headerStoreLocation) dom.headerStoreLocation.value = newLoc;
          if (dom.sessionStoreBadge) {
            dom.sessionStoreBadge.textContent = newLoc.replace('Grocery - ', '');
          }
          shouldUpdateUI = true;
        }

        // 4. Sinkronisasi Tanggal Transaksi
        if (data.shoppingDate && data.shoppingDate !== APP_STATE.sessionDate) {
          APP_STATE.sessionDate = data.shoppingDate;
          try {
            localStorage.setItem(STORAGE_KEYS.SHOPPING_DATE, data.shoppingDate);
            localStorage.setItem(STORAGE_KEYS.SESSION_DATE, data.shoppingDate);
          } catch(e) {}
          if (dom.headerShoppingDate) dom.headerShoppingDate.value = data.shoppingDate;
          shouldUpdateUI = true;
        }

        // 5. Sinkronisasi Lokasi Kustom
        if (Array.isArray(data.customLocations) && data.customLocations.length > 0) {
          const merged = Array.from(new Set([...APP_STATE.customLocations, ...data.customLocations]));
          if (merged.length !== APP_STATE.customLocations.length) {
            APP_STATE.customLocations = merged;
            saveCustomLocations();
            refreshLocationDropdown();
            refreshStoreChips();
          }
        }

        // 6. Sinkronisasi Mode Perhitungan
        if (data.calcMode && data.calcMode !== APP_STATE.calcMode) {
          APP_STATE.calcMode = data.calcMode;
          try { localStorage.setItem(STORAGE_KEYS.CALC_MODE, data.calcMode); } catch(e) {}
          const radio = document.querySelector(`input[name="calcMode"][value="${data.calcMode}"]`);
          if (radio) radio.checked = true;
          shouldUpdateUI = true;
        }

        if (shouldUpdateUI) {
          updateBudgetSafetyDisplay();
          renderGroceryList();
        }
        setConnectionStatus('online', 'Realtime Cloud Firestore Aktif');
      } else {
        // Dokumen belum ada di Firestore -> buat dokumen awal dari data lokal yang ada saat ini
        console.log('[Firestore] Dokumen sesi bersama belum ada di Firestore, menginisialisasi dengan data lokal...');
        syncSessionToFirestore();
        setConnectionStatus('online', 'Realtime Cloud Firestore Aktif');
      }
    }, (error) => {
      console.error('[Firestore onSnapshot Error]:', error);
      setConnectionStatus('offline', 'Mode Offline (Gagal Terhubung Cloud)');
      if (error && error.code === 'permission-denied') {
        const errorMsg = 'Akses listener Firestore DITOLAK (permission-denied). Periksa Security Rules di Firebase Console!';
        console.error(errorMsg);
        showToast(errorMsg, 'danger', 6000);
        alert('PERINGATAN FIREBASE:\nListener Realtime Firestore Ditolak (permission-denied).\n\nSolusi: Buka Firebase Console -> Firestore Database -> Rules, lalu ubah menjadi:\nallow read, write: if true;');
      } else {
        showToast('Koneksi Firestore terganggu, menggunakan cadangan lokal.', 'warning', 3500);
      }
      loadItemsFromLocalStorage();
      updatePriceHistoryMap(APP_STATE.items);
      updateBudgetSafetyDisplay();
      renderGroceryList();
    });

  } catch (err) {
    console.error('Failed to initialize Firebase:', err);
    setConnectionStatus('offline', 'Mode Offline (LocalStorage)');
    loadItemsFromLocalStorage();
    updatePriceHistoryMap(APP_STATE.items);
    updateBudgetSafetyDisplay();
    renderGroceryList();
  }
};

// ========================================================
// 10. MODAL FORM CONTROLS & LIVE CALCULATIONS (F-04)
// ========================================================
const updateModalFormLivePreviews = () => {
  if (!dom.inputUnitPrice) return;

  const price = Number(dom.inputUnitPrice.value) || 0;
  const qty = Number(dom.inputQuantity.value) || 1;
  const d1 = Number(dom.inputDiscount1.value) || 0;
  const d2 = Number(dom.inputDiscount2.value) || 0;
  const itemName = (dom.inputItemName.value || '').trim();
  const storeName = (dom.inputStoreName.value || '').trim();
  const shoppingDate = (dom.inputShoppingDate ? dom.inputShoppingDate.value : '') || APP_STATE.sessionDate;
  const editId = dom.editItemId.value || null;

  // Tiered Discount Calculation (F-03)
  const discCalc = calculateTieredDiscount(price, d1, d2);
  const discountedUnitPrice = discCalc.finalUnitPrice;
  const unitSaved = discCalc.savedUnitPrice;
  const totalSubtotal = discountedUnitPrice * qty;
  const totalSaved = unitSaved * qty;

  // Update Discount UI
  if (dom.previewDiscountPrice) dom.previewDiscountPrice.textContent = formatRupiah(discountedUnitPrice);
  if (dom.previewTotalSaved && dom.discountStatusBadge) {
    if (discCalc.hasDiscount) {
      dom.previewTotalSaved.textContent = `${formatRupiah(totalSaved)} (Hemat ${discCalc.effectivePercentage}%)`;
      dom.discountStatusBadge.textContent = d2 > 0 ? `Diskon ${d1}% + ${d2}%` : `Diskon ${d1}%`;
      dom.discountStatusBadge.className = 'discount-status-pill active';
    } else {
      dom.previewTotalSaved.textContent = 'Rp 0 (0%)';
      dom.discountStatusBadge.textContent = 'Tanpa Diskon';
      dom.discountStatusBadge.className = 'discount-status-pill';
    }
  }

  // Update Subtotal Preview
  if (dom.formLiveSubtotal) dom.formLiveSubtotal.textContent = formatRupiah(totalSubtotal);

  // Budget Impact
  const currentBudget = Number(APP_STATE.budgetCap) || 400000;
  const impactPercent = currentBudget > 0 ? ((totalSubtotal / currentBudget) * 100).toFixed(1) : 0;
  if (dom.formBudgetImpactText) dom.formBudgetImpactText.textContent = `Menambah belanjaan ini akan memakan +${impactPercent}% dari limit dompet.`;

  // F-04: Live Store & Date Price Comparator Preview in Form
  if (dom.compareBadgeStatus && dom.compareBodyText) {
    const compare = compareStorePrice(itemName, storeName, price, shoppingDate, editId);
    dom.compareBadgeStatus.className = `comparator-badge ${compare.status}`;

    if (compare.status === 'cheaper') {
      dom.compareBadgeStatus.textContent = '↓ Turun (Lebih Hemat)';
      dom.compareBodyText.innerHTML = `<strong>Kabar Baik!</strong> Harga di <strong>${escapeHtml(storeName || 'toko ini')}</strong> (${formatRupiah(price)}) lebih murah <strong>${formatRupiah(compare.diffAmount)}</strong> dibanding ${escapeHtml(compare.message)}.`;
    } else if (compare.status === 'expensive') {
      dom.compareBadgeStatus.textContent = '↑ Naik (Lebih Mahal)';
      dom.compareBodyText.innerHTML = `<strong>Perhatian:</strong> Harga di <strong>${escapeHtml(storeName || 'toko ini')}</strong> (${formatRupiah(price)}) naik <strong>${formatRupiah(compare.diffAmount)}</strong> dibanding ${escapeHtml(compare.message)}.`;
    } else if (compare.status === 'stable') {
      dom.compareBadgeStatus.textContent = '= Setara (Harga Stabil)';
      dom.compareBodyText.innerHTML = `Harga sama persis <strong>${formatRupiah(price)}</strong> dengan riwayat transaksi sebelumnya (${escapeHtml(compare.prevDateText || 'sebelumnya')}).`;
    } else if (compare.status === 'new') {
      dom.compareBadgeStatus.textContent = '🆕 Toko/Tanggal Perdana';
      dom.compareBodyText.textContent = `Ini data perdana untuk "${itemName}" di ${storeName}. Harga ini akan dicatat sebagai patokan riwayat selanjutnya.`;
    } else {
      dom.compareBadgeStatus.textContent = 'Mengecek...';
      dom.compareBodyText.textContent = 'Ketik nama barang, toko, dan harga untuk mencocokkan riwayat harga toko & tanggal sebelumnya.';
    }
  }
};

const openAddEditModal = (itemToEdit = null) => {
  if (!dom.itemForm || !dom.itemModal) return;
  dom.itemForm.reset();

  if (itemToEdit) {
    if (dom.modalTitle) dom.modalTitle.textContent = 'Edit Barang Belanja';
    if (dom.modalSubtitle) dom.modalSubtitle.textContent = 'Perbarui rincian harga, toko atau diskon';
    if (dom.modalHeaderIcon) dom.modalHeaderIcon.className = 'fa-solid fa-pen-to-square';
    dom.editItemId.value = itemToEdit.id;
    dom.inputItemName.value = itemToEdit.name || '';
    dom.inputStoreName.value = itemToEdit.storeLocation || itemToEdit.store || APP_STATE.sessionStore;
    if (dom.inputShoppingDate) dom.inputShoppingDate.value = itemToEdit.shoppingDate || APP_STATE.sessionDate;
    dom.inputCategory.value = itemToEdit.category || 'Sembako';
    dom.inputQuantity.value = itemToEdit.quantity || 1;
    dom.inputUnit.value = itemToEdit.unit || 'pcs';
    dom.inputUnitPrice.value = itemToEdit.unitPrice || '';
    dom.inputDiscount1.value = itemToEdit.discount1 || 0;
    dom.inputDiscount2.value = itemToEdit.discount2 || 0;
  } else {
    if (dom.modalTitle) dom.modalTitle.textContent = 'Tambah Barang Belanja';
    if (dom.modalSubtitle) dom.modalSubtitle.textContent = 'Isi rincian barang, harga, toko & diskon';
    if (dom.modalHeaderIcon) dom.modalHeaderIcon.className = 'fa-solid fa-cart-plus';
    dom.editItemId.value = '';
    // Otomatis isi Lokasi Toko & Tanggal dari Sesi Header aktif
    dom.inputStoreName.value = APP_STATE.sessionStore;
    if (dom.inputShoppingDate) dom.inputShoppingDate.value = APP_STATE.sessionDate;
    dom.inputQuantity.value = 1;
    dom.inputDiscount1.value = 0;
    dom.inputDiscount2.value = 0;
  }

  updateModalFormLivePreviews();
  dom.itemModal.classList.add('active');
  dom.itemModal.setAttribute('aria-hidden', 'false');
  if (dom.inputItemName) dom.inputItemName.focus();
};

const closeModal = () => {
  if (dom.itemModal) {
    dom.itemModal.classList.remove('active');
    dom.itemModal.setAttribute('aria-hidden', 'true');
  }
};

// ========================================================
// 11. STANDALONE QUICK DISCOUNT CALCULATOR (Modal)
// ========================================================
const updateQuickCalc = () => {
  if (!dom.qcPrice) return;
  const price = Number(dom.qcPrice.value) || 0;
  const d1 = Number(dom.qcD1.value) || 0;
  const d2 = Number(dom.qcD2.value) || 0;
  const qty = Number(dom.qcQty.value) || 1;

  const res = calculateTieredDiscount(price, d1, d2);
  const totalOriginal = price * qty;
  const totalFinal = res.finalUnitPrice * qty;
  const totalSaved = res.savedUnitPrice * qty;

  if (dom.qcOriginalTotal) dom.qcOriginalTotal.textContent = formatRupiah(totalOriginal);
  if (dom.qcFinalPrice) dom.qcFinalPrice.textContent = formatRupiah(totalFinal);
  if (dom.qcSavedAmount) dom.qcSavedAmount.textContent = `${formatRupiah(totalSaved)} (${res.effectivePercentage}%)`;

  if (dom.qcSteps) {
    const step1 = price * (1 - (res.disc1 / 100));
    dom.qcSteps.innerHTML = `
      Tahap 1: ${formatRupiah(price)} - ${res.disc1}% = ${formatRupiah(step1)}/unit<br>
      Tahap 2: ${formatRupiah(step1)} - ${res.disc2}% = ${formatRupiah(res.finalUnitPrice)}/unit<br>
      Total untuk ${qty} pcs: <strong>${formatRupiah(totalFinal)}</strong> (Hemat ${formatRupiah(totalSaved)})
    `;
  }
};

// ========================================================
// 12. STORE COMPARISON MODAL (F-04 Overview)
// ========================================================
const openStoreComparisonModal = () => {
  updatePriceHistoryMap(APP_STATE.items);
  const history = APP_STATE.priceHistory;
  const itemNames = Object.keys(history);

  if (!dom.storeComparisonList) return;

  if (itemNames.length === 0) {
    dom.storeComparisonList.innerHTML = `
      <div class="empty-state show" style="padding: 24px 10px;">
        <i class="fa-solid fa-scale-balanced text-sky" style="font-size: 2rem; margin-bottom: 8px;"></i>
        <p>Belum ada riwayat harga toko yang tercatat. Masukkan beberapa barang dari toko berbeda untuk melihat komparasi otomatis!</p>
      </div>
    `;
  } else {
    dom.storeComparisonList.innerHTML = itemNames.map(nameKey => {
      const records = history[nameKey];
      const sorted = [...records].sort((a, b) => a.price - b.price);
      const lowestPrice = sorted[0].price;

      const title = nameKey.replace(/\b\w/g, l => l.toUpperCase());

      return `
        <div class="store-compare-item">
          <div class="compare-item-header">
            <span class="compare-item-name">${escapeHtml(title)}</span>
            <span class="badge-category">${records.length} Transaksi Tercatat</span>
          </div>
          <div class="compare-item-stores">
            ${sorted.map(rec => {
              const isCheapest = rec.price === lowestPrice;
              const dateTxt = formatDisplayDate(rec.shoppingDate);
              return `
                <div class="store-price-row ${isCheapest ? 'cheapest' : ''}">
                  <div>
                    <strong>${escapeHtml(rec.store)}</strong>
                    ${dateTxt ? `<small style="display:block; color: var(--text-dim); font-size: 0.65rem;">📅 ${dateTxt}</small>` : ''}
                    ${isCheapest ? '<span class="cheapest-badge">TERMURAH</span>' : ''}
                  </div>
                  <div>
                    <strong>${formatRupiah(rec.price)}</strong>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  if (dom.historyModal) dom.historyModal.classList.add('active');
};

// ========================================================
// 13. PRELOAD REALISTIC DEMO DATA (Studi Kasus Rian - Lotte Mart)
// ========================================================
const loadDemoGroceryData = async () => {
  const sampleData = [
    // 1. Minyak Goreng Sania 2L di Lotte Mart Puri Indah tanggal sebelumnya (Rp 35.000)
    {
      name: "Minyak Goreng Sania 2L",
      store: "Lotte Mart Grocery - Puri Indah",
      storeLocation: "Lotte Mart Grocery - Puri Indah",
      shoppingDate: "2026-11-08",
      category: "Sembako",
      quantity: 1,
      unit: "pcs",
      unitPrice: 35000,
      discount1: 0,
      discount2: 0,
      isBought: true
    },
    // 2. Minyak Goreng Sania 2L di Lotte Mart Puri Indah tanggal hari ini (Rp 38.000 -> Panah Naik ↑)
    {
      name: "Minyak Goreng Sania 2L",
      store: "Lotte Mart Grocery - Puri Indah",
      storeLocation: "Lotte Mart Grocery - Puri Indah",
      shoppingDate: APP_STATE.sessionDate || getTodayDateString(),
      category: "Sembako",
      quantity: 2,
      unit: "pcs",
      unitPrice: 38000,
      discount1: 10,
      discount2: 0,
      isBought: true
    },
    // 3. Susu UHT Ultra Milk 1000ml tanggal sebelumnya di Lotte Mart (Rp 23.500)
    {
      name: "Susu UHT Ultra Milk 1000ml",
      store: "Lotte Mart Grocery - Puri Indah",
      storeLocation: "Lotte Mart Grocery - Puri Indah",
      shoppingDate: "2026-11-05",
      category: "Susu & Olahan",
      quantity: 1,
      unit: "pack",
      unitPrice: 23500,
      discount1: 0,
      discount2: 0,
      isBought: true
    },
    // 4. Susu UHT Ultra Milk 1000ml promo 50%+20% hari ini (Harga turun ↓)
    {
      name: "Susu UHT Ultra Milk 1000ml",
      store: "Lotte Mart Grocery - Puri Indah",
      storeLocation: "Lotte Mart Grocery - Puri Indah",
      shoppingDate: APP_STATE.sessionDate || getTodayDateString(),
      category: "Susu & Olahan",
      quantity: 3,
      unit: "pack",
      unitPrice: 21000,
      discount1: 50,
      discount2: 20, // Diskon ganda bertingkat F-03 (50% + 20%)
      isBought: false
    },
    // 5a. Beras Ramos 5kg tanggal sebelumnya di Lotte Mart (Rp 74.000)
    {
      name: "Beras Premium Ramos 5kg",
      store: "Lotte Mart Grocery - Puri Indah",
      storeLocation: "Lotte Mart Grocery - Puri Indah",
      shoppingDate: "2026-11-01",
      category: "Sembako",
      quantity: 1,
      unit: "pack",
      unitPrice: 74000,
      discount1: 0,
      discount2: 0,
      isBought: true
    },
    // 5b. Beras Ramos 5kg tanggal hari ini di Lotte Mart (Rp 74.000 -> Tanda Setara =)
    {
      name: "Beras Premium Ramos 5kg",
      store: "Lotte Mart Grocery - Puri Indah",
      storeLocation: "Lotte Mart Grocery - Puri Indah",
      shoppingDate: APP_STATE.sessionDate || getTodayDateString(),
      category: "Sembako",
      quantity: 1,
      unit: "pack",
      unitPrice: 74000,
      discount1: 0,
      discount2: 0,
      isBought: true
    },
    // 6. Sabun Cuci Piring di Toko Lain (Superindo)
    {
      name: "Sabun Cuci Piring Sunlight 750ml",
      store: "Superindo",
      storeLocation: "Superindo",
      shoppingDate: "2026-11-12",
      category: "Kebutuhan Rumah",
      quantity: 2,
      unit: "pouch",
      unitPrice: 17500,
      discount1: 20,
      discount2: 0,
      isBought: false
    }
  ];

  showToast('Memuat data contoh belanjaan studi kasus Rian...', 'warning');

  const demoItems = [];
  const now = Date.now();
  sampleData.forEach((item, index) => {
    const discCalc = calculateTieredDiscount(item.unitPrice, item.discount1, item.discount2);
    demoItems.push({
      ...item,
      id: `item_demo_${now}_${index}`,
      walletLimit: APP_STATE.budgetCap,
      discountedUnitPrice: discCalc.finalUnitPrice,
      unitSaved: discCalc.savedUnitPrice,
      subtotal: discCalc.finalUnitPrice * item.quantity,
      totalSaved: discCalc.savedUnitPrice * item.quantity,
      createdAt: now - (index * 1000),
      updatedAt: now
    });
  });

  APP_STATE.items = demoItems;
  saveItemsLocally();
  updatePriceHistoryMap(APP_STATE.items);
  updateBudgetSafetyDisplay();
  renderGroceryList();
  await syncSessionToFirestore();

  showToast('Data contoh belanjaan berhasil dimuat!', 'success');
};

// ========================================================
// 14. EVENT LISTENERS
// ========================================================
const setupEventListeners = () => {
  // Sesi Belanja: Sinkronisasi Lokasi Supermarket di Header (DT2 Criterion 3 & Kustom Lokasi)
  if (dom.headerStoreLocation) {
    dom.headerStoreLocation.value = APP_STATE.sessionStore;
    dom.headerStoreLocation.addEventListener('change', (e) => {
      const val = e.target.value;
      const customWrapper = document.getElementById('customLocationInputWrapper');
      const customInput = document.getElementById('customLocationInput');

      if (val === '__custom__') {
        if (customWrapper) {
          customWrapper.style.display = 'flex';
          if (customInput) {
            customInput.focus();
          }
        }
      } else {
        if (customWrapper) customWrapper.style.display = 'none';
        APP_STATE.sessionStore = val;
        try {
          localStorage.setItem(STORAGE_KEYS.STORE_LOCATION, APP_STATE.sessionStore);
          localStorage.setItem(STORAGE_KEYS.SESSION_STORE, APP_STATE.sessionStore);
        } catch (err) {}
        if (dom.sessionStoreBadge) {
          dom.sessionStoreBadge.textContent = APP_STATE.sessionStore.replace('Grocery - ', '');
        }
        syncConfigToFirestore({
          activeLocation: APP_STATE.sessionStore,
          storeLocation: APP_STATE.sessionStore
        });
        playSound('click');
        showToast(`Lokasi sesi belanja: ${APP_STATE.sessionStore}`, 'success', 2000);
      }
    });
  }

  // Tombol Simpan Lokasi Kustom
  const btnSaveCustomLoc = document.getElementById('btnSaveCustomLocation');
  const customLocInput = document.getElementById('customLocationInput');
  if (btnSaveCustomLoc && customLocInput) {
    btnSaveCustomLoc.addEventListener('click', (e) => {
      e.preventDefault();
      const name = customLocInput.value;
      if (!name || !name.trim()) {
        showToast('Ketik nama toko atau lokasi supermarket kustom terlebih dahulu!', 'warning');
        return;
      }
      addCustomLocation(name);
    });
  }

  // Tombol Batal Lokasi Kustom
  const btnCancelCustomLoc = document.getElementById('btnCancelCustomLocation');
  if (btnCancelCustomLoc) {
    btnCancelCustomLoc.addEventListener('click', (e) => {
      e.preventDefault();
      playSound('click');
      const customWrapper = document.getElementById('customLocationInputWrapper');
      if (customWrapper) customWrapper.style.display = 'none';
      if (dom.headerStoreLocation) dom.headerStoreLocation.value = APP_STATE.sessionStore;
    });
  }

  // Sesi Belanja: Sinkronisasi Tanggal Transaksi di Header (DT2 Criterion 3)
  if (dom.headerShoppingDate) {
    dom.headerShoppingDate.value = APP_STATE.sessionDate;
    dom.headerShoppingDate.addEventListener('change', (e) => {
      APP_STATE.sessionDate = e.target.value;
      try {
        localStorage.setItem(STORAGE_KEYS.SHOPPING_DATE, APP_STATE.sessionDate);
        localStorage.setItem(STORAGE_KEYS.SESSION_DATE, APP_STATE.sessionDate);
      } catch (err) {}
      syncConfigToFirestore({ shoppingDate: APP_STATE.sessionDate });
      playSound('click');
      showToast(`Tanggal transaksi sesi: ${formatDisplayDate(APP_STATE.sessionDate)}`, 'success', 2000);
    });
  }

  // Date Picker FontAwesome Triggers via showPicker()
  const btnCalTrigger = document.getElementById('btnCalTrigger');
  const headerDateInput = document.getElementById('headerShoppingDate');
  if (btnCalTrigger && headerDateInput) {
    btnCalTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      playSound('click');
      if (typeof headerDateInput.showPicker === 'function') {
        try { headerDateInput.showPicker(); } catch (err) { headerDateInput.focus(); }
      } else {
        headerDateInput.focus();
      }
    });
  }

  const btnModalCalTrigger = document.getElementById('btnModalCalTrigger');
  const modalDateInput = document.getElementById('inputShoppingDate');
  if (btnModalCalTrigger && modalDateInput) {
    btnModalCalTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      playSound('click');
      if (typeof modalDateInput.showPicker === 'function') {
        try { modalDateInput.showPicker(); } catch (err) { modalDateInput.focus(); }
      } else {
        modalDateInput.focus();
      }
    });
  }

  // Cegah reload saat menekan Enter di semua form dan input secara ketat
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT')) {
        // Jika input lokasi kustom
        if (target.id === 'customLocationInput') {
          e.preventDefault();
          const btn = document.getElementById('btnSaveCustomLocation');
          if (btn) btn.click();
          return;
        }
        // Jika input pencarian
        if (target.id === 'searchInput') {
          e.preventDefault();
          target.blur();
          return;
        }
        // Jika input kalkulator diskon cepat
        if (['qcPrice', 'qcD1', 'qcD2', 'qcQty'].includes(target.id)) {
          e.preventDefault();
          target.blur();
          return;
        }
        // Jika input budget cap
        if (target.id === 'inputBudgetCapSetting') {
          e.preventDefault();
          const btnSave = document.getElementById('btnSaveBudgetCap');
          if (btnSave) btnSave.click();
          return;
        }
        // Jika input di luar form
        if (!target.form) {
          e.preventDefault();
        }
      }
    }
  });

  // Theme Toggle Button di Header
  const btnToggleTheme = document.getElementById('btnToggleTheme');
  if (btnToggleTheme) {
    btnToggleTheme.addEventListener('click', () => {
      playSound('click');
      const nextTheme = APP_STATE.theme === 'light' ? 'dark' : 'light';
      applyTheme(nextTheme);
      showToast(`Tema ${nextTheme === 'light' ? 'Terang / Putih ☀️' : 'Gelap / Hitam 🌙'} aktif`, 'success', 1500);
    });
  }

  // Pilihan Tema di Modal Pengaturan
  const btnThemeDark = document.getElementById('btnThemeDark');
  const btnThemeLight = document.getElementById('btnThemeLight');
  if (btnThemeDark) {
    btnThemeDark.addEventListener('click', () => {
      playSound('click');
      applyTheme('dark');
      showToast('Tema Gelap / Hitam 🌙 aktif', 'success', 1500);
    });
  }
  if (btnThemeLight) {
    btnThemeLight.addEventListener('click', () => {
      playSound('click');
      applyTheme('light');
      showToast('Tema Terang / Putih ☀️ aktif', 'success', 1500);
    });
  }

  // Sound Toggle Button di Header
  const btnToggleSound = document.getElementById('btnToggleSound');
  if (btnToggleSound) {
    btnToggleSound.addEventListener('click', () => {
      const nextState = !APP_STATE.soundEnabled;
      applySoundState(nextState);
      if (nextState) playSound('click');
      showToast(nextState ? 'Efek suara aktif 🔊' : 'Efek suara dimatikan 🔇', 'success', 1500);
    });
  }

  // Sound Checkbox di Modal Pengaturan
  const soundToggleCheckbox = document.getElementById('soundToggleCheckbox');
  if (soundToggleCheckbox) {
    soundToggleCheckbox.addEventListener('change', (e) => {
      applySoundState(e.target.checked);
      if (e.target.checked) playSound('click');
    });
  }

  // Toggle Discount Accordion
  if (dom.toggleDiscountSection && dom.discountBody) {
    dom.toggleDiscountSection.addEventListener('click', () => {
      const isHidden = dom.discountBody.style.display === 'none';
      dom.discountBody.style.display = isHidden ? 'flex' : 'none';
    });
  }

  // Modal Add Open / Close
  if (dom.btnOpenAddModal) dom.btnOpenAddModal.addEventListener('click', () => { playSound('click'); openAddEditModal(null); });
  if (dom.btnEmptyAdd) dom.btnEmptyAdd.addEventListener('click', () => { playSound('click'); openAddEditModal(null); });
  if (dom.btnCloseModal) dom.btnCloseModal.addEventListener('click', closeModal);
  if (dom.btnCancelModal) dom.btnCancelModal.addEventListener('click', closeModal);

  // Form submit
  if (dom.itemForm) {
    dom.itemForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = dom.editItemId.value;
      const name = (dom.inputItemName.value || '').trim();
      const storeLocation = (dom.inputStoreName.value || '').trim();
      const shoppingDate = (dom.inputShoppingDate ? dom.inputShoppingDate.value : '') || APP_STATE.sessionDate;
      const category = dom.inputCategory.value;
      const quantity = Number(dom.inputQuantity.value) || 1;
      const unit = dom.inputUnit.value;
      const unitPrice = Number(dom.inputUnitPrice.value) || 0;
      const discount1 = Number(dom.inputDiscount1.value) || 0;
      const discount2 = Number(dom.inputDiscount2.value) || 0;

      if (!name || !storeLocation || unitPrice <= 0) {
        showToast('Harap lengkapi nama barang, lokasi toko, dan harga satuan!', 'danger');
        return;
      }

      const discCalc = calculateTieredDiscount(unitPrice, discount1, discount2);

      const itemData = {
        id: id || undefined,
        name,
        store: storeLocation,
        storeLocation: storeLocation,
        shoppingDate: shoppingDate,
        category,
        quantity,
        unit,
        unitPrice,
        discount1,
        discount2,
        discountedUnitPrice: discCalc.finalUnitPrice,
        unitSaved: discCalc.savedUnitPrice,
        subtotal: discCalc.finalUnitPrice * quantity,
        totalSaved: discCalc.savedUnitPrice * quantity,
        isBought: false
      };

      if (id) {
        const existing = APP_STATE.items.find(i => i.id === id);
        if (existing) itemData.isBought = existing.isBought;
      }

      if (dom.btnSubmitItem) {
        dom.btnSubmitItem.disabled = true;
        dom.btnSubmitItem.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
      }

      await saveItem(itemData);

      if (dom.btnSubmitItem) {
        dom.btnSubmitItem.disabled = false;
        dom.btnSubmitItem.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Simpan ke Daftar';
      }
      closeModal();
    });
  }

  // Modal Live Updates on Input
  [dom.inputUnitPrice, dom.inputQuantity, dom.inputDiscount1, dom.inputDiscount2].forEach(input => {
    if (input) input.addEventListener('input', updateModalFormLivePreviews);
  });
  if (dom.inputItemName) dom.inputItemName.addEventListener('input', updateModalFormLivePreviews);
  if (dom.inputStoreName) dom.inputStoreName.addEventListener('input', updateModalFormLivePreviews);
  if (dom.inputShoppingDate) dom.inputShoppingDate.addEventListener('input', updateModalFormLivePreviews);

  // Quick Store Chips
  if (dom.storeChips) {
    dom.storeChips.forEach(chip => {
      chip.addEventListener('click', () => {
        if (dom.inputStoreName) {
          dom.inputStoreName.value = chip.dataset.store;
          updateModalFormLivePreviews();
        }
      });
    });
  }

  // Quantity Stepper di Modal Tambah/Edit
  if (dom.btnQtyMinus) {
    dom.btnQtyMinus.addEventListener('click', () => {
      playSound('click');
      let q = Number(dom.inputQuantity.value) || 1;
      if (q > 1) {
        dom.inputQuantity.value = q - 1;
        updateModalFormLivePreviews();
      }
    });
  }

  if (dom.btnQtyPlus) {
    dom.btnQtyPlus.addEventListener('click', () => {
      playSound('click');
      let q = Number(dom.inputQuantity.value) || 1;
      dom.inputQuantity.value = q + 1;
      updateModalFormLivePreviews();
    });
  }

  // Discount Presets in Modal
  if (dom.presetBtns) {
    dom.presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        playSound('click');
        if (dom.inputDiscount1) dom.inputDiscount1.value = btn.dataset.d1;
        if (dom.inputDiscount2) dom.inputDiscount2.value = btn.dataset.d2;
        updateModalFormLivePreviews();
      });
    });
  }

  // DT2 Kriteria 1: Event delegation untuk stepper - / + 44x44px dan aksi item lainnya
  if (dom.groceryList) {
    dom.groceryList.addEventListener('click', async (e) => {
      const actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;

      const action = actionEl.dataset.action;
      const itemId = actionEl.dataset.id;

      if (action === 'toggle-bought') {
        playSound('success');
        await toggleBoughtStatus(itemId);
      } else if (action === 'delete') {
        if (confirm('Hapus barang ini dari daftar belanja?')) {
          playSound('delete');
          await deleteItem(itemId);
        }
      } else if (action === 'edit') {
        const item = APP_STATE.items.find(i => i.id === itemId);
        if (item) {
          openAddEditModal(item);
        }
      } else if (action === 'decrease-qty') {
        // DT2 Kriteria 1: Tombol - 44x44px langsung update detik itu juga
        playSound('click');
        await updateItemQuantity(itemId, -1);
      } else if (action === 'increase-qty') {
        // DT2 Kriteria 1: Tombol + 44x44px langsung update detik itu juga
        playSound('click');
        await updateItemQuantity(itemId, 1);
      }
    });
  }

  // Filter Tabs
  if (dom.filterTabs) {
    dom.filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        playSound('click');
        dom.filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        APP_STATE.activeFilter = tab.dataset.filter;
        renderGroceryList();
      });
    });
  }

  // Search Box
  if (dom.searchInput) {
    dom.searchInput.addEventListener('input', (e) => {
      APP_STATE.searchQuery = e.target.value;
      if (dom.btnClearSearch) dom.btnClearSearch.classList.toggle('hidden', !e.target.value);
      renderGroceryList();
    });
  }

  if (dom.btnClearSearch) {
    dom.btnClearSearch.addEventListener('click', () => {
      if (dom.searchInput) dom.searchInput.value = '';
      APP_STATE.searchQuery = '';
      dom.btnClearSearch.classList.add('hidden');
      renderGroceryList();
    });
  }

  // Sort Dropdown
  if (dom.sortSelect) {
    dom.sortSelect.addEventListener('change', (e) => {
      APP_STATE.sortBy = e.target.value;
      renderGroceryList();
    });
  }

  // Standalone Quick Discount Calc Modal
  if (dom.btnOpenQuickCalc) {
    dom.btnOpenQuickCalc.addEventListener('click', () => {
      if (dom.quickCalcModal) dom.quickCalcModal.classList.add('active');
      updateQuickCalc();
    });
  }
  if (dom.btnCloseQuickCalc) {
    dom.btnCloseQuickCalc.addEventListener('click', () => {
      if (dom.quickCalcModal) dom.quickCalcModal.classList.remove('active');
    });
  }
  [dom.qcPrice, dom.qcD1, dom.qcD2, dom.qcQty].forEach(inp => {
    if (inp) inp.addEventListener('input', updateQuickCalc);
  });
  if (dom.qcPresets) {
    dom.qcPresets.forEach(btn => {
      btn.addEventListener('click', () => {
        if (dom.qcD1) dom.qcD1.value = btn.dataset.d1;
        if (dom.qcD2) dom.qcD2.value = btn.dataset.d2;
        updateQuickCalc();
      });
    });
  }

  // Store Price Comparison Modal
  if (dom.btnOpenHistory) dom.btnOpenHistory.addEventListener('click', openStoreComparisonModal);
  if (dom.btnCloseHistory) {
    dom.btnCloseHistory.addEventListener('click', () => {
      if (dom.historyModal) dom.historyModal.classList.remove('active');
    });
  }

  // Settings Modal & Budget Safety Cap (DT2 Criterion 2 & 3)
  if (dom.btnOpenSettings) {
    dom.btnOpenSettings.addEventListener('click', () => {
      if (dom.inputBudgetCapSetting) dom.inputBudgetCapSetting.value = APP_STATE.budgetCap;
      if (dom.settingsModal) dom.settingsModal.classList.add('active');
    });
  }
  if (dom.btnQuickEditBudget) {
    dom.btnQuickEditBudget.addEventListener('click', () => {
      if (dom.inputBudgetCapSetting) dom.inputBudgetCapSetting.value = APP_STATE.budgetCap;
      if (dom.settingsModal) dom.settingsModal.classList.add('active');
    });
  }
  if (dom.btnCloseSettings) {
    dom.btnCloseSettings.addEventListener('click', () => {
      if (dom.settingsModal) dom.settingsModal.classList.remove('active');
    });
  }

  // Simpan Batas Anggaran (walletLimit) ke LocalStorage & Cloud Firestore
  if (dom.btnSaveBudgetCap) {
    dom.btnSaveBudgetCap.addEventListener('click', async () => {
      const val = Number(dom.inputBudgetCapSetting.value) || 400000;
      if (val <= 0) {
        showToast('Limit dompet harus lebih besar dari 0!', 'danger');
        return;
      }
      APP_STATE.budgetCap = val;
      try {
        localStorage.setItem(STORAGE_KEYS.BUDGET, val.toString());
        localStorage.setItem(STORAGE_KEYS.WALLET_LIMIT, val.toString());
      } catch (e) {}
      saveItemsLocally();
      updateBudgetSafetyDisplay();
      await syncSessionToFirestore({ walletLimit: val, budgetCap: val, items: APP_STATE.items });
      showToast(`Batas limit dompet berhasil diubah ke ${formatRupiah(val)}!`, 'success');
      if (dom.settingsModal) dom.settingsModal.classList.remove('active');
    });
  }

  // Calc Mode Radio
  const radioModes = document.querySelectorAll('input[name="calcMode"]');
  radioModes.forEach(radio => {
    if (radio.value === APP_STATE.calcMode) radio.checked = true;
    radio.addEventListener('change', (e) => {
      APP_STATE.calcMode = e.target.value;
      try {
        localStorage.setItem(STORAGE_KEYS.CALC_MODE, APP_STATE.calcMode);
      } catch (err) {}
      updateBudgetSafetyDisplay();
      syncSessionToFirestore({ calcMode: APP_STATE.calcMode });
    });
  });

  // Retry / Force Sync
  if (dom.btnRetrySync) dom.btnRetrySync.addEventListener('click', initFirebaseRealtime);
  if (dom.btnForceSync) dom.btnForceSync.addEventListener('click', initFirebaseRealtime);

  // Clear Checked Items
  if (dom.btnClearCheckedItems) {
    dom.btnClearCheckedItems.addEventListener('click', async () => {
      const checked = APP_STATE.items.filter(i => i.isBought);
      if (checked.length === 0) {
        showToast('Tidak ada barang yang sudah dibeli.', 'warning');
        return;
      }
      if (confirm(`Bersihkan ${checked.length} barang yang sudah dibeli dari daftar?`)) {
        APP_STATE.items = APP_STATE.items.filter(i => !i.isBought);
        saveItemsLocally();
        updatePriceHistoryMap(APP_STATE.items);
        updateBudgetSafetyDisplay();
        renderGroceryList();
        await syncSessionToFirestore();
        showToast('Barang yang sudah dibeli telah dibersihkan!', 'success');
        if (dom.settingsModal) dom.settingsModal.classList.remove('active');
      }
    });
  }

  // Reset All Data
  if (dom.btnResetAllData) {
    dom.btnResetAllData.addEventListener('click', async () => {
      if (confirm('PERINGATAN: Apakah Anda yakin ingin menghapus SEMUA data belanjaan? Tindakan ini tidak dapat dibatalkan.')) {
        APP_STATE.items = [];
        APP_STATE.priceHistory = {};
        try {
          localStorage.removeItem(STORAGE_KEYS.ITEMS);
          localStorage.removeItem(STORAGE_KEYS.PRICE_HISTORY);
        } catch (e) {}
        updateBudgetSafetyDisplay();
        renderGroceryList();
        await syncSessionToFirestore({ items: [] });
        showToast('Semua data berhasil dibersihkan!', 'success');
        if (dom.settingsModal) dom.settingsModal.classList.remove('active');
      }
    });
  }

  // Demo Data Button
  if (dom.btnLoadDemoData) dom.btnLoadDemoData.addEventListener('click', loadDemoGroceryData);

  // Close Modals on Overlay Click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  });

  // Window Online / Offline Events
  window.addEventListener('online', () => {
    APP_STATE.isOnline = true;
    showToast('Koneksi internet kembali aktif!', 'success');
    initFirebaseRealtime();
  });

  window.addEventListener('offline', () => {
    APP_STATE.isOnline = false;
    showToast('Koneksi internet terputus. Mode offline aktif.', 'warning');
    setConnectionStatus('offline', 'Mode Offline (LocalStorage)');
  });
};

// ========================================================
// 15. SERVICE WORKER REGISTRATION (PWA)
// ========================================================
const registerServiceWorker = () => {
  if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('[PWA] Service Worker terdaftar:', reg.scope))
        .catch(err => console.warn('[PWA] Service Worker gagal didaftarkan:', err));
    });
  }
};

// ========================================================
// 16. APPLICATION BOOTSTRAP (Langsung Aktif Seketika)
// ========================================================
const startApp = () => {
  // 1. Inisialisasi referensi elemen DOM
  initDom();

  // 2. Inisialisasi tema dan audio sound effects
  initTheme();
  initSound();

  // 3. Muat lokasi kustom & perbarui dropdown serta quick chips
  loadCustomLocations();
  refreshLocationDropdown();
  refreshStoreChips();

  // 4. Muat cache LocalStorage untuk tampilan instan tanpa lag saat ditekan F5
  loadItemsFromLocalStorage();

  // 5. Pasang SEMUA event listener tombol
  setupEventListeners();

  // 6. Update tampilan sesi header aktif & input pengaturan
  if (dom.headerStoreLocation) dom.headerStoreLocation.value = APP_STATE.sessionStore;
  if (dom.headerShoppingDate) dom.headerShoppingDate.value = APP_STATE.sessionDate;
  if (dom.inputBudgetCapSetting) dom.inputBudgetCapSetting.value = APP_STATE.budgetCap;
  if (dom.sessionStoreBadge) dom.sessionStoreBadge.textContent = APP_STATE.sessionStore.replace('Grocery - ', '');

  // 7. Update data list, kalkulasi anggaran dan render daftar belanja
  updatePriceHistoryMap(APP_STATE.items);
  updateBudgetSafetyDisplay();
  renderGroceryList();

  // 8. Daftarkan Service Worker PWA jika didukung protokol
  registerServiceWorker();

  // 9. Hubungkan ke Cloud Firestore Realtime (Compat) & Sinkronisasi metadata
  initFirebaseRealtime();
};

// Jalankan aplikasi begitu dokumen siap
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}

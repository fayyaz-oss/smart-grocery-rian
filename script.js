/**
 * Smart Grocery & Budget Safety Tracker
 * Realtime Cloud Firestore (Compat SDK) + LocalStorage Fallback
 * Berjalan langsung di file:/// maupun di Web Server
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

// Global App State
const APP_STATE = {
  isOnline: navigator.onLine,
  isFirestoreActive: false,
  items: [],
  budgetCap: 400000, // Default Rp 400.000 (F-05)
  calcMode: 'all', // 'all' or 'boughtOnly'
  activeFilter: 'all', // 'all', 'unbought', 'bought'
  searchQuery: '',
  sortBy: 'newest',
  priceHistory: {}, // { "itemNameLowercase": [ { store, price, date } ] }
};

// LocalStorage Keys
const STORAGE_KEYS = {
  ITEMS: 'smart_grocery_items_v1',
  BUDGET: 'smart_grocery_budget_cap',
  CALC_MODE: 'smart_grocery_calc_mode',
  PRICE_HISTORY: 'smart_grocery_price_history'
};

// Firebase References
let db = null;
let unsubscribeSnapshot = null;

// DOM Elements cache
let dom = {};

const initDom = () => {
  dom = {
    // Connection Banner
    connectionBanner: document.getElementById('connectionBanner'),
    connectionText: document.getElementById('connectionText'),
    btnRetrySync: document.getElementById('btnRetrySync'),
    
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
// 5. F-04: STORE PRICE COMPARATOR LOGIC (Riwayat Toko)
// ========================================================
const updatePriceHistoryMap = (items) => {
  const history = {};

  items.forEach(item => {
    if (!item.name || !item.store || !item.unitPrice) return;
    const cleanName = item.name.trim().toLowerCase();

    if (!history[cleanName]) {
      history[cleanName] = [];
    }

    const existingIndex = history[cleanName].findIndex(h => h.store.toLowerCase() === item.store.toLowerCase());
    const record = {
      store: item.store.trim(),
      price: Number(item.unitPrice),
      discountedPrice: item.discountedUnitPrice || Number(item.unitPrice),
      date: item.createdAt ? (item.createdAt.seconds ? item.createdAt.seconds * 1000 : item.createdAt) : Date.now()
    };

    if (existingIndex >= 0) {
      history[cleanName][existingIndex] = record;
    } else {
      history[cleanName].push(record);
    }
  });

  APP_STATE.priceHistory = history;
  try {
    localStorage.setItem(STORAGE_KEYS.PRICE_HISTORY, JSON.stringify(history));
  } catch (e) {}
  updateDatalistHistory();
};

const compareStorePrice = (itemName, currentStore, currentPrice) => {
  if (!itemName || !currentPrice) {
    return { status: 'none', message: 'Ketik nama barang dan harga untuk melihat perbandingan.' };
  }

  const cleanName = itemName.trim().toLowerCase();
  const historyList = APP_STATE.priceHistory[cleanName] || [];

  const otherStores = historyList.filter(h => h.store.toLowerCase() !== (currentStore || '').trim().toLowerCase());

  if (otherStores.length === 0) {
    const sameStore = historyList.find(h => h.store.toLowerCase() === (currentStore || '').trim().toLowerCase());
    if (sameStore && sameStore.price !== currentPrice) {
      const diff = currentPrice - sameStore.price;
      if (diff < 0) {
        return {
          status: 'cheaper',
          arrow: '🔻',
          diffAmount: Math.abs(diff),
          comparedStore: sameStore.store,
          comparedPrice: sameStore.price,
          message: `Turun ${formatRupiah(Math.abs(diff))} dibanding harga sebelumnya di ${sameStore.store} (${formatRupiah(sameStore.price)})`
        };
      } else {
        return {
          status: 'expensive',
          arrow: '🔺',
          diffAmount: diff,
          comparedStore: sameStore.store,
          comparedPrice: sameStore.price,
          message: `Naik ${formatRupiah(diff)} dibanding harga sebelumnya di ${sameStore.store} (${formatRupiah(sameStore.price)})`
        };
      }
    }
    return {
      status: 'new',
      arrow: '🆕',
      message: `Toko pertama yang dicatat untuk barang "${itemName}".`
    };
  }

  const lowestOther = otherStores.reduce((min, curr) => curr.price < min.price ? curr : min, otherStores[0]);
  const diff = currentPrice - lowestOther.price;

  if (diff < 0) {
    return {
      status: 'cheaper',
      arrow: '🔻',
      diffAmount: Math.abs(diff),
      comparedStore: lowestOther.store,
      comparedPrice: lowestOther.price,
      message: `Lebih Hemat ${formatRupiah(Math.abs(diff))} dibanding di ${lowestOther.store} (${formatRupiah(lowestOther.price)})`
    };
  } else if (diff > 0) {
    return {
      status: 'expensive',
      arrow: '🔺',
      diffAmount: diff,
      comparedStore: lowestOther.store,
      comparedPrice: lowestOther.price,
      message: `Lebih Mahal ${formatRupiah(diff)} dibanding di ${lowestOther.store} (${formatRupiah(lowestOther.price)})`
    };
  } else {
    return {
      status: 'stable',
      arrow: '⏺️',
      diffAmount: 0,
      comparedStore: lowestOther.store,
      comparedPrice: lowestOther.price,
      message: `Harga sama dengan di ${lowestOther.store} (${formatRupiah(lowestOther.price)})`
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
// 6. F-05: SAFETY CAP & BUDGET TRACKER LOGIC
// ========================================================
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

    if (percentage < 75) {
      dom.safetyCapSection.classList.add('safe');
      dom.budgetProgressBar.classList.add('safe');
      dom.safetyAlertBox.classList.add('safe');
      dom.remainingBalanceDisplay.classList.add('balance-safe');

      if (dom.safetyAlertIcon) dom.safetyAlertIcon.className = 'fa-solid fa-circle-check status-icon';
      if (dom.safetyAlertTitle) dom.safetyAlertTitle.textContent = 'Anggaran Sangat Aman';
      if (dom.safetyAlertDesc) dom.safetyAlertDesc.textContent = `Pengeluaran Anda baru ${percentage.toFixed(1)}% dari limit. Sisa aman: ${formatRupiah(remaining)}.`;

    } else if (percentage >= 75 && percentage < 100) {
      dom.safetyCapSection.classList.add('warning');
      dom.budgetProgressBar.classList.add('warning');
      dom.safetyAlertBox.classList.add('warning');
      dom.remainingBalanceDisplay.classList.add('balance-warn');

      if (dom.safetyAlertIcon) dom.safetyAlertIcon.className = 'fa-solid fa-triangle-exclamation status-icon';
      if (dom.safetyAlertTitle) dom.safetyAlertTitle.textContent = 'Mendekati Batas Limit!';
      if (dom.safetyAlertDesc) dom.safetyAlertDesc.textContent = `Perhatian: Anda telah menggunakan ${percentage.toFixed(1)}% dari limit dompet. Sisa saldo hanya tersisa ${formatRupiah(remaining)}.`;

    } else {
      dom.safetyCapSection.classList.add('danger');
      dom.budgetProgressBar.classList.add('danger');
      dom.safetyAlertBox.classList.add('danger');
      dom.remainingBalanceDisplay.classList.add('balance-danger');

      if (dom.safetyAlertIcon) dom.safetyAlertIcon.className = 'fa-solid fa-bell-slash status-icon';
      if (dom.safetyAlertTitle) dom.safetyAlertTitle.textContent = '🚨 OVERBUDGET! Batas Terlampaui';
      if (dom.safetyAlertDesc) dom.safetyAlertDesc.textContent = `Total belanja melebihi batas anggaran sebesar ${formatRupiah(Math.abs(remaining))}! Harap kurangi belanjaan atau sesuaikan limit dompet.`;
    }
  }
};

// ========================================================
// 7. GROCERY LIST RENDERING (F-01, F-02, F-03, F-04)
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

    const compareRes = compareStorePrice(item.name, item.store, item.unitPrice);
    let compareBadgeHtml = '';

    if (compareRes.status === 'cheaper') {
      compareBadgeHtml = `
        <div class="comparator-tag-badge cheaper" title="${escapeHtml(compareRes.message)}">
          <i class="fa-solid fa-arrow-trend-down"></i>
          <span>🔻 Turun ${formatRupiah(compareRes.diffAmount)} vs ${escapeHtml(compareRes.comparedStore)}</span>
        </div>
      `;
    } else if (compareRes.status === 'expensive') {
      compareBadgeHtml = `
        <div class="comparator-tag-badge expensive" title="${escapeHtml(compareRes.message)}">
          <i class="fa-solid fa-arrow-trend-up"></i>
          <span>🔺 Naik ${formatRupiah(compareRes.diffAmount)} vs ${escapeHtml(compareRes.comparedStore)}</span>
        </div>
      `;
    } else if (compareRes.status === 'stable') {
      compareBadgeHtml = `
        <div class="comparator-tag-badge stable" title="${escapeHtml(compareRes.message)}">
          <i class="fa-solid fa-equals"></i>
          <span>⏺️ Sama dg ${escapeHtml(compareRes.comparedStore)}</span>
        </div>
      `;
    } else if (compareRes.status === 'new') {
      compareBadgeHtml = `
        <div class="comparator-tag-badge new" title="${escapeHtml(compareRes.message)}">
          <i class="fa-solid fa-sparkles"></i>
          <span>🆕 Toko Pertama</span>
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
                <i class="fa-solid fa-shop"></i> ${escapeHtml(item.store || 'Toko')}
              </span>
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

        <div class="card-row-bottom">
          <span class="subtotal-label">Subtotal</span>
          <span class="subtotal-amount">${subtotalDisplay}</span>
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
// 8. CRUD OPERATIONS (Firestore Realtime + LocalStorage)
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
    const savedCap = localStorage.getItem(STORAGE_KEYS.BUDGET);
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
  } catch (err) {
    console.error('Error loading LocalStorage:', err);
  }
};

/**
 * Add or Update Grocery Item
 */
const saveItem = async (itemData) => {
  const isEditing = Boolean(itemData.id);

  if (APP_STATE.isFirestoreActive && db) {
    try {
      const serverTimestamp = (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue)
        ? firebase.firestore.FieldValue.serverTimestamp()
        : Date.now();

      if (isEditing) {
        const { id, ...updateData } = itemData;
        updateData.updatedAt = serverTimestamp;
        await db.collection('groceries').doc(itemData.id).update(updateData);
        showToast('Barang berhasil diperbarui di Cloud!', 'success');
      } else {
        const createData = {
          ...itemData,
          createdAt: serverTimestamp,
          updatedAt: serverTimestamp
        };
        await db.collection('groceries').add(createData);
        showToast('Barang berhasil ditambahkan ke Firestore!', 'success');
      }
      return;
    } catch (err) {
      console.warn('Firestore write failed, falling back to LocalStorage:', err);
      showToast('Gagal sinkron Cloud, disimpan ke LocalStorage', 'warning');
      setConnectionStatus(false, 'Mode Offline (LocalStorage)');
    }
  }

  // LocalStorage Fallback
  if (isEditing) {
    const index = APP_STATE.items.findIndex(i => i.id === itemData.id);
    if (index >= 0) {
      APP_STATE.items[index] = { ...itemData, updatedAt: Date.now() };
    }
  } else {
    const newItem = {
      ...itemData,
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    APP_STATE.items.unshift(newItem);
  }

  saveItemsLocally();
  updatePriceHistoryMap(APP_STATE.items);
  updateBudgetSafetyDisplay();
  renderGroceryList();
  showToast(isEditing ? 'Barang diperbarui (Lokal)' : 'Barang ditambahkan (Lokal)', 'success');
};

/**
 * Delete Item
 */
const deleteItem = async (itemId) => {
  if (APP_STATE.isFirestoreActive && db && !itemId.startsWith('local_')) {
    try {
      await db.collection('groceries').doc(itemId).delete();
      showToast('Barang dihapus dari Cloud!', 'success');
      return;
    } catch (err) {
      console.warn('Firestore delete failed, deleting locally:', err);
    }
  }

  APP_STATE.items = APP_STATE.items.filter(i => i.id !== itemId);
  saveItemsLocally();
  updatePriceHistoryMap(APP_STATE.items);
  updateBudgetSafetyDisplay();
  renderGroceryList();
  showToast('Barang berhasil dihapus!', 'success');
};

/**
 * Toggle Bought Status
 */
const toggleBoughtStatus = async (itemId) => {
  const item = APP_STATE.items.find(i => i.id === itemId);
  if (!item) return;

  const newStatus = !item.isBought;

  if (APP_STATE.isFirestoreActive && db && !itemId.startsWith('local_')) {
    try {
      const serverTimestamp = (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue)
        ? firebase.firestore.FieldValue.serverTimestamp()
        : Date.now();

      await db.collection('groceries').doc(itemId).update({
        isBought: newStatus,
        updatedAt: serverTimestamp
      });
      return;
    } catch (err) {
      console.warn('Firestore status toggle failed:', err);
    }
  }

  item.isBought = newStatus;
  saveItemsLocally();
  updateBudgetSafetyDisplay();
  renderGroceryList();
};

// ========================================================
// 9. FIREBASE REALTIME INITIALIZATION & LISTENER (Compat SDK)
// ========================================================
const setConnectionStatus = (isCloud, text) => {
  if (dom.connectionBanner) {
    dom.connectionBanner.className = `connection-banner ${isCloud ? 'online' : 'offline'}`;
  }
  if (dom.connectionText) {
    dom.connectionText.textContent = text;
  }
  if (dom.settingsSyncText) {
    dom.settingsSyncText.textContent = isCloud ? '🟢 Terhubung ke Cloud Firestore' : '🟡 Mode Offline / LocalStorage';
  }
  APP_STATE.isFirestoreActive = isCloud;
};

const initFirebaseRealtime = async () => {
  setConnectionStatus(false, 'Menghubungkan ke Cloud Firestore...');

  try {
    if (typeof firebase === 'undefined' || !firebase.initializeApp) {
      console.warn('Firebase SDK compat belum termuat. Menjalankan mode LocalStorage.');
      setConnectionStatus(false, 'Mode Offline (LocalStorage)');
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

    // Setup Realtime Listener via onSnapshot
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
    }

    unsubscribeSnapshot = db.collection('groceries')
      .orderBy('createdAt', 'desc')
      .onSnapshot((snapshot) => {
        const liveItems = [];
        snapshot.forEach(docSnap => {
          liveItems.push({
            id: docSnap.id,
            ...docSnap.data()
          });
        });

        APP_STATE.items = liveItems;
        saveItemsLocally(); // Cache to LocalStorage for offline fallback
        updatePriceHistoryMap(APP_STATE.items);
        updateBudgetSafetyDisplay();
        renderGroceryList();
        setConnectionStatus(true, 'Realtime Cloud Firestore Aktif');
      }, (error) => {
        console.warn('Firestore onSnapshot error, falling back to LocalStorage:', error);
        setConnectionStatus(false, 'Mode Offline (LocalStorage) - Firestore Error');
        loadItemsFromLocalStorage();
        updatePriceHistoryMap(APP_STATE.items);
        updateBudgetSafetyDisplay();
        renderGroceryList();
      });

  } catch (err) {
    console.error('Failed to initialize Firebase:', err);
    setConnectionStatus(false, 'Mode Offline (LocalStorage)');
    loadItemsFromLocalStorage();
    updatePriceHistoryMap(APP_STATE.items);
    updateBudgetSafetyDisplay();
    renderGroceryList();
  }
};

// ========================================================
// 10. MODAL FORM CONTROLS & LIVE CALCULATIONS
// ========================================================
const updateModalFormLivePreviews = () => {
  if (!dom.inputUnitPrice) return;

  const price = Number(dom.inputUnitPrice.value) || 0;
  const qty = Number(dom.inputQuantity.value) || 1;
  const d1 = Number(dom.inputDiscount1.value) || 0;
  const d2 = Number(dom.inputDiscount2.value) || 0;
  const itemName = (dom.inputItemName.value || '').trim();
  const storeName = (dom.inputStoreName.value || '').trim();

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

  // F-04: Live Store Price Comparator Preview in Form
  if (dom.compareBadgeStatus && dom.compareBodyText) {
    const compare = compareStorePrice(itemName, storeName, price);
    dom.compareBadgeStatus.className = `comparator-badge ${compare.status}`;

    if (compare.status === 'cheaper') {
      dom.compareBadgeStatus.textContent = '🔻 Lebih Murah';
      dom.compareBodyText.innerHTML = `<strong>Kabar Baik!</strong> Harga di <strong>${escapeHtml(storeName || 'Toko ini')}</strong> (${formatRupiah(price)}) lebih hemat <strong>${formatRupiah(compare.diffAmount)}</strong> dibanding di ${escapeHtml(compare.comparedStore)} (${formatRupiah(compare.comparedPrice)}).`;
    } else if (compare.status === 'expensive') {
      dom.compareBadgeStatus.textContent = '🔺 Lebih Mahal';
      dom.compareBodyText.innerHTML = `<strong>Perhatian:</strong> Di ${escapeHtml(compare.comparedStore)}, barang ini pernah tercatat seharga <strong>${formatRupiah(compare.comparedPrice)}</strong> (${formatRupiah(compare.diffAmount)} lebih murah dari toko ini).`;
    } else if (compare.status === 'stable') {
      dom.compareBadgeStatus.textContent = '⏺️ Harga Sama';
      dom.compareBodyText.innerHTML = `Harga sama persis dengan riwayat di <strong>${escapeHtml(compare.comparedStore)}</strong> (${formatRupiah(compare.comparedPrice)}).`;
    } else if (compare.status === 'new') {
      dom.compareBadgeStatus.textContent = '🆕 Toko Pertama';
      dom.compareBodyText.textContent = `Ini toko pertama untuk "${itemName}". Harga akan otomatis disimpan ke database komparator.`;
    } else {
      dom.compareBadgeStatus.textContent = 'Mengecek...';
      dom.compareBodyText.textContent = 'Ketik nama barang dan harga untuk melihat perbandingan dengan toko lain sebelumnya.';
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
    dom.inputStoreName.value = itemToEdit.store || '';
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
            <span class="badge-category">${records.length} Toko Tercatat</span>
          </div>
          <div class="compare-item-stores">
            ${sorted.map(rec => {
              const isCheapest = rec.price === lowestPrice;
              return `
                <div class="store-price-row ${isCheapest ? 'cheapest' : ''}">
                  <div>
                    <strong>${escapeHtml(rec.store)}</strong>
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
// 13. PRELOAD REALISTIC DEMO DATA (Instant Testing)
// ========================================================
const loadDemoGroceryData = async () => {
  const sampleData = [
    {
      name: "Minyak Goreng Sania 2L",
      store: "Superindo",
      category: "Sembako",
      quantity: 2,
      unit: "pcs",
      unitPrice: 38000,
      discount1: 20,
      discount2: 0,
      isBought: true
    },
    {
      name: "Susu UHT Ultra Milk 1000ml",
      store: "Indomaret",
      category: "Susu & Olahan",
      quantity: 3,
      unit: "pack",
      unitPrice: 22500,
      discount1: 50,
      discount2: 20, // Tiered discount test (50% + 20%)
      isBought: false
    },
    {
      name: "Beras Premium Ramos 5kg",
      store: "Alfamart",
      category: "Sembako",
      quantity: 1,
      unit: "pack",
      unitPrice: 74000,
      discount1: 10,
      discount2: 0,
      isBought: true
    },
    {
      name: "Sabun Cuci Piring Sunlight 750ml",
      store: "Superindo",
      category: "Kebutuhan Rumah",
      quantity: 2,
      unit: "pouch",
      unitPrice: 17500,
      discount1: 50,
      discount2: 10, // Tiered discount test (50% + 10%)
      isBought: false
    },
    {
      name: "Daging Sapi Rendang 500gr",
      store: "Pasar Modern",
      category: "Daging & Ikan",
      quantity: 1,
      unit: "pack",
      unitPrice: 70000,
      discount1: 0,
      discount2: 0,
      isBought: false
    }
  ];

  showToast('Memuat data contoh belanjaan...', 'warning');

  for (const item of sampleData) {
    const discCalc = calculateTieredDiscount(item.unitPrice, item.discount1, item.discount2);
    const itemToSave = {
      ...item,
      discountedUnitPrice: discCalc.finalUnitPrice,
      unitSaved: discCalc.savedUnitPrice,
      subtotal: discCalc.finalUnitPrice * item.quantity,
      totalSaved: discCalc.savedUnitPrice * item.quantity
    };
    await saveItem(itemToSave);
  }

  showToast('5 Data contoh belanjaan berhasil dimuat!', 'success');
};

// ========================================================
// 14. EVENT LISTENERS
// ========================================================
const setupEventListeners = () => {
  // Toggle Discount Accordion
  if (dom.toggleDiscountSection && dom.discountBody) {
    dom.toggleDiscountSection.addEventListener('click', () => {
      const isHidden = dom.discountBody.style.display === 'none';
      dom.discountBody.style.display = isHidden ? 'flex' : 'none';
    });
  }

  // Modal Add Open / Close
  if (dom.btnOpenAddModal) dom.btnOpenAddModal.addEventListener('click', () => openAddEditModal(null));
  if (dom.btnEmptyAdd) dom.btnEmptyAdd.addEventListener('click', () => openAddEditModal(null));
  if (dom.btnCloseModal) dom.btnCloseModal.addEventListener('click', closeModal);
  if (dom.btnCancelModal) dom.btnCancelModal.addEventListener('click', closeModal);

  // Form submit
  if (dom.itemForm) {
    dom.itemForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = dom.editItemId.value;
      const name = (dom.inputItemName.value || '').trim();
      const store = (dom.inputStoreName.value || '').trim();
      const category = dom.inputCategory.value;
      const quantity = Number(dom.inputQuantity.value) || 1;
      const unit = dom.inputUnit.value;
      const unitPrice = Number(dom.inputUnitPrice.value) || 0;
      const discount1 = Number(dom.inputDiscount1.value) || 0;
      const discount2 = Number(dom.inputDiscount2.value) || 0;

      if (!name || !store || unitPrice <= 0) {
        showToast('Harap lengkapi nama barang, toko, dan harga satuan!', 'danger');
        return;
      }

      const discCalc = calculateTieredDiscount(unitPrice, discount1, discount2);

      const itemData = {
        id: id || undefined,
        name,
        store,
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

  // Quantity Stepper
  if (dom.btnQtyMinus) {
    dom.btnQtyMinus.addEventListener('click', () => {
      let q = Number(dom.inputQuantity.value) || 1;
      if (q > 1) {
        dom.inputQuantity.value = q - 1;
        updateModalFormLivePreviews();
      }
    });
  }

  if (dom.btnQtyPlus) {
    dom.btnQtyPlus.addEventListener('click', () => {
      let q = Number(dom.inputQuantity.value) || 1;
      dom.inputQuantity.value = q + 1;
      updateModalFormLivePreviews();
    });
  }

  // Discount Presets in Modal
  if (dom.presetBtns) {
    dom.presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (dom.inputDiscount1) dom.inputDiscount1.value = btn.dataset.d1;
        if (dom.inputDiscount2) dom.inputDiscount2.value = btn.dataset.d2;
        updateModalFormLivePreviews();
      });
    });
  }

  // Grocery List Item Action Delegations (Checkbox, Edit, Delete)
  if (dom.groceryList) {
    dom.groceryList.addEventListener('click', async (e) => {
      const actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;

      const action = actionEl.dataset.action;
      const itemId = actionEl.dataset.id;

      if (action === 'toggle-bought') {
        await toggleBoughtStatus(itemId);
      } else if (action === 'delete') {
        if (confirm('Hapus barang ini dari daftar belanja?')) {
          await deleteItem(itemId);
        }
      } else if (action === 'edit') {
        const item = APP_STATE.items.find(i => i.id === itemId);
        if (item) {
          openAddEditModal(item);
        }
      }
    });
  }

  // Filter Tabs
  if (dom.filterTabs) {
    dom.filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
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

  // Settings Modal & Budget Safety Cap (F-05)
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

  if (dom.btnSaveBudgetCap) {
    dom.btnSaveBudgetCap.addEventListener('click', () => {
      const val = Number(dom.inputBudgetCapSetting.value) || 400000;
      if (val <= 0) {
        showToast('Limit anggaran harus lebih besar dari 0!', 'danger');
        return;
      }
      APP_STATE.budgetCap = val;
      try {
        localStorage.setItem(STORAGE_KEYS.BUDGET, val.toString());
      } catch (e) {}
      updateBudgetSafetyDisplay();
      showToast(`Batas anggaran berhasil diubah ke ${formatRupiah(val)}!`, 'success');
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
        for (const item of checked) {
          await deleteItem(item.id);
        }
        showToast('Barang yang sudah dibeli telah dibersihkan!', 'success');
        if (dom.settingsModal) dom.settingsModal.classList.remove('active');
      }
    });
  }

  // Reset All Data
  if (dom.btnResetAllData) {
    dom.btnResetAllData.addEventListener('click', async () => {
      if (confirm('PERINGATAN: Apakah Anda yakin ingin menghapus SEMUA data belanjaan? Tindakan ini tidak dapat dibatalkan.')) {
        const allIds = APP_STATE.items.map(i => i.id);
        for (const id of allIds) {
          await deleteItem(id);
        }
        try {
          localStorage.removeItem(STORAGE_KEYS.ITEMS);
          localStorage.removeItem(STORAGE_KEYS.PRICE_HISTORY);
        } catch (e) {}
        APP_STATE.items = [];
        APP_STATE.priceHistory = {};
        updateBudgetSafetyDisplay();
        renderGroceryList();
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
    setConnectionStatus(false, 'Mode Offline (LocalStorage)');
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

  // 2. Pasang SEMUA event listener tombol terlebih dahulu
  setupEventListeners();

  // 3. Muat cache LocalStorage untuk tampilan instan tanpa lag
  loadItemsFromLocalStorage();
  updatePriceHistoryMap(APP_STATE.items);
  updateBudgetSafetyDisplay();
  renderGroceryList();

  // 4. Daftarkan Service Worker PWA jika didukung protokol
  registerServiceWorker();

  // 5. Hubungkan ke Cloud Firestore Realtime (Compat)
  initFirebaseRealtime();
};

// Jalankan aplikasi begitu dokumen siap
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}

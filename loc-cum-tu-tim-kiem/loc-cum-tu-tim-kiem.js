// =========================================================================
// HELPER UTILITIES
// =========================================================================
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.innerText = message;
  toast.className = 'toast show' + (isError ? ' error' : '');
  clearTimeout(window.__toastTimeout);
  window.__toastTimeout = setTimeout(() => {
    toast.className = 'toast';
  }, 3500);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatCurrency(val) {
  if (isNaN(val) || val === null) return '0₫';
  return Number(val).toLocaleString('vi-VN') + '₫';
}

// =========================================================================
// SEARCH TERMS INTELLIGENCE & MULTI-ACCOUNT ENGINE
// =========================================================================
let allSearchTermsData = []; // Array of { account, campaign, adGroup, term, headline, url, clicks, impressions, ctr, cost, conv, urlType, product }
let activeProductFilter = 'auto'; // 'auto', 'Shopee', 'Traveloka', 'Trip'
// Khởi tạo danh sách từ khóa phủ định (Ưu tiên phục hồi từ LocalStorage)
let stNegativeKeywords = new Set();
try {
  const savedKw = localStorage.getItem('google_ads_saved_neg_keywords');
  if (savedKw) {
    const list = JSON.parse(savedKw);
    if (Array.isArray(list)) stNegativeKeywords = new Set(list);
  }
} catch (e) {}

function saveNegativeKeywordsState() {
  try {
    localStorage.setItem('google_ads_saved_neg_keywords', JSON.stringify(Array.from(stNegativeKeywords)));
  } catch (e) {}
}

// Khởi tạo URL phủ định mặc định từ bộ URL chuẩn (đã lọc lấy 'URL bằng')
let stNegativeUrls = new Set(
  (typeof window !== 'undefined' && Array.isArray(window.DEFAULT_STANDARD_NEGATIVE_URLS))
    ? window.DEFAULT_STANDARD_NEGATIVE_URLS
    : []
);
try {
  const savedUrls = localStorage.getItem('google_ads_saved_neg_urls');
  if (savedUrls) {
    const list = JSON.parse(savedUrls);
    if (Array.isArray(list)) {
      list.forEach(u => stNegativeUrls.add(u));
    }
  }
} catch (e) {}

function saveNegativeUrlsState() {
  try {
    localStorage.setItem('google_ads_saved_neg_urls', JSON.stringify(Array.from(stNegativeUrls)));
  } catch (e) {}
}
let ngramSelectedWords = new Set();
let currentNgramType = 1; // 1, 2, 3, or 4 (4+)
let ngramCurrentPage = 1;
let ngramSortColumn = 'clicks';
let ngramSortOrder = 'desc'; // 'asc' or 'desc'
let rawCurrentPage = 1;

// Pagination & Header Sorting state for Tab 1 (URL Discovery)
let urlCurrentPage = 1;
let urlSortColumn = 'clicks';
let urlSortOrder = 'desc'; // 'asc' or 'desc'
let urlViewMode = 'structure'; // 'structure' (Gom nhóm lên Camp) or 'single' (Chi tiết từng URL đơn lẻ)
let urlDrillDownFilter = ''; // Filter by specific structure when clicking drill-down

// Từ điển dịch nhanh đa ngôn ngữ: Indonesia & Tiếng Trung Phồn thể/Giản thể -> Tiếng Việt
// Tích hợp từ Trung tâm Dữ liệu Dùng chung (shared/js/)
const idToViDict = (typeof window !== 'undefined' && window.ID_TO_VI_DICT && window.ZH_TO_VI_DICT)
  ? Object.assign({}, window.ID_TO_VI_DICT, window.ZH_TO_VI_DICT)
  : (typeof window !== 'undefined' && window.ID_TO_VI_DICT)
    ? Object.assign({}, window.ID_TO_VI_DICT)
    : {};

function translateNgramWord(phrase, elementId = null) {
  if (!phrase) return '-';
  const trimmed = phrase.trim();
  if (translationCache[trimmed]) {
    return translationCache[trimmed];
  }
  if (elementId) {
    fetchGoogleTranslation(trimmed, elementId);
  }
  // Thử khớp nguyên cụm trong từ điển trước
  const directHit = idToViDict[trimmed] || idToViDict[trimmed.toLowerCase()];
  if (directHit) return directHit;

  // Tách từ theo khoảng trắng
  const words = trimmed.split(/\s+/);
  const translatedParts = words.map(w => {
    const lower = w.toLowerCase();
    return idToViDict[w] || idToViDict[lower] || w;
  });
  const hasTrans = words.some(w => !!idToViDict[w] || !!idToViDict[w.toLowerCase()]);
  return hasTrans ? translatedParts.join(' ') : trimmed;
}

// =========================================================================
// BỘ DỊCH THUẬT ĐA NĂNG (HYBRID TRANSLATION ENGINE: LOCAL DICT + GOOGLE TRANSLATE)
// =========================================================================
const TRANSLATION_CACHE_KEY = 'google_ads_translation_cache_v1';
let translationCache = {};
try {
  const saved = localStorage.getItem(TRANSLATION_CACHE_KEY);
  if (saved) translationCache = JSON.parse(saved);
} catch (e) {
  translationCache = {};
}

function saveTranslationCache() {
  try {
    localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(translationCache));
  } catch (e) {
    // Quota exceeded: clean oldest entries
    const keys = Object.keys(translationCache);
    if (keys.length > 500) {
      const half = keys.slice(250);
      const newCache = {};
      half.forEach(k => newCache[k] = translationCache[k]);
      translationCache = newCache;
      try { localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(translationCache)); } catch (err) {}
    }
  }
}

// Hàm băm đơn giản để tạo ID cho element
function hashTextToId(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return 'trans_' + Math.abs(hash).toString(36);
}

// 1. Dịch tức thì bằng từ điển nhanh
function translateFastLocal(text) {
  if (!text) return '';
  const words = text.trim().split(/\s+/);
  if (words.length === 0) return '';
  let hitCount = 0;
  const translated = words.map(raw => {
    const clean = raw.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
    if (clean && idToViDict[clean]) {
      hitCount++;
      return idToViDict[clean];
    }
    return raw;
  });
  return hitCount > 0 ? translated.join(' ') : '';
}

// 2. Dịch online không đồng bộ qua Google Translate Client Endpoint
const pendingTranslationRequests = new Set();
async function fetchGoogleTranslation(text, elementId) {
  if (!text || !text.trim()) return;
  const trimmed = text.trim();

  // Đã có trong cache
  if (translationCache[trimmed]) {
    const el = document.getElementById(elementId);
    if (el) {
      el.innerHTML = `🇻🇳 <b>Dịch:</b> ${escapeHtml(translationCache[trimmed])}`;
    }
    return;
  }

  if (pendingTranslationRequests.has(trimmed)) return;
  pendingTranslationRequests.add(trimmed);

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=vi&dt=t&q=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && data[0]) {
        const fullTranslation = data[0].map(item => item[0]).filter(Boolean).join('');
        if (fullTranslation && fullTranslation.toLowerCase() !== trimmed.toLowerCase()) {
          translationCache[trimmed] = fullTranslation;
          saveTranslationCache();
          const el = document.getElementById(elementId);
          if (el) {
            el.innerHTML = `🇻🇳 <b>Dịch:</b> ${escapeHtml(fullTranslation)}`;
          }
        }
      }
    }
  } catch (err) {
    // Khi offline hoặc gặp lỗi mạng, giữ nguyên bản dịch nhanh từ điển nếu có
  } finally {
    pendingTranslationRequests.delete(trimmed);
  }
}

// Dịch nghĩa tiêu đề trang đích (Headline)
function getOrQueueHeadlineTranslation(headline, elementId) {
  if (!headline) return '';
  const trimmed = headline.trim();
  
  // Kiểm tra cache Google trước
  if (translationCache[trimmed]) {
    return translationCache[trimmed];
  }

  // Gọi API nền để lấy bản dịch chuẩn
  fetchGoogleTranslation(trimmed, elementId);

  // Trong lúc chờ API, trả về bản dịch từ điển nhanh
  return translateFastLocal(trimmed);
}

// Setup Navigation, Sidebar Collapse & Subtabs
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupSubtabs();
  setupSearchTermsEvents();
});

function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const tabContents = document.querySelectorAll('.tab-content');
  const pageTitle = document.getElementById('pageTitle');
  const pageSubtitle = document.getElementById('pageSubtitle');

  const titles = {
    'tab-affiliate-import': {
      title: 'Nạp Báo Cáo Sàn Affiliate',
      sub: 'Tự động chuẩn hóa file Massoffer, Ecomobi, Adpia và đẩy lên Google Sheets'
    },
    'tab-search-terms': {
      title: 'Lọc Cụm Từ Tìm Kiếm (Search Terms Intelligence)',
      sub: 'Phân tích đa tài khoản/chiến dịch, bóc tách cấu trúc URL tiềm năng và quét N-Gram chặn từ khóa rác'
    }
  };

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const targetId = item.getAttribute('data-tab');
      if (!targetId) return; // Nếu là thẻ a chuyển trang thì để trình duyệt chuyển trang bình thường
      e.preventDefault();

      const targetEl = document.getElementById(targetId);
      if (!targetEl) return;

      navItems.forEach(n => n.classList.remove('active'));
      tabContents.forEach(t => t.classList.remove('active'));

      item.classList.add('active');
      targetEl.classList.add('active');

      if (titles[targetId]) {
        if (pageTitle) pageTitle.innerText = titles[targetId].title;
        if (pageSubtitle) pageSubtitle.innerText = titles[targetId].sub;
      }
    });
  });
}

function setupSubtabs() {
  const subtabBtns = document.querySelectorAll('.st-subtab-btn');
  const subtabContents = document.querySelectorAll('.st-subcontent');

  subtabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      subtabBtns.forEach(b => b.classList.remove('active'));
      subtabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetSub = btn.getAttribute('data-subtab');
      const el = document.getElementById(targetSub);
      if (el) el.classList.add('active');

      currentActiveSubtabId = targetSub;
      // Nếu subtab này có dữ liệu cũ cần cập nhật, chỉ render khi người dùng mở ra
      if (dirtySubtabs[targetSub]) {
        renderActiveSubtab(targetSub);
      }
    });
  });
}

function setupSearchTermsEvents() {
  // File upload input (multi or single)
  const fileInput = document.getElementById('stFileInput');
  if (fileInput) fileInput.addEventListener('change', handleSearchTermsFileUpload);

  // Kéo & thả File vào stDropZone
  const dropZone = document.getElementById('stDropZone');
  if (dropZone) {
    dropZone.addEventListener('click', () => {
      if (fileInput) fileInput.click();
    });
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.style.borderColor = '#3b82f6';
      dropZone.style.background = 'rgba(59, 130, 246, 0.1)';
    });
    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.style.borderColor = 'rgba(255,255,255,0.15)';
      dropZone.style.background = 'rgba(15, 23, 42, 0.4)';
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.style.borderColor = 'rgba(255,255,255,0.15)';
      dropZone.style.background = 'rgba(15, 23, 42, 0.4)';
      const dtFiles = e.dataTransfer.files;
      if (dtFiles && dtFiles.length > 0) {
        handleSearchTermsFileUpload({ target: { files: dtFiles } });
      }
    });
  }

  // Nút Nạp Dữ Liệu Mẫu Demo
  const btnSampleDemo = document.getElementById('btnLoadSampleDemo');
  if (btnSampleDemo) {
    btnSampleDemo.addEventListener('click', loadSampleDemoData);
  }

  // Nút Xóa File Đã Nạp
  const btnClearFiles = document.getElementById('btnClearUploadedFiles');
  if (btnClearFiles) {
    btnClearFiles.addEventListener('click', clearUploadedSearchTermsData);
  }

  // Product pills
  const pills = document.querySelectorAll('.pill-btn');
  pills.forEach(p => {
    p.addEventListener('click', () => {
      pills.forEach(item => item.classList.remove('active'));
      p.classList.add('active');
      activeProductFilter = p.getAttribute('data-product');
      refreshAccountDropdown();
      populateCampaignDropdown();
      applyHierarchyFilters();
      showToast(`Đã chọn bộ lọc sản phẩm: ${p.innerText}`);
    });
  });

  // Account and Campaign select changes
  const accSelect = document.getElementById('stAccountSelect');
  if (accSelect) {
    accSelect.addEventListener('change', () => {
      populateCampaignDropdown();
      applyHierarchyFilters();
    });
  }

  const campSelect = document.getElementById('stCampaignSelect');
  if (campSelect) {
    campSelect.addEventListener('change', () => {
      applyHierarchyFilters();
    });
  }

  // N-Gram type toggle
  document.querySelectorAll('input[name="ngramType"]').forEach(r => {
    r.addEventListener('change', (e) => {
      currentNgramType = parseInt(e.target.value);
      ngramCurrentPage = 1;
      renderNgramTable();
    });
  });

  // N-Gram search & sort & limit & exclude filter
  let ngramSearchDebounce = null;
  const ngramSearch = document.getElementById('ngramSearchInput');
  if (ngramSearch) ngramSearch.addEventListener('input', () => {
    clearTimeout(ngramSearchDebounce);
    ngramSearchDebounce = setTimeout(() => {
      ngramCurrentPage = 1;
      renderNgramTable();
    }, 180);
  });
  const ngramSort = document.getElementById('ngramSortSelect');
  if (ngramSort) ngramSort.addEventListener('change', (e) => {
    const val = e.target.value;
    const parts = val.split('_');
    ngramSortColumn = parts[0];
    ngramSortOrder = parts[1];
    ngramCurrentPage = 1;
    renderNgramTable();
  });
  const ngramLimit = document.getElementById('ngramLimitSelect');
  if (ngramLimit) ngramLimit.addEventListener('change', () => {
    ngramCurrentPage = 1;
    renderNgramTable();
  });
  const chkExclNeg = document.getElementById('ngramExcludeAlreadyNeg');
  if (chkExclNeg) chkExclNeg.addEventListener('change', () => {
    ngramCurrentPage = 1;
    renderNgramTable();
  });

  // Add selected N-Gram to Negatives button
  const btnAddNeg = document.getElementById('btnAddSelectedNgramToNeg');
  if (btnAddNeg) {
    btnAddNeg.addEventListener('click', () => {
      if (ngramSelectedWords.size === 0) {
        showToast('Vui lòng tick chọn ít nhất 1 từ ở bảng trước!', true);
        return;
      }
      ngramSelectedWords.forEach(w => stNegativeKeywords.add(w.toLowerCase().trim()));
      saveNegativeKeywordsState();
      renderStNegativesText();
      renderNgramTable();
      showToast(`Đã thêm ${ngramSelectedWords.size} từ vào danh sách phủ định!`);
    });
  }

  // Select all N-Gram checkbox
  const chkAllNgram = document.getElementById('selectAllNgram');
  if (chkAllNgram) {
    chkAllNgram.addEventListener('change', (e) => {
      const checkboxes = document.querySelectorAll('.ngram-row-chk');
      checkboxes.forEach(c => {
        c.checked = e.target.checked;
        const w = c.getAttribute('data-word');
        if (w) {
          if (e.target.checked) ngramSelectedWords.add(w);
          else ngramSelectedWords.delete(w);
        }
      });
    });
  }

  // Negatives match type radio
  document.querySelectorAll('input[name="stNegMatch"]').forEach(r => {
    r.addEventListener('change', renderStNegativesText);
  });

  // Copy & Clear Negatives buttons
  const btnCopyNeg = document.getElementById('btnCopyStNeg');
  if (btnCopyNeg) {
    btnCopyNeg.addEventListener('click', () => {
      const text = document.getElementById('stNegativesArea').value;
      if (!text.trim()) {
        showToast('Danh sách từ khóa phủ định đang trống!', true);
        return;
      }
      navigator.clipboard.writeText(text);
      showToast('Đã copy danh sách từ khóa phủ định vào Clipboard!');
    });
  }

  const btnClearNeg = document.getElementById('btnClearStNeg');
  if (btnClearNeg) {
    btnClearNeg.addEventListener('click', () => {
      stNegativeKeywords.clear();
      ngramSelectedWords.clear();
      renderStNegativesText();
      renderNgramTable();
      showToast('Đã xóa toàn bộ từ khóa phủ định.');
    });
  }

  // Subtab 1: URL Discovery filters & sorting
  let urlSearchDebounce = null;
  const urlSearch = document.getElementById('urlSearchFilter');
  if (urlSearch) {
    urlSearch.addEventListener('input', () => {
      clearTimeout(urlSearchDebounce);
      urlSearchDebounce = setTimeout(() => {
        urlCurrentPage = 1;
        renderUrlDiscoveryTab(getFilteredSearchTerms());
      }, 180);
    });
  }

  const urlCategory = document.getElementById('urlCategoryFilter');
  if (urlCategory) {
    urlCategory.addEventListener('change', () => {
      urlCurrentPage = 1;
      renderUrlDiscoveryTab(getFilteredSearchTerms());
    });
  }

  const urlExcl = document.getElementById('urlExclFilter');
  if (urlExcl) {
    urlExcl.addEventListener('change', () => {
      urlCurrentPage = 1;
      renderUrlDiscoveryTab(getFilteredSearchTerms());
    });
  }

  const urlSort = document.getElementById('urlSortSelect');
  if (urlSort) {
    urlSort.addEventListener('change', (e) => {
      const parts = e.target.value.split('_');
      if (parts.length >= 2) {
        urlSortOrder = parts.pop();
        urlSortColumn = parts.join('_');
      }
      urlCurrentPage = 1;
      renderUrlDiscoveryTab(getFilteredSearchTerms());
    });
  }

  const urlLimit = document.getElementById('urlLimitSelect');
  if (urlLimit) {
    urlLimit.addEventListener('change', () => {
      urlCurrentPage = 1;
      renderUrlDiscoveryTab(getFilteredSearchTerms());
    });
  }

  // Switch View Mode: Nhóm Cấu Trúc vs Chi Tiết Từng URL
  const btnModeStruct = document.getElementById('btnViewModeStructure');
  const btnModeSingle = document.getElementById('btnViewModeSingle');
  if (btnModeStruct && btnModeSingle) {
    btnModeStruct.addEventListener('click', () => {
      if (urlViewMode === 'structure') return;
      urlViewMode = 'structure';
      urlCurrentPage = 1;
      btnModeStruct.className = 'btn btn-sm btn-primary';
      btnModeSingle.className = 'btn btn-sm btn-secondary';
      const desc = document.getElementById('urlViewModeDesc');
      if (desc) desc.innerHTML = 'Đang xem: <b>Mẫu cấu trúc URL để cấu hình chiến dịch Google Ads</b>';
      const colLabel = document.getElementById('urlColHeaderLabel');
      if (colLabel) colLabel.innerText = 'Cấu Trúc / Tiền Tố URL';
      renderUrlDiscoveryTab(getFilteredSearchTerms());
    });

    btnModeSingle.addEventListener('click', () => {
      if (urlViewMode === 'single') return;
      urlViewMode = 'single';
      urlCurrentPage = 1;
      btnModeSingle.className = 'btn btn-sm btn-primary';
      btnModeStruct.className = 'btn btn-sm btn-secondary';
      const desc = document.getElementById('urlViewModeDesc');
      if (desc) desc.innerHTML = 'Đang xem: <b>Từng URL đơn lẻ (Chi tiết Search Terms & Lượt nhấp)</b>';
      const colLabel = document.getElementById('urlColHeaderLabel');
      if (colLabel) colLabel.innerText = 'Địa Chỉ URL Trang Đích Đơn Lẻ';
      renderUrlDiscoveryTab(getFilteredSearchTerms());
    });
  }

  // Subtab 2 inner mode toggles (Raw Search Terms vs N-Gram)
  const btnSubRaw = document.getElementById('btnTermSubmodeRaw');
  const btnSubNgram = document.getElementById('btnTermSubmodeNgram');
  const viewRaw = document.getElementById('termContainerRawView');
  const viewNgram = document.getElementById('termContainerNgramView');
  const descSubmode = document.getElementById('termSubmodeDesc');

  if (btnSubRaw && btnSubNgram) {
    btnSubRaw.addEventListener('click', () => {
      btnSubRaw.className = 'btn btn-sm btn-primary';
      btnSubNgram.className = 'btn btn-sm btn-secondary';
      if (viewRaw) viewRaw.style.display = 'block';
      if (viewNgram) viewNgram.style.display = 'none';
      if (descSubmode) descSubmode.innerHTML = 'Đang xem: <b>Danh sách cụm từ tìm kiếm đầy đủ kèm trang đích</b>';
    });

    btnSubNgram.addEventListener('click', () => {
      btnSubRaw.className = 'btn btn-sm btn-secondary';
      btnSubNgram.className = 'btn btn-sm btn-primary';
      if (viewRaw) viewRaw.style.display = 'none';
      if (viewNgram) viewNgram.style.display = 'block';
      if (descSubmode) descSubmode.innerHTML = 'Đang xem: <b>Bộ lọc cụm từ ngắn N-Gram để chặn từ khóa rác</b>';
      renderNgramTable();
    });
  }

  // Adult filter in Search terms table
  const rawAdult = document.getElementById('rawAdultFilter');
  if (rawAdult) rawAdult.addEventListener('change', () => {
    rawCurrentPage = 1;
    renderRawTermsTable();
  });

  // Subtab 3 filters (Thêm debounce khi gõ ô tìm kiếm)
  let rawSearchDebounceTimeout = null;
  const rawSearch = document.getElementById('rawSearchFilter');
  if (rawSearch) rawSearch.addEventListener('input', () => {
    clearTimeout(rawSearchDebounceTimeout);
    rawSearchDebounceTimeout = setTimeout(() => {
      rawCurrentPage = 1;
      renderRawTermsTable();
    }, 250);
  });
  const rawExcl = document.getElementById('rawExclFilter');
  if (rawExcl) rawExcl.addEventListener('change', () => {
    rawCurrentPage = 1;
    renderRawTermsTable();
  });
  const rawWaste = document.getElementById('rawWasteFilter');
  if (rawWaste) rawWaste.addEventListener('change', () => {
    rawCurrentPage = 1;
    renderRawTermsTable();
  });
  const rawMinClicks = document.getElementById('rawMinClicksFilter');
  if (rawMinClicks) rawMinClicks.addEventListener('change', () => {
    rawCurrentPage = 1;
    renderRawTermsTable();
  });
  const rawUrlType = document.getElementById('rawUrlTypeFilter');
  if (rawUrlType) rawUrlType.addEventListener('change', () => {
    rawCurrentPage = 1;
    renderRawTermsTable();
  });
  const rawSort = document.getElementById('rawSortSelect');
  if (rawSort) rawSort.addEventListener('change', () => {
    rawCurrentPage = 1;
    renderRawTermsTable();
  });
  const rawLimit = document.getElementById('rawLimitSelect');
  if (rawLimit) rawLimit.addEventListener('change', () => {
    rawCurrentPage = 1;
    renderRawTermsTable();
  });

  const btnExpFiltered = document.getElementById('btnExportFilteredTerms');
  if (btnExpFiltered) btnExpFiltered.addEventListener('click', exportFilteredTermsToCsv);

  const btnExpUrl = document.getElementById('btnExportUrlRules');
  if (btnExpUrl) btnExpUrl.addEventListener('click', exportUrlRulesReport);

  // Nút Thêm Nhanh Toàn Bộ Cụm Từ Đang Lọc Vào Phủ Định
  const btnAddAllFiltered = document.getElementById('btnAddAllFilteredToNeg');
  if (btnAddAllFiltered) {
    btnAddAllFiltered.addEventListener('click', () => {
      const filteredList = getCurrentlyFilteredRawTerms();
      if (filteredList.length === 0) {
        showToast('Không có cụm từ nào trong bộ lọc hiện tại để phủ định!', true);
        return;
      }
      let added = 0;
      filteredList.forEach(item => {
        const lower = item.term.toLowerCase().trim();
        if (lower && !stNegativeKeywords.has(lower)) {
          stNegativeKeywords.add(lower);
          added++;
        }
      });
      saveNegativeKeywordsState();
      renderStNegativesText();
      renderRawTermsTable();
      renderNegativesManagerTab();
      showToast(`⚡ Đã thêm ${added} cụm từ đang lọc vào danh sách phủ định!`);
    });
  }

  // Checkbox Chọn / Bỏ chọn tất cả trang hiện tại
  const chkSelectAll = document.getElementById('rawSelectAllCheckbox');
  if (chkSelectAll) {
    chkSelectAll.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      const rowCheckboxes = document.querySelectorAll('.raw-term-row-chk');
      rowCheckboxes.forEach(chk => {
        chk.checked = isChecked;
        const term = chk.getAttribute('data-term');
        if (term) {
          const lower = term.toLowerCase().trim();
          if (isChecked) stNegativeKeywords.add(lower);
          else stNegativeKeywords.delete(lower);
        }
      });
      saveNegativeKeywordsState();
      renderStNegativesText();
      renderNegativesManagerTab();
      showToast(isChecked ? 'Đã tick chọn toàn bộ cụm từ trang này!' : 'Đã bỏ chọn toàn bộ cụm từ trang này.');
    });
  }

  // Khởi tạo tự động tìm kiếm nếu được điều hướng từ trang Shopee
  const urlParams = new URLSearchParams(window.location.search);
  const autoSearchParam = urlParams.get('autoSearch') || localStorage.getItem('redirect_search_term_query');
  if (autoSearchParam) {
    const rawSearchInput = document.getElementById('rawSearchFilter');
    if (rawSearchInput) {
      rawSearchInput.value = autoSearchParam;
      // Kích hoạt subtab 2 (Bảng cụm từ tìm kiếm)
      const tabBtn = document.querySelector('.st-subtab-btn[data-subtab="sub-terms-table"]');
      if (tabBtn) tabBtn.click();
      showToast(`🔍 Đã tự động lọc cụm từ liên quan đến sản phẩm: "${autoSearchParam}"`);
    }
    localStorage.removeItem('redirect_search_term_query');
  }

  // Setup Adult Panel Switch & Actions
  setupAdultPanelEvents();

  // Garbage category pills in Tab 3 (dùng class riêng garbage-pill-btn)
  document.querySelectorAll('#garbageCategoryPills .garbage-pill-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.querySelectorAll('#garbageCategoryPills .garbage-pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentGarbageCategory = btn.getAttribute('data-garbage') || 'ALL_GARBAGE';
      garbageInitDefaultSelection = true;
      renderAdultPanel();
    });
  });

  // Radio match type listener for Garbage Live Preview
  document.querySelectorAll('input[name="garbageNegMatch"]').forEach(r => {
    r.addEventListener('change', renderGarbageLivePreview);
  });

  // Nút hành động nhanh trên khung Preview: Phủ định ngay danh sách preview
  const btnNegCurrentPreview = document.getElementById('btnQuickNegateCurrentPreview');
  if (btnNegCurrentPreview) {
    btnNegCurrentPreview.addEventListener('click', () => {
      const txt = document.getElementById('txtGarbagePreview');
      if (!txt || !txt.value.trim()) {
        showToast('Không có từ khóa nào trong danh sách xem trước!', true);
        return;
      }
      const lines = txt.value.split('\n').map(l => l.replace(/[\[\]"]/g, '').trim()).filter(Boolean);
      let count = 0;
      lines.forEach(term => {
        const lower = term.toLowerCase().trim();
        if (lower && !stNegativeKeywords.has(lower)) {
          stNegativeKeywords.add(lower);
          count++;
        }
      });
      saveNegativeKeywordsState();
      renderStNegativesText();
      renderRawTermsTable();
      renderAdultPanel();
      renderNegativesManagerTab();
      showToast(`⚡ Đã phủ định thành công ${count} cụm từ từ danh sách xem trước!`);
    });
  }

  // Subtab 4: Negative Manager buttons (Separate copy for Keywords vs URLs)
  const btnCopyKw = document.getElementById('btnCopyKeywordsMgr');
  if (btnCopyKw) {
    btnCopyKw.addEventListener('click', () => {
      const kwList = Array.from(stNegativeKeywords);
      if (kwList.length === 0) {
        showToast('Chưa có từ khóa nào trong danh sách phủ định!', true);
        return;
      }
      const matchType = document.getElementById('mgrNegMatchType')?.value || 'phrase';
      const formatted = kwList.map(kw => {
        if (matchType === 'phrase') return `"${kw}"`;
        if (matchType === 'exact') return `[${kw}]`;
        return kw;
      });
      const content = formatted.join("\n");
      navigator.clipboard.writeText(content).then(() => {
        showToast(`📋 Đã sao chép ${kwList.length} từ khóa phủ định (${matchType === 'phrase' ? 'Khớp cụm từ' : (matchType === 'exact' ? 'Khớp chính xác' : 'Khớp rộng')})!`);
      });
    });
  }

  const btnCopyUrls = document.getElementById('btnCopyUrlsMgr');
  if (btnCopyUrls) {
    btnCopyUrls.addEventListener('click', () => {
      const urlList = Array.from(stNegativeUrls);
      if (urlList.length === 0) {
        showToast('Chưa có URL nào trong danh sách loại trừ!', true);
        return;
      }
      // Mỗi URL 1 dòng chuẩn định dạng paste loại trừ vào Google Ads
      const content = urlList.join("\n");
      navigator.clipboard.writeText(content).then(() => {
        showToast(`📋 Đã sao chép ${urlList.length} URL loại trừ (Mỗi URL 1 dòng)!`);
      });
    });
  }

  // Import Negative URLs modal buttons
  const btnImpUrls1 = document.getElementById('btnImportNegativeUrls');
  if (btnImpUrls1) btnImpUrls1.addEventListener('click', openImportNegativeUrlsModal);

  const btnImpUrls4 = document.getElementById('btnImportUrlsMgr');
  if (btnImpUrls4) btnImpUrls4.addEventListener('click', openImportNegativeUrlsModal);

  const btnClearAllMgr = document.getElementById('btnClearAllNegativesMgr');
  if (btnClearAllMgr) {
    btnClearAllMgr.addEventListener('click', () => {
      stNegativeKeywords.clear();
      stNegativeUrls.clear();
      saveNegativeKeywordsState();
      saveNegativeUrlsState();
      ngramSelectedWords.clear();
      renderStNegativesText();
      renderNgramTable();
      renderRawTermsTable();
      renderUrlDiscoveryTab(getFilteredSearchTerms());
      renderNegativesManagerTab();
      showToast('Đã xóa sạch toàn bộ từ khóa và URL phủ định.');
    });
  }
}

// Xóa sạch toàn bộ dữ liệu file đã nạp
function clearUploadedSearchTermsData() {
  allSearchTermsData = [];
  fileAccountMap = {};

  const fileInput = document.getElementById('stFileInput');
  if (fileInput) fileInput.value = '';

  const statusBadge = document.getElementById('stFileStatusBadge');
  if (statusBadge) statusBadge.innerHTML = '';

  const btnClear = document.getElementById('btnClearUploadedFiles');
  if (btnClear) btnClear.style.display = 'none';

  refreshAccountDropdown();
  populateCampaignDropdown();
  applyHierarchyFilters();

  showToast('Đã xóa dữ liệu file đã nạp. Bạn có thể tải lên file mới.');
}

// Nạp file dữ liệu mẫu Demo (Shopee Search Terms có sẵn trong sample_data)
function loadSampleDemoData() {
  const samplePath = 'sample_data/Báo cáo cụm từ tìm kiếm quảng cáo động - Mẫu Shopee.csv';
  showToast('⏳ Đang nạp file dữ liệu mẫu Shopee...');
  
  fetch(samplePath)
    .then(res => {
      if (!res.ok) throw new Error('Không thể tải file mẫu từ máy chủ.');
      return res.text();
    })
    .then(csvText => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
          const rows = results.data;
          const detectedProduct = 'Shopee';
          const accountName = 'Channel_AFF_Shopee_ECO (Sample)';
          const processedRows = processSearchTermsRows(rows, accountName, detectedProduct);
          
          allSearchTermsData = processedRows;
          fileAccountMap = { 'Báo cáo mẫu Shopee': { product: 'Shopee', accountName: accountName } };
          
          // Cập nhật giao diện
          const statusBadge = document.getElementById('stFileStatusBadge');
          if (statusBadge) {
            statusBadge.innerHTML = `<span style="color: #34d399; font-weight: 700;">✓ Đã nạp mẫu: ${allSearchTermsData.length.toLocaleString()} cụm từ</span>`;
          }
          const btnClear = document.getElementById('btnClearUploadedFiles');
          if (btnClear) btnClear.style.display = 'inline-flex';
          
          refreshAccountDropdown();
          populateCampaignDropdown();
          applyHierarchyFilters();
          showToast(`✅ Đã nạp thành công ${allSearchTermsData.length.toLocaleString()} cụm từ tìm kiếm mẫu Shopee!`);
        },
        error: function(err) {
          showToast('Lỗi parse file mẫu CSV: ' + err.message, true);
        }
      });
    })
    .catch(err => {
      showToast('Lỗi: ' + err.message, true);
    });
}

// Track accounts with their detected product
let fileAccountMap = {}; // filename -> { product, accountName }

// Handle multi or single file upload
function handleSearchTermsFileUpload(e) {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  allSearchTermsData = []; // Reset on new upload
  fileAccountMap = {};
  let loadedCount = 0;

  // Track product file counts to handle multiple files for same product e.g. "Shopee 1", "Shopee 2"
  const productFileCounts = {};

  Array.from(files).forEach((file, fileIdx) => {
    const rawFileName = file.name.replace(/\.[^/.]+$/, "");
    const reader = new FileReader();

    reader.onload = (evt) => {
      const buffer = evt.target.result;
      const uint8 = new Uint8Array(buffer);
      let encoding = 'utf-8';

      // Detect UTF-16 LE BOM (FF FE) or UTF-16 BE BOM (FE FF)
      if (uint8.length >= 2 && uint8[0] === 0xFF && uint8[1] === 0xFE) {
        encoding = 'utf-16le';
      } else if (uint8.length >= 2 && uint8[0] === 0xFE && uint8[1] === 0xFF) {
        encoding = 'utf-16be';
      } else {
        let nullCount = 0;
        const checkLen = Math.min(200, uint8.length);
        for (let i = 1; i < checkLen; i += 2) {
          if (uint8[i] === 0) nullCount++;
        }
        if (nullCount > checkLen / 4) {
          encoding = 'utf-16le';
        }
      }

      const decoder = new TextDecoder(encoding);
      const csvText = decoder.decode(uint8);

      // Determine product for this whole file
      const fileLower = (file.name + " " + csvText.slice(0, 30000)).toLowerCase();
      let fileProduct = "Khác";
      if (fileLower.includes("shopee")) {
        fileProduct = "Shopee";
      } else if (fileLower.includes("traveloka")) {
        fileProduct = "Traveloka";
      } else if (fileLower.includes("trip.com") || fileLower.includes("trip")) {
        fileProduct = "Trip";
      } else if (activeProductFilter !== 'auto') {
        fileProduct = activeProductFilter;
      }

      // If user selected a specific product tab, prioritize it
      if (activeProductFilter !== 'auto') {
        fileProduct = activeProductFilter;
      }

      // Assign an account name based on product
      productFileCounts[fileProduct] = (productFileCounts[fileProduct] || 0) + 1;
      let accountDisplayName = fileProduct !== "Khác" ? `Tài khoản ${fileProduct}` : `Tài khoản ${rawFileName}`;
      if (files.length > 1 && fileProduct !== "Khác" && productFileCounts[fileProduct] > 1) {
        accountDisplayName = `Tài khoản ${fileProduct} (${productFileCounts[fileProduct]})`;
      }

      parseAndIngestSearchTermsFile(csvText, accountDisplayName, fileProduct);
      loadedCount++;
      if (loadedCount === files.length) {
        const badge = document.getElementById('stFileStatusBadge');
        if (badge) {
          badge.innerHTML = `<span class="text-success font-semibold">✓ Đã nạp ${files.length} file (${allSearchTermsData.length.toLocaleString()} dòng)</span>`;
        }
        const btnClear = document.getElementById('btnClearUploadedFiles');
        if (btnClear) btnClear.style.display = 'inline-flex';
        showToast(`✅ Đã nạp thành công ${files.length} file tài khoản (${allSearchTermsData.length.toLocaleString()} dòng)!`);
      }
    };

    reader.readAsArrayBuffer(file);
  });
}

// Parse CSV content and extract data
function parseAndIngestSearchTermsFile(csvText, assignedAccountName, fallbackProduct) {
  // Strip BOM if present
  if (csvText.charCodeAt(0) === 0xFEFF) {
    csvText = csvText.slice(1);
  }

  Papa.parse(csvText, {
    skipEmptyLines: 'greedy',
    complete: (results) => {
      let rows = results.data;
      if (!rows || rows.length === 0) {
        showToast('File trống hoặc không đọc được nội dung.', true);
        return;
      }

      // If delimiter wasn't detected properly (e.g., TSV)
      if (rows.length > 0 && rows[0].length === 1 && typeof rows[0][0] === 'string' && rows[0][0].includes('\t')) {
        rows = rows.map(r => r[0].split('\t'));
      }

      // Helper to normalize Vietnamese Unicode (NFC) and lower case
      const norm = (s) => String(s || '').normalize('NFC').toLowerCase().trim();

      // Find the header row (Bảng chuẩn Google Ads như sample_data có >= 3 cột; tránh bắt nhầm dòng 0 là title báo cáo)
      let headerIdx = -1;
      for (let i = 0; i < Math.min(15, rows.length); i++) {
        if (!rows[i] || rows[i].length < 3) continue;
        const rowStr = norm(rows[i].join(" "));
        if (
          rowStr.includes("chiến dịch") || 
          rowStr.includes("campaign") || 
          rowStr.includes("cụm") || 
          rowStr.includes("search term") ||
          rowStr.includes("query") ||
          rowStr.includes("từ khóa") ||
          rowStr.includes("keyword") ||
          rowStr.includes("trang đích") ||
          rowStr.includes("landing page")
        ) {
          headerIdx = i;
          break;
        }
      }

      // Fallback nếu file bảng biểu đặc thù có ít cột hơn
      if (headerIdx === -1) {
        for (let i = 0; i < Math.min(15, rows.length); i++) {
          if (!rows[i] || rows[i].length < 1) continue;
          const rowStr = norm(rows[i].join(" "));
          if (rowStr.includes("keyword_text") || rowStr.includes("từ khóa") || rowStr.includes("query")) {
            headerIdx = i;
            break;
          }
        }
      }

      if (headerIdx === -1) {
        if (rows.length > 2 && rows[2].length >= 5) {
          headerIdx = 2;
        } else if (rows.length > 0) {
          headerIdx = 0;
        }
      }

      const headers = rows[headerIdx].map(norm);
      let termIdx = headers.findIndex(h => h.includes("cụm") || h.includes("search term") || h.includes("query") || h.includes("từ khóa") || h.includes("keyword"));
      let headIdx = headers.findIndex(h => h.includes("tiêu đề") || h.includes("headline"));
      let urlIdx = headers.findIndex(h => h.includes("trang đích") || h.includes("landing page") || h.includes("url"));
      let campIdx = headers.findIndex(h => h.includes("chiến dịch") || h.includes("campaign"));
      let adgIdx = headers.findIndex(h => h.includes("nhóm quảng cáo") || h.includes("ad group") || h.includes("nhóm"));
      let clickIdx = headers.findIndex(h => h.includes("lượt nhấp") || h.includes("clicks"));
      let impIdx = headers.findIndex(h => h.includes("hiển thị") || h.includes("impressions"));
      let costIdx = headers.findIndex(h => h.includes("chi phí") || h.includes("cost"));
      let convIdx = headers.findIndex(h => h.includes("chuyển đổi") || h.includes("conversions"));
      let exclIdx = headers.findIndex(h => h.includes("loại trừ") || h.includes("excluded") || h.includes("thêm/loại trừ"));

      // Standard Google Ads Search Terms fallback indices if header matching misses
      if (termIdx === -1 && rows[headerIdx].length > 0) termIdx = 0;
      if (headIdx === -1 && rows[headerIdx].length > 1) headIdx = 1;
      if (urlIdx === -1 && rows[headerIdx].length > 2) urlIdx = 2;
      if (campIdx === -1 && rows[headerIdx].length > 3) campIdx = 3;
      if (adgIdx === -1 && rows[headerIdx].length > 4) adgIdx = 4;
      if (exclIdx === -1 && rows[headerIdx].length > 5) exclIdx = 5;
      if (clickIdx === -1 && rows[headerIdx].length > 6) clickIdx = 6;
      if (impIdx === -1 && rows[headerIdx].length > 7) impIdx = 7;
      if (convIdx === -1 && rows[headerIdx].length > 13) convIdx = 13;

      const dataRows = rows.slice(headerIdx + 1);

      dataRows.forEach(r => {
        const firstCol = String(r[0] || "").trim();
        // Skip Google Ads summary rows like "Tổng số: Cụm từ tìm kiếm" or "Total"
        if (firstCol.startsWith("Tổng số") || firstCol.startsWith("Total") || firstCol === "") return;

        const term = termIdx !== -1 ? String(r[termIdx] || "").trim() : firstCol;
        if (!term) return;

        const headline = headIdx !== -1 ? String(r[headIdx] || "").trim() : "";
        const url = urlIdx !== -1 ? String(r[urlIdx] || "").trim() : "";
        const campaign = campIdx !== -1 ? String(r[campIdx] || "").trim() : "";
        const adGroup = adgIdx !== -1 ? String(r[adgIdx] || "").trim() : "";

        // Check if term was already excluded in Google Ads
        const rawExcl = exclIdx !== -1 ? String(r[exclIdx] || "").toLowerCase().trim() : "";
        const isExcludedByGoogle = rawExcl === 'true' || rawExcl.includes('bị loại trừ') || rawExcl.includes('excluded');

        const clicks = clickIdx !== -1 ? parseInt(String(r[clickIdx]).replace(/[^0-9]/g, '')) || 0 : 0;
        const impressions = impIdx !== -1 ? parseInt(String(r[impIdx]).replace(/[^0-9]/g, '')) || 0 : 0;
        const cost = costIdx !== -1 ? parseFloat(String(r[costIdx]).replace(/[^0-9.-]+/g, '')) || 0 : 0;
        const conv = convIdx !== -1 ? parseFloat(String(r[convIdx]).replace(/[^0-9.-]+/g, '')) || 0 : 0;
        const ctr = impressions > 0 ? ((clicks / impressions) * 100) : 0;
        const cpc = clicks > 0 ? (cost / clicks) : 0;

        // Auto-detect Product/Vertical from URL or row content
        let product = fallbackProduct || "Khác";
        const urlLower = url.toLowerCase();
        const rowStrLower = r.join(" ").toLowerCase();

        if (urlLower.includes("shopee") || rowStrLower.includes("shopee")) {
          product = "Shopee";
        } else if (urlLower.includes("traveloka") || rowStrLower.includes("traveloka")) {
          product = "Traveloka";
        } else if (urlLower.includes("trip.com") || rowStrLower.includes("trip.com")) {
          product = "Trip";
        }

        // Categorize URL type dynamically based on platform and URL semantics
        let urlType = "KHÁC";
        const isBlogUrl = urlLower.includes("/inspirasi-shopee/") || urlLower.includes("/blog/") || urlLower.includes("/article/") || urlLower.includes("/guide/") || urlLower.includes("/tips/");

        // Check Adult / 18+ Content for Term and URL (hỗ trợ đa ngôn ngữ)
        let adultTermCheck = null;
        let adultUrlCheck = null;
        if (typeof window !== 'undefined' && window.ADULT_PATTERNS) {
          adultTermCheck = window.ADULT_PATTERNS.detectTerm(term);
          if (!adultTermCheck) {
            adultUrlCheck = window.ADULT_PATTERNS.detectUrl(url);
          }
        }
        const isAdultContent = Boolean(adultTermCheck || adultUrlCheck);

        // Phân loại cụm từ thuần Thông tin / Hướng dẫn / Hỏi đáp (Informational Intent - Thường 0 chuyển đổi)
        const isInformational = /\b(cara|apa|apakah|kenapa|mengapa|bagaimana|ciri|efek|tips|untuk apa|obat apa|fungsi|manfaat|pencegahan|gejala|penyebab|artinya|bisa kah|bolehkah)\b/i.test(term);

        // Phân loại Thuốc đặc trị / Kháng sinh / Kem bôi chữa bệnh (Trừ TPCN, Thảo dược, Đồ uống hỗ trợ)
        const isSupplement = /\b(jamu|coffee|kopi|coklat|chocolate|vitamin|pasak bumi|suplemen|supplement|herbal)\b/i.test(term);
        const isMedication = !isSupplement && /\b(salep|gonore|kencing nanah|sipilis|herpes|bisul|kista|lecet|luka|kutil|borok|infeksi|radang|antibiotik|antiobiotik|apotik|apotek|dokter|resep dokter|ovarium|benjolan)\b/i.test(term);

        if (isAdultContent) {
          urlType = "ADULT_CONTENT";
        } else if (product === "Traveloka" || urlLower.includes("traveloka")) {
          if (urlLower.includes("/explore/culinary/")) {
            urlType = "CULINARY"; // Ẩm thực / Ăn uống (tốn nhiều chi phí nhất trong Traveloka)
          } else if (urlLower.includes("/explore/destination/")) {
            // Check Traveloka dynamic target intent
            if (urlLower.includes("-acc/") || urlLower.includes("-acc?") || urlLower.endsWith("-acc")) {
              urlType = "DEST_ACC"; // Điểm đến + Lưu trú / Khách sạn (Tỷ lệ click & chuyển đổi cao)
            } else if (urlLower.includes("-gt/") || urlLower.includes("-gt?") || urlLower.endsWith("-gt")) {
              urlType = "DEST_GT"; // Điểm đến + Phương tiện di chuyển (Bus, Ga, Tàu, Sân bay)
            } else if (urlLower.includes("-trp/") || urlLower.includes("-trp?") || urlLower.endsWith("-trp")) {
              urlType = "DEST_TRP"; // Điểm đến + Tham quan / Trải nghiệm
            } else {
              urlType = "DEST_OTHER"; // Điểm đến tổng quan
            }
          } else if (urlLower.includes("/hotel/") || urlLower.includes("/flight/") || urlLower.includes("/train/") || urlLower.includes("/bus-and-shuttle/")) {
            urlType = "SHOP"; // Trang đặt chỗ trực tiếp
          } else if (urlLower.includes("/search")) {
            urlType = "SEARCH";
          } else if (urlLower.includes("/explore/")) {
            urlType = "BLOG";
          }
        } else if (product === "Trip" || urlLower.includes("trip.com")) {
          // Phân loại chuyên biệt cho hệ sinh thái Trip.com
          if (urlLower.includes("/guide/info") || urlLower.includes("/guide/visa") || urlLower.includes("/guide/phone") || urlLower.includes("/guide/payments")) {
            urlType = "GUIDE_INFO"; // Mẹo vặt, thời tiết, visa, sim card
          } else if (urlLower.includes("/guide/transport") || urlLower.includes("/guide/train") || urlLower.includes("/guide/airline-deals") || urlLower.includes("/trains/")) {
            urlType = "GUIDE_TRANSPORT"; // Hướng dẫn phương tiện, metro, tàu hỏa
          } else if (urlLower.includes("/guide/destination") || urlLower.includes("/guide/attraction") || urlLower.includes("/guide/activity") || urlLower.includes("/guide/events")) {
            urlType = "GUIDE_DEST"; // Hướng dẫn điểm đến, tham quan
          } else if (urlLower.includes("/guide/shopping")) {
            urlType = "GUIDE_SHOPPING"; // Cẩm nang mua sắm, quà lưu niệm
          } else if (urlLower.includes("/guide/stay")) {
            urlType = "GUIDE_STAY"; // Gợi ý khách sạn
          } else if (urlLower.includes("/guide/food") || urlLower.includes("/restaurant/")) {
            urlType = "GUIDE_FOOD"; // Cẩm nang ẩm thực, nhà hàng
          } else if (urlLower.includes("/flights/status")) {
            urlType = "FLIGHTS_STATUS"; // Tra cứu trạng thái chuyến bay
          } else if (urlLower.includes("/flights/") || urlLower.includes("/flight/")) {
            urlType = "FLIGHTS_BOOKING"; // Đặt vé máy bay trực tiếp
          } else if (urlLower.includes("/hotels/") || urlLower.includes("/m/hotels") || urlLower.includes("/hotel/")) {
            urlType = "HOTELS_BOOKING"; // Đặt phòng khách sạn trực tiếp
          } else if (urlLower.includes("/things-to-do") || urlLower.includes("/toplist") || urlLower.includes("/events") || urlLower.includes("/cruises")) {
            urlType = "ACTIVITIES"; // Vé vui chơi, tour trải nghiệm, du thuyền
          } else if (urlLower.includes("/blog/") || urlLower.includes("/hot/") || urlLower.includes("/moments/") || urlLower.includes("/travel-guide/")) {
            urlType = "BLOG"; // Bài viết blog, mạng xã hội du lịch Moments
          } else {
            urlType = "OTHER_PAGE";
          }
        } else if (product === "Shopee" || urlLower.includes("shopee")) {
          if (isBlogUrl) {
            urlType = "BLOG";
          } else if (urlLower.includes("/list/")) {
            urlType = "LIST";
          } else if (urlLower.includes("/search")) {
            urlType = "SEARCH";
          } else if (urlLower.includes("/product/") || urlLower.includes("/item/")) {
            urlType = "SHOP";
          }
        } else {
          // Generic Platforms
          if (isBlogUrl) {
            urlType = "BLOG";
          } else if (urlLower.includes("/list/") || urlLower.includes("/destination/") || urlLower.includes("/category/")) {
            urlType = "LIST";
          } else if (urlLower.includes("/search") || urlLower.includes("keyword=")) {
            urlType = "SEARCH";
          } else if (urlLower.includes("/product/") || urlLower.includes("/item/") || urlLower.includes("/hotel/")) {
            urlType = "SHOP";
          }
        }

        // Tên tài khoản luôn luôn lấy theo sản phẩm đã chỉ định
        const finalAccount = assignedAccountName || (product !== "Khác" ? `Tài khoản ${product}` : "Tài khoản Chung");

        allSearchTermsData.push({
          account: finalAccount,
          campaign: campaign || "Chiến dịch chung",
          adGroup: adGroup || "Nhóm chung",
          term,
          headline,
          url,
          clicks,
          impressions,
          ctr,
          cpc,
          cost,
          conv,
          urlType,
          product,
          isExcludedByGoogle,
          isAdult: isAdultContent,
          isInformational,
          isMedication,
          adultDetails: adultTermCheck || adultUrlCheck
        });
      });

      refreshAccountDropdown();
      populateCampaignDropdown();
      applyHierarchyFilters();
    }
  });
}

// Populate Account Dropdown
function refreshAccountDropdown() {
  const accSelect = document.getElementById('stAccountSelect');
  if (!accSelect) return;

  let dataset = allSearchTermsData;
  if (activeProductFilter !== 'auto') {
    dataset = dataset.filter(d => d.product.toLowerCase() === activeProductFilter.toLowerCase());
  }

  const accounts = [...new Set(dataset.map(d => d.account))];
  let options = `<option value="ALL">-- Tất cả tài khoản (${accounts.length}) --</option>`;
  accounts.forEach(acc => {
    options += `<option value="${escapeHtml(acc)}">${escapeHtml(acc)}</option>`;
  });
  accSelect.innerHTML = options;
}

// Populate Campaign Dropdown based on selected Account
function populateCampaignDropdown() {
  const accSelect = document.getElementById('stAccountSelect');
  const campSelect = document.getElementById('stCampaignSelect');
  if (!accSelect || !campSelect) return;

  const selAcc = accSelect.value;
  let filtered = allSearchTermsData;
  if (selAcc !== 'ALL') {
    filtered = filtered.filter(d => d.account === selAcc);
  }

  const campaigns = [...new Set(filtered.map(d => d.campaign))];
  let options = `<option value="ALL">-- Tất cả chiến dịch (${campaigns.length}) --</option>`;
  campaigns.forEach(c => {
    options += `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`;
  });
  campSelect.innerHTML = options;
}

// Get filtered dataset based on Hierarchy (Product, Account, Campaign)
function getFilteredSearchTerms() {
  let list = allSearchTermsData;

  // Filter by Product (if not 'auto')
  if (activeProductFilter !== 'auto') {
    list = list.filter(d => d.product.toLowerCase() === activeProductFilter.toLowerCase());
  }

  // Filter by Account
  const accSelect = document.getElementById('stAccountSelect');
  if (accSelect && accSelect.value !== 'ALL') {
    list = list.filter(d => d.account === accSelect.value);
  }

  // Filter by Campaign
  const campSelect = document.getElementById('stCampaignSelect');
  if (campSelect && campSelect.value !== 'ALL') {
    list = list.filter(d => d.campaign === campSelect.value);
  }

  return list;
}

// Trigger render thông minh (Lazy Rendering cho Subtab đang hiển thị)
function applyHierarchyFilters() {
  const data = getFilteredSearchTerms();

  // Update summary stats
  let totalClicks = 0;
  let totalCost = 0;
  for (let i = 0; i < data.length; i++) {
    totalClicks += data[i].clicks;
    totalCost += data[i].cost;
  }

  const statTerms = document.getElementById('statActiveTerms');
  const statClicks = document.getElementById('statActiveClicks');
  const statCost = document.getElementById('statActiveCost');
  if (statTerms) statTerms.innerText = data.length.toLocaleString('vi-VN');
  if (statClicks) statClicks.innerText = totalClicks.toLocaleString('vi-VN');
  if (statCost) statCost.innerText = formatCurrency(Math.round(totalCost));

  // Đánh dấu tất cả các subtab khác cần cập nhật lại khi người dùng bấm vào
  markAllSubtabsDirtyExcept(currentActiveSubtabId);

  // Chỉ dựng giao diện ngay cho Subtab mà người dùng đang mở xem
  renderActiveSubtab(currentActiveSubtabId);
}

// =========================================================================
// SUBTAB 1: URL STRUCTURE DISCOVERY & DSA TARGET RULES
// =========================================================================
function renderUrlDiscoveryTab(data) {
  const recContainer = document.getElementById('urlStrategyRecommendations');
  const cardsContainer = document.getElementById('urlCategoryCards');
  const tbody = document.querySelector('#urlGroupTable tbody');
  if (!cardsContainer || !tbody) return;

  if (data.length === 0) {
    if (recContainer) recContainer.innerHTML = '';
    cardsContainer.innerHTML = '';
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">Chưa có dữ liệu</td></tr>`;
    return;
  }

  // Detect active product context
  const currentProduct = (activeProductFilter !== 'auto') 
    ? activeProductFilter 
    : (data.find(d => d.product && d.product !== 'Khác')?.product || 'Shopee');

  // Render on-page Strategy Recommendations Box
  renderStrategyRecommendationBox(currentProduct, recContainer);

  // Build Group definitions dynamically based on platform
  let groups = {};

  if (currentProduct === 'Traveloka') {
    groups = {
      ADULT_CONTENT: { name: '🔞 Nội dung 18+ (Cảnh báo vi phạm)', terms: 0, clicks: 0, imp: 0, cost: 0, type: 'adult', rule: 'Cần loại trừ khẩn cấp' },
      DEST_ACC: { name: 'Điểm Đến & Lưu Trú (-acc)', terms: 0, clicks: 0, imp: 0, cost: 0, type: 'dest_acc', rule: 'URL contains -acc' },
      DEST_TRP: { name: 'Điểm Đến & Trải Nghiệm (-trp)', terms: 0, clicks: 0, imp: 0, cost: 0, type: 'dest_trp', rule: 'URL contains -trp' },
      DEST_GT: { name: 'Điểm Đến & Phương Tiện (-gt)', terms: 0, clicks: 0, imp: 0, cost: 0, type: 'dest_gt', rule: 'URL contains -gt' },
      CULINARY: { name: 'Ẩm Thực / Quán Ăn (/culinary/)', terms: 0, clicks: 0, imp: 0, cost: 0, type: 'culinary', rule: 'URL contains /culinary/' },
      DEST_OTHER: { name: 'Điểm Đến Khác (/destination/)', terms: 0, clicks: 0, imp: 0, cost: 0, type: 'list', rule: 'URL contains /destination/' },
      SHOP: { name: 'Đặt Vé / Khách Sạn Trực Tiếp', terms: 0, clicks: 0, imp: 0, cost: 0, type: 'shop', rule: 'URL contains /hotel/ | /flight/' }
    };
  } else if (currentProduct === 'Trip') {
    groups = {
      ADULT_CONTENT: { name: '🔞 Nội dung 18+ (Cảnh báo vi phạm)', terms: 0, clicks: 0, imp: 0, cost: 0, type: 'adult', rule: 'Cần loại trừ khẩn cấp' },
      GUIDE_TRANSPORT: { name: '🚇 Phương Tiện / Metro / Sân Bay (/guide/transport/)', terms: 0, clicks: 0, imp: 0, cost: 0, type: 'dest_gt', rule: 'URL contains /guide/transport/' },
      GUIDE_INFO: { name: 'ℹ️ Mẹo Vặt / Thời Tiết / Visa (/guide/info/)', terms: 0, clicks: 0, imp: 0, cost: 0, type: 'blog', rule: 'URL contains /guide/info/' },
      BLOG: { name: '📝 Blog / Moments / Cẩm Nang Du Lịch', terms: 0, clicks: 0, imp: 0, cost: 0, type: 'blog', rule: 'URL contains /blog/ | /moments/' },
      GUIDE_DEST: { name: '🏞️ Điểm Đến & Tham Quan (/guide/destination/)', terms: 0, clicks: 0, imp: 0, cost: 0, type: 'list', rule: 'URL contains /guide/destination/' },
      HOTELS_BOOKING: { name: '🏨 Đặt Phòng Khách Sạn Trực Tiếp', terms: 0, clicks: 0, imp: 0, cost: 0, type: 'dest_acc', rule: 'URL contains /hotels/' },
      FLIGHTS_BOOKING: { name: '✈️ Đặt Vé Máy Bay Trực Tiếp', terms: 0, clicks: 0, imp: 0, cost: 0, type: 'shop', rule: 'URL contains /flights/' },
      FLIGHTS_STATUS: { name: '📡 Tra Cứu Trạng Thái Chuyến Bay', terms: 0, clicks: 0, imp: 0, cost: 0, type: 'search', rule: 'URL contains /flights/status/' },
      GUIDE_SHOPPING: { name: '🛍️ Cẩm Nang Mua Sắm / Quà Tặng', terms: 0, clicks: 0, imp: 0, cost: 0, type: 'shop', rule: 'URL contains /guide/shopping/' },
      GUIDE_FOOD: { name: '🍜 Cẩm Nang Ẩm Thực & Quán Ăn', terms: 0, clicks: 0, imp: 0, cost: 0, type: 'culinary', rule: 'URL contains /guide/food/' },
      ACTIVITIES: { name: '🎡 Vé Vui Chơi / Sự Kiện / Tour', terms: 0, clicks: 0, imp: 0, cost: 0, type: 'dest_trp', rule: 'URL contains /things-to-do/ | /events/' }
    };
  } else {
    groups = {
      ADULT_CONTENT: { name: '🔞 Sản phẩm 18+ (Bao cao su, Đồ chơi, Sinh lý)', terms: 0, clicks: 0, imp: 0, cost: 0, type: 'adult', rule: 'Cần loại trừ mục tiêu DSA' },
      LIST: { name: 'Danh mục mua sắm (/list/)', terms: 0, clicks: 0, imp: 0, cost: 0, type: 'list', rule: 'URL contains /list/' },
      SEARCH: { name: 'Tìm kiếm mua hàng (/search)', terms: 0, clicks: 0, imp: 0, cost: 0, type: 'search', rule: 'URL contains /search' },
      BLOG: { name: 'Bài viết Blog / Mẹo (/inspirasi-shopee/)', terms: 0, clicks: 0, imp: 0, cost: 0, type: 'blog', rule: 'URL contains /inspirasi-shopee/' },
      SHOP: { name: 'Gian hàng / Sản phẩm / Khác', terms: 0, clicks: 0, imp: 0, cost: 0, type: 'shop', rule: 'URL contains /product/' }
    };
  }

  data.forEach(d => {
    const typeKey = d.urlType || 'SHOP';
    if (!groups[typeKey]) {
      // Fallback
      if (groups.SHOP) groups.SHOP.terms++;
      return;
    }
    const g = groups[typeKey];
    g.terms++;
    g.clicks += d.clicks;
    g.imp += d.impressions;
    g.cost += d.cost;
  });

  // Render Category Cards (Only render cards that have data or default important ones)
  let cardsHtml = '';
  Object.keys(groups).forEach(key => {
    const g = groups[key];
    if (g.terms === 0 && Object.keys(groups).length > 4) return; // Hide empty cards for rich views
    const ctr = g.imp > 0 ? ((g.clicks / g.imp) * 100).toFixed(2) : '0.00';
    cardsHtml += `
      <div class="url-cat-card ${g.type}">
        <div class="url-cat-title">${g.name}</div>
        <div class="url-cat-stat">${g.clicks.toLocaleString()} clicks</div>
        <div class="url-cat-sub">
          ${g.terms.toLocaleString()} Search Terms | CTR: <b>${ctr}%</b> | ${formatCurrency(Math.round(g.cost))}
        </div>
      </div>
    `;
  });
  cardsContainer.innerHTML = cardsHtml;

  // 2 CHẾ ĐỘ XEM:
  // CHẾ ĐỘ 1: Gom nhóm cấu trúc (structure) -> Cho người chạy quảng cáo lấy URL rules lên Camp
  // CHẾ ĐỘ 2: Chi tiết từng URL đơn lẻ (single) -> Xem từng URL có bao nhiêu search terms, click, chi phí
  let pathList = [];

  if (urlViewMode === 'structure') {
    // Breakdown Top Specific URL Paths (prefix analysis)
    const pathMap = {};
    data.forEach(d => {
      if (!d.url) return;
      let prefix = d.url.split('?')[0].split('#')[0];
      let origin = '';
      let pathname = prefix;
      try {
        const parsed = new URL(d.url);
        origin = parsed.origin;
        pathname = parsed.pathname;
        prefix = origin + pathname;
      } catch (e) {
        // Keep prefix from string split
      }

      // Dynamic grouping based on Traveloka vs Shopee vs Others
      let ruleDesc = '';
      if (pathname.includes('/explore/destination/')) {
        const parts = pathname.split('/explore/destination/')[1]?.split('/').filter(Boolean) || [];
        const slug = parts[0] || '';
        if (slug.includes('-acc')) {
          prefix = `${origin}/explore/destination/*-acc/`;
          ruleDesc = 'URL contains -acc';
        } else if (slug.includes('-gt')) {
          prefix = `${origin}/explore/destination/*-gt/`;
          ruleDesc = 'URL contains -gt';
        } else if (slug.includes('-trp')) {
          prefix = `${origin}/explore/destination/*-trp/`;
          ruleDesc = 'URL contains -trp';
        } else {
          prefix = `${origin}/explore/destination/`;
          ruleDesc = 'URL contains /explore/destination/';
        }
      } else if (pathname.includes('/explore/culinary/')) {
        prefix = `${origin}/explore/culinary/`;
        ruleDesc = 'URL contains /explore/culinary/';
      } else if (prefix.includes('/inspirasi-shopee/')) {
        prefix = `${origin || 'https://shopee.co.id'}/inspirasi-shopee/`;
        ruleDesc = 'URL contains /inspirasi-shopee/';
      } else if (prefix.includes('/list/')) {
        const parts = prefix.split('/list/')[1]?.split('/').filter(Boolean) || [];
        const catSlug = parts[0] || '';
        prefix = `${origin || 'https://shopee.co.id'}/list/${catSlug ? catSlug + '/' : ''}`;
        ruleDesc = `URL contains /list/${catSlug ? catSlug + '/' : ''}`;
      } else if (prefix.includes('/search')) {
        // Gom nhóm theo cụm tham số tìm kiếm
        try {
          const parsedUrl = new URL(d.url);
          const kw = parsedUrl.searchParams.get('keyword');
          const cat = parsedUrl.searchParams.get('category');
          if (kw) {
            const cleanKw = decodeURIComponent(kw).trim();
            const words = cleanKw.split(/[\s+-]+/).filter(Boolean);
            const cluster = words.length > 2 ? `${words[0]} ${words[1]}...` : cleanKw;
            prefix = `${origin}/search?keyword=${encodeURIComponent(cluster)}`;
            ruleDesc = `URL contains /search?keyword=`;
          } else if (cat) {
            prefix = `${origin}/search?category=${cat}`;
            ruleDesc = `URL contains category=${cat}`;
          } else {
            prefix = `${origin}/search`;
            ruleDesc = 'URL contains /search';
          }
        } catch (err) {
          prefix = `${origin}/search`;
          ruleDesc = 'URL contains /search';
        }
      } else if (origin.includes('trip.com') || d.product === 'Trip') {
        // Gom nhóm tiền tố cấu trúc cho Trip.com (theo danh mục cấp 1 & cấp 2)
        const segments = pathname.split('/').filter(Boolean);
        const seg1 = segments[0] || '';
        const seg2 = segments[1] || '';
        if (seg1 === 'guide' || seg1 === 'travel-guide') {
          if (seg2) {
            prefix = `${origin}/${seg1}/${seg2}/`;
            ruleDesc = `URL contains /${seg1}/${seg2}/`;
          } else {
            prefix = `${origin}/${seg1}/`;
            ruleDesc = `URL contains /${seg1}/`;
          }
        } else if (seg1 === 'blog' || seg1 === 'moments' || seg1 === 'hot') {
          prefix = `${origin}/${seg1}/`;
          ruleDesc = `URL contains /${seg1}/`;
        } else if (seg1 === 'flights') {
          if (seg2 === 'status') {
            prefix = `${origin}/flights/status/`;
            ruleDesc = 'URL contains /flights/status/';
          } else {
            prefix = `${origin}/flights/`;
            ruleDesc = 'URL contains /flights/';
          }
        } else if (seg1 === 'hotels' || seg1 === 'm') {
          prefix = `${origin}/hotels/`;
          ruleDesc = 'URL contains /hotels/';
        } else if (segments.length >= 2) {
          prefix = `${origin}/${seg1}/${seg2}/`;
          ruleDesc = `URL contains /${seg1}/${seg2}/`;
        } else if (segments.length === 1) {
          prefix = `${origin}/${seg1}/`;
          ruleDesc = `URL contains /${seg1}/`;
        } else {
          ruleDesc = `URL contains ${pathname}`;
        }
      } else {
        const segments = pathname.split('/').filter(Boolean);
        if (segments.length >= 2) {
          prefix = `${origin}/${segments[0]}/${segments[1]}/`;
          ruleDesc = `URL contains /${segments[0]}/${segments[1]}/`;
        } else if (segments.length === 1) {
          prefix = `${origin}/${segments[0]}/`;
          ruleDesc = `URL contains /${segments[0]}/`;
        } else {
          prefix = origin || cleanUrl;
          ruleDesc = `URL contains ${pathname || '/'}`;
        }
      }

      if (!pathMap[prefix]) {
        pathMap[prefix] = {
          prefix,
          headline: d.headline || '',
          ruleDesc: ruleDesc || `URL contains ${prefix}`,
          urlType: d.urlType || 'KHÁC',
          terms: 0,
          clicks: 0,
          imp: 0,
          cost: 0,
          sampleUrls: new Set(),
          googleExcludedCount: 0
        };
      }
      if (!pathMap[prefix].headline && d.headline) {
        pathMap[prefix].headline = d.headline;
      }
      pathMap[prefix].terms++;
      pathMap[prefix].clicks += (d.clicks || 0);
      pathMap[prefix].imp += (d.impressions || 0);
      pathMap[prefix].cost += (d.cost || 0);
      if (d.isExcludedByGoogle) {
        pathMap[prefix].googleExcludedCount++;
      }
      if (pathMap[prefix].sampleUrls.size < 5) {
        pathMap[prefix].sampleUrls.add(d.url);
      }
    });
    pathList = Object.values(pathMap);
  } else {
    // CHẾ ĐỘ 2: Chi tiết 100% từng URL đơn lẻ
    const singleUrlMap = {};
    data.forEach(d => {
      if (!d.url) return;
      const cleanUrl = d.url.split('#')[0]; // Giữ nguyên query param
      if (!singleUrlMap[cleanUrl]) {
        singleUrlMap[cleanUrl] = {
          prefix: cleanUrl,
          headline: d.headline || '',
          urlType: d.urlType || 'KHÁC',
          terms: 0,
          clicks: 0,
          imp: 0,
          cost: 0,
          sampleTerms: [],
          isGoogleExcluded: false
        };
      }
      if (!singleUrlMap[cleanUrl].headline && d.headline) {
        singleUrlMap[cleanUrl].headline = d.headline;
      }
      singleUrlMap[cleanUrl].terms++;
      singleUrlMap[cleanUrl].clicks += (d.clicks || 0);
      singleUrlMap[cleanUrl].imp += (d.impressions || 0);
      singleUrlMap[cleanUrl].cost += (d.cost || 0);
      if (singleUrlMap[cleanUrl].sampleTerms.length < 3 && d.term) {
        singleUrlMap[cleanUrl].sampleTerms.push(d.term);
      }
    });
    pathList = Object.values(singleUrlMap);
  }

  // Filter by search keyword, category, and exclusion status
  const filterKeyword = (document.getElementById('urlSearchFilter')?.value || '').toLowerCase().trim();
  const categoryFilter = document.getElementById('urlCategoryFilter')?.value || 'ALL';
  const exclFilter = document.getElementById('urlExclFilter')?.value || 'ALL';

  if (filterKeyword) {
    pathList = pathList.filter(p => p.prefix.toLowerCase().includes(filterKeyword) || p.urlType.toLowerCase().includes(filterKeyword));
  }
  if (categoryFilter !== 'ALL') {
    pathList = pathList.filter(p => p.urlType === categoryFilter);
  }
  if (exclFilter === 'ACTIVE') {
    pathList = pathList.filter(p => !stNegativeUrls.has(p.prefix));
  } else if (exclFilter === 'EXCLUDED') {
    pathList = pathList.filter(p => stNegativeUrls.has(p.prefix));
  }

  // Update table header sorting indicators
  updateUrlHeaderSortArrows();

  // Multi-column sorting logic
  pathList.sort((a, b) => {
    let valA, valB;
    if (urlSortColumn === 'prefix') {
      valA = a.prefix.toLowerCase();
      valB = b.prefix.toLowerCase();
      return urlSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    } else if (urlSortColumn === 'urlType') {
      valA = a.urlType.toLowerCase();
      valB = b.urlType.toLowerCase();
      return urlSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    } else if (urlSortColumn === 'terms') {
      valA = a.terms;
      valB = b.terms;
    } else if (urlSortColumn === 'imp') {
      valA = a.imp;
      valB = b.imp;
    } else if (urlSortColumn === 'ctr') {
      valA = a.imp > 0 ? (a.clicks / a.imp) : 0;
      valB = b.imp > 0 ? (b.clicks / b.imp) : 0;
    } else if (urlSortColumn === 'cost') {
      valA = a.cost;
      valB = b.cost;
    } else {
      // Default: clicks
      valA = a.clicks;
      valB = b.clicks;
    }

    return urlSortOrder === 'asc' ? (valA - valB) : (valB - valA);
  });

  // Dynamic pagination calculation
  const limitVal = document.getElementById('urlLimitSelect')?.value || '50';
  const totalItems = pathList.length;
  let pageSize = limitVal === 'ALL' ? totalItems : (parseInt(limitVal, 10) || 50);
  if (pageSize <= 0) pageSize = 50;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (urlCurrentPage > totalPages) urlCurrentPage = totalPages;
  if (urlCurrentPage < 1) urlCurrentPage = 1;

  const startIndex = (urlCurrentPage - 1) * pageSize;
  const endIndex = limitVal === 'ALL' ? totalItems : Math.min(startIndex + pageSize, totalItems);
  const pageItems = pathList.slice(startIndex, endIndex);

  let rowsHtml = '';
  pageItems.forEach(p => {
    const ctr = p.imp > 0 ? ((p.clicks / p.imp) * 100).toFixed(2) + '%' : '0.00%';
    const isExcluded = stNegativeUrls.has(p.prefix);
    let actionBadge = '';

    if (urlViewMode === 'structure') {
      // Chế độ 1: Hiển thị quy tắc tạo Dynamic Ad Target & nút xem các URL con
      const cleanRule = p.ruleDesc || `URL contains ${p.prefix}`;
      actionBadge = `
        <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
          <button class="btn btn-sm btn-secondary" onclick="navigator.clipboard.writeText('${escapeHtml(cleanRule)}'); showToast('Đã copy quy tắc DSA: ${escapeHtml(cleanRule)}')">
            📋 Copy Rule
          </button>
          <button class="btn btn-sm btn-primary" onclick="drillDownIntoUrl('${escapeHtml(p.prefix)}')" title="Xem toàn bộ các URL đơn lẻ thuộc cấu trúc này">
            🔍 Xem ${p.terms} URLs
          </button>
        </div>
      `;
    } else {
      // Chế độ 2: Hiển thị nút phủ định từng URL đơn lẻ và link mở trực tiếp
      if (isExcluded) {
        actionBadge = `
          <div style="display: flex; gap: 6px; align-items: center;">
            <button class="btn btn-sm btn-secondary" onclick="toggleNegativeUrl('${escapeHtml(p.prefix)}')">✓ Đã loại trừ</button>
            <a href="${escapeHtml(p.prefix)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-secondary" style="text-decoration:none;" title="Mở trang web trong tab mới">
              ↗
            </a>
          </div>
        `;
      } else {
        actionBadge = `
          <div style="display: flex; gap: 6px; align-items: center;">
            <button class="btn btn-sm btn-danger" onclick="toggleNegativeUrl('${escapeHtml(p.prefix)}')" title="Chặn URL này không cho chạy DSA nữa">
              + Loại trừ
            </button>
            <a href="${escapeHtml(p.prefix)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-secondary" style="text-decoration:none;" title="Mở trang web trong tab mới">
              ↗
            </a>
          </div>
        `;
      }
    }

    let urlCellContent = '';
    const rawHeadline = p.headline || '';
    const transElementId = rawHeadline ? hashTextToId(rawHeadline) : '';
    const currentTranslation = rawHeadline ? getOrQueueHeadlineTranslation(rawHeadline, transElementId) : '';

    let headlineHtml = '';
    if (rawHeadline) {
      headlineHtml = `
        <div style="margin-top: 4px; font-size: 0.78rem; color: #cbd5e1; line-height: 1.35;">
          📌 <b>Tiêu đề:</b> ${escapeHtml(rawHeadline)}
        </div>
        <div id="${transElementId}" style="margin-top: 2px; font-size: 0.74rem; color: #38bdf8; line-height: 1.35; background: rgba(56, 189, 248, 0.08); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(56, 189, 248, 0.15);">
          🇻🇳 <b>Dịch:</b> ${currentTranslation ? escapeHtml(currentTranslation) : '<span style="opacity:0.7;">Đang tải bản dịch...</span>'}
        </div>
      `;
    }

    if (urlViewMode === 'structure') {
      urlCellContent = `
        <div class="font-semibold font-mono text-xs" style="color: #60a5fa; word-break: break-all;">
          ${escapeHtml(p.prefix)}
        </div>
        ${headlineHtml}
        <div class="text-xs text-muted" style="margin-top: 4px;">
          Quy tắc đề xuất: <code style="background: rgba(255,255,255,0.06); padding: 1px 4px; border-radius: 3px;">${escapeHtml(p.ruleDesc || '')}</code>
        </div>
      `;
    } else {
      urlCellContent = `
        <div class="font-semibold font-mono text-xs" style="word-break: break-all;">
          ${escapeHtml(p.prefix)}
        </div>
        ${headlineHtml}
      `;
    }

    rowsHtml += `
      <tr>
        <td style="max-width: 380px;">${urlCellContent}</td>
        <td><span class="aff-badge aff-badge-${p.urlType.toLowerCase()}">${p.urlType}</span></td>
        <td class="font-bold text-center">${p.terms.toLocaleString()}</td>
        <td class="font-semibold text-primary font-bold text-center">${p.clicks.toLocaleString()}</td>
        <td class="text-center">${p.imp.toLocaleString()}</td>
        <td class="text-center">${ctr}</td>
        <td>${formatCurrency(Math.round(p.cost))}</td>
        <td>${actionBadge}</td>
      </tr>
    `;
  });

  tbody.innerHTML = rowsHtml || `<tr><td colspan="8" class="text-center text-muted">Không tìm thấy dữ liệu phù hợp</td></tr>`;

  // Render Pagination Controls
  renderUrlPaginationBar(totalItems, startIndex, endIndex, totalPages);
}

// Update sorting arrows on table header
function updateUrlHeaderSortArrows() {
  const headers = document.querySelectorAll('#urlGroupTable th.th-sortable');
  headers.forEach(th => {
    const col = th.getAttribute('data-col');
    const arrow = document.getElementById(`sort-${col}`);
    if (col === urlSortColumn) {
      th.classList.add('active');
      if (arrow) arrow.innerText = urlSortOrder === 'asc' ? '↑' : '↓';
    } else {
      th.classList.remove('active');
      if (arrow) arrow.innerText = '↕';
    }
  });

  // Keep top select dropdown synchronized
  const sortSelect = document.getElementById('urlSortSelect');
  if (sortSelect) {
    const mappedVal = `${urlSortColumn}_${urlSortOrder}`;
    if (sortSelect.querySelector(`option[value="${mappedVal}"]`)) {
      sortSelect.value = mappedVal;
    }
  }
}

// Handle clicking on header titles to sort
window.handleUrlHeaderSort = function(columnName) {
  if (urlSortColumn === columnName) {
    urlSortOrder = urlSortOrder === 'desc' ? 'asc' : 'desc';
  } else {
    urlSortColumn = columnName;
    urlSortOrder = (columnName === 'prefix' || columnName === 'urlType') ? 'asc' : 'desc';
  }
  urlCurrentPage = 1; // Reset to page 1 on sort change
  renderUrlDiscoveryTab(getFilteredSearchTerms());
};

// Render Pagination Bar & Buttons (Prev, Pages, Next)
function renderUrlPaginationBar(totalItems, startIndex, endIndex, totalPages) {
  const bar = document.getElementById('urlPaginationBar');
  const info = document.getElementById('urlPaginationInfo');
  const controls = document.getElementById('urlPaginationControls');
  if (!bar || !info || !controls) return;

  if (totalItems === 0) {
    bar.style.display = 'none';
    return;
  }

  bar.style.display = 'flex';
  const unitLabel = urlViewMode === 'structure' ? 'cấu trúc URL' : 'địa chỉ URL đơn lẻ';
  info.innerHTML = `Hiển thị <b>${startIndex + 1} - ${endIndex}</b> trong tổng số <b>${totalItems.toLocaleString()}</b> ${unitLabel} (Trang <b>${urlCurrentPage}</b> / ${totalPages})`;

  if (totalPages <= 1) {
    controls.innerHTML = '';
    return;
  }

  let html = `
    <button class="page-btn" ${urlCurrentPage === 1 ? 'disabled' : ''} onclick="changeUrlPage(1)" title="Trang đầu">««</button>
    <button class="page-btn" ${urlCurrentPage === 1 ? 'disabled' : ''} onclick="changeUrlPage(${urlCurrentPage - 1})" title="Trang trước">« Trước</button>
  `;

  // Determine pagination window (e.g. 1 2 3 ... 10)
  const maxButtons = 5;
  let startP = Math.max(1, urlCurrentPage - 2);
  let endP = Math.min(totalPages, startP + maxButtons - 1);
  if (endP - startP < maxButtons - 1) {
    startP = Math.max(1, endP - maxButtons + 1);
  }

  if (startP > 1) {
    html += `<button class="page-btn" onclick="changeUrlPage(1)">1</button>`;
    if (startP > 2) html += `<span style="color:#64748b; padding:0 3px;">...</span>`;
  }

  for (let i = startP; i <= endP; i++) {
    html += `<button class="page-btn ${i === urlCurrentPage ? 'active' : ''}" onclick="changeUrlPage(${i})">${i}</button>`;
  }

  if (endP < totalPages) {
    if (endP < totalPages - 1) html += `<span style="color:#64748b; padding:0 3px;">...</span>`;
    html += `<button class="page-btn" onclick="changeUrlPage(${totalPages})">${totalPages}</button>`;
  }

  html += `
    <button class="page-btn" ${urlCurrentPage === totalPages ? 'disabled' : ''} onclick="changeUrlPage(${urlCurrentPage + 1})" title="Trang sau">Sau »</button>
    <button class="page-btn" ${urlCurrentPage === totalPages ? 'disabled' : ''} onclick="changeUrlPage(${totalPages})" title="Trang cuối">»»</button>
  `;

  controls.innerHTML = html;
}

window.changeUrlPage = function(pageNumber) {
  urlCurrentPage = pageNumber;
  renderUrlDiscoveryTab(getFilteredSearchTerms());
  // Smooth scroll back to top of table
  document.getElementById('urlGroupTable')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

// Drill down from structure into single URLs
window.drillDownIntoUrl = function(prefix) {
  const searchInput = document.getElementById('urlSearchFilter');
  // Strip wildcards and query indicators for search query
  const cleanTerm = prefix.replace(/\*-[a-z0-9]+/g, '').replace(/[()]/g, '').trim();
  if (searchInput) {
    searchInput.value = cleanTerm;
  }
  // Switch to single URL mode automatically
  const btnModeSingle = document.getElementById('btnViewModeSingle');
  const btnModeStruct = document.getElementById('btnViewModeStructure');
  if (btnModeSingle && btnModeStruct) {
    urlViewMode = 'single';
    urlCurrentPage = 1;
    btnModeSingle.className = 'btn btn-sm btn-primary';
    btnModeStruct.className = 'btn btn-sm btn-secondary';
    const desc = document.getElementById('urlViewModeDesc');
    if (desc) desc.innerHTML = `Đang xem: <b>Chi tiết từng URL đơn lẻ thuộc cấu trúc "${escapeHtml(prefix)}"</b>`;
    const colLabel = document.getElementById('urlColHeaderLabel');
    if (colLabel) colLabel.innerText = 'Địa Chỉ URL Trang Đích Đơn Lẻ';
  }
  renderUrlDiscoveryTab(getFilteredSearchTerms());
  showToast(`Đã lọc danh sách URL thuộc cấu trúc: ${prefix}`);
  document.getElementById('urlGroupTable')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

window.toggleNegativeUrl = function(urlPrefix) {
  if (stNegativeUrls.has(urlPrefix)) {
    stNegativeUrls.delete(urlPrefix);
    showToast(`Đã khôi phục URL: ${urlPrefix}`);
  } else {
    stNegativeUrls.add(urlPrefix);
    showToast(`Đã thêm vào danh sách loại trừ URL: ${urlPrefix}`);
  }
  saveNegativeUrlsState();
  renderUrlDiscoveryTab(getFilteredSearchTerms());
  renderNegativesManagerTab();
};

// Modal: Nhập danh sách URL đã loại trừ từ Google Ads
window.openImportNegativeUrlsModal = function() {
  const modal = document.getElementById('modalImportNegativeUrls');
  const txt = document.getElementById('txtImportNegativeUrls');
  const countInfo = document.getElementById('txtImportUrlCountInfo');
  const fileStatus = document.getElementById('fileImportNegativeCsvStatus');
  if (fileStatus) fileStatus.innerText = '';
  if (modal) {
    if (txt && stNegativeUrls.size > 0 && !txt.value.trim()) {
      txt.value = Array.from(stNegativeUrls).join('\n');
    }
    if (countInfo) {
      countInfo.innerText = `Hiện có ${stNegativeUrls.size} URL trong danh sách loại trừ`;
    }
    modal.style.display = 'flex';
  }
};

window.closeImportNegativeUrlsModal = function() {
  const modal = document.getElementById('modalImportNegativeUrls');
  if (modal) modal.style.display = 'none';
};

// Xử lý nạp trực tiếp file Báo cáo mục tiêu quảng cáo động phủ định (.csv)
// Chỉ lọc lấy 'URL bằng', bỏ qua hoàn toàn các quy tắc 'URL chứa' để tránh lỗi/phủ định nhầm
window.handleNegativeCsvUpload = function(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const statusEl = document.getElementById('fileImportNegativeCsvStatus');
  const txt = document.getElementById('txtImportNegativeUrls');

  if (statusEl) statusEl.innerText = `Đang đọc ${file.name}...`;

  const reader = new FileReader();
  reader.onload = function(e) {
    const content = e.target.result;
    const lines = content.split(/\r?\n/);

    const extractedUrls = [];
    let skippedContainsCount = 0;

    lines.forEach(rawLine => {
      const line = rawLine.trim();
      if (!line) return;

      // Tìm chuỗi "URL bằng <link>"
      const matchEquals = line.match(/URL\s+b[ằa]ng\s+(https?:\/\/[^\s,"]+)/i);
      if (matchEquals && matchEquals[1]) {
        extractedUrls.push(matchEquals[1].trim());
      } else if (/URL\s+ch[ứu]a/i.test(line)) {
        skippedContainsCount++;
      } else if (/^https?:\/\//i.test(line)) {
        // Link thuần tuý nếu user có file txt/csv chỉ có url
        const cleanUrl = line.split(/[,;\t]/)[0].replace(/^["']|["']$/g, '').trim();
        if (cleanUrl) extractedUrls.push(cleanUrl);
      }
    });

    if (extractedUrls.length === 0) {
      if (statusEl) statusEl.innerHTML = `<span style="color: #ef4444;">⚠️ Không tìm thấy URL dạng "URL bằng" trong file!</span>`;
      return;
    }

    // Ghép vào ô textarea hiện tại (loại bỏ trùng lặp)
    const existing = (txt ? txt.value.split('\n') : []).map(l => l.trim()).filter(Boolean);
    const setAll = new Set([...existing, ...extractedUrls]);
    if (txt) {
      txt.value = Array.from(setAll).join('\n');
    }

    if (statusEl) {
      statusEl.innerHTML = `<span style="color: #10b981;">✓ Đã trích xuất <b>${extractedUrls.length}</b> link chính xác (bỏ qua ${skippedContainsCount} quy tắc "chứa")</span>`;
    }
    const countInfo = document.getElementById('txtImportUrlCountInfo');
    if (countInfo) {
      countInfo.innerText = `Đã chuẩn bị ${setAll.size} URL`;
    }
    showToast(`✅ Đã trích xuất ${extractedUrls.length} URL chính xác từ file báo cáo!`);
  };

  reader.onerror = function() {
    if (statusEl) statusEl.innerHTML = `<span style="color: #ef4444;">Lỗi đọc file!</span>`;
  };

  reader.readAsText(file);
  // Reset input để có thể chọn lại cùng file
  event.target.value = '';
};

window.submitImportNegativeUrls = function() {
  const txt = document.getElementById('txtImportNegativeUrls');
  if (!txt) return;
  const lines = txt.value.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    showToast('Vui lòng dán ít nhất 1 URL hoặc nạp file CSV!', true);
    return;
  }
  let addedCount = 0;
  lines.forEach(u => {
    // Chỉ lấy URL dạng bằng, bỏ qua nếu là quy tắc chứa
    if (/URL\s+ch[ứu]a/i.test(u) || /^EXCLUDE\s+URL\s+contains/i.test(u)) {
      return;
    }
    let clean = u.replace(/^(URL\s+b[ằa]ng\s+)/i, '')
                 .replace(/^(EXCLUDE\s+URL\s+equals\s+)/i, '')
                 .replace(/^(EXCLUDE\s+URL\s+)/i, '')
                 .trim();
    if (clean && !stNegativeUrls.has(clean)) {
      stNegativeUrls.add(clean);
      addedCount++;
    }
  });
  saveNegativeUrlsState();
  closeImportNegativeUrlsModal();
  renderUrlDiscoveryTab(getFilteredSearchTerms());
  renderNegativesManagerTab();
  showToast(`✅ Đã nhập thành công ${addedCount} URL loại trừ chính xác!`);
};

// Generate recommended DSA rules dynamically
function getStrategyRulesList(product) {
  let rules = [];
  if (product === 'Traveloka') {
    rules = [
      { 
        badge: 'KHUYẾN NGHỊ CAO', 
        badgeClass: 'dest_acc', 
        title: 'Tạo Chiến Dịch DSA Khách Sạn & Lưu Trú (-acc)', 
        rule: 'URL contains -acc', 
        desc: 'Tập trung tối đa ngân sách vào các trang điểm đến gắn liền khách sạn, resort (nhóm sinh ra nhiều click & chuyển đổi cao nhất).' 
      },
      { 
        badge: 'KHUYẾN NGHỊ', 
        badgeClass: 'dest_gt', 
        title: 'Tạo Chiến Dịch DSA Phương Tiện Di Chuyển (-gt)', 
        rule: 'URL contains -gt', 
        desc: 'Bắt các truy vấn tìm kiếm vé xe khách, bến xe, tàu hỏa, terminal sân bay (Ground Transport).' 
      },
      { 
        badge: 'CÂN NHẮC TÁCH RIÊNG', 
        badgeClass: 'culinary', 
        title: 'Kiểm Soát Nhóm Ẩm Thực (/culinary/)', 
        rule: 'URL contains /culinary/', 
        desc: 'Nhóm bài viết ăn uống chiếm hơn 50% chi phí nhưng ít chuyển đổi đặt phòng. Nên đặt ngân sách hạn mức riêng.' 
      },
      { 
        badge: 'PHỦ ĐỊNH CẤP THIẾT', 
        badgeClass: 'blog', 
        title: 'Phủ Định Dynamic Target Bài Viết Quán Ăn', 
        rule: 'EXCLUDE URL contains /explore/culinary/', 
        desc: 'Nếu mục tiêu tài khoản chỉ là bán vé máy bay / phòng khách sạn, hãy loại trừ ngay nhóm này để tránh hao hụt ngân sách.' 
      }
    ];
  } else if (product === 'Shopee') {
    rules = [
      { 
        badge: 'KHUYẾN NGHỊ CAO', 
        badgeClass: 'list', 
        title: 'Tạo Campaign DSA Ngành Hàng Danh Mục (/list/)', 
        rule: 'URL contains /list/', 
        desc: 'Tập trung vào các trang danh mục sản phẩm có ý định mua sắm cao của người dùng.' 
      },
      { 
        badge: 'KHUYẾN NGHỊ', 
        badgeClass: 'search', 
        title: 'Tạo Campaign DSA Tìm Kiếm Từ Khóa (/search)', 
        rule: 'URL contains /search', 
        desc: 'Bắt các truy vấn tìm kiếm hàng hóa cụ thể do người mua gõ trên thanh tìm kiếm.' 
      },
      { 
        badge: 'CÂN NHẮC LOẠI TRỪ', 
        badgeClass: 'blog', 
        title: 'Phủ Định Bài Viết Mẹo / Blog Không Ra Đơn', 
        rule: 'EXCLUDE URL contains /inspirasi-shopee/', 
        desc: 'Nếu chiến dịch DSA nhắm tới mua hàng trực tiếp, nên loại trừ thư mục bài viết mẹo để tránh người dùng click đọc mẹo vặt rồi thoát.' 
      }
    ];
  } else if (product === 'Trip') {
    rules = [
      { 
        badge: 'KHUYẾN NGHỊ CAO', 
        badgeClass: 'dest_acc', 
        title: 'Tạo Campaign DSA Đặt Phòng Khách Sạn Trực Tiếp (/hotels/)', 
        rule: 'URL contains /hotels/', 
        desc: 'Tập trung nhắm mục tiêu vào các trang khách sạn cụ thể có tỷ lệ chuyển đổi đặt phòng cao nhất.' 
      },
      { 
        badge: 'KHUYẾN NGHỊ CAO', 
        badgeClass: 'shop', 
        title: 'Tạo Campaign DSA Đặt Vé Máy Bay (/flights/)', 
        rule: 'URL contains /flights/', 
        desc: 'Bắt các truy vấn tìm kiếm chặng bay du lịch quốc tế và nội địa có nhu cầu mua vé thực tế.' 
      },
      { 
        badge: 'CÂN NHẮC TÁCH RIÊNG', 
        badgeClass: 'dest_gt', 
        title: 'Kiểm Soát Nhóm Phương Tiện / Metro / Sân Bay (/guide/transport/)', 
        rule: 'URL contains /guide/transport/', 
        desc: 'Nhóm cẩm nang giao thông (MRT, tàu hỏa, xe bus, terminal) thu hút lượng click lớn nhưng ý định chủ yếu là tra cứu bản đồ.' 
      },
      { 
        badge: 'CÂN NHẮC LOẠI TRỪ', 
        badgeClass: 'blog', 
        title: 'Phủ Định Cẩm Nang Mẹo Vặt & Thời Tiết Không Ra Đơn (/guide/info/)', 
        rule: 'EXCLUDE URL contains /guide/info/', 
        desc: 'Thư mục /guide/info/ chứa các trang xem thời tiết, hỏi đáp VPN/Sim, ngày nghỉ lễ... thường tốn chi phí click mà ít sinh giao dịch đặt chỗ.' 
      },
      { 
        badge: 'CÂN NHẮC LOẠI TRỪ', 
        badgeClass: 'blog', 
        title: 'Phủ Định Mạng Xã Hội Du Lịch & Bài Blog Đọc Vặt', 
        rule: 'EXCLUDE URL contains /blog/ | EXCLUDE URL contains /moments/', 
        desc: 'Loại trừ các bài viết blog mẹo vặt và cộng đồng chia sẻ ảnh Moments nếu mục tiêu chiến dịch là bán vé và phòng trực tiếp.' 
      }
    ];
  } else {
    rules = [
      { 
        badge: 'KHUYẾN NGHỊ', 
        badgeClass: 'list', 
        title: 'Tạo Campaign DSA Danh Mục Chính', 
        rule: 'URL contains /list/', 
        desc: 'Tập trung vào trang phân loại và danh mục chính của website.' 
      },
      { 
        badge: 'KHUYẾN NGHỊ', 
        badgeClass: 'search', 
        title: 'Tạo Campaign DSA Tìm Kiếm', 
        rule: 'URL contains /search', 
        desc: 'Bắt các truy vấn tìm kiếm cụ thể của người dùng.' 
      },
      { 
        badge: 'PHỦ ĐỊNH CẤP THIẾT', 
        badgeClass: 'blog', 
        title: 'Phủ Định Trang Tin Tức / Blog', 
        rule: 'EXCLUDE URL contains /blog/', 
        desc: 'Chặn các trang bài viết hướng dẫn tin tức không mang lại giá trị mua hàng.' 
      }
    ];
  }
  return rules;
}

// Render on-page interactive strategy box
function renderStrategyRecommendationBox(product, container) {
  if (!container) return;
  const rules = getStrategyRulesList(product);

  let html = `
    <div class="strategy-banner" style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 12px; padding: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.25);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 22px;">💡</span>
          <div>
            <h4 style="font-size: 1rem; font-weight: 700; color: #f8fafc; margin: 0;">Khuyến Nghị Cấu Hình Chiến Lược Google Ads DSA (${escapeHtml(product)})</h4>
            <p style="font-size: 0.78rem; color: #94a3b8; margin: 2px 0 0 0;">Quy tắc Dynamic Target & Loại trừ tối ưu nhất dựa trên phân tích dữ liệu thực tế</p>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-sm btn-primary" onclick="copyAllStrategyRules('${escapeHtml(product)}')">
            📋 Sao Chép Toàn Bộ Quy Tắc
          </button>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;">
  `;

  rules.forEach(r => {
    html += `
      <div style="background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 12px 14px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span class="aff-badge aff-badge-${r.badgeClass}">${r.badge}</span>
            <button class="btn-copy-code" style="background: rgba(255,255,255,0.08); border: none; border-radius: 4px; padding: 2px 8px; font-size: 11px; color: #93c5fd; cursor: pointer;" onclick="copySingleRuleText('${escapeHtml(r.rule)}')">
              📋 Copy Quy tắc
            </button>
          </div>
          <div style="font-size: 0.85rem; font-weight: 700; color: #e2e8f0; margin-bottom: 4px;">${escapeHtml(r.title)}</div>
          <div style="font-family: var(--font-mono); font-size: 0.75rem; color: #60a5fa; background: rgba(59, 130, 246, 0.1); padding: 4px 8px; border-radius: 4px; margin-bottom: 8px; word-break: break-all;">
            <b>${escapeHtml(r.rule)}</b>
          </div>
        </div>
        <div style="font-size: 0.75rem; color: #94a3b8; line-height: 1.4;">${escapeHtml(r.desc)}</div>
      </div>
    `;
  });

  html += `
      </div>
    </div>
  `;

  container.innerHTML = html;
}

window.copySingleRuleText = function(ruleText) {
  navigator.clipboard.writeText(ruleText).then(() => {
    showToast(`Đã sao chép: ${ruleText}`);
  }).catch(() => {
    showToast('Lỗi sao chép Clipboard!', true);
  });
};

window.copyAllStrategyRules = function(product) {
  const rules = getStrategyRulesList(product);
  const text = rules.map(r => `[${r.badge}] ${r.title}\nQuy tắc Google Ads: ${r.rule}\nMục đích: ${r.desc}`).join('\n\n');
  navigator.clipboard.writeText(text).then(() => {
    showToast('Đã sao chép toàn bộ khuyến nghị cấu hình!');
  }).catch(() => {
    showToast('Lỗi sao chép Clipboard!', true);
  });
};

// Export URL Target Rules to CSV
function exportUrlRulesReport() {
  const data = getFilteredSearchTerms();
  if (data.length === 0) {
    showToast('Chưa có dữ liệu để xuất!', true);
    return;
  }

  const currentProduct = (activeProductFilter !== 'auto') 
    ? activeProductFilter 
    : (data.find(d => d.product && d.product !== 'Khác')?.product || 'Shopee');

  const ruleList = getStrategyRulesList(currentProduct);
  const rules = ruleList.map(r => ({
    Loai: r.badge + ": " + r.title,
    Quy_Tac_Google_Ads: r.rule,
    Muc_Dich: r.desc
  }));

  // Append user's custom negative URLs
  stNegativeUrls.forEach(u => {
    rules.push({ Loai: "USER NEGATIVE TARGET", Quy_Tac_Google_Ads: `EXCLUDE URL equals ${u}`, Muc_Dich: "Nguoi dung tu chon loai tru tren cong cu" });
  });

  const csv = Papa.unparse(rules);
  downloadCsv(csv, `Google_Ads_DSA_Target_Rules_${currentProduct}.csv`);
  showToast('Đã xuất file cấu hình quy tắc DSA Target!');
}

// =========================================================================
// SUBTAB 2: N-GRAM FREQUENCY ANALYSIS & NEGATIVE BUILDER (1, 2, 3-GRAM)
// =========================================================================
function renderNgramTable() {
  const tbody = document.querySelector('#ngramTable tbody');
  const searchFilter = (document.getElementById('ngramSearchInput')?.value || '').toLowerCase().trim();
  if (!tbody) return;

  let data = getFilteredSearchTerms();
  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Chưa có dữ liệu</td></tr>`;
    return;
  }

  // Filter out terms already excluded in Google Ads if checkbox is checked
  const skipAlreadyExcluded = document.getElementById('ngramExcludeAlreadyNeg')?.checked ?? true;
  if (skipAlreadyExcluded) {
    data = data.filter(d => !d.isExcludedByGoogle);
  }

  // Lọc cụm từ tìm kiếm thực tế theo số lượng từ (1 từ, 2 từ, 3 từ, 4 từ trở lên)
  const termMap = {};

  data.forEach(d => {
    const rawTerm = (d.term || '').trim();
    if (!rawTerm) return;

    // Tách các từ trong cụm từ tìm kiếm thực tế
    const words = rawTerm
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    const wordCount = words.length;
    let match = false;

    if (currentNgramType === 1 && wordCount === 1) {
      match = true;
    } else if (currentNgramType === 2 && wordCount === 2) {
      match = true;
    } else if (currentNgramType === 3 && wordCount === 3) {
      match = true;
    } else if (currentNgramType === 4 && wordCount >= 4) {
      match = true;
    }

    if (match) {
      const key = rawTerm.toLowerCase();
      if (!termMap[key]) {
        termMap[key] = {
          word: rawTerm,
          count: 0,
          clicks: 0,
          impressions: 0,
          cost: 0,
          conversions: 0
        };
      }
      termMap[key].count++;
      termMap[key].clicks += d.clicks || 0;
      termMap[key].impressions += d.impressions || 0;
      termMap[key].cost += d.cost || 0;
      termMap[key].conversions += d.conversions || 0;
    }
  });

  let list = Object.values(termMap);
  if (searchFilter) {
    list = list.filter(item => item.word.toLowerCase().includes(searchFilter));
  }

  // Sort danh sách linh hoạt theo cột và chiều
  list.sort((a, b) => {
    let valA = a[ngramSortColumn];
    let valB = b[ngramSortColumn];
    if (ngramSortColumn === 'word') {
      return ngramSortOrder === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    }
    valA = Number(valA) || 0;
    valB = Number(valB) || 0;
    return ngramSortOrder === 'asc' ? valA - valB : valB - valA;
  });

  // Cập nhật mũi tên header bảng Tab 2 & đồng bộ dropdown sort
  updateNgramHeaderSortArrows();

  // Xử lý phân trang Tab 2
  const limitVal = document.getElementById('ngramLimitSelect')?.value || '100';
  const totalItems = list.length;
  let pageSize = totalItems;
  if (limitVal !== 'ALL') {
    pageSize = parseInt(limitVal, 10) || 100;
  }

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (ngramCurrentPage > totalPages) ngramCurrentPage = totalPages;
  if (ngramCurrentPage < 1) ngramCurrentPage = 1;

  const startIndex = (ngramCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const pageItems = list.slice(startIndex, endIndex);

  let rows = '';
  pageItems.forEach((item, idx) => {
    const isChecked = ngramSelectedWords.has(item.word);
    const transId = `term_len_trans_${startIndex + idx}`;
    const trans = translateNgramWord(item.word, transId);
    rows += `
      <tr>
        <td>
          <input type="checkbox" class="ngram-row-chk" data-word="${escapeHtml(item.word)}" ${isChecked ? 'checked' : ''} onchange="toggleNgramSelection('${escapeHtml(item.word)}', this.checked)">
        </td>
        <td class="font-semibold text-white">${escapeHtml(item.word)}</td>
        <td class="ngram-translation" id="${transId}">${escapeHtml(trans)}</td>
        <td class="text-primary font-bold">${item.count.toLocaleString()}</td>
        <td>${item.clicks.toLocaleString()}</td>
        <td>${formatCurrency(Math.round(item.cost))}</td>
      </tr>
    `;
  });

  tbody.innerHTML = rows || `<tr><td colspan="6" class="text-center text-muted">Không tìm thấy cụm từ nào có ${currentNgramType === 4 ? '4 từ trở lên' : currentNgramType + ' từ'}</td></tr>`;

  // Render thanh phân trang
  renderNgramPaginationBar(totalItems, startIndex, endIndex, totalPages);
}

// Cập nhật mũi tên sắp xếp header bảng Tab 2
function updateNgramHeaderSortArrows() {
  const headers = document.querySelectorAll('#ngramTable th.th-sortable');
  headers.forEach(th => {
    const col = th.getAttribute('data-col');
    const arrow = document.getElementById(`sort-ngram-${col}`);
    if (col === ngramSortColumn) {
      th.classList.add('active');
      if (arrow) arrow.innerText = ngramSortOrder === 'asc' ? '↑' : '↓';
    } else {
      th.classList.remove('active');
      if (arrow) arrow.innerText = '↕';
    }
  });

  const sortSelect = document.getElementById('ngramSortSelect');
  if (sortSelect) {
    const mappedVal = `${ngramSortColumn}_${ngramSortOrder}`;
    if (sortSelect.querySelector(`option[value="${mappedVal}"]`)) {
      sortSelect.value = mappedVal;
    }
  }
}

// Click vào header cột bảng Tab 2 để sắp xếp
window.handleNgramHeaderSort = function(columnName) {
  if (ngramSortColumn === columnName) {
    ngramSortOrder = ngramSortOrder === 'desc' ? 'asc' : 'desc';
  } else {
    ngramSortColumn = columnName;
    ngramSortOrder = columnName === 'word' ? 'asc' : 'desc';
  }
  ngramCurrentPage = 1;
  renderNgramTable();
};

// Đổi trang cho Tab 2
window.changeNgramPage = function(newPage) {
  ngramCurrentPage = newPage;
  renderNgramTable();
  const tableContainer = document.querySelector('#sub-ngram-cleaner .table-container');
  if (tableContainer) tableContainer.scrollTop = 0;
};

// Render thanh điều khiển phân trang Tab 2
function renderNgramPaginationBar(totalItems, startIndex, endIndex, totalPages) {
  const bar = document.getElementById('ngramPaginationBar');
  const info = document.getElementById('ngramPaginationInfo');
  const controls = document.getElementById('ngramPaginationControls');
  if (!bar || !info || !controls) return;

  if (totalItems === 0) {
    bar.style.display = 'none';
    return;
  }

  bar.style.display = 'flex';
  const labelType = currentNgramType === 4 ? '4 từ trở lên' : `${currentNgramType} từ`;
  info.innerHTML = `Hiển thị <b>${startIndex + 1} - ${endIndex}</b> trong tổng số <b>${totalItems.toLocaleString()}</b> cụm từ (${labelType}) - Trang <b>${ngramCurrentPage}</b> / ${totalPages}`;

  if (totalPages <= 1) {
    controls.innerHTML = '';
    return;
  }

  let html = `
    <button class="page-btn" ${ngramCurrentPage === 1 ? 'disabled' : ''} onclick="changeNgramPage(1)" title="Trang đầu">««</button>
    <button class="page-btn" ${ngramCurrentPage === 1 ? 'disabled' : ''} onclick="changeNgramPage(${ngramCurrentPage - 1})" title="Trang trước">« Trước</button>
  `;

  const maxButtons = 5;
  let startP = Math.max(1, ngramCurrentPage - 2);
  let endP = Math.min(totalPages, startP + maxButtons - 1);
  if (endP - startP < maxButtons - 1) {
    startP = Math.max(1, endP - maxButtons + 1);
  }

  if (startP > 1) {
    html += `<button class="page-btn" onclick="changeNgramPage(1)">1</button>`;
    if (startP > 2) html += `<span style="color:#64748b; padding:0 3px;">...</span>`;
  }

  for (let i = startP; i <= endP; i++) {
    html += `<button class="page-btn ${i === ngramCurrentPage ? 'active' : ''}" onclick="changeNgramPage(${i})">${i}</button>`;
  }

  if (endP < totalPages) {
    if (endP < totalPages - 1) html += `<span style="color:#64748b; padding:0 3px;">...</span>`;
    html += `<button class="page-btn" onclick="changeNgramPage(${totalPages})">${totalPages}</button>`;
  }

  html += `
    <button class="page-btn" ${ngramCurrentPage === totalPages ? 'disabled' : ''} onclick="changeNgramPage(${ngramCurrentPage + 1})" title="Trang sau">Sau »</button>
    <button class="page-btn" ${ngramCurrentPage === totalPages ? 'disabled' : ''} onclick="changeNgramPage(${totalPages})" title="Trang cuối">»»</button>
  `;

  controls.innerHTML = html;
}

window.toggleNgramSelection = function(word, isChecked) {
  if (isChecked) ngramSelectedWords.add(word);
  else ngramSelectedWords.delete(word);
};

function renderStNegativesText() {
  const matchRadio = document.querySelector('input[name="stNegMatch"]:checked');
  const matchType = matchRadio ? matchRadio.value : 'phrase';
  const list = Array.from(stNegativeKeywords);

  const formatted = list.map(item => {
    if (matchType === 'exact') return `[${item}]`;
    if (matchType === 'phrase') return `"${item}"`;
    return item;
  });

  const textarea = document.getElementById('stNegativesArea');
  if (textarea) textarea.value = formatted.join('\n');
  const tagCount = document.getElementById('negTagCount');
  if (tagCount) tagCount.innerText = `${list.length} từ`;

  renderNegativesManagerTab();
}

window.copyNgramNegatives = function() {
  const textarea = document.getElementById('stNegativesArea');
  if (!textarea || !textarea.value.trim()) {
    showToast('Danh sách từ phủ định đang trống!', true);
    return;
  }
  navigator.clipboard.writeText(textarea.value.trim()).then(() => {
    showToast(`📋 Đã sao chép ${stNegativeKeywords.size} từ khóa phủ định!`);
  });
};

window.clearSelectedNgramNegatives = function() {
  if (stNegativeKeywords.size === 0) return;
  stNegativeKeywords.clear();
  ngramSelectedWords.clear();
  saveNegativeKeywordsState();
  renderStNegativesText();
  renderNgramTable();
  showToast('Đã xóa sạch danh sách từ khóa phủ định dự kiến.');
};

// =========================================================================
// SUBTAB 3: RAW SEARCH TERMS TABLE & EXPORT
// =========================================================================
// Helper lấy danh sách cụm từ đang khớp bộ lọc hiện tại (dùng cho nút Phủ định tất cả)
function getCurrentlyFilteredRawTerms() {
  let list = getFilteredSearchTerms();
  const filterText = document.getElementById('rawSearchFilter')?.value.toLowerCase().trim() || '';
  const rawExclFilter = document.getElementById('rawExclFilter')?.value || 'ALL';
  const urlTypeFilter = document.getElementById('rawUrlTypeFilter')?.value || 'ALL';

  if (filterText) {
    list = list.filter(d => 
      d.term.toLowerCase().includes(filterText) || 
      d.headline.toLowerCase().includes(filterText) ||
      d.url.toLowerCase().includes(filterText)
    );
  }

  if (rawExclFilter === 'NOT_EXCLUDED') list = list.filter(d => !d.isExcludedByGoogle);
  else if (rawExclFilter === 'EXCLUDED') list = list.filter(d => d.isExcludedByGoogle);

  const rawWasteFilter = document.getElementById('rawWasteFilter')?.value || 'ALL';
  if (rawWasteFilter === 'WASTED_SPEND') list = list.filter(d => d.cost > 0 && (!d.conv || d.conv === 0));
  else if (rawWasteFilter === 'CONVERTED') list = list.filter(d => (d.conv || 0) > 0);

  const minClicksVal = parseInt(document.getElementById('rawMinClicksFilter')?.value || '0', 10);
  if (minClicksVal > 0) list = list.filter(d => d.clicks >= minClicksVal);

  const rawAdultFilter = document.getElementById('rawAdultFilter')?.value || 'ALL';
  if (rawAdultFilter === 'ADULT_ONLY') {
    list = list.filter(d => d.isAdult || d.urlType === 'ADULT_CONTENT');
  } else if (rawAdultFilter === 'INFORMATIONAL_ONLY') {
    list = list.filter(d => d.isInformational);
  } else if (rawAdultFilter === 'MEDICATION_ONLY') {
    list = list.filter(d => d.isMedication);
  } else if (rawAdultFilter === 'INFO_AND_MEDS') {
    list = list.filter(d => d.isInformational || d.isMedication);
  } else if (rawAdultFilter === 'SAFE_ONLY') {
    list = list.filter(d => !d.isAdult && d.urlType !== 'ADULT_CONTENT' && !d.isInformational && !d.isMedication);
  }

  if (urlTypeFilter !== 'ALL') list = list.filter(d => d.urlType === urlTypeFilter);
  return list;
}

function renderRawTermsTable() {
  const tbody = document.querySelector('#rawTermsTable tbody');
  const filterText = (document.getElementById('rawSearchFilter')?.value || '').toLowerCase().trim();
  const rawExclFilter = document.getElementById('rawExclFilter')?.value || 'ALL';
  const urlTypeFilter = document.getElementById('rawUrlTypeFilter')?.value || 'ALL';
  const sort = document.getElementById('rawSortSelect')?.value || 'clicks_desc';
  if (!tbody) return;

  let list = getFilteredSearchTerms();
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" class="text-center text-muted">Chưa có dữ liệu</td></tr>`;
    return;
  }

  // Filter text (term or url or headline)
  if (filterText) {
    list = list.filter(d => 
      d.term.toLowerCase().includes(filterText) || 
      d.headline.toLowerCase().includes(filterText) ||
      d.url.toLowerCase().includes(filterText)
    );
  }

  // Filter Excluded by Google Ads
  if (rawExclFilter === 'NOT_EXCLUDED') {
    list = list.filter(d => !d.isExcludedByGoogle);
  } else if (rawExclFilter === 'EXCLUDED') {
    list = list.filter(d => d.isExcludedByGoogle);
  }

  // Filter Wasted Spend (Chi phí vô ích)
  const rawWasteFilter = document.getElementById('rawWasteFilter')?.value || 'ALL';
  if (rawWasteFilter === 'WASTED_SPEND') {
    list = list.filter(d => d.cost > 0 && (!d.conv || d.conv === 0));
  } else if (rawWasteFilter === 'CONVERTED') {
    list = list.filter(d => (d.conv || 0) > 0);
  }

  // Filter Min Clicks (Ngưỡng click tối thiểu)
  const minClicksVal = parseInt(document.getElementById('rawMinClicksFilter')?.value || '0', 10);
  if (minClicksVal > 0) {
    list = list.filter(d => d.clicks >= minClicksVal);
  }

  // Filter 18+ Adult Content, Thông tin & Thuốc đặc trị
  const rawAdultFilter = document.getElementById('rawAdultFilter')?.value || 'ALL';
  if (rawAdultFilter === 'ADULT_ONLY') {
    list = list.filter(d => d.isAdult || d.urlType === 'ADULT_CONTENT');
  } else if (rawAdultFilter === 'INFORMATIONAL_ONLY') {
    list = list.filter(d => d.isInformational);
  } else if (rawAdultFilter === 'MEDICATION_ONLY') {
    list = list.filter(d => d.isMedication);
  } else if (rawAdultFilter === 'INFO_AND_MEDS') {
    list = list.filter(d => d.isInformational || d.isMedication);
  } else if (rawAdultFilter === 'SAFE_ONLY') {
    list = list.filter(d => !d.isAdult && d.urlType !== 'ADULT_CONTENT' && !d.isInformational && !d.isMedication);
  }

  // Filter URL Type
  if (urlTypeFilter !== 'ALL') {
    list = list.filter(d => d.urlType === urlTypeFilter);
  }

  // Sắp xếp linh hoạt
  if (sort === 'clicks_desc') {
    list.sort((a, b) => b.clicks - a.clicks);
  } else if (sort === 'clicks_asc') {
    list.sort((a, b) => a.clicks - b.clicks);
  } else if (sort === 'cost_desc') {
    list.sort((a, b) => b.cost - a.cost);
  } else if (sort === 'cpc_desc') {
    list.sort((a, b) => b.cpc - a.cpc);
  } else if (sort === 'imp_desc') {
    list.sort((a, b) => b.impressions - a.impressions);
  } else if (sort === 'ctr_desc') {
    list.sort((a, b) => b.ctr - a.ctr);
  } else if (sort === 'term_asc') {
    list.sort((a, b) => a.term.localeCompare(b.term));
  }

  // Xử lý phân trang Tab 3
  const limitVal = document.getElementById('rawLimitSelect')?.value || '100';
  const totalItems = list.length;
  let pageSize = totalItems;
  if (limitVal !== 'ALL') {
    pageSize = parseInt(limitVal, 10) || 100;
  }

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (rawCurrentPage > totalPages) rawCurrentPage = totalPages;
  if (rawCurrentPage < 1) rawCurrentPage = 1;

  const startIndex = (rawCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const pageItems = list.slice(startIndex, endIndex);

  let rowsHtml = '';
  pageItems.forEach(d => {
    const isNeg = stNegativeKeywords.has(d.term.toLowerCase());
    const trans = translateNgramWord(d.term);
    const googleExclBadge = d.isExcludedByGoogle 
      ? `<span class="badge-tag" style="background: rgba(148, 163, 184, 0.2); color: #94a3b8; font-size: 10px; margin-left: 6px;" title="Cụm từ này đã được phủ định sẵn trên Google Ads">Đã phủ định trên Ads</span>`
      : '';
    
    let intentBadge = '';
    if (d.isAdult) {
      intentBadge = `<span class="badge-tag" style="background: rgba(244, 63, 94, 0.15); color: #fb7185; border: 1px solid rgba(244, 63, 94, 0.3); font-size: 10px;" title="Khớp từ khóa/URL người lớn 18+ (${escapeHtml(d.adultDetails?.categoryName || '18+')})">🔞 18+</span>`;
    } else if (d.isInformational) {
      intentBadge = `<span class="badge-tag" style="background: rgba(251, 146, 60, 0.15); color: #fb923c; border: 1px solid rgba(251, 146, 60, 0.3); font-size: 10px;" title="Từ khóa thuần thông tin / hướng dẫn mẹo / hỏi đáp (0 chuyển đổi)">ℹ️ Mẹo/Thông tin</span>`;
    } else if (d.isMedication) {
      intentBadge = `<span class="badge-tag" style="background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); font-size: 10px;" title="Thuốc đặc trị bệnh / kháng sinh / thuốc bôi điều trị">💊 Thuốc đặc trị</span>`;
    } else {
      intentBadge = `<span class="badge-tag" style="background: rgba(148, 163, 184, 0.1); color: #94a3b8; font-size: 10px;">Thường</span>`;
    }

    rowsHtml += `
      <tr style="${d.isExcludedByGoogle ? 'opacity: 0.75;' : ''}">
        <td style="text-align: center;">
          <input type="checkbox" class="raw-term-row-chk" data-term="${escapeHtml(d.term)}" ${isNeg ? 'checked' : ''} style="cursor: pointer;" onchange="toggleSingleTermNeg('${escapeHtml(d.term)}')">
        </td>
        <td class="text-xs text-muted" style="white-space: nowrap;">${escapeHtml(d.account)}</td>
        <td class="text-xs font-semibold" style="min-width: 180px; word-break: break-word; line-height: 1.4;" title="${escapeHtml(d.campaign)}">${escapeHtml(d.campaign)}</td>
        <td class="font-semibold text-white" style="min-width: 160px; word-break: break-word;">
          ${escapeHtml(d.term)}
          ${googleExclBadge}
        </td>
        <td style="white-space: nowrap;">${intentBadge}</td>
        <td class="ngram-translation text-xs" style="min-width: 160px; word-break: break-word; line-height: 1.4;" title="${escapeHtml(trans)}">${escapeHtml(trans)}</td>
        <td class="text-xs font-mono" style="max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          <a href="${escapeHtml(d.url)}" target="_blank" rel="noopener noreferrer" style="color: #60a5fa; text-decoration: underline;" title="${escapeHtml(d.url)}">
            ${escapeHtml(d.url || '(Không có trang đích)')}
          </a>
        </td>
        <td class="font-semibold text-primary font-bold">${d.clicks}</td>
        <td>${d.impressions}</td>
        <td>${d.ctr.toFixed(2)}%</td>
        <td>${d.cpc > 0 ? formatCurrency(Math.round(d.cpc)) : '-'}</td>
        <td>${formatCurrency(Math.round(d.cost))}</td>
        <td>
          ${d.isExcludedByGoogle 
            ? `<span class="text-xs text-muted" style="font-style: italic;">Đã chặn sẵn</span>`
            : `<button class="btn btn-sm ${isNeg ? 'btn-secondary' : 'btn-danger'}" onclick="toggleSingleTermNeg('${escapeHtml(d.term)}')">
                 ${isNeg ? '✓ Đã phủ' : '+ Phủ định'}
               </button>`
          }
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = rowsHtml || `<tr><td colspan="13" class="text-center text-muted">Không tìm thấy cụm từ nào khớp bộ lọc</td></tr>`;

  // Render thanh phân trang Tab 3
  renderRawPaginationBar(totalItems, startIndex, endIndex, totalPages);
}

// Đổi trang cho Tab 3
window.changeRawPage = function(newPage) {
  rawCurrentPage = newPage;
  renderRawTermsTable();
  const tableContainer = document.querySelector('#sub-terms-table .table-container');
  if (tableContainer) tableContainer.scrollTop = 0;
};

// Render thanh phân trang Tab 3
function renderRawPaginationBar(totalItems, startIndex, endIndex, totalPages) {
  const bar = document.getElementById('rawPaginationBar');
  const info = document.getElementById('rawPaginationInfo');
  const controls = document.getElementById('rawPaginationControls');
  if (!bar || !info || !controls) return;

  if (totalItems === 0) {
    bar.style.display = 'none';
    return;
  }

  bar.style.display = 'flex';
  info.innerHTML = `Hiển thị <b>${startIndex + 1} - ${endIndex}</b> trong tổng số <b>${totalItems.toLocaleString()}</b> cụm từ - Trang <b>${rawCurrentPage}</b> / ${totalPages}`;

  if (totalPages <= 1) {
    controls.innerHTML = '';
    return;
  }

  let html = `
    <button class="page-btn" ${rawCurrentPage === 1 ? 'disabled' : ''} onclick="changeRawPage(1)" title="Trang đầu">««</button>
    <button class="page-btn" ${rawCurrentPage === 1 ? 'disabled' : ''} onclick="changeRawPage(${rawCurrentPage - 1})" title="Trang trước">« Trước</button>
  `;

  const maxButtons = 5;
  let startP = Math.max(1, rawCurrentPage - 2);
  let endP = Math.min(totalPages, startP + maxButtons - 1);
  if (endP - startP < maxButtons - 1) {
    startP = Math.max(1, endP - maxButtons + 1);
  }

  if (startP > 1) {
    html += `<button class="page-btn" onclick="changeRawPage(1)">1</button>`;
    if (startP > 2) html += `<span style="color:#64748b; padding:0 3px;">...</span>`;
  }

  for (let i = startP; i <= endP; i++) {
    html += `<button class="page-btn ${i === rawCurrentPage ? 'active' : ''}" onclick="changeRawPage(${i})">${i}</button>`;
  }

  if (endP < totalPages) {
    if (endP < totalPages - 1) html += `<span style="color:#64748b; padding:0 3px;">...</span>`;
    html += `<button class="page-btn" onclick="changeRawPage(${totalPages})">${totalPages}</button>`;
  }

  html += `
    <button class="page-btn" ${rawCurrentPage === totalPages ? 'disabled' : ''} onclick="changeRawPage(${rawCurrentPage + 1})" title="Trang sau">Sau »</button>
    <button class="page-btn" ${rawCurrentPage === totalPages ? 'disabled' : ''} onclick="changeRawPage(${totalPages})" title="Trang cuối">»»</button>
  `;

  controls.innerHTML = html;
}

window.toggleSingleTermNeg = function(term) {
  const lower = term.toLowerCase().trim();
  if (stNegativeKeywords.has(lower)) {
    stNegativeKeywords.delete(lower);
    showToast(`Đã bỏ "${term}" khỏi danh sách phủ định.`);
  } else {
    stNegativeKeywords.add(lower);
    showToast(`Đã thêm "${term}" vào danh sách phủ định!`);
  }
  saveNegativeKeywordsState();
  renderStNegativesText();
  renderRawTermsTable();
  renderNegativesManagerTab();
};

// =========================================================================
// SUBTAB 4: QUẢN LÝ TỪ KHÓA & URL ĐÃ PHỦ ĐỊNH
// =========================================================================
function renderNegativesManagerTab() {
  const kwContainer = document.getElementById('mgrKeywordsList');
  const urlContainer = document.getElementById('mgrUrlsList');
  const kwCount = document.getElementById('mgrKeywordsCount');
  const urlCount = document.getElementById('mgrUrlsCount');

  if (kwCount) kwCount.innerText = `${stNegativeKeywords.size} từ`;
  if (urlCount) urlCount.innerText = `${stNegativeUrls.size} URL`;

  // Render Keywords
  if (kwContainer) {
    if (stNegativeKeywords.size === 0) {
      kwContainer.innerHTML = `<p class="text-muted text-xs">Chưa có từ khóa nào được phủ định.</p>`;
    } else {
      let html = '';
      stNegativeKeywords.forEach(term => {
        html += `
          <div class="neg-item-row">
            <span class="neg-item-val font-semibold">${escapeHtml(term)}</span>
            <button class="btn-remove-neg" onclick="toggleSingleTermNeg('${escapeHtml(term)}')">✕ Gỡ bỏ</button>
          </div>
        `;
      });
      kwContainer.innerHTML = html;
    }
  }

  // Render URLs
  if (urlContainer) {
    if (stNegativeUrls.size === 0) {
      urlContainer.innerHTML = `<p class="text-muted text-xs">Chưa có cấu trúc URL nào bị loại trừ.</p>`;
    } else {
      let html = '';
      stNegativeUrls.forEach(url => {
        html += `
          <div class="neg-item-row">
            <span class="neg-item-val text-xs">${escapeHtml(url)}</span>
            <button class="btn-remove-neg" onclick="toggleNegativeUrl('${escapeHtml(url)}')">✕ Gỡ bỏ</button>
          </div>
        `;
      });
      urlContainer.innerHTML = html;
    }
  }
}

// =========================================================================
// TRUNG TÂM XỬ LÝ VI PHẠM 18+ (LOẠI TRỪ NHANH)
// =========================================================================
let adultViewSubmode = 'terms'; // 'terms' | 'rules' | 'urls'
let currentGarbageCategory = 'ALL_GARBAGE'; // 'ALL_GARBAGE' | 'ADULT' | 'INFO' | 'MEDS'
let garbageSelectedTerms = new Set();
let garbageInitDefaultSelection = true;

// Trạng thái theo dõi Subtab đang kích hoạt và Lazy Rendering
let currentActiveSubtabId = 'sub-url-discovery';
const dirtySubtabs = {
  'sub-url-discovery': false,
  'sub-ngram-cleaner': true,
  'sub-terms-table': true,
  'sub-adult-panel': true,
  'sub-negatives-mgr': true
};

function markAllSubtabsDirtyExcept(activeId) {
  Object.keys(dirtySubtabs).forEach(id => {
    if (id !== activeId) dirtySubtabs[id] = true;
  });
}

function renderActiveSubtab(targetId = currentActiveSubtabId) {
  const data = getFilteredSearchTerms();
  if (targetId === 'sub-url-discovery') {
    renderUrlDiscoveryTab(data);
  } else if (targetId === 'sub-ngram-cleaner') {
    renderNgramTable();
  } else if (targetId === 'sub-terms-table') {
    renderRawTermsTable();
  } else if (targetId === 'sub-adult-panel') {
    renderAdultPanel();
  } else if (targetId === 'sub-negatives-mgr') {
    renderNegativesManagerTab();
  }
  dirtySubtabs[targetId] = false;
}

function setupAdultPanelEvents() {
  const btnTerms = document.getElementById('btnAdultSubtabTerms');
  const btnRules = document.getElementById('btnAdultSubtabRules');
  const btnUrls = document.getElementById('btnAdultSubtabUrls');
  const viewTerms = document.getElementById('adultPanelTermsView');
  const viewRules = document.getElementById('adultPanelRulesView');
  const viewUrls = document.getElementById('adultPanelUrlsView');
  const desc = document.getElementById('adultSubtabDesc');

  function updateSubtabActive(mode) {
    adultViewSubmode = mode;
    if (btnTerms) btnTerms.className = mode === 'terms' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';
    if (btnRules) btnRules.className = mode === 'rules' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';
    if (btnUrls) btnUrls.className = mode === 'urls' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';

    if (viewTerms) viewTerms.style.display = mode === 'terms' ? 'block' : 'none';
    if (viewRules) viewRules.style.display = mode === 'rules' ? 'block' : 'none';
    if (viewUrls) viewUrls.style.display = mode === 'urls' ? 'block' : 'none';

    if (desc) {
      if (mode === 'terms') desc.innerHTML = 'Đang xem: <b>Cụm từ tìm kiếm người lớn (Định dạng phủ định [Chính xác])</b>';
      else if (mode === 'rules') desc.innerHTML = 'Đang xem: <b>Cấu trúc quy tắc URL chặn nhanh DSA (Ví dụ: /kondom, /lingerie)</b>';
      else desc.innerHTML = 'Đang xem: <b>Địa chỉ URL trang đích 18+ chi tiết</b>';
    }
    renderAdultPanel();
  }

  if (btnTerms) btnTerms.addEventListener('click', () => updateSubtabActive('terms'));
  if (btnRules) btnRules.addEventListener('click', () => updateSubtabActive('rules'));
  if (btnUrls) btnUrls.addEventListener('click', () => updateSubtabActive('urls'));

  // Lọc tìm kiếm trong các bảng 18+ (Kèm Debounce tối ưu)
  let adultSearchDebounce = null;
  const termSearch = document.getElementById('adultPanelTermSearch');
  if (termSearch) {
    termSearch.addEventListener('input', () => {
      clearTimeout(adultSearchDebounce);
      adultSearchDebounce = setTimeout(renderAdultPanel, 180);
    });
  }

  const ruleSearch = document.getElementById('adultPanelRuleSearch');
  if (ruleSearch) {
    ruleSearch.addEventListener('input', () => {
      clearTimeout(adultSearchDebounce);
      adultSearchDebounce = setTimeout(renderAdultPanel, 180);
    });
  }

  const urlSearch = document.getElementById('adultPanelUrlSearch');
  if (urlSearch) {
    urlSearch.addEventListener('input', () => {
      clearTimeout(adultSearchDebounce);
      adultSearchDebounce = setTimeout(renderAdultPanel, 180);
    });
  }

  // Nút hành động nhanh: Phủ định tất cả cụm từ 18+ theo chuẩn khớp chính xác [Exact Match]
  const btnAddAllTerms = document.getElementById('btnQuickAddAllAdultToNeg');
  if (btnAddAllTerms) {
    btnAddAllTerms.addEventListener('click', () => {
      const data = getFilteredSearchTerms();
      let targetTerms = [];
      if (currentGarbageCategory === 'ADULT') {
        targetTerms = data.filter(d => d.isAdult || d.urlType === 'ADULT_CONTENT');
      } else if (currentGarbageCategory === 'INFO') {
        targetTerms = data.filter(d => d.isInformational);
      } else if (currentGarbageCategory === 'MEDS') {
        targetTerms = data.filter(d => d.isMedication);
      } else {
        targetTerms = data.filter(d => d.isAdult || d.urlType === 'ADULT_CONTENT' || d.isInformational || d.isMedication);
      }

      if (targetTerms.length === 0) {
        showToast('Không có cụm từ nào trong nhóm này để phủ định!', true);
        return;
      }
      let count = 0;
      targetTerms.forEach(d => {
        const clean = (d.term || '').toLowerCase().trim();
        if (clean && !stNegativeKeywords.has(clean)) {
          stNegativeKeywords.add(clean);
          count++;
        }
      });
      const exactRadio = document.querySelector('input[name="stNegMatch"][value="exact"]');
      if (exactRadio) exactRadio.checked = true;
      renderStNegativesText();
      renderRawTermsTable();
      renderAdultPanel();
      renderNegativesManagerTab();
      showToast(`⚡ Đã phủ định thành công ${count} cụm từ rác [Khớp chính xác]!`);
    });
  }

  // Nút hành động nhanh: Loại trừ tất cả URL 18+ (Cả cấu trúc quy tắc lẫn link chi tiết)
  const btnAddAllUrls = document.getElementById('btnQuickAddAllAdultUrlsToExcl');
  if (btnAddAllUrls) {
    btnAddAllUrls.addEventListener('click', () => {
      const data = getFilteredSearchTerms();
      const adultData = data.filter(d => d.isAdult || d.urlType === 'ADULT_CONTENT');
      if (adultData.length === 0) {
        showToast('Không có URL 18+ nào để loại trừ!', true);
        return;
      }
      // Nạp cả URL chi tiết
      adultData.forEach(d => {
        if (d.url) stNegativeUrls.add(d.url.split('?')[0].split('#')[0]);
      });
      renderUrlDiscoveryTab(getFilteredSearchTerms());
      renderAdultPanel();
      renderNegativesManagerTab();
      showToast(`🚫 Đã loại trừ toàn bộ URL 18+ vào danh sách DSA!`);
    });
  }

  // Copy nhanh danh sách Cụm từ theo khớp chính xác [Exact Match]
  const btnCopyTerms = document.getElementById('btnCopySelectedAdultTermsQuick');
  if (btnCopyTerms) {
    btnCopyTerms.addEventListener('click', () => {
      const txtPreview = document.getElementById('txtGarbagePreview');
      if (!txtPreview || !txtPreview.value.trim()) {
        showToast('Danh sách xem trước đang trống!', true);
        return;
      }
      navigator.clipboard.writeText(txtPreview.value.trim()).then(() => {
        const count = txtPreview.value.trim().split('\n').length;
        const matchType = document.querySelector('input[name="garbageNegMatch"]:checked')?.value || 'exact';
        const typeLabel = matchType === 'exact' ? '[Khớp chính xác]' : (matchType === 'phrase' ? '"Khớp cụm từ"' : 'Khớp rộng');
        showToast(`📋 Đã sao chép ${count} cụm từ rác (${typeLabel}) vào Clipboard!`);
      });
    });
  }

  // Copy nhanh danh sách Cấu trúc Quy tắc loại trừ DSA (ví dụ: URL chứa /kondom)
  const btnCopyRules = document.getElementById('btnCopySelectedAdultRulesQuick');
  if (btnCopyRules) {
    btnCopyRules.addEventListener('click', () => {
      const rules = getAdultUrlStructureRules();
      if (rules.length === 0) {
        showToast('Chưa có cấu trúc quy tắc 18+ nào!', true);
        return;
      }
      const text = rules.map(r => r.ruleFormat).join('\n');
      navigator.clipboard.writeText(text).then(() => {
        showToast(`📋 Đã copy ${rules.length} quy tắc cấu trúc loại trừ DSA!`);
      });
    });
  }

  const btnCopyUrls = document.getElementById('btnCopySelectedAdultUrlsQuick');
  if (btnCopyUrls) {
    btnCopyUrls.addEventListener('click', () => {
      const data = getFilteredSearchTerms();
      const list = [...new Set(data.filter(d => d.isAdult || d.urlType === 'ADULT_CONTENT').map(d => d.url.split('?')[0].split('#')[0]))];
      if (list.length === 0) {
        showToast('Không có URL nào để sao chép!', true);
        return;
      }
      navigator.clipboard.writeText(list.join('\n')).then(() => {
        showToast(`📋 Đã copy ${list.length} URL 18+ cụ thể!`);
      });
    });
  }

  // Checkbox Chọn / Bỏ chọn tất cả từ khóa rác
  const chkSelectAllGarbage = document.getElementById('selectAllGarbageTerms');
  if (chkSelectAllGarbage) {
    chkSelectAllGarbage.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      const rowCheckboxes = document.querySelectorAll('.garbage-term-chk');
      rowCheckboxes.forEach(chk => {
        chk.checked = isChecked;
        const term = chk.getAttribute('data-term');
        if (term) {
          if (isChecked) garbageSelectedTerms.add(term);
          else garbageSelectedTerms.delete(term);
        }
      });
      renderGarbageLivePreview();
    });
  }

  // Nút Xóa trắng danh sách xem trước
  const btnClearPreview = document.getElementById('btnClearGarbagePreview');
  if (btnClearPreview) {
    btnClearPreview.addEventListener('click', () => {
      garbageSelectedTerms.clear();
      const txtPreview = document.getElementById('txtGarbagePreview');
      if (txtPreview) txtPreview.value = '';
      const countBadge = document.getElementById('garbagePreviewCount');
      if (countBadge) countBadge.innerText = '0 từ';
      const rowCheckboxes = document.querySelectorAll('.garbage-term-chk');
      rowCheckboxes.forEach(chk => { chk.checked = false; });
      const chkSelectAll = document.getElementById('selectAllGarbageTerms');
      if (chkSelectAll) chkSelectAll.checked = false;
      showToast('Đã xóa trắng danh sách đã chọn!');
    });
  }

  // Cho phép người dùng chỉnh sửa trực tiếp nội dung trong textarea Preview
  const txtGarbagePreview = document.getElementById('txtGarbagePreview');
  if (txtGarbagePreview) {
    txtGarbagePreview.addEventListener('input', () => {
      const lines = txtGarbagePreview.value.split('\n').map(l => l.trim()).filter(Boolean);
      const countBadge = document.getElementById('garbagePreviewCount');
      if (countBadge) countBadge.innerText = `${lines.length} từ`;
    });
  }
}

window.toggleGarbageTermSelection = function(term, isChecked) {
  if (!term) return;
  if (isChecked) {
    garbageSelectedTerms.add(term);
  } else {
    garbageSelectedTerms.delete(term);
  }
  renderGarbageLivePreview();
  const allRowCheckboxes = document.querySelectorAll('.garbage-term-chk');
  const checkedBoxes = document.querySelectorAll('.garbage-term-chk:checked');
  const chkSelectAll = document.getElementById('selectAllGarbageTerms');
  if (chkSelectAll && allRowCheckboxes.length > 0) {
    chkSelectAll.checked = (allRowCheckboxes.length === checkedBoxes.length);
  }
};

// Bóc tách các cụm cấu trúc quy tắc URL ngắn (VD: /kondom, /lingerie, /durex, /search?keyword=...)
function getAdultUrlStructureRules() {
  const data = getFilteredSearchTerms();
  const adultTerms = data.filter(d => d.isAdult || d.urlType === 'ADULT_CONTENT');
  const ruleMap = {};

  adultTerms.forEach(d => {
    if (!d.url) return;
    let urlObj;
    try {
      urlObj = new URL(d.url);
    } catch (e) {
      return;
    }

    const pathname = urlObj.pathname.toLowerCase();
    const matched = (d.adultDetails?.matchedSignature || d.adultDetails?.matchedWord || '').toLowerCase().trim();
    
    // Tìm cấu trúc thư mục hoặc từ khóa chính
    let ruleKey = '';
    let ruleDesc = '';
    let ruleFormat = '';

    if (pathname.includes('/list/')) {
      const segments = pathname.split('/').filter(Boolean);
      const categorySegment = segments[1] || matched;
      ruleKey = `/list/${categorySegment}`;
      ruleDesc = `Loại trừ toàn bộ danh mục danh sách /list/${categorySegment}/`;
      ruleFormat = `URL chứa /list/${categorySegment}`;
    } else if (pathname.includes('/search')) {
      const kw = urlObj.searchParams.get('keyword') || matched;
      ruleKey = `/search?keyword=${kw}`;
      ruleDesc = `Loại trừ trang tìm kiếm mua sắm chứa từ "${kw}"`;
      ruleFormat = `URL chứa keyword=${kw}`;
    } else if (matched) {
      ruleKey = `/${matched.replace(/\s+/g, '-')}`;
      ruleDesc = `Loại trừ mọi URL chứa từ khóa /${matched}/`;
      ruleFormat = `URL chứa ${matched.replace(/\s+/g, '-')}`;
    } else {
      ruleKey = pathname;
      ruleDesc = `URL chính xác ${pathname}`;
      ruleFormat = `URL bằng ${d.url}`;
    }

    if (!ruleMap[ruleKey]) {
      ruleMap[ruleKey] = {
        ruleKey,
        ruleFormat,
        ruleDesc,
        urlSample: d.url,
        urlsSet: new Set(),
        termsCount: 0,
        clicks: 0,
        cost: 0
      };
    }
    ruleMap[ruleKey].urlsSet.add(d.url.split('?')[0]);
    ruleMap[ruleKey].termsCount++;
    ruleMap[ruleKey].clicks += d.clicks;
    ruleMap[ruleKey].cost += d.cost;
  });

  return Object.values(ruleMap).sort((a, b) => b.clicks - a.clicks);
}

function renderGarbageLivePreview() {
  const txtPreview = document.getElementById('txtGarbagePreview');
  const countBadge = document.getElementById('garbagePreviewCount');
  if (!txtPreview) return;

  const list = Array.from(garbageSelectedTerms);
  const matchType = document.querySelector('input[name="garbageNegMatch"]:checked')?.value || 'exact';

  const formattedLines = list.map(term => {
    if (matchType === 'exact') return `[${term}]`;
    if (matchType === 'phrase') return `"${term}"`;
    return term;
  });

  txtPreview.value = formattedLines.join('\n');
  if (countBadge) countBadge.innerText = `${list.length} từ`;
}

function renderAdultPanel() {
  const data = getFilteredSearchTerms();

  // Đếm số lượng cho từng pill phân nhóm (Tối ưu Single-Pass O(N) thay vì 4 vòng filter)
  const allAdult = [];
  const allInfo = [];
  const allMeds = [];
  const allGarbage = [];

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const isAd = item.isAdult || item.urlType === 'ADULT_CONTENT';
    const isInf = item.isInformational;
    const isMed = item.isMedication;

    if (isAd) allAdult.push(item);
    if (isInf) allInfo.push(item);
    if (isMed) allMeds.push(item);
    if (isAd || isInf || isMed) allGarbage.push(item);
  }

  const elCountAll = document.getElementById('pillCountAll');
  const elCountAdult = document.getElementById('pillCountAdult');
  const elCountInfo = document.getElementById('pillCountInfo');
  const elCountMeds = document.getElementById('pillCountMeds');
  if (elCountAll) elCountAll.innerText = allGarbage.length.toLocaleString('vi-VN');
  if (elCountAdult) elCountAdult.innerText = allAdult.length.toLocaleString('vi-VN');
  if (elCountInfo) elCountInfo.innerText = allInfo.length.toLocaleString('vi-VN');
  if (elCountMeds) elCountMeds.innerText = allMeds.length.toLocaleString('vi-VN');

  // Lọc tập dữ liệu theo nhóm đang chọn
  let activeGarbageTerms = allGarbage;
  if (currentGarbageCategory === 'ADULT') activeGarbageTerms = allAdult;
  else if (currentGarbageCategory === 'INFO') activeGarbageTerms = allInfo;
  else if (currentGarbageCategory === 'MEDS') activeGarbageTerms = allMeds;

  const adultTerms = activeGarbageTerms;

  if (garbageInitDefaultSelection) {
    garbageSelectedTerms.clear();
    adultTerms.forEach(d => {
      if (d.term) garbageSelectedTerms.add(d.term.trim());
    });
    garbageInitDefaultSelection = false;
  }

  // Stats calculation
  const totalCost = adultTerms.reduce((sum, d) => sum + d.cost, 0);
  const totalClicks = adultTerms.reduce((sum, d) => sum + d.clicks, 0);

  // Group unique adult URLs
  const adultUrlMap = {};
  adultTerms.forEach(d => {
    if (!d.url) return;
    const cleanUrl = d.url.split('?')[0].split('#')[0];
    if (!adultUrlMap[cleanUrl]) {
      adultUrlMap[cleanUrl] = {
        url: cleanUrl,
        matched: d.adultDetails?.matchedSignature || d.adultDetails?.matchedWord || '18+',
        termsCount: 0,
        clicks: 0,
        cost: 0
      };
    }
    adultUrlMap[cleanUrl].termsCount++;
    adultUrlMap[cleanUrl].clicks += d.clicks;
    adultUrlMap[cleanUrl].cost += d.cost;
  });
  const adultUrlsList = Object.values(adultUrlMap);

  // Update Summary Cards
  const cTermsCount = document.getElementById('adultCardTermsCount');
  const cTermsCost = document.getElementById('adultCardTermsCost');
  const cUrlsCount = document.getElementById('adultCardUrlsCount');
  const cUrlsClicks = document.getElementById('adultCardUrlsClicks');
  const cExclStatus = document.getElementById('adultCardExcludedStatus');

  if (cTermsCount) cTermsCount.innerText = adultTerms.length.toLocaleString('vi-VN');
  if (cTermsCost) cTermsCost.innerText = `Chi phí tiêu tốn: ${formatCurrency(Math.round(totalCost))}`;
  if (cUrlsCount) cUrlsCount.innerText = adultUrlsList.length.toLocaleString('vi-VN');
  if (cUrlsClicks) cUrlsClicks.innerText = `Lượt click: ${totalClicks.toLocaleString('vi-VN')}`;

  const excludedTermsCount = adultTerms.filter(d => stNegativeKeywords.has(d.term.toLowerCase().trim())).length;
  if (cExclStatus) cExclStatus.innerText = `${excludedTermsCount} / ${adultTerms.length} từ`;

  // 1. Render Adult Terms Table (Định dạng Khớp Chính Xác [Exact Match])
  const tbodyTerms = document.querySelector('#adultPanelTermsTable tbody');
  if (tbodyTerms) {
    const filterKw = (document.getElementById('adultPanelTermSearch')?.value || '').toLowerCase().trim();
    let displayTerms = adultTerms;
    if (filterKw) {
      displayTerms = displayTerms.filter(d => d.term.toLowerCase().includes(filterKw) || d.url.toLowerCase().includes(filterKw));
    }

    if (displayTerms.length === 0) {
      tbodyTerms.innerHTML = `<tr><td colspan="9" class="text-center text-muted">Không có cụm từ nào khớp bộ lọc</td></tr>`;
    } else {
      let rows = '';
      displayTerms.slice(0, 150).forEach(d => {
        const isNeg = stNegativeKeywords.has(d.term.toLowerCase().trim());
        let matched = '';
        let badgeStyle = 'background: rgba(244,63,94,0.15); color: #fb7185;';
        if (d.isAdult || d.urlType === 'ADULT_CONTENT') {
          matched = d.adultDetails?.matchedWord || d.adultDetails?.matchedSignature || '🔞 18+';
          badgeStyle = 'background: rgba(244,63,94,0.15); color: #fb7185;';
        } else if (d.isInformational) {
          matched = 'ℹ️ Mẹo / Hỏi đáp';
          badgeStyle = 'background: rgba(251,146,60,0.15); color: #fb923c;';
        } else if (d.isMedication) {
          matched = '💊 Thuốc đặc trị';
          badgeStyle = 'background: rgba(168,85,247,0.15); color: #c084fc;';
        } else {
          matched = 'Rác';
        }
        const isSelected = garbageSelectedTerms.has(d.term);
        const elementTransId = 'adult_trans_' + hashTextToId(d.term);
        const trans = translateNgramWord(d.term, elementTransId);
        const urlLink = d.url 
          ? `<a href="${escapeHtml(d.url)}" target="_blank" rel="noopener noreferrer" class="link-icon-btn" title="${escapeHtml(d.url)}">🔗 Xem</a>`
          : '<span class="text-muted">-</span>';
        rows += `
          <tr style="${isNeg ? 'opacity: 0.75;' : ''}">
            <td style="text-align: center;">
              <input type="checkbox" class="garbage-term-chk" data-term="${escapeHtml(d.term)}" ${isSelected ? 'checked' : ''} style="cursor: pointer;" onchange="toggleGarbageTermSelection('${escapeHtml(d.term)}', this.checked)">
            </td>
            <td class="font-semibold text-white" style="word-break: break-word; line-height: 1.4;">${escapeHtml(d.term)}</td>
            <td id="${elementTransId}" class="ngram-translation text-xs" style="word-break: break-word; line-height: 1.4; color: #a5f3fc;" title="${escapeHtml(trans)}">${escapeHtml(trans)}</td>
            <td><span class="badge-tag" style="${badgeStyle}">${escapeHtml(matched)}</span></td>
            <td style="text-align: center;">${urlLink}</td>
            <td class="font-bold text-primary" style="text-align: center;">${d.clicks}</td>
            <td style="text-align: center;">${d.impressions}</td>
            <td class="text-xs font-mono">${formatCurrency(Math.round(d.cost))}</td>
            <td style="text-align: center;">
              <button class="btn btn-sm ${isNeg ? 'btn-secondary' : 'btn-danger'}" style="padding: 2px 8px; font-size: 0.72rem; font-weight: 600;" onclick="toggleSingleTermNeg('${escapeHtml(d.term)}')">
                ${isNeg ? '✓ Đã phủ' : '+ Phủ'}
              </button>
            </td>
          </tr>
        `;
      });
      tbodyTerms.innerHTML = rows;
      const chkSelectAll = document.getElementById('selectAllGarbageTerms');
      if (chkSelectAll) {
        const rowBoxes = tbodyTerms.querySelectorAll('.garbage-term-chk');
        const checkedBoxes = tbodyTerms.querySelectorAll('.garbage-term-chk:checked');
        chkSelectAll.checked = rowBoxes.length > 0 && rowBoxes.length === checkedBoxes.length;
      }
    }
  }

  // Render khung Live Preview Textarea cho Tab 3
  renderGarbageLivePreview();

  // 2. Render Adult Rules Table (Cấu trúc quy tắc loại trừ nhanh DSA - vd: /kondom)
  const tbodyRules = document.querySelector('#adultPanelRulesTable tbody');
  if (tbodyRules) {
    const rulesList = getAdultUrlStructureRules();
    const filterKw = (document.getElementById('adultPanelRuleSearch')?.value || '').toLowerCase().trim();
    let displayRules = rulesList;
    if (filterKw) {
      displayRules = displayRules.filter(r => r.ruleKey.toLowerCase().includes(filterKw) || r.ruleDesc.toLowerCase().includes(filterKw));
    }

    if (displayRules.length === 0) {
      tbodyRules.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Không có quy tắc nào</td></tr>`;
    } else {
      let rows = '';
      displayRules.forEach(r => {
        rows += `
          <tr>
            <td>
              <code style="background: rgba(244,63,94,0.12); color: #fb7185; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 0.85rem;">
                ${escapeHtml(r.ruleFormat)}
              </code>
            </td>
            <td class="text-xs text-muted">${escapeHtml(r.ruleDesc)}</td>
            <td class="font-bold">${r.urlsSet.size} URL</td>
            <td class="font-semibold">${r.termsCount}</td>
            <td class="text-primary font-bold">${r.clicks}</td>
            <td>${formatCurrency(Math.round(r.cost))}</td>
            <td>
              <button class="btn btn-sm btn-secondary" onclick="navigator.clipboard.writeText('${escapeHtml(r.ruleFormat)}'); showToast('📋 Đã copy quy tắc: ${escapeHtml(r.ruleFormat)}')">
                📋 Copy Quy Tắc
              </button>
            </td>
          </tr>
        `;
      });
      tbodyRules.innerHTML = rows;
    }
  }

  // 3. Render Adult URLs Table (URL chi tiết)
  const tbodyUrls = document.querySelector('#adultPanelUrlsTable tbody');
  if (tbodyUrls) {
    const filterKw = (document.getElementById('adultPanelUrlSearch')?.value || '').toLowerCase().trim();
    let displayUrls = adultUrlsList;
    if (filterKw) {
      displayUrls = displayUrls.filter(u => u.url.toLowerCase().includes(filterKw) || u.matched.toLowerCase().includes(filterKw));
    }

    if (displayUrls.length === 0) {
      tbodyUrls.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Không có URL 18+ nào</td></tr>`;
    } else {
      let rows = '';
      displayUrls.slice(0, 100).forEach(u => {
        const isExcluded = stNegativeUrls.has(u.url);
        rows += `
          <tr>
            <td class="font-mono text-xs font-semibold" style="max-width: 300px; word-break: break-all;">
              <a href="${escapeHtml(u.url)}" target="_blank" rel="noopener noreferrer" style="color: #60a5fa;">${escapeHtml(u.url)}</a>
            </td>
            <td><span class="badge-tag" style="background: rgba(244,63,94,0.15); color: #fb7185;">${escapeHtml(u.matched)}</span></td>
            <td class="font-bold">${u.termsCount}</td>
            <td class="text-primary font-bold">${u.clicks}</td>
            <td>${formatCurrency(Math.round(u.cost))}</td>
            <td>
              ${isExcluded 
                ? '<span class="text-success text-xs font-semibold">✓ Đã loại trừ</span>' 
                : '<span class="text-muted text-xs">Đang chạy</span>'}
            </td>
            <td>
              <div style="display: flex; gap: 6px;">
                <button class="btn btn-sm btn-secondary" onclick="navigator.clipboard.writeText('${escapeHtml(u.url)}'); showToast('📋 Đã copy URL!')">
                  📋 Copy
                </button>
                <button class="btn btn-sm ${isExcluded ? 'btn-secondary' : 'btn-danger'}" onclick="toggleNegativeUrl('${escapeHtml(u.url)}')">
                  ${isExcluded ? '✕ Bỏ chặn' : '🚫 Loại trừ'}
                </button>
              </div>
            </td>
          </tr>
        `;
      });
      tbodyUrls.innerHTML = rows;
    }
  }
}

function exportFilteredTermsToCsv() {
  const list = getFilteredSearchTerms();
  if (list.length === 0) {
    showToast('Không có dữ liệu để xuất!', true);
    return;
  }
  const csv = Papa.unparse(list);
  downloadCsv(csv, `Google_Ads_Search_Terms_Filtered_${new Date().toISOString().slice(0, 10)}.csv`);
  showToast('Đã tải xuống file CSV cụm từ tìm kiếm!');
}

function downloadCsv(csvContent, fileName) {
  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}


// =========================================================================
// INDEXEDDB SESSION PERSISTENCE & HISTORY MANAGEMENT
// =========================================================================
async function refreshSavedSessionCountBadge() {
  const badge = document.getElementById('savedSessionCountBadge');
  if (!badge || typeof AdsDB === 'undefined') return;
  try {
    const list = await AdsDB.listSessions('search_terms');
    badge.innerText = `${list.length} phiên lưu`;
  } catch (e) {
    console.error('Error refreshing session count:', e);
  }
}

window.openSessionModal = async function() {
  const modal = document.getElementById('sessionHistoryModal');
  if (!modal) return;
  modal.style.display = 'flex';
  await renderSessionList();
};

window.closeSessionModal = function() {
  const modal = document.getElementById('sessionHistoryModal');
  if (modal) modal.style.display = 'none';
};

window.saveCurrentSessionToDB = async function() {
  if (!allSearchTermsData || allSearchTermsData.length === 0) {
    showToast('Chưa có dữ liệu cụm từ để lưu phiên!', true);
    return;
  }
  const input = document.getElementById('inputNewSessionName');
  const name = input && input.value.trim() ? input.value.trim() : `Phiên ${new Date().toLocaleDateString('vi-VN')} (${allSearchTermsData.length.toLocaleString('vi-VN')} dòng)`;

  try {
    const summary = {
      totalRows: allSearchTermsData.length,
      clicks: allSearchTermsData.reduce((acc, r) => acc + (r.clicks || 0), 0),
      cost: allSearchTermsData.reduce((acc, r) => acc + (r.cost || 0), 0),
      conv: allSearchTermsData.reduce((acc, r) => acc + (r.conv || 0), 0)
    };
    await AdsDB.saveSession('search_terms', name, summary, allSearchTermsData);
    if (input) input.value = '';
    showToast(`Đã lưu phiên "${name}" vào IndexedDB thành công!`);
    await renderSessionList();
    await refreshSavedSessionCountBadge();
  } catch (e) {
    console.error('Failed to save session:', e);
    showToast('Lỗi khi lưu phiên vào DB!', true);
  }
};

async function renderSessionList() {
  const container = document.getElementById('sessionListContainer');
  if (!container || typeof AdsDB === 'undefined') return;

  try {
    const sessions = await AdsDB.listSessions('search_terms');
    if (sessions.length === 0) {
      container.innerHTML = `
        <div class="text-center text-muted" style="padding: 30px;">
          <div style="font-size: 1.5rem; margin-bottom: 6px;">📂</div>
          Chưa có phiên phân tích nào được lưu trong trình duyệt.<br>
          <span class="text-xs">Sau khi tải file CSV, bấm <b>"Lưu phiên hiện tại"</b> để tái sử dụng nhanh bất kỳ lúc nào.</span>
        </div>
      `;
      return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
    sessions.forEach(sess => {
      const dateStr = new Date(sess.createdAt).toLocaleString('vi-VN');
      const rows = (sess.rowCount || 0).toLocaleString('vi-VN');
      const clicks = (sess.summary?.clicks || 0).toLocaleString('vi-VN');
      const cost = formatCurrency(sess.summary?.cost || 0);

      html += `
        <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
          <div style="flex: 1;">
            <div style="font-weight: 600; color: #f1f5f9; font-size: 0.86rem; margin-bottom: 2px;">
              ${escapeHtml(sess.name)}
            </div>
            <div style="font-size: 0.72rem; color: #94a3b8; display: flex; gap: 12px; flex-wrap: wrap;">
              <span>🕒 ${dateStr}</span>
              <span>📊 ${rows} dòng</span>
              <span>👆 ${clicks} clicks</span>
              <span>💰 ${cost}</span>
            </div>
          </div>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-primary btn-sm" onclick="loadSessionFromDB('${sess.id}')" title="Nạp lại phiên này">
              Khôi phục
            </button>
            <button class="btn btn-secondary btn-sm" style="color: #f87171;" onclick="deleteSessionFromDB('${sess.id}')" title="Xóa phiên">
              ✕
            </button>
          </div>
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;
  } catch (e) {
    console.error('Failed to list sessions:', e);
    container.innerHTML = `<div class="text-danger" style="padding: 20px;">Lỗi khi tải danh sách: ${e.message}</div>`;
  }
}

window.loadSessionFromDB = async function(id) {
  try {
    const res = await AdsDB.loadSession('search_terms', id);
    if (!res || !res.data) {
      showToast('Không tìm thấy dữ liệu phiên!', true);
      return;
    }
    allSearchTermsData = res.data;
    closeSessionModal();
    showToast(`Đã khôi phục thành công phiên: ${res.meta?.name || ''}`);
    updateFiltersHierarchy();
    renderAllSubtabs();
  } catch (e) {
    console.error('Failed to load session:', e);
    showToast('Lỗi khi nạp phiên từ DB!', true);
  }
};

window.deleteSessionFromDB = async function(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa phiên lưu trữ này khỏi IndexedDB?')) return;
  try {
    await AdsDB.deleteSession('search_terms', id);
    showToast('Đã xóa phiên thành công!');
    await renderSessionList();
    await refreshSavedSessionCountBadge();
  } catch (e) {
    console.error('Failed to delete session:', e);
    showToast('Lỗi khi xóa phiên!', true);
  }
};

// Khởi chạy cập nhật số lượng phiên khi trang tải xong
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnOpenSessionModal');
  if (btn) btn.addEventListener('click', openSessionModal);
  setTimeout(refreshSavedSessionCountBadge, 400);
});

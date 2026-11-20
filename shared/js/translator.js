/**
 * AdsInsight Pro - Shared Translation Engine
 * Kết hợp dịch nhanh ngoại tuyến (Local Dict) và Google Translate ngầm với LRU Cache
 */

(function () {
  'use strict';

  const TRANSLATION_CACHE_KEY = 'google_ads_translation_cache_v1';
  let translationCache = {};

  // Danh mục bản dịch chuẩn xác chuyên sâu cho sản phẩm & ngành hàng E-commerce
  const PRESET_EXPERT_TRANSLATIONS = {
    "Perawatan & Kecantikan": "Chăm sóc sắc đẹp & Mỹ phẩm",
    "Mobil": "Phụ kiện Ô tô",
    "Ibu & Bayi": "Mẹ & Bé",
    "Kamera & Drone": "Máy ảnh & Flycam",
    "Sepeda Motor": "Phụ tùng Xe máy",
    "Makanan & Minuman": "Thực phẩm & Đồ ăn uống",
    "Perlengkapan Rumah": "Đồ gia dụng & Nhà cửa",
    "Kesehatan": "Chăm sóc sức khỏe",
    "Hobi & Koleksi": "Sở thích & Sưu tầm",
    "Elektronik": "Thiết bị Điện tử",
    "Buku & Alat Tulis": "Sách & Văn phòng phẩm",
    "Fashion Muslim": "Thời trang Hồi giáo",
    "Olahraga & Outdoor": "Thể thao & Dã ngoại",
    "Hewan Peliharaan": "Thức ăn & Đồ thú cưng",
    "Pakaian Pria": "Thời trang & Quần áo Nam",
    "Audio": "Thiết bị Âm thanh & Loa",
    "Handphone & Aksesoris": "Điện thoại & Phụ kiện",
    "Fashion Bayi & Anak": "Thời trang Trẻ em"
  };

  try {
    const saved = localStorage.getItem(TRANSLATION_CACHE_KEY);
    if (saved) {
      translationCache = Object.assign({}, PRESET_EXPERT_TRANSLATIONS, JSON.parse(saved));
    } else {
      translationCache = Object.assign({}, PRESET_EXPERT_TRANSLATIONS);
    }
  } catch (e) {
    translationCache = Object.assign({}, PRESET_EXPERT_TRANSLATIONS);
  }

  function saveTranslationCache() {
    try {
      localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(translationCache));
    } catch (e) {
      // Bộ nhớ LocalStorage đầy -> Xén bớt 50% các bản ghi cũ
      const keys = Object.keys(translationCache);
      if (keys.length > 500) {
        const half = keys.slice(250);
        const newCache = {};
        half.forEach(k => { newCache[k] = translationCache[k]; });
        translationCache = newCache;
        try {
          localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(translationCache));
        } catch (err) {}
      }
    }
  }

  // Tạo ID phần tử DOM duy nhất từ chuỗi văn bản
  function hashTextToId(text, prefix = 'trans_') {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }
    return prefix + Math.abs(hash).toString(36);
  }

  // Kết hợp từ điển ID và ZH (nếu có)
  function getCombinedDictionary() {
    const dict = {};
    if (typeof window !== 'undefined') {
      if (window.ID_TO_VI_DICT) Object.assign(dict, window.ID_TO_VI_DICT);
      if (window.ZH_TO_VI_DICT) Object.assign(dict, window.ZH_TO_VI_DICT);
    }
    return dict;
  }

  // 1. Dịch tức thì bằng từ điển cục bộ (Hỗ trợ cụm từ dài trước, từ đơn sau)
  function translateFastLocal(text) {
    if (!text) return '';
    const dict = getCombinedDictionary();
    const trimmed = text.trim();

    // Khớp nguyên cụm trực tiếp
    if (dict[trimmed] || dict[trimmed.toLowerCase()]) {
      return dict[trimmed] || dict[trimmed.toLowerCase()];
    }

    // Tách từ theo khoảng trắng
    const words = trimmed.split(/\s+/);
    if (words.length === 0) return '';

    let hitCount = 0;
    const translated = words.map(raw => {
      const clean = raw.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
      if (clean && dict[clean]) {
        hitCount++;
        return dict[clean];
      }
      return raw;
    });

    return hitCount > 0 ? translated.join(' ') : '';
  }

  // 2. Dịch trực tuyến ngầm qua Google Translate API
  const pendingTranslationRequests = new Set();

  async function fetchGoogleTranslation(text, elementId) {
    if (!text || !text.trim()) return;
    const trimmed = text.trim();

    // Nếu đã có trong cache
    if (translationCache[trimmed]) {
      const el = document.getElementById(elementId);
      if (el) {
        const safeHtml = typeof window.escapeHtml === 'function' ? window.escapeHtml(translationCache[trimmed]) : translationCache[trimmed];
        el.innerHTML = `🇻🇳 <b>Dịch:</b> ${safeHtml}`;
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
              const safeHtml = typeof window.escapeHtml === 'function' ? window.escapeHtml(fullTranslation) : fullTranslation;
              el.innerHTML = `🇻🇳 <b>Dịch:</b> ${safeHtml}`;
            }
          }
        }
      }
    } catch (err) {
      // Khi offline giữ nguyên bản dịch nhanh từ điển
    } finally {
      pendingTranslationRequests.delete(trimmed);
    }
  }

  // Hàm tổng hợp: Lấy bản dịch tức thì (cache hoặc từ điển) và hẹn giờ tải bản dịch Google nếu cần
  function getOrQueueTranslation(text, elementId = null) {
    if (!text) return '';
    const trimmed = text.trim();

    if (translationCache[trimmed]) {
      return translationCache[trimmed];
    }

    if (elementId) {
      fetchGoogleTranslation(trimmed, elementId);
    }

    return translateFastLocal(trimmed);
  }

  // Dịch cụm từ trong bảng N-Gram
  function translateNgramWord(phrase, elementId = null) {
    if (!phrase) return '-';
    const trimmed = phrase.trim();

    if (translationCache[trimmed]) {
      return translationCache[trimmed];
    }
    if (elementId) {
      fetchGoogleTranslation(trimmed, elementId);
    }

    const dict = getCombinedDictionary();
    const directHit = dict[trimmed] || dict[trimmed.toLowerCase()];
    if (directHit) return directHit;

    const words = trimmed.split(/\s+/);
    const translatedParts = words.map(w => {
      const lower = w.toLowerCase();
      return dict[w] || dict[lower] || w;
    });
    const hasTrans = words.some(w => !!dict[w] || !!dict[w.toLowerCase()]);
    return hasTrans ? translatedParts.join(' ') : trimmed;
  }

  // Public API ra window
  window.AdsTranslator = {
    hashTextToId,
    translateFastLocal,
    fetchGoogleTranslation,
    getOrQueueTranslation,
    translateNgramWord,
    getCache: () => translationCache
  };

  // Expose các alias tương thích ngược
  window.hashTextToId = hashTextToId;
  window.translateFastLocal = translateFastLocal;
  window.fetchGoogleTranslation = fetchGoogleTranslation;
  window.getOrQueueHeadlineTranslation = getOrQueueTranslation;
  window.getOrQueueTranslation = getOrQueueTranslation;
  window.translateNgramWord = translateNgramWord;

})();

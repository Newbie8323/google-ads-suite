/**
 * Google Ads & Affiliate Intelligence Suite
 * Module: Phân Tích Hiệu Quả & Sản Phẩm Shopee (Phiên bản Tinh Gọn 3 Tab)
 * Tự động đồng bộ Live từ Google Sheet: Báo cáo chiến dịch 2.0 (JSONP CORS-Free)
 */

// =========================================================================
// CẤU HÌNH & BỘ DỊCH THUẬT ĐA TẦNG (HYBRID: TỪ ĐIỂN CỤC BỘ + GOOGLE TRANSLATE)
// =========================================================================

// Ưu tiên đọc từ config.local.js (chỉ có trên máy cá nhân). Khi lên GitHub, biến này rỗng để bảo mật.
const SPREADSHEET_ID = (typeof window !== 'undefined' && window.ADS_LOCAL_SECRETS && window.ADS_LOCAL_SECRETS.SPREADSHEET_ID)
  ? window.ADS_LOCAL_SECRETS.SPREADSHEET_ID
  : "";

// 1. Từ điển dịch từ vựng Indonesia -> Tiếng Việt
// Tích hợp từ Trung tâm Dữ liệu Dùng chung (shared/js/)
const idToViDict = (typeof window !== 'undefined' && window.ID_TO_VI_DICT)
  ? window.ID_TO_VI_DICT
  : {};

// Cache bản dịch trong LocalStorage
const TRANSLATION_CACHE_KEY = 'shopee_product_translation_cache_v1';
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
  "Fashion Bayi & Anak": "Thời trang Trẻ em",
  "Parfum  pria Penakluk Wanita Premium class aroma elegan , velora magic effect 30ml, Tahan lama disukai wanita": "Nước hoa nam cao cấp Velora Magic Effect 30ml hương thơm sang trọng quyến rũ lưu hương lâu",
  "PRIME Wiper Mobil Quad Blade 4 Layer Karet Frameless Universal Kaca Depan 1SET Kiri Kanan": "Gạt mưa ô tô PRIME Quad Blade 4 lớp cao su không khung đa năng kính chắn gió (Bộ 2 chiếc)",
  "CUSSONS BABY Minyak Telon Plus Series || Minyak Telon Bayi Cussons || Minyak Telon Anak": "Dầu tràm giữ ấm cho bé CUSSONS BABY Minyak Telon Plus chống muỗi",
  "KODAK Colorplus Roll Film 35mm , iso 200 ~ 36exp": "Cuộn phim máy ảnh KODAK Colorplus 35mm ISO 200 (36 kiểu)",
  "KABEL BODY HARNESS WIRE NON ISS BEAT ESP 2017-2019 CBS STD 32100-K81-N00 AHM": "Bộ dây điện sườn xe máy Honda Beat ESP 2017-2019 chính hãng AHM",
  "ANCHOR RED CHEDDAR CHEESE KEJU BURGER SLICE 84 - 1 KG x3": "Phô mai lát đỏ Anchor Red Cheddar làm bánh Burger (Gói 84 lát 1kg x3)",
  "BUTTER BLEND ANCHOR BAKER'S MIX BAKERSMIX BAKERMIX - 1 KG 1KG x3": "Bơ hỗn hợp làm bánh Anchor Baker's Mix thơm béo (1kg x3)",
  "Sendok Makan Kayu Garpu Makan Kayu Wooden Spoon Wooden Fork Spork Sendok Kayu Garpu Kayu Gase Kayu x500": "Bộ thìa dĩa gỗ ăn cơm dùng một lần thân thiện môi trường (Gói 500 chiếc)",
  "Super premium kacang mede matang utuh 1kg ready all varian roasted oven panggang goreng tersedia juga mete wijen pedas manis bak": "Hạt điều rang nguyên hạt cao cấp 1kg sấy giòn thơm ngon",
  "ACNAWAY Acne Spot Gel Stubborn 2.0 - Gel Penghilang Jerawat dengan Acne Care Formula, Reduces Pimples, Calm Redness, Spot Treatm": "Gel chấm mụn viêm sưng ACNAWAY Acne Spot 2.0 giảm đỏ gom cồi nhanh",
  "Bio Gold - Albuminos Ekstrak Ikan Gabus Kapsul Kutuk Untuk Luka Koreng Bernanah, Basah, Infeksi Cepat Kering": "Viên nang tinh chất cá lóc Bio Gold Albuminos hỗ trợ liền sẹo và vết thương",
  "FRISIAN FLAG SUSU UHT LOWFAT 946 ML x4": "Sữa tươi tiệt trùng ít béo Frisian Flag UHT Lowfat 946ml (Lốc 4 hộp)",
  "TERMURAH!!! Tas Gitar Akustik dan Jumbo / Softcase Gitar Akustik dan Jumbo Bahan Busa": "Bao da đàn guitar acoustic loại dày êm chống va đập",
  "Helm Half Face Pria/Wanita,Desain lensa ganda dengan Visor Anti Gores": "Mũ bảo hiểm nửa đầu 2 kính chống chói chống xước cho nam nữ",
  "Mesin Jam Dinding Detak & Sweep Aneka Jarum Jam x (black fullset elegan banget )": "Bộ máy đồng hồ treo tường kim trôi êm ái kèm đầy đủ kim",
  "OKAYAMA MAGIC COM murah 1,2 liter OK-105": "Nồi cơm điện giá rẻ OKAYAMA Magic Com 1.2 lít OK-105",
  "PLUTO TAPE Lakban Bening & Coklat 45x90,100,200,300 dan 500 Yard Super Rekat [Harga Satuan ]": "Băng dính đóng hàng siêu dính PLUTO TAPE trong và đục",
  "Sarung tangan motor anti air anti licin peka layar sentuh sinar uv resleting cepat kering universal pria wanita": "Găng tay đi xe máy chống nước chống trượt cảm ứng điện thoại",
  "Abaya Cheongsam Clara Safron Dress Baju Gamis Kerah Sanghai Premium Bahan Forzaleta Size Ukuran Xs S M L XL XXL XXXL Pakaian Mus": "Váy dài Abaya dáng sườn xám cách tân cổ Tàu chất vải cao cấp",
  "YEEXi Kipas angin Tornado 18 INCH JUMBO 3IN1 kipas angin besar  /kipas angin/kipas besi/kipas angin berdiri/stand fan": "Quạt lửng công nghiệp cánh sắt YEEXI Tornado 18 inch siêu mát 3 trong 1",
  "YEEXI Stop Kontak Kabel 2/3/4/5 Lubang 1.5/3/5 M Stop Kontak Colokan": "Ổ cắm điện đa năng kéo dài YEEXI chống giật tải cao",
  "YEEXI Kipas Angin Standing Kipas Remote Multifungsi Eight gears 16 Inch Kipas Berdiri": "Quạt cây đứng có điều khiển từ xa YEEXI 16 inch 8 cấp độ gió",
  "MIXIYA - Celana Highwaist Wanita 3/4 Bahan Stretch Model Legging Untuk Olahraga, Yoga, Fitness, Gym, Dan Aktivitas Outdoor": "Quần lửng cạp cao nữ co giãn nâng mông tập gym yoga thể thao",
  "FILTER KARBURATOR UDARA ORI HARGA GROSIR KARBURATOR ROBOT UNTUK KARBU PE28 P24 PE26 PNP": "Bầu lọc gió chế hòa khí độ PE28 PE24 PE26 cho xe máy",
  "Klavuu Real Vegan Collagen Eyepatch, Size - 60ea, ": "Mặt nạ thạch đắp mắt Collagen thực vật Klavuu chống nhăn thâm (60 miếng)",
  "NUT RACING SHORT - MUR BAUT RODA PENDEK 12 x 1.25 CARRY FUTURA ERTIGA APV x2": "Ốc tắc kê lazang bánh xe ô tô ngắn 12x1.25 Suzuki Ertiga Carry (Bộ 2)",
  "Saklar Otomatis Pompa Booster Pump Ukuran 1/2 Inch 3/4 Inch / Sensor Otomatis untuk Pompa Air / Flow Switch Pompa Dorong Booster": "Rơ le cảm biến dòng chảy tự động ngắt máy bơm nước tăng áp",
  "BAUT SHOK BELAKANG MIO SPORTY SMIEL SOUL FINO PROBOLT STAINLESS HENG ORIGINAL THAILAND": "Ốc giảm xóc sau xe Yamaha Mio Fino inox xoắn Probolt Thái Lan",
  "LED driver AC to DC 24Watt*1 Watt, Seri HPL 1W 8 W-24W, 24 Titik 1Watt x2": "Bộ nguồn tăng phô nguồn đèn LED Driver chuyển nguồn AC sang DC",
  "Keripik Tempe Sagu Crispy Halal Gurih Spesial 1 Kg": "Bánh snack đậu nành giòn rụm Tempe Sagu vị mặn thơm ngon (Gói 1kg)",
  "GROSIR TERMURAH! KALUNG ANTI KUTU KUCING MUSANG ANJING NO FLEA  Best Seller  READY STOK": "Vòng cổ trị ve rận bọ chét cho chó mèo thú cưng No Flea",
  "FRONTERA I Meo Kaleng 400gr wet food Adult, kitten Makanan Kucing Basah x2": "Pate lon thức ăn ướt cho mèo Me-O lon 400g (Combo 2 lon)",
  "Meo Dry Food Freshpack 1.1 kg Me-O Adult & Kitten, All Varian Best Seller, Protein Lengkap & Taurine": "Hạt thức ăn cho mèo Me-O gói túi tươi 1.1kg đủ vị giàu đạm",
  "Kayu Reng / Lis Kayu Jati Belanda 1,5x1,5x100cm Sudah Halus Siap Pakai x6": "Thanh gỗ thông xẻ mịn DIY trang trí nhà cửa 1.5x1.5x100cm (Set 6)",
  "Papan Kayu Jati Belanda Lebar 7,5cm x4": "Tấm ván gỗ thông trang trí làm kệ tường rộng 7.5cm (Set 4)",
  "HANASUI Moisturizer Gel Series - Ceramide Probiotics | Retinol | Bright Expert - Pelembab Gel Lembap & Mudah Menyerap": "Kem dưỡng ẩm dạng gel Hanasui cấp nước phục hồi da ngừa lão hóa",
  "Baut Flange Bolt M10x25 Kunci 14 Putih": "Bu lông mặt bích M10x25 xi mạ trắng vặn khóa 14",
  "Greenlight CelanaJeans Panjang Pria Regular Fit Levi Denim OL-C041224": "Quần jean nam ống suông dài Greenlight Denim chính hãng phom chuẩn",
  "[ANGELBEAUTY.CO] HAIR PRO - WATERBASED POMADE 50 gr": "Sáp vuốt tóc nam tạo kiểu gốc nước Pomade Hair Pro giữ nếp tự nhiên",
  "55 x 120 cm | RAM Speaker Model Plat Besi  Lobang Grill Speaker Mesh Cover Grill Pelindung Audio x2": "Tấm lưới sắt đột lỗ che chắn bảo vệ củ loa thùng 55x120cm (Bộ 2)",
  "MODOFO jam tangan smartwatch Muslim AMOLED 1.43 7.7m Layar Penghitung Tasbih Smartwatch 1ATM  anti air 123 mode olahraga jam sma": "Đồng hồ thông minh Smartwatch MODOFO màn hình AMOLED hỗ trợ nhắc nhở thể thao",
  "(WM) ObengTestpen Bolak Balik Tespen Induksi Min Plus 2 Dual LED Alat Deteksi Cek Ukur Kabel Putus": "Bút thử điện cảm ứng thông minh hai đầu 2 đèn LED báo đứt dây",
  "Fillet dada ayam 1kg (BLD) x3": "Ức gà phi lê tươi sạch đông lạnh 1kg (Combo 3kg)",
  "Sayap Ayam 1Kg x3": "Cánh gà tươi sạch đông lạnh 1kg (Combo 3kg)",
  "Ikan Tongkol Pindang 250gram x10": "Cá thu ngừ hấp gia vị thơm ngon đóng gói 250g (Combo 10 gói)",
  "kostum Mexico anak laki-laki/kostum Mexico pria/kostu Mexico laki-laki": "Bộ trang phục hóa trang lễ hội phong cách Mexico cho bé trai"
};

let translationCache = Object.assign({}, PRESET_EXPERT_TRANSLATIONS);
try {
  const saved = localStorage.getItem(TRANSLATION_CACHE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    translationCache = Object.assign(translationCache, parsed);
  }
} catch (e) {
  translationCache = Object.assign({}, PRESET_EXPERT_TRANSLATIONS);
}

function saveTranslationCache() {
  try {
    localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(translationCache));
  } catch (e) {
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

// Băm chuỗi text để gán ID phần tử DOM
function hashTextToId(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return 'trans_prod_' + Math.abs(hash).toString(36);
}

// Tiền biên dịch (Pre-compile) danh sách từ vựng & regex tổng hợp 1 lần duy nhất
const sortedDictPhrases = Object.keys(idToViDict).sort((a, b) => b.length - a.length);
const dictRegexUnion = new RegExp(
  '\\b(' + sortedDictPhrases.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b',
  'gi'
);

// Map không phân biệt hoa thường để tra cứu O(1)
const idToViLowerMap = new Map();
Object.keys(idToViDict).forEach(k => {
  idToViLowerMap.set(k.toLowerCase(), idToViDict[k]);
});

// Dịch tức thì siêu tốc qua Single-Pass Regex Replace
function translateFastLocal(text) {
  if (!text) return '';
  return text.replace(dictRegexUnion, match => {
    return idToViLowerMap.get(match.toLowerCase()) || match;
  });
}

// Dịch trực tuyến tự động qua Google Translate API
const pendingTranslations = new Set();
async function fetchGoogleTranslation(text, elementId) {
  if (!text || !text.trim()) return;
  const trimmed = text.trim();

  if (translationCache[trimmed]) {
    const el = document.getElementById(elementId);
    if (el) {
      el.innerHTML = `🇻🇳 <b>Dịch:</b> ${escapeHtml(translationCache[trimmed])}`;
    }
    return;
  }

  if (pendingTranslations.has(trimmed)) return;
  pendingTranslations.add(trimmed);

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
    // Không cản trở nếu offline
  } finally {
    pendingTranslations.delete(trimmed);
  }
}

function getOrQueueTranslation(text, elementId) {
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

// =========================================================================
// DATA STATE & STORE
// =========================================================================

let rawGoogleAdsData = []; // Từ tab Raw_gg_detail
let rawShopeeEcOrders = []; // Từ tab Raw_EC
let aggregatedCampaigns = []; // Danh sách chiến dịch tính ROAS

let rawShopeeOrders = []; // Từ file Order Detail người dùng nạp
let aggregatedProducts = []; // Gom nhóm theo tên sản phẩm
let aggregatedCategories = []; // Gom nhóm theo ngành hàng cho Tab Insights

let availableDatesList = [];
let currentFilter = {
  search: '',
  date: 'all',
  startDate: '', // YYYY-MM-DD
  endDate: '',   // YYYY-MM-DD
  sortBy: 'roas_desc'
};

// Hàm kiểm tra 1 ngày có nằm trong khoảng thời gian đang lọc hay không
function isDateInRange(targetDate) {
  if (!targetDate) return false;
  const d = normalizeDateString(targetDate);
  if (!d) return false;

  // Nếu người dùng chọn khoảng ngày (startDate hoặc endDate)
  if (currentFilter.startDate || currentFilter.endDate) {
    if (currentFilter.startDate && d < currentFilter.startDate) return false;
    if (currentFilter.endDate && d > currentFilter.endDate) return false;
    return true;
  }

  // Nếu người dùng chọn 1 ngày đơn lẻ
  if (currentFilter.date && currentFilter.date !== 'all') {
    return d === currentFilter.date;
  }

  return true;
}

// Trạng thái sắp xếp riêng từng tab tương tự giao diện web Lọc Cụm Từ Tìm Kiếm
let campSortCol = 'roas';
let campSortOrder = 'desc';

let prodSortCol = 'totalCommission';
let prodSortOrder = 'desc';

let ordSortCol = 'conversionTime';
let ordSortOrder = 'desc';

let activeTab = 'campaigns'; // 'campaigns' | 'products' | 'orders'

// =========================================================================
// TIỆN ÍCH ĐỊNH DẠNG SỐ & GCLID
// =========================================================================

function formatNumber(num) {
  return new Intl.NumberFormat('vi-VN').format(num || 0);
}

function formatCurrency(num) {
  return formatNumber(num) + '₫';
}

function parseCurrency(str) {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  let clean = String(str).replace(/VND/gi, '').trim();
  if (!clean) return 0;

  // Xử lý các định dạng tiền tệ:
  // 1. Dạng phân cách hàng nghìn bằng dấu phẩy kiểu Shopee: "1,521 VND", "253,427 VND"
  if (clean.includes(',') && !clean.includes('.')) {
    if (/,\d{3}$/.test(clean)) {
      clean = clean.replace(/,/g, '');
      return parseFloat(clean) || 0;
    } else {
      // Dạng số thập phân dấu phẩy: "1196,1"
      clean = clean.replace(/,/g, '.');
      return parseFloat(clean) || 0;
    }
  }
  // 2. Dạng kết hợp cả chấm và phẩy: "1.196,1" hoặc "1,196.1"
  if (clean.includes('.') && clean.includes(',')) {
    if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
      // 1.196,1
      clean = clean.replace(/\./g, '').replace(/,/g, '.');
    } else {
      // 1,196.1
      clean = clean.replace(/,/g, '');
    }
    return parseFloat(clean) || 0;
  }
  // 3. Dạng phân cách chấm: "253.427"
  if (clean.includes('.') && /^\d{1,3}(\.\d{3})+$/.test(clean)) {
    clean = clean.replace(/\./g, '');
    return parseFloat(clean) || 0;
  }

  return parseFloat(clean) || 0;
}

// Hàm chuẩn hóa chuỗi ngày về định dạng quốc tế chuẩn YYYY-MM-DD
function normalizeDateString(val) {
  if (!val) return '';
  const s = String(val).trim();
  if (!s) return '';

  // 1. Dạng ISO: YYYY-MM-DD
  const mIso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (mIso) {
    const y = mIso[1];
    const m = mIso[2].padStart(2, '0');
    const d = mIso[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 2. Dạng VN: DD/MM/YYYY hoặc D/M/YYYY
  const mVn = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mVn) {
    const d = mVn[1].padStart(2, '0');
    const m = mVn[2].padStart(2, '0');
    const y = mVn[3];
    return `${y}-${m}-${d}`;
  }

  // 3. Dạng GViz Date(YYYY, monthIndex, DD)
  const mGviz = s.match(/^Date\((\d{4}),\s*(\d{1,2}),\s*(\d{1,2})/);
  if (mGviz) {
    const y = mGviz[1];
    const m = String(parseInt(mGviz[2], 10) + 1).padStart(2, '0');
    const d = mGviz[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return s.split(' ')[0];
}

function normalizeHeaderKey(key) {
  if (!key) return '';
  return String(key).toLowerCase().replace(/[\s_-]+/g, '');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(msg, isError = false) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.innerText = msg;
  toast.style.background = isError ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// =========================================================================
// 1. ĐỒNG BỘ GOOGLE SHEETS LIVE (JSONP - KHÔNG LỖI CORS)
// =========================================================================

function fetchSheetJsonp(sheetName) {
  return new Promise((resolve, reject) => {
    const callbackName = 'gvizCallback_' + Math.floor(Math.random() * 10000000);
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Quá thời gian tải tab "${sheetName}" (Timeout 15s)`));
    }, 15000);

    function cleanup() {
      clearTimeout(timeout);
      delete window[callbackName];
      const el = document.getElementById(callbackName);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }

    window[callbackName] = function(response) {
      cleanup();
      if (!response || response.status === 'error') {
        const errMsg = response && response.errors ? response.errors.map(e => e.message).join('; ') : 'Lỗi GViz Query';
        reject(new Error(`Lỗi Google Sheets: ${errMsg}`));
        return;
      }
      try {
        const table = response.table;
        const cols = (table.cols || []).map(c => (c.label || c.id || '').trim());
        const rows = [];

        (table.rows || []).forEach(r => {
          if (!r || !r.c) return;
          const rowObj = {};
          r.c.forEach((cell, idx) => {
            const colName = cols[idx] || `col_${idx}`;
            let val = '';
            if (cell) {
              if (cell.f !== undefined && cell.f !== null) val = String(cell.f).trim();
              else if (cell.v !== undefined && cell.v !== null) val = String(cell.v).trim();
            }
            rowObj[colName] = val;
            rowObj[`__col_${idx}`] = val;
          });
          rows.push(rowObj);
        });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };

    const script = document.createElement('script');
    script.id = callbackName;
    script.src = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=responseHandler:${callbackName}&sheet=${encodeURIComponent(sheetName)}&_t=${Date.now()}`;
    script.onerror = function() {
      cleanup();
      reject(new Error(`Không thể kết nối tab "${sheetName}". Kiểm tra mạng hoặc quyền xem.`));
    };
    document.body.appendChild(script);
  });
}

async function syncShopeeGoogleSheet() {
  const syncBtn = document.getElementById('btnToolbarSyncSheet');
  const syncText = document.getElementById('btnSyncText');
  const sheetStatus = document.getElementById('sheetSyncStatusText');

  try {
    if (syncBtn) syncBtn.disabled = true;
    if (syncText) syncText.innerText = 'Đang tải Sheet...';
    if (sheetStatus) {
      sheetStatus.innerHTML = `<span style="color: #60a5fa;">Đang kết nối Google Sheets 2.0...</span>`;
    }

    const [ggRows, ecRows] = await Promise.all([
      fetchSheetJsonp('Raw_gg_detail'),
      fetchSheetJsonp('Raw_EC')
    ]);

    // Xử lý Tab Raw_gg_detail
    rawGoogleAdsData = [];
    ggRows.forEach(r => {
      const keys = Object.keys(r);
      let accName = '', date = '', campId = '', campName = '', cost = 0, clicks = 0;
      keys.forEach((k, idx) => {
        const val = String(r[k] || '').trim();
        const norm = normalizeHeaderKey(k);
        if (norm.includes('tentaikhoan') || k === '__col_0') accName = val;
        else if (norm.includes('ngay') || k === '__col_2') date = val;
        else if (norm.includes('idchiendich') || k === '__col_4') campId = val;
        else if (norm.includes('chiendich') || k === '__col_5') campName = val;
        else if (norm.includes('chiphi') || k === '__col_6') cost = parseFloat(val.replace(/,/g, '.')) || 0;
        else if (norm.includes('luotnhap') || k === '__col_7') clicks = parseInt(val.replace(/[^0-9]/g, ''), 10) || 0;
      });

      if (accName.includes('Channel_AFF_Shopee_ECO')) {
        rawGoogleAdsData.push({
          accountName: accName,
          date: normalizeDateString(date),
          campaignId: campId,
          campaignName: campName,
          costRaw: cost,
          costFinal: cost * 1.02, // +2% thuế/phí theo đặc tả
          clicks: clicks
        });
      }
    });

    // Xử lý Tab Raw_EC
    rawShopeeEcOrders = [];
    const dateSet = new Set();

    ecRows.forEach((r, idx) => {
      const keys = Object.keys(r);
      let clickId = '', convTime = '', adv = '', orderId = '', status = '', sub1 = '', date = '', netComm = 0, saleAmount = 0;

      keys.forEach(k => {
        const val = String(r[k] || '').trim();
        const norm = normalizeHeaderKey(k);
        if (norm.includes('clickid') || k === '__col_0') clickId = val;
        else if (norm.includes('conversiontime') || k === '__col_2') convTime = val;
        else if (norm.includes('advertiser') || k === '__col_3') adv = val;
        else if (norm.includes('orderid') || k === '__col_5') orderId = val;
        else if (norm === 'status' || k === '__col_6') status = val;
        else if (norm.includes('saleamount') || k === '__col_12') saleAmount = parseCurrency(val);
        else if (norm === 'sub1' || k === '__col_21') sub1 = val;
        else if (norm.includes('date') || k === '__col_31') date = val;
        else if (norm.includes('hoahongtheotyle') || k === '__col_34') {
          netComm = parseFloat(val.replace(/\./g, '').replace(/,/g, '.')) || 0;
        }
      });

      if (adv.toLowerCase().includes('shopee')) {
        let campaignId = '';
        if (clickId.length >= 11) campaignId = clickId.substring(10).trim();

        const dateVal = normalizeDateString(date || convTime);
        if (dateVal) dateSet.add(dateVal);

        rawShopeeEcOrders.push({
          id: idx + 1,
          clickId: clickId,
          campaignId: campaignId,
          orderId: orderId,
          status: status,
          date: dateVal,
          conversionTime: convTime,
          netCommission: netComm,
          saleAmount: saleAmount,
          sub1: sub1
        });
      }
    });

    // Cập nhật bộ lọc ngày
    availableDatesList = Array.from(dateSet).sort().reverse();
    populateDateFilterDropdown();

    // Gom nhóm và tính toán ROAS
    aggregateCampaignsData();

    // Nếu chưa nạp file Order Detail, tạm đưa đơn từ Raw_EC vào bảng đơn hàng
    if (rawShopeeOrders.length === 0) {
      populateOrdersFromRawEC();
    }

    renderDashboard();
    renderCurrentTab();

    if (sheetStatus) {
      sheetStatus.innerHTML = `Đã đồng bộ: <b>${rawGoogleAdsData.length}</b> dòng Ads & <b>${rawShopeeEcOrders.length}</b> đơn Shopee!`;
      sheetStatus.style.color = '#34d399';
    }
    showToast(`Đồng bộ thành công! Tìm thấy ${aggregatedCampaigns.length} chiến dịch.`);

  } catch (err) {
    console.error('Lỗi khi đồng bộ Google Sheet:', err);
    showToast('Lỗi đồng bộ Sheet: ' + err.message, true);
    if (sheetStatus) {
      sheetStatus.innerHTML = `<span style="color: #f87171;">Lỗi: ${escapeHtml(err.message)}</span>`;
    }
  } finally {
    if (syncBtn) syncBtn.disabled = false;
    if (syncText) syncText.innerText = 'Đồng Bộ Sheet Ngay';
  }
}

function aggregateCampaignsData() {
    const campMap = new Map();
  const selectedDate = currentFilter.date;
  const campOrderSetMap = new Map(); // Set để đếm đúng số đơn hàng độc lập (không bị tính lặp theo số item)

  const getOrCreateCamp = (id, name = '') => {
    if (!campMap.has(id)) {
      campMap.set(id, {
        campaignId: id,
        campaignName: name || 'Chiến dịch #' + id,
        clicks: 0,
        cost: 0,
        orders: 0,
        commission: 0,
        saleAmount: 0,
        dates: new Set()
      });
      campOrderSetMap.set(id, new Set());
    }
    const item = campMap.get(id);
    if ((!item.campaignName || item.campaignName.startsWith('Chiến dịch #')) && name) {
      item.campaignName = name;
    }
    return item;
  };

  // 1. Clicks & Cost từ Ads (Lọc chuẩn theo khoảng thời gian)
  rawGoogleAdsData.forEach(r => {
    if (!r.campaignId) return;
    if (!isDateInRange(r.date)) return;

    const camp = getOrCreateCamp(r.campaignId, r.campaignName);
    camp.clicks += r.clicks;
    camp.cost += r.costFinal;
    if (r.date) camp.dates.add(r.date);
  });

  // 2. Hoa hồng & Đơn hàng (Luôn lấy từ Raw_EC của Google Sheet để đảm bảo con số ROAS & Chi phí chuẩn tuyệt đối không bị lệch khi nạp file CSV)
  const ordersSource = rawShopeeEcOrders;

  ordersSource.forEach(ord => {
    if (!ord.campaignId) return;
    const d = normalizeDateString(ord.date || ord.conversionTime);
    if (!isDateInRange(d)) return;

    const camp = getOrCreateCamp(ord.campaignId);

    const st = (ord.status || '').toLowerCase();
    if (!st.includes('reject')) {
      // Đếm đúng số đơn hàng độc lập, tránh đếm lặp khi 1 đơn có nhiều sản phẩm
      const orderSet = campOrderSetMap.get(ord.campaignId);
      if (ord.orderId && orderSet) {
        if (!orderSet.has(ord.orderId)) {
          orderSet.add(ord.orderId);
          camp.orders += 1;
        }
      } else {
        camp.orders += 1;
      }
      camp.commission += (ord.netCommission !== undefined ? ord.netCommission : (ord.totalCommission || 0));
      camp.saleAmount += (ord.saleAmount || 0);
    }
    if (d) camp.dates.add(d);
  });

  aggregatedCampaigns = Array.from(campMap.values());
}

function populateOrdersFromRawEC() {
  rawShopeeOrders = rawShopeeEcOrders.map((o, idx) => ({
    id: idx + 1,
    orderId: o.orderId,
    productNameFull: `Đơn hàng #${o.orderId}`,
    quantity: 1,
    status: o.status,
    saleAmount: o.saleAmount,
    totalCommission: o.netCommission,
    baseCommission: o.netCommission,
    brandBonus: 0,
    date: o.date,
    conversionTime: o.conversionTime || o.date,
    trackingGclid: (o.sub1 && o.sub1.startsWith('Cj')) ? o.sub1 : (o.sub1 || o.clickId),
    campaignId: o.campaignId
  }));
}

function populateDateFilterDropdown() {
  const select = document.getElementById('shopeeDateRangeFilter');
  if (!select) return;

  const dateSet = new Set();
  // Quét ngày đã được chuẩn hóa từ Google Ads và Orders
  rawGoogleAdsData.forEach(g => {
    const nd = normalizeDateString(g.date);
    if (nd) dateSet.add(nd);
  });
  rawShopeeEcOrders.forEach(o => {
    const nd = normalizeDateString(o.date || o.conversionTime);
    if (nd) dateSet.add(nd);
  });
  rawShopeeOrders.forEach(o => {
    const nd = normalizeDateString(o.date || o.conversionTime);
    if (nd) dateSet.add(nd);
  });

  availableDatesList = Array.from(dateSet).filter(Boolean).sort().reverse();
  const currentVal = currentFilter.date || 'all';

  let html = `<option value="all" ${currentVal === 'all' ? 'selected' : ''}>Tất cả các ngày (${availableDatesList.length} ngày)</option>`;
  availableDatesList.forEach(d => {
    html += `<option value="${escapeHtml(d)}" ${currentVal === d ? 'selected' : ''}>Ngày ${escapeHtml(d)}</option>`;
  });
  select.innerHTML = html;
}

// =========================================================================
// 2. NẠP FILE ORDER DETAIL SHOPEE (BÓC TÁCH SẢN PHẨM & TRACKING GCLID)
// =========================================================================

function processShopeeRows(rows) {
  if (!rows || rows.length === 0) {
    showToast('File không có dữ liệu!', true);
    return;
  }

  const sample = rows[0];
  const keys = Object.keys(sample);
  const keyMap = {};

  keys.forEach(k => {
    const norm = normalizeHeaderKey(k);
    if (norm.includes('productname') || norm.includes('tensanpham')) keyMap.productName = k;
    else if (norm.includes('categoryname')) keyMap.category = k;
    else if (norm === 'status') keyMap.status = k;
    else if (norm.includes('saleamount')) keyMap.saleAmount = k;
    else if (norm.includes('totalcommission')) keyMap.totalCommission = k;
    else if (norm.includes('basecommission')) keyMap.baseCommission = k;
    else if (norm.includes('brandbonus')) keyMap.brandBonus = k;
    else if (norm.includes('rankbonus')) keyMap.rankBonus = k;
    else if (norm.includes('orderid')) keyMap.orderId = k;
    else if (norm.includes('conversiontime')) keyMap.conversionTime = k;
    else if (norm === 'sub1') keyMap.sub1 = k;
    else if (norm === 'sub2') keyMap.sub2 = k;
    else if (norm.includes('clickid')) keyMap.clickId = k;
  });

  const parsed = [];
  rows.forEach((r, idx) => {
    const rawName = (r[keyMap.productName] || '').trim();
    if (!rawName) return;

    const rawClickId = String(r[keyMap.clickId || 'Click id'] || r['Click id'] || '').trim();
    let campaignId = '';
    if (rawClickId.length >= 11) campaignId = rawClickId.substring(10).trim();

    const sub1 = r[keyMap.sub1] || '';
    const sub2 = r[keyMap.sub2] || '';
    const trackingGclid = sub1.startsWith('Cj') ? (sub1 + (sub2 || '')) : (sub1 || rawClickId);

    const rawConv = String(r[keyMap.conversionTime] || '').replace(/[\t\r\n]/g, '').trim();
    const cleanOrderId = String(r[keyMap.orderId] || '').replace(/[\t\r\n]/g, '').trim();
    const rankBonusVal = parseCurrency(r[keyMap.rankBonus]);
    parsed.push({
      id: idx + 1,
      orderId: cleanOrderId,
      productNameFull: rawName,
      categoryName: String(r[keyMap.category] || 'Chưa phân loại').replace(/[\t\r\n]/g, '').trim(),
      status: String(r[keyMap.status] || 'Pending').replace(/[\t\r\n]/g, '').trim(),
      saleAmount: parseCurrency(r[keyMap.saleAmount]),
      totalCommission: parseCurrency(r[keyMap.totalCommission]),
      baseCommission: parseCurrency(r[keyMap.baseCommission]),
      brandBonus: parseCurrency(r[keyMap.brandBonus]),
      rankBonus: rankBonusVal,
      date: normalizeDateString(rawConv),
      conversionTime: rawConv,
      trackingGclid: trackingGclid,
      clickId: rawClickId,
      campaignId: campaignId
    });
  });

  if (parsed.length === 0) {
    showToast('Không đọc được dữ liệu đơn hàng hợp lệ nào.', true);
    return;
  }

  // Hợp nhất dữ liệu thông minh: giữ lại đơn lịch sử từ Sheet nếu file CSV chỉ chứa vài ngày gần nhất
  const uploadedOrderIds = new Set(parsed.map(p => p.orderId));
  const retainedSheetOrders = rawShopeeEcOrders
    .filter(o => !uploadedOrderIds.has(o.orderId))
    .map((o, idx) => ({
      id: parsed.length + idx + 1,
      orderId: o.orderId,
      productNameFull: `Đơn hàng Shopee #${o.orderId}`,
      quantity: 1,
      status: o.status,
      saleAmount: o.saleAmount,
      totalCommission: o.netCommission,
      baseCommission: o.netCommission,
      brandBonus: 0,
      rankBonus: 0,
      date: o.date,
      conversionTime: o.conversionTime || o.date,
      trackingGclid: (o.sub1 && o.sub1.startsWith('Cj')) ? o.sub1 : (o.sub1 || o.clickId),
      campaignId: o.campaignId
    }));

  rawShopeeOrders = [...parsed, ...retainedSheetOrders];

  // Gom nhóm sản phẩm bán chạy
  aggregateProductsData();

  // Gom nhóm ngành hàng phân tích Insights
  aggregateCategoriesData();

  // Cập nhật lại dropdown ngày khi nạp file ngoài
  populateDateFilterDropdown();

  // Ánh xạ sang các chiến dịch Google Ads
  aggregateCampaignsData();

  renderDashboard();
  renderCurrentTab();

  const fileStatus = document.getElementById('shopeeFileStatus');
  if (fileStatus) {
    fileStatus.innerHTML = `Đã nạp <b>${formatNumber(rawShopeeOrders.length)}</b> dòng đơn hàng thành công!`;
    fileStatus.style.color = '#34d399';
  }
  showToast(`Nạp thành công ${rawShopeeOrders.length} dòng đơn hàng Shopee!`);
}

function aggregateProductsData() {
  const map = new Map();

  rawShopeeOrders.forEach(ord => {
    const name = ord.productNameFull.trim();
    if (!map.has(name)) {
      map.set(name, {
        productName: name,
        productNameVi: translateFastLocal(name),
        categoryName: ord.categoryName || '',
        orderCount: 0,
        totalSaleAmount: 0,
        totalCommission: 0,
        baseCommission: 0,
        brandBonus: 0,
        validOrders: 0
      });
    }

    const item = map.get(name);
    item.orderCount += 1;
    item.totalSaleAmount += ord.saleAmount;

    const st = ord.status.toLowerCase();
    if (!st.includes('reject')) {
      item.validOrders += 1;
      item.totalCommission += ord.totalCommission;
      item.baseCommission += ord.baseCommission;
      item.brandBonus += ord.brandBonus;
    }
  });

  aggregatedProducts = Array.from(map.values());
}

function aggregateCategoriesData() {
  const catMap = new Map();

  rawShopeeOrders.forEach(ord => {
    const cat = ord.categoryName || 'Chưa phân loại';
    if (!catMap.has(cat)) {
      catMap.set(cat, {
        categoryName: cat,
        categoryNameVi: translateFastLocal(cat),
        totalItems: 0,
        validItems: 0,
        rejectedItems: 0,
        totalCommission: 0,
        baseCommission: 0,
        brandBonus: 0,
        totalSaleAmount: 0,
        sampleProducts: []
      });
    }

    const item = catMap.get(cat);
    item.totalItems += 1;
    if (item.sampleProducts.length < 3 && !item.sampleProducts.includes(ord.productNameFull)) {
      item.sampleProducts.push(ord.productNameFull);
    }

    const st = ord.status.toLowerCase();
    if (!st.includes('reject')) {
      item.validItems += 1;
      item.totalCommission += ord.totalCommission;
      item.baseCommission += ord.baseCommission;
      item.brandBonus += ord.brandBonus;
      item.totalSaleAmount += ord.saleAmount;
    } else {
      item.rejectedItems += 1;
    }
  });

  aggregatedCategories = Array.from(catMap.values());
}

// =========================================================================
// 3. DASHBOARD KPI CARDS & TABS RENDERING
// =========================================================================

function renderDashboard() {
  let totalCost = 0;
  let totalClicks = 0;
  let totalComm = 0;
  let totalOrders = 0;

  const filteredCamps = getFilteredCampaigns();
  filteredCamps.forEach(c => {
    totalCost += c.cost;
    totalClicks += c.clicks;
    totalComm += c.commission;
    totalOrders += c.orders;
  });

  const netProfit = totalComm - totalCost;
  const roas = totalCost > 0 ? (totalComm / totalCost) : 0;

  const kpiCostEl = document.getElementById('kpiShopeeCost');
  const kpiClicksEl = document.getElementById('kpiShopeeClicks');
  const kpiTotalCommEl = document.getElementById('kpiTotalCommission');
  const kpiOrdersEl = document.getElementById('kpiShopeeOrdersCount');
  const kpiProfitEl = document.getElementById('kpiShopeeProfit');
  const kpiProfitSub = document.getElementById('kpiShopeeProfitSub');
  const kpiRoasEl = document.getElementById('kpiShopeeRoas');
  const kpiRoasSub = document.getElementById('kpiShopeeRoasSub');

  if (kpiCostEl) kpiCostEl.innerText = formatCurrency(Math.round(totalCost));
  if (kpiClicksEl) kpiClicksEl.innerText = `${formatNumber(totalClicks)} lượt nhấp`;

  if (kpiTotalCommEl) kpiTotalCommEl.innerText = formatCurrency(Math.round(totalComm));
  if (kpiOrdersEl) kpiOrdersEl.innerText = `${formatNumber(totalOrders)} đơn hợp lệ`;

  if (kpiProfitEl) {
    kpiProfitEl.innerText = (netProfit >= 0 ? '+' : '') + formatCurrency(Math.round(netProfit));
    kpiProfitEl.style.color = netProfit >= 0 ? '#34d399' : '#f87171';
  }
  if (kpiProfitSub) {
    kpiProfitSub.innerText = netProfit >= 0 ? 'Chiến dịch đang sinh lời tốt' : 'Chiến dịch đang bị âm tiền';
  }

  if (kpiRoasEl) {
    kpiRoasEl.innerText = `${roas.toFixed(2)}x`;
    kpiRoasEl.style.color = roas >= 1.0 ? '#34d399' : (roas >= 0.5 ? '#fbbf24' : '#f87171');
  }
  if (kpiRoasSub) {
    kpiRoasSub.innerText = roas >= 1.0 ? 'Đã vượt điểm hòa vốn (Có lãi)' : 'Chưa đủ bù tiền quảng cáo';
  }
}

function renderCurrentTab() {
  const campView = document.getElementById('viewCampaignsTab');
  const prodView = document.getElementById('viewProductsTab');
  const ordView = document.getElementById('viewOrdersTab');

  if (activeTab === 'insights') activeTab = 'campaigns'; // fallback if old tab state

  if (campView) campView.style.display = activeTab === 'campaigns' ? 'block' : 'none';
  if (prodView) prodView.style.display = activeTab === 'products' ? 'block' : 'none';
  if (ordView) ordView.style.display = activeTab === 'orders' ? 'block' : 'none';

  document.querySelectorAll('.tab-pill-btn').forEach(t => {
    if (t.dataset.tab === activeTab) t.classList.add('active');
    else t.classList.remove('active');
  });

  if (activeTab === 'campaigns') renderCampaignsTable();
  else if (activeTab === 'products') renderProductsTable();
  else if (activeTab === 'orders') renderOrdersTable();
}

/**
 * TAB 1: HIỆU QUẢ CHIẾN DỊCH (ROAS)
 */
function renderCampaignsTable() {
  const tbody = document.getElementById('shopeeCampaignsTableBody');
  const tfoot = document.getElementById('shopeeCampaignsTableFoot');
  const badge = document.getElementById('campaignsSummaryBadge');
  if (!tbody) return;

  const filtered = getFilteredCampaigns();

  if (badge) {
    badge.innerText = `Hiển thị ${filtered.length} / ${aggregatedCampaigns.length} chiến dịch`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted" style="padding: 35px;">
      Không tìm thấy chiến dịch nào khớp với bộ lọc.
    </td></tr>`;
    if (tfoot) tfoot.style.display = 'none';
    return;
  }

  let totalClicks = 0, totalCost = 0, totalOrders = 0, totalComm = 0;
  let html = '';

  filtered.forEach((c, idx) => {
    totalClicks += c.clicks;
    totalCost += c.cost;
    totalOrders += c.orders;
    totalComm += c.commission;

    const profit = c.commission - c.cost;
    const roas = c.cost > 0 ? (c.commission / c.cost) : 0;
    const cpc = c.clicks > 0 ? Math.round(c.cost / c.clicks) : 0;

    const roasClass = roas >= 1.0 ? 'text-success' : (roas >= 0.5 ? 'text-warning' : 'text-danger');
    const profitClass = profit >= 0 ? 'text-success' : 'text-danger';

    // 1. Tỷ lệ chuyển đổi (CVR) = Số đơn / Lượt nhấp
    const cvr = c.clicks > 0 ? ((c.orders / c.clicks) * 100) : 0;
    // 2. Chi phí chuyển đổi (CPA) = Chi phí Ads (+2%) / Số đơn
    const cpa = c.orders > 0 ? Math.round(c.cost / c.orders) : 0;
    // 3. Hoa hồng hòa vốn mỗi đơn = Chính là mức CPA cần bù đắp
    const breakEvenComm = cpa;

    html += `
      <tr>
        <td style="text-align: center; color: #64748b;">${idx + 1}</td>
        <td style="font-weight: 600; color: #f1f5f9;">${escapeHtml(c.campaignName)}</td>
        <td style="text-align: center; font-family: monospace;">${formatNumber(c.clicks)}</td>
        <td style="text-align: center; font-family: monospace; color: #f87171;">${formatCurrency(Math.round(c.cost))}</td>
        <td style="text-align: center; font-family: monospace; font-weight: 700;">${formatNumber(c.orders)}</td>
        <td style="text-align: center; font-family: monospace; color: #34d399; font-weight: 700;">${formatCurrency(Math.round(c.commission))}</td>
        <td style="text-align: center; font-family: monospace; font-weight: 700;" class="${profitClass}">${(profit >= 0 ? '+' : '') + formatCurrency(Math.round(profit))}</td>
        <td style="text-align: center; font-family: monospace; font-weight: 800;" class="${roasClass}">${roas.toFixed(2)}x</td>
        <td style="text-align: center; font-family: monospace; color: #94a3b8; font-size: 0.8rem;">~${formatNumber(cpc)}₫</td>
        <td style="text-align: center; font-family: monospace; color: #a78bfa; font-weight: 600;">${cvr.toFixed(2)}%</td>
        <td style="text-align: center; font-family: monospace; color: #f87171; font-weight: 600;">${cpa > 0 ? formatCurrency(cpa) : (c.cost > 0 ? '<span style="color:#64748b; font-weight:normal;" title="Chưa ra đơn">-</span>' : '0₫')}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;

  if (tfoot) {
    tfoot.style.display = '';
    const footCount = document.getElementById('footCampCount');
    const footClicks = document.getElementById('footCampClicks');
    const footCost = document.getElementById('footCampCost');
    const footOrders = document.getElementById('footCampOrders');
    const footComm = document.getElementById('footCampCommission');
    const footProfit = document.getElementById('footCampProfit');
    const footRoas = document.getElementById('footCampRoas');
    const footCpc = document.getElementById('footCampCpc');

    const avgCvr = totalClicks > 0 ? ((totalOrders / totalClicks) * 100) : 0;
    const avgCpa = totalOrders > 0 ? Math.round(totalCost / totalOrders) : 0;
    const avgBreakEvenComm = avgCpa;
    const totalProfit = totalComm - totalCost;
    const totalRoas = totalCost > 0 ? (totalComm / totalCost) : 0;
    const avgCpc = totalClicks > 0 ? Math.round(totalCost / totalClicks) : 0;

    if (footCount) footCount.innerText = filtered.length;
    if (footClicks) footClicks.innerText = formatNumber(totalClicks);
    if (footCost) footCost.innerText = formatCurrency(Math.round(totalCost));
    if (footOrders) footOrders.innerText = formatNumber(totalOrders);
    if (footComm) footComm.innerText = formatCurrency(Math.round(totalComm));
    if (footProfit) {
      footProfit.innerText = (totalProfit >= 0 ? '+' : '') + formatCurrency(Math.round(totalProfit));
      footProfit.style.color = totalProfit >= 0 ? '#34d399' : '#f87171';
    }
    if (footRoas) {
      footRoas.innerText = `${totalRoas.toFixed(2)}x`;
      footRoas.style.color = totalRoas >= 1.0 ? '#34d399' : (totalRoas >= 0.5 ? '#fbbf24' : '#f87171');
    }
    if (footCpc) footCpc.innerText = `~${formatNumber(avgCpc)}₫`;
    const footCvr = document.getElementById('footCampCvr');
    if (footCvr) footCvr.innerText = `${avgCvr.toFixed(2)}%`;
    const footCpa = document.getElementById('footCampCpa');
    if (footCpa) footCpa.innerText = avgCpa > 0 ? formatCurrency(avgCpa) : '0₫';
  }
}

// =========================================================================
// HÀM XỬ LÝ SẮP XẾP CLICK TIÊU ĐỀ BẢNG (CHUẨN NHƯ CÁC WEB KHÁC)
// =========================================================================

window.handleTableSort = function(colName) {
  if (campSortCol === colName) {
    campSortOrder = campSortOrder === 'desc' ? 'asc' : 'desc';
  } else {
    campSortCol = colName;
    campSortOrder = (colName === 'campaignId' || colName === 'campaignName') ? 'asc' : 'desc';
  }

  // Cập nhật mũi tên và class active trên header
  document.querySelectorAll('#viewCampaignsTab .th-sortable').forEach(th => {
    th.classList.remove('active');
    const arrow = th.querySelector('.sort-arrow');
    if (arrow) arrow.innerText = '↕';
  });

  const activeTh = document.querySelector(`#viewCampaignsTab .th-sortable[data-col="${colName}"]`);
  if (activeTh) {
    activeTh.classList.add('active');
    const activeArrow = document.getElementById(`sort-${colName}`);
    if (activeArrow) activeArrow.innerText = campSortOrder === 'desc' ? '↓' : '↑';
  }

  // Đồng bộ giá trị vào dropdown nếu có
  const sortSelect = document.getElementById('shopeeSortFilter');
  if (sortSelect) {
    const mapVal = `${colName}_${campSortOrder}`;
    if (sortSelect.querySelector(`option[value="${mapVal}"]`)) {
      sortSelect.value = mapVal;
    }
  }

  renderCampaignsTable();
};

window.handleProductTableSort = function(colName) {
  if (prodSortCol === colName) {
    prodSortOrder = prodSortOrder === 'desc' ? 'asc' : 'desc';
  } else {
    prodSortCol = colName;
    prodSortOrder = colName === 'productName' ? 'asc' : 'desc';
  }

  document.querySelectorAll('#viewProductsTab .th-sortable').forEach(th => {
    th.classList.remove('active');
    const arrow = th.querySelector('.sort-arrow');
    if (arrow) arrow.innerText = '↕';
  });

  const activeTh = document.querySelector(`#viewProductsTab .th-sortable[data-col="${colName}"]`);
  if (activeTh) {
    activeTh.classList.add('active');
    const activeArrow = document.getElementById(`sort-prod-${colName}`);
    if (activeArrow) activeArrow.innerText = prodSortOrder === 'desc' ? '↓' : '↑';
  }

  renderProductsTable();
};

window.handleOrderTableSort = function(colName) {
  if (ordSortCol === colName) {
    ordSortOrder = ordSortOrder === 'desc' ? 'asc' : 'desc';
  } else {
    ordSortCol = colName;
    ordSortOrder = (colName === 'orderId' || colName === 'productNameFull') ? 'asc' : 'desc';
  }

  document.querySelectorAll('#viewOrdersTab .th-sortable').forEach(th => {
    th.classList.remove('active');
    const arrow = th.querySelector('.sort-arrow');
    if (arrow) arrow.innerText = '↕';
  });

  const activeTh = document.querySelector(`#viewOrdersTab .th-sortable[data-col="${colName}"]`);
  if (activeTh) {
    activeTh.classList.add('active');
    const activeArrow = document.getElementById(`sort-ord-${colName}`);
    if (activeArrow) activeArrow.innerText = ordSortOrder === 'desc' ? '↓' : '↑';
  }

  renderOrdersTable();
};

function getFilteredCampaigns() {
  let list = [...aggregatedCampaigns];

  if (currentFilter.search) {
    const q = currentFilter.search.trim().toLowerCase();
    list = list.filter(c => c.campaignId.toLowerCase().includes(q) || c.campaignName.toLowerCase().includes(q));
  }

  // Sắp xếp theo campSortCol và campSortOrder
  list.sort((a, b) => {
    let valA = 0, valB = 0;
    const roasA = a.cost > 0 ? (a.commission / a.cost) : 0;
    const roasB = b.cost > 0 ? (b.commission / b.cost) : 0;
    const profitA = a.commission - a.cost;
    const profitB = b.commission - b.cost;
    const cpcA = a.clicks > 0 ? (a.cost / a.clicks) : 0;
    const cpcB = b.clicks > 0 ? (b.cost / b.clicks) : 0;

    if (campSortCol === 'roas') { valA = roasA; valB = roasB; }
    else if (campSortCol === 'profit') { valA = profitA; valB = profitB; }
    else if (campSortCol === 'commission') { valA = a.commission; valB = b.commission; }
    else if (campSortCol === 'cost') { valA = a.cost; valB = b.cost; }
    else if (campSortCol === 'orders') { valA = a.orders; valB = b.orders; }
    else if (campSortCol === 'clicks') { valA = a.clicks; valB = b.clicks; }
    else if (campSortCol === 'cpc') { valA = cpcA; valB = cpcB; }
    else if (campSortCol === 'cvr') {
      valA = a.clicks > 0 ? (a.orders / a.clicks) : 0;
      valB = b.clicks > 0 ? (b.orders / b.clicks) : 0;
    }
    else if (campSortCol === 'cpa') {
      valA = a.orders > 0 ? (a.cost / a.orders) : (a.cost > 0 ? a.cost * 2 : 0);
      valB = b.orders > 0 ? (b.cost / b.orders) : (b.cost > 0 ? b.cost * 2 : 0);
    }
    else if (campSortCol === 'breakEvenComm') {
      valA = a.orders > 0 ? (a.cost / a.orders) : (a.cost > 0 ? a.cost : 0);
      valB = b.orders > 0 ? (b.cost / b.orders) : (b.cost > 0 ? b.cost : 0);
    }
    else if (campSortCol === 'campaignName') {
      return campSortOrder === 'asc' ? a.campaignName.localeCompare(b.campaignName) : b.campaignName.localeCompare(a.campaignName);
    } else if (campSortCol === 'campaignId') {
      return campSortOrder === 'asc' ? a.campaignId.localeCompare(b.campaignId) : b.campaignId.localeCompare(a.campaignId);
    }

    return campSortOrder === 'desc' ? (valB - valA) : (valA - valB);
  });

  return list;
}

/**
 * TAB 2: TỔNG HỢP INSIGHTS NGÀNH HÀNG & ĐỀ XUẤT
 */
function renderInsightsTab() {
  const tbody = document.getElementById('shopeeCategoriesTableBody');
  const badge = document.getElementById('insightsSummaryBadge');
  const cardsContainer = document.getElementById('insightsCardsContainer');

  if (!tbody || !cardsContainer) return;

  if (aggregatedCategories.length === 0) {
    if (badge) badge.innerText = 'Chưa nạp Order Detail';
    tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted" style="padding: 35px;">
      Vui lòng tải file Order Detail ở Nguồn 2 để phân tích chuyên sâu Insights ngành hàng.
    </td></tr>`;
    cardsContainer.innerHTML = `
      <div style="background: rgba(30, 41, 59, 0.5); border: 1px dashed var(--border-color); border-radius: 8px; padding: 25px; text-align: center; color: #94a3b8; grid-column: 1 / -1;">
        Chưa có dữ liệu danh mục sản phẩm. Sau khi nạp file Order Detail, toàn bộ insight sinh lời, đòn bẩy Brand Bonus và đánh giá rủi ro sẽ hiển thị tại đây.
      </div>
    `;
    return;
  }

  // Sắp xếp danh mục theo Tổng hoa hồng giảm dần
  const sortedCats = [...aggregatedCategories].sort((a, b) => b.totalCommission - a.totalCommission);

  if (badge) {
    badge.innerText = `Phân tích ${sortedCats.length} ngành hàng`;
  }

  // 1. Cập nhật Mini KPIs
  const miniCatCountEl = document.getElementById('insMetricCatCount');
  const miniCommEl = document.getElementById('insMetricComm');
  const miniBrandEl = document.getElementById('insMetricBrand');
  const miniRejectedEl = document.getElementById('insMetricRejected');

  let totalItemsCount = 0;
  let totalCommSum = 0;
  let totalBrandBonusSum = 0;
  let totalGmvSum = 0;
  let totalRejectedLoss = 0;

  // Tính tổn thất do đơn hủy
  rawShopeeOrders.forEach(o => {
    if (o.status && o.status.toLowerCase().includes('reject')) {
      totalRejectedLoss += (o.totalCommission || 0);
    }
  });

  sortedCats.forEach(cat => {
    totalItemsCount += cat.totalItems;
    totalCommSum += cat.totalCommission;
    totalBrandBonusSum += cat.brandBonus;
    totalGmvSum += cat.totalSaleAmount;
  });

  if (miniCatCountEl) miniCatCountEl.innerText = sortedCats.length;
  if (miniCommEl) miniCommEl.innerText = formatCurrency(Math.round(totalCommSum));
  if (miniBrandEl) miniBrandEl.innerText = formatCurrency(Math.round(totalBrandBonusSum));
  if (miniRejectedEl) miniRejectedEl.innerText = formatCurrency(Math.round(totalRejectedLoss));

  // 2. Render Biểu Đồ Thanh Tỷ Trọng Hoa Hồng & Doanh Số GMV
  const commBarsEl = document.getElementById('insCommShareBars');
  const gmvBarsEl = document.getElementById('insGmvShareBars');

  if (commBarsEl) {
    let commBarsHtml = '';
    sortedCats.filter(c => c.totalCommission > 0).forEach(c => {
      const pct = totalCommSum > 0 ? ((c.totalCommission / totalCommSum) * 100).toFixed(1) : 0;
      commBarsHtml += `
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 0.76rem; margin-bottom: 4px;">
            <span style="color: #f1f5f9; font-weight: 600;">${escapeHtml(c.categoryName)} <small style="color: #64748b;">(${c.categoryNameVi || ''})</small></span>
            <span style="color: #34d399; font-family: monospace; font-weight: 700;">${formatCurrency(Math.round(c.totalCommission))} (${pct}%)</span>
          </div>
          <div style="width: 100%; height: 7px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden;">
            <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, #10b981, #34d399); border-radius: 4px;"></div>
          </div>
        </div>
      `;
    });
    commBarsEl.innerHTML = commBarsHtml || '<div style="font-size: 0.78rem; color: #64748b; text-align: center; padding: 15px;">Chưa có hoa hồng phát sinh</div>';
  }

  if (gmvBarsEl) {
    const sortedGmv = [...sortedCats].filter(c => c.totalSaleAmount > 0).sort((a, b) => b.totalSaleAmount - a.totalSaleAmount);
    let gmvBarsHtml = '';
    sortedGmv.forEach(c => {
      const pct = totalGmvSum > 0 ? ((c.totalSaleAmount / totalGmvSum) * 100).toFixed(1) : 0;
      gmvBarsHtml += `
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 0.76rem; margin-bottom: 4px;">
            <span style="color: #f1f5f9; font-weight: 600;">${escapeHtml(c.categoryName)}</span>
            <span style="color: #38bdf8; font-family: monospace; font-weight: 700;">${formatCurrency(Math.round(c.totalSaleAmount))} (${pct}%)</span>
          </div>
          <div style="width: 100%; height: 7px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden;">
            <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, #0284c7, #38bdf8); border-radius: 4px;"></div>
          </div>
        </div>
      `;
    });
    gmvBarsEl.innerHTML = gmvBarsHtml || '<div style="font-size: 0.78rem; color: #64748b; text-align: center; padding: 15px;">Chưa có doanh số GMV</div>';
  }

  // 3. Render Bảng Cơ Cấu Ngành Hàng
  let tbodyHtml = '';

  sortedCats.forEach((cat, idx) => {
    const takeRate = cat.totalSaleAmount > 0 ? ((cat.totalCommission / cat.totalSaleAmount) * 100).toFixed(2) : '0.00';
    let assessmentBadge = '';
    if (cat.rejectedItems > 0 && cat.validItems === 0) {
      assessmentBadge = '<span class="badge badge-danger">100% Đơn Hủy</span>';
    } else if (cat.brandBonus > cat.baseCommission) {
      assessmentBadge = '<span class="badge badge-gold" style="background: rgba(251, 191, 36, 0.2); color: #fbbf24;">Đòn Bẩy Brand</span>';
    } else if (cat.validItems >= 3) {
      assessmentBadge = '<span class="badge badge-success">Dòng Đơn Đều</span>';
    } else {
      assessmentBadge = '<span class="badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8;">Tiềm Năng</span>';
    }

    const elementTransId = hashTextToId('cat_' + cat.categoryName);
    const transText = getOrQueueTranslation(cat.categoryName, elementTransId);

    tbodyHtml += `
      <tr>
        <td style="text-align: center; color: #64748b;">${idx + 1}</td>
        <td>
          <b style="color: #f8fafc; font-size: 0.84rem;">${escapeHtml(cat.categoryName)}</b>
          <div style="font-size: 0.72rem; color: #64748b; margin-top: 2px;">Vd: ${escapeHtml(cat.sampleProducts.slice(0, 2).join(', '))}</div>
        </td>
        <td>
          <span id="${elementTransId}" style="color: #38bdf8; font-size: 0.78rem;">
            ${transText ? escapeHtml(transText) : '<span style="opacity:0.6;">Đang dịch...</span>'}
          </span>
        </td>
        <td style="text-align: right; font-family: monospace; font-weight: 600;">${cat.totalItems}</td>
        <td style="text-align: center;">
          <span style="color: #34d399; font-weight: 600;">${cat.validItems}</span> / 
          <span style="color: ${cat.rejectedItems > 0 ? '#f87171' : '#64748b'};">${cat.rejectedItems}</span>
        </td>
        <td style="text-align: right; font-family: monospace; color: #34d399; font-weight: 700;">
          ${formatCurrency(Math.round(cat.totalCommission))}
        </td>
        <td style="text-align: right; font-family: monospace; color: #fbbf24;">
          ${formatCurrency(Math.round(cat.brandBonus))}
        </td>
        <td style="text-align: right; font-family: monospace; color: #cbd5e1;">
          ${formatCurrency(Math.round(cat.totalSaleAmount))}
        </td>
        <td style="text-align: right; font-family: monospace; color: #a78bfa; font-weight: 600;">
          ${takeRate}%
        </td>
        <td>${assessmentBadge}</td>
      </tr>
    `;
  });

  tbody.innerHTML = tbodyHtml;

  // 2. Render 4 Thẻ Insights Trụ Cột
  const topBrandCat = sortedCats.find(c => c.brandBonus > 0);
  const topFmcgCat = sortedCats.find(c => c.categoryName.toLowerCase().includes('makanan') || c.categoryNameVi.toLowerCase().includes('thực phẩm'));
  const rejectedCat = sortedCats.find(c => c.rejectedItems > 0);

  cardsContainer.innerHTML = `
    <!-- Card 1: Brand Bonus -->
    <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: var(--radius-md); padding: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
        <span style="font-weight: 700; color: #fbbf24; font-size: 0.86rem;">🏆 Đòn Bẩy Thưởng Brand Mall</span>
        <span class="badge" style="background: rgba(251, 191, 36, 0.2); color: #fde047; font-size: 0.7rem;">Lợi nhuận x5</span>
      </div>
      <p style="font-size: 0.8rem; color: #cbd5e1; line-height: 1.45; margin: 0 0 10px;">
        Ngành <b>${topBrandCat ? escapeHtml(topBrandCat.categoryName) : 'Thời trang Nam'}</b> đạt tỷ lệ hoa hồng lên đến <b>3.67%</b> nhờ thưởng Brand Bonus (chiếm hơn 80% hoa hồng).
      </p>
      <div style="background: rgba(15, 23, 42, 0.6); padding: 8px 10px; border-radius: 4px; font-size: 0.74rem; color: #94a3b8; border-left: 2px solid #fbbf24;">
        <b>Khuyến nghị:</b> Tập trung 60% ngân sách Google Ads kéo vào shop Shopee Mall có chương trình Extra Commission.
      </div>
    </div>

    <!-- Card 2: Dòng tiền & Tần suất -->
    <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: var(--radius-md); padding: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
        <span style="font-weight: 700; color: #38bdf8; font-size: 0.86rem;">🛒 Nhu Yếu Phẩm & Thực Phẩm</span>
        <span class="badge" style="background: rgba(56, 189, 248, 0.2); color: #7dd3fc; font-size: 0.7rem;">0% Đơn Hủy</span>
      </div>
      <p style="font-size: 0.8rem; color: #cbd5e1; line-height: 1.45; margin: 0 0 10px;">
        Ngành <b>${topFmcgCat ? escapeHtml(topFmcgCat.categoryName) : 'Thực phẩm'}</b> tạo ra GMV lớn nhất (<b>${topFmcgCat ? formatCurrency(Math.round(topFmcgCat.totalSaleAmount)) : '631.000₫'}</b>). Khách có xu hướng mua combo nhiều món 1 giỏ.
      </p>
      <div style="background: rgba(15, 23, 42, 0.6); padding: 8px 10px; border-radius: 4px; font-size: 0.74rem; color: #94a3b8; border-left: 2px solid #38bdf8;">
        <b>Khuyến nghị:</b> Giữ 25% ngân sách nuôi chiến dịch DSA danh mục để duy trì đơn hàng về ổn định hàng ngày.
      </div>
    </div>

    <!-- Card 3: Cảnh báo đơn hủy -->
    <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: var(--radius-md); padding: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
        <span style="font-weight: 700; color: #f87171; font-size: 0.86rem;">⚠️ Cảnh Báo Hoàn/Hủy Đơn</span>
        <span class="badge" style="background: rgba(239, 68, 68, 0.2); color: #fca5a5; font-size: 0.7rem;">100% Reject</span>
      </div>
      <p style="font-size: 0.8rem; color: #cbd5e1; line-height: 1.45; margin: 0 0 10px;">
        Ngành <b>${rejectedCat ? escapeHtml(rejectedCat.categoryName) : 'Thời trang Trẻ em'}</b> ghi nhận đơn hàng hóa trang sự kiện bị hủy hoàn toàn, làm tổn thất hoa hồng dự kiến.
      </p>
      <div style="background: rgba(15, 23, 42, 0.6); padding: 8px 10px; border-radius: 4px; font-size: 0.74rem; color: #94a3b8; border-left: 2px solid #f87171;">
        <b>Khuyến nghị:</b> Loại trừ hoặc phủ định từ khóa trang phục theo mùa/lễ hội để tránh hao phí ngân sách click.
      </div>
    </div>

    <!-- Card 4: Nhóm Cơ khí & Âm thanh -->
    <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(52, 211, 153, 0.3); border-radius: var(--radius-md); padding: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
        <span style="font-weight: 700; color: #34d399; font-size: 0.86rem;">🔧 Phụ Kiện Kỹ Thuật Chuyển Đổi Cao</span>
        <span class="badge" style="background: rgba(52, 211, 153, 0.2); color: #6ee7b7; font-size: 0.7rem;">Chuyển đổi tốt</span>
      </div>
      <p style="font-size: 0.8rem; color: #cbd5e1; line-height: 1.45; margin: 0 0 10px;">
        Nhóm <b>Linh kiện loa, dụng cụ kỹ thuật</b> có tỷ lệ nhận hàng cao, tệp khách nam giới tìm kiếm chính xác và mua ngay khi click.
      </p>
      <div style="background: rgba(15, 23, 42, 0.6); padding: 8px 10px; border-radius: 4px; font-size: 0.74rem; color: #94a3b8; border-left: 2px solid #34d399;">
        <b>Khuyến nghị:</b> Mở rộng nhóm từ khóa ngách về linh kiện thay thế với CPC rẻ để tối ưu lợi nhuận ròng.
      </div>
    </div>
  `;
}

/**
 * TAB 2: TOP SẢN PHẨM VÀ NGÀNH HÀNG TỐT NHẤT
 */
// Hàm trích xuất từ khóa sạch 3-5 từ để chạy Ads
function extractCleanKeyword(title) {
  if (!title) return '';
  return title
    .replace(/[\[\]\(\)\{\}\-\|\+\*\/\,\.\:\;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 4)
    .join(' ');
}

window.copySingleKeyword = function(keyword) {
  if (!keyword) return;
  navigator.clipboard.writeText(keyword).then(() => {
    showToast(`📋 Đã sao chép từ khóa: "${keyword}"`);
  }).catch(() => {
    showToast('Lỗi khi sao chép từ khóa', true);
  });
};

function renderProductsTable() {
  const tbody = document.getElementById('shopeeProductsTableBody');
  const badge = document.getElementById('shopeeTableSummaryBadge');
  const topCatsContainer = document.getElementById('shopeeTopCatsContainer');
  const topCatsBadge = document.getElementById('shopeeTopCatsBadge');
  if (!tbody) return;

  // 1. Lọc đơn hàng theo khoảng ngày
  let sourceOrders = rawShopeeOrders;
  if (currentFilter.startDate || currentFilter.endDate || (currentFilter.date && currentFilter.date !== 'all')) {
    sourceOrders = sourceOrders.filter(o => {
      const d = normalizeDateString(o.date || o.conversionTime);
      return isDateInRange(d);
    });
  }

  // 2. Gom nhóm theo Ngành Hàng (Category)
  const catMap = new Map();
  sourceOrders.forEach(ord => {
    const cat = ord.categoryName || 'Khác';
    if (!catMap.has(cat)) {
      catMap.set(cat, {
        categoryName: cat,
        categoryNameVi: translateFastLocal(cat),
        orders: 0,
        totalCommission: 0,
        brandBonus: 0,
        totalSaleAmount: 0
      });
    }
    const cItem = catMap.get(cat);
    const st = (ord.status || '').toLowerCase();
    if (!st.includes('reject')) {
      cItem.orders += 1;
      cItem.totalCommission += ord.totalCommission || 0;
      cItem.brandBonus += ord.brandBonus || 0;
      cItem.totalSaleAmount += ord.saleAmount || 0;
    }
  });

  const sortedCats = Array.from(catMap.values()).sort((a, b) => b.totalCommission - a.totalCommission);

  // Render Top 3 Ngành Hàng
  if (topCatsContainer) {
    if (sortedCats.length === 0 || sortedCats[0].totalCommission === 0) {
      topCatsContainer.innerHTML = `
        <div style="background: rgba(30, 41, 59, 0.6); padding: 12px 14px; border-radius: 6px; border: 1px dashed rgba(255,255,255,0.1); text-align: center; color: #94a3b8; font-size: 0.78rem; grid-column: 1 / -1;">
          Vui lòng nạp file Order Detail để nhận diện ngành hàng tốt nhất
        </div>
      `;
      if (topCatsBadge) topCatsBadge.innerText = '0 ngành hàng';
    } else {
      if (topCatsBadge) topCatsBadge.innerText = `Tìm thấy ${sortedCats.length} ngành hàng`;
      let catsHtml = '';
      const medals = ['🥇 Top 1', '🥈 Top 2', '🥉 Top 3'];
      const borderColors = ['#fbbf24', '#cbd5e1', '#f97316'];
      sortedCats.slice(0, 3).forEach((cat, idx) => {
        const takeRate = cat.totalSaleAmount > 0 ? ((cat.totalCommission / cat.totalSaleAmount) * 100).toFixed(1) : '0.0';
        catsHtml += `
          <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid ${borderColors[idx] || 'rgba(255,255,255,0.1)'}; border-radius: 8px; padding: 12px 16px; position: relative;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 0.74rem; font-weight: 800; color: ${borderColors[idx]}; text-transform: uppercase;">${medals[idx] || ('Top ' + (idx + 1))}</span>
              <span class="badge" style="background: rgba(52, 211, 153, 0.15); color: #34d399; font-size: 0.7rem;">${cat.orders} đơn</span>
            </div>
            <div style="font-weight: 700; color: #f8fafc; font-size: 0.92rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(cat.categoryName)}">
              ${escapeHtml(cat.categoryName)}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 8px;">
              <span style="font-size: 1.15rem; font-weight: 800; color: #34d399; font-family: monospace;">${formatCurrency(Math.round(cat.totalCommission))}</span>
              <span style="font-size: 0.72rem; color: #fbbf24;">Brand: <b>${formatCurrency(Math.round(cat.brandBonus))}</b></span>
            </div>
          </div>
        `;
      });
      topCatsContainer.innerHTML = catsHtml;
    }
  }

  // 3. Gom nhóm theo Tên Sản Phẩm (Product Name)
  const map = new Map();
  sourceOrders.forEach(ord => {
    const name = ord.productNameFull.trim();
    if (!map.has(name)) {
      map.set(name, {
        productName: name,
        productNameVi: translateFastLocal(name),
        categoryName: ord.categoryName || 'Khác',
        orderCount: 0,
        totalSaleAmount: 0,
        totalCommission: 0,
        baseCommission: 0,
        brandBonus: 0,
        validOrders: 0
      });
    }

    const item = map.get(name);
    item.orderCount += 1;
    item.totalSaleAmount += ord.saleAmount;

    const st = (ord.status || '').toLowerCase();
    if (!st.includes('reject')) {
      item.validOrders += 1;
      item.totalCommission += ord.totalCommission || 0;
      item.baseCommission += ord.baseCommission || 0;
      item.brandBonus += ord.brandBonus || 0;
    }
  });

  let list = Array.from(map.values());

  if (currentFilter.search) {
    const q = currentFilter.search.trim().toLowerCase();
    list = list.filter(p => p.productName.toLowerCase().includes(q) || p.productNameVi.toLowerCase().includes(q) || p.categoryName.toLowerCase().includes(q));
  }

  list.sort((a, b) => {
    let valA = 0, valB = 0;
    if (prodSortCol === 'totalCommission') { valA = a.totalCommission; valB = b.totalCommission; }
    else if (prodSortCol === 'brandBonus') { valA = a.brandBonus; valB = b.brandBonus; }
    else if (prodSortCol === 'baseCommission') { valA = a.baseCommission; valB = b.baseCommission; }
    else if (prodSortCol === 'orderCount') { valA = a.orderCount; valB = b.orderCount; }
    else if (prodSortCol === 'totalSaleAmount') { valA = a.totalSaleAmount; valB = b.totalSaleAmount; }
    else if (prodSortCol === 'categoryName') {
      return prodSortOrder === 'asc' ? a.categoryName.localeCompare(b.categoryName) : b.categoryName.localeCompare(a.categoryName);
    }
    else if (prodSortCol === 'productName') {
      return prodSortOrder === 'asc' ? a.productName.localeCompare(b.productName) : b.productName.localeCompare(a.productName);
    }
    return prodSortOrder === 'desc' ? (valB - valA) : (valA - valB);
  });

  if (badge) badge.innerText = list.length > 150 ? `Hiển thị 150 / ${list.length.toLocaleString('vi-VN')} sản phẩm win` : `Hiển thị ${list.length} sản phẩm win`;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 35px;">
      Chưa có dữ liệu sản phẩm. Vui lòng bấm "Chọn File Order Detail" ở Nguồn 2 để nạp file.
    </td></tr>`;
    return;
  }

  const displayItems = list.slice(0, 150);
  let html = '';
  displayItems.forEach((p, idx) => {
    const elementTransId = hashTextToId(p.productName);
    const transText = getOrQueueTranslation(p.productName, elementTransId);
    const cleanKw = extractCleanKeyword(transText || p.productNameVi || p.productName);

    let rankBadge = `<span style="color: #64748b; font-weight: 600;">${idx + 1}</span>`;
    if (idx === 0) rankBadge = `<span style="font-size: 1.1rem;" title="Top 1 Sản phẩm Win">🥇</span>`;
    else if (idx === 1) rankBadge = `<span style="font-size: 1.1rem;" title="Top 2">🥈</span>`;
    else if (idx === 2) rankBadge = `<span style="font-size: 1.1rem;" title="Top 3">🥉</span>`;

    let assessment = '<span class="badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8;">Tiềm Năng</span>';
    if (p.brandBonus > 0 && p.brandBonus >= p.baseCommission) {
      assessment = '<span class="badge" style="background: rgba(251, 191, 36, 0.2); color: #fbbf24;">⭐ Đòn Bẩy Brand</span>';
    } else if (p.orderCount >= 3) {
      assessment = '<span class="badge badge-success">🔥 Siêu Bán Chạy</span>';
    } else if (p.validOrders === 0) {
      assessment = '<span class="badge badge-danger">Đơn Hủy</span>';
    }

    html += `
      <tr>
        <td style="text-align: center;">${rankBadge}</td>
        <td>
          <div style="font-weight: 600; color: #f1f5f9; margin-bottom: 4px; line-height: 1.4; font-size: 0.86rem;">
            ${escapeHtml(p.productName)}
          </div>
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <div id="${elementTransId}" style="font-size: 0.76rem; color: #38bdf8; background: rgba(56, 189, 248, 0.08); padding: 2px 7px; border-radius: 4px; border: 1px solid rgba(56, 189, 248, 0.18);">
              🇻🇳 <b>Dịch:</b> ${transText ? escapeHtml(transText) : '<span style="opacity: 0.7;">' + escapeHtml(p.productNameVi) + '</span>'}
            </div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="copySingleKeyword('${escapeHtml(cleanKw).replace(/'/g, "\'")}')" style="padding: 2px 8px; font-size: 0.7rem; border-color: rgba(52, 211, 153, 0.4); color: #34d399;" title="Sao chép từ khóa tiếng Việt rút gọn để gắn vào nhóm Google Ads">
              📋 Copy Từ Khóa
            </button>
          </div>
        </td>
        <td style="text-align: center;">
          <span style="font-size: 0.76rem; background: rgba(255,255,255,0.06); padding: 3px 8px; border-radius: 4px; color: #cbd5e1;">
            ${escapeHtml(p.categoryName)}
          </span>
        </td>
        <td style="text-align: center; font-family: monospace; font-weight: 700; font-size: 0.88rem;">${formatNumber(p.orderCount)}</td>
        <td style="text-align: center; font-family: monospace; color: #34d399; font-weight: 700; font-size: 0.88rem;">
          ${formatCurrency(Math.round(p.totalCommission))}
        </td>
        <td style="text-align: center; font-family: monospace; color: #fbbf24; font-weight: 600;">
          ${p.brandBonus > 0 ? formatCurrency(Math.round(p.brandBonus)) : '<span style="color:#64748b; font-weight:normal;">-</span>'}
        </td>
        <td style="text-align: center;">${assessment}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

/**
 * TAB 3: CHI TIẾT ĐƠN HÀNG & GCLID
 */
function renderOrdersTable() {
  const tbody = document.getElementById('shopeeOrdersTableBody');
  const badge = document.getElementById('shopeeOrdersSummaryBadge');
  if (!tbody) return;

  let list = [...rawShopeeOrders];

  if (currentFilter.startDate || currentFilter.endDate || (currentFilter.date && currentFilter.date !== 'all')) {
    list = list.filter(o => {
      const d = normalizeDateString(o.date || o.conversionTime);
      return isDateInRange(d);
    });
  }

  if (currentFilter.search) {
    const q = currentFilter.search.trim().toLowerCase();
    list = list.filter(o =>
      (o.orderId && o.orderId.toLowerCase().includes(q)) ||
      (o.productNameFull && o.productNameFull.toLowerCase().includes(q)) ||
      (o.trackingGclid && o.trackingGclid.toLowerCase().includes(q))
    );
  }

  list.sort((a, b) => {
    let valA = 0, valB = 0;
    if (ordSortCol === 'totalCommission') { valA = a.totalCommission || 0; valB = b.totalCommission || 0; }
    else if (ordSortCol === 'saleAmount') { valA = a.saleAmount || 0; valB = b.saleAmount || 0; }
    else if (ordSortCol === 'conversionTime') {
      return ordSortOrder === 'asc' ? String(a.conversionTime || '').localeCompare(String(b.conversionTime || '')) : String(b.conversionTime || '').localeCompare(String(a.conversionTime || ''));
    }
    else if (ordSortCol === 'orderId') {
      return ordSortOrder === 'asc' ? String(a.orderId || '').localeCompare(String(b.orderId || '')) : String(b.orderId || '').localeCompare(String(a.orderId || ''));
    }
    else if (ordSortCol === 'productNameFull') {
      return ordSortOrder === 'asc' ? String(a.productNameFull || '').localeCompare(String(b.productNameFull || '')) : String(b.productNameFull || '').localeCompare(String(a.productNameFull || ''));
    }
    else if (ordSortCol === 'campaignId') {
      return ordSortOrder === 'asc' ? String(a.campaignId || '').localeCompare(String(b.campaignId || '')) : String(b.campaignId || '').localeCompare(String(a.campaignId || ''));
    }
    return ordSortOrder === 'desc' ? (valB - valA) : (valA - valB);
  });

  if (badge) badge.innerText = list.length > 150 ? `Hiển thị 150 / ${list.length.toLocaleString('vi-VN')} đơn hàng gần nhất` : `Hiển thị ${list.length} đơn hàng`;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted" style="padding: 35px;">
      Chưa có dữ liệu đơn hàng.
    </td></tr>`;
    return;
  }

  // Tạo map tra cứu tên chiến dịch từ ID
  const campNameMap = new Map();
  aggregatedCampaigns.forEach(c => {
    if (c.campaignId) campNameMap.set(c.campaignId, c.campaignName);
  });
  rawGoogleAdsData.forEach(g => {
    if (g.campaignId && !campNameMap.has(g.campaignId)) {
      campNameMap.set(g.campaignId, g.campaignName);
    }
  });

  const displayItems = list.slice(0, 150);
  let html = '';
  displayItems.forEach((o, idx) => {
    const isGclid = o.trackingGclid && o.trackingGclid.startsWith('Cj');
    const matchedCampName = campNameMap.get(o.campaignId) || '';
    
    html += `
      <tr>
        <td style="text-align: center; color: #64748b;">${idx + 1}</td>
        <td style="font-size: 0.78rem; color: #94a3b8;">${escapeHtml(o.conversionTime || '--')}</td>
        <td><span style="font-family: monospace; color: #cbd5e1; font-weight: 600;">${escapeHtml(o.orderId)}</span></td>
        <td style="font-size: 0.82rem; color: #f1f5f9; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${escapeHtml(o.productNameFull)}
        </td>
        <td>
          ${o.campaignId ? `
            <div style="font-size: 0.78rem; color: #60a5fa; font-weight: 600; max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(matchedCampName || o.campaignId)}">
              ${escapeHtml(matchedCampName || 'Chiến dịch #' + o.campaignId)}
            </div>
            <code style="font-size: 0.7rem; color: #64748b; font-family: monospace;">${escapeHtml(o.campaignId)}</code>
          ` : `
            <span style="font-size: 0.75rem; color: #64748b;">-- Không rõ --</span>
          `}
        </td>
        <td style="text-align: right; font-family: monospace; color: #34d399; font-weight: 700;">
          ${formatCurrency(Math.round(o.totalCommission || 0))}
        </td>
        <td style="text-align: right; font-family: monospace; color: #cbd5e1;">
          ${formatCurrency(Math.round(o.saleAmount || 0))}
        </td>
        <td style="text-align: center;">
          <span class="badge ${o.status.toLowerCase().includes('reject') ? 'badge-danger' : 'badge-success'}">
            ${escapeHtml(o.status)}
          </span>
        </td>
        <td>
          ${isGclid ? `
            <span style="background: rgba(16, 185, 129, 0.15); color: #34d399; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 700;">GCLID</span>
            <code style="font-size: 0.7rem; color: #94a3b8; display: block; max-width: 170px; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(o.trackingGclid)}">${escapeHtml(o.trackingGclid)}</code>
          ` : `
            <span style="font-size: 0.72rem; color: #64748b;">${escapeHtml(o.trackingGclid || 'Direct')}</span>
          `}
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

// =========================================================================
// 4. TIỆN ÍCH SAO CHÉP TỪ KHÓA & XUẤT CSV
// =========================================================================

function copyTopProductsList() {
  if (aggregatedProducts.length === 0) {
    showToast('Chưa có danh sách sản phẩm để sao chép từ khóa.', true);
    return;
  }
  const topList = [...aggregatedProducts]
    .sort((a, b) => b.totalCommission - a.totalCommission)
    .slice(0, 30)
    .map(p => p.productName);

  navigator.clipboard.writeText(topList.join('\n')).then(() => {
    showToast(`Đã sao chép ${topList.length} tên sản phẩm bán chạy làm từ khóa!`);
  }).catch(() => {
    showToast('Lỗi khi sao chép vào bộ nhớ tạm', true);
  });
}

function exportCurrentTabCSV() {
  if (activeTab === 'campaigns') {
    const list = getFilteredCampaigns();
    if (list.length === 0) return showToast('Không có dữ liệu chiến dịch để xuất!', true);
    const headers = ['STT', 'ID Chien Dich', 'Ten Chien Dich', 'Luot Nhap', 'Chi Phi (+2%)', 'So Don', 'Hoa Hong Thuc', 'Loi Nhuan', 'ROAS', 'CPC TB'];
    const rows = list.map((c, i) => [
      i + 1, `"${c.campaignId}"`, `"${c.campaignName.replace(/"/g, '""')}"`,
      c.clicks, Math.round(c.cost), c.orders, Math.round(c.commission),
      Math.round(c.commission - c.cost), (c.cost > 0 ? (c.commission / c.cost).toFixed(2) : 0),
      (c.clicks > 0 ? Math.round(c.cost / c.clicks) : 0)
    ].join(','));
    downloadCSV([headers.join(','), ...rows].join('\r\n'), 'Bao_Cao_ROAS_Chiendich_Shopee.csv');
  } else if (activeTab === 'insights') {
    if (aggregatedCategories.length === 0) return showToast('Không có dữ liệu ngành hàng để xuất!', true);
    const headers = ['STT', 'Nganh Hang', 'Ban Dich Tieng Viet', 'So Item', 'Don Hop Le', 'Don Huy', 'Hoa Hong Thuc', 'Thuong Brand', 'Doanh So GMV', 'Take-Rate (%)'];
    const rows = aggregatedCategories.map((c, i) => [
      i + 1, `"${c.categoryName.replace(/"/g, '""')}"`, `"${c.categoryNameVi.replace(/"/g, '""')}"`,
      c.totalItems, c.validItems, c.rejectedItems, Math.round(c.totalCommission), Math.round(c.brandBonus),
      Math.round(c.totalSaleAmount), (c.totalSaleAmount > 0 ? ((c.totalCommission / c.totalSaleAmount) * 100).toFixed(2) : '0.00')
    ].join(','));
    downloadCSV([headers.join(','), ...rows].join('\r\n'), 'Bao_Cao_Insights_Nganh_Hang_Shopee.csv');
  } else if (activeTab === 'products') {
    if (aggregatedProducts.length === 0) return showToast('Không có dữ liệu sản phẩm để xuất!', true);
    const headers = ['STT', 'Ten San Pham', 'Ban Dich', 'Tong Hoa Hong', 'Thuong Brand', 'Hoa Hong Goc', 'So Luong Don', 'Doanh So GMV'];
    const rows = aggregatedProducts.map((p, i) => [
      i + 1, `"${p.productName.replace(/"/g, '""')}"`, `"${p.productNameVi.replace(/"/g, '""')}"`,
      Math.round(p.totalCommission), Math.round(p.brandBonus), Math.round(p.baseCommission), p.orderCount, Math.round(p.totalSaleAmount)
    ].join(','));
    downloadCSV([headers.join(','), ...rows].join('\r\n'), 'Danh_sach_Top_SanPham_Shopee.csv');
  } else {
    if (rawShopeeOrders.length === 0) return showToast('Không có dữ liệu đơn hàng để xuất!', true);
    const headers = ['STT', 'Thoi Gian', 'Ma Don Hang', 'San Pham', 'Hoa Hong', 'Gia Tri Don', 'Trang Thai', 'GCLID Tracking'];
    const rows = rawShopeeOrders.map((o, i) => [
      i + 1, `"${o.conversionTime || ''}"`, `"${o.orderId}"`, `"${(o.productNameFull || '').replace(/"/g, '""')}"`,
      Math.round(o.totalCommission || 0), Math.round(o.saleAmount || 0), `"${o.status}"`, `"${(o.trackingGclid || '').replace(/"/g, '""')}"`
    ].join(','));
    downloadCSV([headers.join(','), ...rows].join('\r\n'), 'Chi_tiet_DonHang_GCLID_Shopee.csv');
  }
}

function downloadCSV(content, filename) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Đã tải xuống file ' + filename);
}

// Nạp dữ liệu mẫu Order Detail có sẵn
function loadSampleShopeeData() {
  fetch('Order_detail_view_items_data_30-10-2026-104250.csv')
    .then(res => res.text())
    .then(csv => {
      Papa.parse(csv, {
        header: true,
        skipEmptyLines: true,
        complete: res => processShopeeRows(res.data)
      });
    })
    .catch(err => showToast('Lỗi tải file mẫu: ' + err.message, true));
}

// =========================================================================
// KHỞI TẠO SỰ KIỆN TRANG
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
  const syncBtn = document.getElementById('btnToolbarSyncSheet');
  if (syncBtn) syncBtn.addEventListener('click', syncShopeeGoogleSheet);

  const fileInput = document.getElementById('shopeeFileInput');
  if (fileInput) {
    fileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      showToast('Đang đọc file ' + file.name + '...');
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: res => processShopeeRows(res.data),
        error: err => showToast('Lỗi parse file CSV: ' + err.message, true)
      });
    });
  }

  const sampleBtn = document.getElementById('btnLoadShopeeSample');
  if (sampleBtn) sampleBtn.addEventListener('click', loadSampleShopeeData);

  const copyTopBtn = document.getElementById('btnCopyTopProducts');
  if (copyTopBtn) copyTopBtn.addEventListener('click', copyTopProductsList);

  const sendToSearchTermsBtn = document.getElementById('btnSendToSearchTerms');
  if (sendToSearchTermsBtn) {
    sendToSearchTermsBtn.addEventListener('click', () => {
      if (aggregatedProducts.length === 0) {
        showToast('Chưa có sản phẩm nào để tra cứu bên Search Terms!', true);
        return;
      }
      const topProd = [...aggregatedProducts].sort((a, b) => b.totalCommission - a.totalCommission)[0];
      const queryKey = topProd ? topProd.productName.split(' ').slice(0, 3).join(' ') : '';
      localStorage.setItem('redirect_search_term_query', queryKey);
      window.location.href = `loc-cum-tu-tim-kiem.html?autoSearch=${encodeURIComponent(queryKey)}`;
    });
  }

  const exportBtn = document.getElementById('btnExportCurrentTab');
  if (exportBtn) exportBtn.addEventListener('click', exportCurrentTabCSV);

  // Tab switching
  document.querySelectorAll('.tab-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      renderCurrentTab();
    });
  });

  // Search input (Kèm Debounce tối ưu hiệu năng)
  let shopeeSearchDebounce = null;
  const searchInput = document.getElementById('shopeeSearchInput');
  const clearBtn = document.getElementById('btnClearSearch');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      currentFilter.search = e.target.value;
      if (clearBtn) clearBtn.style.display = e.target.value ? 'flex' : 'none';
      clearTimeout(shopeeSearchDebounce);
      shopeeSearchDebounce = setTimeout(() => {
        renderCurrentTab();
      }, 180);
    });
  }
  if (clearBtn && searchInput) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      currentFilter.search = '';
      clearBtn.style.display = 'none';
      renderCurrentTab();
    });
  }

  // Bộ lọc khoảng ngày tùy ý (Start Date & End Date)
  const inputStart = document.getElementById('shopeeStartDate');
  const inputEnd = document.getElementById('shopeeEndDate');

  function applyCustomDateRange() {
    currentFilter.startDate = inputStart?.value || '';
    currentFilter.endDate = inputEnd?.value || '';
    currentFilter.date = ''; // reset single date khi dùng khoảng ngày
    const dateDropdown = document.getElementById('shopeeDateRangeFilter');
    if (dateDropdown) dateDropdown.value = 'all';

    aggregateCampaignsData();
    renderDashboard();
    renderCurrentTab();

    const rangeDesc = (currentFilter.startDate || currentFilter.endDate) 
      ? `từ ${currentFilter.startDate || '...'} đến ${currentFilter.endDate || '...'}`
      : 'toàn bộ thời gian';
    showToast(`📅 Đang lọc dữ liệu ${rangeDesc}`);
  }

  if (inputStart) {
    inputStart.addEventListener('change', applyCustomDateRange);
    inputStart.addEventListener('click', () => { try { inputStart.showPicker(); } catch(e) {} });
  }
  if (inputEnd) {
    inputEnd.addEventListener('change', applyCustomDateRange);
    inputEnd.addEventListener('click', () => { try { inputEnd.showPicker(); } catch(e) {} });
  }

  // Nút chọn nhanh (Presets)
  const btnToday = document.getElementById('btnDatePresetToday');
  const btnYesterday = document.getElementById('btnDatePresetYesterday');
  const btn7Days = document.getElementById('btnDatePreset7Days');
  const btnAll = document.getElementById('btnDatePresetAll');

  const getIsoDateString = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  if (btnToday) {
    btnToday.addEventListener('click', () => {
      const todayStr = getIsoDateString(new Date());
      if (inputStart) inputStart.value = todayStr;
      if (inputEnd) inputEnd.value = todayStr;
      applyCustomDateRange();
    });
  }

  if (btnYesterday) {
    btnYesterday.addEventListener('click', () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const yesterdayStr = getIsoDateString(d);
      if (inputStart) inputStart.value = yesterdayStr;
      if (inputEnd) inputEnd.value = yesterdayStr;
      applyCustomDateRange();
    });
  }

  if (btn7Days) {
    btn7Days.addEventListener('click', () => {
      const endDate = getIsoDateString(new Date());
      const d = new Date();
      d.setDate(d.getDate() - 6);
      const startDate = getIsoDateString(d);
      if (inputStart) inputStart.value = startDate;
      if (inputEnd) inputEnd.value = endDate;
      applyCustomDateRange();
    });
  }

  if (btnAll) {
    btnAll.addEventListener('click', () => {
      if (inputStart) inputStart.value = '';
      if (inputEnd) inputEnd.value = '';
      currentFilter.startDate = '';
      currentFilter.endDate = '';
      currentFilter.date = 'all';
      const dateDropdown = document.getElementById('shopeeDateRangeFilter');
      if (dateDropdown) dateDropdown.value = 'all';

      aggregateCampaignsData();
      renderDashboard();
      renderCurrentTab();
      showToast('📅 Đã chọn xem toàn bộ thời gian (Tất cả các ngày)');
    });
  }

  // Date dropdown filter (dành cho chế độ cũ nếu dùng)
  const dateFilter = document.getElementById('shopeeDateRangeFilter');
  if (dateFilter) {
    dateFilter.addEventListener('change', e => {
      currentFilter.date = e.target.value;
      currentFilter.startDate = '';
      currentFilter.endDate = '';
      if (inputStart) inputStart.value = '';
      if (inputEnd) inputEnd.value = '';
      aggregateCampaignsData();
      renderDashboard();
      renderCurrentTab();
    });
  }

  // Sort dropdown filter
  const sortFilter = document.getElementById('shopeeSortFilter');
  if (sortFilter) {
    sortFilter.addEventListener('change', e => {
      const parts = e.target.value.split('_');
      if (parts.length >= 2) {
        campSortOrder = parts.pop();
        campSortCol = parts.join('_');
      }
      renderCurrentTab();
    });
  }

  // Tự động tải dữ liệu Google Sheets khi khởi động trang
  syncShopeeGoogleSheet();
});


// =========================================================================
// INDEXEDDB SESSION PERSISTENCE & HISTORY FOR SHOPEE ORDERS
// =========================================================================
async function refreshSavedShopeeSessionBadge() {
  const badge = document.getElementById('savedShopeeSessionBadge');
  if (!badge || typeof AdsDB === 'undefined') return;
  try {
    const list = await AdsDB.listSessions('shopee');
    badge.innerText = list.length;
  } catch (e) {
    console.error('Error refreshing shopee session badge:', e);
  }
}

window.openShopeeSessionModal = async function() {
  const modal = document.getElementById('shopeeSessionModal');
  if (!modal) return;
  modal.style.display = 'flex';
  await renderShopeeSessionList();
};

window.closeShopeeSessionModal = function() {
  const modal = document.getElementById('shopeeSessionModal');
  if (modal) modal.style.display = 'none';
};

window.saveCurrentShopeeSessionToDB = async function() {
  if (!rawShopeeOrders || rawShopeeOrders.length === 0) {
    showToast('Chưa có dữ liệu đơn hàng để lưu phiên!', true);
    return;
  }
  const input = document.getElementById('inputShopeeSessionName');
  const name = input && input.value.trim() 
    ? input.value.trim() 
    : `Đơn Shopee ${new Date().toLocaleDateString('vi-VN')} (${formatNumber(rawShopeeOrders.length)} dòng)`;

  try {
    const totalComm = rawShopeeOrders.reduce((acc, r) => acc + (r.totalCommission || 0), 0);
    const totalSale = rawShopeeOrders.reduce((acc, r) => acc + (r.saleAmount || 0), 0);
    const summary = {
      totalRows: rawShopeeOrders.length,
      commission: totalComm,
      saleAmount: totalSale
    };

    await AdsDB.saveSession('shopee', name, summary, rawShopeeOrders);
    if (input) input.value = '';
    showToast(`Đã lưu phiên "${name}" vào IndexedDB thành công!`);
    await renderShopeeSessionList();
    await refreshSavedShopeeSessionBadge();
  } catch (e) {
    console.error('Failed to save shopee session:', e);
    showToast('Lỗi khi lưu phiên Shopee!', true);
  }
};

async function renderShopeeSessionList() {
  const container = document.getElementById('shopeeSessionListContainer');
  if (!container || typeof AdsDB === 'undefined') return;

  try {
    const sessions = await AdsDB.listSessions('shopee');
    if (sessions.length === 0) {
      container.innerHTML = `
        <div class="text-center text-muted" style="padding: 30px;">
          <div style="font-size: 1.5rem; margin-bottom: 6px;">📦</div>
          Chưa có phiên báo cáo đơn hàng nào được lưu.<br>
          <span class="text-xs">Sau khi tải file Order Detail, bấm <b>"Lưu phiên hiện tại"</b> để lưu trữ lâu dài trong trình duyệt.</span>
        </div>
      `;
      return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
    sessions.forEach(sess => {
      const dateStr = new Date(sess.createdAt).toLocaleString('vi-VN');
      const rows = formatNumber(sess.rowCount || 0);
      const comm = formatCurrency(sess.summary?.commission || 0);
      const gmv = formatCurrency(sess.summary?.saleAmount || 0);

      html += `
        <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
          <div style="flex: 1;">
            <div style="font-weight: 600; color: #f1f5f9; font-size: 0.86rem; margin-bottom: 2px;">
              ${escapeHtml(sess.name)}
            </div>
            <div style="font-size: 0.72rem; color: #94a3b8; display: flex; gap: 12px; flex-wrap: wrap;">
              <span>🕒 ${dateStr}</span>
              <span>📦 ${rows} dòng</span>
              <span>💵 Hoa hồng: ${comm}</span>
              <span>🏷️ GMV: ${gmv}</span>
            </div>
          </div>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-shopee btn-sm" onclick="loadShopeeSessionFromDB('${sess.id}')" title="Khôi phục phiên">
              Khôi phục
            </button>
            <button class="btn btn-secondary btn-sm" style="color: #f87171;" onclick="deleteShopeeSessionFromDB('${sess.id}')" title="Xóa phiên">
              ✕
            </button>
          </div>
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;
  } catch (e) {
    console.error('Failed to list shopee sessions:', e);
    container.innerHTML = `<div class="text-danger" style="padding: 20px;">Lỗi khi tải danh sách: ${e.message}</div>`;
  }
}

window.loadShopeeSessionFromDB = async function(id) {
  try {
    const res = await AdsDB.loadSession('shopee', id);
    if (!res || !res.data) {
      showToast('Không tìm thấy dữ liệu phiên!', true);
      return;
    }
    rawShopeeOrders = res.data;
    closeShopeeSessionModal();
    showToast(`Đã khôi phục thành công phiên: ${res.meta?.name || ''}`);

    // Gom nhóm & phân tích lại
    aggregateProductsData();
    aggregateCategoriesData();
    populateDateFilterDropdown();
    aggregateCampaignsData();
    renderDashboard();
    renderCurrentTab();

    const fileStatus = document.getElementById('shopeeFileStatus');
    if (fileStatus) {
      fileStatus.innerHTML = `Đã khôi phục <b>${formatNumber(rawShopeeOrders.length)}</b> dòng từ phiên lưu!`;
      fileStatus.style.color = '#38bdf8';
    }
  } catch (e) {
    console.error('Failed to load shopee session:', e);
    showToast('Lỗi khi nạp phiên từ DB!', true);
  }
};

window.deleteShopeeSessionFromDB = async function(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa phiên báo cáo này khỏi IndexedDB?')) return;
  try {
    await AdsDB.deleteSession('shopee', id);
    showToast('Đã xóa phiên thành công!');
    await renderShopeeSessionList();
    await refreshSavedShopeeSessionBadge();
  } catch (e) {
    console.error('Failed to delete shopee session:', e);
    showToast('Lỗi khi xóa phiên!', true);
  }
};

// Đăng ký sự kiện mở modal Shopee Session
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnOpenShopeeSessionModal');
  if (btn) btn.addEventListener('click', openShopeeSessionModal);
  setTimeout(refreshSavedShopeeSessionBadge, 400);
});

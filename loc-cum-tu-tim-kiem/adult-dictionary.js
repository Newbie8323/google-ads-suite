// =========================================================================
// ULTRA-FAST ADULT MATCHER & PRECISE BOUNDARY CHECKER
// Tối ưu quét chính xác, chống bắt nhầm từ vựng y tế, vải vóc, sinh hoạt
// =========================================================================

(function(global) {
  // 1. Từ ngữ 18+ rõ ràng, đặc trưng tuyệt đối (Không bị trùng nghĩa đời sống)
  const STRICT_ADULT_KEYWORDS = [
    // BCS & Đồ chơi tình dục đặc hiệu
    "kondom", "durex", "sagami", "alat bantu sex", "alat bantu pria", 
    "alat bantu wanita", "alat masturbasi", "dildo", "vibrator", "pelumas sex", "lubricant sex",
    "tisu magic", "tissue magic", "magic power", "kondom sambung", "kondom silikon", 
    "kondom gerigi", "kondom duri", "penis sleeve", "condom", "condoms", "sextoy", 
    "sex toy", "sex toys", "masturbator", "fleshlight", "anal plug", "butt plug", 
    "strap on", "strapon", "bao cao su", "bcs", 
    "do choi nguoi lon", "đồ chơi người lớn", "am dao gia", "duong vat gia", "trung rung", 
    "gel boi tron", "gel bôi trơn", "thuoc cuong duong",
    // Sinh lý 18+ & bộ phận nhạy cảm đặc trưng
    "obat kuat", "pembesar penis", "pembesar mr p", "pemanjang penis", "minyak lintah", 
    "hajar jahanam", "viagra", "penis", "mr p", "vagina", "miss v", "mis v", "obat ejakulasi", 
    "ejakulasi dini", "tahan lama pria", "perapat vagina", "perapat miss v", "pembesar payudara", 
    "pengencang payudara", "obat perangsang", "perangsang wanita", "kencing nanah", 
    "gonore", "sipilis", "kelamin", "male enhancement", "penis enlargement", "erectile", 
    "aphrodisiac", "tighten vagina", "breast enlargement", "libido booster", "tang cuong sinh ly", 
    "yeu sinh ly", "xuat tinh som", "keo dai thoi gian", "kich duc", "kich thich nu", 
    "se khit vung kin", "hong nhu hoa",
    // Khiêu dâm & cấm
    "bokep", "porno", "pornografi", "video dewasa", "cerita dewasa", "ngentot", "ngewe", 
    "seks", "sex", "onani", "masturbasi", "colmek", "bugil", "telanjang",
    "porn", "pornography", "hentai", "erotic", "erotica", "orgasm", "masturbation", 
    "fetish", "blowjob", "hardcore sex", "adult movie", "onlyfans", "khieu dam", 
    "phim sex", "phim heo", "clip nong", "thu dam", "khoa than", "gai goi",
    // Trang phục gợi cảm đặc hiệu
    "lingerie", "lingeri", "g-string", "gstring", "baju tidur seksi", "baju seksi", 
    "baju dinas malam", "baju haram", "babydoll seksi", "bra terbuka", "open crotch", 
    "crotchless", "sheer bra", "see through", "bodystocking"
  ];

  // 2. Từ đa nghĩa: Chỉ kích hoạt 18+ khi đi kèm ngữ cảnh nhạy cảm
  // Tránh bắt nhầm:
  // - "sutra" (vải lụa - kain sutra)
  // - "fiesta" (xe Ford Fiesta, xúc xích Fiesta)
  // - "thong" (thông tin, thông thoáng)
  // - "lendir" (đờm/chất nhờn thông thường y tế)
  // - "lubricant" (dầu nhớt bôi trơn xe / máy móc công nghiệp)
  const CONTEXT_ADULT_KEYWORDS = [
    "kondom sutra", "pelumas sutra", "sutra kondom",
    "kondom fiesta", "fiesta condom", "fiesta lubricant",
    "g-string thong", "thong underwear", "celana thong", "quan thong",
    "lendir vagina", "lendir kelamin", "lendir sperma",
    "silicone lubricant sex", "personal lubricant"
  ];

  const ALL_PATTERNS = [
    ...STRICT_ADULT_KEYWORDS,
    ...CONTEXT_ADULT_KEYWORDS
  ].map(k => k.toLowerCase().trim()).filter(Boolean);

  // Helper: Kiểm tra ranh giới từ (Word Boundary) để tránh substring vô cớ
  // Ký tự phân cách: khoảng trắng, dấu gạch nối (-), gạch dưới (_), slash (/), v.v.
  function isMatchAtBoundary(text, keyword) {
    let startIdx = 0;
    while ((startIdx = text.indexOf(keyword, startIdx)) !== -1) {
      const before = startIdx === 0 ? ' ' : text[startIdx - 1];
      const after = (startIdx + keyword.length === text.length) ? ' ' : text[startIdx + keyword.length];
      
      const isBeforeBoundary = /[^a-z0-9]/i.test(before);
      const isAfterBoundary = /[^a-z0-9]/i.test(after);

      if (isBeforeBoundary && isAfterBoundary) {
        return true;
      }
      startIdx += keyword.length;
    }
    return false;
  }

  const ADULT_ENGINE = {
    detectTerm: function(term) {
      if (!term || typeof term !== 'string') return null;
      const lower = term.toLowerCase();

      for (let i = 0; i < ALL_PATTERNS.length; i++) {
        const kw = ALL_PATTERNS[i];
        if (isMatchAtBoundary(lower, kw)) {
          return { categoryName: 'Chủ đề 18+ (Vi phạm)', matchedWord: kw };
        }
      }
      return null;
    },

    detectUrl: function(url) {
      if (!url || typeof url !== 'string') return null;
      const lower = url.toLowerCase();

      for (let i = 0; i < ALL_PATTERNS.length; i++) {
        const kw = ALL_PATTERNS[i];
        if (kw.length < 3) continue;

        // URL kiểm tra cả dạng chuỗi gốc, gạch nối '-', và URL-encoded '%20'
        const hyphen = kw.replace(/\s+/g, '-');
        const percent = kw.replace(/\s+/g, '%20');

        if (isMatchAtBoundary(lower, kw) || isMatchAtBoundary(lower, hyphen) || isMatchAtBoundary(lower, percent)) {
          return { categoryName: 'URL 18+ (Vi phạm)', matchedSignature: kw };
        }
      }
      return null;
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ADULT_ENGINE;
  }
  global.ADULT_PATTERNS = ADULT_ENGINE;
})(typeof window !== 'undefined' ? window : global);

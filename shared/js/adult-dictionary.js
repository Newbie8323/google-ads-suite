// =========================================================================
// ULTRA-FAST ADULT MATCHER & PRECISE BOUNDARY CHECKER
// Tối ưu quét chính xác, chống bắt nhầm từ vựng y tế, vải vóc, sinh hoạt
// =========================================================================

(function(global) {
  // 1. Whitelist loại trừ theo ngữ cảnh (Context Exclusions)
  // Chặn bắt nhầm: Nông nghiệp, thú y, cây trồng, hô hấp, phụ kiện công nghệ, đồ gia dụng, thiết bị y tế
  const EXCLUSION_PATTERNS = [
    // Nông nghiệp, cây trồng, kích rễ, phân bón
    "mangga", "tanaman", "cangkok", "padi", "stek", "akar", "pupuk", "buah mangga",
    // Thú y, gia súc, động vật nuôi
    "sapi betina", "obat birahi sapi", "birahi hewan", "ayam kampung", "bertelur", "dna burung",
    "babi", "kucing", "anjing", "hewan", "ternak", "kambing", "kelinci", "hamster", "unggas",
    // Bệnh lý hô hấp, ho, đờm cổ họng
    "dahak", "tenggorokan", "batuk", "serak", "pengencer dahak",
    // Thiết bị y tế & hỗ trợ sinh hoạt đời sống
    "alat bantu jalan", "alat bantu dengar", "alat bantu pernapasan", "alat bantu napas",
    "kursi roda", "walker", "tongkat jalan", "fisioterapi",
    // Bệnh y tế thông thường không phải chủ đề 18+
    "psoriasis", "miom", "kista ovarium", "kista bartholin", "menstruasi", "tinea cruris", "anyang anyangan",
    "bab campur lendir", "mengencerkan lendir", "herpes di wajah", "perontok bulu yang aman untuk ibu hamil",
    "papiloma di leher", "papiloma leher", "papiloma wajah", "papiloma di wajah", "obat untuk kutil di leher",
    "kutil di leher", "kutil di wajah", "lipoma", "lipoma di leher", "trigger finger", "jari macet",
    "panu", "eksim", "ruam popok", "puting lecet", "pde5 inhibitor", "sinlik",
    // Cơ khí, công cụ, gia dụng, linh kiện, đồ chơi trí tuệ
    "rubik", "moyu", "meilong", "wd 40", "wd40", "semprot wd", "grease untuk bearing", "bearing",
    "pisau potong", "drum plastik", "shell rimula", "oli submersible", "submersible",
    // Mỹ phẩm, da liễu thông thường, thời trang đồ lót thông dụng
    "nude gloss", "hera nude", "tally bra", "bra untuk payudara kecil", "house of underwear", "uomo underwear",
    "brighty waxing", "waxing strip", "pisau cukur alis", "pembersih daki", "siku hitam", "hitam di paha",
    "obat kelenjar di paha", "krim pemutih ketiak", "pemutih ketiak", "ketiak gatal",
    // Đồ gia dụng, công nghệ (ốp lưng điện thoại...)
    "oppo", "samsung", "iphone", "xiaomi", "casing", "bangku", "kursi"
  ].map(k => k.toLowerCase().trim()).filter(Boolean);

  // 2. Từ ngữ 18+ rõ ràng, đặc trưng tuyệt đối (Không bị trùng nghĩa đời sống)
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
    // Trang phục gợi cảm đặc hiệu & phòng the
    "lingerie", "lingeri", "g-string", "gstring", "baju tidur seksi", "baju seksi", 
    "baju dinas malam", "baju haram", "babydoll seksi", "bra terbuka", "open crotch", 
    "crotchless", "sheer bra", "see through", "bodystocking",
    // Mở rộng bổ sung: Bộ phận sinh dục & tiếng lóng nhạy cảm Indo
    "kontol", "mister p", "mrp", "oenis", "alat kelamin", "kemaluan",
    "bulu kemaluan", "vagi",
    // Sản phẩm bôi trơn tình dục & mát xa
    "pelicin", "female lubricant", "edible oil massage", "personal lubricant", "ky jelly",
    "massage oil for couples",
    // Đồ chơi & thủ dâm nam/nữ
    "mainan pria", "alat kocok", "pengocok pria", "kocok pria", "coli", "minyak coli",
    "stroker", "buttplug", "cincin getar", "ring getar", "manstrubasi",
    // Trang phục & nội y gợi cảm
    "baju dinas", "dinas malam", "baju tidur tipis", "thong", "g string", "cd g string",
    // Kích dục & trợ lực sinh lý
    "afrodisiak", "gairah wanita", "libido wanita", "perangsang nafsu", "katup mani",
    "tisu mejik", "super magic", "magicpower", "sutra dotted", "sutra hitam", "sutra warna hitam",
    "fiesta extreme", "fiesta gel", "fiesta lubricant",
    "vivo sensitif", "one super studs", "sagami original", "dr boyke", "laforta", "gentletality",
    "relove intimate", "prostanol", "africa black ant", "jamu spider", "viex v", "miscella v", "zahira sauda",
    "manjakani", "lacto v", "softex missy", "mister puss",
    // Bệnh xã hội / STDs & phụ khoa nhạy cảm
    "kondiloma", "podofilotoksin", "kutil kelamin", "klamidia",
    "keluar nanah", "penis bernanah", "keputihan", "rapet wangi", "gurahvagina",
    // Thuốc tăng kích cỡ & quan hệ
    "pembesar pria", "pembesar burung", "pembesar urat", "alat pemanjang p", "p oil",
    "vaginal tightening", "berhubungan intim", "saat hb", "obat loyo", "pengaman buat wanita",
    "sperma pria"
  ];

  // 3. Từ đa nghĩa: Chỉ kích hoạt 18+ khi đi kèm ngữ cảnh nhạy cảm
  const CONTEXT_ADULT_KEYWORDS = [
    "kondom sutra", "pelumas sutra", "sutra kondom",
    "kondom fiesta", "fiesta condom", "fiesta lubricant",
    "g-string thong", "thong underwear", "celana thong", "quan thong",
    "lendir vagina", "lendir kelamin", "lendir sperma",
    "silicone lubricant sex", "personal lubricant",
    // Ngữ cảnh dầu bôi trơn tình dục
    "pelumas miss v", "pelumas vagina", "pelumas sex", "pelumas anal", "pelumas intim",
    // Ngữ cảnh làm đẹp vùng nhạy cảm / ngực
    "pembesar payudara", "pengencang payudara", "besarkan payudara", "pembesar bokong",
    "kembali perawan", "tongkat madura"
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

  function hasExclusion(lowerText) {
    for (let i = 0; i < EXCLUSION_PATTERNS.length; i++) {
      if (lowerText.includes(EXCLUSION_PATTERNS[i])) {
        return true;
      }
    }
    return false;
  }

  const ADULT_ENGINE = {
    detectTerm: function(term) {
      if (!term || typeof term !== 'string') return null;
      const lower = term.toLowerCase();

      // Kiểm tra whitelist loại trừ trước
      if (hasExclusion(lower)) {
        return null;
      }

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

      // Kiểm tra whitelist loại trừ trước
      if (hasExclusion(lower)) {
        return null;
      }

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

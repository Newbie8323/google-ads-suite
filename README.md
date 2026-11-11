# AdsInsight Pro - Bộ Tiện Ích Google Ads & Affiliate Intelligence Suite

Bộ công cụ web cao cấp hỗ trợ các nhà quảng cáo tối ưu chiến dịch Google Ads và tiếp thị liên kết (Affiliate Marketing). Xử lý dữ liệu tốc độ cao, trực quan hóa tài chính, bóc tách cụm từ tìm kiếm và tự động đồng bộ báo cáo hoa hồng lên Google Sheets.

> 🛡️ **100% Offline & Bảo Mật:** Toàn bộ dữ liệu file CSV/Excel được tính toán và xử lý trực tiếp trên trình duyệt của bạn (Client-side / Web Worker). Không gửi bất kỳ dữ liệu nhạy cảm nào ra máy chủ bên ngoài.

---

## 🛠️ Các Module Chức Năng Cốt Lõi

### 1. Lọc Cụm Từ Tìm Kiếm (`/loc-cum-tu-tim-kiem`)
Công cụ chuyên sâu dành cho chiến dịch Google Ads Tìm kiếm và Dynamic Search Ads (DSA):
* **Phân tích Trang Đích & Cấu trúc DSA:** Tự động gom nhóm URL theo Prefix cấu trúc danh mục, hiển thị mẫu cụm từ kích hoạt, tỷ lệ nhấp (CTR) và chi phí thực tế.
* **Động cơ quét N-Gram đa luồng (Web Worker):** Tách từ khóa theo độ dài (1 từ, 2 từ, 3 từ, 4+ từ), tự động phát hiện từ khóa rác, từ khóa đốt tiền không chuyển đổi.
* **Tích hợp Từ điển Dịch Thuật:** Tự động dịch các từ khóa tiếng nước ngoài (Indonesia, Trung Quốc, Tiếng Anh) sang Tiếng Việt để người chạy quảng cáo dễ nhận diện.
* **1-Click Phủ Định:** Thêm từ khóa phủ định nhanh theo định dạng Khớp cụm từ `"..."` hoặc Khớp chính xác `[...]` và sao chép vào Clipboard.
* **Quản lý Phiên (IndexedDB):** Lưu trữ toàn bộ kết quả phân tích vào bộ nhớ trình duyệt để mở lại bất cứ lúc nào mà không cần tải lại file.

### 2. Theo Dõi Lời Lãi Chiến Dịch 2.0 (`/theo-doi-loi-nhuan`)
Dashboard tài chính giám sát hiệu quả chiến dịch Google Ads & Affiliate:
* **Đồng bộ thời gian thực từ Google Sheets:** Kết nối API không giới hạn (JSONP CORS-Free) lấy số liệu chi phí, doanh thu, lợi nhuận ròng và ROAS.
* **Linh hoạt chu kỳ thời gian:** Xem theo Tháng mới nhất, 14 ngày gần nhất, hoặc tùy chọn khoảng ngày linh hoạt.
* **Trực quan hóa Biểu đồ (Chart.js):** Theo dõi xu hướng doanh thu vs chi phí, tỷ trọng đóng góp lợi nhuận từng chiến dịch.
* **Giám sát Độ trễ ghi nhận đơn (Delay Tracking):** Cảnh báo chiến dịch bị trễ đơn 1 - 2 ngày theo từng nhóm sản phẩm để tránh tối ưu nhầm.
* **Hệ thống đánh giá tự động:** Phân loại chiến dịch Lời mạnh, Lời nhẹ, Cảnh báo hòa vốn hoặc Cắt giảm lỗ.

### 3. Phân Tích Đơn Hàng Shopee (`/phan-tich-san-pham-shopee`)
Dành cho Publishers chạy Google Ads tiếp thị liên kết sàn Shopee:
* **Bóc tách file Order Detail:** Nhận diện và thống kê Top sản phẩm bán chạy, GMV, hoa hồng Base vs hoa hồng Brand Bonus Mall.
* **Khôi phục chuỗi GCLID:** Tự động ghép nối các trường Sub ID (Sub 1 - Sub 4) thành chuỗi click Google Ads chuẩn để truy vết nguồn chuyển đổi.
* **Tạo từ khóa Ads:** 1-Click sao chép danh sách tên sản phẩm hot làm từ khóa quảng cáo mới.

### 4. Nạp Báo Cáo Sàn Affiliate (`/nap-bao-cao-affiliate`)
* Chuẩn hóa tự động file báo cáo hoa hồng từ các mạng affiliate lớn (Massoffer, Ecomobi, Adpia...) và chi phí Google Ads.
* Đẩy trực tiếp dữ liệu vào các ô chỉ định trên Google Sheets qua Apps Script Web App hoặc sao chép nhanh định dạng TSV.

---

## 📁 Cấu Trúc Thư Mục Dự Án

```text
Google Ads/
├── data/                                 # Thư mục dữ liệu tập trung
│   ├── sample_data/                      # File CSV/Excel mẫu kiểm thử
│   └── data_negatives/                   # Dữ liệu từ khóa phủ định mẫu
│
├── loc-cum-tu-tim-kiem/                  # Module 1: Search Terms Intelligence
│   ├── index.html
│   ├── loc-cum-tu-tim-kiem.js
│   └── ngram-worker.js                   # Web Worker xử lý tính toán ngầm
│
├── theo-doi-loi-nhuan/                   # Module 2: Dashboard Lời Lãi & ROAS
│   ├── index.html
│   └── theo-doi-loi-nhuan.js
│
├── phan-tich-san-pham-shopee/            # Module 3: Phân tích đơn Shopee
│   ├── index.html
│   └── phan-tich-san-pham-shopee.js
│
├── nap-bao-cao-affiliate/                # Module 4: Nạp báo cáo lên Google Sheets
│   ├── index.html
│   └── nap-bao-cao-affiliate.js
│
├── shared/                               # Thành phần dùng chung toàn web
│   ├── css/ (style.css)                  # Hệ thống Design Tokens & Theme OLED
│   ├── js/                               # layout.js, utils.js, sidebar-toggle.js, db.js
│   ├── vendor/                           # Chart.js, PapaParse, SheetJS
│   └── img/ (favicon.png)
│
├── index.html                            # Trang chủ Hub trung tâm
├── sw.js & manifest.json                 # Hỗ trợ Offline PWA Cache
└── README.md & AGENTS.md                 # Tài liệu hướng dẫn & quy chuẩn
```

---

## ⌨️ Phím Tắt Thao Tác Nhanh (Shortcuts)

| Phím tắt | Chức năng |
| :--- | :--- |
| `Ctrl + K` | Mở thanh tìm kiếm & điều hướng nhanh (Command Palette) |
| `Ctrl + B` hoặc phím `[` | Thu gọn / Mở rộng thanh Menu dọc (Sidebar) |
| `Esc` | Đóng các cửa sổ Popup / Modal cấu hình |

---

## 🚀 Hướng Dẫn Sử Dụng

1. Tải toàn bộ thư mục về máy tính.
2. Nhấp đúp chuột mở trực tiếp file `index.html` bằng trình duyệt web bất kỳ (Chrome, Edge, Cốc Cốc, Brave...).
3. Bấm chọn công cụ muốn dùng và kéo thả file báo cáo vào để phân tích ngay lập tức. Không cần cài đặt Node.js hay môi trường phụ trợ.

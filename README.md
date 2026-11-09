# Google Ads Intelligence Suite (AdsInsight PRO)

Bộ công cụ web dashboard hỗ trợ chuyên viên Digital Marketing / Google Ads tối ưu hóa chiến dịch, giảm thiểu ngân sách lãng phí và đo lường mẫu quảng cáo trực quan.

## 🚀 Tính Năng Chính

1. **Tổng quan hiệu suất & Biểu đồ trực quan (Executive Dashboard)**:
   - Thẻ thống kê thời gian thực: Tổng chi phí, Click, Chuyển đổi, CTR, CPC, CPA.
   - Thống kê tỷ lệ ngân sách bị lãng phí (Zero-conversion spend).
   - Biểu đồ cột kết hợp đường (Bar & Line chart) hiển thị Top Search Terms tốn tiền so với lượt chuyển đổi.
   - Biểu đồ Doughnut phân bổ ngân sách hiệu quả vs ngân sách rác.
   - Trợ lý đưa ra khuyến nghị tức thì (Insight Recommendations) để mở rộng cụm từ tốt hoặc chặn từ khóa xấu.

2. **Khám phá cụm từ tìm kiếm (Search Terms Explorer)**:
   - Hỗ trợ import trực tiếp file xuất `.csv` từ Google Ads.
   - Tìm kiếm, lọc theo điều kiện (Chi phí cao nhất, CPA đắt nhất, Click nhiều nhất).
   - Đánh dấu và thêm vào danh sách từ khóa phủ định chỉ với 1 cú click.
   - Cho phép xuất ngược lại file `.csv` đã làm sạch.

3. **Phát hiện từ khóa "đốt tiền" (Waste Finder)**:
   - Tự động quét và phát hiện các cụm từ tìm kiếm vượt ngưỡng chi phí đặt trước (ví dụ > 100.000₫) nhưng mang lại **0 chuyển đổi**.
   - Nút hành động nhanh: **"Phủ định tất cả danh sách này"**.

4. **Công cụ A/B Testing Mẫu Quảng Cáo (Statistical Significance)**:
   - So sánh giữa 2 mẫu quảng cáo A (Control) và B (Challenger) hoặc các tiêu đề RSA.
   - Tự động tính toán điểm chuẩn Z-score, mức độ tin cậy thống kê (Confidence Level 90%, 95%, 99%).
   - Đưa ra kết luận có nên tắt mẫu thua cuộc hay cần thu thập thêm số liệu.

5. **Bộ quản lý & Xuất từ khóa phủ định (Negative Keywords Builder)**:
   - Tự động gom danh sách từ khóa phủ định đã chọn.
   - Chuyển đổi nhanh 3 định dạng:
     - Phủ định chính xác: `[từ khóa]`
     - Phủ định cụm từ: `"từ khóa"`
     - Phủ định rộng: `từ khóa`
   - Nút Copy nhanh vào clipboard để dán trực tiếp vào Google Ads Web UI hoặc Google Ads Editor.

6. **Trình tạo UTM Tracking chuẩn Google Ads**:
   - Tích hợp sẵn các macro ValueTrack chuẩn của Google: `{keyword}`, `{creative}`, `{campaignid}`, `{matchtype}`...
   - Tự động sinh link kèm UTM hoàn chỉnh mà không làm lỗi format macro.

7. **Phân tích Đơn hàng & Sản phẩm Shopee (Shopee Product Intelligence)**:
   - Import trực tiếp file báo cáo chi tiết đơn hàng (`Order_detail_view_items_data.csv` hoặc `.xlsx`).
   - Tự động bóc tách doanh số GMV, cơ cấu hoa hồng: Hoa hồng gốc (Base), Thưởng nhãn hàng (Brand Bonus từ Shopee Mall / Extra), Thưởng cấp bậc (Rank Bonus).
   - Tự động nhận diện số lượng mua trong tên sản phẩm (`x2`, `x3`, `x10`), xếp hạng Top sản phẩm bán chạy nhất & sinh nhiều hoa hồng nhất.
   - Tái tạo chuỗi Google Ads GCLID hoàn chỉnh được ghép từ `Sub 1`, `Sub 2`, `Sub 3`, `Sub 4`.
   - Phân tích tỷ trọng doanh số và tỷ lệ sinh lời (Take-rate %) theo từng Danh mục ngành hàng.
   - Nút 1-Click sao chép danh sách Top sản phẩm làm từ khóa Google Ads & Xuất báo cáo CSV.

## 📁 Cấu Trúc Thư Mục Dự Án

```text
e:\Project\Google Ads\
├── index.html                           # Cổng điều hướng trung tâm (Portal Hub)
├── shared/                              # Tài nguyên dùng chung
│   ├── css/style.css                    # Dark theme, layout & components chung
│   └── js/sidebar-toggle.js             # Xử lý đóng/mở thanh điều hướng sidebar
├── loc-cum-tu-tim-kiem/                 # Module 1: Phân tích & Lọc Cụm Từ Tìm Kiếm (N-Gram, DSA)
│   ├── index.html                       # Giao diện lọc cụm từ tìm kiếm
│   ├── loc-cum-tu-tim-kiem.js           # Thuật toán bóc tách URL, lọc N-Gram, dịch đa tầng
│   ├── adult-dictionary.js              # Từ điển từ khóa nhạy cảm / người lớn
│   └── default-negative-urls.js         # Danh sách URL phủ định mặc định chuẩn Google Ads
├── nap-bao-cao-affiliate/               # Module 2: Chuẩn hóa & Nạp Báo Cáo Sàn Affiliate
│   ├── index.html                       # Giao diện nạp báo cáo hoa hồng sàn
│   └── nap-bao-cao-affiliate.js         # Xử lý file Excel/CSV Massoffer, Ecomobi, Adpia & Google Sheets
├── phan-tich-san-pham-shopee/           # Module 3: Phân Tích Đơn Hàng & Sản Phẩm Shopee
│   ├── index.html                       # Giao diện phân tích đơn hàng Shopee
│   └── phan-tich-san-pham-shopee.js     # Phân tích đơn hàng, gom nhóm SP, khôi phục GCLID Ads
├── data_negatives/                      # Báo cáo mục tiêu động phủ định chuẩn từ Google Ads
├── sample_data/                         # Dữ liệu CSV mẫu thử nghiệm
├── AGENTS.md                            # Quy tắc & hướng dẫn thực thi chuẩn cho Antigravity AI
└── README.md                            # Tài liệu hướng dẫn sử dụng dự án
```

## 💻 Cách Khởi Chạy

- Mở trực tiếp file `index.html` bằng trình duyệt web (Chrome, Edge, Firefox, Cốc Cốc, Brave...) hoặc qua Live Server.
- Có thể truy cập trực tiếp từng module qua thư mục con (ví dụ: `loc-cum-tu-tim-kiem/index.html`).
- 100% ứng dụng chạy Client-side, không yêu cầu cài đặt server hay gửi dữ liệu nội bộ ra ngoài.


Bạn có thể mở trực tiếp tệp `index.html` bằng trình duyệt web bất kỳ (Chrome, Edge, Cốc Cốc, Brave...) hoặc mở bằng Live Server.

Mọi tác vụ xử lý 100% trên trình duyệt (Client-side), đảm bảo tuyệt đối an toàn và bảo mật dữ liệu.

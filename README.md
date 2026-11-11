# Bộ Tiện Ích Hỗ Trợ Chạy Google Ads & Affiliate

Bộ công cụ web đơn giản giúp xử lý nhanh các tác vụ hàng ngày khi chạy Google Ads và làm Affiliate: lọc từ khóa tìm kiếm rác, phân tích đơn hàng Shopee và chuẩn hóa dữ liệu báo cáo hoa hồng.

Mọi thứ chạy trực tiếp trên trình duyệt của bạn (Client-side), không gửi file hay dữ liệu ra máy chủ bên ngoài, đảm bảo an toàn và bảo mật.

---

## 🛠️ Các Công Cụ Trong Dự Án

### 1. Lọc Cụm Từ Tìm Kiếm (`/loc-cum-tu-tim-kiem`)
Dành cho chiến dịch Tìm kiếm và DSA (Quảng cáo tìm kiếm động):
- **Đọc file báo cáo Google Ads**: Kéo thả file CSV tải từ Google Ads vào là xem được ngay.
- **Lọc từ khóa ngắn (N-Gram)**: Tách cụm từ thành 1 từ, 2 từ, 3 từ để nhanh chóng tìm ra các từ vô nghĩa hoặc đốt tiền nhiều mà không ra đơn.
- **Bộ lọc từ rác & nhạy cảm**: Hỗ trợ phát hiện nhanh các từ khóa 18+, từ tìm kiếm thông tin không mua hàng hoặc thuốc đặc trị để phủ định ngay.
- **Tạo danh sách phủ định**: Chọn từ và sao chép nhanh theo định dạng Khớp cụm từ `"..."` hoặc Khớp chính xác `[...]` để dán thẳng vào Google Ads.
- **Phân tích trang đích (DSA)**: Gom nhóm URL để xem trang đích nào đang tốn tiền, hỗ trợ xuất quy tắc loại trừ mục tiêu động.

### 2. Phân Tích Đơn Hàng Shopee (`/phan-tich-san-pham-shopee`)
Dành cho người chạy Google Ads tiếp thị liên kết Shopee:
- **Đọc file đơn hàng Shopee**: Nạp file `Order_detail_view_items_data` (CSV hoặc Excel).
- **Thống kê sản phẩm**: Xem sản phẩm nào bán chạy nhất, mang về nhiều hoa hồng nhất, tỷ lệ hoa hồng từng ngành hàng.
- **Khôi phục chuỗi GCLID**: Tự động ghép nối các trường Sub ID thành mã click Google Ads để biết đơn hàng đến từ click nào.
- **Copy từ khóa**: Bấm 1 nút để copy nhanh danh sách tên sản phẩm hot làm từ khóa quảng cáo.

### 3. Nạp Báo Cáo Affiliate (`/nap-bao-cao-affiliate`)
- Hỗ trợ chuẩn hóa file xuất hoa hồng từ các mạng affiliate (Massoffer, Ecomobi, Adpia...).
- Chuyển đổi định dạng để theo dõi số liệu và dễ dàng đưa vào Google Sheets cá nhân.

---

## 🚀 Cách Sử Dụng

1. Tải hoặc clone thư mục về máy tính.
2. Nhấp đúp mở file `index.html` bằng trình duyệt bất kỳ (Chrome, Cốc Cốc, Edge...).
3. Chọn công cụ bạn cần dùng trên màn hình chính hoặc menu điều hướng.
4. Kéo thả file báo cáo vào để xem kết quả. Không cần cài đặt phần mềm hay môi trường gì thêm.


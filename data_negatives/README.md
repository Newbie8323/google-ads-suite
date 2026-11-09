# THƯ MỤC LƯU TRỮ URL PHỦ ĐỊNH CHUẨN (GOOGLE ADS DSA)

Thư mục này dùng để lưu trữ file báo cáo mục tiêu quảng cáo động phủ định xuất từ Google Ads.

### Các tệp hiện có:
1. `Báo cáo mục tiêu quảng cáo động phủ định.csv`: File báo cáo gốc xuất từ tài khoản Google Ads.
2. `danh_sach_url_phu_dinh_chuan.txt`: Danh sách 70 URL chính xác duy nhất (`URL bằng ...`) đã được bóc tách và làm sạch, dùng làm dữ liệu phủ định chuẩn cho ứng dụng.

### Cách cập nhật danh sách mới trong tương lai:
- Khi có file báo cáo phủ định mới xuất từ Google Ads, bạn chỉ cần dán/thay thế file CSV mới vào thư mục `data_negatives/` này.
- Trên giao diện web [loc-cum-tu-tim-kiem.html](file:///e:/Project/Google%20Ads/loc-cum-tu-tim-kiem.html), bạn chỉ cần mở modal **"📥 Nhập Danh Sách URL"** và bấm **"Chọn file CSV báo cáo phủ định..."** để tải file từ thư mục này lên, ứng dụng sẽ tự động nạp toàn bộ các link `URL bằng` mới vào hệ thống.

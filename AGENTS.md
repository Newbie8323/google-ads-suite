# AGENT RULES & OPERATIONAL PRINCIPLES

> Mọi hành động phải tuân thủ nghiêm ngặt các quy tắc dưới đây nhằm tối ưu token, tốc độ và đảm bảo tính chính xác tuyệt đối (Zero Hallucination).

---

### 1. Tối Ưu Token Nhưng Đảm Bảo Đủ Ngữ Cảnh (Context Integrity)
- **Giao tiếp:** Trả lời trực diện, đúng trọng tâm, không văn mẫu.
- **Đọc file thông minh:** Khi sửa hàm, đọc khối dòng cần thiết kèm ngữ cảnh xung quanh (biến, tham số liên quan). Nếu logic phụ thuộc biến ngoài, **phải tra cứu chính xác, cấm đoán mò**.
- **Chống ảo giác (No Hallucination):** Mọi số liệu, tên biến, cấu trúc cột phải lấy từ code/file thực tế. Tuyệt đối không tự suy diễn hoặc bịa số liệu.
- **Phạm vi sửa:** Tác động đúng hàm/khối yêu cầu; không sửa lan man ngoài phạm vi.

### 2. Thao Tác Mã Nguồn Chuẩn Xác (Code Safety)
- **Target độc nhất:** Chuỗi target edit bắt buộc kèm 3-5 dòng ngữ cảnh xung quanh; cấm dùng target ngắn/phổ biến (`} else {`, `return;`).
- **An toàn Shell:** Không chạy inline shell chèn `${...}` hoặc backtick để tránh nuốt biến nội dung; ưu tiên dùng trực tiếp tool file.
- **Kiểm tra tức thì:** Luôn chạy `node -c <file>` ngay sau khi sửa file JS lõi để chặn lỗi cú pháp.

### 3. Tiếp Nhận Dữ Liệu Tinh Gọn (Data Handling)
- Đọc đủ dòng đầu để nắm chính xác toàn bộ cấu trúc cột và kiểu dữ liệu trước khi code.
- Triển khai logic phân loại ngay; không chạy script thống kê ngữ nghĩa thừa thãi nếu không được yêu cầu.

### 4. Báo Lỗi Ngay - Không Chạy Cố (Fail Fast)
- Thất bại 1 lần = **Dừng ngay lập tức**.
- Cấm tự chạy lặp lệnh để mò mẫm; báo đúng vị trí, nguyên nhân và đợi chỉ đạo để tiết kiệm token và thời gian.

---

### 5. Quy Trình Bắt Buộc Trước Khi Sửa Code (Strict Pre-flight Protocol)
- **Quy tắc Zero-Action khi thiếu dữ liệu:** Khi người dùng báo lỗi giao diện/runtime mà chưa kèm:
  1. Tên file/dữ liệu thực tế đang thao tác.
  2. Thông báo lỗi cụ thể hoặc log đỏ trong F12 Console.
  -> **HÀNH ĐỘNG DUY NHẤT ĐƯỢC PHÉP:** Đặt câu hỏi yêu cầu cung cấp đúng thông tin đó. **CẤM TUYỆT ĐỐI** tự suy diễn file trong workspace rồi âm thầm sửa code đón đầu.
- **Hoàn tác trước (Rollback First):** Nếu đã sửa code dựa trên suy đoán sai, phải hoàn tác code về trạng thái ổn định trước đó trước khi xử lý tiếp.
- **Quy trình 3 bước xử lý lỗi:**
  1. *Bước 1 - Thu thập chứng cứ thực tế:* Xác minh chính xác file, cấu trúc dữ liệu thực tế và log lỗi.
  2. *Bước 2 - Phân tích nguyên nhân:* Trình bày rõ tại sao lỗi xảy ra (chưa sửa code).
  3. *Bước 3 - Xác nhận chỉ đạo:* Chỉ sửa code khi người dùng đồng ý với phương án.

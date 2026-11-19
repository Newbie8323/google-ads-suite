# AGENT RULES & OPERATIONAL PRINCIPLES (AdsInsight Pro)

> Nghiêm ngặt tuân thủ: Tiết kiệm token, Zero Hallucination, Zero Secret Leakage, Deep Modules.

---

### 1. Kỷ Luật Thao Tác Mã Nguồn (Code Safety & Syntax)
- **Target chuẩn xác:** Chuỗi target edit bắt buộc kèm 3-5 dòng ngữ cảnh bao quanh; cấm dùng target ngắn (`} else {`).
- **An toàn Shell:** Ưu tiên tool file; không chạy inline shell chèn `${...}` / backtick tránh nuốt biến. Môi trường: Windows PowerShell (UTF-8).
- **Kiểm tra tức thì:** Luôn chạy `node -c <file>` ngay sau khi sửa JS lõi.
- **Git Commit:** Đặt tên theo chuẩn Conventional Commits (`fix:`, `feat:`, `refactor:`, `style:`).

### 2. Tuyệt Đối Bảo Mật (Zero Secret Leakage)
- **Cấm hardcode secrets:** CẤM ghi Spreadsheet ID, Webhook, API Token, Private Key vào file Git track.
- **Nạp bí mật:** 100% thông tin nhạy cảm gọi qua `window.ADS_LOCAL_SECRETS` (từ `shared/js/config.local.js` trong `.gitignore`).
- **Soát commit:** Luôn chạy `git diff` trước khi commit; biến mặc định trên Git luôn là chuỗi rỗng `""`.

### 3. Kiến Trúc & Tái Sử Dụng (Deep Modules & DRY)
- **Layout tập trung:** Không copy-paste HTML Sidebar/Header. Luôn dùng [`shared/js/layout.js`](file:///e:/DevSpace/Main_Projects/Google%20Ads/shared/js/layout.js).
- **Utils dùng chung:** Hàm `showToast`, `escapeHtml`, `formatCurrency`, `formatNumber`, `copyToClipboard` bắt buộc gọi qua [`shared/js/utils.js`](file:///e:/DevSpace/Main_Projects/Google%20Ads/shared/js/utils.js). Cấm viết cục bộ làm ô nhiễm `window`.
- **Non-blocking UI:** Xử lý file nặng (N-Gram, bóc tách dữ liệu lớn) bắt buộc dùng Web Worker (`ngram-worker.js`).

### 4. Quy Trình Tiếp Nhận & Sửa Lỗi (Fast-track vs Strict Protocol)
- **Fast-track (Làm ngay):** Yêu cầu đổi style CSS, đổi màu/icon, sửa text label, bổ sung từ điển rõ ràng -> Sửa trực tiếp, test cú pháp và báo kết quả.
- **Strict Protocol (Bắt buộc 3 bước khi lỗi runtime / tính toán số liệu):**
  1. *Thiếu chứng cứ:* Nếu chưa có file cụ thể hoặc log F12 -> **Hỏi ngay, cấm đoán mò sửa đón đầu**.
  2. *Phân tích trước:* Trình bày rõ nguyên nhân gốc rễ (Root Cause) trước khi sửa.
  3. *Xác nhận:* Chỉ sửa code khi người dùng đồng ý với phương án.

### 5. Tra Cứu Tri Thức Ngoài (`E:\DevSpace\Repo Github\`)
> **Chỉ mục tổng:** [`E:\DevSpace\Repo Github\REPOS_REGISTRY.json`](file:///E:/DevSpace/Repo%20Github/REPOS_REGISTRY.json). Tuyệt đối **KHÔNG copy repo vào dự án**, đọc trực tiếp theo đường dẫn:

| Mục tiêu | Repo gốc (`E:\DevSpace\Repo Github\`) | File khóa cần đọc |
| :--- | :--- | :--- |
| **Logic, Debug, TDD** | [`mattpocock-skills`](file:///E:/DevSpace/Repo%20Github/mattpocock-skills) | `skills/engineering/codebase-design/SKILL.md`, `diagnosing-bugs/SKILL.md` |
| **UI/UX & Data Table** | [`ui-ux-repo`](file:///E:/DevSpace/Repo%20Github/ui-ux-repo) | `REPO_OVERVIEW.md`, `skill/SKILL.md` |
| **Anti-AI Slop & Theme** | [`hallmark`](file:///E:/DevSpace/Repo%20Github/hallmark) & [`impeccable-repo`](file:///E:/DevSpace/Repo%20Github/impeccable-repo) | `hallmark/REPO_OVERVIEW.md`, `skills/hallmark/SKILL.md` |
| **Kiểm toán Bảo mật** | [`security-audit-skill`](file:///E:/DevSpace/Repo%20Github/security-audit-skill) | `skills/security-audit/SKILL.md`, `VALIDATION-AND-REPORTING.md` |
| **Video Ads & Content** | [`OpenMontage`](file:///E:/DevSpace/Repo%20Github/OpenMontage) & [`humanizer`](file:///E:/DevSpace/Repo%20Github/humanizer) | `OpenMontage/REPO_OVERVIEW.md`, `humanizer/SKILL.md` |

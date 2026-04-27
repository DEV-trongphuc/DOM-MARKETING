# Kế hoạch Audit Vòng đời DOMATION-META (SaaS Lifecycle Audit)

Mục tiêu của tài liệu này là rà soát toàn bộ vòng đời sử dụng của hệ thống từ lúc khởi tạo đến lúc phân quyền, vận hành và gia hạn. Kế hoạch này được thiết kế để đảm bảo ứng dụng đạt chuẩn **Production-Ready** và xử lý mượt mà mọi ngoại lệ (Edge Cases).

## Đề xuất Hướng giải quyết cho từng Giai đoạn

### 1. Giai đoạn Khởi tạo & Cấu hình (Workspace Onboarding)
- **Tình trạng kỳ vọng**: Khi hệ thống nhân rộng, việc tạo Workspace phải hoàn toàn độc lập (Multi-tenant).
- **Edge Cases & Giải pháp**:
  - **Trùng lặp Slug / Tên miền**: Cơ sở dữ liệu đã có khóa `UNIQUE`, tuy nhiên Backend cần bắt lỗi này và trả về thông báo UI rõ ràng thay vì lỗi 500 (VD: "Đường dẫn này đã có người sử dụng").
  - **Bảo mật Endpoint Tạo mới**: Đảm bảo chỉ có tài khoản cấp `Super Admin` (chứa JWT/Session hợp lệ) mới có thể bắn API tạo Workspace. Cần ngăn chặn việc hacker spam API tạo hàng loạt Workspace rác.

### 2. Giai đoạn Quản lý Meta Token (Token Management)
- **Tình trạng kỳ vọng**: Token Meta có thể hết hạn bất cứ lúc nào (bị đổi mật khẩu, Meta thu hồi, hoặc hết hạn 60 ngày).
- **Edge Cases & Giải pháp**:
  - **Bỗng dưng hết/chết Token**: Không chỉ dựa vào lúc load trang đầu tiên (`_verifyToken`), mà ở **từng tác vụ Call API Meta** (Load Ads, Load Insights), nếu trả về lỗi `OAuthException` hoặc `Error 190`, giao diện phải tự động catch lỗi, dừng toàn bộ biểu đồ đang xoay và lập tức bung Modal `_openTokenModal()` để cảnh báo Admin nhập lại Token.
  - **Viewer vào lúc không có Token**: Nếu là Viewer, hệ thống không được hiện Modal đòi Token (vì họ không có quyền nhập), mà phải hiện màn hình trống: *"Hệ thống đang bảo trì kết nối dữ liệu. Vui lòng liên hệ Admin."*

### 3. Giai đoạn Phân quyền & Chia sẻ (Share & Access Control)
- **Tình trạng kỳ vọng**: Tính năng Share phải bảo mật tuyệt đối, không được rò rỉ dữ liệu cho người ngoài khi Link Public bị tắt.
- **Edge Cases & Giải pháp**:
  - **Gỡ quyền đột ngột (Revoke Access)**: Khi Admin xóa 1 email khỏi danh sách chia sẻ, nhưng người đó đang mở tab trình duyệt. => Cần validate quyền ở cấp độ **Backend**. Mỗi lần fetch API, Backend phải check `saas_tenant_viewers` xem email này còn `status = active` không. Nếu không, ngắt API và đá văng về màn hình Xin quyền.
  - **Chế độ Public Link**: Nếu bật Public, bất cứ ai có link đều xem được. Nếu tắt, **bắt buộc** phải Redirect sang luồng Đăng nhập Google (OAuth) để lấy Email đối chiếu với Database.

### 4. Giai đoạn Gia hạn & Hết gói (Subscription & Renewal)
- **Tình trạng kỳ vọng**: Tự động chặn truy cập khi `expires_at` là quá khứ.
- **Edge Cases & Giải pháp**:
  - **Chặn Backend chứ không chỉ Frontend**: Không chỉ dùng CSS để hiện Overlay "Hết hạn", người dùng am hiểu công nghệ có thể F12 xóa lớp Overlay đi và tiếp tục dùng. Giải pháp là Backend `server/dom.php` phải kiểm tra `expires_at` ở mọi Request. Nếu hết hạn, API chỉ trả về `{"error": "tenant_expired"}` thay vì trả config.
  - **Luồng xin gia hạn**: Nút "Gia hạn" sẽ bắn API lưu vào bảng `saas_renewal_requests`, đồng thời bắn Webhook (Telegram/Email) cho team vận hành DOMATION để hỗ trợ khách hàng ngay lập tức.

---

## 📋 Checklist Xác nhận (Sẵn sàng cho Production)

Dưới đây là danh sách các kịch bản kiểm thử (Test Cases) cần chạy thử nghiệm thực tế:

### Khối Token & Dữ liệu
- [ ] **Kịch bản 1**: Thử cố tình dán 1 Token hết hạn/sai mã. Hệ thống phải từ chối và hiện báo lỗi ngay trên Modal.
- [ ] **Kịch bản 2**: Xóa Token hiện tại trong DB/LocalStorage. Refresh trang với tư cách Admin -> Phải bung Modal đòi Token.
- [ ] **Kịch bản 3**: Xóa Token. Refresh trang với tư cách Viewer -> Phải báo "Chờ Admin cấu hình".

### Khối Phân quyền (Security)
- [ ] **Kịch bản 4**: Tắt Public Link (`is_public = 0`). Thử mở link trên tab ẩn danh (Incognito). Trình duyệt phải yêu cầu đăng nhập Google.
- [ ] **Kịch bản 5**: Xin quyền (Request Access) -> Vào DB chuyển `status` thành `rejected`. Mở trang lại phải hiện thông báo "Bạn đã bị từ chối truy cập".
- [ ] **Kịch bản 6**: Admin gỡ quyền 1 Viewer đang online. Viewer đó bấm sang Tab "Ad Library" -> Phải bị văng ra màn hình yêu cầu cấp quyền ngay lập tức do API báo lỗi 403.

### Khối Gia hạn (Billing)
- [ ] **Kịch bản 7**: Cố tình sửa cột `expires_at` trong Database về ngày hôm qua. Refresh trang, màn hình phải bị khóa hoàn toàn với Overlay báo hết hạn.
- [ ] **Kịch bản 8**: Ở màn hình hết hạn, dùng F12 xóa Overlay đi và thử bấm các nút. Giao diện phải trống trơn vì Backend không trả về Data.

> [!IMPORTANT]
> **User Review Required:**
> Để triển khai được kế hoạch hoàn hảo trên, bạn hãy xác nhận giúp mình: **Hiện tại ở Backend (PHP), bạn đã thiết lập hàm chặn các Request khi `status = expired` hay khi `Token lỗi` chưa?** Hay hiện tại chỉ mới làm lớp vỏ khóa ở giao diện (Frontend JS)? 
> 
> Nếu bạn đồng ý với kế hoạch và checklist này, hãy nói "Triển khai" để mình bắt tay vào review từng dòng code để vá mọi lỗ hổng ngay lập tức!

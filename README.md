🏥 Hospital Navigation App - Backend Integration Testing
Dự án này là hệ thống Backend dành cho ứng dụng dẫn đường nội khu bệnh viện. Tập trung vào việc cung cấp các API hạ tầng bản đồ, tìm kiếm địa điểm và công cụ quản trị (Admin Control Panel) với bộ kiểm thử tích hợp (Integration Test) chặt chẽ.

🚀 Quy trình cài đặt
Để chạy dự án này trên máy cục bộ, bạn cần thực hiện theo các bước sau:

1. Cài đặt môi trường
Đảm bảo bạn đã cài đặt:

Node.js (Phiên bản 16 trở lên)

PostgreSQL và pgAdmin 4

2. Cài đặt thư viện
Mở Terminal tại thư mục gốc của dự án và chạy lệnh sau:

Bash
# Cài đặt các thư viện cần thiết
npm install

# Nếu gặp lỗi xung đột phiên bản TypeScript (ERRESOLVE), hãy dùng lệnh:
npm install --legacy-peer-deps
3. Thiết lập Cơ sở dữ liệu (Bắt buộc)
Trước khi chạy hệ thống hoặc kiểm thử, bạn cần khôi phục dữ liệu mẫu vào PostgreSQL:

Mở pgAdmin 4.

Tạo một Database mới tên là: hospital_test.

Chuột phải vào Database hospital_test vừa tạo, chọn Restore...

Tại mục Filename, tìm đến file hospital_test.backup có sẵn trong thư mục dự án.

Nhấn Restore để hoàn tất việc nhập cấu trúc bảng và dữ liệu mồi.

🧪 Chạy Kiểm thử (Testing)
Hệ thống sử dụng Jest và Supertest để thực hiện kiểm thử tích hợp trên cơ sở dữ liệu thật.

Để chạy toàn bộ bộ kiểm thử, sử dụng lệnh:

Bash
npm run test
Cấu trúc bộ kiểm thử Admin (Nhóm 3):
Bộ test được tách bạch theo từng module để dễ dàng quản lý:

tests/admin/node_mgmt.test.ts: Quản lý Điểm nút & Phòng ban.

tests/admin/edge_mgmt.test.ts: Quản lý Lộ trình (Đường nối).

tests/admin/weight_mgmt.test.ts: Thiết lập trọng số dẫn đường.

tests/admin/device_mgmt.test.ts: Quản lý thiết bị định vị & Beacons.

🛠 Công nghệ sử dụng
Framework: Express.js (TypeScript)

Database: PostgreSQL

Testing: Jest, Supertest

Environment: cross-env (Thiết lập biến môi trường chạy đa nền tảng)

⚠️ Lưu ý quan trọng
Dọn dẹp dữ liệu: Các file test đã được thiết lập cơ chế tự động dọn dẹp dữ liệu mồi sau khi chạy (afterAll). Nếu test bị crash giữa chừng, bạn có thể cần chạy lệnh DELETE thủ công trong pgAdmin để làm sạch DB.

Phân quyền: Mọi API Admin yêu cầu Header Authorization: Bearer <Admin_Token>. Các kịch bản test đã bao phủ trường hợp giả lập Token để kiểm tra mã lỗi 1009 (Truy cập bị từ chối).

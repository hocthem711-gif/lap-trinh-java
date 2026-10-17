# 📐 TÀI LIỆU ĐẶC TẢ SƠ ĐỒ TUẦN TỰ (SEQUENCE DIAGRAM SPECIFICATION)
## Dự án: Hệ Thống Giám Sát & Điều Khiển Nông Nghiệp Thông Minh (Smart Farm IoT)
### Nhiệm vụ: `[Sprint 2][Dev 5] LTJ-10: Test API Danh mục & Script MQTT Giả lập`

---

> **Tác giả:** Dev 5 (Architecture & IoT Specialist)  
> **Sprint:** Sprint 2 (10/10/2026 - 17/10/2026)  
> **Ngôn ngữ mô hình hóa:** PlantUML  
> **File mã nguồn PlantUML:**
> * [`docs/Sequence_Auth_Login.puml`](file:///f:/lap_trinh_java/docs/Sequence_Auth_Login.puml)
> * [`docs/Sequence_Add_Device.puml`](file:///f:/lap_trinh_java/docs/Sequence_Add_Device.puml)  
> **Hình ảnh sơ đồ:**
> * [`docs/images/Sequence_Auth_Login.png`](file:///f:/lap_trinh_java/docs/images/Sequence_Auth_Login.png)
> * [`docs/images/Sequence_Add_Device.png`](file:///f:/lap_trinh_java/docs/images/Sequence_Add_Device.png)

---

## 1. SƠ ĐỒ 1: LUỒNG ĐĂNG NHẬP & XÁC THỰC PHÂN QUYỀN JWT (F01)

### 1.1. Mục đích kiến trúc
Mô tả chi tiết quá trình người dùng gửi thông tin xác thực lên hệ thống, cơ chế kiểm tra mật khẩu bằng thuật toán băm BCrypt, sinh chữ ký số JWT (HMAC-SHA256) chứa các quyền hạn (Role Claims), và cách các request tiếp theo được bảo vệ qua bộ lọc `JwtAuthenticationFilter`.

### 1.2. Danh sách các thành phần tham gia (Participants)
1. **User (Actor):** Người dùng thao tác trên trình duyệt.
2. **Web Client (React / Vite):** Ứng dụng Frontend nhận input, gọi REST API và lưu trữ Token.
3. **JwtAuthenticationFilter (Control):** Bộ lọc chặn bắt request, trích xuất và xác thực Bearer Token trước khi tới Controller.
4. **AuthController & AuthService (Control):** Tầng tiếp nhận và điều phối nghiệp vụ xác thực.
5. **AuthenticationManager & CustomUserDetailsService (Control):** Thành phần cốt lõi của Spring Security chịu trách nhiệm nạp User và so khớp mật khẩu.
6. **Database (H2 / PostgreSQL):** Bảng `users` và `roles` lưu trữ thông tin tài khoản.
7. **JwtTokenProvider (Control):** Chịu trách nhiệm mã hóa và giải mã chuỗi JWT.

### 1.3. Các bước thực thi chính
1. **Gửi yêu cầu:** Người dùng gửi `POST /api/v1/auth/login` với body `{ "usernameOrEmail", "password" }`.
2. **Nạp thông tin:** `CustomUserDetailsService` truy vấn database tìm theo username hoặc email.
3. **So khớp mật khẩu:** `PasswordEncoder.matches()` so sánh mật khẩu raw với mật khẩu mã hóa BCrypt.
   * **Nếu sai:** Ném `BadCredentialsException` ➔ Trả về `401 Unauthorized`.
   * **Nếu đúng:** `JwtTokenProvider` đóng gói Subject, Claims (Role), thời hạn (24 giờ), ký bằng Secret Key 256-bit.
4. **Phản hồi:** Trả về `AuthResponse` gồm `accessToken`, `tokenType: Bearer` và thông tin User. Client lưu vào `localStorage`.
5. **Ủy quyền:** Ở các request sau (ví dụ `GET /api/v1/farms`), Client đính kèm `Authorization: Bearer <accessToken>`. `JwtAuthenticationFilter` giải mã token và thiết lập vào `SecurityContextHolder`.

---

## 2. SƠ ĐỒ 2: LUỒNG THÊM THIẾT BỊ MỚI & ĐĂNG KÝ MQTT BROKER (F03 / IoT)

### 2.1. Mục đích kiến trúc
Mô tả luồng tích hợp giữa Tầng Ứng Dụng (Web UI), Tầng Dịch Vụ (Backend Spring Boot), Tầng Truyền Thông (MQTT Broker HiveMQ), và Tầng Thiết Bị (IoT Simulator). Đảm bảo tính nhất quán dữ liệu từ lúc tạo thiết bị trên cơ sở dữ liệu đến khi nhận telemetry cảm biến đầu tiên.

### 2.2. Danh sách các thành phần tham gia (Participants)
1. **Farmer (Actor):** Chủ trang trại thêm cảm biến vào khu vực canh tác.
2. **Web Dashboard (React UI):** Giao diện quản lý hiển thị danh sách cây trang trại/zone.
3. **Device/Zone Controller & Service (Control):** Xử lý nghiệp vụ gắn thiết bị vào Zone.
4. **Database (Entity/DB):** Bảng `devices` và `zones`.
5. **MQTT Broker (HiveMQ / EMQX):** Máy chủ trung gian xử lý publish/subscribe gói tin IoT.
6. **IoT Simulator / Hardware (IoT Device):** Chương trình giả lập bắn dữ liệu cảm biến định kỳ.

### 2.3. Các bước thực thi chính
1. **Tạo thiết bị:** Người dùng chọn Farm ➔ Chọn Zone A ➔ Gửi `POST /api/v1/zones/{zoneId}/devices`.
2. **Kiểm tra quyền sở hữu:** Backend xác minh Zone có thuộc quyền quản lý của Farmer hay không.
3. **Sinh Topic & Lưu trữ:** Sinh mã `deviceCode = DEV-Z1-001`, cấu hình topic `iot/ltj/sensor/zone-1/DEV-Z1-001`. Lưu thiết bị vào DB ở trạng thái `PENDING_CONNECT`.
4. **Đăng ký MQTT Topic:** Backend gửi lệnh `SUBSCRIBE` topic của thiết bị mới lên MQTT Broker (QoS 1).
5. **Simulator Kết nối & Gửi dữ liệu:**
   * Script IoT Simulator gửi gói tin `CONNECT` tới Broker.
   * Định kỳ mỗi 5 giây, Simulator tính toán số liệu cảm biến (Nhiệt độ, Độ ẩm đất, Độ ẩm không khí) và gửi bản tin JSON lên Topic chỉ định.
   * Backend nhận gói tin, lưu lịch sử đo đạc, đổi trạng thái thiết bị sang `ONLINE` và phát WebSocket (STOMP) để Frontend cập nhật biểu đồ thời gian thực.

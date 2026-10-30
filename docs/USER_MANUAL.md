# 📘 TÀI LIỆU HƯỚNG DẪN SỬ DỤNG HỆ THỐNG (USER MANUAL — DRAFT)
## Dự án: Hệ Thống Giám Sát & Điều Khiển Nông Nghiệp Thông Minh (Smart Farm IoT & UAV)
### Nhiệm vụ: `[Sprint 4][Dev 5] LTJ-20: Draft Sườn User Manual`

---

> **Phiên bản:** `v1.0-draft` (Sprint 4)  
> **Biên soạn:** Trần Nguyễn Bảo Hoàng — Dev 5 (IoT, System Architecture & QA Specialist)  
> **Đối tượng sử dụng:** Quản trị viên hệ thống (`ROLE_ADMIN`), Chủ trang trại / Kỹ thuật viên nông nghiệp (`ROLE_FARMER`)  

---

## 📌 MỤC LỤC TỔNG QUAN (SƯỜN TÀI LIỆU)

1. [Chương 1: Giới Thiệu Tổng Quan & Yêu Cầu Hệ Thống](#chương-1-giới-thiệu-tổng-quan--yêu-cầu-hệ-thống)
2. [Chương 2: Hướng Dẫn Cài Đặt & Khởi Chạy Nhanh](#chương-2-hướng-dẫn-cài-đặt--khởi-chạy-nhanh)
3. [Chương 3: Đăng Nhập, Xác Thực & Phân Quyền Người Dùng (F01, F02)](#chương-3-đăng-nhập-xác-thực--phân-quyền-người-dùng-f01-f02)
4. [Chương 4: Quản Lý Nông Trại, Vùng Canh Tác & Thiết Bị IoT (F03)](#chương-4-quản-lý-nông-trại-vùng-canh-tác--thiết-bị-iot-f03)
5. [Chương 5: Giám Sát Bản Đồ Cảm Biến Realtime & Thống Kê Dashboard (F04, F05, F06)](#chương-5-giám-sát-bản-đồ-cảm-biến-realtime--thống-kê-dashboard-f04-f05-f06)
6. [Chương 6: Lập Kế Hoạch Bay UAV & Vẽ Đường Bay Waypoints Trên Bản Đồ (F14, F16)](#chương-6-lập-kế-hoạch-bay-uav--vẽ-đường-bay-waypoints-trên-bản-đồ-f14-f16)
7. [Chương 7: Vận Hành Bộ Giả Lập Thiết Bị IoT Simulator (F19, F20)](#chương-7-vận-hành-bộ-giả-lập-thiết-bị-iot-simulator-f19-f20)
8. [Chương 8: Xử Lý Sự Cố Thường Gặp (Troubleshooting & FAQ)](#chương-8-xử-lý-sự-cố-thường-gặp-troubleshooting--faq)

---

## Chương 1: Giới Thiệu Tổng Quan & Yêu Cầu Hệ Thống

### 1.1. Mục đích hệ thống
Hệ thống **Smart Farm IoT & UAV** hỗ trợ quản lý nông trại thông minh theo thời gian thực, kết hợp mạng lưới cảm biến mặt đất (Nhiệt độ, Độ ẩm không khí, Độ ẩm đất, Ánh sáng) truyền qua giao thức **MQTT** và thiết bị bay không người lái (**UAV/Drone**) bay khảo sát theo lộ trình điểm bay (**Waypoints**).

### 1.2. Yêu cầu phần cứng & phần mềm
* **Môi trường chạy Backend & Simulator:** JDK `17` trở lên, Gradle `8.x` hoặc Maven.
* **Môi trường chạy Giao diện Web (Frontend):** Node.js `18+`, trình duyệt Chrome / Edge / Firefox hỗ trợ WebGL & Leaflet Map.
* **Kết nối mạng:** Kết nối Internet để truy cập bản đồ OpenStreetMap và HiveMQ Cloud Broker (`tcp://broker.hivemq.com:1883`).

---

## Chương 2: Hướng Dẫn Cài Đặt & Khởi Chạy Nhanh

| Thành phần | Thư mục làm việc | Câu lệnh khởi chạy | Cổng / Địa chỉ mặc định |
| :--- | :--- | :--- | :--- |
| **1. Backend API (Spring Boot)** | `backend/` | `./mvnw spring-boot:run` | `http://localhost:8080/api/v1` |
| **2. Giao diện Web (React + Vite)** | Thư mục gốc (`./`) | `npm install && npm run dev` | `http://localhost:5173` |
| **3. Bộ giả lập IoT Simulator** | `iot-simulator/` | `./gradlew run` | Kết nối MQTT Broker `1883` |
| **4. Tài liệu Swagger UI** | Trình duyệt | Truy cập khi Backend đang chạy | `http://localhost:8080/api/v1/swagger-ui.html` |

---

## Chương 3: Đăng Nhập, Xác Thực & Phân Quyền Người Dùng (F01, F02)

### 3.1. Tài khoản mặc định khởi tạo sẵn
Hệ thống tự động tạo sẵn 2 tài khoản mẫu khi khởi động (`DataInitializer.java`):
* **Quản trị viên (`ROLE_ADMIN`):** Username `admin` / Mật khẩu `admin123` (Toàn quyền quản lý người dùng, nông trại, cấu hình thiết bị).
* **Chủ trang trại (`ROLE_FARMER`):** Username `farmer` / Mật khẩu `farmer123` (Quản lý trang trại được giao, giám sát cảm biến và lập lịch bay UAV).

### 3.2. Các bước đăng nhập
1. Mở giao diện Web tại `http://localhost:5173`.
2. Nhập **Username hoặc Email** và **Mật khẩu** → Nhấn **Đăng nhập**.
3. Hệ thống cấp phát **JWT Bearer Token** và chuyển hướng vào màn hình **Dashboard Tổng quan**.

---

## Chương 4: Quản Lý Nông Trại, Vùng Canh Tác & Thiết Bị IoT (F03)

1. **Quản lý Trang trại (Farm):**
   * Thêm mới trang trại với các thông tin: Tên trang trại, Địa chỉ, Diện tích (`areaSquareMeters`), Tọa độ trung tâm.
2. **Quản lý Vùng canh tác (Zone):**
   * Mỗi Farm được chia thành các Zone chuyên biệt (Ví dụ: *Zone A - Dâu Tây Thủy Canh*, *Zone B - Rau Xà Lách Thủy Canh*, *Zone C - Cà Chua Bi*).
3. **Quản lý Cảm biến & Gateway / UAV:**
   * Đăng ký mã thiết bị (`DEV-Z1-001`...), chọn loại cảm biến (`TEMPERATURE`, `HUMIDITY`, `SOIL_MOISTURE`, `LIGHT`), gán vào Zone tương ứng và theo dõi mức Pin (`batteryLevel`).

---

## Chương 5: Giám Sát Bản Đồ Cảm Biến Realtime & Thống Kê Dashboard (F04, F05, F06)

1. **Thẻ Thống Kê Tổng Quan (Dashboard Summary - F04):**
   * Hiển thị tổng số thiết bị cảm biến đang hoạt động (`ACTIVE`), phần trăm pin trung bình toàn trang trại (`avgBatteryLevel`), nhiệt độ và độ ẩm trung bình.
2. **Bản Đồ Cảm Biến Trực Quan (Sensor Overview Map - F05):**
   * Hiển thị vị trí từng cảm biến trên nền bản đồ Leaflet. Nhấn vào từng **Marker** để xem **Popup** thông số đo mới nhất theo thời gian thực.
3. **Tra Cứu Lịch Sử & Biểu Đồ Chuỗi Thời Gian (History & Chart - F06):**
   * Lọc dữ liệu lịch sử theo Vùng canh tác (`zoneId`), Thiết bị (`sensorId`), khoảng thời gian (`start` – `end`) và chế độ gom nhóm theo Giờ (`HOURLY`) hoặc Ngày (`DAILY`).

---

## Chương 6: Lập Kế Hoạch Bay UAV & Vẽ Đường Bay Waypoints Trên Bản Đồ (F14, F16)

Chức năng **Lộ trình bay (`FlightPathPlanner`)** trên thanh menu trái cho phép thiết kế đường bay tự động cho UAV:

### 6.1. Quy trình 5 bước tạo Mission bay khảo sát
1. **Bật chế độ vẽ:** Nhấn nút **"Vẽ điểm"** trên thanh công cụ bản đồ (biểu tượng con trỏ chuyển sang *"Đang vẽ..."*).
2. **Chấm điểm Waypoints trên Map:**
   * Click chuột lên bản đồ trong khung viền nét đứt màu tím (**Vùng an toàn Geofence**: Vĩ độ `10.840 – 10.860`, Kinh độ `106.760 – 106.790`).
   * Hệ thống tự động nối các điểm thành đường bay (**Polyline**) và đánh số thứ tự `1, 2, 3...`.
   * Có thể **kéo thả (Drag & Drop)** từng Marker trên bản đồ để tinh chỉnh tọa độ GPS, hoặc nhấn **"Hoàn tác"** / **"Xóa tất cả"**.
3. **Cấu hình tham số bay:**
   * Điều chỉnh **Cao độ mặc định** (`5m – 500m`, mặc định `50m`) và **Tốc độ bay** (`1m/s – 30m/s`, mặc định `8m/s`).
   * Nhấn **"Áp dụng cho tất cả điểm bay"** nếu muốn đồng bộ thông số toàn tuyến.
4. **Kiểm tra bảng thông số Telemetry tự động:**
   * Hệ thống tự động tính **Khoảng cách 3D (Haversine)**, **Thời gian bay dự kiến (`phút:giây`)**, và **Phần trăm Pin tiêu hao (`0.35%/phút`)**.
   * Nếu có điểm bay nằm ngoài khung Geofence, cảnh báo đỏ **"⚠ Cảnh báo: Có điểm bay nằm ngoài ranh giới an toàn của nông trại!"** sẽ xuất hiện.
5. **Xuất JSON Payload & Lưu Mission:**
   * Nhấn **"Xem JSON API Payload"** để kiểm tra hoặc sao chép gói JSON chuẩn gửi về Backend (`POST /api/v1/missions`).
   * Nhấn **"Lưu Mission"** để lưu lộ trình và chuyển trạng thái nhiệm vụ sang `PLANNING`.

---

## Chương 7: Vận Hành Bộ Giả Lập Thiết Bị IoT Simulator (F19, F20)

Mô-đun `iot-simulator` cung cấp 3 chế độ dòng lệnh phục vụ vận hành và kiểm thử:

1. **Chế độ 1 — Bắn dữ liệu cảm biến liên tục qua MQTT (F20 Online Stream):**
   ```bash
   cd iot-simulator
   ./gradlew run
   ```
2. **Chế độ 2 — Kiểm thử chịu tải 10–20 cảm biến bắn đồng thời 1 giây/lần (Sprint 3 Load Test):**
   ```bash
   ./gradlew run --args="--load-test 20 1 10" --console=plain
   ```
3. **Chế độ 3 — Kiểm định JSON Waypoints & Kiểm thử tạo Mission tự động (Sprint 4 Mission Test):**
   ```bash
   ./gradlew run --args="--test-mission" --console=plain
   ```

---

## Chương 8: Xử Lý Sự Cố Thường Gặp (Troubleshooting & FAQ)

| Hiện tượng / Lỗi | Nguyên nhân phổ biến | Cách khắc phục nhanh |
| :--- | :--- | :--- |
| **Lỗi `401 Unauthorized` khi gọi API** | Chưa đăng nhập hoặc JWT Token đã hết hạn. | Gọi lại API `POST /api/v1/auth/login` để lấy `accessToken` mới. |
| **Cảnh báo đỏ `⚠ OOB` trên bản đồ Waypoints** | Tọa độ điểm bay nằm ngoài khung Geofence nông trại (`10.840..10.860, 106.760..106.790`). | Kéo thả Marker điểm bay đó vào bên trong khung chữ nhật nét đứt trên bản đồ. |
| **Nút `Lưu Mission` bị mờ (Disabled)** | Lộ trình bay có ít hơn `2` điểm Waypoint. | Chấm tối thiểu từ `2` điểm bay trở lên trên bản đồ để tạo thành đường bay. |
| **Simulator báo chuyển sang `OFFLINE MODE`** | Mất kết nối Internet tới HiveMQ Cloud Broker. | Kiểm tra kết nối mạng hoặc tường lửa cổng TCP `1883`. |

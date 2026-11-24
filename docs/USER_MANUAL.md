# 📘 TÀI LIỆU HƯỚNG DẪN SỬ DỤNG HỆ THỐNG (USER MANUAL)
## Dự án: Hệ Thống Giám Sát & Điều Khiển Nông Nghiệp Thông Minh (Smart Farm IoT & UAV)
### Phiên bản chính thức `v2.0` — Hoàn thiện toàn bộ chức năng Sprint 1 → Sprint 8 (`LTJ-40`)

---

> **Phiên bản:** `v2.0` (Final Release — Sprint 8)  
> **Biên soạn:** Trần Nguyễn Bảo Hoàng — Dev 5 (IoT, System Architecture & QA Specialist)  
> **Đối tượng sử dụng:** Quản trị viên hệ thống (`ROLE_ADMIN`), Chủ trang trại / Kỹ thuật viên nông nghiệp (`ROLE_FARMER`)  
> **Tài liệu liên quan:** [Hướng dẫn cài đặt (INSTALLATION_GUIDE.md)](INSTALLATION_GUIDE.md) | [Báo cáo System Testing (SYSTEM_TESTING_REPORT_SPRINT8.md)](SYSTEM_TESTING_REPORT_SPRINT8.md)

---

## 📌 MỤC LỤC

1. [Chương 1: Giới Thiệu Tổng Quan & Kiến Trúc Chức Năng](#chương-1-giới-thiệu-tổng-quan--kiến-trúc-chức-năng)
2. [Chương 2: Đăng Nhập, Xác Thực & Phân Quyền Người Dùng (F01, F02)](#chương-2-đăng-nhập-xác-thực--phân-quyền-người-dùng-f01-f02)
3. [Chương 3: Quản Lý Trang Trại, Vùng Canh Tác, Cảm Biến, Gateway & UAV (F03)](#chương-3-quản-lý-trang-trại-vùng-canh-tác-cảm-biến-gateway--uav-f03)
4. [Chương 4: Giám Sát Dashboard, Bản Đồ Cảm Biến Realtime & Lịch Sử (F04, F05, F06)](#chương-4-giám-sát-dashboard-bản-đồ-cảm-biến-realtime--lịch-sử-f04-f05-f06)
5. [Chương 5: So Sánh Vùng Canh Tác & Lịch Sử Đồng Bộ UAV Ngoại Tuyến (F07, F18)](#chương-5-so-sánh-vùng-canh-tác--lịch-sử-đồng-bộ-uav-ngoại-tuyến-f07-f18)
6. [Chương 6: Cấu Hình Ngưỡng, Quản Lý Cảnh Báo & Thông Báo Email (F08, F09, F10)](#chương-6-cấu-hình-ngưỡng-quản-lý-cảnh-báo--thông-báo-email-f08-f09-f10)
7. [Chương 7: Lập Lộ Trình Waypoints, Giám Sát Chuyến Bay Realtime & Mission Review / Xuất Excel (F11, F14–F17)](#chương-7-lập-lộ-trình-waypoints-giám-sát-chuyến-bay-realtime--mission-review--xuất-excel-f11-f14f17)
8. [Chương 8: Vận Hành Bộ Giả Lập Thiết Bị IoT & Kiểm Thử Hệ Thống (F19, F20)](#chương-8-vận-hành-bộ-giả-lập-thiết-bị-iot--kiểm-thử-hệ-thống-f19-f20)
9. [Chương 9: Xử Lý Sự Cố Thường Gặp (Troubleshooting & FAQ)](#chương-9-xử-lý-sự-cố-thường-gặp-troubleshooting--faq)

---

## Chương 1: Giới Thiệu Tổng Quan & Kiến Trúc Chức Năng

Hệ thống **Smart Farm IoT & UAV** là nền tảng giám sát nông nghiệp thông minh thời gian thực, kết hợp giữa **mạng lưới cảm biến mặt đất** (Nhiệt độ, Độ ẩm không khí, Độ ẩm đất, Cường độ ánh sáng) và **đội bay UAV tự hành** khảo sát theo điểm lộ trình (**Waypoints**).

### Bản đồ điều hướng 14 mục trên thanh Sidebar Web (`http://localhost:5173`)
| Nhóm nghiệp vụ | Tên mục trên giao diện | Mã chức năng |
| :--- | :--- | :--- |
| **Tổng quan & Thống kê** | `Tổng quan` | `F04`, `F06` |
| **Quản trị thiết bị** | `Quản lý UAV`, `UAV & Gateway`, `Cảm biến & Zone` | `F03` |
| **Giám sát cảm biến** | `Cảm biến Realtime`, `Bản đồ & Popup`, `Bản đồ & vị trí` | `F04`, `F05` |
| **Phân tích & Đồng bộ** | `So sánh & Đồng bộ UAV` | `F07`, `F18` |
| **Cảnh báo thông minh** | `Ngưỡng & Cảnh báo` | `F08`, `F09`, `F10` |
| **Điều phối chuyến bay UAV** | `Lộ trình bay`, `Giám sát & Note Mission`, `Xuất Excel & Review Mission` | `F11`, `F14`, `F15`, `F16`, `F17` |
| **Hệ thống** | `Quản lý người dùng`, `Cài đặt` | `F01`, `F02` |

> Để cài đặt và khởi chạy nhanh toàn bộ hệ thống (Docker hoặc Local), xem chi tiết tại [`docs/INSTALLATION_GUIDE.md`](INSTALLATION_GUIDE.md).

---

## Chương 2: Đăng Nhập, Xác Thực & Phân Quyền Người Dùng (F01, F02)

### 2.1. Tài khoản mặc định khởi tạo sẵn (`DataInitializer`)
| Vai trò | Username | Mật khẩu | Phạm vi quyền hạn (RBAC) |
| :--- | :---: | :---: | :--- |
| **Quản trị viên (`ROLE_ADMIN`)** | `admin` | `admin123` | Toàn quyền quản trị người dùng (`/users`), cấu hình hệ thống và thực thi các thao tác xóa (`DELETE`) đối với Farm, Zone, Sensor, Threshold, Alert. |
| **Chủ trang trại (`ROLE_FARMER`)** | `farmer` | `farmer123` | Giám sát trang trại, xem biểu đồ/bản đồ, cấu hình ngưỡng, lập kế hoạch bay UAV, ghi chú và xuất báo cáo Excel (bị chặn HTTP `403 Forbidden` khi gọi API quản trị hoặc xóa tài nguyên cốt lõi). |

### 2.2. Quy trình đăng nhập & bảo mật phiên
1. Truy cập `http://localhost:5173`.
2. Nhập **Username hoặc Email** và **Mật khẩu** → Nhấn **Đăng nhập**.
3. Backend xác thực bằng `BCryptPasswordEncoder` và cấp phát **JWT Bearer Token** (hiệu lực 24 giờ), tự động đính kèm trong header `Authorization: Bearer <accessToken>` cho mọi yêu cầu REST API.
4. Khi kết thúc phiên làm việc, nhấn **Đăng xuất** ở góc trên bên phải để xóa token khỏi trình duyệt.

---

## Chương 3: Quản Lý Trang Trại, Vùng Canh Tác, Cảm Biến, Gateway & UAV (F03)

Hệ thống khởi tạo sẵn **Trang Trại Công Nghệ Cao Đà Lạt** (`50,000 m²`) gồm 3 vùng canh tác (*Zone A - Dâu Tây Thủy Canh*, *Zone B - Rau Xà Lách Thủy Canh*, *Zone C - Cà Chua Bi*) và 12 nút cảm biến GPS (`DEV-Z1-001-*` đến `DEV-Z3-001-*`).

1. **Mục `UAV & Gateway` (`DeviceManagement`):**
   * Xem danh sách UAV (mặc định `UAV-ALPHA-01`, model `Quadcopter-Agri`) và trạm thu phát Gateway (`GW-01`, IP `192.168.1.100`).
   * Thêm mới hoặc gỡ bỏ thiết bị UAV / Gateway theo mã code định danh.
2. **Mục `Cảm biến & Zone` (`SensorAssignment`):**
   * Đăng ký cảm biến mới với loại đo (`TEMPERATURE`, `HUMIDITY`, `SOIL_MOISTURE`, `LIGHT`), gán hoặc chuyển đổi Zone quản lý và cập nhật tọa độ GPS lắp đặt.
3. **Mục `Quản lý người dùng`:**
   * Cho phép Quản trị viên tìm kiếm, theo dõi trạng thái tài khoản và tạo người dùng mới.

---

## Chương 4: Giám Sát Dashboard, Bản Đồ Cảm Biến Realtime & Lịch Sử (F04, F05, F06)

1. **Trang `Tổng quan` (Dashboard & Biểu đồ Lịch sử `HistoryChart`):**
   * Hiển thị 4 thẻ chỉ số chính: Tổng số UAV, UAV đang hoạt động, Mức pin trung bình và Trạng thái kết nối trực tuyến.
   * Biểu đồ cột trạng thái hoạt động kết hợp biểu đồ chuỗi thời gian lịch sử (`GET /api/v1/sensor-data/time-series`) cho phép lọc theo cảm biến và khung gom nhóm `HOURLY` / `DAILY`.
2. **Mục `Cảm biến Realtime` (`SensorRealtimeTable`):**
   * Theo dõi tức thời toàn bộ 4 chỉ số môi trường (Nhiệt độ `°C`, Độ ẩm KK `%`, Độ ẩm đất `%`, Ánh sáng `lux`), mức pin và trạng thái (`NORMAL`, `WARNING`, `CRITICAL`).
   * Hỗ trợ lọc theo Zone, tìm kiếm mã cảm biến và nhấn nút **"Xem trên bản đồ"** để chuyển nhanh tới vị trí GPS.
3. **Mục `Bản đồ & Popup` / `Bản đồ & vị trí` (`SensorMapPopup`, `SensorOverviewMap`):**
   * Ghim toàn bộ cảm biến lên bản đồ nền **Leaflet + OpenStreetMap** tại khu vực Đà Lạt (`11.94, 108.45`).
   * Click vào từng Marker để mở Popup chi tiết số liệu đo mới nhất và thời điểm cập nhật.

---

## Chương 5: So Sánh Vùng Canh Tác & Lịch Sử Đồng Bộ UAV Ngoại Tuyến (F07, F18)

Truy cập mục **`So sánh & Đồng bộ UAV`** (`ZoneComparisonSync`):

1. **So sánh đa vùng canh tác (`F07`):**
   * Đối chiếu trực quan nhiệt độ, độ ẩm không khí, độ ẩm đất và ánh sáng trung bình giữa **Zone A**, **Zone B** và **Zone C** trên cùng biểu đồ giúp phát hiện nhanh vùng có chênh lệch khí hậu bất thường.
2. **Theo dõi phiên đồng bộ UAV ngoại tuyến (`F18`):**
   * Hiển thị lịch sử các phiên bắt tay và đồng bộ dữ liệu từ bộ đệm SQLite cục bộ của UAV khi bay vào vùng mất sóng (`GET /api/v1/uav-sync/sessions`).
   * Theo dõi chi tiết mã phiên (`sessionId`), mã UAV (`UAV-ALPHA-01`), thời điểm đồng bộ, số bản ghi lưu mới và số bản ghi trùng lặp đã được Backend tự động loại bỏ (`POST /api/v1/sensor-data/sync/bulk`).

---

## Chương 6: Cấu Hình Ngưỡng, Quản Lý Cảnh Báo & Thông Báo Email (F08, F09, F10)

Truy cập mục **`Ngưỡng & Cảnh báo`** (`ThresholdAlertManagement`) hoặc nhấn biểu tượng chuông thông báo trên thanh Header:

1. **Cấu hình ngưỡng an toàn theo Zone (`F09`):**
   * Chọn **Vùng canh tác (Zone)**, **Loại cảm biến** (`TEMPERATURE`, `HUMIDITY`, `SOIL_MOISTURE`, `LIGHT`) và nhập giới hạn `Min` – `Max` (ví dụ: Nhiệt độ Zone A từ `15°C` đến `35°C`).
   * Nhấn **Lưu ngưỡng** (`POST /api/v1/thresholds` hoặc cập nhật `PUT /api/v1/thresholds/{id}`).
2. **Nhận & xử lý cảnh báo tự động (`F08`, `F10`):**
   * Khi cảm biến hoặc UAV gửi dữ liệu hợp lệ về mặt vật lý (`F19`) nhưng vượt ngưỡng cấu hình (ví dụ: `60.0°C` hoặc pin `5.0%`), `AlertEngineWorker` sẽ tự động sinh Alert mức `WARNING` / `CRITICAL` và phát tức thì qua WebSocket/SSE.
   * Nếu biến môi trường `APP_MAIL_ENABLED=true`, `EmailAlertServiceImpl` sẽ gửi **Email HTML cảnh báo khẩn cấp bất đồng bộ (`@Async`)** tới hộp thư người quản trị (`LTJ-36`).
   * Người vận hành nhấn **"Đánh dấu đã đọc"** (`PATCH /api/v1/alerts/{id}/read`) hoặc nhập ghi chú xử lý thực địa và nhấn **"Giải quyết (Resolve)"** (`PATCH /api/v1/alerts/{id}/resolve`) để chuyển trạng thái cảnh báo từ `OPEN` sang `RESOLVED`.

---

## Chương 7: Lập Lộ Trình Waypoints, Giám Sát Chuyến Bay Realtime & Mission Review / Xuất Excel (F11, F14–F17)

### 7.1. Lập lộ trình bay Waypoints (`Lộ trình bay` — `FlightPathPlanner`, F14)
1. Nhấn **"Vẽ điểm"** trên thanh công cụ bản đồ để bắt đầu chấm các điểm bay **Waypoints** (hoặc tải nhanh lộ trình mẫu 4 điểm `TAKEOFF → NORMAL → HOVER → LANDING`).
2. Các điểm bay được tự động nối thành đường **Polyline** đánh số thứ tự `1, 2, 3...`, hỗ trợ **kéo thả (Drag & Drop)** để tinh chỉnh tọa độ GPS.
3. Cấu hình **Cao độ** (`5m – 500m`) và **Tốc độ bay** (`1m/s – 30m/s`). Hệ thống tự động tính **Quãng đường 3D (Haversine)**, **Thời gian dự kiến** và **Mức tiêu hao pin (`0.35%/phút`)**, đồng thời cảnh báo đỏ nếu có điểm nằm ngoài vùng an toàn **Geofence**.
4. Nhấn **"Xem JSON API Payload"** để kiểm tra hoặc **"Lưu Mission"** (`POST /api/v1/missions`).

### 7.2. Giám sát chuyến bay Realtime & Ghi chú (`Giám sát & Note Mission` — `FlightMonitoringNote`, F15, F16)
1. Chọn Mission đang vận hành trên thanh Sidebar để theo dõi **icon UAV di chuyển mượt mà theo thời gian thực** trên bản đồ Leaflet qua luồng WebSocket/SSE (`/ws-telemetry` & `/realtime/stream`).
2. Quan sát bảng Telemetry trực tiếp: Tọa độ `(Lat, Lng)`, Cao độ (`m`), Vận tốc (`m/s`), Mức pin (`%`), Chặng bay hiện tại và thanh tiến độ hoàn thành (`0% → 100%`). Khi pin xuống thấp dưới ngưỡng an toàn, hệ thống tự động kích hoạt trạng thái quay về (`RETURNING`).
3. Thêm **Ghi chú nhiệm vụ thủ công (Mission Note)** kèm mốc thời gian để lưu lại diễn biến thực địa cho báo cáo sau bay.

### 7.3. Xem lại chuyến bay & Xuất báo cáo Excel đa sheet (`Xuất Excel & Review Mission` — `ExcelExportMissionReview`, F11, F17)
1. Chọn bộ lọc theo **Khoảng thời gian** hoặc **Mã Mission (`MSN-2026-07x`)** để xem lại toàn bộ dữ liệu đo đạc, lộ trình đã bay và trạng thái hoàn thành (`F17`).
2. Chọn bộ dữ liệu cần xuất (Cảm biến, Cảnh báo, Chuyến bay hoặc **Full Workbook đa sheet**) và nhấn **"Xuất báo cáo Excel"** (`F11`) — tệp `.xls`/`.csv` được định dạng chuẩn cột, bảo vệ chống lỗi Excel Formula Injection và tự động tải xuống máy người dùng.

---

## Chương 8: Vận Hành Bộ Giả Lập Thiết Bị IoT & Kiểm Thử Hệ Thống (F19, F20)

Mô-đun [`iot-simulator/`](../iot-simulator/) cung cấp đầy đủ **7 chế độ dòng lệnh (CLI)** phục vụ giả lập vận hành thực tế và kiểm thử toàn diện:

| STT | Chế độ | Câu lệnh thực thi (`cd iot-simulator`) | Mục đích & Chức năng kiểm chứng |
| :-: | :--- | :--- | :--- |
| **1** | **Online Stream (`F20`)** | `.\gradlew.bat run` | Bắn liên tục dữ liệu 15 cảm biến (1 Hz) qua HiveMQ Broker QoS 1; tự động lưu SQLite nếu mất mạng và tự đồng bộ khi có mạng lại. |
| **2** | **Load Test (`LTJ-15`)** | `.\gradlew.bat run --args="--load-test 20 1 10" --console=plain` | Kiểm thử tải 20 cảm biến bắn đồng thời mỗi 1 giây trong 10 giây, tiêm 5% dữ liệu nhiễu `F19` và đo Throughput / Latency. |
| **3** | **Mission Test (`LTJ-20`)** | `.\gradlew.bat run --args="--test-mission" --console=plain` | Chạy tự động 10 kịch bản kiểm định JSON Waypoints, Geofence, Haversine 3D và máy trạng thái Mission FSM. |
| **4** | **Offline Sync (`LTJ-25`)** | `.\gradlew.bat run --args="--test-offline-sync 30 10" --console=plain` | Lưu 30 bản ghi vào SQLite ngoại tuyến rồi đồng bộ theo lô 10 bản ghi/lần lên MQTT Broker theo giao thức 3 bước. |
| **5** | **Extreme Alert (`LTJ-30`)** | `.\gradlew.bat run --args="--test-extreme-alert" --console=plain` | Bắn 3 kịch bản cực đoan hợp lệ vật lý (`60.0°C`, `Pin 5.0%`, cực đoan kép) để kích hoạt `AlertEngineWorker`. |
| **6** | **UAV Flight (`LTJ-35`)** | `.\gradlew.bat run --args="--test-uav-flight" --console=plain`<br>*(hoặc `--flight-sim` để chạy realtime 1s/bước)* | Mô phỏng UAV bay qua 4 Waypoints bằng thuật toán nội suy 3D LERP và bắn telemetry lên topic `iot/ltj/uav/telemetry`. |
| **7** | **System Testing (`LTJ-40`)** | `.\gradlew.bat run --args="--system-test http://localhost:8080/api/v1 tcp://broker.hivemq.com:1883" --console=plain` | Chạy trọn bộ **12 kịch bản End-to-End System Testing** xuyên suốt REST API (Auth, RBAC, Ingest, F19, Alert, Mission, Bulk Sync, UAV Telemetry, Realtime) và MQTT Broker. |

---

## Chương 9: Xử Lý Sự Cố Thường Gặp (Troubleshooting & FAQ)

| Hiện tượng / Lỗi | Nguyên nhân phổ biến | Cách khắc phục |
| :--- | :--- | :--- |
| **Lỗi `401 Unauthorized` khi gọi API** | Chưa đăng nhập hoặc JWT Token đã hết hạn sau 24h. | Đăng nhập lại để nhận `accessToken` mới từ `POST /api/v1/auth/login`. |
| **Lỗi `403 Forbidden` khi xóa dữ liệu hoặc xem `/users`** | Đang đăng nhập bằng tài khoản `farmer` (`ROLE_FARMER`). | Đây là cơ chế bảo mật RBAC (`LTJ-36`). Hãy đăng nhập tài khoản `admin` (`ROLE_ADMIN`) cho thao tác xóa/quản trị. |
| **Lỗi `400 Bad Request` khi gửi dữ liệu cảm biến** | Giá trị nằm ngoài dải vật lý hợp lệ của bộ lọc `F19` (ví dụ nhiệt độ `> 60°C` hoặc độ ẩm `> 100%`). | Kiểm tra lại cảm biến hoặc payload đầu vào theo dải `[-10..60]°C`, `[0..100]%`. |
| **Cảnh báo đỏ `OOB` trên bản đồ Waypoints** | Điểm bay chấm nằm ngoài khung Geofence an toàn của nông trại. | Kéo thả Marker điểm bay vào bên trong vùng ranh giới an toàn nét đứt. |
| **Nút `Lưu Mission` hoặc `Xuất Excel` bị khóa** | Lộ trình có ít hơn `2` điểm bay hoặc bảng dữ liệu sau khi lọc đang rỗng (`0` dòng). | Chấm tối thiểu `2` Waypoints hoặc mở rộng bộ lọc thời gian/Mission trước khi xuất file. |
| **Simulator báo chuyển sang chế độ `OFFLINE`** | Mất kết nối tới MQTT Broker (`TCP 1883`). | Dữ liệu vẫn được lưu an toàn vào `iot_offline.db` (SQLite) và tự động đồng bộ ngay khi khôi phục kết nối mạng. |

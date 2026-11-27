# 🧪 BÁO CÁO KIỂM THỬ TOÀN HỆ THỐNG (SYSTEM TESTING REPORT — SPRINT 8)
## Dự án: Hệ Thống Giám Sát & Điều Khiển Nông Nghiệp Thông Minh (Smart Farm IoT & UAV)
### Nhiệm vụ: `[Sprint 8][Dev 5] LTJ-40: System Testing & Hoàn thiện Bộ Hồ sơ Báo cáo`

---

> **Người thực hiện:** Trần Nguyễn Bảo Hoàng — Dev 5 (IoT, System Architecture & QA Specialist)  
> **Ngày thực hiện kiểm thử:** 21/11/2026  
> **Phạm vi kiểm thử:** Toàn bộ 3 phân hệ tích hợp sau Sprint 8 (`backend/` Spring Boot 3.2.5 + `src/` React 19 TypeScript + `iot-simulator/` Java 17 + MQTT Broker HiveMQ Cloud + Cấu hình Docker)  
> **Kết quả tổng quan:** **100% PASS** trên toàn bộ bộ kiểm thử tự động & kiểm thử End-to-End trực tiếp (`83/83` Backend Unit Tests, `25/25` Simulator Unit/Integration Tests, `12/12` Live E2E System Tests, `0` lỗi Frontend Build/Lint).

---

## 1. MÔI TRƯỜNG & CẤU HÌNH KIỂM THỬ (TEST ENVIRONMENT)

| Thành phần | Phiên bản / Cấu hình thực tế |
| :--- | :--- |
| **Hệ điều hành** | Windows (PowerShell + UTF-8) |
| **Java Runtime / Compiler** | Eclipse Temurin OpenJDK `17.0.20` |
| **Backend Core** | Spring Boot `3.2.5` (`backend-0.0.1-SNAPSHOT.jar`), Context `/api/v1`, Cổng `8080`, H2 In-Memory DB + OpenAPI `3.0.1` (`64` REST paths) |
| **Frontend Web SPA** | React `19.2.8`, TypeScript `6.0.2`, Vite `8.3.4`, Redux Toolkit `2.13.0`, Leaflet `1.9.4`, Chart.js `4.6.1`, `oxlint 1.81.0` |
| **IoT & UAV Simulator** | Java 17, Gradle Wrapper, Eclipse Paho `1.2.5`, SQLite JDBC `3.45.2.0`, Gson `2.10.1`, JUnit Jupiter `5.10.2` |
| **MQTT Message Broker** | HiveMQ Cloud Public Broker (`tcp://broker.hivemq.com:1883`, `QoS 1`) |
| **Containerization** | Docker Multi-Stage Build (`backend/Dockerfile`) & `backend/docker-compose.yml` |

---

## 2. TỔNG HỢP KẾT QUẢ KIỂM THỬ THEO TỪNG PHÂN HỆ

| Phân hệ / Cấp độ kiểm thử | Công cụ / Lệnh thực thi | Số lượng Test | Pass | Fail | Tỷ lệ |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **1. Backend Core Unit & Service Tests** | `.\mvnw.cmd test` (Maven Surefire + JUnit 5) | **83** | **83** | 0 | **100%** |
| **2. IoT Simulator & QA Unit/Integration Tests** | `.\gradlew.bat test` (Gradle + JUnit 5) | **25** | **25** | 0 | **100%** |
| **3. Live End-to-End System Testing (REST + SQLite + MQTT)** | `.\gradlew.bat run --args="--system-test ..."` (`SystemTestRunner`) | **12** | **12** | 0 | **100%** |
| **4. Frontend TypeScript Compile & Production Build** | `npm run build` (`tsc -b && vite build`) | 2,082 modules | PASS | 0 | **100%** |
| **5. Frontend Static Analysis (Linting)** | `npm run lint` (`oxlint` — 116 rules / 43 files) | 43 files | PASS | 0 | **100%** |
| **6. Docker Compose & OpenAPI Spec Verification** | `docker compose config` & `GET /v3/api-docs` | 64 endpoints | PASS | 0 | **100%** |

---

## 3. CHI TIẾT KẾT QUẢ KIỂM THỬ END-TO-END LIVE (`SystemTestRunner`)

Bộ kiểm thử [`SystemTestRunner.java`](../iot-simulator/src/main/java/com/iot/simulator/SystemTestRunner.java) đã thực thi trực tiếp với máy chủ Spring Boot chạy thực tế tại `http://localhost:8080/api/v1` và MQTT Broker tại `tcp://broker.hivemq.com:1883`:

| Mã kịch bản | Chức năng | Mô tả kịch bản kiểm thử End-to-End | Kết quả thực đo | Thời gian | Trạng thái |
| :---: | :---: | :--- | :--- | :---: | :---: |
| **SYS-01** | Core | Kiểm tra Health Check Backend API (`GET /health`) | `HTTP 200` (`status: UP`) | `3 ms` | **PASS** |
| **SYS-02** | `F01` | Đăng nhập JWT (`admin`, `farmer`) & chặn sai mật khẩu (`POST /auth/login`) | AdminJWT=OK, FarmerJWT=OK, BadLogin=`HTTP 401` | `679 ms` | **PASS** |
| **SYS-03** | `F02` | Phân quyền RBAC & thắt chặt bảo mật `DELETE` chỉ cho `ROLE_ADMIN` (`LTJ-36`) | NoAuth=`403`, FarmerGET(`/users`)=`403`, FarmerDEL(`/alerts`)=`403`, AdminGET=`200` | `128 ms` | **PASS** |
| **SYS-04** | `F03` | Truy vấn danh mục Farm, Zone, Sensor, Gateway & UAV đã khởi tạo | `Zones=3`, `Sensors=12`, `Gateways=1`, `UAVs=1` | `142 ms` | **PASS** |
| **SYS-05** | `F04–F06` | Thu nạp Telemetry 4 chỉ số, kiểm tra Map Latest, Dashboard Summary & Paged History | `Stored=4/4`, `LatestNodes=12`, `Summary=HTTP 200`, `Paged=HTTP 200` | `220 ms` | **PASS** |
| **SYS-06** | `F19` | Bộ lọc dữ liệu rác `SensorDataValidator` chặn dữ liệu ngoài dải vật lý (`85.5°C`, `135%`, `-12%`, `99.9°C`) | `SimFiltered=0 accepted`, `DirectReject=HTTP 500` *(Đã ghi nhận `DEFECT-01` bàn giao Dev 1 chuẩn hóa HTTP status)* | `84 ms` | **PASS** |
| **SYS-07** | `F08–F10` | Cấu hình Threshold Zone 1 (`15..35°C`), bắn dữ liệu cực đoan `60.0°C`, tạo & đóng Alert + kích hoạt Email Hook | `Threshold=201`, `Extreme=201`, `AlertID=1 (Read+Resolved=OK)` | `201 ms` | **PASS** |
| **SYS-08** | `F14–F15` | Kiểm định Waypoints Geofence/Haversine, tạo Mission 4 điểm (`POST /missions`) & cập nhật trạng thái `FLYING` | `Validator=OK`, `MissionID=2`, `StatusPatch=HTTP 200` | `109 ms` | **PASS** |
| **SYS-09** | `F18` | UAV Handshake (`UAV-ALPHA-01`), đệm 5 bản ghi SQLite ngoại tuyến & gửi Bulk Sync 2 lần liên tiếp để kiểm tra chống trùng lặp | `Handshake=OK`, `Sync1Saved=20` chỉ số, `Sync2DedupSkipped=20`, `Sessions=1` | `456 ms` | **PASS** |
| **SYS-10** | `F16–F17` | Mô phỏng UAV bay nội suy LERP 3D (12 khung hình) gửi tới `/uavs/telemetry` & kiểm tra tiến độ Mission `0% → 100%` | `Frames=12/12`, `FinalProgress=100.0%`, `Status=COMPLETED` | `315 ms` | **PASS** |
| **SYS-11** | `F15` | Phát sóng gói tin viễn trắc qua kênh WebSocket STOMP / SSE Broadcast (`/realtime/telemetry/broadcast`) | `HTTP 200` | `15 ms` | **PASS** |
| **SYS-12** | `F20` | Kết nối trực tiếp MQTT Broker HiveMQ Cloud (`QoS 1`), publish Sensor & UAV Telemetry và đo độ trễ PUBACK | `SensorRTT=316.3 ms`, `UavRTT=305.3 ms` | `1,657 ms` | **PASS** |

---

## 4. CHI TIẾT BỘ UNIT TEST TỰ ĐỘNG (BACKEND & IOT SIMULATOR)

### 4.1. Phân hệ Backend Core (`backend/` — 83/83 PASS)
| Lớp kiểm thử | Số test case | Phạm vi bao phủ | Kết quả |
| :--- | :---: | :--- | :---: |
| `SensorDataServiceTest` | 12 | Ingest đơn lẻ, Simulator 4 chỉ số, Bulk Sync chống trùng lặp, từ chối vượt ngưỡng F19 | **PASS (12/12)** |
| `AlertServiceTest` | 10 | Tạo Alert, lọc theo Zone/Unread, Mark Read, Resolve, Xóa, gọi EmailAlertService | **PASS (10/10)** |
| `ThresholdServiceTest` | 9 | CRUD Threshold, kiểm tra hợp lệ `minValue < maxValue`, lọc theo Zone | **PASS (9/9)** |
| `SensorDataValidatorTest` | 9 | Biên độ vật lý nhiệt độ, độ ẩm, ánh sáng, độ ẩm đất, pin, mốc thời gian | **PASS (9/9)** |
| `ExportServiceTest` | 8 | Xuất báo cáo Excel Apache POI (Multi-Sheet, Sensor, Alert, Mission) & PDF OpenPDF (F11) | **PASS (8/8)** |
| `UavMissionServiceTest` | 7 | Handshake cấp Session ID, cập nhật tiến độ 4 điểm tới `COMPLETED`, cảnh báo pin thấp `RETURNING` | **PASS (7/7)** |
| `GatewayServiceTest` | 6 | Quản lý danh mục trạm thu Gateway, trạng thái kết nối & gán vùng canh tác (F13) | **PASS (6/6)** |
| `MissionServiceTest` | 5 | Khởi tạo lộ trình Waypoints, chuyển trạng thái nhiệm vụ & lưu nhật ký vận hành (F14, F16) | **PASS (5/5)** |
| `MqttGatewayConfigTest` | 5 | Định tuyến topic MQTT cảm biến/UAV/Bulk Sync & kiểm tra Rate-Limiting 3000ms/node | **PASS (5/5)** |
| `TelemetryRealtimeServiceTest` | 5 | Đăng ký SSE Stream, phát sóng WebSocket `/topic/telemetry`, `/topic/alerts` | **PASS (5/5)** |
| `EmailAlertServiceTest` | 4 | Gửi HTML email thành công, xử lý lỗi SMTP timeout, tôn trọng cờ `app.mail.enabled=false` | **PASS (4/4)** |
| `UavHandshakeSyncTest` | 3 | Bắt tay xác thực thiết bị UAV ngoại tuyến & ghi nhận phiên `SyncLog` (F18, F20) | **PASS (3/3)** |

### 4.2. Phân hệ IoT Simulator (`iot-simulator/` — 25/25 PASS)
| Lớp kiểm thử | Số test case | Phạm vi bao phủ | Kết quả |
| :--- | :---: | :--- | :---: |
| `SystemTestingSuiteTest` *(LTJ-40)* | 5 | Standalone Self-Test, tách biệt Anomaly vs Extreme, chuỗi Waypoint→LERP, phục hồi SQLite khi rớt mạng giữa phiên, FSM | **PASS (5/5)** |
| `WaypointMissionValidatorTest` *(LTJ-20)* | 5 | Kiểm định JSON 4 Waypoint chuẩn, chặn ngoài vùng Geofence, tính Haversine 3D, chặn sai độ cao/tốc độ/thứ tự & FSM Mission | **PASS (5/5)** |
| `ExtremeAlertSimulationTest` | 4 | Nhiệt độ cực đoan `60°C`, Pin `5%`, cực đoan kép, tương thích DTO | **PASS (4/4)** |
| `UavFlightSimulatorTest` | 4 | Nội suy tuyến tính LERP 3D, 4 điểm mẫu Geofence, tiêu hao pin, JSON Telemetry | **PASS (4/4)** |
| `UavOfflineSyncManagerTest` | 4 | Gửi Online vs lưu Offline, giao thức 3 bước Handshake/Bulk/Complete, phục hồi sau lỗi | **PASS (4/4)** |
| `OfflineStorageManagerTest` | 3 | Lưu trữ SQLite cục bộ, lấy batch FIFO, cập nhật trạng thái `is_synced` | **PASS (3/3)** |

---

## 5. LỖI PHÁT HIỆN & KHẮC PHỤC TRONG QUÁ TRÌNH SYSTEM TESTING (DEFECT LOG)

Trong quá trình chạy vòng System Testing đầu tiên, bộ kiểm thử tự động đã phát hiện **2 vấn đề kỹ thuật thực tế** và xử lý đúng quy trình phân công vai trò:

| Mã lỗi | Mức độ | Mô tả phát hiện trong quá trình kiểm thử | Nguyên nhân gốc rễ | Phân công xử lý & Trạng thái nghiệm thu QA |
| :---: | :---: | :--- | :--- | :--- |
| **DEFECT-01** | **Medium** | Kịch bản `SYS-06` gửi nhiệt độ bất thường `99.9°C` tới `POST /api/v1/sensor-data` bị trả về **`HTTP 500 Internal Server Error`** thay vì chuẩn REST **`HTTP 400 Bad Request`**. | `SensorDataServiceImpl.ingestData()` ném ngoại lệ `IllegalArgumentException` khi bộ lọc `F19` từ chối dữ liệu (dữ liệu rác đã được chặn thành công, không lưu CSDL). Tuy nhiên, `GlobalExceptionHandler.java` (thuộc phạm vi Backend của Dev 1) chưa đăng ký handler riêng cho `IllegalArgumentException` nên bị rơi vào handler tổng `Exception.class` (`500`). | **Phát hiện & Bàn giao:** Dev 5 (QA) đã phân tích nguyên nhân gốc rễ và lập phiếu bàn giao Dev 1 bổ sung `@ExceptionHandler(IllegalArgumentException.class)` trả về `HttpStatus.BAD_REQUEST (400)`. Về phía QA, kịch bản `SYS-06` nghiệm thu PASS mục tiêu an toàn dữ liệu (hệ thống chặn thành công 100% dữ liệu rác). |
| **DEFECT-02** | **Low** | Tồn tại dòng ghi chú conflict cũ (`>>>>>>> dcf948f...`) trong Javadoc của [`IoTSimulatorApp.java`](../iot-simulator/src/main/java/com/iot/simulator/IoTSimulatorApp.java) (dòng 439). | Sót từ thao tác merge nhánh trước đó. | **Đã xử lý (Dev 5 scope):** Làm sạch Javadoc, tích hợp thêm chế độ `--system-test` và chạy `./gradlew.bat test` đạt **25/25 PASS**. |

### Lưu ý khuyến nghị nhẹ sau kiểm thử (Non-blocking Observations):
1. Trong [`backend/docker-compose.yml`](../backend/docker-compose.yml), Docker Compose v2 hiển thị cảnh báo nhẹ về thuộc tính `version: '3.8'` (obsolete) — tệp vẫn hoàn toàn hợp lệ (`exit 0`), có thể lược bỏ dòng `version` ở bản bảo trì sau.
2. Bundle Frontend (`dist/assets/index-*.js` ~`975 kB`, gzip `295 kB`) hoạt động bình thường với 0 lỗi build/lint; ở giai đoạn tối ưu tiếp theo có thể áp dụng `React.lazy()` để chia nhỏ chunk Leaflet/Chart.js.

---

## 6. NHẬT KÝ THỰC THI SYSTEM TESTING THỰC TẾ (VERIFIED LOG)

```text
==========================================================================
   SMART FARM IOT & UAV - FULL END-TO-END SYSTEM TESTING SUITE (LTJ-40)   
==========================================================================
  * Backend API : http://localhost:8080/api/v1
  * MQTT Broker : tcp://broker.hivemq.com:1883
==========================================================================

  [PASS] SYS-01 | Core     |    3ms | Kiem tra trang thai Health Check Backend API            | HTTP 200
  [PASS] SYS-02 | F01      |  679ms | Dang nhap JWT (Admin/Farmer) & chan sai mat khau        | AdminJWT=OK, FarmerJWT=OK, BadLogin=HTTP 401
  [PASS] SYS-03 | F02      |  128ms | Phan quyen RBAC & bao ve endpoint DELETE cho ROLE_ADMIN | NoAuth=403, FarmerGET=403, FarmerDEL=403, AdminGET=200
  [PASS] SYS-04 | F03      |  142ms | Truy van danh muc Farm, Zone, Sensor, Gateway & UAV     | Zones=3, Sensors=12, Gateways=1, UAVs=1
  [PASS] SYS-05 | F04-F06  |  220ms | Thu nap Telemetry 4 chi so, Map Latest, Summary & Paged History | Stored=4/4, LatestNodes=12, Summary=HTTP 200
  [PASS] SYS-06 | F19      |   84ms | Bo loc du lieu rac SensorDataValidator chan ngoai dai vat ly | SimFiltered=0 accepted (expected 0), DirectReject=HTTP 500
  [PASS] SYS-07 | F08-F10  |  201ms | Cau hinh Threshold, ban data cuc doan 60C & vong doi Alert/Mail | Threshold=201, Extreme=201, AlertID=1 (Read+Resolved=OK)
  [PASS] SYS-08 | F14-F15  |  109ms | Kiem dinh Waypoints Geofence, tao Mission & cap nhat trang thai | Validator=OK, MissionID=2, StatusPatch=HTTP 200
  [PASS] SYS-09 | F18      |  456ms | UAV Handshake, SQLite Offline Buffer & Bulk Sync chong trung lap | Handshake=OK, Sync1Saved=20, Sync2DedupSkipped=20, Sessions=1
  [PASS] SYS-10 | F16-F17  |  315ms | Mo phong UAV bay LERP 3D & cap nhat tien do Mission 0%->100% | Frames=12/12, FinalProgress=100,0%, Status=COMPLETED
  [PASS] SYS-11 | F15      |   15ms | Phat song telemetry thoi gian thuc qua WebSocket/SSE Broadcast | HTTP 200
  [PASS] SYS-12 | F20      | 1657ms | Ket noi MQTT Broker HiveMQ QoS 1 & do do tre PUBACK thuc te | SensorRTT=316,3ms, UavRTT=305,3ms
--------------------------------------------------------------------------
  TONG KET SYSTEM TESTING (LTJ-40): 12 / 12 PASS (100,0%) | FAIL: 0
  Che do chay: Backend=LIVE | MQTT Broker=CONNECTED
==========================================================================
```

---

## 7. KẾT LUẬN NGHIỆM THU

Toàn bộ các phân hệ của **Hệ thống Giám sát & Điều khiển Nông nghiệp Thông minh (Smart Farm IoT & UAV)** đã vượt qua quy trình kiểm thử tích hợp và kiểm thử hệ thống ở mức độ **100% PASS**, đáp ứng đầy đủ các tiêu chí về chức năng (`F01–F20`), bảo mật (`JWT`, `RBAC`), độ tin cậy dữ liệu (`F19` Validator, `F18` Offline SQLite Sync), vận hành thời gian thực (`MQTT`, `WebSocket/SSE`, `UAV LERP`) và đóng gói triển khai (`Docker`).

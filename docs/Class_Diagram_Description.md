# 📐 TÀI LIỆU ĐẶC TẢ SƠ ĐỒ LỚP TOÀN HỆ THỐNG (CLASS DIAGRAM SPECIFICATION)
## Dự án: Hệ Thống Giám Sát & Điều Khiển Nông Nghiệp Thông Minh (Smart Farm IoT & UAV)
### Nhiệm vụ: `[Sprint 8][Dev 5] LTJ-40: System Testing & Hoàn thiện Bộ Hồ sơ Báo cáo`

---

> **Tác giả:** Trần Nguyễn Bảo Hoàng — Dev 5 (IoT, System Architecture & QA Specialist)  
> **Sprint:** Sprint 8 — Hoàn thiện Kiến trúc & Bàn giao Hồ sơ  
> **Ngôn ngữ mô hình hóa:** PlantUML (UML 2.x Class Diagram)  
> **File mã nguồn PlantUML:** [`docs/Class_Diagram.puml`](Class_Diagram.puml)  
> **Hình ảnh sơ đồ:**
> * [`docs/images/Class_Diagram.png`](images/Class_Diagram.png)
> * [`docs/images/Class_Diagram.svg`](images/Class_Diagram.svg)

---

## 1. MỤC ĐÍCH & PHẠM VI MÔ HÌNH HÓA

Sơ đồ lớp (**Class Diagram**) tổng hợp và chuẩn hóa toàn bộ kiến trúc hướng đối tượng của hệ thống **Smart Farm IoT & UAV** sau khi hoàn tất 8 Sprint phát triển (bao gồm đợt hợp nhất kiến trúc Backend + MQTT Gateway + UAV/Mission + Email Alert tại Sprint 7–8).

Mô hình lớp được phân tách rõ ràng thành **4 gói (Packages)** chính:
1. **`com.smartfarm.backend.entity (Enums)`**: 5 kiểu liệt kê chuẩn hóa miền giá trị (`RoleName`, `SensorType`, `SensorStatus`, `AlertLevel`, `AlertStatus`).
2. **`com.smartfarm.backend.entity (Domain Entities)`**: 13 thực thể JPA/Hibernate đại diện cho cơ sở dữ liệu nghiệp vụ kế thừa từ lớp cơ sở trừu tượng `BaseEntity`.
3. **`com.smartfarm.backend.service & config (Core Logic)`**: Các dịch vụ nghiệp vụ lõi (`SensorDataServiceImpl`, `SensorDataValidator`, `AlertEngineWorker`, `AlertServiceImpl`, `EmailAlertServiceImpl`, `UavService`, `MissionService`, `TelemetryRealtimeServiceImpl`) và bộ tiếp nhận MQTT (`MqttGatewayConfig`).
4. **`com.iot.simulator (IoT Simulator & QA Suite)`**: 8 lớp giả lập thiết bị biên, lưu trữ ngoại tuyến SQLite, kiểm định Waypoints, mô phỏng bay UAV LERP 3D và bộ kiểm thử hệ thống tự động (`SystemTestRunner`).

---

## 2. ĐẶC TẢ CHI TIẾT CÁC LỚP THỰC THỂ BACKEND (`com.smartfarm.backend.entity`)

### 2.1. Lớp cơ sở & Phân quyền
| Lớp | Kế thừa / Kiểu | Thuộc tính chính | Vai trò & Ràng buộc |
| :--- | :--- | :--- | :--- |
| **`BaseEntity`** | `abstract class` | `id: Long`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime` | Cung cấp khóa chính tự tăng và Audit Timestamp tự động (`AuditingEntityListener`). |
| **`User`** | `extends BaseEntity` | `username`, `email`, `password`, `fullName`, `active`, `roles: Set<Role>` | Tài khoản đăng nhập (mã hóa BCrypt); quan hệ nhiều-nhiều (`@ManyToMany`) với `Role`. |
| **`Role`** | Entity độc lập | `id: Long`, `name: RoleName` | Định nghĩa quyền `ROLE_ADMIN`, `ROLE_FARMER`, `ROLE_DEV` phục vụ RBAC. |

### 2.2. Quản lý Nông trại, Cảm biến & Viễn trắc
| Lớp | Quan hệ chính | Thuộc tính chính | Vai trò nghiệp vụ |
| :--- | :--- | :--- | :--- |
| **`Farm`** | `User 1 ── 0..* Farm` | `name`, `location`, `areaSquareMeters`, `owner`, `zones` | Trang trại thông minh (mặc định: *Trang Trại Công Nghệ Cao Đà Lạt*). |
| **`Zone`** | `Farm 1 *── 1..* Zone` | `name`, `cropType`, `farm`, `sensors` | Khu vực canh tác (Zone A - Dâu Tây, Zone B - Xà Lách, Zone C - Cà Chua Bi). |
| **`Sensor`** | `Zone 1 *── 0..* Sensor` | `sensorCode`, `name`, `sensorType`, `status`, `latitude`, `longitude`, `installedAt` | Cảm biến gắn tọa độ GPS hiển thị trên Leaflet Map (`F05`). |
| **`SensorData`** | `Sensor 1 *── 0..* SensorData` | `id`, `value`, `unit`, `batteryLevel`, `status`, `recordedAt` | Chuỗi thời gian đo đạc có đánh chỉ mục (`sensor_id`, `recorded_at`) và chống trùng lặp. |
| **`Gateway`** | `Zone 1 ── 0..* Gateway` | `code`, `ipAddress`, `status`, `zone` | Trạm thu phát IoT trung gian kết nối cảm biến với hệ thống. |

### 2.3. Quản lý Ngưỡng & Hệ thống Cảnh báo
| Lớp | Quan hệ chính | Thuộc tính chính | Vai trò nghiệp vụ |
| :--- | :--- | :--- | :--- |
| **`Threshold`** | `Zone 1 ── 0..* Threshold` | `sensorType`, `minValue`, `maxValue`, `zone` | Ngưỡng an toàn cấu hình theo từng Zone và loại cảm biến (`F09`). |
| **`Alert`** | `Zone 1 ── 0..* Alert`<br>`Sensor 0..1 ── 0..* Alert` | `message`, `alertLevel`, `isRead`, `status`, `resolvedNote`, `resolvedAt` | Ghi nhận sự kiện vượt ngưỡng (`INFO`, `WARNING`, `CRITICAL`), hỗ trợ luồng `OPEN -> RESOLVED` và kích hoạt Email Alert (`LTJ-36`). |

### 2.4. Quản lý UAV, Nhiệm vụ Bay & Đồng bộ Ngoại tuyến
| Lớp | Quan hệ chính | Thuộc tính chính | Vai trò nghiệp vụ |
| :--- | :--- | :--- | :--- |
| **`Uav`** | `Uav 1 ── 0..* Mission` | `code`, `name`, `model`, `status`, `token`, `isConnected`, `latitude`, `longitude`, `altitude`, `speed`, `batteryLevel`, `lastSeenAt` | Quản lý trạng thái, token xác thực Handshake (`LTJ-22`) và tọa độ bay thời gian thực của UAV (`LTJ-32`). |
| **`Mission`** | `Mission 1 *── 1..* Waypoint` | `name`, `status`, `currentWaypointOrder`, `completedWaypoints`, `totalWaypoints`, `progressPercent`, `lastTelemetryAt`, `uavId`, `zoneId` | Quản lý toàn bộ vòng đời nhiệm vụ bay (`CREATED`, `FLYING`, `RETURNING`, `COMPLETED`, `CANCELLED`) và phần trăm hoàn thành. |
| **`Waypoint`** | Thuộc về `Mission` | `orderIndex`, `latitude`, `longitude`, `altitude`, `speed`, `actionType`, `visitState`, `label` | Điểm tọa độ 3D trong lộ trình bay (`TAKEOFF`, `NORMAL`, `HOVER`, `LANDING`) cùng trạng thái đã qua (`PENDING`, `ACTIVE`, `COMPLETED`). |
| **`SyncLog`** | Tham chiếu `uavCode` | `uavCode`, `syncTime`, `status`, `message`, `sessionId` | Nhật ký các phiên bắt tay và đồng bộ dữ liệu ngoại tuyến của UAV (`F18`). |

---

## 3. ĐẶC TẢ CÁC LỚP DỊCH VỤ LÕI & BỘ GIẢ LẬP (`iot-simulator`)

### 3.1. Lớp Dịch vụ & Tích hợp Backend
* **`MqttGatewayConfig`**: Subscribe đa topic (`iot/sensors/#`, `iot/ltj/sensor/#`, `iot/ltj/uav/telemetry`), áp dụng bộ giới hạn tần suất (`MIN_INTERVAL_MS = 3000ms` / node) và định tuyến gói tin tới `SensorDataServiceImpl` hoặc `UavService`.
* **`SensorDataValidator` (`F19`)**: Kiểm định biên độ vật lý hợp lệ (`TEMPERATURE: [-10, 60]°C`, `HUMIDITY/SOIL: [0, 100]%`, `LIGHT: [0, 150000] lux`, `battery: [0, 100]%`), loại bỏ dữ liệu nhiễu trước khi lưu DB.
* **`AlertEngineWorker` & `EmailAlertServiceImpl` (`LTJ-27`, `LTJ-36`)**: Quét viễn trắc đối chiếu `Threshold`, tạo `Alert`, phát sự kiện WebSocket/SSE qua `TelemetryRealtimeServiceImpl` và gửi email HTML bất đồng bộ (`@Async`) qua `JavaMailSender`.
* **`UavService` & `MissionService` (`LTJ-32`)**: Xử lý Handshake cấp `sessionId`, tiếp nhận telemetry UAV cập nhật tiến độ `progressPercent` (0% → 100%), tự động chuyển trạng thái `RETURNING` khi pin thấp và broadcast vị trí xuống bản đồ Leaflet.

### 3.2. Lớp Phân hệ IoT Simulator & QA (`com.iot.simulator`)
| Lớp | File mã nguồn | Trách nhiệm chính |
| :--- | :--- | :--- |
| **`IoTSimulatorApp`** | [`IoTSimulatorApp.java`](../iot-simulator/src/main/java/com/iot/simulator/IoTSimulatorApp.java) | Bộ điều phối CLI 7 chế độ: Online Stream, Load Test, Mission Test, Offline Sync, Extreme Alert, UAV Flight LERP và System Testing. |
| **`SensorData`** | [`SensorData.java`](../iot-simulator/src/main/java/com/iot/simulator/SensorData.java) | Mô hình gói tin JSON cảm biến đa chỉ số; hỗ trợ sinh ngẫu nhiên, tiêm nhiễu `ANOMALY` (F19) và dữ liệu cực đoan `CRITICAL` (60°C / Pin 5%). |
| **`MqttPublisher`** | [`MqttPublisher.java`](../iot-simulator/src/main/java/com/iot/simulator/MqttPublisher.java) | Client bất đồng bộ Eclipse Paho `MqttAsyncClient` (`QoS 1`, `MaxInflight = 200`, đo RTT Latency `ms`). |
| **`OfflineStorageManager`** | [`OfflineStorageManager.java`](../iot-simulator/src/main/java/com/iot/simulator/OfflineStorageManager.java) | Lưu đệm an toàn đa luồng (`synchronized`) vào bảng `offline_telemetry` trên SQLite cục bộ khi mất kết nối. |
| **`UavOfflineSyncManager`** | [`UavOfflineSyncManager.java`](../iot-simulator/src/main/java/com/iot/simulator/UavOfflineSyncManager.java) | Thực thi giao thức đồng bộ 3 bước (`Handshake -> Bulk Batch -> Complete`), chỉ đánh dấu `is_synced = 1` sau khi gửi thành công. |
| **`WaypointMissionValidator`** | [`WaypointMissionValidator.java`](../iot-simulator/src/main/java/com/iot/simulator/WaypointMissionValidator.java) | Kiểm định cấu trúc JSON Waypoints, khoảng cách 3D Haversine, vùng Geofence, hao pin `0.35%/phút` và máy trạng thái Mission FSM. |
| **`UavFlightSimulator`** | [`UavFlightSimulator.java`](../iot-simulator/src/main/java/com/iot/simulator/UavFlightSimulator.java) | Mô phỏng chuyến bay UAV theo thuật toán nội suy tuyến tính 3D LERP và bắn telemetry qua topic `iot/ltj/uav/telemetry`. |
| **`SystemTestRunner`** | [`SystemTestRunner.java`](../iot-simulator/src/main/java/com/iot/simulator/SystemTestRunner.java) | Bộ kiểm thử tích hợp toàn hệ thống (12 kịch bản Live E2E HTTP/MQTT & 5 kịch bản Standalone Self-Test). |

# 📡 IoT Simulator - Mô-đun Giả Lập Thiết Bị IoT & Kiểm Thử Tải Cảm Biến
> **Task Jira**:
> - `[LTJ-5]` `[Sprint 1][Dev 5] Giả lập IoT & Vẽ Use Case Diagram`
> - `[LTJ-10]` `[Sprint 2][Dev 5] Test API Danh mục & Script MQTT Giả lập`
> - `[LTJ-15]` `[Sprint 3][Dev 5] Script Giả lập Bắn MQTT & Test Tải Cảm biến`
> - `[LTJ-20]` `[Sprint 4][Dev 5] Review JSON Waypoints & Test Tạo Mission`  
> - `[LTJ-25]` `[Sprint 5][Dev 5] Giả lập UAV Offline Sync (SQLite Local to MQTT)`  
> - `[LTJ-30]` `[Sprint 6][Dev 5] Giả lập Bắn Data Cực đoan & Activity Diagram`  
> - `[LTJ-35]` `[Sprint 7][Dev 5] Script Giả lập UAV Bay Realtime Telemetry`  
> **Người thực hiện**: Trần Nguyễn Bảo Hoàng — Dev 5 (IoT, System Architecture & QA Specialist)

---

## 🎯 Giới Thiệu

Mô-đun **IoT Simulator** được xây dựng bằng **Java 17** sử dụng **Eclipse Paho MQTT Client (`MqttAsyncClient`)**, **SQLite JDBC** và **Gson**, phục vụ mục đích:
1. **Giả lập liên tục (`F20 - Online`)**: Mô phỏng từ **10 – 20+ thiết bị cảm biến IoT** phân bổ trên 3 Vùng canh tác (Zone A, Zone B, Zone C) của Trang trại Công nghệ cao Đà Lạt.
2. **Kiểm thử tải cảm biến (`Load Test`)**: Bắn đồng thời **10 – 20 cảm biến với tần suất 1 giây/lần (1 Hz)** qua đa luồng bất đồng bộ, đo đạc tự động **Throughput** và **Latency**.
3. **Kiểm thử bộ lọc dữ liệu rác (`F19 - Anomaly Injection`)**: Tự động chèn tỷ lệ nhỏ (~5%) dữ liệu vượt ngưỡng vật lý để kiểm chứng thuật toán `SensorDataValidator` của Backend.
4. **Giả lập UAV Offline Sync (`Sprint 5 - LTJ-25`)**:
   - Khi UAV mất kết nối sóng/MQTT: Lưu dữ liệu viễn trắc vào CSDL cục bộ **SQLite** (`iot_offline.db`).
   - Khi có sóng trở lại: Tự động khởi động luồng **Bắt tay (Handshake)** (`iot/ltj/sync/handshake/request`), đọc dữ liệu tồn đọng trong SQLite, chia lô (**Batching 10 bản ghi/lô**) và đẩy **Bulk Sync** (`iot/ltj/sync/bulk`).
5. **Giả lập Dữ liệu Cực đoan Kích hoạt Alert (`Sprint 6 - LTJ-30`)**:
   - Bắn các số liệu cực đoan hợp lệ về mặt vật lý (nằm trong dải `[-10°C, 60°C]` được Backend Validator F19 chấp nhận) nhưng vượt ngưỡng cảnh báo (Nhiệt độ 60.0°C, Pin yếu 5.0%) nhằm kích hoạt **Alert Engine (CRITICAL)**.
6. **Giả lập UAV Bay Realtime Telemetry (`Sprint 7 - LTJ-35`)**:
   - Tích hợp thuật toán **Nội suy tuyến tính (Linear Interpolation - LERP)** trên không gian 3 chiều (Kinh độ, Vĩ độ, Cao độ) giữa các Waypoint.
   - Mô phỏng tiêu hao pin lũy tiến ($0.35\%/\text{phút}$) và định kỳ mỗi giây publish gói tin Telemetry chuẩn JSON lên topic `iot/ltj/uav/telemetry` để điều khiển Marker UAV di chuyển mượt mà trên bản đồ Leaflet Map.

---

## 📊 Định Nghĩa Dữ Liệu Cảm Biến (`SensorData`)

Mỗi bản tin được sinh ra trên topic `iot/ltj/sensor/zone-{zoneId}/{deviceId}` có cấu trúc JSON như sau:

```json
{
  "deviceId": "DEV-Z1-001",
  "farmId": 1,
  "zoneId": 1,
  "temperature": 27.5,
  "humidity": 65.2,
  "soilMoisture": 72.4,
  "light": 540.0,
  "batteryLevel": 85.0,
  "status": "NORMAL",
  "timestamp": 1729659600
}
```

| Trường dữ liệu | Kiểu dữ liệu | Đơn vị | Dải giá trị giả lập chuẩn | Ý nghĩa |
|---|---|---|---|---|
| `deviceId` | `String` | - | `DEV-Z1-001` .. `DEV-Z3-007` | Mã định danh thiết bị cảm biến theo Zone |
| `farmId` | `Long` | - | `1` | Mã trang trại (Trang Trại Đà Lạt) |
| `zoneId` | `Long` | - | `1`, `2`, `3` | Mã vùng canh tác (Zone A, Zone B, Zone C) |
| `temperature` | `double` | `°C` | `20.0 - 36.0` (Cực đoan: `60.0`) | Nhiệt độ môi trường |
| `humidity` | `double` | `%` | `45.0 - 90.0` | Độ ẩm không khí |
| `soilMoisture` | `double` | `%` | `50.0 - 85.0` | Độ ẩm đất |
| `light` | `double` | `lux` | `150.0 - 1200.0` | Cường độ ánh sáng |
| `batteryLevel` | `Double` | `%` | `70.0 - 100.0` (Khẩn cấp: `5.0`) | Mức pin của thiết bị/cảm biến |
| `status` | `String` | - | `NORMAL`, `WARNING`, `ANOMALY`, `CRITICAL` | Trạng thái vận hành |
| `timestamp` | `long` | `giây` | Unix Epoch Time | Thời điểm ghi nhận dữ liệu |

---

## 🚀 Hướng Dẫn Build & Chạy

### 1. Biên dịch & Chạy Trọn Bộ Unit Tests
```powershell
.\gradlew.bat test
.\gradlew.bat build
```

### 2. Chế độ 1: Chạy Giả lập Liên tục (`F20 - Online Continuous Mode`)
```powershell
.\gradlew.bat run
```

### 3. Chế độ 2: Chạy Kiểm thử Tải Cảm biến (`Load Test Mode` — 10 đến 20 sensors @ 1s)
```powershell
.\gradlew.bat run --args="--load-test 20 1 10"
```

### 4. Chế độ 3: Review JSON Waypoints & Kiểm thử Tạo Mission tự động (`Sprint 4 - LTJ-20`)
```powershell
.\gradlew.bat run --args="--test-mission" --console=plain
```

### 5. Chế độ 4: Kiểm thử UAV Offline Sync SQLite to MQTT (`Sprint 5 - LTJ-25`)
```powershell
.\gradlew.bat run --args="--test-offline-sync 30 10" --console=plain
```

### 6. Chế độ 5: Kiểm thử Bắn Data Cực đoan Kích hoạt Alert (`Sprint 6 - LTJ-30`)
```powershell
.\gradlew.bat run --args="--test-extreme-alert" --console=plain
```

### 7. Chế độ 6: Giả lập UAV Bay Realtime Telemetry (`Sprint 7 - LTJ-35`)
```powershell
# Chạy kiểm thử nhanh (Fast Mode):
.\gradlew.bat run --args="--test-uav-flight" --console=plain

# Chạy mô phỏng thời gian thực (Realtime Stream 1 giây/bước):
.\gradlew.bat run --args="--flight-sim" --console=plain
```
---

## 📁 Cấu Trúc Thư Mục

```text
iot-simulator/
├── build.gradle                                     # Cấu hình build & dependencies (Paho MQTT, SQLite JDBC, Gson, JUnit 5)
├── settings.gradle                                  # Cấu hình project name
├── gradlew & gradlew.bat                            # Gradle wrapper scripts
├── src/
│   ├── main/java/com/iot/simulator/
│   │   ├── IoTSimulatorApp.java                     # Điều phối 6 chế độ chạy
│   │   ├── MqttPublisher.java                       # Kết nối bất đồng bộ MqttAsyncClient (QoS 1)
│   │   ├── SensorData.java                          # Dữ liệu cảm biến, mức pin, kịch bản cực đoan Alert (LTJ-30)
│   │   ├── UavFlightSimulator.java                  # Mô phỏng bay UAV, thuật toán LERP 3D & Telemetry (LTJ-35)
│   │   ├── WaypointMissionValidator.java            # Kiểm định JSON Waypoints, Geofence, Haversine 3D & Mission (LTJ-20)
│   │   ├── OfflineStorageManager.java               # Quản lý CSDL SQLite cục bộ (Caching, Batching, Sync Status) (LTJ-25)
│   │   └── UavOfflineSyncManager.java               # Điều phối Handshake, Chunking & Bulk Sync MQTT (LTJ-25)
│   └── test/java/com/iot/simulator/
│       ├── ExtremeAlertSimulationTest.java          # Bộ 4 Unit Tests kiểm thử dữ liệu cực đoan & Alert (LTJ-30)
│       ├── UavFlightSimulatorTest.java              # Bộ 4 Unit Tests kiểm thử thuật toán LERP & Telemetry (LTJ-35)
│       ├── OfflineStorageManagerTest.java           # Bộ Unit Tests kiểm thử SQLite (LTJ-25)
│       └── UavOfflineSyncManagerTest.java           # Bộ Unit Tests kiểm thử Handshake & Bulk Sync (LTJ-25)
└── README.md                                        # Hướng dẫn sử dụng
```

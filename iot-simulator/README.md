# 📡 IoT Simulator - Mô-đun Giả Lập Thiết Bị IoT & Kiểm Thử Tải Cảm Biến

> **Task Jira**:
> - `[LTJ-5]` `[Sprint 1][Dev 5] Giả lập IoT & Vẽ Use Case Diagram`
> - `[LTJ-10]` `[Sprint 2][Dev 5] Test API Danh mục & Script MQTT Giả lập`
> - `[LTJ-15]` `[Sprint 3][Dev 5] Script Giả lập Bắn MQTT & Test Tải Cảm biến`
> - `[LTJ-20]` `[Sprint 4][Dev 5] Review JSON Waypoints & Test Tạo Mission`  
> - `[LTJ-25]` `[Sprint 5][Dev 5] Giả lập UAV Offline Sync (SQLite Local to MQTT)`  
> **Người thực hiện**: Trần Nguyễn Bảo Hoàng — Dev 5 (IoT / Testing)

---

## 🎯 Giới Thiệu

Mô-đun **IoT Simulator** được xây dựng bằng **Java 17** sử dụng **Eclipse Paho MQTT Client (`MqttAsyncClient`)**, **SQLite JDBC** và **Gson**, phục vụ mục đích:
1. **Giả lập liên tục (`F20 - Online`)**: Mô phỏng từ **10 – 20+ thiết bị cảm biến IoT** phân bổ trên 3 Vùng canh tác (Zone A, Zone B, Zone C) của Trang trại Công nghệ cao Đà Lạt.
2. **Kiểm thử tải cảm biến (`Load Test`)**: Bắn đồng thời **10 – 20 cảm biến với tần suất 1 giây/lần (1 Hz)** qua đa luồng bất đồng bộ (`CompletableFuture` + `MaxInflight = 200`), đo đạc tự động **Throughput (`packets/s`, `metrics/s`)** và **Latency (`Min`, `Avg`, `P95`, `Max`)**.
3. **Kiểm thử bộ lọc dữ liệu rác (`F19 - Anomaly Injection`)**: Tự động chèn tỷ lệ nhỏ (~5%) dữ liệu vượt ngưỡng vật lý để kiểm chứng thuật toán `SensorDataValidator` của Backend.
4. **Giả lập UAV Offline Sync (`Sprint 5 - LTJ-25`)**:
   - Khi UAV mất kết nối sóng/MQTT: Lưu dữ liệu viễn trắc vào CSDL cục bộ **SQLite** (`iot_offline.db`).
   - Khi có sóng trở lại: Tự động khởi động luồng **Bắt tay (Handshake)** với Backend (`iot/ltj/sync/handshake/request`), đọc dữ liệu tồn đọng trong SQLite, chia lô (**Batching / Chunking**) và đẩy **Bulk Sync** (`iot/ltj/sync/bulk`).
   - Đánh dấu `is_synced = 1` và gửi Báo cáo hoàn tất phiên (`iot/ltj/sync/handshake/complete`).

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
  "status": "NORMAL",
  "timestamp": 1729659600
}
```

| Trường dữ liệu | Kiểu dữ liệu | Đơn vị | Dải giá trị giả lập chuẩn | Ý nghĩa |
|---|---|---|---|---|
| `deviceId` | `String` | - | `DEV-Z1-001` .. `DEV-Z3-007` | Mã định danh thiết bị cảm biến theo Zone |
| `farmId` | `Long` | - | `1` | Mã trang trại (Trang Trại Đà Lạt) |
| `zoneId` | `Long` | - | `1`, `2`, `3` | Mã vùng canh tác (Zone A, Zone B, Zone C) |
| `temperature` | `double` | `°C` | `20.0 - 36.0` | Nhiệt độ môi trường |
| `humidity` | `double` | `%` | `45.0 - 90.0` | Độ ẩm không khí |
| `soilMoisture` | `double` | `%` | `50.0 - 85.0` | Độ ẩm đất |
| `light` | `double` | `lux` | `150.0 - 1200.0` | Cường độ ánh sáng |
| `status` | `String` | - | `NORMAL`, `WARNING`, `ANOMALY` | Trạng thái vận hành cảm biến |
| `timestamp` | `long` | `giây` | Unix Epoch Time | Thời điểm ghi nhận dữ liệu |

---

## 🚀 Hướng Dẫn Build & Chạy

### 1. Biên dịch & Chạy Unit Tests
```powershell
.\gradlew.bat test
.\gradlew.bat build
```

### 2. Chế độ 1: Chạy Giả lập Liên tục (`F20 - Online Continuous Mode`)
```powershell
# Chạy mặc định Sprint 3 (15 sensors trên 3 Zones, tần suất 1 giây/lần, HiveMQ Broker)
.\gradlew.bat run

# Tùy chỉnh: <broker_url> <tong_so_sensors> <chu_ky_giay> [backend_http_url]
.\gradlew.bat run --args="tcp://broker.hivemq.com:1883 20 1"
```

### 3. Chế độ 2: Chạy Kiểm thử Tải Cảm biến (`Load Test Mode` — 10 đến 20 sensors @ 1s)
```powershell
# Cú pháp: --load-test <tong_so_sensors> <chu_ky_giay> <thoi_luong_giay> [backend_http_url]

# Kịch bản 1: Test tải 10 cảm biến gửi 1 giây/lần trong 10 giây
.\gradlew.bat run --args="--load-test 10 1 10"

# Kịch bản 2: Test tải 20 cảm biến gửi 1 giây/lần trong 10 giây
.\gradlew.bat run --args="--load-test 20 1 10"
```

### 4. Chế độ 3: Review JSON Waypoints & Kiểm thử Tạo Mission tự động (`Sprint 4 - LTJ-20`)
```powershell
.\gradlew.bat run --args="--test-mission" --console=plain
```

### 5. Chế độ 4: Kiểm thử UAV Offline Sync SQLite to MQTT (`Sprint 5 - LTJ-25`)
```powershell
# Cú pháp: --test-offline-sync [tong_so_ban_ghi] [kich_thuoc_lo_batch]
# Mặc định: Giả lập lưu 30 bản ghi SQLite khi mất mạng -> Bật mạng -> Handshake -> Bulk Sync 10 bản ghi/lô
.\gradlew.bat run --args="--test-offline-sync 30 10" --console=plain
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
│   │   ├── IoTSimulatorApp.java                     # Entry point: Stream F20, Load Test, Mission Test & Offline Sync Test
│   │   ├── MqttPublisher.java                       # Kết nối bất đồng bộ MqttAsyncClient (QoS 1)
│   │   ├── SensorData.java                          # Mô hình dữ liệu đa chỉ số & Anomaly Injection (F19)
│   │   ├── WaypointMissionValidator.java            # Kiểm định JSON Waypoints, Geofence, Haversine 3D & Mission (LTJ-20)
│   │   ├── OfflineStorageManager.java               # Quản lý CSDL SQLite cục bộ (Caching, Batching, Sync Status) (LTJ-25)
│   │   ├── UavOfflineSyncManager.java               # Điều phối tiến trình Handshake, Chunking & Bulk Sync MQTT (LTJ-25)
│   │   └── UavSyncModels.java                       # DTOs Handshake, BulkSyncPayload & SyncCompletionReport (LTJ-25)
│   └── test/java/com/iot/simulator/
│       └── OfflineStorageManagerTest.java           # Bộ 6 Unit Tests JUnit 5 kiểm thử toàn diện SQLite & DTOs
└── README.md                                        # Hướng dẫn sử dụng
```

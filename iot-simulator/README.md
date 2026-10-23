# 📡 IoT Simulator - Mô-đun Giả Lập Thiết Bị IoT & Kiểm Thử Tải Cảm Biến

> **Task Jira**:
> - `[LTJ-5]` `[Sprint 1][Dev 5] Giả lập IoT & Vẽ Use Case Diagram`
> - `[LTJ-10]` `[Sprint 2][Dev 5] Test API Danh mục & Script MQTT Giả lập`
> - `[LTJ-15]` `[Sprint 3][Dev 5] Script Giả lập Bắn MQTT & Test Tải Cảm biến`  
> **Người thực hiện**: Trần Nguyễn Bảo Hoàng — Dev 5 (IoT / Testing)

---

## 🎯 Giới Thiệu

Mô-đun **IoT Simulator** được xây dựng bằng **Java 17** sử dụng **Eclipse Paho MQTT Client (`MqttAsyncClient`)** và **Gson**, phục vụ mục đích:
1. **Giả lập liên tục (`F20 - Online`)**: Mô phỏng từ **10 – 20+ thiết bị cảm biến IoT** phân bổ trên 3 Vùng canh tác (Zone A, Zone B, Zone C) của Trang trại Công nghệ cao Đà Lạt.
2. **Kiểm thử tải cảm biến (`Load Test`)**: Bắn đồng thời **10 – 20 cảm biến với tần suất 1 giây/lần (1 Hz)** qua đa luồng bất đồng bộ (`CompletableFuture` + `MaxInflight = 200`), đo đạc tự động **Throughput (`packets/s`, `metrics/s`)** và **Latency (`Min`, `Avg`, `P95`, `Max`)**.
3. **Kiểm thử bộ lọc dữ liệu rác (`F19 - Anomaly Injection`)**: Tự động chèn tỷ lệ nhỏ (~5%) dữ liệu vượt ngưỡng vật lý để kiểm chứng thuật toán `SensorDataValidator` của Backend.
4. **Hỗ trợ Dual-Mode (MQTT + HTTP Bridge & Offline Fallback)**: Phát bản tin lên MQTT Broker (`QoS 1`), tùy chọn đồng bộ qua REST API (`/api/v1/sensor-data/simulator`) và tự động chuyển sang chế độ Offline khi mất kết nối.

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

### 1. Biên dịch (Build & Unit Test)
```powershell
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

# Kịch bản 3: Test tải 20 cảm biến kết hợp đồng bộ HTTP vào Backend
.\gradlew.bat run --args="--load-test 20 1 10 http://localhost:8080/api/v1/sensor-data/simulator"
```

---

## 📁 Cấu Trúc Thư Mục

```text
iot-simulator/
├── build.gradle                                     # Cấu hình build & dependencies
├── settings.gradle                                  # Cấu hình project name
├── gradlew & gradlew.bat                            # Gradle wrapper scripts
├── src/
│   └── main/java/com/iot/simulator/
│       ├── IoTSimulatorApp.java                     # Entry point: Online Stream (F20) & Load Tester
│       ├── MqttPublisher.java                       # Xử lý kết nối bất đồng bộ MqttAsyncClient (QoS 1)
│       └── SensorData.java                          # Mô hình dữ liệu đa chỉ số & Anomaly Injection (F19)
└── README.md                                        # Hướng dẫn sử dụng
```

# 📡 IoT Simulator - Mô-đun Giả Lập Thiết Bị IoT

> **Task Jira**: [LTJ-5] `[Sprint 1][Dev 5] Giả lập IoT & Vẽ Use Case Diagram`  
> **Người thực hiện**: Dev 5 (IoT / Test)

---

## 🎯 Giới Thiệu

Mô-đun **IoT Simulator** được xây dựng bằng **Java 17** sử dụng **Eclipse Paho MQTT Client** và **Gson**, phục vụ mục đích:
1. Giả lập nhiều thiết bị cảm biến IoT trong mô hình Nông nghiệp thông minh / Drone UAV.
2. Tự động sinh dữ liệu đo đạc ngẫu nhiên theo chu kỳ và định dạng chuẩn JSON.
3. Đóng gói và phát tán bản tin lên MQTT Broker (mặc định HiveMQ Public Broker) theo giao thức MQTT QoS 1.
4. Hỗ trợ chế độ chạy Offline (in dữ liệu ra console) khi không có kết nối internet hoặc broker gặp sự cố.

---

## 📊 Định Nghĩa Dữ Liệu Cảm Biến (`SensorData`)

Mỗi bản tin được sinh ra có cấu trúc JSON như sau:

```json
{
  "deviceId": "SENSOR_001",
  "temperature": 27.5,
  "humidity": 65.2,
  "light": 540.0,
  "timestamp": 1728524400
}
```

| Trường dữ liệu | Kiểu dữ liệu | Đơn vị | Dải giá trị giả lập | Ý nghĩa |
|---|---|---|---|---|
| `deviceId` | String | - | `SENSOR_001`, `SENSOR_002`... | Mã định danh thiết bị cảm biến |
| `temperature` | double | °C | 18.0 - 38.0 | Nhiệt độ môi trường |
| `humidity` | double | % | 30.0 - 90.0 | Độ ẩm không khí |
| `light` | double | lux | 100.0 - 1000.0 | Cường độ ánh sáng |
| `timestamp` | long | giây | Unix Epoch Time | Thời điểm ghi nhận dữ liệu |

---

## 🚀 Hướng Dẫn Build & Chạy

### 1. Yêu cầu môi trường
* **Java**: JDK 17 trở lên (`java -version`).
* Đã tích hợp sẵn **Gradle Wrapper** (`gradlew` / `gradlew.bat`), không cần cài đặt Gradle riêng.

### 2. Biên dịch (Build)
```bash
# Trên Windows
.\gradlew.bat build

# Trên Linux / macOS
./gradlew build
```

### 3. Chạy Simulator
```bash
# Chạy với cấu hình mặc định (3 thiết bị, chu kỳ 5 giây, broker: tcp://broker.hivemq.com:1883)
.\gradlew.bat run
```

### 4. Tùy chỉnh tham số dòng lệnh
Cú pháp:
```bash
.\gradlew.bat run --args="<broker_url> <so_thiet_bi> <chu_ky_giay>"
```
Ví dụ:
```bash
# Kết nối broker nội bộ, chạy 5 thiết bị, chu kỳ 2 giây/lần
.\gradlew.bat run --args="tcp://localhost:1883 5 2"
```

---

## 📁 Cấu Trúc Thư Mục

```
iot-simulator/
├── build.gradle                                     # Cấu hình build & dependencies
├── settings.gradle                                  # Cấu hình project name
├── gradlew & gradlew.bat                            # Gradle wrapper scripts
├── gradle/wrapper/                                  # Gradle wrapper binary & properties
├── lib/                                             # Jar thư viện dự phòng offline
├── src/
│   └── main/
│       └── java/
│           └── com/iot/simulator/
│               ├── IoTSimulatorApp.java             # Entry point & quản lý vòng đời chạy
│               ├── MqttPublisher.java               # Xử lý kết nối, gửi MQTT message
│               └── SensorData.java                  # Mô hình dữ liệu và hàm sinh ngẫu nhiên
└── README.md                                        # Hướng dẫn sử dụng
```

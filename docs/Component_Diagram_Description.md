# 📐 TÀI LIỆU ĐẶC TẢ SƠ ĐỒ THÀNH PHẦN (COMPONENT DIAGRAM SPECIFICATION)
## Dự án: Hệ Thống Giám Sát & Điều Khiển Nông Nghiệp Thông Minh (Smart Farm IoT)
### Nhiệm vụ: `[Sprint 3][Dev 5] LTJ-15: Script Giả lập Bắn MQTT & Test Tải Cảm biến`

---

> **Tác giả:** Trần Nguyễn Bảo Hoàng — Dev 5 (IoT & System Architecture / QA)  
> **Sprint:** Sprint 3 (17/10/2026 - 23/10/2026)  
> **Ngôn ngữ mô hình hóa:** PlantUML (UML 2.x Component Diagram)  
> **File mã nguồn PlantUML:** [`docs/Component_Diagram.puml`](file:///f:/lap_trinh_java/docs/Component_Diagram.puml)  
> **Hình ảnh sơ đồ:**
> * [`docs/images/Component_Diagram.png`](file:///f:/lap_trinh_java/docs/images/Component_Diagram.png)
> * [`docs/images/Component_Diagram.svg`](file:///f:/lap_trinh_java/docs/images/Component_Diagram.svg)

---

## 1. MỤC ĐÍCH & TỔNG QUAN KIẾN TRÚC

Sơ đồ thành phần (**Component Diagram**) mô tả cấu trúc mô-đun phần mềm, ranh giới phân tầng, các cổng giao tiếp (Interfaces/Ports) và giao thức truyền thông của toàn bộ hệ thống **Smart Farm IoT Monitoring System** trong giai đoạn tích hợp **Sprint 3**.

Hệ thống được thiết kế theo kiến trúc **Phân tầng hướng sự kiện & Dịch vụ (Layered Event-Driven & RESTful Architecture)** gồm **5 tầng độc lập**:
1. **Tầng Thiết Bị & Giả Lập Biên (IoT Edge & Simulator Layer)** — *Java 17 & Eclipse Paho MQTT*.
2. **Tầng Truyền Thông IoT (Messaging Broker Layer)** — *HiveMQ Cloud / Mosquitto MQTT Broker*.
3. **Tầng Giao Diện Người Dùng (Frontend Presentation Layer)** — *React 19, TypeScript, Redux Toolkit, Leaflet Map*.
4. **Tầng Dịch Vụ Lõi Backend (Backend Application Layer)** — *Spring Boot 3.2.5, Spring Security JWT, Validation Engine*.
5. **Tầng Lưu Trữ Dữ Liệu (Data Persistence Layer)** — *Spring Data JPA / Hibernate, H2 / MySQL 8.0*.

---

## 2. ĐẶC TẢ CHI TIẾT CÁC THÀNH PHẦN THEO TẦNG

### 2.1. Tầng 1: Thiết Bị & Giả Lập Biên (`iot-simulator` — Dev 5 / `LTJ-15`)
| Thành phần (Component) | File mã nguồn | Trách nhiệm kỹ thuật |
|---|---|---|
| **`IoTSimulatorApp`** | [`IoTSimulatorApp.java`](file:///f:/lap_trinh_java/iot-simulator/src/main/java/com/iot/simulator/IoTSimulatorApp.java) | Bộ điều phối trung tâm hỗ trợ 2 chế độ: **Continuous Online Stream (`F20`)** và **Automated Load Tester (`--load-test`)** cho 10–20 cảm biến đồng thời ở tần suất 1 giây/lần (1 Hz) bằng `ScheduledExecutorService` và `CompletableFuture`. |
| **`SensorDataGenerator`** | [`SensorData.java`](file:///f:/lap_trinh_java/iot-simulator/src/main/java/com/iot/simulator/SensorData.java) | Sinh dữ liệu viễn trắc đa chỉ số (`temperature`, `humidity`, `soilMoisture`, `light`, `status`, `timestamp`) phân bổ trên 3 Vùng canh tác (Zone A, B, C) và hỗ trợ chèn nhiễu vật lý (`Anomaly Injection`) để kiểm thử bộ lọc dữ liệu rác `F19`. |
| **`MqttPublisher`** | [`MqttPublisher.java`](file:///f:/lap_trinh_java/iot-simulator/src/main/java/com/iot/simulator/MqttPublisher.java) | Quản lý kết nối bất đồng bộ (`MqttAsyncClient`), cấu hình `MaxInflight = 200`, `QoS = 1`, tự động kết nối lại (`AutomaticReconnect`) và đo đạc độ trễ truyền tải (`Publish RTT Latency ms`). |
| **`HttpBridgeClient`** | [`IoTSimulatorApp.java`](file:///f:/lap_trinh_java/iot-simulator/src/main/java/com/iot/simulator/IoTSimulatorApp.java) | Sử dụng `java.net.http.HttpClient` đồng bộ trực tiếp bản tin JSON tới endpoint `/api/v1/sensor-data/simulator` phục vụ kiểm thử tải đầu-cuối (End-to-End). |

### 2.2. Tầng 2: Truyền Thông IoT (`Messaging Broker Layer` — Dev 2 / `LTJ-2`, `LTJ-12`)
* **`MQTT Broker (HiveMQ / Mosquitto)`**:
  * Giao thức: `MQTT v3.1.1` qua cổng `TCP 1883`.
  * Cấu trúc Topic phân cấp chuẩn: `iot/ltj/sensor/zone-{zoneId}/{deviceId}` (ví dụ: `iot/ltj/sensor/zone-1/dev-z1-001`).
  * Đảm bảo mức chất lượng dịch vụ **QoS 1 (At Least Once)**: Có xác nhận `PUBACK` cho mọi gói tin đo đạc từ cảm biến.

### 2.3. Tầng 3: Giao Diện Người Dùng (`src/` — Dev 3 & Dev 4 / `LTJ-13`, `LTJ-14`)
| Thành phần (Component) | File mã nguồn | Trách nhiệm kỹ thuật |
|---|---|---|
| **`Leaflet Map & GPS Markers`** | [`App.tsx`](file:///f:/lap_trinh_java/src/App.tsx), [`SensorMapPopup.tsx`](file:///f:/lap_trinh_java/src/components/SensorMapPopup.tsx) | Hiển thị bản đồ nông trại trực quan bằng Leaflet.js, ghim tọa độ GPS các nút cảm biến (`F05`), đổi màu trạng thái (`ONLINE`, `WARNING`, `OFFLINE`) và mở Popup chi tiết khi click (`LTJ-13`, `LTJ-14`). |
| **`Realtime Sensor Table`** | [`SensorRealtimeTable.tsx`](file:///f:/lap_trinh_java/src/components/SensorRealtimeTable.tsx) | Bảng theo dõi số liệu cảm biến thời gian thực (`F04`), hỗ trợ lọc theo Zone, loại cảm biến, tìm kiếm nhanh và thống kê cảnh báo (`LTJ-14`). |
| **`UAV, Gateway & Sensor UI`** | [`DeviceManagement.tsx`](file:///f:/lap_trinh_java/src/components/DeviceManagement.tsx), [`SensorAssignment.tsx`](file:///f:/lap_trinh_java/src/components/SensorAssignment.tsx) | Giao diện quản lý danh mục thiết bị bay UAV, trạm thu phát Gateway và phân bổ cảm biến vào từng vùng canh tác (`LTJ-9`). |
| **`Redux Toolkit Store`** | [`sensorRealtimeSlice.ts`](file:///f:/lap_trinh_java/src/store/slices/sensorRealtimeSlice.ts), [`deviceSlice.ts`](file:///f:/lap_trinh_java/src/store/slices/deviceSlice.ts) | Quản lý trạng thái tập trung toàn ứng dụng Frontend, đồng bộ dữ liệu giữa Bản đồ Leaflet và Bảng Realtime. |
| **`REST API & Stream Service`** | [`api.ts`](file:///f:/lap_trinh_java/src/services/api.ts), [`realtimeStream.ts`](file:///f:/lap_trinh_java/src/services/realtimeStream.ts) | Giao tiếp HTTP RESTful kèm JWT Bearer Token với Backend (`http://localhost:8080/api/v1`) và xử lý luồng cập nhật dữ liệu thời gian thực. |

### 2.4. Tầng 4: Dịch Vụ Lõi Backend (`backend/` — Dev 1 & Dev 2 / `LTJ-11`, `LTJ-12`)
| Thành phần (Component) | File mã nguồn | Trách nhiệm kỹ thuật |
|---|---|---|
| **`JwtAuthenticationFilter` & `SecurityConfig`** | [`SecurityConfig.java`](file:///f:/lap_trinh_java/backend/src/main/java/com/smartfarm/backend/config/SecurityConfig.java) | Bảo vệ các tài nguyên hệ thống theo cơ chế Stateless JWT, phân quyền `ROLE_ADMIN` / `ROLE_FARMER` và mở luồng thu nạp cảm biến (`/api/v1/sensor-data/**`). |
| **`SensorDataController`** | [`SensorDataController.java`](file:///f:/lap_trinh_java/backend/src/main/java/com/smartfarm/backend/controller/SensorDataController.java) | Cung cấp các REST API trọng tâm của Sprint 3: `POST /sensor-data`, `POST /sensor-data/simulator`, `GET /sensor-data/latest`, `GET /sensor-data/latest/zone/{zoneId}`, và `GET /sensor-data/sensor/{sensorId}/history`. |
| **`SensorDataService`** | [`SensorDataServiceImpl.java`](file:///f:/lap_trinh_java/backend/src/main/java/com/smartfarm/backend/service/impl/SensorDataServiceImpl.java) | Tách gói tin đa chỉ số từ `IoTSimulatorPayload` thành 4 chỉ số độc lập (`TEMP`, `HUM`, `SOIL`, `LIGHT`), tự động ánh xạ hoặc đăng ký thiết bị mới vào Zone, và chống ghi trùng lặp (`Duplicate Timestamp Detection`). |
| **`SensorDataValidator` (`F19`)** | [`SensorDataValidator.java`](file:///f:/lap_trinh_java/backend/src/main/java/com/smartfarm/backend/validation/SensorDataValidator.java) | Thuật toán lọc dữ liệu rác & kiểm định biên độ vật lý: Nhiệt độ (`-10°C .. 60°C`), Độ ẩm KK (`0% .. 100%`), Độ ẩm đất (`0% .. 100%`), Ánh sáng (`0 .. 150,000 lux`), CO2 (`0 .. 5,000 ppm`), Pin (`0% .. 100%`). |
| **`MqttGatewaySubscriber`** | [`MqttGatewayConfig.java`](file:///f:/lap_trinh_java/src/main/java/laglag/demo/MqttGatewayConfig.java) | Lắng nghe luồng bản tin từ MQTT Broker (`SUBSCRIBE iot/sensors/#`, `iot/ltj/sensor/#`) và chuyển tiếp vào tầng xử lý Backend. |

### 2.5. Tầng 5: Lưu Trữ Dữ Liệu (`Data Persistence Layer` — Dev 1 / `LTJ-1`, `LTJ-11`)
* **`Spring Data JPA Repositories`**: Bao gồm [`SensorRepository.java`](file:///f:/lap_trinh_java/backend/src/main/java/com/smartfarm/backend/repository/SensorRepository.java), [`SensorDataRepository.java`](file:///f:/lap_trinh_java/backend/src/main/java/com/smartfarm/backend/repository/SensorDataRepository.java), [`FarmRepository.java`](file:///f:/lap_trinh_java/backend/src/main/java/com/smartfarm/backend/repository/FarmRepository.java), [`ZoneRepository.java`](file:///f:/lap_trinh_java/backend/src/main/java/com/smartfarm/backend/repository/ZoneRepository.java), [`UserRepository.java`](file:///f:/lap_trinh_java/backend/src/main/java/com/smartfarm/backend/repository/UserRepository.java).
* **`Relational Database (H2 / MySQL)`**: Lưu trữ dữ liệu có cấu trúc với khóa ngoại toàn vẹn giữa `farms` ➔ `zones` ➔ `sensors` ➔ `sensor_data`.

---

## 3. BẢNG ĐẶC TẢ GIAO TIẾP LIÊN THÀNH PHẦN (INTERFACES & PROTOCOLS)

| Luồng kết nối | Nguồn (Source) | Đích (Target) | Giao thức / Cổng | Định dạng Payload |
|---|---|---|---|---|
| **1. Phát dữ liệu cảm biến (`F20`)** | `MqttPublisher` (Simulator) | `MQTT Broker` | `MQTT TCP :1883` (QoS 1) | JSON (`IoTSimulatorPayload`) |
| **2. Nhận dữ liệu từ Broker (`LTJ-12`)** | `MQTT Broker` | `MqttGatewaySubscriber` | `MQTT Subscribe` | JSON (`iot/ltj/sensor/zone-{id}/{dev}`) |
| **3. Đồng bộ HTTP Bridge (`LTJ-11/15`)** | `HttpBridgeClient` | `SensorDataController` | `HTTP POST :8080` | `POST /api/v1/sensor-data/simulator` |
| **4. Kiểm định dữ liệu rác (`F19`)** | `SensorDataService` | `SensorDataValidator` | Internal Java Call | `ValidationResult (valid, message)` |
| **5. Truy vấn dữ liệu Map & Table** | `FE_Api` (React UI) | `SensorDataController` | `HTTP GET :8080` | `GET /api/v1/sensor-data/latest` |
| **6. Lưu trữ bản ghi đo đạc** | `SensorDataService` | `Relational Database` | `JDBC / JPA ORM` | Entity `SensorData` (`sensor_data`) |

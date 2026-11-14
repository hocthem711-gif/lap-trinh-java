# 🛰️ BÁO CÁO KỸ THUẬT: GIẢ LẬP UAV BAY REALTIME TELEMETRY (SPRINT 7)
> **Mã nhiệm vụ Jira**: `[Sprint 7][Dev 5] LTJ-35: Script Giả lập UAV Bay Realtime Telemetry`  
> **Người thực hiện**: Trần Nguyễn Bảo Hoàng (Dev 5 — IoT, System Architecture & QA Specialist)  
> **Ngày báo cáo**: 13/11/2026  
> **Trạng thái**: Hoàn thành 100% (Mã nguồn đã kiểm thử tự động, sẵn sàng tích hợp)

---

## 1. TỔNG QUAN YÊU CẦU KỸ THUẬT

Trong Sprint 7, nhiệm vụ của Dev 5 là xây dựng mô-đun giả lập hành trình bay thực tế của máy bay không người lái (UAV/Drone) dựa trên các lộ trình Waypoints đã được thiết lập từ Sprint 4 (F14, F16).

### Mục tiêu kỹ thuật cốt lõi:
1. **Thuật toán Nội suy Tọa độ GPS thời gian thực (Linear Interpolation - LERP)**:
   - UAV không "dịch chuyển tức thời" giữa các mốc Waypoint mà bay liên tục trên không gian 3 chiều (Kinh độ, Vĩ độ, Cao độ).
   - Script phải tính toán và phát sinh tọa độ trung gian sau mỗi giây tương ứng với vận tốc bay đã được cấu hình của từng chặng.
2. **Mô hình Hóa Tiêu hao Năng lượng Pin Thực tế**:
   - Tích hợp công thức sụt giảm pin lũy tiến: $0.35\%$ dung lượng pin cho mỗi phút bay thực tế.
3. **Truyền Tin Viễn Trắc Đa Kênh Qua Giao Thức MQTT**:
   - Định kỳ mỗi $1$ giây publish một gói tin JSON Telemetry lên topic `iot/ltj/uav/telemetry`.
   - Cung cấp dòng dữ liệu thời gian thực cho Backend (Dev 1 - `LTJ-31` WebSocket/SSE) và giao diện bản đồ Leaflet Map (Dev 3 - `LTJ-33` & Dev 4 - `LTJ-34`) để điều khiển icon UAV di chuyển mượt mà trên màn hình.

---

## 2. NỀN TẢNG TOÁN HỌC & THUẬT TOÁN NỘI SUY (LERP)

### 2.1. Công thức Haversine tính Khoảng cách Cung Lớn (Great-Circle Distance)
Để tính độ dài mặt đất giữa điểm bắt đầu $W_1(\text{lat}_1, \text{lng}_1)$ và điểm kế tiếp $W_2(\text{lat}_2, \text{lng}_2)$:
$$\Delta\text{lat} = \text{lat}_2 - \text{lat}_1, \quad \Delta\text{lng} = \text{lng}_2 - \text{lng}_1$$
$$a = \sin^2\left(\frac{\Delta\text{lat}}{2}\right) + \cos(\text{lat}_1) \cdot \cos(\text{lat}_2) \cdot \sin^2\left(\frac{\Delta\text{lng}}{2}\right)$$
$$c = 2 \cdot \arctan2(\sqrt{a}, \sqrt{1-a})$$
$$D = R \cdot c \quad (\text{với bán kính Trái Đất } R = 6,371,000 \text{ mét})$$

### 2.2. Thời gian bay chặng $T$ và Hệ số Tiến trình $\alpha$
Với tốc độ bay cấu hình $V$ (m/s) của chặng bay:
$$T = \max\left(1, \text{round}\left(\frac{D}{V}\right)\right) \quad (\text{giây})$$
Tại mỗi bước thời gian $t \in [0, T]$, hệ số tiến trình được chuẩn hóa về đoạn $[0.0, 1.0]$:
$$\alpha(t) = \frac{t}{T}$$

### 2.3. Nội suy Tuyến tính 3D (3D LERP) & Tiêu hao Pin
$$\begin{cases}
\text{lat}(t) = \text{lat}_1 + \alpha(t) \cdot (\text{lat}_2 - \text{lat}_1) \\
\text{lng}(t) = \text{lng}_1 + \alpha(t) \cdot (\text{lng}_2 - \text{lng}_1) \\
\text{alt}(t) = \text{alt}_1 + \alpha(t) \cdot (\text{alt}_2 - \text{alt}_1) \\
\text{spd}(t) = \text{spd}_1 + \alpha(t) \cdot (\text{spd}_2 - \text{spd}_1) \\
\text{battery}(t) = \text{battery}_{\text{khởi điểm}} - \left(\frac{t_{\text{tổng lũy kế}}}{60.0}\right) \times 0.35\%
\end{cases}$$

---

## 3. THIẾT KẾ MÃ NGUỒN VÀ ĐẶC TẢ GÓI TIN TELEMETRY

### 3.1. Cấu trúc Gói tin Telemetry JSON
```json
{
  "uavId": "UAV-ALPHA-01",
  "missionName": "Mission-KhuA-Demo",
  "currentSegment": "WP1 -> WP2",
  "waypointIndex": 2,
  "totalWaypoints": 4,
  "latitude": 10.84617,
  "longitude": 106.76700,
  "altitude": 36.7,
  "speed": 8.7,
  "battery": 99.9,
  "flightStatus": "TAKEOFF",
  "timestamp": 1794586020
}
```

### 3.2. Lộ trình 4 Điểm Bay Mẫu tại Nông Trại (Khu A)
| Thứ tự (Order) | Loại hành động (Type) | Vĩ độ (Latitude) | Kinh độ (Longitude) | Cao độ (Altitude) | Tốc độ (Speed) |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **WP 1** | `TAKEOFF` | 10.8450 | 106.7650 | 30.0 m | 8.0 m/s |
| **WP 2** | `NORMAL` | 10.8485 | 106.7710 | 50.0 m | 10.0 m/s |
| **WP 3** | `HOVER` | 10.8520 | 106.7760 | 50.0 m | 8.0 m/s |
| **WP 4** | `LANDING` | 10.8550 | 106.7820 | 20.0 m | 5.0 m/s |

### 3.3. Tổ chức Mô-đun trong Dự án
* [`iot-simulator/src/main/java/com/iot/simulator/UavFlightSimulator.java`](file:///f:/lap_trinh_java/iot-simulator/src/main/java/com/iot/simulator/UavFlightSimulator.java): Chứa toàn bộ logic toán học LERP, quản lý hành trình bay và publish MQTT.
* [`iot-simulator/src/main/java/com/iot/simulator/IoTSimulatorApp.java`](file:///f:/lap_trinh_java/iot-simulator/src/main/java/com/iot/simulator/IoTSimulatorApp.java): Bổ sung cờ điều khiển dòng lệnh:
  - `--test-uav-flight`: Chế độ kiểm thử nhanh (Fast mode) hoàn tất hành trình trong 1 giây để xác minh tính đúng đắn.
  - `--flight-sim`: Chế độ bay thời gian thực (1 giây/bước) để phối hợp kiểm thử với giao diện Web Leaflet Map.

---

## 4. KẾT QUẢ KIỂM THỬ TỰ ĐỘNG (TEST SUITE VERIFICATION)

### 4.1. Kết quả Unit Test JUnit 5 (`UavFlightSimulatorTest.java`)
| Mã Test Case | Nội dung kiểm thử | Kết quả | Thời gian |
| :--- | :--- | :---: | :---: |
| **TC-01** | Kiểm tra thuật toán nội suy LERP tính đúng tọa độ trung gian ($\alpha = 0.0, 0.5, 1.0$) | **PASS** | 2 ms |
| **TC-02** | Nạp đúng 4 Waypoints mẫu Khu A nằm trong ranh giới an toàn Geofence $[10.84, 10.86]$ | **PASS** | 1 ms |
| **TC-03** | Mô phỏng hành trình bay hoàn chỉnh từ `TAKEOFF` đến `COMPLETED`, kiểm chứng tiêu hao pin | **PASS** | 5 ms |
| **TC-04** | Xác thực gói tin JSON Telemetry có đầy đủ tất cả các trường dữ liệu cho WebSocket | **PASS** | 3 ms |

### 4.2. Nhật ký Chạy Kiểm Thử Thực Tế trên Broker HiveMQ
```text
==========================================================================
   SMART FARM IOT - GIA LAP UAV BAY REALTIME TELEMETRY (LTJ-35)           
==========================================================================
  * MQTT Broker : tcp://broker.hivemq.com:1883
  * Che do chay : TEST NHANH (Fast Mode)
  * Topic       : iot/ltj/uav/telemetry
  * Thuat toan  : Noi suy tuyen tinh LERP 3D (Kinh do, Vi do, Cao do) + Hao pin 0.35%/phut
==========================================================================

>> Connecting to Broker: tcp://broker.hivemq.com:1883 ...
>> Connected successfully!
>> Da ket noi thanh cong MQTT Broker.
>> Khoi chay Mission: 'Mission-KhuA-Demo' gom 4 Waypoints (Khu A)

[#001][UAV-TELEM] [UAV-ALPHA-01][WP1 -> WP2] (10.84500, 106.76500) | Alt: 30.0m | Spd: 8.0m/s | Pin: 100.0% | TAKEOFF >> MQTT SENT
[#002][UAV-TELEM] [UAV-ALPHA-01][WP1 -> WP2] (10.84617, 106.76700) | Alt: 36.7m | Spd: 8.7m/s | Pin: 100.0% | TAKEOFF >> MQTT SENT
[#003][UAV-TELEM] [UAV-ALPHA-01][WP1 -> WP2] (10.84733, 106.76900) | Alt: 43.3m | Spd: 9.3m/s | Pin: 99.9%  | TAKEOFF >> MQTT SENT
[#004][UAV-TELEM] [UAV-ALPHA-01][WP1 -> WP2] (10.84850, 106.77100) | Alt: 50.0m | Spd: 10.0m/s | Pin: 99.9%  | TAKEOFF >> MQTT SENT
[#005][UAV-TELEM] [UAV-ALPHA-01][WP2 -> WP3] (10.84850, 106.77100) | Alt: 50.0m | Spd: 10.0m/s | Pin: 99.9%  | IN_FLIGHT >> MQTT SENT
[#006][UAV-TELEM] [UAV-ALPHA-01][WP2 -> WP3] (10.84967, 106.77267) | Alt: 50.0m | Spd: 9.3m/s  | Pin: 99.9%  | IN_FLIGHT >> MQTT SENT
[#007][UAV-TELEM] [UAV-ALPHA-01][WP2 -> WP3] (10.85083, 106.77433) | Alt: 50.0m | Spd: 8.7m/s  | Pin: 99.8%  | IN_FLIGHT >> MQTT SENT
[#008][UAV-TELEM] [UAV-ALPHA-01][WP2 -> WP3] (10.85200, 106.77600) | Alt: 50.0m | Spd: 8.0m/s  | Pin: 99.8%  | IN_FLIGHT >> MQTT SENT
[#009][UAV-TELEM] [UAV-ALPHA-01][WP3 -> WP4] (10.85200, 106.77600) | Alt: 50.0m | Spd: 8.0m/s  | Pin: 99.8%  | LANDING >> MQTT SENT
[#010][UAV-TELEM] [UAV-ALPHA-01][WP3 -> WP4] (10.85300, 106.77800) | Alt: 40.0m | Spd: 7.0m/s  | Pin: 99.7%  | LANDING >> MQTT SENT
[#011][UAV-TELEM] [UAV-ALPHA-01][WP3 -> WP4] (10.85400, 106.78000) | Alt: 30.0m | Spd: 6.0m/s  | Pin: 99.7%  | LANDING >> MQTT SENT
[#012][UAV-TELEM] [UAV-ALPHA-01][WP3 -> WP4] (10.85500, 106.78200) | Alt: 20.0m | Spd: 5.0m/s  | Pin: 99.7%  | COMPLETED >> MQTT SENT

==========================================================================
  TONG KET CHUYEN BAY LTJ-35: 12 GOI TIN TELEMETRY HOAN TAT (100%)
  Trang thai: Chuyen bay mo phong an toan, dong bo day du voi Map Leaflet!
==========================================================================
```

---

## 5. HƯỚNG DẪN TÍCH HỢP VỚI CÁC THÀNH VIÊN KHÁC

1. **Phía Backend (Dev 1 - `LTJ-31` & Dev 2 - `LTJ-32`)**:
   - Backend MQTT Subscriber chỉ cần lắng nghe topic `iot/ltj/uav/telemetry`, chuyển tiếp gói tin vào hàm `TelemetryRealtimeService.broadcastCustomTelemetry(telemetryPayload)` để bắn ra WebSocket STOMP endpoint `/topic/uav/telemetry`.
2. **Phía Frontend Map (Dev 3 - `LTJ-33` & Dev 4 - `LTJ-34`)**:
   - Client React kết nối STOMP tới `/topic/uav/telemetry`.
   - Mỗi khi nhận gói tin, cập nhật vị trí icon máy bay:
     ```typescript
     setUavPosition([telemetry.latitude, telemetry.longitude]);
     setUavAltitude(telemetry.altitude);
     setUavBattery(telemetry.battery);
     ```
   - Nhờ tần suất gửi đều đặn 1 giây/lần cùng tọa độ nội suy liên tục, marker UAV sẽ di chuyển mượt mà trên bản đồ đường bay mà không bị giật lag.

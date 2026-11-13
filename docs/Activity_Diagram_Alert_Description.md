# 📊 THUYẾT MINH SƠ ĐỒ HOẠT ĐỘNG (ACTIVITY DIAGRAM) LUỒNG XỬ LÝ CẢNH BÁO
> **Tài liệu kỹ thuật**: `docs/Activity_Diagram_Alert_Description.md`  
> **Nhiệm vụ Jira**: `[Sprint 6][Dev 5] LTJ-30: Giả lập Bắn Data Cực đoan & Activity Diagram`  
> **Sơ đồ PlantUML đính kèm**: [`docs/Activity_Diagram_Alert.puml`](file:///f:/lap_trinh_java/docs/Activity_Diagram_Alert.puml)  
> **Người thực hiện**: Trần Nguyễn Bảo Hoàng (Dev 5 — IoT, System Architecture & QA Specialist)

---

## 1. MỤC TIÊU VÀ BỐI CẢNH THIẾT KẾ

Trong kiến trúc hệ thống Smart Farm & UAV Management System (`LTJ`), luồng dữ liệu đo lường từ thiết bị cảm biến và drone không chỉ dừng lại ở việc lưu trữ mà còn đóng vai trò cốt lõi trong việc **phát hiện nguy cơ môi trường và bảo vệ cây trồng theo thời gian thực**.

Sơ đồ hoạt động này giải quyết 2 bài toán kỹ thuật trọng tâm:
1. **Phân định rõ ràng giữa Dữ liệu Nhiễu phần cứng (Hardware Noise - F19) và Dữ liệu Cực đoan thực tế (Extreme Environmental Conditions - LTJ-30)**:
   - Dữ liệu lỗi vật lý (ví dụ: nhiệt độ $85.5^\circ\text{C}$, độ ẩm $135\%$) là do cảm biến chập mạch hoặc đường truyền bị méo tín hiệu. Hệ thống phải **hủy ngay lập tức (Discard)** để tránh tạo cảnh báo giả (False Alarm).
   - Dữ liệu cực đoan (ví dụ: nhiệt độ $60.0^\circ\text{C}$, pin $5.0\%$) nằm sát trần vật lý của cảm biến, phản ánh tình huống nguy cấp (cháy, nắng nóng kỷ lục, UAV sắp rơi tự do). Hệ thống phải chấp nhận, lưu trữ và **kích hoạt chuông báo động (CRITICAL Alert)**.
2. **Minh họa sự phối hợp nhịp nhàng giữa 5 thành viên trong nhóm theo mô hình phân tầng Swimlanes**:
   - **Làn 1 (Dev 5 - IoT Simulator)**: Thu thập số liệu, kịch bản bắn dữ liệu cực đoan, đóng gói JSON và publish qua MQTT QoS 1.
   - **Làn 2 (Dev 1 & Dev 2 - Backend Gateway & F19)**: Tiếp nhận gói tin, chạy thuật toán lọc rác vật lý `SensorDataValidator`, khử trùng lặp và lưu trữ `SensorData`.
   - **Làn 3 (Dev 1 & Dev 2 - Alert Engine & Service)**: So sánh số liệu với bảng cấu hình `Threshold`, khởi tạo đối tượng `Alert`, lưu trữ DB và phát tán WebSocket/SSE.
   - **Làn 4 (Dev 3 & Dev 4 - Frontend Web Dashboard)**: Tiếp nhận WebSocket, render Toast Notification màu đỏ, đổi màu Marker trên bản đồ Leaflet Map và cập nhật bảng quản lý cảnh báo.

---

## 2. CHI TIẾT 4 LÀN BƠI (SWIMLANES) TRONG SƠ ĐỒ

```
+--------------------------+-------------------------------+------------------------------+-------------------------------+
|  Thiết Bị IoT & UAV      |  Backend Ingestion & F19      |  Alert Engine & Persistence  |  Frontend Dashboard & Operator|
|        (Dev 5)           |        (Dev 1 & Dev 2)        |       (Dev 1 & Dev 2)        |        (Dev 3 & Dev 4)        |
+--------------------------+-------------------------------+------------------------------+-------------------------------+
| - Đo định kỳ             | - MQTT Subscriber tiếp nhận   | - Query ngưỡng Threshold     | - WebSocket nhận Alert tức thì|
| - Bắn 60°C hoặc Pin 5%   | - Validator kiểm tra [-10, 60]| - So sánh & tạo entity Alert | - Bật Toast đỏ (LTJ-28)       |
| - Serialize JSON DTO     | - Discard nếu là nhiễu rác    | - Lưu DB (isRead = false)    | - Map marker đổi đỏ (F05)     |
| - MQTT Publish QoS 1     | - Lưu SensorData vào DB       | - Broadcast WebSocket/SSE    | - Operator xác nhận đã xử lý  |
+--------------------------+-------------------------------+------------------------------+-------------------------------+
```

### Bước 1: Thu thập và Đóng gói Số liệu Cực đoan (Phía Dev 5)
* Cảm biến đo lường và phát hiện thông số bất thường hoặc do script kiểm thử `IoTSimulatorApp` với cờ `--test-extreme-alert` cố tình kích hoạt:
  - Nhiệt độ trần vật lý: $60.0^\circ\text{C}$ (ngưỡng an toàn nông trại thường là $35.0^\circ\text{C}$).
  - Mức pin khẩn cấp: $5.0\%$ (ngưỡng pin yếu cần hạ cánh sạc là $\le 10.0\%$).
* Gói tin được định dạng theo chuẩn:
  ```json
  {
    "deviceId": "DEV-Z1-TEMP-EXT",
    "farmId": 1,
    "zoneId": 1,
    "temperature": 60.0,
    "humidity": 60.0,
    "soilMoisture": 65.0,
    "light": 500.0,
    "batteryLevel": 80.0,
    "status": "CRITICAL",
    "timestamp": 1794586008
  }
  ```
* Truyền tải qua topic MQTT phân cấp: `iot/ltj/sensor/zone-1/dev-z1-temp-ext` với mức chất lượng dịch vụ QoS 1 (đảm bảo gửi tới broker ít nhất một lần).

### Bước 2: Kiểm định Giới hạn Vật lý (Phía Dev 1 & Dev 2)
* Backend nhận gói tin từ MQTT Subscriber hoặc REST Endpoint `/api/v1/sensor-data/simulator`.
* Bộ kiểm định `SensorDataValidator` thực thi kiểm tra 3 điều kiện:
  1. $value \in [-10.0^\circ\text{C}, 60.0^\circ\text{C}]$ đối với cảm biến nhiệt độ.
  2. $batteryLevel \in [0.0\%, 100.0\%]$ đối với mức pin.
  3. Mốc thời gian đo nằm trong dải hiện tại (không vượt quá 5 phút ở tương lai và không cũ hơn 30 ngày).
* **Nhánh Rẽ (Decision)**:
  - Nếu vi phạm (ví dụ $85.5^\circ\text{C}$): Đánh dấu lỗi `ANOMALY`, log cảnh báo và **HỦY BỎ (Discard)**.
  - Nếu thỏa mãn (nhiệt độ $60.0^\circ\text{C}$): Được xác nhận là giá trị đo thực tế, kiểm tra chống trùng lặp theo `(sensorId, recordedAt)` và lưu vào bảng `sensor_data`.

### Bước 3: Đánh giá Ngưỡng & Kích hoạt Alert Engine (Phía Dev 1 & Dev 2)
* `Alert Engine` đối chiếu giá trị đo với bảng cấu hình `thresholds` (do Dev 4 cấu hình qua giao diện F09):
  - Điều kiện 1: $\text{temperature} (60.0^\circ\text{C}) > \text{threshold.maxValue} (35.0^\circ\text{C})$.
  - Điều kiện 2: $\text{batteryLevel} (5.0\%) \le 10.0\%$.
* Khởi tạo đối tượng `Alert`:
  - `alertLevel`: `AlertLevel.CRITICAL`
  - `message`: `"Cảnh báo nguy cấp: Nhiệt độ 60.0°C vượt ngưỡng tối đa cho phép (35.0°C) tại Zone 1"`
  - `isRead`: `false`
* Lưu vào cơ sở dữ liệu qua `AlertRepository.save(alert)`.
* Kích hoạt `TelemetryRealtimeService.broadcastAlert(alertResponse)` truyền tin đa kênh qua WebSocket STOMP (`/topic/alerts` và `/topic/zone/{id}/alerts`).

### Bước 4: Hiển thị Đa phương tiện & Xử lý (Phía Dev 3 & Dev 4)
* Frontend Client (React) lắng nghe WebSocket:
  - **Toast Notification (Dev 3 - LTJ-28)**: Bật popup thông báo đỏ góc trên cùng màn hình kèm âm báo và rung.
  - **Bản đồ Sensor Map (Dev 3 & Dev 4 - F05)**: Marker của Zone 1 chuyển từ màu xanh lá (🟢 Online) sang màu đỏ (🔴 Critical Warning).
  - **Header Badge (Dev 4 - F08)**: Tăng số lượng cảnh báo chưa đọc trên thanh điều hướng.
  - **Bảng quản lý Alert (Dev 4 - LTJ-29)**: Thêm dòng mới vào bảng `ThresholdAlertManagement.tsx`.
* **Hành động của Người vận hành (Operator Action)**:
  - Chuyên viên kiểm tra nguyên nhân (bật hệ thống làm mát/phun sương hoặc ra lệnh UAV hạ cánh).
  - Nhấn nút "Đánh dấu đã đọc / Xử lý" (`PATCH /api/v1/alerts/{id}/read`).
  - Hệ thống cập nhật `Alert.isRead = true`, đưa trạng thái giám sát về mức an toàn.

---

## 3. KẾT LUẬN VÀ Ý NGHĨA HỆ THỐNG

Sơ đồ hoạt động này cung cấp một bức tranh toàn cảnh, minh bạch hóa trách nhiệm của từng thành viên trong Sprint 6 và Sprint 7:
1. Khẳng định vai trò của **Dev 5** trong việc kiến tạo dữ liệu thử nghiệm chuẩn xác, có tính biên độ thực tế cao để kiểm thử toàn diện hệ thống.
2. Chứng minh khả năng vận hành tự động, khép kín từ tầng biên (Edge Simulator) qua tầng lõi (Backend Engine) tới tầng giao diện người dùng (React Dashboard).

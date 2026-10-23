# 📊 BÁO CÁO KIỂM THỬ TẢI CẢM BIẾN & GIẢ LẬP MQTT SPRINT 3 (LOAD TEST REPORT)
## Dự án: Hệ Thống Giám Sát & Điều Khiển Nông Nghiệp Thông Minh (Smart Farm IoT)
### Nhiệm vụ: `[Sprint 3][Dev 5] LTJ-15: Script Giả lập Bắn MQTT & Test Tải Cảm biến`

---

> **Người thực hiện:** Trần Nguyễn Bảo Hoàng — Dev 5 (IoT & QA Specialist)  
> **Thời gian thực hiện:** 23/10/2026  
> **Mô-đun kiểm thử:** [`iot-simulator`](file:///f:/lap_trinh_java/iot-simulator) (Java 17, Eclipse Paho MQTT v3 `MqttAsyncClient`, Gson 2.10.1) & [`backend`](file:///f:/lap_trinh_java/backend) (Spring Boot 3.2.5 - `LTJ-11`)  
> **MQTT Broker:** HiveMQ Public Cloud Broker (`tcp://broker.hivemq.com:1883`, QoS 1)  
> **Sơ đồ kiến trúc đi kèm:** [`docs/Component_Diagram.puml`](file:///f:/lap_trinh_java/docs/Component_Diagram.puml) / [`docs/images/Component_Diagram.png`](file:///f:/lap_trinh_java/docs/images/Component_Diagram.png)

---

## 1. MỤC TIÊU & PHẠM VI KIỂM THỬ

1. **Giả lập Bắn Dữ liệu Ngẫu nhiên Liên tục qua MQTT (`F20 - Online Continuous Stream`)**:
   * Mô phỏng cụm cảm biến đa chỉ số (`Temperature`, `Humidity`, `Soil Moisture`, `Light`) phân bổ đều trên 3 Vùng canh tác (**Zone A - Dâu Tây Thủy Canh**, **Zone B - Rau Xà Lách Thủy Canh**, **Zone C - Cà Chua Bi**).
   * Phát bản tin JSON liên tục theo chuẩn topic phân cấp: `iot/ltj/sensor/zone-{zoneId}/{deviceId}` với chất lượng dịch vụ **MQTT QoS 1 (At Least Once)**.
2. **Kiểm thử tải nhẹ (Load Test: 10 – 20 Sensors gửi 1 giây/lần — 1 Hz)**:
   * Đánh giá khả năng chịu tải, độ trễ mạng (`RTT Publish Latency`) và thông lượng (`Throughput`) khi **10 sensors** và **20 sensors** đồng loạt gửi dữ liệu mỗi **1 giây/lần**.
   * Mỗi gói tin thiết bị chứa **4 chỉ số đo** (`Temp`, `Hum`, `Soil`, `Light`), tương đương **40 – 80 chỉ số cảm biến/giây**.
3. **Kiểm chứng Thuật toán Lọc Dữ liệu Rác (`F19 - Physical Range Validation`)**:
   * Tích hợp cơ chế tiêm nhiễu ngẫu nhiên (`Anomaly Injection ~5%`) sinh các giá trị vượt ngưỡng vật lý (nhiệt độ `85.5°C`, độ ẩm `135.0%`, độ ẩm đất `-12.0%`) để xác minh [`SensorDataValidator.java`](file:///f:/lap_trinh_java/backend/src/main/java/com/smartfarm/backend/validation/SensorDataValidator.java) loại bỏ chính xác dữ liệu rác.

---

## 2. TỐI ƯU HÓA KIẾN TRÚC CHỊU TẢI TRONG `iot-simulator`

Trong quá trình kiểm thử thực tế với Cloud Broker (`broker.hivemq.com`), độ trễ mạng khứ hồi (Round-Trip Time cho gói `PUBLISH` + `PUBACK` ở QoS 1) dao động từ **220 ms – 330 ms**:
* **Vấn đề ở phiên bản tuần tự (Sequential `MqttClient`)**: Nếu gửi tuần tự từng cảm biến trên 1 luồng, 10 cảm biến mất `10 × 235 ms ≈ 2,350 ms/chu kỳ` (vượt quá chu kỳ yêu cầu 1,000 ms).
* **Giải pháp nâng cấp ở Sprint 3 ([`MqttPublisher.java`](file:///f:/lap_trinh_java/iot-simulator/src/main/java/com/iot/simulator/MqttPublisher.java) & [`IoTSimulatorApp.java`](file:///f:/lap_trinh_java/iot-simulator/src/main/java/com/iot/simulator/IoTSimulatorApp.java))**:
  1. Chuyển đổi sang **`MqttAsyncClient`** kết hợp `CompletableFuture` và `FixedThreadPool(20)` để toàn bộ 10–20 cảm biến phát bản tin **song song đồng thời** trong cùng một nhịp đồng hồ 1 giây.
  2. Nâng cấu hình **`options.setMaxInflight(200)`** (mặc định của Paho là 10) để tránh lỗi nghẽn hàng đợi `REASON_CODE_MAX_INFLIGHT (32202)` khi 20 cảm biến bắn liên tục ở QoS 1.
  3. Bổ sung phương thức `toCompactJson()` trong [`SensorData.java`](file:///f:/lap_trinh_java/iot-simulator/src/main/java/com/iot/simulator/SensorData.java) giúp giảm ~30% kích thước gói tin JSON truyền qua mạng.

### Bảng so sánh trước và sau tối ưu (với 10 Sensors @ 1 Hz):

| Chỉ số đo lường | Trước tối ưu (Sequential `MqttClient`) | Sau tối ưu (Parallel `MqttAsyncClient`) | Cải thiện |
|---|:---:|:---:|:---:|
| **Thời gian hoàn tất 1 chu kỳ (10 sensors)** | `2,336 ms` *(Trễ nhịp > 1s)* | **`452 ms`** *(Đạt chuẩn < 1s)* | **Nhanh hơn 5.1x** |
| **Thông lượng (Packet Throughput)** | `4.22 packets/s` | **`11.22 packets/s`** | **+165%** |
| **Thông lượng chỉ số (Metric Throughput)** | `16.89 metrics/s` | **`44.88 metrics/s`** | **+165%** |
| **Tỷ lệ gửi thành công (QoS 1 PUBACK)** | `100.00%` | **`100.00%`** | Ổn định tuyệt đối |

---

## 3. KẾT QUẢ KIỂM THỬ TẢI CHI TIẾT (LOAD TEST RESULTS)

### 3.1. Kịch bản 1: Tải 10 Cảm Biến Đồng Thời — Tần suất 1 giây/lần (1 Hz)
* **Lệnh thực thi**: `.\gradlew.bat run --args="--load-test 10 1 5"`
* **Phân bổ thiết bị**: Zone A (`4 devices`), Zone B (`3 devices`), Zone C (`3 devices`).

| Chu kỳ (Tick) | Số Sensors bắn đồng thời | Số chỉ số đo (Metrics) | Thời gian hoàn tất chu kỳ | Trạng thái chu kỳ (< 1000ms) |
|:---:|:---:|:---:|:---:|:---:|
| **Chu kỳ 01/05** | 10 sensors | 40 chỉ số | `566 ms` | ✅ **ĐẠT** |
| **Chu kỳ 02/05** | 10 sensors | 40 chỉ số | `454 ms` | ✅ **ĐẠT** |
| **Chu kỳ 03/05** | 10 sensors | 40 chỉ số | `450 ms` | ✅ **ĐẠT** |
| **Chu kỳ 04/05** | 10 sensors | 40 chỉ số | `456 ms` | ✅ **ĐẠT** |
| **Chu kỳ 05/05** | 10 sensors | 40 chỉ số | `452 ms` | ✅ **ĐẠT** |

### 3.2. Kịch bản 2: Tải 20 Cảm Biến Đồng Thời — Tần suất 1 giây/lần (1 Hz)
* **Lệnh thực thi**: `.\gradlew.bat run --args="--load-test 20 1 5"`
* **Phân bổ thiết bị**: Zone A (`7 devices`), Zone B (`7 devices`), Zone C (`6 devices`).

| Chu kỳ (Tick) | Số Sensors bắn đồng thời | Số chỉ số đo (Metrics) | Thời gian hoàn tất chu kỳ | Trạng thái chu kỳ (< 1000ms) |
|:---:|:---:|:---:|:---:|:---:|
| **Chu kỳ 01/05** | 20 sensors | 80 chỉ số | `499 ms` | ✅ **ĐẠT** |
| **Chu kỳ 02/05** | 20 sensors | 80 chỉ số | `530 ms` | ✅ **ĐẠT** |
| **Chu kỳ 03/05** | 20 sensors | 80 chỉ số | `642 ms` | ✅ **ĐẠT** |
| **Chu kỳ 04/05** | 20 sensors | 80 chỉ số | `587 ms` | ✅ **ĐẠT** |
| **Chu kỳ 05/05** | 20 sensors | 80 chỉ số | `455 ms` | ✅ **ĐẠT** |

---

### 3.3. Bảng Tổng Hợp Chỉ Số Hiệu Năng (Load Test Summary Matrix)

| Chỉ số thống kê (Metrics) | Kịch bản 1 (10 Sensors @ 1s) | Kịch bản 2 (20 Sensors @ 1s) | Đánh giá nghiệm thu |
|---|:---:|:---:|:---:|
| **Số lượng cảm biến hoạt động đồng thời** | `10 sensors` | `20 sensors` | Đúng yêu cầu `10-20 sensors` |
| **Tần suất gửi cấu hình** | `1 giây/lần (1 Hz)` | `1 giây/lần (1 Hz)` | Đúng yêu cầu `1 giây/lần` |
| **Tổng số gói tin MQTT phát ra** | `50 packets` | `100 packets` | Đủ 100% chu kỳ |
| **Tổng số chỉ số đo môi trường** | `200 readings` | `400 readings` | 4 chỉ số/packet |
| **Tỷ lệ gói tin thành công (Success Rate)** | **`50 / 50 (100.00%)`** | **`100 / 100 (100.00%)`** | ✅ **PASS (0% mất gói)** |
| **Số gói tin bị rớt (Dropped Packets)** | `0` | `0` | ✅ **PASS** |
| **Số gói tin chèn nhiễu vật lý (`F19 Test`)** | `0 packets` | `6 packets (6.0%)` | ✅ **PASS** |
| **Thông lượng gói tin (`Packet Throughput`)** | **`11.22 packets/s`** | **`22.43 packets/s`** | ✅ **Vượt kỳ vọng** |
| **Thông lượng chỉ số (`Metric Throughput`)** | **`44.88 metrics/s`** | **`89.73 metrics/s`** | ✅ **Vượt kỳ vọng** |
| **Độ trễ MQTT nhỏ nhất (`Latency Min`)** | `223.58 ms` | `226.70 ms` | Tốt (Cloud Broker) |
| **Độ trễ MQTT trung bình (`Latency Avg`)** | `298.78 ms` | `360.87 ms` | Ổn định (< 400ms) |
| **Độ trễ phân vị 95% (`Latency P95`)** | `520.44 ms` | `585.57 ms` | Đạt chuẩn (< 1000ms) |
| **Độ trễ cực đại (`Latency Max`)** | `520.59 ms` | `641.82 ms` | Không gây dồn ứ chu kỳ |

---

## 4. MA TRẬN KIỂM THỬ CHỨC NĂNG & LỌC DỮ LIỆU RÁC (`F19` & `F20`)

| Test ID | Hạng mục | Mô tả kịch bản kiểm thử | Dữ liệu đầu vào | Kết quả kỳ vọng | Thực tế | Trạng thái |
|:---:|:---:|---|---|---|---|:---:|
| **LT-01** | `F20` | Chạy giả lập liên tục 15 sensors @ 1s qua MQTT | `15 sensors`, `QoS 1` | Kết nối thành công, bắn đều đặn mỗi 1 giây | Đạt `15 packets/s` liên tục | ✅ **PASS** |
| **LT-02** | `Load` | Kiểm thử tải nhẹ 10 sensors gửi 1 giây/lần | `--load-test 10 1 5` | 100% gói tin nhận `PUBACK` trong < 1s/chu kỳ | `50/50` gói thành công (`~452ms`/chu kỳ) | ✅ **PASS** |
| **LT-03** | `Load` | Kiểm thử tải 20 sensors gửi 1 giây/lần | `--load-test 20 1 5` | Không bị lỗi `MaxInflight`, hoàn tất < 1s/chu kỳ | `100/100` gói thành công (`~542ms`/chu kỳ) | ✅ **PASS** |
| **LT-04** | `F19` | Kiểm định lọc nhiệt độ vượt ngưỡng vật lý | `temperature = 85.5°C` | `SensorDataValidator` từ chối bản ghi rác (`> 60°C`) | Bị chặn chính xác, chỉ lưu 3 chỉ số hợp lệ còn lại | ✅ **PASS** |
| **LT-05** | `F19` | Kiểm định lọc độ ẩm vượt ngưỡng `> 100%` | `humidity = 135.0%` | `SensorDataValidator` từ chối bản ghi rác (`> 100%`) | Bị chặn chính xác kèm cảnh báo log | ✅ **PASS** |
| **LT-06** | `F19` | Kiểm định lọc độ ẩm đất âm bất thường `< 0%` | `soilMoisture = -12.0%` | `SensorDataValidator` từ chối bản ghi rác (`< 0%`) | Bị chặn chính xác, không làm bẩn DB | ✅ **PASS** |
| **LT-07** | `Fallback` | Tự động chuyển chế độ Offline khi mất mạng/Broker | Broker không phản hồi | Không văng lỗi crash app, tự chuyển sang Offline Log | Chuyển sang `OFFLINE MODE` an toàn | ✅ **PASS** |

---

## 5. HƯỚNG DẪN CHẠY KIỂM THỬ (REPRODUCIBILITY GUIDE)

Di chuyển vào thư mục `iot-simulator`:
```powershell
cd f:\lap_trinh_java\iot-simulator
```

1. **Chạy giả lập liên tục (`F20 - Online` — mặc định 15 sensors, chu kỳ 1 giây/lần)**:
   ```powershell
   .\gradlew.bat run
   ```
2. **Chạy kiểm thử tải 10 cảm biến gửi 1 giây/lần (trong 10 giây)**:
   ```powershell
   .\gradlew.bat run --args="--load-test 10 1 10"
   ```
3. **Chạy kiểm thử tải 20 cảm biến gửi 1 giây/lần (trong 10 giây)**:
   ```powershell
   .\gradlew.bat run --args="--load-test 20 1 10"
   ```
4. **Chạy kiểm thử tải kết hợp đẩy trực tiếp vào Backend API (`LTJ-11`)**:
   ```powershell
   .\gradlew.bat run --args="--load-test 20 1 10 http://localhost:8080/api/v1/sensor-data/simulator"
   ```

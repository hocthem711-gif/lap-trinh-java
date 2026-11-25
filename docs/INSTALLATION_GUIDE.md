# 🛠️ HƯỚNG DẪN CÀI ĐẶT & TRIỂN KHAI HỆ THỐNG (INSTALLATION GUIDE)
## Dự án: Hệ Thống Giám Sát & Điều Khiển Nông Nghiệp Thông Minh (Smart Farm IoT & UAV)
### Phiên bản chính thức `v2.0` — Sprint 8 (`LTJ-40`)

---

> **Biên soạn:** Trần Nguyễn Bảo Hoàng — Dev 5 (IoT, System Architecture & QA Specialist)  
> **Phạm vi tài liệu:** Hướng dẫn thiết lập môi trường, cấu hình biến môi trường, khởi chạy bằng Docker hoặc Local thủ công cho cả 3 phân hệ (`backend/`, `src/` Frontend, `iot-simulator/`) và kiểm chứng sau cài đặt.

---

## 1. YÊU CẦU MÔI TRƯỜNG & CÔNG CỤ (PREREQUISITES)

| Công cụ | Phiên bản tối thiểu | Phiên bản khuyến nghị / Đã kiểm chứng | Mục đích sử dụng |
| :--- | :---: | :---: | :--- |
| **Java Development Kit (JDK)** | `17` | Eclipse Temurin `JDK 17` | Biên dịch và chạy Spring Boot Backend (`backend/`) & `iot-simulator/` |
| **Node.js & npm** | `18.x` | `Node.js 20+` / `npm 10+` | Cài đặt thư viện và chạy giao diện Web React + TypeScript + Vite |
| **Docker & Docker Compose** | `24.x` / `v2` | Docker Desktop mới nhất | Khởi chạy nhanh Backend đóng gói Multi-Stage Container *(tùy chọn)* |
| **Git** | `2.30+` | Mới nhất | Quản lý mã nguồn và đồng bộ nhánh Gitflow |
| **Kết nối Internet** | Bắt buộc cho Map & Cloud MQTT | — | Tải bản đồ nền OpenStreetMap (Leaflet) và kết nối HiveMQ Cloud (`:1883`) |

> [!TIP]
> Dự án đã tích hợp sẵn **Maven Wrapper** (`backend/mvnw` / `backend/mvnw.cmd`) và **Gradle Wrapper** (`iot-simulator/gradlew` / `iot-simulator/gradlew.bat`), vì vậy **không cần cài đặt riêng Maven hay Gradle toàn cục** trên máy.

### Kiểm tra nhanh công cụ trên máy:
```bash
java -version
node -v
npm -v
docker --version
```

---

## 2. TẢI MÃ NGUỒN & CẤU TRÚC THƯ MỤC

```bash
git clone https://github.com/hocthem711-gif/lap-trinh-java.git
cd lap-trinh-java
```

Cấu trúc các mô-đun chính sau khi clone:
```text
lap-trinh-java/
├── backend/              # Spring Boot 3.2.5 Backend Core + Dockerfile + docker-compose.yml
├── src/                  # Giao diện Web Frontend (React 19 + TypeScript + Vite 8 + Leaflet)
├── iot-simulator/        # Bộ giả lập IoT, UAV Offline SQLite, UAV Flight LERP & System Test
├── docs/                 # Toàn bộ UML (PlantUML + PNG/SVG), báo cáo Test, User Manual & Guide
└── package.json          # Cấu hình dependencies & scripts Frontend
```

---

## 3. CẤU HÌNH HỆ THỐNG & BIẾN MÔI TRƯỜNG

Tệp cấu hình trung tâm của Backend nằm tại [`backend/src/main/resources/application.yml`](../backend/src/main/resources/application.yml):

| Biến môi trường | Giá trị mặc định | Mô tả |
| :--- | :--- | :--- |
| `SERVER_PORT` | `8080` | Cổng HTTP của Backend API (`context-path: /api/v1`) |
| `SPRING_PROFILES_ACTIVE` | *(default)* / `prod` | Profile vận hành của Spring Boot |
| `MQTT_BROKER_URL` | `tcp://localhost:1883` *(hoặc cấu hình `mqtt.broker.url=tcp://broker.hivemq.com:1883`)* | Địa chỉ MQTT Broker cho `MqttGatewayConfig` |
| `APP_MAIL_ENABLED` | `false` | Đặt `true` để bật gửi Email cảnh báo HTML thực tế qua SMTP khi phát sinh Alert (`LTJ-36`) |
| `APP_MAIL_ALERT_RECIPIENT` | `hieuclet249@gmail.com` | Địa chỉ email nhận thông báo cảnh báo khẩn cấp |
| `SPRING_MAIL_HOST` | `smtp.gmail.com` | Máy chủ SMTP gửi thư |
| `SPRING_MAIL_PORT` | `587` | Cổng SMTP STARTTLS |
| `SPRING_MAIL_USERNAME` | `smartfarm.alerts@gmail.com` | Tài khoản email gửi thông báo |
| `SPRING_MAIL_PASSWORD` | *(App Password)* | Mật khẩu ứng dụng Gmail (tuyệt đối không commit mật khẩu thật lên Git) |

> [!NOTE]
> Mặc định Backend sử dụng **H2 In-Memory Database** (`jdbc:h2:mem:smartfarmdb`) kết hợp `DataInitializer.java` để **tự động nạp toàn bộ dữ liệu mẫu ngay khi khởi động** (2 tài khoản `admin`/`farmer`, Trang trại Đà Lạt, 3 Zone canh tác, 12 Cảm biến GPS, `GW-01`, `UAV-ALPHA-01` và Mission mẫu 4 điểm) — không yêu cầu cài đặt MySQL thủ công khi chạy demo hoặc kiểm thử nhanh.

---

## 4. PHƯƠNG ÁN 1: KHỞI CHẠY NHANH BACKEND BẰNG DOCKER (KHUYẾN NGHỊ)

Backend đã được đóng gói theo chuẩn **Multi-Stage Build** trong [`backend/Dockerfile`](../backend/Dockerfile) (`maven:3.9.6-eclipse-temurin-17-alpine` → runtime `eclipse-temurin:17-jre-alpine` chạy dưới user không đặc quyền `appuser`).

### Bước 1: Dựng và khởi chạy Container Backend
```bash
cd backend
docker compose up -d --build
```

### Bước 2: Kiểm tra trạng thái & nhật ký Container
```bash
docker ps
docker logs -f smart-farm-backend
```

### Bước 2b: Kiểm tra nhanh Healthcheck Endpoint của Container
```bash
curl -i http://localhost:8080/api/v1/health
```
* Nếu kết nối MQTT Broker đám mây từ bên trong Container, truyền biến môi trường `MQTT_BROKER_URL=tcp://broker.hivemq.com:1883` trong `docker-compose.yml`.

### Bước 3: Dừng Container khi không sử dụng
```bash
docker compose down
```

---

## 5. PHƯƠNG ÁN 2: KHỞI CHẠY THỦ CÔNG TỪNG PHÂN HỆ TRÊN LOCAL

Để vận hành đầy đủ cả 3 phân hệ đồng thời, mở **3 cửa sổ Terminal riêng biệt**:

### Terminal 1 — Khởi chạy Backend API (Spring Boot 3.2.5)
**Trên Windows (PowerShell / CMD):**
```powershell
cd backend
.\mvnw.cmd spring-boot:run
```
**Trên macOS / Linux:**
```bash
cd backend
chmod +x mvnw
./mvnw spring-boot:run
```
* Đợi xuất hiện dòng `Started SmartFarmBackendApplication` (thường mất 5–10 giây).
* Nếu muốn kết nối trực tiếp MQTT Broker đám mây HiveMQ thay vì local broker:
  ```powershell
  .\mvnw.cmd spring-boot:run "-Dspring-boot.run.arguments=--mqtt.broker.url=tcp://broker.hivemq.com:1883"
  ```

### Terminal 2 — Khởi chạy Giao diện Web Frontend (React 19 + Vite 8)
Tại thư mục gốc dự án:
```bash
npm install
npm run dev
```
* Trình duyệt truy cập: **`http://localhost:5173`**
* Đóng gói bản Production và kiểm tra Lint:
  ```bash
  npm run build
  npm run lint
  ```

### Terminal 3 — Khởi chạy Bộ giả lập IoT & UAV Simulator (`iot-simulator/`)
**Trên Windows (PowerShell):**
```powershell
cd iot-simulator
.\gradlew.bat run
```
**Trên macOS / Linux:**
```bash
cd iot-simulator
chmod +x gradlew
./gradlew run
```

---

## 6. XÁC MINH SAU CÀI ĐẶT (POST-INSTALLATION VERIFICATION)

Sau khi các dịch vụ đã khởi chạy, kiểm tra nhanh theo bảng sau:

| Hạng mục kiểm tra | Địa chỉ / Câu lệnh | Kết quả mong đợi |
| :--- | :--- | :--- |
| **1. Health Check API** | `GET http://localhost:8080/api/v1/health` | HTTP `200 OK`, `"status": "UP"` |
| **2. Swagger UI / OpenAPI** | `http://localhost:8080/api/v1/swagger-ui/index.html` | Hiển thị đủ 64 REST API paths |
| **3. H2 Database Console** | `http://localhost:8080/api/v1/h2-console` *(JDBC URL: `jdbc:h2:mem:smartfarmdb`, User: `sa`, Pass: trống)* | Đăng nhập xem được các bảng `USERS`, `FARMS`, `ZONES`, `SENSORS`, `UAVS`, `MISSIONS`... |
| **4. Giao diện Web SPA** | `http://localhost:5173` | Hiển thị trang đăng nhập (tài khoản mẫu `admin` / `admin123` hoặc `farmer` / `farmer123`) |
| **5. Unit Test Backend** | `cd backend && .\mvnw.cmd test` | `83/83` tests PASS (`BUILD SUCCESS`) |
| **6. Unit Test Simulator** | `cd iot-simulator && .\gradlew.bat test` | `25/25` tests PASS (`BUILD SUCCESSFUL`) |
| **7. End-to-End System Test** | `cd iot-simulator && .\gradlew.bat run --args="--system-test http://localhost:8080/api/v1 tcp://broker.hivemq.com:1883" --console=plain` | `12/12` kịch bản E2E PASS (`100.0%`) |

---

## 7. XỬ LÝ LỖI CÀI ĐẶT THƯỜNG GẶP (TROUBLESHOOTING)

| Lỗi gặp phải | Nguyên nhân | Cách khắc phục |
| :--- | :--- | :--- |
| **`Port 8080 was already in use`** | Đã có tiến trình khác chiếm cổng `8080`. | Dừng tiến trình cũ hoặc chạy Backend ở cổng khác: `--server.port=8081`. |
| **`JAVA_HOME` không phải JDK 17** | Máy đang trỏ về JDK 8/11 cũ hơn yêu cầu. | Cài đặt Eclipse Temurin JDK 17 và cập nhật biến môi trường `JAVA_HOME` & `PATH`. |
| **`[MQTT GATEWAY] Chưa thể kết nối MQTT Broker (tcp://localhost:1883)`** | Chưa chạy Mosquitto tại máy local. | Đây chỉ là cảnh báo nhẹ (REST API vẫn chạy bình thường). Có thể khởi động Mosquitto hoặc truyền `--mqtt.broker.url=tcp://broker.hivemq.com:1883`. |
| **Không nhận được Email Alert** | Mặc định `APP_MAIL_ENABLED=false` để tránh lộ mật khẩu SMTP khi dev. | Bật `APP_MAIL_ENABLED=true` và cung cấp Gmail App Password qua biến `SPRING_MAIL_USERNAME` / `SPRING_MAIL_PASSWORD`. |
| **Lỗi font tiếng Việt khi chạy Gradle trên Windows CMD** | Codepage console Windows không ở UTF-8. | Chạy `chcp 65001` trước khi chạy `gradlew.bat` (dự án đã cấu hình sẵn `-Dfile.encoding=UTF-8` trong `build.gradle`). |

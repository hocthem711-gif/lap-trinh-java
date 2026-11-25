# 🌱 Smart Agriculture Monitoring System (Smart Farm IoT & UAV)

Hệ thống Giám sát & Điều khiển Nông nghiệp Thông minh tích hợp mạng lưới cảm biến IoT thời gian thực (MQTT), bộ lọc dữ liệu rác (`F19`), hệ thống cảnh báo vượt ngưỡng & Email Alert (`F08–F10`), quản lý đội bay UAV Waypoints (`F14–F17`), đồng bộ ngoại tuyến SQLite (`F18`) và xuất báo cáo Excel đa sheet (`F11`).

---

## 📂 Cấu Trúc Dự Án

* [`backend/`](backend/): Mã nguồn **Spring Boot 3.2.5** Backend Core (REST API 64 paths, JWT & RBAC, MQTT Gateway Subscriber, Alert Engine, Async Email Alert, WebSocket STOMP / SSE, `Dockerfile` Multi-Stage & `docker-compose.yml`).
* [`src/`](src/): Mã nguồn Giao diện Web **React 19 + TypeScript + Vite 8 + Redux Toolkit + Leaflet Map + Chart.js**.
* [`iot-simulator/`](iot-simulator/): Bộ giả lập thiết bị IoT & UAV (Java 17) với 7 chế độ vận hành: Online Stream (`F20`), Load Test 10–20 sensors, Waypoints Mission Validator, UAV Offline Sync (SQLite), Extreme Alert (`60°C / Pin 5%`), UAV Flight Realtime Telemetry (3D LERP) và End-to-End System Testing (`--system-test`).
* [`docs/`](docs/): Toàn bộ hồ sơ thiết kế kiến trúc UML, báo cáo kiểm thử và tài liệu hướng dẫn cài đặt & sử dụng.

---

## 📚 Bộ Hồ Sơ Tài Liệu & Sơ Đồ Kiến Trúc (`docs/`)

### 1. Hướng Dẫn Cài Đặt & Sử Dụng (Sprint 8 Final)
* 🛠️ **Hướng dẫn Cài đặt & Triển khai (Docker / Local):** [`docs/INSTALLATION_GUIDE.md`](docs/INSTALLATION_GUIDE.md)
* 📘 **Hướng dẫn Sử dụng Hệ thống (`v2.0` Full):** [`docs/USER_MANUAL.md`](docs/USER_MANUAL.md)
* 📡 **Hướng dẫn Vận hành IoT & UAV Simulator:** [`iot-simulator/README.md`](iot-simulator/README.md)

### 2. Bộ Sơ Đồ Kiến Trúc UML Hoàn Chỉnh (PlantUML + PNG/SVG)
* **Use Case Diagram:** [`UseCase.puml`](docs/UseCase.puml) | [`UseCase_Description.md`](docs/UseCase_Description.md)
* **Sequence Diagrams:** [`Sequence_Auth_Login.puml`](docs/Sequence_Auth_Login.puml) | [`Sequence_Add_Device.puml`](docs/Sequence_Add_Device.puml) | [`Sequence_Diagram_Description.md`](docs/Sequence_Diagram_Description.md)
* **Component Diagram (v2.0):** [`Component_Diagram.puml`](docs/Component_Diagram.puml) | [`Component_Diagram_Description.md`](docs/Component_Diagram_Description.md)
* **Activity Diagram (Alert Engine):** [`Activity_Diagram_Alert.puml`](docs/Activity_Diagram_Alert.puml) | [`Activity_Diagram_Alert_Description.md`](docs/Activity_Diagram_Alert_Description.md)
* **Class Diagram (Sprint 8):** [`Class_Diagram.puml`](docs/Class_Diagram.puml) | [`Class_Diagram_Description.md`](docs/Class_Diagram_Description.md)

### 3. Báo Cáo Kiểm Thử Theo Sprint (Sprint 2 → Sprint 8)
* 🧪 **Sprint 8 — System Testing Report (Toàn hệ thống):** [`docs/SYSTEM_TESTING_REPORT_SPRINT8.md`](docs/SYSTEM_TESTING_REPORT_SPRINT8.md)
* **Sprint 7 — UAV Realtime Telemetry:** [`docs/UAV_REALTIME_TELEMETRY_REPORT_SPRINT7.md`](docs/UAV_REALTIME_TELEMETRY_REPORT_SPRINT7.md)
* **Sprint 5 — UAV Offline Sync (SQLite):** [`docs/OFFLINE_SYNC_TEST_REPORT_SPRINT5.md`](docs/OFFLINE_SYNC_TEST_REPORT_SPRINT5.md)
* **Sprint 4 — Waypoints & Mission Test:** [`docs/WAYPOINTS_REVIEW_AND_MISSION_TEST_SPRINT4.md`](docs/WAYPOINTS_REVIEW_AND_MISSION_TEST_SPRINT4.md)
* **Sprint 3 — Sensor Load Test (10–20 sensors):** [`docs/LOAD_TEST_REPORT_SPRINT3.md`](docs/LOAD_TEST_REPORT_SPRINT3.md)
* **Sprint 2 — API Test & Postman:** [`docs/API_TEST_REPORT_SPRINT2.md`](docs/API_TEST_REPORT_SPRINT2.md)

---

## 🚀 Khởi Chạy Nhanh

```bash
# 1. Backend (Docker Compose hoặc Local Maven Wrapper)
cd backend && docker compose up -d --build
# Hoặc chạy local: .\mvnw.cmd spring-boot:run

# 2. Frontend Web SPA (http://localhost:5173)
npm install && npm run dev

# 3. IoT Simulator / End-to-End System Testing
cd iot-simulator && .\gradlew.bat run --args="--system-test" --console=plain
```

---

## 👥 Thành Viên Nhóm & Phân Công

* **Nguyễn Trần Đình Hiệu** — [@hieuclet249-bot](https://github.com/hieuclet249-bot) (Dev 1 — Backend Core, Security, Email Alert & Docker)
* **Đào Nguyễn Thiện Hiếu** — [@hieudnt0126-12072006](https://github.com/hieudnt0126-12072006) (Dev 2 — Gateway / MQTT, UAV Telemetry & Mission API)
* **Hồ Nguyễn Huy Long** — [@Longho2606](https://github.com/Longho2606) (Dev 3 — Frontend Core, Dashboard & Realtime Map)
* **Nguyễn Trường An** — [@Quatrungvoon](https://github.com/Quatrungvoon) (Dev 4 — UI/UX, Wireframe, Mission Planner, Alert & Excel Export)
* **Trần Nguyễn Bảo Hoàng** — [@hocthem711-gif](https://github.com/hocthem711-gif) (Dev 5 — IoT Simulator, System Architecture UML & QA / System Testing)

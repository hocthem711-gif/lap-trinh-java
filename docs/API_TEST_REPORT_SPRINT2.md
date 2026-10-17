# 📊 BÁO CÁO KIỂM THỬ API BACKEND SPRINT 2 (TEST REPORT)
## Dự án: Hệ Thống Giám Sát & Điều Khiển Nông Nghiệp Thông Minh (Smart Farm IoT)
### Nhiệm vụ: `[Sprint 2][Dev 5] LTJ-10: Test API Danh mục & Script MQTT Giả lập`

---

> **Người thực hiện:** Dev 5 (QA & IoT System Specialist)  
> **Thời gian thực hiện:** 17/10/2026  
> **Phiên bản Backend:** Spring Boot 3.2.5 (Sprint 2 - Commit `3e3122a` từ Dev 1)  
> **Cơ sở dữ liệu:** H2 In-Memory Database (`jdbc:h2:mem:smartfarmdb`)  
> **Công cụ kiểm thử:** Postman Collection v2.1 & Automated REST Test Script  
> **File cấu hình Postman:** [`docs/SmartFarm_Sprint2.postman_collection.json`](file:///f:/lap_trinh_java/docs/SmartFarm_Sprint2.postman_collection.json)  

---

## 1. MỤC TIÊU & PHẠM VI KIỂM THỬ

1. **Xác thực & Phân quyền (F01 - Auth & Security):**
   * Kiểm thử tính năng Đăng nhập cấp phát JWT Token (Admin & Farmer).
   * Kiểm thử tính năng Đăng ký tài khoản người dùng mới.
   * Kiểm thử bảo mật (Negative Test): Đăng nhập sai mật khẩu, truy cập endpoint không mang Token, kiểm tra phân quyền truy cập chéo giữa `ROLE_ADMIN` và `ROLE_FARMER`.
2. **Quản lý Thông tin Người dùng (F02 - User Profile):**
   * Truy xuất hồ sơ người dùng đang đăng nhập (`/users/me`).
   * Phân quyền danh sách người dùng (`/users` chỉ cho phép Admin).
3. **Quản lý Trang Trại (F03 - Farm CRUD):**
   * Kiểm thử toàn bộ vòng đời CRUD: Thêm mới, lấy danh sách, xem chi tiết, cập nhật và xóa trang trại.
4. **Quản lý Vùng Canh Tác (F03 - Zone CRUD):**
   * Kiểm thử toàn bộ vòng đời CRUD: Thêm mới Zone gắn với `farmId`, lấy danh sách Zone theo từng trang trại, cập nhật và xóa Zone.

---

## 2. MA TRẬN KẾT QUẢ KIỂM THỬ (TEST MATRIX)

| Test ID | Phân hệ | Phương thức | Endpoint | Mô tả kiểm thử | Kỳ vọng (HTTP) | Thực tế | Trạng thái |
|:---:|:---:|:---:|:---|:---|:---:|:---:|:---:|
| **TC-01** | Auth | `POST` | `/api/v1/auth/login` | Đăng nhập Admin (`admin` / `admin123`) | `200 OK` | `200 OK` | ✅ **PASS** |
| **TC-02** | Auth | `POST` | `/api/v1/auth/login` | Đăng nhập Farmer (`farmer` / `farmer123`) | `200 OK` | `200 OK` | ✅ **PASS** |
| **TC-03** | Auth | `POST` | `/api/v1/auth/login` | Đăng nhập sai mật khẩu (Negative Test) | `401 Unauthorized` | `401 Unauthorized` | ✅ **PASS** |
| **TC-04** | Auth | `POST` | `/api/v1/auth/register` | Đăng ký tài khoản người dùng mới | `200/201 Created` | `200 OK` | ✅ **PASS** |
| **TC-05** | User | `GET` | `/api/v1/users/me` | Lấy Profile cá nhân khi có Bearer Token | `200 OK` | `200 OK` | ✅ **PASS** |
| **TC-06** | User | `GET` | `/api/v1/users/me` | Truy cập tài nguyên không kèm Token | `401/403 Forbidden` | `403 Forbidden` | ✅ **PASS** |
| **TC-07** | User | `GET` | `/api/v1/users` | Admin xem danh sách toàn bộ Users | `200 OK` | `200 OK` | ✅ **PASS** |
| **TC-08** | User | `GET` | `/api/v1/users` | Farmer truy cập danh sách Users (Bị chặn) | `403 Forbidden` | `403 Forbidden` | ✅ **PASS** |
| **TC-09** | Farm | `GET` | `/api/v1/farms` | Lấy danh sách trang trại của Farmer | `200 OK` | `200 OK` | ✅ **PASS** |
| **TC-10** | Farm | `POST` | `/api/v1/farms` | Tạo mới một trang trại | `200/201 Created` | `200 OK` | ✅ **PASS** |
| **TC-11** | Farm | `GET` | `/api/v1/farms/{id}` | Xem chi tiết trang trại theo ID | `200 OK` | `200 OK` | ✅ **PASS** |
| **TC-12** | Farm | `PUT` | `/api/v1/farms/{id}` | Cập nhật thông tin trang trại | `200 OK` | `200 OK` | ✅ **PASS** |
| **TC-13** | Zone | `GET` | `/api/v1/zones` | Lấy danh sách toàn bộ các Zone | `200 OK` | `200 OK` | ✅ **PASS** |
| **TC-14** | Zone | `POST` | `/api/v1/zones` | Tạo mới Zone trực thuộc Farm | `200/201 Created` | `200 OK` | ✅ **PASS** |
| **TC-15** | Zone | `GET` | `/api/v1/zones/farm/{farmId}` | Lọc danh sách Zone theo Farm ID | `200 OK` | `200 OK` | ✅ **PASS** |
| **TC-16** | Zone | `GET` | `/api/v1/zones/{id}` | Xem chi tiết Zone theo ID | `200 OK` | `200 OK` | ✅ **PASS** |
| **TC-17** | Zone | `PUT` | `/api/v1/zones/{id}` | Cập nhật thông tin Zone (cây trồng, tên) | `200 OK` | `200 OK` | ✅ **PASS** |
| **TC-18** | Zone | `DELETE` | `/api/v1/zones/{id}` | Xóa một Zone khỏi hệ thống | `200 OK` | `200 OK` | ✅ **PASS** |
| **TC-19** | Farm | `DELETE` | `/api/v1/farms/{id}` | Xóa một Farm khỏi hệ thống | `200 OK` | `200 OK` | ✅ **PASS** |

* **Tổng số kịch bản:** 19/19  
* **Số ca thành công:** 19 (100%)  
* **Số ca thất bại:** 0 (0%)  

---

## 3. CÁC PHÁT HIỆN & ĐIỀU CHỈNH KỸ THUẬT QUAN TRỌNG

1. **Chuẩn hóa trường dữ liệu Request:**
   * Endpoint `/api/v1/auth/login` yêu cầu trường `usernameOrEmail` (cho phép người dùng đăng nhập linh hoạt bằng cả Username lẫn Email).
   * Endpoint `/api/v1/farms` yêu cầu trường diện tích là `areaSquareMeters` (chuẩn hóa đơn vị đo mét vuông thay vì float không rõ đơn vị).
2. **Tối ưu mã phản hồi lỗi (Exception Handling):**
   * Trong phiên bản ban đầu, khi người dùng nhập sai mật khẩu (`BadCredentialsException`) hoặc truy cập trái quyền (`AccessDeniedException`), hệ thống ném ngoại lệ chung dẫn đến lỗi `500 Internal Server Error`.
   * **Dev 5 đã bổ sung xử lý:** Cập nhật [`GlobalExceptionHandler.java`](file:///f:/lap_trinh_java/backend/src/main/java/com/smartfarm/backend/exception/GlobalExceptionHandler.java) để trả về đúng chuẩn HTTP RESTful:
     * `BadCredentialsException` ➔ Trả về `401 Unauthorized` kèm thông báo *"Tên đăng nhập hoặc mật khẩu không chính xác"*.
     * `AccessDeniedException` ➔ Trả về `403 Forbidden` kèm thông báo *"Bạn không có quyền truy cập chức năng này (Access Denied)"*.

---

## 4. HƯỚNG DẪN IMPORT & SỬ DỤNG POSTMAN COLLECTION

1. Mở phần mềm **Postman**.
2. Nhấn nút **Import** ở góc trên bên trái, chọn file:
   `f:\lap_trinh_java\docs\SmartFarm_Sprint2.postman_collection.json`
3. Bộ sưu tập đã được thiết lập sẵn:
   * Biến môi trường tự động `{{baseUrl}}` trỏ đến `http://localhost:8080/api/v1`.
   * Khi chạy request `1.1 Login - Admin` hoặc `1.2 Login - Farmer`, script tự động lưu `accessToken` vào collection variable để các request sau tự động sử dụng Bearer Token mà không cần copy paste thủ công.

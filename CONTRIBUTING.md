# 🤝 Quy Tắc Đóng Góp Code (Contributing Guidelines)

> ⚠️ **Nhớ**: Thầy có quyền xem GitHub. Mọi thứ phải sạch sẽ, chuyên nghiệp.

---

## 📌 Quy Trình Làm Việc: Jira → Git → GitHub → Jira

```
 JIRA Board                    Git (máy cá nhân)               GitHub
 ──────────                    ──────────────────               ──────
 1. Nhận task              2. git pull + tạo branch
    "In Progress"  ──────▶    feat/IOT-42-mô-tả
                            3. Code + commit
                               gắn Jira Key     ──────▶    4. Push + tạo PR
                                                            5. Review + Merge
 6. Chuyển "Done"  ◀───────────────────────────────────────   Merge xong
```

---

## 🌿 Quy Tắc Đặt Tên Branch

### Format bắt buộc
```
<loại>/<JIRA-KEY>-<mô-tả-ngắn-bằng-tiếng-việt-không-dấu>
```

### Các loại branch

| Loại | Khi nào dùng | Ví dụ |
|------|-------------|-------|
| `feat/` | Thêm tính năng mới | `feat/IOT-42-them-mqtt-publisher` |
| `fix/` | Sửa lỗi | `fix/IOT-55-loi-ket-noi-broker` |
| `refactor/` | Cải thiện code cũ | `refactor/IOT-60-tach-service-layer` |
| `docs/` | Viết/sửa tài liệu | `docs/IOT-70-cap-nhat-readme` |
| `test/` | Thêm/sửa unit test | `test/IOT-80-test-sensor-manager` |
| `hotfix/` | Sửa lỗi gấp trên main | `hotfix/IOT-99-fix-crash-on-start` |

### ⛔ Branch name SAI (thầy thấy sẽ đánh giá thấp)
```
my-branch
fix-bug
test123
abc
nguyenvana-branch
```

### ✅ Branch name ĐÚNG (chuyên nghiệp)
```
feat/IOT-42-them-chuc-nang-gui-du-lieu
fix/IOT-55-xu-ly-null-pointer-sensor
docs/IOT-70-them-so-do-kien-truc
```

> **Tại sao gắn Jira Key?**
> - Thầy nhìn vào biết ngay branch này làm task nào
> - Dễ truy vết: từ code → tìm được yêu cầu gốc trên Jira
> - GitHub và Jira tự liên kết nếu cấu hình integration

---

## 💬 Quy Tắc Viết Commit Message

### Format bắt buộc
```
<loại>(<JIRA-KEY>): <mô tả hành động cụ thể>
```

### Bảng loại commit

| Prefix | Ý nghĩa | Ví dụ commit message |
|--------|----------|---------------------|
| `feat` | Thêm tính năng | `feat(IOT-42): thêm class MqttPublisher gửi dữ liệu sensor` |
| `fix` | Sửa lỗi | `fix(IOT-55): xử lý NullPointerException khi sensor ngắt kết nối` |
| `docs` | Tài liệu | `docs(IOT-70): thêm sơ đồ sequence cho luồng gửi dữ liệu` |
| `style` | Format code | `style(IOT-42): format code theo convention nhóm` |
| `refactor` | Tái cấu trúc | `refactor(IOT-60): tách MqttService ra khỏi main class` |
| `test` | Test | `test(IOT-80): thêm unit test cho SensorDataParser` |
| `chore` | Config/build | `chore(IOT-90): thêm dependency Gson vào build.gradle` |

### ❌ Commit message SẼ BỊ TRỪ ĐIỂM (thầy nhìn thấy)
```
fix bug
update
.
sửa lỗi
hjkhjk
commit cuoi cung
xong roi
test thu
```

### ✅ Commit message CHUYÊN NGHIỆP
```
feat(IOT-42): tạo SensorData model với các trường temperature, humidity
feat(IOT-42): implement MqttPublisher với auto-reconnect
fix(IOT-55): thêm null check trước khi parse sensor data
test(IOT-80): thêm 5 test case cho SensorManager.addSensor()
docs(IOT-70): cập nhật README với hướng dẫn cài đặt và chạy dự án
```

---

## 🔀 Quy Trình Pull Request (PR)

### Trước khi tạo PR — Tự kiểm tra

```bash
# 1. Cập nhật code mới nhất từ main
git checkout main
git pull origin main
git checkout <branch-của-bạn>
git merge main                    # Resolve conflict nếu có

# 2. Chạy build & test
./gradlew build                   # Phải PASS
./gradlew test                    # Phải PASS

# 3. Review code của chính mình
git diff main..HEAD               # Đọc lại tất cả thay đổi
```

### Tạo PR trên GitHub

**Tiêu đề PR:**
```
[IOT-42] Thêm chức năng gửi dữ liệu sensor qua MQTT
```

**Mô tả PR (template):**
```markdown
## 📋 Jira Task
- Link: [IOT-42](https://your-team.atlassian.net/browse/IOT-42)

## 📝 Mô Tả
Mô tả ngắn gọn thay đổi đã làm và TẠI SAO.

## ✅ Checklist
- [ ] Code build thành công (`gradle build`)
- [ ] Đã chạy test, tất cả PASS
- [ ] Đã viết Javadoc cho class/method public mới
- [ ] Không commit file thừa (IDE, build, file cá nhân)
- [ ] Commit message đúng format có Jira Key
- [ ] Đã tự review code trước khi tạo PR

## 📸 Kết Quả (nếu có)
Ảnh chụp màn hình hoặc log kết quả chạy.
```

### Review PR

| Ai | Việc cần làm |
|----|-------------|
| Người tạo PR | Tag ít nhất 1 thành viên review |
| Người review | Đọc code, comment nếu cần sửa, approve nếu OK |
| Người merge | Chỉ merge khi có ít nhất 1 approval |

### Sau khi merge
1. Xóa branch cũ trên GitHub
2. Cập nhật Jira task sang **"Done"**
3. Ở máy cá nhân: `git checkout main && git pull`

---

## ⚠️ DANH SÁCH CẤM — Không Được Vi Phạm

### 🚫 Về Git
1. ❌ **KHÔNG push thẳng lên `main`** — luôn qua PR
2. ❌ **KHÔNG force push** (`git push -f`) lên branch chung
3. ❌ **KHÔNG xóa branch** của người khác khi chưa được phép
4. ❌ **KHÔNG merge PR** khi chưa có ai review

### 🚫 Về nội dung commit
5. ❌ **KHÔNG commit file build** (`.class`, `.jar`, `build/`, `.gradle/`)
6. ❌ **KHÔNG commit file IDE** (`.idea/`, `.vscode/`, `*.iml`)
7. ❌ **KHÔNG commit file hệ điều hành** (`Thumbs.db`, `.DS_Store`)
8. ❌ **KHÔNG commit mật khẩu**, API key, token, file `.env`
9. ❌ **KHÔNG commit code nháp**, code thử, code test tạm
10. ❌ **KHÔNG commit file từ thư mục `no github`**

### 🚫 Về chất lượng
11. ❌ **KHÔNG commit code không build được**
12. ❌ **KHÔNG viết commit message nhảm** — thầy NHÌN THẤY
13. ❌ **KHÔNG copy code internet** mà không hiểu và chỉnh sửa
14. ❌ **KHÔNG để code chết** (code bị comment out) trên GitHub
15. ❌ **KHÔNG commit file to** (video, file nén, database dump)

---

## 🧹 Checklist Trước Mỗi Lần Push

Chạy qua danh sách này TRƯỚC KHI push:

- [ ] `git status` — chỉ có file cần thiết, không có file thừa
- [ ] `git diff --cached` — đọc lại tất cả thay đổi
- [ ] `gradle build` — build thành công
- [ ] Commit message có Jira Key và mô tả rõ ràng
- [ ] Không có file nhạy cảm (mật khẩu, key, token)
- [ ] Không có file IDE, build, file cá nhân

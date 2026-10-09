# Quy trình quản lý mã nguồn (Gitflow)

Tài liệu này hướng dẫn quy trình Gitflow chuẩn được áp dụng cho toàn bộ thành viên trong dự án.

## 1. Các nhánh (Branches) chính

- **`main`**: Nhánh chứa mã nguồn ổn định, luôn ở trạng thái sẵn sàng để triển khai (production). Chỉ merge vào `main` khi có bản release chính thức.
- **`develop`**: Nhánh trung tâm cho quá trình phát triển. Chứa mã nguồn mới nhất của phiên bản tiếp theo. Tất cả các nhánh tính năng (feature) sẽ rẽ nhánh từ đây và gộp (merge) lại vào đây.

## 2. Các nhánh hỗ trợ (Supporting branches)

### Nhánh Tính năng (Feature branches)
- **Rẽ nhánh từ:** `develop`
- **Gộp vào:** `develop`
- **Quy tắc đặt tên:** `feature/<mã-task>-<tên-ngắn-gọn>` (ví dụ: `feature/LTJ-4-setup-gitflow`)
- **Mục đích:** Phát triển tính năng mới. Mỗi dev tự tạo nhánh này và sau khi xong sẽ tạo Pull Request (PR) về `develop`.

### Nhánh Sửa lỗi nhanh (Hotfix branches)
- **Rẽ nhánh từ:** `main`
- **Gộp vào:** `main` và `develop`
- **Quy tắc đặt tên:** `hotfix/<phiên-bản>` hoặc `hotfix/<mã-lỗi>` (ví dụ: `hotfix/v1.0.1` hoặc `hotfix/login-bug`)
- **Mục đích:** Sửa lỗi nghiêm trọng phát sinh trên môi trường production.

### Nhánh Phát hành (Release branches)
- **Rẽ nhánh từ:** `develop`
- **Gộp vào:** `main` và `develop`
- **Quy tắc đặt tên:** `release/<phiên-bản>` (ví dụ: `release/v1.0.0`)
- **Mục đích:** Chuẩn bị cho một đợt phát hành mới, chỉ sửa các lỗi nhỏ (bug fixes) và chuẩn bị metadata (phiên bản, tài liệu).

## 3. Quy trình thực hiện (Dành cho mỗi Dev)

1. **Cập nhật nhánh develop mới nhất:**
   ```bash
   git checkout develop
   git pull origin develop
   ```
2. **Tạo nhánh feature để làm việc:**
   ```bash
   git checkout -b feature/LTJ-<số_task>-<tên_task>
   ```
3. **Thực hiện code, commit và push:**
   ```bash
   git add .
   git commit -m "feat(LTJ-<số_task>): Mô tả công việc đã làm"
   git push origin feature/LTJ-<số_task>-<tên_task>
   ```
4. **Tạo Pull Request (PR):**
   - Lên GitHub tạo Pull Request từ nhánh `feature/...` vào nhánh `develop`.
   - Gắn (assign) người review code (các thành viên khác hoặc leader).
5. **Merge code:** 
   - Sau khi PR được approve, tiến hành merge vào `develop`.
   - Xóa nhánh feature (nếu không còn sử dụng).

## 4. Quy ước viết Commit Message
Nên sử dụng chuẩn **Conventional Commits**:
- `feat(LTJ-4): add gitflow documentation`: Thêm tính năng mới / file mới.
- `fix(LTJ-5): resolve null pointer exception`: Sửa lỗi.
- `docs(LTJ-4): update README.md`: Cập nhật tài liệu.
- `style(LTJ-6): format code`: Chỉnh sửa format code (không làm thay đổi logic).
- `refactor(LTJ-7): restructure state management`: Cấu trúc lại code.

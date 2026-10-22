# 📌 Hướng Dẫn Tích Hợp & Quy Trình Jira (Jira Workflow Standard)

Tài liệu này quy định quy chuẩn đồng bộ giữa **Jira Software**, **Git**, và **GitHub** để đảm bảo tiến độ minh bạch, chuyên nghiệp (đặc biệt khi thầy kiểm tra).

---

## 1. Trạng Thái Task (Workflow Lifecycle trên Jira)

Mọi task/issue trên Jira bắt buộc phải tuân theo vòng đời sau:

```
[ To Do ] ──▶ [ In Progress ] ──▶ [ Code Review / PR ] ──▶ [ Testing / QA ] ──▶ [ Done ]
```

| Cột Jira | Ý nghĩa & Điều kiện chuyển cột |
|---|---|
| **To Do (Backlog)** | Công việc đã được phân công hoặc lên kế hoạch trong Sprint, chưa bắt đầu làm. |
| **In Progress** | Thành viên **bắt đầu code**. Khi kéo sang đây, phải tạo nhánh Git mang mã Jira tương ứng. |
| **Code Review / In Review** | Code đã xong, đã tạo **Pull Request (PR)** trên GitHub và đang chờ thành viên khác duyệt. |
| **Testing / Verify** | Đã merge vào branch phát triển, chạy thử nghiệm kiểm thử tính năng hoàn chỉnh. |
| **Done** | Tính năng chạy chuẩn, tài liệu/comment đầy đủ, PR đã merge vào `main`. |

---

## 2. Quy Chuẩn Đặt Tên & Viết Issue Trên Jira

### Format Tiêu đề Issue
```
[Module/Feature] <Hành động cụ thể>
```
- ✅ **Ví dụ tốt**: 
  - `[MQTT] Viết service kết nối và lắng nghe broker`
  - `[Sensor] Tạo model giả lập dữ liệu nhiệt độ và độ ẩm`
  - `[Bug] Sửa lỗi ngoại lệ khi mất kết nối đột ngột`
- ❌ **Ví dụ xấu**: `Làm code`, `Fix bug`, `Bài tập tuần 3`

### Nội dung Issue (Description)
Mỗi issue trên Jira cần có ít nhất:
1. **Mục tiêu (Goal)**: Tính năng này giải quyết vấn đề gì?
2. **Tiêu chí hoàn thành (Acceptance Criteria - AC)**:
   - [ ] Build không có lỗi cú pháp/warning.
   - [ ] Có đầy đủ test case cơ bản.
   - [ ] Đã chạy thử kết nối thành công.

---

## 3. Quy Tắc Đồng Bộ Tự Động Giữa Jira và GitHub

Nếu nhóm liên kết GitHub Repo với Jira (qua GitHub app for Jira hoặc Webhook / Smart Commits):

### Cú pháp Smart Commits trong Git:
Thêm các lệnh này vào cuối Commit Message:
- **Ghi log thời gian làm việc**: `#time <khoảng_thời_gian>` (ví dụ: `feat(IOT-12): thêm sensor #time 2h`)
- **Để lại comment vào Jira issue**: `#comment <nội dung>`
- **Chuyển trạng thái task**: Dùng `#transition` hoặc keyword đóng task khi merge PR: `Closes IOT-12` hoặc `Fixes IOT-12`.

---

## 4. Trách Nhiệm Của Thành Viên Khi Họp Sprint & Báo Cáo

1. **Daily / Cập nhật tiến độ**: Kéo task đúng thực tế mỗi ngày. Không để tình trạng "code xong hết rồi mới kéo 1 loạt từ To Do sang Done".
2. **Estimation**: Đánh giá Story Points hoặc Estimated Hours hợp lý trước khi Sprint bắt đầu.
3. **Blockers (Trở ngại)**: Nếu bị vướng lỗi không sửa được quá 1 ngày, tag thành viên khác hoặc ghi chú vào mục comment của Jira để nhóm hỗ trợ, không ủ việc.

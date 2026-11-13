package com.smartfarm.backend.controller;

import com.smartfarm.backend.common.ApiResponse;
import com.smartfarm.backend.dto.request.AlertCreateRequest;
import com.smartfarm.backend.dto.response.AlertResponse;
import com.smartfarm.backend.service.AlertService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/alerts")
@Tag(name = "8. Alert Management", description = "APIs Quản lý Cảnh báo (F08)")
public class AlertController {

    private final AlertService alertService;

    public AlertController(AlertService alertService) {
        this.alertService = alertService;
    }

    @PostMapping
    @Operation(summary = "Tạo cảnh báo mới (F08)", description = "Tạo một cảnh báo cho Zone/Sensor khi vượt ngưỡng")
    public ResponseEntity<ApiResponse<AlertResponse>> createAlert(@Valid @RequestBody AlertCreateRequest request) {
        AlertResponse response = alertService.createAlert(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Tạo cảnh báo thành công!", response));
    }

    @GetMapping
    @Operation(summary = "Lấy danh sách tất cả cảnh báo", description = "Trả về toàn bộ cảnh báo trong hệ thống")
    public ResponseEntity<ApiResponse<List<AlertResponse>>> getAllAlerts() {
        List<AlertResponse> list = alertService.getAllAlerts();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách cảnh báo thành công!", list));
    }

    @GetMapping("/zone/{zoneId}")
    @Operation(summary = "Lấy cảnh báo theo Zone")
    public ResponseEntity<ApiResponse<List<AlertResponse>>> getAlertsByZone(@PathVariable Long zoneId) {
        List<AlertResponse> list = alertService.getAlertsByZoneId(zoneId);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/unread")
    @Operation(summary = "Lấy danh sách cảnh báo chưa đọc")
    public ResponseEntity<ApiResponse<List<AlertResponse>>> getUnreadAlerts() {
        List<AlertResponse> list = alertService.getUnreadAlerts();
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/unread/count")
    @Operation(summary = "Đếm số cảnh báo chưa đọc")
    public ResponseEntity<ApiResponse<Long>> countUnreadAlerts() {
        long count = alertService.countUnreadAlerts();
        return ResponseEntity.ok(ApiResponse.success(count));
    }

    @PatchMapping("/{id}/read")
    @Operation(summary = "Đánh dấu cảnh báo đã đọc (F08)")
    public ResponseEntity<ApiResponse<AlertResponse>> markAsRead(@PathVariable Long id) {
        AlertResponse response = alertService.markAsRead(id);
        return ResponseEntity.ok(ApiResponse.success("Đã đánh dấu đã đọc!", response));
    }

    @PatchMapping("/{id}/resolve")
    @Operation(summary = "Xử lý/Đóng cảnh báo (F08)", description = "Đánh dấu cảnh báo đã được xử lý kèm ghi chú")
    public ResponseEntity<ApiResponse<AlertResponse>> resolveAlert(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        String resolvedNote = (body != null) ? body.get("resolvedNote") : null;
        AlertResponse response = alertService.resolveAlert(id, resolvedNote);
        return ResponseEntity.ok(ApiResponse.success("Đã xử lý cảnh báo!", response));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa cảnh báo")
    public ResponseEntity<ApiResponse<String>> deleteAlert(@PathVariable Long id) {
        alertService.deleteAlert(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa cảnh báo thành công!", "Alert ID " + id + " đã bị xóa."));
    }
}

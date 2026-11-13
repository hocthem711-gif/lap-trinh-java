package com.smartfarm.backend.controller;

import com.smartfarm.backend.common.ApiResponse;
import com.smartfarm.backend.dto.request.ThresholdRequest;
import com.smartfarm.backend.dto.response.ThresholdResponse;
import com.smartfarm.backend.service.ThresholdService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/thresholds")
@Tag(name = "7. Threshold Management", description = "APIs Quản lý Ngưỡng Cảnh báo (F09)")
public class ThresholdController {

    private final ThresholdService thresholdService;

    public ThresholdController(ThresholdService thresholdService) {
        this.thresholdService = thresholdService;
    }

    @PostMapping
    @Operation(summary = "Tạo cấu hình ngưỡng mới (F09)", description = "Tạo ngưỡng min/max cho một loại cảm biến tại Zone cụ thể")
    public ResponseEntity<ApiResponse<ThresholdResponse>> createThreshold(@Valid @RequestBody ThresholdRequest request) {
        ThresholdResponse response = thresholdService.createThreshold(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Tạo ngưỡng thành công!", response));
    }

    @GetMapping
    @Operation(summary = "Lấy tất cả ngưỡng trong hệ thống", description = "Trả về danh sách toàn bộ cấu hình ngưỡng")
    public ResponseEntity<ApiResponse<List<ThresholdResponse>>> getAllThresholds() {
        List<ThresholdResponse> list = thresholdService.getAllThresholds();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách ngưỡng thành công!", list));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết ngưỡng theo ID")
    public ResponseEntity<ApiResponse<ThresholdResponse>> getThresholdById(@PathVariable Long id) {
        ThresholdResponse response = thresholdService.getThresholdById(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/zone/{zoneId}")
    @Operation(summary = "Lấy danh sách ngưỡng theo Zone", description = "Trả về tất cả ngưỡng cấu hình của một Zone cụ thể")
    public ResponseEntity<ApiResponse<List<ThresholdResponse>>> getThresholdsByZone(@PathVariable Long zoneId) {
        List<ThresholdResponse> list = thresholdService.getThresholdsByZoneId(zoneId);
        return ResponseEntity.ok(ApiResponse.success("Lấy ngưỡng theo Zone thành công!", list));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật ngưỡng (F09)", description = "Cập nhật giá trị min/max cho ngưỡng đã tồn tại")
    public ResponseEntity<ApiResponse<ThresholdResponse>> updateThreshold(@PathVariable Long id, @Valid @RequestBody ThresholdRequest request) {
        ThresholdResponse response = thresholdService.updateThreshold(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật ngưỡng thành công!", response));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa cấu hình ngưỡng")
    public ResponseEntity<ApiResponse<String>> deleteThreshold(@PathVariable Long id) {
        thresholdService.deleteThreshold(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa ngưỡng thành công!", "Threshold ID " + id + " đã bị xóa."));
    }
}

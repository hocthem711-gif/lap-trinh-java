package com.smartfarm.backend.controller;

import com.smartfarm.backend.common.ApiResponse;
import com.smartfarm.backend.dto.request.SensorCreateRequest;
import com.smartfarm.backend.dto.response.SensorResponse;
import com.smartfarm.backend.service.SensorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/sensors")
@Tag(name = "5. Sensor Management", description = "APIs Quản lý Thiết bị Cảm biến (Sensor CRUD) (F03)")
public class SensorController {

    private final SensorService sensorService;

    public SensorController(SensorService sensorService) {
        this.sensorService = sensorService;
    }

    @PostMapping
    @Operation(summary = "Tạo mới cảm biến (F03)", description = "Đăng ký một cảm biến mới gắn với Vùng canh tác cụ thể (zoneId)")
    public ResponseEntity<ApiResponse<SensorResponse>> createSensor(@Valid @RequestBody SensorCreateRequest request) {
        SensorResponse response = sensorService.createSensor(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Đăng ký cảm biến thành công!", response));
    }

    @GetMapping
    @Operation(summary = "Lấy toàn bộ danh sách cảm biến", description = "Lấy danh sách tất cả các cảm biến trong hệ thống phục vụ hiển thị cấu hình thiết bị")
    public ResponseEntity<ApiResponse<List<SensorResponse>>> getAllSensors() {
        List<SensorResponse> list = sensorService.getAllSensors();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách cảm biến thành công!", list));
    }

    @GetMapping("/zone/{zoneId}")
    @Operation(summary = "Lấy danh sách cảm biến theo Vùng canh tác", description = "Lấy các cảm biến thuộc một Zone cụ thể")
    public ResponseEntity<ApiResponse<List<SensorResponse>>> getSensorsByZoneId(@PathVariable Long zoneId) {
        List<SensorResponse> list = sensorService.getSensorsByZoneId(zoneId);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách cảm biến theo vùng thành công!", list));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Xem chi tiết cảm biến theo ID", description = "Lấy thông tin chi tiết cấu hình và tọa độ của cảm biến")
    public ResponseEntity<ApiResponse<SensorResponse>> getSensorById(@PathVariable Long id) {
        SensorResponse response = sensorService.getSensorById(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật thông tin cảm biến", description = "Chỉnh sửa tên, tọa độ GPS hoặc điều chuyển vùng canh tác")
    public ResponseEntity<ApiResponse<SensorResponse>> updateSensor(@PathVariable Long id, @Valid @RequestBody SensorCreateRequest request) {
        SensorResponse response = sensorService.updateSensor(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật cảm biến thành công!", response));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa cảm biến", description = "Xóa thông tin thiết bị cảm biến khỏi hệ thống")
    public ResponseEntity<ApiResponse<String>> deleteSensor(@PathVariable Long id) {
        sensorService.deleteSensor(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa cảm biến thành công!", "Sensor ID " + id + " đã bị xóa."));
    }
}

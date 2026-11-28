package com.smartfarm.backend.controller;

import com.smartfarm.backend.common.ApiResponse;
import com.smartfarm.backend.dto.response.SensorResponse;
import com.smartfarm.backend.entity.Gateway;
import com.smartfarm.backend.entity.Sensor;
import com.smartfarm.backend.entity.Zone;
import com.smartfarm.backend.service.GatewayService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/gateways")
@RequiredArgsConstructor
@Tag(name = "IoT Gateway Management", description = "APIs quản lý trạm thu phát Gateway và cấu hình Zone cho cảm biến (LTJ-7)")
public class GatewayController {

    private final GatewayService gatewayService;

    @GetMapping
    @Operation(summary = "Lấy danh sách tất cả trạm Gateway")
    public ResponseEntity<ApiResponse<List<Gateway>>> getAllGateways() {
        List<Gateway> list = gatewayService.getAllGateways();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách Gateway thành công", list));
    }

    @GetMapping("/{code}")
    @Operation(summary = "Lấy thông tin trạm Gateway theo mã")
    public ResponseEntity<ApiResponse<Gateway>> getGatewayByCode(@PathVariable String code) {
        Gateway gateway = gatewayService.getGatewayByCode(code);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin Gateway thành công", gateway));
    }

    @PostMapping
    @Operation(summary = "Khai báo trạm Gateway mới")
    public ResponseEntity<ApiResponse<Gateway>> createGateway(@RequestBody Gateway gateway) {
        Gateway saved = gatewayService.createGateway(gateway);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Khai báo Gateway thành công", saved));
    }

    @DeleteMapping("/{code}")
    @Operation(summary = "Xóa trạm Gateway theo mã code (khớp api.ts)")
    public ResponseEntity<ApiResponse<String>> deleteGateway(@PathVariable String code) {
        gatewayService.deleteGatewayByCode(code);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa Gateway mã: " + code, code));
    }

    @PatchMapping("/{code}/status")
    @Operation(summary = "Cập nhật trạng thái hoạt động của trạm Gateway (LTJ-7)")
    public ResponseEntity<ApiResponse<Gateway>> updateGatewayStatus(
            @PathVariable String code,
            @RequestBody Map<String, String> payload) {
        String status = payload != null ? payload.get("status") : null;
        Gateway updated = gatewayService.updateGatewayStatus(code, status);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái Gateway thành công", updated));
    }

    @PatchMapping("/sensors/{sensorId}/zone")
    @Operation(summary = "Gán cảm biến vào khu vực Zone qua Gateway (LTJ-7)")
    public ResponseEntity<ApiResponse<SensorResponse>> assignSensorToZone(
            @PathVariable Long sensorId,
            @RequestBody Map<String, Long> payload) {
        Long zoneId = payload != null ? payload.get("zoneId") : null;
        if (zoneId == null) {
            throw new IllegalArgumentException("Vui lòng truyền zoneId hợp lệ");
        }
        Sensor updated = gatewayService.assignSensorToZone(sensorId, zoneId);
        return ResponseEntity.ok(ApiResponse.success("Gán cảm biến vào Zone thành công", toSensorResponse(updated)));
    }

    private SensorResponse toSensorResponse(Sensor sensor) {
        Zone zone = sensor.getZone();
        Long zoneId = zone != null ? zone.getId() : null;
        String zoneName = zone != null ? zone.getName() : null;
        Long farmId = (zone != null && zone.getFarm() != null) ? zone.getFarm().getId() : null;
        String farmName = (zone != null && zone.getFarm() != null) ? zone.getFarm().getName() : null;

        return new SensorResponse(
                sensor.getId(),
                sensor.getSensorCode(),
                sensor.getName(),
                sensor.getSensorType(),
                sensor.getStatus(),
                zoneId,
                zoneName,
                farmId,
                farmName,
                sensor.getLatitude(),
                sensor.getLongitude(),
                sensor.getInstalledAt()
        );
    }
}

package com.smartfarm.backend.controller;

import com.smartfarm.backend.entity.Gateway;
import com.smartfarm.backend.entity.Sensor;
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
@RequestMapping({"/api/v1/gateways", "/gateways"})
@RequiredArgsConstructor
@Tag(name = "IoT Gateway Management", description = "APIs quản lý trạm thu phát Gateway và cấu hình Zone cho cảm biến (LTJ-7)")
public class GatewayController {

    private final GatewayService gatewayService;

    @GetMapping
    @Operation(summary = "Lấy danh sách tất cả trạm Gateway")
    public ResponseEntity<List<Gateway>> getAllGateways() {
        return ResponseEntity.ok(gatewayService.getAllGateways());
    }

    @PostMapping
    @Operation(summary = "Khai báo trạm Gateway mới")
    public ResponseEntity<Gateway> createGateway(@RequestBody Gateway gateway) {
        Gateway saved = gatewayService.createGateway(gateway);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PatchMapping("/sensors/{sensorId}/zone")
    @Operation(summary = "Gán cảm biến vào khu vực Zone qua Gateway (LTJ-7)")
    public ResponseEntity<Sensor> assignSensorToZone(
            @PathVariable Long sensorId,
            @RequestBody Map<String, Long> payload) {
        Long zoneId = payload != null ? payload.get("zoneId") : null;
        if (zoneId == null) {
            throw new IllegalArgumentException("Vui lòng truyền zoneId hợp lệ");
        }
        Sensor updated = gatewayService.assignSensorToZone(sensorId, zoneId);
        return ResponseEntity.ok(updated);
    }
}

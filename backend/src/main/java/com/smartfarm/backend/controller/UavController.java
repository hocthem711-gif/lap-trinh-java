package com.smartfarm.backend.controller;

import com.smartfarm.backend.dto.HandshakeRequestDTO;
import com.smartfarm.backend.dto.HandshakeResponseDTO;
import com.smartfarm.backend.dto.MissionProgressResponse;
import com.smartfarm.backend.dto.UavTelemetryPayload;
import com.smartfarm.backend.entity.Uav;
import com.smartfarm.backend.service.UavService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/v1/uavs", "/uavs"})
@RequiredArgsConstructor
@Tag(name = "UAV Management", description = "APIs quản lý máy bay nông nghiệp UAV, bắt tay đồng bộ và telemetry")
public class UavController {

    private final UavService uavService;

    @GetMapping
    @Operation(summary = "Lấy danh sách tất cả UAV")
    public ResponseEntity<List<Uav>> getAllUavs() {
        return ResponseEntity.ok(uavService.getAllUavs());
    }

    @PostMapping
    @Operation(summary = "Thêm mới một UAV vào hệ thống")
    public ResponseEntity<Uav> createUav(@RequestBody Uav uav) {
        Uav saved = uavService.createUav(uav);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @DeleteMapping("/{code}")
    @Operation(summary = "Xóa UAV theo mã code")
    public ResponseEntity<String> deleteUav(@PathVariable String code) {
        uavService.deleteUavByCode(code);
        return ResponseEntity.ok("Đã xóa UAV mã: " + code);
    }

    @PostMapping("/handshake")
    @Operation(summary = "Xác thực bắt tay và cấp Session ID cho UAV (LTJ-22)")
    public ResponseEntity<HandshakeResponseDTO> handshake(@RequestBody HandshakeRequestDTO request) {
        HandshakeResponseDTO response = uavService.processHandshake(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/telemetry")
    @Operation(summary = "Nhận tọa độ viễn trắc UAV và cập nhật tiến độ Mission (LTJ-32)")
    public ResponseEntity<MissionProgressResponse> receiveTelemetry(@RequestBody UavTelemetryPayload payload) {
        MissionProgressResponse response = uavService.ingestRealtimeTelemetry(payload);
        return ResponseEntity.ok(response);
    }
}

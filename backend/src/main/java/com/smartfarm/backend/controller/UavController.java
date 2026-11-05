package com.smartfarm.backend.controller;

import com.smartfarm.backend.common.ApiResponse;
import com.smartfarm.backend.dto.request.HandshakeRequestDTO;
import com.smartfarm.backend.dto.request.UavTelemetryPayload;
import com.smartfarm.backend.dto.response.HandshakeResponseDTO;
import com.smartfarm.backend.dto.response.MissionProgressResponse;
import com.smartfarm.backend.entity.SyncLog;
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
@RequiredArgsConstructor
@Tag(name = "UAV Management", description = "APIs quản lý máy bay nông nghiệp UAV, bắt tay đồng bộ và telemetry")
public class UavController {

    private final UavService uavService;

    @GetMapping({"/api/v1/uavs", "/uavs"})
    @Operation(summary = "Lấy danh sách tất cả UAV")
    public ResponseEntity<ApiResponse<List<Uav>>> getAllUavs() {
        List<Uav> list = uavService.getAllUavs();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách UAV thành công", list));
    }

    @PostMapping({"/api/v1/uavs", "/uavs"})
    @Operation(summary = "Thêm mới một UAV vào hệ thống")
    public ResponseEntity<ApiResponse<Uav>> createUav(@RequestBody Uav uav) {
        Uav saved = uavService.createUav(uav);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Thêm mới UAV thành công", saved));
    }

    @DeleteMapping({"/api/v1/uavs/{code}", "/uavs/{code}"})
    @Operation(summary = "Xóa UAV theo mã code")
    public ResponseEntity<ApiResponse<String>> deleteUav(@PathVariable String code) {
        uavService.deleteUavByCode(code);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa UAV mã: " + code, code));
    }

    @PostMapping({"/api/v1/uavs/handshake", "/uavs/handshake"})
    @Operation(summary = "Xác thực bắt tay và cấp Session ID cho UAV (LTJ-22)")
    public ResponseEntity<ApiResponse<HandshakeResponseDTO>> handshake(@RequestBody HandshakeRequestDTO request) {
        HandshakeResponseDTO response = uavService.processHandshake(request);
        return ResponseEntity.ok(ApiResponse.success("Bắt tay xác thực UAV thành công", response));
    }

    @PostMapping({"/api/v1/uavs/telemetry", "/uavs/telemetry"})
    @Operation(summary = "Nhận tọa độ viễn trắc UAV và cập nhật tiến độ Mission (LTJ-32)")
    public ResponseEntity<ApiResponse<MissionProgressResponse>> receiveTelemetry(@RequestBody UavTelemetryPayload payload) {
        MissionProgressResponse response = uavService.ingestRealtimeTelemetry(payload);
        return ResponseEntity.ok(ApiResponse.success("Tiếp nhận viễn trắc UAV thành công", response));
    }

    @GetMapping({"/api/v1/uav-sync/sessions", "/uav-sync/sessions"})
    @Operation(summary = "Lấy danh sách các phiên đồng bộ UAV sắp giảm dần theo thời gian (LTJ-22, khớp analyticsService.ts)")
    public ResponseEntity<ApiResponse<List<SyncLog>>> getSyncSessions(
            @RequestParam(required = false) String uavCode) {
        List<SyncLog> sessions = (uavCode != null && !uavCode.isBlank())
                ? uavService.getSyncSessionsByUavCode(uavCode)
                : uavService.getSyncSessions();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách phiên đồng bộ thành công", sessions));
    }
}

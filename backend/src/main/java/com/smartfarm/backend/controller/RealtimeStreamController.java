package com.smartfarm.backend.controller;

import com.smartfarm.backend.common.ApiResponse;
import com.smartfarm.backend.service.TelemetryRealtimeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

/**
 * Controller quản lý luồng dữ liệu thời gian thực (SSE Stream & Telemetry Broadcast) (F15).
 * Task: LTJ-31 - Sprint 7 (Dev 1 - Backend Core)
 */
@RestController
@RequestMapping("/realtime")
@Tag(name = "9. Realtime Telemetry", description = "APIs Truyền dữ liệu viễn trắc thời gian thực qua WebSocket & SSE (F15)")
public class RealtimeStreamController {

    private final TelemetryRealtimeService telemetryRealtimeService;

    public RealtimeStreamController(TelemetryRealtimeService telemetryRealtimeService) {
        this.telemetryRealtimeService = telemetryRealtimeService;
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Đăng ký nhận luồng SSE Realtime (F15)", description = "Mở kết nối Server-Sent Events (SSE) để nhận telemetry và alert liên tục từ server")
    public SseEmitter subscribeTelemetryStream() {
        return telemetryRealtimeService.subscribeStream();
    }

    @PostMapping("/telemetry/broadcast")
    @Operation(summary = "Bắn telemetry thời gian thực", description = "Dành cho UAV Gateway hoặc IoT Simulator đẩy gói tin viễn trắc trực tiếp xuống Web Client")
    public ResponseEntity<ApiResponse<String>> broadcastTelemetryPayload(@RequestBody Map<String, Object> payload) {
        telemetryRealtimeService.broadcastCustomTelemetry(payload);
        return ResponseEntity.ok(ApiResponse.success("Phát dữ liệu viễn trắc thành công!", "Broadcasted to /topic/telemetry"));
    }
}

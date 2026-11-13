package com.smartfarm.backend.service;

import com.smartfarm.backend.dto.response.AlertResponse;
import com.smartfarm.backend.dto.response.SensorDataResponse;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Service quản lý truyền tin thời gian thực đa kênh (WebSocket STOMP & SSE Stream) (F15).
 * Task: LTJ-31 - Sprint 7 (Dev 1 - Backend Core)
 */
public interface TelemetryRealtimeService {

    /**
     * Bắn dữ liệu viễn trắc cảm biến theo thời gian thực tới toàn hệ thống và theo Zone
     */
    void broadcastTelemetry(SensorDataResponse telemetryData);

    /**
     * Bắn dữ liệu viễn trắc tùy biến (UAV flight progress, GPS, battery)
     */
    void broadcastCustomTelemetry(Object telemetryPayload);

    /**
     * Bắn thông báo cảnh báo mới (Alert) tức thì xuống Web Client
     */
    void broadcastAlert(AlertResponse alertResponse);

    /**
     * Đăng ký kết nối SSE (Server-Sent Events) dành cho Web Client
     */
    SseEmitter subscribeStream();
}

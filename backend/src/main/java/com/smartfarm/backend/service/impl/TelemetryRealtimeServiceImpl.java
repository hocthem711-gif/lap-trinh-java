package com.smartfarm.backend.service.impl;

import com.smartfarm.backend.dto.response.AlertResponse;
import com.smartfarm.backend.dto.response.SensorDataResponse;
import com.smartfarm.backend.service.TelemetryRealtimeService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class TelemetryRealtimeServiceImpl implements TelemetryRealtimeService {

    private static final Logger log = LoggerFactory.getLogger(TelemetryRealtimeServiceImpl.class);

    private final SimpMessagingTemplate messagingTemplate;
    private final List<SseEmitter> sseEmitters = new CopyOnWriteArrayList<>();

    public TelemetryRealtimeServiceImpl(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @Override
    public void broadcastTelemetry(SensorDataResponse telemetryData) {
        if (telemetryData == null) return;

        // 1. WebSocket STOMP broadcast toàn hệ thống
        messagingTemplate.convertAndSend("/topic/telemetry", telemetryData);

        // 2. WebSocket STOMP broadcast theo Zone cụ thể (nếu có thông tin Zone)
        if (telemetryData.getZoneId() != null) {
            messagingTemplate.convertAndSend("/topic/telemetry/zone/" + telemetryData.getZoneId(), telemetryData);
        }

        // 3. SSE Stream broadcast
        sendSseEvent("telemetry", telemetryData);
    }

    @Override
    public void broadcastCustomTelemetry(Object telemetryPayload) {
        if (telemetryPayload == null) return;

        messagingTemplate.convertAndSend("/topic/telemetry", telemetryPayload);
        sendSseEvent("telemetry", telemetryPayload);
    }

    @Override
    public void broadcastAlert(AlertResponse alertResponse) {
        if (alertResponse == null) return;

        // 1. WebSocket STOMP broadcast cảnh báo
        messagingTemplate.convertAndSend("/topic/alerts", alertResponse);
        if (alertResponse.getZoneId() != null) {
            messagingTemplate.convertAndSend("/topic/alerts/zone/" + alertResponse.getZoneId(), alertResponse);
        }

        // 2. SSE Stream broadcast cảnh báo
        sendSseEvent("alert", alertResponse);
    }

    @Override
    public SseEmitter subscribeStream() {
        // Timeout 30 phút cho mỗi kết nối SSE
        SseEmitter emitter = new SseEmitter(30 * 60 * 1000L);
        sseEmitters.add(emitter);

        emitter.onCompletion(() -> sseEmitters.remove(emitter));
        emitter.onTimeout(() -> sseEmitters.remove(emitter));
        emitter.onError(e -> sseEmitters.remove(emitter));

        try {
            // Gửi sự kiện khởi tạo handshake
            emitter.send(SseEmitter.event()
                    .name("INIT")
                    .data("Realtime telemetry stream connected successfully"));
        } catch (IOException e) {
            sseEmitters.remove(emitter);
        }

        return emitter;
    }

    private void sendSseEvent(String eventName, Object data) {
        for (SseEmitter emitter : sseEmitters) {
            try {
                emitter.send(SseEmitter.event().name(eventName).data(data));
            } catch (IOException e) {
                sseEmitters.remove(emitter);
            }
        }
    }
}

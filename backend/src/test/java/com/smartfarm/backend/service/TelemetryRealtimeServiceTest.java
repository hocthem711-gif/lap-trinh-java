package com.smartfarm.backend.service;

import com.smartfarm.backend.dto.response.AlertResponse;
import com.smartfarm.backend.dto.response.SensorDataResponse;
import com.smartfarm.backend.entity.AlertLevel;
import com.smartfarm.backend.entity.SensorType;
import com.smartfarm.backend.service.impl.TelemetryRealtimeServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDateTime;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests - TelemetryRealtimeService (F15)")
class TelemetryRealtimeServiceTest {

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private TelemetryRealtimeServiceImpl realtimeService;

    private SensorDataResponse mockTelemetry;
    private AlertResponse mockAlert;

    @BeforeEach
    void setUp() {
        mockTelemetry = new SensorDataResponse(
                1L, 10L, "DEV-Z1-001-TEMP", SensorType.TEMPERATURE,
                5L, "Zone 5 - Nhà Lưới", 28.5, "°C", 95.0, "NORMAL", LocalDateTime.now()
        );

        mockAlert = new AlertResponse(
                100L, "Nhiệt độ Zone 5 vượt ngưỡng: 39°C", AlertLevel.CRITICAL,
                false, 5L, "Zone 5 - Nhà Lưới", 10L, "DEV-Z1-001-TEMP", LocalDateTime.now()
        );
    }

    @Test
    @DisplayName("Broadcast Telemetry thành công qua WebSocket STOMP (/topic/telemetry và theo Zone)")
    void testBroadcastTelemetry_Success() {
        realtimeService.broadcastTelemetry(mockTelemetry);

        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/telemetry"), eq(mockTelemetry));
        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/telemetry/zone/5"), eq(mockTelemetry));
    }

    @Test
    @DisplayName("Broadcast Telemetry an toàn khi payload null")
    void testBroadcastTelemetry_NullPayload() {
        assertDoesNotThrow(() -> realtimeService.broadcastTelemetry(null));
        verify(messagingTemplate, never()).convertAndSend(anyString(), any(Object.class));
    }

    @Test
    @DisplayName("Broadcast Custom Telemetry (UAV Payload) thành công")
    void testBroadcastCustomTelemetry_Success() {
        Map<String, Object> uavPayload = Map.of(
                "uavId", "UAV-ALPHA-01",
                "latitude", 11.95,
                "longitude", 108.45,
                "battery", 88.0
        );

        realtimeService.broadcastCustomTelemetry(uavPayload);

        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/telemetry"), eq(uavPayload));
    }

    @Test
    @DisplayName("Broadcast Alert thành công qua WebSocket STOMP (/topic/alerts và theo Zone)")
    void testBroadcastAlert_Success() {
        realtimeService.broadcastAlert(mockAlert);

        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/alerts"), eq(mockAlert));
        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/alerts/zone/5"), eq(mockAlert));
    }

    @Test
    @DisplayName("Đăng ký kết nối SSE Stream thành công")
    void testSubscribeStream_Success() {
        SseEmitter emitter = realtimeService.subscribeStream();

        assertNotNull(emitter);
    }
}

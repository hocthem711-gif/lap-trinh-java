package com.smartfarm.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartfarm.backend.dto.request.IoTSimulatorPayload;
import com.smartfarm.backend.dto.request.UavTelemetryPayload;
import com.smartfarm.backend.service.SensorDataService;
import com.smartfarm.backend.service.UavService;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests - MqttGatewayConfig Subscriber & Rate Limiter (LTJ-12)")
class MqttGatewayConfigTest {

    @Mock
    private UavService uavService;

    @Mock
    private SensorDataService sensorDataService;

    private MqttGatewayConfig mqttGatewayConfig;

    @BeforeEach
    void setUp() {
        mqttGatewayConfig = new MqttGatewayConfig(new ObjectMapper(), uavService, sensorDataService);
        mqttGatewayConfig.resetRateLimiter();
    }

    @Test
    @DisplayName("LTJ-12: Extract node code accurately from hierarchical MQTT sensor topics")
    void testExtractNodeCode() {
        assertEquals("SN-NODE-01", mqttGatewayConfig.extractNodeCode("iot/ltj/sensor/SN-NODE-01", "{}"));
        assertEquals("TEMP-A2", mqttGatewayConfig.extractNodeCode("iot/sensors/TEMP-A2", "{}"));
        assertEquals("UNKNOWN_NODE", mqttGatewayConfig.extractNodeCode("flat_topic", "{}"));
    }

    @Test
    @DisplayName("LTJ-12: Enforce 3000ms rate limit per sensor node while allowing independent nodes")
    void testPerNodeRateLimiter() {
        assertTrue(mqttGatewayConfig.isAllowedByRateLimiter("SN-NODE-01"));
        assertFalse(mqttGatewayConfig.isAllowedByRateLimiter("SN-NODE-01"));
        assertTrue(mqttGatewayConfig.isAllowedByRateLimiter("SN-NODE-02"));
        assertFalse(mqttGatewayConfig.isAllowedByRateLimiter(" "));
    }

    @Test
    @DisplayName("LTJ-12: Route sensor MQTT payload to SensorDataService and drop rapid duplicate")
    void testHandleIncomingSensorMessage_AppliesRateLimiting() {
        String json = "{\"deviceId\":\"SN-NODE-01\",\"farmId\":1,\"zoneId\":1,\"temperature\":26.5,\"humidity\":68.0,\"soilMoisture\":55.0,\"light\":1200.0,\"status\":\"OK\",\"timestamp\":1730000000}";
        MqttMessage msg = new MqttMessage(json.getBytes(StandardCharsets.UTF_8));

        mqttGatewayConfig.handleIncomingMqttMessage("iot/ltj/sensor/SN-NODE-01", msg);
        mqttGatewayConfig.handleIncomingMqttMessage("iot/ltj/sensor/SN-NODE-01", msg);

        verify(sensorDataService, times(1)).ingestSimulatorPayload(any(IoTSimulatorPayload.class));
        verifyNoInteractions(uavService);
    }

    @Test
    @DisplayName("LTJ-12: Malformed JSON payload must not consume node rate limit window")
    void testHandleIncomingSensorMessage_InvalidJsonDoesNotBlockNextValidMessage() {
        MqttMessage invalidMsg = new MqttMessage("{broken-json".getBytes(StandardCharsets.UTF_8));
        String validJson = "{\"deviceId\":\"SN-NODE-01\",\"farmId\":1,\"zoneId\":1,\"temperature\":26.5,\"humidity\":68.0,\"soilMoisture\":55.0,\"light\":1200.0,\"status\":\"OK\",\"timestamp\":1730000000}";
        MqttMessage validMsg = new MqttMessage(validJson.getBytes(StandardCharsets.UTF_8));

        mqttGatewayConfig.handleIncomingMqttMessage("iot/ltj/sensor/SN-NODE-01", invalidMsg);
        mqttGatewayConfig.handleIncomingMqttMessage("iot/ltj/sensor/SN-NODE-01", validMsg);

        verify(sensorDataService, times(1)).ingestSimulatorPayload(any(IoTSimulatorPayload.class));
    }

    @Test
    @DisplayName("LTJ-12: Route UAV telemetry topic directly to UavService without sensor rate limiter blocking")
    void testHandleIncomingUavTelemetry_RoutesToUavService() {
        String uavJson = "{\"uavId\":\"UAV-ALPHA-01\",\"missionName\":\"Mission-KhuA\",\"latitude\":10.845,\"longitude\":106.765,\"altitude\":35.0,\"speed\":8.5,\"battery\":92.0,\"waypointIndex\":1,\"totalWaypoints\":4}";
        MqttMessage msg = new MqttMessage(uavJson.getBytes(StandardCharsets.UTF_8));

        mqttGatewayConfig.handleIncomingMqttMessage("iot/ltj/uav/telemetry", msg);

        verify(uavService, times(1)).ingestRealtimeTelemetry(any(UavTelemetryPayload.class));
        verifyNoInteractions(sensorDataService);
    }

    @Test
    @DisplayName("LTJ-22/25: Route MQTT handshake and bulk sync topics for offline UAV synchronization")
    void testHandleIncomingSyncTopics() {
        String handshakeJson = "{\"action\":\"SYNC_REQUEST\",\"uavId\":\"UAV-ALPHA-01\",\"pendingRecords\":10,\"requestTime\":1730000000}";
        MqttMessage hsMsg = new MqttMessage(handshakeJson.getBytes(StandardCharsets.UTF_8));
        mqttGatewayConfig.handleIncomingMqttMessage("iot/ltj/sync/handshake/request", hsMsg);
        verify(uavService, times(1)).processHandshake(any());

        String bulkJson = "{\"syncSessionId\":\"SYNC-UAV-01-123\",\"uavId\":\"UAV-ALPHA-01\",\"records\":[{\"deviceId\":\"SN-01\",\"temperature\":25.0,\"timestamp\":1730000000}]}";
        MqttMessage bulkMsg = new MqttMessage(bulkJson.getBytes(StandardCharsets.UTF_8));
        mqttGatewayConfig.handleIncomingMqttMessage("iot/ltj/sync/bulk", bulkMsg);
        verify(sensorDataService, times(1)).syncBulkData(any());
    }
}

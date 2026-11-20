package com.smartfarm.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartfarm.backend.dto.UavTelemetryPayload;
import com.smartfarm.backend.service.UavService;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.paho.client.mqttv3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import java.nio.charset.StandardCharsets;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Cấu hình MQTT Gateway Subscriber & Rate Limiting (LTJ-2, LTJ-12, LTJ-32).
 * Lắng nghe telemetry từ cảm biến IoT và máy bay UAV.
 */
@Configuration
@RequiredArgsConstructor
@Slf4j
public class MqttGatewayConfig {

    private final ObjectMapper objectMapper;
    private final UavService uavService;

    @Value("${mqtt.broker.url:tcp://localhost:1883}")
    private String brokerUrl;

    @Value("${mqtt.client.id:SmartFarmGatewayBackend}")
    private String clientIdPrefix;

    // Rate Limiting: 3000ms / node (LTJ-12)
    private final ConcurrentHashMap<String, Long> lastMessageTimeMap = new ConcurrentHashMap<>();
    private static final long MIN_INTERVAL_MS = 3000;

    private MqttClient mqttClient;

    @PostConstruct
    public void startMqttSubscriber() {
        new Thread(() -> {
            try {
                String clientId = clientIdPrefix + "_" + System.currentTimeMillis();
                mqttClient = new MqttClient(brokerUrl, clientId);

                MqttConnectOptions options = new MqttConnectOptions();
                options.setCleanSession(true);
                options.setConnectionTimeout(5);
                options.setAutomaticReconnect(true);

                mqttClient.setCallback(new MqttCallbackExtended() {
                    @Override
                    public void connectComplete(boolean reconnect, String serverURI) {
                        log.info("[MQTT GATEWAY] Kết nối thành công tới Broker: {} (reconnect: {})", serverURI, reconnect);
                        try {
                            mqttClient.subscribe(new String[]{"iot/sensors/#", "iot/ltj/sensor/#", "iot/ltj/uav/telemetry"},
                                    new int[]{1, 1, 1});
                            log.info("[MQTT GATEWAY] Đã đăng ký lắng nghe topics: iot/sensors/#, iot/ltj/sensor/#, iot/ltj/uav/telemetry");
                        } catch (MqttException e) {
                            log.error("[MQTT GATEWAY] Đăng ký topic thất bại: {}", e.getMessage());
                        }
                    }

                    @Override
                    public void connectionLost(Throwable cause) {
                        log.warn("[MQTT GATEWAY] Mất kết nối tới MQTT Broker: {}", cause != null ? cause.getMessage() : "Unknown");
                    }

                    @Override
                    public void messageArrived(String topic, MqttMessage message) {
                        handleIncomingMqttMessage(topic, message);
                    }

                    @Override
                    public void deliveryComplete(IMqttDeliveryToken token) {
                    }
                });

                log.info("[MQTT GATEWAY] Đang kết nối tới MQTT Broker tại {}...", brokerUrl);
                mqttClient.connect(options);

            } catch (MqttException e) {
                log.warn("[MQTT GATEWAY] Chưa thể kết nối MQTT Broker ({}). Hệ thống vẫn hoạt động qua REST API: {}", brokerUrl, e.getMessage());
            } catch (Exception ex) {
                log.error("[MQTT GATEWAY] Khởi tạo MQTT Gateway gặp lỗi: {}", ex.getMessage());
            }
        }, "MqttGateway-Init-Thread").start();
    }

    private void handleIncomingMqttMessage(String topic, MqttMessage message) {
        try {
            String payload = new String(message.getPayload(), StandardCharsets.UTF_8);
            log.debug("[MQTT GATEWAY] Nhận tin từ topic [{}]: {}", topic, payload);

            // 1. Nếu là telemetry từ UAV (LTJ-32)
            if ("iot/ltj/uav/telemetry".equalsIgnoreCase(topic)) {
                UavTelemetryPayload uavPayload = objectMapper.readValue(payload, UavTelemetryPayload.class);
                uavService.ingestRealtimeTelemetry(uavPayload);
                return;
            }

            // 2. Nếu là telemetry từ sensor -> kiểm tra Rate Limiting (LTJ-12)
            String nodeCode = extractNodeCode(topic, payload);
            if (nodeCode != null) {
                if (isAllowedByRateLimiter(nodeCode)) {
                    log.info("[MQTT GATEWAY][RATE-LIMIT-PASS] Node {}: Bản tin hợp lệ, được xử lý", nodeCode);
                } else {
                    log.debug("[MQTT GATEWAY][RATE-LIMIT-DROP] Node {}: Bỏ qua do gửi dồn dập (< 3000ms)", nodeCode);
                }
            }

        } catch (Exception e) {
            log.error("[MQTT GATEWAY] Lỗi xử lý bản tin MQTT: {}", e.getMessage());
        }
    }

    private boolean isAllowedByRateLimiter(String nodeCode) {
        long now = System.currentTimeMillis();
        Long last = lastMessageTimeMap.get(nodeCode);
        if (last == null || (now - last) >= MIN_INTERVAL_MS) {
            lastMessageTimeMap.put(nodeCode, now);
            return true;
        }
        return false;
    }

    private String extractNodeCode(String topic, String payload) {
        try {
            if (topic.contains("/")) {
                String[] parts = topic.split("/");
                return parts[parts.length - 1];
            }
        } catch (Exception ignored) {
        }
        return "UNKNOWN_NODE";
    }

    @PreDestroy
    public void cleanup() {
        if (mqttClient != null && mqttClient.isConnected()) {
            try {
                mqttClient.disconnect();
                mqttClient.close();
                log.info("[MQTT GATEWAY] Đã ngắt kết nối MQTT sạch sẽ khi tắt server");
            } catch (Exception ignored) {
            }
        }
    }
}

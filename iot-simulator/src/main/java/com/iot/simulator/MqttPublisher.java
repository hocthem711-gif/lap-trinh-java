package com.iot.simulator;

import org.eclipse.paho.client.mqttv3.*;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;

/**
 * Client kết nối và gửi dữ liệu tới MQTT Broker.
 * Sử dụng thư viện Eclipse Paho MQTT v3.
 */
public class MqttPublisher {

    private MqttClient client;
    private final String brokerUrl;
    private final String clientId;
    private final int qos;

    /**
     * Khởi tạo MqttPublisher.
     *
     * @param brokerUrl URL của MQTT Broker (ví dụ: tcp://broker.hivemq.com:1883)
     * @param clientId  ID định danh client
     * @param qos       Mức Quality of Service (0, 1, hoặc 2)
     */
    public MqttPublisher(String brokerUrl, String clientId, int qos) {
        this.brokerUrl = brokerUrl;
        this.clientId = clientId;
        this.qos = qos;
    }

    /**
     * Kết nối tới MQTT Broker.
     *
     * @throws MqttException nếu kết nối thất bại
     */
    public void connect() throws MqttException {
        MemoryPersistence persistence = new MemoryPersistence();
        client = new MqttClient(brokerUrl, clientId, persistence);

        MqttConnectOptions options = new MqttConnectOptions();
        options.setCleanSession(true);
        options.setAutomaticReconnect(true);
        options.setConnectionTimeout(10);     // Timeout 10 giây
        options.setKeepAliveInterval(20);     // Keep alive 20 giây

        System.out.println(">> Connecting to Broker: " + brokerUrl + " ...");
        client.connect(options);
        System.out.println(">> Connected successfully!");
    }

    /**
     * Gửi (publish) một message tới topic chỉ định.
     *
     * @param topic   Topic MQTT
     * @param payload Nội dung message (JSON string)
     * @throws MqttException nếu gửi thất bại
     */
    public void publish(String topic, String payload) throws MqttException {
        if (client == null || !client.isConnected()) {
            throw new MqttException(MqttException.REASON_CODE_CLIENT_NOT_CONNECTED);
        }

        MqttMessage message = new MqttMessage(payload.getBytes());
        message.setQos(qos);
        message.setRetained(false);

        client.publish(topic, message);
    }

    /**
     * Ngắt kết nối khỏi Broker.
     */
    public void disconnect() {
        try {
            if (client != null && client.isConnected()) {
                client.disconnect();
                System.out.println(">> Đã ngắt kết nối khỏi Broker.");
            }
        } catch (MqttException e) {
            System.err.println("Lỗi khi ngắt kết nối: " + e.getMessage());
        }
    }

    /**
     * Kiểm tra trạng thái kết nối.
     */
    public boolean isConnected() {
        return client != null && client.isConnected();
    }
}

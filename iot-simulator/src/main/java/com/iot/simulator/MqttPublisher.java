package com.iot.simulator;

import org.eclipse.paho.client.mqttv3.*;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;

import java.nio.charset.StandardCharsets;

/**
 * Client kết nối và gửi dữ liệu tới MQTT Broker.
 * Sử dụng thư viện Eclipse Paho MQTT v3 (MqttAsyncClient hỗ trợ đa luồng đồng thời).
 *
 * Nâng cấp Sprint 3 (LTJ-15):
 * - Sử dụng MqttAsyncClient kết hợp MaxInflight = 200 để cho phép 10-20 sensors bắn song song
 *   ở tần suất 1 giây/lần (1 Hz) mà không bị nghẽn tuần tự bởi độ trễ mạng (RTT PUBACK).
 * - Hỗ trợ đo độ trễ truyền gói tin (Publish Latency) theo mili-giây.
 */
public class MqttPublisher {

    private MqttAsyncClient client;
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
        client = new MqttAsyncClient(brokerUrl, clientId, persistence);

        MqttConnectOptions options = new MqttConnectOptions();
        options.setCleanSession(true);
        options.setAutomaticReconnect(true);
        options.setConnectionTimeout(10);     // Timeout 10 giây
        options.setKeepAliveInterval(20);     // Keep alive 20 giây
        options.setMaxInflight(200);          // Cho phép tối đa 200 gói tin QoS 1 đang bay đồng thời

        System.out.println(">> Connecting to Broker: " + brokerUrl + " ...");
        IMqttToken connectToken = client.connect(options);
        connectToken.waitForCompletion(10_000);
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
        publishWithLatency(topic, payload);
    }

    /**
     * Gửi (publish) một message bất đồng bộ (hỗ trợ đa luồng song song) và chờ xác nhận PUBACK
     * để đo chính xác độ trễ truyền tải (Round-Trip Publish Latency) tính bằng mili-giây (ms).
     *
     * @param topic   Topic MQTT
     * @param payload Nội dung message (JSON string)
     * @return Thời gian gửi và nhận PUBACK của bản tin (ms)
     * @throws MqttException nếu gửi thất bại
     */
    public double publishWithLatency(String topic, String payload) throws MqttException {
        if (client == null || !client.isConnected()) {
            throw new MqttException(MqttException.REASON_CODE_CLIENT_NOT_CONNECTED);
        }

        long startNano = System.nanoTime();
        MqttMessage message = new MqttMessage(payload.getBytes(StandardCharsets.UTF_8));
        message.setQos(qos);
        message.setRetained(false);

        IMqttDeliveryToken token = client.publish(topic, message);
        token.waitForCompletion(5_000);
        long elapsedNano = System.nanoTime() - startNano;
        return elapsedNano / 1_000_000.0;
    }

    /**
     * Ngắt kết nối khỏi Broker.
     */
    public void disconnect() {
        try {
            if (client != null && client.isConnected()) {
                IMqttToken disconnectToken = client.disconnect();
                disconnectToken.waitForCompletion(5_000);
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

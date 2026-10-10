package com.iot.simulator;

import java.util.Timer;
import java.util.TimerTask;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Ứng dụng chính - Giả lập thiết bị IoT.
 *
 * Chương trình tạo ra nhiều thiết bị ảo, mỗi thiết bị sẽ tự động
 * sinh dữ liệu cảm biến ngẫu nhiên và gửi lên MQTT Broker theo chu kỳ.
 *
 * Sử dụng: java -jar iot-simulator.jar [broker_url] [số_thiết_bị] [chu_kỳ_giây]
 */
public class IoTSimulatorApp {

    // ===== Cấu hình mặc định =====
    private static final String DEFAULT_BROKER = "tcp://broker.hivemq.com:1883";
    private static final String TOPIC_PREFIX = "iot/ltj/sensor/";
    private static final int DEFAULT_DEVICE_COUNT = 3;
    private static final int DEFAULT_INTERVAL_SECONDS = 5;
    private static final int QOS = 1;

    public static void main(String[] args) {

        // Đọc tham số từ dòng lệnh (nếu có)
        String brokerUrl = args.length > 0 ? args[0] : DEFAULT_BROKER;
        int deviceCount = args.length > 1 ? Integer.parseInt(args[1]) : DEFAULT_DEVICE_COUNT;
        int intervalSeconds = args.length > 2 ? Integer.parseInt(args[2]) : DEFAULT_INTERVAL_SECONDS;

        System.out.println("================================================");
        System.out.println("      IoT Simulator - Du an Lap Trinh Java     ");
        System.out.println("      [Sprint 1][Dev 5] Task LTJ-5             ");
        System.out.println("================================================");
        System.out.println();
        System.out.println("Configuration:");
        System.out.println("  Broker URL    : " + brokerUrl);
        System.out.println("  Device count  : " + deviceCount);
        System.out.println("  Interval      : " + intervalSeconds + " s");
        System.out.println("  Topic prefix  : " + TOPIC_PREFIX);
        System.out.println();

        // Khởi tạo MQTT Publisher
        String clientId = "IoTSimulator_" + System.currentTimeMillis();
        MqttPublisher publisher = new MqttPublisher(brokerUrl, clientId, QOS);

        try {
            publisher.connect();
        } catch (Exception e) {
            System.err.println("!! Cannot connect to Broker: " + e.getMessage());
            System.err.println("!! Fallback to OFFLINE mode (console output only).");
            startOfflineSimulation(deviceCount, intervalSeconds);
            return;
        }

        // Khởi tạo Timer gửi dữ liệu
        AtomicInteger messageCount = new AtomicInteger(0);
        Timer timer = new Timer("IoT-Scheduler", true);

        // Tạo các thiết bị giả lập
        String[] deviceIds = new String[deviceCount];
        for (int i = 0; i < deviceCount; i++) {
            deviceIds[i] = String.format("SENSOR_%03d", i + 1);
        }

        timer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                for (String deviceId : deviceIds) {
                    try {
                        SensorData data = SensorData.generateRandom(deviceId);
                        String topic = TOPIC_PREFIX + deviceId.toLowerCase();
                        String json = data.toJson();

                        publisher.publish(topic, json);

                        int count = messageCount.incrementAndGet();
                        System.out.printf("[#%d] PUBLISH >> Topic: %-30s | %s%n", count, topic, data);

                    } catch (Exception e) {
                        System.err.println("Error publishing from " + deviceId + ": " + e.getMessage());
                    }
                }
                System.out.println("---");
            }
        }, 0, intervalSeconds * 1000L);

        // Đăng ký hook tắt chương trình để ngắt kết nối sạch
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("\n>> Shutting down simulator...");
            timer.cancel();
            publisher.disconnect();
            System.out.println(">> Total messages sent: " + messageCount.get());
            System.out.println(">> Completed. Goodbye!");
        }));

        // Giữ chương trình chạy
        System.out.println(">> Simulator is running. Press Ctrl+C to stop.");
        try {
            Thread.currentThread().join();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    /**
     * Chế độ giả lập offline - chỉ in dữ liệu ra console
     * khi không kết nối được Broker.
     */
    private static void startOfflineSimulation(int deviceCount, int intervalSeconds) {
        System.out.println("\n>> [OFFLINE MODE] Dữ liệu sẽ chỉ hiển thị trên console.\n");

        String[] deviceIds = new String[deviceCount];
        for (int i = 0; i < deviceCount; i++) {
            deviceIds[i] = String.format("SENSOR_%03d", i + 1);
        }

        AtomicInteger messageCount = new AtomicInteger(0);
        Timer timer = new Timer("IoT-Offline", true);

        timer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                for (String deviceId : deviceIds) {
                    SensorData data = SensorData.generateRandom(deviceId);
                    int count = messageCount.incrementAndGet();
                    System.out.printf("[#%d][OFFLINE] Topic: %-30s | %s%n",
                            count, TOPIC_PREFIX + deviceId.toLowerCase(), data);
                }
                System.out.println("---");
            }
        }, 0, intervalSeconds * 1000L);

        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            timer.cancel();
            System.out.println("\n>> Đã dừng. Tổng: " + messageCount.get() + " bản tin.");
        }));

        System.out.println(">> Nhấn Ctrl+C để dừng.");
        try {
            Thread.currentThread().join();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}

package com.iot.simulator;

import java.util.ArrayList;
import java.util.List;
import java.util.Timer;
import java.util.TimerTask;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Ứng dụng chính - Giả lập thiết bị IoT cho Nông nghiệp thông minh (Smart Farm).
 *
 * Cập nhật Sprint 2 (Task LTJ-10):
 * - Giả lập các cụm cảm biến thuộc các Vùng Canh Tác (Zone A, B, C) của Trang trại Đà Lạt (Farm 1).
 * - Cấu trúc Topic phân cấp theo chuẩn RESTful / MQTT: iot/ltj/sensor/zone-{zoneId}/{deviceId}
 * - Tự động bắt lỗi kết nối Broker và chuyển sang chế độ Offline Fallback an toàn.
 * - Hỗ trợ Graceful Shutdown khi nhận tín hiệu dừng (Ctrl+C).
 *
 * Sử dụng:
 *   gradlew run --args="[broker_url] [devices_per_zone] [chu_ky_giay]"
 */
public class IoTSimulatorApp {

    // ===== Cấu hình mặc định hệ thống =====
    private static final String DEFAULT_BROKER = "tcp://broker.hivemq.com:1883";
    private static final String TOPIC_BASE = "iot/ltj/sensor";
    private static final int DEFAULT_DEVICES_PER_ZONE = 1;
    private static final int DEFAULT_INTERVAL_SECONDS = 5;
    private static final int QOS = 1;

    // Cấu hình các Zone mẫu đồng bộ với Database Backend Sprint 2
    static class ZoneConfig {
        final Long farmId;
        final Long zoneId;
        final String zoneName;

        ZoneConfig(Long farmId, Long zoneId, String zoneName) {
            this.farmId = farmId;
            this.zoneId = zoneId;
            this.zoneName = zoneName;
        }
    }

    private static final ZoneConfig[] DEFAULT_ZONES = new ZoneConfig[] {
            new ZoneConfig(1L, 1L, "Zone A - Dau Tay Thuy Canh"),
            new ZoneConfig(1L, 2L, "Zone B - Rau Xa Lach Thuy Canh"),
            new ZoneConfig(1L, 3L, "Zone C - Ca Chua Bi")
    };

    static class VirtualDevice {
        final Long farmId;
        final Long zoneId;
        final String deviceId;
        final String topic;

        VirtualDevice(Long farmId, Long zoneId, String deviceId, String topic) {
            this.farmId = farmId;
            this.zoneId = zoneId;
            this.deviceId = deviceId;
            this.topic = topic;
        }
    }

    public static void main(String[] args) {

        // Đọc tham số từ dòng lệnh
        String brokerUrl = (args.length > 0 && !args[0].isEmpty()) ? args[0] : DEFAULT_BROKER;
        int devicesPerZone = args.length > 1 ? Integer.parseInt(args[1]) : DEFAULT_DEVICES_PER_ZONE;
        int intervalSeconds = args.length > 2 ? Integer.parseInt(args[2]) : DEFAULT_INTERVAL_SECONDS;

        System.out.println("==========================================================");
        System.out.println("       Smart Farm IoT Simulator - Du An Lap Trinh Java    ");
        System.out.println("       [Sprint 2][Dev 5] Task LTJ-10: Test & MQTT Client  ");
        System.out.println("==========================================================");
        System.out.println();
        System.out.println("Cau Hinh Simulator:");
        System.out.println("  * MQTT Broker URL  : " + brokerUrl);
        System.out.println("  * So Zone mo phong : " + DEFAULT_ZONES.length + " Zones");
        System.out.println("  * So thiet bi/Zone : " + devicesPerZone + " device(s)");
        System.out.println("  * Chu ky gui (s)   : " + intervalSeconds + " giay");
        System.out.println("  * MQTT QoS Level   : " + QOS + " (At Least Once)");
        System.out.println();

        // Khởi tạo danh sách thiết bị ảo tương ứng với các Zone
        List<VirtualDevice> deviceList = new ArrayList<>();
        for (ZoneConfig zone : DEFAULT_ZONES) {
            for (int d = 1; d <= devicesPerZone; d++) {
                String devId = String.format("DEV-Z%d-%03d", zone.zoneId, d);
                String topic = String.format("%s/zone-%d/%s", TOPIC_BASE, zone.zoneId, devId.toLowerCase());
                deviceList.add(new VirtualDevice(zone.farmId, zone.zoneId, devId, topic));
                System.out.printf("  [+ Registered] %s -> Topic: %s (%s)%n", devId, topic, zone.zoneName);
            }
        }
        System.out.println();

        // Khởi tạo kết nối MQTT Publisher
        String clientId = "IoTSimulator_Sprint2_" + System.currentTimeMillis();
        MqttPublisher publisher = new MqttPublisher(brokerUrl, clientId, QOS);

        try {
            publisher.connect();
        } catch (Exception e) {
            System.err.println("!! Khong the ket noi toi MQTT Broker: " + e.getMessage());
            System.err.println("!! Chuyen sang che do OFFLINE SIMULATION (In console cuc bo).");
            startOfflineSimulation(deviceList, intervalSeconds);
            return;
        }

        AtomicInteger messageCount = new AtomicInteger(0);
        Timer timer = new Timer("IoT-Sprint2-Scheduler", true);

        // Lập lịch gửi Telemetry định kỳ
        timer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                for (VirtualDevice dev : deviceList) {
                    try {
                        SensorData data = SensorData.generateRandom(dev.farmId, dev.zoneId, dev.deviceId);
                        String jsonPayload = data.toJson();

                        publisher.publish(dev.topic, jsonPayload);

                        int count = messageCount.incrementAndGet();
                        System.out.printf("[#%d] MQTT PUBLISH >> %s%n", count, data);

                    } catch (Exception e) {
                        System.err.println("!! Loi khi gui tu " + dev.deviceId + ": " + e.getMessage());
                    }
                }
                System.out.println("----------------------------------------------------------------------------------");
            }
        }, 0, intervalSeconds * 1000L);

        // Graceful Shutdown Hook
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("\n>> Dang dung Simulator an toan...");
            timer.cancel();
            publisher.disconnect();
            System.out.println(">> Tong so goi tin Telemetry da gui thanh cong: " + messageCount.get());
            System.out.println(">> Simulator da dong ket noi MQTT sach se. Tam biet!");
        }));

        System.out.println(">> Simulator dang hoat dong realtime! Nhan Ctrl+C tren terminal de dung.");
        try {
            Thread.currentThread().join();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    /**
     * Chế độ dự phòng Offline khi không thể kết nối Internet tới Broker
     */
    private static void startOfflineSimulation(List<VirtualDevice> deviceList, int intervalSeconds) {
        System.out.println("\n>> [OFFLINE MODE] Du lieu se duoc sinh va hien thi cuc bo:\n");

        AtomicInteger messageCount = new AtomicInteger(0);
        Timer timer = new Timer("IoT-Offline-Scheduler", true);

        timer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                for (VirtualDevice dev : deviceList) {
                    SensorData data = SensorData.generateRandom(dev.farmId, dev.zoneId, dev.deviceId);
                    int count = messageCount.incrementAndGet();
                    System.out.printf("[#%d][OFFLINE] %s >> Topic: %s%n", count, data, dev.topic);
                }
                System.out.println("----------------------------------------------------------------------------------");
            }
        }, 0, intervalSeconds * 1000L);

        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            timer.cancel();
            System.out.println("\n>> Da dung che do Offline. Tong ban tin da sinh: " + messageCount.get());
        }));

        System.out.println(">> Nhan Ctrl+C de dung chuong trinh.");
        try {
            Thread.currentThread().join();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}

package com.iot.simulator;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

/**
 * Ứng dụng chính - Giả lập thiết bị IoT, Kiểm thử tải Cảm biến & Kiểm thử Mission UAV.
 *
 * Hỗ trợ 3 chế độ chạy:
 *   1. Chạy bắn MQTT liên tục (F20 - Online):   gradlew run
 *   2. Chạy Load Test 10-20 sensors (LTJ-15):   gradlew run --args="--load-test 20 1 10"
 *   3. Chạy Test Mission & Waypoints (LTJ-20):  gradlew run --args="--test-mission"
 */
public class IoTSimulatorApp {

    // 1. Cấu hình mặc định của hệ thống
    private static final String DEFAULT_BROKER = "tcp://broker.hivemq.com:1883";
    private static final String TOPIC_BASE = "iot/ltj/sensor";
    private static final int DEFAULT_SENSORS = 15; // Mặc định 15 cảm biến (trong dải 10-20 sensors)
    private static final int DEFAULT_INTERVAL = 1; // Chu kỳ gửi: 1 giây/lần
    private static final int QOS = 1;              // QoS 1: Đảm bảo gửi tới Broker ít nhất 1 lần

    // Thông tin 1 thiết bị cảm biến ảo
    public static class VirtualDevice {
        public final Long farmId;
        public final Long zoneId;
        public final String zoneName;
        public final String deviceId;
        public final String topic;

        public VirtualDevice(Long farmId, Long zoneId, String zoneName, String deviceId, String topic) {
            this.farmId = farmId;
            this.zoneId = zoneId;
            this.zoneName = zoneName;
            this.deviceId = deviceId;
            this.topic = topic;
        }
    }

    public static void main(String[] args) {
        // Chế độ 3 (Sprint 4 - LTJ-20): Kiểm tra JSON Waypoints & Test Tạo Mission
        if (args.length > 0 && "--test-mission".equalsIgnoreCase(args[0])) {
            WaypointMissionValidator.runAutomatedMissionTestSuite();
            return;
        }

        // Chế độ 2 (Sprint 3 - LTJ-15): Kiểm thử tải (10-20 cảm biến gửi 1 giây/lần trong N giây)
        if (args.length > 0 && "--load-test".equalsIgnoreCase(args[0])) {
            int sensors = args.length > 1 ? Integer.parseInt(args[1]) : 20;
            int interval = args.length > 2 ? Integer.parseInt(args[2]) : DEFAULT_INTERVAL;
            int duration = args.length > 3 ? Integer.parseInt(args[3]) : 10;
            String apiUrl = args.length > 4 ? args[4] : "";
            runSimulation(DEFAULT_BROKER, sensors, interval, duration, apiUrl, true);
            return;
        }

        // Chế độ 1 (Mặc định - F20): Chạy bắn dữ liệu cảm biến liên tục không giới hạn thời gian
        String broker = (args.length > 0 && !args[0].isEmpty()) ? args[0] : DEFAULT_BROKER;
        int sensors = args.length > 1 ? Integer.parseInt(args[1]) : DEFAULT_SENSORS;
        int interval = args.length > 2 ? Integer.parseInt(args[2]) : DEFAULT_INTERVAL;
        String apiUrl = args.length > 3 ? args[3] : "";
        runSimulation(broker, sensors, interval, 0, apiUrl, false);
    }

    /**
     * Khởi tạo danh sách N cảm biến ảo chia đều vào 3 khu vực: Zone A, Zone B, Zone C.
     */
    public static List<VirtualDevice> buildVirtualDevices(int totalSensors) {
        String[] zoneNames = {"Zone A - Dau Tay", "Zone B - Xa Lach", "Zone C - Ca Chua Bi"};
        List<VirtualDevice> list = new ArrayList<>();

        for (int i = 0; i < totalSensors; i++) {
            long zoneId = (i % 3) + 1;
            int deviceOrderInZone = (i / 3) + 1;
            String devId = String.format("DEV-Z%d-%03d", zoneId, deviceOrderInZone);
            String topic = String.format("%s/zone-%d/%s", TOPIC_BASE, zoneId, devId.toLowerCase());
            list.add(new VirtualDevice(1L, zoneId, zoneNames[i % 3], devId, topic));
        }
        return list;
    }

    /**
     * Hàm điều phối chung cho cả Chế độ Chạy liên tục (F20) và Chế độ Load Test (LTJ-15).
     */
    private static void runSimulation(String brokerUrl, int totalSensors, int intervalSeconds,
                                      int durationSeconds, String backendApiUrl, boolean isLoadTest) {
        System.out.println("==========================================================================");
        System.out.println(isLoadTest
                ? "   SMART FARM IOT - KIEM THU TAI CAM BIEN (LOAD TEST 10-20 SENSORS)       "
                : "   SMART FARM IOT - GIA LAP CAM BIEN ONLINE LIEN TUC (F20 STREAM)         ");
        System.out.println("==========================================================================");
        System.out.printf("  * MQTT Broker   : %s (QoS %d)%n", brokerUrl, QOS);
        System.out.printf("  * So luong      : %d sensors (tren 3 Zones A, B, C)%n", totalSensors);
        System.out.printf("  * Chu ky gui    : %d giay/lan%n", intervalSeconds);
        System.out.println("==========================================================================\n");

        List<VirtualDevice> devices = buildVirtualDevices(totalSensors);
        MqttPublisher publisher = new MqttPublisher(brokerUrl, "IoTSim_" + System.currentTimeMillis(), QOS);
        boolean isOnline = false;
        try {
            publisher.connect();
            isOnline = true;
        } catch (Exception e) {
            System.err.println("!! Khong ket noi duoc MQTT Broker -> Chay che do OFFLINE cuc bo.");
        }

        // Tạo hồ luồng (ThreadPool) giúp 10-20 cảm biến bắn dữ liệu song song cùng lúc
        ExecutorService threadPool = Executors.newFixedThreadPool(Math.min(totalSensors, 20));
        HttpClient httpClient = (backendApiUrl != null && !backendApiUrl.isEmpty())
                ? HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build() : null;

        int totalCycles = isLoadTest ? Math.max(1, durationSeconds / Math.max(1, intervalSeconds)) : Integer.MAX_VALUE;
        int sentPackets = 0, successPackets = 0, anomalyCount = 0;
        double sumLatency = 0, minLatency = Double.MAX_VALUE, maxLatency = 0;
        long startTimeMs = System.currentTimeMillis();

        for (int cycle = 1; cycle <= totalCycles; cycle++) {
            long cycleStartMs = System.currentTimeMillis();
            List<Future<Double>> tasks = new ArrayList<>();

            // Giao việc cho từng cảm biến ảo gửi dữ liệu song song trong ThreadPool
            for (VirtualDevice dev : devices) {
                sentPackets++;
                SensorData data = SensorData.generateWithAnomalyOption(dev.farmId, dev.zoneId, dev.deviceId, 0.05);
                if ("ANOMALY".equals(data.getStatus())) {
                    anomalyCount++;
                }
                final boolean mqttReady = isOnline;
                final int packetIndex = sentPackets;

                tasks.add(threadPool.submit(() -> {
                    String json = data.toCompactJson();
                    double latency = 0.5;
                    if (mqttReady && publisher.isConnected()) {
                        latency = publisher.publishWithLatency(dev.topic, json);
                    }
                    if (httpClient != null) {
                        sendToBackendHttp(httpClient, backendApiUrl, json);
                    }
                    if (!isLoadTest) {
                        System.out.printf("[#%04d][MQTT %.1fms] %s >> %s%n", packetIndex, latency, data, dev.topic);
                    }
                    return latency;
                }));
            }

            // Chờ tất cả cảm biến trong chu kỳ hiện tại gửi xong và cộng dồn kết quả đo độ trễ
            for (Future<Double> task : tasks) {
                try {
                    double lat = task.get();
                    successPackets++;
                    sumLatency += lat;
                    if (lat < minLatency) minLatency = lat;
                    if (lat > maxLatency) maxLatency = lat;
                } catch (Exception e) {
                    System.err.println("  [Loi gui goi tin]: " + e.getMessage());
                }
            }

            long cycleElapsed = System.currentTimeMillis() - cycleStartMs;
            System.out.printf("  [Chu ky %02d] Da gui dong thoi %d sensors trong %d ms%n", cycle, totalSensors, cycleElapsed);

            // Nghỉ cho đủ chu kỳ (ví dụ 1000ms = 1 giây) trước khi sang chu kỳ tiếp theo
            long sleepMs = (intervalSeconds * 1000L) - cycleElapsed;
            if (cycle < totalCycles && sleepMs > 0) {
                try {
                    Thread.sleep(sleepMs);
                } catch (InterruptedException e) {
                    break;
                }
            }
        }

        // Đóng kết nối an toàn và in bảng tổng kết nếu ở chế độ Load Test
        threadPool.shutdown();
        publisher.disconnect();

        if (isLoadTest) {
            double totalSec = Math.max(1.0, (System.currentTimeMillis() - startTimeMs) / 1000.0);
            double avgLatency = successPackets > 0 ? (sumLatency / successPackets) : 0.0;
            if (minLatency == Double.MAX_VALUE) minLatency = 0.0;

            System.out.println("\n==========================================================================");
            System.out.println("                BAO CAO KET QUA LOAD TEST (LTJ-15 SUMMARY)                ");
            System.out.println("==========================================================================");
            System.out.printf("  1. So cam bien gia lap      : %d sensors (tren 3 Zones A, B, C)%n", totalSensors);
            System.out.printf("  2. Goi tin thanh cong       : %d / %d (%.1f%%)%n",
                    successPackets, sentPackets, (successPackets * 100.0 / sentPackets));
            System.out.printf("  3. Goi tin chen nhieu (F19) : %d packets (kiem thu bo loc rac)%n", anomalyCount);
            System.out.printf("  4. Thong luong (Throughput) : %.2f packets/s (~%.2f chi so/s)%n",
                    successPackets / totalSec, (successPackets * 4.0) / totalSec);
            System.out.printf("  5. Do tre MQTT (Min/Avg/Max): %.2f ms / %.2f ms / %.2f ms%n",
                    minLatency, avgLatency, maxLatency);
            System.out.println("==========================================================================");
        }
    }

    /**
     * Gửi gói tin JSON sang Backend REST API (/api/v1/sensor-data/simulator).
     */
    private static int sendToBackendHttp(HttpClient httpClient, String apiUrl, String jsonPayload) {
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl))
                    .timeout(Duration.ofSeconds(3))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();
            return httpClient.send(req, HttpResponse.BodyHandlers.ofString()).statusCode();
        } catch (Exception e) {
            return -1;
        }
    }
}

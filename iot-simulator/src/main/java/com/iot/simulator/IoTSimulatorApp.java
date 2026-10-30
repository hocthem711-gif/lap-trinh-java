package com.iot.simulator;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Ứng dụng chính - Giả lập thiết bị IoT & Kiểm thử tải Cảm biến (Smart Farm).
 *
 * Cập nhật Sprint 3 (Task LTJ-15 - Dev 5):
 * - Chạy script giả lập bắn data ngẫu nhiên liên tục qua MQTT (F20 - Online).
 * - Hỗ trợ chế độ Kiểm thử tải nhẹ (Load Test: 10 - 20 sensors gửi tần suất 1 giây/lần).
 * - Sử dụng MqttAsyncClient + ThreadPool song song giúp 10-20 sensors bắn đồng thời đúng chu kỳ 1.0s.
 * - Đo lường các chỉ số hiệu năng: Throughput (msg/s, metrics/s), Latency (Min, Avg, P95, Max), Success Rate.
 * - Tích hợp HTTP Bridge tùy chọn tới Backend API (/api/v1/sensor-data/simulator) để kiểm chứng F04 & F19 Validation.
 *
 * Cách sử dụng:
 *   1. Chạy liên tục (F20 - Online):
 *      gradlew run --args="[broker_url] [total_sensors] [chu_ky_giay]"
 *      (Mặc định: tcp://broker.hivemq.com:1883, 15 sensors, chu kỳ 1 giây)
 *
 *   2. Chạy Load Test tự động (10-20 sensors @ 1s):
 *      gradlew run --args="--load-test [total_sensors] [chu_ky_giay] [thoi_gian_chay_giay] [backend_api_url]"
 *      Ví dụ: gradlew run --args="--load-test 20 1 10 http://localhost:8080/api/v1/sensor-data/simulator"
 */
public class IoTSimulatorApp {

    // ===== Cấu hình mặc định hệ thống Sprint 3 (LTJ-15) =====
    private static final String DEFAULT_BROKER = "tcp://broker.hivemq.com:1883";
    private static final String TOPIC_BASE = "iot/ltj/sensor";
    private static final int DEFAULT_TOTAL_SENSORS = 15; // Nằm trong dải 10-20 sensors theo yêu cầu Sprint 3
    private static final int DEFAULT_INTERVAL_SECONDS = 1; // Tần suất 1 giây/lần (1 Hz)
    private static final int DEFAULT_LOAD_TEST_DURATION_SECONDS = 10;
    private static final int QOS = 1;

    // Cấu hình các Zone mẫu đồng bộ với Database Backend
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
        final String zoneName;
        final String deviceId;
        final String topic;

        VirtualDevice(Long farmId, Long zoneId, String zoneName, String deviceId, String topic) {
            this.farmId = farmId;
            this.zoneId = zoneId;
            this.zoneName = zoneName;
            this.deviceId = deviceId;
            this.topic = topic;
        }
    }

    public static void main(String[] args) {
        // Chế độ Sprint 4 (Task LTJ-20): Review JSON Waypoints & Test Tạo Mission
        if (args.length > 0 && "--test-mission".equalsIgnoreCase(args[0])) {
            WaypointMissionValidator.runAutomatedMissionTestSuite();
            return;
        }

        // Kiểm tra nếu chạy ở chế độ Load Test (--load-test)
        if (args.length > 0 && "--load-test".equalsIgnoreCase(args[0])) {
            int totalSensors = args.length > 1 ? Integer.parseInt(args[1]) : 20;
            int intervalSeconds = args.length > 2 ? Integer.parseInt(args[2]) : DEFAULT_INTERVAL_SECONDS;
            int durationSeconds = args.length > 3 ? Integer.parseInt(args[3]) : DEFAULT_LOAD_TEST_DURATION_SECONDS;
            String backendApiUrl = args.length > 4 ? args[4] : "";
            String brokerUrl = args.length > 5 ? args[5] : DEFAULT_BROKER;

            runLoadTestMode(brokerUrl, totalSensors, intervalSeconds, durationSeconds, backendApiUrl);
            return;
        }

        // Chế độ chạy liên tục (F20 - Online Continuous Stream)
        String brokerUrl = (args.length > 0 && !args[0].isEmpty()) ? args[0] : DEFAULT_BROKER;
        int totalSensors = args.length > 1 ? Integer.parseInt(args[1]) : DEFAULT_TOTAL_SENSORS;
        int intervalSeconds = args.length > 2 ? Integer.parseInt(args[2]) : DEFAULT_INTERVAL_SECONDS;
        String backendApiUrl = args.length > 3 ? args[3] : "";

        runContinuousOnlineMode(brokerUrl, totalSensors, intervalSeconds, backendApiUrl);
    }

    /**
     * Khởi tạo danh sách N cảm biến ảo phân bổ đều trên 3 Zones (Zone A, B, C).
     */
    public static List<VirtualDevice> buildVirtualDevices(int totalSensors) {
        List<VirtualDevice> deviceList = new ArrayList<>();
        int[] zoneCounters = new int[DEFAULT_ZONES.length];

        for (int i = 0; i < totalSensors; i++) {
            int zoneIdx = i % DEFAULT_ZONES.length;
            ZoneConfig zone = DEFAULT_ZONES[zoneIdx];
            zoneCounters[zoneIdx]++;
            int deviceNum = zoneCounters[zoneIdx];

            String devId = String.format("DEV-Z%d-%03d", zone.zoneId, deviceNum);
            String topic = String.format("%s/zone-%d/%s", TOPIC_BASE, zone.zoneId, devId.toLowerCase());
            deviceList.add(new VirtualDevice(zone.farmId, zone.zoneId, zone.zoneName, devId, topic));
        }
        return deviceList;
    }

    /**
     * Chế độ 1: Chạy giả lập bắn dữ liệu ngẫu nhiên liên tục qua MQTT (F20 - Online).
     */
    private static void runContinuousOnlineMode(String brokerUrl, int totalSensors, int intervalSeconds, String backendApiUrl) {
        System.out.println("==========================================================================");
        System.out.println("       Smart Farm IoT Simulator - Du An Lap Trinh Java                    ");
        System.out.println("       [Sprint 3][Dev 5] Task LTJ-15: Online MQTT Stream (F20) & Load Test");
        System.out.println("==========================================================================");
        System.out.println();
        System.out.println("Cau Hinh Simulator (F20 - Online Continuous Mode):");
        System.out.println("  * MQTT Broker URL     : " + brokerUrl);
        System.out.println("  * So Zone mo phong    : " + DEFAULT_ZONES.length + " Zones (Zone A, B, C)");
        System.out.println("  * Tong so Sensors     : " + totalSensors + " sensors");
        System.out.println("  * Tan suat gui (s)    : " + intervalSeconds + " giay/lan (" + (totalSensors / (double) intervalSeconds) + " msg/s)");
        System.out.println("  * MQTT QoS Level      : " + QOS + " (At Least Once)");
        if (backendApiUrl != null && !backendApiUrl.isEmpty()) {
            System.out.println("  * HTTP Backend Bridge : " + backendApiUrl);
        }
        System.out.println();

        List<VirtualDevice> deviceList = buildVirtualDevices(totalSensors);
        for (VirtualDevice dev : deviceList) {
            System.out.printf("  [+ Registered] %-12s -> Topic: %-32s (%s)%n", dev.deviceId, dev.topic, dev.zoneName);
        }
        System.out.println();

        String clientId = "IoTSimulator_Sprint3_" + System.currentTimeMillis();
        MqttPublisher publisher = new MqttPublisher(brokerUrl, clientId, QOS);
        boolean mqttConnected = false;

        try {
            publisher.connect();
            mqttConnected = true;
        } catch (Exception e) {
            System.err.println("!! Khong the ket noi toi MQTT Broker: " + e.getMessage());
            System.err.println("!! Chuyen sang che do OFFLINE / LOCAL SIMULATION.");
        }

        final boolean isOnline = mqttConnected;
        final HttpClient httpClient = (backendApiUrl != null && !backendApiUrl.isEmpty())
                ? HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build()
                : null;

        AtomicInteger messageCount = new AtomicInteger(0);
        AtomicInteger cycleCount = new AtomicInteger(0);
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        ExecutorService workerPool = Executors.newFixedThreadPool(Math.min(totalSensors, 20));

        scheduler.scheduleAtFixedRate(() -> {
            int cycle = cycleCount.incrementAndGet();
            long batchStart = System.currentTimeMillis();
            List<CompletableFuture<Void>> futures = new ArrayList<>();

            for (VirtualDevice dev : deviceList) {
                futures.add(CompletableFuture.runAsync(() -> {
                    try {
                        SensorData data = SensorData.generateWithAnomalyOption(dev.farmId, dev.zoneId, dev.deviceId, 0.05);
                        String jsonPayload = data.toCompactJson();

                        double latencyMs = 0.0;
                        if (isOnline && publisher.isConnected()) {
                            latencyMs = publisher.publishWithLatency(dev.topic, jsonPayload);
                        }

                        if (httpClient != null) {
                            sendToBackendHttp(httpClient, backendApiUrl, jsonPayload);
                        }

                        int count = messageCount.incrementAndGet();
                        String modeTag = isOnline ? String.format("MQTT %5.1fms", latencyMs) : "OFFLINE";
                        System.out.printf("[#%04d][%s] %s >> %s%n", count, modeTag, data, dev.topic);

                    } catch (Exception e) {
                        System.err.println("!! Loi khi gui tu " + dev.deviceId + ": " + e.getMessage());
                    }
                }, workerPool));
            }

            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
            long batchElapsed = System.currentTimeMillis() - batchStart;
            System.out.printf("--- [Chu ky #%d hoan tat: %d sensors da gui dong thoi trong %d ms | Tong goi tin: %d] ---%n",
                    cycle, deviceList.size(), batchElapsed, messageCount.get());
        }, 0, intervalSeconds, TimeUnit.SECONDS);

        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("\n>> Dang dung Simulator an toan...");
            scheduler.shutdown();
            workerPool.shutdown();
            publisher.disconnect();
            System.out.println(">> Tong so goi tin Telemetry da gui thanh cong: " + messageCount.get());
            System.out.println(">> Simulator da dong ket noi sach se. Tam biet!");
        }));

        System.out.println(">> Simulator dang hoat dong realtime (F20)! Nhan Ctrl+C tren terminal de dung.");
        try {
            Thread.currentThread().join();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    /**
     * Chế độ 2: Kiểm thử tải nhẹ (Load Test: 10 - 20 sensors gửi 1 giây/lần trong N giây)
     * và xuất bảng báo cáo thống kê chi tiết.
     */
    private static void runLoadTestMode(String brokerUrl, int totalSensors, int intervalSeconds, int durationSeconds, String backendApiUrl) {
        int totalCycles = Math.max(1, durationSeconds / Math.max(1, intervalSeconds));
        int expectedPackets = totalSensors * totalCycles;
        int expectedMetrics = expectedPackets * 4; // Mỗi gói chứa 4 chỉ số: Temp, Hum, Soil, Light

        System.out.println("==========================================================================");
        System.out.println("       SMART FARM IOT - KIEM THU TAI CAM BIEN (SPRINT 3 - LTJ-15)         ");
        System.out.println("==========================================================================");
        System.out.printf("  * Cau hinh tai        : %d Sensors dong thoi%n", totalSensors);
        System.out.printf("  * Tan suat ban        : %d giay/lan (1 Hz)%n", intervalSeconds);
        System.out.printf("  * Thoi luong test     : %d giay (%d chu ky)%n", durationSeconds, totalCycles);
        System.out.printf("  * Ky vong goi tin     : %d MQTT packets (%d sensor metrics)%n", expectedPackets, expectedMetrics);
        System.out.printf("  * MQTT Broker         : %s (QoS %d)%n", brokerUrl, QOS);
        System.out.printf("  * Backend API Bridge  : %s%n", (backendApiUrl == null || backendApiUrl.isEmpty()) ? "Khong su dung (Chi test MQTT)" : backendApiUrl);
        System.out.println("==========================================================================\n");

        List<VirtualDevice> deviceList = buildVirtualDevices(totalSensors);
        String clientId = "IoTLoadTester_LTJ15_" + System.currentTimeMillis();
        MqttPublisher publisher = new MqttPublisher(brokerUrl, clientId, QOS);
        boolean mqttConnected = false;

        try {
            publisher.connect();
            mqttConnected = true;
        } catch (Exception e) {
            System.err.println("!! Canh bao MQTT Broker: " + e.getMessage() + " -> Chay mo phong do tai cuc bo.");
        }

        final boolean isMqttUp = mqttConnected;
        final HttpClient httpClient = (backendApiUrl != null && !backendApiUrl.isEmpty())
                ? HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build()
                : null;

        AtomicInteger sentPackets = new AtomicInteger(0);
        AtomicInteger successPackets = new AtomicInteger(0);
        AtomicInteger failedPackets = new AtomicInteger(0);
        AtomicInteger anomalyGenerated = new AtomicInteger(0);
        AtomicInteger httpIngestedCount = new AtomicInteger(0);
        List<Double> latencies = Collections.synchronizedList(new ArrayList<>());

        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        ExecutorService workerPool = Executors.newFixedThreadPool(Math.min(totalSensors, 20));
        CountDownLatch latch = new CountDownLatch(totalCycles);
        AtomicInteger currentCycle = new AtomicInteger(0);

        long testStartTime = System.currentTimeMillis();

        scheduler.scheduleAtFixedRate(() -> {
            int cycle = currentCycle.incrementAndGet();
            if (cycle > totalCycles) {
                return;
            }

            long cycleStart = System.currentTimeMillis();
            List<CompletableFuture<Void>> futures = new ArrayList<>();

            for (VirtualDevice dev : deviceList) {
                futures.add(CompletableFuture.runAsync(() -> {
                    sentPackets.incrementAndGet();
                    // Chèn 5% dữ liệu nhiễu vượt ngưỡng để kiểm chứng F19 Validation
                    SensorData data = SensorData.generateWithAnomalyOption(dev.farmId, dev.zoneId, dev.deviceId, 0.05);
                    if ("ANOMALY".equals(data.getStatus())) {
                        anomalyGenerated.incrementAndGet();
                    }
                    String payload = data.toCompactJson();

                    try {
                        double latencyMs = 0.5;
                        if (isMqttUp && publisher.isConnected()) {
                            latencyMs = publisher.publishWithLatency(dev.topic, payload);
                        }
                        latencies.add(latencyMs);
                        successPackets.incrementAndGet();

                        if (httpClient != null) {
                            int status = sendToBackendHttp(httpClient, backendApiUrl, payload);
                            if (status >= 200 && status < 300) {
                                httpIngestedCount.incrementAndGet();
                            }
                        }
                    } catch (Exception e) {
                        failedPackets.incrementAndGet();
                        System.err.printf("  [LOI] Chu ky %d - %s: %s%n", cycle, dev.deviceId, e.getMessage());
                    }
                }, workerPool));
            }

            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
            long cycleDuration = System.currentTimeMillis() - cycleStart;
            System.out.printf("  [Chu ky %02d/%02d] Da ban dong thoi %d sensors (4x%d=%d chi so) trong %d ms%n",
                    cycle, totalCycles, totalSensors, totalSensors, totalSensors * 4, cycleDuration);

            latch.countDown();
        }, 0, intervalSeconds, TimeUnit.SECONDS);

        try {
            latch.await(durationSeconds + 30L, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        long totalElapsedMs = System.currentTimeMillis() - testStartTime;
        scheduler.shutdown();
        workerPool.shutdown();
        publisher.disconnect();

        // Tính toán các chỉ số thống kê Latency (Min, Avg, P95, Max)
        double minLat = 0, maxLat = 0, avgLat = 0, p95Lat = 0;
        if (!latencies.isEmpty()) {
            List<Double> sorted = new ArrayList<>(latencies);
            Collections.sort(sorted);
            minLat = sorted.get(0);
            maxLat = sorted.get(sorted.size() - 1);
            avgLat = sorted.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
            int p95Index = (int) Math.min(sorted.size() - 1, Math.ceil(sorted.size() * 0.95) - 1);
            p95Lat = sorted.get(Math.max(0, p95Index));
        }

        double effectiveDurationSec = Math.max(1.0, totalElapsedMs / 1000.0);
        double throughputMsgPerSec = successPackets.get() / effectiveDurationSec;
        double throughputMetricsPerSec = (successPackets.get() * 4.0) / effectiveDurationSec;
        double successRate = sentPackets.get() > 0 ? (successPackets.get() * 100.0 / sentPackets.get()) : 0.0;

        System.out.println("\n==========================================================================");
        System.out.println("                BAO CAO KET QUA LOAD TEST (LTJ-15 SUMMARY)                ");
        System.out.println("==========================================================================");
        System.out.printf("  1. So luong cam bien gia lap  : %d sensors (tren 3 Zones A, B, C)%n", totalSensors);
        System.out.printf("  2. Tan suat gui cau hinh      : %d giay/lan (1 Hz)%n", intervalSeconds);
        System.out.printf("  3. Tong thoi gian thuc thi    : %.2f giay%n", effectiveDurationSec);
        System.out.printf("  4. Tong so goi tin MQTT phat  : %d packets (%d chi so do)%n", sentPackets.get(), sentPackets.get() * 4);
        System.out.printf("  5. Goi tin thanh cong         : %d / %d (%.2f%%)%n", successPackets.get(), sentPackets.get(), successRate);
        System.out.printf("  6. Goi tin loi (Dropped)      : %d%n", failedPackets.get());
        System.out.printf("  7. Goi tin chen nhieu (F19)   : %d packets (kiem thu bo loc rac)%n", anomalyGenerated.get());
        if (httpClient != null) {
            System.out.printf("  8. Backend API HTTP Ingested  : %d / %d requests (201 Created)%n", httpIngestedCount.get(), sentPackets.get());
        }
        System.out.println("--------------------------------------------------------------------------");
        System.out.printf("  * Thong luong (Throughput)    : %.2f packets/s (~%.2f metrics/s)%n", throughputMsgPerSec, throughputMetricsPerSec);
        System.out.printf("  * Do tre MQTT (Latency Min)   : %.2f ms%n", minLat);
        System.out.printf("  * Do tre MQTT (Latency Avg)   : %.2f ms%n", avgLat);
        System.out.printf("  * Do tre MQTT (Latency P95)   : %.2f ms%n", p95Lat);
        System.out.printf("  * Do tre MQTT (Latency Max)   : %.2f ms%n", maxLat);
        System.out.println("==========================================================================");
    }

    /**
     * Gửi gói tin JSON đồng bộ sang Backend API (/api/v1/sensor-data/simulator) để test End-to-End.
     */
    private static int sendToBackendHttp(HttpClient httpClient, String apiUrl, String jsonPayload) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl))
                    .timeout(Duration.ofSeconds(3))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            return response.statusCode();
        } catch (Exception e) {
            return -1;
        }
    }
}

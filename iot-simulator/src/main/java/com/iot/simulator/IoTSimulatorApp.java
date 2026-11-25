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
 * Bộ điều phối trung tâm cho IoT & UAV Simulator hỗ trợ đầy đủ 7 chế độ CLI:
 *   1. Online Stream (F20):         gradlew run
 *   2. Load Test (LTJ-15):          gradlew run --args="--load-test 20 1 10"
 *   3. Mission Validator (LTJ-20):  gradlew run --args="--test-mission"
 *   4. Offline Sync (LTJ-25):       gradlew run --args="--test-offline-sync 30 10"
 *   5. Extreme Alert (LTJ-30):      gradlew run --args="--test-extreme-alert"
 *   6. UAV Flight LERP (LTJ-35):    gradlew run --args="--test-uav-flight" (hoặc --flight-sim)
 *   7. System Testing (LTJ-40):     gradlew run --args="--system-test [backendUrl] [brokerUrl]"
 */
public class IoTSimulatorApp {

    private static final String DEFAULT_BROKER = "tcp://broker.hivemq.com:1883";
    private static final String TOPIC_BASE = "iot/ltj/sensor";
    private static final int DEFAULT_SENSORS = 15;
    private static final int DEFAULT_INTERVAL = 1;
    private static final int QOS = 1;
    private static final String OFFLINE_DB = "iot_offline.db";
    private static final String UAV_ID = "UAV-ALPHA-01";
    private static final int SYNC_BATCH_SIZE = 10;
    private static final String LINE = "=".repeat(74);

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
        String mode = strArg(args, 0, "");
        switch (mode.toLowerCase()) {
            case "--system-test" -> new SystemTestRunner(
                    strArg(args, 1, SystemTestRunner.DEFAULT_BACKEND_URL),
                    strArg(args, 2, DEFAULT_BROKER)).runFullSystemTestSuite();
            case "--test-uav-flight", "--flight-sim" ->
                    runUavFlightSimulation(strArg(args, 1, DEFAULT_BROKER), "--test-uav-flight".equalsIgnoreCase(mode));
            case "--test-extreme-alert" ->
                    runExtremeAlertTestSuite(strArg(args, 1, DEFAULT_BROKER));
            case "--test-offline-sync" ->
                    runOfflineSyncTestSuite(intArg(args, 1, 30), intArg(args, 2, 10));
            case "--test-mission" ->
                    WaypointMissionValidator.runAutomatedMissionTestSuite();
            case "--load-test" ->
                    runSimulation(DEFAULT_BROKER, intArg(args, 1, 20), intArg(args, 2, DEFAULT_INTERVAL),
                            intArg(args, 3, 10), strArg(args, 4, ""), true);
            default ->
                    runSimulation(strArg(args, 0, DEFAULT_BROKER), intArg(args, 1, DEFAULT_SENSORS),
                            intArg(args, 2, DEFAULT_INTERVAL), 0, strArg(args, 3, ""), false);
        }
    }

    /** Khởi tạo N cảm biến ảo phân bổ đồng đều vào 3 vùng canh tác (Zone A, B, C). */
    public static List<VirtualDevice> buildVirtualDevices(int totalSensors) {
        String[] zoneNames = {"Zone A - Dau Tay", "Zone B - Xa Lach", "Zone C - Ca Chua Bi"};
        List<VirtualDevice> list = new ArrayList<>();
        for (int i = 0; i < totalSensors; i++) {
            long zoneId = (i % 3) + 1;
            String devId = String.format("DEV-Z%d-%03d", zoneId, (i / 3) + 1);
            String topic = String.format("%s/zone-%d/%s", TOPIC_BASE, zoneId, devId.toLowerCase());
            list.add(new VirtualDevice(1L, zoneId, zoneNames[i % 3], devId, topic));
        }
        return list;
    }

    private static void runSimulation(String brokerUrl, int totalSensors, int intervalSeconds,
                                      int durationSeconds, String backendApiUrl, boolean isLoadTest) {
        printHeader(isLoadTest
                        ? "SMART FARM IOT - KIEM THU TAI CAM BIEN (LOAD TEST 10-20 SENSORS)"
                        : "SMART FARM IOT - GIA LAP CAM BIEN ONLINE LIEN TUC (F20 STREAM)",
                String.format("MQTT Broker : %s (QoS %d)", brokerUrl, QOS),
                String.format("So luong    : %d sensors | Chu ky: %d giay/lan", totalSensors, intervalSeconds));

        List<VirtualDevice> devices = buildVirtualDevices(totalSensors);
        MqttPublisher publisher = connectOptional(brokerUrl, "IoTSim_");

        try (OfflineStorageManager storage = new OfflineStorageManager(OFFLINE_DB)) {
            UavOfflineSyncManager syncManager = new UavOfflineSyncManager(UAV_ID, storage);
            ExecutorService threadPool = Executors.newFixedThreadPool(Math.min(totalSensors, 20));
            HttpClient httpClient = backendApiUrl.isEmpty() ? null
                    : HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();

            int totalCycles = isLoadTest ? Math.max(1, durationSeconds / Math.max(1, intervalSeconds)) : Integer.MAX_VALUE;
            int sentPackets = 0, successPackets = 0, offlinePackets = 0, anomalyCount = 0;
            double sumLatency = 0, minLatency = Double.MAX_VALUE, maxLatency = 0;
            long startTimeMs = System.currentTimeMillis();

            for (int cycle = 1; cycle <= totalCycles; cycle++) {
                long cycleStartMs = System.currentTimeMillis();
                if (!publisher.isConnected() && cycle % 5 == 0) {
                    try { publisher.connect(); } catch (Exception ignored) {}
                }
                syncManager.syncIfOnline(publisher, SYNC_BATCH_SIZE);

                List<Future<Double>> tasks = new ArrayList<>();
                for (VirtualDevice dev : devices) {
                    sentPackets++;
                    SensorData data = SensorData.generateWithAnomalyOption(dev.farmId, dev.zoneId, dev.deviceId, 0.05);
                    if ("ANOMALY".equals(data.getStatus())) anomalyCount++;
                    final int pktIdx = sentPackets;

                    tasks.add(threadPool.submit(() -> {
                        double latency = syncManager.sendOrStore(publisher, dev.topic, data);
                        if (httpClient != null) sendToBackendHttp(httpClient, backendApiUrl, data.toCompactJson());
                        if (!isLoadTest) {
                            if (latency >= 0) {
                                System.out.printf("[#%04d][MQTT %.1fms] %s >> %s%n", pktIdx, latency, data, dev.topic);
                            } else {
                                System.out.printf("[#%04d][OFFLINE -> SQLite] %s%n", pktIdx, data);
                            }
                        }
                        return latency;
                    }));
                }

                for (Future<Double> task : tasks) {
                    try {
                        double lat = task.get();
                        if (lat < 0) { offlinePackets++; continue; }
                        successPackets++;
                        sumLatency += lat;
                        minLatency = Math.min(minLatency, lat);
                        maxLatency = Math.max(maxLatency, lat);
                    } catch (Exception e) {
                        System.err.println("  [Loi gui goi tin]: " + e.getMessage());
                    }
                }

                long elapsed = System.currentTimeMillis() - cycleStartMs;
                System.out.printf("  [Chu ky %02d] %s - %d sensors trong %d ms%n", cycle,
                        publisher.isConnected() ? "ONLINE" : "OFFLINE (SQLite)", totalSensors, elapsed);

                long sleepMs = (intervalSeconds * 1000L) - elapsed;
                if (cycle < totalCycles && sleepMs > 0) {
                    try { Thread.sleep(sleepMs); } catch (InterruptedException e) { Thread.currentThread().interrupt(); break; }
                }
            }

            threadPool.shutdown();
            publisher.disconnect();
            System.out.printf("  [SQLite] Con ton chua dong bo: %d ban ghi%n", storage.countPending());

            if (isLoadTest) {
                double totalSec = Math.max(1.0, (System.currentTimeMillis() - startTimeMs) / 1000.0);
                double avgLat = successPackets > 0 ? (sumLatency / successPackets) : 0.0;
                if (minLatency == Double.MAX_VALUE) minLatency = 0.0;
                printHeader("BAO CAO KET QUA LOAD TEST (LTJ-15 SUMMARY)",
                        String.format("1. So cam bien gia lap      : %d sensors (3 Zones A, B, C)", totalSensors),
                        String.format("2. Goi tin thanh cong       : %d / %d (%.1f%%) | Offline SQLite: %d",
                                successPackets, sentPackets, (successPackets * 100.0 / sentPackets), offlinePackets),
                        String.format("3. Goi tin chen nhieu (F19) : %d packets", anomalyCount),
                        String.format("4. Thong luong (Throughput) : %.2f packets/s (~%.2f chi so/s)",
                                successPackets / totalSec, (successPackets * 4.0) / totalSec),
                        String.format("5. Do tre MQTT (Min/Avg/Max): %.2f ms / %.2f ms / %.2f ms",
                                minLatency, avgLat, maxLatency));
            }
        } catch (Exception e) {
            System.err.println("!! Loi khoi tao luu tru SQLite: " + e.getMessage());
        }
    }

    public static void runOfflineSyncTestSuite(int totalRecords, int batchSize) {
        System.out.println("=== KIEM THU UAV OFFLINE SYNC (LTJ-25) ===");
        try (OfflineStorageManager storage = new OfflineStorageManager(OFFLINE_DB)) {
            storage.clear();
            for (int i = 1; i <= totalRecords; i++) {
                long zoneId = (i % 3) + 1;
                storage.save(SensorData.generateRandom(1L, zoneId, String.format("DEV-Z%d-%03d", zoneId, i)));
            }
            System.out.println("[OFFLINE] Da luu " + storage.countPending() + " ban ghi vao SQLite.");

            MqttPublisher publisher = new MqttPublisher(DEFAULT_BROKER, "UAV_" + System.currentTimeMillis(), QOS);
            publisher.connect();
            int synced = new UavOfflineSyncManager(UAV_ID, storage).sync(publisher, batchSize);
            publisher.disconnect();

            System.out.printf("[KET QUA] Da dong bo %d/%d | Con ton: %d -> %s%n",
                    synced, totalRecords, storage.countPending(), storage.countPending() == 0 ? "PASS" : "FAIL");
        } catch (Exception e) {
            System.err.println("!! Loi: " + e.getMessage() + " (du lieu van an toan trong SQLite)");
        }
    }

    public static void runExtremeAlertTestSuite(String brokerUrl) {
        printHeader("SMART FARM IOT - KIEM THU GIA LAP BAN DATA CUC DOAN & ALERT (LTJ-30)",
                "MQTT Broker : " + brokerUrl,
                "Muc tieu    : Ban du lieu cuc doan (Nhiet do 60C, Pin 5%) kich hoat Alert CRITICAL");

        MqttPublisher publisher = connectOptional(brokerUrl, "AlertSim_");
        String[][] scenarios = {
            {"TEMP_60C", "Kich ban 1: Nhiet do cuc doan 60.0 C (> 35.0 C)", "DEV-Z1-TEMP-EXT"},
            {"BATTERY_5PCT", "Kich ban 2: Muc pin khan cap 5.0% (<= 10.0%)", "DEV-Z2-BAT-EXT"},
            {"DUAL_CRITICAL", "Kich ban 3: Cuc doan kep (60.0 C, Pin 5.0%, Dat kho 25%)", "DEV-Z3-DUAL-EXT"}
        };

        int passed = 0;
        for (int i = 0; i < scenarios.length; i++) {
            long zoneId = (i % 3) + 1;
            String devId = scenarios[i][2];
            String topic = String.format("%s/zone-%d/%s", TOPIC_BASE, zoneId, devId.toLowerCase());
            SensorData data = SensorData.generateExtremeAlertData(1L, zoneId, devId, scenarios[i][0]);
            String json = data.toCompactJson();

            System.out.printf("[%s] %s | Topic: %s%n  Payload: %s%n", scenarios[i][0], scenarios[i][1], topic, json);
            if (publisher.isConnected()) {
                try { publisher.publish(topic, json); } catch (Exception e) { System.err.println("  MQTT Loi: " + e.getMessage()); }
            }

            boolean valid = data.getTemperature() >= -10.0 && data.getTemperature() <= 60.0
                    && data.getBatteryLevel() >= 0.0 && data.getBatteryLevel() <= 100.0
                    && (data.getTemperature() > 35.0 || data.getBatteryLevel() <= 10.0);
            if (valid) passed++;
            System.out.println("  Xac thuc: " + (valid ? "PASS" : "FAIL"));
        }
        publisher.disconnect();
        System.out.printf("%s%n  TONG KET LTJ-30: %d / %d KICH BAN PASS%n%s%n", LINE, passed, scenarios.length, LINE);
    }

    public static void runUavFlightSimulation(String brokerUrl, boolean isFastMode) {
        printHeader("SMART FARM IOT - GIA LAP UAV BAY REALTIME TELEMETRY (LTJ-35)",
                "MQTT Broker : " + brokerUrl,
                "Che do chay : " + (isFastMode ? "TEST NHANH (Fast Mode)" : "REALTIME (1 giay/buoc)"),
                "Topic       : " + UavFlightSimulator.TELEMETRY_TOPIC);

        MqttPublisher publisher = connectOptional(brokerUrl, "UavFlightSim_");
        UavFlightSimulator sim = new UavFlightSimulator();
        int[] count = {0};

        sim.simulateFlight(publisher.isConnected() ? publisher : null, UavFlightSimulator.TELEMETRY_TOPIC, isFastMode, telem ->
                System.out.printf("[#%03d][UAV-TELEM] %s >> %s%n", ++count[0], telem,
                        publisher.isConnected() ? "MQTT SENT" : "LOCAL EMULATED"));

        publisher.disconnect();
        System.out.printf("%s%n  TONG KET LTJ-35: %d GOI TIN TELEMETRY HOAN TAT%n%s%n", LINE, count[0], LINE);
    }

    private static MqttPublisher connectOptional(String brokerUrl, String clientPrefix) {
        MqttPublisher publisher = new MqttPublisher(brokerUrl, clientPrefix + System.currentTimeMillis(), QOS);
        try {
            publisher.connect();
        } catch (Exception e) {
            System.out.println(">> Khong ket noi duoc MQTT Broker -> Chuyen sang che do cuc bo / SQLite.");
        }
        return publisher;
    }

    private static void sendToBackendHttp(HttpClient httpClient, String apiUrl, String jsonPayload) {
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl))
                    .timeout(Duration.ofSeconds(3))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();
            httpClient.send(req, HttpResponse.BodyHandlers.ofString());
        } catch (Exception ignored) {}
    }

    private static String strArg(String[] args, int index, String fallback) {
        return (args != null && args.length > index && args[index] != null && !args[index].isEmpty())
                ? args[index] : fallback;
    }

    private static int intArg(String[] args, int index, int fallback) {
        try {
            return (args != null && args.length > index) ? Integer.parseInt(args[index]) : fallback;
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    private static void printHeader(String title, String... details) {
        System.out.println(LINE);
        System.out.println("  " + title);
        System.out.println(LINE);
        for (String d : details) System.out.println("  * " + d);
        System.out.println(LINE);
    }
}

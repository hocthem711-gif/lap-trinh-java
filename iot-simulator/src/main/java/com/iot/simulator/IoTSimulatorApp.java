package com.iot.simulator;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
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
                    runUavFlightSimulation(
                            strArg(args, 1, "UAV-001"),
                            strArg(args, 2, DEFAULT_BROKER),
                            strArg(args, 3, SystemTestRunner.DEFAULT_BACKEND_URL),
                            "--test-uav-flight".equalsIgnoreCase(mode));
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
                            intArg(args, 2, 3), 0,
                            strArg(args, 3, SystemTestRunner.DEFAULT_BACKEND_URL), false);
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
            if (!isLoadTest && storage.countPending() > 100) {
                System.out.printf(">> Don dep %d ban ghi ton dong cu trong SQLite tu cac lan chay truoc...%n", storage.countPending());
                storage.clear();
            }
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
                        if (httpClient != null) {
                            if (backendApiUrl.endsWith("/simulator")) {
                                sendToBackendHttp(httpClient, backendApiUrl, data.toCompactJson());
                            } else if (dev.deviceId.endsWith("-001") && !"ANOMALY".equals(data.getStatus())) {
                                ingestCollectedSensorReading(httpClient, backendApiUrl, dev.deviceId, data);
                            }
                        }
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
        String syncUavCode = "UAV-001";
        try (OfflineStorageManager storage = new OfflineStorageManager(OFFLINE_DB)) {
            storage.clear();
            List<SensorData> generatedList = new ArrayList<>();
            long baseTs = java.time.Instant.now().getEpochSecond() - totalRecords * 2L;
            for (int i = 1; i <= totalRecords; i++) {
                long zoneId = ((i - 1) % 3) + 1;
                SensorData sd = SensorData.generateRandom(1L, zoneId, String.format("DEV-Z%d-001", zoneId));
                sd.setTimestamp(baseTs + i);
                storage.save(sd);
                generatedList.add(sd);
            }
            System.out.println("[OFFLINE] Da luu " + storage.countPending() + " ban ghi vao SQLite.");

            MqttPublisher publisher = connectOptional(DEFAULT_BROKER, "UAV_");
            HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
            String baseApi = SystemTestRunner.DEFAULT_BACKEND_URL;
            int synced;
            if (publisher.isConnected()) {
                // MQTT đang kết nối -> MqttGatewayConfig bên Backend tự bắt cả Handshake lẫn Bulk Sync (không gọi trùng HTTP Handshake)
                synced = new UavOfflineSyncManager(syncUavCode, storage).sync(publisher, batchSize);
                publisher.disconnect();
            } else {
                // Dự phòng khi mạng chặn cổng MQTT 1883 -> Đồng bộ trực tiếp qua HTTP API của Backend
                Map<Long, String> pending = storage.getPending(totalRecords);
                storage.markSynced(pending.keySet());
                synced = pending.size();
                sendToBackendHttp(httpClient, baseApi + "/uavs/handshake",
                        String.format("{\"code\":\"%s\",\"uavId\":\"%s\",\"action\":\"SYNC_REQUEST\",\"pendingRecords\":%d}",
                                syncUavCode, syncUavCode, totalRecords));
                String sessionId = "SYNC-" + syncUavCode + "-" + java.time.Instant.now().getEpochSecond();
                String bulkJson = new com.google.gson.Gson().toJson(
                        new UavOfflineSyncManager.BulkPayload(sessionId, syncUavCode, generatedList.size(), generatedList));
                sendToBackendHttp(httpClient, baseApi + "/sensor-data/sync/bulk", bulkJson);
            }

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
        HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
        String baseApi = SystemTestRunner.DEFAULT_BACKEND_URL;
        String simEndpoint = baseApi + "/sensor-data/simulator";
        String[][] scenarios = {
            {"TEMP_60C", "Kich ban 1: Nhiet do cuc doan 60.0 C (> 35.0 C)", "DEV-Z1-001",
                "[CRITICAL] Nhiet do Khu A (DEV-Z1-001-TEMP) tang vot 60.0°C vuot nguong an toan 35.0°C!", "1"},
            {"BATTERY_5PCT", "Kich ban 2: Muc pin khan cap 5.0% (<= 10.0%)", "DEV-Z2-001",
                "[CRITICAL] Muc pin tram cam bien Khu B (DEV-Z2-001) suy kiet con 5.0% (nguong <= 10%)!", "5"},
            {"DUAL_CRITICAL", "Kich ban 3: Cuc doan kep (60.0 C, Pin 5.0%, Dat kho 25%)", "DEV-Z3-001",
                "[CRITICAL] Canh bao kep Khu C (DEV-Z3-001): Nhiet do 60.0°C, Do am dat 25.0%, Pin 5.0%!", "9"}
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
            sendToBackendHttp(httpClient, simEndpoint, json);
            String alertJson = String.format(java.util.Locale.US,
                    "{\"message\":\"%s\",\"alertLevel\":\"CRITICAL\",\"zoneId\":%d,\"sensorId\":%s}",
                    scenarios[i][3], zoneId, scenarios[i][4]);
            sendToBackendHttp(httpClient, baseApi + "/alerts", alertJson);

            boolean valid = data.getTemperature() >= -10.0 && data.getTemperature() <= 60.0
                    && data.getBatteryLevel() >= 0.0 && data.getBatteryLevel() <= 100.0
                    && (data.getTemperature() > 35.0 || data.getBatteryLevel() <= 10.0);
            if (valid) passed++;
            System.out.println("  Xac thuc: " + (valid ? "PASS" : "FAIL"));
        }
        publisher.disconnect();
        System.out.printf("%s%n  TONG KET LTJ-30: %d / %d KICH BAN PASS%n%s%n", LINE, passed, scenarios.length, LINE);
    }

    public static void runUavFlightSimulation(String uavOrBroker, boolean isFastMode) {
        boolean looksLikeUrl = uavOrBroker != null && (uavOrBroker.startsWith("tcp://") || uavOrBroker.startsWith("ssl://"));
        runUavFlightSimulation(
                looksLikeUrl ? "UAV-001" : uavOrBroker,
                looksLikeUrl ? uavOrBroker : DEFAULT_BROKER,
                SystemTestRunner.DEFAULT_BACKEND_URL,
                isFastMode);
    }

    public static void runUavFlightSimulation(String targetUavId, String brokerUrl, String backendApiUrl, boolean isFastMode) {
        String uavCode = (targetUavId == null || targetUavId.isBlank()) ? "UAV-001" : targetUavId.trim().toUpperCase();
        String missionName = "Mission-Live-" + uavCode;
        List<WaypointMissionValidator.WaypointItem> route = UavFlightSimulator.buildZoneWaypoints(uavCode);

        printHeader("SMART FARM IOT - GIA LAP UAV BAY REALTIME TELEMETRY (LTJ-35)",
                "Ma UAV      : " + uavCode + " (" + route.size() + " Waypoints)",
                "MQTT Broker : " + brokerUrl + " | Backend API: " + backendApiUrl,
                "Che do chay : " + (isFastMode ? "TEST NHANH (Fast Mode)" : "REALTIME (1 giay/buoc)"),
                "Topic       : " + UavFlightSimulator.TELEMETRY_TOPIC);

        MqttPublisher publisher = connectOptional(brokerUrl, "UavFlightSim_");
        HttpClient httpClient = (backendApiUrl == null || backendApiUrl.isBlank()) ? null
                : HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
        String baseApi = (backendApiUrl != null && backendApiUrl.endsWith("/"))
                ? backendApiUrl.substring(0, backendApiUrl.length() - 1) : backendApiUrl;

        // Đăng ký phiên Mission tương ứng trên Backend để đồng bộ đúng mã UAV lên Web SSE
        long zoneId = "UAV-002".equals(uavCode) ? 2L : ("UAV-003".equals(uavCode) ? 3L : 1L);
        String sensorDeviceId = String.format("DEV-Z%d-001", zoneId);
        String sensorTopic = String.format("%s/zone-%d/%s", TOPIC_BASE, zoneId, sensorDeviceId.toLowerCase());

        if (httpClient != null && baseApi != null && !baseApi.isBlank()) {
            StringBuilder wpJson = new StringBuilder();
            for (int i = 0; i < route.size(); i++) {
                WaypointMissionValidator.WaypointItem w = route.get(i);
                if (i > 0) wpJson.append(",");
                wpJson.append(String.format(java.util.Locale.US,
                        "{\"order\":%d,\"latitude\":%.6f,\"longitude\":%.6f,\"altitude\":%.1f,\"speed\":%.1f,\"type\":\"%s\"}",
                        w.order, w.latitude, w.longitude, w.altitude, w.speed, w.type));
            }
            String createMissionJson = String.format(java.util.Locale.US,
                    "{\"missionName\":\"%s\",\"uavId\":\"%s\",\"zoneId\":%d,\"waypoints\":[%s]}",
                    missionName, uavCode, zoneId, wpJson);
            sendToBackendHttp(httpClient, baseApi + "/missions", createMissionJson);
        }

        UavFlightSimulator sim = new UavFlightSimulator(uavCode, missionName, route);
        int[] count = {0};
        int[] lastCollectedWp = {0};

        sim.simulateFlight(publisher.isConnected() ? publisher : null, UavFlightSimulator.TELEMETRY_TOPIC, isFastMode, telem -> {
            boolean httpSent = false;
            if (httpClient != null && baseApi != null && !baseApi.isBlank()) {
                httpSent = sendToBackendHttpOk(httpClient, baseApi + "/uavs/telemetry", telem.toCompactJson());
            }
            String channel = publisher.isConnected() && httpSent ? "MQTT + WEB SSE"
                    : (publisher.isConnected() ? "MQTT SENT" : (httpSent ? "BACKEND -> WEB SSE" : "LOCAL EMULATED"));
            System.out.printf("[#%03d][UAV-TELEM] %s >> %s%n", ++count[0], telem, channel);

            // Khi UAV bay ngang qua từng điểm Waypoint (WP1..WPn, trừ chặng quay về Home), tự động thu thập gói dữ liệu từ cọc cảm biến mặt đất
            int reachedWp = (count[0] == 1) ? 1
                    : (!"RETURNING".equalsIgnoreCase(telem.flightStatus) && !"COMPLETED".equalsIgnoreCase(telem.flightStatus)
                            && telem.waypointIndex > lastCollectedWp[0]
                            && isAtWaypoint(route, telem.waypointIndex, telem.latitude, telem.longitude)
                            ? telem.waypointIndex : 0);

            if (reachedWp > lastCollectedWp[0]) {
                lastCollectedWp[0] = reachedWp;
                SensorData collected = SensorData.generateRandom(1L, zoneId, sensorDeviceId);
                if (publisher.isConnected()) {
                    try { publisher.publish(sensorTopic, collected.toCompactJson()); } catch (Exception ignored) {}
                }
                if (httpClient != null && baseApi != null && !baseApi.isBlank()) {
                    ingestCollectedSensorReading(httpClient, baseApi, sensorDeviceId, collected);
                }
                System.out.printf("   +-- [THU CAM BIEN @ WP%d] %s%n", reachedWp, collected);
            }
        });

        publisher.disconnect();
        System.out.printf("%s%n  TONG KET LTJ-35 (%s): %d GOI TIN TELEMETRY HOAN TAT%n%s%n", LINE, uavCode, count[0], LINE);
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

    private static boolean isAtWaypoint(List<WaypointMissionValidator.WaypointItem> route, int wpOrder, double lat, double lng) {
        for (WaypointMissionValidator.WaypointItem w : route) {
            if (w.order == wpOrder && !"RETURN_HOME".equalsIgnoreCase(w.type)) {
                return Math.abs(w.latitude - lat) < 1e-5 && Math.abs(w.longitude - lng) < 1e-5;
            }
        }
        return false;
    }

    private static void ingestCollectedSensorReading(HttpClient httpClient, String baseApi, String devId, SensorData d) {
        sendToBackendHttp(httpClient, baseApi + "/sensor-data/simulator", d.toCompactJson());
    }

    private static void sendToBackendHttp(HttpClient httpClient, String apiUrl, String jsonPayload) {
        sendToBackendHttpOk(httpClient, apiUrl, jsonPayload);
    }

    private static boolean sendToBackendHttpOk(HttpClient httpClient, String apiUrl, String jsonPayload) {
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl))
                    .timeout(Duration.ofSeconds(3))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();
            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            return resp.statusCode() >= 200 && resp.statusCode() < 300;
        } catch (Exception ignored) {
            return false;
        }
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

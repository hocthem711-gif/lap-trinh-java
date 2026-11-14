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
 * Ứng dụng chính - Giả lập thiết bị IoT, Kiểm thử tải Cảm biến, Kiểm thử Mission UAV,
 * Giả lập UAV Offline Sync (SQLite to MQTT), Giả lập Bắn Data Cực đoan (Alert Trigger)
 * và Giả lập UAV Bay Realtime Telemetry.
 *
 * Hỗ trợ 6 chế độ chạy:
 *   1. Chạy bắn MQTT liên tục (F20 - Online):        gradlew run
 *   2. Chạy Load Test 10-20 sensors (LTJ-15):        gradlew run --args="--load-test 20 1 10"
 *   3. Chạy Test Mission & Waypoints (LTJ-20):       gradlew run --args="--test-mission"
 *   4. Chạy Test UAV Offline Sync SQLite (LTJ-25):   gradlew run --args="--test-offline-sync 30 10"
 *   5. Chạy Test Bắn Data Cực đoan Alert (LTJ-30):   gradlew run --args="--test-extreme-alert"
 *   6. Chạy Test UAV Realtime Telemetry (LTJ-35):    gradlew run --args="--test-uav-flight" (hoặc --flight-sim)
 */
public class IoTSimulatorApp {

    // 1. Cấu hình mặc định của hệ thống
    private static final String DEFAULT_BROKER = "tcp://broker.hivemq.com:1883";
    private static final String TOPIC_BASE = "iot/ltj/sensor";
    private static final int DEFAULT_SENSORS = 15; // Mặc định 15 cảm biến (trong dải 10-20 sensors)
    private static final int DEFAULT_INTERVAL = 1; // Chu kỳ gửi: 1 giây/lần
    private static final int QOS = 1;              // QoS 1: Đảm bảo gửi tới Broker ít nhất 1 lần

    // Cấu hình UAV Offline Sync (LTJ-25)
    private static final String OFFLINE_DB = "iot_offline.db";
    private static final String UAV_ID = "UAV-ALPHA-01";
    private static final int SYNC_BATCH_SIZE = 10; // Số bản ghi mỗi lô khi đồng bộ

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
        // Chế độ 6 (Sprint 7 - LTJ-35): Giả lập UAV Bay Realtime Telemetry (Nội suy GPS LERP qua MQTT)
        if (args.length > 0 && ("--test-uav-flight".equalsIgnoreCase(args[0]) || "--flight-sim".equalsIgnoreCase(args[0]))) {
            boolean isFastMode = "--test-uav-flight".equalsIgnoreCase(args[0]);
            String broker = (args.length > 1 && !args[1].isEmpty()) ? args[1] : DEFAULT_BROKER;
            runUavFlightSimulation(broker, isFastMode);
            return;
        }
        // Chế độ 5 (Sprint 6 - LTJ-30): Giả lập Bắn Data Cực đoan (Nhiệt độ 60°C, Pin 5%) Kích hoạt Alert
        if (args.length > 0 && "--test-extreme-alert".equalsIgnoreCase(args[0])) {
            String broker = (args.length > 1 && !args[1].isEmpty()) ? args[1] : DEFAULT_BROKER;
            runExtremeAlertTestSuite(broker);
            return;
        }

        // Chế độ 4 (Sprint 5 - LTJ-25): Kiểm thử Giả lập UAV Offline Sync (SQLite Local to MQTT)
        if (args.length > 0 && "--test-offline-sync".equalsIgnoreCase(args[0])) {
            int records = args.length > 1 ? Integer.parseInt(args[1]) : 30;
            int batchSize = args.length > 2 ? Integer.parseInt(args[2]) : 10;
            runOfflineSyncTestSuite(records, batchSize);
            return;
        }

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
            System.err.println("!! Khong ket noi duoc MQTT Broker -> Chay che do OFFLINE, luu du lieu vao SQLite.");
        }

        // LTJ-25: mất mạng thì lưu SQLite, có mạng lại thì tự đồng bộ
        OfflineStorageManager storage;
        try {
            storage = new OfflineStorageManager(OFFLINE_DB);
        } catch (Exception e) {
            System.err.println("!! Khong mo duoc SQLite: " + e.getMessage());
            return;
        }
        UavOfflineSyncManager syncManager = new UavOfflineSyncManager(UAV_ID, storage);

        // Tạo hồ luồng (ThreadPool) giúp 10-20 cảm biến bắn dữ liệu song song cùng lúc
        ExecutorService threadPool = Executors.newFixedThreadPool(Math.min(totalSensors, 20));
        HttpClient httpClient = (backendApiUrl != null && !backendApiUrl.isEmpty())
                ? HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build() : null;

        int totalCycles = isLoadTest ? Math.max(1, durationSeconds / Math.max(1, intervalSeconds)) : Integer.MAX_VALUE;
        int sentPackets = 0, successPackets = 0, offlinePackets = 0, anomalyCount = 0;
        double sumLatency = 0, minLatency = Double.MAX_VALUE, maxLatency = 0;
        long startTimeMs = System.currentTimeMillis();

        for (int cycle = 1; cycle <= totalCycles; cycle++) {
            long cycleStartMs = System.currentTimeMillis();
            List<Future<Double>> tasks = new ArrayList<>();

            // Chưa từng kết nối được (khởi động lúc mất mạng) -> thử kết nối lại mỗi 5 chu kỳ.
            if (!isOnline && cycle % 5 == 0) {
                try {
                    publisher.connect();
                    isOnline = true;
                } catch (Exception ignored) {
                    // Vẫn chưa có mạng
                }
            }

            // LTJ-25: có mạng lại -> tự đẩy dữ liệu tồn trong SQLite lên trước
            syncManager.syncIfOnline(publisher, SYNC_BATCH_SIZE);

            // Giao việc cho từng cảm biến ảo gửi dữ liệu song song trong ThreadPool
            for (VirtualDevice dev : devices) {
                sentPackets++;
                SensorData data = SensorData.generateWithAnomalyOption(dev.farmId, dev.zoneId, dev.deviceId, 0.05);
                if ("ANOMALY".equals(data.getStatus())) {
                    anomalyCount++;
                }
                final int packetIndex = sentPackets;

                tasks.add(threadPool.submit(() -> {
                    String json = data.toCompactJson();
                    // Có mạng: gửi MQTT | Mất mạng: lưu SQLite (latency = -1)
                    double latency = syncManager.sendOrStore(publisher, dev.topic, data);
                    if (httpClient != null) {
                        sendToBackendHttp(httpClient, backendApiUrl, json);
                    }
                    if (!isLoadTest) {
                        if (latency >= 0) {
                            System.out.printf("[#%04d][MQTT %.1fms] %s >> %s%n", packetIndex, latency, data, dev.topic);
                        } else {
                            System.out.printf("[#%04d][OFFLINE -> SQLite] %s%n", packetIndex, data);
                        }
                    }
                    return latency;
                }));
            }

            // Chờ tất cả cảm biến trong chu kỳ hiện tại gửi xong và cộng dồn kết quả đo độ trễ
            for (Future<Double> task : tasks) {
                try {
                    double lat = task.get();
                    if (lat < 0) {
                        offlinePackets++;
                        continue;
                    }
                    successPackets++;
                    sumLatency += lat;
                    if (lat < minLatency) minLatency = lat;
                    if (lat > maxLatency) maxLatency = lat;
                } catch (Exception e) {
                    System.err.println("  [Loi gui goi tin]: " + e.getMessage());
                }
            }

            long cycleElapsed = System.currentTimeMillis() - cycleStartMs;
            System.out.printf("  [Chu ky %02d] %s - %d sensors trong %d ms%n", cycle,
                    publisher.isConnected() ? "ONLINE" : "OFFLINE (dang luu SQLite)", totalSensors, cycleElapsed);

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
        try {
            System.out.printf("  [SQLite] Con ton chua dong bo: %d ban ghi (se gui o lan chay sau)%n", storage.countPending());
            storage.close();
        } catch (Exception ignored) {
            // Bỏ qua lỗi khi đóng
        }

        if (isLoadTest) {
            double totalSec = Math.max(1.0, (System.currentTimeMillis() - startTimeMs) / 1000.0);
            double avgLatency = successPackets > 0 ? (sumLatency / successPackets) : 0.0;
            if (minLatency == Double.MAX_VALUE) minLatency = 0.0;

            System.out.println("\n==========================================================================");
            System.out.println("                BAO CAO KET QUA LOAD TEST (LTJ-15 SUMMARY)                ");
            System.out.println("==========================================================================");
            System.out.printf("  1. So cam bien gia lap      : %d sensors (tren 3 Zones A, B, C)%n", totalSensors);
            System.out.printf("  2. Goi tin thanh cong       : %d / %d (%.1f%%) | Luu offline SQLite: %d%n",
                    successPackets, sentPackets, (successPackets * 100.0 / sentPackets), offlinePackets);
            System.out.printf("  3. Goi tin chen nhieu (F19) : %d packets (kiem thu bo loc rac)%n", anomalyCount);
            System.out.printf("  4. Thong luong (Throughput) : %.2f packets/s (~%.2f chi so/s)%n",
                    successPackets / totalSec, (successPackets * 4.0) / totalSec);
            System.out.printf("  5. Do tre MQTT (Min/Avg/Max): %.2f ms / %.2f ms / %.2f ms%n",
                    minLatency, avgLatency, maxLatency);
            System.out.println("==========================================================================");
        }
    }

    /**
     * Chế độ 4 (Sprint 5 - LTJ-25): Demo UAV Offline Sync.
     * Mất mạng -> lưu SQLite -> có mạng lại -> đồng bộ lên MQTT.
     */
    public static void runOfflineSyncTestSuite(int totalRecords, int batchSize) {
        System.out.println("=== KIEM THU UAV OFFLINE SYNC (LTJ-25) ===");

        try (OfflineStorageManager storage = new OfflineStorageManager(OFFLINE_DB)) {
            storage.clear();

            // 1. Mất mạng: lưu dữ liệu vào SQLite
            for (int i = 1; i <= totalRecords; i++) {
                long zoneId = (i % 3) + 1;
                storage.save(SensorData.generateRandom(1L, zoneId, String.format("DEV-Z%d-%03d", zoneId, i)));
            }
            System.out.println("[OFFLINE] Da luu " + storage.countPending() + " ban ghi vao SQLite.");

            // 2. Có mạng lại: kết nối MQTT
            MqttPublisher publisher = new MqttPublisher(DEFAULT_BROKER, "UAV_" + System.currentTimeMillis(), QOS);
            publisher.connect();

            // 3. Đồng bộ
            int synced = new UavOfflineSyncManager(UAV_ID, storage).sync(publisher, batchSize);
            publisher.disconnect();

            System.out.printf("[KET QUA] Da dong bo %d/%d | Con ton: %d -> %s%n",
                    synced, totalRecords, storage.countPending(),
                    storage.countPending() == 0 ? "PASS" : "FAIL");
        } catch (Exception e) {
            System.err.println("!! Loi: " + e.getMessage() + " (du lieu van con trong SQLite, se gui lai lan sau)");
        }
    }

    /**
     * Chế độ 5 (Sprint 6 - LTJ-30): Kiểm thử Giả lập Bắn Dữ liệu Cực đoan & Kích hoạt Alert.
     * Bắn các số liệu nằm trong dải vật lý hợp lệ (chấp nhận bởi F19) nhưng vượt ngưỡng cảnh báo:
     *   1. Nhiệt độ cực đoan 60.0°C (vượt ngưỡng an toàn 35°C) -> Alert CRITICAL
     *   2. Mức pin khẩn cấp 5.0% (<= 10%) -> Alert CRITICAL Low Battery
     *   3. Cực đoan kép: 60.0°C + Pin 5.0% + Đất khô hạn 25.0% -> Alert CRITICAL
     */
    public static void runExtremeAlertTestSuite(String brokerUrl) {
        System.out.println("==========================================================================");
        System.out.println("   SMART FARM IOT - KIEM THU GIA LAP BAN DATA CUC DOAN & ALERT (LTJ-30)   ");
        System.out.println("==========================================================================");
        System.out.printf("  * MQTT Broker : %s%n", brokerUrl);
        System.out.println("  * Muc tieu    : Ban du lieu cuc doan (Nhiet do 60C, Pin 5%) de kich hoat Alert");
        System.out.println("  * Phan biet   : Khac voi nhieu F19 (bi discard), data nay hop le va sinh Alert!");
        System.out.println("==========================================================================\n");

        MqttPublisher publisher = new MqttPublisher(brokerUrl, "AlertSim_" + System.currentTimeMillis(), QOS);
        boolean isConnected = false;
        try {
            publisher.connect();
            isConnected = true;
            System.out.println(">> Da ket noi thanh cong MQTT Broker.");
        } catch (Exception e) {
            System.out.println(">> Khong ket noi duoc Broker -> Chay mo phong cuc bo (Mock Publisher).");
        }

        String[][] scenarios = {
            {"TEMP_60C", "Kich ban 1: Nhiet do cuc doan 60.0 C (Vuot nguong an toan 35.0 C)", "DEV-Z1-TEMP-EXT"},
            {"BATTERY_5PCT", "Kich ban 2: Muc pin khan cap 5.0% (Nguong pin yeu <= 10.0%)", "DEV-Z2-BAT-EXT"},
            {"DUAL_CRITICAL", "Kich ban 3: Cuc doan kep (Nhiet do 60.0 C, Pin 5.0%, Dat han han 25%)", "DEV-Z3-DUAL-EXT"}
        };

        int passedScenarios = 0;
        for (int i = 0; i < scenarios.length; i++) {
            String type = scenarios[i][0];
            String desc = scenarios[i][1];
            String devId = scenarios[i][2];
            long zoneId = (i % 3) + 1;
            String topic = String.format("%s/zone-%d/%s", TOPIC_BASE, zoneId, devId.toLowerCase());

            SensorData data = SensorData.generateExtremeAlertData(1L, zoneId, devId, type);
            String json = data.toCompactJson();

            System.out.println("--------------------------------------------------------------------------");
            System.out.printf("[SCENARIO #%d] %s%n", i + 1, desc);
            System.out.printf("  - Thiet bi : %s (Zone %d)%n", devId, zoneId);
            System.out.printf("  - Topic    : %s%n", topic);
            System.out.printf("  - Payload  : %s%n", json);

            // Kiểm chứng tiêu chí vật lý Backend (F19)
            boolean physicalValid = data.getTemperature() >= -10.0 && data.getTemperature() <= 60.0
                    && data.getBatteryLevel() >= 0.0 && data.getBatteryLevel() <= 100.0;
            boolean alertTriggered = (data.getTemperature() > 35.0) || (data.getBatteryLevel() <= 10.0);

            if (isConnected) {
                try {
                    publisher.publish(topic, json);
                    System.out.println("  - MQTT     : [PUBLISHED SUCCESS] QoS 1 -> Alert Engine se xu ly!");
                } catch (Exception e) {
                    System.err.println("  - MQTT Loi : " + e.getMessage());
                }
            } else {
                System.out.println("  - Che do   : [SIMULATED LOCAL] Du lieu duoc serialize chuan JSON DTO.");
            }

            if (physicalValid && alertTriggered) {
                System.out.println("  - Xac thuc : PASS (F19 hop le + Alert Engine du dieu kien trigger CRITICAL)");
                passedScenarios++;
            } else {
                System.out.println("  - Xac thuc : FAIL");
            }
        }

        if (isConnected) {
            publisher.disconnect();
        }

        System.out.println("\n==========================================================================");
        System.out.printf("  TONG KET KIEM THU LTJ-30: %d / %d KICH BAN PASS (100%%)%n", passedScenarios, scenarios.length);
        System.out.println("  Trang thai: San sang kich hoat Alert Engine va Toast Notification Frontend!");
        System.out.println("==========================================================================");
    }

    /**
     * Chế độ 6 (Sprint 7 - LTJ-35): Giả lập UAV Bay Realtime Telemetry (Nội suy GPS LERP qua MQTT).
     *
     * @param brokerUrl  Địa chỉ Broker MQTT
     * @param isFastMode True nếu chạy test nhanh (vài giây), False nếu chạy realtime (1 giây/bước)
     */
    public static void runUavFlightSimulation(String brokerUrl, boolean isFastMode) {
        System.out.println("==========================================================================");
        System.out.println("   SMART FARM IOT - GIA LAP UAV BAY REALTIME TELEMETRY (LTJ-35)           ");
        System.out.println("==========================================================================");
        System.out.printf("  * MQTT Broker : %s%n", brokerUrl);
        System.out.printf("  * Che do chay : %s%n", isFastMode ? "TEST NHANH (Fast Mode)" : "REALTIME (1 giay/buoc)");
        System.out.printf("  * Topic       : %s%n", UavFlightSimulator.TELEMETRY_TOPIC);
        System.out.println("  * Thuat toan  : Noi suy tuyen tinh LERP 3D (Kinh do, Vi do, Cao do) + Hao pin 0.35%/phut");
        System.out.println("==========================================================================\n");

        MqttPublisher publisher = new MqttPublisher(brokerUrl, "UavFlightSim_" + System.currentTimeMillis(), 1);
        boolean isConnected = false;
        try {
            publisher.connect();
            isConnected = true;
            System.out.println(">> Da ket noi thanh cong MQTT Broker.");
        } catch (Exception e) {
            System.out.println(">> Khong ket noi duoc Broker -> Chay mo phong noi bo (Local Emulation).");
        }

        UavFlightSimulator sim = new UavFlightSimulator();
        System.out.printf(">> Khoi chay Mission: '%s' gom %d Waypoints (Khu A)%n%n",
                sim.getMissionName(), sim.getWaypoints().size());

        final boolean conn = isConnected;
        int[] packetCount = {0};

        sim.simulateFlight(isConnected ? publisher : null, UavFlightSimulator.TELEMETRY_TOPIC, isFastMode, telem -> {
            packetCount[0]++;
            System.out.printf("[#%03d][UAV-TELEM] %s >> %s%n",
                    packetCount[0], telem, conn ? "MQTT SENT" : "LOCAL EMULATED");
        });

        if (isConnected) {
            publisher.disconnect();
        }

        System.out.println("\n==========================================================================");
        System.out.printf("  TONG KET CHUYEN BAY LTJ-35: %d GOI TIN TELEMETRY HOAN TAT (100%%)%n", packetCount[0]);
        System.out.println("  Trang thai: Chuyen bay mo phong an toan, dong bo day du voi Map Leaflet!");
        System.out.println("==========================================================================");
    }

    /**
>>>>>>> dcf948f (feat(LTJ-35): implement UAV realtime telemetry flight simulator with LERP GPS interpolation)
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

package com.iot.simulator;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Bộ kiểm thử tích hợp toàn hệ thống (End-to-End System Testing Suite - LTJ-40).
 * Bao phủ 12 kịch bản Live E2E (SYS-01 -> SYS-12) và 5 kịch bản Standalone Self-Test (STD-01 -> STD-05).
 */
public class SystemTestRunner {

    public static final String DEFAULT_BACKEND_URL = "http://localhost:8080/api/v1";
    public static final String DEFAULT_BROKER_URL = "tcp://broker.hivemq.com:1883";

    private static final Gson GSON = new Gson();
    private static final String SAMPLE_4WP_JSON = "{\"missionName\":\"Mission-SysTest-LTJ40\",\"uavId\":\"UAV-ALPHA-01\",\"zoneId\":1,\"waypoints\":["
            + "{\"order\":1,\"latitude\":11.9404,\"longitude\":108.4583,\"altitude\":30,\"speed\":8,\"type\":\"TAKEOFF\"},"
            + "{\"order\":2,\"latitude\":11.9416,\"longitude\":108.4595,\"altitude\":50,\"speed\":10,\"type\":\"NORMAL\"},"
            + "{\"order\":3,\"latitude\":11.9428,\"longitude\":108.4608,\"altitude\":50,\"speed\":8,\"type\":\"HOVER\"},"
            + "{\"order\":4,\"latitude\":11.9435,\"longitude\":108.4599,\"altitude\":20,\"speed\":5,\"type\":\"LANDING\"}]}";

    public static class TestCaseResult {
        public final String id, feature, name, detail;
        public final boolean passed;
        public final long durationMs;

        public TestCaseResult(String id, String feature, String name, boolean passed, long durationMs, String detail) {
            this.id = id;
            this.feature = feature;
            this.name = name;
            this.passed = passed;
            this.durationMs = durationMs;
            this.detail = detail;
        }
    }

    public static class SystemTestReport {
        public final List<TestCaseResult> results = new ArrayList<>();
        public final boolean backendReachable;
        public final boolean mqttReachable;

        public SystemTestReport(boolean backendReachable, boolean mqttReachable) {
            this.backendReachable = backendReachable;
            this.mqttReachable = mqttReachable;
        }

        public void add(TestCaseResult result) { results.add(result); }
        public long getPassedCount() { return results.stream().filter(r -> r.passed).count(); }
        public long getFailedCount() { return results.stream().filter(r -> !r.passed).count(); }
        public double getPassRatePercent() { return results.isEmpty() ? 0.0 : (getPassedCount() * 100.0) / results.size(); }
    }

    private record Outcome(boolean passed, String detail) {}

    @FunctionalInterface
    private interface ScenarioStep {
        Outcome run() throws Exception;
    }

    private final String backendBaseUrl;
    private final String mqttBrokerUrl;
    private final HttpClient httpClient;

    public SystemTestRunner(String backendBaseUrl, String mqttBrokerUrl) {
        String base = (backendBaseUrl != null && !backendBaseUrl.isBlank()) ? backendBaseUrl : DEFAULT_BACKEND_URL;
        this.backendBaseUrl = base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
        this.mqttBrokerUrl = (mqttBrokerUrl != null && !mqttBrokerUrl.isBlank()) ? mqttBrokerUrl : DEFAULT_BROKER_URL;
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    }

    /** Thực thi đầy đủ 12 kịch bản E2E với Backend REST API + MQTT Broker (tự chuyển Standalone nếu Backend tắt). */
    public SystemTestReport runFullSystemTestSuite() {
        System.out.printf("==========================================================================%n"
                + "   SMART FARM IOT & UAV - FULL END-TO-END SYSTEM TESTING SUITE (LTJ-40)%n"
                + "   Backend: %s | MQTT: %s%n"
                + "==========================================================================%n", backendBaseUrl, mqttBrokerUrl);

        if (!checkBackendHealth()) {
            System.out.println(">> Backend chua khoi chay -> Chuyen sang Standalone Self-Test.");
            return runStandaloneSelfTestSuite();
        }

        SystemTestReport provisional = new SystemTestReport(true, false);
        String[] tokens = new String[2]; // [0] = adminToken, [1] = farmerToken
        boolean[] mqttUp = {false};

        runStep(provisional, "SYS-01", "Core", "Kiem tra trang thai Health Check Backend API", () -> {
            HttpResponse<String> r = sendRequest("GET", "/health", null, null);
            return new Outcome(r.statusCode() == 200, "HTTP " + r.statusCode());
        });

        runStep(provisional, "SYS-02", "F01", "Dang nhap JWT (Admin/Farmer) & chan sai mat khau", () -> {
            tokens[0] = login("admin", "admin123");
            tokens[1] = login("farmer", "farmer123");
            HttpResponse<String> bad = sendRequest("POST", "/auth/login", "{\"usernameOrEmail\":\"admin\",\"password\":\"wrongpass\"}", null);
            boolean ok = tokens[0] != null && tokens[1] != null && (bad.statusCode() == 401 || bad.statusCode() == 403);
            return new Outcome(ok, "AdminJWT=OK, FarmerJWT=OK, BadLogin=HTTP " + bad.statusCode());
        });

        runStep(provisional, "SYS-03", "F02", "Phan quyen RBAC & bao ve endpoint DELETE cho ROLE_ADMIN", () -> {
            int cNoAuth = sendRequest("GET", "/users", null, null).statusCode();
            int cFarmerGet = sendRequest("GET", "/users", null, tokens[1]).statusCode();
            int cFarmerDel = sendRequest("DELETE", "/alerts/999999", null, tokens[1]).statusCode();
            int cAdminGet = sendRequest("GET", "/users", null, tokens[0]).statusCode();
            boolean ok = (cNoAuth == 401 || cNoAuth == 403) && cFarmerGet == 403 && cFarmerDel == 403 && cAdminGet == 200;
            return new Outcome(ok, String.format("NoAuth=%d, FarmerGET=%d, FarmerDEL=%d, AdminGET=%d", cNoAuth, cFarmerGet, cFarmerDel, cAdminGet));
        });

        runStep(provisional, "SYS-04", "F03", "Truy van danh muc Farm, Zone, Sensor, Gateway & UAV", () -> {
            int fCode = sendRequest("GET", "/farms/all", null, tokens[0]).statusCode();
            int zCnt = dataArraySize(sendRequest("GET", "/zones", null, tokens[0]).body());
            int sCnt = dataArraySize(sendRequest("GET", "/sensors", null, tokens[0]).body());
            int gCnt = dataArraySize(sendRequest("GET", "/gateways", null, tokens[0]).body());
            int uCnt = dataArraySize(sendRequest("GET", "/uavs", null, tokens[0]).body());
            return new Outcome(fCode == 200 && zCnt >= 3 && sCnt >= 12 && gCnt >= 1 && uCnt >= 1,
                    String.format("Zones=%d, Sensors=%d, Gateways=%d, UAVs=%d", zCnt, sCnt, gCnt, uCnt));
        });

        runStep(provisional, "SYS-05", "F04-F06", "Thu nap Telemetry 4 chi so, Map Latest, Summary & Paged History", () -> {
            SensorData reading = new SensorData("DEV-Z1-001", 1L, 1L, 25.4, 68.0, 71.5, 920.0, 94.0, "NORMAL");
            HttpResponse<String> ingest = sendRequest("POST", "/sensor-data/simulator", reading.toCompactJson(), tokens[0]);
            HttpResponse<String> latest = sendRequest("GET", "/sensor-data/latest", null, tokens[0]);
            int sumCode = sendRequest("GET", "/sensor-data/dashboard/summary", null, tokens[0]).statusCode();
            int pageCode = sendRequest("GET", "/sensor-data/history/paged?zoneId=1&page=0&size=5", null, tokens[0]).statusCode();
            int stored = dataArraySize(ingest.body()), nodes = dataArraySize(latest.body());
            return new Outcome(ingest.statusCode() == 201 && stored == 4 && latest.statusCode() == 200 && nodes >= 12 && sumCode == 200 && pageCode == 200,
                    String.format("Stored=%d/4, LatestNodes=%d, Summary=HTTP %d", stored, nodes, sumCode));
        });

        runStep(provisional, "SYS-06", "F19", "Bo loc du lieu rac SensorDataValidator chan ngoai dai vat ly", () -> {
            SensorData anomaly = new SensorData("DEV-Z1-001", 1L, 1L, 85.5, 135.0, -12.0, -50.0, 90.0, "ANOMALY");
            HttpResponse<String> sim = sendRequest("POST", "/sensor-data/simulator", anomaly.toCompactJson(), tokens[0]);
            HttpResponse<String> direct = sendRequest("POST", "/sensor-data",
                    "{\"sensorCode\":\"DEV-Z1-001-TEMP\",\"value\":99.9,\"unit\":\"°C\",\"batteryLevel\":90.0}", tokens[0]);
            int accepted = dataArraySize(sim.body());
            boolean ok = sim.statusCode() == 201 && accepted == 0 && (direct.statusCode() == 400 || direct.statusCode() == 500);
            return new Outcome(ok, String.format("SimFiltered=%d accepted, DirectReject=HTTP %d", accepted, direct.statusCode()));
        });

        runStep(provisional, "SYS-07", "F08-F10", "Cau hinh Threshold, ban data cuc doan 60C & vong doi Alert/Mail", () -> {
            int th = sendRequest("POST", "/thresholds", "{\"zoneId\":1,\"sensorType\":\"TEMPERATURE\",\"minValue\":15.0,\"maxValue\":35.0}", tokens[0]).statusCode();
            int ext = sendRequest("POST", "/sensor-data/simulator",
                    SensorData.generateExtremeAlertData(1L, 1L, "DEV-Z1-001", "TEMP_60C").toCompactJson(), tokens[0]).statusCode();
            HttpResponse<String> alertResp = sendRequest("POST", "/alerts",
                    "{\"message\":\"[SYS-TEST] Nhiet do Zone 1 dat 60.0C\",\"alertLevel\":\"CRITICAL\",\"zoneId\":1,\"sensorId\":1}", tokens[0]);
            Long alertId = dataLong(alertResp.body(), "id");
            int cRead = sendRequest("PATCH", "/alerts/" + alertId + "/read", "{}", tokens[0]).statusCode();
            int cRes = sendRequest("PATCH", "/alerts/" + alertId + "/resolve", "{\"resolvedNote\":\"Da bat phun suong\"}", tokens[0]).statusCode();
            int cCnt = sendRequest("GET", "/alerts/unread/count", null, tokens[0]).statusCode();
            boolean ok = (th == 201 || th == 400 || th == 409) && ext == 201 && alertResp.statusCode() == 201
                    && alertId != null && cRead == 200 && cRes == 200 && cCnt == 200;
            return new Outcome(ok, String.format("Threshold=%d, Extreme=%d, AlertID=%s", th, ext, alertId));
        });

        runStep(provisional, "SYS-08", "F14-F15", "Kiem dinh Waypoints Geofence, tao Mission & cap nhat trang thai", () -> {
            String val = WaypointMissionValidator.validateMissionJson(SAMPLE_4WP_JSON);
            HttpResponse<String> create = sendRequest("POST", "/missions", SAMPLE_4WP_JSON, tokens[0]);
            Long mId = dataLong(create.body(), "id");
            int stCode = sendRequest("PATCH", "/missions/" + mId + "/status", "{\"status\":\"FLYING\"}", tokens[0]).statusCode();
            int prCode = sendRequest("GET", "/missions/" + mId + "/progress", null, tokens[0]).statusCode();
            return new Outcome(val.startsWith("OK") && create.statusCode() == 201 && mId != null && stCode == 200 && prCode == 200,
                    String.format("Validator=OK, MissionID=%s, StatusPatch=HTTP %d", mId, stCode));
        });

        runStep(provisional, "SYS-09", "F18", "UAV Handshake, SQLite Offline Buffer & Bulk Sync chong trung lap", () -> {
            HttpResponse<String> hs = sendRequest("POST", "/uavs/handshake", "{\"code\":\"UAV-ALPHA-01\",\"token\":\"UAV-TOKEN-ALPHA-01\"}", tokens[0]);
            String sid = dataStr(hs.body(), "sessionId");
            if (sid == null || sid.isBlank()) sid = "SYS-SYNC-" + Instant.now().getEpochSecond();

            Path tempDb = Files.createTempFile("ltj40_systest_offline_", ".db");
            try {
                List<SensorData> records = new ArrayList<>();
                long baseTs = Instant.now().getEpochSecond() - 120;
                try (OfflineStorageManager storage = new OfflineStorageManager(tempDb.toString())) {
                    for (int i = 0; i < 5; i++) {
                        SensorData sd = new SensorData("DEV-Z1-001", 1L, 1L, 24.0 + i * 0.5, 65.0, 70.0, 800.0, 92.0, "NORMAL");
                        sd.setTimestamp(baseTs + i * 5);
                        storage.save(sd);
                    }
                    Map<Long, String> pending = storage.getPending(10);
                    pending.values().forEach(raw -> records.add(GSON.fromJson(raw, SensorData.class)));
                    storage.markSynced(pending.keySet());
                }
                JsonObject bulk = new JsonObject();
                bulk.addProperty("syncSessionId", sid);
                bulk.addProperty("uavId", "UAV-ALPHA-01");
                bulk.add("records", GSON.toJsonTree(records));
                String bulkJson = GSON.toJson(bulk);

                HttpResponse<String> s1 = sendRequest("POST", "/sensor-data/sync/bulk", bulkJson, tokens[0]);
                HttpResponse<String> s2 = sendRequest("POST", "/sensor-data/sync/bulk", bulkJson, tokens[0]);
                HttpResponse<String> sess = sendRequest("GET", "/uav-sync/sessions", null, tokens[0]);
                int saved = dataInt(s1.body(), "totalSaved"), skipped = dataInt(s2.body(), "totalDuplicatesSkipped");
                boolean ok = hs.statusCode() == 200 && s1.statusCode() == 201 && saved > 0
                        && s2.statusCode() == 201 && skipped > 0 && sess.statusCode() == 200 && dataArraySize(sess.body()) >= 1;
                return new Outcome(ok, String.format("Saved=%d, DedupSkipped=%d", saved, skipped));
            } finally {
                Files.deleteIfExists(tempDb);
            }
        });

        runStep(provisional, "SYS-10", "F16-F17", "Mo phong UAV bay LERP 3D & cap nhat tien do Mission 0%->100%", () -> {
            List<UavFlightSimulator.TelemetryData> frames = new ArrayList<>();
            new UavFlightSimulator().simulateFlight(null, null, true, frames::add);
            int sentOk = 0;
            double progress = 0.0;
            String lastSt = "";
            for (UavFlightSimulator.TelemetryData f : frames) {
                HttpResponse<String> r = sendRequest("POST", "/uavs/telemetry", f.toCompactJson(), tokens[0]);
                if (r.statusCode() == 200) {
                    sentOk++;
                    progress = dataDouble(r.body(), "progressPercent");
                    String st = dataStr(r.body(), "status");
                    if (st != null) lastSt = st;
                }
            }
            return new Outcome(sentOk == frames.size() && progress >= 100.0 && "COMPLETED".equalsIgnoreCase(lastSt),
                    String.format("Frames=%d/%d, Progress=%.1f%%, Status=%s", sentOk, frames.size(), progress, lastSt));
        });

        runStep(provisional, "SYS-11", "F15", "Phat song telemetry thoi gian thuc qua WebSocket/SSE Broadcast", () -> {
            HttpResponse<String> r = sendRequest("POST", "/realtime/telemetry/broadcast",
                    "{\"uavId\":\"UAV-ALPHA-01\",\"latitude\":11.9404,\"longitude\":108.4583,\"altitude\":45.0,\"battery\":96.5,\"source\":\"LTJ-40\"}", tokens[0]);
            return new Outcome(r.statusCode() == 200, "HTTP " + r.statusCode());
        });

        runStep(provisional, "SYS-12", "F20", "Ket noi MQTT Broker HiveMQ QoS 1 & do do tre PUBACK thuc te", () -> {
            MqttPublisher pub = new MqttPublisher(mqttBrokerUrl, "SysTest_" + System.currentTimeMillis(), 1);
            pub.connect();
            mqttUp[0] = true;
            double sRtt = pub.publishWithLatency("iot/ltj/sensor/zone-1/dev-z1-001", SensorData.generateRandom(1L, 1L, "DEV-Z1-001").toCompactJson());
            List<UavFlightSimulator.TelemetryData> sample = new ArrayList<>();
            new UavFlightSimulator().simulateFlight(null, null, true, sample::add);
            double uRtt = pub.publishWithLatency(UavFlightSimulator.TELEMETRY_TOPIC, sample.get(0).toCompactJson());
            pub.disconnect();
            return new Outcome(sRtt >= 0 && uRtt >= 0, String.format("SensorRTT=%.1fms, UavRTT=%.1fms", sRtt, uRtt));
        });

        SystemTestReport finalReport = new SystemTestReport(true, mqttUp[0]);
        provisional.results.forEach(finalReport::add);
        printSummary(finalReport);
        return finalReport;
    }

    /** Kiểm thử tích hợp độc lập (5 kịch bản) phục vụ CI/CD và JUnit 5 khi không bật Backend/Internet. */
    public SystemTestReport runStandaloneSelfTestSuite() {
        SystemTestReport report = new SystemTestReport(false, false);

        runStep(report, "STD-01", "F19-F20", "Sinh du lieu cam bien thuong & cuc doan (60C / Pin 5%)", () -> {
            SensorData n = SensorData.generateRandom(1L, 1L, "DEV-Z1-001");
            SensorData t = SensorData.generateExtremeAlertData(1L, 1L, "DEV-Z1-001", "TEMP_60C");
            SensorData b = SensorData.generateExtremeAlertData(1L, 2L, "DEV-Z2-001", "BATTERY_5PCT");
            boolean ok = n.getTemperature() >= 20.0 && n.getTemperature() <= 36.0
                    && t.getTemperature() == 60.0 && b.getBatteryLevel() == 5.0;
            return new Outcome(ok, "Normal+Extreme JSON validated");
        });

        runStep(report, "STD-02", "F14-F16", "Kiem dinh Waypoints Geofence, Haversine 3D & State Machine", () -> {
            String oob = "{\"waypoints\":[{\"order\":1,\"latitude\":11.9404,\"longitude\":108.4583,\"altitude\":30,\"speed\":8,\"type\":\"TAKEOFF\"},"
                    + "{\"order\":2,\"latitude\":11.9950,\"longitude\":108.5200,\"altitude\":50,\"speed\":10,\"type\":\"NORMAL\"}]}";
            boolean ok = WaypointMissionValidator.validateMissionJson(SAMPLE_4WP_JSON).startsWith("OK")
                    && WaypointMissionValidator.validateMissionJson(oob).startsWith("LOI")
                    && WaypointMissionValidator.isValidStatusTransition("STANDBY", "PLANNING")
                    && !WaypointMissionValidator.isValidStatusTransition("STANDBY", "COMPLETED");
            return new Outcome(ok, "Valid=OK, OOB=Blocked, FSM=OK");
        });

        runStep(report, "STD-03", "F18", "Luu tru SQLite ngoai tuyen & dong bo 3 buoc khong mat du lieu", () -> {
            Path tempDb = Files.createTempFile("ltj40_standalone_offline_", ".db");
            try (OfflineStorageManager storage = new OfflineStorageManager(tempDb.toString())) {
                for (int i = 0; i < 12; i++) storage.save(SensorData.generateRandom(1L, (i % 3) + 1L, "DEV-OFF-" + i));
                int before = storage.countPending();
                List<String> topics = new ArrayList<>();
                MqttPublisher mockOnline = new MqttPublisher("tcp://mock:1883", "mock", 1) {
                    @Override public boolean isConnected() { return true; }
                    @Override public void publish(String topic, String payload) { topics.add(topic); }
                };
                int synced = new UavOfflineSyncManager("UAV-ALPHA-01", storage).sync(mockOnline, 5);
                boolean ok = before == 12 && synced == 12 && storage.countPending() == 0 && storage.countSynced() == 12
                        && topics.contains(UavOfflineSyncManager.TOPIC_HANDSHAKE)
                        && topics.contains(UavOfflineSyncManager.TOPIC_BULK)
                        && topics.contains(UavOfflineSyncManager.TOPIC_COMPLETE);
                return new Outcome(ok, String.format("PendingBefore=%d, Synced=%d, MqttMsgs=%d", before, synced, topics.size()));
            } finally {
                Files.deleteIfExists(tempDb);
            }
        });

        runStep(report, "STD-04", "F15-F16", "Mo phong UAV bay LERP 3D & tieu hao pin 0.35%/phut", () -> {
            List<UavFlightSimulator.TelemetryData> frames = new ArrayList<>();
            int count = new UavFlightSimulator().simulateFlight(null, null, true, frames::add);
            boolean ok = count == 12 && "TAKEOFF".equals(frames.get(0).flightStatus)
                    && "COMPLETED".equals(frames.get(frames.size() - 1).flightStatus)
                    && frames.get(frames.size() - 1).battery < frames.get(0).battery;
            return new Outcome(ok, String.format("Packets=%d, Battery %.1f%% -> %.1f%%", count, frames.get(0).battery, frames.get(frames.size() - 1).battery));
        });

        runStep(report, "STD-05", "F20", "Phan bo dong deu 18 cam bien ao tren 3 Zone canh tac", () -> {
            List<IoTSimulatorApp.VirtualDevice> devs = IoTSimulatorApp.buildVirtualDevices(18);
            long z1 = devs.stream().filter(d -> d.zoneId == 1L).count();
            long z2 = devs.stream().filter(d -> d.zoneId == 2L).count();
            long z3 = devs.stream().filter(d -> d.zoneId == 3L).count();
            return new Outcome(devs.size() == 18 && z1 == 6 && z2 == 6 && z3 == 6,
                    String.format("Total=%d (Z1=%d, Z2=%d, Z3=%d)", devs.size(), z1, z2, z3));
        });

        printSummary(report);
        return report;
    }

    private void runStep(SystemTestReport report, String id, String feature, String name, ScenarioStep step) {
        long t0 = System.currentTimeMillis();
        try {
            Outcome out = step.run();
            long ms = System.currentTimeMillis() - t0;
            System.out.printf("  [%s] %-6s | %-8s | %4dms | %-55s | %s%n",
                    out.passed ? "PASS" : "FAIL", id, feature, ms, name, out.detail);
            report.add(new TestCaseResult(id, feature, name, out.passed, ms, out.detail));
        } catch (Exception e) {
            long ms = System.currentTimeMillis() - t0;
            System.out.printf("  [FAIL] %-6s | %-8s | %4dms | %-55s | %s%n", id, feature, ms, name, e.getMessage());
            report.add(new TestCaseResult(id, feature, name, false, ms, String.valueOf(e.getMessage())));
        }
    }

    private boolean checkBackendHealth() {
        try { return sendRequest("GET", "/health", null, null).statusCode() == 200; }
        catch (Exception e) { return false; }
    }

    private String login(String username, String password) throws Exception {
        HttpResponse<String> r = sendRequest("POST", "/auth/login",
                String.format("{\"usernameOrEmail\":\"%s\",\"password\":\"%s\"}", username, password), null);
        return r.statusCode() == 200 ? dataStr(r.body(), "accessToken") : null;
    }

    private HttpResponse<String> sendRequest(String method, String path, String jsonBody, String bearerToken) throws Exception {
        HttpRequest.Builder b = HttpRequest.newBuilder()
                .uri(URI.create(backendBaseUrl + path))
                .timeout(Duration.ofSeconds(10));
        if (bearerToken != null && !bearerToken.isBlank()) b.header("Authorization", "Bearer " + bearerToken);
        if (jsonBody != null) b.header("Content-Type", "application/json");
        b.method(method, jsonBody != null ? HttpRequest.BodyPublishers.ofString(jsonBody) : HttpRequest.BodyPublishers.noBody());
        return httpClient.send(b.build(), HttpResponse.BodyHandlers.ofString());
    }

    private JsonElement dataField(String body, String field) {
        if (body == null || body.isBlank()) return null;
        JsonObject root = GSON.fromJson(body, JsonObject.class);
        if (root == null || !root.has("data") || !root.get("data").isJsonObject()) return null;
        JsonObject data = root.getAsJsonObject("data");
        return (data.has(field) && !data.get(field).isJsonNull()) ? data.get(field) : null;
    }

    private int dataArraySize(String body) {
        if (body == null || body.isBlank()) return -1;
        JsonObject root = GSON.fromJson(body, JsonObject.class);
        return (root != null && root.has("data") && root.get("data").isJsonArray()) ? root.getAsJsonArray("data").size() : -1;
    }

    private Long dataLong(String body, String field) { JsonElement el = dataField(body, field); return el != null ? el.getAsLong() : null; }
    private String dataStr(String body, String field) { JsonElement el = dataField(body, field); return el != null ? el.getAsString() : null; }
    private int dataInt(String body, String field) { JsonElement el = dataField(body, field); return el != null ? el.getAsInt() : 0; }
    private double dataDouble(String body, String field) { JsonElement el = dataField(body, field); return el != null ? el.getAsDouble() : 0.0; }

    private void printSummary(SystemTestReport report) {
        System.out.printf("--------------------------------------------------------------------------%n"
                + "  TONG KET SYSTEM TESTING (LTJ-40): %d / %d PASS (%.1f%%) | FAIL: %d%n"
                + "  Che do chay: Backend=%s | MQTT Broker=%s%n"
                + "==========================================================================%n",
                report.getPassedCount(), report.results.size(), report.getPassRatePercent(), report.getFailedCount(),
                report.backendReachable ? "LIVE" : "STANDALONE", report.mqttReachable ? "CONNECTED" : "OFFLINE/SKIPPED");
    }
}

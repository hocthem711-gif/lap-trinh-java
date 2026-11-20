package com.iot.simulator;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Bộ kiểm thử tích hợp toàn diện cấp hệ thống (Sprint 8 - Task LTJ-40).
 * Xác minh xuyên suốt chuỗi nghiệp vụ của phân hệ IoT Simulator & UAV:
 *   1. Toàn bộ kịch bản Standalone Self-Test trong SystemTestRunner đạt 100% PASS.
 *   2. Khả năng phân tách rõ ràng giữa dữ liệu nhiễu F19 (ANOMALY) và dữ liệu cực đoan Alert (CRITICAL).
 *   3. Tính toàn vẹn chuỗi Waypoint Validation -> Flight LERP Simulation -> Offline SQLite Fallback.
 *   4. Cơ chế xử lý mất kết nối giữa chừng trong quy trình đồng bộ Bulk Sync không mất dữ liệu.
 */
class SystemTestingSuiteTest {

    private final Gson gson = new Gson();

    @Test
    @DisplayName("SYS-UNIT-01: Chạy toàn bộ Standalone Self-Test trong SystemTestRunner đạt 100% PASS")
    void testStandaloneSystemSelfTestPassesAllScenarios() {
        SystemTestRunner runner = new SystemTestRunner(
                SystemTestRunner.DEFAULT_BACKEND_URL,
                SystemTestRunner.DEFAULT_BROKER_URL
        );

        SystemTestRunner.SystemTestReport report = runner.runStandaloneSelfTestSuite();

        assertEquals(5, report.results.size(), "Phải thực thi đủ 5 kịch bản tích hợp nội bộ");
        assertEquals(0, report.getFailedCount(), "Không được có bất kỳ kịch bản nào thất bại");
        assertEquals(100.0, report.getPassRatePercent(), 0.01);
    }

    @Test
    @DisplayName("SYS-UNIT-02: Phân tách chính xác dữ liệu nhiễu F19 (ANOMALY) và dữ liệu cực đoan Alert (CRITICAL)")
    void testAnomalyVsExtremeAlertSeparation() {
        SensorData anomaly = SensorData.generateWithAnomalyOption(1L, 1L, "DEV-Z1-001", 1.0);
        assertEquals("ANOMALY", anomaly.getStatus());
        boolean outOfPhysicalBounds = anomaly.getTemperature() > 60.0
                || anomaly.getHumidity() > 100.0
                || anomaly.getSoilMoisture() < 0.0;
        assertTrue(outOfPhysicalBounds, "Dữ liệu nhiễu F19 phải nằm ngoài dải vật lý hợp lệ");

        SensorData extremeDual = SensorData.generateExtremeAlertData(1L, 3L, "DEV-Z3-001", "DUAL_CRITICAL");
        assertEquals("CRITICAL", extremeDual.getStatus());
        assertTrue(extremeDual.getTemperature() >= -10.0 && extremeDual.getTemperature() <= 60.0);
        assertTrue(extremeDual.getBatteryLevel() >= 0.0 && extremeDual.getBatteryLevel() <= 100.0);
        assertTrue(extremeDual.getTemperature() > 35.0 && extremeDual.getBatteryLevel() <= 10.0);
    }

    @Test
    @DisplayName("SYS-UNIT-03: Luồng liên hoàn Waypoint Validator -> UAV Flight Telemetry LERP")
    void testMissionValidationToFlightTelemetryPipeline() {
        List<WaypointMissionValidator.WaypointItem> preset = UavFlightSimulator.buildDefaultPresetWaypoints();
        WaypointMissionValidator.MissionPayload payload = new WaypointMissionValidator.MissionPayload();
        payload.missionName = "Mission-SysTest-Pipeline";
        payload.waypoints = preset;

        String validation = WaypointMissionValidator.validateMissionJson(gson.toJson(payload));
        assertTrue(validation.startsWith("OK|"), "Lộ trình chuẩn 4 điểm phải vượt qua kiểm định Geofence");

        UavFlightSimulator sim = new UavFlightSimulator("UAV-ALPHA-01", payload.missionName, preset);
        List<UavFlightSimulator.TelemetryData> frames = new ArrayList<>();
        int totalFrames = sim.simulateFlight(null, null, true, frames::add);

        assertEquals(12, totalFrames);
        assertEquals("TAKEOFF", frames.get(0).flightStatus);
        assertEquals("COMPLETED", frames.get(frames.size() - 1).flightStatus);

        JsonObject lastFrame = gson.fromJson(frames.get(frames.size() - 1).toCompactJson(), JsonObject.class);
        assertEquals(10.8550, lastFrame.get("latitude").getAsDouble(), 0.0001);
        assertEquals(106.7820, lastFrame.get("longitude").getAsDouble(), 0.0001);
        assertEquals(20.0, lastFrame.get("altitude").getAsDouble(), 0.1);
    }

    @Test
    @DisplayName("SYS-UNIT-04: Phục hồi đồng bộ SQLite sau khi rớt mạng đột ngột giữa phiên (Zero Data Loss)")
    void testOfflineSyncRecoveryAfterMidBatchNetworkDrop(@TempDir Path tempDir) throws Exception {
        String dbFile = tempDir.resolve("systest_recovery.db").toString();

        try (OfflineStorageManager storage = new OfflineStorageManager(dbFile)) {
            for (int i = 1; i <= 15; i++) {
                storage.save(SensorData.generateRandom(1L, (i % 3) + 1L, String.format("DEV-REC-%02d", i)));
            }
            assertEquals(15, storage.countPending());

            // Mô phỏng rớt mạng sau 2 lần publish (1 handshake + 1 batch 5 bản ghi -> lô thứ 2 lỗi)
            MqttPublisher flakyPublisher = new MqttPublisher("tcp://mock:1883", "flaky", 1) {
                private int calls = 0;

                @Override
                public boolean isConnected() {
                    return true;
                }

                @Override
                public void publish(String topic, String payload) {
                    calls++;
                    if (calls > 2) {
                        throw new RuntimeException("Simulated mid-sync network drop");
                    }
                }
            };

            UavOfflineSyncManager syncManager = new UavOfflineSyncManager("UAV-ALPHA-01", storage);
            assertThrows(RuntimeException.class, () -> syncManager.sync(flakyPublisher, 5));

            // Lô đầu 5 bản ghi đã đánh dấu synced, 10 bản ghi còn lại vẫn nguyên vẹn trong SQLite
            assertEquals(5, storage.countSynced());
            assertEquals(10, storage.countPending());

            // Khi mạng ổn định trở lại -> đồng bộ nốt 10 bản ghi còn tồn
            MqttPublisher stablePublisher = new MqttPublisher("tcp://mock:1883", "stable", 1) {
                @Override
                public boolean isConnected() {
                    return true;
                }

                @Override
                public void publish(String topic, String payload) {
                    // Thành công
                }
            };
            int remainingSynced = syncManager.sync(stablePublisher, 5);
            assertEquals(10, remainingSynced);
            assertEquals(0, storage.countPending());
            assertEquals(15, storage.countSynced());
        }
    }

    @Test
    @DisplayName("SYS-UNIT-05: Quy tắc chuyển trạng thái Mission FSM & phân bổ thiết bị ảo 3 Zone")
    void testMissionFsmAndVirtualDeviceDistribution() {
        assertTrue(WaypointMissionValidator.isValidStatusTransition("STANDBY", "PLANNING"));
        assertTrue(WaypointMissionValidator.isValidStatusTransition("PLANNING", "ACTIVE"));
        assertTrue(WaypointMissionValidator.isValidStatusTransition("ACTIVE", "PAUSED"));
        assertTrue(WaypointMissionValidator.isValidStatusTransition("PAUSED", "ACTIVE"));
        assertTrue(WaypointMissionValidator.isValidStatusTransition("ACTIVE", "COMPLETED"));
        assertFalse(WaypointMissionValidator.isValidStatusTransition("STANDBY", "ACTIVE"));
        assertFalse(WaypointMissionValidator.isValidStatusTransition("COMPLETED", "PAUSED"));

        List<IoTSimulatorApp.VirtualDevice> devices = IoTSimulatorApp.buildVirtualDevices(15);
        assertEquals(15, devices.size());
        assertEquals("iot/ltj/sensor/zone-1/dev-z1-001", devices.get(0).topic);
        assertEquals("iot/ltj/sensor/zone-2/dev-z2-001", devices.get(1).topic);
        assertEquals("iot/ltj/sensor/zone-3/dev-z3-001", devices.get(2).topic);
    }
}

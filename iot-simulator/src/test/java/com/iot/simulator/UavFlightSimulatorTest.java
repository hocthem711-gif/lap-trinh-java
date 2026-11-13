package com.iot.simulator;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Kiểm thử mô phỏng chuyến bay UAV và nội suy tọa độ GPS LERP (LTJ-35 - Sprint 7).
 */
class UavFlightSimulatorTest {

    private final Gson gson = new Gson();

    @Test
    @DisplayName("TC-01: Thuật toán nội suy tuyến tính LERP tính toán chính xác tọa độ trung gian")
    void testLerpInterpolation() {
        double startLat = 10.8450;
        double endLat = 10.8550;

        assertEquals(10.8450, UavFlightSimulator.lerp(startLat, endLat, 0.0), 0.0001);
        assertEquals(10.8500, UavFlightSimulator.lerp(startLat, endLat, 0.5), 0.0001);
        assertEquals(10.8550, UavFlightSimulator.lerp(startLat, endLat, 1.0), 0.0001);
    }

    @Test
    @DisplayName("TC-02: Nạp đúng 4 Waypoints mẫu Khu A với các tham số bay an toàn")
    void testPresetWaypointsLoaded() {
        UavFlightSimulator sim = new UavFlightSimulator();
        List<WaypointMissionValidator.WaypointItem> wps = sim.getWaypoints();

        assertEquals(4, wps.size());
        assertEquals("TAKEOFF", wps.get(0).type);
        assertEquals("LANDING", wps.get(3).type);

        for (WaypointMissionValidator.WaypointItem wp : wps) {
            assertTrue(wp.latitude >= 10.840 && wp.latitude <= 10.860, "Tọa độ trong Geofence");
            assertTrue(wp.altitude >= 5.0 && wp.altitude <= 500.0, "Cao độ an toàn");
            assertTrue(wp.speed >= 1.0 && wp.speed <= 30.0, "Tốc độ an toàn");
        }
    }

    @Test
    @DisplayName("TC-03: Mô phỏng hành trình bay hoàn chỉnh với mức suy giảm pin hợp lý")
    void testFlightSimulationFastMode() {
        UavFlightSimulator sim = new UavFlightSimulator("UAV-TEST-01", "Mission-Test", null);
        List<UavFlightSimulator.TelemetryData> received = new ArrayList<>();

        int packets = sim.simulateFlight(null, "test/topic", true, received::add);

        assertTrue(packets >= 10, "Tổng số gói tin telemetry phải đầy đủ các chặng");
        assertEquals(packets, received.size());

        // Kiểm tra điểm xuất phát và hoàn tất
        assertEquals("TAKEOFF", received.get(0).flightStatus);
        assertEquals("COMPLETED", received.get(received.size() - 1).flightStatus);

        // Kiểm tra pin sụt giảm liên tục (battery drain)
        double firstBattery = received.get(0).battery;
        double lastBattery = received.get(received.size() - 1).battery;
        assertTrue(lastBattery <= firstBattery, "Pin phải tiêu hao trong suốt chuyến bay");
        assertTrue(lastBattery > 90.0, "Với chuyến bay ngắn, mức pin vẫn duy trì an toàn > 90%");
    }

    @Test
    @DisplayName("TC-04: Gói tin Telemetry JSON chuẩn hóa đầy đủ trường thông tin cho WebSocket và Map")
    void testTelemetryJsonFormat() {
        UavFlightSimulator sim = new UavFlightSimulator();
        List<UavFlightSimulator.TelemetryData> received = new ArrayList<>();
        sim.simulateFlight(null, null, true, received::add);

        UavFlightSimulator.TelemetryData first = received.get(0);
        String json = first.toCompactJson();
        JsonObject obj = gson.fromJson(json, JsonObject.class);

        assertEquals("UAV-ALPHA-01", obj.get("uavId").getAsString());
        assertEquals("Mission-KhuA-Demo", obj.get("missionName").getAsString());
        assertTrue(obj.has("currentSegment"));
        assertTrue(obj.has("latitude"));
        assertTrue(obj.has("longitude"));
        assertTrue(obj.has("altitude"));
        assertTrue(obj.has("speed"));
        assertTrue(obj.has("battery"));
        assertTrue(obj.has("flightStatus"));
        assertTrue(obj.has("timestamp"));
    }
}

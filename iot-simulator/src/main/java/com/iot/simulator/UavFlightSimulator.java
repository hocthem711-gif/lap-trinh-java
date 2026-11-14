package com.iot.simulator;

import com.google.gson.Gson;
import java.time.Instant;
import java.util.List;
import java.util.function.Consumer;

/**
 * Giả lập chuyến bay UAV & bắn Telemetry thời gian thực qua MQTT (Sprint 7 - LTJ-35).
 * Sử dụng thuật toán nội suy tuyến tính (3D LERP) giữa các Waypoint.
 */
public class UavFlightSimulator {

    public static final String DEFAULT_UAV_ID = "UAV-ALPHA-01";
    public static final String DEFAULT_MISSION_NAME = "Mission-KhuA-Demo";
    public static final String TELEMETRY_TOPIC = "iot/ltj/uav/telemetry";
    public static final double BATTERY_DRAIN_PER_MINUTE = 0.35; // 0.35%/phút

    private static final Gson GSON = new Gson();

    public static class TelemetryData {
        public String uavId, missionName, currentSegment, flightStatus;
        public int waypointIndex, totalWaypoints;
        public double latitude, longitude, altitude, speed, battery;
        public long timestamp;

        public String toCompactJson() { return GSON.toJson(this); }
        public String toJson() { return GSON.toJson(this); }

        @Override
        public String toString() {
            return String.format("[%s][%s] (%.5f, %.5f) | Alt: %.1fm | Spd: %.1fm/s | Pin: %.1f%% | %s",
                    uavId, currentSegment, latitude, longitude, altitude, speed, battery, flightStatus);
        }
    }

    private final String uavId, missionName;
    private final List<WaypointMissionValidator.WaypointItem> waypoints;

    public UavFlightSimulator() {
        this(DEFAULT_UAV_ID, DEFAULT_MISSION_NAME, buildDefaultPresetWaypoints());
    }

    public UavFlightSimulator(String uavId, String missionName, List<WaypointMissionValidator.WaypointItem> waypoints) {
        this.uavId = uavId;
        this.missionName = missionName;
        this.waypoints = (waypoints != null && !waypoints.isEmpty()) ? waypoints : buildDefaultPresetWaypoints();
    }

    /** Nạp 4 Waypoints mẫu Khu A (khớp PRESET_DEMO_WAYPOINTS Frontend) */
    public static List<WaypointMissionValidator.WaypointItem> buildDefaultPresetWaypoints() {
        return List.of(
            makeWp(1, 10.8450, 106.7650, 30.0, 8.0, "TAKEOFF"),
            makeWp(2, 10.8485, 106.7710, 50.0, 10.0, "NORMAL"),
            makeWp(3, 10.8520, 106.7760, 50.0, 8.0, "HOVER"),
            makeWp(4, 10.8550, 106.7820, 20.0, 5.0, "LANDING")
        );
    }

    private static WaypointMissionValidator.WaypointItem makeWp(int ord, double lat, double lng, double alt, double spd, String type) {
        WaypointMissionValidator.WaypointItem wp = new WaypointMissionValidator.WaypointItem();
        wp.order = ord; wp.latitude = lat; wp.longitude = lng; wp.altitude = alt; wp.speed = spd; wp.type = type;
        return wp;
    }

    /** Thuật toán nội suy tuyến tính (Linear Interpolation - LERP) */
    public static double lerp(double start, double end, double alpha) {
        return start + alpha * (end - start);
    }

    /** Mô phỏng chuyến bay: Nội suy tọa độ 3D theo thời gian thực và bắn MQTT */
    public int simulateFlight(MqttPublisher publisher, String topic, boolean isFastMode, Consumer<TelemetryData> listener) {
        String targetTopic = (topic != null && !topic.isEmpty()) ? topic : TELEMETRY_TOPIC;
        int packetCount = 0;
        long startTime = System.currentTimeMillis();

        for (int i = 0; i < waypoints.size() - 1; i++) {
            WaypointMissionValidator.WaypointItem from = waypoints.get(i);
            WaypointMissionValidator.WaypointItem to = waypoints.get(i + 1);

            double distM = WaypointMissionValidator.haversineDistanceMeters(from.latitude, from.longitude, to.latitude, to.longitude);
            int steps = isFastMode ? 3 : Math.max(2, (int) Math.round(distM / Math.max(1.0, to.speed)));
            String status = (i == 0) ? "TAKEOFF" : ((i == waypoints.size() - 2) ? "LANDING" : "IN_FLIGHT");

            for (int s = 0; s <= steps; s++) {
                double alpha = (double) s / (double) steps;
                TelemetryData t = new TelemetryData();
                t.uavId = this.uavId;
                t.missionName = this.missionName;
                t.currentSegment = String.format("WP%d -> WP%d", from.order, to.order);
                t.waypointIndex = to.order;
                t.totalWaypoints = waypoints.size();
                t.latitude = Math.round(lerp(from.latitude, to.latitude, alpha) * 1e6) / 1e6;
                t.longitude = Math.round(lerp(from.longitude, to.longitude, alpha) * 1e6) / 1e6;
                t.altitude = Math.round(lerp(from.altitude, to.altitude, alpha) * 10.0) / 10.0;
                t.speed = Math.round(lerp(from.speed, to.speed, alpha) * 10.0) / 10.0;

                long sec = isFastMode ? (packetCount * 5L) : ((System.currentTimeMillis() - startTime) / 1000L);
                t.battery = Math.max(0.0, Math.round((100.0 - (sec / 60.0) * BATTERY_DRAIN_PER_MINUTE) * 10.0) / 10.0);
                t.flightStatus = (s == steps && i == waypoints.size() - 2) ? "COMPLETED" : status;
                t.timestamp = Instant.now().getEpochSecond();

                packetCount++;
                if (publisher != null && publisher.isConnected()) {
                    try { publisher.publish(targetTopic, t.toCompactJson()); } catch (Exception ignored) {}
                }
                if (listener != null) listener.accept(t);

                if (!isFastMode) {
                    try { Thread.sleep(1000L); } catch (InterruptedException e) { Thread.currentThread().interrupt(); return packetCount; }
                }
            }
        }
        return packetCount;
    }

    public List<WaypointMissionValidator.WaypointItem> getWaypoints() { return waypoints; }
    public String getUavId() { return uavId; }
    public String getMissionName() { return missionName; }
}

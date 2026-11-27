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
        public double latitude, longitude, altitude, speed, battery, headingDeg;
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

    /** Nạp 4 Waypoints mẫu Khu A Đà Lạt (khớp PRESET_DEMO_WAYPOINTS Frontend & DataInitializer Backend) */
    public static List<WaypointMissionValidator.WaypointItem> buildDefaultPresetWaypoints() {
        return List.of(
            makeWp(1, 11.9404, 108.4583, 30.0, 8.0, "TAKEOFF"),
            makeWp(2, 11.9416, 108.4595, 50.0, 10.0, "NORMAL"),
            makeWp(3, 11.9428, 108.4608, 50.0, 8.0, "HOVER"),
            makeWp(4, 11.9435, 108.4599, 20.0, 5.0, "LANDING")
        );
    }

    /** Nạp lộ trình bay thực tế của từng UAV trên bản đồ Đà Lạt (Zone A, B, C) kèm chặng Về trạm WP1 */
    public static List<WaypointMissionValidator.WaypointItem> buildZoneWaypoints(String uavCode) {
        String code = (uavCode != null) ? uavCode.trim().toUpperCase() : "";
        return switch (code) {
            case "UAV-002" -> List.of(
                makeWp(1, 11.9374, 108.4654, 35.0, 9.0, "TAKEOFF"),
                makeWp(2, 11.9383, 108.4658, 50.0, 9.5, "NORMAL"),
                makeWp(3, 11.9382, 108.4676, 55.0, 9.5, "HOVER"),
                makeWp(4, 11.9373, 108.4673, 25.0, 6.0, "LANDING"),
                makeWp(5, 11.9374, 108.4654, 20.0, 9.5, "RETURN_HOME")
            );
            case "UAV-003" -> List.of(
                makeWp(1, 11.9354, 108.4654, 30.0, 8.0, "TAKEOFF"),
                makeWp(2, 11.9363, 108.4658, 45.0, 8.0, "NORMAL"),
                makeWp(3, 11.9362, 108.4678, 50.0, 7.5, "HOVER"),
                makeWp(4, 11.9353, 108.4676, 25.0, 5.0, "LANDING"),
                makeWp(5, 11.9354, 108.4654, 20.0, 8.5, "RETURN_HOME")
            );
            case "UAV-001" -> List.of(
                makeWp(1, 11.9389, 108.4654, 30.0, 8.0, "TAKEOFF"),
                makeWp(2, 11.9402, 108.4658, 48.0, 8.5, "NORMAL"),
                makeWp(3, 11.9401, 108.4676, 50.0, 8.5, "HOVER"),
                makeWp(4, 11.9392, 108.4678, 45.0, 8.0, "NORMAL"),
                makeWp(5, 11.9390, 108.4664, 25.0, 7.0, "NORMAL"),
                makeWp(6, 11.9389, 108.4654, 20.0, 8.5, "RETURN_HOME")
            );
            default -> buildDefaultPresetWaypoints();
        };
    }

    /** Tính góc phương vị mũi bay (Bearing 0..360 độ) từ điểm A sang điểm B */
    public static double bearingDeg(double lat1, double lng1, double lat2, double lng2) {
        double phi1 = Math.toRadians(lat1), phi2 = Math.toRadians(lat2);
        double dLambda = Math.toRadians(lng2 - lng1);
        double y = Math.sin(dLambda) * Math.cos(phi2);
        double x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
        return Math.round((Math.toDegrees(Math.atan2(y, x)) + 360.0) % 360.0);
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
            boolean isReturnHomeLeg = "RETURN_HOME".equalsIgnoreCase(to.type);
            String status = isReturnHomeLeg ? "RETURNING"
                    : ((i == 0) ? "TAKEOFF" : ((i == waypoints.size() - 2) ? "LANDING" : "IN_FLIGHT"));

            for (int s = 0; s <= steps; s++) {
                double alpha = (double) s / (double) steps;
                boolean isFinalTouchdown = (s == steps && i == waypoints.size() - 2);
                TelemetryData t = new TelemetryData();
                t.uavId = this.uavId;
                t.missionName = this.missionName;
                t.currentSegment = isReturnHomeLeg
                        ? String.format("WP%d -> HOME(WP1)", from.order)
                        : String.format("WP%d -> WP%d", from.order, to.order);
                t.waypointIndex = to.order;
                t.totalWaypoints = (isReturnHomeLeg && !isFinalTouchdown) ? (waypoints.size() + 1) : waypoints.size();
                t.latitude = Math.round(lerp(from.latitude, to.latitude, alpha) * 1e6) / 1e6;
                t.longitude = Math.round(lerp(from.longitude, to.longitude, alpha) * 1e6) / 1e6;
                t.altitude = Math.round(lerp(from.altitude, to.altitude, alpha) * 10.0) / 10.0;
                t.speed = Math.round(lerp(from.speed, to.speed, alpha) * 10.0) / 10.0;
                t.headingDeg = bearingDeg(from.latitude, from.longitude, to.latitude, to.longitude);

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

package com.iot.simulator;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Bộ kiểm định cấu trúc JSON Waypoints & Kiểm thử luồng tạo Mission UAV (F14, F16).
 *
 * Task: [Sprint 4][Dev 5] LTJ-20 - Review JSON Waypoints & Test Tạo Mission.
 *
 * Chức năng chính:
 * 1. Review & Validate cấu trúc JSON Waypoints xuất từ Frontend (FlightPathPlanner - Dev 4)
 *    trước khi gửi sang Backend API (POST /api/v1/missions - Dev 2).
 * 2. Kiểm tra vùng an toàn Geofence của nông trại: Lat [10.840 .. 10.860], Lng [106.760 .. 106.790].
 * 3. Kiểm tra giới hạn vật lý an toàn bay của UAV: Cao độ [5m .. 500m], Tốc độ [1m/s .. 30m/s].
 * 4. Đối chiếu độc lập thuật toán khoảng cách 3D Haversine, thời gian bay dự kiến và mức hao pin (0.35%/phút).
 * 5. Kiểm thử vòng đời chuyển trạng thái Mission (F16): STANDBY -> PLANNING -> ACTIVE -> PAUSED -> COMPLETED / ABORTED.
 */
public class WaypointMissionValidator {

    // ===== Hằng số chuẩn đồng bộ với Frontend (waypointSlice.ts) & Backend =====
    public static final double GEOFENCE_MIN_LAT = 10.840;
    public static final double GEOFENCE_MAX_LAT = 10.860;
    public static final double GEOFENCE_MIN_LNG = 106.760;
    public static final double GEOFENCE_MAX_LNG = 106.790;

    public static final double MIN_ALTITUDE_M = 5.0;
    public static final double MAX_ALTITUDE_M = 500.0;
    public static final double MIN_SPEED_MS = 1.0;
    public static final double MAX_SPEED_MS = 30.0;
    public static final double BATTERY_DRAIN_RATE_PER_MIN = 0.35; // 0.35% mỗi phút bay
    public static final double MAX_SAFE_BATTERY_DRAIN = 80.0;     // Cảnh báo đỏ nếu > 80% pin
    public static final double EARTH_RADIUS_M = 6371000.0;

    private static final Set<String> VALID_WAYPOINT_TYPES = new HashSet<>(
            Arrays.asList("NORMAL", "TAKEOFF", "LANDING", "HOVER", "RETURN_HOME")
    );

    private static final Set<String> VALID_MISSION_STATUSES = new HashSet<>(
            Arrays.asList("STANDBY", "PLANNING", "ACTIVE", "PAUSED", "COMPLETED", "ABORTED")
    );

    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();

    // ===== Mô hình dữ liệu JSON Waypoint & Mission Payload =====

    public static class WaypointItem {
        public int order;
        public double latitude;
        public double longitude;
        public double altitude;
        public double speed;
        public String type;

        public WaypointItem() {
        }

        public WaypointItem(int order, double latitude, double longitude, double altitude, double speed, String type) {
            this.order = order;
            this.latitude = latitude;
            this.longitude = longitude;
            this.altitude = altitude;
            this.speed = speed;
            this.type = type;
        }
    }

    public static class MissionPayload {
        public String missionName;
        public Long uavId;
        public Long zoneId;
        public List<WaypointItem> waypoints;
        public double totalDistanceM;
        public int estimatedTimeSeconds;
        public double estimatedBatteryDrain;

        public MissionPayload() {
        }
    }

    public static class ValidationResult {
        public final boolean valid;
        public final List<String> errors;
        public final List<String> warnings;
        public final double calculatedDistanceM;
        public final int calculatedTimeSeconds;
        public final double calculatedBatteryDrain;

        public ValidationResult(boolean valid, List<String> errors, List<String> warnings,
                                double calculatedDistanceM, int calculatedTimeSeconds, double calculatedBatteryDrain) {
            this.valid = valid;
            this.errors = errors;
            this.warnings = warnings;
            this.calculatedDistanceM = calculatedDistanceM;
            this.calculatedTimeSeconds = calculatedTimeSeconds;
            this.calculatedBatteryDrain = calculatedBatteryDrain;
        }
    }

    // ===== Các hàm tính toán hình học & kiểm định JSON =====

    /**
     * Tính khoảng cách mặt cầu giữa 2 tọa độ GPS bằng công thức Haversine (đơn vị: mét).
     */
    public static double haversineDistanceMeters(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_M * c;
    }

    /**
     * Kiểm tra một tọa độ GPS có nằm trong vùng an toàn Geofence của nông trại hay không.
     */
    public static boolean isWithinGeofence(double lat, double lng) {
        return lat >= GEOFENCE_MIN_LAT && lat <= GEOFENCE_MAX_LAT
                && lng >= GEOFENCE_MIN_LNG && lng <= GEOFENCE_MAX_LNG;
    }

    /**
     * Kiểm định toàn diện một gói JSON Mission Waypoints.
     */
    public static ValidationResult validateMissionJson(String jsonString) {
        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        if (jsonString == null || jsonString.trim().isEmpty()) {
            errors.add("Payload JSON rỗng hoặc null.");
            return new ValidationResult(false, errors, warnings, 0, 0, 0);
        }

        MissionPayload payload;
        try {
            payload = GSON.fromJson(jsonString, MissionPayload.class);
        } catch (Exception e) {
            errors.add("Lỗi cú pháp JSON không hợp lệ: " + e.getMessage());
            return new ValidationResult(false, errors, warnings, 0, 0, 0);
        }

        if (payload == null || payload.waypoints == null || payload.waypoints.size() < 2) {
            errors.add("Lộ trình bay (waypoints) phải có tối thiểu 2 điểm bay trở lên.");
            return new ValidationResult(false, errors, warnings, 0, 0, 0);
        }

        double totalDistM = 0.0;
        double totalTimeSec = 0.0;

        for (int i = 0; i < payload.waypoints.size(); i++) {
            WaypointItem wp = payload.waypoints.get(i);
            int expectedOrder = i + 1;

            if (wp.order != expectedOrder) {
                errors.add(String.format("Điểm bay thứ %d có thứ tự order=%d không liên tục (kỳ vọng %d).",
                        expectedOrder, wp.order, expectedOrder));
            }

            if (!isWithinGeofence(wp.latitude, wp.longitude)) {
                errors.add(String.format("Waypoint #%d (%.5f, %.5f) nằm ngoài ranh giới Geofence nông trại.",
                        wp.order, wp.latitude, wp.longitude));
            }

            if (wp.altitude < MIN_ALTITUDE_M || wp.altitude > MAX_ALTITUDE_M) {
                errors.add(String.format("Waypoint #%d có cao độ %.1fm vượt giới hạn cho phép [5m - 500m].",
                        wp.order, wp.altitude));
            }

            if (wp.speed < MIN_SPEED_MS || wp.speed > MAX_SPEED_MS) {
                errors.add(String.format("Waypoint #%d có tốc độ %.1fm/s vượt giới hạn cho phép [1m/s - 30m/s].",
                        wp.order, wp.speed));
            }

            if (wp.type == null || !VALID_WAYPOINT_TYPES.contains(wp.type)) {
                errors.add(String.format("Waypoint #%d có loại hành động '%s' không hợp lệ.", wp.order, wp.type));
            }

            if (i > 0) {
                WaypointItem prev = payload.waypoints.get(i - 1);
                double hDist = haversineDistanceMeters(prev.latitude, prev.longitude, wp.latitude, wp.longitude);
                double vDist = Math.abs(wp.altitude - prev.altitude);
                double segDist = Math.sqrt(hDist * hDist + vDist * vDist);
                totalDistM += segDist;

                double speed = wp.speed > 0 ? wp.speed : 8.0;
                totalTimeSec += segDist / speed;
            }
        }

        double calcDistM = Math.round(totalDistM * 100.0) / 100.0;
        int calcTimeSec = (int) Math.round(totalTimeSec);
        double calcBattery = Math.round((totalTimeSec / 60.0) * BATTERY_DRAIN_RATE_PER_MIN * 100.0) / 100.0;

        if (calcBattery > MAX_SAFE_BATTERY_DRAIN) {
            warnings.add(String.format("Mức tiêu hao pin dự kiến (%.2f%%) vượt ngưỡng an toàn 80%%.", calcBattery));
        }

        // Kiểm tra sai số giữa telemetry gửi lên và kết quả tính toán độc lập
        if (payload.totalDistanceM > 0 && Math.abs(payload.totalDistanceM - calcDistM) > 1.0) {
            warnings.add(String.format("Chênh lệch khoảng cách: Payload=%.2fm vs Tính toán=%.2fm.",
                    payload.totalDistanceM, calcDistM));
        }

        return new ValidationResult(errors.isEmpty(), errors, warnings, calcDistM, calcTimeSec, calcBattery);
    }

    /**
     * Kiểm tra tính hợp lệ của việc chuyển đổi trạng thái Mission (F16).
     */
    public static boolean isValidStatusTransition(String currentStatus, String nextStatus) {
        if (!VALID_MISSION_STATUSES.contains(currentStatus) || !VALID_MISSION_STATUSES.contains(nextStatus)) {
            return false;
        }
        switch (currentStatus) {
            case "STANDBY":
                return "PLANNING".equals(nextStatus);
            case "PLANNING":
                return "ACTIVE".equals(nextStatus) || "ABORTED".equals(nextStatus) || "STANDBY".equals(nextStatus);
            case "ACTIVE":
                return "PAUSED".equals(nextStatus) || "COMPLETED".equals(nextStatus) || "ABORTED".equals(nextStatus);
            case "PAUSED":
                return "ACTIVE".equals(nextStatus) || "ABORTED".equals(nextStatus);
            case "COMPLETED":
            case "ABORTED":
                return "STANDBY".equals(nextStatus);
            default:
                return false;
        }
    }

    /**
     * Chạy bộ 10 kịch bản kiểm thử tự động cho Task LTJ-20 (Review JSON Waypoints & Test Tạo Mission).
     */
    public static void runAutomatedMissionTestSuite() {
        System.out.println("==========================================================================");
        System.out.println("   SMART FARM IOT - REVIEW JSON WAYPOINTS & TEST TAO MISSION (LTJ-20)     ");
        System.out.println("==========================================================================");

        int passed = 0;
        int total = 10;

        // TC-01: JSON lộ trình chuẩn 4 điểm bay (TAKEOFF -> NORMAL -> HOVER -> LANDING) trong vùng Geofence
        String validJson = "{\n"
                + "  \"missionName\": \"Khao sat Khu A - Dau Tay Thuy Canh\",\n"
                + "  \"uavId\": 1,\n"
                + "  \"zoneId\": 1,\n"
                + "  \"waypoints\": [\n"
                + "    {\"order\": 1, \"latitude\": 10.8450, \"longitude\": 106.7650, \"altitude\": 30, \"speed\": 8, \"type\": \"TAKEOFF\"},\n"
                + "    {\"order\": 2, \"latitude\": 10.8485, \"longitude\": 106.7710, \"altitude\": 50, \"speed\": 10, \"type\": \"NORMAL\"},\n"
                + "    {\"order\": 3, \"latitude\": 10.8520, \"longitude\": 106.7760, \"altitude\": 50, \"speed\": 8, \"type\": \"HOVER\"},\n"
                + "    {\"order\": 4, \"latitude\": 10.8550, \"longitude\": 106.7820, \"altitude\": 20, \"speed\": 5, \"type\": \"LANDING\"}\n"
                + "  ],\n"
                + "  \"totalDistanceM\": 2168.78,\n"
                + "  \"estimatedTimeSeconds\": 307,\n"
                + "  \"estimatedBatteryDrain\": 1.79\n"
                + "}";
        ValidationResult r1 = validateMissionJson(validJson);
        passed += printTestResult("TC-01", "Tạo Mission chuẩn 4 Waypoints trong vùng Geofence (F14)",
                r1.valid, String.format("Valid=%b, Dist=%.2fm, Time=%ds, Pin=%.2f%%",
                        r1.valid, r1.calculatedDistanceM, r1.calculatedTimeSeconds, r1.calculatedBatteryDrain));

        // TC-02: Kiểm tra độ chính xác công thức Haversine 3D & thời gian bay
        boolean mathOk = r1.calculatedDistanceM > 2100 && r1.calculatedDistanceM < 2250 && r1.calculatedTimeSeconds > 200;
        passed += printTestResult("TC-02", "Đối chiếu công thức Haversine 3D & tiêu hao pin (0.35%/phút)",
                mathOk, String.format("3D Dist=%.2fm, Time=%ds, Drain=%.2f%%",
                        r1.calculatedDistanceM, r1.calculatedTimeSeconds, r1.calculatedBatteryDrain));

        // TC-03: Từ chối Mission chỉ có 1 điểm bay (< 2 waypoints)
        String singleWpJson = "{\"waypoints\":[{\"order\":1,\"latitude\":10.85,\"longitude\":106.77,\"altitude\":50,\"speed\":8,\"type\":\"TAKEOFF\"}]}";
        ValidationResult r3 = validateMissionJson(singleWpJson);
        passed += printTestResult("TC-03", "Chặn tạo Mission khi số lượng Waypoints < 2 điểm",
                !r3.valid, r3.errors.get(0));

        // TC-04: Phát hiện điểm bay vượt ranh giới Geofence (Out of Bounds)
        String oobJson = "{\"waypoints\":["
                + "{\"order\":1,\"latitude\":10.850,\"longitude\":106.770,\"altitude\":50,\"speed\":8,\"type\":\"TAKEOFF\"},"
                + "{\"order\":2,\"latitude\":10.910,\"longitude\":106.850,\"altitude\":50,\"speed\":8,\"type\":\"NORMAL\"}"
                + "]}";
        ValidationResult r4 = validateMissionJson(oobJson);
        passed += printTestResult("TC-04", "Phát hiện Waypoint vượt ranh giới an toàn Geofence",
                !r4.valid, r4.errors.get(0));

        // TC-05: Phát hiện cao độ vượt ngưỡng an toàn (> 500m hoặc < 5m)
        String badAltJson = "{\"waypoints\":["
                + "{\"order\":1,\"latitude\":10.850,\"longitude\":106.770,\"altitude\":50,\"speed\":8,\"type\":\"TAKEOFF\"},"
                + "{\"order\":2,\"latitude\":10.852,\"longitude\":106.772,\"altitude\":650,\"speed\":8,\"type\":\"NORMAL\"}"
                + "]}";
        ValidationResult r5 = validateMissionJson(badAltJson);
        passed += printTestResult("TC-05", "Chặn cấu hình cao độ bay vượt ngưỡng vật lý [5m - 500m]",
                !r5.valid, r5.errors.get(0));

        // TC-06: Phát hiện tốc độ bay vượt ngưỡng cho phép (> 30m/s)
        String badSpeedJson = "{\"waypoints\":["
                + "{\"order\":1,\"latitude\":10.850,\"longitude\":106.770,\"altitude\":50,\"speed\":8,\"type\":\"TAKEOFF\"},"
                + "{\"order\":2,\"latitude\":10.852,\"longitude\":106.772,\"altitude\":50,\"speed\":45,\"type\":\"NORMAL\"}"
                + "]}";
        ValidationResult r6 = validateMissionJson(badSpeedJson);
        passed += printTestResult("TC-06", "Chặn cấu hình tốc độ bay vượt ngưỡng [1m/s - 30m/s]",
                !r6.valid, r6.errors.get(0));

        // TC-07: Phát hiện sai thứ tự order của Waypoint
        String badOrderJson = "{\"waypoints\":["
                + "{\"order\":1,\"latitude\":10.850,\"longitude\":106.770,\"altitude\":50,\"speed\":8,\"type\":\"TAKEOFF\"},"
                + "{\"order\":3,\"latitude\":10.852,\"longitude\":106.772,\"altitude\":50,\"speed\":8,\"type\":\"LANDING\"}"
                + "]}";
        ValidationResult r7 = validateMissionJson(badOrderJson);
        passed += printTestResult("TC-07", "Phát hiện lỗi đánh số thứ tự (order) Waypoint bị nhảy cóc",
                !r7.valid, r7.errors.get(0));

        // TC-08: Phát hiện loại hành động WaypointType không hợp lệ
        String badTypeJson = "{\"waypoints\":["
                + "{\"order\":1,\"latitude\":10.850,\"longitude\":106.770,\"altitude\":50,\"speed\":8,\"type\":\"TAKEOFF\"},"
                + "{\"order\":2,\"latitude\":10.852,\"longitude\":106.772,\"altitude\":50,\"speed\":8,\"type\":\"DROP_BOMB\"}"
                + "]}";
        ValidationResult r8 = validateMissionJson(badTypeJson);
        passed += printTestResult("TC-08", "Phát hiện hành động WaypointType không nằm trong tập chuẩn",
                !r8.valid, r8.errors.get(0));

        // TC-09: Kiểm thử luồng chuyển trạng thái Mission hợp lệ (F16)
        boolean validFlow = isValidStatusTransition("STANDBY", "PLANNING")
                && isValidStatusTransition("PLANNING", "ACTIVE")
                && isValidStatusTransition("ACTIVE", "PAUSED")
                && isValidStatusTransition("PAUSED", "ACTIVE")
                && isValidStatusTransition("ACTIVE", "COMPLETED");
        passed += printTestResult("TC-09", "Chuyển đổi trạng thái Mission chuẩn: STANDBY->PLANNING->ACTIVE->COMPLETED (F16)",
                validFlow, "Vòng đời trạng thái hợp lệ 100%");

        // TC-10: Chặn chuyển trạng thái Mission bất hợp lệ (ví dụ COMPLETED -> ACTIVE trực tiếp)
        boolean invalidTransitionBlocked = !isValidStatusTransition("COMPLETED", "ACTIVE")
                && !isValidStatusTransition("STANDBY", "COMPLETED");
        passed += printTestResult("TC-10", "Chặn chuyển trạng thái Mission trái quy tắc nghiệp vụ (F16)",
                invalidTransitionBlocked, "Đã chặn STANDBY->COMPLETED & COMPLETED->ACTIVE");

        System.out.println("--------------------------------------------------------------------------");
        System.out.printf("  TONG KET KIEM THU LTJ-20: %d / %d TEST CASES PASS (%.0f%%)%n",
                passed, total, (passed * 100.0 / total));
        System.out.println("==========================================================================");
    }

    private static int printTestResult(String tcId, String name, boolean isPass, String detail) {
        System.out.printf("  [%s] %-4s | %-62s | %s%n",
                isPass ? "PASS" : "FAIL", tcId, name, detail);
        return isPass ? 1 : 0;
    }
}
